"use client";

import { useQuery } from "@tanstack/react-query";
import { superAdminCompaniesApi } from "@/features/companies/live/super-admin-companies-api";
import { COMPANY_POOL_EXPORT, TEAM_MOCK_MODE } from "./config";

export interface PoolCompany {
  id: string;
  name: string;
}

const DEMO_POOL: PoolCompany[] = COMPANY_POOL_EXPORT.map((c) => ({ id: c.id, name: c.name }));

/** Companies staff can be assigned to: the real active Companies in live mode. */
export function useCompanyPool(): PoolCompany[] {
  const { data } = useQuery({
    queryKey: ["internal-team", "company-pool"],
    queryFn: async () => {
      const res = await superAdminCompaniesApi.list({ limit: 100 });
      return res.items.filter((c) => c.status === "ACTIVE").map((c) => ({ id: c.id, name: c.name }));
    },
    enabled: !TEAM_MOCK_MODE,
    staleTime: 60_000,
  });
  return TEAM_MOCK_MODE ? DEMO_POOL : (data ?? []);
}
