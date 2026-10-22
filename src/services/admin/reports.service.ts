import { apiClient } from "@/lib/api/client";
import type { ReportsDashboard } from "@/types/domain/reports";
import { companyScopeHeaders } from '@/lib/api/company-scope';
import { getStoredClientId, getStoredCompanyId } from '@/lib/api/tenancy-storage';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const reportsService = {
  /**
   * `GET /reports/dashboard`. A failed request is thrown to the caller so the page can show the
   * error; it is never replaced with bundled sample data.
   */
  async getDashboard(signal?: AbortSignal): Promise<ReportsDashboard> {
    const stored = getStoredClientId();
    const validClientId = stored && UUID_PATTERN.test(stored) ? stored : undefined;
    return apiClient.request<ReportsDashboard>({
      method: "GET",
      path: "/reports/dashboard",
      headers: companyScopeHeaders(getStoredCompanyId(), validClientId ? { 'x-client-id': validClientId } : {}),
      signal
    });
  },
};
