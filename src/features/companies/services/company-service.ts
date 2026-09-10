import { apiClient } from "@/lib/api/client";
import { toListQuery } from "@/lib/api/transport";
import type { ListParams, PaginatedResponse } from "@/types/api";
import type { EntityRef } from "@/types/common";
import type {
  ChangeCompanyPlanInput,
  Company,
  CompanyActivityEntry,
  CompanyFilters,
  CompanyOverview,
  CompanyStatusChangeInput,
} from "@/types/domain/company";
import type { CompanyIntegration } from "@/types/domain/integration";
import type { PlatformUser } from "@/types/domain/user";
import type { Project } from "@/types/domain/project";
import type { Subscription } from "@/types/domain/subscription";
import type { UsageRecord } from "@/types/domain/usage";
import type { AuditLogEntry } from "@/types/domain/audit-log";

export type CompanyListParams = ListParams<Record<keyof CompanyFilters, string>>;

/**
 * Company operations, expressed as the API will expose them.
 *
 * Callers never build URLs or query strings; when the NestJS endpoints land,
 * only the paths in this file are verified against the real contract.
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

  get(id: string, signal?: AbortSignal) {
    return apiClient.request<Company>({ method: "GET", path: `/companies/${id}`, signal });
  },

  getOverview(id: string, signal?: AbortSignal) {
    return apiClient.request<CompanyOverview>({
      method: "GET",
      path: `/companies/${id}/overview`,
      signal,
    });
  },

  listClients(id: string, params: ListParams, signal?: AbortSignal) {
    return apiClient.request<PaginatedResponse<Project>>({
      method: "GET",
      path: `/companies/${id}/projects`,
      query: toListQuery(params),
      signal,
    });
  },

  listUsers(id: string, params: ListParams, signal?: AbortSignal) {
    return apiClient.request<PaginatedResponse<PlatformUser>>({
      method: "GET",
      path: `/companies/${id}/users`,
      query: toListQuery(params),
      signal,
    });
  },

  listIntegrations(id: string, signal?: AbortSignal) {
    return apiClient.request<CompanyIntegration[]>({
      method: "GET",
      path: `/companies/${id}/integrations`,
      signal,
    });
  },

  getSubscription(id: string, signal?: AbortSignal) {
    return apiClient.request<Subscription>({
      method: "GET",
      path: `/companies/${id}/subscription`,
      signal,
    });
  },

  listUsage(id: string, signal?: AbortSignal) {
    return apiClient.request<UsageRecord[]>({ method: "GET", path: `/companies/${id}/usage`, signal });
  },

  listActivity(id: string, signal?: AbortSignal) {
    return apiClient.request<CompanyActivityEntry[]>({
      method: "GET",
      path: `/companies/${id}/activity`,
      signal,
    });
  },

  listAuditLogs(id: string, params: ListParams, signal?: AbortSignal) {
    return apiClient.request<PaginatedResponse<AuditLogEntry>>({
      method: "GET",
      path: `/companies/${id}/audit-logs`,
      query: toListQuery(params),
      signal,
    });
  },

  changeStatus(input: CompanyStatusChangeInput) {
    return apiClient.request<Company>({
      method: "PATCH",
      path: `/companies/${input.companyId}/status`,
      body: input,
    });
  },

  changePlan(input: ChangeCompanyPlanInput) {
    return apiClient.request<Company>({
      method: "PATCH",
      path: `/companies/${input.companyId}/plan`,
      body: input,
    });
  },
};
