"use client";

import { useQuery } from "@tanstack/react-query";
import { reportsService } from "@/services/admin/reports.service";

export function useReportsDashboard() {
  return useQuery({
    queryKey: ["admin", "reports", "dashboard"],
    queryFn: ({ signal }) => reportsService.getDashboard(signal),
    staleTime: 60_000,
  });
}
