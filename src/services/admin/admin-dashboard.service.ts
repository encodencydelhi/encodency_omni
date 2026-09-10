import { mockAdminDashboardRepository } from "./admin-dashboard.repository";
import type { AdminClientscope } from "@/types/admin";

export const adminDashboardService = {
  getOverview(scopeId: AdminClientscope, signal?: AbortSignal) {
    return mockAdminDashboardRepository.getSnapshot(scopeId, signal);
  },
};
