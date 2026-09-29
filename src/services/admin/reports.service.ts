import { apiClient } from "@/lib/api/client";
import { REPORTS_DASHBOARD } from "@/mocks/data/reports";
import { ApiError } from "@/types/api";
import type { ReportsDashboard } from "@/types/domain/reports";

function canFallBack(error: unknown): boolean {
  if (!ApiError.isApiError(error)) return true;
  return error.status === 0 || error.status === 404 || error.status >= 500;
}

export const reportsService = {
  /**
   * `GET /reports/dashboard` — no reports controller ships with the backend yet,
   * so a missing endpoint degrades to the bundled dataset instead of leaving the
   * page on an infinite "Loading reports..." spinner.
   */
  async getDashboard(signal?: AbortSignal): Promise<ReportsDashboard> {
    try {
      return await apiClient.request<ReportsDashboard>({ method: "GET", path: "/reports/dashboard", signal });
    } catch (error) {
      if (!canFallBack(error)) throw error;
      return REPORTS_DASHBOARD;
    }
  },
};
