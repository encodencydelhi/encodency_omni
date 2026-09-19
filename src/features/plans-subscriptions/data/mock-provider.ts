/**
 * Demo implementation of `PlansRepository`.
 *
 * Plans and versions live in the shared plan store; subscriptions, usage and
 * activity live in the company bundles. Company-level lifecycle changes are made
 * through the Companies repository - the same code path the company's own
 * Subscription tab uses - after this layer checks the plan rules and the
 * subscription policy. It behaves like a remote service (asynchronous, throws
 * `ApiError`) and never claims more than it did: no payment is collected, no
 * invoice leaves the building, no scheduled job runs.
 *
 * Only `repository.ts` imports this file.
 */
import { env } from "@/config/env";
import { ApiError } from "@/types/api";
import { nowIso, platformNow } from "@/features/companies/data/clock";
import { companiesRepository } from "@/features/companies/data/repository";
import { allBundles, resetDemoState } from "@/features/companies/data/mock/store";
import { monthlyEquivalent, planForSubscription, type DerivationContext } from "@/features/companies/data/selectors";
import { STAFF } from "@/features/companies/data/mock/dataset";
import { RESOURCES } from "./catalogue";
import { MAX_TRIAL_EXTENSION_DAYS } from "./config";
import {
  commercialContext,
  currentVersion,
  draftVersion,
  findPlan,
  getPolicy,
  listPlanActivity,
  listPlans,
  recordPlanActivity,
  requirePlan,
  writePlan,
  writePolicy,
} from "./mock/plan-store";
import { validatePolicy } from "./policies";
import type { PlanDetailData, PlanListResult, PlansRepository, SubscriptionFacets } from "./repository";
import {
  applySubscriptionQuery,
  buildAttention,
  buildScheduledChanges,
  buildSubscriptionDetail,
  buildSubscriptionRows,
  buildTrials,
  computeAdoption,
  computePlanChangeImpact,
  computePlanSummaries,
  computePlansPortfolio,
  computeSubscriptionPortfolio,
  computeTrend,
  computeVersionImpact,
  draftInputOf,
  allSubscriptionEvents,
  filterPlans,
  filterSubscriptions,
  isCurrentStatus,
  sortSubscriptions,
  validatePlanConfig,
} from "./selectors";
import type {
  CreatePlanInput,
  MutationActor,
  OverviewData,
  PlanActivity,
  PlanAvailability,
  PlanChoice,
  PlanSummary,
  PlanVersion,
  PlatformPlan,
  SubscriptionDetail,
  SubscriptionEvent,
  SubscriptionListQuery,
} from "./types";

/* ------------------------------------------------------------------ */
/* Plumbing                                                            */
/* ------------------------------------------------------------------ */

function wait(kind: "read" | "write"): Promise<void> {
  const base = kind === "read" ? env.mockLatencyMs * 0.6 : env.mockLatencyMs * 1.1;
  return new Promise((resolve) => setTimeout(resolve, Math.round(base)));
}

function context(): DerivationContext {
  return { now: platformNow(), staff: STAFF, ...commercialContext() };
}

function fail(code: ConstructorParameters<typeof ApiError>[0]["code"], message: string, fieldErrors?: Record<string, string>): never {
  const status = code === "NOT_FOUND" ? 404 : code === "FORBIDDEN" ? 403 : code === "CONFLICT" ? 409 : 422;
  throw new ApiError({ code, status, message, fieldErrors });
}

function locate(subscriptionId: string) {
  const bundle = allBundles().find((item) => item.subscription.id === subscriptionId);
  if (!bundle) return fail("NOT_FOUND", `Subscription ${subscriptionId} was not found.`);
  return bundle;
}

function rows() {
  const ctx = context();
  return { ctx, bundles: allBundles(), plans: listPlans(), rows: buildSubscriptionRows(ctx, allBundles(), listPlans()) };
}

function summaries(): PlanSummary[] {
  const { plans, rows: all } = rows();
  return computePlanSummaries(plans, all);
}

function summaryOf(planId: string): PlanSummary {
  const plan = requirePlan(planId);
  const found = summaries().find((item) => item.plan.id === plan.id);
  if (!found) return fail("NOT_FOUND", `Plan ${planId} was not found.`);
  return found;
}

function detailOf(subscriptionId: string): SubscriptionDetail {
  const ctx = context();
  const bundle = locate(subscriptionId);
  const plans = listPlans();
  const scheduled = buildScheduledChanges(ctx, [bundle], plans);
  return buildSubscriptionDetail(ctx, bundle, plans, getPolicy(), scheduled);
}

function slugCode(code: string): string {
  return code.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_");
}

function versionId(planId: string, version: number): string {
  return `${planId}_v${version}`;
}

function planEvent(entry: PlanActivity): SubscriptionEvent {
  return {
    id: entry.id,
    company: null,
    subscriptionId: null,
    planId: entry.planId,
    at: entry.at,
    action: entry.action,
    summary: entry.summary,
    actor: entry.actor,
    previousValue: entry.previousValue,
    newValue: entry.newValue,
    reason: null,
    result: entry.result,
    module: "plans",
  };
}

function log(actor: MutationActor, planId: string | null, action: string, summary: string, previousValue: string | null = null, newValue: string | null = null): void {
  recordPlanActivity({ at: nowIso(), actor: actor.name, action, summary, planId, result: "success", previousValue, newValue });
}

/** Turns validation issues into an ApiError so forms can show them against their fields. */
function failInvalid(issues: ReturnType<typeof validatePlanConfig>, message: string): never {
  const errors = issues.filter((issue) => issue.severity === "error");
  const fieldErrors: Record<string, string> = {};
  for (const issue of errors) fieldErrors[issue.field] ??= issue.message;
  return fail("VALIDATION_FAILED", `${message} ${errors.length} problem${errors.length === 1 ? "" : "s"} to fix.`, fieldErrors);
}

function codesExcept(planId?: string): string[] {
  return listPlans().filter((plan) => plan.id !== planId).map((plan) => plan.internalCode);
}

function subscriptionsOnPlan(plan: PlatformPlan) {
  return allBundles().filter((bundle) => bundle.subscription.planTier === plan.key && isCurrentStatus(bundle.subscription.status));
}

/* ------------------------------------------------------------------ */
/* Provider                                                            */
/* ------------------------------------------------------------------ */

export const mockPlansProvider: PlansRepository = {
  mode: "mock",

  /* ----------------------------- reads ----------------------------- */

  async getOverview(): Promise<OverviewData> {
    await wait("read");
    const { ctx, bundles, plans, rows: all } = rows();
    const plansSummary = computePlanSummaries(plans, all);
    const scheduled = buildScheduledChanges(ctx, bundles, plans);
    const attention = buildAttention(ctx, bundles, all, scheduled);
    const trials = buildTrials(ctx, bundles, all);
    const activity = [...allSubscriptionEvents(bundles), ...listPlanActivity().map(planEvent)].sort((a, b) => Date.parse(b.at) - Date.parse(a.at)).slice(0, 8);
    const portfolio = computeSubscriptionPortfolio(all, ctx.now, attention.length);

    return {
      portfolio,
      plans: computePlansPortfolio(plansSummary),
      adoption: computeAdoption(plansSummary),
      attention: attention.slice(0, 8),
      upcoming: scheduled.slice(0, 6),
      activity,
      endingTrials: trials.filter((trial) => trial.state === "ending_soon" || trial.state === "expired").slice(0, 5),
    };
  },

  async getTrend(metric, period) {
    await wait("read");
    return computeTrend(context(), allBundles(), metric, period);
  },

  async listPlans(query): Promise<PlanListResult> {
    await wait("read");
    const all = summaries();
    return { summaries: filterPlans(all, query), portfolio: computePlansPortfolio(all) };
  },

  async getPlan(id): Promise<PlanDetailData> {
    await wait("read");
    const summary = summaryOf(id);
    const subscribersByVersion: Record<number, number> = {};
    for (const bundle of subscriptionsOnPlan(summary.plan)) {
      const version = bundle.subscription.planVersion ?? 1;
      subscribersByVersion[version] = (subscribersByVersion[version] ?? 0) + 1;
    }
    return { summary, activity: listPlanActivity().filter((entry) => entry.planId === summary.plan.id), subscribersByVersion };
  },

  async getComparison() {
    await wait("read");
    return summaries().filter((item) => item.plan.status !== "retired" && (item.current || item.draft));
  },

  async previewImpact(planId, input) {
    await wait("read");
    const plan = requirePlan(planId);
    const highest = Math.max(0, ...plan.versions.map((item) => item.version));
    const draft = draftVersion(plan);
    return computeVersionImpact(context(), plan, { price: input.price, features: input.features, limits: input.limits, version: draft?.version ?? highest + 1 }, allBundles());
  },

  async validatePlan(input, planId) {
    await wait("read");
    const self = planId ? findPlan(planId) : undefined;
    return validatePlanConfig(input, codesExcept(planId), { selfCode: self?.internalCode });
  },

  async listCompaniesOnPlan(planId) {
    await wait("read");
    const plan = requirePlan(planId);
    return subscriptionsOnPlan(plan).map((bundle) => ({ id: bundle.company.id, name: bundle.company.name, planKey: bundle.subscription.planTier, version: bundle.subscription.planVersion ?? 1, subscriptionId: bundle.subscription.id }));
  },

  async listSubscriptions(query) {
    await wait("read");
    const { ctx, rows: all } = rows();
    return applySubscriptionQuery(all, query, ctx.now);
  },

  async exportSubscriptions(scope) {
    await wait("read");
    const { ctx, rows: all } = rows();
    if (scope.ids) return all.filter((row) => scope.ids?.includes(row.id));
    const q: SubscriptionListQuery = { ...(scope.query ?? {}), page: undefined, pageSize: undefined };
    return sortSubscriptions(filterSubscriptions(all, q, ctx.now), q.sort);
  },

  async getFacets(): Promise<SubscriptionFacets> {
    await wait("read");
    return {
      companies: allBundles().map((bundle) => ({ id: bundle.company.id, name: bundle.company.name })).sort((a, b) => a.name.localeCompare(b.name)),
      plans: listPlans().map((plan) => ({ key: plan.key, name: plan.name })),
    };
  },

  async getSubscription(id) {
    await wait("read");
    return detailOf(id);
  },

  async getPlanChangeImpact(subscriptionId, planKey, cycle) {
    await wait("read");
    return computePlanChangeImpact(context(), locate(subscriptionId), listPlans(), planKey, cycle, getPolicy());
  },

  async listSelectablePlans(subscriptionId) {
    await wait("read");
    const bundle = locate(subscriptionId);
    const ctx = context();
    const current = planForSubscription(ctx, bundle.subscription);
    const all = summaries().filter((item) => item.current);
    return all.map<PlanChoice>((summary) => {
      const isCurrent = summary.plan.key === bundle.subscription.planTier;
      const next = summary.current;
      let reason: string | null = null;
      if (!isCurrent) {
        if (summary.plan.status !== "published") reason = summary.plan.status === "retired" ? "Retired" : summary.plan.status === "hidden" ? "Hidden from new purchase" : "Not published";
        else if (next) {
          const rising = monthlyEquivalent({ ...current, monthlyPriceMinor: next.price.monthlyMinor, annualPriceMinor: next.price.annualMinor }, bundle.subscription.billingCycle) >= monthlyEquivalent(current, bundle.subscription.billingCycle);
          if (rising && !summary.plan.availability.upgrade) reason = "Not open for upgrades";
          else if (!rising && !summary.plan.availability.downgrade) reason = "Not open for downgrades";
        }
      }
      return { summary, isCurrent, eligible: reason === null, reason };
    });
  },

  async getTrials(query) {
    await wait("read");
    const { ctx, bundles, rows: all } = rows();
    const term = (query.search ?? "").trim().toLowerCase();
    return buildTrials(ctx, bundles, all).filter((trial) => {
      if (query.state === "ending_soon" && trial.state !== "ending_soon") return false;
      if (query.state && query.state !== "ending_soon" && trial.state !== query.state) return false;
      return !term || trial.company.name.toLowerCase().includes(term) || trial.planName.toLowerCase().includes(term);
    });
  },

  async getScheduledChanges() {
    await wait("read");
    const { ctx, bundles, plans } = rows();
    return buildScheduledChanges(ctx, bundles, plans);
  },

  async getRecentChanges() {
    await wait("read");
    return [...allSubscriptionEvents(allBundles()), ...listPlanActivity().map(planEvent)].sort((a, b) => Date.parse(b.at) - Date.parse(a.at)).slice(0, 200);
  },

  async getPolicy() {
    await wait("read");
    return structuredClone(getPolicy());
  },

  /* -------------------------- plan mutations -------------------------- */

  async createPlan(input: CreatePlanInput, actor) {
    await wait("write");
    const issues = validatePlanConfig(input, codesExcept());
    // A draft only needs an identity; publishing needs a complete, valid configuration.
    const blocking = input.intent === "published" ? issues.filter((issue) => issue.severity === "error") : issues.filter((issue) => issue.severity === "error" && ["name", "internalCode"].includes(issue.field));
    if (blocking.length > 0) failInvalid(blocking, input.intent === "published" ? "The plan cannot be published." : "The draft cannot be saved.");

    const key = slugCode(input.internalCode);
    if (findPlan(key)) fail("CONFLICT", "Another plan already uses this code.", { internalCode: "Another plan already uses this code." });
    const id = `plan_${key}`;
    const now = nowIso();
    const publish = input.intent === "published";
    const version: PlanVersion = {
      id: versionId(id, 1),
      planId: id,
      version: 1,
      status: publish ? "published" : "draft",
      price: { ...input.price },
      features: { ...input.features },
      limits: structuredClone(input.limits),
      createdAt: now,
      createdBy: actor.name,
      publishedAt: publish ? now : null,
      publishedBy: publish ? actor.name : null,
      rollout: null,
      changeSummary: ["Initial version"],
    };
    const plan: PlatformPlan = {
      id,
      key,
      name: input.name.trim(),
      internalCode: input.internalCode.trim(),
      description: input.description.trim(),
      targetSegment: input.targetSegment,
      internalNotes: input.internalNotes.trim(),
      status: publish ? "published" : "draft",
      availability: structuredClone(input.availability),
      versions: [version],
      createdAt: now,
      updatedAt: now,
      updatedBy: actor.name,
    };
    writePlan(plan);
    log(actor, id, publish ? "plan.published" : "plan.created", publish ? `${plan.name} was created and version 1 published` : `${plan.name} was saved as a draft (demo)`, null, publish ? "Published" : "Draft");
    return summaryOf(id);
  },

  async saveDraft(planId, input, actor) {
    await wait("write");
    const plan = requirePlan(planId);
    if (plan.status === "retired") fail("CONFLICT", `${plan.name} is retired and cannot be edited.`);
    const draft = draftVersion(plan);
    if (!draft) fail("CONFLICT", "This plan has no draft. Create a new version to edit a published plan.");
    const issues = validatePlanConfig(input, codesExcept(planId), { selfCode: plan.internalCode });
    const blocking = issues.filter((issue) => issue.severity === "error" && ["name", "internalCode"].includes(issue.field));
    if (blocking.length > 0) failInvalid(blocking, "The draft cannot be saved.");

    const liveDraftOnly = plan.status === "draft";
    const next: PlatformPlan = {
      ...plan,
      name: input.name.trim(),
      description: input.description.trim(),
      targetSegment: input.targetSegment,
      internalNotes: input.internalNotes.trim(),
      // The code identifies the plan on subscriptions once it is live, so it is only editable before that.
      internalCode: liveDraftOnly ? input.internalCode.trim() : plan.internalCode,
      availability: liveDraftOnly ? structuredClone(input.availability) : plan.availability,
      versions: plan.versions.map((item) => (item.id === draft.id ? { ...item, price: { ...input.price }, features: { ...input.features }, limits: structuredClone(input.limits) } : item)),
      updatedAt: nowIso(),
      updatedBy: actor.name,
    };
    writePlan(next);
    log(actor, plan.id, "plan.draft_saved", `Draft of ${next.name} version ${draft.version} was saved`);
    return summaryOf(plan.id);
  },

  async startNewVersion(planId, actor) {
    await wait("write");
    const plan = requirePlan(planId);
    if (plan.status === "retired") fail("CONFLICT", `${plan.name} is retired; a new version cannot be started.`);
    if (draftVersion(plan)) fail("CONFLICT", "A draft version already exists. Edit or discard it first.");
    const current = currentVersion(plan);
    if (!current) fail("CONFLICT", "There is no published version to base a new version on.");
    const version = Math.max(...plan.versions.map((item) => item.version)) + 1;
    const draft: PlanVersion = {
      ...structuredClone(current),
      id: versionId(plan.id, version),
      version,
      status: "draft",
      createdAt: nowIso(),
      createdBy: actor.name,
      publishedAt: null,
      publishedBy: null,
      rollout: null,
      changeSummary: [],
      legacyFeatureLabels: undefined,
    };
    writePlan({ ...plan, versions: [...plan.versions, draft], updatedAt: nowIso(), updatedBy: actor.name });
    log(actor, plan.id, "plan.version_started", `Version ${version} of ${plan.name} was started as a draft`, `Version ${current.version}`, `Version ${version} (draft)`);
    return summaryOf(plan.id);
  },

  async discardDraft(planId, actor) {
    await wait("write");
    const plan = requirePlan(planId);
    const draft = draftVersion(plan);
    if (!draft) fail("CONFLICT", "There is no draft to discard.");
    if (!currentVersion(plan)) fail("CONFLICT", "This plan has never been published; nothing can be discarded without losing it.");
    writePlan({ ...plan, versions: plan.versions.filter((item) => item.id !== draft.id), updatedAt: nowIso(), updatedBy: actor.name });
    log(actor, plan.id, "plan.draft_discarded", `Draft version ${draft.version} of ${plan.name} was discarded`);
    return summaryOf(plan.id);
  },

  async publishPlan(planId, input, actor) {
    await wait("write");
    const plan = requirePlan(planId);
    if (plan.status === "retired") fail("CONFLICT", `${plan.name} is retired and cannot be published.`);
    const draft = draftVersion(plan);
    if (!draft) fail("CONFLICT", "There is no draft to publish. Create a new version first.");

    const issues = validatePlanConfig(draftInputOf(plan, draft), codesExcept(planId), { selfCode: plan.internalCode });
    if (issues.some((issue) => issue.severity === "error")) failInvalid(issues, "The plan cannot be published.");

    const previous = currentVersion(plan);
    const impact = computeVersionImpact(context(), plan, draft, allBundles());
    const subscribers = subscriptionsOnPlan(plan);
    let migrate: typeof subscribers = [];
    if (previous) {
      if (input.rollout === "migrate_selected") {
        if (input.migrateCompanyIds.length === 0) fail("VALIDATION_FAILED", "Choose at least one company to migrate.", { migrate: "Choose at least one company to migrate." });
        migrate = subscribers.filter((bundle) => input.migrateCompanyIds.includes(bundle.company.id));
        if (migrate.length !== input.migrateCompanyIds.length) fail("VALIDATION_FAILED", "Only companies currently subscribed to this plan can be migrated.", { migrate: "A selected company is not subscribed to this plan." });
      }
    }

    const now = nowIso();
    const published: PlanVersion = {
      ...draft,
      status: "published",
      publishedAt: now,
      publishedBy: actor.name,
      rollout: previous ? input.rollout : null,
      changeSummary: previous ? impact.summary : ["Initial version"],
    };
    writePlan({
      ...plan,
      status: plan.status === "draft" ? "published" : plan.status,
      versions: plan.versions.map((item) => (item.id === draft.id ? published : item.status === "published" ? { ...item, status: "superseded" as const } : item)),
      updatedAt: now,
      updatedBy: actor.name,
    });

    for (const bundle of migrate) {
      await companiesRepository.migratePlanVersion(bundle.company.id, { version: draft.version, reason: input.note || "Migrated with plan publication" }, actor);
    }
    log(actor, plan.id, "plan.published", `${plan.name} version ${draft.version} was published${previous ? ` (${input.rollout.replace(/_/g, " ")})` : ""}`, previous ? `Version ${previous.version}` : null, `Version ${draft.version}`);
    return summaryOf(plan.id);
  },

  async setAvailability(planId, availability: PlanAvailability, actor) {
    await wait("write");
    const plan = requirePlan(planId);
    if (plan.status === "retired") fail("CONFLICT", `${plan.name} is retired; its availability cannot change.`);
    if (availability.currencies.length === 0) fail("VALIDATION_FAILED", "Choose at least one currency.", { currencies: "Choose at least one currency." });
    writePlan({ ...plan, availability: structuredClone(availability), updatedAt: nowIso(), updatedBy: actor.name });
    log(actor, plan.id, "plan.availability_changed", `Availability of ${plan.name} was updated`);
    return summaryOf(plan.id);
  },

  async hidePlan(planId, actor) {
    await wait("write");
    const plan = requirePlan(planId);
    if (plan.status !== "published") fail("CONFLICT", "Only a published plan can be hidden from new purchase.");
    writePlan({ ...plan, status: "hidden", updatedAt: nowIso(), updatedBy: actor.name });
    log(actor, plan.id, "plan.hidden", `${plan.name} was hidden from new purchase; existing subscriptions are unchanged`, "Published", "Hidden");
    return summaryOf(plan.id);
  },

  async showPlan(planId, actor) {
    await wait("write");
    const plan = requirePlan(planId);
    if (plan.status !== "hidden") fail("CONFLICT", "Only a hidden plan can be shown again.");
    writePlan({ ...plan, status: "published", updatedAt: nowIso(), updatedBy: actor.name });
    log(actor, plan.id, "plan.shown", `${plan.name} is available again`, "Hidden", "Published");
    return summaryOf(plan.id);
  },

  async retirePlan(planId, { reason }, actor) {
    await wait("write");
    const plan = requirePlan(planId);
    if (plan.status === "retired") fail("CONFLICT", "This plan is already retired.");
    if (plan.status === "draft") fail("CONFLICT", "A draft has no subscribers. Discard it instead of retiring it.");
    if (!reason.trim()) fail("VALIDATION_FAILED", "A reason is required.", { reason: "A reason is required for the audit trail." });
    const subscribers = subscriptionsOnPlan(plan).length;
    // Retirement closes the plan to new business. It never touches a subscription.
    writePlan({
      ...plan,
      status: "retired",
      availability: { ...plan.availability, newPurchase: false, upgrade: false, downgrade: false },
      updatedAt: nowIso(),
      updatedBy: actor.name,
    });
    log(actor, plan.id, "plan.retired", `${plan.name} was retired. ${subscribers} existing ${subscribers === 1 ? "subscription keeps" : "subscriptions keep"} referencing it. Reason: ${reason.trim()}`, plan.status, "Retired");
    return summaryOf(plan.id);
  },

  /* ----------------------- subscription mutations ----------------------- */

  async changeCompanyPlan(subscriptionId, input, actor) {
    await wait("write");
    const bundle = locate(subscriptionId);
    const impact = computePlanChangeImpact(context(), bundle, listPlans(), input.planKey, input.billingCycle, getPolicy());
    if (impact.ineligibleReason) fail("CONFLICT", impact.ineligibleReason, { planKey: impact.ineligibleReason });
    if (impact.overLimit.length > 0 && !input.overLimitAcknowledged) {
      fail("VALIDATION_FAILED", "Current usage exceeds the selected plan's limits. Acknowledge the over-limit policy to continue.", { overLimit: "Acknowledge the over-limit policy to continue." });
    }
    if (input.effective === "custom_date" && !input.effectiveAt) fail("VALIDATION_FAILED", "Choose an effective date.", { effectiveAt: "Choose an effective date." });
    await companiesRepository.changePlan(
      bundle.company.id,
      { planTier: input.planKey, billingCycle: input.billingCycle, effective: input.effective, effectiveAt: input.effectiveAt, reason: input.reason },
      actor,
    );
    return detailOf(subscriptionId);
  },

  async extendTrial(subscriptionId, input, actor) {
    await wait("write");
    const bundle = locate(subscriptionId);
    if (bundle.subscription.status !== "trialing") fail("CONFLICT", "Only a trialing subscription can be extended.");
    if (!Number.isInteger(input.days) || input.days < 1 || input.days > MAX_TRIAL_EXTENSION_DAYS) fail("VALIDATION_FAILED", `Extend by between 1 and ${MAX_TRIAL_EXTENSION_DAYS} days.`, { days: `Extend by between 1 and ${MAX_TRIAL_EXTENSION_DAYS} days.` });
    if (!input.reason.trim()) fail("VALIDATION_FAILED", "A reason is required.", { reason: "A reason is required for the audit trail." });
    const detail = detailOf(subscriptionId);
    const limit = getPolicy().trial.extensionLimitDays;
    if (detail.extendedDays + input.days > limit) {
      const left = Math.max(0, limit - detail.extendedDays);
      fail("VALIDATION_FAILED", `The trial extension policy allows ${limit} days in total; ${detail.extendedDays} already used, ${left} left.`, { days: `At most ${left} more day${left === 1 ? "" : "s"} under the trial policy.` });
    }
    await companiesRepository.extendTrial(bundle.company.id, { days: input.days, reason: input.reason.trim() }, actor);
    return detailOf(subscriptionId);
  },

  async convertTrial(subscriptionId, input, actor) {
    await wait("write");
    const bundle = locate(subscriptionId);
    if (bundle.subscription.status !== "trialing") fail("CONFLICT", "Only a trialing subscription can be converted.");
    if (input.planKey !== bundle.subscription.planTier) {
      const target = findPlan(input.planKey);
      if (!target || target.status !== "published") fail("CONFLICT", "That plan is not available.", { planKey: "Choose a published plan." });
      await companiesRepository.changePlan(bundle.company.id, { planTier: input.planKey, billingCycle: input.billingCycle, effective: "immediately", reason: "Chosen at trial conversion" }, actor);
    }
    // No payment is collected: the company gets an open invoice, and billing shows the amount as pending.
    await companiesRepository.convertTrialToPaid(bundle.company.id, { billingCycle: input.billingCycle }, actor);
    return detailOf(subscriptionId);
  },

  async endTrial(subscriptionId, { reason }, actor) {
    await wait("write");
    const bundle = locate(subscriptionId);
    if (!reason.trim()) fail("VALIDATION_FAILED", "A reason is required.", { reason: "A reason is required for the audit trail." });
    await companiesRepository.endTrial(bundle.company.id, { reason: reason.trim() }, actor);
    return detailOf(subscriptionId);
  },

  async cancelSubscription(subscriptionId, input, actor) {
    await wait("write");
    const bundle = locate(subscriptionId);
    if (!input.reason.trim()) fail("VALIDATION_FAILED", "A reason is required.", { reason: "A reason is required for the audit trail." });
    await companiesRepository.scheduleCancellation(bundle.company.id, { reason: input.reason.trim(), timing: input.timing }, actor);
    return detailOf(subscriptionId);
  },

  async undoCancellation(subscriptionId, { reason }, actor) {
    await wait("write");
    const bundle = locate(subscriptionId);
    await companiesRepository.cancelScheduledChange(bundle.company.id, { target: "cancellation", reason }, actor);
    return detailOf(subscriptionId);
  },

  async reactivateSubscription(subscriptionId, input, actor) {
    await wait("write");
    const bundle = locate(subscriptionId);
    const { subscription } = bundle;
    if (subscription.status === "active" || subscription.status === "trialing" || subscription.status === "past_due") fail("CONFLICT", "This subscription is already running.");
    const ended = subscription.status === "cancelled" || subscription.status === "expired";
    if (ended) {
      const endedAt = subscription.status === "cancelled" ? (subscription.cancelledAt ?? subscription.renewsAt) : subscription.renewsAt;
      const days = Math.floor((platformNow() - Date.parse(endedAt)) / 86_400_000);
      const window = getPolicy().cancellation.reactivationWindowDays;
      if (days > window) fail("CONFLICT", `The reactivation window is ${window} days and this subscription ended ${days} days ago. Create a new subscription instead.`);
    }
    const plan = findPlan(subscription.planTier);
    const unavailable = !plan || plan.status === "retired" || plan.status === "draft";
    if (unavailable && !input.planKey) fail("VALIDATION_FAILED", "Its plan is no longer available. Choose an available plan to reactivate onto.", { planKey: "Choose an available plan." });
    await companiesRepository.reactivateSubscription(bundle.company.id, actor);
    if (input.planKey && input.planKey !== subscription.planTier) {
      const target = findPlan(input.planKey);
      if (!target || target.status !== "published") fail("CONFLICT", "That plan is not available.", { planKey: "Choose a published plan." });
      await companiesRepository.changePlan(bundle.company.id, { planTier: input.planKey, billingCycle: subscription.billingCycle, effective: "immediately", reason: input.reason || "Chosen at reactivation" }, actor);
    }
    return detailOf(subscriptionId);
  },

  async cancelScheduledChange(subscriptionId, input, actor) {
    await wait("write");
    const bundle = locate(subscriptionId);
    await companiesRepository.cancelScheduledChange(bundle.company.id, input, actor);
    return detailOf(subscriptionId);
  },

  async rescheduleChange(subscriptionId, input, actor) {
    await wait("write");
    const bundle = locate(subscriptionId);
    await companiesRepository.rescheduleChange(bundle.company.id, input, actor);
    return detailOf(subscriptionId);
  },

  async grantOverride(subscriptionId, input, actor) {
    await wait("write");
    const bundle = locate(subscriptionId);
    const errors: Record<string, string> = {};
    const def = RESOURCES.find((item) => item.key === input.resource);
    if (!def || !def.usageResource) errors.resource = "Choose a resource this plan controls.";
    if (!(Number.isInteger(input.value) && input.value > 0)) errors.value = "Enter a whole number above zero.";
    if (!input.reason.trim()) errors.reason = "A reason is required for the audit trail.";
    if (!input.approvedBy.trim()) errors.approvedBy = "Record who approved this override.";
    if (Number.isNaN(Date.parse(input.startsAt)) || Number.isNaN(Date.parse(input.expiresAt))) errors.expiresAt = "Choose a start and an expiry date.";
    else if (Date.parse(input.expiresAt) <= Date.parse(input.startsAt)) errors.expiresAt = "The expiry must be after the start.";
    else if (Date.parse(input.expiresAt) <= platformNow()) errors.expiresAt = "The expiry must be in the future.";
    if (Object.keys(errors).length > 0) fail("VALIDATION_FAILED", "The override could not be granted.", errors);
    if (!isCurrentStatus(bundle.subscription.status)) fail("CONFLICT", "This subscription has ended, so it cannot receive an override.");
    if (!def?.usageResource) return fail("VALIDATION_FAILED", "Choose a resource this plan controls.");

    const clash = bundle.overrides.find(
      (item) =>
        item.resource === def.usageResource &&
        !item.revokedAt &&
        Date.parse(item.expiresAt) > Date.parse(input.startsAt) &&
        Date.parse(item.startsAt) < Date.parse(input.expiresAt),
    );
    if (clash) fail("CONFLICT", `An override for ${def.name} already covers part of this period (until ${clash.expiresAt.slice(0, 10)}). Revoke it or choose different dates.`, { startsAt: "Overlaps an existing override." });

    await companiesRepository.applyUsageOverride(
      bundle.company.id,
      {
        resource: def.usageResource,
        rule: input.rule,
        delta: input.rule === "additive" ? input.value : undefined,
        overrideLimit: input.value,
        approvedBy: input.approvedBy,
        reason: input.reason.trim(),
        startsAt: input.startsAt,
        expiresAt: input.expiresAt,
      },
      actor,
    );
    return detailOf(subscriptionId);
  },

  async revokeOverride(subscriptionId, overrideId, input, actor) {
    await wait("write");
    const bundle = locate(subscriptionId);
    await companiesRepository.revokeOverride(bundle.company.id, overrideId, input, actor);
    return detailOf(subscriptionId);
  },

  async savePolicy(policy, actor) {
    await wait("write");
    const errors = validatePolicy(policy);
    if (Object.keys(errors).length > 0) fail("VALIDATION_FAILED", "The policy could not be saved.", errors);
    if (!findPlan(policy.trial.defaultTrialPlan)) fail("VALIDATION_FAILED", "The default trial plan does not exist.", { defaultTrialPlan: "Choose an existing plan." });
    writePolicy(structuredClone(policy));
    log(actor, null, "policy.updated", "Subscription policies were updated");
    return structuredClone(policy);
  },

  async resetDemoData() {
    await wait("write");
    resetDemoState();
  },
};
