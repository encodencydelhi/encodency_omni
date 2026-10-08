/**
 * With mock mode off the repository resolves to the real API provider. There is no demo fallback any more:
 * everything is mapped from `/super-admin/jobs/*`. These tests cover the pure mapping (no server needed).
 *
 * `node --test` runs each file in its own process, so the environment set here cannot leak into other suites.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";

process.env.NEXT_PUBLIC_DATA_SOURCE = "api";
const { jobsQueuesRepository } = await import("../data/repository");
const { JOBS_MOCK_MODE, JOBS_DATA_SOURCE } = await import("../data/config");
const { toJobRecord, toLifecycle, toQueueDefinition, toWorkerRecord, toSchedule, toActivity } = await import("../data/api-provider");

type WireJobSummary = import("../live/jobs-ops-api").WireJobSummary;
type WireQueueOverview = import("../live/jobs-ops-api").WireQueueOverview;

const job = (over: Partial<WireJobSummary> = {}): WireJobSummary => ({
  key: "crawler~12", id: "12", queue: "crawler", name: "crawl-site", state: "waiting", priority: 0, attemptsMade: 0, maxAttempts: 3,
  createdAt: "2026-10-08T10:00:00.000Z", processedAt: null, finishedAt: null, runAt: null, failedReason: null, failure: null,
  companyId: null, companyName: null, clientId: null, clientName: null, retryable: false, cancellable: true, ...over,
});

describe("api mode", () => {
  it("turns the single mock flag off and wires the API provider", () => {
    assert.equal(JOBS_MOCK_MODE, false);
    assert.equal(jobsQueuesRepository.mode, "api");
    assert.equal(JOBS_DATA_SOURCE, "Live platform queues (Redis)");
  });

  it("maps queue states to lifecycle states", () => {
    assert.equal(toLifecycle(job({ state: "active" })), "running");
    assert.equal(toLifecycle(job({ state: "completed" })), "succeeded");
    assert.equal(toLifecycle(job({ state: "failed" })), "failed");
    assert.equal(toLifecycle(job({ state: "delayed" })), "scheduled");
    assert.equal(toLifecycle(job({ state: "delayed", attemptsMade: 1 })), "retry_waiting");
    assert.equal(toLifecycle(job({ state: "prioritized" })), "waiting");
  });

  it("maps a failed job with its company and retry eligibility", () => {
    const record = toJobRecord(job({ state: "failed", attemptsMade: 3, failedReason: "Request timed out", failure: "execution_timeout", retryable: true, companyId: "c1", companyName: "Acme Co", processedAt: "2026-10-08T10:00:01.000Z", finishedAt: "2026-10-08T10:00:03.000Z" }));
    assert.equal(record.id, "crawler~12");
    assert.equal(record.lifecycleState, "failed");
    assert.equal(record.retryEligibility, "retryable");
    assert.equal(record.failureClassification, "execution_timeout");
    assert.deepEqual(record.company, { id: "c1", name: "Acme Co" });
    assert.equal(record.durationMs, 2000);
    assert.equal(toJobRecord(job({ state: "failed", retryable: false })).retryEligibility, "non_retryable");
    assert.equal(toJobRecord(job()).retryEligibility, "unknown");
  });

  it("reports a paused or unreachable queue as it is, and never invents policies", () => {
    const base: WireQueueOverview = { queue: "crawler", reachable: true, paused: true, counts: { waiting: 4, active: 1, completed: 9, failed: 2, delayed: 3 }, workers: 2, maxAttempts: 3, jobNames: ["crawl-site"], retryWaiting: 1 };
    const queue = toQueueDefinition(base);
    assert.equal(queue.operationalState, "paused");
    assert.equal(queue.registeredWorkers, 2);
    assert.equal(queue.retryWaiting, 1);
    assert.equal(queue.deadLettered, 0);
    assert.equal(queue.retryPolicy, "Up to 3 attempts");
    assert.deepEqual(queue.jobTypes, ["crawl-site"]);
    const down = toQueueDefinition({ queue: "publishing", reachable: false, error: "Redis did not respond" });
    assert.equal(down.operationalState, "unknown");
    assert.match(down.purpose, /unreachable/i);
    assert.equal(down.waiting, 0);
  });

  it("maps connected workers, delayed jobs and operator activity", () => {
    const now = Date.parse("2026-10-08T12:00:00.000Z");
    const worker = toWorkerRecord({ id: "crawler~7", queue: "crawler", address: "127.0.0.1:1", name: null, connectedSeconds: 3600, idleSeconds: 30 }, now);
    assert.equal(worker.liveness, "online");
    assert.deepEqual(worker.assignedQueues, ["crawler"]);
    assert.equal(worker.registeredAt, "2026-10-08T11:00:00.000Z");
    assert.equal(worker.lastHeartbeat, "2026-10-08T11:59:30.000Z");

    const past = toSchedule({ id: "crawler~9", queue: "crawler", name: "crawl-site", kind: "delayed", runAt: "2026-10-08T11:00:00.000Z", recurrence: null, timezone: "UTC", jobKey: "crawler~9", companyId: null, companyName: null, clientId: null, clientName: null, attemptsMade: 0 }, now);
    assert.equal(past.scheduleState, "due");
    assert.equal(past.jobId, "crawler~9");
    const future = toSchedule({ ...{ id: "x", queue: "crawler", name: "n", kind: "repeat" as const, runAt: "2026-10-09T00:00:00.000Z", recurrence: "0 0 * * *", timezone: "UTC", jobKey: null, companyId: null, companyName: null, clientId: null, clientName: null, attemptsMade: 0 } }, now);
    assert.equal(future.scheduleState, "upcoming");
    assert.equal(future.recurrenceRule, "0 0 * * *");

    const activity = toActivity({ id: "a1", at: "2026-10-08T11:00:00.000Z", action: "queue.paused", queue: "crawler", jobKey: null, jobName: null, reason: "Provider outage", actor: "Manish Sirohi", outcome: "SUCCESS" });
    assert.equal(activity.result, "success");
    assert.match(activity.details, /Queue paused: crawler/);
    assert.match(activity.details, /Provider outage/);
  });

  it("has no approval workflow, workflows or dependencies to show", async () => {
    assert.deepEqual(await jobsQueuesRepository.getRecoveryRequests(), []);
    assert.deepEqual(await jobsQueuesRepository.getQueueOperationalControls(), []);
    assert.deepEqual(await jobsQueuesRepository.getWorkflows(), []);
    assert.deepEqual(await jobsQueuesRepository.getDependencies("crawler~1"), []);
    assert.equal(await jobsQueuesRepository.getWorkflowById("x"), null);
  });
});
