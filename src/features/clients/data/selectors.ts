/**
 * Pure derivations over client records.
 *
 * Health, onboarding status, counts and attention items are recomputed from the
 * underlying records every time. A pause, an assignment or a new connection is
 * therefore reflected on every screen by construction - there is no second copy
 * to forget to update. In a backend-connected build these are the calculations
 * the client service performs; the UI only consumes their output.
 */
import { APP } from "@/config/app";
import { DEMO_CLOCK_ANCHOR } from "@/features/companies/data/config";
import { computeUsage, planFor, type DerivationContext } from "@/features/companies/data/selectors";
import type {
  Company,
  CompanyBundle,
  CompanyClient,
  CompanyIntegration,
  CompanyUsageSummary,
} from "@/features/companies/data/types";
import { startOfMonth } from "@/features/companies/data/clock";
import type { PaginationMeta } from "@/types/api";
import type { IntegrationProvider } from "@/types/domain/integration";
import type { OrganisationRole } from "@/types/domain/user";
import {
  APPROVAL_STALE_DAYS,
  CLIENT_USAGE_SHARE_WARNING,
  COMPANY_USAGE_WARNING,
  DORMANT_AFTER_DAYS,
  FAILED_POSTS_CRITICAL,
  ONBOARDING_STEPS,
  WEBSITE_WARNINGS_THRESHOLD,
} from "./config";
import type {
  ClientAccessLevel,
  ClientAnalyticsLinkState,
  ClientAssignmentView,
  ClientAttentionItem,
  ClientCreationCompany,
  ClientDetailRecord,
  ClientHealth,
  ClientHealthFactor,
  ClientListQuery,
  ClientListResult,
  ClientOnboarding,
  ClientPortfolio,
  ClientSearchAnalytics,
  ClientSummary,
  ClientUsage,
  ClientUsageRow,
  ClientWebsite,
  EligibleMember,
  OnboardingStepView,
} from "./types";

const DAY_MS = 86_400_000;

export function hash(value: string): number {
  let result = 5381;
  for (let index = 0; index < value.length; index += 1) {
    result = ((result << 5) + result + value.charCodeAt(index)) | 0;
  }
  return Math.abs(result);
}

/* ------------------------------------------------------------------ */
/* Identity                                                            */
/* ------------------------------------------------------------------ */

/**
 * Short ids follow signup order across the whole platform. They are computed,
 * never stored: a new client is always the newest, so it always gets the next
 * number and no existing id ever moves.
 */
export function clientNumbering(bundles: readonly CompanyBundle[]): Map<string, string> {
  const all = bundles
    .flatMap((bundle) => bundle.clients)
    .sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt) || a.id.localeCompare(b.id));
  return new Map(all.map((client, index) => [client.id, `CL-${String(index + 1).padStart(4, "0")}`]));
}

export function defaultAccessLevel(role: OrganisationRole): ClientAccessLevel {
  if (role === "owner" || role === "admin" || role === "project_admin") return "admin";
  if (role === "analyst" || role === "viewer") return "viewer";
  return "editor";
}

export function workspaceOf(client: CompanyClient): ClientSummary["workspace"] {
  // `onboarding` on the shared record is an onboarding *phase*, not a separate workspace state.
  return client.status === "paused" ? "paused" : client.status === "archived" ? "archived" : "active";
}

/* ------------------------------------------------------------------ */
/* Team                                                                */
/* ------------------------------------------------------------------ */

export function assignmentsFor(bundle: CompanyBundle, client: CompanyClient, detail: ClientDetailRecord): ClientAssignmentView[] {
  return bundle.users
    .filter((user) => user.clientAccessIds.includes(client.id))
    .map<ClientAssignmentView>((user) => {
      const meta = detail.assignments[user.id];
      const issue =
        user.status === "suspended"
          ? "Suspended at company level"
          : user.status === "inactive"
            ? "Inactive company membership"
            : user.status === "invited"
              ? user.invitationExpired
                ? "Invitation expired"
                : "Invitation pending"
              : null;
      return {
        membershipId: user.id,
        name: user.name,
        email: user.email,
        companyRole: user.role,
        level: meta?.level ?? defaultAccessLevel(user.role),
        isLead: detail.leadUserId === user.id,
        membershipStatus: user.status,
        lastLoginAt: user.lastLoginAt,
        assignedAt: meta?.assignedAt ?? client.createdAt,
        assignedBy: meta?.assignedBy ?? "Company admin",
        issue,
      };
    })
    .sort((a, b) => Number(b.isLead) - Number(a.isLead) || a.name.localeCompare(b.name));
}

/** Members who may be given access: same company, active membership only. */
export function eligibleMembers(bundle: CompanyBundle, client?: CompanyClient): EligibleMember[] {
  return bundle.users
    .filter((user) => user.status === "active")
    .map((user) => ({
      membershipId: user.id,
      name: user.name,
      email: user.email,
      companyRole: user.role,
      alreadyAssigned: client ? user.clientAccessIds.includes(client.id) : false,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function connectionsFor(bundle: CompanyBundle, client: CompanyClient): CompanyIntegration[] {
  return bundle.integrations.filter((integration) => integration.clientId === client.id);
}

/** A connection cannot pre-date its client, nor post-date its last sync. */
export function connectedAtFor(client: CompanyClient, integration: CompanyIntegration): string {
  const start = Date.parse(client.createdAt);
  const end = Math.max(start, Date.parse(integration.lastSyncAt));
  return new Date(start + ((hash(integration.id) % 20) / 20) * (end - start)).toISOString();
}

/* ------------------------------------------------------------------ */
/* Websites and search analytics                                       */
/* ------------------------------------------------------------------ */

export function primaryWebsiteOf(detail: ClientDetailRecord): ClientWebsite | null {
  return detail.websites.find((site) => site.id === detail.primaryWebsiteId) ?? detail.websites[0] ?? null;
}

function linkState(connection: CompanyIntegration | undefined, configured: boolean): ClientAnalyticsLinkState {
  if (connection) return connection.state === "needs_reconnect" || connection.state === "permission_issue" ? "needs_reconnect" : "connected";
  return configured ? "configured_only" : "not_connected";
}

export function computeSearchAnalytics(bundle: CompanyBundle, client: CompanyClient, detail: ClientDetailRecord): ClientSearchAnalytics {
  const connections = connectionsFor(bundle, client);
  const gsc = connections.find((item) => item.provider === "search_console");
  const ga4 = connections.find((item) => item.provider === "website_analytics");
  const gscState = linkState(gsc, Boolean(detail.searchConfig.gscProperty));
  const ga4State = linkState(ga4, Boolean(detail.searchConfig.ga4MeasurementId));
  const synced = [gsc, ga4].filter((item): item is CompanyIntegration => Boolean(item) && item?.state !== "needs_reconnect" && item?.state !== "permission_issue");

  return {
    gscProperty: gsc?.accountName ?? detail.searchConfig.gscProperty,
    gscState,
    ga4Stream: ga4?.accountName ?? detail.searchConfig.ga4MeasurementId,
    ga4State,
    lastSyncAt: synced.map((item) => item.lastSyncAt).sort().at(-1) ?? null,
    // Reporting needs *authorised* access - a verification tag or measurement ID is not enough.
    reportingAvailable: gscState === "connected" || ga4State === "connected",
  };
}

/* ------------------------------------------------------------------ */
/* Onboarding                                                          */
/* ------------------------------------------------------------------ */

export function computeOnboarding(
  bundle: CompanyBundle,
  client: CompanyClient,
  detail: ClientDetailRecord,
): ClientOnboarding {
  const assigned = assignmentsFor(bundle, client, detail);
  const connections = connectionsFor(bundle, client);
  const leadActive = assigned.some((item) => item.isLead && item.membershipStatus === "active");

  const done: Record<OnboardingStepView["key"], { done: boolean; detail: string }> = {
    identity: {
      done: Boolean(detail.profile.industry && detail.profile.contactEmail),
      detail: detail.profile.contactEmail ? `Contact ${detail.profile.contactEmail}` : "Add an industry and contact email",
    },
    website: {
      done: primaryWebsiteOf(detail) !== null,
      detail: primaryWebsiteOf(detail)?.domain ?? "No website configured",
    },
    lead: { done: leadActive, detail: leadActive ? (assigned.find((item) => item.isLead)?.name ?? "") : "No active client lead" },
    team: {
      done: assigned.some((item) => item.membershipStatus === "active"),
      detail: `${assigned.filter((item) => item.membershipStatus === "active").length} active members`,
    },
    channel: {
      done: connections.length > 0,
      detail: connections.length > 0 ? `${connections.length} connected` : "No channel connected",
    },
    access_review: {
      done: detail.onboarding.accessReviewedAt !== null,
      detail: detail.onboarding.accessReviewedAt ? `Reviewed by ${detail.onboarding.accessReviewedBy ?? "platform staff"}` : "Not reviewed yet",
    },
  };

  const steps = ONBOARDING_STEPS.map<OnboardingStepView>((step) => ({
    key: step.key,
    label: step.label,
    required: detail.onboarding.required[step.key],
    done: done[step.key].done,
    detail: done[step.key].detail,
  }));

  const required = steps.filter((step) => step.required);
  const requiredDone = required.filter((step) => step.done).length;

  // A required channel step is *blocked* (not merely pending) when every connection is failing.
  const failing = connections.filter((item) => item.state === "needs_reconnect" || item.state === "permission_issue");
  const blockedReason =
    required.some((step) => step.key === "channel") && connections.length > 0 && failing.length === connections.length
      ? "Every connected channel needs reconnection."
      : null;

  const status =
    requiredDone === required.length
      ? "completed"
      : blockedReason
        ? "blocked"
        : requiredDone === 0 && steps.every((step) => !step.done)
          ? "not_started"
          : "in_progress";

  return { status, requiredTotal: required.length, requiredDone, steps, blockedReason };
}

/* ------------------------------------------------------------------ */
/* Usage                                                               */
/* ------------------------------------------------------------------ */

function attributableShare(bundle: CompanyBundle, client: CompanyClient, total: number): number {
  // Clients created after the dataset anchor have consumed nothing yet.
  const eligible = bundle.clients.filter((item) => Date.parse(item.createdAt) < DEMO_CLOCK_ANCHOR);
  if (!eligible.some((item) => item.id === client.id)) return 0;
  const weight = (item: CompanyClient) => 1 + (hash(item.id) % 5);
  const sum = eligible.reduce((acc, item) => acc + weight(item), 0);
  return sum === 0 ? 0 : Math.floor((total * weight(client)) / sum);
}

export function computeClientUsage(bundle: CompanyBundle, client: CompanyClient, usage: CompanyUsageSummary): ClientUsage {
  const companyOf = (resource: string) => {
    const found = usage.records.find((item) => item.resource === resource);
    return { used: found?.used ?? null, limit: found?.effectiveLimit ?? null };
  };
  const baseline = (resource: "aiCredits" | "automationRuns" | "storage" | "apiRequests") => bundle.usageBaseline[resource]?.used ?? 0;
  const scheduledTotal = bundle.clients.reduce((total, item) => total + item.scheduledPosts, 0);
  const storage = attributableShare(bundle, client, Math.round(baseline("storage") * 10));

  const rows: ClientUsageRow[] = [
    { key: "connectedAccounts", label: "Connected accounts", used: connectionsFor(bundle, client).length, unit: "accounts", companyUsed: bundle.integrations.length, companyLimit: companyOf("connectedAccounts").limit },
    { key: "scheduledPosts", label: "Scheduled posts", used: client.scheduledPosts, unit: "posts", companyUsed: scheduledTotal, companyLimit: null },
    { key: "aiCredits", label: "AI credits", used: attributableShare(bundle, client, baseline("aiCredits")), unit: "credits", companyUsed: companyOf("aiCredits").used, companyLimit: companyOf("aiCredits").limit },
    { key: "automationRuns", label: "Automation runs", used: attributableShare(bundle, client, baseline("automationRuns")), unit: "runs", companyUsed: companyOf("automationRuns").used, companyLimit: companyOf("automationRuns").limit },
    { key: "storage", label: "Storage", used: Number((storage / 10).toFixed(1)), unit: "GB", companyUsed: companyOf("storage").used, companyLimit: companyOf("storage").limit },
    { key: "apiRequests", label: "API requests", used: attributableShare(bundle, client, baseline("apiRequests")), unit: "requests", companyUsed: companyOf("apiRequests").used, companyLimit: companyOf("apiRequests").limit },
  ];

  return {
    rows,
    attributableNote:
      "Client figures are what this client consumed. Company-wide figures are the parent company's total against its subscription limits - the two are not the same thing.",
  };
}

/* ------------------------------------------------------------------ */
/* Health and attention                                                */
/* ------------------------------------------------------------------ */

interface Signals {
  assigned: ClientAssignmentView[];
  connections: CompanyIntegration[];
  primary: ClientWebsite | null;
  onboarding: ClientOnboarding;
  usage: ClientUsage;
  companyUtilisation: number | null;
}

export function computeAttention(
  ctx: DerivationContext,
  company: Pick<Company, "id" | "name">,
  client: CompanyClient,
  detail: ClientDetailRecord,
  signals: Signals,
): ClientAttentionItem[] {
  if (workspaceOf(client) !== "active") return [];

  const items: ClientAttentionItem[] = [];
  const push = (
    kind: ClientAttentionItem["kind"],
    partial: Omit<ClientAttentionItem, "id" | "clientId" | "clientName" | "companyId" | "companyName" | "kind">,
  ) => items.push({ id: `${client.id}:${kind}:${items.length}`, clientId: client.id, clientName: client.name, companyId: company.id, companyName: company.name, kind, ...partial });

  const label = (provider: IntegrationProvider) => provider.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

  for (const connection of signals.connections) {
    if (connection.state === "needs_reconnect") {
      push("connection_expired", { severity: "warning", title: `${label(connection.provider)} connection expired`, description: connection.lastError?.message ?? "The account must be reconnected.", module: "channels", detectedAt: connection.lastError?.occurredAt ?? connection.lastSyncAt, actionLabel: "Review Channels", section: "channels" });
    } else if (connection.state === "permission_issue") {
      push("permission_revoked", { severity: "warning", title: `${label(connection.provider)} permission revoked`, description: connection.lastError?.message ?? "A required permission was revoked.", module: "channels", detectedAt: connection.lastError?.occurredAt ?? connection.lastSyncAt, actionLabel: "Review Channels", section: "channels" });
    } else if (connection.state === "sync_failure" || connection.state === "rate_limited") {
      push("sync_failing", { severity: connection.state === "rate_limited" ? "info" : "warning", title: `${label(connection.provider)} ${connection.state === "rate_limited" ? "is rate limited" : "sync is failing"}`, description: connection.lastError?.message ?? "The provider is not syncing normally.", module: "channels", detectedAt: connection.lastError?.occurredAt ?? connection.lastSyncAt, actionLabel: "Review Channels", section: "channels" });
    }
  }

  if (client.failedPosts > 0) {
    push("posts_failed", { severity: client.failedPosts >= FAILED_POSTS_CRITICAL ? "critical" : "warning", title: `${client.failedPosts} scheduled ${client.failedPosts === 1 ? "post" : "posts"} failed`, description: "Publishing failed and needs a retry or a fix.", module: "jobs", detectedAt: detail.operations.lastPublishedAt ?? client.lastActivityAt, actionLabel: "View Activity", section: "activity", query: { module: "jobs" } });
  }

  if (signals.assigned.every((item) => item.membershipStatus !== "active")) {
    push("no_team", { severity: "warning", title: "No active team members", description: "Nobody with an active membership can work in this client.", module: "team", detectedAt: client.createdAt, actionLabel: "Review Team", section: "team" });
  } else if (!signals.assigned.some((item) => item.isLead && item.membershipStatus === "active")) {
    push("lead_missing", { severity: "warning", title: "Client lead missing", description: detail.leadUserId ? "The assigned lead no longer has an active membership." : "No member is designated as client lead.", module: "team", detectedAt: client.createdAt, actionLabel: "Review Team", section: "team" });
  }

  const membershipProblems = signals.assigned.filter((item) => item.membershipStatus === "suspended" || item.membershipStatus === "inactive");
  if (membershipProblems.length > 0) {
    push("access_issue", { severity: "info", title: `${membershipProblems.length} assigned ${membershipProblems.length === 1 ? "member has" : "members have"} a membership problem`, description: "Suspended or inactive at company level, so not counted as active client members.", module: "team", detectedAt: client.createdAt, actionLabel: "Review Team", section: "team" });
  }

  if (signals.primary) {
    if (signals.primary.availability === "down") {
      push("website_down", { severity: "critical", title: `${signals.primary.domain} is unreachable`, description: "The last availability check failed.", module: "website", detectedAt: signals.primary.lastCheckedAt ?? client.lastActivityAt, actionLabel: "Review Website", section: "website-seo" });
    }
    if (signals.primary.criticalIssues > 0) {
      push("website_issues", { severity: "critical", title: `${signals.primary.criticalIssues} critical technical ${signals.primary.criticalIssues === 1 ? "issue" : "issues"}`, description: `Found on ${signals.primary.domain} in the last crawl.`, module: "website", detectedAt: signals.primary.lastCrawlAt ?? client.lastActivityAt, actionLabel: "Review Website", section: "website-seo" });
    }
    if (signals.primary.monitoring === "stopped") {
      push("website_monitoring_stopped", { severity: "warning", title: "Website monitoring stopped", description: `${signals.primary.domain} is no longer being checked.`, module: "website", detectedAt: signals.primary.lastCheckedAt ?? client.lastActivityAt, actionLabel: "Review Website", section: "website-seo" });
    }
  }

  const ai = signals.usage.rows.find((row) => row.key === "aiCredits");
  if (ai && ai.companyUsed && ai.used / ai.companyUsed >= CLIENT_USAGE_SHARE_WARNING && (signals.companyUtilisation ?? 0) >= COMPANY_USAGE_WARNING) {
    push("high_usage", { severity: "warning", title: "High client resource usage", description: `Uses ${Math.round((ai.used / ai.companyUsed) * 100)}% of the company's AI credits while the company is at ${Math.round(signals.companyUtilisation ?? 0)}%.`, module: "usage", detectedAt: client.lastActivityAt, actionLabel: "Open Company Usage", section: "overview" });
  }

  const approvals = detail.operations.pendingApprovals;
  if (approvals && (ctx.now - Date.parse(approvals.oldestAt)) / DAY_MS >= APPROVAL_STALE_DAYS) {
    push("approval_pending", { severity: "warning", title: `${approvals.count} approvals pending`, description: `The oldest has waited ${Math.floor((ctx.now - Date.parse(approvals.oldestAt)) / DAY_MS)} days.`, module: "approvals", detectedAt: approvals.oldestAt, actionLabel: "View Activity", section: "activity", query: { module: "jobs" } });
  }

  if (signals.onboarding.status === "blocked") {
    push("onboarding_blocked", { severity: "warning", title: "Onboarding is blocked", description: signals.onboarding.blockedReason ?? "A required step cannot be completed.", module: "onboarding", detectedAt: client.createdAt, actionLabel: "Review Onboarding", section: "overview" });
  }

  const rank = { critical: 0, warning: 1, info: 2 } as const;
  return items.sort((a, b) => rank[a.severity] - rank[b.severity] || Date.parse(b.detectedAt) - Date.parse(a.detectedAt));
}

export function computeHealth(
  client: CompanyClient,
  detail: ClientDetailRecord,
  signals: Signals,
): ClientHealth {
  const workspace = workspaceOf(client);
  const { assigned, connections, primary } = signals;

  if (workspace !== "active") {
    return { status: "not_enough_data", reason: workspace === "paused" ? "Workspace is paused, so it is not assessed." : "Workspace is archived.", factors: [] };
  }

  const hasSignal = connections.length > 0 || primary !== null || assigned.length > 0 || client.scheduledPosts > 0 || client.failedPosts > 0;
  if (!hasSignal) {
    return { status: "not_enough_data", reason: "Nothing is configured yet: no channels, website or team.", factors: [] };
  }

  const factors: ClientHealthFactor[] = [];
  factors.push({ area: "workspace", status: "healthy", label: "Workspace active", detail: "The workspace is operating.", section: "settings" });

  const failing = connections.filter((item) => item.state === "needs_reconnect" || item.state === "permission_issue");
  const degraded = connections.filter((item) => item.state === "sync_failure" || item.state === "rate_limited");
  factors.push(
    connections.length === 0
      ? { area: "channels", status: "not_configured", label: "No channels connected", detail: "No provider account is connected.", section: "channels" }
      : failing.length >= 3 || (connections.length >= 2 && failing.length === connections.length)
        ? { area: "channels", status: "critical", label: "Most channels failing", detail: `${failing.length} of ${connections.length} connections need reconnection or permission fixes.`, section: "channels" }
        : failing.length > 0
          ? { area: "channels", status: "warning", label: "Connection needs attention", detail: `${failing.length} of ${connections.length} connections need reconnection or permission fixes.`, section: "channels" }
          : degraded.length > 0
            ? { area: "channels", status: "warning", label: "Sync degraded", detail: `${degraded.length} connection${degraded.length === 1 ? " is" : "s are"} failing to sync or rate limited.`, section: "channels" }
            : { area: "channels", status: "healthy", label: "Channels healthy", detail: `${connections.length} connections are healthy.`, section: "channels" },
  );

  factors.push(
    client.failedPosts >= FAILED_POSTS_CRITICAL
      ? { area: "publishing", status: "critical", label: "Publishing failures", detail: `${client.failedPosts} scheduled posts failed.`, section: "activity" }
      : client.failedPosts > 0 || detail.operations.retryPending > 0
        ? { area: "publishing", status: "warning", label: "Publishing issue", detail: client.failedPosts > 0 ? `${client.failedPosts} scheduled post failed.` : `${detail.operations.retryPending} retries pending.`, section: "activity" }
        : client.scheduledPosts === 0 && !detail.operations.lastPublishedAt
          ? { area: "publishing", status: "not_configured", label: "No publishing yet", detail: "Nothing has been scheduled or published.", section: "overview" }
          : { area: "publishing", status: "healthy", label: "Publishing running", detail: `${client.scheduledPosts} scheduled, no failures.`, section: "overview" },
  );

  factors.push(
    !primary
      ? { area: "website", status: "not_configured", label: "No website", detail: "No website is configured.", section: "website-seo" }
      : primary.availability === "down" || primary.criticalIssues > 0
        ? { area: "website", status: "critical", label: primary.availability === "down" ? "Website unreachable" : "Critical technical issues", detail: primary.availability === "down" ? `${primary.domain} failed its last check.` : `${primary.criticalIssues} critical issues found.`, section: "website-seo" }
        : primary.monitoring === "stopped" || primary.warnings >= WEBSITE_WARNINGS_THRESHOLD
          ? { area: "website", status: "warning", label: primary.monitoring === "stopped" ? "Monitoring stopped" : "Technical warnings", detail: primary.monitoring === "stopped" ? "Checks are no longer running." : `${primary.warnings} warnings in the last crawl.`, section: "website-seo" }
          : { area: "website", status: "healthy", label: "Website monitored", detail: `${primary.domain} is up and monitored.`, section: "website-seo" },
  );

  const activeMembers = assigned.filter((item) => item.membershipStatus === "active");
  const leadActive = assigned.some((item) => item.isLead && item.membershipStatus === "active");
  factors.push(
    activeMembers.length === 0
      ? { area: "team", status: "warning", label: "No active members", detail: "Nobody with an active membership has access.", section: "team" }
      : !leadActive
        ? { area: "team", status: "warning", label: "No client lead", detail: "No active member is the client lead.", section: "team" }
        : { area: "team", status: "healthy", label: "Team in place", detail: `${activeMembers.length} active members, lead assigned.`, section: "team" },
  );

  const ai = signals.usage.rows.find((row) => row.key === "aiCredits");
  const heavy = Boolean(ai && ai.companyUsed && ai.used / ai.companyUsed >= CLIENT_USAGE_SHARE_WARNING && (signals.companyUtilisation ?? 0) >= COMPANY_USAGE_WARNING);
  factors.push(
    signals.usage.rows.every((row) => row.used === 0)
      ? { area: "usage", status: "not_configured", label: "No usage yet", detail: "Nothing has been consumed.", section: "overview" }
      : heavy
        ? { area: "usage", status: "warning", label: "High usage", detail: "Consumes most of a company resource that is nearly used up.", section: "overview" }
        : { area: "usage", status: "healthy", label: "Usage normal", detail: "No unusual consumption.", section: "overview" },
  );

  const critical = factors.filter((factor) => factor.status === "critical");
  const warning = factors.filter((factor) => factor.status === "warning");
  const status = critical.length > 0 ? "critical" : warning.length > 0 ? "needs_attention" : "healthy";
  const leading = [...critical, ...warning].slice(0, 2).map((factor) => factor.label);

  return { status, reason: leading.length > 0 ? leading.join(" · ") : "Every assessed area is healthy.", factors };
}

/* ------------------------------------------------------------------ */
/* Summary                                                             */
/* ------------------------------------------------------------------ */

export function computeClientSummary(
  ctx: DerivationContext,
  bundle: CompanyBundle,
  client: CompanyClient,
  detail: ClientDetailRecord,
  displayId: string,
): ClientSummary {
  const usage = computeUsage(ctx, bundle);
  const plan = planFor(ctx, bundle.subscription.planTier);
  const assigned = assignmentsFor(bundle, client, detail);
  const connections = connectionsFor(bundle, client);
  const primary = primaryWebsiteOf(detail);
  const onboarding = computeOnboarding(bundle, client, detail);
  const clientUsage = computeClientUsage(bundle, client, usage);
  const companyUtilisation = usage.records.find((record) => record.resource === "aiCredits")?.utilization ?? null;
  const signals: Signals = { assigned, connections, primary, onboarding, usage: clientUsage, companyUtilisation };

  const healthy = connections.filter((item) => item.state === "healthy").length;
  const lead = assigned.find((item) => item.isLead);

  return {
    client,
    displayId,
    company: {
      id: bundle.company.id,
      name: bundle.company.name,
      slug: bundle.company.slug,
      planTier: plan.tier,
      planName: plan.name,
      accountStatus: bundle.company.accountStatus,
      subscriptionStatus: bundle.subscription.status,
    },
    profile: detail.profile,
    websites: detail.websites,
    primaryWebsite: primary,
    workspace: workspaceOf(client),
    onboarding,
    health: computeHealth(client, detail, signals),
    attention: computeAttention(ctx, bundle.company, client, detail, signals),
    lead: lead ? { membershipId: lead.membershipId, name: lead.name } : null,
    counts: {
      connections: connections.length,
      healthyConnections: healthy,
      attentionConnections: connections.length - healthy,
      assigned: assigned.length,
      activeMembers: assigned.filter((item) => item.membershipStatus === "active").length,
      pendingMembers: assigned.filter((item) => item.membershipStatus === "invited").length,
      accessIssues: assigned.filter((item) => item.membershipStatus === "suspended" || item.membershipStatus === "inactive").length,
    },
    connectedProviders: [...new Set(connections.map((item) => item.provider))],
    operations: {
      scheduledPosts: client.scheduledPosts,
      failedPosts: client.failedPosts,
      processingJobs: detail.operations.processingJobs,
      retryPending: detail.operations.retryPending,
      lastPublishedAt: detail.operations.lastPublishedAt,
    },
    lastActiveAt: client.lastActivityAt,
    pause: detail.lifecycle.pause,
    platformReviewer: ctx.staff.find((member) => member.id === detail.platformReviewerId) ?? null,
  };
}

/* ------------------------------------------------------------------ */
/* Creation eligibility                                                */
/* ------------------------------------------------------------------ */

export function creationCompany(ctx: DerivationContext, bundle: CompanyBundle): ClientCreationCompany {
  const usage = computeUsage(ctx, bundle);
  const record = usage.records.find((item) => item.resource === "clients");
  const limit = record?.effectiveLimit ?? null;
  const used = bundle.clients.length;
  const available = limit === null ? null : Math.max(0, limit - used);
  const { company, subscription } = bundle;

  const eligibility: ClientCreationCompany["eligibility"] =
    company.accountStatus !== "active"
      ? { ok: false, code: "company_not_active", reason: `${company.name} is ${company.accountStatus}. New clients cannot be created for it.` }
      : subscription.status === "expired" || subscription.status === "cancelled"
        ? { ok: false, code: "subscription_ended", reason: `${company.name}'s subscription is ${subscription.status}. Reactivate it before adding clients.` }
        : available === 0
          ? { ok: false, code: "limit_reached", reason: "Client limit reached for the selected company." }
          : { ok: true, code: "ok", reason: null };

  return {
    id: company.id,
    name: company.name,
    accountStatus: company.accountStatus,
    planName: planFor(ctx, subscription.planTier).name,
    clientsUsed: used,
    clientLimit: limit,
    availableSlots: available,
    eligibleMembers: bundle.users.filter((user) => user.status === "active").length,
    eligibility,
  };
}

/* ------------------------------------------------------------------ */
/* Listing                                                             */
/* ------------------------------------------------------------------ */

const RANGE_DAYS: Record<string, number> = { "7d": 7, "30d": 30, "90d": 90 };

function within(iso: string, days: number, now: number): boolean {
  return now - Date.parse(iso) <= days * DAY_MS;
}

export function filterClients(summaries: readonly ClientSummary[], query: ClientListQuery, now: number): ClientSummary[] {
  const term = (query.search ?? "").trim().toLowerCase();
  return summaries.filter((summary) => {
    if (term) {
      const fields = [summary.client.name, summary.profile.displayName, summary.client.id, summary.displayId, summary.company.name, ...summary.websites.map((site) => site.domain)];
      if (!fields.some((field) => field.toLowerCase().includes(term))) return false;
    }
    if (query.company && summary.company.id !== query.company) return false;
    if (query.workspace && summary.workspace !== query.workspace) return false;
    if (query.onboarding) {
      if (query.onboarding === "pending") {
        if (summary.onboarding.status === "completed" || summary.workspace === "archived") return false;
      } else if (summary.onboarding.status !== query.onboarding) return false;
    }
    if (query.health) {
      if (query.health === "at_risk") {
        if (summary.health.status !== "needs_attention" && summary.health.status !== "critical") return false;
      } else if (summary.health.status !== query.health) return false;
    }
    if (query.provider && !summary.connectedProviders.includes(query.provider as IntegrationProvider)) return false;
    if (query.website === "configured" && !summary.primaryWebsite) return false;
    if (query.website === "none" && summary.primaryWebsite) return false;
    if (query.team === "assigned" && summary.counts.activeMembers === 0) return false;
    if (query.team === "none" && summary.counts.activeMembers > 0) return false;

    if (query.created === "month" && Date.parse(summary.client.createdAt) < startOfMonth(0)) return false;
    const createdDays = query.created ? RANGE_DAYS[query.created] : undefined;
    if (createdDays !== undefined && !within(summary.client.createdAt, createdDays, now)) return false;
    if (query.lastActive) {
      const at = summary.lastActiveAt;
      if (query.lastActive === "24h" && !within(at, 1, now)) return false;
      if (query.lastActive === "7d" && !within(at, 7, now)) return false;
      if (query.lastActive === "30d" && !within(at, 30, now)) return false;
      if (query.lastActive === "dormant" && within(at, DORMANT_AFTER_DAYS, now)) return false;
    }
    return true;
  });
}

export function sortClients(summaries: readonly ClientSummary[], sort: ClientListQuery["sort"]): ClientSummary[] {
  const { field, direction } = sort ?? { field: "createdAt", direction: "desc" as const };
  const factor = direction === "asc" ? 1 : -1;
  const key = (summary: ClientSummary): number | string => {
    switch (field) {
      case "name":
        return summary.client.name.toLowerCase();
      case "company":
        return summary.company.name.toLowerCase();
      case "connections":
        return summary.counts.connections;
      case "issues":
        return summary.attention.length;
      case "lastActive":
        return Date.parse(summary.lastActiveAt);
      default:
        return Date.parse(summary.client.createdAt);
    }
  };
  return [...summaries].sort((a, b) => {
    const left = key(a);
    const right = key(b);
    const order = typeof left === "string" && typeof right === "string" ? left.localeCompare(right) : Number(left) - Number(right);
    return order * factor || a.client.name.localeCompare(b.client.name);
  });
}

export function paginate<T>(items: readonly T[], page: number, pageSize: number): { data: T[]; pagination: PaginationMeta } {
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const current = Math.min(Math.max(1, page), totalPages);
  const offset = (current - 1) * pageSize;
  return {
    data: items.slice(offset, offset + pageSize),
    pagination: { page: current, pageSize, total, totalPages, hasNextPage: current < totalPages, hasPreviousPage: current > 1 },
  };
}

export function applyClientListQuery(summaries: readonly ClientSummary[], query: ClientListQuery, now: number): ClientListResult {
  const filtered = sortClients(filterClients(summaries, query, now), query.sort);
  const { data, pagination } = paginate(filtered, query.page ?? 1, query.pageSize ?? APP.defaultPageSize);
  return { data, pagination, matchingIds: filtered.map((summary) => summary.client.id) };
}

export function computeClientPortfolio(summaries: readonly ClientSummary[]): ClientPortfolio {
  const monthStart = startOfMonth(0);
  const lastMonthStart = startOfMonth(-1);
  const workspace = { active: 0, paused: 0, archived: 0 };
  let newThisMonth = 0;
  let newLastMonth = 0;
  let connectedAccounts = 0;
  let healthyAccounts = 0;
  let onboardingPending = 0;
  let needsAttention = 0;
  let noTeam = 0;
  let noWebsite = 0;

  for (const summary of summaries) {
    workspace[summary.workspace] += 1;
    const created = Date.parse(summary.client.createdAt);
    if (created >= monthStart) newThisMonth += 1;
    else if (created >= lastMonthStart) newLastMonth += 1;

    connectedAccounts += summary.counts.connections;
    healthyAccounts += summary.counts.healthyConnections;
    if (summary.workspace === "archived") continue;
    if (summary.onboarding.status !== "completed") onboardingPending += 1;
    if (summary.health.status === "needs_attention" || summary.health.status === "critical") needsAttention += 1;
    if (summary.workspace === "active" && summary.counts.activeMembers === 0) noTeam += 1;
    if (!summary.primaryWebsite) noWebsite += 1;
  }

  return {
    total: summaries.length,
    companies: new Set(summaries.map((summary) => summary.company.id)).size,
    workspace,
    newThisMonth,
    newLastMonth,
    connectedAccounts,
    healthyAccounts,
    attentionAccounts: connectedAccounts - healthyAccounts,
    onboardingPending,
    needsAttention,
    noTeam,
    noWebsite,
  };
}

