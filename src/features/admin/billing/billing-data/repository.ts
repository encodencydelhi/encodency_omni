
import { addMonths, addYears, differenceInCalendarDays, parseISO } from "date-fns";
import { apiClient } from "@/lib/api/client";
import { companyScopeHeaders } from "@/lib/api/company-scope";
import { getStoredCompanyId } from "@/lib/api/tenancy-storage";
import { BILLING_MOCK_MODE, CHANGE_LABEL, DECLINED_TEST_CARD } from "./config";
import { buildSnapshot, priceLines, reference, round2 } from "./mock-provider";
import { organizationApi } from "../../settings/live/organization-api";
import { ApiError } from "@/types/api";
import { collectPayment, CheckoutCancelled, CheckoutFailed, CheckoutUnavailable, type CheckoutOrder } from "./razorpay-checkout";
import { buildLiveSnapshot, mapPlans, toBackendContact, toOrganizationPatch, ORGANIZATION_CONTACT_ID, type BackendBillingContact, type BackendPlansResponse, type BackendBillingSummary, type BackendCurrentUser, type BackendInvoice, type BackendOrganization } from "./live-snapshot";
import {
  detectBrand,
  downgradeImpact,
  luhnValid,
  methodHealth,
  methodLabel,
  money,
  planById,
  primaryMethod,
  quoteChange,
  type BreakdownLine,
} from "./selectors";
import type {
  AddOnKey,
  BillingContact,
  BillingCycle,
  BillingProfile,
  BillingScenario,
  BillingSnapshot,
  DowngradeResolution,
  Invoice,
  InvoiceLineItem,
  LineItemKind,
  PaymentMethod,
  PlanId,
  SubscriptionChange,
  SubscriptionStatus,
} from "./types";

export type BillingErrorCode = "service_unavailable" | "payment_declined" | "card_expired" | "validation" | "conflict" | "network";

export class BillingServiceError extends Error {
  readonly code: BillingErrorCode;
  readonly hint: string;
  constructor(code: BillingErrorCode, message: string, hint: string) {
    super(message);
    this.name = "BillingServiceError";
    this.code = code;
    this.hint = hint;
  }
}

export interface PaymentMethodInput {
  type: "card" | "upi";
  holderName: string;
  /** Digits only. Sent to the gateway tokenizer; never kept. */
  cardNumber?: string;
  expMonth?: number;
  expYear?: number;
  upiId?: string;
}

export interface PlanChangeInput {
  planId: PlanId;
  cycle: BillingCycle;
  actor: string;
  resolution?: DowngradeResolution;
  note?: string;
  /** Moving to a cheaper plan: the server applies it now, with no payment. */
  downgrade?: boolean;
}

export interface BillingRepository {
  readonly mode: "mock" | "live";
  loadSnapshot(scenario: BillingScenario): Promise<BillingSnapshot>;
  changePlan(input: PlanChangeInput): Promise<BillingSnapshot>;
  withdrawPendingChange(actor: string): Promise<BillingSnapshot>;
  cancelSubscription(input: { reason: string; feedback: string; actor: string }): Promise<BillingSnapshot>;
  resumeSubscription(actor: string): Promise<BillingSnapshot>;
  savePaymentMethod(input: PaymentMethodInput, role: "primary" | "backup"): Promise<BillingSnapshot>;
  setPrimaryMethod(id: string): Promise<BillingSnapshot>;
  removePaymentMethod(id: string): Promise<BillingSnapshot>;
  payInvoice(invoiceId: string): Promise<BillingSnapshot>;
  saveProfile(profile: BillingProfile): Promise<BillingSnapshot>;
  saveContact(contact: BillingContact): Promise<BillingSnapshot>;
  removeContact(id: string): Promise<BillingSnapshot>;
  buyCredits(packId: string): Promise<BillingSnapshot>;
  setAddOn(key: AddOnKey, quantity: number): Promise<BillingSnapshot>;
  requestSales(input: { message: string; contactEmail: string }): Promise<BillingSnapshot>;
  /** Mock-mode preview: make the next payment-taking call fail. */
  failNextPayment(on: boolean): void;
}

/* ------------------------------------------------------------------ */
/* Mock                                                                */
/* ------------------------------------------------------------------ */

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const byRole = (a: PaymentMethod, b: PaymentMethod) => (a.role === b.role ? 0 : a.role === "primary" ? -1 : 1);

const LINE_KIND: Record<BreakdownLine["kind"], LineItemKind> = {
  plan: "plan",
  addon: "addon",
  credits: "account_credit",
  discount: "discount",
  tax: "usage",
  proration: "proration",
};

class MockBillingRepository implements BillingRepository {
  readonly mode = "mock" as const;
  private state: BillingSnapshot | null = null;
  private failNext = false;
  private sequence = 0;

  failNextPayment(on: boolean) {
    this.failNext = on;
  }

  private get snapshot(): BillingSnapshot {
    if (!this.state) throw new BillingServiceError("service_unavailable", "Billing data isn't loaded.", "Reload the page.");
    return this.state;
  }

  private commit() {
    return structuredClone(this.snapshot);
  }

  private uid(prefix: string) {
    this.sequence += 1;
    return `${prefix}-${Date.now().toString(36)}-${this.sequence}`;
  }

  async loadSnapshot(scenario: BillingScenario) {
    await wait(650);
    this.state = buildSnapshot(scenario, new Date());
    this.failNext = false;
    return this.commit();
  }

  /** Takes a payment with the primary method. Throws — and changes nothing — when it's declined. */
  private charge(lines: Omit<InvoiceLineItem, "id">[], periodEnd?: Date): Invoice {
    const state = this.snapshot;
    const method = primaryMethod(state.paymentMethods);
    if (!method) throw new BillingServiceError("validation", "There's no payment method on file.", "Add a payment method, then try again.");
    if (methodHealth(method, Date.now()) === "expired") {
      throw new BillingServiceError("card_expired", `${methodLabel(method)} has expired.`, "Update your payment method, then try again.");
    }
    if (this.failNext) {
      this.failNext = false;
      throw new BillingServiceError("payment_declined", `The payment was declined by the issuer of ${methodLabel(method)}.`, "Nothing was charged. Try again, or use a different payment method.");
    }
    const now = new Date();
    const year = now.getFullYear();
    const highest = state.invoices
      .filter((invoice) => invoice.number.startsWith(`INV-${year}-`))
      .reduce((max, invoice) => Math.max(max, Number(invoice.number.slice(-3))), 0);
    const number = `INV-${year}-${String(highest + 1).padStart(3, "0")}`;
    const withIds = lines.map((line, index) => ({ ...line, id: `${number}-l${index + 1}` }));
    const totals = priceLines(withIds, state.taxRate);
    const invoice: Invoice = {
      id: number.toLowerCase(),
      number,
      periodStart: now.toISOString(),
      periodEnd: (periodEnd ?? now).toISOString(),
      issuedAt: now.toISOString(),
      dueAt: now.toISOString(),
      status: "paid",
      lines: withIds,
      ...totals,
      taxRate: state.taxRate,
      paymentMethodLabel: methodLabel(method),
      paidAt: now.toISOString(),
      transactionId: reference("pay", `${number}-${now.getTime()}`),
      refundedAt: null,
      note: null,
    };
    state.invoices.unshift(invoice);
    state.payments.unshift({
      id: this.uid("pmt"),
      reference: invoice.transactionId!,
      invoiceId: invoice.id,
      date: invoice.paidAt!,
      amount: invoice.total,
      methodLabel: invoice.paymentMethodLabel!,
      status: "successful",
      description: withIds[0]?.description ?? "Payment",
      failureReason: null,
    });
    return invoice;
  }

  private record(change: Omit<SubscriptionChange, "id" | "requestedAt">) {
    const entry: SubscriptionChange = { ...change, id: this.uid("chg"), requestedAt: new Date().toISOString() };
    this.snapshot.subscription.history.unshift(entry);
    return entry;
  }

  private withdrawPending(reason: string) {
    const { subscription } = this.snapshot;
    const pending = subscription.pendingChange;
    if (!pending) return;
    const entry = subscription.history.find((item) => item.id === pending.id);
    if (entry) {
      entry.status = "withdrawn";
      entry.note = reason;
    }
    subscription.pendingChange = null;
  }

  async changePlan(input: PlanChangeInput) {
    await wait(1100);
    const state = this.snapshot;
    const { subscription } = state;
    const now = Date.now();
    const target = planById(state.plans, input.planId);
    const current = planById(state.plans, subscription.planId);
    const quote = quoteChange(state, input.planId, input.cycle, now);
    const base = { fromPlan: current.id, toPlan: target.id, fromCycle: subscription.cycle, toCycle: input.cycle, requestedBy: input.actor, note: input.note ?? null };

    switch (quote.direction) {
      case "contact_sales":
      case "same":
        throw new BillingServiceError("conflict", "Nothing to change.", "Pick a different plan or billing cycle.");

      case "upgrade":
      case "reactivation": {
        const invoice = quote.today && quote.today.subtotal > 0
          ? this.charge(
            quote.today.lines.map((line) => ({ kind: LINE_KIND[line.kind], description: line.detail ? `${line.label} · ${line.detail}` : line.label, quantity: 1, unitAmount: line.amount, amount: line.amount })),
            parseISO(quote.nextAt),
          )
          : null;
        if (quote.direction === "reactivation") {
          subscription.status = "active";
          subscription.cancelledAt = null;
          subscription.cancelAt = null;
        } else if (subscription.status === "scheduled_cancellation") {
          subscription.status = "active";
          subscription.cancelAt = null;
          const cancellation = subscription.history.find((item) => item.kind === "cancellation" && item.status === "scheduled");
          if (cancellation) {
            cancellation.status = "withdrawn";
            cancellation.note = `Withdrawn by the upgrade to ${target.name}.`;
          }
        }
        this.withdrawPending(`Replaced by the ${quote.direction === "upgrade" ? "upgrade" : "reactivation"} to ${target.name}.`);
        const cycleChanged = input.cycle !== subscription.cycle || quote.direction === "reactivation";
        subscription.planId = target.id;
        subscription.cycle = input.cycle;
        if (cycleChanged) {
          subscription.currentPeriodStart = new Date(now).toISOString();
          subscription.currentPeriodEnd = quote.nextAt;
          state.credits.used = quote.direction === "reactivation" ? 0 : state.credits.used;
          state.credits.resetsAt = quote.direction === "reactivation" ? addMonths(new Date(now), 1).toISOString() : state.credits.resetsAt;
        }
        state.credits.included = target.limits.aiCredits ?? state.credits.included;
        this.record({
          ...base,
          kind: quote.direction,
          status: "applied",
          effectiveAt: new Date(now).toISOString(),
          amount: invoice?.subtotal ?? null,
          note: invoice ? `Charged ${money(invoice.total)} on ${invoice.number}.` : base.note,
        });
        return this.commit();
      }

      case "trial_conversion": {
        if (!primaryMethod(state.paymentMethods)) {
          throw new BillingServiceError("validation", "Add a payment method before choosing a plan.", "Your first charge is taken when the trial ends.");
        }
        subscription.planId = target.id;
        subscription.cycle = input.cycle;
        state.credits.included = target.limits.aiCredits ?? state.credits.included;
        this.record({ ...base, kind: "trial_conversion", status: "scheduled", effectiveAt: quote.effectiveAt, amount: quote.next?.subtotal ?? null, note: `First charge of ${money(quote.next?.total ?? 0)} on ${new Date(quote.effectiveAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}.` });
        return this.commit();
      }

      case "downgrade":
      case "cycle_change": {
        if (quote.direction === "downgrade") {
          const { conflicts } = downgradeImpact(state, target.id);
          const unresolved = conflicts.filter((conflict) => (input.resolution?.keep[conflict.key]?.length ?? Infinity) > conflict.newLimit);
          if (unresolved.length) {
            throw new BillingServiceError("conflict", "Some usage is still over the new plan's limits.", "Choose what to keep for every limit, then schedule the downgrade again.");
          }
        }
        this.withdrawPending(`Replaced by a new ${CHANGE_LABEL[quote.direction].toLowerCase()}.`);
        const change = this.record({ ...base, kind: quote.direction, status: "scheduled", effectiveAt: quote.effectiveAt, amount: quote.next?.subtotal ?? null, resolution: input.resolution });
        subscription.pendingChange = structuredClone(change);
        return this.commit();
      }
    }
  }

  async withdrawPendingChange(actor: string) {
    await wait(600);
    const pending = this.snapshot.subscription.pendingChange;
    if (!pending) throw new BillingServiceError("conflict", "There's no scheduled change.", "Refresh the page to see the latest state.");
    this.withdrawPending(`Withdrawn by ${actor}.`);
    return this.commit();
  }

  async cancelSubscription(input: { reason: string; feedback: string; actor: string }) {
    await wait(1000);
    const { subscription } = this.snapshot;
    this.withdrawPending("Withdrawn by the cancellation.");
    subscription.status = "scheduled_cancellation";
    subscription.cancelAt = subscription.currentPeriodEnd;
    this.record({
      kind: "cancellation",
      status: "scheduled",
      fromPlan: subscription.planId,
      toPlan: subscription.planId,
      fromCycle: subscription.cycle,
      toCycle: subscription.cycle,
      requestedBy: input.actor,
      effectiveAt: subscription.currentPeriodEnd,
      amount: null,
      note: input.feedback || null,
      reason: input.reason,
    });
    return this.commit();
  }

  async resumeSubscription(actor: string) {
    await wait(800);
    const { subscription } = this.snapshot;
    if (subscription.status !== "scheduled_cancellation") throw new BillingServiceError("conflict", "The subscription isn't set to cancel.", "Refresh the page to see the latest state.");
    subscription.status = "active";
    subscription.cancelAt = null;
    const cancellation = subscription.history.find((item) => item.kind === "cancellation" && item.status === "scheduled");
    if (cancellation) cancellation.status = "withdrawn";
    this.record({
      kind: "resume",
      status: "applied",
      fromPlan: subscription.planId,
      toPlan: subscription.planId,
      fromCycle: subscription.cycle,
      toCycle: subscription.cycle,
      requestedBy: actor,
      effectiveAt: new Date().toISOString(),
      amount: null,
      note: null,
    });
    return this.commit();
  }

  async savePaymentMethod(input: PaymentMethodInput, role: "primary" | "backup") {
    await wait(1200);
    const state = this.snapshot;
    let method: PaymentMethod;
    if (input.type === "card") {
      const digits = input.cardNumber ?? "";
      if (!luhnValid(digits)) throw new BillingServiceError("validation", "That card number isn't valid.", "Check the number and try again.");
      if (digits === DECLINED_TEST_CARD || this.failNext) {
        this.failNext = false;
        throw new BillingServiceError("payment_declined", "Your bank declined the card verification.", "Nothing was saved. Try another card, or contact your bank.");
      }
      method = {
        id: this.uid("pm"),
        type: "card",
        role,
        brand: detectBrand(digits),
        last4: digits.slice(-4),
        expMonth: input.expMonth ?? null,
        expYear: input.expYear ?? null,
        upiId: null,
        holderName: input.holderName,
        addedAt: new Date().toISOString(),
      };
    } else {
      if (this.failNext) {
        this.failNext = false;
        throw new BillingServiceError("payment_declined", "The UPI AutoPay mandate wasn't approved.", "Approve the request in your UPI app, then try again.");
      }
      const [user = "", host = ""] = (input.upiId ?? "").split("@");
      method = {
        id: this.uid("pm"),
        type: "upi",
        role,
        brand: null,
        last4: null,
        expMonth: null,
        expYear: null,
        upiId: `${user.slice(0, 2)}${"•".repeat(Math.max(user.length - 2, 3))}@${host}`,
        holderName: input.holderName,
        addedAt: new Date().toISOString(),
      };
    }
    // The new method replaces whatever held that role.
    state.paymentMethods = [...state.paymentMethods.filter((item) => item.role !== role), method].sort(byRole);

    // A new primary method settles anything outstanding straight away.
    const outstanding = state.invoices.find((invoice) => invoice.status === "failed" || invoice.status === "pending");
    if (role === "primary" && outstanding) this.settle(outstanding);
    return this.commit();
  }

  private settle(invoice: Invoice) {
    const state = this.snapshot;
    const method = primaryMethod(state.paymentMethods);
    if (!method) throw new BillingServiceError("validation", "There's no payment method on file.", "Add a payment method, then try again.");
    if (methodHealth(method, Date.now()) === "expired") throw new BillingServiceError("card_expired", `${methodLabel(method)} has expired.`, "Update your payment method, then try again.");
    if (this.failNext) {
      this.failNext = false;
      throw new BillingServiceError("payment_declined", `The payment was declined by the issuer of ${methodLabel(method)}.`, "Nothing was charged. Try again, or use a different payment method.");
    }
    const now = new Date().toISOString();
    invoice.status = "paid";
    invoice.paidAt = now;
    invoice.paymentMethodLabel = methodLabel(method);
    invoice.transactionId = reference("pay", `${invoice.number}-${now}`);
    invoice.note = null;
    const pending = state.payments.find((payment) => payment.invoiceId === invoice.id && payment.status === "pending");
    if (pending) {
      pending.status = "successful";
      pending.date = now;
      pending.reference = invoice.transactionId;
      pending.methodLabel = invoice.paymentMethodLabel;
    } else {
      state.payments.unshift({
        id: this.uid("pmt"),
        reference: invoice.transactionId,
        invoiceId: invoice.id,
        date: now,
        amount: invoice.total,
        methodLabel: invoice.paymentMethodLabel,
        status: "successful",
        description: invoice.lines[0]?.description ?? "Payment",
        failureReason: null,
      });
    }
    state.payments.sort((a, b) => b.date.localeCompare(a.date));
    const { subscription } = state;
    if (subscription.status === "past_due" || subscription.status === "grace_period" || subscription.status === "payment_due") {
      subscription.status = "active";
      subscription.graceEndsAt = null;
    }
  }

  async setPrimaryMethod(id: string) {
    await wait(600);
    const state = this.snapshot;
    if (!state.paymentMethods.some((method) => method.id === id)) throw new BillingServiceError("conflict", "That payment method no longer exists.", "Refresh the page.");
    state.paymentMethods = state.paymentMethods
      .map((method) => ({ ...method, role: method.id === id ? ("primary" as const) : ("backup" as const) }))
      .sort(byRole);
    return this.commit();
  }

  async removePaymentMethod(id: string) {
    await wait(700);
    const state = this.snapshot;
    const removed = state.paymentMethods.find((method) => method.id === id);
    if (!removed) throw new BillingServiceError("conflict", "That payment method no longer exists.", "Refresh the page.");
    state.paymentMethods = state.paymentMethods.filter((method) => method.id !== id);
    if (removed.role === "primary" && state.paymentMethods[0]) state.paymentMethods[0].role = "primary";
    return this.commit();
  }

  async payInvoice(invoiceId: string) {
    await wait(1300);
    const invoice = this.snapshot.invoices.find((item) => item.id === invoiceId);
    if (!invoice || (invoice.status !== "failed" && invoice.status !== "pending")) {
      throw new BillingServiceError("conflict", "This invoice doesn't need paying.", "Refresh the page to see the latest state.");
    }
    this.settle(invoice);
    return this.commit();
  }

  async saveProfile(profile: BillingProfile) {
    await wait(800);
    this.snapshot.profile = { ...profile };
    return this.commit();
  }

  async saveContact(contact: BillingContact) {
    await wait(600);
    const state = this.snapshot;
    const id = contact.id || this.uid("ct");
    let contacts = state.contacts.filter((item) => item.id !== id);
    // Only one primary contact: promoting one demotes the other.
    if (contact.kind === "primary") contacts = contacts.map((item) => (item.kind === "primary" ? { ...item, kind: "other" as const } : item));
    const saved = { ...contact, id, kind: contacts.length === 0 && state.contacts.every((item) => item.id === id) ? ("primary" as const) : contact.kind };
    const index = state.contacts.findIndex((item) => item.id === id);
    if (index >= 0) contacts.splice(index, 0, saved);
    else contacts.push(saved);
    state.contacts = contacts.sort((a, b) => (a.kind === "primary" ? -1 : b.kind === "primary" ? 1 : 0));
    return this.commit();
  }

  async removeContact(id: string) {
    await wait(500);
    const state = this.snapshot;
    const removed = state.contacts.find((item) => item.id === id);
    state.contacts = state.contacts.filter((item) => item.id !== id);
    if (removed?.kind === "primary" && state.contacts[0]) state.contacts[0].kind = "primary";
    return this.commit();
  }

  async buyCredits(packId: string) {
    await wait(1200);
    const state = this.snapshot;
    const pack = state.creditPacks.find((item) => item.id === packId);
    if (!pack) throw new BillingServiceError("conflict", "That credit pack isn't available.", "Refresh the page.");
    this.charge([{ kind: "credits", description: `AI credit pack · ${pack.credits.toLocaleString("en-IN")} credits`, quantity: 1, unitAmount: pack.price, amount: pack.price }]);
    state.credits.purchased += pack.credits;
    state.credits.purchasedExpireAt = addYears(new Date(), 1).toISOString();
    return this.commit();
  }

  async setAddOn(key: AddOnKey, quantity: number) {
    await wait(1000);
    const state = this.snapshot;
    const definition = state.addOnCatalog.find((item) => item.key === key);
    if (!definition) throw new BillingServiceError("conflict", "That add-on isn't available.", "Refresh the page.");
    const current = state.addOns.find((item) => item.key === key)?.quantity ?? 0;
    const delta = quantity - current;
    if (delta > 0) {
      // Added units are charged for the rest of this period; the renewal picks up the full price.
      const { subscription } = state;
      const periodDays = Math.max(differenceInCalendarDays(parseISO(subscription.currentPeriodEnd), parseISO(subscription.currentPeriodStart)), 1);
      const remaining = Math.max(differenceInCalendarDays(parseISO(subscription.currentPeriodEnd), new Date()), 0);
      const months = subscription.cycle === "annual" ? 12 : 1;
      const amount = round2(delta * definition.monthlyPrice * months * (remaining / periodDays));
      if (amount > 0) {
        this.charge([{ kind: "addon", description: `${definition.name} · ${delta} × ${definition.unitLabel}, ${remaining} of ${periodDays} days`, quantity: delta, unitAmount: round2(amount / delta), amount }], parseISO(subscription.currentPeriodEnd));
      }
    }
    state.addOns = quantity > 0 ? [...state.addOns.filter((item) => item.key !== key), { key, quantity, since: state.addOns.find((item) => item.key === key)?.since ?? new Date().toISOString() }] : state.addOns.filter((item) => item.key !== key);
    return this.commit();
  }

  async requestSales(input: { message: string; contactEmail: string }) {
    await wait(900);
    this.snapshot.salesRequest = { ...input, requestedAt: new Date().toISOString() };
    return this.commit();
  }
}

/* ------------------------------------------------------------------ */
/* Live (mock mode off, service attached)                              */
/* ------------------------------------------------------------------ */

/** Server errors of the payment endpoints as the page's own error type, in plain words. */
function paymentError(error: unknown): BillingServiceError {
  if (error instanceof BillingServiceError) return error;
  if (ApiError.isApiError(error)) {
    switch (error.reason) {
      case "payment_gateway_not_configured":
      case "payment_gateway_misconfigured":
        return new BillingServiceError("service_unavailable", "Online payment isn't set up yet.", "Ask your administrator to finish the payment setup. Nothing was charged.");
      case "payment_gateway_unavailable":
      case "payment_gateway_rejected":
      case "payment_gateway_invalid_response":
        return new BillingServiceError("service_unavailable", "The payment service isn't available right now.", "Try again in a moment. Nothing was charged.");
      case "invalid_payment_signature":
        return new BillingServiceError("payment_declined", "The payment couldn't be verified.", "If money left your account, it will be matched automatically. Reload to check.");
      case "plan_change_not_immediate":
        return new BillingServiceError("validation", "Moving to a cheaper plan isn't available this way.", "Use Downgrade plan from Subscription management.");
      case "usage_over_limit":
        return new BillingServiceError("conflict", error.message, "Reduce your usage below the smaller plan's limits, then try again.");
      case "not_a_downgrade":
        return new BillingServiceError("validation", "That isn't a cheaper plan.", "Choose a plan that costs less than your current one.");
      case "no_active_subscription":
        return new BillingServiceError("conflict", "Only an active subscription can move to another plan.", "Reload the page to see the latest state.");
      case "cycle_change_not_immediate":
        return new BillingServiceError("validation", "Changing the billing cycle isn't available online yet.", "It can take effect at your next renewal. Contact support to switch now.");
      case "cycle_not_offered":
        return new BillingServiceError("validation", "Annual billing isn't offered for this plan.", "Choose monthly billing, or another plan.");
      case "already_on_plan":
        return new BillingServiceError("conflict", "You're already on this plan.", "Choose a different plan.");
      case "amount_too_small":
        return new BillingServiceError("validation", "This change is too close to your renewal to charge separately.", "Try again after your next renewal.");
      case "plan_inactive":
      case "plan_not_found":
      case "plan_not_payable":
        return new BillingServiceError("validation", "That plan can't be bought online.", "Choose another plan.");
      case "currency_not_supported":
        return new BillingServiceError("validation", "Online payment supports INR only.", "Contact support for another currency.");
      case "invoice_not_payable":
      case "invoice_not_found":
        return new BillingServiceError("conflict", "This invoice can't be paid any more.", "Reload the page to see its latest status.");
    }
    if (error.status === 403) return new BillingServiceError("validation", "You can't make payments for this organization.", "Ask an owner or admin to do this.");
  }
  return new BillingServiceError("service_unavailable", "The payment couldn't be started.", "Nothing was charged. Try again in a moment.");
}

const unavailable = () =>
  new BillingServiceError(
    "service_unavailable",
    "This billing action isn't implemented in the backend yet.",
    "Wait for the backend developer to finish this API.",
  );

class LiveBillingRepository implements BillingRepository {
  readonly mode = "live" as const;

  failNextPayment() {
    /* mock-only preview control */
  }

  /**
   * Everything shown comes from the backend: the subscription summary, the invoices, the organization profile, the signed-in user and the team size.
   * The summary and the invoices are required (a failure is a real error, not a sample page); the other three only enrich the page.
   */
  private identity = { name: "", email: "" };

  loadSnapshot = async (_scenario: BillingScenario): Promise<BillingSnapshot> => {
    const companyId = getStoredCompanyId();
    if (!companyId) throw new BillingServiceError("service_unavailable", "No company is selected.", "Select a company and reload.");
    const headers = companyScopeHeaders(companyId);
    try {
      const [summary, invoices, catalog, organization, me, members, contacts] = await Promise.all([
        apiClient.request<BackendBillingSummary>({ method: "GET", path: "/billing/summary", headers }),
        apiClient.request<BackendInvoice[]>({ method: "GET", path: "/billing/invoices", headers }),
        apiClient.request<BackendPlansResponse>({ method: "GET", path: "/billing/plans", headers }).catch(() => null),
        apiClient.request<BackendOrganization>({ method: "GET", path: "/settings/organization", headers }).catch(() => null),
        apiClient.request<BackendCurrentUser>({ method: "GET", path: "/users/me" }).catch(() => null),
        apiClient.request<unknown[]>({ method: "GET", path: "/team/members", headers }).catch(() => null),
        apiClient.request<BackendBillingContact[]>({ method: "GET", path: "/billing/contacts", headers }).catch(() => null),
      ]);
      const snapshot = buildLiveSnapshot({ summary, invoices, catalog, organization, contacts, me, companyId, teamMembers: Array.isArray(members) ? members.length : null });
      this.identity = { name: snapshot.currentUser.name, email: snapshot.currentUser.email };
      return snapshot;
    } catch (error) {
      if (error instanceof BillingServiceError) throw error;
      throw new BillingServiceError("service_unavailable", "Billing data couldn't be loaded.", "Check your connection and try again.");
    }
  };

  /**
   * Upgrading, choosing a plan or reactivating is a payment: the server prices it (the same proration the page quotes) and creates the order, the person pays in
   * Razorpay's window, and the server verifies the signed result before the plan changes. A cheaper plan is applied at once without payment; a cycle change is refused by the server for now.
   */
  changePlan = async (input: PlanChangeInput): Promise<BillingSnapshot> => {
    if (input.downgrade) {
      // A cheaper plan is not a payment: the server applies it now and refuses while usage is above the smaller plan's limits.
      await this.post("/billing/downgrade", { planId: input.planId });
      return this.loadSnapshot("active");
    }
    const order = await this.post<CheckoutOrder>("/billing/checkout", { planId: input.planId, cycle: input.cycle === "annual" ? "ANNUAL" : "MONTHLY" });
    await this.pay(order);
    return this.loadSnapshot("active");
  };
  withdrawPendingChange = async () => { throw unavailable(); };
  /** Cancelling is immediate: the server ends the subscription at once and does not refund the unused period. */
  cancelSubscription = async (input: { reason: string; feedback: string; actor: string }): Promise<BillingSnapshot> => {
    await this.post("/billing/cancel", { reason: input.reason.slice(0, 120), feedback: input.feedback.slice(0, 1000) });
    return this.loadSnapshot("active");
  };
  resumeSubscription = async () => { throw unavailable(); };
  savePaymentMethod = async (): Promise<BillingSnapshot> => {
    throw new BillingServiceError("service_unavailable", "Cards aren't saved here.", "You enter your card or UPI details securely in Razorpay's payment window when you pay.");
  };
  setPrimaryMethod = async () => { throw unavailable(); };
  removePaymentMethod = async () => { throw unavailable(); };
  /** Pays an invoice that is waiting for payment, in Razorpay's window. */
  payInvoice = async (invoiceId: string): Promise<BillingSnapshot> => {
    const order = await this.post<CheckoutOrder>(`/billing/invoices/${encodeURIComponent(invoiceId)}/pay`);
    await this.pay(order);
    return this.loadSnapshot("active");
  };

  private post<T>(path: string, body?: unknown): Promise<T> {
    return this.send<T>("POST", path, body);
  }

  private async send<T>(method: "POST" | "PUT" | "DELETE", path: string, body?: unknown): Promise<T> {
    const companyId = getStoredCompanyId();
    if (!companyId) throw new BillingServiceError("service_unavailable", "No company is selected.", "Select a company and reload.");
    try {
      return await apiClient.request<T>({ method, path, headers: companyScopeHeaders(companyId), body });
    } catch (error) {
      throw paymentError(error);
    }
  }

  /** Opens the payment window and, once Razorpay reports success, has the server verify and apply it. */
  private async pay(order: CheckoutOrder): Promise<void> {
    let result;
    try {
      result = await collectPayment(order, this.identity);
    } catch (error) {
      if (error instanceof CheckoutCancelled) throw new BillingServiceError("payment_declined", "The payment was cancelled.", "Nothing was charged. Try again when you're ready.");
      if (error instanceof CheckoutFailed) throw new BillingServiceError("payment_declined", error.message, "Nothing was charged. Try another card or UPI.");
      if (error instanceof CheckoutUnavailable) throw new BillingServiceError("network", "The payment window couldn't load.", "Check your connection and try again. Nothing was charged.");
      throw error;
    }
    await this.post("/billing/checkout/confirm", {
      invoiceId: order.invoiceId,
      razorpayOrderId: result.razorpay_order_id,
      razorpayPaymentId: result.razorpay_payment_id,
      razorpaySignature: result.razorpay_signature,
    });
  }
  /** Billing details are the organization's own profile (`PATCH /settings/organization`, the same record Settings edits). */
  saveProfile = async (profile: BillingProfile): Promise<BillingSnapshot> => {
    const companyId = getStoredCompanyId();
    if (!companyId) throw new BillingServiceError("service_unavailable", "No company is selected.", "Select a company and reload.");
    try {
      const current = await organizationApi.get(companyId);
      await organizationApi.update(companyId, toOrganizationPatch(profile, current.revision));
    } catch (error) {
      if (ApiError.isApiError(error)) {
        if (error.status === 409) throw new BillingServiceError("conflict", "These details were changed by someone else.", "Reload the page and try again.");
        if (error.status === 403) throw new BillingServiceError("validation", "You can't edit the organization's details.", "Ask an owner or admin to make this change.");
        if (error.status === 400 || error.status === 422) throw new BillingServiceError("validation", error.message, "Check the highlighted details and try again.");
      }
      throw new BillingServiceError("service_unavailable", "Billing details couldn't be saved.", "Nothing was changed. Try again in a moment.");
    }
    return this.loadSnapshot("active");
  };
  /** Billing contacts are stored by the server; the first one is the primary, and making another primary demotes it. */
  saveContact = async (contact: BillingContact): Promise<BillingSnapshot> => {
    await this.send("PUT", "/billing/contacts", toBackendContact(contact));
    return this.loadSnapshot("active");
  };
  removeContact = async (id: string): Promise<BillingSnapshot> => {
    if (id === ORGANIZATION_CONTACT_ID) {
      throw new BillingServiceError("validation", "This is your organization's own contact.", "Edit it in Settings, or add a billing contact to replace it.");
    }
    await this.send("DELETE", `/billing/contacts/${encodeURIComponent(id)}`);
    return this.loadSnapshot("active");
  };
  buyCredits = async () => { throw unavailable(); };
  setAddOn = async () => { throw unavailable(); };
  requestSales = async () => { throw unavailable(); };
}

let instance: BillingRepository | null = null;

export function getBillingRepository(): BillingRepository {
  if (!instance) instance = BILLING_MOCK_MODE ? new MockBillingRepository() : new LiveBillingRepository();
  return instance;
}

export function errorMessage(error: unknown): { message: string; hint: string } {
  if (error instanceof BillingServiceError) return { message: error.message, hint: error.hint };
  return { message: "Something went wrong.", hint: "Try again in a moment." };
}
