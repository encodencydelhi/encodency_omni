import type { MetricDelta } from "@/types/common";
import type { NotificationSeverity } from "./notification";
import type { PlanTier } from "./plan";
import type { ServiceStatus } from "./system-health";
export const DASHBOARD_METRIC = {
  totalCompanies: "totalCompanies",
  totalUsers: "totalUsers",
  totalClients: "totalClients",
  activeSubscriptions: "activeSubscriptions",
  monthlyRevenue: "monthlyRevenue",
  connectedIntegrations: "connectedIntegrations",
  runningJobs: "runningJobs",
  systemUptime: "systemUptime",
} as const;

export type DashboardMetricKey = keyof typeof DASHBOARD_METRIC;
export type MetricFormat = "count" | "currency" | "percent";

export interface DashboardMetric {
  key: DashboardMetricKey;
  value: number;
  format: MetricFormat;
  currency?: string;
  delta: MetricDelta | null;
  /** Supporting line beneath the value, e.g. "+ 8 new this month". */
  hint: string;
  /** Optional sparkline series data for the metric. */
  series?: number[];
}

/** A single actionable item in the "Needs Attention" panel. */
export interface AttentionItem {
  id: string;
  title: string;
  detail: string;
  severity: NotificationSeverity;
  count: number;
  /** Where an admin goes to resolve it. */
  href: string;
  actionLabel: string;
  raisedAt: string;
}

/** Activity entry types, each with its own icon in the feed. */
export const ACTIVITY_KIND = {
  company_registered: "company_registered",
  plan_upgraded: "plan_upgraded",
  user_invited: "user_invited",
  integration_connected: "integration_connected",
  ticket_opened: "ticket_opened",
  payment_failed: "payment_failed",
} as const;

export type ActivityKind = keyof typeof ACTIVITY_KIND;

export interface DashboardActivity {
  id: string;
  kind: ActivityKind;
  title: string;
  detail: string;
  createdAt: string;
}

/** A named point on a monthly bar or line chart. */
export interface MonthlyPoint {
  month: string;
  value: number;
}

export interface PlatformHealthEntry {
  id: string;
  label: string;
  status: ServiceStatus;
}

export interface LatestSignup {
  id: string;
  name: string;
  timeAgo: string;
  tier: PlanTier | "trial";
}

export interface ApiUsageSnapshot {
  totalRequests: number;
  requestDelta: MetricDelta;
  successRate: number;
  failedRequests: number;
  avgResponseMs: number;
  series: number[];
}

export interface IntegrationStatusItem {
  id: string;
  name: string;
  status: "Connected" | "Error";
}

export interface DashboardSnapshot {
  generatedAt: string;
  metrics: DashboardMetric[];
  attention: AttentionItem[];

  companyGrowth: {
    total: number;
    series: MonthlyPoint[];
  };
  revenue: {
    mrrMinor: number;
    currency: string;
    series: MonthlyPoint[];
  };
  subscriptionDistribution: {
    activeTotal: number;
    segments: Array<{ tier: PlanTier; label: string; companies: number }>;
  };

  recentActivity: DashboardActivity[];
  platformHealth: PlatformHealthEntry[];

  latestSignups: LatestSignup[];
  apiUsage: ApiUsageSnapshot;
  integrationStatus: IntegrationStatusItem[];
}
