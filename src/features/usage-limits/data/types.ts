/**
 * Domain contracts for Usage & Limits.
 *
 * This module monitors; it does not own plans, subscriptions or overrides. Those
 * records live in the Companies bundles and the Plans & Subscriptions store, and
 * everything here is derived from them. What this module adds is the resource
 * catalogue's operating policy, the utilisation state, alerts and their
 * acknowledgements, and the metering view.
 */
import type { CompanyUsageOverride, UsageResource } from "@/features/companies/data/types";

export type ResourceKey = UsageResource;

export type ResourceCategory = "organization" | "marketing" | "ai_automation" | "website_seo" | "platform_api";

/** How a resource is measured. One aggregation rule does not fit them all. */
export type MeasurementType = "concurrent_capacity" | "metered_period" | "capacity_snapshot";

export type ResetPolicy = "none" | "billing_cycle" | "calendar_month";

export type ClientAttribution = "direct" | "event_level" | "none";

export interface ResourceDefinition {
  key: ResourceKey;
  name: string;
  category: ResourceCategory;
  description: string;
  unit: string;
  unitSingular: string;
  measurement: MeasurementType;
  resetPolicy: ResetPolicy;
  /** Defaults; the effective thresholds may be edited by staff with permission. */
  warningPct: number;
  criticalPct: number;
  overLimitBehavior: string;
  meteringSource: string;
  /** Hours after which a reading is considered stale. */
  freshnessHours: number;
  clientAttribution: ClientAttribution;
  relatedFeatures: string[];
  /** What counts, stated as policy. Pending means the product has not finalised it. */
  countingPolicy: string;
  policyStatus: "defined" | "pending";
  /** Whether the plan controls this resource at all. */
  planControlled: boolean;
}

export interface ThresholdPolicy {
  warningPct: number;
  criticalPct: number;
}

/* ------------------------------------------------------------------ */
/* Utilisation                                                         */
/* ------------------------------------------------------------------ */

export type UtilizationState = "within" | "near" | "at_limit" | "exceeded" | "unlimited" | "not_entitled" | "unknown" | "monitored";

export type LimitType = "fixed" | "unlimited" | "not_entitled" | "custom" | "none";

export interface ResolvedUtilization {
  state: UtilizationState;
  limitType: LimitType;
  used: number | null;
  limit: number | null;
  /** Null unless there is a numeric limit and a known reading. */
  percent: number | null;
  remaining: number | null;
  excess: number;
  stale: boolean;
}

export type MeteringStatus = "ok" | "delayed" | "missing";

/* ------------------------------------------------------------------ */
/* Company x resource rows                                             */
/* ------------------------------------------------------------------ */

export interface OverrideView {
  id: string;
  rule: "additive" | "absolute";
  /** The delta for additive overrides; the absolute value otherwise. */
  amount: number;
  value: number | null;
  startsAt: string;
  expiresAt: string;
  approvedBy: string;
  reason: string;
}

export interface UsageRow {
  key: string;
  companyId: string;
  companyName: string;
  companyDisplayId: string;
  subscriptionId: string;
  subscriptionStatus: string;
  planName: string;
  resource: ResourceKey;
  used: number | null;
  lastKnownUsed: number;
  previousUsed: number;
  base: number | null;
  override: OverrideView | null;
  effective: number | null;
  resolved: ResolvedUtilization;
  metering: MeteringStatus;
  updatedAt: string;
  resetAt: string | null;
  periodStart: string | null;
  periodEnd: string | null;
  /** Limit the resource falls back to when the active override ends. */
  afterExpiryLimit: number | null;
  hasActiveOverride: boolean;
}

export interface CompanyUsageSummary {
  companyId: string;
  companyName: string;
  companyDisplayId: string;
  subscriptionId: string;
  subscriptionStatus: string;
  planName: string;
  billingCycle: string;
  rows: UsageRow[];
  states: Record<UtilizationState, number>;
  /** The company's attention state, derived from resource states: never averaged. */
  attention: "exceeded" | "at_limit" | "near" | "unknown" | "within";
  highest: UsageRow | null;
  activeOverrides: number;
  updatedAt: string;
}

/* ------------------------------------------------------------------ */
/* Alerts                                                              */
/* ------------------------------------------------------------------ */

export type AlertType = "threshold" | "at_limit" | "exceeded" | "override_expiring" | "metering";
export type AlertSeverity = "warning" | "critical";
export type AlertStatus = "open" | "acknowledged" | "resolved";

export interface UsageAlert {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  status: AlertStatus;
  companyId: string;
  companyName: string;
  subscriptionId: string | null;
  resource: ResourceKey;
  used: number | null;
  limit: number | null;
  percent: number | null;
  threshold: number | null;
  firstTriggeredAt: string;
  lastObservedAt: string;
  /** Why the alert exists, in plain words. */
  reason: string;
  overrideId: string | null;
  acknowledgedBy: string | null;
  acknowledgedAt: string | null;
  acknowledgementNote: string | null;
  resolvedAt: string | null;
  resolvedReason: string | null;
}

export interface Acknowledgement {
  alertId: string;
  by: string;
  at: string;
  note: string;
}

export interface UsageOverageRow {
  key: string;
  companyId: string;
  companyName: string;
  subscriptionId: string;
  resource: ResourceKey;
  included: number;
  used: number;
  excess: number;
  periodEnd: string | null;
}

/* ------------------------------------------------------------------ */
/* Metering                                                            */
/* ------------------------------------------------------------------ */

export type ProcessingStatus = "processed" | "delayed" | "failed" | "duplicate";

export interface UsageEvent {
  id: string;
  companyId: string;
  companyName: string;
  clientId: string | null;
  clientName: string | null;
  resource: ResourceKey;
  quantity: number;
  unit: string;
  source: string;
  occurredAt: string;
  receivedAt: string;
  status: ProcessingStatus;
  reference: string;
  idempotencyKey: string;
  aggregationPeriod: string;
  errorReason: string | null;
  /** Whether this event is counted in the company's usage total. */
  counted: boolean;
}

export type SourceStatus = "healthy" | "delayed" | "failed";

export interface MeteringSource {
  id: string;
  name: string;
  resources: ResourceKey[];
  status: SourceStatus;
  lastSuccessAt: string;
  expectedEveryMinutes: number;
  delayMinutes: number;
  failureReason: string | null;
  affectedCompanies: number;
  relatedJob: string | null;
}

export interface MeteringHealth {
  healthy: number;
  delayed: number;
  failed: number;
  missingWindows: number;
  duplicates: number;
  lastReconciliationAt: string;
  sources: MeteringSource[];
  gaps: Array<{ companyId: string; companyName: string; resource: ResourceKey; sinceAt: string }>;
}

export interface UsageActivity {
  id: string;
  at: string;
  kind: "threshold" | "override_granted" | "override_expired" | "override_revoked" | "quota_reset" | "reconciliation" | "anomaly" | "acknowledged" | "policy_changed" | "resolved";
  text: string;
  companyId: string | null;
  companyName: string | null;
  resource: ResourceKey | null;
  actor: string | null;
}

/* ------------------------------------------------------------------ */
/* Overrides                                                           */
/* ------------------------------------------------------------------ */

export type OverrideStatus = "scheduled" | "active" | "expired" | "revoked";

export interface OverrideRow {
  id: string;
  companyId: string;
  companyName: string;
  subscriptionId: string;
  resource: ResourceKey;
  rule: "additive" | "absolute";
  amount: number;
  base: number | null;
  effective: number | null;
  startsAt: string;
  expiresAt: string;
  revokedAt: string | null;
  status: OverrideStatus;
  approvedBy: string;
  reason: string;
  used: number | null;
  /** Days until an active override ends; null otherwise. */
  expiresInDays: number | null;
  /** True when the company would be over its limit once the override ends. */
  overAfterExpiry: boolean;
  raw: CompanyUsageOverride;
}

/* ------------------------------------------------------------------ */
/* Overview                                                            */
/* ------------------------------------------------------------------ */

export type Period = "7d" | "30d" | "90d";
export type FlowMetric = "aiCredits" | "automationRuns" | "apiRequests" | "scheduledPosts" | "reports";

export interface OverviewKpis {
  meteredCompanies: number;
  totalCompanies: number;
  nearLimitCompanies: number;
  exceededCompanies: number;
  aiCredits: number;
  automationRuns: number;
  apiRequests: number;
  activeOverrides: number;
  meteringIssues: number;
}

export interface ResourceHealthRow {
  resource: ResourceKey;
  within: number;
  near: number;
  atLimit: number;
  exceeded: number;
  unknown: number;
  unlimited: number;
  notEntitled: number;
}

export interface TrendPoint {
  at: string;
  label: string;
  value: number;
}

export interface OverviewData {
  kpis: OverviewKpis;
  distribution: Record<UtilizationState, number>;
  resourceHealth: ResourceHealthRow[];
  updatedAt: string;
}

export interface AttentionItem {
  id: string;
  severity: AlertSeverity;
  companyId: string;
  companyName: string;
  subscriptionId: string | null;
  resource: ResourceKey;
  reason: string;
  detectedAt: string;
  kind: AlertType;
  alertId: string;
}

/* ------------------------------------------------------------------ */
/* Queries                                                             */
/* ------------------------------------------------------------------ */

export interface CompanyUsageQuery {
  search?: string;
  company?: string;
  plan?: string;
  subscription?: string;
  resource?: string;
  state?: string;
  override?: string;
  quick?: string;
  sort?: string;
  /** Without a resource, return every resource row for the matching companies instead of one per company. */
  expand?: boolean;
  page?: number;
  pageSize?: number;
}

export interface CompanyUsageResult {
  rows: UsageRow[];
  total: number;
  page: number;
  pageSize: number;
  /** Company counts across the whole (filtered-by-search) set, deduplicated. */
  counts: { companies: number; within: number; near: number; atLimit: number; exceeded: number; noData: number; overrides: number };
  facets: { companies: Array<{ id: string; name: string; subscriptionId: string }>; plans: string[] };
}

export interface AlertQuery {
  search?: string;
  severity?: string;
  company?: string;
  resource?: string;
  type?: string;
  status?: string;
  quick?: string;
  sort?: string;
}

export interface OverrideQuery {
  search?: string;
  company?: string;
  resource?: string;
  rule?: string;
  status?: string;
  approvedBy?: string;
  sort?: string;
}

export interface EventQuery {
  search?: string;
  company?: string;
  client?: string;
  resource?: string;
  source?: string;
  status?: string;
  range?: string;
  page?: number;
  pageSize?: number;
}

export interface EventResult {
  rows: UsageEvent[];
  total: number;
  page: number;
  pageSize: number;
  facets: { companies: Array<{ id: string; name: string }>; clients: Array<{ id: string; name: string }>; sources: string[] };
}

export interface ClientContribution {
  clientId: string | null;
  clientName: string;
  values: Partial<Record<ResourceKey, number>>;
}

export interface MutationActor {
  id: string;
  name: string;
}
