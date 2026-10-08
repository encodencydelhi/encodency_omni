/**
 * Real HTTP provider for the Jobs & Queues workspace (`NEXT_PUBLIC_DATA_SOURCE=api`).
 *
 * Everything shown comes from the platform's real BullMQ queues through
 * `/super-admin/jobs/*`. There is no demo fallback: an unreachable backend or a
 * 401/403 surfaces as an error. Things the queue system does not have are
 * reported as such rather than invented:
 *
 *  - no approval workflow for retries (a Super Admin retries or cancels directly, with a reason, and the
 *    action is written to the audit trail), so recovery requests and queue-control requests are empty;
 *  - no workflows or job dependencies;
 *  - no dead-letter queue (a job that used all its attempts simply stays in Failed);
 *  - worker details are what Redis knows about connected workers (address, uptime, idle time).
 *
 * A job is identified by `queue~jobId` (the same id is used in the page URL).
 */
import type { JobsQueuesRepository } from "./repository";
import {
  jobsOpsApi,
  type WireActivity,
  type WireJobDetail,
  type WireJobSummary,
  type WireQueueOverview,
  type WireSchedule,
  type WireWorker,
} from "../live/jobs-ops-api";
import type {
  FailureClassification,
  JobActivity,
  JobAttempt,
  JobLifecycleState,
  JobRecord,
  JobSchedule,
  JobsKpis,
  JobsOverviewData,
  ProcessingTrendPoint,
  QueueDefinition,
  QueueStats,
  WorkerRecord,
} from "./types";

const QUEUE_META: Record<string, { name: string; category: string; purpose: string }> = {
  notifications: { name: "Notifications", category: "Communication", purpose: "Delivers platform notifications (email, in-app, integration alerts)." },
  publishing: { name: "Publishing", category: "Publishing", purpose: "Executes scheduled social and content publishing jobs." },
  crawler: { name: "Crawler", category: "SEO", purpose: "Runs SEO site crawls and incremental audits." },
  "billing-events": { name: "Billing Events", category: "Billing", purpose: "Processes billing and invoice lifecycle events." },
};

const NOT_EXPOSED = "Not reported by the queue system";
const JOB_PAGE_SIZE = 200;
const JOB_MAX_PAGES = 5;

/* ------------------------------------------------------------------ */
/* Mapping                                                             */
/* ------------------------------------------------------------------ */

export function toLifecycle(job: Pick<WireJobSummary, "state" | "attemptsMade">): JobLifecycleState {
  switch (job.state) {
    case "active":
      return "running";
    case "completed":
      return "succeeded";
    case "failed":
      return "failed";
    case "delayed":
      // A delayed job that already ran is waiting out its retry back-off; otherwise it is a scheduled job.
      return job.attemptsMade > 0 ? "retry_waiting" : "scheduled";
    default:
      return "waiting";
  }
}

function priorityOf(value: number): JobRecord["priority"] {
  if (value <= 0) return "normal";
  return value < 10 ? "high" : "low";
}

const diff = (from: string | null, to: string | null) => (from && to ? Math.max(0, Date.parse(to) - Date.parse(from)) : null);

export function toJobRecord(job: WireJobSummary, extra?: { payload?: Record<string, unknown> | null }): JobRecord {
  const lifecycleState = toLifecycle(job);
  return {
    id: job.key,
    type: job.name,
    name: job.name,
    queue: job.queue,
    lifecycleState,
    priority: priorityOf(job.priority),
    environment: "production",
    company: job.companyId ? { id: job.companyId, name: job.companyName ?? job.companyId } : null,
    client: job.clientId ? { id: job.clientId, name: job.clientName ?? job.clientId } : null,
    workflowId: null,
    correlationId: null,
    idempotencyKey: null,
    relatedResourceType: null,
    relatedResourceId: null,
    relatedResourceName: null,
    attempts: job.attemptsMade,
    maxAttempts: job.maxAttempts,
    errorMessage: job.failedReason,
    failureClassification: job.failure as FailureClassification | null,
    retryEligibility: job.state === "failed" ? (job.retryable ? "retryable" : "non_retryable") : "unknown",
    createdAt: job.createdAt ?? new Date(0).toISOString(),
    scheduledAt: job.runAt,
    enqueuedAt: job.createdAt,
    startedAt: job.processedAt,
    completedAt: job.finishedAt,
    lastAttemptAt: job.attemptsMade > 0 ? (job.finishedAt ?? job.processedAt) : null,
    nextRetryAt: job.state === "delayed" && job.attemptsMade > 0 ? job.runAt : null,
    durationMs: diff(job.processedAt, job.finishedAt),
    payload: extra?.payload ?? {},
  };
}

export function toQueueDefinition(q: WireQueueOverview): QueueDefinition {
  const meta = QUEUE_META[q.queue] ?? { name: q.queue, category: "General", purpose: `Processes ${q.queue} jobs across the platform.` };
  const counts = q.reachable && q.counts ? q.counts : { waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0 };
  return {
    id: q.queue,
    name: meta.name,
    category: meta.category,
    purpose: q.reachable ? meta.purpose : q.error ? `Queue unreachable: ${q.error}` : "Queue unreachable. Its numbers are unavailable.",
    operationalState: !q.reachable ? "unknown" : q.paused ? "paused" : "running",
    jobTypes: q.jobNames ?? [],
    priorityPolicy: NOT_EXPOSED,
    concurrencyReference: NOT_EXPOSED,
    timeoutPolicy: NOT_EXPOSED,
    retryPolicy: q.maxAttempts && q.maxAttempts > 1 ? `Up to ${q.maxAttempts} attempts` : "Single attempt unless a job sets its own",
    deadLetterPolicy: "No dead-letter queue: a job that used all its attempts stays in Failed",
    workerGroup: `${meta.name} workers`,
    environment: "—",
    waiting: counts.waiting,
    running: counts.active,
    delayed: counts.delayed,
    failed: counts.failed,
    // Finished jobs BullMQ still retains, not a 24-hour window.
    succeededLast24h: counts.completed,
    retryWaiting: q.retryWaiting ?? 0,
    deadLettered: 0,
    oldestWaitingAt: q.oldestWaitingAt ?? null,
    registeredWorkers: q.workers ?? 0,
  };
}

function toQueueStats(q: WireQueueOverview): QueueStats {
  return q.reachable && q.counts ? { queue: q.queue, reachable: true, counts: q.counts } : { queue: q.queue, reachable: false, error: q.error };
}

export function toWorkerRecord(w: WireWorker, now = Date.now()): WorkerRecord {
  return {
    id: w.id,
    group: `${QUEUE_META[w.queue]?.name ?? w.queue} workers`,
    environment: "—",
    assignedQueues: [w.queue],
    // Redis only lists clients that are connected right now, so a listed worker is online.
    liveness: "online",
    lastHeartbeat: new Date(now - w.idleSeconds * 1000).toISOString(),
    registeredAt: new Date(now - w.connectedSeconds * 1000).toISOString(),
    concurrencyCapacity: 0,
    currentProcessing: 0,
    currentJobIds: [],
    recentAttempts: 0,
    recentFailures: 0,
  };
}

export function toSchedule(s: WireSchedule, now = Date.now()): JobSchedule {
  const runAt = s.runAt ?? new Date(0).toISOString();
  return {
    id: s.id,
    jobId: s.jobKey ?? s.id,
    scheduledAt: runAt,
    timezone: s.timezone ?? "UTC",
    scheduleState: s.runAt && Date.parse(s.runAt) <= now ? "due" : "upcoming",
    nextEligibleExecution: s.runAt,
    recurrenceRule: s.recurrence,
    relatedResourceType: null,
    relatedResourceId: null,
  };
}

const ACTION_LABEL: Record<string, string> = {
  "job.retried": "Job retried",
  "job.cancelled": "Job cancelled",
  "queue.paused": "Queue paused",
  "queue.resumed": "Queue resumed",
};

export function toActivity(a: WireActivity): JobActivity {
  const label = ACTION_LABEL[a.action] ?? a.action;
  const subject = a.jobKey ?? a.queue ?? "";
  return {
    id: a.id,
    timestamp: a.at,
    eventType: a.action,
    jobId: a.jobKey,
    queue: a.queue,
    actor: a.actor,
    result: a.outcome === "SUCCESS" ? "success" : "failure",
    details: `${label}${subject ? `: ${subject}` : ""}${a.reason ? ` · ${a.reason}` : ""} · by ${a.actor}`,
    relatedReference: a.jobKey,
  };
}

function toAttempts(detail: WireJobDetail): JobAttempt[] {
  return detail.attempts.map((a) => ({
    id: `${detail.key}#${a.attemptNumber}`,
    jobId: detail.key,
    attemptNumber: a.attemptNumber,
    workerId: null,
    startedAt: a.startedAt ?? "",
    completedAt: a.finishedAt,
    result: a.result,
    failureClassification: a.failure as FailureClassification | null,
    errorMessage: a.errorMessage,
    durationMs: diff(a.startedAt, a.finishedAt),
  }));
}

/* ------------------------------------------------------------------ */
/* Provider                                                            */
/* ------------------------------------------------------------------ */

async function fetchAllJobs(): Promise<JobRecord[]> {
  const out: JobRecord[] = [];
  for (let page = 1; page <= JOB_MAX_PAGES; page += 1) {
    const res = await jobsOpsApi.list({ page, limit: JOB_PAGE_SIZE });
    out.push(...res.items.map((j) => toJobRecord(j)));
    if (out.length >= res.total) break;
  }
  return out;
}

async function buildOverview(): Promise<JobsOverviewData> {
  const [queueRes, workerRes, trendRes, activityRes, failedRes, scheduleRes] = await Promise.all([
    jobsOpsApi.queues(),
    jobsOpsApi.workers(),
    jobsOpsApi.trend(14),
    jobsOpsApi.activity(),
    jobsOpsApi.list({ state: "failed", limit: 6 }),
    jobsOpsApi.schedules(),
  ]);
  const queues = queueRes.queues.map(toQueueDefinition);
  const reachable = queueRes.queues.filter((q) => q.reachable);
  const sum = (pick: (q: QueueDefinition) => number) => queues.reduce((n, q) => n + pick(q), 0);
  const retryWaiting = sum((q) => q.retryWaiting);
  const kpis: JobsKpis = {
    totalJobs: sum((q) => q.waiting + q.running + q.delayed + q.failed + q.succeededLast24h),
    waiting: sum((q) => q.waiting),
    running: sum((q) => q.running),
    scheduled: Math.max(0, sum((q) => q.delayed) - retryWaiting),
    retryWaiting,
    succeeded: sum((q) => q.succeededLast24h),
    failed: sum((q) => q.failed),
    deadLettered: 0,
    activeQueues: reachable.length,
    totalWorkers: workerRes.items.length,
    onlineWorkers: workerRes.items.length,
    staleWorkers: 0,
    offlineWorkers: 0,
  };
  const trend: ProcessingTrendPoint[] = trendRes.items.map((d) => ({ date: d.date, completed: d.completed, failed: d.failed, started: d.started, retriesScheduled: 0 }));
  const upcoming = scheduleRes.items
    .filter((s) => s.kind === "delayed" && s.attemptsMade === 0)
    .slice(0, 6)
    .map<JobRecord>((s) => ({
      ...toJobRecord({
        key: s.jobKey ?? s.id, id: s.id, queue: s.queue, name: s.name, state: "delayed", priority: 0, attemptsMade: 0, maxAttempts: 1,
        createdAt: null, processedAt: null, finishedAt: null, runAt: s.runAt, failedReason: null, failure: null,
        companyId: s.companyId, companyName: s.companyName, clientId: s.clientId, clientName: s.clientName, retryable: false, cancellable: true,
      }),
    }));
  return {
    kpis,
    processingTrend: trend,
    queues,
    failuresRequiringAttention: failedRes.items.map((j) => toJobRecord(j)),
    upcomingScheduled: upcoming,
    workers: workerRes.items.map((w) => toWorkerRecord(w)),
    recentActivity: activityRes.items.slice(0, 20).map(toActivity),
  };
}

export function createApiJobsQueuesProvider(): JobsQueuesRepository {
  const queues = async () => (await jobsOpsApi.queues()).queues.map(toQueueDefinition);
  return {
    mode: "api",

    getJobs: fetchAllJobs,
    async getJobById(id) {
      try {
        const detail = await jobsOpsApi.job(id);
        return toJobRecord(detail, { payload: detail.payload });
      } catch (error) {
        if ((error as { status?: number }).status === 404) return null;
        throw error;
      }
    },
    async getAttempts(jobId) {
      try {
        return toAttempts(await jobsOpsApi.job(jobId));
      } catch (error) {
        if ((error as { status?: number }).status === 404) return [];
        throw error;
      }
    },
    getAllAttempts: async () => [],

    async getSchedules() {
      const now = Date.now();
      return (await jobsOpsApi.schedules()).items.map((s) => toSchedule(s, now));
    },
    async getScheduleById(id) {
      const now = Date.now();
      const found = (await jobsOpsApi.schedules()).items.find((s) => s.id === id);
      return found ? toSchedule(found, now) : null;
    },

    getWorkflows: async () => [],
    getWorkflowById: async () => null,
    getDependencies: async () => [],

    getQueues: queues,
    async getQueueById(id) {
      return (await queues()).find((q) => q.id === id) ?? null;
    },
    async getQueueStats() {
      return (await jobsOpsApi.queues()).queues.map(toQueueStats);
    },

    async getWorkers() {
      const now = Date.now();
      return (await jobsOpsApi.workers()).items.map((w) => toWorkerRecord(w, now));
    },
    async getWorkerById(id) {
      const now = Date.now();
      const found = (await jobsOpsApi.workers()).items.find((w) => w.id === id);
      return found ? toWorkerRecord(found, now) : null;
    },

    getRecoveryRequests: async () => [],
    getQueueOperationalControls: async () => [],
    async getActivity() {
      return (await jobsOpsApi.activity()).items.map(toActivity);
    },
    async getProcessingTrend() {
      return (await jobsOpsApi.trend(14)).items.map((d) => ({ date: d.date, completed: d.completed, failed: d.failed, started: d.started, retriesScheduled: 0 }));
    },
    getOverview: buildOverview,

    async requestJobRetry(jobId, reason = "") {
      await jobsOpsApi.retry(jobId, reason);
      return null;
    },
    updateRecoveryRequestState: async () => null,
    async cancelJob(jobId, reason = "") {
      await jobsOpsApi.cancel(jobId, reason);
      return null;
    },
    async pauseQueue(queueId, reason = "") {
      await jobsOpsApi.setPaused(queueId, true, reason);
      return (await queues()).find((q) => q.id === queueId) ?? null;
    },
    async resumeQueue(queueId, reason = "") {
      await jobsOpsApi.setPaused(queueId, false, reason);
      return (await queues()).find((q) => q.id === queueId) ?? null;
    },
    resetDemo: async () => undefined,
  };
}
