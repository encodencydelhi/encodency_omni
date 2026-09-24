/**
 * Real HTTP provider for the Jobs & Queues workspace.
 *
 * Wired in `repository.ts` when `NEXT_PUBLIC_DATA_SOURCE=api`. Reads the one
 * endpoint the backend actually serves today:
 *
 *   GET /api/v1/super-admin/jobs/stats   ({ queues: QueueStats[] }, platform Super Admin only)
 *
 * The stats payload covers the four canonical BullMQ queues
 * (`notifications`, `publishing`, `crawler`, `billing-events`) with live
 * waiting/active/completed/failed/delayed counts and a `recentFailed` sample
 * per queue. Fields the stats API does not carry (retryWaiting, deadLettered,
 * oldestWaitingAt, registeredWorkers, job policies, worker liveness, trends)
 * map to honest zeros or an explicit "not exposed" label rather than invented
 * values.
 *
 * Fallback policy (same decision as companies, 2026-09-24): network / 404 /
 * 5xx or an empty `queues` array → the injected `fallback` (demo dataset)
 * answers. 401/403/429/400 still propagate: an authorization or contract
 * problem must surface, not quietly swap in demo rows.
 *
 * Every method the backend does not serve (job lists, attempts, schedules,
 * workflows, workers, mutations, ...) delegates straight to the same fallback
 * so the workspace stays functional while those APIs are built.
 */
import { apiClient } from "@/lib/api/client";
import { ApiError } from "@/types/api";
import type { JobsQueuesRepository } from "./repository";
import type {
  JobRecord,
  JobsKpis,
  JobsOverviewData,
  QueueDefinition,
  QueueStats,
  QueueStatsResponse,
} from "./types";

/* ------------------------------------------------------------------ */
/* Backend DTO (mirrors super-admin-jobs.service.ts QueueStats)        */
/* ------------------------------------------------------------------ */

/** Display metadata for the four queues the backend registers. */
const BACKEND_QUEUE_META: Record<string, { name: string; category: string; purpose: string }> = {
  notifications: {
    name: "Notifications",
    category: "Communication",
    purpose: "Delivers platform notifications (email, in-app, integration alerts).",
  },
  publishing: {
    name: "Publishing",
    category: "Publishing",
    purpose: "Executes scheduled social and content publishing jobs.",
  },
  crawler: {
    name: "Crawler",
    category: "SEO",
    purpose: "Runs SEO site crawls and incremental audits.",
  },
  "billing-events": {
    name: "Billing Events",
    category: "Billing",
    purpose: "Processes billing and invoice lifecycle events.",
  },
};

const ZERO_COUNTS = { waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0 } as const;

/* ------------------------------------------------------------------ */
/* Mapping                                                             */
/* ------------------------------------------------------------------ */

export function toQueueDefinition(stat: QueueStats): QueueDefinition {
  const meta = BACKEND_QUEUE_META[stat.queue] ?? {
    name: stat.queue,
    category: "General",
    purpose: `Processes ${stat.queue} jobs across the platform.`,
  };
  const counts = stat.reachable ? (stat.counts ?? ZERO_COUNTS) : ZERO_COUNTS;

  return {
    id: stat.queue,
    name: meta.name,
    category: meta.category,
    purpose: stat.reachable
      ? meta.purpose
      : stat.error
        ? `Queue unreachable: ${stat.error}`
        : "Queue unreachable — stats unavailable.",
    operationalState: stat.reachable ? "running" : "unknown",
    jobTypes: [],
    priorityPolicy: "Not exposed by the stats API",
    concurrencyReference: "Not exposed by the stats API",
    timeoutPolicy: "Not exposed by the stats API",
    retryPolicy: "Not exposed by the stats API",
    deadLetterPolicy: "Not exposed by the stats API",
    workerGroup: `group_${stat.queue}`,
    environment: "development",
    waiting: counts.waiting,
    running: counts.active,
    delayed: counts.delayed,
    failed: counts.failed,
    // Backend `completed` is all-time, not a 24h window — the field name is
    // the UI's; the number is the honest cumulative count the API returns.
    succeededLast24h: counts.completed,
    retryWaiting: 0,
    deadLettered: 0,
    oldestWaitingAt: null,
    registeredWorkers: 0,
  };
}

/** Minimal JobRecord for a `recentFailed` sample — only fields the stats API supplies. */
function toFailedJob(stat: QueueStats, entry: NonNullable<QueueStats["recentFailed"]>[number]): JobRecord {
  return {
    id: entry.id || `failed_${stat.queue}_${entry.name}`,
    type: entry.name,
    name: entry.name,
    queue: stat.queue,
    lifecycleState: "failed",
    priority: "normal",
    environment: "development",
    company: null,
    client: null,
    workflowId: null,
    correlationId: null,
    idempotencyKey: null,
    relatedResourceType: null,
    relatedResourceId: null,
    relatedResourceName: null,
    attempts: entry.attemptsMade,
    maxAttempts: entry.attemptsMade,
    errorMessage: entry.failedReason,
    failureClassification: null,
    retryEligibility: "unknown",
    createdAt: new Date().toISOString(),
    scheduledAt: null,
    enqueuedAt: null,
    startedAt: null,
    completedAt: null,
    lastAttemptAt: null,
    nextRetryAt: null,
    durationMs: null,
    payload: {},
  };
}

/**
 * Build an honest overview from live stats: queue KPIs come from the counts;
 * sections the stats API does not serve (trend, workers, activity, upcoming
 * schedules) are empty rather than filled with demo rows.
 */
export function buildOverviewFromStats(stats: QueueStats[]): JobsOverviewData {
  const queues = stats.map(toQueueDefinition);
  const reachable = stats.filter((s) => s.reachable);
  const sumCounts = (pick: (c: NonNullable<QueueStats["counts"]>) => number) =>
    reachable.reduce((total, s) => total + pick(s.counts ?? ZERO_COUNTS), 0);

  const waiting = sumCounts((c) => c.waiting);
  const running = sumCounts((c) => c.active);
  const scheduled = sumCounts((c) => c.delayed);
  const succeeded = sumCounts((c) => c.completed);
  const failed = sumCounts((c) => c.failed);

  const kpis: JobsKpis = {
    totalJobs: waiting + running + scheduled + succeeded + failed,
    waiting,
    running,
    scheduled,
    retryWaiting: 0,
    succeeded,
    failed,
    deadLettered: 0,
    activeQueues: reachable.length,
    totalWorkers: 0,
    onlineWorkers: 0,
    staleWorkers: 0,
    offlineWorkers: 0,
  };

  const failures = stats
    .flatMap((s) => (s.recentFailed ?? []).map((entry) => toFailedJob(s, entry)))
    .slice(0, 6);

  return {
    kpis,
    processingTrend: [],
    queues,
    failuresRequiringAttention: failures,
    upcomingScheduled: [],
    workers: [],
    recentActivity: [],
  };
}

/* ------------------------------------------------------------------ */
/* Fallback policy                                                     */
/* ------------------------------------------------------------------ */

/** Unreachable (0), missing (404) or broken (5xx) backend → show demo data. */
export function shouldFallBack(error: unknown): boolean {
  if (!ApiError.isApiError(error)) return true;
  return error.status === 0 || error.status === 404 || error.status >= 500;
}

async function fetchStats(): Promise<QueueStats[]> {
  const response = await apiClient.request<QueueStatsResponse>({
    method: "GET",
    path: "/super-admin/jobs/stats",
  });
  return response.queues ?? [];
}

/* ------------------------------------------------------------------ */
/* Provider                                                            */
/* ------------------------------------------------------------------ */

export function createApiJobsQueuesProvider(fallback: JobsQueuesRepository): JobsQueuesRepository {
  return {
    ...fallback,
    mode: "api",

    async getQueueStats(): Promise<QueueStats[]> {
      try {
        const stats = await fetchStats();
        // Owner decision: no real rows → show the demo dataset, not an empty panel.
        if (stats.length === 0) return fallback.getQueueStats();
        return stats;
      } catch (error) {
        if (shouldFallBack(error)) return fallback.getQueueStats();
        throw error;
      }
    },

    async getQueues(): Promise<QueueDefinition[]> {
      try {
        const stats = await fetchStats();
        if (stats.length === 0) return fallback.getQueues();
        return stats.map(toQueueDefinition);
      } catch (error) {
        if (shouldFallBack(error)) return fallback.getQueues();
        throw error;
      }
    },

    async getQueueById(id: string): Promise<QueueDefinition | null> {
      try {
        const stats = await fetchStats();
        if (stats.length === 0) return fallback.getQueueById(id);
        const match = stats.find((s) => s.queue === id);
        return match ? toQueueDefinition(match) : null;
      } catch (error) {
        if (shouldFallBack(error)) return fallback.getQueueById(id);
        throw error;
      }
    },

    async getOverview(): Promise<JobsOverviewData> {
      try {
        const stats = await fetchStats();
        if (stats.length === 0) return fallback.getOverview();
        return buildOverviewFromStats(stats);
      } catch (error) {
        if (shouldFallBack(error)) return fallback.getOverview();
        throw error;
      }
    },
  };
}
