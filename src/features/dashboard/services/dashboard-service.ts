import { apiClient } from "@/lib/api/client";
import type { DashboardSnapshot } from "@/types/domain/dashboard";
import { DASHBOARD_SNAPSHOT, buildSnapshot } from "@/mocks/data/dashboard";

/** Comparison windows the dashboard can be scoped to. */
export const DASHBOARD_RANGES = {
  "7d": { label: "Last 7 days", days: 7 },
  "30d": { label: "Last 30 days", days: 30 },
  "90d": { label: "Last 90 days", days: 90 },
  "12m": { label: "Last 12 months", days: 365 },
} as const;

export type DashboardRange = keyof typeof DASHBOARD_RANGES;

export const DEFAULT_DASHBOARD_RANGE: DashboardRange = "30d";

export function isDashboardRange(value: string | null): value is DashboardRange {
  return value !== null && value in DASHBOARD_RANGES;
}

export function getMockDashboardSnapshot(): DashboardSnapshot {
  try {
    return typeof buildSnapshot === "function" ? buildSnapshot() : DASHBOARD_SNAPSHOT;
  } catch {
    return DASHBOARD_SNAPSHOT;
  }
}

export interface QueueStatsItem {
  queue: string;
  reachable: boolean;
  counts?: {
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
  };
}

export interface JobsStatsResponse {
  queues: QueueStatsItem[];
}

export const dashboardService = {
  /**
   * Verified Backend Audit:
   * The current backend does NOT serve a `/dashboard` aggregation endpoint.
   * The verified live monitoring endpoint is:
   *   GET /api/v1/super-admin/jobs/stats (Platform Super Admin BullMQ/Redis statistics)
   *
   * Data Integrity Policy:
   * - Call the real live jobs endpoint.
   * - On failure, propagate errors to React Query so loading and error states with retry actions are rendered.
   * - Never silently swallow errors into mock data.
   * - Clearly separate verified live Jobs statistics from unsupported dashboard statistics.
   */
  async getSnapshot(_range: DashboardRange, signal?: AbortSignal): Promise<DashboardSnapshot> {
    // 1. Fetch verified live Jobs & Queues statistics from real backend endpoint
    const statsResponse = await apiClient.request<JobsStatsResponse>({
      method: "GET",
      path: "/super-admin/jobs/stats",
      signal,
    });

    const queues = Array.isArray(statsResponse?.queues) ? statsResponse.queues : [];
    let totalActiveJobs = 0;
    let reachableQueuesCount = 0;

    for (const q of queues) {
      if (q.reachable) {
        reachableQueuesCount++;
        if (q.counts) {
          totalActiveJobs += q.counts.active ?? 0;
        }
      }
    }

    // 2. Base dataset for unsupported platform statistics (companies, revenue, etc.)
    const baseSnapshot = getMockDashboardSnapshot();

    // 3. Mark live vs unsupported metrics explicitly to maintain data integrity
    const metrics = baseSnapshot.metrics.map((m) => {
      if (m.key === "runningJobs") {
        return {
          ...m,
          value: totalActiveJobs,
          isLive: true,
          hint: `${totalActiveJobs} active across ${reachableQueuesCount} BullMQ queues (Live)`,
        };
      }
      return {
        ...m,
        isLive: false,
        hint: `${m.hint} • Demo`,
      };
    });

    return {
      ...baseSnapshot,
      generatedAt: new Date().toISOString(),
      metrics,
    };
  },
};
