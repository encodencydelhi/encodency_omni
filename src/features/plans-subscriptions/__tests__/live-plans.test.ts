import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";

process.env.NEXT_PUBLIC_DATA_SOURCE = "api";

const { superAdminPlansApi } = await import("../live/super-admin-plans-api");
const { superAdminAuditLogsApi } = await import("@/features/audit-logs/live/super-admin-audit-logs-api");
const live = await import("../data/live-plans");
const { ApiError } = await import("@/types/api");

const actor = { id: "u1", name: "Admin" };
const plan = (over: Record<string, unknown> = {}) => ({
  id: "p-growth",
  name: "Growth",
  isActive: true,
  monthlyPrice: 499_900,
  annualPrice: 4_999_000,
  maxClients: 10,
  maxAiTokens: 100_000,
  features: { maxClients: 10, maxAiTokens: 100_000, automationEnabled: true },
  createdAt: "2026-08-01T00:00:00.000Z",
  updatedAt: "2026-08-01T00:00:00.000Z",
  ...over,
});
const sub = (over: Record<string, unknown> = {}) => ({
  id: "s1",
  companyId: "c1",
  planId: "p-growth",
  status: "ACTIVE",
  currentPeriodEnd: "2026-11-05T00:00:00.000Z",
  createdAt: "2026-08-05T00:00:00.000Z",
  updatedAt: "2026-10-05T00:00:00.000Z",
  plan: plan(),
  company: { id: "c1", name: "Acme", status: "ACTIVE" },
  usage: { currentClients: 3, currentAiTokens: 2500 },
  ...over,
});

let plans: ReturnType<typeof plan>[] = [];
let subs: ReturnType<typeof sub>[] = [];
let calls: Array<{ fn: string; args: unknown[] }> = [];
let failList = false;

const api = superAdminPlansApi as unknown as Record<string, (...args: unknown[]) => Promise<unknown>>;
const audit = superAdminAuditLogsApi as unknown as Record<string, (...args: unknown[]) => Promise<unknown>>;

beforeEach(() => {
  plans = [plan()];
  subs = [sub()];
  calls = [];
  failList = false;
  api.listPlans = async () => {
    if (failList) throw new ApiError({ code: "SERVICE_UNAVAILABLE", message: "backend down", status: 503 });
    return plans;
  };
  api.listSubscriptions = async () => subs;
  api.getSubscription = async (id: unknown) => {
    const found = subs.find((item) => item.id === id);
    if (!found) throw new ApiError({ code: "NOT_FOUND", message: "nope", status: 404 });
    return { ...found, owner: { name: "Asha", email: "asha@acme.test" }, openInvoiceId: null };
  };
  const record = (fn: string) => async (...args: unknown[]) => {
    calls.push({ fn, args });
    return plans[0] ?? {};
  };
  api.upsertPlan = async (...args: unknown[]) => {
    calls.push({ fn: "upsertPlan", args });
    const payload = args[0] as { name: string; monthlyPrice: number; features: { maxClients: number; maxAiTokens: number; automationEnabled: boolean } };
    const existing = plans.find((item) => item.name === payload.name);
    const saved = plan({ id: existing?.id ?? `p-${payload.name}`, name: payload.name, monthlyPrice: payload.monthlyPrice, annualPrice: (payload as { annualPrice?: number | null }).annualPrice ?? null, maxClients: payload.features.maxClients, maxAiTokens: payload.features.maxAiTokens, features: payload.features });
    plans = [...plans.filter((item) => item.name !== payload.name), saved];
    return saved;
  };
  api.activatePlan = record("activatePlan");
  api.deactivatePlan = record("deactivatePlan");
  api.changePlan = record("changePlan");
  api.cancelSubscription = record("cancelSubscription");
  api.reactivateSubscription = record("reactivateSubscription");
  api.createUsageOverride = record("createUsageOverride");
  api.revokeUsageOverride = record("revokeUsageOverride");
  api.listUsageOverrides = async () => [];
  audit.list = async () => ({ items: [], total: 0, page: 1, limit: 20 });
});

const reason = async (work: Promise<unknown>) => ((await work.catch((error: unknown) => error)) as { reason?: string; message: string });

describe("mapping a backend plan", () => {
  it("keeps the price in paise (the page's minor unit) and the two real caps; other limits are not capped", () => {
    const version = live.versionOf(plan() as never);
    assert.equal(version.price.monthlyMinor, 499_900, "not multiplied by 100");
    assert.equal(version.price.annualMinor, 4_999_000, "the yearly price, in paise");
    assert.equal(live.versionOf(plan({ annualPrice: null }) as never).price.annualMinor, 0, "0 means annual is not offered");
    assert.equal(version.price.currency, "INR");
    assert.deepEqual(version.limits.Clients, { kind: "fixed", value: 10 });
    assert.deepEqual(version.limits.aiCredits, { kind: "fixed", value: 100_000 });
    assert.equal(version.limits.users!.kind, "unlimited");
    assert.equal(version.price.trialDays, 0, "no trial is invented");
  });

  it("switches off the automation feature, and what depends on it, when the plan has automation off", () => {
    const on = live.versionOf(plan() as never);
    const off = live.versionOf(plan({ features: { maxClients: 10, maxAiTokens: 1, automationEnabled: false } }) as never);
    assert.equal(on.features.automation_engine, true);
    assert.equal(off.features.automation_engine, false);
    assert.equal(off.features.advanced_conditions, false, "a feature cannot be on while its dependency is off");
    assert.equal(off.features.seo_audit, true);
  });

  it("an inactive plan is hidden (it can be shown again), never retired", () => {
    assert.equal(live.toPlatformPlan(plan({ isActive: false }) as never).status, "hidden");
    assert.equal(live.toPlatformPlan(plan() as never).status, "published");
    assert.equal(live.planKeyOf("Pro Plus!"), "pro_plus");
  });
});

describe("mapping a subscription", () => {
  it("maps statuses, counts MRR only for a running subscription, and ends a cancelled one", () => {
    assert.equal(live.toRow(sub() as never).mrrMinor, 499_900);
    const past = live.toRow(sub({ status: "PAST_DUE" }) as never);
    assert.equal(past.status, "past_due");
    assert.equal(past.mrrMinor, 0);
    assert.equal(past.billingStatus, "payment_due");
    assert.equal(live.toRow(sub({ status: "SUSPENDED" }) as never).status, "paused");
    const cancelled = live.toRow(sub({ status: "CANCELED" }) as never);
    assert.equal(cancelled.status, "cancelled");
    assert.equal(cancelled.endedAt, "2026-10-05T00:00:00.000Z");
    assert.equal(live.toRow(sub() as never).company.name, "Acme");
  });

  it("an annual subscription recurs once a year and counts a twelfth of it as monthly revenue", () => {
    const annual = live.toRow(sub({ billingCycle: "ANNUAL" }) as never);
    assert.equal(annual.billingCycle, "annual");
    assert.equal(annual.recurringMinor, 4_999_000);
    assert.equal(annual.mrrMinor, Math.round(4_999_000 / 12));
    const monthly = live.toRow(sub({ billingCycle: "MONTHLY" }) as never);
    assert.equal(monthly.billingCycle, "monthly");
    assert.equal(monthly.recurringMinor, 499_900);
    assert.equal(live.toRow(sub({ billingCycle: "ANNUAL", status: "SUSPENDED" }) as never).mrrMinor, 0);
  });

  it("an annual subscription may only move to a plan that sells annual billing", async () => {
    plans = [plan(), plan({ id: "p-flex", name: "Flex", monthlyPrice: 1_499_900, annualPrice: null })];
    subs = [sub({ billingCycle: "ANNUAL" })];
    const choices = await new live.LivePlansRepository().listSelectablePlans("s1");
    const flex = choices.find((choice) => choice.summary.plan.name === "Flex")!;
    assert.equal(flex.eligible, false);
    assert.match(flex.reason!, /annual billing/);
  });

  it("reads usage risk from the real usage against the plan's caps", () => {
    assert.equal(live.toRow(sub() as never).usageRisk, "ok");
    assert.equal(live.toRow(sub({ usage: { currentClients: 9, currentAiTokens: 0 } }) as never).usageRisk, "near_limit");
    assert.equal(live.toRow(sub({ usage: { currentClients: 11, currentAiTokens: 0 } }) as never).usageRisk, "over_limit");
    assert.equal(live.toRow(sub({ usage: undefined }) as never).usageRisk, "ok");
  });

  it("measures only clients and AI tokens; other resources are not metered", () => {
    const rows = live.entitlementsOf(plan() as never, { currentClients: 8, currentAiTokens: 100 });
    const byKey = Object.fromEntries(rows.map((row) => [row.key, row]));
    assert.equal(byKey.Clients!.used, 8);
    assert.equal(byKey.Clients!.status, "high");
    assert.equal(byKey.aiCredits!.status, "within");
    assert.equal(byKey.users!.status, "not_metered");
    assert.equal(byKey.automation_engine!.status, "enabled");
  });

  it("flags attention for a past-due, over-limit or unrenewed subscription only", () => {
    const now = Date.parse("2026-10-20T00:00:00Z");
    const rows = [live.toRow(sub() as never), live.toRow(sub({ id: "s2", status: "PAST_DUE" }) as never), live.toRow(sub({ id: "s3", usage: { currentClients: 12, currentAiTokens: 0 } }) as never)];
    assert.deepEqual(live.attentionOf(rows, now).map((item) => item.kind), ["past_due", "usage_over_limit"]);
    const overdue = live.attentionOf([live.toRow(sub({ currentPeriodEnd: "2026-10-01T00:00:00.000Z" }) as never)], now);
    assert.equal(overdue.length, 1);
    assert.match(overdue[0]!.issue, /renewal date has passed/);
    assert.equal(live.attentionOf([live.toRow(sub({ status: "CANCELED", currentPeriodEnd: "2026-10-01T00:00:00.000Z" }) as never)], now).length, 0, "an ended subscription needs no renewal");
  });
});

describe("the live repository reads", () => {
  it("lists plans with their real subscriber counts and MRR", async () => {
    const repo = new live.LivePlansRepository();
    const { summaries } = await repo.listPlans({});
    assert.equal(summaries.length, 1);
    assert.equal(summaries[0]!.subscribers.total, 1);
    assert.equal(summaries[0]!.current!.price.monthlyMinor, 499_900);
  });

  it("an error from the backend is an error, never a silent fall back to demo data", async () => {
    failList = true;
    const repo = new live.LivePlansRepository();
    await assert.rejects(() => repo.listPlans({}), /backend down/);
    await assert.rejects(() => repo.getOverview(), /backend down/);
    await assert.rejects(() => repo.listSubscriptions({}), /backend down/);
  });

  it("builds the overview from real subscriptions; an empty platform is empty, not sample data", async () => {
    const repo = new live.LivePlansRepository();
    const overview = await repo.getOverview();
    assert.equal(overview.portfolio.activePaid, 1);
    assert.equal(overview.portfolio.mrrByCurrency.INR, 499_900);
    assert.deepEqual(overview.endingTrials, []);
    plans = [];
    subs = [];
    const empty = await repo.getOverview();
    assert.equal(empty.portfolio.totalCurrent, 0);
    assert.deepEqual(empty.adoption, []);
  });

  it("shows a subscription's detail with its company, owner, real usage and a not-recorded history", async () => {
    const repo = new live.LivePlansRepository();
    const detail = await repo.getSubscription("s1");
    assert.equal(detail.company.ownerName, "Asha");
    assert.equal(detail.row.usageRisk, "ok");
    assert.equal(detail.usageSummary.highest?.resource, "clients");
    assert.equal(detail.usageSummary.highest?.utilization, 30, "3 of 10 clients is 30%, not 0.3");
    assert.deepEqual(detail.overrides, []);
    await assert.rejects(() => repo.getSubscription("missing"));
  });

  it("has no trials or scheduled changes", async () => {
    const repo = new live.LivePlansRepository();
    assert.deepEqual(await repo.getTrials({}), []);
    assert.deepEqual(await repo.getScheduledChanges(), []);
  });

  it("reads and saves the subscription policy through the backend, and picks a plan while none is chosen", async () => {
    const stored = { trial: { defaultTrialDays: 14, extensionLimitDays: 30, reminderDays: [7], defaultTrialPlan: "", allowWithoutPaymentMethod: true }, renewal: { defaultBillingCycle: "monthly", reminderDays: [7], gracePeriodDays: 7, failedPaymentHandling: "manual_review" }, cancellation: { defaultTiming: "end_of_term", reactivationWindowDays: 60 }, overLimit: {} };
    api.getPolicy = async () => ({ policy: stored, saved: false, updatedAt: null });
    api.savePolicy = async (...args: unknown[]) => {
      calls.push({ fn: "savePolicy", args });
      return { policy: args[0], saved: true, updatedAt: "2026-10-05T00:00:00.000Z" };
    };
    const repo = new live.LivePlansRepository();
    const read = await repo.getPolicy();
    assert.equal(read.trial.defaultTrialPlan, "growth", "an unset trial plan falls back to the first plan on sale");
    assert.equal(read.renewal.failedPaymentHandling, "manual_review");
    const saved = await repo.savePolicy({ ...read, renewal: { ...read.renewal, gracePeriodDays: 10 } } as never, actor);
    assert.equal(saved.renewal.gracePeriodDays, 10);
    assert.equal(calls.at(-1)?.fn, "savePolicy");
  });

  it("a failed policy read fails the page, with no mock fallback", async () => {
    api.getPolicy = async () => {
      throw new ApiError({ code: "SERVICE_UNAVAILABLE", message: "backend down", status: 503 });
    };
    await assert.rejects(() => new live.LivePlansRepository().getPolicy());
  });

  it("draws the trend from the subscriptions' own dates", async () => {
    const day = 86_400_000;
    const startedTenDaysAgo = new Date(Date.now() - 10 * day).toISOString();
    subs = [
      sub({ id: "a", createdAt: startedTenDaysAgo }),
      sub({ id: "b", status: "CANCELED", createdAt: new Date(Date.now() - 20 * day).toISOString(), updatedAt: new Date(Date.now() - 5 * day).toISOString() }),
      sub({ id: "c", status: "INCOMPLETE", createdAt: new Date(Date.now() - 3 * day).toISOString() }),
    ];
    const repo = new live.LivePlansRepository();
    const active = await repo.getTrend("active_paid", "30d");
    assert.equal(active.length, 30);
    assert.equal(active.at(-1)!.value, 1, "today: a is running, b was cancelled, c never started");
    assert.equal(active.find((point) => Date.parse(point.at) <= Date.now() - 25 * day)!.value, 0, "before anything started");
    assert.equal(active.find((point) => Math.abs(Date.parse(point.at) - (Date.now() - 8 * day)) < day / 2)!.value, 2, "a and b were both running 8 days ago");
    const created = await repo.getTrend("new_subscriptions", "30d");
    assert.equal(created.reduce((sum, point) => sum + point.value, 0), 2, "an unpaid subscription has not started");
    const cancelled = await repo.getTrend("cancellations", "30d");
    assert.equal(cancelled.reduce((sum, point) => sum + point.value, 0), 1);
    assert.equal((await repo.getTrend("active_trials", "30d")).every((point) => point.value === 0), true);
  });

  it("uses the audit trail's time for a cancellation when it has one", async () => {
    const day = 86_400_000;
    subs = [sub({ id: "b", status: "CANCELED", createdAt: new Date(Date.now() - 20 * day).toISOString(), updatedAt: new Date(Date.now() - 1 * day).toISOString() })];
    audit.list = async () => ({ items: [{ id: "x", createdAt: new Date(Date.now() - 12 * day).toISOString(), action: "subscription.cancelled", resourceType: "SUBSCRIPTION", resourceId: "b", outcome: "SUCCESS", actor: { type: "USER", name: null, email: null }, companyId: null, companyName: null, metadata: null }], total: 1, page: 1, limit: 100 });
    const cancelled = await new live.LivePlansRepository().getTrend("cancellations", "30d");
    const at = cancelled.findIndex((point) => point.value === 1);
    assert.ok(at >= 0 && at < 20, "cancelled about 12 days ago, not on its last update yesterday");
  });
});

describe("the live repository writes", () => {
  const input = (over: Record<string, unknown> = {}) => ({
    name: "Scale",
    internalCode: "PLAN_SCALE",
    description: "",
    targetSegment: "",
    internalNotes: "",
    price: { currency: "INR", monthlyMinor: 999_900, annualMinor: 0, setupFeeMinor: 0, trialDays: 0, notes: "" },
    features: { automation_engine: true },
    limits: { Clients: { kind: "fixed", value: 50 }, aiCredits: { kind: "fixed", value: 500_000 } },
    availability: { newPurchase: true, upgrade: true, downgrade: true, visibility: "public", currencies: ["INR"] },
    intent: "published",
    ...over,
  });

  it("creates a plan with the price in paise and the two caps, and returns it as read back", async () => {
    const repo = new live.LivePlansRepository();
    const summary = await repo.createPlan(input() as never, actor);
    const upsert = calls.find((call) => call.fn === "upsertPlan")!.args[0];
    assert.deepEqual(upsert, { name: "Scale", monthlyPrice: 999_900, annualPrice: null, features: { maxClients: 50, maxAiTokens: 500_000, automationEnabled: true } }, "an annual price of 0 is sent as not offered");
    assert.equal(summary.plan.name, "Scale");
  });

  it("sends the annual price when there is one, and shows it back", async () => {
    const repo = new live.LivePlansRepository();
    const withAnnual = input({ name: "Yearly", price: { currency: "INR", monthlyMinor: 100_000, annualMinor: 1_000_000, setupFeeMinor: 0, trialDays: 0, notes: "" } });
    const summary = await repo.createPlan(withAnnual as never, actor);
    assert.equal((calls.find((call) => call.fn === "upsertPlan")!.args[0] as { annualPrice: number }).annualPrice, 1_000_000);
    assert.equal(summary.current!.price.annualMinor, 1_000_000);
  });

  it("a plan left without an annual price is valid (monthly only), not an error", async () => {
    const repo = new live.LivePlansRepository();
    const issues = await repo.validatePlan(input({ name: "Monthly Only" }) as never);
    assert.equal(issues.some((issue) => issue.field === "annualMinor"), false);
  });

  it("refuses a plan whose name is taken (the backend would overwrite it), a draft intent, and caps it cannot store", async () => {
    const repo = new live.LivePlansRepository();
    assert.match((await reason(repo.createPlan(input({ name: "growth" }) as never, actor))).message, /already exists/);
    assert.equal((await reason(repo.createPlan(input({ intent: "draft" }) as never, actor))).reason, "not_supported_by_backend");
    assert.match((await reason(repo.createPlan(input({ limits: { Clients: { kind: "unlimited", value: null }, aiCredits: { kind: "fixed", value: 5 } } }) as never, actor))).message, /whole number/);
    assert.equal(calls.filter((call) => call.fn === "upsertPlan").length, 0, "nothing was sent");
  });

  it("keeps a draft for this session only, and publishing sends it as a direct edit", async () => {
    plans = [plan()];
    subs = [];
    const repo = new live.LivePlansRepository();
    const draft = input({ name: "Growth", price: { currency: "INR", monthlyMinor: 599_900, annualMinor: 0, setupFeeMinor: 0, trialDays: 0, notes: "" } });
    const withDraft = await repo.saveDraft("p-growth", draft as never, actor);
    assert.equal(withDraft.draft?.price.monthlyMinor, 599_900);
    assert.equal(withDraft.current?.price.monthlyMinor, 499_900, "the live plan is untouched until publishing");
    assert.equal(calls.filter((call) => call.fn === "upsertPlan").length, 0);
    const published = await repo.publishPlan("p-growth", { rollout: "new_only", migrateCompanyIds: [], note: "" }, actor);
    assert.equal(published.current?.price.monthlyMinor, 599_900);
    assert.equal(published.draft, null);
    assert.equal((await repo.discardDraft("p-growth", actor)).draft, null);
    assert.equal(new live.LivePlansRepository().saveDraft.length, 3);
    assert.equal((await new live.LivePlansRepository().listPlans({})).summaries[0]!.draft, null, "a new session has no drafts");
  });

  it("refuses to publish a change to a plan that has subscribers, and a rename", async () => {
    const repo = new live.LivePlansRepository();
    await repo.saveDraft("p-growth", input({ name: "Growth" }) as never, actor);
    assert.match((await reason(repo.publishPlan("p-growth", { rollout: "new_only", migrateCompanyIds: [], note: "" }, actor))).message, /1 subscriber/);
    subs = [];
    await repo.saveDraft("p-growth", input({ name: "Growth 2" }) as never, actor);
    assert.match((await reason(repo.publishPlan("p-growth", { rollout: "new_only", migrateCompanyIds: [], note: "" }, actor))).message, /Renaming/);
    assert.equal(calls.filter((call) => call.fn === "upsertPlan").length, 0);
  });

  it("hides and shows a plan for real, and does not pretend to retire one or set options it cannot keep", async () => {
    const repo = new live.LivePlansRepository();
    await repo.hidePlan("p-growth", actor);
    await repo.showPlan("p-growth", actor);
    assert.deepEqual(calls.map((call) => call.fn), ["deactivatePlan", "activatePlan"]);
    assert.equal((await reason(repo.retirePlan("p-growth", { reason: "x" }, actor))).reason, "not_supported_by_backend");
    assert.equal((await reason(repo.setAvailability("p-growth", {} as never, actor))).reason, "not_supported_by_backend");
  });

  it("changes a company's plan immediately, in the cycle asked for, and refuses scheduled changes", async () => {
    plans = [plan(), plan({ id: "p-pro", name: "Pro", monthlyPrice: 999_900 })];
    const repo = new live.LivePlansRepository();
    await repo.changeCompanyPlan("s1", { planKey: "pro", billingCycle: "monthly", effective: "immediately", reason: "x", overLimitAcknowledged: true }, actor);
    assert.deepEqual(calls.find((call) => call.fn === "changePlan")!.args, ["s1", "p-pro", "MONTHLY"]);
    await repo.changeCompanyPlan("s1", { planKey: "pro", billingCycle: "annual", effective: "immediately", reason: "x", overLimitAcknowledged: true }, actor);
    assert.deepEqual(calls.filter((call) => call.fn === "changePlan")[1]!.args, ["s1", "p-pro", "ANNUAL"]);
    assert.equal((await reason(repo.changeCompanyPlan("s1", { planKey: "pro", billingCycle: "monthly", effective: "next_renewal", reason: "x", overLimitAcknowledged: true }, actor))).reason, "not_supported_by_backend");
  });

  it("cancels immediately only, reactivates, and refuses everything the backend does not have", async () => {
    const repo = new live.LivePlansRepository();
    assert.equal((await reason(repo.cancelSubscription("s1", { timing: "end_of_term", reason: "x" }, actor))).reason, "not_supported_by_backend");
    await repo.cancelSubscription("s1", { timing: "immediate", reason: "x" }, actor);
    await repo.reactivateSubscription("s1", { reason: "x" }, actor);
    assert.deepEqual(calls.map((call) => call.fn), ["cancelSubscription", "reactivateSubscription"]);
    for (const attempt of [
      repo.extendTrial("s1", { days: 3, reason: "x" }, actor),
      repo.convertTrial("s1", { planKey: "growth", billingCycle: "monthly" }, actor),
      repo.endTrial("s1", { reason: "x" }, actor),
      repo.cancelScheduledChange("s1", { target: "cancellation", reason: "x" }, actor),
      repo.rescheduleChange("s1", { effectiveAt: "", reason: "x" }, actor),
    ]) {
      assert.equal((await reason(attempt)).reason, "not_supported_by_backend");
    }
  });

  it("grants and revokes a company-specific override through the usage API, and refuses what the backend does not track", async () => {
    const repo = new live.LivePlansRepository();
    const detail = await repo.grantOverride(
      "s1",
      { resource: "aiCredits", rule: "additive", value: 500, startsAt: "2026-10-01T00:00:00.000Z", expiresAt: "2026-11-01T00:00:00.000Z", reason: "Pilot campaign", approvedBy: "Renu Balakrishnan" },
      actor,
    );
    const grant = calls.find((call) => call.fn === "createUsageOverride");
    assert.ok(grant, "the grant reaches the usage overrides API");
    const payload = grant.args[0] as { subscriptionId: string; companyId: string; resource: string; rule: string; amount: number; approvedBy: string };
    assert.equal(payload.subscriptionId, "s1");
    assert.equal(payload.companyId, "c1");
    assert.equal(payload.resource, "aiCredits", "the plan resource key is mapped to the usage resource key");
    assert.equal(payload.rule, "additive");
    assert.equal(payload.amount, 500);
    assert.equal(payload.approvedBy, "Renu Balakrishnan");
    assert.equal(detail.row.id, "s1", "the caller gets the reloaded subscription detail");

    await repo.revokeOverride("s1", "ovr_1", { reason: "No longer needed" }, actor);
    const revoke = calls.find((call) => call.fn === "revokeUsageOverride");
    assert.ok(revoke, "the revocation reaches the usage overrides API");
    assert.equal(revoke.args[0], "ovr_1");
    assert.deepEqual(revoke.args[1], { reason: "No longer needed", actor });

    const refused = await repo
      .grantOverride(
        "s1",
        { resource: "whatsappMessages", rule: "absolute", value: 10, startsAt: "2026-10-01T00:00:00.000Z", expiresAt: "2026-11-01T00:00:00.000Z", reason: "x", approvedBy: "y" },
        actor,
      )
      .catch((error: unknown) => error);
    assert.ok(ApiError.isApiError(refused) && refused.code === "VALIDATION_FAILED", `expected a validation failure, got ${String(refused)}`);
    assert.equal(calls.filter((call) => call.fn === "createUsageOverride").length, 1, "nothing is sent for a resource the backend does not track");

    const noReason = await repo.revokeOverride("s1", "ovr_1", { reason: "   " }, actor).catch((error: unknown) => error);
    assert.ok(ApiError.isApiError(noReason) && noReason.code === "VALIDATION_FAILED", `expected a validation failure, got ${String(noReason)}`);
    assert.equal(calls.filter((call) => call.fn === "revokeUsageOverride").length, 1, "a revocation without a reason is never sent");
  });

  it("a failed backend call fails the action: no mock success afterwards", async () => {
    api.cancelSubscription = async () => {
      throw new ApiError({ code: "CONFLICT", message: "cannot cancel", status: 409 });
    };
    const repo = new live.LivePlansRepository();
    await assert.rejects(() => repo.cancelSubscription("s1", { timing: "immediate", reason: "x" }, actor), /cannot cancel/);
  });
});
