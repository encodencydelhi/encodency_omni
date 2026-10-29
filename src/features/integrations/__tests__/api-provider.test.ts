/**
 * With mock mode off the repository resolves to the real API provider (/super-admin/integrations/*). The demo workspace is
 * never shown in API mode (owner rule, 2026-10-27): an unreachable backend is an error, never sample data. The mapping from
 * the server's rows to the console's shapes is pure, so it is tested here without a network.
 *
 * `node --test` runs each file in its own process, so the environment set here cannot leak into the other suites.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { ApiConnection, ApiIssue, ApiProvider } from "../data/api-provider";

process.env.NEXT_PUBLIC_DATA_SOURCE = "api";
const { integrationsRepository } = await import("../data/repository");
const { INTEGRATIONS_MOCK_MODE } = await import("../data/config");
const { availabilityOf, availabilityPatch, toAuthorization, toConfiguration, toIssue, toProvider } = await import("../data/api-provider");

const provider = (patch: Partial<ApiProvider> = {}, config: Partial<ApiProvider["config"]> = {}): ApiProvider => ({
  provider: "META",
  slug: "meta",
  name: "Meta (Facebook & Instagram)",
  category: "social",
  shortDescription: "short",
  description: "long",
  websiteUrl: "https://developers.facebook.com",
  docsUrl: "https://developers.facebook.com/docs/graph-api",
  implemented: true,
  authMethod: "oauth2",
  configured: true,
  redirectUri: "https://omni.example.com/api/v1/integrations/oauth/callback",
  requestedScopes: ["pages_show_list", "pages_manage_posts"],
  requiredScopes: ["pages_show_list"],
  config: { availability: "live", apiAccess: "NOT_RECORDED", allowNewConnections: true, maintenanceMode: false, maintenanceNote: null, internalNotes: null, appReviewNotes: null, updatedAt: null, updatedBy: null, ...config },
  counts: { connections: 3, active: 2, needsReconnect: 1, permissionMissing: 0, checkFailed: 0, expiring: 1, disconnected: 0, companies: 2, companiesNeedingAttention: 1, mappedResources: 4 },
  checks24h: { total: 5, failed: 2 },
  rateLimited: false,
  lastCheckAt: "2026-10-29T10:00:00.000Z",
  lastSuccessfulCheckAt: "2026-10-29T09:00:00.000Z",
  lastActiveAt: null,
  health: "degraded",
  capabilities: [],
  ...patch,
});

const connection = (patch: Partial<ApiConnection> = {}): ApiConnection => ({
  id: "int-1",
  provider: "META",
  providerSlug: "meta",
  companyId: "co-1",
  companyName: "Acme",
  accountName: "Acme Ops",
  accountEmail: "ops@acme.example",
  status: "ACTIVE",
  state: "connected",
  stateReason: null,
  connectedAt: "2026-10-01T00:00:00.000Z",
  connectedBy: { name: "Asha", email: "asha@acme.example" },
  tokenExpiresAt: null,
  grantedScopes: ["pages_show_list"],
  requiredScopes: ["pages_show_list"],
  missingScopes: [],
  lastCheck: null,
  lastSuccessfulCheckAt: null,
  checks24h: { total: 0, failed: 0 },
  resources: [],
  ...patch,
});

describe("api mode", () => {
  it("turns the single mock flag off and wires the API provider", () => {
    assert.equal(INTEGRATIONS_MOCK_MODE, false);
    assert.equal(integrationsRepository.mode, "api");
  });

  it("does not show the demo catalogue when the backend is unreachable", async () => {
    for (const read of [() => integrationsRepository.getProviders(), () => integrationsRepository.getOverviewKpis(), () => integrationsRepository.getIssues(), () => integrationsRepository.getAuthorizations(), () => integrationsRepository.getSettings()]) {
      await assert.rejects(read(), (err: unknown) => (err as { status?: number }).status === 0 || (err as { code?: string }).code === "NETWORK_ERROR");
    }
  });
});

describe("provider mapping", () => {
  it("is live only when the server can connect it and nobody switched it off", () => {
    assert.equal(availabilityOf(provider()), "live");
    assert.equal(availabilityOf(provider({}, { availability: "disabled" })), "disabled");
    assert.equal(availabilityOf(provider({ configured: false })), "disabled");
    assert.equal(availabilityOf(provider({}, { maintenanceMode: true })), "restricted");
    assert.equal(availabilityOf(provider({ implemented: false })), "draft");
  });

  it("never invents approval, health or counts: they are the server's values", () => {
    const mapped = toProvider(provider(), "2026-10-29T12:00:00.000Z");
    assert.equal(mapped.externalApiAccess, "not_recorded");
    assert.equal(mapped.operationalHealth, "degraded");
    assert.equal(mapped.activeConnectionsCount, 2);
    assert.equal(mapped.recentFailuresCount, 2);
    assert.equal(mapped.reconnectRequiredCount, 1);
    assert.equal(mapped.lastSuccessfulOperationAt, "2026-10-29T09:00:00.000Z");
    assert.equal(mapped.createdAt, "2026-10-29T12:00:00.000Z", "an unsaved provider has no creation date of its own");
  });

  it("shows the real callback URL and scopes, and leaves the URL empty when the server has none", () => {
    assert.equal(toConfiguration(provider()).redirectUri, "https://omni.example.com/api/v1/integrations/oauth/callback");
    assert.deepEqual(toConfiguration(provider()).requiredScopes, ["pages_show_list", "pages_manage_posts"]);
    assert.equal(toConfiguration(provider({ redirectUri: null })).redirectUri, "");
    assert.equal(toConfiguration(provider({ configured: false })).credentialConfigured, false);
  });

  it("turns the console's availability values into server changes, and refuses states that do not exist", () => {
    assert.deepEqual(availabilityPatch("disabled"), { availability: "DISABLED" });
    assert.deepEqual(availabilityPatch("live"), { availability: "LIVE", maintenanceMode: false });
    assert.deepEqual(availabilityPatch("restricted"), { maintenanceMode: true });
    assert.throws(() => availabilityPatch("testing"));
  });
});

describe("connection mapping", () => {
  it("keeps the connection's condition as the console's health", () => {
    assert.equal(toAuthorization(connection(), "Meta").healthStatus, "healthy");
    assert.equal(toAuthorization(connection({ state: "needs_reconnect", status: "EXPIRED", stateReason: "The saved access has expired." }), "Meta").healthStatus, "needs_reconnect");
    assert.equal(toAuthorization(connection({ state: "permission_missing", missingScopes: ["pages_show_list"] }), "Meta").healthStatus, "permission_issue");
    assert.equal(toAuthorization(connection({ state: "rate_limited" }), "Meta").healthStatus, "rate_limited");
    assert.equal(toAuthorization(connection({ state: "disconnected", status: "REVOKED" }), "Meta").status, "revoked");
  });

  it("says what is not known instead of filling it in", () => {
    const mapped = toAuthorization(connection({ connectedBy: null, grantedScopes: null }), "Meta");
    assert.equal(mapped.connectedBy.name, "Not recorded");
    assert.deepEqual(mapped.grantedScopes, []);
    assert.equal(mapped.lastVerifiedAt, "2026-10-01T00:00:00.000Z", "falls back to when it was connected, not to a made-up time");
    assert.equal(mapped.latestErrorMessage, undefined);
  });
});

describe("issue mapping", () => {
  it("starts the timeline at detection and keeps the triage notes as internal", () => {
    const issue: ApiIssue = {
      key: "reconnect:int-1",
      number: "ISS-1A2B3C",
      severity: "critical",
      scope: "connection",
      providerSlug: "meta",
      title: "Meta needs to be reconnected",
      summary: "The saved access has expired.",
      status: "investigating",
      detectedAt: "2026-10-28T08:00:00.000Z",
      updatedAt: "2026-10-29T08:00:00.000Z",
      resolvedAt: null,
      companyIds: ["co-1"],
      companyNames: ["Acme"],
      connectionIds: ["int-1"],
      resourceIds: ["map-1"],
      capabilities: ["Publish to Facebook Pages"],
      owner: { id: "u-1", name: null, email: "lead@omni.example" },
      notes: [{ id: "n-1", authorName: "Lead", authorEmail: "lead@omni.example", content: "Asked the owner.", createdAt: "2026-10-29T08:30:00.000Z" }],
      timeline: [{ id: "e-1", timestamp: "2026-10-29T08:00:00.000Z", actor: "Lead", details: "Changed the status to investigating", fromStatus: "open", toStatus: "investigating" }],
    };
    const mapped = toIssue(issue);
    assert.equal(mapped.id, "reconnect:int-1");
    assert.equal(mapped.internalOwner?.name, "lead@omni.example", "an owner without a name is shown by e-mail");
    assert.equal(mapped.investigationNotes[0]?.isInternal, true);
    assert.equal(mapped.timeline[0]?.action, "Detected");
    assert.equal(mapped.timeline[1]?.toStatus, "investigating");
    assert.deepEqual(mapped.relatedJobIds, []);
  });
});
