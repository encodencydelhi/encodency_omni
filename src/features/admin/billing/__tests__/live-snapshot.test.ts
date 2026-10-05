import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { actionGates, evaluateCapabilities } from "../billing-data/capability-provider";
import { attentionItems, nextPayment, outstandingInvoice, subscriptionFlags, usageRows } from "../billing-data/selectors";
import { billingRoleOf, buildLiveSnapshot, mapPlans, toBackendContact, toBillingContact, toBillingProfile, toInvoices, toOrganizationPatch, toPayments, type LiveSnapshotInput } from "../billing-data/live-snapshot";

const input = (over: Partial<LiveSnapshotInput> = {}): LiveSnapshotInput => ({
  summary: {
    subscriptionId: "sub-1",
    status: "ACTIVE",
    plan: { id: "p1", name: "Growth", isActive: true, monthlyPrice: 499900 },
    currentPeriodEnd: "2026-11-05T00:00:00.000Z",
    startedAt: "2026-08-05T00:00:00.000Z",
    limits: { maxClients: 10, maxAiTokens: 100000 },
    usage: { currentClients: 3, currentAiTokens: 2500 },
  },
  invoices: [
    { id: "aaaaaaaa-1111-2222-3333-444444444444", amount: 499900, status: "PAID", paidAt: "2026-10-05T00:00:00.000Z", invoiceUrl: null, createdAt: "2026-10-01T00:00:00.000Z" },
    { id: "bbbbbbbb-1111-2222-3333-444444444444", amount: 499900, status: "OPEN", paidAt: null, invoiceUrl: null, createdAt: "2026-11-01T00:00:00.000Z" },
    { id: "cccccccc-1111-2222-3333-444444444444", amount: 100, status: "DRAFT", paidAt: null, invoiceUrl: null, createdAt: "2026-11-02T00:00:00.000Z" },
  ],
  organization: { name: "Namo Gange Trust", legalName: "Namo Gange Trust Pvt", contactEmail: "billing@namo.test", contactPhone: "+91 99999 99999", address: { street: "1 Main St", city: "Delhi", state: "DL", country: "IN", postalCode: "110001" }, taxId: "GST123" },
  me: { email: "owner@namo.test", name: "Owner One", memberships: [{ companyId: "c1", companyName: "Namo Gange Trust", systemRole: "OWNER" }] },
  companyId: "c1",
  teamMembers: 4,
  ...over,
});

describe("live billing snapshot", () => {
  it("shows the real plan, converting paise to rupees, and the real limits and usage", () => {
    const snapshot = buildLiveSnapshot(input());
    assert.equal(snapshot.plans.length, 1);
    assert.equal(snapshot.plans[0]!.name, "Growth");
    assert.equal(snapshot.plans[0]!.monthlyPrice, 4999);
    assert.equal(snapshot.plans[0]!.limits.clients, 10);
    assert.equal(snapshot.plans[0]!.limits.aiCredits, 100000);
    assert.equal(snapshot.plans[0]!.limits.reports, null, "a limit the backend does not enforce is no limit");
    assert.equal(snapshot.subscription.status, "active");
    assert.equal(snapshot.subscription.currentPeriodEnd, "2026-11-05T00:00:00.000Z");
    const rows = Object.fromEntries(usageRows(snapshot).map((r) => [r.key, r]));
    assert.equal(rows.clients!.used, 3);
    assert.equal(rows.clients!.limit, 10);
    assert.equal(rows.aiCredits!.used, 2500);
    assert.equal(rows.teamMembers!.used, 4);
  });

  it("keeps nothing from the sample data: no cards, packs, add-ons, sales request or invented tax", () => {
    const snapshot = buildLiveSnapshot(input());
    assert.deepEqual(snapshot.paymentMethods, []);
    assert.deepEqual(snapshot.creditPacks, []);
    assert.deepEqual(snapshot.addOns, []);
    assert.deepEqual(snapshot.addOnCatalog, []);
    assert.equal(snapshot.salesRequest, null);
    assert.equal(snapshot.taxRate, 0);
    assert.equal(snapshot.credits.purchased, 0);
    assert.equal(snapshot.organizationName, "Namo Gange Trust");
  });

  it("maps the organization profile and the signed-in user's role", () => {
    const snapshot = buildLiveSnapshot(input());
    assert.equal(snapshot.profile.legalName, "Namo Gange Trust Pvt");
    assert.equal(snapshot.profile.billingEmail, "billing@namo.test");
    assert.equal(snapshot.profile.addressLine1, "1 Main St");
    assert.equal(snapshot.profile.taxId, "GST123");
    assert.equal(snapshot.contacts[0]?.email, "billing@namo.test");
    assert.deepEqual(snapshot.currentUser, { name: "Owner One", email: "owner@namo.test", role: "org_admin" });
    assert.equal(billingRoleOf("ADMIN"), "billing_admin");
    assert.equal(billingRoleOf("MANAGER"), "manager");
    assert.equal(billingRoleOf("VIEWER"), "member");
    assert.equal(billingRoleOf(undefined), "member", "no membership means no billing rights");
  });

  it("hides draft invoices and maps the rest; a paid invoice is a successful payment", () => {
    const invoices = toInvoices(input().invoices);
    assert.deepEqual(invoices.map((i) => i.status), ["paid", "pending"]);
    assert.equal(invoices[0]!.total, 4999);
    assert.equal(invoices[0]!.number, "INV-AAAAAAAA");
    assert.equal(invoices[0]!.transactionId, null, "no payment reference is invented");
    assert.equal(invoices[0]!.paymentMethodLabel, null);
    assert.equal(invoices[0]!.lines[0]!.description, "Subscription");
    const online = toInvoices([{ id: "dddddddd-1111-2222-3333-444444444444", amount: 500000, status: "PAID", paidAt: "2026-10-05T06:50:00.000Z", invoiceUrl: null, description: "Upgrade to Pro (prorated)", paymentReference: "pay_RZP12345", createdAt: "2026-10-05T06:49:00.000Z" }])[0]!;
    assert.equal(online.transactionId, "pay_RZP12345");
    assert.equal(online.paymentMethodLabel, "Razorpay");
    assert.equal(online.lines[0]!.description, "Upgrade to Pro (prorated)");
    assert.equal(toPayments([online])[0]!.methodLabel, "Razorpay");
    const payments = toPayments(invoices);
    assert.equal(payments.length, 1);
    assert.equal(payments[0]!.status, "successful");
    assert.equal(payments[0]!.invoiceId, invoices[0]!.id);
  });

  it("a company without a subscription is not shown the stand-in plan as real", () => {
    const snapshot = buildLiveSnapshot(input({ summary: { ...input().summary, subscriptionId: null, status: "ACTIVE", plan: { id: "default-starter", name: "Standard", isActive: true, monthlyPrice: 0 } } }));
    assert.equal(snapshot.plans[0]!.name, "No active plan");
    assert.equal(snapshot.subscription.status, "cancelled");
    assert.equal(usageRows(snapshot).find((r) => r.key === "clients")!.used, 0);
  });

  for (const [backend, ui] of [["PAST_DUE", "past_due"], ["INCOMPLETE", "payment_due"], ["SUSPENDED", "cancelled"], ["CANCELED", "cancelled"]] as const) {
    it(`maps the subscription status ${backend} to ${ui}`, () => {
      assert.equal(buildLiveSnapshot(input({ summary: { ...input().summary, status: backend } })).subscription.status, ui);
    });
  }

  it("works without the optional reads (organization, user, team size)", () => {
    const snapshot = buildLiveSnapshot(input({ organization: null, me: null, teamMembers: null }));
    assert.equal(snapshot.profile.legalName, "");
    assert.equal(snapshot.currentUser.role, "member");
    assert.equal(usageRows(snapshot).find((r) => r.key === "teamMembers")!.used, 0);
  });

  it("feeds every selector the page uses without throwing, and gates the unavailable actions", () => {
    const snapshot = buildLiveSnapshot(input());
    const now = Date.parse("2026-10-20T00:00:00Z");
    assert.doesNotThrow(() => {
      subscriptionFlags(snapshot);
      outstandingInvoice(snapshot);
      nextPayment(snapshot);
      attentionItems(snapshot, now);
    });
    const gates = actionGates(snapshot, evaluateCapabilities("org_admin"));
    assert.equal(gates.upgrade.allowed, false, "only one plan exists, so there is nothing to upgrade to");
    assert.equal(gates.downgrade.allowed, false);
    assert.equal(gates.buyCredits.allowed, false, "no payment method can be added without a gateway");
  });
});

describe("billing details <-> organization profile", () => {
  const org = { name: "Namo", legalName: "Namo Pvt", contactEmail: "a@b.test", contactPhone: "+91 99999 99999", address: { street: "1 Main St", city: "Delhi", state: "DL", country: "IN", postalCode: "110001" }, taxId: "07AABCU9603R1ZM" };

  it("reads a GSTIN-shaped tax number as the GSTIN and anything else as the tax id", () => {
    assert.equal(toBillingProfile(org).gstin, "07AABCU9603R1ZM");
    assert.equal(toBillingProfile(org).taxId, "");
    assert.equal(toBillingProfile({ ...org, taxId: "TAX-77" }).gstin, "");
    assert.equal(toBillingProfile({ ...org, taxId: "TAX-77" }).taxId, "TAX-77");
  });

  it("builds an organization update with the expected revision, joining the address lines and sharing the tax field", () => {
    const profile = { ...toBillingProfile(org), addressLine2: "Floor 2", billingEmail: "  billing@namo.test " };
    const patch = toOrganizationPatch(profile, 7);
    assert.equal(patch.expectedRevision, 7);
    assert.equal(patch.contactEmail, "billing@namo.test");
    assert.equal(patch.address?.street, "1 Main St, Floor 2");
    assert.equal(patch.taxId, "07AABCU9603R1ZM");
    assert.equal(toOrganizationPatch({ ...profile, gstin: "", taxId: "TAX-9" }, 1).taxId, "TAX-9");
    assert.equal(toOrganizationPatch({ ...profile, gstin: "", taxId: "" }, 1).taxId, null, "an emptied field is cleared, not kept");
  });

  it("clears an address that is entirely empty, and carries the PAN both ways", () => {
    const empty = { ...toBillingProfile(org), addressLine1: "", city: "", state: "", country: "", postalCode: "" };
    assert.equal(toOrganizationPatch(empty, 1).address, null);
    assert.equal(toOrganizationPatch({ ...toBillingProfile(org), pan: " ABCDE1234F " }, 1).pan, "ABCDE1234F");
    assert.equal(toOrganizationPatch({ ...toBillingProfile(org), pan: "" }, 1).pan, null, "an emptied PAN is cleared");
    assert.equal(toBillingProfile({ ...org, pan: "ABCDE1234F" }).pan, "ABCDE1234F");
  });
});

describe("plans and the payment window", () => {
  const plan = (id: string, name: string, price: number, over: Record<string, unknown> = {}) => ({ id, name, monthlyPrice: price, maxClients: 5, maxAiTokens: 1000, automationEnabled: true, ...over });
  const catalog = (plans: ReturnType<typeof plan>[], configured = true) => ({ plans, gateway: { provider: "RAZORPAY" as const, configured } });

  it("lists the real plans under their own ids, cheapest first, and finds the current one", () => {
    const base = input();
    const { plans, currentId } = mapPlans(catalog([plan("p-pro", "Pro", 999900), plan("p1", "Growth", 499900), plan("p-basic", "Basic", 99900)]), base.summary);
    assert.deepEqual(plans.map((p) => [p.id, p.name, p.monthlyPrice, p.rank]), [["p-basic", "Basic", 999, 1], ["p1", "Growth", 4999, 2], ["p-pro", "Pro", 9999, 3]]);
    assert.equal(currentId, "p1", "the current plan is found by its real id");
  });

  it("shows every plan on sale (not just four), and always the current plan even when it is no longer for sale", () => {
    const base = input();
    const retired = mapPlans(catalog([plan("p-pro", "Pro", 999900)]), base.summary);
    assert.equal(retired.plans.some((p) => p.name === "Growth"), true);
    const many = mapPlans(catalog([1, 2, 3, 4, 5, 6].map((n) => plan(`q${n}`, `Plan ${n}`, n * 1000))), base.summary);
    assert.equal(many.plans.length, 7, "six on sale plus the current one");
  });

  it("shows a plan's yearly price per month, and nothing when annual is not offered", () => {
    const { plans } = mapPlans(catalog([plan("p1", "Growth", 499900, { annualPrice: 4999000 }), plan("p2", "Flex", 1499900, { annualPrice: null })]), input().summary);
    const growth = plans.find((p) => p.name === "Growth")!;
    const flex = plans.find((p) => p.name === "Flex")!;
    assert.ok(Math.abs(growth.annualMonthlyPrice! - 49990 / 12) < 1e-9);
    assert.equal(flex.annualMonthlyPrice, null);
  });

  it("reads an annual subscription's cycle and period", () => {
    const summary = { ...input().summary, billingCycle: "ANNUAL" as const, currentPeriodEnd: "2027-10-05T00:00:00.000Z" };
    const snapshot = buildLiveSnapshot(input({ summary }));
    assert.equal(snapshot.subscription.cycle, "annual");
    assert.equal(snapshot.subscription.currentPeriodStart.slice(0, 10), "2026-10-05");
    assert.equal(buildLiveSnapshot(input()).subscription.cycle, "monthly");
    assert.equal(buildLiveSnapshot(input()).subscription.currentPeriodStart.slice(0, 10), "2026-10-05");
  });

  it("takes limits and the automation feature from the real plan", () => {
    const { plans } = mapPlans(catalog([plan("p1", "Growth", 499900, { maxClients: 10, maxAiTokens: 100000, automationEnabled: false })]), input().summary);
    assert.equal(plans[0]!.limits.clients, 10);
    assert.equal(plans[0]!.limits.aiCredits, 100000);
    assert.equal(plans[0]!.limits.reports, null);
    assert.equal(plans[0]!.features.includes("automation"), false);
    assert.equal(plans[0]!.features.includes("publishing"), true);
  });

  it("with no plan list the current plan stands alone, and a company with none sees a single 'No active plan'", () => {
    assert.equal(buildLiveSnapshot(input({ catalog: null })).plans.length, 1);
    const none = buildLiveSnapshot(input({ catalog: catalog([]), summary: { ...input().summary, subscriptionId: null } }));
    assert.deepEqual(none.plans.map((p) => p.name), ["No active plan"]);
  });

  it("shows Razorpay Checkout as the payment method only when the server has online payment set up", () => {
    const on = buildLiveSnapshot(input({ catalog: catalog([plan("p1", "Growth", 499900)], true) }));
    assert.equal(on.paymentMethods.length, 1);
    assert.equal(on.paymentMethods[0]!.type, "gateway");
    assert.equal(on.paymentMethods[0]!.role, "primary");
    const off = buildLiveSnapshot(input({ catalog: catalog([plan("p1", "Growth", 499900)], false) }));
    assert.deepEqual(off.paymentMethods, []);
    assert.deepEqual(buildLiveSnapshot(input({ catalog: null })).paymentMethods, []);
  });

  it("the page's own labels and gates treat the gateway method as a real, never-expiring method", async () => {
    const { methodLabel, methodHealth, primaryMethod } = await import("../billing-data/selectors");
    const method = primaryMethod(buildLiveSnapshot(input({ catalog: catalog([plan("p1", "Growth", 499900)]) })).paymentMethods)!;
    assert.equal(methodLabel(method), "Razorpay Checkout");
    assert.equal(methodHealth(method, Date.now()), "active");
    const snapshot = buildLiveSnapshot(input({ catalog: catalog([plan("p1", "Growth", 499900), plan("p2", "Pro", 999900)]) }));
    const gates = actionGates(snapshot, evaluateCapabilities("org_admin"));
    assert.equal(gates.upgrade.allowed, true, "a dearer plan exists and a method is present");
  });
});

describe("billing contacts", () => {
  const stored = { id: "0b1f6a52-3c0e-4e3a-9f7d-1c2d3e4f5a6b", kind: "FINANCE" as const, name: "Ravi", email: "ravi@acme.test", phone: null, role: "Accounts" };

  it("shows the saved contacts, and the organization contact only while there are none", () => {
    const saved = buildLiveSnapshot(input({ contacts: [stored] }));
    assert.deepEqual(saved.contacts, [{ id: stored.id, kind: "finance", name: "Ravi", email: "ravi@acme.test", phone: "", role: "Accounts" }]);
    const none = buildLiveSnapshot(input({ contacts: [] }));
    assert.ok(none.contacts.length <= 1);
    assert.ok(none.contacts.every((contact) => contact.id === "organization-contact"));
  });

  it("sends a contact to the server without the organization placeholder id and without blank optional fields", () => {
    const placeholder = toBackendContact({ id: "organization-contact", kind: "primary", name: " Asha ", email: " a@acme.test ", phone: "", role: "" });
    assert.deepEqual(placeholder, { kind: "PRIMARY", name: "Asha", email: "a@acme.test" });
    const edit = toBackendContact({ ...toBillingContact(stored), phone: "+91 98765 43210" });
    assert.equal(edit.id, stored.id);
    assert.equal(edit.phone, "+91 98765 43210");
    assert.equal(edit.kind, "FINANCE");
  });
});
