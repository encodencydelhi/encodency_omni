
import { addMonths, addYears, differenceInCalendarDays, endOfMonth, format, parseISO } from "date-fns";
import {
  CARD_BRAND_LABEL,
  CARD_EXPIRY_WARNING_DAYS,
  CYCLE_LABEL,
  LIMIT_META,
  LIMIT_ORDER,
  NEAR_LIMIT,
  RENEWAL_WARNING_DAYS,
} from "./config";
import type {
  ActiveAddOn,
  AddOnDefinition,
  BillingCycle,
  BillingSnapshot,
  FeatureKey,
  Invoice,
  InvoiceStatus,
  LimitKey,
  PaymentMethod,
  Plan,
  PlanId,
  PlanLimits,
  UsageEntity,
} from "./types";

const round2 = (value: number) => Math.round(value * 100) / 100;

/* ------------------------------------------------------------------ */
/* Formatting                                                          */
/* ------------------------------------------------------------------ */

const inrWhole = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
const inrExact = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 2, maximumFractionDigits: 2 });
const number = new Intl.NumberFormat("en-IN");

/** Whole rupees print without paise; anything else prints both decimals. */
export function money(amount: number) {
  const value = round2(amount);
  return Number.isInteger(value) ? inrWhole.format(value) : inrExact.format(value);
}

export function count(value: number) {
  return number.format(value);
}

export function formatLimit(key: LimitKey, value: number | null) {
  if (value === null) return "Unlimited";
  return LIMIT_META[key].format === "storage" ? `${count(value)} GB` : count(value);
}

export function formatUsed(key: LimitKey, value: number) {
  return LIMIT_META[key].format === "storage" ? `${value.toLocaleString("en-IN", { maximumFractionDigits: 1 })} GB` : count(value);
}

export const shortDate = (iso: string) => format(parseISO(iso), "d MMM yyyy");
export const longDate = (iso: string) => format(parseISO(iso), "d MMMM yyyy");
export const dateTime = (iso: string) => format(parseISO(iso), "d MMM yyyy, h:mm a");

export function daysUntil(iso: string, now: number) {
  return differenceInCalendarDays(parseISO(iso), new Date(now));
}

export function inDays(days: number) {
  if (days === 0) return "today";
  if (days === 1) return "tomorrow";
  if (days === -1) return "yesterday";
  return days > 0 ? `in ${days} days` : `${Math.abs(days)} days ago`;
}

/* ------------------------------------------------------------------ */
/* Plans & prices                                                      */
/* ------------------------------------------------------------------ */

export function planById(plans: Plan[], id: PlanId): Plan {
  return plans.find((plan) => plan.id === id) ?? plans[0]!;
}

/** What one billing period costs before GST. `null` for contact-sales plans. */
export function periodPrice(plan: Plan, cycle: BillingCycle): number | null {
  if (cycle === "monthly") return plan.monthlyPrice;
  return plan.annualMonthlyPrice === null ? null : plan.annualMonthlyPrice * 12;
}

export function monthlyEquivalent(plan: Plan, cycle: BillingCycle): number | null {
  return cycle === "monthly" ? plan.monthlyPrice : plan.annualMonthlyPrice;
}

/** Savings from paying annually, derived from the two prices — never asserted. */
export function annualSavings(plan: Plan): { amount: number; percent: number } | null {
  if (plan.monthlyPrice === null || plan.annualMonthlyPrice === null) return null;
  const amount = (plan.monthlyPrice - plan.annualMonthlyPrice) * 12;
  if (amount <= 0) return null;
  return { amount, percent: Math.round((amount / (plan.monthlyPrice * 12)) * 100) };
}

export function bestAnnualSavingsPercent(plans: Plan[]) {
  const values = plans.map(annualSavings).filter((value): value is { amount: number; percent: number } => value !== null);
  return values.length ? Math.max(...values.map((value) => value.percent)) : null;
}

export function cycleUnit(cycle: BillingCycle) {
  return cycle === "monthly" ? "month" : "year";
}

export function periodLabel(cycle: BillingCycle) {
  return CYCLE_LABEL[cycle];
}

/* ------------------------------------------------------------------ */
/* Limits & usage                                                      */
/* ------------------------------------------------------------------ */

export function addOnAvailable(definition: AddOnDefinition, planId: PlanId) {
  return definition.availableOn.includes(planId);
}

/** Plan limits plus whatever active add-ons carry onto that plan. */
export function effectiveLimits(plan: Plan, addOns: ActiveAddOn[], catalog: AddOnDefinition[]): PlanLimits {
  const limits = { ...plan.limits };
  for (const addOn of addOns) {
    const definition = catalog.find((item) => item.key === addOn.key);
    if (!definition || !addOnAvailable(definition, plan.id)) continue;
    const current = limits[definition.limit];
    if (current !== null) limits[definition.limit] = current + addOn.quantity * definition.unitSize;
  }
  return limits;
}

export type UsageState = "healthy" | "near" | "exhausted" | "unlimited";

export interface UsageRow {
  key: LimitKey;
  used: number;
  limit: number | null;
  /** 0–100+, rounded. */
  percent: number;
  state: UsageState;
  remaining: number | null;
  resets: boolean;
  /** Extra headroom from add-ons or purchased credits, shown alongside the plan limit. */
  extra: number;
}

export function usageState(used: number, limit: number | null): UsageState {
  if (limit === null) return "unlimited";
  if (limit <= 0 || used >= limit) return "exhausted";
  return used / limit >= NEAR_LIMIT ? "near" : "healthy";
}

export function usageRows(snapshot: BillingSnapshot): UsageRow[] {
  const plan = planById(snapshot.plans, snapshot.subscription.planId);
  const limits = effectiveLimits(plan, snapshot.addOns, snapshot.addOnCatalog);
  return LIMIT_ORDER.map((key) => {
    const metric = snapshot.usage.find((item) => item.key === key);
    const isCredits = key === "aiCredits";
    const used = isCredits ? snapshot.credits.used : (metric?.used ?? 0);
    const base = isCredits ? snapshot.credits.included : limits[key];
    const extra = isCredits ? snapshot.credits.purchased : base === null || plan.limits[key] === null ? 0 : base - (plan.limits[key] ?? 0);
    const limit = base === null ? null : isCredits ? base + snapshot.credits.purchased : base;
    return {
      key,
      used,
      limit,
      percent: limit ? Math.round((used / limit) * 100) : 0,
      state: usageState(used, limit),
      remaining: limit === null ? null : Math.max(limit - used, 0),
      resets: metric?.resets ?? false,
      extra,
    };
  });
}

export const USAGE_STATE_META: Record<UsageState, { label: string; tone: "green" | "amber" | "red" | "neutral" }> = {
  healthy: { label: "Healthy", tone: "green" },
  near: { label: "Near limit", tone: "amber" },
  exhausted: { label: "Limit reached", tone: "red" },
  unlimited: { label: "Unlimited", tone: "neutral" },
};

export function creditsRemaining(snapshot: BillingSnapshot) {
  return Math.max(snapshot.credits.included + snapshot.credits.purchased - snapshot.credits.used, 0);
}

/* ------------------------------------------------------------------ */
/* Subscription state                                                  */
/* ------------------------------------------------------------------ */

export function subscriptionFlags(snapshot: BillingSnapshot) {
  const status = snapshot.subscription.status;
  return {
    trial: status === "trialing",
    cancelled: status === "cancelled",
    cancelling: status === "scheduled_cancellation",
    paymentProblem: status === "past_due" || status === "grace_period" || status === "payment_due",
    failed: status === "past_due" || status === "grace_period",
    live: status !== "cancelled",
  };
}

export function outstandingInvoice(snapshot: BillingSnapshot): Invoice | null {
  return snapshot.invoices.find((invoice) => invoice.status === "failed" || invoice.status === "pending") ?? null;
}

/* ------------------------------------------------------------------ */
/* Payment methods                                                     */
/* ------------------------------------------------------------------ */

export function primaryMethod(methods: PaymentMethod[]) {
  return methods.find((method) => method.role === "primary") ?? null;
}

export function backupMethod(methods: PaymentMethod[]) {
  return methods.find((method) => method.role === "backup") ?? null;
}

export function methodLabel(method: PaymentMethod | null) {
  if (!method) return "No payment method";
  if (method.type === "upi") return `UPI AutoPay · ${method.upiId}`;
  return `${method.brand ? CARD_BRAND_LABEL[method.brand] : "Card"} •••• ${method.last4}`;
}

export function methodExpiry(method: PaymentMethod) {
  if (method.expMonth === null || method.expYear === null) return null;
  return `${String(method.expMonth).padStart(2, "0")} / ${String(method.expYear).slice(-2)}`;
}

/** Days until the card stops working (end of its expiry month); `null` for UPI. */
export function daysToExpiry(method: PaymentMethod, now: number) {
  if (method.expMonth === null || method.expYear === null) return null;
  const expires = endOfMonth(new Date(method.expYear, method.expMonth - 1, 1));
  return differenceInCalendarDays(expires, new Date(now));
}

export type MethodHealth = "active" | "expiring" | "expired";

export function methodHealth(method: PaymentMethod, now: number): MethodHealth {
  const days = daysToExpiry(method, now);
  if (days === null) return "active";
  if (days < 0) return "expired";
  return days <= CARD_EXPIRY_WARNING_DAYS ? "expiring" : "active";
}

/* ------------------------------------------------------------------ */
/* Next payment                                                        */
/* ------------------------------------------------------------------ */

export interface BreakdownLine {
  label: string;
  detail?: string;
  amount: number;
  kind: "plan" | "addon" | "credits" | "discount" | "tax" | "proration";
}

export interface ChargeBreakdown {
  lines: BreakdownLine[];
  subtotal: number;
  tax: number;
  total: number;
  taxRate: number;
}

export function addOnsPerPeriod(snapshot: BillingSnapshot, planId: PlanId, cycle: BillingCycle): BreakdownLine[] {
  const months = cycle === "annual" ? 12 : 1;
  return snapshot.addOns.flatMap((addOn) => {
    const definition = snapshot.addOnCatalog.find((item) => item.key === addOn.key);
    if (!definition || !addOnAvailable(definition, planId) || addOn.quantity <= 0) return [];
    return [
      {
        label: definition.name,
        detail: `${addOn.quantity} × ${money(definition.monthlyPrice)}${months > 1 ? " × 12 months" : " / month"}`,
        amount: addOn.quantity * definition.monthlyPrice * months,
        kind: "addon" as const,
      },
    ];
  });
}

export function renewalBreakdown(snapshot: BillingSnapshot, planId: PlanId, cycle: BillingCycle, extra: BreakdownLine[] = []): ChargeBreakdown {
  const plan = planById(snapshot.plans, planId);
  const price = periodPrice(plan, cycle) ?? 0;
  const lines: BreakdownLine[] = [
    { label: `${plan.name} plan`, detail: `${CYCLE_LABEL[cycle]} billing`, amount: price, kind: "plan" },
    ...addOnsPerPeriod(snapshot, planId, cycle),
    ...extra,
  ];
  return finalize(lines, snapshot.taxRate);
}

function finalize(lines: BreakdownLine[], taxRate: number): ChargeBreakdown {
  const subtotal = round2(lines.reduce((sum, line) => sum + line.amount, 0));
  const tax = round2(Math.max(subtotal, 0) * taxRate);
  return { lines, subtotal, tax, total: round2(subtotal + tax), taxRate };
}

export function breakdownFromInvoice(invoice: Invoice): ChargeBreakdown {
  return {
    lines: invoice.lines.map((line) => ({
      label: line.description,
      amount: line.amount,
      kind: line.kind === "addon" ? "addon" : line.kind === "credits" ? "credits" : line.kind === "discount" || line.kind === "account_credit" ? "discount" : line.kind === "proration" ? "proration" : "plan",
    })),
    subtotal: invoice.subtotal,
    tax: invoice.tax,
    total: invoice.total,
    taxRate: invoice.taxRate,
  };
}

export type NextPaymentState = "scheduled" | "due" | "failed" | "none" | "needs_method";

export interface NextPayment {
  state: NextPaymentState;
  date: string | null;
  method: PaymentMethod | null;
  breakdown: ChargeBreakdown | null;
  invoice: Invoice | null;
  headline: string;
  note: string;
  planId: PlanId;
  cycle: BillingCycle;
}

export function nextPayment(snapshot: BillingSnapshot): NextPayment {
  const { subscription } = snapshot;
  const method = primaryMethod(snapshot.paymentMethods);
  const outstanding = outstandingInvoice(snapshot);
  const pending = subscription.pendingChange;
  const planId = pending && pending.kind !== "cancellation" ? pending.toPlan : subscription.planId;
  const cycle = pending && pending.kind !== "cancellation" ? pending.toCycle : subscription.cycle;

  if (subscription.status === "cancelled") {
    return { state: "none", date: null, method, breakdown: null, invoice: null, headline: "No upcoming payment", note: "Your subscription is cancelled. Reactivate to resume billing.", planId, cycle };
  }
  if (subscription.status === "scheduled_cancellation") {
    return {
      state: "none",
      date: subscription.cancelAt,
      method,
      breakdown: null,
      invoice: null,
      headline: "No further payments",
      note: `Your subscription ends on ${longDate(subscription.cancelAt ?? subscription.currentPeriodEnd)}. Resume it to keep billing as before.`,
      planId,
      cycle,
    };
  }
  if (outstanding && (subscription.status === "past_due" || subscription.status === "grace_period")) {
    return {
      state: "failed",
      date: outstanding.dueAt,
      method,
      breakdown: breakdownFromInvoice(outstanding),
      invoice: outstanding,
      headline: "Payment failed",
      note: `${outstanding.number} couldn't be collected. Update your payment method and we'll retry straight away.`,
      planId: subscription.planId,
      cycle: subscription.cycle,
    };
  }
  if (outstanding && subscription.status === "payment_due") {
    return {
      state: "due",
      date: outstanding.dueAt,
      method,
      breakdown: breakdownFromInvoice(outstanding),
      invoice: outstanding,
      headline: "Awaiting approval",
      note: outstanding.note ?? `${outstanding.number} is waiting for payment.`,
      planId: subscription.planId,
      cycle: subscription.cycle,
    };
  }
  const date = subscription.status === "trialing" ? subscription.trialEndsAt : subscription.currentPeriodEnd;
  const breakdown = renewalBreakdown(snapshot, planId, cycle);
  if (!method) {
    return {
      state: "needs_method",
      date,
      method,
      breakdown,
      invoice: null,
      headline: "Add a payment method",
      note: subscription.status === "trialing" ? "Add a payment method so your workspace continues after the trial." : "Add a payment method so your renewal can be collected.",
      planId,
      cycle,
    };
  }
  return {
    state: "scheduled",
    date,
    method,
    breakdown,
    invoice: null,
    headline: "Scheduled",
    note: pending
      ? `Includes your scheduled ${pending.kind === "downgrade" ? `downgrade to ${planById(snapshot.plans, pending.toPlan).name}` : `switch to ${CYCLE_LABEL[pending.toCycle].toLowerCase()} billing`}.`
      : subscription.status === "trialing"
        ? "Your first charge, when the trial ends."
        : `Automatic renewal for your ${CYCLE_LABEL[cycle].toLowerCase()} plan.`,
    planId,
    cycle,
  };
}

/* ------------------------------------------------------------------ */
/* Plan changes                                                        */
/* ------------------------------------------------------------------ */

export type ChangeDirection = "upgrade" | "downgrade" | "cycle_change" | "same" | "contact_sales" | "trial_conversion" | "reactivation";

export function changeDirection(snapshot: BillingSnapshot, target: Plan, cycle: BillingCycle): ChangeDirection {
  const current = planById(snapshot.plans, snapshot.subscription.planId);
  if (target.contactSales) return "contact_sales";
  if (snapshot.subscription.status === "trialing") return "trial_conversion";
  if (snapshot.subscription.status === "cancelled") return "reactivation";
  if (target.rank > current.rank) return "upgrade";
  if (target.rank < current.rank) return "downgrade";
  return cycle === snapshot.subscription.cycle ? "same" : "cycle_change";
}

export interface ChangeQuote {
  direction: ChangeDirection;
  currentPrice: number | null;
  newPrice: number | null;
  /** When the new plan takes effect. */
  effectiveAt: string;
  immediate: boolean;
  /** Charged today (estimated for prorations). */
  today: ChargeBreakdown | null;
  /** What the next renewal will look like after the change. */
  next: ChargeBreakdown | null;
  nextAt: string;
  remainingDays: number;
  periodDays: number;
  estimated: boolean;
}

export function quoteChange(snapshot: BillingSnapshot, targetId: PlanId, cycle: BillingCycle, now: number): ChangeQuote {
  const { subscription } = snapshot;
  const current = planById(snapshot.plans, subscription.planId);
  const target = planById(snapshot.plans, targetId);
  const direction = changeDirection(snapshot, target, cycle);
  const currentPrice = periodPrice(current, subscription.cycle);
  const newPrice = periodPrice(target, cycle);
  const today = new Date(now);
  const periodStart = parseISO(subscription.currentPeriodStart);
  const periodEnd = parseISO(subscription.currentPeriodEnd);
  const periodDays = Math.max(differenceInCalendarDays(periodEnd, periodStart), 1);
  const remainingDays = Math.min(Math.max(differenceInCalendarDays(periodEnd, today), 0), periodDays);
  const fraction = remainingDays / periodDays;
  const nextPeriodEnd = (from: Date) => (cycle === "annual" ? addYears(from, 1) : addMonths(from, 1));
  const base = { direction, currentPrice, newPrice, remainingDays, periodDays };

  if (direction === "contact_sales" || newPrice === null) {
    return { ...base, effectiveAt: today.toISOString(), immediate: false, today: null, next: null, nextAt: subscription.currentPeriodEnd, estimated: false };
  }

  if (direction === "trial_conversion") {
    // The trial carries on; the first charge lands when it ends.
    const at = subscription.trialEndsAt ?? subscription.currentPeriodEnd;
    return { ...base, effectiveAt: at, immediate: false, today: null, next: renewalBreakdown(snapshot, target.id, cycle), nextAt: at, estimated: false };
  }

  if (direction === "reactivation") {
    const charge = renewalBreakdown(snapshot, target.id, cycle);
    return { ...base, effectiveAt: today.toISOString(), immediate: true, today: charge, next: charge, nextAt: nextPeriodEnd(today).toISOString(), estimated: false };
  }

  if (direction === "upgrade") {
    if (cycle === subscription.cycle) {
      // Pay the difference for the days left; the renewal date doesn't move.
      const difference = round2(((newPrice ?? 0) - (currentPrice ?? 0)) * fraction);
      const todayCharge = finalize(
        [{ label: `${target.name} plan · ${remainingDays} of ${periodDays} days`, detail: `Difference from ${current.name}, prorated`, amount: difference, kind: "proration" }],
        snapshot.taxRate,
      );
      return {
        ...base,
        effectiveAt: today.toISOString(),
        immediate: true,
        today: todayCharge,
        next: renewalBreakdown(snapshot, target.id, cycle),
        nextAt: subscription.currentPeriodEnd,
        estimated: true,
      };
    }
    // New cycle starts today; unused time on the current plan is credited.
    const credit = round2((currentPrice ?? 0) * fraction);
    const todayCharge = renewalBreakdown(snapshot, target.id, cycle, [
      { label: `Unused ${current.name} time`, detail: `${remainingDays} of ${periodDays} days`, amount: -credit, kind: "credits" },
    ]);
    return {
      ...base,
      effectiveAt: today.toISOString(),
      immediate: true,
      today: todayCharge,
      next: renewalBreakdown(snapshot, target.id, cycle),
      nextAt: nextPeriodEnd(today).toISOString(),
      estimated: true,
    };
  }

  // Downgrades and cycle changes wait for the renewal, so nothing is charged or refunded today.
  return {
    ...base,
    effectiveAt: subscription.currentPeriodEnd,
    immediate: false,
    today: null,
    next: renewalBreakdown(snapshot, target.id, cycle),
    nextAt: subscription.currentPeriodEnd,
    estimated: false,
  };
}

/** A plan that fits today's usage with room to grow — the smallest one above the current plan. */
export function recommendedPlan(snapshot: BillingSnapshot): PlanId | null {
  const current = planById(snapshot.plans, snapshot.subscription.planId);
  const rows = usageRows(snapshot);
  const pressured = rows.some((row) => row.state === "near" || row.state === "exhausted");
  const candidates = snapshot.plans.filter((plan) => !plan.contactSales && plan.rank > current.rank).sort((a, b) => a.rank - b.rank);
  if (!pressured) return null;
  const fits = candidates.find((plan) =>
    rows.every((row) => {
      const limit = row.key === "aiCredits" ? plan.limits.aiCredits : plan.limits[row.key];
      return limit === null || row.used <= limit * 0.7;
    }),
  );
  return (fits ?? candidates[0])?.id ?? null;
}

/* ------------------------------------------------------------------ */
/* Downgrade impact                                                    */
/* ------------------------------------------------------------------ */

export interface LimitConflict {
  key: LimitKey;
  used: number;
  newLimit: number;
  over: number;
  entities: UsageEntity[];
}

export interface LimitImpact {
  key: LimitKey;
  used: number;
  newLimit: number;
  message: string;
}

/** Counted limits with named items must be resolved; metered ones are reported as impact. */
export function downgradeImpact(snapshot: BillingSnapshot, targetId: PlanId) {
  const target = planById(snapshot.plans, targetId);
  const limits = effectiveLimits(target, snapshot.addOns, snapshot.addOnCatalog);
  const rows = usageRows(snapshot);
  const conflicts: LimitConflict[] = [];
  const impacts: LimitImpact[] = [];

  for (const row of rows) {
    const newLimit = limits[row.key];
    if (newLimit === null) continue;
    const entities = snapshot.entities[row.key];
    if (entities && row.used > newLimit) {
      conflicts.push({ key: row.key, used: row.used, newLimit, over: row.used - newLimit, entities });
      continue;
    }
    if (row.key === "aiCredits") {
      if ((row.limit ?? 0) > newLimit) impacts.push({ key: row.key, used: row.used, newLimit, message: `Monthly AI credits drop to ${count(newLimit)}. Purchased credits are kept.` });
      continue;
    }
    if (row.used <= newLimit) continue;
    const meta = LIMIT_META[row.key];
    const message =
      row.key === "automations"
        ? `${count(row.used - newLimit)} automations will be paused, newest first. You choose which to resume.`
        : row.key === "storageGb"
          ? `New uploads pause until media storage is under ${newLimit} GB. Nothing is deleted.`
          : `Usage above ${count(newLimit)} ${meta.unit} is queued until the next month.`;
    impacts.push({ key: row.key, used: row.used, newLimit, message });
  }
  return { conflicts, impacts };
}

export function featuresLost(current: Plan, target: Plan): FeatureKey[] {
  return current.features.filter((feature) => !target.features.includes(feature));
}

export function featuresGained(current: Plan, target: Plan): FeatureKey[] {
  return target.features.filter((feature) => !current.features.includes(feature));
}

/* ------------------------------------------------------------------ */
/* Needs attention                                                     */
/* ------------------------------------------------------------------ */

export type AttentionSeverity = "critical" | "warning" | "info";

export type AttentionAction =
  | { kind: "update_payment" }
  | { kind: "add_payment" }
  | { kind: "pay_invoice"; invoiceId: string }
  | { kind: "view_invoice"; invoiceId: string }
  | { kind: "upgrade" }
  | { kind: "buy_credits" }
  | { kind: "add_on"; limit: LimitKey }
  | { kind: "choose_plan" }
  | { kind: "resume" }
  | { kind: "reactivate" }
  | { kind: "view_breakdown" }
  | { kind: "withdraw_change" }
  | { kind: "add_contact" }
  | { kind: "edit_details" }
  | { kind: "link"; href: string };

export interface AttentionItem {
  id: string;
  severity: AttentionSeverity;
  title: string;
  description: string;
  action: AttentionAction & { label: string };
  secondary?: AttentionAction & { label: string };
}

export function attentionItems(snapshot: BillingSnapshot, now: number): AttentionItem[] {
  const items: AttentionItem[] = [];
  const { subscription } = snapshot;
  const flags = subscriptionFlags(snapshot);
  const outstanding = outstandingInvoice(snapshot);
  const primary = primaryMethod(snapshot.paymentMethods);

  if (outstanding && flags.failed) {
    items.push({
      id: "payment-failed",
      severity: "critical",
      title: "Payment failed",
      description: `${outstanding.number} for ${money(outstanding.total)} was declined. ${subscription.status === "grace_period" && subscription.graceEndsAt ? `Service continues until ${longDate(subscription.graceEndsAt)}.` : "We'll keep retrying, but updating the card fixes it now."}`,
      action: { kind: "update_payment", label: "Update payment" },
      secondary: { kind: "view_invoice", invoiceId: outstanding.id, label: "View invoice" },
    });
  }
  if (outstanding && subscription.status === "payment_due") {
    const days = daysUntil(outstanding.dueAt, now);
    items.push({
      id: "invoice-due",
      severity: days < 0 ? "critical" : "warning",
      title: days < 0 ? "Invoice overdue" : "Invoice awaiting payment",
      description: `${outstanding.number} for ${money(outstanding.total)} is due ${inDays(days)}. ${outstanding.note ?? ""}`.trim(),
      action: { kind: "pay_invoice", invoiceId: outstanding.id, label: "Pay now" },
      secondary: { kind: "view_invoice", invoiceId: outstanding.id, label: "View invoice" },
    });
  }
  if (subscription.status === "trialing" && subscription.trialEndsAt) {
    const days = daysUntil(subscription.trialEndsAt, now);
    items.push({
      id: "trial",
      severity: days <= 3 ? "warning" : "info",
      title: `Trial ends ${inDays(days)}`,
      description: primary ? "Choose the plan you want to continue on. You won't be charged before the trial ends." : "Choose a plan and add a payment method to keep your workspace running after the trial.",
      action: { kind: "choose_plan", label: "Choose plan" },
      secondary: primary ? undefined : { kind: "add_payment", label: "Add payment method" },
    });
  } else if (!primary && flags.live) {
    items.push({
      id: "no-method",
      severity: "critical",
      title: "No payment method",
      description: "Your next renewal can't be collected without one.",
      action: { kind: "add_payment", label: "Add payment method" },
    });
  }
  for (const method of snapshot.paymentMethods) {
    const health = methodHealth(method, now);
    if (health === "active" || !flags.live) continue;
    const days = daysToExpiry(method, now) ?? 0;
    items.push({
      id: `card-${method.id}`,
      severity: health === "expired" || method.role === "primary" ? (health === "expired" ? "critical" : "warning") : "info",
      title: health === "expired" ? `Card ending ${method.last4} has expired` : `Card ending ${method.last4} expires soon`,
      description:
        method.role === "primary"
          ? `Your primary card ${health === "expired" ? "no longer works" : `expires ${inDays(days)}`}. Update it before your next payment.`
          : `Your backup card ${health === "expired" ? "no longer works" : `expires ${inDays(days)}`}.`,
      action: { kind: "update_payment", label: "Update payment method" },
    });
  }

  if (flags.live) {
    for (const row of usageRows(snapshot)) {
      if (row.state !== "near" && row.state !== "exhausted") continue;
      const meta = LIMIT_META[row.key];
      const exhausted = row.state === "exhausted";
      const isCredits = row.key === "aiCredits";
      const addOnFor = snapshot.addOnCatalog.find((definition) => definition.limit === row.key && addOnAvailable(definition, subscription.planId));
      items.push({
        id: `limit-${row.key}`,
        severity: exhausted ? "critical" : "warning",
        title: isCredits
          ? `AI credits ${row.percent}% used`
          : row.key === "teamMembers"
            ? exhausted
              ? "Team seats are full"
              : "Team seats almost full"
            : `${meta.label} ${exhausted ? "limit reached" : "almost at limit"}`,
        description: `${formatUsed(row.key, row.used)} of ${formatLimit(row.key, row.limit)} ${meta.unit} used${row.resets ? `, resets ${shortDate(snapshot.credits.resetsAt)}` : ""}. ${exhausted ? "New ones can't be added until you make room." : `${row.remaining !== null ? formatUsed(row.key, row.remaining) : "Some"} left.`
          }`,
        action: isCredits ? { kind: "buy_credits", label: "Buy credits" } : { kind: "upgrade", label: "Upgrade plan" },
        secondary: isCredits ? { kind: "upgrade", label: "Upgrade plan" } : addOnFor ? { kind: "add_on", limit: row.key, label: `Add ${addOnFor.unitLabel === "pack of 5" ? "channels" : `${addOnFor.unitLabel}s`}` } : meta.link ? { kind: "link", href: meta.link.href, label: meta.link.label } : undefined,
      });
    }
  }

  if (subscription.pendingChange && subscription.pendingChange.status === "scheduled") {
    const change = subscription.pendingChange;
    items.push({
      id: "pending-change",
      severity: "info",
      title: change.kind === "downgrade" ? `Downgrade to ${planById(snapshot.plans, change.toPlan).name} scheduled` : `Switching to ${CYCLE_LABEL[change.toCycle].toLowerCase()} billing`,
      description: `Takes effect ${longDate(change.effectiveAt)}. You can keep your current setup until then.`,
      action: { kind: "withdraw_change", label: change.kind === "downgrade" ? `Keep ${planById(snapshot.plans, change.fromPlan).name}` : "Keep current cycle" },
    });
  }

  if (subscription.status === "active" && !subscription.pendingChange) {
    const days = daysUntil(subscription.currentPeriodEnd, now);
    if (days >= 0 && days <= RENEWAL_WARNING_DAYS) {
      items.push({
        id: "renewal",
        severity: "info",
        title: `Renews ${inDays(days)}`,
        description: `${money(nextPayment(snapshot).breakdown?.total ?? 0)} will be charged to ${methodLabel(primary)}.`,
        action: { kind: "view_breakdown", label: "View breakdown" },
      });
    }
  }

  if (flags.live && !snapshot.contacts.length) {
    items.push({ id: "no-contact", severity: "info", title: "No billing contact", description: "Invoices and payment alerts only go to the billing email until you add a contact.", action: { kind: "add_contact", label: "Add contact" } });
  }
  if (flags.live && snapshot.profile.country === "India" && !snapshot.profile.gstin) {
    items.push({ id: "no-gstin", severity: "info", title: "GSTIN missing", description: "Add your GSTIN so invoices show it and you can claim input tax credit.", action: { kind: "edit_details", label: "Edit billing details" } });
  }

  const order: Record<AttentionSeverity, number> = { critical: 0, warning: 1, info: 2 };
  return items.sort((a, b) => order[a.severity] - order[b.severity]);
}

/* ------------------------------------------------------------------ */
/* Invoices                                                            */
/* ------------------------------------------------------------------ */

export type InvoiceFilter = "all" | InvoiceStatus;

export function filterInvoices(invoices: Invoice[], status: InvoiceFilter, query: string) {
  const needle = query.trim().toLowerCase();
  return invoices.filter((invoice) => {
    if (status !== "all" && invoice.status !== status) return false;
    if (!needle) return true;
    return (
      invoice.number.toLowerCase().includes(needle) ||
      invoice.lines.some((line) => line.description.toLowerCase().includes(needle)) ||
      shortDate(invoice.issuedAt).toLowerCase().includes(needle)
    );
  });
}

export function invoicePeriod(invoice: Invoice) {
  if (invoice.periodStart === invoice.periodEnd) return shortDate(invoice.periodStart);
  return `${format(parseISO(invoice.periodStart), "d MMM")} – ${shortDate(invoice.periodEnd)}`;
}

export function hasReceipt(invoice: Invoice) {
  return invoice.status === "paid" || invoice.status === "refunded";
}

export function toCsv(rows: Record<string, string | number>[]) {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]!);
  const escape = (value: string | number) => {
    const text = String(value);
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  return [headers.join(","), ...rows.map((row) => headers.map((header) => escape(row[header] ?? "")).join(","))].join("\n");
}

export function downloadFile(filename: string, content: BlobPart, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/* ------------------------------------------------------------------ */
/* Validation                                                          */
/* ------------------------------------------------------------------ */

export function luhnValid(digits: string) {
  if (!/^\d{12,19}$/.test(digits)) return false;
  let sum = 0;
  let double = false;
  for (let index = digits.length - 1; index >= 0; index -= 1) {
    let digit = Number(digits[index]);
    if (double) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    double = !double;
  }
  return sum % 10 === 0;
}

export function detectBrand(digits: string): PaymentMethod["brand"] {
  if (/^4/.test(digits)) return "visa";
  if (/^(5[1-5]|2(2[2-9]|[3-6]\d|7[01]|720))/.test(digits)) return "mastercard";
  if (/^3[47]/.test(digits)) return "amex";
  if (/^(60|65|81|82|508)/.test(digits)) return "rupay";
  return null;
}

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export const GSTIN_RE = /^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
export const PAN_RE = /^[A-Z]{5}\d{4}[A-Z]$/;
export const PIN_RE = /^[1-9]\d{5}$/;
export const PHONE_RE = /^\+?[\d\s-]{8,16}$/;
export const UPI_RE = /^[\w.-]{2,256}@[a-zA-Z]{2,64}$/;
