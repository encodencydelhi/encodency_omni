import { apiClient } from "@/lib/api/client";
import { companyScopeHeaders } from "@/lib/api/company-scope";
import { getStoredCompanyId } from "@/lib/api/tenancy-storage";
import { isMockMode } from "@/config/env";
import type { DashboardSnapshot } from "@/types/domain/dashboard";
import { DASHBOARD_SNAPSHOT, buildSnapshot } from "@/mocks/data/dashboard";
import { overviewApi } from "../live/overview-api";
import { buildLiveSnapshot, type LiveJobsStats } from "./live-snapshot";

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

export interface MetricCountItem {
  value: number;
  state: "live" | "unavailable";
}

export interface MetricComingSoonItem {
  value: null;
  state: "coming_soon" | "unsupported";
  reason: string;
}

export interface CompanySummaryResponse {
  companyId: string;
  generatedAt: string;
  metrics: {
    clients: MetricCountItem;
    campaigns: MetricCountItem;
    drafts: MetricCountItem;
    activeScheduledPosts: MetricCountItem;
    mediaAssets: MetricCountItem;
    unreadNotifications: MetricCountItem;
    members: MetricCountItem;
    pendingInvitations: MetricCountItem;
    revenue: MetricComingSoonItem;
    impressions: MetricComingSoonItem;
    engagement: MetricComingSoonItem;
    seoScore: MetricComingSoonItem;
  };
  integrations: {
    connectedByProvider: Array<{ provider: string; status: string; count: number }>;
  };
  recentActivity: Array<{
    id: string;
    action: string;
    resourceType: string;
    resourceId: string;
    outcome: string;
    createdAt: string;
  }>;
}

export interface SuperAdminSummaryResponse {
  generatedAt: string;
  metrics: {
    companies: MetricCountItem;
    activeCompanies: MetricCountItem;
    clients: MetricCountItem;
    users: MetricCountItem;
    deactivatedUsers: MetricCountItem;
    integrations: MetricCountItem;
    unreadNotifications: MetricCountItem;
    auditLogs: MetricCountItem;
    revenue: MetricComingSoonItem;
    providerPerformance: MetricComingSoonItem;
  };
}

export const dashboardService = {
  /**
   * Super Admin dashboard. Live mode reads the platform's own aggregates:
   * - GET /super-admin/dashboard/overview?range=  (companies, users, clients, subscriptions, MRR, integrations,
   *   growth and revenue charts, plan mix, latest sign-ups, API usage, attention items, recent activity)
   * - GET /super-admin/jobs/stats                 (running and failed jobs)
   *
   * Failures propagate to React Query (error state with retry); there is no silent demo fallback.
   * A tile the backend cannot measure (uptime history) is not shown at all.
   */
  async getSnapshot(range: DashboardRange, signal?: AbortSignal): Promise<DashboardSnapshot> {
    if (isMockMode) return { ...getMockDashboardSnapshot(), generatedAt: new Date().toISOString() };

    const overview = await overviewApi.superAdmin(range, signal);
    // The queue panel is optional: when Redis is unreachable the rest of the dashboard still works.
    const jobs = await apiClient
      .request<JobsStatsResponse & LiveJobsStats>({ method: "GET", path: "/super-admin/jobs/stats", signal })
      .catch((error: unknown) => {
        if (signal?.aborted) throw error;
        return null;
      });
    return buildLiveSnapshot(overview, jobs);
  },

  /**
   * Super Admin Platform Summary: GET /api/v1/super-admin/dashboard/summary
   */
  async getSuperAdminSummary(signal?: AbortSignal): Promise<SuperAdminSummaryResponse> {
    return apiClient.request<SuperAdminSummaryResponse>({
      method: "GET",
      path: "/super-admin/dashboard/summary",
      signal,
    });
  },

  /**
   * Company Admin Summary: GET /api/v1/dashboard/company-summary
   * Enforces company context header (x-company-id).
   */
  async getCompanySummary(companyId?: string, signal?: AbortSignal): Promise<CompanySummaryResponse> {
    const resolvedCompanyId = companyId ?? (typeof window !== "undefined" ? getStoredCompanyId() : "");
    return apiClient.request<CompanySummaryResponse>({
      method: "GET",
      path: "/dashboard/company-summary",
      headers: companyScopeHeaders(resolvedCompanyId),
      signal,
    });
  },
};
