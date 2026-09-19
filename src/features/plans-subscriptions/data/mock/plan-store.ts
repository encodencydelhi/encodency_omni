/**
 * The shared commercial state: platform plans (with their versions), the
 * subscription policy and the plan activity trail.
 *
 * Subscriptions themselves are not here - they live in the company bundles the
 * Companies module already owns, so a plan change made in either module is one
 * change. This store is what makes the plan catalogue mutable and shared: the
 * Companies module resolves prices and limits through the views exported below,
 * and a published version is an immutable snapshot each subscription is pinned to.
 *
 * Like the company store, it is rebuilt deterministically on load and only
 * written to sessionStorage once something was changed.
 */
import { PLAN_CATALOGUE } from "@/features/companies/data/mock/dataset";
import type { Plan, QuotaLimits } from "@/types/domain/plan";
import { ApiError } from "@/types/api";
import { FEATURES, RESOURCES, ruleToLimit } from "../catalogue";
import { SESSION_STORAGE_KEYS } from "../config";
import { DEFAULT_POLICY } from "../policies";
import type { LimitRule, PlanActivity, PlanAvailability, PlanVersion, PlatformPlan, ResourceKey, SubscriptionPolicy } from "../types";

const DAY_MS = 86_400_000;

interface State {
  plans: PlatformPlan[];
  policy: SubscriptionPolicy;
  activity: PlanActivity[];
  seq: number;
}

interface Persisted extends State {
  v: 1;
}

/* ------------------------------------------------------------------ */
/* Seed                                                                */
/* ------------------------------------------------------------------ */

const SEED_FEATURES: Record<string, string[]> = {
  starter: ["omnichannel_publisher", "lead_inbox", "seo_audit", "website_monitoring", "channel_meta", "channel_linkedin", "channel_google_business", "ga4_reporting"],
  growth: [
    "multiple_clients", "omnichannel_publisher", "approval_workflows", "campaign_attribution", "lead_inbox",
    "channel_meta", "channel_linkedin", "channel_google_business", "channel_whatsapp",
    "ai_assistant", "automation_engine", "seo_audit", "website_monitoring", "keyword_tracking", "gsc_reporting", "ga4_reporting", "api_access",
  ],
  agency: [
    "multiple_clients", "custom_branding", "omnichannel_publisher", "approval_workflows", "campaign_attribution", "lead_inbox",
    "channel_meta", "channel_linkedin", "channel_google_business", "channel_whatsapp", "channel_youtube",
    "ai_assistant", "automation_engine", "advanced_conditions", "seo_audit", "website_monitoring", "keyword_tracking", "gsc_reporting", "ga4_reporting",
    "client_permissions", "extended_audit", "priority_support", "api_access", "webhooks",
  ],
  enterprise: FEATURES.map((item) => item.key),
};

const SEGMENT: Record<string, string> = {
  starter: "Individual brands",
  growth: "Growing brand teams",
  agency: "Marketing agencies",
  enterprise: "Enterprise and strategic accounts",
};

function rulesFromLimits(limits: QuotaLimits, tier: string): Record<ResourceKey, LimitRule> {
  const rules = {} as Record<ResourceKey, LimitRule>;
  for (const def of RESOURCES) {
    const value = limits[def.key];
    rules[def.key] =
      value === null ? { kind: "unlimited", value: null } : value === 0 ? { kind: "none", value: null } : { kind: tier === "enterprise" ? "custom" : "fixed", value };
  }
  return rules;
}

function seedPlan(plan: Plan): PlatformPlan {
  const createdAt = new Date(Date.parse(plan.updatedAt) - 60 * DAY_MS).toISOString();
  const enabled = new Set(SEED_FEATURES[plan.tier] ?? []);
  const version: PlanVersion = {
    id: `${plan.id}_v1`,
    planId: plan.id,
    version: 1,
    status: "published",
    price: {
      currency: plan.currency,
      monthlyMinor: plan.monthlyPriceMinor,
      annualMinor: plan.annualPriceMinor,
      setupFeeMinor: 0,
      trialDays: plan.trialDays,
      notes: "Demo configuration - not an approved commercial decision.",
    },
    features: Object.fromEntries(FEATURES.map((item) => [item.key, enabled.has(item.key)])),
    limits: rulesFromLimits(plan.limits, plan.tier),
    createdAt,
    createdBy: "Aditya Raghunath",
    publishedAt: plan.updatedAt,
    publishedBy: "Aditya Raghunath",
    rollout: null,
    changeSummary: ["Initial version"],
    legacyFeatureLabels: plan.features,
  };
  const availability: PlanAvailability = {
    newPurchase: !plan.isArchived,
    upgrade: !plan.isArchived,
    downgrade: !plan.isArchived,
    visibility: plan.isPublic ? "public" : "invite_only",
    currencies: [plan.currency],
  };
  return {
    id: plan.id,
    key: plan.tier,
    name: plan.name,
    internalCode: plan.tier.toUpperCase(),
    description: plan.description,
    targetSegment: SEGMENT[plan.tier] ?? "General",
    internalNotes: "",
    status: plan.isArchived ? "retired" : "published",
    availability,
    versions: [version],
    createdAt,
    updatedAt: plan.updatedAt,
    updatedBy: "Aditya Raghunath",
  };
}

function buildSeed(): State {
  const plans = PLAN_CATALOGUE.map(seedPlan);
  const activity: PlanActivity[] = plans.map((plan, index) => ({
    id: `pact_seed_${index + 1}`,
    at: plan.updatedAt,
    actor: "Aditya Raghunath",
    action: "plan.published",
    summary: `${plan.name} version 1 was published`,
    planId: plan.id,
    result: "success",
    previousValue: null,
    newValue: "Version 1",
  }));
  return { plans, policy: structuredClone(DEFAULT_POLICY), activity: activity.sort((a, b) => Date.parse(b.at) - Date.parse(a.at)), seq: 0 };
}

/* ------------------------------------------------------------------ */
/* Persistence                                                         */
/* ------------------------------------------------------------------ */

let state: State | null = null;

function readPersisted(): Persisted | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(SESSION_STORAGE_KEYS.planState);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Persisted;
    return parsed.v === 1 ? parsed : null;
  } catch {
    return null;
  }
}

function persist(current: State): void {
  if (typeof window === "undefined") return;
  try {
    const payload: Persisted = { v: 1, ...current };
    window.sessionStorage.setItem(SESSION_STORAGE_KEYS.planState, JSON.stringify(payload));
  } catch {
    // Storage can be unavailable or full; the demo keeps working in memory.
  }
}

function getState(): State {
  if (state) return state;
  const saved = readPersisted();
  state = saved ? { plans: saved.plans, policy: saved.policy, activity: saved.activity, seq: saved.seq } : buildSeed();
  return state;
}

export function resetPlanState(): void {
  if (typeof window !== "undefined") {
    try {
      window.sessionStorage.removeItem(SESSION_STORAGE_KEYS.planState);
    } catch {
      // ignore
    }
  }
  state = null;
}

/* ------------------------------------------------------------------ */
/* Reads and writes                                                    */
/* ------------------------------------------------------------------ */

export function listPlans(): PlatformPlan[] {
  return getState().plans;
}

export function findPlan(idOrKey: string): PlatformPlan | undefined {
  return getState().plans.find((plan) => plan.id === idOrKey || plan.key === idOrKey);
}

export function requirePlan(idOrKey: string): PlatformPlan {
  const plan = findPlan(idOrKey);
  if (!plan) throw new ApiError({ code: "NOT_FOUND", status: 404, message: `Plan ${idOrKey} was not found.` });
  return plan;
}

export function writePlan(plan: PlatformPlan): void {
  const current = getState();
  current.plans = current.plans.some((item) => item.id === plan.id) ? current.plans.map((item) => (item.id === plan.id ? plan : item)) : [...current.plans, plan];
  persist(current);
}

export function getPolicy(): SubscriptionPolicy {
  return getState().policy;
}

export function writePolicy(policy: SubscriptionPolicy): void {
  const current = getState();
  current.policy = policy;
  persist(current);
}

export function listPlanActivity(): PlanActivity[] {
  return getState().activity;
}

export function nextSeq(): number {
  const current = getState();
  current.seq += 1;
  return current.seq;
}

export function recordPlanActivity(entry: Omit<PlanActivity, "id">): void {
  const current = getState();
  const id = `pact_${String(nextSeq()).padStart(4, "0")}`;
  current.activity = [{ id, ...entry }, ...current.activity];
  persist(current);
}

/* ------------------------------------------------------------------ */
/* Versions                                                            */
/* ------------------------------------------------------------------ */

export function currentVersion(plan: PlatformPlan): PlanVersion | null {
  return [...plan.versions].filter((item) => item.status === "published").sort((a, b) => b.version - a.version)[0] ?? null;
}

export function draftVersion(plan: PlatformPlan): PlanVersion | null {
  return plan.versions.find((item) => item.status === "draft") ?? null;
}

/** The version a new subscription to this plan is pinned to. */
export function versionNumber(key: string): number {
  const plan = findPlan(key);
  return (plan && currentVersion(plan)?.version) ?? 1;
}

/* ------------------------------------------------------------------ */
/* Plan-shaped views consumed by the Companies derivations              */
/* ------------------------------------------------------------------ */

export function limitsOf(version: PlanVersion): QuotaLimits {
  const limits = {} as QuotaLimits;
  for (const def of RESOURCES) limits[def.key] = ruleToLimit(version.limits[def.key] ?? { kind: "none", value: null });
  return limits;
}

export function versionToPlan(plan: PlatformPlan, version: PlanVersion): Plan {
  return {
    id: plan.id,
    tier: plan.key,
    name: plan.name,
    description: plan.description,
    isPublic: plan.availability.visibility === "public" && plan.status === "published",
    isArchived: plan.status === "retired",
    monthlyPriceMinor: version.price.monthlyMinor,
    annualPriceMinor: version.price.annualMinor,
    currency: version.price.currency,
    trialDays: version.price.trialDays,
    limits: limitsOf(version),
    features: version.legacyFeatureLabels ?? FEATURES.filter((item) => version.features[item.key]).map((item) => item.name),
    subscriberCount: 0,
    updatedAt: version.publishedAt ?? plan.updatedAt,
  };
}

/** Every plan a subscription could reference: anything with a published version, retired plans included. */
export function livePlanViews(): Plan[] {
  return getState().plans.flatMap((plan) => {
    const version = currentVersion(plan);
    return version ? [versionToPlan(plan, version)] : [];
  });
}

/** The plan as it read at a specific version - what a pinned subscription is entitled to. */
export function planVersionView(key: string, version: number): Plan | undefined {
  const plan = findPlan(key);
  const found = plan?.versions.find((item) => item.version === version && item.status !== "draft");
  return plan && found ? versionToPlan(plan, found) : undefined;
}

/** Plans a company may be moved to or bought today. */
export function selectablePlanViews(mode: "new" | "upgrade" | "downgrade" | "any" = "any"): Plan[] {
  return getState().plans.flatMap((plan) => {
    const version = currentVersion(plan);
    if (!version || plan.status !== "published") return [];
    if (mode === "new" && !plan.availability.newPurchase) return [];
    if (mode === "upgrade" && !plan.availability.upgrade) return [];
    if (mode === "downgrade" && !plan.availability.downgrade) return [];
    return [versionToPlan(plan, version)];
  });
}

/** What the Companies derivations need to price and limit a subscription at its pinned version. */
export function commercialContext() {
  return { plans: livePlanViews() as readonly Plan[], planVersions: planVersionView };
}
