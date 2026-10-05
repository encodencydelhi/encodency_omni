import { addMonths, formatISO, parseISO } from "date-fns";
import type { UpdateOrganizationPayload } from "../../settings/live/organization-api";
import { GSTIN_RE } from "./selectors";
import type {
  BillingContact,
  BillingProfile,
  BillingRole,
  BillingSnapshot,
  Invoice,
  InvoiceStatus,
  FeatureKey,
  LimitKey,
  Payment,
  PaymentMethod,
  Plan,
  PlanId,
  PlanLimits,
  SubscriptionStatus,
  UsageMetric,
} from "./types";

/**
 * Builds the billing page's snapshot from what the backend actually knows. Nothing is sampled: a field the backend has no source for is empty (no payment
 * methods, credit packs, add-ons, sales request) or, for plan limits the backend does not enforce, "no limit" (null). The backend meters two things only:
 * clients and AI tokens.
 */

/** `GET /billing/summary`. `subscriptionId` is null when the company has no subscription (the backend then returns a stand-in plan, which is not shown as real). */
export interface BackendBillingSummary {
  subscriptionId: string | null;
  status: string;
  plan: { id: string; name: string; isActive: boolean; monthlyPrice: number };
  currentPeriodEnd: string;
  startedAt?: string | null;
  limits: { maxClients: number; maxAiTokens: number };
  usage: { currentClients: number; currentAiTokens: number };
}

/** `GET /billing/invoices`. Amounts are in paise. */
export interface BackendInvoice {
  id: string;
  amount: number;
  status: string;
  paidAt: string | null;
  invoiceUrl: string | null;
  /** What the invoice is for, e.g. "Upgrade to Pro (prorated)". */
  description?: string | null;
  /** The gateway payment that settled it (Razorpay payment id), when it was paid online. */
  paymentReference?: string | null;
  createdAt: string;
}

export interface BackendPlan {
  id: string;
  name: string;
  monthlyPrice: number;
  maxClients: number;
  maxAiTokens: number;
  automationEnabled: boolean;
}

/** `GET /billing/plans`: the plans a company can buy, and whether online payment is set up on the server. */
export interface BackendPlansResponse {
  plans: BackendPlan[];
  gateway: { provider: "RAZORPAY"; configured: boolean };
}

export interface BackendOrganization {
  name: string;
  revision?: number;
  displayName?: string;
  legalName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  address: { street?: string | null; city?: string | null; state?: string | null; country?: string | null; postalCode?: string | null } | null;
  taxId: string | null;
}

export interface BackendCurrentUser {
  email: string;
  name?: string | null;
  memberships: { companyId: string; companyName?: string; systemRole: string }[];
}

const ALL_FEATURES: FeatureKey[] = [
  "publishing", "calendar", "automation", "seo", "website_intel", "analytics", "advanced_analytics", "reporting",
  "white_label", "collaboration", "approvals", "audit_logs", "premium_channels", "crm", "sso", "api_access",
];

const PLAN_SLOTS: PlanId[] = ["starter", "growth", "professional", "enterprise"];
const NO_PLAN = "no-plan";

/**
 * The page names its plans with four fixed ids, the backend identifies them by uuid. The plans (cheapest first, the current one always included) take the four
 * ids in order, and `slotToPlanId` remembers which real plan each id stands for so a choice can be sent back.
 */
export function mapPlans(catalog: BackendPlansResponse | null | undefined, summary: BackendBillingSummary): { plans: Plan[]; slotToPlanId: Partial<Record<PlanId, string>>; currentSlot: PlanId } {
  const hasSubscription = summary.subscriptionId !== null;
  const byId = new Map<string, BackendPlan>((catalog?.plans ?? []).map((plan) => [plan.id, plan]));
  if (hasSubscription && !byId.has(summary.plan.id)) {
    byId.set(summary.plan.id, { id: summary.plan.id, name: summary.plan.name, monthlyPrice: summary.plan.monthlyPrice, maxClients: summary.limits.maxClients, maxAiTokens: summary.limits.maxAiTokens, automationEnabled: true });
  }
  let ordered = [...byId.values()].sort((a, b) => a.monthlyPrice - b.monthlyPrice || a.name.localeCompare(b.name));
  if (ordered.length > PLAN_SLOTS.length) {
    // Four slots only: keep the current plan and drop the dearest others.
    const keep = new Set(ordered.slice(0, PLAN_SLOTS.length).map((plan) => plan.id));
    if (hasSubscription && !keep.has(summary.plan.id)) keep.delete([...keep].at(-1) as string), keep.add(summary.plan.id);
    ordered = ordered.filter((plan) => keep.has(plan.id));
  }
  if (ordered.length === 0) ordered = [{ id: NO_PLAN, name: "No active plan", monthlyPrice: 0, maxClients: summary.limits.maxClients, maxAiTokens: summary.limits.maxAiTokens, automationEnabled: true }];

  const slotToPlanId: Partial<Record<PlanId, string>> = {};
  const plans = ordered.map((plan, index): Plan => {
    const slot = PLAN_SLOTS[index]!;
    slotToPlanId[slot] = plan.id;
    // Limits the backend does not enforce are "no limit"; only clients and AI tokens are real caps.
    const limits = Object.fromEntries((["clients", "teamMembers", "channels", "aiCredits", "automations", "automationRuns", "scheduledPosts", "reports", "storageGb"] as LimitKey[]).map((key) => [key, null])) as PlanLimits;
    limits.clients = plan.maxClients;
    limits.aiCredits = plan.maxAiTokens;
    return {
      id: slot,
      name: plan.name,
      tagline: "",
      rank: index + 1,
      monthlyPrice: paiseToRupees(plan.monthlyPrice),
      annualMonthlyPrice: null,
      contactSales: false,
      limits,
      features: plan.automationEnabled ? ALL_FEATURES : ALL_FEATURES.filter((feature) => feature !== "automation"),
      support: "email",
    };
  });
  const currentSlot = (Object.entries(slotToPlanId).find(([, id]) => hasSubscription && id === summary.plan.id)?.[0] as PlanId | undefined) ?? plans[0]!.id;
  return { plans, slotToPlanId, currentSlot };
}

/** Razorpay Checkout as the one payment method: the card, UPI or net-banking details are entered in its window at payment time. */
const GATEWAY_METHOD: PaymentMethod = {
  id: "razorpay-checkout",
  type: "gateway",
  role: "primary",
  brand: null,
  last4: null,
  expMonth: null,
  expYear: null,
  upiId: null,
  holderName: "Razorpay Checkout",
  addedAt: "",
};

const paiseToRupees = (paise: number) => Math.round(paise) / 100;

const ROLE: Record<string, BillingRole> = { OWNER: "org_admin", ADMIN: "billing_admin", MANAGER: "manager", VIEWER: "member" };
export const billingRoleOf = (systemRole: string | undefined): BillingRole => (systemRole ? ROLE[systemRole] : undefined) ?? "member";

/** No subscription and an admin suspension both read as "cancelled": the page then offers reactivation, which is only available through support. */
const SUBSCRIPTION_STATUS: Record<string, SubscriptionStatus> = {
  ACTIVE: "active",
  PAST_DUE: "past_due",
  INCOMPLETE: "payment_due",
  SUSPENDED: "cancelled",
  CANCELED: "cancelled",
};

const INVOICE_STATUS: Record<string, InvoiceStatus | null> = { PAID: "paid", OPEN: "pending", UNCOLLECTIBLE: "failed", VOID: "voided", DRAFT: null };

/** A draft invoice is not issued yet, so the customer never sees it. */
export function toInvoices(items: BackendInvoice[]): Invoice[] {
  return items.flatMap((item) => {
    const status = INVOICE_STATUS[item.status];
    if (!status) return [];
    const total = paiseToRupees(item.amount);
    return [
      {
        id: item.id,
        number: `INV-${item.id.slice(0, 8).toUpperCase()}`,
        // The backend records one date per invoice, not a billing period.
        periodStart: item.createdAt,
        periodEnd: item.createdAt,
        issuedAt: item.createdAt,
        dueAt: item.createdAt,
        status,
        lines: [{ id: `${item.id}-subscription`, kind: "plan" as const, description: item.description || "Subscription", quantity: 1, unitAmount: total, amount: total }],
        subtotal: total,
        taxRate: 0,
        tax: 0,
        total,
        paymentMethodLabel: item.paymentReference ? "Razorpay" : null,
        paidAt: item.paidAt,
        transactionId: item.paymentReference ?? null,
        refundedAt: null,
        note: null,
      },
    ];
  });
}

/** A paid invoice is a successful payment; nothing else is recorded. */
export function toPayments(invoices: Invoice[]): Payment[] {
  return invoices
    .filter((invoice) => invoice.status === "paid" && invoice.paidAt)
    .map((invoice) => ({
      id: `pay-${invoice.id}`,
      reference: invoice.number,
      invoiceId: invoice.id,
      date: invoice.paidAt as string,
      amount: invoice.total,
      methodLabel: invoice.paymentMethodLabel ?? "Not recorded",
      status: "successful" as const,
      description: invoice.lines[0]?.description ?? "Subscription",
      failureReason: null,
    }));
}

/** The organization stores one tax number. A GSTIN-shaped one is the GSTIN; any other is the general tax id. */
export function toBillingProfile(org: BackendOrganization | null): BillingProfile {
  const address = org?.address ?? null;
  const taxNumber = org?.taxId ?? "";
  const isGstin = GSTIN_RE.test(taxNumber);
  return {
    legalName: org?.legalName ?? org?.name ?? "",
    billingEmail: org?.contactEmail ?? "",
    billingPhone: org?.contactPhone ?? "",
    addressLine1: address?.street ?? "",
    addressLine2: "",
    city: address?.city ?? "",
    state: address?.state ?? "",
    country: address?.country ?? "",
    postalCode: address?.postalCode ?? "",
    gstin: isGstin ? taxNumber : "",
    pan: "",
    taxId: isGstin ? "" : taxNumber,
  };
}

const orNull = (value: string) => (value.trim() ? value.trim() : null);

/**
 * The billing details form as an organization update. The organization has no PAN and no second address line, so a PAN is refused (never silently dropped)
 * and line 2 is kept by joining it to the street. GSTIN and tax id share the one tax number field (GSTIN wins when both are filled).
 */
export function toOrganizationPatch(profile: BillingProfile, expectedRevision: number): UpdateOrganizationPayload {
  if (profile.pan.trim()) throw new Error("pan_not_stored");
  const street = [profile.addressLine1.trim(), profile.addressLine2.trim()].filter(Boolean).join(", ");
  const address = { street: orNull(street), city: orNull(profile.city), state: orNull(profile.state), country: orNull(profile.country), postalCode: orNull(profile.postalCode) };
  return {
    expectedRevision,
    legalName: orNull(profile.legalName),
    contactEmail: orNull(profile.billingEmail),
    contactPhone: orNull(profile.billingPhone),
    address: Object.values(address).every((value) => value === null) ? null : address,
    taxId: orNull(profile.gstin) ?? orNull(profile.taxId),
  };
}

function toContacts(org: BackendOrganization | null): BillingContact[] {
  if (!org || (!org.contactEmail && !org.contactPhone)) return [];
  return [{ id: "organization-contact", kind: "primary", name: org.legalName ?? org.name, email: org.contactEmail ?? "", phone: org.contactPhone ?? "", role: "Organization contact" }];
}

export interface LiveSnapshotInput {
  summary: BackendBillingSummary;
  /** `GET /billing/plans`; absent when it could not be read (the current plan is then the only one shown). */
  catalog?: BackendPlansResponse | null;
  invoices: BackendInvoice[];
  organization: BackendOrganization | null;
  me: BackendCurrentUser | null;
  companyId: string;
  teamMembers: number | null;
}

export function buildLiveSnapshot(input: LiveSnapshotInput): BillingSnapshot {
  const { summary, organization, me, companyId } = input;
  const hasSubscription = summary.subscriptionId !== null;
  const membership = me?.memberships.find((m) => m.companyId === companyId);
  const periodEnd = summary.currentPeriodEnd;
  const periodStart = formatISO(addMonths(parseISO(periodEnd), -1));

  const { plans, currentSlot } = mapPlans(input.catalog, summary);

  const usage: UsageMetric[] = [
    { key: "clients", used: hasSubscription ? summary.usage.currentClients : 0, resets: false },
    { key: "aiCredits", used: hasSubscription ? summary.usage.currentAiTokens : 0, resets: true },
    ...(input.teamMembers === null ? [] : [{ key: "teamMembers" as const, used: input.teamMembers, resets: false }]),
  ];

  const invoices = toInvoices(input.invoices);
  const started = summary.startedAt ?? periodStart;
  const status: SubscriptionStatus = hasSubscription ? SUBSCRIPTION_STATUS[summary.status] ?? "active" : "cancelled";

  return {
    organizationName: organization?.displayName ?? organization?.name ?? membership?.companyName ?? "",
    currentUser: { name: me?.name || me?.email || "", email: me?.email ?? "", role: billingRoleOf(membership?.systemRole) },
    plans,
    subscription: {
      id: summary.subscriptionId ?? "none",
      planId: currentSlot,
      cycle: "monthly",
      status,
      startedAt: started,
      currentPeriodStart: periodStart,
      currentPeriodEnd: periodEnd,
      trialEndsAt: null,
      graceEndsAt: null,
      cancelAt: null,
      cancelledAt: status === "cancelled" ? periodEnd : null,
      pendingChange: null,
      history: [],
    },
    usage,
    entities: {},
    paymentMethods: input.catalog?.gateway.configured ? [{ ...GATEWAY_METHOD, addedAt: summary.startedAt ?? periodStart }] : [],
    invoices,
    payments: toPayments(invoices),
    profile: toBillingProfile(organization),
    contacts: toContacts(organization),
    credits: { included: summary.limits.maxAiTokens, used: hasSubscription ? summary.usage.currentAiTokens : 0, purchased: 0, purchasedExpireAt: null, resetsAt: periodEnd },
    creditPacks: [],
    addOnCatalog: [],
    addOns: [],
    salesRequest: null,
    taxRate: 0,
    currency: "INR",
  };
}
