import { adminDashboardByScope } from "@/mocks/admin/admin-dashboard.mock";
import type { AdminDashboardSnapshot, AdminClientscope } from "@/types/admin";

export interface AdminDashboardRepository {
  getSnapshot(scopeId: AdminClientscope, signal?: AbortSignal): Promise<AdminDashboardSnapshot>;
}

export const mockAdminDashboardRepository: AdminDashboardRepository = {
  async getSnapshot(scopeId, signal) {
    await new Promise<void>((resolve, reject) => {
      const timeout = window.setTimeout(resolve, 280);
      signal?.addEventListener("abort", () => {
        window.clearTimeout(timeout);
        reject(new DOMException("Request aborted", "AbortError"));
      }, { once: true });
    });
    return adminDashboardByScope[scopeId] ?? adminDashboardByScope.all!;
  },
};
