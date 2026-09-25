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
const { tenancyHarnessService } = await import("@/features/system-health/services/tenancy-harness-service");
const { integrationsApi } = await import("@/features/admin/integrations/live/integrations-api");
const { campaignsApi } = await import("@/features/admin/campaigns/live/campaigns-api");
const { draftsApi } = await import("@/features/admin/content/live/drafts-api");
const { schedulingApi, QUEUE_RECOVERY_WARNING, TOKEN_EXPIRY_WARNING } = await import(
  "@/features/admin/content/live/scheduling-api"
);
const { dashboardService } = await import("@/features/dashboard/services/dashboard-service");
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

describe("tenancyHarnessService (6 manual harness routes)", () => {
  it("GET /_manual/tenancy/platform checks platform Super Admin", async () => {
    responses.push({
      status: 200,
      body: {
        tenantContext: {
          userId: "usr-admin-1",
          sessionId: "sess-1",
          platformRole: "SUPER_ADMIN",
        },
      },
    });
    const result = await tenancyHarnessService.testRoute("platform");
    assert.equal(calls[0]!.url, "/api/v1/_manual/tenancy/platform");
    assert.equal(calls[0]!.init.method, "GET");
    assert.equal(result.tenantContext.platformRole, "SUPER_ADMIN");
  });

  it("GET /_manual/tenancy/company sends x-company-id header", async () => {
    responses.push({
      status: 200,
      body: {
        tenantContext: {
          userId: "usr-1",
          sessionId: "sess-1",
          platformRole: "USER",
          companyId: "c-100",
          systemRole: "ADMIN",
        },
      },
    });
    const result = await tenancyHarnessService.testRoute("company", { companyId: "c-100" });
    assert.equal(calls[0]!.url, "/api/v1/_manual/tenancy/company");
    assert.equal(calls[0]!.init.headers["x-company-id"], "c-100");
    assert.equal(result.tenantContext.companyId, "c-100");
  });

  it("GET /_manual/tenancy/client sends both x-company-id and x-client-id", async () => {
    responses.push({
      status: 200,
      body: {
        tenantContext: {
          userId: "usr-1",
          sessionId: "sess-1",
          platformRole: "USER",
          companyId: "c-100",
          clientId: "cl-50",
        },
      },
    });
    const result = await tenancyHarnessService.testRoute("client", { companyId: "c-100", clientId: "cl-50" });
    assert.equal(calls[0]!.url, "/api/v1/_manual/tenancy/client");
    assert.equal(calls[0]!.init.headers["x-company-id"], "c-100");
    assert.equal(calls[0]!.init.headers["x-client-id"], "cl-50");
    assert.equal(result.tenantContext.clientId, "cl-50");
  });

  it("GET /_manual/tenancy/client-optional sends optional client context", async () => {
    responses.push({
      status: 200,
      body: {
        tenantContext: {
          userId: "usr-1",
          sessionId: "sess-1",
          platformRole: "USER",
          companyId: "c-100",
          clientId: "cl-50",
        },
      },
    });
    const result = await tenancyHarnessService.testRoute("client-optional", { companyId: "c-100", clientId: "cl-50" });
    assert.equal(calls[0]!.url, "/api/v1/_manual/tenancy/client-optional");
    assert.equal(calls[0]!.init.headers["x-company-id"], "c-100");
    assert.equal(calls[0]!.init.headers["x-client-id"], "cl-50");
    assert.equal(result.tenantContext.clientId, "cl-50");
  });

  it("GET /_manual/tenancy/campaigns-read tests campaigns:read capability", async () => {
    responses.push({
      status: 200,
      body: {
        tenantContext: {
          userId: "usr-1",
          sessionId: "sess-1",
          platformRole: "USER",
          companyId: "c-100",
          systemRole: "VIEWER",
        },
      },
    });
    const result = await tenancyHarnessService.testRoute("campaigns-read", { companyId: "c-100" });
    assert.equal(calls[0]!.url, "/api/v1/_manual/tenancy/campaigns-read");
    assert.equal(calls[0]!.init.headers["x-company-id"], "c-100");
    assert.equal(result.tenantContext.systemRole, "VIEWER");
  });

  it("GET /_manual/tenancy/campaigns-write tests campaigns:write capability", async () => {
    responses.push({
      status: 200,
      body: {
        tenantContext: {
          userId: "usr-1",
          sessionId: "sess-1",
          platformRole: "USER",
          companyId: "c-100",
          systemRole: "MANAGER",
        },
      },
    });
    const result = await tenancyHarnessService.testRoute("campaigns-write", { companyId: "c-100" });
    assert.equal(calls[0]!.url, "/api/v1/_manual/tenancy/campaigns-write");
    assert.equal(calls[0]!.init.headers["x-company-id"], "c-100");
    assert.equal(result.tenantContext.systemRole, "MANAGER");
  });

  it("rejection (e.g. 403) from harness does NOT trigger session expiry", async () => {
    let expired = 0;
    const stop = onSessionExpired(() => expired++);
    responses.push({ status: 403, body: { message: "Capability campaigns:write missing" } });

    await assert.rejects(
      tenancyHarnessService.testRoute("campaigns-write", { companyId: "c-100" }),
      (err: unknown) => ApiError.isApiError(err) && err.status === 403,
    );
    stop();
    assert.equal(expired, 0, "harness route failure must not sign operator out");
  });
});

describe("integrationsApi (TASK-09 OAuth contracts)", () => {
  it("GET /integrations/registry returns configured providers", async () => {
    responses.push({
      status: 200,
      body: ["META", "GOOGLE_BUSINESS", "LINKEDIN"],
    });
    const registry = await integrationsApi.getRegistry();
    assert.equal(calls[0]!.url, "/api/v1/integrations/registry");
    assert.equal(calls[0]!.init.method, "GET");
    assert.deepEqual(registry, ["META", "GOOGLE_BUSINESS", "LINKEDIN"]);
  });

  it("POST /integrations/oauth/init sends verified Company header and provider", async () => {
    responses.push({
      status: 200,
      body: {
        authUrl: "https://www.facebook.com/v21.0/dialog/oauth?client_id=123&state=abc",
      },
    });
    const result = await integrationsApi.initOAuth("company-uuid-1", "META");
    assert.equal(calls[0]!.url, "/api/v1/integrations/oauth/init");
    assert.equal(calls[0]!.init.method, "POST");
    assert.equal(calls[0]!.init.headers["x-company-id"], "company-uuid-1");
    assert.deepEqual(body(calls[0]!), { provider: "META" });
    assert.equal(result.authUrl, "https://www.facebook.com/v21.0/dialog/oauth?client_id=123&state=abc");
  });

  it("POST /integrations/oauth/init rejects without company header", async () => {
    await assert.rejects(
      integrationsApi.initOAuth("", "META"),
      (err: unknown) => ApiError.isApiError(err) && err.code === "NO_COMPANY_SELECTED",
    );
  });

  it("POST /integrations/oauth/init surfaces 403 on missing capability", async () => {
    responses.push({
      status: 403,
      body: { message: "Capability integrations:write required" },
    });
    await assert.rejects(
      integrationsApi.initOAuth("company-uuid-1", "GOOGLE_BUSINESS"),
      (err: unknown) =>
        ApiError.isApiError(err) &&
        err.status === 403 &&
        err.message.includes("integrations:write"),
    );
  });
});

describe("campaignsApi (TASK-11A contracts)", () => {
  const companyId = "cmp-100";
  const clientId = "cli-200";

  it("GET /campaigns includes x-company-id and x-client-id headers", async () => {
    responses.push({
      status: 200,
      body: {
        items: [
          {
            id: "cmp-1",
            companyId,
            clientId,
            name: "Q4 Product Launch",
            budget: { amount: "10000.00", currency: "INR" },
            revision: 1,
            createdAt: "2026-09-24T00:00:00.000Z",
            updatedAt: "2026-09-24T00:00:00.000Z",
          },
        ],
        total: 1,
        page: 1,
        limit: 10,
      },
    });

    const list = await campaignsApi.list(companyId, clientId);
    assert.equal(calls[0]!.url, "/api/v1/campaigns");
    assert.equal(calls[0]!.init.method, "GET");
    assert.equal(calls[0]!.init.headers["x-company-id"], companyId);
    assert.equal(calls[0]!.init.headers["x-client-id"], clientId);
    assert.equal(list.items.length, 1);
    assert.equal(list.items[0]!.revision, 1);
  });

  it("POST /campaigns sends validated payload and returns revision", async () => {
    responses.push({
      status: 201,
      body: {
        id: "cmp-2",
        companyId,
        clientId,
        name: "Spring Sale",
        budget: { amount: "25000.00", currency: "USD" },
        startDate: "2026-10-01T00:00:00.000Z",
        endDate: "2026-10-31T00:00:00.000Z",
        revision: 1,
        createdAt: "2026-09-24T00:00:00.000Z",
        updatedAt: "2026-09-24T00:00:00.000Z",
      },
    });

    const created = await campaignsApi.create(companyId, clientId, {
      name: "Spring Sale",
      budget: { amount: "25000.00", currency: "USD" },
      startDate: "2026-10-01T00:00:00.000Z",
      endDate: "2026-10-31T00:00:00.000Z",
    });

    assert.equal(calls[0]!.url, "/api/v1/campaigns");
    assert.equal(calls[0]!.init.method, "POST");
    assert.equal(calls[0]!.init.headers["x-company-id"], companyId);
    assert.equal(calls[0]!.init.headers["x-client-id"], clientId);
    assert.deepEqual(body(calls[0]!), {
      name: "Spring Sale",
      budget: { amount: "25000.00", currency: "USD" },
      startDate: "2026-10-01T00:00:00.000Z",
      endDate: "2026-10-31T00:00:00.000Z",
    });
    assert.equal(created.id, "cmp-2");
    assert.equal(created.revision, 1);
  });

  it("PATCH /campaigns/:id sends expectedRevision and handles 409 revision_conflict", async () => {
    responses.push({
      status: 409,
      body: {
        message: "Resource was modified by another request. Please reload.",
        reason: "revision_conflict",
        currentRevision: 3,
      },
    });

    await assert.rejects(
      campaignsApi.update(companyId, clientId, "cmp-1", {
        expectedRevision: 2,
        name: "Conflicted Name",
      }),
      (err: unknown) => {
        if (!ApiError.isApiError(err)) return false;
        assert.equal(err.status, 409);
        assert.equal(campaignsApi.isRevisionConflict(err), true);
        return true;
      },
    );

    assert.equal(calls[0]!.url, "/api/v1/campaigns/cmp-1");
    assert.equal(calls[0]!.init.method, "PATCH");
    assert.deepEqual(body(calls[0]!), {
      expectedRevision: 2,
      name: "Conflicted Name",
    });
  });

  it("campaignsApi rejects missing company or client headers before network call", async () => {
    await assert.rejects(
      campaignsApi.list("", clientId),
      (err: unknown) => ApiError.isApiError(err) && err.code === "NO_COMPANY_SELECTED",
    );
    await assert.rejects(
      campaignsApi.list(companyId, ""),
      (err: unknown) => ApiError.isApiError(err) && err.code === "NO_CLIENT_SELECTED",
    );
    assert.equal(calls.length, 0);
  });
});

describe("draftsApi (TASK-11A contracts)", () => {
  const companyId = "cmp-100";
  const clientId = "cli-200";

  it("GET /content/drafts includes x-company-id and x-client-id headers", async () => {
    responses.push({
      status: 200,
      body: {
        items: [
          {
            id: "draft-1",
            companyId,
            clientId,
            campaignId: null,
            title: "Product teaser",
            contentPreview: "Exciting announcement coming soon!",
            channels: ["LINKEDIN_ORGANIZATION"],
            revision: 1,
            updatedAt: "2026-09-24T00:00:00.000Z",
          },
        ],
        total: 1,
        page: 1,
        limit: 10,
      },
    });

    const drafts = await draftsApi.list(companyId, clientId);
    assert.equal(calls[0]!.url, "/api/v1/content/drafts");
    assert.equal(calls[0]!.init.method, "GET");
    assert.equal(calls[0]!.init.headers["x-company-id"], companyId);
    assert.equal(calls[0]!.init.headers["x-client-id"], clientId);
    assert.equal(drafts.items.length, 1);
    assert.equal(drafts.items[0]!.revision, 1);
  });

  it("POST /content/drafts validates assetIds and sends expected draft fields", async () => {
    // If caller sends assetIds when unsupported, client throws PRECONDITION_FAILED
    await assert.rejects(
      draftsApi.create(companyId, clientId, {
        content: "Draft with image",
        variants: {},
        assetIds: ["asset-123"],
      }),
      (err: unknown) =>
        ApiError.isApiError(err) &&
        err.code === "MEDIA_NOT_SUPPORTED",
    );

    responses.push({
      status: 201,
      body: {
        id: "draft-new",
        companyId,
        clientId,
        campaignId: "cmp-100",
        title: "New Year Offer",
        content: "Save 20% this weekend",
        variants: {
          FACEBOOK_PAGE: { content: "FB: Save 20% this weekend!" },
        },
        assetIds: [],
        revision: 1,
        createdAt: "2026-09-24T00:00:00.000Z",
        updatedAt: "2026-09-24T00:00:00.000Z",
      },
    });

    const created = await draftsApi.create(companyId, clientId, {
      campaignId: "cmp-100",
      title: "New Year Offer",
      content: "Save 20% this weekend",
      variants: {
        FACEBOOK_PAGE: { content: "FB: Save 20% this weekend!" },
      },
    });

    assert.equal(calls[0]!.url, "/api/v1/content/drafts");
    assert.equal(calls[0]!.init.method, "POST");
    assert.deepEqual(body(calls[0]!), {
      campaignId: "cmp-100",
      title: "New Year Offer",
      content: "Save 20% this weekend",
      variants: {
        FACEBOOK_PAGE: { content: "FB: Save 20% this weekend!" },
      },
    });
    assert.equal(created.id, "draft-new");
    assert.equal(created.revision, 1);
  });

  it("PATCH /content/drafts/:id enforces expectedRevision and handles 409 conflict", async () => {
    responses.push({
      status: 409,
      body: {
        message: "Resource was modified by another request. Please reload.",
        reason: "revision_conflict",
        currentRevision: 4,
      },
    });

    await assert.rejects(
      draftsApi.update(companyId, clientId, "draft-new", {
        expectedRevision: 1,
        content: "Conflicted update",
      }),
      (err: unknown) => {
        if (!ApiError.isApiError(err)) return false;
        assert.equal(err.status, 409);
        assert.equal(draftsApi.isRevisionConflict(err), true);
        return true;
      },
    );

    assert.equal(calls[0]!.url, "/api/v1/content/drafts/draft-new");
    assert.equal(calls[0]!.init.method, "PATCH");
    assert.deepEqual(body(calls[0]!), {
      expectedRevision: 1,
      content: "Conflicted update",
    });
  });
});

describe("dashboardService (Data Integrity & Super Admin Jobs)", () => {
  it("GET /super-admin/jobs/stats is called and live vs unsupported metrics are clearly separated", async () => {
    responses.push({
      status: 200,
      body: {
        queues: [
          { queue: "notifications", reachable: true, counts: { waiting: 1, active: 2, completed: 50, failed: 0, delayed: 0 } },
          { queue: "publishing", reachable: true, counts: { waiting: 3, active: 4, completed: 80, failed: 1, delayed: 2 } },
          { queue: "crawler", reachable: false, error: "Redis timeout" },
        ],
      },
    });

    const snapshot = await dashboardService.getSnapshot("30d");

    assert.equal(calls[0]!.url, "/api/v1/super-admin/jobs/stats");
    assert.equal(calls[0]!.init.method, "GET");

    const runningJobsMetric = snapshot.metrics.find((m) => m.key === "runningJobs");
    assert.ok(runningJobsMetric, "runningJobs metric must be present");
    assert.equal(runningJobsMetric.value, 6, "Total active jobs should sum active counts from reachable queues (2 + 4 = 6)");
    assert.equal(runningJobsMetric.isLive, true, "runningJobs must be marked isLive: true");

    const unsupportedMetric = snapshot.metrics.find((m) => m.key === "totalCompanies");
    assert.ok(unsupportedMetric, "totalCompanies metric must be present");
    assert.equal(unsupportedMetric.isLive, false, "Unsupported metric must be marked isLive: false");
  });

  it("dashboardService propagates API failure without silent mock fallback", async () => {
    responses.push({
      status: 500,
      body: { message: "Internal server error", code: "INTERNAL_ERROR" },
    });

    await assert.rejects(
      dashboardService.getSnapshot("30d"),
      (err: unknown) => {
        if (!ApiError.isApiError(err)) return false;
        assert.equal(err.status, 500);
        return true;
      },
    );
  });
});

describe("integrationsApi (TASK-10 contracts)", () => {
  const companyId = "cmp-omega";
  const integrationId = "00000000-0000-0000-0000-000000000001";
  const clientId = "00000000-0000-0000-0000-000000000002";

  it("GET /integrations/:id/resources sends company context and returns discovered resources", async () => {
    responses.push({
      status: 200,
      body: [
        { externalResourceId: "109823471029384", name: "Official Facebook Page", resourceType: "FACEBOOK_PAGE" },
      ],
    });

    const resources = await integrationsApi.discoverResources(companyId, integrationId);

    assert.equal(calls[0]!.url, `/api/v1/integrations/${integrationId}/resources`);
    assert.equal(calls[0]!.init.method, "GET");
    assert.equal(calls[0]!.init.headers["x-company-id"], companyId);
    assert.equal(resources.length, 1);
    assert.equal(resources[0]!.resourceType, "FACEBOOK_PAGE");
  });

  it("POST /integrations/:id/map sends company context, client id, and canonical resource identity", async () => {
    responses.push({
      status: 201,
      body: {
        id: "map-1",
        integrationId,
        clientId,
        resourceType: "FACEBOOK_PAGE",
        externalResourceId: "109823471029384",
        createdAt: new Date().toISOString(),
      },
    });

    const mapped = await integrationsApi.mapResource(companyId, integrationId, {
      clientId,
      externalResourceId: "109823471029384",
      resourceType: "FACEBOOK_PAGE",
    });

    assert.equal(calls[0]!.url, `/api/v1/integrations/${integrationId}/map`);
    assert.equal(calls[0]!.init.method, "POST");
    assert.equal(calls[0]!.init.headers["x-company-id"], companyId);
    assert.deepEqual(body(calls[0]!), {
      clientId,
      externalResourceId: "109823471029384",
      resourceType: "FACEBOOK_PAGE",
    });
    assert.equal(mapped.id, "map-1");
  });
});

describe("campaignsApi.get (TASK-11A contract)", () => {
  const companyId = "cmp-1";
  const clientId = "client-1";
  const campaignId = "cmp-100";

  it("GET /campaigns/:id sends verified company and client headers", async () => {
    responses.push({
      status: 200,
      body: {
        id: campaignId,
        name: "Q4 Growth Drive",
        objective: "Awareness",
        budget: { amount: "50000", currency: "INR" },
        status: "ACTIVE",
        revision: 3,
        createdAt: "2026-09-01T00:00:00.000Z",
        updatedAt: "2026-09-15T00:00:00.000Z",
      },
    });

    const record = await campaignsApi.get(companyId, clientId, campaignId);

    assert.equal(calls[0]!.url, `/api/v1/campaigns/${campaignId}`);
    assert.equal(calls[0]!.init.method, "GET");
    assert.equal(calls[0]!.init.headers["x-company-id"], companyId);
    assert.equal(calls[0]!.init.headers["x-client-id"], clientId);
    assert.equal(record.name, "Q4 Growth Drive");
    assert.equal(record.revision, 3);
  });
});

describe("schedulingApi (TASK-11B contracts)", () => {
  const companyId = "cmp-100";
  const clientId = "cli-200";
  const draftId = "11111111-1111-4111-8111-111111111111";
  const variantId = "22222222-2222-4222-8222-222222222222";
  const postId = "33333333-3333-4333-8333-333333333333";

  it("GET .../targets sends client scope and reads publishable/reason", async () => {
    responses.push({
      status: 200,
      body: {
        items: [
          {
            resourceMappingId: "map-1",
            resourceType: "FACEBOOK_PAGE",
            externalResourceId: "104857600000001",
            integrationId: "int-1",
            provider: "META",
            connectionStatus: "ACTIVE",
            publishable: true,
            reason: null,
          },
          {
            resourceMappingId: "map-2",
            resourceType: "FACEBOOK_PAGE",
            externalResourceId: "104857600000002",
            integrationId: "int-2",
            provider: "META",
            connectionStatus: "EXPIRED",
            publishable: false,
            reason: "integration_reconnect_required",
          },
        ],
      },
    });

    const targets = await schedulingApi.targets(companyId, clientId, draftId, variantId);

    assert.equal(calls[0]!.url, `/api/v1/content/drafts/${draftId}/variants/${variantId}/targets`);
    assert.equal(calls[0]!.init.method, "GET");
    assert.equal(calls[0]!.init.headers["x-company-id"], companyId);
    assert.equal(calls[0]!.init.headers["x-client-id"], clientId);
    assert.equal(targets.items.length, 2);
    assert.equal(targets.items[0]!.publishable, true);
    assert.equal(targets.items[1]!.reason, "integration_reconnect_required");
  });

  it("POST .../schedule sends exactly the three contract fields and returns warnings", async () => {
    responses.push({
      status: 201,
      body: {
        id: postId,
        status: "SCHEDULED",
        scheduledFor: "2026-10-01T09:30:00.000Z",
        draftRevision: 3,
        warnings: [QUEUE_RECOVERY_WARNING],
      },
    });

    const created = await schedulingApi.schedule(companyId, clientId, draftId, variantId, {
      resourceMappingId: "map-1",
      scheduledFor: "2026-10-01T09:30:00+05:30",
      expectedDraftRevision: 3,
    });

    assert.equal(calls[0]!.url, `/api/v1/content/drafts/${draftId}/variants/${variantId}/schedule`);
    assert.equal(calls[0]!.init.method, "POST");
    assert.equal(calls[0]!.init.headers["x-company-id"], companyId);
    assert.equal(calls[0]!.init.headers["x-client-id"], clientId);
    assert.deepEqual(body(calls[0]!), {
      resourceMappingId: "map-1",
      scheduledFor: "2026-10-01T09:30:00+05:30",
      expectedDraftRevision: 3,
    });
    assert.deepEqual(created.warnings, [QUEUE_RECOVERY_WARNING]);
    assert.equal(schedulingApi.describeScheduleWarning(QUEUE_RECOVERY_WARNING).includes("queue recovery"), true);
    assert.equal(schedulingApi.describeScheduleWarning(TOKEN_EXPIRY_WARNING).length > 0, true);
  });

  it("409 revision_conflict exposes currentRevision for the reload path", async () => {
    responses.push({
      status: 409,
      body: {
        message: "This draft was changed by someone else. Reload it before scheduling.",
        reason: "revision_conflict",
        currentRevision: 5,
      },
    });

    await assert.rejects(
      schedulingApi.schedule(companyId, clientId, draftId, variantId, {
        resourceMappingId: "map-1",
        scheduledFor: "2026-10-01T09:30:00Z",
        expectedDraftRevision: 3,
      }),
      (err: unknown) => {
        if (!ApiError.isApiError(err)) return false;
        assert.equal(err.status, 409);
        assert.equal(err.reason, "revision_conflict");
        assert.equal(schedulingApi.isRevisionConflict(err), true);
        assert.equal(schedulingApi.conflictingRevision(err), 5);
        return true;
      },
    );
  });

  it("409 already_scheduled exposes the duplicate's scheduledPostId", async () => {
    responses.push({
      status: 409,
      body: { message: "This variant is already scheduled to this target.", reason: "already_scheduled", scheduledPostId: postId },
    });

    await assert.rejects(
      schedulingApi.schedule(companyId, clientId, draftId, variantId, {
        resourceMappingId: "map-1",
        scheduledFor: "2026-10-01T09:30:00Z",
        expectedDraftRevision: 3,
      }),
      (err: unknown) => {
        if (!ApiError.isApiError(err)) return false;
        assert.equal(schedulingApi.isAlreadyScheduled(err), true);
        assert.equal(schedulingApi.existingScheduledPostId(err), postId);
        return true;
      },
    );
  });

  it("409 integration_reconnect_required is detected on schedule", async () => {
    responses.push({
      status: 409,
      body: { message: "The connection for this target must be reconnected first.", reason: "integration_reconnect_required" },
    });

    await assert.rejects(
      schedulingApi.schedule(companyId, clientId, draftId, variantId, {
        resourceMappingId: "map-2",
        scheduledFor: "2026-10-01T09:30:00Z",
        expectedDraftRevision: 3,
      }),
      (err: unknown) => ApiError.isApiError(err) && schedulingApi.isReconnectRequired(err),
    );
  });

  it("400 channel guards keep their reason discriminators", async () => {
    responses.push(
      { status: 400, body: { message: "Publishing to INSTAGRAM_ACCOUNT is not available yet.", reason: "channel_not_supported_yet" } },
      { status: 400, body: { message: "This target does not match the variant’s channel.", reason: "channel_mismatch" } },
      { status: 400, body: { message: "Content is too long for LINKEDIN_ORGANIZATION (max 3000 characters).", reason: "content_too_long_for_channel" } },
      { status: 400, body: { message: "scheduledFor must be at least 2 minutes from now." } },
    );

    const attempt = () =>
      schedulingApi.schedule(companyId, clientId, draftId, variantId, {
        resourceMappingId: "map-1",
        scheduledFor: "2026-10-01T09:30:00Z",
        expectedDraftRevision: 3,
      });

    await assert.rejects(attempt(), (err: unknown) => ApiError.isApiError(err) && schedulingApi.isChannelNotSupported(err) && err.status === 400);
    await assert.rejects(attempt(), (err: unknown) => ApiError.isApiError(err) && schedulingApi.isChannelMismatch(err));
    await assert.rejects(attempt(), (err: unknown) => ApiError.isApiError(err) && schedulingApi.isContentTooLong(err));
    await assert.rejects(attempt(), (err: unknown) => ApiError.isApiError(err) && err.status === 400 && !err.reason && err.message.includes("2 minutes"));
  });

  it("GET /content/scheduled-posts forwards list filters", async () => {
    responses.push({ status: 200, body: { items: [], total: 0, page: 2, limit: 10 } });

    const list = await schedulingApi.list(companyId, clientId, {
      status: "SCHEDULED",
      draftId,
      from: "2026-10-01T00:00:00Z",
      to: "2026-11-01T00:00:00Z",
      search: "ganga",
      page: 2,
      limit: 10,
    });

    assert.equal(calls[0]!.url, "/api/v1/content/scheduled-posts");
    assert.equal(calls[0]!.init.headers["x-company-id"], companyId);
    assert.equal(calls[0]!.init.headers["x-client-id"], clientId);
    const url = new URL(calls[0]!.url, "http://localhost");
    assert.equal(url.searchParams.get("status"), "SCHEDULED");
    assert.equal(url.searchParams.get("draftId"), draftId);
    assert.equal(url.searchParams.get("from"), "2026-10-01T00:00:00Z");
    assert.equal(url.searchParams.get("to"), "2026-11-01T00:00:00Z");
    assert.equal(url.searchParams.get("search"), "ganga");
    assert.equal(url.searchParams.get("page"), "2");
    assert.equal(url.searchParams.get("limit"), "10");
    assert.equal(list.total, 0);
  });

  it("GET /content/scheduled-posts/:id returns the publishing status incl. OUTCOME_UNKNOWN", async () => {
    responses.push({
      status: 200,
      body: {
        id: postId,
        status: "OUTCOME_UNKNOWN",
        failureCode: "missing_post_id",
        attemptCount: 1,
        draftRevision: 3,
        draftChangedSinceScheduled: true,
        scheduledFor: "2026-10-01T09:30:00.000Z",
        channel: "FACEBOOK_PAGE",
        target: { resourceType: "FACEBOOK_PAGE", externalResourceId: "104857600000001" },
      },
    });

    const post = await schedulingApi.get(companyId, clientId, postId);

    assert.equal(calls[0]!.url, `/api/v1/content/scheduled-posts/${postId}`);
    assert.equal(post.status, "OUTCOME_UNKNOWN");
    assert.equal(post.failureCode, "missing_post_id");
    assert.equal(post.draftChangedSinceScheduled, true);
  });

  it("POST /content/scheduled-posts/:id/cancel is body-less and handles not_cancellable", async () => {
    responses.push(
      { status: 200, body: { id: postId, status: "CANCELLED", cancelledAt: "2026-09-25T10:00:00.000Z" } },
      { status: 409, body: { message: "Only a scheduled post that has not started publishing can be cancelled.", reason: "not_cancellable", status: "PUBLISHING" } },
    );

    const cancelled = await schedulingApi.cancel(companyId, clientId, postId);
    assert.equal(calls[0]!.url, `/api/v1/content/scheduled-posts/${postId}/cancel`);
    assert.equal(calls[0]!.init.method, "POST");
    assert.equal(calls[0]!.init.body, undefined, "cancel takes no body");
    assert.equal(cancelled.status, "CANCELLED");

    await assert.rejects(
      schedulingApi.cancel(companyId, clientId, postId),
      (err: unknown) => {
        if (!ApiError.isApiError(err)) return false;
        assert.equal(schedulingApi.isNotCancellable(err), true);
        assert.equal(err.detail<string>("status"), "PUBLISHING");
        return true;
      },
    );
  });

  it("rejects a missing Client scope before any network call", async () => {
    await assert.rejects(
      schedulingApi.list(companyId, ""),
      (err: unknown) => ApiError.isApiError(err) && err.code === "NO_CLIENT_SELECTED",
    );
    await assert.rejects(
      schedulingApi.targets("", clientId, draftId, variantId),
      (err: unknown) => ApiError.isApiError(err) && err.code === "NO_COMPANY_SELECTED",
    );
    assert.equal(calls.length, 0);
  });
});

