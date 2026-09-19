/**
 * Deterministic demo dataset for the tenant workspace.
 *
 * It is *derived* from the app-wide mock catalogue (companies, users, clients,
 * integrations, plans, subscriptions, transactions, audit log, tickets and the
 * internal team) so a company's user count here is the same number the global
 * Users page shows. On top of that, a small set of hand-authored scenarios gives
 * the portfolio a believable shape: a few failed payments, trials about to end,
 * companies near a limit, one with no active admin, two suspended.
 *
 * Nothing is random at render time - every value comes from a seeded generator.
 */
import { AUDIT_LOG, SUPPORT_TICKETS } from "@/mocks/data/control";
import { COMPANY_SEEDS, type CompanySeed } from "@/mocks/data/catalog";
import { SUBSCRIPTIONS, TRANSACTIONS } from "@/mocks/data/commerce";
import { INTERNAL_TEAM } from "@/mocks/data/internal-team";
import { PLANS } from "@/mocks/data/plans";
import {
  COMPANIES,
  getCompanyClients,
  getCompanyIntegrations,
  getCompanyUsers,
} from "@/mocks/data/tenants";
import { createRng, daysAgo, daysAhead, minutesAgo, type Rng } from "@/mocks/lib/random";
import type { Plan } from "@/types/domain/plan";
import { INTEGRATION_PROVIDER } from "@/types/domain/integration";
import { activeOverrideFor, cyclePrice, planFor, type DerivationContext } from "../selectors";
import type {
  ActivityModule,
  CompanyActivity,
  CompanyBundle,
  CompanyClient,
  CompanyInternalNote,
  CompanyIntegration,
  CompanyInvoice,
  CompanyPayment,
  CompanySecurity,
  CompanySecurityEvent,
  CompanySize,
  CompanySubscription,
  CompanySubscriptionStatus,
  CompanyTicket,
  CompanyUsageOverride,
  CompanyUser,
  IntegrationConnectionState,
  PaymentMethodSummary,
  StaffRef,
  UsageBaseline,
  UsageResource,
} from "../types";
import { USAGE_RESOURCES } from "../config";

const DAY_MS = 86_400_000;
const MOCK_ANCHOR = Date.parse(daysAgo(0));

function hash(value: string): number {
  let result = 5381;
  for (let index = 0; index < value.length; index += 1) {
    result = ((result << 5) + result + value.charCodeAt(index)) | 0;
  }
  return Math.abs(result);
}

function plusDays(iso: string, days: number): string {
  return new Date(Date.parse(iso) + days * DAY_MS).toISOString();
}

/* ------------------------------------------------------------------ */
/* Staff                                                               */
/* ------------------------------------------------------------------ */

export const STAFF: readonly StaffRef[] = INTERNAL_TEAM.map((member) => ({
  id: member.id,
  name: member.name,
  email: member.email,
  role: member.role,
  department: member.department,
  status: member.status,
}));

const ACTIVE_STAFF = STAFF.filter((member) => member.status === "active");
const ACCOUNT_MANAGERS = ACTIVE_STAFF.filter((member) => member.role === "operations" || member.role === "finance");
const SUPPORT_OWNERS = ACTIVE_STAFF.filter((member) => member.role === "support" || member.role === "super_admin");
const TECH_OWNERS = ACTIVE_STAFF.filter((member) => member.role === "technical_admin" || member.role === "super_admin");

export const PLAN_CATALOGUE: readonly Plan[] = PLANS;

/** Context used while building, so overrides resolve exactly as they will at runtime. */
const BUILD_CTX: DerivationContext = { now: MOCK_ANCHOR, plans: PLANS, staff: STAFF };

/* ------------------------------------------------------------------ */
/* Scenarios (hand-authored so the portfolio reads like a real one)    */
/* ------------------------------------------------------------------ */

const TRIAL_ENDS_IN_DAYS: Record<string, number> = {
  "sattva-wellness": 2,
  "solace-home-decor": 3,
  "peak-and-pine": 9,
};
const TRIALS_WITH_CARD = new Set(["solace-home-decor"]);
const PAYMENT_FAILED = new Set(["namo-gange-trust"]);
const NO_PAYMENT_METHOD_PAYING = new Set(["ironwood-legal"]);
const REFUND_LATEST = new Set(["nordwind-studios"]);

/** Companies whose integrations have a real problem; everyone else is healthy. */
const INTEGRATION_ISSUES: Record<string, IntegrationConnectionState[]> = {
  "meridian-digital": ["needs_reconnect", "needs_reconnect"],
  "vantage-realty": ["sync_failure"],
  "everbright-solar": ["permission_issue"],
  "kaveri-institute": ["rate_limited"],
  "trident-manufacturing": ["needs_reconnect"],
  "lumen-health": ["needs_reconnect", "permission_issue", "sync_failure"],
  "bharat-organic-foods": ["needs_reconnect"],
};

const JOB_FAILURE_COMPANIES: Record<string, number> = {
  "vantage-realty": 11,
  "helix-sports-academy": 3,
  "pixelforge-interactive": 6,
  "amberline-cosmetics": 2,
};

/** Utilisation targets: resource -> percent of the effective limit. */
const USAGE_SCENARIOS: Record<string, Partial<Record<UsageResource, number>>> = {
  "meridian-digital": { aiCredits: 93 },
  "vantage-realty": { reports: 97 },
  "helix-sports-academy": { automationRuns: 92 },
  "kaveri-institute": { aiCredits: 96 },
  "bharat-organic-foods": { apiRequests: 104 },
  "sierra-nutrition": { aiCredits: 118 },
  "lumen-health": { storage: 91 },
};

const OVERRIDE_SCENARIOS: Record<
  string,
  Array<{ resource: UsageResource; limitFactor: number; reason: string; startedDaysAgo: number; expiresInDays: number; approvedBy: string }>
> = {
  "kaveri-institute": [
    { resource: "aiCredits", limitFactor: 1.35, reason: "Admissions campaign season - agreed with the account manager.", startedDaysAgo: 9, expiresInDays: 21, approvedBy: "Renu Balakrishnan" },
  ],
  "pixelforge-interactive": [
    { resource: "users", limitFactor: 1.4, reason: "Contractor onboarding for the autumn release.", startedDaysAgo: 5, expiresInDays: 40, approvedBy: "Aditya Raghunath" },
  ],
};

const SUSPENSIONS: Record<string, { reason: "billing" | "policy_violation"; note: string; daysAgo: number; by: string }> = {
  "auric-jewels": {
    reason: "billing",
    note: "Suspended following a chargeback dispute on the last two invoices.",
    daysAgo: 16,
    by: "Ishita Nair",
  },
  "sierra-nutrition": {
    reason: "policy_violation",
    note: "Automated posting volume breached the acceptable-use policy.",
    daysAgo: 33,
    by: "Elena Marsh",
  },
};

const NOTE_SEEDS: Record<string, Array<{ author: "stf_001" | "stf_002"; content: string; tags: CompanyInternalNote["tags"]; pinned: boolean; minutesAgo: number }>> = {
  "namo-gange-trust": [
    { author: "stf_002", content: "Trustee confirmed the corporate card was replaced. Retry the renewal once they update it in billing settings.", tags: ["billing"], pinned: true, minutesAgo: 1_900 },
    { author: "stf_001", content: "Runs Ganga Aarti Live streams every evening - avoid maintenance windows between 17:00 and 20:00 IST.", tags: ["technical"], pinned: false, minutesAgo: 9_200 },
  ],
  "meridian-digital": [
    { author: "stf_001", content: "Agency partner with four client brands. Interested in white-label; loop in sales before the renewal call.", tags: ["sales"], pinned: true, minutesAgo: 5_800 },
  ],
  "lumen-health": [
    { author: "stf_002", content: "Enterprise contract includes a named success manager and 99.9% SLA. Escalate any P1 to Platform Engineering directly.", tags: ["support"], pinned: true, minutesAgo: 20_000 },
  ],
  "auric-jewels": [
    { author: "stf_002", content: "Do not reactivate until finance confirms the chargeback is resolved.", tags: ["billing"], pinned: true, minutesAgo: 22_000 },
  ],
};

const CARD_BRANDS: PaymentMethodSummary[] = [
  { brand: "Visa", last4: "4242", expiresAt: null },
  { brand: "Mastercard", last4: "8829", expiresAt: null },
  { brand: "Amex", last4: "1007", expiresAt: null },
  { brand: "Visa", last4: "0119", expiresAt: null },
];

const COUNTRY_DEFAULTS: Record<string, { currency: string; region: string; suffix: string }> = {
  India: { currency: "INR", region: "India (Mumbai)", suffix: "Pvt Ltd" },
  "United States": { currency: "USD", region: "United States (Virginia)", suffix: "Inc" },
  "United Kingdom": { currency: "GBP", region: "Europe (Frankfurt)", suffix: "Ltd" },
  "United Arab Emirates": { currency: "AED", region: "Asia Pacific (Singapore)", suffix: "LLC" },
  Singapore: { currency: "SGD", region: "Asia Pacific (Singapore)", suffix: "Pte Ltd" },
  Australia: { currency: "AUD", region: "Asia Pacific (Singapore)", suffix: "Pty Ltd" },
  Canada: { currency: "USD", region: "United States (Virginia)", suffix: "Inc" },
};

/* ------------------------------------------------------------------ */
/* Builders                                                            */
/* ------------------------------------------------------------------ */

function sizeForTier(tier: string): CompanySize {
  return tier === "starter" ? "1-10" : tier === "growth" ? "11-50" : tier === "agency" ? "51-200" : "201-1000";
}

function buildUsers(companyId: string, slug: string, clientIds: string[], rng: Rng): CompanyUser[] {
  const source = getCompanyUsers(companyId);

  const users = source.map<CompanyUser>((user, index) => {
    const seesEverything = user.role === "owner" || user.role === "admin" || user.role === "project_admin";
    const access = seesEverything
      ? clientIds
      : clientIds.filter((_, position) => (position + index) % Math.max(1, clientIds.length) < Math.max(1, user.projectCount));

    return {
      id: user.id,
      companyId,
      platformUserId: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      mfaEnabled: user.mfaEnabled,
      twoFactorRequired: false,
      clientAccessIds: access,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      invitationExpired: false,
    };
  });

  // Scenario: an organisation with nobody able to administer it.
  if (slug === "craftline-interiors") {
    for (const user of users) {
      if (user.role === "owner") user.status = "suspended";
      else if (user.role === "admin" || user.role === "project_admin") user.status = "inactive";
    }
  }

  // Scenarios: owners who have been invited but have not accepted.
  if (slug === "sattva-wellness" || slug === "peak-and-pine") {
    const owner = users.find((user) => user.role === "owner");
    if (owner) {
      owner.status = "invited";
      owner.lastLoginAt = null;
      owner.mfaEnabled = false;
      owner.invitationExpired = slug === "peak-and-pine";
    }
  }

  // Pending users have no sign-in history.
  for (const user of users) {
    if (user.status === "invited") user.lastLoginAt = null;
  }

  void rng;
  return users;
}

function buildClients(companyId: string, slug: string): CompanyClient[] {
  const failing = JOB_FAILURE_COMPANIES[slug] ?? 0;
  let remaining = failing;

  return getCompanyClients(companyId).map<CompanyClient>((client, index, list) => {
    // Failed posts exist only for the scenario companies; spread the total over their clients.
    const share = failing === 0 ? 0 : index === list.length - 1 ? remaining : Math.ceil(failing / list.length);
    remaining -= share;

    return {
      id: client.id,
      companyId,
      name: client.name,
      websiteUrl: client.websiteUrl,
      status: client.status,
      connectedChannels: client.connectedChannels,
      brokenChannels: client.disconnectedChannels,
      scheduledPosts: client.scheduledPosts,
      failedPosts: share,
      leadsLast30Days: client.leadsLast30Days,
      createdAt: client.createdAt,
      lastActivityAt: client.lastActivityAt,
    };
  });
}

function buildIntegrations(
  companyId: string,
  slug: string,
  clients: CompanyClient[],
  accountActive: boolean,
  accountRetired: boolean,
): CompanyIntegration[] {
  const issues = [...(INTEGRATION_ISSUES[slug] ?? [])];
  const source = getCompanyIntegrations(companyId);
  const clientByName = new Map(clients.map((client) => [client.name, client]));

  // Place the scenario problems on the last connections so the first ones stay healthy.
  const failingFrom = source.length - issues.length;

  return source.map<CompanyIntegration>((item, index) => {
    const state: IntegrationConnectionState = accountRetired
      ? "needs_reconnect"
      : accountActive && index >= failingFrom && issues.length > 0
        ? (issues[index - failingFrom] ?? "healthy")
        : "healthy";

    const client = clientByName.get(item.projectName) ?? null;
    const label = INTEGRATION_PROVIDER[item.provider].label;
    const rng = createRng(hash(item.id));

    const lastError =
      state === "needs_reconnect"
        ? { code: "TOKEN_EXPIRED", message: `${label} rejected the access token. The account owner must reconnect.`, occurredAt: minutesAgo(rng.int(90, 4_000)) }
        : state === "permission_issue"
          ? { code: "SCOPE_REVOKED", message: `${label} reports a required permission was revoked.`, occurredAt: minutesAgo(rng.int(90, 4_000)) }
          : state === "sync_failure"
            ? { code: "SYNC_TIMEOUT", message: `Last ${label} sync timed out after 3 retries.`, occurredAt: minutesAgo(rng.int(30, 900)) }
            : state === "rate_limited"
              ? { code: "RATE_LIMITED", message: `${label} is throttling requests for this account.`, occurredAt: minutesAgo(rng.int(10, 200)) }
              : null;

    return {
      id: item.id,
      companyId,
      provider: item.provider,
      accountName: item.accountName,
      clientId: client?.id ?? null,
      clientName: client?.name ?? item.projectName,
      state,
      permissionHealth: state === "permission_issue" ? "partial" : state === "needs_reconnect" ? "missing" : "complete",
      scopes: item.scopes,
      lastSyncAt: state === "needs_reconnect" ? (lastError?.occurredAt ?? item.lastSyncAt) : minutesAgo(rng.int(3, 700)),
      tokenExpiresAt: state === "needs_reconnect" ? null : item.tokenExpiresAt,
      dependentModules: dependentModules(item.provider),
      lastError,
    };
  });
}

function dependentModules(provider: CompanyIntegration["provider"]): string[] {
  switch (provider) {
    case "search_console":
    case "website_analytics":
      return ["SEO Audit", "Analytics", "Reports"];
    case "google_business":
      return ["Local Presence", "Reviews", "Reports"];
    case "whatsapp":
      return ["Leads", "Automations"];
    default:
      return ["Publisher", "Analytics", "Reports"];
  }
}

function buildSubscription(
  index: number,
  slug: string,
  companyId: string,
  createdAt: string,
  accountStatus: CompanyBundle["company"]["accountStatus"],
): CompanySubscription {
  const base = SUBSCRIPTIONS[index];
  if (!base) throw new Error(`Missing subscription for company index ${index}`);
  const rng = createRng(hash(`${slug}:sub`));

  let status: CompanySubscriptionStatus =
    base.status === "trial"
      ? "trialing"
      : base.status === "past_due"
        ? "past_due"
        : base.status === "cancelled"
          ? "scheduled_cancellation"
          : base.status === "expired"
            ? accountStatus === "archived"
              ? "cancelled"
              : "expired"
            : "active";

  if (PAYMENT_FAILED.has(slug)) status = "past_due";
  // Sierra was suspended for policy, not for payment: the subscription itself is healthy.
  if (slug === "sierra-nutrition") status = "active";
  if (NO_PAYMENT_METHOD_PAYING.has(slug)) status = "active";

  const cycleDays = base.billingCycle === "annual" ? 365 : 30;
  const trialDays = TRIAL_ENDS_IN_DAYS[slug];
  const trialEndsAt = status === "trialing" ? daysAhead(trialDays ?? 10) : null;

  const renewsAt =
    status === "trialing" && trialEndsAt
      ? trialEndsAt
      : status === "expired" || status === "cancelled"
        ? base.renewsAt < daysAhead(0)
          ? base.renewsAt
          : daysAgo(rng.int(12, 80))
        : base.renewsAt;

  const hasCard =
    status === "trialing" ? TRIALS_WITH_CARD.has(slug) : !NO_PAYMENT_METHOD_PAYING.has(slug);
  const card = CARD_BRANDS[hash(slug) % CARD_BRANDS.length] ?? CARD_BRANDS[0]!;

  return {
    id: `sub_${slug}`,
    companyId,
    planTier: base.planTier,
    billingCycle: base.billingCycle,
    status,
    startedAt: createdAt,
    currentPeriodStart: status === "trialing" ? createdAt : plusDays(renewsAt, -cycleDays),
    renewsAt,
    trialEndsAt,
    scheduledCancellationAt: status === "scheduled_cancellation" ? renewsAt : null,
    cancelledAt: status === "scheduled_cancellation" ? (base.cancelledAt ?? daysAgo(6)) : null,
    scheduledChange: null,
    paymentMethod: hasCard ? { ...card, expiresAt: daysAhead(rng.int(120, 700)) } : null,
  };
}

function buildBilling(
  companyId: string,
  sub: CompanySubscription,
  slug: string,
  plan: Plan,
): { invoices: CompanyInvoice[]; payments: CompanyPayment[] } {
  if (sub.status === "trialing") return { invoices: [], payments: [] };

  const transactions = TRANSACTIONS.filter((item) => item.company.id === companyId);
  const method = sub.paymentMethod ? `${sub.paymentMethod.brand} •••• ${sub.paymentMethod.last4}` : "Wire transfer";
  const invoices: CompanyInvoice[] = [];
  const payments: CompanyPayment[] = [];

  transactions.forEach((txn, position) => {
    const isLatest = position === 0;
    let status: CompanyPayment["status"] = txn.status === "pending" ? "paid" : txn.status;

    // Only the most recent attempt can still be failing - earlier ones were retried.
    if (!isLatest && status === "failed") status = "paid";
    if (isLatest) {
      if (sub.status === "past_due" || PAYMENT_FAILED.has(slug)) status = "failed";
      else if (status === "failed" || status === "refunded") status = "paid";
    }

    // A refund is history, except for the one company whose latest event is a refund.
    const isRefund = isLatest ? REFUND_LATEST.has(slug) : txn.type === "refund" || status === "refunded";
    if (isRefund) status = "refunded";
    else if (status === "refunded") status = "paid";

    // A failed renewal is the subscription charge itself, at the catalogue price.
    const failedRenewal = isLatest && status === "failed";
    const amountMinor = isRefund
      ? -Math.abs(txn.amountMinor)
      : failedRenewal
        ? cyclePrice(plan, sub.billingCycle)
        : Math.abs(txn.amountMinor);
    const number = `INV-2026-${txn.id.replace("txn_", "")}`;
    const invoiceId = `inv_${companyId}_${position}`;
    const paymentId = `pay_${companyId}_${position}`;
    const issuedAt = txn.createdAt;
    const periodDays = sub.billingCycle === "annual" ? 365 : 30;
    const invoiceStatus: CompanyInvoice["status"] = isRefund ? "void" : status === "failed" ? "overdue" : "paid";

    invoices.push({
      id: invoiceId,
      companyId,
      number,
      periodStart: issuedAt,
      periodEnd: plusDays(issuedAt, periodDays),
      issuedAt,
      dueAt: plusDays(issuedAt, 14),
      amountMinor: Math.abs(amountMinor),
      currency: txn.currency,
      status: invoiceStatus,
      paymentStatus: status,
      description:
        !failedRenewal && txn.type === "overage"
          ? "Usage overage"
          : !failedRenewal && txn.type === "addon"
            ? "Add-on"
            : `${plan.name} plan - ${sub.billingCycle} subscription`,
      paymentId,
    });

    payments.push({
      id: paymentId,
      companyId,
      reference: txn.reference,
      invoiceId,
      invoiceNumber: number,
      amountMinor,
      currency: txn.currency,
      method,
      status,
      failureReason: status === "failed" ? (txn.failureReason ?? "Card declined by issuing bank") : null,
      createdAt: issuedAt,
    });
  });

  return { invoices, payments };
}

function buildBaseline(
  slug: string,
  plan: Plan,
  overrides: CompanyUsageOverride[],
  anchorPercent: number,
  retired: boolean,
): UsageBaseline {
  const rng = createRng(hash(`${slug}:usage`));
  const scenario = USAGE_SCENARIOS[slug] ?? {};
  const baseline: UsageBaseline = {};

  const pressure = retired ? 0 : Math.min(72, anchorPercent * 0.65);

  for (const def of USAGE_RESOURCES) {
    // Counts come from the records themselves; scheduled posts from the clients.
    if (!def.metric || def.key === "users" || def.key === "clients" || def.key === "connectedAccounts") continue;

    const baseLimit = plan.limits[def.metric];
    const override = activeOverrideFor(overrides, def.key, BUILD_CTX.now);
    const limit = override ? override.overrideLimit : baseLimit;

    const percent = scenario[def.key] ?? pressure * rng.float(0.3, 1);
    const used =
      limit === null
        ? def.key === "automationRuns"
          ? rng.int(2_000, 60_000)
          : rng.int(20, 400)
        : def.key === "storage"
          ? Number(((limit * percent) / 100).toFixed(1))
          : Math.round((limit * percent) / 100);

    baseline[def.key] = {
      used,
      previousUsed: def.kind === "level" ? Math.max(0, Math.round(used * rng.float(0.9, 1.02))) : Math.round(used * rng.float(0.55, 1.1)),
      updatedAt: minutesAgo(rng.int(4, 300)),
    };
  }

  return baseline;
}

const ACTIVITY_ACTIONS = new Set([
  "user.login_failed",
  "user.invited",
  "user.role_changed",
  "integration.token_refreshed",
  "integration.connected",
  "report.exported",
]);

function moduleForAction(action: string): ActivityModule {
  if (action.startsWith("integration.")) return "integrations";
  if (action.startsWith("user.login")) return "security";
  if (action.startsWith("user.")) return "users";
  return "company";
}

function humanise(action: string): string {
  const [, verb = action] = action.split(".");
  return verb.replace(/_/g, " ");
}

function buildActivity(bundle: Omit<CompanyBundle, "activity" | "security">, ownerName: string): CompanyActivity[] {
  const { company, subscription, clients, payments, overrides } = bundle;
  const entries: CompanyActivity[] = [];
  let sequence = 0;
  const staffActor = (id: string, name: string) => ({ id, name, type: "staff" as const });
  const system = { id: "system", name: "Platform Scheduler", type: "system" as const };

  const push = (partial: Omit<CompanyActivity, "id" | "companyId" | "result" | "correlationId" | "previousValue" | "newValue" | "reason"> &
    Partial<Pick<CompanyActivity, "result" | "correlationId" | "previousValue" | "newValue" | "reason">>) => {
    sequence += 1;
    entries.push({
      id: `act_${company.id}_${String(sequence).padStart(3, "0")}`,
      companyId: company.id,
      result: "success",
      correlationId: `req_${hash(`${company.id}:${sequence}`) % 900000 + 100000}`,
      previousValue: null,
      newValue: null,
      reason: null,
      ...partial,
    });
  };

  push({
    at: company.createdAt,
    actor: staffActor("stf_010", "Ishita Nair"),
    action: "company.created",
    summary: `Company ${company.name} was created`,
    module: "company",
    entity: { type: "company", id: company.id, label: company.name },
    severity: "info",
  });
  push({
    at: plusDays(company.createdAt, 0.001),
    actor: staffActor("stf_010", "Ishita Nair"),
    action: "owner.invited",
    summary: `Owner invitation sent to ${ownerName}`,
    module: "users",
    entity: { type: "user", id: company.ownerUserId ?? "owner", label: ownerName },
    severity: "info",
  });
  push({
    at: plusDays(company.createdAt, 0.002),
    actor: system,
    action: subscription.status === "trialing" ? "subscription.trial_started" : "subscription.started",
    summary: `${planFor(BUILD_CTX, subscription.planTier).name} ${subscription.status === "trialing" ? "trial started" : "subscription started"}`,
    module: "subscription",
    entity: { type: "subscription", id: subscription.id, label: planFor(BUILD_CTX, subscription.planTier).name },
    severity: "info",
    newValue: `${planFor(BUILD_CTX, subscription.planTier).name} (${subscription.billingCycle})`,
  });

  for (const client of clients) {
    push({
      at: client.createdAt,
      actor: { id: company.ownerUserId ?? "owner", name: ownerName, type: "customer" },
      action: "client.created",
      summary: `Client ${client.name} was added`,
      module: "clients",
      entity: { type: "client", id: client.id, label: client.name },
      severity: "info",
    });
  }

  for (const payment of payments.slice(0, 4)) {
    push({
      at: payment.createdAt,
      actor: system,
      action: payment.status === "failed" ? "payment.failed" : payment.status === "refunded" ? "payment.refunded" : "payment.received",
      summary:
        payment.status === "failed"
          ? `Payment ${payment.reference} failed: ${payment.failureReason ?? "declined"}`
          : payment.status === "refunded"
            ? `Refund ${payment.reference} was recorded`
            : `Payment ${payment.reference} received`,
      module: "billing",
      entity: { type: "payment", id: payment.id, label: payment.reference },
      severity: payment.status === "failed" ? "critical" : "info",
      result: payment.status === "failed" ? "failure" : "success",
    });
  }

  for (const override of overrides) {
    push({
      at: override.createdAt,
      actor: staffActor("stf_002", override.approvedBy),
      action: "usage.override_applied",
      summary: `Temporary ${override.resource} limit override applied`,
      module: "usage",
      entity: { type: "usage_override", id: override.id, label: override.resource },
      severity: "info",
      previousValue: override.baseLimit === null ? "Unlimited" : String(override.baseLimit),
      newValue: String(override.overrideLimit),
      reason: override.reason,
    });
  }

  if (company.suspension) {
    push({
      at: company.suspension.suspendedAt,
      actor: staffActor("stf_010", company.suspension.suspendedBy),
      action: "company.suspended",
      summary: `Company suspended (${company.suspension.reason.replace("_", " ")})`,
      module: "company",
      entity: { type: "company", id: company.id, label: company.name },
      severity: "warning",
      previousValue: "Active",
      newValue: "Suspended",
      reason: company.suspension.note,
    });
  }

  for (const integration of bundle.integrations.filter((item) => item.state === "needs_reconnect").slice(0, 3)) {
    push({
      at: integration.lastError?.occurredAt ?? integration.lastSyncAt,
      actor: system,
      action: "integration.disconnected",
      summary: `${INTEGRATION_PROVIDER[integration.provider].label} connection needs reconnection`,
      module: "integrations",
      entity: { type: "integration", id: integration.id, label: integration.accountName },
      severity: "warning",
      result: "failure",
      newValue: "Needs reconnect",
      previousValue: "Healthy",
    });
  }

  // A sample of real-looking customer activity from the shared audit log.
  const seenActions = new Set<string>();
  for (const audit of AUDIT_LOG) {
    if (audit.company?.id !== company.id || !ACTIVITY_ACTIONS.has(audit.action)) continue;
    if (seenActions.has(audit.action) && seenActions.size < 3) continue;
    seenActions.add(audit.action);

    push({
      at: audit.createdAt,
      actor:
        audit.actor.type === "system"
          ? system
          : { id: audit.actor.id, name: audit.actor.name, type: audit.actor.type === "internal" ? "staff" : "customer" },
      action: audit.action,
      summary: `${audit.actor.name}: ${humanise(audit.action)}`,
      module: moduleForAction(audit.action),
      entity: { type: audit.resource.type, id: audit.resource.id, label: audit.resource.label },
      severity: audit.action === "user.login_failed" ? "warning" : "info",
      result: audit.outcome === "success" ? "success" : audit.outcome === "denied" ? "denied" : "failure",
      correlationId: typeof audit.metadata.requestId === "string" ? audit.metadata.requestId : null,
    });
  }

  return entries.sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
}

function buildSecurity(
  companyId: string,
  domain: string | null,
  tier: string,
  users: CompanyUser[],
  activity: CompanyActivity[],
  accountActive: boolean,
  slug: string,
): CompanySecurity {
  const rng = createRng(hash(`${slug}:security`));
  const active = users.filter((user) => user.status === "active").length;
  const enterprise = tier === "enterprise";

  const events: CompanySecurityEvent[] = activity
    .filter((entry) => entry.module === "security")
    .slice(0, 6)
    .map((entry, index) => ({
      id: `sec_${companyId}_${index + 1}`,
      companyId,
      at: entry.at,
      type: "failed_logins" as const,
      severity: "warning" as const,
      summary: "Failed sign-in attempt recorded",
      actorLabel: entry.actor.name,
    }));

  return {
    companyId,
    policies: {
      require2fa: enterprise,
      passwordPolicy: enterprise ? "strict" : "standard",
      sessionTimeoutMinutes: enterprise ? 240 : 720,
      ssoEnabled: enterprise,
      ipAllowlistEnabled: false,
    },
    allowedEmailDomains: domain ? [domain] : [],
    activeSessions: accountActive ? Math.max(0, Math.round(active * rng.float(0.6, 1.6))) : 0,
    accountLockouts: slug === "cobalt-fintech" ? 1 : 0,
    accessLock: null,
    passwordResetRequestedAt: null,
    sessionRevocationRequestedAt: null,
    events,
  };
}

function buildTickets(companyId: string): CompanyTicket[] {
  return SUPPORT_TICKETS.filter((ticket) => ticket.company.id === companyId).map((ticket) => ({
    id: ticket.id,
    companyId,
    reference: ticket.reference,
    subject: ticket.subject,
    priority: ticket.priority,
    status: ticket.status,
    slaMinutesRemaining: ticket.slaMinutesRemaining,
    createdAt: ticket.createdAt,
    updatedAt: ticket.updatedAt,
  }));
}

function pickStaff(pool: readonly StaffRef[], seed: number, allowNone: boolean): string | null {
  if (pool.length === 0) return null;
  if (allowNone && seed % 7 === 0) return null;
  return pool[seed % pool.length]?.id ?? null;
}

function deriveTags(slug: string, tier: string, seed: CompanySeed): string[] {
  const tags: string[] = [];
  if (tier === "enterprise") tags.push("Enterprise", "Priority Support");
  if (tier === "agency") tags.push("Strategic Account");
  if (slug in USAGE_SCENARIOS && slug !== "sierra-nutrition") tags.push("High Usage");
  if (seed.status === "past_due" || PAYMENT_FAILED.has(slug)) tags.push("Payment Risk");
  if (hash(slug) % 9 === 0 && !tags.includes("Beta Program")) tags.push("Beta Program");
  return tags;
}

/* ------------------------------------------------------------------ */
/* Assembly                                                            */
/* ------------------------------------------------------------------ */

export function buildDataset(): Map<string, CompanyBundle> {
  const bundles = new Map<string, CompanyBundle>();

  // Display ids follow signup order: the oldest tenant is CMP-0001.
  const order = [...COMPANIES]
    .sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt))
    .map((company) => company.id);

  COMPANIES.forEach((source, index) => {
    const seed = COMPANY_SEEDS[index];
    if (!seed) return;
    const slug = source.slug;
    const rng = createRng(hash(`${slug}:bundle`));
    const plan = PLANS.find((item) => item.tier === source.planTier);
    if (!plan) return;

    const accountStatus: CompanyBundle["company"]["accountStatus"] =
      seed.status === "suspended" ? "suspended" : seed.status === "churned" ? (slug === "marchetti-autoworks" ? "archived" : "deactivated") : "active";
    const retired = accountStatus === "deactivated" || accountStatus === "archived";

    const clients = buildClients(source.id, slug);
    const users = buildUsers(source.id, slug, clients.map((client) => client.id), rng);
    const integrations = buildIntegrations(source.id, slug, clients, accountStatus === "active", retired);
    const subscription = buildSubscription(index, slug, source.id, source.createdAt, accountStatus);
    const { invoices, payments } = buildBilling(source.id, subscription, slug, plan);

    const overrides: CompanyUsageOverride[] = (OVERRIDE_SCENARIOS[slug] ?? []).map((item, position) => {
      const def = USAGE_RESOURCES.find((resource) => resource.key === item.resource);
      const baseLimit = def?.metric ? plan.limits[def.metric] : null;
      return {
        id: `ovr_${slug}_${position + 1}`,
        companyId: source.id,
        resource: item.resource,
        baseLimit,
        overrideLimit: Math.round((baseLimit ?? 0) * item.limitFactor),
        reason: item.reason,
        startsAt: daysAgo(item.startedDaysAgo),
        expiresAt: daysAhead(item.expiresInDays),
        approvedBy: item.approvedBy,
        createdAt: daysAgo(item.startedDaysAgo),
      };
    });

    const suspensionSeed = SUSPENSIONS[slug];
    const owner = users.find((user) => user.role === "owner");

    const company: CompanyBundle["company"] = {
      id: source.id,
      displayId: `CMP-${String(order.indexOf(source.id) + 1).padStart(4, "0")}`,
      slug,
      name: source.name,
      domain: seed.websiteDomain,
      logoUrl: null,
      profile: {
        legalName: `${source.name.replace(/\s+(Group|Co|Labs)$/i, "")} ${COUNTRY_DEFAULTS[source.country]?.suffix ?? "Ltd"}`,
        website: source.website,
        industry: source.industry,
        country: source.country,
        companySize: sizeForTier(source.planTier),
        contactEmail: owner?.email ?? null,
        contactPhone: source.primaryContact.phone,
        timezone: source.timezone,
        currency: COUNTRY_DEFAULTS[source.country]?.currency ?? "EUR",
        language: "English",
        region: COUNTRY_DEFAULTS[source.country]?.region ?? "Europe (Frankfurt)",
      },
      accountStatus,
      suspension: suspensionSeed
        ? {
            reason: suspensionSeed.reason,
            note: suspensionSeed.note,
            suspendedAt: daysAgo(suspensionSeed.daysAgo),
            suspendedBy: suspensionSeed.by,
            previousStatus: "active",
          }
        : null,
      archivedAt: accountStatus === "archived" ? daysAgo(60) : null,
      ownerUserId: owner?.id ?? null,
      internalOwners: {
        accountManagerId: pickStaff(ACCOUNT_MANAGERS, hash(`${slug}:am`), source.planTier === "starter"),
        supportOwnerId: pickStaff(SUPPORT_OWNERS, hash(`${slug}:so`), source.planTier === "starter"),
        technicalOwnerId: pickStaff(TECH_OWNERS, hash(`${slug}:to`), source.planTier !== "enterprise"),
      },
      internalTags: deriveTags(slug, source.planTier, seed),
      createdAt: source.createdAt,
      lastActiveAt: source.lastActivityAt,
      isDemoCreated: false,
    };

    const partial: Omit<CompanyBundle, "activity" | "security"> = {
      company,
      subscription,
      overrides,
      usageBaseline: buildBaseline(slug, plan, overrides, source.usagePercent, retired),
      users,
      clients,
      integrations,
      invoices,
      payments,
      notes: (NOTE_SEEDS[slug] ?? []).map((note, position) => ({
        id: `note_${slug}_${position + 1}`,
        companyId: source.id,
        authorId: note.author,
        authorName: STAFF.find((member) => member.id === note.author)?.name ?? "Platform staff",
        content: note.content,
        tags: note.tags,
        pinned: note.pinned,
        createdAt: minutesAgo(note.minutesAgo),
        updatedAt: minutesAgo(note.minutesAgo),
      })),
      tickets: buildTickets(source.id),
      jobs: {
        failedLast24h: clients.reduce((total, client) => total + client.failedPosts, 0),
        lastFailureAt: clients.some((client) => client.failedPosts > 0) ? minutesAgo(rng.int(20, 600)) : null,
      },
    };

    const activity = buildActivity(partial, owner?.name ?? source.primaryContact.name);
    const security = buildSecurity(source.id, seed.websiteDomain, source.planTier, users, activity, accountStatus === "active", slug);

    bundles.set(source.id, { ...partial, activity, security });
  });

  return bundles;
}
