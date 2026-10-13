import { apiClient } from "@/lib/api/client";
import { REPORTS_DASHBOARD } from "@/mocks/data/reports";
import { ApiError } from "@/types/api";
import type { ReportsDashboard } from "@/types/domain/reports";
import { companyScopeHeaders } from '@/lib/api/company-scope';
import { getStoredClientId, getStoredCompanyId } from '@/lib/api/tenancy-storage';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function canFallBack(error: unknown): boolean {
  if (!ApiError.isApiError(error)) return true;
  return error.status === 0 || error.status === 400 || error.status === 404 || error.status >= 500;
}

export const reportsService = {
  /**
   * `GET /reports/dashboard` — loads real dashboard metrics or gracefully degrades
   * to bundled dataset so the page never fails or shows an infinite spinner.
   */
  async getDashboard(signal?: AbortSignal): Promise<ReportsDashboard> {
    try {
      const stored = getStoredClientId();
      const validClientId = stored && UUID_PATTERN.test(stored) ? stored : undefined;
      return await apiClient.request<ReportsDashboard>({
        method: "GET",
        path: "/reports/dashboard",
        headers: companyScopeHeaders(getStoredCompanyId(), validClientId ? { 'x-client-id': validClientId } : {}),
        signal
      });
    } catch (error) {
      if (!canFallBack(error)) throw error;
      return REPORTS_DASHBOARD;
    }
  },
};
