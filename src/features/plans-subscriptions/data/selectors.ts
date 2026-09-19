/**
 * Pure derivations for Plans & Subscriptions.
 *
 * Everything here is computed from the company bundles (subscriptions, usage,
 * activity) and the plan store. Nothing is stored twice: MRR, counts, attention
 * items and scheduled changes are derived on demand, so they cannot drift from
 * the records they describe - and MRR comes from the very same function the
 * Companies module uses.
 */
import { USAGE_RESOURCE_BY_KEY } from "@/features/companies/data/config";
import {
  computeBillingStatus,
  computeMrr,
  computeSummary,
  computeUsage,
  cyclePrice,
  isPayingStatus,
  monthlyEquivalent,
  planForSubscription,
  type DerivationContext,
} from "@/features/companies/data/selectors";
import type { CompanyActivity, CompanyBundle, CompanyUsageRecord, UsageResource } from "@/features/companies/data/types";
import { APP } from "@/config/app";
import type { PaginationMeta } from "@/types/api";
import type { BillingCycle } from "@/types/domain/subscription";
import { ENTITLEMENT_CATEGORIES, FEATURES, FEATURE_BY_KEY, RESOURCES, formatRule, rulesEqual, ruleToLimit } from "./catalogue";
import { NEAR_LIMIT_PERCENT, RECENT_OVERRIDE_EXPIRY_DAYS, RENEWAL_SOON_DAYS, TRIAL_ENDING_SOON_DAYS } from "./config";
import { isInactiveStatus, overrideRuleLabel, resolveEffectiveEntitlements } from "./entitlements";
import type {
  AttentionKind,
  CompanyRefLite,
  CreatePlanInput,
  EntitlementRow,
  LimitRule,
  PlanAdoptionRow,
  PlanChangeImpact,
  PlanDraftInput,
  PlanIssue,
  PlanListQuery,
  PlanSummary,
  PlanVersion,
  PlansPortfolio,
  PlatformPlan,
  ScheduledChangeView,
  SubscriptionAttentionItem,
  SubscriptionDetail,
  SubscriptionEvent,
  SubscriptionListQuery,
  SubscriptionListResult,
  SubscriptionPolicy,
  SubscriptionPortfolio,
  SubscriptionRow,
  TrendMetric,
  TrendPeriod,
  TrendPoint,
  TrialRow,
  UsageRisk,
  VersionImpact,
} from "./types";

const DAY_MS = 86_400_000;

/* ------------------------------------------------------------------ */
/* Plans                                                               */
/* ------------------------------------------------------------------ */

export function currentVersionOf(plan: PlatformPlan): PlanVersion | null {
  return [...plan.versions].filter((item) => item.status === "published").sort((a, b) => b.version - a.version)[0] ?? null;
}

export function draftVersionOf(plan: PlatformPlan): PlanVersion | null {
  return plan.versions.find((item) => item.status === "draft") ?? null;
}

export function companyRef(bundle: CompanyBundle): CompanyRefLite {
  return { id: bundle.company.id, name: bundle.company.name, displayId: bundle.company.displayId, accountStatus: bundle.company.accountStatus };
}

const TERMINAL = new Set(["cancelled", "expired"]);
export function isCurrentStatus(status: string): boolean {
  return !TERMINAL.has(status);
}

/* ------------------------------------------------------------------ */
/* Validation                                                          */
/* ------------------------------------------------------------------ */

const CODE_PATTERN = /^[A-Z][A-Z0-9_]{1,23}$/;

/** Everything that would make a plan wrong to publish. Errors block publishing; warnings do not. */
export function validatePlanConfig(input: PlanDraftInput, existingCodes: readonly string[], opts: { selfCode?: string } = {}): PlanIssue[] {
  const issues: PlanIssue[] = [];
  const error = (field: string, message: string) => issues.push({ severity: "error", field, message });
  const warn = (field: string, message: string) => issues.push({ severity: "warning", field, message });

  if (!input.name.trim()) error("name", "Plan name is required.");
  const code = input.internalCode.trim();
  if (!code) error("internalCode", "Internal code is required.");
  else if (!CODE_PATTERN.test(code)) error("internalCode", "Use 2-24 capitals, digits or underscores, starting with a letter (e.g. GROWTH_2026).");
  else if (code !== opts.selfCode && existingCodes.some((item) => item.toLowerCase() === code.toLowerCase())) error("internalCode", "Another plan already uses this code.");

  const { price } = input;
  if (!price.currency) error("currency", "Choose a currency.");
  if (!(price.monthlyMinor > 0)) error("monthlyMinor", "Enter a monthly price above zero.");
  if (!(price.annualMinor > 0)) error("annualMinor", "Enter an annual price above zero.");
  if (price.monthlyMinor > 0 && price.annualMinor > price.monthlyMinor * 12) warn("annualMinor", "The annual price is higher than twelve months at the monthly price.");
  if (!Number.isInteger(price.trialDays) || price.trialDays < 0 || price.trialDays > 90) error("trialDays", "Trial duration is a whole number of days between 0 and 90.");
  if (price.setupFeeMinor < 0) error("setupFeeMinor", "The setup fee cannot be negative.");

  for (const def of RESOURCES) {
    const rule = input.limits[def.key];
    if (!rule) {
      error(`limit.${def.key}`, `${def.name} needs a limit type.`);
      continue;
    }
    if ((rule.kind === "fixed" || rule.kind === "custom") && !(Number.isFinite(rule.value) && Number(rule.value) >= 1 && Number.isInteger(rule.value))) {
      error(`limit.${def.key}`, `${def.name}: enter a whole number of at least 1, or choose Not available.`);
    }
  }

  const enabled = FEATURES.filter((item) => input.features[item.key]);
  if (enabled.length === 0) warn("features", "No features are enabled on this plan.");
  for (const feature of enabled) {
    for (const dependency of feature.dependencies) {
      if (!input.features[dependency]) error(`feature.${feature.key}`, `${feature.name} requires ${FEATURE_BY_KEY[dependency]?.name ?? dependency}.`);
    }
  }
  if (input.features.multiple_clients && input.limits.Clients?.kind === "none") error("limit.Clients", "Multiple client workspaces is on, but the client limit is Not available.");
  const channelOn = FEATURES.some((item) => item.key.startsWith("channel_") && input.features[item.key]);
  if (channelOn && input.limits.channels?.kind === "none") error("limit.channels", "A channel is enabled, but Connected Accounts is Not available.");
  if (input.features.ai_assistant && input.limits.aiCredits?.kind === "none") warn("limit.aiCredits", "The AI assistant is on with no AI credits, so it cannot be used.");
  if (input.features.automation_engine && input.limits.automationRuns?.kind === "none") warn("limit.automationRuns", "The automation builder is on with no automation runs.");
  if (input.features.api_access && input.limits.apiCalls?.kind === "none") warn("limit.apiCalls", "API access is on with no API requests.");

  const availability = input.availability;
  if (!availability.newPurchase && !availability.upgrade && !availability.downgrade) warn("availability", "This plan is not available for new purchase, upgrade or downgrade.");
  if (availability.currencies.length === 0) error("currencies", "Choose at least one currency the plan is available in.");
  if (availability.currencies.length > 0 && price.currency && !availability.currencies.includes(price.currency)) warn("currencies", "The plan price currency is not among the available currencies.");
  return issues;
}

export function draftInputOf(plan: PlatformPlan, version: PlanVersion): PlanDraftInput {
  return {
    name: plan.name,
    internalCode: plan.internalCode,
    description: plan.description,
    targetSegment: plan.targetSegment,
    internalNotes: plan.internalNotes,
    price: { ...version.price },
    features: { ...version.features },
    limits: structuredClone(version.limits),
    availability: structuredClone(plan.availability),
  };
}

export function emptyPlanInput(): CreatePlanInput {
  return {
    intent: "draft",
    name: "",
    internalCode: "",
    description: "",
    targetSegment: "Growing brand teams",
    internalNotes: "",
    price: { currency: "INR", monthlyMinor: 0, annualMinor: 0, setupFeeMinor: 0, trialDays: 14, notes: "Demo configuration - not an approved commercial decision." },
    features: Object.fromEntries(FEATURES.map((item) => [item.key, false])),
    limits: Object.fromEntries(RESOURCES.map((item) => [item.key, { kind: "none", value: null } as LimitRule])) as PlanDraftInput["limits"],
    availability: { newPurchase: true, upgrade: true, downgrade: true, visibility: "public", currencies: ["INR"] },
  };
}

/* ------------------------------------------------------------------ */
/* Subscription rows                                                   */
/* ------------------------------------------------------------------ */

function riskOf(records: readonly CompanyUsageRecord[]): UsageRisk {
  if (records.some((record) => record.alertable && record.status === "exceeded")) return "over_limit";
  if (records.some((record) => record.alertable && record.status === "near_limit")) return "near_limit";
  return "ok";
}

export function buildSubscriptionRow(ctx: DerivationContext, bundle: CompanyBundle, plans: readonly PlatformPlan[]): SubscriptionRow {
  const { subscription } = bundle;
  const plan = plans.find((item) => item.key === subscription.planTier);
  const version = subscription.planVersion ?? 1;
  const current = plan ? currentVersionOf(plan) : null;
  const priced = planForSubscription(ctx, subscription);
  const usage = computeUsage(ctx, bundle);
  const overrides = bundle.overrides.filter((item) => !item.revokedAt && Date.parse(item.startsAt) <= ctx.now && Date.parse(item.expiresAt) > ctx.now);
  const pending = (subscription.scheduledChange ? 1 : 0) + (subscription.status === "scheduled_cancellation" ? 1 : 0);

  return {
    id: subscription.id,
    company: companyRef(bundle),
    planKey: subscription.planTier,
    planName: plan?.name ?? priced.name,
    planVersion: version,
    currentVersion: current?.version ?? null,
    isLegacyVersion: current !== null && version < current.version,
    planMissing: !plan,
    billingCycle: subscription.billingCycle,
    status: subscription.status,
    currency: priced.currency,
    recurringMinor: cyclePrice(priced, subscription.billingCycle),
    mrrMinor: computeMrr(ctx, bundle),
    startedAt: subscription.startedAt,
    renewsAt: subscription.renewsAt,
    trialEndsAt: subscription.trialEndsAt,
    scheduledCancellationAt: subscription.scheduledCancellationAt,
    endedAt: subscription.status === "cancelled" ? (subscription.cancelledAt ?? subscription.renewsAt) : subscription.status === "expired" ? subscription.renewsAt : null,
    billingStatus: computeBillingStatus(bundle),
    usageRisk: riskOf(usage.records),
    activeOverrides: overrides.length,
    pendingChanges: pending,
    hasOpenInvoice: bundle.invoices.some((invoice) => invoice.status === "open" || invoice.status === "overdue"),
  };
}

export function buildSubscriptionRows(ctx: DerivationContext, bundles: readonly CompanyBundle[], plans: readonly PlatformPlan[]): SubscriptionRow[] {
  return bundles.map((bundle) => buildSubscriptionRow(ctx, bundle, plans));
}

/* ------------------------------------------------------------------ */
/* Listing                                                             */
/* ------------------------------------------------------------------ */

function within(iso: string, days: number, now: number): boolean {
  return now - Date.parse(iso) <= days * DAY_MS;
}

export function periodEndOf(row: SubscriptionRow): string {
  return row.status === "trialing" && row.trialEndsAt ? row.trialEndsAt : row.renewsAt;
}

export function filterSubscriptions(rows: readonly SubscriptionRow[], query: SubscriptionListQuery, now: number): SubscriptionRow[] {
  const term = (query.search ?? "").trim().toLowerCase();
  return rows.filter((row) => {
    if (term && ![row.company.name, row.company.displayId, row.id, row.planName].some((field) => field.toLowerCase().includes(term))) return false;
    if (query.company && row.company.id !== query.company) return false;
    if (query.plan && row.planKey !== query.plan) return false;
    if (query.status) {
      if (query.status === "paid") {
        if (row.status !== "active" && row.status !== "scheduled_cancellation") return false;
      } else if (query.status === "current") {
        if (!isCurrentStatus(row.status)) return false;
      } else if (query.status === "ended") {
        if (isCurrentStatus(row.status)) return false;
      } else if (row.status !== query.status) return false;
    }
    if (query.cycle && row.billingCycle !== query.cycle) return false;
    if (query.billing && row.billingStatus !== query.billing) return false;
    if (query.trialEnding === "1") {
      if (row.status !== "trialing" || !row.trialEndsAt) return false;
      const days = (Date.parse(row.trialEndsAt) - now) / DAY_MS;
      if (days > TRIAL_ENDING_SOON_DAYS) return false;
    }
    if (query.renewal) {
      const days = Number.parseInt(query.renewal, 10);
      const end = Date.parse(periodEndOf(row));
      if (!isCurrentStatus(row.status) || Number.isNaN(days) || end < now || end - now > days * DAY_MS) return false;
    }
    if (query.created) {
      const days = query.created === "30d" ? 30 : query.created === "90d" ? 90 : 365;
      if (!within(row.startedAt, days, now)) return false;
    }
    if (query.version === "legacy" && !row.isLegacyVersion) return false;
    return true;
  });
}

export function sortSubscriptions(rows: readonly SubscriptionRow[], sort: SubscriptionListQuery["sort"]): SubscriptionRow[] {
  const { field, direction } = sort ?? { field: "renewsAt", direction: "asc" as const };
  const order = direction === "asc" ? 1 : -1;
  const value = (row: SubscriptionRow): number | string => {
    switch (field) {
      case "mrr":
        return row.mrrMinor;
      case "startedAt":
        return Date.parse(row.startedAt);
      case "company":
        return row.company.name.toLowerCase();
      case "renewsAt":
      default:
        // Ended subscriptions have nothing left to renew, so they always sort after running ones.
        return isCurrentStatus(row.status) ? Date.parse(periodEndOf(row)) : order > 0 ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY;
    }
  };
  return [...rows].sort((a, b) => {
    const left = value(a);
    const right = value(b);
    const compare = typeof left === "string" && typeof right === "string" ? left.localeCompare(right) : Number(left) - Number(right);
    return order * compare || a.company.name.localeCompare(b.company.name);
  });
}

export function paginate<T>(items: readonly T[], page: number, pageSize: number): { data: T[]; pagination: PaginationMeta } {
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const current = Math.min(Math.max(1, page), totalPages);
  const offset = (current - 1) * pageSize;
  return {
    data: items.slice(offset, offset + pageSize),
    pagination: { page: current, pageSize, total, totalPages, hasNextPage: current < totalPages, hasPreviousPage: current > 1 },
  };
}

export function subscriptionKpis(rows: readonly SubscriptionRow[], now: number): SubscriptionListResult["kpis"] {
  return {
    activePaid: rows.filter((row) => row.status === "active" || row.status === "scheduled_cancellation").length,
    trialing: rows.filter((row) => row.status === "trialing").length,
    pastDue: rows.filter((row) => row.status === "past_due").length,
    scheduledCancellation: rows.filter((row) => row.status === "scheduled_cancellation").length,
    ended: rows.filter((row) => !isCurrentStatus(row.status)).length,
    renewalsSoon: rows.filter((row) => {
      const end = Date.parse(periodEndOf(row));
      return row.status !== "trialing" && isCurrentStatus(row.status) && row.status !== "scheduled_cancellation" && end >= now && end - now <= RENEWAL_SOON_DAYS * DAY_MS;
    }).length,
  };
}

export function applySubscriptionQuery(rows: readonly SubscriptionRow[], query: SubscriptionListQuery, now: number): SubscriptionListResult {
  const filtered = sortSubscriptions(filterSubscriptions(rows, query, now), query.sort);
  const { data, pagination } = paginate(filtered, query.page ?? 1, query.pageSize ?? APP.defaultPageSize);
  return { data, pagination, kpis: subscriptionKpis(rows, now) };
}

/* ------------------------------------------------------------------ */
/* Portfolio                                                           */
/* ------------------------------------------------------------------ */

function addMoney(target: Record<string, number>, currency: string, minor: number): void {
  target[currency] = (target[currency] ?? 0) + minor;
}

/**
 * Status totals are mutually exclusive lifecycle states. A scheduled cancellation
 * is still a paying, active subscription, so it is counted inside Active Paid and
 * reported separately as an overlapping flag - never added on top.
 */
export function computeSubscriptionPortfolio(rows: readonly SubscriptionRow[], now: number, attentionCount: number): SubscriptionPortfolio {
  const kpis = subscriptionKpis(rows, now);
  const mrrByCurrency: Record<string, number> = {};
  for (const row of rows) if (row.mrrMinor > 0) addMoney(mrrByCurrency, row.currency, row.mrrMinor);
  const primaryCurrency = Object.entries(mrrByCurrency).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "INR";
  const trials = rows.filter((row) => row.status === "trialing");

  return {
    totalCurrent: rows.filter((row) => isCurrentStatus(row.status)).length,
    activePaid: kpis.activePaid,
    trials: trials.length,
    pastDue: kpis.pastDue,
    paused: rows.filter((row) => row.status === "paused").length,
    scheduledCancellation: kpis.scheduledCancellation,
    endedRecently: rows.filter((row) => !isCurrentStatus(row.status) && within(row.renewsAt, 30, now)).length,
    ended: kpis.ended,
    trialsEndingSoon: trials.filter((row) => row.trialEndsAt && Date.parse(row.trialEndsAt) - now <= TRIAL_ENDING_SOON_DAYS * DAY_MS).length,
    renewalsSoon: kpis.renewalsSoon,
    needsAttention: attentionCount,
    mrrByCurrency,
    primaryCurrency,
    newLast30d: rows.filter((row) => within(row.startedAt, 30, now)).length,
    cancelledLast30d: rows.filter((row) => !isCurrentStatus(row.status) && within(row.renewsAt, 30, now)).length,
  };
}

export function subscriberCounts(plan: PlatformPlan, rows: readonly SubscriptionRow[]): PlanSummary["subscribers"] {
  const mine = rows.filter((row) => row.planKey === plan.key && isCurrentStatus(row.status));
  const mrrByCurrency: Record<string, number> = {};
  for (const row of mine) if (row.mrrMinor > 0) addMoney(mrrByCurrency, row.currency, row.mrrMinor);
  return {
    paid: mine.filter((row) => isPayingStatus(row.status)).length,
    trial: mine.filter((row) => row.status === "trialing").length,
    total: mine.length,
    onOlderVersion: mine.filter((row) => row.isLegacyVersion).length,
    mrrByCurrency,
  };
}

export function computePlanSummaries(plans: readonly PlatformPlan[], rows: readonly SubscriptionRow[]): PlanSummary[] {
  const codes = plans.map((plan) => plan.internalCode);
  return plans.map((plan) => {
    const current = currentVersionOf(plan);
    const draft = draftVersionOf(plan);
    const subject = draft ?? current;
    const issues = subject ? validatePlanConfig(draftInputOf(plan, subject), codes, { selfCode: plan.internalCode }) : [];
    const subscribers = subscriberCounts(plan, rows);
    const blocking = issues.some((issue) => issue.severity === "error");
    return { plan, current, draft, subscribers, issues, needsReview: blocking || (draft !== null && plan.status !== "draft") };
  });
}

export function filterPlans(summaries: readonly PlanSummary[], query: PlanListQuery): PlanSummary[] {
  const term = (query.search ?? "").trim().toLowerCase();
  return summaries.filter(({ plan }) => {
    if (!query.showRetired && plan.status === "retired" && query.status !== "retired") return false;
    if (query.status && plan.status !== query.status) return false;
    if (query.visibility && plan.availability.visibility !== query.visibility) return false;
    if (term && ![plan.name, plan.internalCode, plan.description, plan.targetSegment].some((field) => field.toLowerCase().includes(term))) return false;
    return true;
  });
}

export function computePlansPortfolio(summaries: readonly PlanSummary[]): PlansPortfolio {
  const count = (status: PlatformPlan["status"]) => summaries.filter((item) => item.plan.status === status).length;
  return {
    published: count("published"),
    draft: count("draft"),
    hidden: count("hidden"),
    retired: count("retired"),
    activeSubscribers: summaries.reduce((total, item) => total + item.subscribers.total, 0),
    requiringReview: summaries.filter((item) => item.needsReview).length,
  };
}

export function computeAdoption(summaries: readonly PlanSummary[]): PlanAdoptionRow[] {
  const total = summaries.reduce((sum, item) => sum + item.subscribers.total, 0);
  return summaries
    .filter((item) => item.subscribers.total > 0 || item.plan.status === "published")
    .map((item) => ({
      planId: item.plan.id,
      planKey: item.plan.key,
      name: item.plan.name,
      status: item.plan.status,
      paid: item.subscribers.paid,
      trial: item.subscribers.trial,
      share: total === 0 ? 0 : Math.round((item.subscribers.total / total) * 1000) / 10,
      mrrByCurrency: item.subscribers.mrrByCurrency,
    }))
    .sort((a, b) => b.paid + b.trial - (a.paid + a.trial));
}

/* ------------------------------------------------------------------ */
/* Events                                                              */
/* ------------------------------------------------------------------ */

const SUBSCRIPTION_ACTIONS = /^(subscription\.|usage\.override)/;

function toEvent(bundle: CompanyBundle, entry: CompanyActivity): SubscriptionEvent {
  return {
    id: entry.id,
    company: { id: bundle.company.id, name: bundle.company.name },
    subscriptionId: bundle.subscription.id,
    planId: null,
    at: entry.at,
    action: entry.action,
    summary: entry.summary,
    actor: entry.actor.name,
    previousValue: entry.previousValue,
    newValue: entry.newValue,
    reason: entry.reason,
    result: entry.result,
    module: entry.module,
  };
}

export function subscriptionEvents(bundle: CompanyBundle): SubscriptionEvent[] {
  return bundle.activity.filter((entry) => SUBSCRIPTION_ACTIONS.test(entry.action)).map((entry) => toEvent(bundle, entry)).sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
}

export function allSubscriptionEvents(bundles: readonly CompanyBundle[]): SubscriptionEvent[] {
  return bundles.flatMap(subscriptionEvents).sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
}

/* ------------------------------------------------------------------ */
/* Trials                                                              */
/* ------------------------------------------------------------------ */

export function trialExtendedDays(bundle: CompanyBundle): number {
  return bundle.activity
    .filter((entry) => entry.action === "subscription.trial_extended" && entry.previousValue && entry.newValue)
    .reduce((total, entry) => total + Math.max(0, Math.round((Date.parse(entry.newValue ?? "") - Date.parse(entry.previousValue ?? "")) / DAY_MS)), 0);
}

export function buildTrials(ctx: DerivationContext, bundles: readonly CompanyBundle[], rows: readonly SubscriptionRow[]): TrialRow[] {
  const result: TrialRow[] = [];
  for (const bundle of bundles) {
    const { subscription } = bundle;
    const row = rows.find((item) => item.id === subscription.id);
    if (!row) continue;
    const converted = bundle.activity.find((entry) => entry.action === "subscription.trial_converted");
    const endedEarly = bundle.activity.find((entry) => entry.action === "subscription.trial_ended");
    const isTrial = subscription.status === "trialing" && subscription.trialEndsAt;
    if (!isTrial && !converted && !endedEarly) continue;

    const endsAt = isTrial ? (subscription.trialEndsAt as string) : (converted?.at ?? endedEarly?.at ?? subscription.startedAt);
    const days = Math.ceil((Date.parse(endsAt) - ctx.now) / DAY_MS);
    const state: TrialRow["state"] = isTrial ? (days < 0 ? "expired" : days <= TRIAL_ENDING_SOON_DAYS ? "ending_soon" : "active") : converted ? "converted" : "expired";
    result.push({
      row,
      subscriptionId: subscription.id,
      company: companyRef(bundle),
      planKey: subscription.planTier,
      planName: row.planName,
      startedAt: subscription.startedAt,
      endsAt,
      daysRemaining: days,
      state,
      usageRisk: row.usageRisk,
      onboarding: computeSummary(ctx, bundle).onboarding,
      extendedDays: trialExtendedDays(bundle),
      hasPaymentMethod: subscription.paymentMethod !== null,
      billingCycle: subscription.billingCycle,
    });
  }
  return result.sort((a, b) => Date.parse(a.endsAt) - Date.parse(b.endsAt));
}

/* ------------------------------------------------------------------ */
/* Scheduled changes                                                   */
/* ------------------------------------------------------------------ */

export function buildScheduledChanges(ctx: DerivationContext, bundles: readonly CompanyBundle[], plans: readonly PlatformPlan[]): ScheduledChangeView[] {
  const views: ScheduledChangeView[] = [];
  const nameOf = (key: string) => plans.find((plan) => plan.key === key)?.name ?? key;

  for (const bundle of bundles) {
    const { subscription } = bundle;
    if (bundle.company.accountStatus === "archived") continue;
    const company = companyRef(bundle);
    const priced = planForSubscription(ctx, subscription);
    const status = (at: string): ScheduledChangeView["status"] => (Date.parse(at) < ctx.now ? "overdue" : Date.parse(at) - ctx.now < DAY_MS ? "ready" : "scheduled");

    const change = subscription.scheduledChange;
    if (change) {
      const nextPlan = ctx.planVersions?.(change.planTier, change.planVersion ?? 1) ?? ctx.plans.find((item) => item.tier === change.planTier);
      const samePlan = change.planTier === subscription.planTier;
      const nowMonthly = monthlyEquivalent(priced, subscription.billingCycle);
      const nextMonthly = nextPlan ? monthlyEquivalent(nextPlan, change.billingCycle) : nowMonthly;
      const kind: ScheduledChangeView["kind"] = samePlan && change.billingCycle !== subscription.billingCycle ? "billing_cycle" : nextMonthly >= nowMonthly ? "upgrade" : "downgrade";
      views.push({
        id: `sch_${subscription.id}_plan`,
        kind,
        subscriptionId: subscription.id,
        company,
        label: kind === "billing_cycle" ? "Billing cycle change" : `${kind === "upgrade" ? "Upgrade" : "Downgrade"} to ${nameOf(change.planTier)}`,
        current: `${nameOf(subscription.planTier)} (${subscription.billingCycle})`,
        scheduled: `${nameOf(change.planTier)} (${change.billingCycle})`,
        effectiveAt: change.effectiveAt,
        status: status(change.effectiveAt),
        createdBy: change.createdBy ?? "System",
        createdAt: change.createdAt ?? null,
        canReschedule: true,
        canCancel: true,
      });
    }

    if (subscription.status === "scheduled_cancellation" && subscription.scheduledCancellationAt) {
      views.push({
        id: `sch_${subscription.id}_cancel`,
        kind: "cancellation",
        subscriptionId: subscription.id,
        company,
        label: "Scheduled cancellation",
        current: "Active",
        scheduled: "Cancelled",
        effectiveAt: subscription.scheduledCancellationAt,
        status: status(subscription.scheduledCancellationAt),
        createdBy: "Super Admin",
        createdAt: subscription.cancelledAt,
        canReschedule: false,
        canCancel: true,
      });
    }

    for (const override of bundle.overrides) {
      if (override.revokedAt || Date.parse(override.expiresAt) <= ctx.now || Date.parse(override.startsAt) > ctx.now) continue;
      const label = USAGE_RESOURCE_BY_KEY[override.resource].label;
      views.push({
        id: `sch_${override.id}_expiry`,
        kind: "override_expiry",
        subscriptionId: subscription.id,
        company,
        label: `${label} override expires`,
        current: override.rule === "additive" ? `Plan +${override.delta ?? 0}` : `${override.overrideLimit}`,
        scheduled: override.baseLimit === null ? "Unlimited" : `${override.baseLimit}`,
        effectiveAt: override.expiresAt,
        status: "scheduled",
        createdBy: override.approvedBy,
        createdAt: override.createdAt,
        canReschedule: false,
        canCancel: false,
      });
    }

    const plan = plans.find((item) => item.key === subscription.planTier);
    const current = plan ? currentVersionOf(plan) : null;
    if (plan && current && (subscription.planVersion ?? 1) < current.version && current.rollout === "at_renewal" && isCurrentStatus(subscription.status) && subscription.status !== "scheduled_cancellation") {
      views.push({
        id: `sch_${subscription.id}_version`,
        kind: "version_migration",
        subscriptionId: subscription.id,
        company,
        label: `${plan.name} moves to version ${current.version}`,
        current: `Version ${subscription.planVersion ?? 1}`,
        scheduled: `Version ${current.version}`,
        effectiveAt: subscription.renewsAt,
        status: "scheduled",
        createdBy: current.publishedBy ?? "System",
        createdAt: current.publishedAt,
        canReschedule: false,
        canCancel: false,
      });
    }
  }
  return views.sort((a, b) => Date.parse(a.effectiveAt) - Date.parse(b.effectiveAt));
}

/* ------------------------------------------------------------------ */
/* Attention                                                           */
/* ------------------------------------------------------------------ */

export function buildAttention(
  ctx: DerivationContext,
  bundles: readonly CompanyBundle[],
  rows: readonly SubscriptionRow[],
  scheduled: readonly ScheduledChangeView[],
): SubscriptionAttentionItem[] {
  const items: SubscriptionAttentionItem[] = [];
  const push = (row: SubscriptionRow, kind: AttentionKind, severity: SubscriptionAttentionItem["severity"], issue: string, at: string, actions: SubscriptionAttentionItem["actions"]) =>
    items.push({ id: `${kind}_${row.id}_${items.length}`, kind, severity, subscriptionId: row.id, company: row.company, issue, at, actions });

  for (const bundle of bundles) {
    const row = rows.find((item) => item.id === bundle.subscription.id);
    if (!row || bundle.company.accountStatus === "archived") continue;
    const { subscription } = bundle;

    if (row.planMissing) push(row, "missing_plan", "critical", `Subscription references plan "${subscription.planTier}", which does not exist.`, subscription.startedAt, ["subscription", "company"]);

    if (row.status === "trialing" && row.trialEndsAt) {
      const days = Math.ceil((Date.parse(row.trialEndsAt) - ctx.now) / DAY_MS);
      if (days <= TRIAL_ENDING_SOON_DAYS) {
        push(row, "trial_ending", days <= 2 ? "critical" : "warning", days < 0 ? `Trial ended ${-days} day${days === -1 ? "" : "s"} ago and was not converted.` : `Trial ends in ${days} day${days === 1 ? "" : "s"}${subscription.paymentMethod ? "" : " with no payment method"}.`, row.trialEndsAt, ["subscription", "company"]);
      }
    }
    if (row.status === "past_due") push(row, "past_due", "critical", "Renewal payment has not been collected.", row.renewsAt, ["subscription", "billing"]);
    if (row.status === "scheduled_cancellation" && row.scheduledCancellationAt) push(row, "scheduled_cancellation", "warning", "Cancellation is scheduled at the end of the period.", row.scheduledCancellationAt, ["subscription", "company"]);

    for (const override of bundle.overrides) {
      const expired = !override.revokedAt && Date.parse(override.expiresAt) <= ctx.now && ctx.now - Date.parse(override.expiresAt) <= RECENT_OVERRIDE_EXPIRY_DAYS * DAY_MS;
      if (!expired) continue;
      const usage = computeUsage(ctx, bundle).records.find((record) => record.resource === override.resource);
      const label = USAGE_RESOURCE_BY_KEY[override.resource].label;
      push(row, "override_expired", usage && usage.status === "exceeded" ? "critical" : "info", `${label} override expired${usage && usage.status === "exceeded" ? " and usage is now above the plan limit" : ""}.`, override.expiresAt, ["subscription", "usage"]);
    }

    if (isCurrentStatus(subscription.status)) {
      const usage = computeUsage(ctx, bundle);
      const over = usage.records.filter((record) => record.alertable && record.status === "exceeded");
      if (over.length > 0) {
        const first = over[0] as CompanyUsageRecord;
        push(row, "usage_over_limit", "warning", `${USAGE_RESOURCE_BY_KEY[first.resource].label} is above the effective limit${over.length > 1 ? ` (+${over.length - 1} more)` : ""}.`, first.updatedAt, ["subscription", "usage"]);
      }
    }
  }
  for (const change of scheduled) {
    if (change.status !== "overdue") continue;
    const row = rows.find((item) => item.id === change.subscriptionId);
    if (row) push(row, "failed_change", "critical", `${change.label} was due ${change.effectiveAt.slice(0, 10)} but has not been applied.`, change.effectiveAt, ["subscription"]);
  }
  const rank = { critical: 0, warning: 1, info: 2 } as const;
  return items.sort((a, b) => rank[a.severity] - rank[b.severity] || Date.parse(a.at) - Date.parse(b.at));
}

/* ------------------------------------------------------------------ */
/* Trend                                                               */
/* ------------------------------------------------------------------ */

interface Bucket {
  start: number;
  end: number;
  label: string;
}

function buckets(period: TrendPeriod, now: number): Bucket[] {
  const result: Bucket[] = [];
  const fmt = (time: number, style: "day" | "month") => {
    const date = new Date(time);
    return style === "day" ? `${date.getUTCDate()} ${date.toLocaleString("en-GB", { month: "short", timeZone: "UTC" })}` : date.toLocaleString("en-GB", { month: "short", year: "2-digit", timeZone: "UTC" });
  };
  if (period === "30d" || period === "3m") {
    const step = period === "30d" ? DAY_MS : 7 * DAY_MS;
    const count = period === "30d" ? 30 : 13;
    for (let index = count - 1; index >= 0; index -= 1) {
      const end = now - index * step;
      result.push({ start: end - step, end, label: fmt(end, "day") });
    }
    return result;
  }
  const count = period === "6m" ? 6 : 12;
  const anchor = new Date(now);
  for (let index = count - 1; index >= 0; index -= 1) {
    const start = Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth() - index, 1);
    const next = Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth() - index + 1, 1);
    result.push({ start, end: Math.min(next, now), label: fmt(start, "month") });
  }
  return result;
}

function endTimeOf(bundle: CompanyBundle): number | null {
  const { subscription } = bundle;
  if (subscription.status === "cancelled") return subscription.cancelledAt ? Date.parse(subscription.cancelledAt) : Date.parse(subscription.renewsAt);
  if (subscription.status === "expired") return Date.parse(subscription.renewsAt);
  return null;
}

/**
 * History is derived from each subscription's own dates (start, trial window,
 * cancellation), so it is deterministic and always agrees with today's records.
 */
export function computeTrend(ctx: DerivationContext, bundles: readonly CompanyBundle[], metric: TrendMetric, period: TrendPeriod): TrendPoint[] {
  return buckets(period, ctx.now).map((bucket) => {
    let value = 0;
    for (const bundle of bundles) {
      const { subscription } = bundle;
      const started = Date.parse(subscription.startedAt);
      const ended = endTimeOf(bundle);
      const trialEnd = subscription.status === "trialing" && subscription.trialEndsAt ? Date.parse(subscription.trialEndsAt) : null;
      const at = bucket.end;
      const live = started <= at && (ended === null || ended > at);
      if (metric === "active_paid") value += live && (trialEnd === null || trialEnd <= at) ? 1 : 0;
      else if (metric === "active_trials") value += live && trialEnd !== null && trialEnd > at ? 1 : 0;
      else if (metric === "new_subscriptions") value += started > bucket.start && started <= bucket.end ? 1 : 0;
      else value += ended !== null && ended > bucket.start && ended <= bucket.end ? 1 : 0;
    }
    return { label: bucket.label, at: new Date(bucket.end).toISOString(), value };
  });
}

/* ------------------------------------------------------------------ */
/* Entitlements                                                        */
/* ------------------------------------------------------------------ */

function usageStatusToEntitlement(record: CompanyUsageRecord | undefined): EntitlementRow["status"] {
  if (!record) return "not_metered";
  switch (record.status) {
    case "exceeded":
      return "exceeded";
    case "near_limit":
      return "near_limit";
    case "high":
      return "high";
    case "not_metered":
      return "not_metered";
    default:
      return "within";
  }
}

export function buildEntitlements(ctx: DerivationContext, bundle: CompanyBundle, version: PlanVersion | null): EntitlementRow[] {
  if (!version) return [];
  const usage = computeUsage(ctx, bundle);
  const effective = resolveEffectiveEntitlements({ version, overrides: bundle.overrides, subscriptionStatus: bundle.subscription.status, evaluationDate: ctx.now });
  const inactive = isInactiveStatus(bundle.subscription.status);
  const rows: EntitlementRow[] = [];

  for (const category of ENTITLEMENT_CATEGORIES) {
    for (const def of RESOURCES.filter((item) => item.category === category)) {
      const resolved = effective[def.key];
      const record = def.usageResource ? usage.records.find((item) => item.resource === def.usageResource) : undefined;
      const used = record?.used ?? null;
      let status: EntitlementRow["status"] = usageStatusToEntitlement(record);
      if (resolved.baseRule.kind === "none" && !resolved.override) status = "unavailable";
      else if (record && resolved.effectiveValue !== null && used !== null) {
        const percent = resolved.effectiveValue === 0 ? (used > 0 ? 101 : 0) : (used / resolved.effectiveValue) * 100;
        status = percent > 100 ? "exceeded" : percent >= NEAR_LIMIT_PERCENT ? "near_limit" : percent >= 70 ? "high" : "within";
      } else if (record && resolved.effectiveValue === null) status = "within";
      rows.push({
        key: def.key,
        kind: "resource",
        name: def.name,
        category,
        unit: def.unit,
        resetPeriod: def.resetPeriod,
        base: resolved.baseRule,
        baseEnabled: null,
        override: resolved.override,
        effective: resolved,
        effectiveEnabled: null,
        used,
        status: inactive ? "unavailable" : status,
        usageResource: def.usageResource,
        dependencies: [],
      });
    }
    for (const feature of FEATURES.filter((item) => item.category === category)) {
      const enabled = Boolean(version.features[feature.key]);
      rows.push({
        key: feature.key,
        kind: "feature",
        name: feature.name,
        category,
        unit: "",
        resetPeriod: "none",
        base: null,
        baseEnabled: enabled,
        override: null,
        effective: null,
        effectiveEnabled: enabled && !inactive,
        used: null,
        status: enabled && !inactive ? "enabled" : "disabled",
        usageResource: null,
        dependencies: feature.dependencies,
      });
    }
  }
  return rows;
}

export function effectiveLimitLabel(row: EntitlementRow): string {
  if (!row.effective) return row.effectiveEnabled ? "Enabled" : "Not included";
  if (row.effective.ruleApplied === "inactive subscription") return "Inactive";
  return row.effective.effectiveValue === null ? "Unlimited" : row.effective.effectiveValue === 0 ? "Not available" : `${new Intl.NumberFormat("en-IN").format(row.effective.effectiveValue)} ${row.unit}`;
}

export function overrideLabel(row: EntitlementRow): string | null {
  const override = row.override;
  if (!override) return null;
  return override.rule === "additive" ? `+${new Intl.NumberFormat("en-IN").format(override.delta ?? 0)} (additive)` : `${new Intl.NumberFormat("en-IN").format(override.overrideLimit)} (replaces plan)`;
}

export { overrideRuleLabel, formatRule };

/* ------------------------------------------------------------------ */
/* Detail                                                              */
/* ------------------------------------------------------------------ */

export function buildSubscriptionDetail(
  ctx: DerivationContext,
  bundle: CompanyBundle,
  plans: readonly PlatformPlan[],
  policy: SubscriptionPolicy,
  scheduled: readonly ScheduledChangeView[],
): SubscriptionDetail {
  const row = buildSubscriptionRow(ctx, bundle, plans);
  const plan = plans.find((item) => item.key === bundle.subscription.planTier) ?? null;
  const version = plan?.versions.find((item) => item.version === row.planVersion && item.status !== "draft") ?? null;
  const usage = computeUsage(ctx, bundle);
  const owner = bundle.users.find((user) => user.id === bundle.company.ownerUserId);
  const openInvoice = bundle.invoices.find((invoice) => invoice.status === "open" || invoice.status === "overdue");
  const method = bundle.subscription.paymentMethod;
  return {
    row,
    company: { ...companyRef(bundle), ownerName: owner?.name ?? "No owner assigned" },
    plan,
    version,
    entitlements: buildEntitlements(ctx, bundle, version),
    overrides: [...bundle.overrides].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)),
    scheduled: scheduled.filter((item) => item.subscriptionId === bundle.subscription.id),
    history: subscriptionEvents(bundle),
    usageSummary: {
      exceeded: usage.records.filter((record) => record.alertable && record.status === "exceeded").length,
      nearLimit: usage.records.filter((record) => record.alertable && record.status === "near_limit").length,
      highest: usage.highest && usage.highest.utilization !== null ? { resource: usage.highest.resource as UsageResource, utilization: usage.highest.utilization } : null,
    },
    extendedDays: trialExtendedDays(bundle),
    paymentMethodLabel: method ? `${method.brand} ending ${method.last4}` : null,
    openInvoiceNumber: openInvoice?.number ?? null,
    policy,
  };
}

/* ------------------------------------------------------------------ */
/* Impact                                                              */
/* ------------------------------------------------------------------ */

/** What publishing `next` over the current published version would change, and for whom. */
export function computeVersionImpact(
  ctx: DerivationContext,
  plan: PlatformPlan,
  next: Pick<PlanVersion, "price" | "features" | "limits" | "version">,
  bundles: readonly CompanyBundle[],
): VersionImpact {
  const current = currentVersionOf(plan);
  const changedFeatures = FEATURES.filter((item) => Boolean(current?.features[item.key]) !== Boolean(next.features[item.key])).map((item) => ({ key: item.key, name: item.name, from: Boolean(current?.features[item.key]), to: Boolean(next.features[item.key]) }));
  const changedLimits = RESOURCES.filter((item) => {
    const before = current?.limits[item.key] ?? { kind: "none" as const, value: null };
    return !rulesEqual(before, next.limits[item.key] ?? { kind: "none", value: null });
  }).map((item) => ({ key: item.key, name: item.name, unit: item.unit, from: current?.limits[item.key] ?? { kind: "none" as const, value: null }, to: next.limits[item.key] ?? { kind: "none" as const, value: null } }));

  const subscribers = bundles.filter((bundle) => bundle.subscription.planTier === plan.key && isCurrentStatus(bundle.subscription.status));
  const exceeding: VersionImpact["exceedingNewLimits"] = [];
  for (const bundle of subscribers) {
    const usage = computeUsage(ctx, bundle);
    for (const change of changedLimits) {
      const def = RESOURCES.find((item) => item.key === change.key);
      if (!def?.usageResource) continue;
      const limit = ruleToLimit(change.to);
      const record = usage.records.find((item) => item.resource === def.usageResource);
      if (record && limit !== null && record.used > limit) {
        exceeding.push({ companyId: bundle.company.id, companyName: bundle.company.name, subscriptionId: bundle.subscription.id, resource: change.key, resourceName: def.name, used: record.used, newLimit: limit });
      }
    }
  }

  const priceDiff = current
    ? { monthlyMinor: next.price.monthlyMinor - current.price.monthlyMinor, annualMinor: next.price.annualMinor - current.price.annualMinor, currency: next.price.currency }
    : null;
  const summary: string[] = [];
  if (priceDiff && priceDiff.monthlyMinor !== 0) summary.push(`Monthly price ${priceDiff.monthlyMinor > 0 ? "increased" : "decreased"}`);
  if (priceDiff && priceDiff.annualMinor !== 0) summary.push(`Annual price ${priceDiff.annualMinor > 0 ? "increased" : "decreased"}`);
  for (const feature of changedFeatures) summary.push(`${feature.name} ${feature.to ? "added" : "removed"}`);
  for (const limit of changedLimits) summary.push(`${limit.name}: ${formatRule(limit.from, limit.unit)} -> ${formatRule(limit.to, limit.unit)}`);
  if (summary.length === 0) summary.push(current ? "No changes to price, features or limits" : "Initial version");

  return {
    fromVersion: current?.version ?? null,
    toVersion: next.version,
    priceDiff,
    changedFeatures,
    changedLimits,
    subscribers: subscribers.length,
    exceedingNewLimits: exceeding,
    affectedCompanies: new Set(exceeding.map((item) => item.companyId)).size,
    summary,
  };
}

/** Compares a company's current entitlement with a different plan, against its real usage. */
export function computePlanChangeImpact(
  ctx: DerivationContext,
  bundle: CompanyBundle,
  plans: readonly PlatformPlan[],
  planKey: string,
  cycle: BillingCycle,
  policy: SubscriptionPolicy,
): PlanChangeImpact {
  const { subscription } = bundle;
  const currentPlan = plans.find((item) => item.key === subscription.planTier) ?? null;
  const currentVersion = currentPlan?.versions.find((item) => item.version === (subscription.planVersion ?? 1) && item.status !== "draft") ?? (currentPlan ? currentVersionOf(currentPlan) : null);
  const nextPlan = plans.find((item) => item.key === planKey) ?? null;
  const nextVersion = nextPlan ? currentVersionOf(nextPlan) : null;
  const priced = planForSubscription(ctx, subscription);
  const usage = computeUsage(ctx, bundle);

  let ineligibleReason: string | null = null;
  if (isInactiveStatus(subscription.status)) ineligibleReason = "This subscription has ended. Reactivate it before changing its plan.";
  else if (bundle.company.accountStatus === "archived") ineligibleReason = "Archived companies cannot be changed.";
  else if (!nextPlan || !nextVersion) ineligibleReason = "This plan has no published version.";
  else if (nextPlan.status !== "published" && nextPlan.key !== subscription.planTier) ineligibleReason = `${nextPlan.name} is ${nextPlan.status === "retired" ? "retired" : nextPlan.status === "hidden" ? "hidden from new purchase" : "not published"}.`;

  const nextPriced = nextPlan && nextVersion ? { currency: nextVersion.price.currency, monthly: nextVersion.price.monthlyMinor, annual: nextVersion.price.annualMinor } : { currency: priced.currency, monthly: 0, annual: 0 };
  const rows: PlanChangeImpact["rows"] = [];
  const overLimit: PlanChangeImpact["overLimit"] = [];

  if (currentVersion && nextVersion) {
    for (const def of RESOURCES) {
      const from = currentVersion.limits[def.key];
      const to = nextVersion.limits[def.key];
      const record = def.usageResource ? usage.records.find((item) => item.resource === def.usageResource) : undefined;
      const limit = ruleToLimit(to);
      const over = Boolean(record) && limit !== null && (record?.used ?? 0) > limit;
      if (over && record) overLimit.push({ key: def.key, name: def.name, used: record.used, nextLimit: limit ?? 0, unit: def.unit });
      rows.push({ key: def.key, kind: "resource", name: def.name, unit: def.unit, current: formatRule(from, def.unit), next: formatRule(to, def.unit), changed: !rulesEqual(from, to), used: record?.used ?? null, over });
    }
    for (const feature of FEATURES) {
      const from = Boolean(currentVersion.features[feature.key]);
      const to = Boolean(nextVersion.features[feature.key]);
      rows.push({ key: feature.key, kind: "feature", name: feature.name, unit: "", current: from ? "Included" : "Not included", next: to ? "Included" : "Not included", changed: from !== to, used: null, over: false });
    }
  }

  const policyNote = overLimit.length === 0
    ? "Current usage fits the new plan."
    : `${overLimit.length} resource${overLimit.length === 1 ? " is" : "s are"} above the new plan's allowance. Per the over-limit policy: users - ${policy.overLimit.users.replace(/_/g, " ")}; clients - ${policy.overLimit.clients.replace(/_/g, " ")}; connections - ${policy.overLimit.connectedAccounts.replace(/_/g, " ")}. Nothing is deleted or disconnected.`;

  return {
    current: { planName: currentPlan?.name ?? priced.name, version: subscription.planVersion ?? 1, monthlyEquivalentMinor: monthlyEquivalent(priced, subscription.billingCycle), recurringMinor: cyclePrice(priced, subscription.billingCycle), currency: priced.currency, cycle: subscription.billingCycle },
    next: {
      planName: nextPlan?.name ?? planKey,
      version: nextVersion?.version ?? 1,
      monthlyEquivalentMinor: cycle === "annual" ? Math.round(nextPriced.annual / 12) : nextPriced.monthly,
      recurringMinor: cycle === "annual" ? nextPriced.annual : nextPriced.monthly,
      currency: nextPriced.currency,
      cycle,
    },
    currencyMismatch: nextPriced.currency !== priced.currency,
    rows,
    overLimit,
    policyNote,
    ineligibleReason,
  };
}
