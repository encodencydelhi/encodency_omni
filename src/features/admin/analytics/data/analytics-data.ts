import type { MetricDelta } from "@/types/common";
import type { ActivityItem } from "@/types/admin";
import type { MonthlyPoint } from "@/types/domain/dashboard";
import type { DonutSegment } from "@/components/shared/charts/donut-chart";
import type { TrendSeries } from "@/components/shared/charts/trend-area-chart";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export interface KpiCard {
  label: string;
  value: string;
  delta: MetricDelta | null;
  comparisonLabel?: string;
  hint?: string;
}

export interface CampaignPerformanceRow {
  name: string;
  status: string;
  channels: string;
  spend: string;
  leads: number;
  conversions: number;
  roi: string;
}

export interface KeywordRow {
  keyword: string;
  position: number;
  change: string;
  volume: string;
  trend: "up" | "down" | "stable";
}

export interface TopPageRow {
  path: string;
  clicks: string;
  trend: string;
}

export interface TechnicalIssue {
  issue: string;
  type: string;
  pages: number;
  priority: string;
}

export interface PipelineStageData {
  label: string;
  count: number;
  value: string;
}

export interface RecentLeadRow {
  name: string;
  source: string;
  project: string;
  stage: string;
  assignedTo: string;
  date: string;
}

export interface TeamPerfRow {
  name: string;
  leads: number;
  conversions: number;
  responseTime: string;
}

export interface WorkflowPerfRow {
  name: string;
  status: string;
  runs: number;
  successRate: number;
  lastRun: string;
  channel: string;
}

export interface RunRecordRow {
  id: string;
  workflow: string;
  status: string;
  trigger: string;
  duration: string;
  time: string;
}

export interface QueueStatusItem {
  label: string;
  count: number;
  status: "healthy" | "warning" | "critical";
}

export interface ChannelDeepDive {
  kpis: KpiCard[];
  trend: TrendSeries[];
  topContent: { title: string; metric: string; value: string }[];
}

export interface AnalyticsDashboardData {
  overview: {
    kpis: KpiCard[];
    trend: TrendSeries[];
    channels: DonutSegment[];
    topCampaigns: { name: string; leads: number; conversions: number; score: number }[];
    activity: ActivityItem[];
  };
  channels: {
    meta: ChannelDeepDive;
    youtube: ChannelDeepDive;
    x: ChannelDeepDive;
    whatsapp: ChannelDeepDive;
    gmb: ChannelDeepDive;
    website: ChannelDeepDive;
  };
  campaigns: {
    summary: KpiCard[];
    list: CampaignPerformanceRow[];
    spendTrend: MonthlyPoint[];
    channelRoi: DonutSegment[];
    funnel: { label: string; value: number; pct: string }[];
  };
  seo: {
    kpis: KpiCard[];
    keywords: KeywordRow[];
    trend: TrendSeries[];
    technical: { issues: TechnicalIssue[]; score: number };
    topPages: TopPageRow[];
  };
  crm: {
    pipeline: PipelineStageData[];
    sources: DonutSegment[];
    leadsTrend: TrendSeries[];
    recentLeads: RecentLeadRow[];
    team: TeamPerfRow[];
  };
  automation: {
    kpis: KpiCard[];
    successTrend: MonthlyPoint[];
    workflows: WorkflowPerfRow[];
    runs: RunRecordRow[];
    queues: QueueStatusItem[];
  };
}
