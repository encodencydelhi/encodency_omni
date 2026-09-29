"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query/keys";
import { companyService, type CompanyListParams } from "../services/company-service";

/**
 * Read access to the platform-wide company register, used by global search and
 * by the company filters on the Users and Clients pages.
 *
 * The tenant workspace itself (list, detail, lifecycle actions) lives behind
 * `data/repository.ts`; these two queries are the only ones that still go
 * through the shared API client.
 */
export function useCompanies(params: CompanyListParams) {
  return useQuery({
    queryKey: queryKeys.companies.list(params),
    queryFn: ({ signal }) => companyService.list(params, signal),
    placeholderData: keepPreviousData,
  });
}

import { superAdminCompaniesApi } from "../live/super-admin-companies-api";

export function useCompanyRefs() {
  return useQuery({
    queryKey: queryKeys.companies.list("refs"),
    queryFn: async ({ signal }) => {
      // In super-admin views, we need to list companies for assignment.
      // We'll use the super-admin API instead of the deprecated /companies/refs
      const res = await superAdminCompaniesApi.list({ limit: 100 });
      return res.items.map(c => ({ id: c.id, name: c.name }));
    },
    staleTime: 10 * 60_000,
  });
}
