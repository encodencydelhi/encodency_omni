
import { addMonths, addYears, differenceInCalendarDays, parseISO } from "date-fns";
import { BILLING_MOCK_MODE, CHANGE_LABEL, DECLINED_TEST_CARD } from "./config";
import { buildSnapshot, priceLines, reference, round2 } from "./mock-provider";
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
/* Unavailable (mock mode off, no service attached)                    */
/* ------------------------------------------------------------------ */

const unavailable = () =>
  new BillingServiceError(
    "service_unavailable",
    "The billing service isn't reachable right now.",
    "Mock mode is off and no billing backend is configured. Set NEXT_PUBLIC_BILLING_MOCK_MODE=true to explore with sample data.",
  );

class UnavailableBillingRepository implements BillingRepository {
  readonly mode = "live" as const;
  failNextPayment() { }
  loadSnapshot = async (): Promise<BillingSnapshot> => { throw unavailable(); };
  changePlan = this.loadSnapshot;
  withdrawPendingChange = this.loadSnapshot;
  cancelSubscription = this.loadSnapshot;
  resumeSubscription = this.loadSnapshot;
  savePaymentMethod = this.loadSnapshot;
  setPrimaryMethod = this.loadSnapshot;
  removePaymentMethod = this.loadSnapshot;
  payInvoice = this.loadSnapshot;
  saveProfile = this.loadSnapshot;
  saveContact = this.loadSnapshot;
  removeContact = this.loadSnapshot;
  buyCredits = this.loadSnapshot;
  setAddOn = this.loadSnapshot;
  requestSales = this.loadSnapshot;
}

let instance: BillingRepository | null = null;

export function getBillingRepository(): BillingRepository {
  if (!instance) instance = BILLING_MOCK_MODE ? new MockBillingRepository() : new UnavailableBillingRepository();
  return instance;
}

export function errorMessage(error: unknown): { message: string; hint: string } {
  if (error instanceof BillingServiceError) return { message: error.message, hint: error.hint };
  return { message: "Something went wrong.", hint: "Try again in a moment." };
}
