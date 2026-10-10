/**
 * Wire-level contract of the real-API integration: exact URLs, headers and
 * bodies sent to the backend, and the transport's session-expiry behaviour.
 * `fetch` is stubbed — nothing leaves the process.
 */
import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import type { ClientsRepository } from "@/features/clients/data/repository";

process.env.NEXT_PUBLIC_DATA_SOURCE = "api";
process.env.NEXT_PUBLIC_API_BASE_URL = "/api/v1";

const { HttpTransport } = await import("../http-transport");
const { onSessionExpired } = await import("../session-events");
const {
  clientsApi,
  toCreateClientPayload,
  CLIENT_LOGO_UPLOAD_LIMITS,
  describeClientLogoError,
  isAssetConflict: isClientLogoAssetConflict,
  isFileTooLarge: isClientLogoFileTooLarge,
  isStorageUnavailable: isClientLogoStorageUnavailable,
} = await import("@/features/admin/projects/live/clients-api");
const { teamRepository } = await import("@/features/admin/team/team-data/repository");
const { getIntegrationsRepository } = await import("@/features/admin/integrations/integrations-data/repository");
const { teamApi, invitationLink } = await import("@/features/admin/team/live/team-api");
const { authService } = await import("@/features/auth/services/auth-service");
const { systemHealthService } = await import("@/features/system-health/services/system-health-service");
const { tenancyHarnessService } = await import("@/features/system-health/services/tenancy-harness-service");
const { integrationsApi } = await import("@/features/admin/integrations/live/integrations-api");
const { whatsappApi } = await import("@/features/admin/channels/live/whatsapp-api");
const { campaignsApi } = await import("@/features/admin/campaigns/live/campaigns-api");
const { draftsApi } = await import("@/features/admin/content/live/drafts-api");
const { schedulingApi, QUEUE_RECOVERY_WARNING, TOKEN_EXPIRY_WARNING } = await import(
  "@/features/admin/content/live/scheduling-api"
);
const { dashboardService } = await import("@/features/dashboard/services/dashboard-service");
const { ApiError } = await import("@/types/api");
const { brandingApi, BRANDING_UPLOAD_LIMITS, describeBrandingError, isAssetConflict, isCompanyInactive, isFileTooLarge, isStorageUnavailable } =
  await import("@/features/admin/settings/live/branding-api");
const { userAvatarApi, USER_AVATAR_LIMITS, isAvatarAssetConflict, isAvatarFileTooLarge, isAvatarStorageUnavailable } =
  await import("@/features/auth/services/user-avatar-api");
const { superAdminAuditLogsApi } = await import(
  "@/features/audit-logs/live/super-admin-audit-logs-api"
);
const { notificationService } = await import(
  "@/features/notifications/services/notification-service"
);
const { superAdminUsersApi } = await import(
  "@/features/users/live/super-admin-users-api"
);
const { SettingsRepository } = await import("@/features/admin/settings/settings-data/repository");
const { organizationApi, describeOrganizationError, isRevisionConflict } = await import(
  "@/features/admin/settings/live/organization-api"
);
const { createApiClientsProvider } = await import("@/features/clients/data/api-provider");
const { superAdminSettingsApi } = await import("@/features/global-settings/live/super-admin-settings-api");
const { createApiSettingsProvider } = await import("@/features/global-settings/data/api-provider");
const { superAdminFeatureFlagsApi } = await import("@/features/feature-flags/live/super-admin-feature-flags-api");
const { liveFlagsProvider } = await import("@/features/feature-flags/data/live-provider");

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

  it("keeps domain error codes (asset_conflict, file_too_large) reachable via details.serverCode", async () => {
    responses.push({ status: 409, body: { message: "Slot changed", code: "asset_conflict", reason: "asset_conflict" } });
    await assert.rejects(new HttpTransport("/api/v1").request({ method: "GET", path: "/settings/branding" }), (error: unknown) => {
      if (!ApiError.isApiError(error)) return false;
      assert.equal(error.detail<string>("serverCode"), "asset_conflict");
      assert.equal(error.reason, "asset_conflict");
      return true;
    });
  });

  it("joins NestJS validation message arrays into readable text", async () => {
    responses.push({ status: 400, body: { message: ["name must be longer than or equal to 3 characters", "website must be a URL address"] } });
    await assert.rejects(new HttpTransport("/api/v1").request({ method: "POST", path: "/clients" }), (error: unknown) => ApiError.isApiError(error) && error.message.includes("name must be") && error.message.includes("website must be"));
  });
});

describe("WhatsApp API", () => {
  it("configures AiSensy at company scope without adding unsupported fields", async () => {
    responses.push({ status: 200, body: { id: "wa-1", provider: "AISENSY", status: "ACTIVE", updatedAt: "2026-09-29T10:00:00Z" } });
    const payload = { apiBaseUrl: "https://api.aisensy.com", apiKey: "secret", senderId: "sender-1" };
    await whatsappApi.configure("c-1", payload);
    assert.equal(calls[0]!.url, "/api/v1/integrations/whatsapp/config");
    assert.equal(calls[0]!.init.method, "PUT");
    assert.equal(calls[0]!.init.headers["x-company-id"], "c-1");
    assert.deepEqual(body(calls[0]!), payload);
  });

  it("reads the stored AiSensy configuration back at Company scope (secrets stay write-only)", async () => {
    responses.push({
      status: 200,
      body: {
        configured: true,
        provider: "AISENSY",
        status: "ACTIVE",
        displayName: "QA workspace",
        apiBaseUrl: "https://api.aisensy.com",
        senderId: "QA",
        hasApiKey: true,
        hasWebhookSecret: false,
        updatedAt: "2026-09-29T10:00:00Z",
      },
    });
    const config = await whatsappApi.getConfig("c-1");
    assert.equal(calls[0]!.url, "/api/v1/integrations/whatsapp/config");
    assert.equal(calls[0]!.init.method, "GET");
    assert.equal(calls[0]!.init.headers["x-company-id"], "c-1");
    assert.equal(calls[0]!.init.headers["x-client-id"], undefined, "config is Company-scoped, never Client-scoped");
    assert.equal(config.configured, true);
    assert.equal(config.hasApiKey, true);
    assert.equal(config.displayName, "QA workspace");
  });

  it("omits apiKey from a re-save so the stored write-only secret is preserved", async () => {
    responses.push({ status: 200, body: { id: "wa-1", provider: "AISENSY", status: "ACTIVE", updatedAt: "2026-09-29T10:05:00Z" } });
    await whatsappApi.configure("c-1", { apiBaseUrl: "https://api.aisensy.com", displayName: "QA workspace" });
    assert.deepEqual(Object.keys(body(calls[0]!)).sort(), ["apiBaseUrl", "displayName"]);
  });

  it("lists and upserts templates with verified Company and Client scope", async () => {
    responses.push({ status: 200, body: { items: [] } }, { status: 200, body: { id: "t-1", name: "reminder", language: "en", status: "ENABLED", variables: ["name"] } });
    await whatsappApi.listTemplates("c-1", "cl-1");
    await whatsappApi.upsertTemplate("c-1", "cl-1", { name: "reminder", language: "en", variables: ["name"] });
    assert.equal(calls[0]!.url, "/api/v1/integrations/whatsapp/templates");
    assert.equal(calls[0]!.init.headers["x-company-id"], "c-1");
    assert.equal(calls[0]!.init.headers["x-client-id"], "cl-1");
    assert.equal(calls[1]!.init.method, "PUT");
    assert.deepEqual(body(calls[1]!), { name: "reminder", language: "en", variables: ["name"] });
  });

  it("queues a template send and reads status history with an optional status filter", async () => {
    responses.push({ status: 201, body: { id: "m-1", status: "QUEUED" } }, { status: 200, body: { items: [] } }, { status: 200, body: { id: "m-1", status: "SENT" } });
    await whatsappApi.sendMessage("c-1", "cl-1", { templateId: "t-1", destinationPhone: "+14155550100", variables: { name: "Ari" } });
    await whatsappApi.listMessages("c-1", "cl-1", "FAILED");
    await whatsappApi.getMessage("c-1", "cl-1", "m-1");
    assert.equal(calls[0]!.url, "/api/v1/integrations/whatsapp/messages");
    assert.equal(calls[0]!.init.method, "POST");
    assert.deepEqual(body(calls[0]!), { templateId: "t-1", destinationPhone: "+14155550100", variables: { name: "Ari" } });
    assert.equal(calls[1]!.url, "/api/v1/integrations/whatsapp/messages?status=FAILED");
    assert.equal(calls[2]!.url, "/api/v1/integrations/whatsapp/messages/m-1");
    for (const call of calls) {
      assert.equal(call.init.headers["x-company-id"], "c-1");
      assert.equal(call.init.headers["x-client-id"], "cl-1");
    }
  });

  it("refuses Client-scoped requests when no Client is selected", async () => {
    await assert.rejects(whatsappApi.listTemplates("c-1", ""), (error: unknown) => ApiError.isApiError(error) && error.code === "NO_CLIENT_SELECTED");
    assert.equal(calls.length, 0);
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

  it("PUT /clients/:id/logo sends multipart FormData, replacesAssetId and context headers", async () => {
    responses.push({
      status: 200,
      body: {
        clientId: "cl-1",
        logo: {
          id: "asset-1",
          purpose: "CLIENT_LOGO",
          url: "https://res.cloudinary.com/demo/image/upload/v1/logo.png",
          mimeType: "image/png",
          format: "png",
          bytes: 1024,
          width: 100,
          height: 100,
          uploadedAt: "2026-09-25T10:00:00Z",
        },
      },
    });

    const file = new Blob(["fake client logo"], { type: "image/png" });
    const result = await clientsApi.uploadLogo("c-1", "cl-1", file, { replacesAssetId: "old-asset-0" });

    assert.equal(calls[0]!.url, "/api/v1/clients/cl-1/logo");
    assert.equal(calls[0]!.init.method, "PUT");
    assert.equal(calls[0]!.init.headers["x-company-id"], "c-1");
    assert.equal(calls[0]!.init.headers["x-client-id"], "cl-1");
    assert.ok(calls[0]!.init.body instanceof FormData);
    const form = calls[0]!.init.body as FormData;
    assert.ok(form.has("file"));
    assert.equal(form.get("replacesAssetId"), "old-asset-0");
    assert.equal(result.clientId, "cl-1");
    assert.equal(result.logo?.id, "asset-1");
    assert.equal(result.logo?.url, "https://res.cloudinary.com/demo/image/upload/v1/logo.png");
  });

  it("DELETE /clients/:id/logo sends context headers and returns logo: null", async () => {
    responses.push({
      status: 200,
      body: {
        clientId: "cl-1",
        logo: null,
      },
    });

    const result = await clientsApi.removeLogo("c-1", "cl-1");
    assert.equal(calls[0]!.url, "/api/v1/clients/cl-1/logo");
    assert.equal(calls[0]!.init.method, "DELETE");
    assert.equal(calls[0]!.init.headers["x-company-id"], "c-1");
    assert.equal(calls[0]!.init.headers["x-client-id"], "cl-1");
    assert.equal(result.clientId, "cl-1");
    assert.equal(result.logo, null);
  });

  it("validates client logo limits and error messages", () => {
    assert.equal(CLIENT_LOGO_UPLOAD_LIMITS.maxBytes, 5 * 1024 * 1024);
    assert.deepEqual(CLIENT_LOGO_UPLOAD_LIMITS.mimeTypes, ["image/png", "image/jpeg", "image/webp"]);

    const err401 = new ApiError({ code: "UNAUTHORIZED", message: "Unauthorized", status: 401 });
    const err403 = new ApiError({ code: "FORBIDDEN", message: "Forbidden", status: 403 });
    const err409 = new ApiError({ code: "CONFLICT", message: "Conflict", status: 409, details: { serverCode: "asset_conflict" } });
    const err413 = new ApiError({ code: "VALIDATION_FAILED", message: "Payload too large", status: 413, details: { serverCode: "file_too_large" } });
    const err502 = new ApiError({ code: "SERVICE_UNAVAILABLE", message: "Storage unavailable", status: 502, details: { serverCode: "storage_unavailable" } });
    const err503 = new ApiError({ code: "SERVICE_UNAVAILABLE", message: "Storage not configured", status: 503, details: { serverCode: "storage_not_configured" } });

    assert.equal(describeClientLogoError(err401), "You must be signed in to manage the client logo.");
    assert.equal(describeClientLogoError(err403), "You do not have permission to manage this client's logo.");
    assert.equal(isClientLogoAssetConflict(err409), true);
    assert.equal(isClientLogoFileTooLarge(err413), true);
    assert.equal(isClientLogoStorageUnavailable(err502), true);
    assert.equal(isClientLogoStorageUnavailable(err503), true);
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

  it("transferOwnership promotes the new owner and demotes the current owner through membership role routes", async () => {
    globalThis.localStorage.setItem("omni_active_company_id", "c-1");
    responses.push({
      status: 200,
      body: {
        id: "u-1",
        email: "sompal7678@example.com",
        memberships: [
          { membershipId: "m-10", companyId: "c-1", companyName: "Acme", companyStatus: "ACTIVE", systemRole: "OWNER" },
          { membershipId: "m-11", companyId: "c-2", companyName: "Other", companyStatus: "ACTIVE", systemRole: "ADMIN" },
        ],
      },
    });
    responses.push({
      status: 200,
      body: [
        { id: "m-10", systemRole: "OWNER", user: { id: "u-1", email: "sompal7678@example.com", name: "sompal7678" } },
        { id: "m-11", systemRole: "ADMIN", user: { id: "u-2", email: "newowner@example.com", name: "New Owner" } },
      ],
    });
    responses.push({ status: 200, body: { id: "m-10", systemRole: "ADMIN" } });
    responses.push({ status: 200, body: { id: "m-11", systemRole: "OWNER" } });

    await SettingsRepository.transferOwnership("New Owner", "newowner@example.com");

    assert.equal(calls[1]!.url, "/api/v1/team/members");
    assert.equal(calls[2]!.url, "/api/v1/team/members/m-10/role");
    assert.deepEqual(body(calls[2]!), { systemRole: "ADMIN" });
    assert.equal(calls[3]!.url, "/api/v1/team/members/m-11/role");
    assert.deepEqual(body(calls[3]!), { systemRole: "OWNER" });
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

describe("tenant selection guardrails", () => {
  const originalWindow = globalThis.window;

  beforeEach(() => {
    const store = new Map<string, string>();
    Object.defineProperty(globalThis, "localStorage", {
      value: {
        getItem: (key: string) => store.get(key) ?? null,
        setItem: (key: string, value: string) => store.set(key, value),
        removeItem: (key: string) => store.delete(key),
        clear: () => store.clear(),
      },
      configurable: true,
    });
    Object.defineProperty(globalThis, "window", {
      value: { localStorage: (globalThis as { localStorage: Storage }).localStorage },
      configurable: true,
    });
  });

  afterEach(() => {
    delete (globalThis as { localStorage?: Storage }).localStorage;
    if (originalWindow === undefined) {
      delete (globalThis as { window?: unknown }).window;
    } else {
      Object.defineProperty(globalThis, "window", { value: originalWindow, configurable: true });
    }
  });

  it("teamRepository rejects a live call without a real company selection", async () => {
    await assert.rejects(
      () => teamRepository.getMembers(),
      (err: unknown) => ApiError.isApiError(err) && err.code === "NO_COMPANY_SELECTED",
    );
    assert.equal(calls.length, 0, "no request should be sent when company is unset");
  });

  it("integrationsRepository rejects OAuth without a real company selection", async () => {
    await assert.rejects(
      () => getIntegrationsRepository().authorize("meta"),
      (err: unknown) => err instanceof Error && err.message.includes("Select a Company to continue"),
    );
    assert.equal(calls.length, 0, "no OAuth request should be sent when company is unset");
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

  it("POST /content/drafts sends expected draft fields including assetIds", async () => {
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
        assetIds: ["asset-123"],
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
      assetIds: ["asset-123"],
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
      assetIds: ["asset-123"],
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

describe("dashboardService (real platform aggregates)", () => {
  const OVERVIEW = {
    generatedAt: "2026-10-08T10:00:00.000Z",
    range: { key: "30d", days: 30, from: "2026-09-08T10:00:00.000Z", to: "2026-10-08T10:00:00.000Z" },
    metrics: {
      companies: { total: 7, active: 6, newInRange: 2, changePercent: 100 },
      users: { total: 20, deactivated: 1, newInRange: 5, changePercent: null },
      clients: { total: 12, newInRange: 3, changePercent: -25 },
      subscriptions: { active: 5, pastDue: 1, suspended: 0, canceled: 0 },
      mrr: { amountMinor: 900000, currency: "INR" },
      integrations: { connected: 4, needAttention: 1 },
      incidents: { open: 2 },
    },
    companyGrowth: { total: 7, series: [{ month: "2026-09", value: 3 }, { month: "2026-10", value: 2 }] },
    revenue: { mrrMinor: 900000, currency: "INR", collectedSeries: [{ month: "2026-10", value: 1234 }] },
    subscriptionDistribution: { activeTotal: 5, segments: [{ key: "p1", label: "Growth", companies: 5 }] },
    latestSignups: [{ id: "c1", name: "Acme", createdAt: "2026-10-08T09:00:00.000Z", plan: "Growth", subscriptionStatus: "ACTIVE" }],
    apiUsage: { totalRequests: 100, changePercent: 10, successRate: 98.5, failedRequests: 2, serverErrors: 1, avgResponseMs: 120, series: [1, 2, 3] },
    integrationStatus: [{ id: "META", name: "Meta", status: "Connected", connections: 3, needAttention: 0 }],
    attention: [{ id: "att_past_due", title: "Subscriptions past due", detail: "1 company subscription is overdue", severity: "critical", count: 1, href: "/super-admin/billing", actionLabel: "Review billing" }],
    recentActivity: [{ id: "a1", kind: "company_registered", action: "company.created", title: "Company created", actor: "Manish Sirohi", companyName: "Acme", outcome: "SUCCESS", createdAt: "2026-10-08T09:30:00.000Z" }],
  };

  it("reads the platform overview and the queue stats, and marks every tile live", async () => {
    responses.push({ status: 200, body: OVERVIEW });
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

    assert.equal(calls[0]!.url, "/api/v1/super-admin/dashboard/overview?range=30d");
    assert.equal(calls[0]!.init.method, "GET");
    assert.equal(calls[1]!.url, "/api/v1/super-admin/jobs/stats");

    const metric = (key: string) => snapshot.metrics.find((m) => m.key === key);
    assert.equal(metric("totalCompanies")!.value, 7);
    assert.deepEqual(metric("totalCompanies")!.delta, { changePercent: 100, direction: "up-is-good" });
    assert.equal(metric("totalUsers")!.delta, null, "no earlier period means no trend");
    assert.equal(metric("monthlyRevenue")!.value, 900000);
    assert.equal(metric("monthlyRevenue")!.currency, "INR");
    assert.equal(metric("runningJobs")!.value, 6, "active jobs of the reachable queues (2 + 4)");
    assert.equal(metric("openIncidents")!.value, 2);
    assert.equal(metric("systemUptime"), undefined, "uptime history is not tracked, so the tile is not shown");
    assert.ok(snapshot.metrics.every((m) => m.isLive === true));

    assert.deepEqual(snapshot.companyGrowth.series.map((p) => p.month), ["Sep", "Oct"]);
    assert.equal(snapshot.subscriptionDistribution.segments[0]!.label, "Growth");
    assert.equal(snapshot.latestSignups[0]!.tier, "Growth");
    assert.equal(snapshot.apiUsage.successRate, 98.5);
    assert.ok(snapshot.attention.some((a) => a.id === "att_past_due"));
    assert.ok(snapshot.attention.some((a) => a.id === "att_failed_jobs"), "failed jobs from the queues are listed");
    assert.equal(snapshot.recentActivity[0]!.detail, "Manish Sirohi · Acme");
  });

  it("still shows the dashboard when the queue stats are unreachable (no running-jobs tile)", async () => {
    responses.push({ status: 200, body: OVERVIEW });
    responses.push({ status: 503, body: { message: "Redis down", code: "SERVICE_UNAVAILABLE" } });
    const snapshot = await dashboardService.getSnapshot("30d");
    assert.equal(snapshot.metrics.find((m) => m.key === "runningJobs"), undefined);
    assert.equal(snapshot.metrics.find((m) => m.key === "totalCompanies")!.value, 7);
  });

  it("propagates an overview failure without any silent demo data", async () => {
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

    const url = new URL(calls[0]!.url, "http://localhost");
    assert.equal(url.pathname, "/api/v1/content/scheduled-posts");
    assert.equal(calls[0]!.init.headers["x-company-id"], companyId);
    assert.equal(calls[0]!.init.headers["x-client-id"], clientId);
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

describe("brandingApi (IMAGE-01 Phase 2 contracts)", () => {
  const companyId = "c-branding-1";

  it("GET /settings/branding forwards x-company-id and parses slots", async () => {
    responses.push({
      status: 200,
      body: {
        logo: { id: "a-1", purpose: "logo", url: "https://res.cloudinary.com/logo.png", mimeType: "image/png", format: "png", bytes: 1024, width: 200, height: 50, uploadedAt: "2026-09-25T10:00:00Z" },
        favicon: null,
        reportLogo: null,
        emailLogo: null,
      },
    });

    const result = await brandingApi.get(companyId);
    assert.equal(calls[0]!.url, "/api/v1/settings/branding");
    assert.equal(calls[0]!.init.method, "GET");
    assert.equal(calls[0]!.init.headers["x-company-id"], companyId);
    assert.equal(result.logo?.id, "a-1");
    assert.equal(result.favicon, null);
  });

  it("PUT /settings/branding/:purpose sends multipart FormData and replacesAssetId", async () => {
    responses.push({
      status: 200,
      body: {
        logo: null,
        favicon: { id: "a-fav", purpose: "favicon", url: "https://res.cloudinary.com/fav.png", mimeType: "image/png", format: "png", bytes: 512, width: 32, height: 32, uploadedAt: "2026-09-25T10:00:00Z" },
        reportLogo: null,
        emailLogo: null,
      },
    });

    const file = new Blob(["fake favicon"], { type: "image/png" });
    const result = await brandingApi.upload("favicon", file, { replacesAssetId: "old-asset-1", companyId });

    assert.equal(calls[0]!.url, "/api/v1/settings/branding/favicon");
    assert.equal(calls[0]!.init.method, "PUT");
    assert.equal(calls[0]!.init.headers["x-company-id"], companyId);
    assert.ok(calls[0]!.init.body instanceof FormData);
    const form = calls[0]!.init.body as FormData;
    assert.ok(form.has("file"));
    assert.equal(form.get("replacesAssetId"), "old-asset-1");
    assert.equal(result.favicon?.id, "a-fav");
  });

  it("DELETE /settings/branding/:purpose sends x-company-id and clears slot safely", async () => {
    responses.push({
      status: 200,
      body: {
        logo: null,
        favicon: null,
        reportLogo: null,
        emailLogo: null,
      },
    });

    const result = await brandingApi.remove("report-logo", companyId);
    assert.equal(calls[0]!.url, "/api/v1/settings/branding/report-logo");
    assert.equal(calls[0]!.init.method, "DELETE");
    assert.equal(calls[0]!.init.headers["x-company-id"], companyId);
    assert.equal(result.reportLogo, null);
  });

  it("PUT and DELETE /super-admin/companies/:companyId/logo operate on Super Admin primary logo route", async () => {
    responses.push(
      {
        status: 200,
        body: {
          logo: { id: "a-sa-logo", purpose: "logo", url: "https://res.cloudinary.com/sa.png", mimeType: "image/png", format: "png", bytes: 2048, width: 400, height: 100, uploadedAt: "2026-09-25T10:00:00Z" },
          favicon: null,
          reportLogo: null,
          emailLogo: null,
        },
      },
      {
        status: 200,
        body: { logo: null, favicon: null, reportLogo: null, emailLogo: null },
      },
    );

    const file = new Blob(["logo data"], { type: "image/png" });
    const uploaded = await brandingApi.uploadSuperAdminLogo("c-target-1", file);
    assert.equal(calls[0]!.url, "/api/v1/super-admin/companies/c-target-1/logo");
    assert.equal(calls[0]!.init.method, "PUT");
    assert.equal(uploaded.logo?.id, "a-sa-logo");

    const removed = await brandingApi.removeSuperAdminLogo("c-target-1");
    assert.equal(calls[1]!.url, "/api/v1/super-admin/companies/c-target-1/logo");
    assert.equal(calls[1]!.init.method, "DELETE");
    assert.equal(removed.logo, null);
  });

  it("identifies 409 asset_conflict, 413 file_too_large, 503 storage_not_configured, and 502 storage_unavailable", async () => {
    responses.push(
      { status: 409, body: { code: "asset_conflict", message: "Asset has been modified concurrently" } },
      { status: 413, body: { code: "PAYLOAD_TOO_LARGE", message: "File exceeds 2MB limit" } },
      { status: 503, body: { code: "storage_not_configured", message: "Cloudinary credentials missing" } },
      { status: 502, body: { code: "storage_unavailable", message: "Cloudinary unreachable" } },
    );

    await assert.rejects(brandingApi.get(companyId), (err: unknown) => isAssetConflict(err) === true);
    await assert.rejects(brandingApi.get(companyId), (err: unknown) => isFileTooLarge(err) === true);
    await assert.rejects(brandingApi.get(companyId), (err: unknown) => isStorageUnavailable(err) === true);
    await assert.rejects(brandingApi.get(companyId), (err: unknown) => isStorageUnavailable(err) === true);
  });

  it("lets the browser build the multipart boundary (no forced Content-Type)", async () => {
    responses.push({ status: 200, body: { logo: null, favicon: null, reportLogo: null, emailLogo: null } });

    await brandingApi.upload("logo", new Blob(["logo"], { type: "image/png" }), { companyId });

    const headers = calls[0]!.init.headers;
    assert.equal("Content-Type" in headers, false, "FormData must supply its own boundary");
    assert.equal(headers["x-company-id"], companyId);
  });

  it("distinguishes 409 asset_conflict from 409 company_not_active", async () => {
    responses.push(
      { status: 409, body: { message: "This branding slot was changed by someone else. Reload and try again.", code: "asset_conflict" } },
      { status: 409, body: { message: "The Company is not active.", code: "company_not_active" } },
    );

    await assert.rejects(brandingApi.get(companyId), (err: unknown) => {
      assert.equal(isAssetConflict(err), true);
      assert.equal(isCompanyInactive(err), false);
      return true;
    });
    await assert.rejects(brandingApi.get(companyId), (err: unknown) => {
      assert.equal(isAssetConflict(err), false, "a suspended Company is not a slot conflict");
      assert.equal(isCompanyInactive(err), true);
      return true;
    });
  });

  it("recognises the backend's 400 file_too_large (policy limit, not just 413)", async () => {
    responses.push({ status: 400, body: { message: "The uploaded image was rejected.", code: "file_too_large" } });

    await assert.rejects(brandingApi.get(companyId), (err: unknown) => isFileTooLarge(err) === true);
  });

  it("turns image-validation and storage codes into readable copy", async () => {
    responses.push(
      { status: 400, body: { message: "The uploaded image was rejected.", code: "unsupported_format" } },
      { status: 400, body: { message: "The uploaded image was rejected.", code: "not_square" } },
      { status: 503, body: { message: "The upload could not be completed. Try again.", code: "upload_interrupted" } },
    );

    const messages: string[] = [];
    await assert.rejects(brandingApi.get(companyId), (err: unknown) => {
      messages.push(describeBrandingError(err));
      return true;
    });
    await assert.rejects(brandingApi.get(companyId), (err: unknown) => {
      messages.push(describeBrandingError(err));
      return true;
    });
    await assert.rejects(brandingApi.get(companyId), (err: unknown) => {
      messages.push(describeBrandingError(err));
      return isStorageUnavailable(err);
    });

    assert.equal(messages[0], "Unsupported image format for this slot.");
    assert.equal(messages[1], "This slot requires a square image.");
    assert.equal(messages[2], "The upload could not be completed. Please try again.");
  });

  it("mirrors the backend upload policies per slot", () => {
    assert.equal(BRANDING_UPLOAD_LIMITS.logo.maxBytes, 5 * 1024 * 1024);
    assert.equal(BRANDING_UPLOAD_LIMITS.favicon.maxBytes, 512 * 1024);
    assert.equal(BRANDING_UPLOAD_LIMITS.favicon.square, true);
    assert.deepEqual(BRANDING_UPLOAD_LIMITS.logo.mimeTypes, ["image/png", "image/jpeg", "image/webp"]);
    assert.deepEqual(BRANDING_UPLOAD_LIMITS.favicon.mimeTypes, ["image/png", "image/webp"]);
  });
});

describe("userAvatarApi (IMAGE-01 Phase 4 contracts)", () => {
  it("PUT /users/me/avatar sends multipart FormData and replacesAssetId", async () => {
    responses.push({
      status: 200,
      body: {
        avatar: {
          id: "a-u-1",
          purpose: "user_avatar",
          url: "https://res.cloudinary.com/avatar.png",
          mimeType: "image/png",
          format: "png",
          bytes: 1024,
          width: 200,
          height: 200,
          uploadedAt: "2026-09-26T10:00:00Z",
        },
      },
    });

    const file = new Blob(["avatar binary"], { type: "image/png" });
    const result = await userAvatarApi.upload(file, { replacesAssetId: "old-avatar-1" });

    assert.equal(calls[0]!.url, "/api/v1/users/me/avatar");
    assert.equal(calls[0]!.init.method, "PUT");
    assert.ok(calls[0]!.init.body instanceof FormData);
    const form = calls[0]!.init.body as FormData;
    assert.ok(form.get("file"));
    assert.equal(form.get("replacesAssetId"), "old-avatar-1");
    assert.equal(result.avatar?.id, "a-u-1");
  });

  it("DELETE /users/me/avatar removes avatar and returns null", async () => {
    responses.push({
      status: 200,
      body: { avatar: null },
    });

    const result = await userAvatarApi.remove();

    assert.equal(calls[0]!.url, "/api/v1/users/me/avatar");
    assert.equal(calls[0]!.init.method, "DELETE");
    assert.equal(result.avatar, null);
  });

  it("identifies avatar upload limits and error codes", async () => {
    assert.equal(USER_AVATAR_LIMITS.maxBytes, 2 * 1024 * 1024);
    assert.deepEqual(USER_AVATAR_LIMITS.mimeTypes, ["image/png", "image/jpeg", "image/webp"]);

    responses.push(
      { status: 409, body: { code: "asset_conflict", message: "Modified" } },
      { status: 413, body: { code: "PAYLOAD_TOO_LARGE", message: "Too large" } },
      { status: 503, body: { code: "storage_unavailable", message: "Storage down" } },
    );

    const file = new Blob(["test"], { type: "image/png" });
    await assert.rejects(userAvatarApi.upload(file), (err: unknown) => isAvatarAssetConflict(err) === true);
    await assert.rejects(userAvatarApi.upload(file), (err: unknown) => isAvatarFileTooLarge(err) === true);
    await assert.rejects(userAvatarApi.upload(file), (err: unknown) => isAvatarStorageUnavailable(err) === true);
  });
});

describe("superAdminAuditLogsApi (TASK-17 persisted audit logs contracts)", () => {
  it("GET /super-admin/audit-logs passes query parameters and parses paginated response", async () => {
    responses.push({
      status: 200,
      body: {
        items: [
          {
            id: "al-1",
            createdAt: "2026-09-26T12:00:00Z",
            action: "company.created",
            resourceType: "COMPANY",
            resourceId: "comp-1",
            outcome: "SUCCESS",
            actor: {
              type: "USER",
              userId: "u-1",
              platformRole: "SUPER_ADMIN",
              membershipId: null,
              name: "Super Admin",
              email: "admin@omi.test",
            },
            companyId: "comp-1",
            companyName: "Acme Media",
            clientId: null,
            clientName: null,
            metadata: { name: "Acme Media" },
            requestId: "req-1",
            ipAddress: "127.0.0.1",
            userAgent: "Mozilla/5.0",
          },
        ],
        total: 1,
        page: 1,
        limit: 25,
      },
    });

    const result = await superAdminAuditLogsApi.list({
      page: 1,
      limit: 25,
      action: "company.created",
      resourceType: "COMPANY",
      outcome: "SUCCESS",
      companyId: "comp-1",
      from: "2026-09-01T00:00:00Z",
      to: "2026-09-26T12:00:00Z",
    });

    assert.equal(calls.length, 1);
    const callUrl = new URL(calls[0]!.url, "http://localhost");
    assert.equal(callUrl.pathname, "/api/v1/super-admin/audit-logs");
    assert.equal(callUrl.searchParams.get("page"), "1");
    assert.equal(callUrl.searchParams.get("limit"), "25");
    assert.equal(callUrl.searchParams.get("action"), "company.created");
    assert.equal(callUrl.searchParams.get("resourceType"), "COMPANY");
    assert.equal(callUrl.searchParams.get("outcome"), "SUCCESS");
    assert.equal(callUrl.searchParams.get("companyId"), "comp-1");
    assert.equal(callUrl.searchParams.get("from"), "2026-09-01T00:00:00Z");
    assert.equal(callUrl.searchParams.get("to"), "2026-09-26T12:00:00Z");
    assert.equal(calls[0]!.init.method, "GET");

    assert.equal(result.total, 1);
    assert.equal(result.items.length, 1);
    assert.equal(result.items[0]!.id, "al-1");
    assert.equal(result.items[0]!.actor.name, "Super Admin");
  });

  it("GET /super-admin/audit-logs/:id fetches single record by id", async () => {
    responses.push({
      status: 200,
      body: {
        id: "al-123",
        createdAt: "2026-09-26T12:00:00Z",
        action: "client.created",
        resourceType: "CLIENT",
        resourceId: "cli-1",
        outcome: "SUCCESS",
        actor: {
          type: "USER",
          userId: "u-2",
          platformRole: null,
          membershipId: "m-1",
          name: "Team Lead",
          email: "lead@acme.test",
        },
        companyId: "comp-1",
        companyName: "Acme Media",
        clientId: "cli-1",
        clientName: "Alpha Brand",
        metadata: null,
        requestId: null,
        ipAddress: null,
        userAgent: null,
      },
    });

    const result = await superAdminAuditLogsApi.get("al-123");

    assert.equal(calls.length, 1);
    assert.equal(calls[0]!.url, "/api/v1/super-admin/audit-logs/al-123");
    assert.equal(calls[0]!.init.method, "GET");
    assert.equal(result.id, "al-123");
    assert.equal(result.resourceType, "CLIENT");
  });

  describe("notificationService (In-app notifications Phase A contracts)", () => {
    it("GET /notifications passes limit and unreadOnly query parameters", async () => {
      responses.push({
        status: 200,
        body: {
          items: [
            {
              id: "notif-1",
              type: "publishing.failed",
              title: "Post Failed",
              message: "Post could not be published to LinkedIn",
              data: { scheduledPostId: "post-100" },
              readAt: null,
              createdAt: "2026-09-28T10:00:00.000Z",
              companyId: "comp-1",
              clientId: "cli-1",
            },
          ],
          total: 1,
          unreadCount: 1,
          page: 1,
          limit: 10,
        },
      });

      const res = await notificationService.list({ pageSize: 10, filters: { readState: "unread" } as any });
      assert.equal(calls.length, 1);
      assert.equal(calls[0]!.init.method, "GET");
      assert.match(calls[0]!.url, /\/api\/v1\/notifications/);
      assert.match(calls[0]!.url, /limit=10/);
      assert.match(calls[0]!.url, /unreadOnly=true/);
      assert.equal(res.data.length, 1);
      assert.equal(res.data[0]!.id, "notif-1");
      assert.equal(res.data[0]!.severity, "critical");
      assert.equal(res.data[0]!.isRead, false);
      assert.equal(res.pagination.total, 1);
    });

    it("PATCH /notifications/:id/read marks notification as read", async () => {
      responses.push({ status: 200, body: { id: "notif-1", readAt: "2026-09-28T10:05:00.000Z" } });
      const res = await notificationService.markRead("notif-1");
      assert.equal(calls.length, 1);
      assert.equal(calls[0]!.url, "/api/v1/notifications/notif-1/read");
      assert.equal(calls[0]!.init.method, "PATCH");
      assert.equal(res.success, true);
    });

    it("POST /notifications/read-all marks all notifications as read", async () => {
      responses.push({ status: 200, body: { updated: 5 } });
      const res = await notificationService.markAllRead();
      assert.equal(calls.length, 1);
      assert.equal(calls[0]!.url, "/api/v1/notifications/read-all");
      assert.equal(calls[0]!.init.method, "POST");
      assert.equal(res.success, true);
    });
  });

  describe("authService (Forgot & Reset Password Phase A contracts)", () => {
    it("POST /auth/forgot-password sends only the email and gets the enumeration-safe accepted body", async () => {
      responses.push({ status: 200, body: { status: "accepted" } });
      const res = await authService.requestPasswordReset("user@acme.test");
      assert.equal(calls.length, 1);
      assert.equal(calls[0]!.url, "/api/v1/auth/forgot-password");
      assert.equal(calls[0]!.init.method, "POST");
      const body = JSON.parse(calls[0]!.init.body as string);
      assert.deepEqual(Object.keys(body), ["email"]);
      assert.equal(body.email, "user@acme.test");
      assert.equal(res, undefined);
    });

    it("POST /auth/reset-password sends single-use token and new password", async () => {
      responses.push({ status: 200, body: { status: "password_reset" } });
      await authService.resetPassword("tok-reset-999", "NewSecurePassword123!");
      assert.equal(calls.length, 1);
      assert.equal(calls[0]!.url, "/api/v1/auth/reset-password");
      assert.equal(calls[0]!.init.method, "POST");
      const body = JSON.parse(calls[0]!.init.body as string);
      assert.equal(body.token, "tok-reset-999");
      assert.equal(body.password, "NewSecurePassword123!");
    });
  });

  describe("teamApi (Company Invitations Phase A1 contracts)", () => {
    it("GET /companies/:companyId/invitations passes company scope header and query", async () => {
      responses.push({
        status: 200,
        body: {
          items: [
            {
              id: "inv-1",
              email: "dev@acme.test",
              systemRole: "ADMIN",
              status: "pending",
              expiresAt: "2026-09-30T10:00:00.000Z",
              createdAt: "2026-09-28T10:00:00.000Z",
              invitedBy: { userId: "u-1", name: "Admin", email: "admin@acme.test" },
            },
          ],
          total: 1,
          page: 1,
          limit: 25,
        },
      });

      const res = await teamApi.listInvitations("comp-1", { status: "pending" });
      assert.equal(calls.length, 1);
      assert.equal(calls[0]!.init.method, "GET");
      assert.equal(calls[0]!.init.headers["x-company-id"], "comp-1");
      assert.match(calls[0]!.url, /\/api\/v1\/companies\/comp-1\/invitations/);
      assert.match(calls[0]!.url, /status=pending/);
      assert.equal(res.items.length, 1);
      assert.equal(res.items[0]!.email, "dev@acme.test");
    });

    it("POST /companies/:companyId/invitations/:id/resend re-issues invitation", async () => {
      responses.push({ status: 200, body: { invitationId: "inv-2", status: "pending", expiresAt: "2026-09-30T10:00:00.000Z" } });
      const res = await teamApi.resendInvitation("comp-1", "inv-1");
      assert.equal(calls.length, 1);
      assert.equal(calls[0]!.init.method, "POST");
      assert.equal(calls[0]!.url, "/api/v1/companies/comp-1/invitations/inv-1/resend");
      assert.equal(calls[0]!.init.headers["x-company-id"], "comp-1");
      assert.equal(res.status, "pending");
    });

    it("DELETE /companies/:companyId/invitations/:id revokes invitation", async () => {
      responses.push({ status: 200, body: { invitationId: "inv-1", status: "revoked" } });
      const res = await teamApi.revokeInvitation("comp-1", "inv-1");
      assert.equal(calls.length, 1);
      assert.equal(calls[0]!.init.method, "DELETE");
      assert.equal(calls[0]!.url, "/api/v1/companies/comp-1/invitations/inv-1");
      assert.equal(calls[0]!.init.headers["x-company-id"], "comp-1");
      assert.equal(res.status, "revoked");
    });
  });

  describe("integrationsApi (Client Channel Overview Phase A3 contracts)", () => {
    it("GET /integrations/overview sends x-company-id and x-client-id headers", async () => {
      responses.push({
        status: 200,
        body: {
          clientId: "cli-1",
          providers: [
            {
              provider: "LINKEDIN",
              status: "MAPPED",
              health: "healthy",
              reconnectRequired: false,
              integrationId: "int-1",
              companyConnectionAvailable: true,
              mappedResourceCount: 1,
              resources: [
                {
                  mappingId: "map-1",
                  resourceType: "LINKEDIN_ORGANIZATION",
                  externalResourceId: "urn:li:org:123",
                  integrationId: "int-1",
                },
              ],
              lastUpdatedAt: "2026-09-28T10:00:00.000Z",
              publishingSupported: true,
            },
          ],
        },
      });

      const res = await integrationsApi.getOverview("comp-1", "cli-1");
      assert.equal(calls.length, 1);
      assert.equal(calls[0]!.init.method, "GET");
      assert.equal(calls[0]!.url, "/api/v1/integrations/overview");
      assert.equal(calls[0]!.init.headers["x-company-id"], "comp-1");
      assert.equal(calls[0]!.init.headers["x-client-id"], "cli-1");
      assert.equal(res.providers.length, 1);
      assert.equal(res.providers[0]!.provider, "LINKEDIN");
      assert.equal(res.providers[0]!.status, "MAPPED");
    });
  });

  describe("superAdminUsersApi (Super Admin User Lifecycle Phase B contracts)", () => {
    it("PATCH /super-admin/users/:userId/status updates user status", async () => {
      responses.push({ status: 200, body: { status: "DEACTIVATED" } });
      const res = await superAdminUsersApi.setStatus("usr-123", "DEACTIVATED");
      assert.equal(calls.length, 1);
      assert.equal(calls[0]!.init.method, "PATCH");
      assert.equal(calls[0]!.url, "/api/v1/super-admin/users/usr-123/status");
      const body = JSON.parse(calls[0]!.init.body as string);
      assert.equal(body.status, "DEACTIVATED");
      assert.equal(res.status, "DEACTIVATED");
    });

    it("POST /super-admin/users/:userId/revoke-sessions revokes user sessions", async () => {
      responses.push({ status: 200, body: { revokedSessions: 3 } });
      const res = await superAdminUsersApi.revokeSessions("usr-123");
      assert.equal(calls.length, 1);
      assert.equal(calls[0]!.init.method, "POST");
      assert.equal(calls[0]!.url, "/api/v1/super-admin/users/usr-123/revoke-sessions");
      assert.equal(res.revokedSessions, 3);
    });

    it("POST /super-admin/users/:userId/password-reset triggers admin password reset", async () => {
      responses.push({ status: 200, body: { status: "queued" } });
      const res = await superAdminUsersApi.passwordReset("usr-123");
      assert.equal(calls.length, 1);
      assert.equal(calls[0]!.init.method, "POST");
      assert.equal(calls[0]!.url, "/api/v1/super-admin/users/usr-123/password-reset");
      assert.equal(res.status, "queued");
    });
  });
});

describe("client create wizard plan slot (real billing, no client billing)", () => {
  const fallback = {
    mode: "mock",
    listCreationCompanies: async () => [],
    getOwnCompanySlot: async () => null,
  } as unknown as ClientsRepository;
  const provider = createApiClientsProvider(fallback);
  /** The slot read is guarded by the same UUID check as every other company-scoped call. */
  const companyId = "6092634f-cfc4-4c34-8371-285f9f8d3f73";

  it("reads the company's plan slot from GET /billing/summary with the company header", async () => {
    responses.push({
      status: 200,
      body: {
        subscriptionRequired: false,
        subscriptionId: "s-1",
        status: "ACTIVE",
        plan: { id: "p-1", name: "Growth", isActive: true, monthlyPrice: 4900 },
        currentPeriodEnd: "2026-10-01T00:00:00.000Z",
        limits: { maxClients: 5, maxAiTokens: 100000 },
        usage: { currentClients: 5, currentAiTokens: 12 },
        remaining: { clients: 0, aiTokens: 99988 },
      },
    });
    const slot = await provider.getOwnCompanySlot(companyId);
    assert.equal(calls.length, 1);
    assert.equal(calls[0]!.url, "/api/v1/billing/summary");
    assert.equal(calls[0]!.init.headers["x-company-id"], companyId);
    assert.equal(calls[0]!.init.headers["x-client-id"], undefined, "the slot is Company-scoped, never Client-scoped");
    assert.equal(slot!.planName, "Growth");
    assert.equal(slot!.clientLimit, 5);
    assert.equal(slot!.clientsUsed, 5);
    assert.equal(slot!.availableSlots, 0);
    assert.equal(slot!.eligibility.ok, false, "a company at its limit is refused before the 402");
    assert.equal(slot!.eligibility.code, "limit_reached");
  });

  it("reports an unprovisioned company as unlimited, exactly like the backend", async () => {
    responses.push({ status: 200, body: { subscriptionRequired: true, subscriptionId: null, status: "INCOMPLETE", plan: null } });
    const slot = await provider.getOwnCompanySlot(companyId);
    assert.equal(slot!.planName, "No subscription");
    assert.equal(slot!.clientLimit, null);
    assert.equal(slot!.availableSlots, null);
    assert.equal(slot!.eligibility.ok, true, "no subscription means no limit");
  });

  it("returns null rather than inventing a budget when the read fails", async () => {
    responses.push({ status: 404, body: { message: "Not found.", code: "not_found" } });
    assert.equal(await provider.getOwnCompanySlot(companyId), null);
  });

  it("takes super-admin company limits from the subscription list, not from constants", async () => {
    responses.push(
      {
        status: 200,
        body: { items: [{ id: "c-1", name: "Acme", status: "ACTIVE", clientCount: 4, memberCount: 3 }], total: 1, page: 1, limit: 100 },
      },
      { status: 200, body: [{ id: "s-1", companyId: "c-1", status: "ACTIVE", plan: { id: "p-1", name: "Growth", maxClients: 10 } }] },
    );
    const list = await provider.listCreationCompanies();
    assert.equal(calls[1]!.url, "/api/v1/super-admin/subscriptions");
    const acme = list.find((item) => item.id === "c-1");
    assert.ok(acme, "the live company is in the list");
    assert.equal(acme.planName, "Growth");
    assert.equal(acme.clientLimit, 10);
    assert.equal(acme.clientsUsed, 4);
    assert.equal(acme.availableSlots, 6);
    assert.equal(acme.eligibility.ok, true);
  });
});

describe("organizationApi (Organization Settings contracts)", () => {
  const companyId = "c-org-123";

  it("GET /settings/organization forwards x-company-id and parses profile", async () => {
    responses.push({
      status: 200,
      body: {
        id: companyId,
        name: "Acme Corp",
        displayName: "Acme Corp",
        legalName: "Acme Corporation Inc.",
        industry: "Technology & SaaS",
        website: "https://acme.com",
        contactEmail: "admin@acme.com",
        contactPhone: "+14155552671",
        description: "Leading enterprise cloud tools",
        address: {
          street: "123 Market St",
          city: "San Francisco",
          state: "CA",
          country: "US",
          postalCode: "94105",
        },
        taxId: "TAX-12345",
        pan: null,
        timezone: "America/Los_Angeles",
        currency: "USD",
        revision: 3,
        updatedAt: "2026-10-09T08:00:00Z",
      },
    });

    const result = await organizationApi.get(companyId);
    assert.equal(calls[0]!.url, "/api/v1/settings/organization");
    assert.equal(calls[0]!.init.method, "GET");
    assert.equal(calls[0]!.init.headers["x-company-id"], companyId);
    assert.equal(result.id, companyId);
    assert.equal(result.displayName, "Acme Corp");
    assert.equal(result.legalName, "Acme Corporation Inc.");
    assert.equal(result.revision, 3);
    assert.equal(result.address?.city, "San Francisco");
  });

  it("PATCH /settings/organization sends x-company-id, expectedRevision, and updates profile", async () => {
    responses.push({
      status: 200,
      body: {
        id: companyId,
        name: "Acme Global",
        displayName: "Acme Global",
        legalName: "Acme Corporation Inc.",
        industry: "Technology & SaaS",
        website: "https://acmeglobal.com",
        contactEmail: "admin@acmeglobal.com",
        contactPhone: "+14155552671",
        description: "Global enterprise cloud tools",
        address: {
          street: "456 Mission St",
          city: "San Francisco",
          state: "CA",
          country: "US",
          postalCode: "94105",
        },
        taxId: "TAX-12345",
        pan: null,
        timezone: "America/Los_Angeles",
        currency: "USD",
        revision: 4,
        updatedAt: "2026-10-09T08:30:00Z",
      },
    });

    const payload = {
      expectedRevision: 3,
      displayName: "Acme Global",
      website: "https://acmeglobal.com",
      address: {
        street: "456 Mission St",
        city: "San Francisco",
        state: "CA",
        country: "US",
        postalCode: "94105",
      },
    };

    const result = await organizationApi.update(companyId, payload);
    assert.equal(calls[0]!.url, "/api/v1/settings/organization");
    assert.equal(calls[0]!.init.method, "PATCH");
    assert.equal(calls[0]!.init.headers["x-company-id"], companyId);

    const sentBody = JSON.parse(calls[0]!.init.body as string);
    assert.equal(sentBody.expectedRevision, 3);
    assert.equal(sentBody.displayName, "Acme Global");
    assert.equal(result.revision, 4);
    assert.equal(result.displayName, "Acme Global");
  });

  it("PATCH /settings/organization recognizes 409 revision_conflict and isRevisionConflict helper", async () => {
    responses.push({
      status: 409,
      body: {
        message: "The organization profile was changed by someone else. Reload it before saving.",
        reason: "revision_conflict",
        currentRevision: 4,
      },
    });

    try {
      await organizationApi.update(companyId, { expectedRevision: 2, displayName: "Outdated" });
      assert.fail("should have thrown 409");
    } catch (err: unknown) {
      assert.ok(isRevisionConflict(err), "isRevisionConflict detects 409 conflict");
      const message = describeOrganizationError(err);
      assert.ok(message.includes("modified"), "friendly error message returned");
    }
  });

  it("describeOrganizationError handles fieldErrors and fallback safely", () => {
    const errorWithFields = {
      status: 400,
      fieldErrors: { contactEmail: "must be a valid email" },
    };
    assert.equal(describeOrganizationError(errorWithFields), "contactEmail: must be a valid email");

    const plainError = new Error("Network timeout");
    assert.equal(describeOrganizationError(plainError), "Network timeout");
  });

  it("SettingsRepository getStorageKey scopes per company", () => {
    const keyA = SettingsRepository.getStorageKey("company-123");
    const keyB = SettingsRepository.getStorageKey("company-456");
    const keyDefault = SettingsRepository.getStorageKey("");

    assert.ok(keyA.includes("company-123"));
    assert.ok(keyB.includes("company-456"));
    assert.notEqual(keyA, keyB);
    assert.equal(keyDefault, "encodency_omni_company_settings_v1");
  });
});

describe("global settings", () => {
  it("GET /super-admin/settings/configuration and /new-company-defaults", async () => {
    responses.push(
      { status: 200, body: { values: { "identity.platform_name": "OmniPlatform" } } },
      { status: 200, body: { timezone: "Asia/Kolkata", language: "en", currency: "INR" } },
    );

    const snapshot = await superAdminSettingsApi.getConfiguration();
    const defaults = await superAdminSettingsApi.getNewCompanyDefaults();

    assert.equal(calls[0]!.url, "/api/v1/super-admin/settings/configuration");
    assert.equal(calls[0]!.init.method, "GET");
    assert.equal(calls[1]!.url, "/api/v1/super-admin/settings/new-company-defaults");
    assert.equal(calls[1]!.init.method, "GET");
    assert.equal(snapshot.values["identity.platform_name"], "OmniPlatform");
    assert.equal(defaults.timezone, "Asia/Kolkata");
  });

  it("PUT /super-admin/settings/sections/:section sends { values, reason } and never the actor", async () => {
    responses.push({ status: 200, body: { version: null, applied: [], pending: [] } });

    const result = await createApiSettingsProvider().saveSection(
      { section: "localization", values: { "localization.default_timezone": "Europe/Berlin" }, reason: "Align with the EU team" },
      { id: "usr-1", name: "Platform Admin" },
    );

    assert.equal(calls[0]!.url, "/api/v1/super-admin/settings/sections/localization");
    assert.equal(calls[0]!.init.method, "PUT");
    assert.deepEqual(body(calls[0]!), {
      values: { "localization.default_timezone": "Europe/Berlin" },
      reason: "Align with the EU team",
    });
    assert.deepEqual(result, { version: null, applied: [], pending: [] });
  });

  it("POST /super-admin/settings/review sends { section, values } without writing anything", async () => {
    responses.push({ status: 200, body: { rows: [], requiresReason: false, hasPending: false, checks: [], warnings: [] } });

    await superAdminSettingsApi.reviewChanges("security", { "security.session_idle_minutes": 30 });

    assert.equal(calls[0]!.url, "/api/v1/super-admin/settings/review");
    assert.equal(calls[0]!.init.method, "POST");
    assert.deepEqual(body(calls[0]!), {
      section: "security",
      values: { "security.session_idle_minutes": 30 },
    });
  });

  it("GET /super-admin/settings/changes forwards only the set filters", async () => {
    responses.push({ status: 200, body: { rows: [], total: 0, page: 1, pageSize: 20, actors: [] } });

    await superAdminSettingsApi.listChanges({ section: "security", page: 1, actor: undefined, search: "" });

    assert.equal(calls[0]!.url, "/api/v1/super-admin/settings/changes?section=security&page=1");
    assert.equal(calls[0]!.init.method, "GET");
  });

  it("GET /super-admin/settings/changes/:id and /pending read the trail", async () => {
    responses.push({ status: 200, body: { id: "chg_1" } }, { status: 200, body: [{ id: "chg_2" }] });

    const change = await superAdminSettingsApi.getChange("chg_1");
    const pending = await superAdminSettingsApi.listPending();

    assert.equal(calls[0]!.url, "/api/v1/super-admin/settings/changes/chg_1");
    assert.equal(calls[1]!.url, "/api/v1/super-admin/settings/pending");
    assert.equal(change.id, "chg_1");
    assert.deepEqual(pending, [{ id: "chg_2" }]);
  });

  it("POST /super-admin/settings/pending/:id/withdraw sends { reason } and not the actor", async () => {
    responses.push({ status: 200, body: { id: "chg_9", result: "withdrawn" } });

    const withdrawn = await createApiSettingsProvider().withdrawPending("chg_9", "No longer needed", { id: "usr-1", name: "Platform Admin" });

    assert.equal(calls[0]!.url, "/api/v1/super-admin/settings/pending/chg_9/withdraw");
    assert.equal(calls[0]!.init.method, "POST");
    assert.deepEqual(body(calls[0]!), { reason: "No longer needed" });
    assert.equal(withdrawn.result, "withdrawn");
  });

  it("GET /super-admin/settings/versions and /versions/compare", async () => {
    responses.push({ status: 200, body: [{ id: "cfg_v2" }] }, { status: 200, body: { from: { id: "cfg_v1" }, to: { id: "cfg_v2" }, rows: [] } });

    const versions = await superAdminSettingsApi.listVersions();
    const comparison = await superAdminSettingsApi.compareVersions("cfg_v1", "cfg_v2");

    assert.equal(calls[0]!.url, "/api/v1/super-admin/settings/versions");
    assert.equal(calls[1]!.url, "/api/v1/super-admin/settings/versions/compare?from=cfg_v1&to=cfg_v2");
    assert.deepEqual(versions, [{ id: "cfg_v2" }]);
    assert.equal(comparison.from.id, "cfg_v1");
  });

  it("GET /super-admin/settings/security-review", async () => {
    responses.push({ status: 200, body: { configured: [], incomplete: [], backendDependencies: [], pendingSensitive: [], lastUpdatedAt: null, status: "configured" } });

    const review = await superAdminSettingsApi.getSecurityReview();

    assert.equal(calls[0]!.url, "/api/v1/super-admin/settings/security-review");
    assert.equal(calls[0]!.init.method, "GET");
    assert.equal(review.status, "configured");
  });

  it("maps a 422 save failure to ApiError with fieldErrors and no fallback", async () => {
    responses.push({
      status: 422,
      body: {
        message: "Some values are not valid. Nothing was saved.",
        fieldErrors: { "localization.default_timezone": "Unknown IANA timezone." },
      },
    });

    await assert.rejects(
      superAdminSettingsApi.saveSection({ section: "localization", values: { "localization.default_timezone": "Mars/Olympus" } }),
      (error: unknown) => {
        if (!ApiError.isApiError(error)) return false;
        assert.equal(error.status, 422);
        assert.equal(error.code, "VALIDATION_FAILED");
        assert.equal(error.fieldErrors?.["localization.default_timezone"], "Unknown IANA timezone.");
        return true;
      },
    );
  });

  it("resolves the api repository in api mode with no demo reset", async () => {
    const provider = createApiSettingsProvider();
    assert.equal(provider.mode, "api");
    assert.equal(provider.resetDemoData, undefined);

    responses.push({ status: 200, body: { values: {} } });
    await provider.getConfiguration();
    assert.equal(calls[0]!.url, "/api/v1/super-admin/settings/configuration");
  });
});

describe("Super Admin Feature Flags contract", () => {
  beforeEach(() => {
    calls = [];
    responses = [];
  });

  afterEach(() => {
    onSessionExpired(null);
  });

  it("GET /super-admin/feature-flags/overview forwards environment and category filter", async () => {
    responses.push({ status: 200, body: { environment: "production", kpis: { total: 21 }, rollouts: [], facets: { categories: [], owners: [] } } });

    const overview = await superAdminFeatureFlagsApi.getOverview("production", { category: "AI & Content" });

    assert.equal(calls[0]!.url, "/api/v1/super-admin/feature-flags/overview?environment=production&category=AI+%26+Content");
    assert.equal(calls[0]!.init.method, "GET");
    assert.equal(overview.kpis.total, 21);
  });

  it("GET /super-admin/feature-flags/flags maps query parameters", async () => {
    responses.push({ status: 200, body: { rows: [], total: 0 } });

    await superAdminFeatureFlagsApi.listFlags({ environment: "staging", search: "ai", category: "Workspace" });

    assert.equal(calls[0]!.url, "/api/v1/super-admin/feature-flags/flags?environment=staging&search=ai&category=Workspace");
    assert.equal(calls[0]!.init.method, "GET");
  });

  it("POST /super-admin/feature-flags/flags/validate checks key uniqueness", async () => {
    responses.push({ status: 200, body: [] });

    const issues = await superAdminFeatureFlagsApi.validateCreate({
      key: "new.flag",
      name: "New Flag",
      description: "Test",
      category: "Workspace",
      ownerTeam: "Core",
      relatedModule: "Workspace",
      reason: "Initial create",
    });

    assert.equal(calls[0]!.url, "/api/v1/super-admin/feature-flags/flags/validate");
    assert.equal(calls[0]!.init.method, "POST");
    assert.deepEqual(issues, []);
  });

  it("POST /super-admin/feature-flags/flags/:key/propose submits rollout mutation", async () => {
    responses.push({ status: 200, body: { applied: true, flag: { key: "content.ai_generator" } } });

    const outcome = await superAdminFeatureFlagsApi.proposeChange({
      flagKey: "content.ai_generator",
      environment: "production",
      proposed: { enabled: true, strategy: "percentage", percentage: 80 },
      reason: "Scale to 80%",
    });

    assert.equal(calls[0]!.url, "/api/v1/super-admin/feature-flags/flags/content.ai_generator/propose");
    assert.equal(calls[0]!.init.method, "POST");
    assert.equal(outcome.applied, true);
  });

  it("liveFlagsProvider resolves in api mode with no mock fallback", async () => {
    assert.equal(liveFlagsProvider.mode, "live");
    assert.equal(typeof liveFlagsProvider.resetDemoData, "function");

    responses.push({ status: 200, body: { rows: [], total: 0 } });
    await liveFlagsProvider.listFlags({ environment: "production" });
    assert.equal(calls[0]!.url, "/api/v1/super-admin/feature-flags/flags?environment=production");
  });
});



