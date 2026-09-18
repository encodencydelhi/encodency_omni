import { apiClient } from "@/lib/api/client";
import type { ReportsDashboard } from "@/types/domain/reports";

export const reportsService = {
  getDashboard(signal?: AbortSignal): Promise<ReportsDashboard> {
    return apiClient.request<ReportsDashboard>({ method: "GET", path: "/reports/dashboard", signal });
  },
};
