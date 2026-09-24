/**
 * With mock mode off the repository resolves to the real API provider
 * (`GET /integrations/registry`) with the demo provider injected as the
 * fallback the owner approved on 2026-09-24: unreachable backend or empty
 * registry → show the full demo catalogue instead of an empty panel.
 * 401/403 still propagate (they cannot be exercised here without a live
 * server; covered by the live API contract suite when the backend is up).
 *
 * `node --test` runs each file in its own process, so the environment set
 * here cannot leak into the other suites.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";

process.env.NEXT_PUBLIC_DATA_SOURCE = "api";
const { integrationsRepository } = await import("../data/repository");
const { INTEGRATIONS_MOCK_MODE } = await import("../data/config");
const {
  fromBackendProvider,
  toBackendProvider,
  shouldFallBack,
} = await import("../data/api-provider");
const { ApiError } = await import("@/types/api");

describe("api mode", () => {
  it("turns the single mock flag off and wires the API provider", () => {
    assert.equal(INTEGRATIONS_MOCK_MODE, false);
    assert.equal(integrationsRepository.mode, "api");
  });

  it("falls back to the demo catalogue when the backend is unreachable", async () => {
    const providers = await integrationsRepository.getProviders();
    assert.ok(Array.isArray(providers));
    assert.ok(providers.length > 0, "expected the mock fallback to supply providers");
  });

  it("still delegates methods the backend does not serve to the fallback", async () => {
    const issues = await integrationsRepository.getIssues();
    assert.ok(Array.isArray(issues));
    const settings = await integrationsRepository.getSettings();
    assert.ok(settings.newConnectionApprovalPolicy);
    const activities = await integrationsRepository.getActivities();
    assert.ok(activities.length > 0, "activities come from the demo fallback");
  });
});

describe("fallback policy", () => {
  it("falls back for network, 404 and 5xx errors", () => {
    assert.equal(shouldFallBack(new ApiError({ code: "NETWORK_ERROR", message: "down", status: 0 })), true);
    assert.equal(shouldFallBack(new ApiError({ code: "NOT_FOUND", message: "missing", status: 404 })), true);
    assert.equal(shouldFallBack(new ApiError({ code: "UNKNOWN", message: "boom", status: 503 })), true);
    assert.equal(shouldFallBack(new Error("not an ApiError")), true);
  });

  it("propagates auth and validation errors instead of falling back", () => {
    assert.equal(shouldFallBack(new ApiError({ code: "UNAUTHORIZED", message: "no", status: 401 })), false);
    assert.equal(shouldFallBack(new ApiError({ code: "FORBIDDEN", message: "no", status: 403 })), false);
    assert.equal(shouldFallBack(new ApiError({ code: "BAD_REQUEST", message: "bad", status: 400 })), false);
    assert.equal(shouldFallBack(new ApiError({ code: "RATE_LIMITED", message: "slow", status: 429 })), false);
  });
});

describe("backend registry mapping", () => {
  it("maps every supported backend enum onto a catalogue id", () => {
    assert.equal(fromBackendProvider("META"), "meta");
    assert.equal(fromBackendProvider("GOOGLE_BUSINESS"), "google_business");
    assert.equal(fromBackendProvider("LINKEDIN"), "linkedin");
  });

  it("maps catalogue ids back to backend enums only for OAuth-managed providers", () => {
    assert.equal(toBackendProvider("meta"), "META");
    assert.equal(toBackendProvider("google_business"), "GOOGLE_BUSINESS");
    assert.equal(toBackendProvider("linkedin"), "LINKEDIN");
    assert.equal(toBackendProvider("whatsapp"), null, "api-key connectors are not registry-managed");
    assert.equal(toBackendProvider("youtube"), null, "roadmap OAuth providers are not registry-managed yet");
    assert.equal(toBackendProvider("ga4"), null);
  });
});
