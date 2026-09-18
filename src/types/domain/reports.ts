import type { MetricDelta } from "@/types/common";

export type ReportChannel = "meta" | "linkedin" | "youtube" | "whatsapp" | "x" | "google_business" | "website";
export type ReportSection = "executive_summary" | "seo" | "meta" | "linkedin" | "google_business" | "youtube" | "whatsapp" | "website" | "leads" | "campaigns" | "x";
export type ReportFormat = "pdf" | "csv" | "excel";
export type ReportFrequency = "daily" | "weekly" | "biweekly" | "monthly" | "quarterly";
export type ReportStatus = "sent" | "failed" | "pending";
export type ReportScheduleStatus = "active" | "paused";

export interface ReportKpi {
  label: string;
  value: string;
  delta: MetricDelta | null;
  hint: string;
}

export interface ChannelPerformance {
  channel: ReportChannel;
  channelLabel: string;
  reach: number;
  impressions: number;
  engagement: number;
  engagementRate: number;
  clicks: number;
  leads: number;
  spend: number;
  roi: number;
  trend: number;
}

export interface PerformancePoint {
  date: string;
  reach: number;
  engagement: number;
  leads: number;
  conversions: number;
}

export interface TopContent {
  id: string;
  title: string;
  channel: ReportChannel;
  channelLabel: string;
  impressions: number;
  engagement: number;
  clicks: number;
  postedAt: string;
}

export interface CampaignReportRow {
  id: string;
  name: string;
  channel: ReportChannel;
  channelLabel: string;
  status: "active" | "paused" | "completed";
  budget: number;
  spend: number;
  impressions: number;
  clicks: number;
  leads: number;
  conversions: number;
  cpl: number;
  roas: number;
}

export interface LeadSourceBreakdown {
  channel: ReportChannel;
  channelLabel: string;
  leads: number;
  percentage: number;
  conversionRate: number;
}

export interface PipelineStage {
  stage: string;
  count: number;
  percentage: number;
}

export interface RevenueAttribution {
  channel: ReportChannel;
  channelLabel: string;
  revenue: number;
  spend: number;
  roi: number;
}

export interface ReportHistoryRow {
  id: string;
  name: string;
  period: string;
  generatedAt: string;
  size: string;
  format: ReportFormat;
  status: ReportStatus;
  sections: ReportSection[];
}

export interface ScheduledReport {
  id: string;
  name: string;
  type: string;
  frequency: ReportFrequency;
  recipients: number;
  nextRun: string;
  format: ReportFormat;
  active: boolean;
}

export interface ReportRecipient {
  id: string;
  name: string;
  email: string;
  role: string;
  reportCount: number;
}

export interface ReportTemplate {
  id: string;
  name: string;
  detail: string;
  sections: ReportSection[];
  format: ReportFormat;
}

export interface ReportsDashboard {
  kpis: ReportKpi[];
  channelPerformance: ChannelPerformance[];
  performanceTrend: PerformancePoint[];
  topContent: TopContent[];
  campaignReports: CampaignReportRow[];
  leadSources: LeadSourceBreakdown[];
  pipeline: PipelineStage[];
  revenueAttribution: RevenueAttribution[];
  reportHistory: ReportHistoryRow[];
  scheduledReports: ScheduledReport[];
  recipients: ReportRecipient[];
  templates: ReportTemplate[];
}
