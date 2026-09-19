/**
 * Data contracts for Super Admin Plans & Subscriptions.
 *
 * Four different things live here and are never folded into one object:
 *
 *   PLAN            a reusable commercial product definition (identity, availability)
 *   PLAN VERSION    an immutable snapshot of price, features and limits once published
 *   SUBSCRIPTION    one company's relationship to a plan version (kept in the company bundle)
 *   OVERRIDE        a company-specific change to one effective limit
 *
 * Usage is measured elsewhere; here it is only read to show how a company stands
 * against what it is entitled to.
 */
import type { PaginationMeta } from "@/types/api";
import type { PlanKey, QuotaMetric } from "@/types/domain/plan";
import type { BillingCycle } from "@/types/domain/subscription";
import type {
  CompanyAccountStatus,
  CompanyBillingStatus,
  CompanyUsageOverride,
  CompanySubscriptionStatus,
  UsageResource,
} from "@/features/companies/data/types";

/* ------------------------------------------------------------------ */
/* Plans                                                               */
/* ------------------------------------------------------------------ */

/** Publication state of a plan. Never mixed with the state of a subscription. */
export type PlanStatus = "draft" | "published" | "hidden" | "retired";
export type VersionStatus = "draft" | "published" | "superseded";

/**
 * Explicit limit semantics: none, zero, unlimited and "contract specific" are
 * four different commercial statements and are never encoded as null or 0.
 */
export type LimitKind = "none" | "fixed" | "unlimited" | "custom";

export interface LimitRule {
  kind: LimitKind;
  /** Present for `fixed` and `custom`. */
  value: number | null;
}

export type ResourceKey = QuotaMetric;
export type FeatureKey = string;

export interface PlanPrice {
  currency: string;
  monthlyMinor: number;
  annualMinor: number;
  setupFeeMinor: number;
  trialDays: number;
  notes: string;
}

export type RolloutPolicy = "new_only" | "at_renewal" | "migrate_selected";

export interface PlanVersion {
  id: string;
  planId: string;
  version: number;
  status: VersionStatus;
  price: PlanPrice;
  features: Record<FeatureKey, boolean>;
  limits: Record<ResourceKey, LimitRule>;
  createdAt: string;
  createdBy: string;
  publishedAt: string | null;
  publishedBy: string | null;
  rollout: RolloutPolicy | null;
  /** Human-readable summary of what changed against the previous version. */
  changeSummary: string[];
  /** Original marketing bullets of a seeded plan; used until the first edit. */
  legacyFeatureLabels?: string[];
}

export interface PlanAvailability {
  newPurchase: boolean;
  upgrade: boolean;
  downgrade: boolean;
  visibility: "public" | "invite_only";
  currencies: string[];
}

export interface PlatformPlan {
  id: string;
  /** The plan key stored on subscriptions. */
  key: PlanKey;
  name: string;
  internalCode: string;
  description: string;
  targetSegment: string;
  internalNotes: string;
  status: PlanStatus;
  availability: PlanAvailability;
  versions: PlanVersion[];
  createdAt: string;
  updatedAt: string;
  updatedBy: string;
}

export interface PlanActivity {
  id: string;
  at: string;
  actor: string;
  action: string;
  summary: string;
  planId: string | null;
  result: "success" | "failure";
  previousValue: string | null;
  newValue: string | null;
}

/* ------------------------------------------------------------------ */
/* Entitlement catalogue                                               */
/* ------------------------------------------------------------------ */

export type EntitlementCategory =
  | "Organization"
  | "Marketing"
  | "AI & Automation"
  | "Website & SEO"
  | "Team & Governance"
  | "Platform/API";

export type ResetPeriod = "none" | "monthly" | "billing_cycle";
export type ResourceKind = "capacity" | "metered";

export interface FeatureDef {
  key: FeatureKey;
  name: string;
  description: string;
  category: EntitlementCategory;
  dependencies: FeatureKey[];
}

export interface ResourceDef {
  key: ResourceKey;
  name: string;
  description: string;
  category: EntitlementCategory;
  kind: ResourceKind;
  unit: string;
  resetPeriod: ResetPeriod;
  /** The company-usage resource this limit is measured against, when there is one. */
  usageResource: UsageResource | null;
  supportedKinds: LimitKind[];
}

/* ------------------------------------------------------------------ */
/* Derived views                                                       */
/* ------------------------------------------------------------------ */

export interface PlanIssue {
  severity: "error" | "warning";
  field: string;
  message: string;
}

export interface PlanSubscriberCounts {
  paid: number;
  trial: number;
  total: number;
  onOlderVersion: number;
  mrrByCurrency: Record<string, number>;
}

export interface PlanSummary {
  plan: PlatformPlan;
  current: PlanVersion | null;
  draft: PlanVersion | null;
  subscribers: PlanSubscriberCounts;
  issues: PlanIssue[];
  needsReview: boolean;
}

export interface CompanyRefLite {
  id: string;
  name: string;
  displayId: string;
  accountStatus: CompanyAccountStatus;
}

export type UsageRisk = "ok" | "near_limit" | "over_limit";

export interface SubscriptionRow {
  id: string;
  company: CompanyRefLite;
  planKey: PlanKey;
  planName: string;
  planVersion: number;
  currentVersion: number | null;
  isLegacyVersion: boolean;
  planMissing: boolean;
  billingCycle: BillingCycle;
  status: CompanySubscriptionStatus;
  currency: string;
  recurringMinor: number;
  mrrMinor: number;
  startedAt: string;
  renewsAt: string;
  trialEndsAt: string | null;
  scheduledCancellationAt: string | null;
  /** When an ended subscription ended; null while it is running. */
  endedAt: string | null;
  billingStatus: CompanyBillingStatus;
  usageRisk: UsageRisk;
  activeOverrides: number;
  pendingChanges: number;
  hasOpenInvoice: boolean;
}

export type ScheduledChangeKind = "upgrade" | "downgrade" | "billing_cycle" | "cancellation" | "override_expiry" | "version_migration";
export type ScheduledChangeStatus = "scheduled" | "overdue" | "ready";

export interface ScheduledChangeView {
  id: string;
  kind: ScheduledChangeKind;
  subscriptionId: string;
  company: CompanyRefLite;
  label: string;
  current: string;
  scheduled: string;
  effectiveAt: string;
  status: ScheduledChangeStatus;
  createdBy: string;
  createdAt: string | null;
  /** What can be done to it from the UI. */
  canReschedule: boolean;
  canCancel: boolean;
}

export interface TrialRow {
  /** The full subscription row, so trial actions can run straight from the queue. */
  row: SubscriptionRow;
  subscriptionId: string;
  company: CompanyRefLite;
  planKey: PlanKey;
  planName: string;
  startedAt: string;
  endsAt: string;
  daysRemaining: number;
  state: "active" | "ending_soon" | "expired" | "converted";
  usageRisk: UsageRisk;
  onboarding: string;
  extendedDays: number;
  hasPaymentMethod: boolean;
  billingCycle: BillingCycle;
}

export type EffectiveRule = "base" | "absolute replacement" | "additive increase" | "inactive subscription";

export interface EffectiveLimit {
  baseValue: number | null;
  baseRule: LimitRule;
  effectiveValue: number | null;
  override: CompanyUsageOverride | null;
  ruleApplied: EffectiveRule;
  /** What the limit becomes when the override expires. */
  afterExpiryValue: number | null;
}

export type EntitlementStatus = "within" | "high" | "near_limit" | "exceeded" | "not_metered" | "enabled" | "disabled" | "unavailable";

export interface EntitlementRow {
  key: string;
  kind: "resource" | "feature";
  name: string;
  category: EntitlementCategory;
  unit: string;
  resetPeriod: ResetPeriod;
  base: LimitRule | null;
  baseEnabled: boolean | null;
  override: CompanyUsageOverride | null;
  effective: EffectiveLimit | null;
  effectiveEnabled: boolean | null;
  used: number | null;
  status: EntitlementStatus;
  usageResource: UsageResource | null;
  dependencies: string[];
}

export interface SubscriptionEvent {
  id: string;
  /** Present for company events; plan-level events carry only `planId`. */
  company: { id: string; name: string } | null;
  subscriptionId: string | null;
  planId: string | null;
  at: string;
  action: string;
  summary: string;
  actor: string;
  previousValue: string | null;
  newValue: string | null;
  reason: string | null;
  result: "success" | "failure" | "denied";
  module: string;
}

export interface SubscriptionDetail {
  row: SubscriptionRow;
  company: CompanyRefLite & { ownerName: string };
  plan: PlatformPlan | null;
  version: PlanVersion | null;
  entitlements: EntitlementRow[];
  overrides: CompanyUsageOverride[];
  scheduled: ScheduledChangeView[];
  history: SubscriptionEvent[];
  usageSummary: { exceeded: number; nearLimit: number; highest: { resource: UsageResource; utilization: number } | null };
  extendedDays: number;
  paymentMethodLabel: string | null;
  openInvoiceNumber: string | null;
  policy: SubscriptionPolicy;
}

export type AttentionKind =
  | "trial_ending"
  | "past_due"
  | "scheduled_cancellation"
  | "override_expired"
  | "usage_over_limit"
  | "missing_plan"
  | "failed_change";

export interface SubscriptionAttentionItem {
  id: string;
  kind: AttentionKind;
  severity: "critical" | "warning" | "info";
  subscriptionId: string;
  company: CompanyRefLite;
  issue: string;
  at: string;
  actions: Array<"subscription" | "company" | "usage" | "billing">;
}

export type TrendMetric = "active_paid" | "active_trials" | "new_subscriptions" | "cancellations";
export type TrendPeriod = "30d" | "3m" | "6m" | "1y";

export interface TrendPoint {
  label: string;
  at: string;
  value: number;
}

export interface PlanAdoptionRow {
  planId: string;
  planKey: PlanKey;
  name: string;
  status: PlanStatus;
  paid: number;
  trial: number;
  share: number;
  mrrByCurrency: Record<string, number>;
}

export interface SubscriptionPortfolio {
  totalCurrent: number;
  activePaid: number;
  trials: number;
  pastDue: number;
  paused: number;
  scheduledCancellation: number;
  endedRecently: number;
  ended: number;
  trialsEndingSoon: number;
  renewalsSoon: number;
  needsAttention: number;
  mrrByCurrency: Record<string, number>;
  primaryCurrency: string;
  newLast30d: number;
  cancelledLast30d: number;
}

export interface PlansPortfolio {
  published: number;
  draft: number;
  hidden: number;
  retired: number;
  activeSubscribers: number;
  requiringReview: number;
}

export interface OverviewData {
  portfolio: SubscriptionPortfolio;
  plans: PlansPortfolio;
  adoption: PlanAdoptionRow[];
  attention: SubscriptionAttentionItem[];
  upcoming: ScheduledChangeView[];
  activity: SubscriptionEvent[];
  endingTrials: TrialRow[];
}

/* ------------------------------------------------------------------ */
/* Queries                                                             */
/* ------------------------------------------------------------------ */

export interface SubscriptionListQuery {
  search?: string;
  company?: string;
  plan?: string;
  status?: string;
  cycle?: string;
  billing?: string;
  trialEnding?: string;
  renewal?: string;
  created?: string;
  version?: string;
  sort?: { field: string; direction: "asc" | "desc" } | null;
  page?: number;
  pageSize?: number;
}

export interface SubscriptionListResult {
  data: SubscriptionRow[];
  pagination: PaginationMeta;
  kpis: {
    activePaid: number;
    trialing: number;
    pastDue: number;
    scheduledCancellation: number;
    ended: number;
    renewalsSoon: number;
  };
}

export interface PlanListQuery {
  search?: string;
  status?: string;
  visibility?: string;
  showRetired?: boolean;
}

/* ------------------------------------------------------------------ */
/* Policy                                                              */
/* ------------------------------------------------------------------ */

export type OverLimitPolicy = "block_new_creation" | "allow_existing_resources" | "require_upgrade" | "temporary_grace_period";
export type OverLimitResource = "users" | "clients" | "connectedAccounts" | "aiCredits" | "automationRuns";
export type FailedPaymentHandling = "keep_access_with_warning" | "pause_after_grace" | "manual_review";

export interface SubscriptionPolicy {
  trial: {
    defaultTrialDays: number;
    extensionLimitDays: number;
    reminderDays: number[];
    defaultTrialPlan: PlanKey;
    allowWithoutPaymentMethod: boolean;
  };
  renewal: {
    defaultBillingCycle: BillingCycle;
    reminderDays: number[];
    gracePeriodDays: number;
    failedPaymentHandling: FailedPaymentHandling;
  };
  cancellation: {
    defaultTiming: "end_of_term" | "immediate";
    reactivationWindowDays: number;
  };
  overLimit: Record<OverLimitResource, OverLimitPolicy>;
}

/* ------------------------------------------------------------------ */
/* Mutation inputs                                                     */
/* ------------------------------------------------------------------ */

export interface MutationActor {
  id: string;
  name: string;
}

export interface PlanDraftInput {
  name: string;
  internalCode: string;
  description: string;
  targetSegment: string;
  internalNotes: string;
  price: PlanPrice;
  features: Record<FeatureKey, boolean>;
  limits: Record<ResourceKey, LimitRule>;
  availability: PlanAvailability;
}

export interface CreatePlanInput extends PlanDraftInput {
  /** `draft` saves without publishing; `published` publishes version 1. */
  intent: "draft" | "published";
}

export interface PublishInput {
  rollout: RolloutPolicy;
  /** For `migrate_selected`: the companies whose subscriptions move to the new version. */
  migrateCompanyIds: string[];
  note: string;
}

export interface VersionImpact {
  fromVersion: number | null;
  toVersion: number;
  priceDiff: { monthlyMinor: number; annualMinor: number; currency: string } | null;
  changedFeatures: Array<{ key: string; name: string; from: boolean; to: boolean }>;
  changedLimits: Array<{ key: string; name: string; unit: string; from: LimitRule; to: LimitRule }>;
  subscribers: number;
  exceedingNewLimits: Array<{ companyId: string; companyName: string; subscriptionId: string; resource: string; resourceName: string; used: number; newLimit: number | null }>;
  affectedCompanies: number;
  summary: string[];
}

export interface PlanChangeInput {
  planKey: PlanKey;
  billingCycle: BillingCycle;
  effective: "immediately" | "next_renewal" | "custom_date";
  effectiveAt?: string;
  reason: string;
  overLimitAcknowledged: boolean;
}

export interface PlanChangeImpact {
  current: { planName: string; version: number; monthlyEquivalentMinor: number; recurringMinor: number; currency: string; cycle: BillingCycle };
  next: { planName: string; version: number; monthlyEquivalentMinor: number; recurringMinor: number; currency: string; cycle: BillingCycle };
  currencyMismatch: boolean;
  rows: Array<{
    key: string;
    kind: "resource" | "feature";
    name: string;
    unit: string;
    current: string;
    next: string;
    changed: boolean;
    used: number | null;
    over: boolean;
  }>;
  overLimit: Array<{ key: string; name: string; used: number; nextLimit: number; unit: string }>;
  policyNote: string;
  ineligibleReason: string | null;
}

export interface OverrideInput {
  resource: ResourceKey;
  rule: "absolute" | "additive";
  value: number;
  startsAt: string;
  expiresAt: string;
  reason: string;
  approvedBy: string;
}

export interface TrialExtensionInput {
  days: number;
  reason: string;
}

export interface CancellationInput {
  timing: "end_of_term" | "immediate";
  reason: string;
}

export interface ConversionInput {
  planKey: PlanKey;
  billingCycle: BillingCycle;
}

export interface PlanChoice {
  summary: PlanSummary;
  isCurrent: boolean;
  eligible: boolean;
  reason: string | null;
}

export interface ReactivationInput {
  /** Required when the subscription's plan is no longer available. */
  planKey?: PlanKey;
  reason: string;
}
