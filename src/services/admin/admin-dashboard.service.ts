import { mockAdminDashboardRepository } from "./admin-dashboard.repository";
import type { AdminClientscope, AdminDashboardSnapshot } from "@/types/admin";
import { dashboardService } from "@/features/dashboard/services/dashboard-service";
import { getStoredCompanyId } from "@/lib/api/tenancy-storage";

export const adminDashboardService = {
  async getOverview(scopeId: AdminClientscope, signal?: AbortSignal): Promise<AdminDashboardSnapshot> {
    const base = await mockAdminDashboardRepository.getSnapshot(scopeId, signal);
    const companyId = typeof window !== "undefined" ? getStoredCompanyId() : "";
    if (!companyId) return base;

    try {
      const summary = await dashboardService.getCompanySummary(companyId, signal);
      if (summary && summary.metrics) {
        const updatedMetrics = base.metrics.map((m) => {
          if (m.key === "projects" && summary.metrics.clients?.state === "live") {
            const val = summary.metrics.clients.value;
            return {
              ...m,
              value: val,
              formattedValue: val.toString(),
            };
          }
          if (m.key === "campaigns" && summary.metrics.campaigns?.state === "live") {
            const val = summary.metrics.campaigns.value;
            return {
              ...m,
              value: val,
              formattedValue: val.toString(),
            };
          }
          return m;
        });

        return {
          ...base,
          metrics: updatedMetrics,
          updatedAt: summary.generatedAt,
        };
      }
    } catch {
      // Fall back cleanly to base snapshot on network or permission boundaries
    }

    return base;
  },
};
