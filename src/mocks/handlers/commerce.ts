import { ApiError } from "@/types/api";
import type { Invoice, Transaction } from "@/types/domain/billing";
import type { Plan, QuotaLimits } from "@/types/domain/plan";
import type { Subscription } from "@/types/domain/subscription";
import type { InternalTeamMember } from "@/types/domain/team";
import { countSubscribersByTier, INVOICES, REVENUE_SUMMARY, SUBSCRIPTIONS, TRANSACTIONS } from "../data/commerce";
import { INTERNAL_TEAM } from "../data/internal-team";
import { PLANS } from "../data/plans";
import { PLATFORM_USAGE } from "../data/usage";
import { compare, equals, queryCollection } from "../lib/collection";
import type { MockRoutes } from "../lib/router";

/** In-memory plan edits, so saving a plan is observable across navigations. */
const planOverrides = new Map<string, Partial<Plan>>();

function resolvePlans(): Plan[] {
  const subscribers = countSubscribersByTier();
  return PLANS.map((plan) => ({
    ...plan,
    ...planOverrides.get(plan.id),
    subscriberCount: subscribers[plan.tier] ?? 0,
  }));
}

const subscriptionQueryConfig = {
  searchable: (subscription: Subscription) => [subscription.company.name, subscription.planName, subscription.id],
  filters: {
    status: equals<Subscription>((subscription) => subscription.status),
    planTier: equals<Subscription>((subscription) => subscription.planTier),
    billingCycle: equals<Subscription>((subscription) => subscription.billingCycle),
    paymentStatus: equals<Subscription>((subscription) => subscription.paymentStatus),
  },
  sorters: {
    company: compare.text<Subscription>((subscription) => subscription.company.name),
    planName: compare.text<Subscription>((subscription) => subscription.planName),
    status: compare.text<Subscription>((subscription) => subscription.status),
    startedAt: compare.date<Subscription>((subscription) => subscription.startedAt),
    renewsAt: compare.date<Subscription>((subscription) => subscription.renewsAt),
    amountMinor: compare.number<Subscription>((subscription) => subscription.amountMinor),
  },
  defaultSort: { field: "renewsAt", direction: "asc" as const },
};

const transactionQueryConfig = {
  searchable: (transaction: Transaction) => [
    transaction.reference,
    transaction.company.name,
    transaction.invoiceNumber,
  ],
  filters: {
    status: equals<Transaction>((transaction) => transaction.status),
    type: equals<Transaction>((transaction) => transaction.type),
    companyId: equals<Transaction>((transaction) => transaction.company.id),
  },
  sorters: {
    createdAt: compare.date<Transaction>((transaction) => transaction.createdAt),
    amountMinor: compare.number<Transaction>((transaction) => transaction.amountMinor),
    company: compare.text<Transaction>((transaction) => transaction.company.name),
    status: compare.text<Transaction>((transaction) => transaction.status),
  },
  defaultSort: { field: "createdAt", direction: "desc" as const },
};

const teamQueryConfig = {
  searchable: (member: InternalTeamMember) => [member.name, member.email, member.department],
  filters: {
    role: equals<InternalTeamMember>((member) => member.role),
    status: equals<InternalTeamMember>((member) => member.status),
    department: equals<InternalTeamMember>((member) => member.department),
  },
  sorters: {
    name: compare.text<InternalTeamMember>((member) => member.name),
    role: compare.text<InternalTeamMember>((member) => member.role),
    status: compare.text<InternalTeamMember>((member) => member.status),
    lastActiveAt: compare.date<InternalTeamMember>((member) => member.lastActiveAt),
    createdAt: compare.date<InternalTeamMember>((member) => member.createdAt),
  },
  defaultSort: { field: "name", direction: "asc" as const },
};

export const commerceRoutes: MockRoutes = {
  "GET /plans": () => resolvePlans(),

  "PATCH /plans/:id": ({ params, body }) => {
    const id = params.id ?? "";
    const plan = resolvePlans().find((item) => item.id === id);
    if (!plan) {
      throw new ApiError({ code: "NOT_FOUND", status: 404, message: "Plan not found." });
    }

    const patch = (body ?? {}) as Partial<Plan> & { limits?: Partial<QuotaLimits> };
    const next: Partial<Plan> = {
      ...planOverrides.get(id),
      ...patch,
      limits: { ...plan.limits, ...(patch.limits ?? {}) },
    };

    planOverrides.set(id, next);
    return { ...plan, ...next };
  },

  "GET /subscriptions": ({ query }) => queryCollection(SUBSCRIPTIONS, query, subscriptionQueryConfig),

  "GET /billing/summary": () => REVENUE_SUMMARY,

  "GET /billing/transactions": ({ query }) =>
    queryCollection(TRANSACTIONS, query, transactionQueryConfig),

  "GET /billing/invoices": ({ query }) =>
    queryCollection(INVOICES, query, {
      searchable: (invoice: Invoice) => [invoice.number, invoice.company.name],
      filters: { status: equals<Invoice>((invoice) => invoice.status) },
      sorters: {
        issuedAt: compare.date<Invoice>((invoice) => invoice.issuedAt),
        amountMinor: compare.number<Invoice>((invoice) => invoice.amountMinor),
        company: compare.text<Invoice>((invoice) => invoice.company.name),
      },
      defaultSort: { field: "issuedAt", direction: "desc" },
    }),

  "GET /usage": () => PLATFORM_USAGE,

  "GET /internal-team": ({ query }) => queryCollection(INTERNAL_TEAM, query, teamQueryConfig),
};
