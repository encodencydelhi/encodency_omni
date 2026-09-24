/**
 * With mock mode off the repository resolves to the real API provider
 * (`GET /super-admin/jobs/stats`) with the demo provider injected as the
 * fallback the owner approved on 2026-09-24: unreachable backend or no rows →
 * show the mock data instead of an empty panel. 401/403 still propagate (they
 * cannot be exercised here without a live server; covered by the live API
 * contract suite when the backend is up).
 *
 * `node --test` runs each file in its own process, so the environment set
 * here cannot leak into the other suites.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";

process.env.NEXT_PUBLIC_DATA_SOURCE = "api";
const { jobsQueuesRepository } = await import("../data/repository");
const { JOBS_MOCK_MODE, JOBS_DATA_SOURCE } = await import("../data/config");
const {
  toQueueDefinition,
  buildOverviewFromStats,
  shouldFallBack,
} = await import("../data/api-provider");
const { ApiError } = await import("@/types/api");

type QueueStats = import("../data/types").QueueStats;

const SAMPLE_STATS: QueueStats[] = [
  {
    queue: "notifications",
    reachable: true,
    counts: { waiting: 3, active: 1, completed: 40, failed: 2, delayed: 5 },
    recentFailed: [
      { id: "job_1", name: "notify:digest-email", attemptsMade: 3, failedReason: "SMTP timeout" },
    ],
  },
  {
    queue: "publishing",
    reachable: true,
    counts: { waiting: 0, active: 0, completed: 10, failed: 0, delayed: 0 },
    recentFailed: [],
  },
  {
    queue: "crawler",
    reachable: false,
    error: "Redis did not respond within 3000ms",
  },
  {
    queue: "billing-events",
    reachable: true,
    counts: { waiting: 1, active: 0, completed: 7, failed: 1, delayed: 0 },
    recentFailed: [],
  },
];

describe("api mode", () => {
  it("turns the single mock flag off and wires the API provider", () => {
    assert.equal(JOBS_MOCK_MODE, false);
    assert.equal(jobsQueuesRepository.mode, "api");
  });

  it("labels the data source as live in API mode", () => {
    assert.equal(JOBS_DATA_SOURCE, "Live Redis queue stats · demo job records");
  });

  it("falls back to demo stats when the backend is unreachable", async () => {
    const stats = await jobsQueuesRepository.getQueueStats();
    assert.ok(Array.isArray(stats));
    assert.ok(stats.length > 0, "expected the mock fallback to supply stats");
  });

  it("falls back to demo queues when the backend is unreachable", async () => {
    const queues = await jobsQueuesRepository.getQueues();
    assert.ok(Array.isArray(queues));
    assert.ok(queues.length > 0, "expected the mock fallback to supply queues");
  });

  it("falls back to the demo overview when the backend is unreachable", async () => {
    const overview = await jobsQueuesRepository.getOverview();
    assert.ok(overview.queues.length > 0);
    assert.ok(overview.kpis.totalJobs > 0);
  });

  it("still delegates methods the backend does not serve to the fallback", async () => {
    const jobs = await jobsQueuesRepository.getJobs();
    assert.ok(jobs.length > 0, "job lists come from the demo fallback");
    const workers = await jobsQueuesRepository.getWorkers();
    assert.ok(workers.length > 0);
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

describe("stats → QueueDefinition mapping", () => {
  it("maps a reachable queue's counts onto the UI shape", () => {
    const def = toQueueDefinition(SAMPLE_STATS[0]!);
    assert.equal(def.id, "notifications");
    assert.equal(def.name, "Notifications");
    assert.equal(def.category, "Communication");
    assert.equal(def.operationalState, "running");
    assert.equal(def.waiting, 3);
    assert.equal(def.running, 1);
    assert.equal(def.delayed, 5);
    assert.equal(def.failed, 2);
    assert.equal(def.succeededLast24h, 40);
    assert.equal(def.retryWaiting, 0);
    assert.equal(def.deadLettered, 0);
    assert.equal(def.oldestWaitingAt, null);
    assert.equal(def.registeredWorkers, 0);
    assert.equal(def.priorityPolicy, "Not exposed by the stats API");
  });

  it("marks an unreachable queue as unknown with the error as purpose", () => {
    const def = toQueueDefinition(SAMPLE_STATS[2]!);
    assert.equal(def.id, "crawler");
    assert.equal(def.operationalState, "unknown");
    assert.match(def.purpose, /unreachable/i);
    assert.match(def.purpose, /Redis/);
    assert.equal(def.waiting, 0);
    assert.equal(def.running, 0);
  });

  it("uses a sensible fallback meta for an unknown queue name", () => {
    const def = toQueueDefinition({ queue: "mystery-queue", reachable: true, counts: { waiting: 1, active: 0, completed: 0, failed: 0, delayed: 0 } });
    assert.equal(def.id, "mystery-queue");
    assert.equal(def.name, "mystery-queue");
    assert.equal(def.category, "General");
  });
});

describe("stats → overview mapping", () => {
  const overview = buildOverviewFromStats(SAMPLE_STATS);

  it("recomputes queue KPIs from live counts", () => {
    // waiting: 3+0+0+1, running: 1+0+0+0, scheduled(delayed): 5+0+0+0,
    // succeeded: 40+10+0+7, failed: 2+0+0+1
    assert.equal(overview.kpis.waiting, 4);
    assert.equal(overview.kpis.running, 1);
    assert.equal(overview.kpis.scheduled, 5);
    assert.equal(overview.kpis.succeeded, 57);
    assert.equal(overview.kpis.failed, 3);
    assert.equal(overview.kpis.activeQueues, 3);
    assert.equal(overview.kpis.retryWaiting, 0);
    assert.equal(overview.kpis.deadLettered, 0);
  });

  it("exposes recentFailed samples as failure rows", () => {
    assert.equal(overview.failuresRequiringAttention.length, 1);
    const row = overview.failuresRequiringAttention[0]!;
    assert.equal(row.id, "job_1");
    assert.equal(row.type, "notify:digest-email");
    assert.equal(row.queue, "notifications");
    assert.equal(row.lifecycleState, "failed");
    assert.equal(row.errorMessage, "SMTP timeout");
    assert.equal(row.attempts, 3);
    assert.equal(row.retryEligibility, "unknown");
  });

  it("leaves sections the stats API does not serve empty rather than inventing them", () => {
    assert.deepEqual(overview.processingTrend, []);
    assert.deepEqual(overview.workers, []);
    assert.deepEqual(overview.recentActivity, []);
    assert.deepEqual(overview.upcomingScheduled, []);
    assert.equal(overview.kpis.totalWorkers, 0);
    assert.equal(overview.kpis.onlineWorkers, 0);
  });

  it("maps every queue in the stats response", () => {
    assert.equal(overview.queues.length, SAMPLE_STATS.length);
    assert.deepEqual(
      overview.queues.map((q) => q.id),
      SAMPLE_STATS.map((s) => s.queue)
    );
  });
});
