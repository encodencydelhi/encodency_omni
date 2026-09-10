"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query/keys";
import { dashboardService, type DashboardRange } from "../services/dashboard-service";

export function useDashboard(range: DashboardRange) {
  return useQuery({
    queryKey: queryKeys.dashboard.summary({ range }),
    queryFn: ({ signal }) => dashboardService.getSnapshot(range, signal),
    staleTime: 60_000,
  });
}
