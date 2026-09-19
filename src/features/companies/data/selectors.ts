/**
 * Pure derivations over company records.
 *
 * Nothing here is stored. Health, usage level, MRR, billing status and
 * attention items are recomputed from the underlying records every time, so a
 * mutation (suspend, change plan, apply an override) is reflected on every
 * screen by construction - there is no second copy to forget to update.
 *
 * In a backend-connected build these are the calculations the tenant service
 * performs; the UI only ever consumes their output.
 */
import { APP } from "@/config/app";
import type { PaginationMeta } from "@/types/api";
import type { Plan, PlanKey } from "@/types/domain/plan";
import { activeOverrideAt, isInactiveStatus, overrideValueFor } from "@/features/plans-subscriptions/data/entitlements";
import {
  ATTENTION_KIND_META,
  DORMANT_AFTER_DAYS,
  JOB_FAILURE_CRITICAL,
  JOB_FAILURE_WARNING,
  TRIAL_ENDING_SOON_DAYS,
  USAGE_RESOURCES,
  USAGE_RESOURCE_BY_KEY,
  USAGE_THRESHOLDS,
} from "./config";
import { daysUntil, startOfMonth } from "./clock";
import type {
  AttentionKind,
  CompanyAttentionItem,
  CompanyBillingStatus,
  CompanyBillingSummary,
  CompanyBundle,
  CompanyHealth,
  CompanyIntegration,
  CompanyListQuery,
  CompanyListResult,
  CompanyOnboardingStatus,
  CompanyOwner,
  CompanySubscription,
  CompanySummary,
  CompanySupportSnapshot,
  CompanyUsageOverride,
  CompanyUsageRecord,
  CompanyUsageSummary,
  HealthFactor,
  PortfolioSummary,
  SecurityWarning,
  StaffRef,
  UsageLevel,
  UsageResource,
  UsageResourceStatus,
} from "./types";

const DAY_MS = 86_400_000;

export interface DerivationContext {
  now: number;
  plans: readonly Plan[];
  /** Resolves a plan as it read at a specific version, for subscriptions pinned to an older one. */
  planVersions?: (key: string, version: number) => Plan | undefined;
  staff: readonly StaffRef[];
}

export function planFor(ctx: DerivationContext, tier: PlanKey): Plan {
  const plan = ctx.plans.find((item) => item.tier === tier);
  if (!plan) throw new Error(`Unknown plan tier: ${tier}`);
  return plan;
}

/** The plan a subscription is entitled to: its pinned version, else the current plan. */
export function planForSubscription(ctx: DerivationContext, subscription: Pick<CompanySubscription, "planTier" | "planVersion">): Plan {
  return ctx.planVersions?.(subscription.planTier, subscription.planVersion ?? 1) ?? planFor(ctx, subscription.planTier);
}

/* ------------------------------------------------------------------ */
/* Owner                                                               */
/* ------------------------------------------------------------------ */

export function deriveOwner(bundle: CompanyBundle): CompanyOwner {
  const { company } = bundle;
  const user = bundle.users.find((item) => item.id === company.ownerUserId);

  if (user) {
    const state =
      user.status === "active"
        ? "active"
        : user.status === "invited"
          ? user.invitationExpired
            ? "invitation_expired"
            : "invited"
          : user.status === "suspended"
            ? "suspended"
            : "inactive";
    return { userId: user.id, name: user.name, email: user.email, phone: company.profile.contactPhone, state };
  }

  return { userId: null, name: "No owner assigned", email: "", phone: null, state: "none" };
}

/* ------------------------------------------------------------------ */
/* Subscription, MRR, billing                                          */
/* ------------------------------------------------------------------ */

export function isPayingStatus(status: CompanySubscription["status"]): boolean {
  return status === "active" || status === "past_due" || status === "scheduled_cancellation";
}

/** Price of one billing cycle from the plan catalogue - never hard-coded. */
export function cyclePrice(plan: Plan, cycle: CompanySubscription["billingCycle"]): number {
  return cycle === "annual" ? plan.annualPriceMinor : plan.monthlyPriceMinor;
}

export function monthlyEquivalent(plan: Plan, cycle: CompanySubscription["billingCycle"]): number {
  return cycle === "annual" ? Math.round(plan.annualPriceMinor / 12) : plan.monthlyPriceMinor;
}

/** Recurring revenue is only counted while the account is active and the subscription is paying. */
export function computeMrr(ctx: DerivationContext, bundle: CompanyBundle): number {
  if (bundle.company.accountStatus !== "active") return 0;
  if (!isPayingStatus(bundle.subscription.status)) return 0;
  return monthlyEquivalent(planForSubscription(ctx, bundle.subscription), bundle.subscription.billingCycle);
}

export function computeBillingStatus(bundle: CompanyBundle): CompanyBillingStatus {
  const { subscription, payments, invoices } = bundle;

  if (subscription.status === "trialing") {
    return subscription.paymentMethod ? "payment_due" : "no_payment_method";
  }

  const latest = [...payments].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))[0];
  if (latest?.status === "failed") return "payment_failed";
  if (invoices.some((invoice) => invoice.status === "open" || invoice.status === "overdue")) return "payment_due";
  if (latest?.status === "refunded") return "refunded";
  if (!subscription.paymentMethod && isPayingStatus(subscription.status)) return "no_payment_method";
  return "paid";
}

export function computeBilling(ctx: DerivationContext, bundle: CompanyBundle): CompanyBillingSummary {
  const { subscription, invoices, payments } = bundle;
  const plan = planForSubscription(ctx, subscription);

  const outstandingMinor = invoices
    .filter((invoice) => invoice.status === "open" || invoice.status === "overdue")
    .reduce((total, invoice) => total + invoice.amountMinor, 0);

  const lastPayment =
    [...payments]
      .filter((payment) => payment.status === "paid")
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))[0] ?? null;

  let nextInvoice: CompanyBillingSummary["nextInvoice"] = null;
  if (subscription.status === "trialing" && subscription.trialEndsAt) {
    nextInvoice = {
      date: subscription.trialEndsAt,
      amountMinor: cyclePrice(plan, subscription.billingCycle),
      note: "First invoice at the end of the trial",
    };
  } else if (isPayingStatus(subscription.status) && subscription.status !== "scheduled_cancellation") {
    nextInvoice = {
      date: subscription.renewsAt,
      amountMinor: cyclePrice(plan, subscription.billingCycle),
      note: "Renewal invoice",
    };
  }

  return {
    companyId: bundle.company.id,
    status: computeBillingStatus(bundle),
    mrrMinor: computeMrr(ctx, bundle),
    currency: plan.currency,
    outstandingMinor,
    lastPayment,
    nextInvoice,
    billingCycle: subscription.billingCycle,
    paymentMethod: subscription.paymentMethod,
    invoiceCount: invoices.length,
    paymentCount: payments.length,
  };
}

export interface ProrationEstimate {
  daysRemaining: number;
  periodDays: number;
  creditMinor: number;
  chargeMinor: number;
  netMinor: number;
}

/**
 * An estimate for display only. Real proration is calculated by the billing
 * provider; this shows the operator the order of magnitude before they confirm.
 */
export function estimateProration(
  current: Plan,
  next: Plan,
  subscription: Pick<CompanySubscription, "billingCycle" | "currentPeriodStart" | "renewsAt">,
  nextCycle: CompanySubscription["billingCycle"],
  now: number,
): ProrationEstimate {
  const periodMs = Math.max(DAY_MS, Date.parse(subscription.renewsAt) - Date.parse(subscription.currentPeriodStart));
  const remainingMs = Math.min(periodMs, Math.max(0, Date.parse(subscription.renewsAt) - now));
  const fraction = remainingMs / periodMs;

  const creditMinor = Math.round(cyclePrice(current, subscription.billingCycle) * fraction);
  // A cycle change starts a fresh period, so the new price is charged in full.
  const chargeMinor = Math.round(
    cyclePrice(next, nextCycle) * (nextCycle === subscription.billingCycle ? fraction : 1),
  );

  return {
    daysRemaining: Math.ceil(remainingMs / DAY_MS),
    periodDays: Math.round(periodMs / DAY_MS),
    creditMinor,
    chargeMinor,
    netMinor: chargeMinor - creditMinor,
  };
}

/* ------------------------------------------------------------------ */
/* Usage                                                               */
/* ------------------------------------------------------------------ */

/**
 * Counts are read from the records themselves, so "Users: 14" on the list can
 * never disagree with the 14 rows on the Users tab. Other resources are
 * metered quantities held in the usage baseline.
 */
export function usedFor(bundle: CompanyBundle, resource: UsageResource): number {
  switch (resource) {
    case "users":
      return bundle.users.length;
    case "clients":
      return bundle.clients.length;
    case "connectedAccounts":
      return bundle.integrations.length;
    case "scheduledPosts":
      return bundle.clients.reduce((total, client) => total + client.scheduledPosts, 0);
    default:
      return bundle.usageBaseline[resource]?.used ?? 0;
  }
}

export function activeOverrideFor(
  overrides: readonly CompanyUsageOverride[],
  resource: UsageResource,
  now: number,
): CompanyUsageOverride | null {
  const active = overrides.filter(
    (item) => item.resource === resource && Date.parse(item.startsAt) <= now && Date.parse(item.expiresAt) > now,
  );
  return active.sort((a, b) => b.overrideLimit - a.overrideLimit)[0] ?? null;
}

export function resourceStatus(utilization: number | null): UsageResourceStatus {
  if (utilization === null) return "not_metered";
  if (utilization > USAGE_THRESHOLDS.exceeded) return "exceeded";
  if (utilization >= USAGE_THRESHOLDS.nearLimit) return "near_limit";
  if (utilization >= USAGE_THRESHOLDS.high) return "high";
  return "healthy";
}

function levelFromStatus(status: UsageResourceStatus): UsageLevel {
  return status === "healthy" ? "normal" : status;
}

export function computeUsage(ctx: DerivationContext, bundle: CompanyBundle): CompanyUsageSummary {
  const plan = planForSubscription(ctx, bundle.subscription);

  const records: CompanyUsageRecord[] = USAGE_RESOURCES.map((def) => {
    const used = usedFor(bundle, def.key);
    const includedLimit = def.metric ? plan.limits[def.metric] : null;
    const override = def.metric && !isInactiveStatus(bundle.subscription.status) ? activeOverrideAt(bundle.overrides, def.key, ctx.now, includedLimit) : null;
    const effectiveLimit = override ? overrideValueFor(override, includedLimit) : includedLimit;
    const utilization =
      effectiveLimit === null ? null : effectiveLimit === 0 ? 0 : Number(((used / effectiveLimit) * 100).toFixed(1));
    const baseline = bundle.usageBaseline[def.key];

    return {
      resource: def.key,
      used,
      previousUsed: baseline?.previousUsed ?? used,
      includedLimit,
      activeOverride: override,
      effectiveLimit,
      utilization,
      status: resourceStatus(utilization),
      alertable: utilization !== null && (!def.capped || utilization > USAGE_THRESHOLDS.exceeded),
      updatedAt: baseline?.updatedAt ?? bundle.company.lastActiveAt,
    };
  });

  const alertable = records.filter((record) => record.alertable);
  const highest = [...alertable].sort((a, b) => (b.utilization ?? 0) - (a.utilization ?? 0))[0] ?? null;

  const { subscription } = bundle;
  const periodStart =
    subscription.status === "trialing" ? subscription.startedAt : subscription.currentPeriodStart;
  const periodEnd =
    subscription.status === "trialing" && subscription.trialEndsAt ? subscription.trialEndsAt : subscription.renewsAt;
  const length = Math.max(DAY_MS, Date.parse(periodEnd) - Date.parse(periodStart));

  return {
    periodStart,
    periodEnd,
    previousPeriodStart: new Date(Date.parse(periodStart) - length).toISOString(),
    records,
    highest,
    nearLimit: records.filter((record) => record.status === "near_limit"),
    exceeded: records.filter((record) => record.status === "exceeded"),
    level: highest
      ? levelFromStatus(highest.status)
      : records.some((record) => record.utilization !== null)
        ? "normal"
        : "not_metered",
    overrides: [...bundle.overrides].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)),
  };
}

/* ------------------------------------------------------------------ */
/* Integrations, support                                               */
/* ------------------------------------------------------------------ */

export interface IntegrationCounts {
  total: number;
  healthy: number;
  needsReconnect: number;
  permissionIssues: number;
  syncFailures: number;
  rateLimited: number;
  attention: number;
}

export function countIntegrations(integrations: readonly CompanyIntegration[]): IntegrationCounts {
  const count = (state: CompanyIntegration["state"]) => integrations.filter((item) => item.state === state).length;
  const healthy = count("healthy");
  return {
    total: integrations.length,
    healthy,
    needsReconnect: count("needs_reconnect"),
    permissionIssues: count("permission_issue"),
    syncFailures: count("sync_failure"),
    rateLimited: count("rate_limited"),
    attention: integrations.length - healthy,
  };
}

export interface SyncAttempt {
  id: string;
  at: string;
  ok: boolean;
  detail: string;
}

/**
 * Recent sync attempts for one connection, derived from its current state so the
 * history always agrees with the status badge. A real backend returns the log.
 */
export function buildSyncHistory(integration: CompanyIntegration, now: number): SyncAttempt[] {
  const failing = integration.state !== "healthy";
  const anchor = Math.min(Date.parse(integration.lastSyncAt), now);
  const stepMs = 6 * 3_600_000;

  return Array.from({ length: 8 }, (_, index) => {
    const ok = !failing || index >= 3;
    return {
      id: `${integration.id}:sync:${index}`,
      at: new Date(anchor - index * stepMs).toISOString(),
      ok,
      detail: ok
        ? "Synced successfully"
        : (integration.lastError?.message ?? "Sync failed. The provider returned an error."),
    };
  });
}

const OPEN_TICKET = new Set(["open", "in_progress", "waiting"]);

export function computeSupport(bundle: CompanyBundle): CompanySupportSnapshot {
  const open = bundle.tickets.filter((ticket) => OPEN_TICKET.has(ticket.status));
  const latest = [...bundle.tickets].sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))[0] ?? null;
  return {
    openTickets: open.length,
    highPriorityTickets: open.filter((ticket) => ticket.priority === "urgent" || ticket.priority === "high").length,
    slaBreaches: open.filter((ticket) => ticket.slaMinutesRemaining !== null && ticket.slaMinutesRemaining < 0).length,
    latest,
  };
}

/* ------------------------------------------------------------------ */
/* Attention and health                                                */
/* ------------------------------------------------------------------ */

function hasActiveAdmin(bundle: CompanyBundle): boolean {
  return bundle.users.some((user) => (user.role === "owner" || user.role === "admin") && user.status === "active");
}

/**
 * "No active admin" is a problem for an operating organisation. While the owner
 * is simply yet to accept their invitation, the onboarding status already says so.
 */
export function lacksActiveAdmin(bundle: CompanyBundle, owner: CompanyOwner): boolean {
  if (owner.state === "invited" || owner.state === "invitation_expired") return false;
  return !hasActiveAdmin(bundle);
}

function latestFailedPayment(bundle: CompanyBundle) {
  return [...bundle.payments]
    .filter((payment) => payment.status === "failed")
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))[0];
}

/**
 * Items a Super Admin should act on. Suspended, deactivated and archived
 * companies are intentionally quiet: their state is already a decision.
 */
export function computeAttention(
  bundle: CompanyBundle,
  usage: CompanyUsageSummary,
  billingStatus: CompanyBillingStatus,
  owner: CompanyOwner,
): CompanyAttentionItem[] {
  const { company, subscription } = bundle;
  if (company.accountStatus !== "active") return [];

  const items: CompanyAttentionItem[] = [];
  const push = (
    kind: AttentionKind,
    partial: Pick<CompanyAttentionItem, "title" | "description" | "area" | "detectedAt" | "actionLabel" | "section"> &
      Partial<Pick<CompanyAttentionItem, "severity">>,
  ) => {
    items.push({
      id: `${company.id}:${kind}`,
      companyId: company.id,
      companyName: company.name,
      kind,
      severity: partial.severity ?? ATTENTION_KIND_META[kind].severity,
      title: partial.title,
      description: partial.description,
      area: partial.area,
      detectedAt: partial.detectedAt,
      actionLabel: partial.actionLabel,
      section: partial.section,
    });
  };

  if (billingStatus === "payment_failed") {
    const failed = latestFailedPayment(bundle);
    push("payment_failed", {
      title: "Payment failed",
      description: failed?.failureReason ?? "The latest payment attempt did not succeed.",
      area: "billing",
      detectedAt: failed?.createdAt ?? company.lastActiveAt,
      actionLabel: "Review Billing",
      section: "billing",
    });
  } else if (billingStatus === "payment_due" && subscription.status !== "trialing") {
    const open = bundle.invoices.filter((invoice) => invoice.status === "open" || invoice.status === "overdue")[0];
    push("payment_due", {
      title: "Payment due",
      description: open ? `Invoice ${open.number} is awaiting payment.` : "An invoice is awaiting payment.",
      area: "billing",
      detectedAt: open?.dueAt ?? company.lastActiveAt,
      actionLabel: "Review Billing",
      section: "billing",
    });
  } else if (billingStatus === "no_payment_method" && subscription.status !== "trialing") {
    push("no_payment_method", {
      title: "No payment method on file",
      description: "The subscription is paying but has no payment method to charge.",
      area: "billing",
      detectedAt: subscription.currentPeriodStart,
      actionLabel: "Review Billing",
      section: "billing",
    });
  }

  if (subscription.status === "trialing" && subscription.trialEndsAt) {
    const days = daysUntil(subscription.trialEndsAt);
    if (days <= TRIAL_ENDING_SOON_DAYS) {
      push("trial_ending", {
        title: days <= 0 ? "Trial has ended" : `Trial ends in ${days} ${days === 1 ? "day" : "days"}`,
        description: subscription.paymentMethod
          ? "A payment method is on file; the first invoice follows the trial."
          : "No payment method on file yet.",
        area: "subscription",
        detectedAt: new Date(Date.parse(subscription.trialEndsAt) - TRIAL_ENDING_SOON_DAYS * DAY_MS).toISOString(),
        actionLabel: "Review Subscription",
        section: "subscription",
      });
    }
  }

  if (subscription.status === "scheduled_cancellation" && subscription.scheduledCancellationAt) {
    push("cancellation_scheduled", {
      title: "Cancellation scheduled",
      description: "The subscription ends at the close of the current period.",
      area: "subscription",
      detectedAt: subscription.cancelledAt ?? subscription.currentPeriodStart,
      actionLabel: "Review Subscription",
      section: "subscription",
    });
  }

  const exceeded = usage.exceeded.find((record) => record.alertable);
  if (exceeded) {
    const def = USAGE_RESOURCE_BY_KEY[exceeded.resource];
    push("usage_exceeded", {
      title: `${def.label} limit exceeded`,
      description: `${Math.round(exceeded.utilization ?? 0)}% of the effective limit is consumed.`,
      area: "usage",
      detectedAt: exceeded.updatedAt,
      actionLabel: "Review Usage",
      section: "usage",
    });
  } else if (usage.nearLimit.some((record) => record.alertable)) {
    const near = usage.nearLimit.find((record) => record.alertable)!;
    const def = USAGE_RESOURCE_BY_KEY[near.resource];
    push("usage_near_limit", {
      title: `${def.label} near limit`,
      description: `${Math.round(near.utilization ?? 0)}% of the effective limit is consumed.`,
      area: "usage",
      detectedAt: near.updatedAt,
      actionLabel: "Review Usage",
      section: "usage",
    });
  }

  const broken = bundle.integrations.filter((item) => item.state === "needs_reconnect");
  if (broken.length > 0) {
    const latest = [...broken].sort((a, b) => Date.parse(b.lastSyncAt) - Date.parse(a.lastSyncAt))[0];
    push("integration_reconnect", {
      title: `${broken.length} ${broken.length === 1 ? "integration needs" : "integrations need"} reconnection`,
      description: latest?.lastError?.message ?? "A provider connection has expired or been revoked.",
      area: "integrations",
      detectedAt: latest?.lastError?.occurredAt ?? latest?.lastSyncAt ?? company.lastActiveAt,
      actionLabel: "Review Integrations",
      section: "integrations",
    });
  }

  if (lacksActiveAdmin(bundle, owner)) {
    push("no_active_admin", {
      title: "No active organisation admin",
      description: "Nobody can administer this organisation. Restore or invite an admin.",
      area: "users",
      detectedAt: company.lastActiveAt,
      actionLabel: "Review Users",
      section: "users",
    });
  }

  if (owner.state === "invitation_expired") {
    push("owner_invitation_expired", {
      title: "Owner invitation expired",
      description: `${owner.name} has not accepted the invitation.`,
      area: "security",
      detectedAt: company.createdAt,
      actionLabel: "Review Security",
      section: "security",
    });
  }

  if (bundle.jobs.failedLast24h >= JOB_FAILURE_WARNING) {
    push("job_failures", {
      title: `${bundle.jobs.failedLast24h} background ${bundle.jobs.failedLast24h === 1 ? "job" : "jobs"} failed`,
      description: "Scheduled publishing or sync jobs failed in the last 24 hours.",
      area: "jobs",
      severity: bundle.jobs.failedLast24h >= JOB_FAILURE_CRITICAL ? "critical" : "warning",
      detectedAt: bundle.jobs.lastFailureAt ?? company.lastActiveAt,
      actionLabel: "Review Clients",
      section: "clients",
    });
  }

  const support = computeSupport(bundle);
  if (support.slaBreaches > 0) {
    push("support_sla", {
      title: `${support.slaBreaches} support ${support.slaBreaches === 1 ? "ticket has" : "tickets have"} breached SLA`,
      description: support.latest?.subject ?? "A support ticket is past its response target.",
      area: "support",
      detectedAt: support.latest?.updatedAt ?? company.lastActiveAt,
      actionLabel: "View Support Snapshot",
      section: "overview",
    });
  }

  const rank = { critical: 0, warning: 1, info: 2 } as const;
  return items.sort(
    (a, b) => rank[a.severity] - rank[b.severity] || Date.parse(b.detectedAt) - Date.parse(a.detectedAt),
  );
}

export function computeHealth(
  ctx: DerivationContext,
  bundle: CompanyBundle,
  usage: CompanyUsageSummary,
  billingStatus: CompanyBillingStatus,
  owner: CompanyOwner,
): CompanyHealth {
  const { company, subscription } = bundle;

  if (company.accountStatus === "suspended") {
    return { status: "suspended", reason: "Account suspended. Health is not assessed.", factors: [] };
  }
  if (company.accountStatus !== "active") {
    return { status: "not_assessed", reason: "Account is not operating.", factors: [] };
  }

  const factors: HealthFactor[] = [];

  // Billing
  factors.push(
    billingStatus === "payment_failed"
      ? { area: "billing", status: "critical", label: "Payment failed", detail: "The latest payment attempt failed.", section: "billing" }
      : billingStatus === "payment_due" && subscription.status !== "trialing"
        ? { area: "billing", status: "warning", label: "Payment due", detail: "An invoice is awaiting payment.", section: "billing" }
        : billingStatus === "no_payment_method" && subscription.status !== "trialing"
          ? { area: "billing", status: "warning", label: "No payment method", detail: "Nothing on file to charge.", section: "billing" }
          : { area: "billing", status: "healthy", label: "Billing in order", detail: "No open billing issues.", section: "billing" },
  );

  // Subscription
  const trialDays = subscription.trialEndsAt ? daysUntil(subscription.trialEndsAt) : null;
  factors.push(
    subscription.status === "expired"
      ? { area: "subscription", status: "critical", label: "Subscription expired", detail: "The subscription is no longer active.", section: "subscription" }
      : subscription.status === "past_due"
        ? { area: "subscription", status: "warning", label: "Subscription past due", detail: "Renewal has not been collected.", section: "subscription" }
        : subscription.status === "scheduled_cancellation"
          ? { area: "subscription", status: "warning", label: "Cancellation scheduled", detail: "Ends at the close of the period.", section: "subscription" }
          : subscription.status === "paused"
            ? { area: "subscription", status: "warning", label: "Subscription paused", detail: "Billing is paused.", section: "subscription" }
            : subscription.status === "trialing" && trialDays !== null && trialDays <= TRIAL_ENDING_SOON_DAYS
              ? { area: "subscription", status: "warning", label: "Trial ending soon", detail: trialDays <= 0 ? "The trial has ended." : `Trial ends in ${trialDays} day${trialDays === 1 ? "" : "s"}.`, section: "subscription" }
              : { area: "subscription", status: "healthy", label: "Subscription in good standing", detail: "No lifecycle risk.", section: "subscription" },
  );

  // Usage
  const top = usage.highest;
  factors.push(
    usage.exceeded.length > 0
      ? { area: "usage", status: "critical", label: "Limit exceeded", detail: `${USAGE_RESOURCE_BY_KEY[usage.exceeded[0]!.resource].label} is over its effective limit.`, section: "usage" }
      : usage.highest && usage.highest.status === "near_limit"
        ? { area: "usage", status: "warning", label: "Near a limit", detail: `${USAGE_RESOURCE_BY_KEY[usage.highest.resource].label} is at ${Math.round(usage.highest.utilization ?? 0)}%.`, section: "usage" }
        : { area: "usage", status: "healthy", label: "Usage within limits", detail: top ? `Highest utilisation ${Math.round(top.utilization ?? 0)}%.` : "No metered limits.", section: "usage" },
  );

  // Integrations
  const counts = countIntegrations(bundle.integrations);
  const failing = counts.needsReconnect + counts.permissionIssues + counts.syncFailures;
  factors.push(
    counts.total >= 2 && failing / counts.total >= 0.5
      ? { area: "integrations", status: "critical", label: "Most connections failing", detail: `${failing} of ${counts.total} connections are failing.`, section: "integrations" }
      : failing > 0
        ? { area: "integrations", status: "warning", label: "Connections need attention", detail: `${failing} of ${counts.total} connections need attention.`, section: "integrations" }
        : { area: "integrations", status: "healthy", label: "Connections healthy", detail: counts.total === 0 ? "No connections yet." : "All connections are healthy.", section: "integrations" },
  );

  // Security
  factors.push(
    lacksActiveAdmin(bundle, owner)
      ? { area: "security", status: "critical", label: "No active admin", detail: "No active organisation owner or admin.", section: "security" }
      : owner.state === "invitation_expired"
        ? { area: "security", status: "warning", label: "Owner invitation expired", detail: "The owner has not accepted.", section: "security" }
        : bundle.security.accessLock
          ? { area: "security", status: "warning", label: "Access locked", detail: "Access lock is recorded for this company.", section: "security" }
          : { area: "security", status: "healthy", label: "No security warnings", detail: "Ownership and access are in order.", section: "security" },
  );

  // Background jobs
  factors.push(
    bundle.jobs.failedLast24h >= JOB_FAILURE_CRITICAL
      ? { area: "jobs", status: "critical", label: "Critical job failures", detail: `${bundle.jobs.failedLast24h} jobs failed in 24 hours.`, section: "clients" }
      : bundle.jobs.failedLast24h >= JOB_FAILURE_WARNING
        ? { area: "jobs", status: "warning", label: "Job failures", detail: `${bundle.jobs.failedLast24h} jobs failed in 24 hours.`, section: "clients" }
        : { area: "jobs", status: "healthy", label: "Jobs running", detail: "No failures in 24 hours.", section: "clients" },
  );

  // Recent activity
  const support = computeSupport(bundle);
  const idleDays = Math.floor((ctx.now - Date.parse(company.lastActiveAt)) / DAY_MS);
  factors.push(
    support.slaBreaches > 0
      ? { area: "activity", status: "warning", label: "Support SLA breached", detail: `${support.slaBreaches} ticket${support.slaBreaches === 1 ? "" : "s"} past target.`, section: "overview" }
      : idleDays >= DORMANT_AFTER_DAYS
        ? { area: "activity", status: "warning", label: "Dormant", detail: `No activity for ${idleDays} days.`, section: "activity" }
        : { area: "activity", status: "healthy", label: "Recently active", detail: "Activity in the last 30 days.", section: "activity" },
  );

  const critical = factors.filter((factor) => factor.status === "critical");
  const warning = factors.filter((factor) => factor.status === "warning");
  const status = critical.length > 0 ? "critical" : warning.length > 0 ? "needs_attention" : "healthy";
  const leading = [...critical, ...warning].slice(0, 2).map((factor) => factor.label);

  return {
    status,
    reason: leading.length > 0 ? leading.join(" · ") : "All seven health factors are healthy.",
    factors,
  };
}

/* ------------------------------------------------------------------ */
/* Security posture                                                    */
/* ------------------------------------------------------------------ */

export function computeTwoFactorAdoption(bundle: CompanyBundle) {
  const members = bundle.users.filter((user) => user.status !== "invited");
  const withTwoFactor = members.filter((user) => user.mfaEnabled).length;
  return {
    totalUsers: members.length,
    withTwoFactor,
    percent: members.length === 0 ? 0 : Math.round((withTwoFactor / members.length) * 100),
    adminsWithout2fa: members.filter(
      (user) => (user.role === "owner" || user.role === "admin") && user.status === "active" && !user.mfaEnabled,
    ),
  };
}

/** Every warning carries a concrete next step - a warning without one is noise. */
export function computeSecurityWarnings(bundle: CompanyBundle, owner: CompanyOwner): SecurityWarning[] {
  const warnings: SecurityWarning[] = [];
  const activeAdmins = bundle.users.filter(
    (user) => (user.role === "owner" || user.role === "admin") && user.status === "active",
  );

  if (lacksActiveAdmin(bundle, owner)) {
    warnings.push({
      id: "no-active-admin",
      severity: "critical",
      title: "No active organisation admin",
      description: "Nobody can administer this organisation. Restore an admin or transfer ownership.",
      action: { kind: "open_users", label: "Review users" },
    });
  }

  if (owner.state === "invitation_expired") {
    warnings.push({
      id: "owner-invitation-expired",
      severity: "warning",
      title: "Company owner invitation expired",
      description: `${owner.name} has not accepted the invitation.`,
      action: { kind: "resend_invitation", label: "Resend invitation" },
    });
  }

  if (owner.state === "active" && !bundle.users.find((user) => user.id === owner.userId)?.mfaEnabled) {
    warnings.push({
      id: "owner-no-2fa",
      severity: "warning",
      title: "Organisation owner has not enabled 2FA",
      description: `${owner.name} signs in with a password only.`,
      action: { kind: "require_2fa", label: "Require 2FA" },
    });
  }

  if (owner.state === "active" && activeAdmins.length === 1) {
    warnings.push({
      id: "no-backup-admin",
      severity: "warning",
      title: "No backup organisation admin exists",
      description: "If the owner is locked out there is nobody else who can administer the organisation.",
      action: { kind: "open_users", label: "Review users" },
    });
  }

  const suspendedWithAccess = bundle.users.filter((user) => user.status === "suspended" && user.clientAccessIds.length > 0);
  if (suspendedWithAccess.length > 0) {
    warnings.push({
      id: "suspended-with-resources",
      severity: "warning",
      title: "Suspended user has active owned resources",
      description: `${suspendedWithAccess.length} suspended ${suspendedWithAccess.length === 1 ? "user still has" : "users still have"} client access assigned.`,
      action: { kind: "review_client_access", label: "Review client access" },
    });
  }

  const failedLogins = bundle.security.events.filter((event) => event.type === "failed_logins").length;
  if (failedLogins >= 2 || bundle.security.accountLockouts > 0) {
    warnings.push({
      id: "failed-logins",
      severity: "warning",
      title: "Multiple failed login attempts detected",
      description:
        bundle.security.accountLockouts > 0
          ? `${bundle.security.accountLockouts} account ${bundle.security.accountLockouts === 1 ? "lockout" : "lockouts"} recorded.`
          : `${failedLogins} failed sign-in attempts recorded recently.`,
      action: { kind: "review_events", label: "Review security events" },
    });
  }

  const rank = { critical: 0, warning: 1, info: 2 } as const;
  return warnings.sort((a, b) => rank[a.severity] - rank[b.severity]);
}

/* ------------------------------------------------------------------ */
/* Summary                                                             */
/* ------------------------------------------------------------------ */

export function deriveOnboarding(owner: CompanyOwner, connections: number): CompanyOnboardingStatus {
  if (owner.state === "invited" || owner.state === "invitation_expired" || owner.state === "none") {
    return "awaiting_owner";
  }
  return connections === 0 ? "setting_up" : "completed";
}

export function resolveStaff(ctx: DerivationContext, id: string | null): StaffRef | null {
  return id ? (ctx.staff.find((member) => member.id === id) ?? null) : null;
}

export function computeSummary(ctx: DerivationContext, bundle: CompanyBundle): CompanySummary {
  const owner = deriveOwner(bundle);
  const usage = computeUsage(ctx, bundle);
  const billingStatus = computeBillingStatus(bundle);
  const health = computeHealth(ctx, bundle, usage, billingStatus, owner);
  const attention = computeAttention(bundle, usage, billingStatus, owner);
  const counts = countIntegrations(bundle.integrations);
  const plan = planForSubscription(ctx, bundle.subscription);
  const { internalOwners } = bundle.company;

  return {
    company: bundle.company,
    owner,
    plan: { tier: plan.tier, name: plan.name, billingCycle: bundle.subscription.billingCycle },
    subscriptionStatus: bundle.subscription.status,
    billingStatus,
    mrrMinor: computeMrr(ctx, bundle),
    currency: plan.currency,
    trialEndsAt: bundle.subscription.trialEndsAt,
    counts: {
      users: bundle.users.length,
      activeUsers: bundle.users.filter((user) => user.status === "active").length,
      clients: bundle.clients.length,
      connections: counts.total,
      healthyConnections: counts.healthy,
      attentionConnections: counts.attention,
    },
    usage: { level: usage.level, utilization: usage.highest?.utilization ?? null, resource: usage.highest?.resource ?? null },
    health,
    attention,
    onboarding: deriveOnboarding(owner, counts.total),
    internalOwners: {
      accountManager: resolveStaff(ctx, internalOwners.accountManagerId),
      supportOwner: resolveStaff(ctx, internalOwners.supportOwnerId),
      technicalOwner: resolveStaff(ctx, internalOwners.technicalOwnerId),
    },
  };
}

/* ------------------------------------------------------------------ */
/* Listing                                                             */
/* ------------------------------------------------------------------ */

const RANGE_DAYS: Record<string, number> = { "7d": 7, "30d": 30, "90d": 90 };

function withinDays(iso: string, days: number, now: number): boolean {
  return now - Date.parse(iso) <= days * DAY_MS;
}

function matchesSearch(summary: CompanySummary, search: string): boolean {
  const term = search.trim().toLowerCase();
  if (!term) return true;
  const { company, owner } = summary;
  return [
    company.name,
    company.domain,
    company.id,
    company.displayId,
    company.slug,
    company.profile.contactEmail,
    owner.name,
    owner.email,
  ].some((field) => field?.toLowerCase().includes(term));
}

const ISSUE_ALIASES: Record<string, AttentionKind[]> = {
  integration: ["integration_reconnect"],
  usage: ["usage_near_limit", "usage_exceeded"],
  payment: ["payment_failed", "payment_due"],
};

export function filterSummaries(
  summaries: readonly CompanySummary[],
  query: CompanyListQuery,
  now: number,
): CompanySummary[] {
  return summaries.filter((summary) => {
    if (!matchesSearch(summary, query.search ?? "")) return false;
    if (query.plan && summary.plan.tier !== query.plan) return false;
    if (query.accountStatus && summary.company.accountStatus !== query.accountStatus) return false;
    if (query.subscriptionStatus && summary.subscriptionStatus !== query.subscriptionStatus) return false;
    if (query.billingStatus && summary.billingStatus !== query.billingStatus) return false;
    if (query.health) {
      const status = summary.health.status;
      if (query.health === "at_risk") {
        if (status !== "needs_attention" && status !== "critical") return false;
      } else if (status !== query.health) return false;
    }
    if (query.usageLevel && summary.usage.level !== query.usageLevel) return false;

    const createdDays = query.created ? RANGE_DAYS[query.created] : undefined;
    if (createdDays !== undefined && !withinDays(summary.company.createdAt, createdDays, now)) return false;

    if (query.lastActive) {
      const at = summary.company.lastActiveAt;
      if (query.lastActive === "24h" && !withinDays(at, 1, now)) return false;
      if (query.lastActive === "7d" && !withinDays(at, 7, now)) return false;
      if (query.lastActive === "30d" && !withinDays(at, 30, now)) return false;
      if (query.lastActive === "dormant" && withinDays(at, DORMANT_AFTER_DAYS, now)) return false;
    }

    if (query.issue) {
      const kinds = ISSUE_ALIASES[query.issue] ?? [query.issue as AttentionKind];
      if (!summary.attention.some((item) => kinds.includes(item.kind))) return false;
    }

    if (query.tag && !summary.company.internalTags.includes(query.tag)) return false;
    return true;
  });
}

export function sortSummaries(
  summaries: readonly CompanySummary[],
  sort: CompanyListQuery["sort"],
): CompanySummary[] {
  const { field, direction } = sort ?? { field: "createdAt", direction: "desc" as const };
  const factor = direction === "asc" ? 1 : -1;

  const key = (summary: CompanySummary): number | string => {
    switch (field) {
      case "name":
        return summary.company.name.toLowerCase();
      case "mrr":
        return summary.mrrMinor;
      case "usage":
        return summary.usage.utilization ?? -1;
      case "lastActiveAt":
        return Date.parse(summary.company.lastActiveAt);
      default:
        return Date.parse(summary.company.createdAt);
    }
  };

  return [...summaries].sort((a, b) => {
    const left = key(a);
    const right = key(b);
    const order =
      typeof left === "string" && typeof right === "string" ? left.localeCompare(right) : Number(left) - Number(right);
    return order * factor || a.company.name.localeCompare(b.company.name);
  });
}

export function paginate<T>(items: readonly T[], page: number, pageSize: number): { data: T[]; pagination: PaginationMeta } {
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const current = Math.min(Math.max(1, page), totalPages);
  const offset = (current - 1) * pageSize;
  return {
    data: items.slice(offset, offset + pageSize),
    pagination: {
      page: current,
      pageSize,
      total,
      totalPages,
      hasNextPage: current < totalPages,
      hasPreviousPage: current > 1,
    },
  };
}

export function applyListQuery(
  summaries: readonly CompanySummary[],
  query: CompanyListQuery,
  now: number,
): CompanyListResult {
  const filtered = sortSummaries(filterSummaries(summaries, query, now), query.sort);
  const { data, pagination } = paginate(filtered, query.page ?? 1, query.pageSize ?? APP.defaultPageSize);
  return { data, pagination, matchingIds: filtered.map((summary) => summary.company.id) };
}

/* ------------------------------------------------------------------ */
/* Portfolio                                                           */
/* ------------------------------------------------------------------ */

export function computePortfolio(ctx: DerivationContext, summaries: readonly CompanySummary[]): PortfolioSummary {
  const accountStatus = { active: 0, suspended: 0, deactivated: 0, archived: 0 };
  const health = { healthy: 0, needs_attention: 0, critical: 0, suspended: 0, notAssessed: 0 };
  const monthStart = startOfMonth(0);
  const lastMonthStart = startOfMonth(-1);

  let mrrMinor = 0;
  let payingCompanies = 0;
  let trialing = 0;
  let trialsEndingSoon = 0;
  let pastDue = 0;
  let newThisMonth = 0;
  let newLastMonth = 0;
  let needsAttention = 0;

  for (const summary of summaries) {
    const { company } = summary;
    accountStatus[company.accountStatus] += 1;

    const created = Date.parse(company.createdAt);
    if (created >= monthStart) newThisMonth += 1;
    else if (created >= lastMonthStart) newLastMonth += 1;

    if (summary.mrrMinor > 0) {
      mrrMinor += summary.mrrMinor;
      payingCompanies += 1;
    }

    if (company.accountStatus === "active") {
      if (summary.subscriptionStatus === "trialing") {
        trialing += 1;
        if (summary.trialEndsAt && daysUntil(summary.trialEndsAt) <= TRIAL_ENDING_SOON_DAYS) trialsEndingSoon += 1;
      }
      if (summary.subscriptionStatus === "past_due") pastDue += 1;
    }

    switch (summary.health.status) {
      case "healthy":
        health.healthy += 1;
        break;
      case "needs_attention":
        health.needs_attention += 1;
        break;
      case "critical":
        health.critical += 1;
        break;
      case "suspended":
        health.suspended += 1;
        break;
      default:
        health.notAssessed += 1;
    }

    if (summary.attention.some((item) => item.severity !== "info")) needsAttention += 1;
  }

  const rank = { critical: 0, warning: 1, info: 2 } as const;
  const attentionItems = summaries
    .flatMap((summary) => summary.attention)
    .sort((a, b) => rank[a.severity] - rank[b.severity] || Date.parse(b.detectedAt) - Date.parse(a.detectedAt));

  const byKind = new Map<AttentionKind, { companies: Set<string>; items: number }>();
  for (const item of attentionItems) {
    const entry = byKind.get(item.kind) ?? { companies: new Set<string>(), items: 0 };
    entry.companies.add(item.companyId);
    entry.items += 1;
    byKind.set(item.kind, entry);
  }

  const recentSignups = [...summaries]
    .sort((a, b) => Date.parse(b.company.createdAt) - Date.parse(a.company.createdAt))
    .slice(0, 5);

  return {
    total: summaries.length,
    accountStatus,
    active: accountStatus.active,
    trialing,
    trialsEndingSoon,
    pastDue,
    suspended: accountStatus.suspended,
    newThisMonth,
    newLastMonth,
    mrrMinor,
    currency: ctx.plans[0]?.currency ?? "INR",
    payingCompanies,
    needsAttention,
    health,
    attentionItems,
    attentionByKind: [...byKind.entries()]
      .map(([kind, entry]) => ({ kind, companies: entry.companies.size, items: entry.items }))
      .sort((a, b) => b.companies - a.companies),
    recentSignups,
  };
}
