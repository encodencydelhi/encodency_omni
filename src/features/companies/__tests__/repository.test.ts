/**
 * Behaviour of the repository through the demo provider: what a mutation does,
 * what it refuses to do, and that every screen's source of truth moves together.
 */
import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";

// The provider simulates latency; the tests do not need to wait for it.
process.env.NEXT_PUBLIC_MOCK_LATENCY_MS = "0";
const { companiesRepository: repo } = await import("../data/repository");
const { ApiError } = await import("@/types/api");

const actor = { id: "stf_001", name: "Aditya Raghunath" };
const other = { id: "stf_002", name: "Renu Balakrishnan" };

const baseInput = {
  name: "Test Harbour Foods",
  website: "harbourfoods.test.in",
  industry: "FMCG",
  country: "India",
  owner: { name: "Nia Sen", email: "nia@harbourfoods.test.in" },
  subscription: { planTier: "growth" as const, billingCycle: "monthly" as const, mode: "trial" as const, startDate: "2026-09-09" },
  workspace: { timezone: "Asia/Kolkata", currency: "INR", language: "English", region: "India (Mumbai)" },
};

async function rejects(promise: Promise<unknown>, code: string) {
  await assert.rejects(promise, (error: unknown) => ApiError.isApiError(error) && error.code === code, `expected ${code}`);
}

beforeEach(async () => {
  await repo.resetDemoData?.();
});

describe("mode", () => {
  it("resolves to the demo provider while mock mode is on", () => {
    assert.equal(repo.mode, "mock");
  });
});

describe("create company", () => {
  it("appears in the list, KPIs and recent signups, with an initialised subscription", async () => {
    const before = await repo.getPortfolio();
    const created = await repo.createCompany({ ...baseInput, initialClient: { name: "Harbour Kitchen" } }, actor);

    assert.equal(created.company.accountStatus, "active");
    assert.equal(created.subscriptionStatus, "trialing");
    assert.equal(created.plan.tier, "growth");
    assert.equal(created.counts.users, 1);
    assert.equal(created.counts.clients, 1);
    assert.equal(created.owner.state, "invited", "owner is a pending invitation, not a fabricated active user");
    assert.equal(created.onboarding, "awaiting_owner");
    assert.equal(created.mrrMinor, 0, "a trial generates no recurring revenue");

    const after = await repo.getPortfolio();
    assert.equal(after.total, before.total + 1);
    assert.equal(after.trialing, before.trialing + 1);
    assert.equal(after.recentSignups[0]?.company.id, created.company.id);

    const found = await repo.listCompanies({ search: "harbourfoods" });
    assert.equal(found.data.length, 1);
    assert.equal((await repo.getCompany(created.company.id)).company.name, "Test Harbour Foods");
  });

  it("inherits limits from the plan catalogue and records creation in activity", async () => {
    const created = await repo.createCompany(baseInput, actor);
    const plans = await repo.listPlans();
    const growth = plans.find((plan) => plan.tier === "growth")!;
    const usage = await repo.getUsage(created.company.id);

    assert.equal(usage.records.find((record) => record.resource === "users")?.includedLimit, growth.limits.users);
    assert.equal(usage.records.find((record) => record.resource === "aiCredits")?.includedLimit, growth.limits.aiCredits);
    assert.equal(usage.records.every((record) => record.used === 0 || record.resource === "users" || record.resource === "clients" || record.resource === "connectedAccounts"), true);

    const activity = await repo.getActivity(created.company.id, {});
    assert.ok(activity.entries.some((entry) => entry.action === "company.created"));
    assert.ok(activity.entries.some((entry) => entry.action === "owner.invited"));
    assert.ok(activity.entries.some((entry) => entry.action === "subscription.trial_started"));
  });

  it("rejects missing or malformed fields with field errors", async () => {
    await assert.rejects(
      repo.createCompany({ ...baseInput, name: " ", website: "not a url", owner: { name: "", email: "bad" } }, actor),
      (error: unknown) => ApiError.isApiError(error) && error.code === "VALIDATION_FAILED" && Boolean(error.fieldErrors?.name) && Boolean(error.fieldErrors?.website) && Boolean(error.fieldErrors?.ownerEmail),
    );
  });

  it("gives duplicate names distinct ids", async () => {
    const one = await repo.createCompany(baseInput, actor);
    const two = await repo.createCompany(baseInput, actor);
    assert.notEqual(one.company.id, two.company.id);
    assert.notEqual(one.company.displayId, two.company.displayId);
  });

  it("finds existing platform users by email, across tenants", async () => {
    const companies = await repo.listCompanies({ search: "namo", pageSize: 1 });
    const users = await repo.getUsers(companies.data[0]!.company.id);
    const someone = users.users[0]!;
    const matches = await repo.findPlatformUsers(someone.email.toUpperCase());
    assert.ok(matches.some((match) => match.email === someone.email));
    assert.deepEqual(await repo.findPlatformUsers("nobody@nowhere.example"), []);
  });
});

describe("suspension", () => {
  it("suspends and reactivates, updating status, KPIs, MRR and activity", async () => {
    const before = await repo.getPortfolio();
    const target = (await repo.listCompanies({ accountStatus: "active", subscriptionStatus: "active", pageSize: 50 })).data.find((item) => item.mrrMinor > 0)!;

    const result = await repo.suspendCompanies([target.company.id], { reason: "billing", note: "Chargeback dispute" }, actor);
    assert.deepEqual(result.updated, [target.company.id]);

    const suspended = await repo.getCompany(target.company.id);
    assert.equal(suspended.company.accountStatus, "suspended");
    assert.equal(suspended.company.suspension?.reason, "billing");
    assert.equal(suspended.health.status, "suspended");
    assert.equal(suspended.mrrMinor, 0);

    const mid = await repo.getPortfolio();
    assert.equal(mid.suspended, before.suspended + 1);
    assert.equal(mid.active, before.active - 1);
    assert.equal(mid.mrrMinor, before.mrrMinor - target.mrrMinor);

    await repo.reactivateCompanies([target.company.id], { note: "Resolved" }, actor);
    const restored = await repo.getCompany(target.company.id);
    assert.equal(restored.company.accountStatus, "active");
    assert.equal(restored.company.suspension, null);
    assert.equal((await repo.getPortfolio()).suspended, before.suspended);

    const log = (await repo.getActivity(target.company.id, {})).entries.map((entry) => entry.action);
    assert.ok(log.includes("company.suspended") && log.includes("company.reactivated"));
  });

  it("reports which companies in a bulk action were skipped, and why", async () => {
    const active = (await repo.listCompanies({ accountStatus: "active", pageSize: 2 })).data.map((item) => item.company.id);
    const already = (await repo.listCompanies({ accountStatus: "suspended", pageSize: 1 })).data[0]!.company.id;
    const result = await repo.suspendCompanies([...active, already, "cmp_missing"], { reason: "operational", note: "" }, actor);
    assert.equal(result.updated.length, 2);
    assert.equal(result.skipped.length, 2);
    assert.ok(result.skipped.some((item) => item.reason === "Already suspended"));
    assert.ok(result.skipped.some((item) => item.id === "cmp_missing"));
  });

  it("refuses to reactivate a company that is not suspended", async () => {
    const active = (await repo.listCompanies({ accountStatus: "active", pageSize: 1 })).data[0]!.company.id;
    const result = await repo.reactivateCompanies([active], { note: "" }, actor);
    assert.equal(result.updated.length, 0);
    assert.equal(result.skipped.length, 1);
  });
});

describe("archive", () => {
  it("archives (never deletes) and blocks further changes", async () => {
    const target = (await repo.listCompanies({ accountStatus: "active", pageSize: 1 })).data[0]!;
    await repo.archiveCompany(target.company.id, { note: "Contract ended" }, actor);
    const archived = await repo.getCompany(target.company.id);
    assert.equal(archived.company.accountStatus, "archived");
    assert.equal(archived.mrrMinor, 0);
    assert.equal((await repo.listCompanies({ search: target.company.name })).data.length >= 1, true, "archived companies stay on the register");
    await rejects(repo.archiveCompany(target.company.id, { note: "" }, actor), "CONFLICT");
    await rejects(
      repo.updateCompany(target.company.id, { name: "X", legalName: null, website: null, industry: "Retail", country: "India", contactPhone: null, contactEmail: null, companySize: null, internalTags: [], internalOwners: archived.company.internalOwners }, actor),
      "CONFLICT",
    );
  });
});

describe("ownership", () => {
  async function company(id: string) {
    return (await repo.getUsers(id)).users;
  }

  it("transfers ownership without ever leaving the company ownerless", async () => {
    const target = (await repo.listCompanies({ search: "meridian" })).data[0]!;
    const before = await company(target.company.id);
    const candidate = before.find((user) => user.status === "active" && user.role !== "owner")!;

    const updated = await repo.transferOwnership(target.company.id, { newOwnerUserId: candidate.id, note: "Handover" }, actor);
    assert.equal(updated.company.ownerUserId, candidate.id);
    assert.equal(updated.owner.name, candidate.name);

    const after = await company(target.company.id);
    assert.equal(after.filter((user) => user.role === "owner").length, 1);
    assert.equal(after.find((user) => user.id === before.find((item) => item.role === "owner")!.id)?.role, "admin");
    assert.equal(after.find((user) => user.id === candidate.id)?.role, "owner");
  });

  it("rejects a transfer to someone who is not an active member", async () => {
    const target = (await repo.listCompanies({ search: "meridian" })).data[0]!;
    const users = await company(target.company.id);
    const invited = users.find((user) => user.status !== "active" && user.role !== "owner");
    if (invited) await rejects(repo.transferOwnership(target.company.id, { newOwnerUserId: invited.id, note: "" }, actor), "CONFLICT");
    await rejects(repo.transferOwnership(target.company.id, { newOwnerUserId: "usr_nobody", note: "" }, actor), "NOT_FOUND");
    const owner = users.find((user) => user.role === "owner")!;
    await rejects(repo.transferOwnership(target.company.id, { newOwnerUserId: owner.id, note: "" }, actor), "CONFLICT");
  });

  it("protects the only active owner from suspension", async () => {
    const target = (await repo.listCompanies({ search: "meridian" })).data[0]!;
    const users = await company(target.company.id);
    const owner = users.find((user) => user.role === "owner" && user.status === "active")!;
    await rejects(repo.setUserStatus(target.company.id, owner.id, "suspended", actor), "CONFLICT");
    const member = users.find((user) => user.role !== "owner" && user.status === "active")!;
    const summary = await repo.setUserStatus(target.company.id, member.id, "suspended", actor);
    assert.equal(summary.counts.activeUsers, users.filter((user) => user.status === "active").length - 1);
  });
});

describe("subscription", () => {
  it("changes plan immediately: plan, MRR, limits and activity all follow", async () => {
    const target = (await repo.listCompanies({ plan: "growth", accountStatus: "active", subscriptionStatus: "active", pageSize: 50 })).data.find((item) => item.mrrMinor > 0)!;
    const plans = await repo.listPlans();
    const agency = plans.find((plan) => plan.tier === "agency")!;

    const updated = await repo.changePlan(target.company.id, { planTier: "agency", billingCycle: target.plan.billingCycle, effective: "immediately", reason: "Upsell" }, actor);
    assert.equal(updated.plan.tier, "agency");
    assert.ok(updated.mrrMinor > target.mrrMinor);

    const data = await repo.getSubscription(target.company.id);
    assert.equal(data.plan.tier, "agency");
    assert.equal(data.usage.records.find((record) => record.resource === "aiCredits")?.includedLimit, agency.limits.aiCredits);
    assert.equal((await repo.listCompanies({ search: target.company.name })).data[0]?.plan.tier, "agency");
    assert.ok((await repo.getActivity(target.company.id, {})).entries.some((entry) => entry.action === "subscription.plan_changed" && entry.previousValue?.startsWith("Growth") && entry.newValue?.startsWith("Agency")));
  });

  it("schedules a change for renewal without touching today's plan or MRR", async () => {
    const target = (await repo.listCompanies({ plan: "growth", accountStatus: "active", subscriptionStatus: "active", pageSize: 50 })).data.find((item) => item.mrrMinor > 0)!;
    const updated = await repo.changePlan(target.company.id, { planTier: "agency", billingCycle: target.plan.billingCycle, effective: "next_renewal", reason: "" }, actor);
    assert.equal(updated.plan.tier, "growth");
    assert.equal(updated.mrrMinor, target.mrrMinor);
    assert.equal((await repo.getSubscription(target.company.id)).subscription.scheduledChange?.planTier, "agency");
  });

  it("rejects a no-op plan change and a change on an ended subscription", async () => {
    const target = (await repo.listCompanies({ plan: "growth", accountStatus: "active", subscriptionStatus: "active", pageSize: 1 })).data[0]!;
    await rejects(repo.changePlan(target.company.id, { planTier: "growth", billingCycle: target.plan.billingCycle, effective: "immediately", reason: "" }, actor), "VALIDATION_FAILED");
    const expired = (await repo.listCompanies({ subscriptionStatus: "expired", pageSize: 1 })).data[0];
    if (expired) await rejects(repo.changePlan(expired.company.id, { planTier: "agency", billingCycle: "monthly", effective: "immediately", reason: "" }, actor), "CONFLICT");
  });

  it("extends a trial, converts it without collecting payment, and refuses both on a paid subscription", async () => {
    const trial = (await repo.listCompanies({ subscriptionStatus: "trialing", pageSize: 5 })).data[0]!;
    const before = (await repo.getSubscription(trial.company.id)).subscription.trialEndsAt!;
    await repo.extendTrial(trial.company.id, { days: 7, reason: "Onboarding delay" }, actor);
    const after = (await repo.getSubscription(trial.company.id)).subscription.trialEndsAt!;
    assert.equal(Date.parse(after) - Date.parse(before), 7 * 86_400_000);
    await rejects(repo.extendTrial(trial.company.id, { days: 0, reason: "" }, actor), "VALIDATION_FAILED");

    await repo.convertTrialToPaid(trial.company.id, { billingCycle: "monthly" }, actor);
    const billing = await repo.getBilling(trial.company.id);
    assert.equal(billing.payments.length, 0, "no payment may be recorded in demo mode");
    assert.ok(billing.invoices.every((invoice) => invoice.status === "open"));
    assert.ok(["payment_due", "no_payment_method"].includes(billing.summary.status) || billing.summary.outstandingMinor > 0);

    const paid = (await repo.listCompanies({ subscriptionStatus: "active", pageSize: 1 })).data[0]!;
    await rejects(repo.extendTrial(paid.company.id, { days: 7, reason: "" }, actor), "CONFLICT");
    await rejects(repo.convertTrialToPaid(paid.company.id, { billingCycle: "monthly" }, actor), "CONFLICT");
  });

  it("schedules a cancellation and reactivates it", async () => {
    const paid = (await repo.listCompanies({ accountStatus: "active", subscriptionStatus: "active", pageSize: 1 })).data[0]!;
    const cancelling = await repo.scheduleCancellation(paid.company.id, { reason: "Customer request" }, actor);
    assert.equal(cancelling.subscriptionStatus, "scheduled_cancellation");
    assert.ok(cancelling.attention.some((item) => item.kind === "cancellation_scheduled"));
    const back = await repo.reactivateSubscription(paid.company.id, actor);
    assert.equal(back.subscriptionStatus, "active");
  });

  it("applies an override on top of the plan, and validates it", async () => {
    const target = (await repo.listCompanies({ plan: "starter", accountStatus: "active", pageSize: 1 })).data[0]!;
    const before = (await repo.getUsage(target.company.id)).records.find((record) => record.resource === "users")!;
    const start = "2026-09-09";
    const end = "2026-10-09";

    await rejects(repo.applyUsageOverride(target.company.id, { resource: "users", overrideLimit: 0, reason: "x", startsAt: start, expiresAt: end }, actor), "VALIDATION_FAILED");
    await rejects(repo.applyUsageOverride(target.company.id, { resource: "users", overrideLimit: 9, reason: " ", startsAt: start, expiresAt: end }, actor), "VALIDATION_FAILED");
    await rejects(repo.applyUsageOverride(target.company.id, { resource: "users", overrideLimit: 9, reason: "Pilot", startsAt: end, expiresAt: start }, actor), "VALIDATION_FAILED");
    await rejects(repo.applyUsageOverride(target.company.id, { resource: "scheduledPosts", overrideLimit: 9, reason: "Pilot", startsAt: start, expiresAt: end }, actor), "VALIDATION_FAILED");

    await repo.applyUsageOverride(target.company.id, { resource: "users", overrideLimit: 9, reason: "Pilot cohort", startsAt: start, expiresAt: end }, actor);
    const after = (await repo.getUsage(target.company.id)).records.find((record) => record.resource === "users")!;
    assert.equal(after.includedLimit, before.includedLimit, "the plan limit is untouched");
    assert.equal(after.effectiveLimit, 9);
    assert.equal(after.activeOverride?.approvedBy, actor.name);
    assert.ok((await repo.getActivity(target.company.id, {})).entries.some((entry) => entry.action === "usage.override_applied" && entry.reason === "Pilot cohort"));
  });
});

describe("internal ownership, notes and security", () => {
  it("assigns internal owners across companies and reflects them everywhere", async () => {
    const ids = (await repo.listCompanies({ pageSize: 3 })).data.map((item) => item.company.id);
    const staff = (await repo.listStaff()).find((member) => member.status === "active")!;
    const result = await repo.assignInternalOwners(ids, { accountManagerId: staff.id }, actor);
    assert.equal(result.updated.length, 3);
    for (const id of ids) assert.equal((await repo.getCompany(id)).internalOwners.accountManager?.id, staff.id);
    assert.equal((await repo.getOverview(ids[0]!)).summary.internalOwners.accountManager?.id, staff.id);
  });

  it("lets only the author edit or delete a note, but anyone pin it", async () => {
    const id = (await repo.listCompanies({ pageSize: 1 })).data[0]!.company.id;
    const note = await repo.addNote(id, { content: "Call back Tuesday", tags: ["sales"] }, actor);
    await rejects(repo.updateNote(id, note.id, { content: "Hijacked", tags: [] }, other), "FORBIDDEN");
    await rejects(repo.deleteNote(id, note.id, other), "FORBIDDEN");
    const pinned = await repo.setNotePinned(id, note.id, true, other);
    assert.equal(pinned.pinned, true);
    const edited = await repo.updateNote(id, note.id, { content: "Call back Wednesday", tags: ["sales", "billing"] }, actor);
    assert.equal(edited.content, "Call back Wednesday");
    await repo.deleteNote(id, note.id, actor);
    assert.ok(!(await repo.getOverview(id)).notes.some((item) => item.id === note.id));
    await rejects(repo.addNote(id, { content: "  ", tags: [] }, actor), "VALIDATION_FAILED");
  });

  it("records security actions as requests, never as completed enforcement", async () => {
    const id = (await repo.listCompanies({ accountStatus: "active", pageSize: 1 })).data[0]!.company.id;
    const before = (await repo.getSecurity(id)).security.activeSessions;
    await repo.revokeSessions(id, actor);
    await repo.requirePasswordReset(id, actor);
    const after = (await repo.getSecurity(id)).security;
    assert.equal(after.activeSessions, before, "no session was really ended");
    assert.ok(after.sessionRevocationRequestedAt && after.passwordResetRequestedAt);
    const log = (await repo.getActivity(id, {})).entries.filter((entry) => entry.module === "security").map((entry) => entry.summary).join(" ");
    assert.match(log, /demo/i);

    await repo.setAccessLock(id, { locked: true, reason: "Investigation" }, actor);
    await rejects(repo.setAccessLock(id, { locked: true, reason: "again" }, actor), "CONFLICT");
    await repo.setAccessLock(id, { locked: false, reason: "" }, actor);
  });
});

describe("tenant isolation", () => {
  it("returns only the selected company's records from every section", async () => {
    const [a, b] = (await repo.listCompanies({ pageSize: 2, sort: { field: "name", direction: "asc" } })).data;
    for (const company of [a!, b!]) {
      const id = company.company.id;
      const [users, clients, integrations, billing, activity, security] = await Promise.all([
        repo.getUsers(id),
        repo.getClients(id),
        repo.getIntegrations(id),
        repo.getBilling(id),
        repo.getActivity(id, {}),
        repo.getSecurity(id),
      ]);
      assert.ok(users.users.every((user) => user.companyId === id));
      assert.ok(clients.clients.every((client) => client.companyId === id));
      assert.ok(integrations.integrations.every((item) => item.companyId === id));
      assert.ok(billing.invoices.every((item) => item.companyId === id) && billing.payments.every((item) => item.companyId === id));
      assert.ok(activity.entries.every((entry) => entry.companyId === id));
      assert.equal(security.security.companyId, id);
    }
  });

  it("reports an unknown company as not found rather than returning another tenant's data", async () => {
    await rejects(repo.getCompany("cmp_does-not-exist"), "NOT_FOUND");
    await rejects(repo.getBilling("cmp_does-not-exist"), "NOT_FOUND");
    await rejects(repo.getUsers("cmp_does-not-exist"), "NOT_FOUND");
  });
});

describe("usage history", () => {
  it("returns a series for a resource that ends on the current usage for level resources", async () => {
    const id = (await repo.listCompanies({ accountStatus: "active", pageSize: 1 })).data[0]!.company.id;
    const usage = await repo.getUsage(id);
    const users = await repo.getUsageHistory(id, "users", { from: "2026-08-10", to: "2026-09-09" });
    assert.equal(users.kind, "level");
    assert.equal(users.points.at(-1)?.value, usage.records.find((record) => record.resource === "users")?.used);
    assert.ok(users.points.length > 20);

    const ai = await repo.getUsageHistory(id, "aiCredits", { from: "2026-09-03", to: "2026-09-09" });
    assert.equal(ai.kind, "flow");
    assert.ok(ai.points.every((point) => point.value >= 0));
  });

  it("is stable between calls", async () => {
    const id = (await repo.listCompanies({ accountStatus: "active", pageSize: 1 })).data[0]!.company.id;
    const range = { from: "2026-08-10", to: "2026-09-09" };
    assert.deepEqual(await repo.getUsageHistory(id, "aiCredits", range), await repo.getUsageHistory(id, "aiCredits", range));
  });
});
