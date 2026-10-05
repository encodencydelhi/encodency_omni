import { apiClient } from "@/lib/api/client";
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
    return apiClient.request<CompanyUsageResult>({
      method: "GET",
      path: "/super-admin/usage/companies",
      query: query as any,
    });
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
      query: query as any,
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
      query: query as any,
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
    return apiClient.request<EventResult>({
      method: "GET",
      path: "/super-admin/usage/events",
      query: query as any,
    });
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
