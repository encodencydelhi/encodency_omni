/**
 * With mock mode off the repository resolves to the real API provider
 * (`GET /super-admin/integrations/summary` + audit logs). The demo workspace
 * is never shown in API mode (owner rule, 2026-10-27): an unreachable backend
 * is an error, and what the backend does not serve yet reports "not
 * connected" (503) instead of sample data.
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

  it("does not show the demo catalogue when the backend is unreachable", async () => {
    await assert.rejects(integrationsRepository.getProviders(), (err: any) => err.status === 0 || err.code === "NETWORK_ERROR");
    await assert.rejects(integrationsRepository.getOverviewKpis(), (err: any) => err.status === 0 || err.code === "NETWORK_ERROR");
  });

  it("reports 'not connected' for what the backend does not serve, never sample data", async () => {
    for (const read of [() => integrationsRepository.getIssues(), () => integrationsRepository.getSettings(), () => integrationsRepository.getAuthorizations(), () => integrationsRepository.resetDemo()]) {
      await assert.rejects(read(), (err: any) => err.status === 503);
    }
  });
});

describe("error classification", () => {
  it("treats network, 404 and 5xx errors as an unreachable backend", () => {
    assert.equal(shouldFallBack(new ApiError({ code: "NETWORK_ERROR", message: "down", status: 0 })), true);
    assert.equal(shouldFallBack(new ApiError({ code: "NOT_FOUND", message: "missing", status: 404 })), true);
    assert.equal(shouldFallBack(new ApiError({ code: "UNKNOWN", message: "boom", status: 503 })), true);
    assert.equal(shouldFallBack(new Error("not an ApiError")), true);
  });

  it("keeps auth and validation errors as they are", () => {
    assert.equal(shouldFallBack(new ApiError({ code: "UNAUTHORIZED", message: "no", status: 401 })), false);
    assert.equal(shouldFallBack(new ApiError({ code: "FORBIDDEN", message: "no", status: 403 })), false);
    assert.equal(shouldFallBack(new ApiError({ code: "BAD_REQUEST", message: "bad", status: 400 })), false);
    assert.equal(shouldFallBack(new ApiError({ code: "RATE_LIMITED", message: "slow", status: 429 })), false);
  });
});

describe("backend provider mapping", () => {
  it("maps every backend provider onto a catalogue id", () => {
    assert.equal(fromBackendProvider("META"), "meta");
    assert.equal(fromBackendProvider("GOOGLE_BUSINESS"), "google_business");
    assert.equal(fromBackendProvider("LINKEDIN"), "linkedin");
    assert.equal(fromBackendProvider("YOUTUBE"), "youtube");
    assert.equal(fromBackendProvider("X"), "x_twitter");
  });

  it("maps catalogue ids back to backend providers only where the backend stores connections", () => {
    assert.equal(toBackendProvider("meta"), "META");
    assert.equal(toBackendProvider("google_business"), "GOOGLE_BUSINESS");
    assert.equal(toBackendProvider("linkedin"), "LINKEDIN");
    assert.equal(toBackendProvider("youtube"), "YOUTUBE");
    assert.equal(toBackendProvider("whatsapp"), null, "api-key connectors are not stored as OAuth connections");
    assert.equal(toBackendProvider("ga4"), null);
  });
});
