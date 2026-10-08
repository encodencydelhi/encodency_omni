"use client";

import { useQuery } from "@tanstack/react-query";
import { overviewApi } from "@/features/dashboard/live/overview-api";
import { useTenancyContext } from "@/lib/api/tenancy-context";

export const COMPANY_RANGES = {
  "7d": "Last 7 days",
  "30d": "Last 30 days",
  "90d": "Last 90 days",
} as const;
export type CompanyRange = keyof typeof COMPANY_RANGES;

/** The Company Admin dashboard: what the signed-in member can see across their Clients (optionally one Client). */
export function useCompanyOverview(range: CompanyRange, clientId: string | null) {
  const { companyId, isReady } = useTenancyContext();
  return useQuery({
    queryKey: ["admin", "company-overview", companyId, range, clientId],
    queryFn: ({ signal }) => overviewApi.company(companyId!, { range, clientId: clientId ?? undefined }, signal),
    enabled: isReady && Boolean(companyId),
    staleTime: 30_000,
  });
}
