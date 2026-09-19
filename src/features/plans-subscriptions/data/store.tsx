"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { allBundles, writeBundle } from "@/features/companies/data/mock/store";
import { computeSummary, computeUsage, cyclePrice, monthlyEquivalent, planFor, type DerivationContext } from "@/features/companies/data/selectors";
import { PLAN_CATALOGUE, STAFF } from "@/features/companies/data/mock/dataset";
import { nowIso, platformNow } from "@/features/companies/data/clock";
import type { CompanyBundle, UsageResource } from "@/features/companies/data/types";
import type { Plan, PlanTier, QuotaMetric } from "@/types/domain/plan";
import type { BillingCycle } from "@/types/domain/subscription";
import { platformPlanFromPlan } from "./catalogue";
import type {
  CompanyEntitlementOverride,
  EffectiveCompanyEntitlement,
  PlatformPlan,
  SubscriptionAttentionItem,
  SubscriptionCapability,
  SubscriptionLifecycleEvent,
  SubscriptionPolicy,
  SubscriptionRow,
  SubscriptionScheduledChange,
} from "./types";

const DAY_MS = 86_400_000;
const ACTOR = { id: "stf_001", name: "Ananya Rao" };
const PLAN_STORAGE_KEY = "omni.plans-subscriptions.plans.v1";

function addDays(iso: string, days: number) {
  return new Date(Date.parse(iso) + days * DAY_MS).toISOString();
}

function ctx(plans: Plan[]): DerivationContext {
  return { now: platformNow(), plans, staff: STAFF };
}

function uid(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.round(Math.random() * 9999)}`;
}

function readPlans(): PlatformPlan[] {
  const base = PLAN_CATALOGUE.map(platformPlanFromPlan);
  if (typeof window === "undefined") return base;
  try {
    const raw = window.sessionStorage.getItem(PLAN_STORAGE_KEY);
    if (!raw) return base;
    const parsed = JSON.parse(raw) as { plans?: PlatformPlan[] };
    return Array.isArray(parsed.plans) ? parsed.plans : base;
  } catch {
    return base;
  }
}

function persistPlans(plans: PlatformPlan[]): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(PLAN_STORAGE_KEY, JSON.stringify({ plans }));
  } catch {
    // Demo persistence is best-effort; in-memory state still works.
  }
}

export const DEFAULT_POLICY: SubscriptionPolicy = {
  defaultTrialDays: 14,
  trialExtensionLimitDays: 30,
  trialReminderDays: [7, 3, 1],
  defaultTrialPlan: "growth",
  allowTrialWithoutPaymentMethod: true,
  defaultBillingCycle: "monthly",
  renewalReminderDays: [14, 7, 1],
  gracePeriodDays: 7,
  failedPaymentHandling: "manual_review",
  defaultCancellationTiming: "end_of_term",
  reactivationWindowDays: 30,
  overLimitHandling: {
    users: "block_new_creation",
    clients: "block_new_creation",
    connectedAccounts: "require_upgrade",
    aiCredits: "temporary_grace_period",
    automationRuns: "temporary_grace_period",
    scheduledPosts: "require_upgrade",
    reports: "require_upgrade",
    apiRequests: "temporary_grace_period",
    storage: "require_upgrade",
  },
};

const CAPABILITIES: SubscriptionCapability = {
  canViewPlans: true,
  canCreatePlan: true,
  canEditDraftPlan: true,
  canPublishPlan: true,
  canRetirePlan: true,
  canViewSubscriptions: true,
  canChangeCompanyPlan: true,
  canManageTrials: true,
  canScheduleCancellation: true,
  canReactivateSubscription: true,
  canManageEntitlementOverrides: true,
  canViewSubscriptionActivity: true,
  canManageSubscriptionPolicies: true,
  canExportSubscriptions: true,
};

function rows(plans: PlatformPlan[], bundles: CompanyBundle[]): SubscriptionRow[] {
  const derivation = ctx(plans);
  return bundles.map((bundle) => {
    const plan = planFor(derivation, bundle.subscription.planTier);
    const usage = computeUsage(derivation, bundle);
    const recurringMinor = cyclePrice(plan, bundle.subscription.billingCycle);
    const mrrMinor = monthlyEquivalent(plan, bundle.subscription.billingCycle);
    const risk = usage.exceeded.length > 0 ? "over_limit" : usage.nearLimit.length > 0 ? "near_limit" : "ok";
    return {
      id: bundle.subscription.id,
      companyId: bundle.company.id,
      companyName: bundle.company.name,
      planTier: bundle.subscription.planTier,
      planName: plan.name,
      planVersionId: `${plan.id}_v1`,
      billingCycle: bundle.subscription.billingCycle,
      status: bundle.subscription.status,
      currency: plan.currency,
      recurringMinor,
      mrrMinor: ["active", "past_due", "scheduled_cancellation"].includes(bundle.subscription.status) ? mrrMinor : 0,
      renewsAt: bundle.subscription.renewsAt,
      trialEndsAt: bundle.subscription.trialEndsAt,
      scheduledCancellationAt: bundle.subscription.scheduledCancellationAt,
      scheduledChange: bundle.subscription.scheduledChange,
      paymentMethodLabel: bundle.subscription.paymentMethod ? `${bundle.subscription.paymentMethod.brand} ${bundle.subscription.paymentMethod.last4}` : "No payment method",
      usageRisk: risk,
    };
  });
}

function scheduledChanges(plans: PlatformPlan[], bundles: CompanyBundle[]): SubscriptionScheduledChange[] {
  const out: SubscriptionScheduledChange[] = [];
  for (const bundle of bundles) {
    const current = plans.find((plan) => plan.tier === bundle.subscription.planTier);
    if (bundle.subscription.scheduledChange) {
      const next = plans.find((plan) => plan.tier === bundle.subscription.scheduledChange?.planTier);
      out.push({
        id: `chg_${bundle.subscription.id}`,
        companyId: bundle.company.id,
        companyName: bundle.company.name,
        kind: current && next && next.monthlyPriceMinor < current.monthlyPriceMinor ? "downgrade" : "upgrade",
        label: `Move to ${next?.name ?? "selected plan"} (${bundle.subscription.scheduledChange.billingCycle})`,
        effectiveAt: bundle.subscription.scheduledChange.effectiveAt,
        status: "scheduled",
      });
    }
    if (bundle.subscription.scheduledCancellationAt) {
      out.push({ id: `cnl_${bundle.subscription.id}`, companyId: bundle.company.id, companyName: bundle.company.name, kind: "cancellation", label: "Cancellation at period end", effectiveAt: bundle.subscription.scheduledCancellationAt, status: "scheduled" });
    }
    for (const override of bundle.overrides) {
      out.push({ id: `ovx_${override.id}`, companyId: bundle.company.id, companyName: bundle.company.name, kind: "override_expiry", label: `${override.resource} override expires`, effectiveAt: override.expiresAt, status: Date.parse(override.expiresAt) < platformNow() ? "failed" : "scheduled" });
    }
  }
  return out.sort((a, b) => Date.parse(a.effectiveAt) - Date.parse(b.effectiveAt));
}

function attention(plans: PlatformPlan[], bundles: CompanyBundle[]): SubscriptionAttentionItem[] {
  const derivation = ctx(plans);
  return bundles.flatMap((bundle) => {
    const usage = computeUsage(derivation, bundle);
    const items: SubscriptionAttentionItem[] = [];
    if (bundle.subscription.status === "past_due") items.push({ id: `att_due_${bundle.company.id}`, severity: "critical", companyId: bundle.company.id, companyName: bundle.company.name, issue: "Subscription is past due", dueAt: bundle.subscription.renewsAt, action: "review_billing" });
    if (bundle.subscription.status === "trialing" && bundle.subscription.trialEndsAt && Date.parse(bundle.subscription.trialEndsAt) - platformNow() < 7 * DAY_MS) items.push({ id: `att_trial_${bundle.company.id}`, severity: "warning", companyId: bundle.company.id, companyName: bundle.company.name, issue: "Trial ends soon", dueAt: bundle.subscription.trialEndsAt, action: "open_subscription" });
    if (!plans.some((plan) => plan.tier === bundle.subscription.planTier)) items.push({ id: `att_plan_${bundle.company.id}`, severity: "critical", companyId: bundle.company.id, companyName: bundle.company.name, issue: "Missing valid plan reference", dueAt: nowIso(), action: "open_subscription" });
    for (const record of usage.exceeded) items.push({ id: `att_usage_${bundle.company.id}_${record.resource}`, severity: "critical", companyId: bundle.company.id, companyName: bundle.company.name, issue: `${record.resource} above effective limit`, dueAt: record.updatedAt, action: "review_usage" });
    for (const override of bundle.overrides.filter((item) => Date.parse(item.expiresAt) < platformNow())) items.push({ id: `att_ovr_${override.id}`, severity: "warning", companyId: bundle.company.id, companyName: bundle.company.name, issue: `Expired temporary ${override.resource} override`, dueAt: override.expiresAt, action: "open_subscription" });
    if (bundle.subscription.scheduledCancellationAt) items.push({ id: `att_cancel_${bundle.company.id}`, severity: "info", companyId: bundle.company.id, companyName: bundle.company.name, issue: "Cancellation is scheduled", dueAt: bundle.subscription.scheduledCancellationAt, action: "open_subscription" });
    return items;
  }).sort((a, b) => Date.parse(a.dueAt) - Date.parse(b.dueAt));
}

function activity(bundles: CompanyBundle[]): SubscriptionLifecycleEvent[] {
  return bundles.flatMap((bundle) => bundle.activity.filter((entry) => entry.module === "subscription" || entry.module === "usage").map((entry) => ({
    id: entry.id,
    companyId: bundle.company.id,
    companyName: bundle.company.name,
    action: entry.summary,
    actor: entry.actor.name,
    at: entry.at,
    result: entry.result,
  }))).sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
}

export function resolveEffectiveEntitlements(plan: Plan, overrides: CompanyEntitlementOverride[], status: string, evaluationDate: string): EffectiveCompanyEntitlement[] {
  const inactive = ["cancelled", "expired"].includes(status);
  const map: Array<{ resource: UsageResource; metric: QuotaMetric }> = [
    { resource: "clients", metric: "Clients" },
    { resource: "users", metric: "users" },
    { resource: "connectedAccounts", metric: "channels" },
    { resource: "aiCredits", metric: "aiCredits" },
    { resource: "automationRuns", metric: "automationRuns" },
    { resource: "reports", metric: "reports" },
    { resource: "apiRequests", metric: "apiCalls" },
    { resource: "storage", metric: "storageGb" },
  ];
  const time = Date.parse(evaluationDate);
  return map.map(({ resource, metric }) => {
    const baseLimit = plan.limits[metric];
    const override = overrides.find((item) => item.resource === resource && Date.parse(item.startsAt) <= time && Date.parse(item.expiresAt) >= time) ?? null;
    const effectiveLimit = inactive ? 0 : !override ? baseLimit : override.rule === "absolute" ? override.value : baseLimit === null ? null : baseLimit + override.value;
    return { resource, baseLimit, effectiveLimit, override, ruleApplied: inactive ? "inactive subscription" : !override ? "base" : override.rule === "absolute" ? "absolute replacement" : "additive increase" };
  });
}

interface State {
  plans: PlatformPlan[];
  bundles: CompanyBundle[];
  policy: SubscriptionPolicy;
  capabilities: SubscriptionCapability;
  createPlan(input: { name: string; code: string; description: string; monthly: number; annual: number; trialDays: number; publish: boolean }): void;
  publishPlan(planId: string): void;
  retirePlan(planId: string): void;
  createVersion(planId: string, clientLimit: number): void;
  changePlan(companyId: string, planTier: PlanTier, billingCycle: BillingCycle, effective: "immediately" | "next_renewal"): void;
  extendTrial(companyId: string, days: number): void;
  scheduleCancellation(companyId: string): void;
  undoCancellation(companyId: string): void;
  createOverride(companyId: string, resource: UsageResource, value: number, days: number): void;
  removeOverride(companyId: string, overrideId: string): void;
  savePolicy(policy: SubscriptionPolicy): void;
}

const Context = createContext<State | null>(null);

export function PlansSubscriptionsProvider({ children }: { children: ReactNode }) {
  const [plans, setPlansState] = useState<PlatformPlan[]>(readPlans);
  const [version, setVersion] = useState(0);
  const [policy, setPolicy] = useState(DEFAULT_POLICY);
  const bundles = useMemo(() => allBundles(), [version]);

  const setPlans = (update: (current: PlatformPlan[]) => PlatformPlan[]) => {
    setPlansState((current) => {
      const next = update(current);
      persistPlans(next);
      return next;
    });
  };

  const mutateBundle = (companyId: string, update: (bundle: CompanyBundle) => CompanyBundle) => {
    const bundle = allBundles().find((item) => item.company.id === companyId);
    if (!bundle) return;
    const next = update(bundle);
    writeBundle(next);
    setVersion((value) => value + 1);
  };

  const state: State = {
    plans,
    bundles,
    policy,
    capabilities: CAPABILITIES,
    createPlan(input) {
      const id = `plan_${input.code.toLowerCase()}`;
      const base: Plan = { id, tier: input.code.toLowerCase() as PlanTier, name: input.name, description: input.description, isPublic: input.publish, isArchived: false, monthlyPriceMinor: input.monthly * 100, annualPriceMinor: input.annual * 100, currency: "INR", trialDays: input.trialDays, limits: { Clients: 3, users: 6, channels: 10, seoPages: 2500, aiCredits: 8000, automationRuns: 2000, storageGb: 25, reports: 20, whatsappMessages: 5000, apiCalls: 100000 }, features: ["Omnichannel publisher", "SEO site audit"], subscriberCount: 0, updatedAt: nowIso() };
      setPlans((current) => [{ ...platformPlanFromPlan(base), publicationStatus: input.publish ? "published" : "draft" }, ...current]);
    },
    publishPlan(planId) {
      setPlans((current) => current.map((plan) => plan.id === planId ? { ...plan, publicationStatus: "published", isPublic: true, updatedAt: nowIso(), versions: plan.versions.map((version, index) => index === 0 ? { ...version, status: "published", publishedAt: nowIso() } : version) } : plan));
    },
    retirePlan(planId) {
      setPlans((current) => current.map((plan) => plan.id === planId ? { ...plan, publicationStatus: "retired", isArchived: true, isPublic: false, updatedAt: nowIso() } : plan));
    },
    createVersion(planId, clientLimit) {
      setPlans((current) => current.map((plan) => {
        if (plan.id !== planId) return plan;
        const currentVersion = plan.versions[0]!;
        const limits = currentVersion.limits.map((limit) => limit.key === "Clients" ? { ...limit, value: clientLimit } : limit);
        return { ...plan, limits: { ...plan.limits, Clients: clientLimit }, updatedAt: nowIso(), versions: [{ ...currentVersion, id: `${plan.id}_v${plan.versions.length + 1}`, version: plan.versions.length + 1, status: "draft", publishedAt: null, limits, note: "Draft version created for impact review." }, ...plan.versions] };
      }));
    },
    changePlan(companyId, planTier, billingCycle, effective) {
      mutateBundle(companyId, (bundle) => {
        const old = bundle.subscription;
        const sub = effective === "immediately" ? { ...old, planTier, billingCycle, scheduledChange: null } : { ...old, scheduledChange: { planTier, billingCycle, effectiveAt: old.renewsAt } };
        return { ...bundle, subscription: sub, activity: [{ id: uid("act"), companyId, at: nowIso(), actor: { ...ACTOR, type: "staff" }, action: effective === "immediately" ? "subscription.plan_changed" : "subscription.plan_change_scheduled", summary: effective === "immediately" ? "Plan changed in demo state" : "Plan change scheduled in demo state", module: "subscription", entity: { type: "subscription", id: old.id, label: String(planTier) }, severity: "info", result: "success", previousValue: old.planTier, newValue: planTier, reason: "Plans & Subscriptions module demo action", correlationId: uid("req") }, ...bundle.activity] };
      });
    },
    extendTrial(companyId, days) {
      mutateBundle(companyId, (bundle) => ({ ...bundle, subscription: { ...bundle.subscription, trialEndsAt: addDays(bundle.subscription.trialEndsAt ?? nowIso(), days), renewsAt: addDays(bundle.subscription.renewsAt, days) } }));
    },
    scheduleCancellation(companyId) {
      mutateBundle(companyId, (bundle) => ({ ...bundle, subscription: { ...bundle.subscription, status: "scheduled_cancellation", scheduledCancellationAt: bundle.subscription.trialEndsAt ?? bundle.subscription.renewsAt, cancelledAt: nowIso(), scheduledChange: null } }));
    },
    undoCancellation(companyId) {
      mutateBundle(companyId, (bundle) => ({ ...bundle, subscription: { ...bundle.subscription, status: bundle.subscription.trialEndsAt ? "trialing" : "active", scheduledCancellationAt: null, cancelledAt: null } }));
    },
    createOverride(companyId, resource, value, days) {
      mutateBundle(companyId, (bundle) => ({ ...bundle, overrides: [{ id: uid("ovr"), companyId, resource, baseLimit: null, overrideLimit: value, reason: "Approved from Plans & Subscriptions demo control center.", startsAt: nowIso(), expiresAt: addDays(nowIso(), days), approvedBy: ACTOR.name, createdAt: nowIso() }, ...bundle.overrides] }));
    },
    removeOverride(companyId, overrideId) {
      mutateBundle(companyId, (bundle) => ({ ...bundle, overrides: bundle.overrides.filter((override) => override.id !== overrideId) }));
    },
    savePolicy(next) {
      setPolicy(next);
    },
  };

  return <Context.Provider value={state}>{children}</Context.Provider>;
}

export function usePlansSubscriptions() {
  const state = useContext(Context);
  if (!state) throw new Error("usePlansSubscriptions must be used inside PlansSubscriptionsProvider");
  const subscriptionRows = rows(state.plans, state.bundles);
  return {
    ...state,
    subscriptionRows,
    attention: attention(state.plans, state.bundles),
    scheduledChanges: scheduledChanges(state.plans, state.bundles),
    activity: activity(state.bundles),
    summaries: state.bundles.map((bundle) => computeSummary(ctx(state.plans), bundle)),
  };
}
