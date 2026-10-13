import { apiClient } from "@/lib/api/client";
import { companyScopeHeaders } from "@/lib/api/company-scope";
import { getStoredClientId, getStoredCompanyId } from "@/lib/api/tenancy-storage";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const analyticsService = {
  async getDashboard(signal?: AbortSignal) {
    try {
      const stored = getStoredClientId();
      const validClientId = stored && UUID_PATTERN.test(stored) ? stored : undefined;
      return await apiClient.request<any>({
        method: "GET",
        path: "/analytics/dashboard",
        headers: companyScopeHeaders(getStoredCompanyId(), validClientId ? { 'x-client-id': validClientId } : {}),
        signal,
      });
    } catch {
      return null;
    }
  },
};
