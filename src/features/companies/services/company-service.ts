import { apiClient } from "@/lib/api/client";
import { toListQuery } from "@/lib/api/transport";
import type { ListParams, PaginatedResponse } from "@/types/api";
import type { EntityRef } from "@/types/common";
import type { Company, CompanyFilters } from "@/types/domain/company";

export type CompanyListParams = ListParams<Record<keyof CompanyFilters, string>>;

/**
 * Lightweight company look-ups through the shared API client.
 *
 * Only what global search and the Users/Clients filters need. Everything the
 * Companies module does - KPIs, detail, lifecycle - goes through
 * `data/repository.ts` instead.
 */
export const companyService = {
  list(params: CompanyListParams, signal?: AbortSignal) {
    return apiClient.request<PaginatedResponse<Company>>({
      method: "GET",
      path: "/companies",
      query: toListQuery(params),
      signal,
    });
  },

  /** Lightweight reference list for filter dropdowns and pickers. */
  listRefs(signal?: AbortSignal) {
    return apiClient.request<EntityRef[]>({ method: "GET", path: "/companies/refs", signal });
  },
};
