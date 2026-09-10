import type { Invoice, RevenueSummary, Transaction, TransactionType } from "@/types/domain/billing";
import type { CompanyStatus } from "@/types/domain/company";
import type {
  BillingCycle,
  PaymentStatus,
  Subscription,
  SubscriptionStatus,
} from "@/types/domain/subscription";
import { buildTrend, createRng, daysAgo, daysAhead, type Rng } from "../lib/random";
import { getPlanByTier } from "./plans";
import { COMPANIES } from "./tenants";

/** A tenant lifecycle state maps directly onto its subscription state. */
const STATUS_MAP: Record<CompanyStatus, SubscriptionStatus> = {
  active: "active",
  trial: "trial",
  past_due: "past_due",
  suspended: "past_due",
  churned: "expired",
};

const PAYMENT_MAP: Record<SubscriptionStatus, PaymentStatus> = {
  active: "paid",
  trial: "pending",
  past_due: "failed",
  cancelled: "paid",
  expired: "failed",
};

const FAILURE_REASONS = [
  "Card declined by issuing bank",
  "Insufficient funds",
  "Card expired",
  "3-D Secure authentication abandoned",
  "Payment method removed by customer",
] as const;

const PAYMENT_METHODS = ["Visa •••• 4242", "Mastercard •••• 8829", "Amex •••• 1007", "SEPA Direct Debit", "Wire transfer"] as const;

function buildSubscriptions(): Subscription[] {
  return COMPANIES.map((company, index) => {
    const rng = createRng(5000 + index * 13);
    const plan = getPlanByTier(company.planTier);
    const status = STATUS_MAP[company.status];
    // A small share of otherwise-healthy tenants have cancelled but not lapsed.
    const finalStatus: SubscriptionStatus =
      status === "active" && rng.bool(0.08) ? "cancelled" : status;

    const billingCycle: BillingCycle =
      company.mrrMinor > 0 && company.mrrMinor < plan.monthlyPriceMinor ? "annual" : "monthly";

    const startedAt = company.createdAt;
    const renewsAt =
      finalStatus === "expired"
        ? daysAgo(rng.int(10, 90))
        : daysAhead(billingCycle === "annual" ? rng.int(20, 330) : rng.int(1, 30));

    return {
      id: `sub_${company.slug}`,
      company: { id: company.id, name: company.name },
      planTier: company.planTier,
      planName: plan.name,
      billingCycle,
      status: finalStatus,
      startedAt,
      renewsAt,
      cancelledAt: finalStatus === "cancelled" ? daysAgo(rng.int(2, 25)) : null,
      amountMinor: billingCycle === "annual" ? plan.annualPriceMinor : plan.monthlyPriceMinor,
      currency: plan.currency,
      paymentStatus: PAYMENT_MAP[finalStatus],
      seats: company.counts.users,
      autoRenew: finalStatus !== "cancelled" && finalStatus !== "expired",
    };
  });
}

export const SUBSCRIPTIONS: readonly Subscription[] = buildSubscriptions();

/** Plan subscriber counts are derived so they can never drift from the data. */
export function countSubscribersByTier(): Record<string, number> {
  return SUBSCRIPTIONS.reduce<Record<string, number>>((totals, subscription) => {
    if (subscription.status === "expired") return totals;
    totals[subscription.planTier] = (totals[subscription.planTier] ?? 0) + 1;
    return totals;
  }, {});
}

const TRANSACTION_TYPES: TransactionType[] = ["subscription", "subscription", "subscription", "overage", "addon", "refund"];

function buildTransactions(): Transaction[] {
  const transactions: Transaction[] = [];
  let sequence = 4820;

  SUBSCRIPTIONS.forEach((subscription, subscriptionIndex) => {
    const rng = createRng(9000 + subscriptionIndex * 29);
    // Roughly a year of billing history per tenant, most recent first.
    const cycles = subscription.billingCycle === "annual" ? rng.int(1, 2) : rng.int(3, 11);

    for (let cycle = 0; cycle < cycles; cycle += 1) {
      const type = cycle === 0 ? rng.pick(TRANSACTION_TYPES) : "subscription";
      const isLatest = cycle === 0;
      const status: PaymentStatus =
        type === "refund"
          ? "refunded"
          : isLatest
            ? subscription.paymentStatus
            : rng.bool(0.94)
              ? "paid"
              : "failed";

      const baseAmount =
        type === "overage"
          ? rng.int(120000, 1800000)
          : type === "addon"
            ? rng.int(290000, 990000)
            : subscription.amountMinor;

      sequence += 1;

      transactions.push({
        id: `txn_${sequence}`,
        reference: `TXN-2026-${sequence}`,
        company: subscription.company,
        type,
        amountMinor: type === "refund" ? -Math.round(baseAmount * rng.float(0.2, 1)) : baseAmount,
        currency: subscription.currency,
        status,
        method: rng.pick(PAYMENT_METHODS),
        failureReason: status === "failed" ? rng.pick(FAILURE_REASONS) : null,
        invoiceNumber: status === "failed" ? null : `INV-2026-${sequence}`,
        createdAt: daysAgo(cycle * (subscription.billingCycle === "annual" ? 365 : 30) + rng.float(0, 6, 2)),
      });
    }
  });

  return transactions.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}

export const TRANSACTIONS: readonly Transaction[] = buildTransactions();

function buildInvoices(): Invoice[] {
  return TRANSACTIONS.filter((transaction) => transaction.invoiceNumber !== null)
    .slice(0, 90)
    .map((transaction, index) => {
      const rng = createRng(11000 + index * 7);
      const issuedAt = transaction.createdAt;
      const dueAt = daysAhead(-((Date.now() - Date.parse(issuedAt)) / 86_400_000) + 14);
      const isOverdue = transaction.status === "failed";

      return {
        id: `inv_${transaction.id}`,
        number: transaction.invoiceNumber ?? `INV-${index}`,
        company: transaction.company,
        status: isOverdue ? "overdue" : transaction.status === "refunded" ? "void" : rng.bool(0.9) ? "paid" : "open",
        amountMinor: Math.abs(transaction.amountMinor),
        currency: transaction.currency,
        issuedAt,
        dueAt,
        paidAt: transaction.status === "paid" ? transaction.createdAt : null,
      } satisfies Invoice;
    });
}

export const INVOICES: readonly Invoice[] = buildInvoices();

function sumMinor(items: readonly Transaction[], predicate: (item: Transaction) => boolean): number {
  return items.filter(predicate).reduce((total, item) => total + item.amountMinor, 0);
}

function buildRevenueSummary(rng: Rng): RevenueSummary {
  const mrrMinor = COMPANIES.reduce((total, company) => total + company.mrrMinor, 0);
  const activeCompanies = COMPANIES.filter((company) => company.mrrMinor > 0).length;
  const thirtyDaysAgo = Date.parse(daysAgo(30));

  const recent = TRANSACTIONS.filter((item) => Date.parse(item.createdAt) >= thirtyDaysAgo);
  const failed = recent.filter((item) => item.status === "failed");

  const byPlan = new Map<string, { amountMinor: number; companies: number }>();
  for (const subscription of SUBSCRIPTIONS) {
    if (subscription.status === "expired") continue;
    const entry = byPlan.get(subscription.planName) ?? { amountMinor: 0, companies: 0 };
    entry.amountMinor +=
      subscription.billingCycle === "annual"
        ? Math.round(subscription.amountMinor / 12)
        : subscription.amountMinor;
    entry.companies += 1;
    byPlan.set(subscription.planName, entry);
  }

  return {
    mrrMinor,
    mrrChangePercent: 6.4,
    arrMinor: mrrMinor * 12,
    currency: "INR",
    collectedThisMonthMinor: sumMinor(recent, (item) => item.status === "paid"),
    outstandingMinor: Math.abs(sumMinor(failed, () => true)),
    failedPaymentsCount: failed.length,
    failedPaymentsMinor: Math.abs(sumMinor(failed, () => true)),
    refundedThisMonthMinor: Math.abs(sumMinor(recent, (item) => item.status === "refunded")),
    averageRevenuePerCompanyMinor: activeCompanies > 0 ? Math.round(mrrMinor / activeCompanies) : 0,
    revenueTrend: buildTrend({ rng, days: 30, start: mrrMinor * 0.82, end: mrrMinor, noise: 0.05 }),
    revenueByPlan: [...byPlan.entries()].map(([planName, entry]) => ({ planName, ...entry })),
  };
}

export const REVENUE_SUMMARY: RevenueSummary = buildRevenueSummary(createRng(7331));
