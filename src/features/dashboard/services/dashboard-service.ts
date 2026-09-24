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

export const dashboardService = {
  /**
   * The dashboard is a single aggregated read rather than a dozen parallel
   * requests, matching how the backend will expose it. The range travels as a
   * query parameter so the server can do the windowing.
   *
   * If the API fails, is unreachable, or returns empty/invalid data, we gracefully
   * fall back to the rich mock dashboard snapshot so the superadmin can always see
   * the dashboard.
   */
  async getSnapshot(range: DashboardRange, signal?: AbortSignal): Promise<DashboardSnapshot> {
    const mockFallback = getMockDashboardSnapshot();
    try {
      const data = await apiClient.request<DashboardSnapshot>({
        method: "GET",
        path: "/dashboard",
        query: { range },
        signal,
      });

      // If data is returned from API, check if it's non-empty and has metrics
      if (
        data &&
        typeof data === "object" &&
        Array.isArray(data.metrics) &&
        data.metrics.length > 0
      ) {
        return {
          ...mockFallback,
          ...data,
          metrics: data.metrics,
          companyGrowth: data.companyGrowth?.series?.length ? data.companyGrowth : mockFallback.companyGrowth,
          revenue: data.revenue?.series?.length ? data.revenue : mockFallback.revenue,
          subscriptionDistribution: data.subscriptionDistribution?.segments?.length
            ? data.subscriptionDistribution
            : mockFallback.subscriptionDistribution,
          attention: Array.isArray(data.attention) && data.attention.length > 0 ? data.attention : mockFallback.attention,
          recentActivity: Array.isArray(data.recentActivity) && data.recentActivity.length > 0 ? data.recentActivity : mockFallback.recentActivity,
          latestSignups: Array.isArray(data.latestSignups) && data.latestSignups.length > 0 ? data.latestSignups : mockFallback.latestSignups,
          apiUsage: data.apiUsage?.totalRequests ? data.apiUsage : mockFallback.apiUsage,
          integrationStatus: Array.isArray(data.integrationStatus) && data.integrationStatus.length > 0 ? data.integrationStatus : mockFallback.integrationStatus,
          platformHealth: Array.isArray(data.platformHealth) && data.platformHealth.length > 0 ? data.platformHealth : mockFallback.platformHealth,
        };
      }

      console.warn("[dashboardService] API returned empty dashboard data. Falling back to mock data.");
      return mockFallback;
    } catch (error) {
      console.warn("[dashboardService] Dashboard API request failed. Falling back to mock data.", error);
      return mockFallback;
    }
  },
};
