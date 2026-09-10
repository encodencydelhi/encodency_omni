"use client";

import { useQuery } from "@tanstack/react-query";
import { adminDashboardService } from "@/services/admin/admin-dashboard.service";
import type { AdminClientscope } from "@/types/admin";

export function useAdminDashboard(scopeId: AdminClientscope) {
  return useQuery({
    queryKey: ["admin", "dashboard", scopeId],
    queryFn: ({ signal }) => adminDashboardService.getOverview(scopeId, signal),
    staleTime: 60_000,
  });
}
