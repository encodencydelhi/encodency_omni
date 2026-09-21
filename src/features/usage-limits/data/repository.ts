/**
 * The one seam between the Usage & Limits UI and wherever its data lives.
 *
 *   Today:  UI -> hooks -> usageRepository -> shared mock provider (company bundles + plan store)
 *   Later:  UI -> hooks -> usageRepository -> backend usage & metering service
 *
 * Components never import a provider. When mock mode is off the repository
 * resolves to a provider that refuses to invent usage.
 */
import { USAGE_MOCK_MODE } from "./config";
import { mockUsageProvider } from "./mock-provider";
import { unavailableUsageProvider } from "./unavailable-provider";
import type {
  AlertQuery,
  AttentionItem,
  ClientContribution,
  CompanyUsageQuery,
  CompanyUsageResult,
  CompanyUsageSummary,
  EventQuery,
  EventResult,
  MeteringHealth,
  MutationActor,
  OverrideQuery,
  OverrideRow,
  OverviewData,
  Period,
  ResourceDefinition,
  ResourceKey,
  ThresholdPolicy,
  TrendPoint,
  UsageActivity,
  UsageAlert,
  UsageEvent,
  UsageOverageRow,
  UsageRow,
} from "./types";

export interface OverviewResult extends OverviewData {
  attention: AttentionItem[];
}

export interface AlertsResult {
  alerts: UsageAlert[];
  all: UsageAlert[];
  counts: { open: number; warning: number; critical: number; atLimit: number; exceeded: number; expiring: number; metering: number };
  overages: UsageOverageRow[];
  facets: { companies: Array<{ id: string; name: string; subscriptionId: string }> };
}

export interface AlertDetail {
  alert: UsageAlert;
  events: UsageEvent[];
  override: OverrideRow | null;
  activity: UsageActivity[];
}

export interface OverridesResult {
  rows: OverrideRow[];
  counts: { active: number; scheduled: number; expiringSoon: number; expired: number; revoked: number; companies: number; needsReview: number };
  facets: { companies: Array<{ id: string; name: string; subscriptionId: string }>; approvers: string[] };
}

export interface CompanyUsageDetail {
  summary: CompanyUsageSummary;
  contributions: ClientContribution[];
  overrides: OverrideRow[];
  companyName: string;
}

export interface ResourceListItem {
  definition: ResourceDefinition;
  thresholds: ThresholdPolicy;
  edited: boolean;
  companies: { within: number; near: number; atLimit: number; exceeded: number; unknown: number };
}

export interface ResourceDetail extends ResourceListItem {
  planEntitlements: Array<{ plan: string; limit: number | null }>;
  activity: UsageActivity[];
}

export interface MeteringResult {
  health: MeteringHealth;
  activity: UsageActivity[];
}

export interface TrendResult {
  points: TrendPoint[] | null;
  /** Why there is no series, when there is not. */
  unavailable: string | null;
  total: number;
  peak: number;
  previousTotal: number | null;
}

export interface UsageRepository {
  readonly mode: "mock" | "unavailable";
  getOverview(period: Period): Promise<OverviewResult>;
  getTrend(resource: ResourceKey, period: Period, scope?: { companyId?: string; clientId?: string }): Promise<TrendResult>;
  getTopConsumers(resource: ResourceKey, sort: "consumption" | "utilization"): Promise<UsageRow[]>;
  listCompanyUsage(query: CompanyUsageQuery): Promise<CompanyUsageResult>;
  getCompanyUsage(companyId: string): Promise<CompanyUsageDetail>;
  listResources(): Promise<ResourceListItem[]>;
  getResource(key: string): Promise<ResourceDetail>;
  updateResourcePolicy(key: ResourceKey, thresholds: ThresholdPolicy, reason: string, actor: MutationActor): Promise<ResourceDetail>;
  listAlerts(query: AlertQuery): Promise<AlertsResult>;
  getAlert(id: string): Promise<AlertDetail>;
  acknowledgeAlert(id: string, note: string, actor: MutationActor): Promise<UsageAlert>;
  listOverrides(query: OverrideQuery): Promise<OverridesResult>;
  getOverride(id: string): Promise<OverrideRow>;
  getMetering(): Promise<MeteringResult>;
  listEvents(query: EventQuery): Promise<EventResult>;
  getEvent(id: string): Promise<UsageEvent>;
  resetDemoData?(): Promise<void>;
}

export const usageRepository: UsageRepository = USAGE_MOCK_MODE ? mockUsageProvider : unavailableUsageProvider;
