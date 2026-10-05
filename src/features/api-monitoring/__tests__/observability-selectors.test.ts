import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { endpointStats, kpis, serviceStats } from "../data/observability-selectors";
import type { ApiMonitoringSnapshot } from "../data/observability-types";

const endpoint = (id: string, p95TargetMs: number) => ({ id, serviceId: "api-core", method: "GET" as const, path: `/api/v1/${id}`, name: id, successTargetMs: 100, p95TargetMs, sloTarget: null, enabled: true });

const snapshot = (): ApiMonitoringSnapshot =>
  ({
    environment: "development",
    generatedAt: "2026-10-05T10:00:00.000Z",
    timezone: "Asia/Calcutta",
    services: [{ id: "api-core", name: "Core", category: "Core Application API", ownerTeam: "x", description: "", basePath: "/", dependencyIds: [], environments: ["development"] }],
    endpoints: [endpoint("fast", 500), endpoint("slow", 200), endpoint("quiet", 500)],
    requests: [], // the list is only the most recent requests; figures must not depend on it
    traces: [],
    errorGroups: [],
    rateLimits: [],
    dependencies: [],
    activity: [],
    sources: [],
    config: { captureHeaders: false, captureQueryParams: true, captureBodyPreview: false, slowRequestThresholdMs: 1000, errorRateWarningPercent: 5 },
    aggregates: {
      windowStart: "2026-10-04T10:00:00.000Z",
      totalRequests: 1000,
      success2xx: 900,
      serverErrors: 20,
      throttled: 5,
      p95: 420,
      endpoints: [
        { endpointId: "fast", requests: 800, errors5xx: 4, throttled: 0, p50: 40, p95: 120, p99: 300, lastSeen: "2026-10-05T09:59:00.000Z" },
        { endpointId: "slow", requests: 200, errors5xx: 16, throttled: 5, p50: 150, p95: 900, p99: null, lastSeen: "2026-10-05T09:58:00.000Z" },
      ],
      services: [{ serviceId: "api-core", requests: 1000, errors5xx: 20, throttled: 5, p95: 420 }],
      trend: [],
      latencyBands: [],
      availability: [],
      listed: 0,
    },
  }) as ApiMonitoringSnapshot;

describe("live monitoring figures", () => {
  it("come from the server's whole-window numbers, not from the listed requests", () => {
    const k = kpis(snapshot(), "24h");
    assert.equal(k.total, 1000);
    assert.equal(k.http2xxRate, 90);
    assert.equal(k.http5xxRate, 2);
    assert.equal(k.p95, 420);
    assert.equal(k.throttled, 5);
    assert.equal(k.observed, 1);
    assert.equal(k.slow, 1, "only the endpoint whose p95 is above its target");
    assert.equal(k.gaps, 1, "the endpoint nobody called is a gap, not healthy");
  });

  it("gives every endpoint its own figures, and an uncalled one none", () => {
    const rows = endpointStats(snapshot());
    const slow = rows.find((r) => r.endpoint.id === "slow")!;
    assert.equal(slow.requests, 200);
    assert.equal(slow.rate5xx, 8);
    assert.equal(slow.p99, null, "too few samples for a p99");
    const quiet = rows.find((r) => r.endpoint.id === "quiet")!;
    assert.deepEqual([quiet.requests, quiet.p95, quiet.lastSeen], [0, null, null]);
  });

  it("gives a service with no traffic a missing freshness", () => {
    const s = snapshot();
    s.services.push({ id: "api-ai", name: "AI", category: "Platform Operations API", ownerTeam: "x", description: "", basePath: "/", dependencyIds: [], environments: ["development"] });
    const stats = serviceStats(s, []);
    assert.equal(stats.find((r) => r.service.id === "api-core")!.freshness, "fresh");
    assert.equal(stats.find((r) => r.service.id === "api-ai")!.freshness, "missing");
  });
});
