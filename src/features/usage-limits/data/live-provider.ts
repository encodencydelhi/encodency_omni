import { apiClient } from "@/lib/api/client";
import type { QueryParams } from "@/lib/api/transport";
import type {
  AlertDetail,
  AlertsResult,
  CompanyUsageDetail,
  MeteringResult,
  OverridesResult,
  OverviewResult,
  ResourceDetail,
  ResourceListItem,
  TrendResult,
  UsageRepository,
} from "./repository";
import type {
  AlertQuery,
  CompanyUsageQuery,
  EventQuery,
  MutationActor,
  OverrideQuery,
  OverrideRow,
  Period,
  ResourceKey,
  ThresholdPolicy,
  UsageAlert,
  UsageEvent,
  UsageRow,
  CompanyUsageResult,
  EventResult,
} from "./types";

/** The backend caps `limit` at 100 per request; larger asks are paged through. */
const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 20;
/** Guards the export buttons (pageSize 5000) from unbounded request loops. */
const MAX_PAGES_PER_CALL = 100;

type BackendPage<T, Meta = Record<string, never>> = {
  items: T[];
  total: number;
  page: number;
  limit: number;
} & Meta;

type CompaniesMeta = Pick<CompanyUsageResult, "counts" | "facets">;
type EventsMeta = Pick<EventResult, "facets">;

/**
 * The backend speaks `{ items, total, page, limit }` with a hard 100-row cap.
 * The feature contract is `{ rows, total, page, pageSize }`, so requests with
 * a larger pageSize are read through in `MAX_LIMIT` chunks and re-joined here.
 */
async function requestUsagePage<T, Meta = Record<string, never>>(
  path: string,
  query: QueryParams,
  page: number,
  pageSize: number,
): Promise<{ rows: T[]; total: number; first: BackendPage<T, Meta> }> {
  const limit = Math.min(pageSize, MAX_LIMIT);
  const first = await apiClient.request<BackendPage<T, Meta>>({
    method: "GET",
    path,
    query: { ...query, page, limit },
  });
  const rows = [...first.items];
  let cursor = page + 1;
  while (
    rows.length < pageSize &&
    rows.length < first.total &&
    cursor - page < MAX_PAGES_PER_CALL
  ) {
    const next = await apiClient.request<BackendPage<T, Meta>>({
      method: "GET",
      path,
      query: { ...query, page: cursor, limit },
    });
    if (!next.items.length) break;
    rows.push(...next.items);
    cursor += 1;
  }
  return { rows: rows.slice(0, pageSize), total: first.total, first };
}

/**
 * 100% Live Backend Provider for Super Admin Usage & Limits.
 * Connects directly to OmniPlatform backend NestJS endpoints.
 * Never invents synthetic data or silently falls back to mock snapshots.
 */
export const liveUsageProvider: UsageRepository = {
  mode: "live",

  async getOverview(period: Period): Promise<OverviewResult> {
    return apiClient.request<OverviewResult>({
      method: "GET",
      path: "/super-admin/usage/overview",
      query: { period },
    });
  },

  async getTrend(
    resource: ResourceKey,
    period: Period,
    scope?: { companyId?: string; clientId?: string },
  ): Promise<TrendResult> {
    return apiClient.request<TrendResult>({
      method: "GET",
      path: "/super-admin/usage/trend",
      query: {
        resource,
        period,
        companyId: scope?.companyId,
        clientId: scope?.clientId,
      },
    });
  },

  async getTopConsumers(
    resource: ResourceKey,
    sort: "consumption" | "utilization",
  ): Promise<UsageRow[]> {
    return apiClient.request<UsageRow[]>({
      method: "GET",
      path: "/super-admin/usage/top-consumers",
      query: { resource, sort },
    });
  },

  async listCompanyUsage(query: CompanyUsageQuery): Promise<CompanyUsageResult> {
    const { page = 1, pageSize = DEFAULT_LIMIT, ...filters } = query;
    const { rows, total, first } = await requestUsagePage<UsageRow, CompaniesMeta>(
      "/super-admin/usage/companies",
      filters as QueryParams,
      page,
      pageSize,
    );
    return {
      rows,
      total,
      page,
      pageSize,
      counts: first.counts,
      facets: first.facets,
    };
  },

  async getCompanyUsage(companyId: string): Promise<CompanyUsageDetail> {
    return apiClient.request<CompanyUsageDetail>({
      method: "GET",
      path: `/super-admin/usage/companies/${companyId}`,
    });
  },

  async listResources(): Promise<ResourceListItem[]> {
    return apiClient.request<ResourceListItem[]>({
      method: "GET",
      path: "/super-admin/usage/resources",
    });
  },

  async getResource(key: string): Promise<ResourceDetail> {
    return apiClient.request<ResourceDetail>({
      method: "GET",
      path: `/super-admin/usage/resources/${key}`,
    });
  },

  async updateResourcePolicy(
    key: ResourceKey,
    thresholds: ThresholdPolicy,
    reason: string,
    actor: MutationActor,
  ): Promise<ResourceDetail> {
    return apiClient.request<ResourceDetail>({
      method: "PATCH",
      path: `/super-admin/usage/resources/${key}/policy`,
      body: { thresholds, reason, actor },
    });
  },

  async listAlerts(query: AlertQuery): Promise<AlertsResult> {
    return apiClient.request<AlertsResult>({
      method: "GET",
      path: "/super-admin/usage/alerts",
      query: query as QueryParams,
    });
  },

  async getAlert(id: string): Promise<AlertDetail> {
    return apiClient.request<AlertDetail>({
      method: "GET",
      path: `/super-admin/usage/alerts/${id}`,
    });
  },

  async acknowledgeAlert(
    id: string,
    note: string,
    actor: MutationActor,
  ): Promise<UsageAlert> {
    return apiClient.request<UsageAlert>({
      method: "POST",
      path: `/super-admin/usage/alerts/${id}/acknowledge`,
      body: { note, actor },
    });
  },

  async listOverrides(query: OverrideQuery): Promise<OverridesResult> {
    return apiClient.request<OverridesResult>({
      method: "GET",
      path: "/super-admin/usage/overrides",
      query: query as QueryParams,
    });
  },

  async getOverride(id: string): Promise<OverrideRow> {
    return apiClient.request<OverrideRow>({
      method: "GET",
      path: `/super-admin/usage/overrides/${id}`,
    });
  },

  async getMetering(): Promise<MeteringResult> {
    return apiClient.request<MeteringResult>({
      method: "GET",
      path: "/super-admin/usage/metering",
    });
  },

  async listEvents(query: EventQuery): Promise<EventResult> {
    const { page = 1, pageSize = DEFAULT_LIMIT, ...filters } = query;
    const { rows, total, first } = await requestUsagePage<UsageEvent, EventsMeta>(
      "/super-admin/usage/events",
      filters as QueryParams,
      page,
      pageSize,
    );
    return {
      rows,
      total,
      page,
      pageSize,
      facets: first.facets,
    };
  },

  async getEvent(id: string): Promise<UsageEvent> {
    return apiClient.request<UsageEvent>({
      method: "GET",
      path: `/super-admin/usage/events/${id}`,
    });
  },

  async resetDemoData(): Promise<void> {
    // In live mode, demo reset is a no-op as live production data is respected.
    return Promise.resolve();
  },
};
