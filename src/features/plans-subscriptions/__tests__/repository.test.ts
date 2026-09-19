/**
 * Behaviour of the Plans & Subscriptions repository through the demo provider:
 * what a mutation does, what it refuses to do, and that plans, subscriptions,
 * Companies and Clients all read one source of truth.
 */
import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";

// The provider simulates latency; the tests do not need to wait for it.
process.env.NEXT_PUBLIC_MOCK_LATENCY_MS = "0";
const { plansRepository: repo } = await import("../data/repository");
const { companiesRepository: companies } = await import("@/features/companies/data/repository");
const { clientsRepository: clients } = await import("@/features/clients/data/repository");
const { ApiError } = await import("@/types/api");
const { emptyPlanInput } = await import("../data/selectors");
const { platformNow } = await import("@/features/companies/data/clock");

const actor = { id: "stf_001", name: "Aditya Raghunath" };

async function rejects(promise: Promise<unknown>, code: string) {
  await assert.rejects(promise, (error: unknown) => ApiError.isApiError(error) && error.code === code, `expected ${code}`);
}

beforeEach(async () => {
  await repo.resetDemoData?.();
});

async function everySubscription() {
  return (await repo.listSubscriptions({ pageSize: 500 })).data;
}

async function find(predicate: (row: Awaited<ReturnType<typeof everySubscription>>[number]) => boolean) {
  const found = (await everySubscription()).find(predicate);
  assert.ok(found, "the dataset must contain a matching subscription");
  return found;
}

function validPlan(code = "TEST_PLAN", overrides: Partial<ReturnType<typeof emptyPlanInput>> = {}) {
  const input = emptyPlanInput();
  input.name = "Test Plan";
  input.internalCode = code;
  input.price = { ...input.price, monthlyMinor: 990000, annualMinor: 9900000 };
  input.features = { ...input.features, omnichannel_publisher: true, seo_audit: true };
  input.limits = { ...input.limits, Clients: { kind: "fixed", value: 3 }, users: { kind: "fixed", value: 6 }, channels: { kind: "fixed", value: 8 }, aiCredits: { kind: "fixed", value: 1000 } };
  return { ...input, ...overrides };
}

describe("mode", () => {
  it("resolves to the demo provider while mock mode is on", () => {
    assert.equal(repo.mode, "mock");
  });
});

describe("one source of truth", () => {
  it("derives the same MRR as the Companies portfolio", async () => {
    const overview = await repo.getOverview();
    const portfolio = await companies.getPortfolio();
    const total = Object.values(overview.portfolio.mrrByCurrency).reduce((sum, value) => sum + value, 0);
    assert.equal(total, portfolio.mrrMinor);
  });

  it("keeps status totals mutually exclusive and shows scheduled cancellation as an overlap", async () => {
    const { portfolio } = await repo.getOverview();
    const rows = await everySubscription();
    const current = rows.filter((row) => row.status !== "cancelled" && row.status !== "expired");
    assert.equal(portfolio.totalCurrent, current.length);
    assert.equal(portfolio.activePaid + portfolio.trials + portfolio.pastDue + portfolio.paused, portfolio.totalCurrent, "paid + trials + past due + paused = current");
    assert.ok(portfolio.scheduledCancellation <= portfolio.activePaid, "scheduled cancellations sit inside Active Paid");
  });

  it("never counts a trial as paid or as MRR", async () => {
    for (const row of await everySubscription()) {
      if (row.status === "trialing") assert.equal(row.mrrMinor, 0, `${row.id} is a trial`);
    }
  });

  it("gives every subscription a valid plan and version", async () => {
    const plans = (await repo.listPlans({ showRetired: true })).summaries;
    for (const row of await everySubscription()) {
      assert.equal(row.planMissing, false, row.id);
      const plan = plans.find((item) => item.plan.key === row.planKey);
      assert.ok(plan?.plan.versions.some((version) => version.version === row.planVersion), `${row.id} references a missing version`);
    }
  });

  it("filters subscriptions and reports the same KPIs regardless of the filter", async () => {
    const all = await repo.listSubscriptions({ pageSize: 500 });
    const growth = await repo.listSubscriptions({ plan: "growth", pageSize: 500 });
    assert.ok(growth.data.length > 0 && growth.data.every((row) => row.planKey === "growth"));
    assert.deepEqual(growth.kpis, all.kpis);
    const trialing = await repo.listSubscriptions({ status: "trialing", pageSize: 500 });
    assert.equal(trialing.data.length, all.kpis.trialing);
  });
});

describe("plan lifecycle", () => {
  it("validates, then creates a draft that appears in the catalogue and KPIs", async () => {
    const before = (await repo.listPlans({})).portfolio;
    const created = await repo.createPlan({ ...validPlan(), intent: "draft" }, actor);
    assert.equal(created.plan.status, "draft");
    assert.equal(created.draft?.version, 1);
    const after = await repo.listPlans({});
    assert.equal(after.portfolio.draft, before.draft + 1);
    assert.ok(after.summaries.some((item) => item.plan.id === created.plan.id));
    const activity = (await repo.getPlan(created.plan.id)).activity;
    assert.ok(activity.length > 0);
  });

  it("refuses a duplicate or malformed code and an incomplete publication", async () => {
    await rejects(repo.createPlan({ ...validPlan("GROWTH"), intent: "draft" }, actor), "VALIDATION_FAILED");
    await rejects(repo.createPlan({ ...validPlan("not valid!"), intent: "draft" }, actor), "VALIDATION_FAILED");
    const incomplete = validPlan("HALF_DONE");
    incomplete.price = { ...incomplete.price, monthlyMinor: 0 };
    await rejects(repo.createPlan({ ...incomplete, intent: "published" }, actor), "VALIDATION_FAILED");
    // The same configuration is fine as a draft.
    const draft = await repo.createPlan({ ...incomplete, intent: "draft" }, actor);
    assert.equal(draft.plan.status, "draft");
  });

  it("blocks publishing when a feature's dependency is off", async () => {
    const input = validPlan("DEP_TEST");
    input.features = { ...input.features, webhooks: true, api_access: false };
    await assert.rejects(repo.createPlan({ ...input, intent: "published" }, actor), (error: unknown) => ApiError.isApiError(error) && Boolean(error.fieldErrors?.["feature.webhooks"]));
  });

  it("publishes a new plan so companies can be moved onto it", async () => {
    const created = await repo.createPlan({ ...validPlan("MOVE_ME"), intent: "published" }, actor);
    assert.equal(created.plan.status, "published");
    const row = await find((item) => item.status === "active" && item.company.accountStatus === "active" && item.planKey !== "move_me");
    const choices = await repo.listSelectablePlans(row.id);
    assert.ok(choices.some((choice) => choice.summary.plan.key === "move_me" && choice.eligible), "the new plan is selectable");
    const comparison = await repo.getComparison();
    assert.ok(comparison.some((item) => item.plan.key === "move_me"), "the comparison includes it");
  });

  it("never mutates a published version: editing starts a new draft version", async () => {
    const growth = (await repo.listPlans({})).summaries.find((item) => item.plan.key === "growth")!;
    await rejects(repo.saveDraft(growth.plan.id, { ...validPlan(), name: "Growth", internalCode: "GROWTH" }, actor), "CONFLICT");

    const started = await repo.startNewVersion(growth.plan.id, actor);
    assert.equal(started.draft?.version, 2);
    assert.equal(started.current?.version, 1);
    await rejects(repo.startNewVersion(growth.plan.id, actor), "CONFLICT");

    const draft = started.draft!;
    const input = {
      name: started.plan.name,
      internalCode: started.plan.internalCode,
      description: started.plan.description,
      targetSegment: started.plan.targetSegment,
      internalNotes: "",
      price: { ...draft.price, monthlyMinor: draft.price.monthlyMinor + 100000 },
      features: draft.features,
      limits: { ...draft.limits, Clients: { kind: "fixed" as const, value: 3 } },
      availability: started.plan.availability,
    };
    const saved = await repo.saveDraft(growth.plan.id, input, actor);
    assert.equal(saved.current?.price.monthlyMinor, growth.current?.price.monthlyMinor, "the published price is untouched");
    assert.equal(saved.draft?.price.monthlyMinor, input.price.monthlyMinor);
  });

  it("surfaces subscribers who exceed a reduced limit before publishing", async () => {
    const growth = (await repo.listPlans({})).summaries.find((item) => item.plan.key === "growth")!;
    const started = await repo.startNewVersion(growth.plan.id, actor);
    const draft = started.draft!;
    const impact = await repo.previewImpact(growth.plan.id, { name: started.plan.name, internalCode: started.plan.internalCode, description: "", targetSegment: "", internalNotes: "", price: draft.price, features: draft.features, limits: { ...draft.limits, users: { kind: "fixed", value: 1 } }, availability: started.plan.availability });
    assert.equal(impact.changedLimits.some((item) => item.key === "users"), true);
    assert.ok(impact.subscribers > 0);
    assert.ok(impact.exceedingNewLimits.length > 0, "companies with more than one user are flagged");
    assert.equal(impact.affectedCompanies, new Set(impact.exceedingNewLimits.map((item) => item.companyId)).size);
  });

  it("keeps existing subscriptions on their version when a new one is published", async () => {
    const growth = (await repo.listPlans({})).summaries.find((item) => item.plan.key === "growth")!;
    const before = (await everySubscription()).filter((row) => row.planKey === "growth");
    const mrrBefore = before.reduce((sum, row) => sum + row.mrrMinor, 0);

    const started = await repo.startNewVersion(growth.plan.id, actor);
    const draft = started.draft!;
    await repo.saveDraft(
      growth.plan.id,
      { name: started.plan.name, internalCode: started.plan.internalCode, description: started.plan.description, targetSegment: started.plan.targetSegment, internalNotes: "", price: { ...draft.price, monthlyMinor: draft.price.monthlyMinor * 2, annualMinor: draft.price.annualMinor * 2 }, features: draft.features, limits: draft.limits, availability: started.plan.availability },
      actor,
    );
    const published = await repo.publishPlan(growth.plan.id, { rollout: "new_only", migrateCompanyIds: [], note: "" }, actor);
    assert.equal(published.current?.version, 2);
    assert.equal(published.plan.versions.find((item) => item.version === 1)?.status, "superseded");

    const after = (await everySubscription()).filter((row) => row.planKey === "growth");
    assert.equal(after.reduce((sum, row) => sum + row.mrrMinor, 0), mrrBefore, "nobody's price changed");
    assert.ok(after.every((row) => row.planVersion === 1 && row.isLegacyVersion));
    assert.equal(published.subscribers.onOlderVersion, published.subscribers.total);

    // A company that changes plan afterwards is pinned to the new version.
    const other = await find((row) => row.planKey === "starter" && row.status === "active" && row.company.accountStatus === "active");
    const detail = await repo.changeCompanyPlan(other.id, { planKey: "growth", billingCycle: other.billingCycle, effective: "immediately", reason: "test", overLimitAcknowledged: true }, actor);
    assert.equal(detail.row.planVersion, 2);
  });

  it("offers at-renewal rollout as scheduled changes, and migrates only the selected companies", async () => {
    const growth = (await repo.listPlans({})).summaries.find((item) => item.plan.key === "growth")!;
    const on = await repo.listCompaniesOnPlan(growth.plan.id);
    assert.ok(on.length >= 2);
    const started = await repo.startNewVersion(growth.plan.id, actor);
    const draft = started.draft!;
    await repo.saveDraft(growth.plan.id, { name: started.plan.name, internalCode: started.plan.internalCode, description: started.plan.description, targetSegment: started.plan.targetSegment, internalNotes: "", price: { ...draft.price, monthlyMinor: draft.price.monthlyMinor + 50000 }, features: draft.features, limits: draft.limits, availability: started.plan.availability }, actor);

    await rejects(repo.publishPlan(growth.plan.id, { rollout: "migrate_selected", migrateCompanyIds: [], note: "" }, actor), "VALIDATION_FAILED");
    await repo.publishPlan(growth.plan.id, { rollout: "migrate_selected", migrateCompanyIds: [on[0]!.id], note: "" }, actor);
    const rows = (await everySubscription()).filter((row) => row.planKey === "growth");
    assert.equal(rows.find((row) => row.company.id === on[0]!.id)?.planVersion, 2);
    assert.equal(rows.find((row) => row.company.id === on[1]!.id)?.planVersion, 1);
  });

  it("hides and retires without touching subscriptions", async () => {
    const enterprise = (await repo.listPlans({})).summaries.find((item) => item.plan.key === "agency")!;
    const before = (await everySubscription()).filter((row) => row.planKey === "agency");
    const hidden = await repo.hidePlan(enterprise.plan.id, actor);
    assert.equal(hidden.plan.status, "hidden");
    await rejects(repo.hidePlan(enterprise.plan.id, actor), "CONFLICT");
    const shown = await repo.showPlan(enterprise.plan.id, actor);
    assert.equal(shown.plan.status, "published");

    await rejects(repo.retirePlan(enterprise.plan.id, { reason: " " }, actor), "VALIDATION_FAILED");
    const retired = await repo.retirePlan(enterprise.plan.id, { reason: "Superseded" }, actor);
    assert.equal(retired.plan.status, "retired");
    const after = (await everySubscription()).filter((row) => row.planKey === "agency");
    assert.deepEqual(after.map((row) => [row.id, row.status, row.mrrMinor]), before.map((row) => [row.id, row.status, row.mrrMinor]), "retiring never cancels or reprices subscribers");
    await rejects(repo.startNewVersion(enterprise.plan.id, actor), "CONFLICT");

    // A retired plan is no longer a valid destination.
    const other = await find((row) => row.planKey === "starter" && row.status === "active" && row.company.accountStatus === "active");
    const choice = (await repo.listSelectablePlans(other.id)).find((item) => item.summary.plan.key === "agency");
    assert.equal(choice?.eligible, false);
    await rejects(repo.changeCompanyPlan(other.id, { planKey: "agency", billingCycle: other.billingCycle, effective: "immediately", reason: "", overLimitAcknowledged: true }, actor), "CONFLICT");
  });
});

describe("change company plan", () => {
  it("applies immediately: subscription, company, MRR and limits all follow", async () => {
    const row = await find((item) => item.planKey === "starter" && item.status === "active" && item.company.accountStatus === "active");
    const before = await repo.getOverview();
    const detail = await repo.changeCompanyPlan(row.id, { planKey: "growth", billingCycle: row.billingCycle, effective: "immediately", reason: "Upgrade", overLimitAcknowledged: false }, actor);
    assert.equal(detail.row.planKey, "growth");
    assert.ok(detail.row.mrrMinor > row.mrrMinor);

    const company = await companies.getCompany(row.company.id);
    assert.equal(company.plan.tier, "growth");
    assert.equal(company.mrrMinor, detail.row.mrrMinor);
    const after = await repo.getOverview();
    assert.ok((after.portfolio.mrrByCurrency.INR ?? 0) > (before.portfolio.mrrByCurrency.INR ?? 0));
    assert.ok(detail.history.some((event) => event.action === "subscription.plan_changed"));
  });

  it("schedules a future change without applying it", async () => {
    const row = await find((item) => item.planKey === "growth" && item.status === "active" && item.company.accountStatus === "active" && item.pendingChanges === 0);
    const effectiveAt = new Date(platformNow() + 60 * 86_400_000).toISOString();
    const detail = await repo.changeCompanyPlan(row.id, { planKey: "agency", billingCycle: row.billingCycle, effective: "custom_date", effectiveAt, reason: "", overLimitAcknowledged: true }, actor);
    assert.equal(detail.row.planKey, "growth", "the current plan is untouched");
    assert.equal(detail.row.mrrMinor, row.mrrMinor);
    const scheduled = detail.scheduled.find((item) => item.kind === "upgrade");
    assert.ok(scheduled, "a scheduled change exists");
    assert.ok(scheduled.canCancel && scheduled.canReschedule);

    await rejects(repo.rescheduleChange(row.id, { effectiveAt: "2020-01-01", reason: "" }, actor), "VALIDATION_FAILED");
    const later = new Date(platformNow() + 90 * 86_400_000).toISOString();
    const moved = await repo.rescheduleChange(row.id, { effectiveAt: later, reason: "Customer asked" }, actor);
    assert.equal(moved.scheduled.find((item) => item.kind === "upgrade")?.effectiveAt.slice(0, 10), later.slice(0, 10));

    const cancelled = await repo.cancelScheduledChange(row.id, { target: "plan_change", reason: "Changed mind" }, actor);
    assert.equal(cancelled.scheduled.filter((item) => item.kind === "upgrade").length, 0);
    assert.equal(cancelled.row.planKey, "growth");
  });

  it("requires the over-limit policy to be acknowledged before a downgrade that does not fit", async () => {
    const rows = await everySubscription();
    for (const row of rows.filter((item) => item.planKey === "agency" && item.status === "active" && item.company.accountStatus === "active")) {
      const impact = await repo.getPlanChangeImpact(row.id, "starter", row.billingCycle);
      if (impact.overLimit.length === 0) continue;
      await assert.rejects(repo.changeCompanyPlan(row.id, { planKey: "starter", billingCycle: row.billingCycle, effective: "immediately", reason: "", overLimitAcknowledged: false }, actor), (error: unknown) => ApiError.isApiError(error) && Boolean(error.fieldErrors?.overLimit));
      const done = await repo.changeCompanyPlan(row.id, { planKey: "starter", billingCycle: row.billingCycle, effective: "immediately", reason: "", overLimitAcknowledged: true }, actor);
      assert.equal(done.row.planKey, "starter");
      // Nothing was deleted: the company still has all its clients.
      assert.equal((await companies.getCompany(row.company.id)).counts.clients, (await companies.getClients(row.company.id)).clients.length);
      return;
    }
    assert.fail("no agency subscription would exceed the starter plan");
  });

  it("refuses to change the plan of an ended subscription", async () => {
    const ended = await find((item) => item.status === "cancelled" || item.status === "expired");
    await rejects(repo.changeCompanyPlan(ended.id, { planKey: "growth", billingCycle: ended.billingCycle, effective: "immediately", reason: "", overLimitAcknowledged: true }, actor), "CONFLICT");
  });
});

describe("trials", () => {
  it("extends within policy, refuses beyond it, and updates the queue and history", async () => {
    const trial = (await repo.getTrials({})).find((item) => item.state === "active" || item.state === "ending_soon")!;
    const before = trial.endsAt;
    const detail = await repo.extendTrial(trial.subscriptionId, { days: 7, reason: "Onboarding delay" }, actor);
    assert.equal(detail.extendedDays, 7);
    assert.ok(Date.parse(detail.row.trialEndsAt ?? "") > Date.parse(before));
    assert.ok(detail.history.some((event) => event.action === "subscription.trial_extended"));
    const after = (await repo.getTrials({})).find((item) => item.subscriptionId === trial.subscriptionId)!;
    assert.equal(after.extendedDays, 7);

    const policy = await repo.getPolicy();
    await rejects(repo.extendTrial(trial.subscriptionId, { days: policy.trial.extensionLimitDays, reason: "Too much" }, actor), "VALIDATION_FAILED");
    await rejects(repo.extendTrial(trial.subscriptionId, { days: 3, reason: " " }, actor), "VALIDATION_FAILED");
  });

  it("converts to paid without pretending a payment was collected", async () => {
    const trial = (await repo.getTrials({})).find((item) => item.state === "active" || item.state === "ending_soon")!;
    const detail = await repo.convertTrial(trial.subscriptionId, { planKey: trial.planKey, billingCycle: "monthly" }, actor);
    assert.equal(detail.row.status, "active");
    assert.ok(detail.row.mrrMinor > 0);
    assert.ok(detail.openInvoiceNumber, "an invoice is open and unpaid");
    assert.ok(detail.history.some((event) => /no payment collected/i.test(event.summary)));
    const converted = (await repo.getTrials({ state: "converted" })).some((item) => item.subscriptionId === trial.subscriptionId);
    assert.equal(converted, true);
  });

  it("ends a trial without touching the company account", async () => {
    const trial = (await repo.getTrials({})).find((item) => item.state === "active" || item.state === "ending_soon")!;
    const detail = await repo.endTrial(trial.subscriptionId, { reason: "Not a fit" }, actor);
    assert.equal(detail.row.status, "expired");
    assert.equal(detail.company.accountStatus, "active");
    await rejects(repo.endTrial(trial.subscriptionId, { reason: "again" }, actor), "CONFLICT");
  });
});

describe("cancellation and reactivation", () => {
  it("schedules, undoes, and cancels immediately - never changing the company account", async () => {
    const row = await find((item) => item.status === "active" && item.company.accountStatus === "active" && item.pendingChanges === 0);
    await rejects(repo.cancelSubscription(row.id, { timing: "end_of_term", reason: "" }, actor), "VALIDATION_FAILED");
    const scheduled = await repo.cancelSubscription(row.id, { timing: "end_of_term", reason: "Customer request" }, actor);
    assert.equal(scheduled.row.status, "scheduled_cancellation");
    assert.ok(scheduled.scheduled.some((item) => item.kind === "cancellation"));
    assert.equal(scheduled.company.accountStatus, "active");
    assert.ok(scheduled.row.mrrMinor > 0, "still paying until the term ends");

    const undone = await repo.undoCancellation(row.id, { reason: "Kept" }, actor);
    assert.equal(undone.row.status, "active");

    const ended = await repo.cancelSubscription(row.id, { timing: "immediate", reason: "Closing" }, actor);
    assert.equal(ended.row.status, "cancelled");
    assert.equal(ended.row.mrrMinor, 0);
    assert.equal(ended.company.accountStatus, "active");
  });

  it("reactivates within the window and refuses beyond it", async () => {
    const row = await find((item) => item.status === "active" && item.company.accountStatus === "active" && item.pendingChanges === 0);
    await repo.cancelSubscription(row.id, { timing: "immediate", reason: "Closing" }, actor);
    const back = await repo.reactivateSubscription(row.id, { reason: "Returned" }, actor);
    assert.equal(back.row.status, "active");
    await rejects(repo.reactivateSubscription(row.id, { reason: "again" }, actor), "CONFLICT");

    const old = await find((item) => item.status === "cancelled" || item.status === "expired");
    const window = (await repo.getPolicy()).cancellation.reactivationWindowDays;
    const endedDaysAgo = (platformNow() - Date.parse(old.renewsAt)) / 86_400_000;
    if (endedDaysAgo > window) await rejects(repo.reactivateSubscription(old.id, { reason: "late" }, actor), "CONFLICT");
  });
});

describe("company-specific overrides", () => {
  // The demo clock, not the wall clock: the dataset lives in September 2026.
  const dates = () => ({ startsAt: new Date(platformNow() - 86_400_000).toISOString(), expiresAt: new Date(platformNow() + 30 * 86_400_000).toISOString() });

  it("adds to the plan allowance and updates effective limits, usage status and client creation", async () => {
    const row = await find((item) => item.planKey === "starter" && item.status === "active" && item.company.accountStatus === "active" && item.activeOverrides === 0);
    const eligibilityBefore = (await clients.listCreationCompanies()).find((item) => item.id === row.company.id)!;
    const before = await repo.getSubscription(row.id);
    const baseClients = before.entitlements.find((item) => item.key === "Clients")!;

    const detail = await repo.grantOverride(row.id, { resource: "Clients", rule: "additive", value: 4, ...dates(), reason: "Pilot brands", approvedBy: "Renu Balakrishnan" }, actor);
    const entitlement = detail.entitlements.find((item) => item.key === "Clients")!;
    assert.equal(entitlement.effective?.baseValue, baseClients.effective?.baseValue, "the plan itself is unchanged");
    assert.equal(entitlement.effective?.effectiveValue, (baseClients.effective?.effectiveValue ?? 0) + 4);
    assert.equal(entitlement.effective?.ruleApplied, "additive increase");
    assert.equal(detail.row.activeOverrides, 1);

    const eligibilityAfter = (await clients.listCreationCompanies()).find((item) => item.id === row.company.id)!;
    assert.equal(eligibilityAfter.clientLimit, (eligibilityBefore.clientLimit ?? 0) + 4, "the Clients module sees the new limit");
    assert.ok(detail.history.some((event) => event.action === "usage.override_applied"));
  });

  it("supports absolute replacement, refuses overlaps, and revokes early", async () => {
    const row = await find((item) => item.planKey === "growth" && item.status === "active" && item.company.accountStatus === "active" && item.activeOverrides === 0);
    const detail = await repo.grantOverride(row.id, { resource: "aiCredits", rule: "absolute", value: 50_000, ...dates(), reason: "Campaign", approvedBy: "Renu Balakrishnan" }, actor);
    const entitlement = detail.entitlements.find((item) => item.key === "aiCredits")!;
    assert.equal(entitlement.effective?.effectiveValue, 50_000);
    assert.equal(entitlement.effective?.ruleApplied, "absolute replacement");

    await rejects(repo.grantOverride(row.id, { resource: "aiCredits", rule: "additive", value: 1000, ...dates(), reason: "Again", approvedBy: "x" }, actor), "CONFLICT");

    const revoked = await repo.revokeOverride(row.id, entitlement.override!.id, { reason: "Not needed" }, actor);
    const after = revoked.entitlements.find((item) => item.key === "aiCredits")!;
    assert.equal(after.effective?.effectiveValue, after.effective?.baseValue);
    assert.equal(after.effective?.ruleApplied, "base");
  });

  it("validates the override and refuses one on an ended subscription", async () => {
    const row = await find((item) => item.status === "active" && item.company.accountStatus === "active");
    await assert.rejects(repo.grantOverride(row.id, { resource: "aiCredits", rule: "additive", value: 0, startsAt: new Date(platformNow()).toISOString(), expiresAt: new Date(platformNow() - 1000).toISOString(), reason: "", approvedBy: "" }, actor), (error: unknown) => ApiError.isApiError(error) && Object.keys(error.fieldErrors ?? {}).length >= 3);
    const ended = await find((item) => item.status === "cancelled" || item.status === "expired");
    await rejects(repo.grantOverride(ended.id, { resource: "aiCredits", rule: "additive", value: 10, ...dates(), reason: "x", approvedBy: "y" }, actor), "CONFLICT");
  });

  it("ignores overrides on an ended subscription and says why", async () => {
    const ended = await find((item) => item.status === "cancelled" || item.status === "expired");
    const detail = await repo.getSubscription(ended.id);
    for (const row of detail.entitlements.filter((item) => item.kind === "resource")) {
      assert.equal(row.effective?.ruleApplied, "inactive subscription");
    }
  });
});

describe("policies", () => {
  it("saves valid settings, refuses invalid ones, and applies the trial extension limit", async () => {
    const policy = await repo.getPolicy();
    await rejects(repo.savePolicy({ ...policy, trial: { ...policy.trial, defaultTrialDays: 0 } }, actor), "VALIDATION_FAILED");
    await rejects(repo.savePolicy({ ...policy, trial: { ...policy.trial, defaultTrialPlan: "nope" } }, actor), "VALIDATION_FAILED");
    await repo.savePolicy({ ...policy, trial: { ...policy.trial, extensionLimitDays: 5 } }, actor);
    assert.equal((await repo.getPolicy()).trial.extensionLimitDays, 5);
    const trial = (await repo.getTrials({})).find((item) => item.state === "active" || item.state === "ending_soon")!;
    await rejects(repo.extendTrial(trial.subscriptionId, { days: 6, reason: "over" }, actor), "VALIDATION_FAILED");
  });
});

describe("overview data", () => {
  it("returns actionable attention items, upcoming changes and recent activity", async () => {
    const overview = await repo.getOverview();
    assert.ok(overview.attention.length > 0);
    for (const item of overview.attention) {
      assert.ok(item.actions.length > 0);
      assert.ok(item.company.id);
    }
    assert.ok(overview.adoption.length > 0);
    assert.equal(overview.adoption.reduce((sum, row) => sum + row.paid + row.trial, 0) > 0, true);
    assert.ok(overview.activity.length > 0);
  });

  it("builds a deterministic trend that changes with metric and period", async () => {
    const paid30 = await repo.getTrend("active_paid", "30d");
    assert.equal(paid30.length, 30);
    assert.deepEqual(paid30.map((point) => [point.label, point.value]), (await repo.getTrend("active_paid", "30d")).map((point) => [point.label, point.value]));
    const year = await repo.getTrend("active_paid", "1y");
    assert.equal(year.length, 12);
    const trials = await repo.getTrend("active_trials", "3m");
    assert.equal(trials.length, 13);
    const overview = await repo.getOverview();
    assert.equal(paid30.at(-1)?.value, overview.portfolio.activePaid + overview.portfolio.pastDue + overview.portfolio.paused, "today's point equals the live paid count");
  });
});

describe("tenant isolation and errors", () => {
  it("reports unknown plans and subscriptions as not found", async () => {
    await rejects(repo.getPlan("plan_nope"), "NOT_FOUND");
    await rejects(repo.getSubscription("sub_nope"), "NOT_FOUND");
    await rejects(repo.changeCompanyPlan("sub_nope", { planKey: "growth", billingCycle: "monthly", effective: "immediately", reason: "", overLimitAcknowledged: true }, actor), "NOT_FOUND");
  });

  it("returns only one company's records for a subscription", async () => {
    const row = await find((item) => item.status === "active");
    const detail = await repo.getSubscription(row.id);
    assert.equal(detail.row.company.id, row.company.id);
    assert.ok(detail.history.every((event) => event.company?.id === row.company.id));
    assert.ok(detail.overrides.every((item) => item.companyId === row.company.id));
  });
});
