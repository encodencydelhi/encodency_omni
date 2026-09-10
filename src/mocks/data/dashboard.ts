import { ROUTES } from "@/config/routes";
import { PLAN_TIER, type PlanTier } from "@/types/domain/plan";
import type {
  AttentionItem,
  DashboardActivity,
  DashboardSnapshot,
  MonthlyPoint,
  PlatformHealthEntry,
} from "@/types/domain/dashboard";
import { createRng, minutesAgo } from "../lib/random";
import { REVENUE_SUMMARY, SUBSCRIPTIONS } from "./commerce";
import { AUDIT_LOG, SUPPORT_TICKETS } from "./control";
import { SYSTEM_HEALTH } from "./platform-health";
import { JOBS, QUEUE_STATS } from "./platform-ops";
import { ALL_COMPANY_INTEGRATIONS, COMPANIES, PLATFORM_USERS, Clients } from "./tenants";
import { PLATFORM_USAGE } from "./usage";

const PLAN_TIERS = Object.keys(PLAN_TIER) as PlanTier[];

/**
 * The "Needs Attention" list is derived from the same records the detail pages
 * read, so every item is verifiable by clicking through to its module.
 */
function buildAttentionItems(): AttentionItem[] {
  const items: AttentionItem[] = [];

  const companiesWithDisconnects = COMPANIES.filter(
    (company) => company.channels.disconnected > 0,
  ).length;

  if (companiesWithDisconnects > 0) {
    items.push({
      id: "att_integrations",
      title: `${companiesWithDisconnects} companies have disconnected integrations`,
      detail: "Publishing and analytics sync are stalled for the affected Clients.",
      severity: "critical",
      count: companiesWithDisconnects,
      href: ROUTES.superAdmin.integrations,
      actionLabel: "Review integrations",
      raisedAt: minutesAgo(120),
    });
  }

  const failedJobs = JOBS.filter((job) => job.status === "failed").length;
  if (failedJobs > 0) {
    items.push({
      id: "att_failed_jobs",
      title: `${failedJobs} failed background jobs`,
      detail: "Most failures are upstream rate limits and expired access tokens.",
      severity: "critical",
      count: failedJobs,
      href: ROUTES.superAdmin.jobs,
      actionLabel: "Open job queue",
      raisedAt: minutesAgo(240),
    });
  }

  if (REVENUE_SUMMARY.failedPaymentsCount > 0) {
    items.push({
      id: "att_payments",
      title: `${REVENUE_SUMMARY.failedPaymentsCount} payment failures`,
      detail: "Affected subscriptions enter the dunning grace period automatically.",
      severity: "warning",
      count: REVENUE_SUMMARY.failedPaymentsCount,
      href: ROUTES.superAdmin.billing,
      actionLabel: "Review billing",
      raisedAt: minutesAgo(360),
    });
  }

  const expiringTokens = ALL_COMPANY_INTEGRATIONS.filter(
    (integration) => integration.status === "token_expiring",
  ).length;

  if (expiringTokens > 0) {
    items.push({
      id: "att_tokens",
      title: `${expiringTokens} access tokens expiring within 14 days`,
      detail: "Customers must re-authorise before the token lapses to avoid gaps.",
      severity: "warning",
      count: expiringTokens,
      href: ROUTES.superAdmin.integrations,
      actionLabel: "See affected accounts",
      raisedAt: minutesAgo(480),
    });
  }

  for (const queue of QUEUE_STATS.filter((entry) => entry.isPaused)) {
    items.push({
      id: `att_queue_${queue.queue}`,
      title: "SEO crawler worker latency high",
      detail: `${queue.queued} jobs are waiting and the backlog is growing.`,
      severity: "warning",
      count: queue.queued,
      href: ROUTES.superAdmin.jobs,
      actionLabel: "Resume queue",
      raisedAt: minutesAgo(720),
    });
  }

  const breachedTickets = SUPPORT_TICKETS.filter(
    (ticket) => (ticket.slaMinutesRemaining ?? 0) < 0 && ticket.status !== "resolved",
  ).length;

  if (breachedTickets > 0) {
    items.push({
      id: "att_sla",
      title: `${breachedTickets} support tickets have breached SLA`,
      detail: "Urgent and high priority tickets are counted first.",
      severity: "warning",
      count: breachedTickets,
      href: ROUTES.superAdmin.support,
      actionLabel: "Open support queue",
      raisedAt: minutesAgo(900),
    });
  }

  return items;
}

const MONTH_LABELS = ["Apr", "May", "Jun", "Jul", "Aug", "Sep"] as const;

/** Six months of history ending at the current total. */
function buildMonthlySeries(total: number, startRatio: number): MonthlyPoint[] {
  const rng = createRng(141000 + Math.round(total));

  return MONTH_LABELS.map((month, index) => {
    const progress = index / (MONTH_LABELS.length - 1);
    const base = total * (startRatio + (1 - startRatio) * progress);
    const jitter = base * 0.035 * (rng.next() * 2 - 1);
    return { month, value: Math.max(0, Math.round(base + jitter)) };
  });
}

const ACTIVITY_SEEDS: Array<Omit<DashboardActivity, "id">> = [
  {
    kind: "company_registered",
    title: "New company registered",
    detail: "Sunrise Charitable Foundation",
    createdAt: minutesAgo(10),
  },
  {
    kind: "plan_upgraded",
    title: "Plan upgraded",
    detail: "Namo Gange Trust → Agency",
    createdAt: minutesAgo(60),
  },
  {
    kind: "user_invited",
    title: "User invited",
    detail: "rahul@mokshasewa.org",
    createdAt: minutesAgo(120),
  },
  {
    kind: "integration_connected",
    title: "Integration connected",
    detail: "Meta · Moksha Sewa",
    createdAt: minutesAgo(180),
  },
  {
    kind: "ticket_opened",
    title: "New support ticket",
    detail: "SUP-4218 · Analytics sync issue",
    createdAt: minutesAgo(300),
  },
  {
    kind: "payment_failed",
    title: "Payment failed",
    detail: "Blue Harbour Logistics · card declined",
    createdAt: minutesAgo(420),
  },
];

/** Platform health, taken straight from the infrastructure snapshot. */
function buildPlatformHealth(): PlatformHealthEntry[] {
  const wanted = [
    "svc_api",
    "svc_db",
    "svc_redis",
    "svc_workers",
    "svc_crawler",
    "svc_analytics",
    "svc_webhooks",
  ];

  return wanted.flatMap((id) => {
    const component = SYSTEM_HEALTH.components.find((entry) => entry.id === id);
    return component ? [{ id: component.id, label: component.name, status: component.status }] : [];
  });
}

function buildSnapshot(): DashboardSnapshot {
  const activeSubscriptions = SUBSCRIPTIONS.filter(
    (subscription) => subscription.status === "active" || subscription.status === "trial",
  );
  const trialCount = SUBSCRIPTIONS.filter((subscription) => subscription.status === "trial").length;

  const connectedIntegrations = ALL_COMPANY_INTEGRATIONS.filter(
    (integration) => integration.status !== "disconnected",
  ).length;

  const runningJobs = JOBS.filter(
    (job) => job.status === "processing" || job.status === "queued",
  ).length;
  const failedJobs = JOBS.filter((job) => job.status === "failed").length;
  const retryingJobs = JOBS.filter((job) => job.status === "retrying").length;

  const uptime =
    SYSTEM_HEALTH.components.reduce((total, component) => total + component.uptimePercent, 0) /
    Math.max(SYSTEM_HEALTH.components.length, 1);

  const newCompaniesThisMonth = 8;
  const newUsersThisMonth = 226;
  const newClientsThisMonth = 38;

  return {
    generatedAt: minutesAgo(2),

    metrics: [
      {
        key: "totalCompanies",
        value: COMPANIES.length,
        format: "count",
        delta: { changePercent: 12, direction: "up-is-good" },
        hint: `+ ${newCompaniesThisMonth} new this month`,
        series: Array.from({ length: 14 }, () => Math.random() * 100),
      },
      {
        key: "totalUsers",
        value: PLATFORM_USERS.length,
        format: "count",
        delta: { changePercent: 18, direction: "up-is-good" },
        hint: `+ ${newUsersThisMonth} new this month`,
        series: Array.from({ length: 14 }, () => Math.random() * 100),
      },
      {
        key: "totalClients",
        value: Clients.length,
        format: "count",
        delta: { changePercent: 10, direction: "up-is-good" },
        hint: `+ ${newClientsThisMonth} new this month`,
        series: Array.from({ length: 14 }, () => Math.random() * 100),
      },
      {
        key: "activeSubscriptions",
        value: activeSubscriptions.length,
        format: "count",
        delta: { changePercent: 6, direction: "up-is-good" },
        hint: `${trialCount} on trial`,
        series: Array.from({ length: 14 }, () => Math.random() * 100),
      },
      {
        key: "monthlyRevenue",
        value: REVENUE_SUMMARY.mrrMinor,
        format: "currency",
        currency: REVENUE_SUMMARY.currency,
        delta: { changePercent: REVENUE_SUMMARY.mrrChangePercent, direction: "up-is-good" },
        hint: "Recurring, excluding overage",
        series: Array.from({ length: 14 }, () => Math.random() * 100),
      },
      {
        key: "connectedIntegrations",
        value: connectedIntegrations,
        format: "count",
        delta: { changePercent: 9, direction: "up-is-good" },
        hint: "Across all platforms",
        series: Array.from({ length: 14 }, () => Math.random() * 100),
      },
      {
        key: "runningJobs",
        value: runningJobs,
        format: "count",
        delta: { changePercent: 35, direction: "down-is-good" },
        hint: `${failedJobs} failed | ${retryingJobs} retrying`,
        series: Array.from({ length: 14 }, () => Math.random() * 100),
      },
      {
        key: "systemUptime",
        value: Number(uptime.toFixed(2)),
        format: "percent",
        delta: { changePercent: 0.02, direction: "up-is-good" },
        hint: "Last 30 days",
        series: Array.from({ length: 14 }, () => Math.random() * 100).map(() => 99 + Math.random()),
      },
    ],

    attention: buildAttentionItems(),

    companyGrowth: {
      total: COMPANIES.length,
      series: buildMonthlySeries(COMPANIES.length, 0.55),
    },

    revenue: {
      mrrMinor: REVENUE_SUMMARY.mrrMinor,
      currency: REVENUE_SUMMARY.currency,
      series: buildMonthlySeries(Math.round(REVENUE_SUMMARY.mrrMinor / 100), 0.48),
    },

    subscriptionDistribution: {
      activeTotal: activeSubscriptions.length,
      segments: PLAN_TIERS.map((tier) => ({
        tier,
        label: PLAN_TIER[tier].label,
        companies: activeSubscriptions.filter((subscription) => subscription.planTier === tier).length,
      })),
    },

    recentActivity: ACTIVITY_SEEDS.map((seed, index) => ({
      id: `act_${index + 1}`,
      ...seed,
    })),

    platformHealth: buildPlatformHealth(),

    latestSignups: [
      { id: "ls1", name: "Green Earth Foundation", timeAgo: "2 hours ago", tier: "trial" },
      { id: "ls2", name: "Namo Gange Trust", timeAgo: "4 hours ago", tier: "growth" },
      { id: "ls3", name: "Skyline EdTech", timeAgo: "6 hours ago", tier: "agency" },
      { id: "ls4", name: "HealthPlus Labs", timeAgo: "12 hours ago", tier: "starter" },
      { id: "ls5", name: "PixelForge Studio", timeAgo: "1 day ago", tier: "growth" },
    ],

    apiUsage: {
      totalRequests: 48250,
      requestDelta: { changePercent: 22, direction: "up-is-good" },
      successRate: 99.4,
      failedRequests: 285,
      avgResponseMs: 342,
      series: [4, 6, 5, 8, 7, 9, 10, 8, 11, 14, 12, 16, 15, 18, 17, 20],
    },

    integrationStatus: [
      { id: "is1", name: "Google Workspace", status: "Connected" },
      { id: "is2", name: "Slack", status: "Connected" },
      { id: "is3", name: "Microsoft", status: "Connected" },
      { id: "is4", name: "HubSpot", status: "Error" },
      { id: "is5", name: "Zoom", status: "Connected" },
    ],
  };
}

export const DASHBOARD_SNAPSHOT: DashboardSnapshot = buildSnapshot();

/** Company activity feed used on the company detail page. */
export function buildCompanyActivity(companyId: string) {
  return AUDIT_LOG.filter((entry) => entry.company?.id === companyId)
    .slice(0, 12)
    .map((entry) => ({
      id: entry.id,
      actor: entry.actor.name,
      action: entry.action,
      target: entry.resource.label,
      createdAt: entry.createdAt,
    }));
}

/** Highlights reused by the usage module's summary strip. */
export const USAGE_HIGHLIGHTS = PLATFORM_USAGE.records
  .filter((record) => record.limit !== null)
  .sort((a, b) => b.percentUsed - a.percentUsed)
  .slice(0, 4);
