import type { Plan, PlanTier, QuotaMetric } from "@/types/domain/plan";
import type { BillingCycle } from "@/types/domain/subscription";
import type { CompanySubscriptionStatus, UsageResource } from "@/features/companies/data/types";

export type PlanPublicationStatus = "draft" | "published" | "hidden" | "retired";
export type PlanVersionStatus = "draft" | "published" | "superseded";
export type OverrideRule = "absolute" | "additive";
export type ScheduledChangeKind = "upgrade" | "downgrade" | "billing_cycle" | "cancellation" | "override_expiry";
export type AttentionSeverity = "critical" | "warning" | "info";

export interface PlanFeature {
  key: string;
  label: string;
  category: string;
  enabled: boolean;
}

export interface PlanLimit {
  key: QuotaMetric;
  label: string;
  value: number | null;
  unit: string;
  resetPeriod: "billing_cycle" | "monthly" | "none";
}

export interface PlanPrice {
  currency: string;
  monthlyMinor: number;
  annualMinor: number;
  setupFeeMinor: number;
  trialDays: number;
}

export interface PlanVersion {
  id: string;
  planId: string;
  version: number;
  status: PlanVersionStatus;
  publishedAt: string | null;
  prices: PlanPrice;
  features: PlanFeature[];
  limits: PlanLimit[];
  note: string;
}

export interface PlatformPlan extends Plan {
  internalCode: string;
  publicationStatus: PlanPublicationStatus;
  targetSegment: string;
  internalNotes: string;
  availability: {
    visibleToNewCustomers: boolean;
    regions: string[];
    signupModes: Array<"self_serve" | "sales_assisted" | "migration_only">;
  };
  versions: PlanVersion[];
}

export interface SubscriptionRow {
  id: string;
  companyId: string;
  companyName: string;
  planTier: PlanTier;
  planName: string;
  planVersionId: string;
  billingCycle: BillingCycle;
  status: CompanySubscriptionStatus;
  currency: string;
  recurringMinor: number;
  mrrMinor: number;
  renewsAt: string;
  trialEndsAt: string | null;
  scheduledCancellationAt: string | null;
  scheduledChange: { planTier: PlanTier; billingCycle: BillingCycle; effectiveAt: string } | null;
  paymentMethodLabel: string;
  usageRisk: "ok" | "near_limit" | "over_limit";
}

export interface EntitlementCatalogueItem {
  key: UsageResource | string;
  displayName: string;
  description: string;
  category: "Organization" | "Marketing" | "AI & Automation" | "Website & SEO" | "Team & Governance" | "Platform/API";
  valueType: "integer" | "boolean" | "metered" | "text";
  unit: string;
  resetPeriod: "billing_cycle" | "monthly" | "none";
  supportedLimits: QuotaMetric[];
  dependencies: string[];
}

export interface CompanyEntitlementOverride {
  id: string;
  companyId: string;
  resource: UsageResource;
  rule: OverrideRule;
  value: number;
  reason: string;
  startsAt: string;
  expiresAt: string;
  approvedBy: string;
}

export interface EffectiveCompanyEntitlement {
  resource: UsageResource;
  baseLimit: number | null;
  effectiveLimit: number | null;
  override: CompanyEntitlementOverride | null;
  ruleApplied: "base" | "absolute replacement" | "additive increase" | "inactive subscription";
}

export interface SubscriptionAttentionItem {
  id: string;
  severity: AttentionSeverity;
  companyId: string;
  companyName: string;
  issue: string;
  dueAt: string;
  action: "open_subscription" | "open_company" | "review_usage" | "review_billing";
}

export interface SubscriptionScheduledChange {
  id: string;
  companyId: string;
  companyName: string;
  kind: ScheduledChangeKind;
  label: string;
  effectiveAt: string;
  status: "scheduled" | "failed" | "ready";
}

export interface SubscriptionLifecycleEvent {
  id: string;
  companyId: string;
  companyName: string;
  action: string;
  actor: string;
  at: string;
  result: "success" | "failure" | "denied";
}

export interface SubscriptionPolicy {
  defaultTrialDays: number;
  trialExtensionLimitDays: number;
  trialReminderDays: number[];
  defaultTrialPlan: PlanTier;
  allowTrialWithoutPaymentMethod: boolean;
  defaultBillingCycle: BillingCycle;
  renewalReminderDays: number[];
  gracePeriodDays: number;
  failedPaymentHandling: "keep_access_with_warning" | "pause_after_grace" | "manual_review";
  defaultCancellationTiming: "end_of_term" | "immediate";
  reactivationWindowDays: number;
  overLimitHandling: Record<UsageResource, "block_new_creation" | "allow_existing_resources" | "require_upgrade" | "temporary_grace_period">;
}

export interface SubscriptionCapability {
  canViewPlans: boolean;
  canCreatePlan: boolean;
  canEditDraftPlan: boolean;
  canPublishPlan: boolean;
  canRetirePlan: boolean;
  canViewSubscriptions: boolean;
  canChangeCompanyPlan: boolean;
  canManageTrials: boolean;
  canScheduleCancellation: boolean;
  canReactivateSubscription: boolean;
  canManageEntitlementOverrides: boolean;
  canViewSubscriptionActivity: boolean;
  canManageSubscriptionPolicies: boolean;
  canExportSubscriptions: boolean;
}
