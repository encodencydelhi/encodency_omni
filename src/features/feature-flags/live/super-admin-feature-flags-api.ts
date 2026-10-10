import { apiClient } from "@/lib/api/client";
import type {
  ChangeOutcome,
  ConfigDiff,
  CreateFlagInput,
  Environment,
  FeatureFlag,
  FlagChange,
  FlagListQuery,
  ProposeChangeInput,
  ValidationIssue,
} from "../data/types";
import type {
  ActivityResult,
  ChangePreview,
  ChangesQuery,
  ChangesResult,
  CompanyAccessResult,
  CompanyImpactQuery,
  CompanyImpactResult,
  CompanyOption,
  EvaluationDetail,
  FlagDetail,
  FlagListResult,
  OverviewData,
  OverviewFilter,
  VersionComparison,
  VersionsResult,
} from "../data/repository";

const BASE = "/super-admin/feature-flags";

export const superAdminFeatureFlagsApi = {
  getOverview: (environment: Environment = "production", filter?: OverviewFilter, signal?: AbortSignal) =>
    apiClient.request<OverviewData>({
      method: "GET",
      path: `${BASE}/overview`,
      query: { environment, ...(filter?.category ? { category: filter.category } : {}), ...(filter?.owner ? { owner: filter.owner } : {}) },
      signal,
    }),

  listFlags: (query: FlagListQuery, signal?: AbortSignal) =>
    apiClient.request<FlagListResult>({
      method: "GET",
      path: `${BASE}/flags`,
      query: {
        environment: query.environment,
        ...(query.search ? { search: query.search } : {}),
        ...(query.category ? { category: query.category } : {}),
        ...(query.type ? { type: query.type } : {}),
        ...(query.lifecycle ? { lifecycle: query.lifecycle } : {}),
        ...(query.state ? { state: query.state } : {}),
        ...(query.strategy ? { strategy: query.strategy } : {}),
        ...(query.owner ? { owner: query.owner } : {}),
        ...(query.quick ? { quick: query.quick } : {}),
        ...(query.sort ? { sort: query.sort } : {}),
        ...(query.includeArchived ? { includeArchived: String(query.includeArchived) } : {}),
      },
      signal,
    }),

  getFlag: (key: string, environment: Environment = "production", signal?: AbortSignal) =>
    apiClient.request<FlagDetail>({
      method: "GET",
      path: `${BASE}/flags/${encodeURIComponent(key)}`,
      query: { environment },
      signal,
    }),

  validateCreate: (input: CreateFlagInput) =>
    apiClient.request<ValidationIssue[]>({
      method: "POST",
      path: `${BASE}/flags/validate`,
      body: input,
    }),

  createFlag: (input: CreateFlagInput) =>
    apiClient.request<FeatureFlag>({
      method: "POST",
      path: `${BASE}/flags`,
      body: input,
    }),

  updateMetadata: (
    key: string,
    patch: Partial<Pick<FeatureFlag, "description" | "ownerTeam" | "relatedModule" | "documentation">>,
  ) =>
    apiClient.request<FeatureFlag>({
      method: "PATCH",
      path: `${BASE}/flags/${encodeURIComponent(key)}/metadata`,
      body: patch,
    }),

  setLifecycle: (key: string, action: "deprecate" | "archive", reason: string) =>
    apiClient.request<FeatureFlag>({
      method: "POST",
      path: `${BASE}/flags/${encodeURIComponent(key)}/lifecycle`,
      body: { action, reason },
    }),

  previewChange: (key: string, environment: Environment, proposed: Partial<ConfigDiff>, signal?: AbortSignal) =>
    apiClient.request<ChangePreview>({
      method: "POST",
      path: `${BASE}/flags/${encodeURIComponent(key)}/preview`,
      query: { environment },
      body: proposed,
      signal,
    }),

  proposeChange: (input: ProposeChangeInput) =>
    apiClient.request<ChangeOutcome>({
      method: "POST",
      path: `${BASE}/flags/${encodeURIComponent(input.flagKey)}/propose`,
      body: {
        environment: input.environment,
        proposed: input.proposed,
        reason: input.reason,
        effectiveAt: input.effectiveAt,
        saveAsDraft: input.saveAsDraft,
      },
    }),

  listCompanyImpact: (key: string, environment: Environment, query?: CompanyImpactQuery, signal?: AbortSignal) =>
    apiClient.request<CompanyImpactResult>({
      method: "GET",
      path: `${BASE}/flags/${encodeURIComponent(key)}/impact`,
      query: {
        environment,
        ...(query?.search ? { search: query.search } : {}),
        ...(query?.plan ? { plan: query.plan } : {}),
        ...(query?.targeting ? { targeting: query.targeting } : {}),
        ...(query?.availability ? { availability: query.availability } : {}),
        ...(query?.reason ? { reason: query.reason } : {}),
      },
      signal,
    }),

  evaluateCompany: (key: string, environment: Environment, companyId: string, signal?: AbortSignal) =>
    apiClient.request<EvaluationDetail>({
      method: "GET",
      path: `${BASE}/flags/${encodeURIComponent(key)}/evaluate/${encodeURIComponent(companyId)}`,
      query: { environment },
      signal,
    }),

  getCompanyAccess: (companyId: string, environment: Environment, signal?: AbortSignal) =>
    apiClient.request<CompanyAccessResult>({
      method: "GET",
      path: `${BASE}/companies/${encodeURIComponent(companyId)}/access`,
      query: { environment },
      signal,
    }),

  searchCompanies: (term: string, signal?: AbortSignal) =>
    apiClient.request<CompanyOption[]>({
      method: "GET",
      path: `${BASE}/companies/search`,
      query: { term },
      signal,
    }),

  listChanges: (query: ChangesQuery, signal?: AbortSignal) =>
    apiClient.request<ChangesResult>({
      method: "GET",
      path: `${BASE}/changes`,
      query: {
        ...(query.environment ? { environment: query.environment } : {}),
        ...(query.status ? { status: query.status.join(",") } : {}),
        ...(query.flagKey ? { flagKey: query.flagKey } : {}),
        ...(query.type ? { type: query.type } : {}),
        ...(query.actor ? { actor: query.actor } : {}),
        ...(query.result ? { result: query.result } : {}),
        ...(query.search ? { search: query.search } : {}),
        ...(query.page ? { page: String(query.page) } : {}),
        ...(query.pageSize ? { pageSize: String(query.pageSize) } : {}),
      },
      signal,
    }),

  getChange: (id: string, signal?: AbortSignal) =>
    apiClient.request<FlagChange>({
      method: "GET",
      path: `${BASE}/changes/${encodeURIComponent(id)}`,
      signal,
    }),

  cancelChange: (id: string, reason: string) =>
    apiClient.request<FlagChange>({
      method: "POST",
      path: `${BASE}/changes/${encodeURIComponent(id)}/cancel`,
      body: { reason },
    }),

  listActivity: (query: ChangesQuery, signal?: AbortSignal) =>
    apiClient.request<ActivityResult>({
      method: "GET",
      path: `${BASE}/activity`,
      query: {
        ...(query.environment ? { environment: query.environment } : {}),
        ...(query.flagKey ? { flagKey: query.flagKey } : {}),
        ...(query.actor ? { actor: query.actor } : {}),
        ...(query.search ? { search: query.search } : {}),
        ...(query.page ? { page: String(query.page) } : {}),
        ...(query.pageSize ? { pageSize: String(query.pageSize) } : {}),
      },
      signal,
    }),

  listVersions: (flagKey: string | null, environment: Environment, signal?: AbortSignal) =>
    apiClient.request<VersionsResult>({
      method: "GET",
      path: `${BASE}/versions`,
      query: {
        ...(flagKey ? { flagKey } : {}),
        environment,
      },
      signal,
    }),

  compareVersions: (fromId: string, toId: string, signal?: AbortSignal) =>
    apiClient.request<VersionComparison>({
      method: "GET",
      path: `${BASE}/versions/compare`,
      query: { fromId, toId },
      signal,
    }),

  resetDemoData: () =>
    apiClient.request<void>({
      method: "POST",
      path: `${BASE}/reset`,
    }),
};
