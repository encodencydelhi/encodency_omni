import { addDays, addMonths, setDate, startOfDay, subDays, subMonths } from "date-fns";
import { adminClients } from "@/mocks/admin/admin-dashboard.mock";
import { GRACE_DAYS } from "./config";
import type {
  AddOnDefinition,
  BillingContact,
  BillingProfile,
  BillingScenario,
  BillingSnapshot,
  CreditPack,
  Invoice,
  InvoiceLineItem,
  InvoiceStatus,
  LimitKey,
  Payment,
  PaymentMethod,
  Plan,
  SubscriptionChange,
  UsageEntity,
  UsageMetric,
} from "./types";

export const round2 = (value: number) => Math.round(value * 100) / 100;
export const mockPlans: Plan[] = [
  {
    id: "starter",
    name: "Starter",
    tagline: "For a single team getting started",
    rank: 1,
    monthlyPrice: 4999,
    annualMonthlyPrice: 4249,
    contactSales: false,
    limits: { clients: 2, teamMembers: 5, channels: 8, aiCredits: 2000, automations: 10, automationRuns: 5000, scheduledPosts: 400, reports: 20, storageGb: 25 },
    features: ["publishing", "calendar", "automation", "seo", "analytics", "reporting", "collaboration", "crm"],
    support: "email",
  },
  {
    id: "growth",
    name: "Growth",
    tagline: "For agencies running several clients",
    rank: 2,
    monthlyPrice: 12999,
    annualMonthlyPrice: 11049,
    contactSales: false,
    limits: { clients: 5, teamMembers: 15, channels: 20, aiCredits: 10000, automations: 50, automationRuns: 25000, scheduledPosts: 1500, reports: 100, storageGb: 100 },
    features: ["publishing", "calendar", "automation", "seo", "website_intel", "analytics", "reporting", "collaboration", "approvals", "premium_channels", "crm"],
    support: "priority",
  },
  {
    id: "professional",
    name: "Professional",
    tagline: "For growing agencies with larger teams",
    rank: 3,
    monthlyPrice: 24999,
    annualMonthlyPrice: 21249,
    contactSales: false,
    limits: { clients: 15, teamMembers: 40, channels: 60, aiCredits: 30000, automations: 150, automationRuns: 100000, scheduledPosts: 5000, reports: 300, storageGb: 500 },
    features: [
      "publishing",
      "calendar",
      "automation",
      "seo",
      "website_intel",
      "analytics",
      "advanced_analytics",
      "reporting",
      "white_label",
      "collaboration",
      "approvals",
      "audit_logs",
      "premium_channels",
      "crm",
      "api_access",
    ],
    support: "priority",
  },
  {
    id: "enterprise",
    name: "Enterprise",
    tagline: "Custom limits, security and support",
    rank: 4,
    monthlyPrice: null,
    annualMonthlyPrice: null,
    contactSales: true,
    limits: { clients: null, teamMembers: null, channels: null, aiCredits: 100000, automations: null, automationRuns: null, scheduledPosts: null, reports: null, storageGb: 2000 },
    features: [
      "publishing",
      "calendar",
      "automation",
      "seo",
      "website_intel",
      "analytics",
      "advanced_analytics",
      "reporting",
      "white_label",
      "collaboration",
      "approvals",
      "audit_logs",
      "premium_channels",
      "crm",
      "api_access",
      "sso",
    ],
    support: "dedicated",
  },
];

export const mockCreditPacks: CreditPack[] = [
  { id: "pack-1k", credits: 1000, price: 999 },
  { id: "pack-5k", credits: 5000, price: 4499 },
  { id: "pack-10k", credits: 10000, price: 7999 },
];

export const mockAddOnCatalog: AddOnDefinition[] = [
  {
    key: "extra_seats",
    name: "Extra team seats",
    description: "Add seats without changing plan.",
    limit: "teamMembers",
    unitSize: 1,
    unitLabel: "seat",
    monthlyPrice: 499,
    maxQuantity: 25,
    availableOn: ["starter", "growth", "professional"],
  },
  {
    key: "extra_clients",
    name: "Extra client slots",
    description: "Manage more clients on your current plan.",
    limit: "clients",
    unitSize: 1,
    unitLabel: "client",
    monthlyPrice: 1999,
    maxQuantity: 10,
    availableOn: ["starter", "growth", "professional"],
  },
  {
    key: "extra_channels",
    name: "Extra connected channels",
    description: "Sold in packs of 5 channels.",
    limit: "channels",
    unitSize: 5,
    unitLabel: "pack of 5",
    monthlyPrice: 999,
    maxQuantity: 10,
    availableOn: ["starter", "growth", "professional"],
  },
];
const clientEntities: UsageEntity[] = [
  ...adminClients.map((client) => ({ id: client.id, name: client.name, detail: client.website })),
  { id: "namo-gange-wellness", name: "Namo Gange Wellness", detail: "namogangewellness.org" },
];

const memberEntities: UsageEntity[] = [
  { id: "mem-1", name: "Manish Sirohi", detail: "Organization Admin · you", locked: true },
  { id: "mem-2", name: "Priya Sharma", detail: "Marketing Manager" },
  { id: "mem-3", name: "Amit Singh", detail: "SEO Manager" },
  { id: "mem-4", name: "Neha Gupta", detail: "Social Media Manager" },
  { id: "mem-5", name: "Rahul Verma", detail: "Content Writer" },
  { id: "mem-6", name: "Sanjay Kumar", detail: "Ads Manager" },
  { id: "mem-7", name: "Anjali Mehta", detail: "Billing Admin" },
  { id: "mem-8", name: "Vikram Patel", detail: "Sales Agent" },
  { id: "mem-9", name: "Kavita Rao", detail: "Analyst" },
  { id: "mem-10", name: "Deepak Joshi", detail: "Content Writer" },
  { id: "mem-11", name: "Pooja Nair", detail: "Viewer" },
  { id: "mem-12", name: "Arjun Das", detail: "Social Media Manager" },
];

const channelEntities: UsageEntity[] = [
  ["meta-moksha", "Meta & Instagram", "Moksha Sewa"],
  ["meta-ganga", "Meta & Instagram", "Ganga Aarti"],
  ["meta-green", "Meta & Instagram", "Green Ghats"],
  ["meta-wellness", "Meta & Instagram", "Namo Gange Wellness"],
  ["linkedin-moksha", "LinkedIn", "Moksha Sewa"],
  ["linkedin-green", "LinkedIn", "Green Ghats"],
  ["gbp-moksha", "Google Business Profile", "Moksha Sewa"],
  ["gbp-green", "Google Business Profile", "Green Ghats"],
  ["gbp-wellness", "Google Business Profile", "Namo Gange Wellness"],
  ["wa-moksha", "WhatsApp Business", "Moksha Sewa"],
  ["wa-ganga", "WhatsApp Business", "Ganga Aarti"],
  ["yt-ganga", "YouTube", "Ganga Aarti"],
  ["x-ganga", "X (Twitter)", "Ganga Aarti"],
  ["gsc-moksha", "Search Console", "Moksha Sewa"],
  ["gsc-green", "Search Console", "Green Ghats"],
  ["ga4-ganga", "Google Analytics 4", "Ganga Aarti"],
  ["web-moksha", "Website Tracking", "Moksha Sewa"],
].map(([id, name, detail]) => ({ id: id!, name: name!, detail: detail! }));


const TAX_RATE = 0.18;

function fnv(text: string) {
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  return hash;
}

export function reference(prefix: string, seed: string) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  let value = fnv(seed);
  let out = "";
  for (let index = 0; index < 14; index += 1) {
    out += alphabet[value % alphabet.length];
    value = fnv(`${seed}:${index}:${value}`);
  }
  return `${prefix}_${out}`;
}

export function priceLines(lines: InvoiceLineItem[], taxRate = TAX_RATE) {
  const subtotal = round2(lines.reduce((sum, line) => sum + line.amount, 0));
  const tax = round2(Math.max(subtotal, 0) * taxRate);
  return { subtotal, tax, total: round2(subtotal + tax) };
}

interface InvoiceSeed {
  issuedAt: Date;
  periodStart: Date;
  periodEnd: Date;
  lines: Omit<InvoiceLineItem, "id">[];
  status: InvoiceStatus;
  method: string | null;
  note?: string;
  dueInDays?: number;
}

function buildInvoices(seeds: InvoiceSeed[]): Invoice[] {
  const ordered = [...seeds].sort((a, b) => a.issuedAt.getTime() - b.issuedAt.getTime());
  const counters = new Map<number, number>();
  return ordered
    .map((seed) => {
      const year = seed.issuedAt.getFullYear();
      const next = (counters.get(year) ?? 0) + 1;
      counters.set(year, next);
      const number = `INV-${year}-${String(next).padStart(3, "0")}`;
      const lines = seed.lines.map((line, index) => ({ ...line, id: `${number}-l${index + 1}` }));
      const totals = priceLines(lines);
      const settled = seed.status === "paid" || seed.status === "refunded";
      return {
        id: number.toLowerCase(),
        number,
        periodStart: seed.periodStart.toISOString(),
        periodEnd: seed.periodEnd.toISOString(),
        issuedAt: seed.issuedAt.toISOString(),
        dueAt: addDays(seed.issuedAt, seed.dueInDays ?? 0).toISOString(),
        status: seed.status,
        lines,
        ...totals,
        taxRate: TAX_RATE,
        paymentMethodLabel: seed.method,
        paidAt: settled ? seed.issuedAt.toISOString() : null,
        transactionId: settled ? reference("pay", number) : null,
        refundedAt: seed.status === "refunded" ? addDays(seed.issuedAt, 9).toISOString() : null,
        note: seed.note ?? null,
      } satisfies Invoice;
    })
    .reverse();
}

function paymentsFor(invoices: Invoice[]): Payment[] {
  const payments: Payment[] = [];
  for (const invoice of invoices) {
    const description = invoice.lines[0]?.description ?? "Payment";
    if (invoice.status === "voided") continue;
    if (invoice.status === "paid" || invoice.status === "refunded") {
      payments.push({
        id: `pmt-${invoice.id}`,
        reference: invoice.transactionId ?? reference("pay", invoice.number),
        invoiceId: invoice.id,
        date: invoice.paidAt ?? invoice.issuedAt,
        amount: invoice.total,
        methodLabel: invoice.paymentMethodLabel ?? "—",
        status: "successful",
        description,
        failureReason: null,
      });
    }
    if (invoice.status === "refunded" && invoice.refundedAt) {
      payments.push({
        id: `rfd-${invoice.id}`,
        reference: reference("rfnd", invoice.number),
        invoiceId: invoice.id,
        date: invoice.refundedAt,
        amount: -invoice.total,
        methodLabel: invoice.paymentMethodLabel ?? "—",
        status: "refunded",
        description: `Refund · ${invoice.number}`,
        failureReason: null,
      });
    }
  }
  return payments.sort((a, b) => b.date.localeCompare(a.date));
}

function planLine(planName: string, price: number, periodStart: Date, periodEnd: Date): Omit<InvoiceLineItem, "id"> {
  const fmt = (date: Date) => date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  return { kind: "plan", description: `${planName} plan · Monthly (${fmt(periodStart)} – ${fmt(periodEnd)})`, quantity: 1, unitAmount: price, amount: price };
}

/** The renewal day is the 15th; the current period ends on the next one. */
export function currentPeriod(now: Date) {
  const today = startOfDay(now);
  let end = setDate(today, 15);
  if (end <= today) end = addMonths(end, 1);
  return { start: subMonths(end, 1), end };
}

/* ------------------------------------------------------------------ */
/* Snapshot                                                            */
/* ------------------------------------------------------------------ */

export function buildSnapshot(scenario: BillingScenario, now: Date): BillingSnapshot {
  const { start, end } = currentPeriod(now);
  const growth = mockPlans[1]!;
  const starter = mockPlans[0]!;
  const visa = "Visa •••• 4242";
  const upgradeAt = subMonths(start, 5);
  const trial = scenario === "trial";

  /* Payment methods ------------------------------------------------- */
  const expiring = scenario === "card_expiring";
  const paymentMethods: PaymentMethod[] = trial
    ? []
    : [
      {
        id: "pm-visa-4242",
        type: "card",
        role: "primary",
        brand: "visa",
        last4: "4242",
        expMonth: expiring ? now.getMonth() + 1 : 8,
        expYear: expiring ? now.getFullYear() : 2028,
        upiId: null,
        holderName: "Namo Gange Trust",
        addedAt: subMonths(start, 11).toISOString(),
      },
      {
        id: "pm-mc-9211",
        type: "card",
        role: "backup",
        brand: "mastercard",
        last4: "9211",
        expMonth: 11,
        expYear: 2027,
        upiId: null,
        holderName: "Anjali Mehta",
        addedAt: subMonths(start, 4).toISOString(),
      },
    ];

  /* Invoices -------------------------------------------------------- */
  const seeds: InvoiceSeed[] = [];
  if (!trial) {
    for (let monthsAgo = 11; monthsAgo >= 1; monthsAgo -= 1) {
      const periodStart = subMonths(start, monthsAgo);
      const periodEnd = subMonths(start, monthsAgo - 1);
      const onGrowth = periodStart >= upgradeAt;
      const plan = onGrowth ? growth : starter;
      const status: InvoiceStatus = monthsAgo === 8 ? "refunded" : "paid";
      seeds.push({
        issuedAt: periodStart,
        periodStart,
        periodEnd,
        lines: [planLine(plan.name, plan.monthlyPrice!, periodStart, periodEnd)],
        status,
        method: visa,
        note: status === "refunded" ? "Refunded as goodwill credit for the publishing outage on this period." : undefined,
      });
    }
    // A duplicate issued with the wrong GSTIN, voided and reissued the same day.
    const voidedStart = subMonths(start, 10);
    seeds.push({
      issuedAt: addDays(voidedStart, 0),
      periodStart: voidedStart,
      periodEnd: subMonths(start, 9),
      lines: [planLine(starter.name, starter.monthlyPrice!, voidedStart, subMonths(start, 9))],
      status: "voided",
      method: null,
      note: "Issued with an outdated GSTIN and replaced by a corrected invoice. Nothing was charged.",
    });
    // Mid-cycle upgrade from Starter to Growth.
    const prorationAt = addDays(subMonths(start, 6), 12);
    const remaining = 18 / 30;
    seeds.push({
      issuedAt: prorationAt,
      periodStart: prorationAt,
      periodEnd: subMonths(start, 5),
      lines: [
        { kind: "proration", description: "Growth plan · remaining days of the period", quantity: 1, unitAmount: round2(growth.monthlyPrice! * remaining), amount: round2(growth.monthlyPrice! * remaining) },
        { kind: "account_credit", description: "Unused Starter time", quantity: 1, unitAmount: -round2(starter.monthlyPrice! * remaining), amount: -round2(starter.monthlyPrice! * remaining) },
      ],
      status: "paid",
      method: visa,
    });
    // An AI credit pack bought last period.
    const packAt = addDays(subMonths(start, 1), 9);
    seeds.push({
      issuedAt: packAt,
      periodStart: packAt,
      periodEnd: packAt,
      lines: [{ kind: "credits", description: "AI credit pack · 5,000 credits", quantity: 1, unitAmount: 4499, amount: 4499 }],
      status: "paid",
      method: visa,
    });
    // Current period.
    const currentStatus: InvoiceStatus =
      scenario === "past_due" || scenario === "grace_period" ? "failed" : scenario === "payment_due" ? "pending" : scenario === "cancelled" ? "voided" : "paid";
    seeds.push({
      issuedAt: start,
      periodStart: start,
      periodEnd: end,
      lines: [planLine(growth.name, growth.monthlyPrice!, start, end)],
      status: currentStatus,
      method: currentStatus === "voided" ? null : visa,
      dueInDays: currentStatus === "pending" ? 7 : 0,
      note:
        currentStatus === "voided"
          ? "Voided because the subscription was cancelled before this period began."
          : currentStatus === "failed"
            ? "The card issuer declined the renewal charge."
            : currentStatus === "pending"
              ? "Your bank needs you to approve charges above ₹15,000 before they're collected."
              : undefined,
    });
  }
  const invoices = buildInvoices(seeds);
  const payments = paymentsFor(invoices);
  const current = invoices.find((invoice) => invoice.periodStart === start.toISOString() && invoice.lines[0]?.kind === "plan");

  if (current && (scenario === "past_due" || scenario === "grace_period")) {
    const attempts = scenario === "grace_period" ? [0, 1, 2] : [0, 1];
    attempts.forEach((day) => {
      payments.push({
        id: `pmt-fail-${day}`,
        reference: reference("pay", `${current.number}-attempt-${day}`),
        invoiceId: current.id,
        date: addDays(start, day).toISOString(),
        amount: current.total,
        methodLabel: visa,
        status: "failed",
        description: `${current.lines[0]!.description} · attempt ${day + 1}`,
        failureReason: day === 0 ? "Declined by the card issuer: insufficient funds." : "Declined by the card issuer: do not honour.",
      });
    });
  }
  if (current && scenario === "payment_due") {
    payments.push({
      id: "pmt-pending",
      reference: reference("pay", `${current.number}-pending`),
      invoiceId: current.id,
      date: start.toISOString(),
      amount: current.total,
      methodLabel: visa,
      status: "pending",
      description: current.lines[0]!.description,
      failureReason: null,
    });
  }
  payments.sort((a, b) => b.date.localeCompare(a.date));

  /* Subscription ---------------------------------------------------- */
  const history: SubscriptionChange[] = trial
    ? []
    : [
      {
        id: "chg-upgrade-growth",
        kind: "upgrade",
        status: "applied",
        fromPlan: "starter",
        toPlan: "growth",
        fromCycle: "monthly",
        toCycle: "monthly",
        requestedAt: addDays(subMonths(start, 6), 12).toISOString(),
        requestedBy: "Manish Sirohi",
        effectiveAt: addDays(subMonths(start, 6), 12).toISOString(),
        amount: invoices.find((invoice) => invoice.lines[0]?.kind === "proration")?.subtotal ?? null,
        note: "Needed more clients and approval workflows.",
      },
    ];

  const cancellation: SubscriptionChange | null =
    scenario === "scheduled_cancellation" || scenario === "cancelled"
      ? {
        id: "chg-cancel",
        kind: "cancellation",
        status: scenario === "cancelled" ? "applied" : "scheduled",
        fromPlan: "growth",
        toPlan: "growth",
        fromCycle: "monthly",
        toCycle: "monthly",
        requestedAt: subDays(start, scenario === "cancelled" ? 20 : -2).toISOString(),
        requestedBy: "Manish Sirohi",
        effectiveAt: (scenario === "cancelled" ? start : end).toISOString(),
        amount: null,
        note: null,
        reason: "We only need a break",
      }
      : null;
  if (cancellation) history.unshift(cancellation);

  const status =
    scenario === "active" || scenario === "card_expiring"
      ? "active"
      : scenario === "trial"
        ? "trialing"
        : scenario;

  /* Usage ----------------------------------------------------------- */
  const entities: Partial<Record<LimitKey, UsageEntity[]>> = trial
    ? { clients: clientEntities.slice(0, 1), teamMembers: memberEntities.slice(0, 3), channels: channelEntities.slice(0, 4) }
    : { clients: clientEntities, teamMembers: memberEntities, channels: channelEntities };

  const creditsUsed = trial ? 1240 : 6420;
  const usage: UsageMetric[] = [
    { key: "clients", used: entities.clients!.length, resets: false },
    { key: "teamMembers", used: entities.teamMembers!.length, resets: false },
    { key: "channels", used: entities.channels!.length, resets: false },
    { key: "aiCredits", used: creditsUsed, resets: true },
    { key: "automations", used: trial ? 4 : 31, resets: false },
    { key: "automationRuns", used: trial ? 860 : 14280, resets: true },
    { key: "scheduledPosts", used: trial ? 96 : 1126, resets: true },
    { key: "reports", used: trial ? 6 : 64, resets: true },
    { key: "storageGb", used: trial ? 3.2 : 38.4, resets: false },
  ];

  /* Profile & contacts --------------------------------------------- */
  const profile: BillingProfile = {
    legalName: "Namo Gange Trust",
    billingEmail: "accounts@namogange.org",
    billingPhone: "+91 98765 43210",
    addressLine1: "14, Ganga Vihar, Jwalapur Road",
    addressLine2: "Near Har Ki Pauri",
    city: "Haridwar",
    state: "Uttarakhand",
    country: "India",
    postalCode: "249401",
    gstin: trial ? "" : "05AABTN1234F1Z5",
    pan: trial ? "" : "AABTN1234F",
    taxId: "",
  };

  const contacts: BillingContact[] = trial
    ? []
    : [
      { id: "ct-1", kind: "primary", name: "Manish Sirohi", email: "manishsirohi@encodency.com", phone: "+91 98100 22334", role: "Organization Admin" },
      { id: "ct-2", kind: "finance", name: "Anjali Mehta", email: "anjali.mehta@namogange.org", phone: "+91 98111 45678", role: "Finance Manager" },
    ];

  return {
    organizationName: "Namo Gange Trust",
    currentUser: { name: "Manish Sirohi", email: "manishsirohi@encodency.com", role: "org_admin" },
    plans: mockPlans,
    subscription: {
      id: "sub_namo_gange",
      planId: "growth",
      cycle: "monthly",
      status,
      startedAt: trial ? subDays(now, 2).toISOString() : subMonths(start, 11).toISOString(),
      currentPeriodStart: trial ? startOfDay(subDays(now, 2)).toISOString() : start.toISOString(),
      currentPeriodEnd: trial ? startOfDay(addDays(now, 12)).toISOString() : end.toISOString(),
      trialEndsAt: trial ? startOfDay(addDays(now, 12)).toISOString() : null,
      graceEndsAt: scenario === "grace_period" ? addDays(start, GRACE_DAYS).toISOString() : null,
      cancelAt: scenario === "scheduled_cancellation" ? end.toISOString() : null,
      cancelledAt: scenario === "cancelled" ? start.toISOString() : null,
      pendingChange: null,
      history,
    },
    usage,
    entities,
    paymentMethods,
    invoices,
    payments,
    profile,
    contacts,
    credits: {
      included: growth.limits.aiCredits!,
      used: creditsUsed,
      purchased: 0,
      purchasedExpireAt: null,
      resetsAt: (trial ? startOfDay(addDays(now, 12)) : end).toISOString(),
    },
    creditPacks: mockCreditPacks,
    addOnCatalog: mockAddOnCatalog,
    addOns: [],
    salesRequest: null,
    taxRate: TAX_RATE,
    currency: "INR",
  };
}
