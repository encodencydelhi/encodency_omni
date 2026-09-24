/**
 * Wire-level contract of the real-API integration: exact URLs, headers and
 * bodies sent to the backend, and the transport's session-expiry behaviour.
 * `fetch` is stubbed — nothing leaves the process.
 */
import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";

process.env.NEXT_PUBLIC_DATA_SOURCE = "api";
process.env.NEXT_PUBLIC_API_BASE_URL = "/api/v1";

const { HttpTransport } = await import("../http-transport");
const { onSessionExpired } = await import("../session-events");
const { clientsApi, toCreateClientPayload } = await import("@/features/admin/projects/live/clients-api");
const { teamApi, invitationLink } = await import("@/features/admin/team/live/team-api");
const { authService } = await import("@/features/auth/services/auth-service");
const { systemHealthService } = await import("@/features/system-health/services/system-health-service");
const { ApiError } = await import("@/types/api");

interface Call {
  url: string;
  init: RequestInit & { headers: Record<string, string> };
}

let calls: Call[] = [];
let responses: Array<{ status: number; body: unknown }> = [];
const realFetch = globalThis.fetch;

beforeEach(() => {
  calls = [];
  responses = [];
  globalThis.fetch = (async (url: string, init: Call["init"]) => {
    calls.push({ url, init });
    const next = responses.shift() ?? { status: 200, body: {} };
    return new Response(next.status === 204 ? null : JSON.stringify(next.body), { status: next.status, headers: { "Content-Type": "application/json" } });
  }) as typeof fetch;
});

afterEach(() => {
  globalThis.fetch = realFetch;
});

const body = (call: Call) => JSON.parse(String(call.init.body));

describe("HttpTransport", () => {
  it("is same-origin, sends cookies, and merges headers without dropping them", async () => {
    await new HttpTransport("/api/v1").request({ method: "GET", path: "/users/me", headers: { "x-company-id": "c-1" } });
    assert.equal(calls[0]!.url, "/api/v1/users/me");
    assert.equal(calls[0]!.init.credentials, "include");
    assert.equal(calls[0]!.init.headers["x-company-id"], "c-1");
    assert.equal(calls[0]!.init.headers.Accept, "application/json");
  });

  it("signals an expired session on a 401 from an authenticated request", async () => {
    let expired = 0;
    const stop = onSessionExpired(() => expired++);
    responses.push({ status: 401, body: { message: "Not authenticated" } });
    await assert.rejects(new HttpTransport("/api/v1").request({ method: "GET", path: "/team/members" }), (error: unknown) => ApiError.isApiError(error) && error.status === 401);
    stop();
    assert.equal(expired, 1);
  });

  it("does not signal expiry for sign-in steps that opt out, nor on a 403", async () => {
    let expired = 0;
    const stop = onSessionExpired(() => expired++);
    responses.push({ status: 401, body: {} }, { status: 403, body: { message: "Company access denied" } });
    await assert.rejects(new HttpTransport("/api/v1").request({ method: "POST", path: "/auth/login", skipSessionExpiry: true }));
    await assert.rejects(new HttpTransport("/api/v1").request({ method: "GET", path: "/clients" }), (error: unknown) => ApiError.isApiError(error) && error.code === "FORBIDDEN" && error.message === "Company access denied");
    stop();
    assert.equal(expired, 0, "403 is access-denied, not a lost session");
  });

  it("joins NestJS validation message arrays into readable text", async () => {
    responses.push({ status: 400, body: { message: ["name must be longer than or equal to 3 characters", "website must be a URL address"] } });
    await assert.rejects(new HttpTransport("/api/v1").request({ method: "POST", path: "/clients" }), (error: unknown) => ApiError.isApiError(error) && error.message.includes("name must be") && error.message.includes("website must be"));
  });
});

describe("Clients API (Company Admin)", () => {
  it("lists with the verified Company header", async () => {
    responses.push({ status: 200, body: [] });
    await clientsApi.list("c-1");
    assert.equal(calls[0]!.url, "/api/v1/clients");
    assert.equal(calls[0]!.init.headers["x-company-id"], "c-1");
  });

  it("creates with ONLY the four backend-supported fields", async () => {
    responses.push({ status: 201, body: { id: "k-1" } });
    await clientsApi.create("c-1", toCreateClientPayload({ name: "  Acme  ", industry: "Retail", website: "acme.org", targetAudience: "Families" }));
    assert.equal(calls[0]!.init.method, "POST");
    assert.deepEqual(body(calls[0]!), { name: "Acme", industry: "Retail", website: "acme.org", targetAudience: "Families" });
  });

  it("omits empty optional fields rather than sending blanks", () => {
    assert.deepEqual(toCreateClientPayload({ name: "Acme", industry: " ", website: "", targetAudience: "" }), { name: "Acme" });
  });

  it("requests a Client's detail with x-client-id equal to the path id", async () => {
    responses.push({ status: 200, body: { id: "k-9" } });
    await clientsApi.get("c-1", "k-9");
    assert.equal(calls[0]!.url, "/api/v1/clients/k-9");
    assert.equal(calls[0]!.init.headers["x-client-id"], "k-9");
    assert.equal(calls[0]!.init.headers["x-company-id"], "c-1");
  });
});

describe("Team & Invitations API", () => {
  it("updates a role with { systemRole } and the membership id", async () => {
    responses.push({ status: 200, body: { id: "m-2", systemRole: "MANAGER" } });
    await teamApi.updateRole("c-1", "m-2", "MANAGER");
    assert.equal(calls[0]!.url, "/api/v1/team/members/m-2/role");
    assert.equal(calls[0]!.init.method, "PUT");
    assert.deepEqual(body(calls[0]!), { systemRole: "MANAGER" });
  });

  it("creates an invitation for the selected Company with email and systemRole only", async () => {
    responses.push({ status: 201, body: { invitationId: "i-1", status: "pending", expiresAt: "", token: "secret" } });
    await teamApi.createInvitation("c-1", { email: "new@example.com", systemRole: "VIEWER" });
    assert.equal(calls[0]!.url, "/api/v1/companies/c-1/invitations");
    assert.equal(calls[0]!.init.headers["x-company-id"], "c-1");
    assert.deepEqual(body(calls[0]!), { email: "new@example.com", systemRole: "VIEWER" });
  });

  it("accepts an invitation publicly, without treating a 403 as a lost session", async () => {
    let expired = 0;
    const stop = onSessionExpired(() => expired++);
    responses.push({ status: 403, body: { message: "Invalid or expired invitation" } });
    await assert.rejects(teamApi.acceptInvitation("tok", "Password123"));
    stop();
    assert.equal(calls[0]!.url, "/api/v1/invitations/accept");
    assert.deepEqual(body(calls[0]!), { token: "tok", password: "Password123" });
    assert.equal(expired, 0);
  });

  it("builds the invitation link the backend emails", () => {
    assert.equal(invitationLink("http://localhost:3000", "a b/c"), "http://localhost:3000/accept-invitation?token=a%20b%2Fc");
  });
});

describe("authService (real contract)", () => {
  it("login sends only email and password and returns a challenge", async () => {
    responses.push({ status: 200, body: { status: "challenge", challengeType: "totp", challengeToken: "ct", expiresAt: "2026-01-01T00:00:00.000Z" } });
    const result = await authService.login({ email: "a@example.com", password: "Password123" });
    assert.deepEqual(body(calls[0]!), { email: "a@example.com", password: "Password123" });
    assert.equal(result.challenge.type, "totp");
  });

  it("TOTP verification uses the challenge as a Bearer token, then reads the profile from /users/me", async () => {
    responses.push({ status: 200, body: { status: "authenticated", user: { id: "u", email: "a@example.com" } } });
    responses.push({ status: 200, body: { id: "u", email: "a@example.com", totpEnabled: true, platformRole: "SUPER_ADMIN", memberships: [] } });
    const user = await authService.verifyTotp({ challengeToken: "ct", code: "123456" });
    assert.equal(calls[0]!.url, "/api/v1/auth/verify-totp");
    assert.equal(calls[0]!.init.headers.Authorization, "Bearer ct");
    assert.deepEqual(body(calls[0]!), { code: "123456" });
    assert.equal(calls[1]!.url, "/api/v1/users/me");
    assert.equal(user.role, "super_admin");
  });

  it("enrollment returns the one-time recovery codes together with the server profile", async () => {
    responses.push({ status: 200, body: { status: "authenticated", user: { id: "u", email: "a@example.com" }, recoveryCodes: ["aaaa-bbbb"] } });
    responses.push({ status: 200, body: { id: "u", email: "a@example.com", totpEnabled: true, platformRole: null, memberships: [] } });
    const result = await authService.verifyTotpSetup({ challengeToken: "ct", code: "123456" });
    assert.deepEqual(result.recoveryCodes, ["aaaa-bbbb"]);
    assert.equal(result.user.role, null);
  });

  it("recovery-code sign-in posts { code } to verify-recovery-code", async () => {
    responses.push({ status: 200, body: {} }, { status: 200, body: { id: "u", email: "a@example.com", totpEnabled: true, platformRole: null, memberships: [] } });
    await authService.verifyRecoveryCode({ challengeToken: "ct", code: "aaaa-bbbb-cccc-dddd-eeee" });
    assert.equal(calls[0]!.url, "/api/v1/auth/verify-recovery-code");
    assert.deepEqual(body(calls[0]!), { code: "aaaa-bbbb-cccc-dddd-eeee" });
  });

  it("TOTP rotation step 1 posts { code } (or recoveryCode) to totp/replace without a Bearer", async () => {
    responses.push({
      status: 200,
      body: { status: "replacement_pending", challengeToken: "rp", otpauthUri: "otpauth://totp/x?secret=ABC", qrDataUrl: "data:image/png;base64,x", expiresAt: "2026-01-01T00:05:00.000Z" },
    });
    const pending = await authService.requestTotpReplacement({ code: "123456" });
    assert.equal(calls[0]!.url, "/api/v1/auth/totp/replace");
    assert.equal(calls[0]!.init.headers.Authorization, undefined);
    assert.deepEqual(body(calls[0]!), { code: "123456" });
    assert.equal(pending.status, "replacement_pending");

    responses.push({
      status: 200,
      body: { status: "replacement_pending", challengeToken: "rp2", otpauthUri: "otpauth://totp/x?secret=ABC", qrDataUrl: "data:image/png;base64,x", expiresAt: "2026-01-01T00:05:00.000Z" },
    });
    await authService.requestTotpReplacement({ recoveryCode: "aaaa-bbbb-cccc-dddd-eeee" });
    assert.deepEqual(body(calls[1]!), { recoveryCode: "aaaa-bbbb-cccc-dddd-eeee" });
  });

  it("TOTP rotation step 2 posts { code } with the replacement challenge as Bearer", async () => {
    responses.push({ status: 200, body: { status: "replacement_completed", recoveryCodes: ["aaaa-bbbb"] } });
    const result = await authService.verifyTotpReplacement({ challengeToken: "rp", code: "654321" });
    assert.equal(calls[0]!.url, "/api/v1/auth/totp/verify-replacement");
    assert.equal(calls[0]!.init.headers.Authorization, "Bearer rp");
    assert.deepEqual(body(calls[0]!), { code: "654321" });
    assert.deepEqual(result.recoveryCodes, ["aaaa-bbbb"]);
  });

  it("restore returns null (not an error) when nobody is signed in", async () => {
    responses.push({ status: 401, body: { message: "Not authenticated" } });
    assert.equal(await authService.restore(), null);
  });

  it("getAuthMe calls GET /auth/me and returns userId", async () => {
    responses.push({ status: 200, body: { userId: "user-123" } });
    const result = await authService.getAuthMe();
    assert.equal(calls[0]!.url, "/api/v1/auth/me");
    assert.equal(calls[0]!.init.method, "GET");
    assert.deepEqual(result, { userId: "user-123" });
  });
});

describe("healthService (real contract)", () => {
  it("GET /health is public and returns status + database", async () => {
    responses.push({ status: 200, body: { status: "ok", timestamp: "2026-01-01T00:00:00.000Z", database: "connected" } });
    const result = await systemHealthService.check();
    assert.equal(calls[0]!.url, "/api/v1/health");
    assert.equal(calls[0]!.init.method, "GET");
    assert.equal(calls[0]!.init.headers.Authorization, undefined);
    assert.equal(result.status, "ok");
    assert.equal(result.database, "connected");
  });

  it("GET /health marks database error without inventing a success status", async () => {
    responses.push({ status: 200, body: { status: "error", timestamp: "2026-01-01T00:00:00.000Z", database: "error" } });
    const result = await systemHealthService.check();
    assert.equal(result.status, "error");
    assert.equal(result.database, "error");
  });

  it("GET /health/error rejects with the deliberate 500 (no session-expiry signal)", async () => {
    let expired = 0;
    const stop = onSessionExpired(() => expired++);
    responses.push({
      status: 500,
      body: { message: "This is a deliberate test error for verifying logging behavior" },
    });
    await assert.rejects(
      systemHealthService.triggerError(),
      (error: unknown) =>
        ApiError.isApiError(error) &&
        error.status === 500 &&
        error.message.includes("deliberate test error"),
    );
    stop();
    assert.equal(calls[0]!.url, "/api/v1/health/error");
    assert.equal(expired, 0, "a probe 500 must not sign the operator out");
  });
});
