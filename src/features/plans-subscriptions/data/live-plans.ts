/**
 * Plans & Subscriptions from the backend, and only from the backend. What the commercial service actually has is a plan (name, monthly price in paise, a client
 * cap, an AI-token cap, an automation flag, active or not) and a subscription (company, plan, status, period end). Everything the page models beyond that - plan
 * versions with rollouts, trials, scheduled changes, overrides, a policy - has no source, so it is empty or refused with a clear message, never sampled and never
 * "saved" locally. A failed call is an error, not a silent fall back to demo data.
 *
 * The one local thing is a plan DRAFT: a working copy of an edit, kept in memory for this browser session until it is published (lost on reload, like an
 * unsaved form). Publishing is a direct edit of the plan, which applies to every current subscriber at once.
 */
import { superAdminAuditLogsApi, type SuperAdminAuditLogItem } from "@/features/audit-logs/live/super-admin-audit-logs-api";
import { ApiError } from "@/types/api";
import type { PlanKey } from "@/types/domain/plan";
import type { BillingCycle } from "@/types/domain/subscription";
import type { CompanyAccountStatus, CompanySubscriptionStatus, UsageResource } from "@/features/companies/data/types";
import { superAdminPlansApi, type BackendPlan, type BackendSubscription } from "../live/super-admin-plans-api";
import { FEATURES, RESOURCES, ruleToLimit } from "./catalogue";
import {
  applySubscriptionQuery,
  computeAdoption,
  computeTrendFromRecords,
  computePlanSummaries,
  computePlansPortfolio,
  computeSubscriptionPortfolio,
  filterPlans,
  validatePlanConfig,
} from "./selectors";
import type {
  CancellationInput,
  CompanyRefLite,
  ConversionInput,
  CreatePlanInput,
  EntitlementRow,
  EntitlementStatus,
  LimitRule,
  MutationActor,
  OverviewData,
  OverrideInput,
  PlanActivity,
  PlanAvailability,
  PlanChangeImpact,
  PlanChangeInput,
  PlanChoice,
  PlanDraftInput,
  PlanIssue,
  PlanListQuery,
  PlanSummary,
  PlatformPlan,
  PlanVersion,
  PublishInput,
  ReactivationInput,
  ScheduledChangeView,
  SubscriptionAttentionItem,
  SubscriptionDetail,
  SubscriptionEvent,
  SubscriptionListQuery,
  SubscriptionListResult,
  SubscriptionPolicy,
  SubscriptionRow,
  TrendMetric,
  TrendPeriod,
  TrendPoint,
  TrialExtensionInput,
  TrialRow,
  UsageRisk,
  VersionImpact,
} from "./types";
import type { CompaniesLite, PlanDetailData, PlanListResult, PlansRepository, SubscriptionFacets, TrialQuery } from "./repository";

/* ------------------------------------------------------------------ */
/* Refusals                                                            */
/* ------------------------------------------------------------------ */

/** A thing the commercial service does not do. Shown as the message of the action that asked for it. */
export function notSupported(message: string): ApiError {
  return new ApiError({ code: "SERVICE_UNAVAILABLE", status: 501, message, reason: "not_supported_by_backend" });
}

const conflict = (message: string) => new ApiError({ code: "CONFLICT", status: 409, message });
const invalid = (message: string) => new ApiError({ code: "VALIDATION_FAILED", status: 400, message });
const missing = (what: string) => new ApiError({ code: "NOT_FOUND", status: 404, message: `${what} not found.` });

/* ------------------------------------------------------------------ */
/* Mapping: backend -> page models                                     */
/* ------------------------------------------------------------------ */

export const planKeyOf = (name: string): PlanKey => (name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "custom") as PlanKey;

const NOT_RECORDED = "Not recorded";

export interface LiveSubscription extends BackendSubscription {
  usage?: { currentClients: number; currentAiTokens: number };
  owner?: { name: string | null; email: string } | null;
  openInvoiceId?: string | null;
}

const fixed = (value: number): LimitRule => ({ kind: "fixed", value });
const UNLIMITED: LimitRule = { kind: "unlimited", value: null };

/** The features a plan switches on: everything except what the one real flag (automation) governs. */
function featuresOf(plan: Pick<BackendPlan, "features">): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  for (const feature of FEATURES) out[feature.key] = feature.key === "automation_engine" ? plan.features.automationEnabled === true : true;
  // A feature cannot be on while something it depends on is off.
  for (let pass = 0; pass < 3; pass++) for (const feature of FEATURES) if (feature.dependencies.some((dep) => out[dep] === false)) out[feature.key] = false;
  return out;
}

/** Only the client cap and the AI-token cap exist on the backend; any other resource is not capped. */
function limitsOf(plan: Pick<BackendPlan, "maxClients" | "maxAiTokens">): Record<string, LimitRule> {
  const out: Record<string, LimitRule> = {};
  for (const resource of RESOURCES) {
    out[resource.key] = resource.key === "Clients" ? fixed(plan.maxClients) : resource.key === "aiCredits" ? fixed(plan.maxAiTokens) : UNLIMITED;
  }
  return out;
}

export function versionOf(plan: BackendPlan): PlanVersion {
  return {
    id: `${plan.id}_v1`,
    planId: plan.id,
    version: 1,
    status: "published",
    // The backend stores prices in paise, which is exactly the page's minor unit. An annual price of 0 means annual billing is not offered.
    price: { currency: "INR", monthlyMinor: plan.monthlyPrice, annualMinor: plan.annualPrice ?? 0, setupFeeMinor: 0, trialDays: 0, notes: "" },
    features: featuresOf(plan),
    limits: limitsOf(plan),
    createdAt: plan.createdAt,
    createdBy: NOT_RECORDED,
    publishedAt: plan.createdAt,
    publishedBy: NOT_RECORDED,
    rollout: null,
    changeSummary: [],
  };
}

export interface SessionDraft {
  input: PlanDraftInput;
  savedAt: string;
  by: string;
}

export function draftVersionOf(plan: BackendPlan, draft: SessionDraft): PlanVersion {
  return {
    id: `${plan.id}_draft`,
    planId: plan.id,
    version: 2,
    status: "draft",
    price: draft.input.price,
    features: draft.input.features,
    limits: draft.input.limits,
    createdAt: draft.savedAt,
    createdBy: draft.by,
    publishedAt: null,
    publishedBy: null,
    rollout: null,
    changeSummary: [],
  };
}

export function toPlatformPlan(plan: BackendPlan, draft?: SessionDraft): PlatformPlan {
  const active = plan.isActive;
  return {
    id: plan.id,
    key: planKeyOf(plan.name),
    name: plan.name,
    internalCode: `PLAN_${planKeyOf(plan.name).toUpperCase()}`,
    description: draft?.input.description ?? "",
    targetSegment: draft?.input.targetSegment ?? "",
    internalNotes: draft?.input.internalNotes ?? "",
    // The backend has one flag, so an inactive plan is "hidden" (it can be shown again), never "retired".
    status: active ? "published" : "hidden",
    availability: { newPurchase: active, upgrade: active, downgrade: active, visibility: "public", currencies: ["INR"] },
    versions: [versionOf(plan), ...(draft ? [draftVersionOf(plan, draft)] : [])],
    createdAt: plan.createdAt,
    updatedAt: plan.updatedAt,
    updatedBy: NOT_RECORDED,
  };
}

const ACCOUNT_STATUS: Record<string, CompanyAccountStatus> = { ACTIVE: "active", ARCHIVED: "archived" };

const SUBSCRIPTION_STATUS: Record<BackendSubscription["status"], CompanySubscriptionStatus> = {
  ACTIVE: "active",
  PAST_DUE: "past_due",
  // Never paid for the first time: the nearest status is "past due", with a payment waiting.
  INCOMPLETE: "past_due",
  SUSPENDED: "paused",
  CANCELED: "cancelled",
};

export function companyRefOf(sub: LiveSubscription): CompanyRefLite {
  return {
    id: sub.companyId,
    name: sub.company?.name ?? `Company ${sub.companyId.slice(0, 8)}`,
    displayId: `CMP-${sub.companyId.slice(0, 4).toUpperCase()}`,
    accountStatus: ACCOUNT_STATUS[(sub.company as { status?: string } | undefined)?.status ?? "ACTIVE"] ?? "active",
  };
}

export function usageRiskOf(sub: LiveSubscription): UsageRisk {
  if (!sub.usage || !sub.plan) return "ok";
  const ratios = [sub.plan.maxClients > 0 ? sub.usage.currentClients / sub.plan.maxClients : 0, sub.plan.maxAiTokens > 0 ? sub.usage.currentAiTokens / sub.plan.maxAiTokens : 0];
  const top = Math.max(...ratios);
  return top > 1 ? "over_limit" : top >= 0.9 ? "near_limit" : "ok";
}

export function toRow(sub: LiveSubscription): SubscriptionRow {
  const status = SUBSCRIPTION_STATUS[sub.status];
  const annual = sub.billingCycle === "ANNUAL";
  // What one paid period costs, and what that is per month (the monthly recurring revenue).
  const price = annual ? sub.plan?.annualPrice ?? 0 : sub.plan?.monthlyPrice ?? 0;
  const perMonth = annual ? Math.round(price / 12) : price;
  const ended = sub.status === "CANCELED";
  return {
    id: sub.id,
    company: companyRefOf(sub),
    planKey: planKeyOf(sub.plan?.name ?? ""),
    planName: sub.plan?.name ?? "Unknown plan",
    planVersion: 1,
    currentVersion: 1,
    isLegacyVersion: false,
    planMissing: !sub.plan,
    billingCycle: (annual ? "annual" : "monthly") as BillingCycle,
    status,
    currency: "INR",
    recurringMinor: price,
    // Only a subscription that is running brings in recurring revenue.
    mrrMinor: sub.status === "ACTIVE" ? perMonth : 0,
    startedAt: sub.createdAt,
    renewsAt: sub.currentPeriodEnd,
    trialEndsAt: null,
    scheduledCancellationAt: null,
    endedAt: ended ? sub.updatedAt : null,
    billingStatus: sub.status === "ACTIVE" ? "paid" : sub.status === "PAST_DUE" || sub.status === "INCOMPLETE" ? "payment_due" : "paid",
    usageRisk: usageRiskOf(sub),
    activeOverrides: 0,
    pendingChanges: 0,
    hasOpenInvoice: sub.openInvoiceId ? true : sub.status === "PAST_DUE" || sub.status === "INCOMPLETE",
  };
}

/**
 * What needs a person: a payment outstanding, usage over a cap, and a renewal date that has passed on a subscription still marked active (renewals are paid
 * through a new checkout, not charged automatically, so an unrenewed period is something to chase).
 */
export function attentionOf(rows: SubscriptionRow[], now: number = Date.now()): SubscriptionAttentionItem[] {
  const items: SubscriptionAttentionItem[] = [];
  for (const row of rows) {
    if (row.status === "active" && Date.parse(row.renewsAt) < now) {
      items.push({ id: `${row.id}-renewal-overdue`, kind: "past_due", severity: "warning", subscriptionId: row.id, company: row.company, issue: "The renewal date has passed and the period has not been renewed", at: row.renewsAt, actions: ["subscription", "billing"] });
    }
    if (row.status === "past_due") {
      items.push({ id: `${row.id}-past-due`, kind: "past_due", severity: "critical", subscriptionId: row.id, company: row.company, issue: row.hasOpenInvoice ? "Payment is outstanding" : "Payment is overdue", at: row.renewsAt, actions: ["subscription", "billing"] });
    }
    if (row.usageRisk === "over_limit") {
      items.push({ id: `${row.id}-over-limit`, kind: "usage_over_limit", severity: "warning", subscriptionId: row.id, company: row.company, issue: "Usage is over a plan limit", at: row.renewsAt, actions: ["subscription", "usage"] });
    }
  }
  return items;
}

/* ---- entitlements of one subscription ---- */

function statusOf(used: number, limit: number): EntitlementStatus {
  if (limit <= 0) return used > 0 ? "exceeded" : "within";
  const ratio = used / limit;
  return ratio > 1 ? "exceeded" : ratio >= 0.9 ? "near_limit" : ratio >= 0.75 ? "high" : "within";
}

export function entitlementsOf(plan: BackendPlan, usage: LiveSubscription["usage"]): EntitlementRow[] {
  const limits = limitsOf(plan);
  const features = featuresOf(plan);
  const measured: Record<string, number | undefined> = { Clients: usage?.currentClients, aiCredits: usage?.currentAiTokens };
  const resources = RESOURCES.map((def): EntitlementRow => {
    const base = limits[def.key]!;
    const used = measured[def.key] ?? null;
    const limit = ruleToLimit(base);
    return {
      key: def.key,
      kind: "resource",
      name: def.name,
      category: def.category,
      unit: def.unit,
      resetPeriod: def.resetPeriod,
      base,
      baseEnabled: null,
      override: null,
      effective: { baseValue: limit, baseRule: base, effectiveValue: limit, override: null, ruleApplied: "base", afterExpiryValue: limit },
      effectiveEnabled: null,
      used,
      status: used === null ? "not_metered" : limit === null ? "within" : statusOf(used, limit),
      usageResource: def.usageResource,
      dependencies: [],
    };
  });
  const flags = FEATURES.map((def): EntitlementRow => ({
    key: def.key,
    kind: "feature",
    name: def.name,
    category: def.category,
    unit: "",
    resetPeriod: "none",
    base: null,
    baseEnabled: features[def.key] ?? false,
    override: null,
    effective: null,
    effectiveEnabled: features[def.key] ?? false,
    used: null,
    status: features[def.key] ? "enabled" : "disabled",
    usageResource: null,
    dependencies: def.dependencies,
  }));
  return [...resources, ...flags];
}

/* ---- history from the audit trail ---- */

const ACTION_LABEL: Record<string, string> = {
  "subscription.assigned": "Subscription assigned",
  "subscription.plan_changed": "Plan changed",
  "subscription.suspended": "Subscription suspended",
  "subscription.reactivated": "Subscription reactivated",
  "subscription.cancelled": "Subscription cancelled",
  "billing.checkout.created": "Checkout started",
  "billing.invoice.paid": "Invoice paid",
  "plan.updated": "Plan saved",
  "plan.activated": "Plan shown for purchase",
  "plan.deactivated": "Plan hidden from purchase",
};

export function eventOf(item: SuperAdminAuditLogItem, planNames: Map<string, string>): SubscriptionEvent {
  const meta = item.metadata ?? {};
  const named = (value: unknown) => (typeof value === "string" ? planNames.get(value) ?? null : null);
  const previous = named(meta.previousPlanId);
  const next = named(meta.newPlanId) ?? named(meta.planId);
  return {
    id: item.id,
    company: item.companyId ? { id: item.companyId, name: item.companyName ?? item.companyId } : null,
    subscriptionId: item.resourceType === "SUBSCRIPTION" ? item.resourceId : typeof meta.subscriptionId === "string" ? meta.subscriptionId : null,
    planId: typeof meta.newPlanId === "string" ? meta.newPlanId : typeof meta.planId === "string" ? meta.planId : item.resourceType === "PLAN" ? item.resourceId : null,
    at: item.createdAt,
    action: item.action,
    summary: ACTION_LABEL[item.action] ?? item.action,
    actor: item.actor.name ?? item.actor.email ?? (item.actor.type === "SYSTEM" ? "System" : "Unknown"),
    previousValue: previous,
    newValue: next,
    reason: null,
    result: item.outcome === "SUCCESS" ? "success" : "failure",
    module: "Subscriptions",
  };
}

export function planActivityOf(item: SuperAdminAuditLogItem): PlanActivity {
  return {
    id: item.id,
    at: item.createdAt,
    actor: item.actor.name ?? item.actor.email ?? (item.actor.type === "SYSTEM" ? "System" : "Unknown"),
    action: item.action,
    summary: ACTION_LABEL[item.action] ?? item.action,
    planId: item.resourceId,
    result: item.outcome === "SUCCESS" ? "success" : "failure",
    previousValue: null,
    newValue: null,
  };
}

/** What the page can say about its policy when the backend has none: no trials, no grace period, no scheduled cancellations. */
export const NO_POLICY: SubscriptionPolicy = {
  trial: { defaultTrialDays: 0, extensionLimitDays: 0, reminderDays: [], defaultTrialPlan: "" as PlanKey, allowWithoutPaymentMethod: false },
  renewal: { defaultBillingCycle: "monthly", reminderDays: [], gracePeriodDays: 0, failedPaymentHandling: "manual_review" },
  cancellation: { defaultTiming: "immediate", reactivationWindowDays: 0 },
  overLimit: { users: "block_new_creation", clients: "block_new_creation", connectedAccounts: "block_new_creation", aiCredits: "block_new_creation", automationRuns: "block_new_creation" },
};

/** The backend takes whole numbers for its two caps, so an unlimited, "none" or empty cap cannot be saved. */
export function backendLimitsOf(input: PlanDraftInput): { maxClients: number; maxAiTokens: number } | PlanIssue[] {
  const issues: PlanIssue[] = [];
  const read = (key: string, field: string, label: string): number => {
    const rule = (input.limits as Record<string, LimitRule | undefined>)[key];
    const value = rule && rule.kind === "fixed" ? rule.value : null;
    if (value === null || !Number.isInteger(value) || value < 1) {
      issues.push({ severity: "error", field, message: `${label} must be a whole number of at least 1. Unlimited or custom limits can't be saved yet.` });
      return 0;
    }
    return value;
  };
  const maxClients = read("Clients", "limits.Clients", "Max Clients");
  const maxAiTokens = read("aiCredits", "limits.aiCredits", "AI Credits");
  return issues.length ? issues : { maxClients, maxAiTokens };
}

/* ------------------------------------------------------------------ */
/* The repository                                                      */
/* ------------------------------------------------------------------ */

type Actor = MutationActor;

export class LivePlansRepository implements PlansRepository {
  readonly mode = "live" as const;
  private drafts = new Map<string, SessionDraft>();

  /* ---- loading ---- */

  private async load(): Promise<{ plans: BackendPlan[]; subs: LiveSubscription[] }> {
    const [plans, subs] = await Promise.all([superAdminPlansApi.listPlans(), superAdminPlansApi.listSubscriptions() as Promise<LiveSubscription[]>]);
    return { plans, subs };
  }

  private async summaries(): Promise<{ summaries: PlanSummary[]; plans: BackendPlan[]; subs: LiveSubscription[]; rows: SubscriptionRow[] }> {
    const { plans, subs } = await this.load();
    const rows = subs.map(toRow);
    const platform = plans.map((plan) => toPlatformPlan(plan, this.drafts.get(plan.id)));
    return { summaries: computePlanSummaries(platform, rows), plans, subs, rows };
  }

  private async summaryOf(planRef: string): Promise<{ summary: PlanSummary; plan: BackendPlan; subs: LiveSubscription[] }> {
    const { summaries, plans, subs } = await this.summaries();
    const summary = summaries.find((item) => item.plan.id === planRef || item.plan.key === planRef);
    const plan = summary ? plans.find((item) => item.id === summary.plan.id) : undefined;
    if (!summary || !plan) throw missing("Plan");
    return { summary, plan, subs };
  }

  private async events(limit = 20): Promise<SubscriptionEvent[]> {
    try {
      const { plans } = await this.load();
      const names = new Map(plans.map((plan) => [plan.id, plan.name]));
      const pages = await Promise.all(["SUBSCRIPTION", "INVOICE", "PLAN"].map((resourceType) => superAdminAuditLogsApi.list({ resourceType, limit })));
      return pages
        .flatMap((page) => page.items)
        .map((item) => eventOf(item, names))
        .sort((a, b) => Date.parse(b.at) - Date.parse(a.at))
        .slice(0, limit);
    } catch {
      // The activity feed is supplementary: if the audit trail can't be read the rest of the page still shows.
      return [];
    }
  }

  /* ---- reads ---- */

  async getOverview(): Promise<OverviewData> {
    const { summaries, rows } = await this.summaries();
    const attention = attentionOf(rows);
    const activity = await this.events(8);
    return {
      portfolio: computeSubscriptionPortfolio(rows, Date.now(), attention.length),
      plans: computePlansPortfolio(summaries),
      adoption: computeAdoption(summaries),
      attention: attention.slice(0, 8),
      upcoming: [],
      activity,
      endingTrials: [],
    };
  }

  /**
   * Derived from each subscription's own dates, as the page says: it counts from when the subscription started (a subscription still waiting for its first
   * payment has not started) to when it was cancelled (the audit trail's cancellation time, else the last update). There are no trials to chart.
   */
  async getTrend(metric: TrendMetric, period: TrendPeriod): Promise<TrendPoint[]> {
    const { subs } = await this.load();
    const cancelledAt = new Map<string, number>();
    try {
      const audit = await superAdminAuditLogsApi.list({ resourceType: "SUBSCRIPTION", action: "subscription.cancelled", limit: 100 });
      for (const item of audit.items) {
        if (item.resourceId && !cancelledAt.has(item.resourceId)) cancelledAt.set(item.resourceId, Date.parse(item.createdAt));
      }
    } catch {
      // Without the audit trail the last update stands in for the cancellation time.
    }
    const records = subs
      .filter((sub) => sub.status !== "INCOMPLETE")
      .map((sub) => ({
        startedAt: Date.parse(sub.createdAt),
        endedAt: sub.status === "CANCELED" ? cancelledAt.get(sub.id) ?? Date.parse(sub.updatedAt) : null,
        trialEndsAt: null,
      }));
    return computeTrendFromRecords(Date.now(), records, metric, period);
  }

  async listPlans(query: PlanListQuery): Promise<PlanListResult> {
    const { summaries } = await this.summaries();
    return { summaries: filterPlans(summaries, query), portfolio: computePlansPortfolio(summaries) };
  }

  async getPlan(id: string): Promise<PlanDetailData> {
    const { summary } = await this.summaryOf(id);
    let activity: PlanActivity[] = [];
    try {
      const audit = await superAdminAuditLogsApi.list({ resourceType: "PLAN", limit: 100 });
      activity = audit.items.filter((item) => item.resourceId === summary.plan.id).map(planActivityOf);
    } catch {
      activity = [];
    }
    return { summary, activity, subscribersByVersion: { 1: summary.subscribers.total } };
  }

  async getComparison(): Promise<PlanSummary[]> {
    return (await this.summaries()).summaries.filter((item) => item.current || item.draft);
  }

  async previewImpact(planId: string, input: PlanDraftInput): Promise<VersionImpact> {
    const { summary } = await this.summaryOf(planId);
    const current = summary.current;
    const priceDiff = current ? { monthlyMinor: input.price.monthlyMinor - current.price.monthlyMinor, annualMinor: 0, currency: current.price.currency } : null;
    const changedFeatures = FEATURES.flatMap((feature) => {
      const from = current?.features[feature.key] ?? false;
      const to = input.features[feature.key] ?? false;
      return from === to ? [] : [{ key: feature.key, name: feature.name, from, to }];
    });
    const changedLimits = RESOURCES.flatMap((resource) => {
      const from = current?.limits[resource.key] ?? UNLIMITED;
      const to = input.limits[resource.key] ?? UNLIMITED;
      return from.kind === to.kind && (from.value ?? null) === (to.value ?? null) ? [] : [{ key: resource.key, name: resource.name, unit: resource.unit, from, to }];
    });
    const subscribers = summary.subscribers.total;
    return {
      fromVersion: current?.version ?? null,
      toVersion: (current?.version ?? 0) + 1,
      priceDiff,
      changedFeatures,
      changedLimits,
      subscribers,
      // Per-company usage against the new caps is not computed here.
      exceedingNewLimits: [],
      affectedCompanies: subscribers,
      summary: subscribers > 0 ? [`Applies to all ${subscribers} current subscribers immediately.`] : ["No subscribers yet."],
    };
  }

  async validatePlan(input: PlanDraftInput, planId?: string): Promise<PlanIssue[]> {
    const { plans } = await this.load();
    const own = planId ? plans.find((plan) => plan.id === planId) : undefined;
    const codes = plans.map((plan) => `PLAN_${planKeyOf(plan.name).toUpperCase()}`);
    // Annual billing is optional here: an annual price left at 0 means "monthly only".
    const issues = validatePlanConfig(input, codes, { selfCode: own ? `PLAN_${planKeyOf(own.name).toUpperCase()}` : undefined }).filter((issue) => !(issue.field === "annualMinor" && input.price.annualMinor === 0));
    const caps = backendLimitsOf(input);
    return Array.isArray(caps) ? [...issues, ...caps] : issues;
  }

  async listCompaniesOnPlan(planId: string): Promise<CompaniesLite[]> {
    const { summary, subs } = await this.summaryOf(planId);
    return subs
      .filter((sub) => sub.planId === summary.plan.id)
      .map((sub) => ({ id: sub.companyId, name: companyRefOf(sub).name, planKey: summary.plan.key, version: 1, subscriptionId: sub.id }));
  }

  async listSubscriptions(query: SubscriptionListQuery): Promise<SubscriptionListResult> {
    const { subs } = await this.load();
    return applySubscriptionQuery(subs.map(toRow), query, Date.now());
  }

  async exportSubscriptions(scope: { query?: SubscriptionListQuery; ids?: string[] }): Promise<SubscriptionRow[]> {
    const { subs } = await this.load();
    const rows = subs.map(toRow);
    if (scope.ids?.length) return rows.filter((row) => scope.ids!.includes(row.id));
    return applySubscriptionQuery(rows, { ...(scope.query ?? {}), page: 1, pageSize: Math.max(rows.length, 1) }, Date.now()).data;
  }

  async getFacets(): Promise<SubscriptionFacets> {
    const { plans, subs } = await this.load();
    const companies = [...new Map(subs.map((sub) => [sub.companyId, { id: sub.companyId, name: companyRefOf(sub).name }])).values()];
    return { companies, plans: plans.map((plan) => ({ key: planKeyOf(plan.name), name: plan.name })) };
  }

  async getSubscription(id: string): Promise<SubscriptionDetail> {
    const [raw, { plans }] = await Promise.all([superAdminPlansApi.getSubscription(id) as Promise<LiveSubscription>, this.load()]);
    const backendPlan = plans.find((plan) => plan.id === raw.planId) ?? raw.plan ?? null;
    const row = toRow(raw);
    const entitlements = backendPlan ? entitlementsOf(backendPlan, raw.usage) : [];
    const metered = entitlements.filter((item) => item.kind === "resource" && item.used !== null && item.effective?.effectiveValue !== null && item.effective !== null);
    const ratio = (item: EntitlementRow) => (item.used ?? 0) / Math.max(item.effective?.effectiveValue ?? 1, 1);
    const top = [...metered].sort((a, b) => ratio(b) - ratio(a))[0];
    const names = new Map(plans.map((plan) => [plan.id, plan.name]));
    let history: SubscriptionEvent[] = [];
    try {
      const audit = await superAdminAuditLogsApi.list({ companyId: raw.companyId, limit: 100 });
      history = audit.items.filter((item) => item.resourceId === raw.id || item.metadata?.subscriptionId === raw.id).map((item) => eventOf(item, names));
    } catch {
      history = [];
    }
    return {
      row,
      company: { ...companyRefOf(raw), ownerName: raw.owner?.name ?? raw.owner?.email ?? "Not recorded" },
      plan: backendPlan ? toPlatformPlan(backendPlan) : null,
      version: backendPlan ? versionOf(backendPlan) : null,
      entitlements,
      overrides: [],
      scheduled: [],
      history,
      usageSummary: {
        exceeded: metered.filter((item) => item.status === "exceeded").length,
        nearLimit: metered.filter((item) => item.status === "near_limit").length,
        // The page shows this as a percentage, so it is a percentage (one decimal).
        highest: top && top.usageResource ? { resource: top.usageResource as UsageResource, utilization: Math.round(ratio(top) * 1000) / 10 } : null,
      },
      extendedDays: 0,
      paymentMethodLabel: null,
      openInvoiceNumber: raw.openInvoiceId ? `INV-${raw.openInvoiceId.slice(0, 8).toUpperCase()}` : null,
      policy: NO_POLICY,
    };
  }

  async getPlanChangeImpact(subscriptionId: string, planKey: PlanKey, cycle: BillingCycle): Promise<PlanChangeImpact> {
    const [raw, { plans }] = await Promise.all([superAdminPlansApi.getSubscription(subscriptionId) as Promise<LiveSubscription>, this.load()]);
    const current = plans.find((plan) => plan.id === raw.planId);
    const next = plans.find((plan) => planKeyOf(plan.name) === planKey);
    if (!current || !next) throw missing("Plan");
    const money = (plan: BackendPlan, cycle: BillingCycle) => {
      const annual = cycle === "annual";
      const recurring = annual ? plan.annualPrice ?? 0 : plan.monthlyPrice;
      return { planName: plan.name, version: 1, monthlyEquivalentMinor: annual ? Math.round(recurring / 12) : recurring, recurringMinor: recurring, currency: "INR", cycle };
    };
    const currentRows = entitlementsOf(current, raw.usage);
    const nextRows = entitlementsOf(next, raw.usage);
    const rows = currentRows.map((row, index) => {
      const target = nextRows[index]!;
      const label = (item: EntitlementRow) => (item.kind === "resource" ? (item.base ? ruleLabel(item.base) : "—") : item.baseEnabled ? "Included" : "Not included");
      return { key: row.key, kind: row.kind, name: row.name, unit: row.unit, current: label(row), next: label(target), changed: label(row) !== label(target), used: row.used, over: false };
    });
    const overLimit = [
      ...(raw.usage && raw.usage.currentClients > next.maxClients ? [{ key: "Clients", name: "Max Clients", used: raw.usage.currentClients, nextLimit: next.maxClients, unit: "clients" }] : []),
      ...(raw.usage && raw.usage.currentAiTokens > next.maxAiTokens ? [{ key: "aiCredits", name: "AI Credits", used: raw.usage.currentAiTokens, nextLimit: next.maxAiTokens, unit: "credits" }] : []),
    ];
    for (const row of rows) row.over = overLimit.some((item) => item.key === row.key);
    return {
      current: money(current, raw.billingCycle === "ANNUAL" ? "annual" : "monthly"),
      next: money(next, cycle),
      currencyMismatch: false,
      rows: rows.filter((row) => row.changed || row.used !== null),
      overLimit,
      policyNote: "A plan change applies immediately, and the price difference is not charged or credited here.",
      ineligibleReason:
        current.id === next.id && (raw.billingCycle === "ANNUAL" ? "annual" : "monthly") === cycle
          ? "The company is already on this plan."
          : !next.isActive
            ? "This plan is not available."
            : cycle === "annual" && !next.annualPrice
              ? "This plan does not offer annual billing."
              : null,
    };
  }

  async listSelectablePlans(subscriptionId: string): Promise<PlanChoice[]> {
    const [raw, { summaries }] = await Promise.all([superAdminPlansApi.getSubscription(subscriptionId) as Promise<LiveSubscription>, this.summaries()]);
    return summaries
      .filter((summary) => summary.current)
      .map((summary) => {
        const isCurrent = summary.plan.id === raw.planId;
        const available = summary.plan.status === "published";
        const needsAnnual = raw.billingCycle === "ANNUAL" && !(summary.current && summary.current.price.annualMinor > 0);
        return {
          summary,
          isCurrent,
          eligible: !isCurrent && available && !needsAnnual,
          reason: isCurrent ? "The company is on this plan." : !available ? "This plan is hidden from purchase." : needsAnnual ? "This plan does not offer annual billing." : null,
        };
      });
  }

  async getTrials(_query: TrialQuery): Promise<TrialRow[]> {
    return [];
  }

  async getScheduledChanges(): Promise<ScheduledChangeView[]> {
    return [];
  }

  async getRecentChanges(): Promise<SubscriptionEvent[]> {
    return this.events(30);
  }

  async getPolicy(): Promise<SubscriptionPolicy> {
    const stored = await superAdminPlansApi.getPolicy();
    const policy = stored.policy as unknown as SubscriptionPolicy;
    // Until a policy is saved the trial plan is unset: show the first plan on sale rather than an empty choice.
    if (policy.trial.defaultTrialPlan) return policy;
    const first = (await superAdminPlansApi.listPlans()).find((plan) => plan.isActive);
    return { ...policy, trial: { ...policy.trial, defaultTrialPlan: first ? planKeyOf(first.name) : policy.trial.defaultTrialPlan } };
  }

  /* ---- plan mutations ---- */

  async createPlan(input: CreatePlanInput, _actor: Actor): Promise<PlanSummary> {
    if (input.intent !== "published") throw notSupported("A plan can't be saved as a draft before it exists. Publish it to create it.");
    const caps = backendLimitsOf(input);
    if (Array.isArray(caps)) throw invalid(caps[0]!.message);
    const name = input.name.trim();
    if (!name) throw invalid("A plan needs a name.");
    const { plans } = await this.load();
    // The backend saves a plan by its name, so reusing a name would overwrite that plan.
    if (plans.some((plan) => plan.name.toLowerCase() === name.toLowerCase())) throw conflict(`A plan named "${name}" already exists.`);
    const created = await superAdminPlansApi.upsertPlan({ name, monthlyPrice: input.price.monthlyMinor, annualPrice: input.price.annualMinor > 0 ? input.price.annualMinor : null, features: { ...caps, automationEnabled: input.features.automation_engine === true } });
    return (await this.summaryOf(created.id)).summary;
  }

  async saveDraft(planId: string, input: PlanDraftInput, actor: Actor): Promise<PlanSummary> {
    const { plan } = await this.summaryOf(planId);
    this.drafts.set(plan.id, { input, savedAt: new Date().toISOString(), by: actor.name });
    return (await this.summaryOf(plan.id)).summary;
  }

  async startNewVersion(planId: string, actor: Actor): Promise<PlanSummary> {
    const { summary, plan } = await this.summaryOf(planId);
    const current = summary.current;
    if (!current) throw missing("Plan version");
    const input: PlanDraftInput = {
      name: summary.plan.name,
      internalCode: summary.plan.internalCode,
      description: summary.plan.description,
      targetSegment: summary.plan.targetSegment,
      internalNotes: summary.plan.internalNotes,
      price: current.price,
      features: current.features,
      limits: current.limits,
      availability: summary.plan.availability,
    };
    this.drafts.set(plan.id, { input, savedAt: new Date().toISOString(), by: actor.name });
    return (await this.summaryOf(plan.id)).summary;
  }

  async discardDraft(planId: string, _actor: Actor): Promise<PlanSummary> {
    const { plan } = await this.summaryOf(planId);
    this.drafts.delete(plan.id);
    return (await this.summaryOf(plan.id)).summary;
  }

  /** Publishing is a direct edit: the backend has no plan versions, so a change reaches every current subscriber at once. */
  async publishPlan(planId: string, _input: PublishInput, _actor: Actor): Promise<PlanSummary> {
    const { summary, plan } = await this.summaryOf(planId);
    const draft = this.drafts.get(plan.id);
    if (!draft) throw invalid("There is no draft to publish.");
    if (draft.input.name.trim() !== plan.name) throw notSupported("Renaming a plan isn't supported: plans are identified by their name.");
    if (summary.subscribers.total > 0) {
      throw notSupported(`This plan has ${summary.subscribers.total} subscriber${summary.subscribers.total === 1 ? "" : "s"}, and the backend applies a change to all of them at once (it has no plan versions or rollout). Create a new plan for the new terms instead.`);
    }
    const caps = backendLimitsOf(draft.input);
    if (Array.isArray(caps)) throw invalid(caps[0]!.message);
    await superAdminPlansApi.upsertPlan({ name: plan.name, monthlyPrice: draft.input.price.monthlyMinor, annualPrice: draft.input.price.annualMinor > 0 ? draft.input.price.annualMinor : null, features: { ...caps, automationEnabled: draft.input.features.automation_engine === true } });
    this.drafts.delete(plan.id);
    return (await this.summaryOf(plan.id)).summary;
  }

  async setAvailability(_planId: string, _availability: PlanAvailability, _actor: Actor): Promise<PlanSummary> {
    throw notSupported("Plan availability options aren't stored by the backend. A plan can only be shown or hidden.");
  }

  async hidePlan(planId: string, _actor: Actor): Promise<PlanSummary> {
    const { plan } = await this.summaryOf(planId);
    await superAdminPlansApi.deactivatePlan(plan.id);
    return (await this.summaryOf(plan.id)).summary;
  }

  async showPlan(planId: string, _actor: Actor): Promise<PlanSummary> {
    const { plan } = await this.summaryOf(planId);
    await superAdminPlansApi.activatePlan(plan.id);
    return (await this.summaryOf(plan.id)).summary;
  }

  async retirePlan(_planId: string, _input: { reason: string }, _actor: Actor): Promise<PlanSummary> {
    throw notSupported("Retiring a plan isn't supported by the backend. Hide it from purchase instead.");
  }

  /* ---- subscription mutations ---- */

  async changeCompanyPlan(subscriptionId: string, input: PlanChangeInput, _actor: Actor): Promise<SubscriptionDetail> {
    if (input.effective !== "immediately") throw notSupported("A plan change can only take effect immediately: scheduled changes aren't supported yet.");
    const { plans } = await this.load();
    const target = plans.find((plan) => planKeyOf(plan.name) === input.planKey);
    if (!target) throw missing("Plan");
    await superAdminPlansApi.changePlan(subscriptionId, target.id, input.billingCycle === "annual" ? "ANNUAL" : "MONTHLY");
    return this.getSubscription(subscriptionId);
  }

  async extendTrial(_id: string, _input: TrialExtensionInput, _actor: Actor): Promise<SubscriptionDetail> {
    throw notSupported("Trials aren't supported by the backend.");
  }

  async convertTrial(_id: string, _input: ConversionInput, _actor: Actor): Promise<SubscriptionDetail> {
    throw notSupported("Trials aren't supported by the backend.");
  }

  async endTrial(_id: string, _input: { reason: string }, _actor: Actor): Promise<SubscriptionDetail> {
    throw notSupported("Trials aren't supported by the backend.");
  }

  async cancelSubscription(subscriptionId: string, input: CancellationInput, _actor: Actor): Promise<SubscriptionDetail> {
    if (input.timing !== "immediate") throw notSupported("Cancelling at the end of the term isn't supported yet. Cancel immediately instead.");
    await superAdminPlansApi.cancelSubscription(subscriptionId);
    return this.getSubscription(subscriptionId);
  }

  async undoCancellation(subscriptionId: string, _input: { reason: string }, _actor: Actor): Promise<SubscriptionDetail> {
    await superAdminPlansApi.reactivateSubscription(subscriptionId);
    return this.getSubscription(subscriptionId);
  }

  async reactivateSubscription(subscriptionId: string, input: ReactivationInput, _actor: Actor): Promise<SubscriptionDetail> {
    if (input.planKey) {
      const { plans } = await this.load();
      const target = plans.find((plan) => planKeyOf(plan.name) === input.planKey);
      if (!target) throw missing("Plan");
      await superAdminPlansApi.changePlan(subscriptionId, target.id);
    }
    await superAdminPlansApi.reactivateSubscription(subscriptionId);
    return this.getSubscription(subscriptionId);
  }

  async cancelScheduledChange(_id: string, _input: { target: "plan_change" | "cancellation"; reason: string }, _actor: Actor): Promise<SubscriptionDetail> {
    throw notSupported("Scheduled changes aren't supported by the backend.");
  }

  async rescheduleChange(_id: string, _input: { effectiveAt: string; reason: string }, _actor: Actor): Promise<SubscriptionDetail> {
    throw notSupported("Scheduled changes aren't supported by the backend.");
  }

  async grantOverride(_id: string, _input: OverrideInput, _actor: Actor): Promise<SubscriptionDetail> {
    throw notSupported("Limit overrides aren't supported by the backend yet.");
  }

  async revokeOverride(_id: string, _overrideId: string, _input: { reason: string }, _actor: Actor): Promise<SubscriptionDetail> {
    throw notSupported("Limit overrides aren't supported by the backend yet.");
  }

  async savePolicy(policy: SubscriptionPolicy, _actor: Actor): Promise<SubscriptionPolicy> {
    const saved = await superAdminPlansApi.savePolicy(policy as unknown as Parameters<typeof superAdminPlansApi.savePolicy>[0]);
    return saved.policy as unknown as SubscriptionPolicy;
  }

  async resetDemoData(): Promise<void> {
    // Nothing to reset: this repository holds no demo data.
  }
}

function ruleLabel(rule: LimitRule): string {
  return rule.kind === "unlimited" ? "Unlimited" : rule.kind === "none" ? "Not available" : new Intl.NumberFormat("en-IN").format(rule.value ?? 0);
}

