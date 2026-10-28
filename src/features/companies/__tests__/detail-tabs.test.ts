/**
 * The company detail tabs in API mode: overview, subscription, billing, activity and security are built from the
 * backend's own endpoints. They used to wait on the demo provider too, which now refuses every call ("not connected"),
 * so each of them always failed on a real company. `fetch` is stubbed here, so nothing depends on a running server.
 *
 * `node --test` runs each file in its own process, so the environment set here cannot leak into the other suites.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";

process.env.NEXT_PUBLIC_DATA_SOURCE = "api";

const ID = "a6577b9c-9745-44b0-a17d-6f408b64ecdf";
const NO_SUBSCRIPTION_ID = "b6577b9c-9745-44b0-a17d-6f408b64ecdf";
const NOW = new Date().toISOString();
const FUTURE = new Date(Date.now() + 20 * 86_400_000).toISOString();

const companyDetail = (id: string, withSubscription: boolean) => ({
  id,
  name: "Encodency Pvt. Ltd.",
  status: "ACTIVE",
  archivedAt: null,
  createdAt: NOW,
  memberCount: 1,
  clientCount: 1,
  ownerEmail: "Owner@Acme.test",
  ownerOnboarding: { state: "active", ownerEmail: "Owner@Acme.test" },
  members: [{ membershipId: "m1", userId: "u1", email: "Owner@Acme.test", name: "Owner", systemRole: "OWNER" }],
  clients: [{ id: "c1", name: "Client One", createdAt: NOW }],
  subscription: withSubscription
    ? { id: "s1", planId: "p-growth", planName: "Growth", status: "ACTIVE", billingCycle: "MONTHLY", currentPeriodEnd: FUTURE, createdAt: NOW }
    : null,
  securitySettings: {
    authentication: { require2FAForAllMembers: true },
    sessionPolicy: { idleSessionTimeoutMinutes: 120 },
    accessPolicy: { allowedEmailDomains: ["acme.test"] },
  },
});

const subscriptionRow = {
  id: "s1",
  companyId: ID,
  planId: "p-growth",
  status: "ACTIVE",
  billingCycle: "MONTHLY",
  currentPeriodEnd: FUTURE,
  createdAt: NOW,
  updatedAt: NOW,
  plan: { id: "p-growth", name: "Growth", monthlyPrice: 499_900 },
};

const invoice = (id: string, companyId: string, paid: boolean) => ({
  id,
  number: `INV-${id}`,
  companyId,
  documentState: "issued",
  collectionState: paid ? "paid" : "unpaid",
  timingState: paid ? "not_due" : "overdue",
  issuedAt: NOW,
  dueAt: NOW,
  currency: "INR",
  totalMinor: 490_000,
  outstandingBalanceMinor: paid ? 0 : 490_000,
  lineItems: [{ description: "Growth plan" }],
});

const activityItem = (id: string, action: string, module: string, outcome = "SUCCESS", actor = { userId: "u1", name: "Owner", email: "Owner@Acme.test" }) => ({
  id,
  at: NOW,
  actor,
  action,
  label: action.replace(/[._]/g, " "),
  module,
  resourceType: "COMPANY",
  resourceLabel: "Company",
  resourceId: ID,
  outcome,
});

function respond(rawUrl: string): unknown {
  const url = new URL(rawUrl, "http://localhost");
  const path = url.pathname;
  const q = url.searchParams;
  if (path.endsWith("/super-admin/billing/snapshot")) {
    return {
      invoices: [invoice("1", ID, false), invoice("2", "some-other-company", false), invoice("3", ID, true)],
      payments: [
        { id: "pay1", reference: "PAY-1", companyId: ID, method: "card", currency: "INR", grossAmountMinor: 490_000, attemptStatus: "succeeded", failureReason: null, createdAt: NOW, allocations: [{ invoiceId: "3", invoiceNumber: "INV-3" }] },
        { id: "pay2", reference: "PAY-2", companyId: "some-other-company", method: "card", currency: "INR", grossAmountMinor: 1, attemptStatus: "succeeded", failureReason: null, createdAt: NOW, allocations: [] },
      ],
    };
  }
  if (path.endsWith("/super-admin/support/tickets")) {
    const total = q.get("priority") === "high" ? 2 : q.get("priority") === "urgent" ? 1 : q.get("sla") === "breached" ? 1 : q.get("group") === "active" ? 5 : 9;
    return {
      total,
      items: [{ id: "t1", number: 42, subject: "Cannot connect YouTube", priority: "high", status: "waiting_on_customer", createdAt: NOW, lastActivityAt: NOW }],
    };
  }
  if (path.endsWith("/super-admin/user-insights/activity")) {
    return {
      items: [
        activityItem("a1", "company.security_settings.updated", "Organization"),
        activityItem("a2", "user.sessions.revoked", "Team"),
        activityItem("a3", "invitation.created", "Team"),
        activityItem("a4", "billing.invoice.failed", "Billing", "FAILURE"),
        activityItem("a5", "company.updated", "Organization", "SUCCESS", { userId: "staff-1", name: "Manish", email: "m@platform.test" }),
      ],
    };
  }
  if (path.includes("/super-admin/usage/companies/")) {
    return { summary: { rows: [], highest: null, attention: "within", updatedAt: NOW }, overrides: [] };
  }
  if (path.endsWith("/super-admin/subscriptions")) {
    return q.get("companyId") === ID ? [subscriptionRow] : [];
  }
  if (path.endsWith("/super-admin/plans")) {
    return [{ id: "p-growth", name: "Growth", monthlyPrice: 499_900, annualPrice: 4_999_000, maxClients: 10, maxAiTokens: 100_000, isActive: true, updatedAt: NOW }];
  }
  if (path.endsWith("/super-admin/staff")) {
    return { items: [{ id: "staff-1", name: "Manish", email: "m@platform.test", platformRole: "SUPER_ADMIN", status: "ACTIVE", department: "" }] };
  }
  if (path.endsWith("/super-admin/users") || path.endsWith("/super-admin/invitations")) {
    return { items: [] };
  }
  if (path.includes("/super-admin/companies/")) {
    return companyDetail(path.includes(NO_SUBSCRIPTION_ID) ? NO_SUBSCRIPTION_ID : ID, !path.includes(NO_SUBSCRIPTION_ID));
  }
  throw new Error(`Unexpected request: ${rawUrl}`);
}

globalThis.fetch = (async (input: RequestInfo | URL) => {
  const body = respond(String(input));
  return new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" } });
}) as typeof fetch;

const { companiesRepository } = await import("../data/repository");

describe("company detail tabs (api mode)", () => {
  it("overview loads real data and never reports 'not connected'", async () => {
    const overview = await companiesRepository.getOverview(ID);
    assert.equal(overview.summary.company.name, "Encodency Pvt. Ltd.");
    assert.equal(overview.subscription?.planTier, "growth");
    assert.equal(overview.subscription?.status, "active");
    assert.equal(overview.summary.mrrMinor, 499_900, "MRR is the subscribed plan's monthly price");
    assert.deepEqual(overview.notes, [], "the backend has no notes store");
    assert.equal(overview.recentActivity.length, 5);
  });

  it("overview's support snapshot comes from the desk's totals", async () => {
    const { support } = await companiesRepository.getOverview(ID);
    assert.ok(support);
    assert.equal(support.openTickets, 5);
    assert.equal(support.highPriorityTickets, 3, "high + urgent");
    assert.equal(support.slaBreaches, 1);
    assert.equal(support.latest?.reference, "#42");
    assert.equal(support.latest?.status, "waiting");
    assert.equal(support.latest?.priority, "high");
  });

  it("overview of a company without a subscription still loads", async () => {
    const overview = await companiesRepository.getOverview(NO_SUBSCRIPTION_ID);
    assert.equal(overview.subscription, null);
  });

  it("subscription maps the real row, the plan and the plan list", async () => {
    const data = await companiesRepository.getSubscription(ID);
    assert.equal(data.subscription.id, "s1");
    assert.equal(data.subscription.billingCycle, "monthly");
    assert.equal(data.plan.id, "p-growth");
    assert.equal(data.plans.length, 1);
    assert.equal(data.mrrMinor, 499_900);
    assert.equal(data.companyName, "Encodency Pvt. Ltd.");
  });

  it("subscription of a company with none says so honestly", async () => {
    await assert.rejects(companiesRepository.getSubscription(NO_SUBSCRIPTION_ID), (err: any) => err.code === "UNKNOWN" && /no subscription/i.test(err.message));
  });

  it("billing lists only this company's invoices and payments", async () => {
    const billing = await companiesRepository.getBilling(ID);
    assert.deepEqual(billing.invoices.map((item) => item.number), ["INV-1", "INV-3"]);
    assert.deepEqual(billing.payments.map((item) => item.reference), ["PAY-1"]);
    assert.equal(billing.invoices[0]?.status, "overdue");
    assert.equal(billing.invoices[1]?.status, "paid");
    assert.equal(billing.invoices[1]?.paymentId, "pay1", "an invoice links to the payment allocated to it");
    assert.equal(billing.summary.outstandingMinor, 490_000);
    assert.equal(billing.summary.status, "payment_due");
    assert.equal(billing.summary.lastPayment?.reference, "PAY-1");
    assert.equal(billing.summary.paymentMethod, null, "no payment method is stored, so none is shown");
    assert.equal(billing.plan?.id, "p-growth");
    assert.deepEqual(billing.billingNotes, []);
  });

  it("activity maps the feed and honours the filters", async () => {
    const all = await companiesRepository.getActivity(ID, {});
    assert.equal(all.entries.length, 5);
    assert.equal(all.total, 5);
    assert.equal(all.entries.find((entry) => entry.id === "a1")?.actor.type, "customer", "a company owner is not staff");
    assert.equal(all.entries.find((entry) => entry.id === "a5")?.actor.type, "staff");
    assert.ok(all.actors.includes("Owner"));
    const billing = await companiesRepository.getActivity(ID, { module: "billing" });
    assert.deepEqual(billing.entries.map((entry) => entry.action), ["billing.invoice.failed"]);
    assert.equal(billing.entries[0]?.result, "failure");
    assert.equal(billing.total, 5, "total is the unfiltered count");
    const searched = await companiesRepository.getActivity(ID, { search: "sessions" });
    assert.equal(searched.entries.length, 1);
  });

  it("security reads the company's own policy settings and audit trail", async () => {
    const data = await companiesRepository.getSecurity(ID);
    assert.equal(data.security.policies.require2fa, true);
    assert.equal(data.security.policies.sessionTimeoutMinutes, 120);
    assert.deepEqual(data.security.allowedEmailDomains, ["acme.test"]);
    assert.deepEqual(data.security.events.map((event) => event.type).sort(), ["policy_changed", "session_revocation"]);
    assert.equal(data.security.activeSessions, null, "no per-company session counter exists");
    assert.equal(data.security.accountLockouts, null);
    assert.equal(data.security.accessLock, null);
    assert.equal(data.users.length, 1);
    assert.equal(data.adoption.totalUsers, 1);
  });
});
