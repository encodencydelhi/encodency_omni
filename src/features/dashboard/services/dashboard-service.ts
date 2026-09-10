import { apiClient } from "@/lib/api/client";
import type { DashboardSnapshot } from "@/types/domain/dashboard";

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

export const dashboardService = {
  /**
   * The dashboard is a single aggregated read rather than a dozen parallel
   * requests, matching how the backend will expose it. The range travels as a
   * query parameter so the server can do the windowing.
   */
  getSnapshot(range: DashboardRange, signal?: AbortSignal): Promise<DashboardSnapshot> {
    return apiClient.request<DashboardSnapshot>({
      method: "GET",
      path: "/dashboard",
      query: { range },
      signal,
    });
  },
};
