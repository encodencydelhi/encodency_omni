"use client";

import { useQuery } from "@tanstack/react-query";
import { analyticsService } from "@/services/admin/analytics.service";

export function useAnalyticsDashboard() {
  return useQuery({
    queryKey: ["admin", "analytics", "dashboard"],
    queryFn: ({ signal }) => analyticsService.getDashboard(signal),
    staleTime: 60_000,
  });
}
