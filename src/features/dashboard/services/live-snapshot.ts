import type { MetricDelta } from "@/types/common";
import type { AttentionItem, DashboardMetric, DashboardSnapshot, MonthlyPoint } from "@/types/domain/dashboard";
import { formatRelativeTime } from "@/lib/utils/format";
import type { SuperAdminOverviewResponse } from "../live/overview-api";

export interface LiveJobsStats {
  queues: Array<{ queue: string; reachable: boolean; counts?: { active: number; failed: number; waiting: number } }>;
}

/** `2026-10` -> `Oct` (the chart axes are short month names). */
export function monthLabel(key: string): string {
  const [year, month] = key.split("-").map(Number);
  if (!year || !month) return key;
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleString("en-US", { month: "short", timeZone: "UTC" });
}

function delta(percent: number | null): MetricDelta | null {
  return percent === null ? null : { changePercent: percent, direction: "up-is-good" };
}

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/**
 * Builds the dashboard from the platform's real aggregates. Nothing here is invented: a tile the backend cannot
 * measure yet (system uptime history) is simply not part of the snapshot.
 */
export function buildLiveSnapshot(overview: SuperAdminOverviewResponse, jobs: LiveJobsStats | null): DashboardSnapshot {
  const m = overview.metrics;
  const reachable = jobs?.queues.filter((q) => q.reachable) ?? [];
  const runningJobs = reachable.reduce((n, q) => n + (q.counts?.active ?? 0), 0);
  const failedJobs = reachable.reduce((n, q) => n + (q.counts?.failed ?? 0), 0);

  const metrics: DashboardMetric[] = [
    { key: "totalCompanies", value: m.companies.total, format: "count", delta: delta(m.companies.changePercent), hint: `${m.companies.newInRange} new in this period · ${m.companies.active} active`, isLive: true },
    { key: "totalUsers", value: m.users.total, format: "count", delta: delta(m.users.changePercent), hint: `${m.users.newInRange} new in this period · ${m.users.deactivated} deactivated`, isLive: true },
    { key: "totalClients", value: m.clients.total, format: "count", delta: delta(m.clients.changePercent), hint: `${m.clients.newInRange} new in this period`, isLive: true },
    { key: "activeSubscriptions", value: m.subscriptions.active, format: "count", delta: null, hint: m.subscriptions.pastDue > 0 ? `${m.subscriptions.pastDue} past due` : "None past due", isLive: true },
    { key: "monthlyRevenue", value: m.mrr.amountMinor, format: "currency", currency: m.mrr.currency, delta: null, hint: `From ${plural(m.subscriptions.active, "active subscription")} at current plan prices`, isLive: true },
    { key: "connectedIntegrations", value: m.integrations.connected, format: "count", delta: null, hint: m.integrations.needAttention > 0 ? `${m.integrations.needAttention} need attention` : "All connections healthy", isLive: true },
  ];
  metrics.push({ key: "openIncidents", value: m.incidents.open, format: "count", delta: null, hint: m.incidents.open > 0 ? "Not yet resolved in System Health" : "No open incidents", isLive: true });
  if (jobs) {
    metrics.push({
      key: "runningJobs",
      value: runningJobs,
      format: "count",
      delta: null,
      hint: `${plural(reachable.length, "queue")} reachable${failedJobs > 0 ? ` · ${failedJobs} failed` : ""}`,
      isLive: true,
    });
  }

  const attention: AttentionItem[] = overview.attention.map((item) => ({ ...item, raisedAt: overview.generatedAt }));
  if (failedJobs > 0) {
    attention.push({ id: "att_failed_jobs", title: "Failed background jobs", detail: `${plural(failedJobs, "job")} failed in the queues`, severity: "warning", count: failedJobs, href: "/super-admin/jobs?tab=failures", actionLabel: "Review failures", raisedAt: overview.generatedAt });
  }

  const series = (points: Array<{ month: string; value: number }>): MonthlyPoint[] => points.map((p) => ({ month: monthLabel(p.month), value: p.value }));

  return {
    generatedAt: overview.generatedAt,
    metrics,
    attention,
    companyGrowth: { total: overview.companyGrowth.total, series: series(overview.companyGrowth.series) },
    revenue: { mrrMinor: overview.revenue.mrrMinor, currency: overview.revenue.currency, series: series(overview.revenue.collectedSeries) },
    subscriptionDistribution: {
      activeTotal: overview.subscriptionDistribution.activeTotal,
      segments: overview.subscriptionDistribution.segments.map((s) => ({ tier: s.key, label: s.label, companies: s.companies })),
    },
    recentActivity: overview.recentActivity.map((a) => ({
      id: a.id,
      kind: a.kind,
      title: a.title,
      detail: `${a.actor}${a.companyName ? ` · ${a.companyName}` : ""}${a.outcome === "FAILURE" ? " · failed" : ""}`,
      createdAt: a.createdAt,
    })),
    platformHealth: [],
    latestSignups: overview.latestSignups.map((s) => ({ id: s.id, name: s.name, timeAgo: formatRelativeTime(s.createdAt), tier: s.plan ?? "No plan" })),
    apiUsage: {
      totalRequests: overview.apiUsage.totalRequests,
      requestDelta: delta(overview.apiUsage.changePercent),
      successRate: overview.apiUsage.successRate,
      failedRequests: overview.apiUsage.failedRequests,
      avgResponseMs: overview.apiUsage.avgResponseMs,
      series: overview.apiUsage.series,
    },
    integrationStatus: overview.integrationStatus.map((i) => ({ id: i.id, name: i.name, status: i.status })),
  };
}

export const EMPTY_SNAPSHOT: DashboardSnapshot = {
  generatedAt: "",
  metrics: [],
  attention: [],
  companyGrowth: { total: 0, series: [] },
  revenue: { mrrMinor: 0, currency: "INR", series: [] },
  subscriptionDistribution: { activeTotal: 0, segments: [] },
  recentActivity: [],
  platformHealth: [],
  latestSignups: [],
  apiUsage: { totalRequests: 0, requestDelta: null, successRate: null, failedRequests: 0, avgResponseMs: null, series: [] },
  integrationStatus: [],
};
