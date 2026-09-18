import type { MetricDelta } from "@/types/common";
import type { AdminDashboardSnapshot, ActivityItem } from "@/types/admin";
import type { MonthlyPoint } from "@/types/domain/dashboard";
import type { DonutSegment } from "@/components/shared/charts/donut-chart";
import type { TrendSeries } from "@/components/shared/charts/trend-area-chart";
import { adminDashboardByScope } from "@/mocks/admin/admin-dashboard.mock";

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
  rating: number;
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

/* ------------------------------------------------------------------ */
/* Dashboard snapshot (cross-channel source)                           */
/* ------------------------------------------------------------------ */

const dash: AdminDashboardSnapshot = adminDashboardByScope["all"]!;

/* ------------------------------------------------------------------ */
/* Assemble data                                                       */
/* ------------------------------------------------------------------ */

const overviewTrend: TrendSeries[] = [
  {
    key: "leads",
    label: "Leads",
    color: "#EB0711",
    data: dash.trend.map((t) => ({ date: t.label, value: t.leads })),
  },
  {
    key: "visits",
    label: "Visits",
    color: "#2563EB",
    data: dash.trend.map((t) => ({ date: t.label, value: t.visits })),
  },
  {
    key: "reach",
    label: "Reach",
    color: "#078359",
    data: dash.trend.map((t) => ({ date: t.label, value: t.reach })),
  },
];

const channelDonut: DonutSegment[] = [
  { key: "meta", label: "Meta & Instagram", value: 46, color: "#0866FF" },
  { key: "gmb", label: "Google Business", value: 18, color: "#4285F4" },
  { key: "whatsapp", label: "WhatsApp", value: 16, color: "#25D366" },
  { key: "linkedin", label: "LinkedIn", value: 11, color: "#0A66C2" },
  { key: "youtube", label: "YouTube", value: 9, color: "#FF0000" },
];

const campaignSpendTrend: MonthlyPoint[] = [
  { month: "Apr", value: 48250 },
  { month: "May", value: 52400 },
  { month: "Jun", value: 41800 },
  { month: "Jul", value: 56900 },
  { month: "Aug", value: 62300 },
  { month: "Sep", value: 48250 },
];

const campaignList: CampaignPerformanceRow[] = [
  { name: "Clean Ganga Awareness - Delhi NCR", status: "Active", channels: "Meta, Instagram", spend: "₹28,540", leads: 286, conversions: 42, roi: "4.8x" },
  { name: "Volunteer Drive Retargeting", status: "Active", channels: "Instagram", spend: "₹18,920", leads: 342, conversions: 56, roi: "5.2x" },
  { name: "World Rivers Day 2026", status: "Active", channels: "Meta, Instagram", spend: "₹21,430", leads: 198, conversions: 34, roi: "3.6x" },
  { name: "Donate for a Cleaner Ganga", status: "Completed", channels: "Facebook", spend: "₹32,114", leads: 412, conversions: 68, roi: "6.1x" },
  { name: "Ghat Cleanup Volunteers", status: "Paused", channels: "Meta, Instagram", spend: "₹9,145", leads: 104, conversions: 18, roi: "2.4x" },
];

const campaignFunnel = [
  { label: "Impressions", value: 592750, pct: "100%" },
  { label: "Clicks", value: 15639, pct: "2.6%" },
  { label: "Leads", value: 1342, pct: "8.6%" },
  { label: "Conversions", value: 218, pct: "16.2%" },
];

const campaignChannelRoi: DonutSegment[] = [
  { key: "meta", label: "Meta & Instagram", value: 45, color: "#0866FF" },
  { key: "whatsapp", label: "WhatsApp", value: 25, color: "#25D366" },
  { key: "google", label: "Google Business", value: 18, color: "#4285F4" },
  { key: "youtube", label: "YouTube", value: 12, color: "#FF0000" },
];

const seoKeywords: KeywordRow[] = [
  { keyword: "clean ganga", position: 3, change: "+12", volume: "4,400", trend: "up" },
  { keyword: "ganga river conservation", position: 5, change: "+8", volume: "2,900", trend: "up" },
  { keyword: "water pollution control", position: 7, change: "+6", volume: "1,600", trend: "up" },
  { keyword: "ngo in delhi", position: 9, change: "+5", volume: "1,300", trend: "up" },
  { keyword: "river cleaning initiative", position: 11, change: "+4", volume: "880", trend: "up" },
  { keyword: "ganga aarti schedule", position: 14, change: "-2", volume: "720", trend: "down" },
  { keyword: "volunteer for river clean", position: 16, change: "+3", volume: "590", trend: "up" },
  { keyword: "save rivers campaign", position: 19, change: "0", volume: "480", trend: "stable" },
];

const seoTrend: TrendSeries[] = [
  {
    key: "clicks",
    label: "Clicks",
    color: "#2563EB",
    data: [
      { date: "Mar 15", value: 12000 },
      { date: "Mar 20", value: 15000 },
      { date: "Mar 25", value: 18000 },
      { date: "Mar 30", value: 22000 },
      { date: "Apr 5", value: 25000 },
      { date: "Apr 10", value: 28000 },
      { date: "Apr 14", value: 31000 },
    ],
  },
  {
    key: "impressions",
    label: "Impressions",
    color: "#8B5CF6",
    data: [
      { date: "Mar 15", value: 200000 },
      { date: "Mar 20", value: 220000 },
      { date: "Mar 25", value: 250000 },
      { date: "Mar 30", value: 300000 },
      { date: "Apr 5", value: 320000 },
      { date: "Apr 10", value: 350000 },
      { date: "Apr 14", value: 480000 },
    ],
  },
];

const seoIssues: TechnicalIssue[] = [
  { issue: "Missing meta descriptions", type: "On-Page", pages: 12, priority: "High" },
  { issue: "Images without alt text", type: "On-Page", pages: 28, priority: "High" },
  { issue: "Slow LCP (> 2.5s)", type: "Performance", pages: 8, priority: "Medium" },
  { issue: "Duplicate title tags", type: "On-Page", pages: 4, priority: "Medium" },
  { issue: "Broken internal links", type: "Technical", pages: 6, priority: "Low" },
];

const seoTopPages: TopPageRow[] = [
  { path: "/", clicks: "4,820", trend: "+22%" },
  { path: "/about-us", clicks: "1,940", trend: "+18%" },
  { path: "/our-work", clicks: "1,532", trend: "+35%" },
  { path: "/blog/clean-ganga-initiative", clicks: "1,220", trend: "+28%" },
  { path: "/contact", clicks: "980", trend: "+12%" },
];

const crmPipeline: PipelineStageData[] = [
  { label: "New", count: 84, value: "84 leads" },
  { label: "Contacted", count: 62, value: "62 leads" },
  { label: "Qualified", count: 41, value: "41 leads" },
  { label: "Proposal", count: 28, value: "28 leads" },
  { label: "Closed Won", count: 18, value: "18 leads" },
];

const crmSources: DonutSegment[] = [
  { key: "website", label: "Website", value: 32, color: "#2563EB" },
  { key: "meta", label: "Meta Ads", value: 28, color: "#0866FF" },
  { key: "google", label: "Google Business", value: 18, color: "#4285F4" },
  { key: "whatsapp", label: "WhatsApp", value: 12, color: "#25D366" },
  { key: "referral", label: "Referral", value: 10, color: "#8B5CF6" },
];

const crmLeadsTrend: TrendSeries[] = [
  {
    key: "leads",
    label: "Leads",
    color: "#EB0711",
    data: dash.trend.map((t) => ({ date: t.label, value: t.leads })),
  },
  {
    key: "conversions",
    label: "Conversions",
    color: "#078359",
    data: dash.trend.map((t) => ({ date: t.label, value: t.conversions })),
  },
];

const recentLeads: RecentLeadRow[] = [
  { name: "Rahul Mehta", source: "Website", project: "Moksha Sewa", stage: "New", assignedTo: "Priya Sharma", date: "Apr 14, 2025" },
  { name: "Priya Sharma", source: "Instagram", project: "Ganga Explorer", stage: "Contacted", assignedTo: "Amit Singh", date: "Apr 14, 2025" },
  { name: "Amit Singh", source: "Facebook", project: "Ganga Drive", stage: "Qualified", assignedTo: "Neha Verma", date: "Apr 14, 2025" },
  { name: "Neha Verma", source: "Website", project: "Namo Gange Trust", stage: "Proposal", assignedTo: "Rohit Kumar", date: "Apr 13, 2025" },
  { name: "Vikram Patel", source: "LinkedIn", project: "Moksha Sewa", stage: "New", assignedTo: "Priya Sharma", date: "Apr 12, 2025" },
];

const teamPerf: TeamPerfRow[] = [
  { name: "Priya Sharma", leads: 48, conversions: 12, responseTime: "18 min", rating: 4.8 },
  { name: "Amit Singh", leads: 42, conversions: 10, responseTime: "22 min", rating: 4.6 },
  { name: "Neha Verma", leads: 36, conversions: 8, responseTime: "25 min", rating: 4.5 },
  { name: "Rohit Kumar", leads: 32, conversions: 9, responseTime: "20 min", rating: 4.7 },
];

const automationWorkflows: WorkflowPerfRow[] = [
  { name: "New Meta Lead Follow-up", status: "Active", runs: 1248, successRate: 98.4, lastRun: "12 min ago", channel: "Meta, WhatsApp" },
  { name: "Google Review Alert", status: "Active", runs: 428, successRate: 100, lastRun: "45 min ago", channel: "Google Business" },
  { name: "WhatsApp Re-engagement", status: "Paused", runs: 316, successRate: 91.8, lastRun: "3 days ago", channel: "WhatsApp" },
  { name: "Website Down Alert", status: "Error", runs: 12, successRate: 85, lastRun: "5 min ago", channel: "Website" },
];

const automationRuns: RunRecordRow[] = [
  { id: "run_8f3a", workflow: "New Meta Lead Follow-up", status: "Successful", trigger: "Meta Lead (Rahul Sharma)", duration: "450ms", time: "12 min ago" },
  { id: "run_7c9d", workflow: "New Meta Lead Follow-up", status: "Failed", trigger: "Meta Lead (Priya Singh)", duration: "1.2s", time: "25 min ago" },
  { id: "run_5e2f", workflow: "Google Review Alert", status: "Successful", trigger: "2-Star Review (Amit Roy)", duration: "380ms", time: "45 min ago" },
  { id: "run_4b8e", workflow: "Website Down Alert", status: "Failed", trigger: "HTTP 503 Timeout", duration: "820ms", time: "2 hrs ago" },
];

const automationQueues: QueueStatusItem[] = [
  { label: "Meta Lead Queue", count: 3, status: "healthy" },
  { label: "WhatsApp Outbox", count: 12, status: "healthy" },
  { label: "Email Queue", count: 0, status: "healthy" },
  { label: "Retry Queue", count: 2, status: "warning" },
];

const automationSuccessTrend: MonthlyPoint[] = [
  { month: "Apr", value: 94 },
  { month: "May", value: 96 },
  { month: "Jun", value: 93 },
  { month: "Jul", value: 97 },
  { month: "Aug", value: 95 },
  { month: "Sep", value: 96 },
];

/* ------------------------------------------------------------------ */
/* Channel deep dives                                                  */
/* ------------------------------------------------------------------ */

function makeChannelDeepDive(
  kpis: KpiCard[],
  trendColor: string,
  topContent: { title: string; metric: string; value: string }[],
): ChannelDeepDive {
  return {
    kpis,
    trend: [
      {
        key: "performance",
        label: "Performance",
        color: trendColor,
        data: dash.trend.map((t) => ({ date: t.label, value: Math.round(t.reach * (0.15 + Math.random() * 0.25)) })),
      },
    ],
    topContent,
  };
}

const metaChannel: ChannelDeepDive = makeChannelDeepDive(
  [
    { label: "Spend", value: "₹28,540", delta: { changePercent: 8, direction: "down-is-good" }, hint: "vs last 30 days" },
    { label: "Impressions", value: "125.4K", delta: { changePercent: 14, direction: "up-is-good" } },
    { label: "Reach", value: "98.2K", delta: { changePercent: 12, direction: "up-is-good" } },
    { label: "Clicks", value: "3,842", delta: { changePercent: 18, direction: "up-is-good" } },
    { label: "Leads", value: "286", delta: { changePercent: 22, direction: "up-is-good" } },
    { label: "CPL", value: "₹99.8", delta: { changePercent: 11, direction: "down-is-good" } },
  ],
  "#0866FF",
  [
    { title: "Clean Ganga Awareness Reel", metric: "Reach", value: "24.5K" },
    { title: "Volunteer Testimonial Carousel", metric: "Engagement", value: "4.2%" },
    { title: "River Cleanup Drive Post", metric: "Leads", value: "86" },
  ],
);

const youtubeChannel: ChannelDeepDive = makeChannelDeepDive(
  [
    { label: "Subscribers", value: "12,480", delta: { changePercent: 4.2, direction: "up-is-good" }, hint: "+520 this month" },
    { label: "Views", value: "3.86M", delta: { changePercent: 12, direction: "up-is-good" } },
    { label: "Watch Time", value: "14,280 hrs", delta: { changePercent: 8, direction: "up-is-good" } },
    { label: "Revenue", value: "₹1,84,200", delta: { changePercent: 15, direction: "up-is-good" } },
    { label: "RPM", value: "₹47.6", delta: { changePercent: 3, direction: "up-is-good" } },
    { label: "CTR", value: "5.1%", delta: { changePercent: 0.8, direction: "up-is-good" } },
  ],
  "#FF0000",
  [
    { title: "Ganga Aarti Full Video", metric: "Views", value: "284K" },
    { title: "River Cleanup Timelapse", metric: "Watch Time", value: "4,200 hrs" },
    { title: "Volunteer Stories Ep. 12", metric: "Subscribers", value: "+180" },
  ],
);

const xChannel: ChannelDeepDive = makeChannelDeepDive(
  [
    { label: "Impressions", value: "48.2K", delta: { changePercent: 16, direction: "up-is-good" } },
    { label: "Engagements", value: "2,840", delta: { changePercent: 22, direction: "up-is-good" } },
    { label: "Eng. Rate", value: "5.9%", delta: { changePercent: 1.2, direction: "up-is-good" } },
    { label: "Followers", value: "48,920", delta: { changePercent: 3.1, direction: "up-is-good" }, hint: "+1,480 this month" },
    { label: "Profile Visits", value: "1,240", delta: { changePercent: 18, direction: "up-is-good" } },
    { label: "Link Clicks", value: "684", delta: { changePercent: 24, direction: "up-is-good" } },
  ],
  "#0F1419",
  [
    { title: "Plastic Cleanup Thread", metric: "Impressions", value: "12.4K" },
    { title: "Ganga Sunset Photo", metric: "Engagements", value: "842" },
    { title: "Volunteer Call-to-Action", metric: "Link Clicks", value: "284" },
  ],
);

const whatsappChannel: ChannelDeepDive = makeChannelDeepDive(
  [
    { label: "Messages Sent", value: "12,482", delta: { changePercent: 20, direction: "up-is-good" } },
    { label: "Delivery Rate", value: "97.2%", delta: { changePercent: 0.4, direction: "up-is-good" } },
    { label: "Read Rate", value: "67.5%", delta: { changePercent: 5.2, direction: "up-is-good" } },
    { label: "Reply Rate", value: "22.8%", delta: { changePercent: 3.1, direction: "up-is-good" } },
    { label: "Clicks", value: "1,560", delta: { changePercent: 18, direction: "up-is-good" } },
    { label: "Conversions", value: "420", delta: { changePercent: 24, direction: "up-is-good" } },
  ],
  "#25D366",
  [
    { title: "World Water Day Campaign", metric: "Conversions", value: "89" },
    { title: "Volunteer Drive Messages", metric: "Reply Rate", value: "25%" },
    { title: "Donation Appeal", metric: "ROI", value: "420%" },
  ],
);

const gmbChannel: ChannelDeepDive = makeChannelDeepDive(
  [
    { label: "Rating", value: "4.7", delta: { changePercent: 0.2, direction: "up-is-good" }, hint: "428 reviews" },
    { label: "Calls", value: "1,248", delta: { changePercent: 18, direction: "up-is-good" } },
    { label: "Website Clicks", value: "2,836", delta: { changePercent: 24, direction: "up-is-good" } },
    { label: "Directions", value: "1,120", delta: { changePercent: 16, direction: "up-is-good" } },
    { label: "Reviews", value: "428", delta: { changePercent: 12, direction: "up-is-good" } },
    { label: "Photo Views", value: "8,420", delta: { changePercent: 28, direction: "up-is-good" } },
  ],
  "#4285F4",
  [
    { title: "Namo Gange Trust Main Listing", metric: "Views", value: "4,280" },
    { title: "Ganga Aarti Event Post", metric: "Engagement", value: "6.2%" },
    { title: "Volunteer Recruitment Update", metric: "Calls", value: "84" },
  ],
);

const websiteChannel: ChannelDeepDive = makeChannelDeepDive(
  [
    { label: "Users", value: "12,400", delta: { changePercent: 28, direction: "up-is-good" } },
    { label: "Sessions", value: "18,200", delta: { changePercent: 22, direction: "up-is-good" } },
    { label: "Page Views", value: "42,800", delta: { changePercent: 18, direction: "up-is-good" } },
    { label: "Engagement Rate", value: "3.2%", delta: { changePercent: 0.5, direction: "up-is-good" } },
    { label: "Conversions", value: "642", delta: { changePercent: 32, direction: "up-is-good" } },
    { label: "Bounce Rate", value: "38.4%", delta: { changePercent: 2.1, direction: "down-is-good" } },
  ],
  "#2563EB",
  [
    { title: "Homepage", metric: "Views", value: "14,200" },
    { title: "/our-work", metric: "Engagement", value: "4.8%" },
    { title: "/donate", metric: "Conversions", value: "284" },
  ],
);

/* ------------------------------------------------------------------ */
/* Export                                                              */
/* ------------------------------------------------------------------ */

export const analyticsData: AnalyticsDashboardData = {
  overview: {
    kpis: [
      { label: "Total Leads", value: "248", delta: { changePercent: 18, direction: "up-is-good" }, comparisonLabel: "vs. last 30 days", hint: "+42 new this month" },
      { label: "Website Visits", value: "12.4K", delta: { changePercent: 28, direction: "up-is-good" }, comparisonLabel: "vs. last 30 days", hint: "+2.4K from last month" },
      { label: "Social Reach", value: "86.5K", delta: { changePercent: 12, direction: "up-is-good" }, comparisonLabel: "vs. last 30 days", hint: "Across all channels" },
      { label: "Active Campaigns", value: "6", delta: { changePercent: 20, direction: "up-is-good" }, comparisonLabel: "vs. last 30 days", hint: "2 ending soon" },
      { label: "Conversion Rate", value: "4.8%", delta: { changePercent: 1.2, direction: "up-is-good" }, comparisonLabel: "vs. last 30 days", hint: "+0.7% from last month" },
      { label: "SEO Score", value: "78/100", delta: { changePercent: 6, direction: "up-is-good" }, comparisonLabel: "vs. last 30 days", hint: "+5 from last month" },
      { label: "GMB Rating", value: "4.7", delta: { changePercent: 0.2, direction: "up-is-good" }, comparisonLabel: "vs. last 30 days", hint: "428 reviews" },
      { label: "Automation Runs", value: "2,004", delta: { changePercent: 15, direction: "up-is-good" }, comparisonLabel: "vs. last 30 days", hint: "96.2% success rate" },
    ],
    trend: overviewTrend,
    channels: channelDonut,
    topCampaigns: [
      { name: "Save Rivers Save Lives", leads: 320, conversions: 56, score: 82 },
      { name: "Earth Day Sustainability", leads: 275, conversions: 62, score: 88 },
      { name: "Clean Ganga Awareness", leads: 248, conversions: 42, score: 78 },
      { name: "Volunteer Drive", leads: 186, conversions: 28, score: 65 },
    ],
    activity: dash.activity,
  },
  channels: {
    meta: metaChannel,
    youtube: youtubeChannel,
    x: xChannel,
    whatsapp: whatsappChannel,
    gmb: gmbChannel,
    website: websiteChannel,
  },
  campaigns: {
    summary: [
      { label: "Total Campaigns", value: "24", delta: { changePercent: 33, direction: "up-is-good" }, hint: "+6 new this month" },
      { label: "Active Campaigns", value: "8", delta: { changePercent: 14, direction: "up-is-good" }, hint: "33% of total" },
      { label: "Total Leads", value: "1,248", delta: { changePercent: 18, direction: "up-is-good" }, hint: "+186 this month" },
      { label: "Total Spend", value: "₹48,250", delta: { changePercent: 8, direction: "down-is-good" }, hint: "−8% vs last month" },
    ],
    list: campaignList,
    spendTrend: campaignSpendTrend,
    channelRoi: campaignChannelRoi,
    funnel: campaignFunnel,
  },
  seo: {
    kpis: [
      { label: "Organic Clicks", value: "12,482", delta: { changePercent: 28, direction: "up-is-good" }, hint: "vs last 30 days" },
      { label: "Impressions", value: "248,914", delta: { changePercent: 18, direction: "up-is-good" }, hint: "vs last 30 days" },
      { label: "Avg. Position", value: "14.6", delta: { changePercent: 3.2, direction: "down-is-good" }, hint: "lower is better" },
      { label: "CTR", value: "4.9%", delta: { changePercent: 0.8, direction: "up-is-good" }, hint: "vs last 30 days" },
      { label: "Indexed Pages", value: "124", delta: { changePercent: 6, direction: "up-is-good" }, hint: "out of 128 submitted" },
      { label: "Page Health", value: "92/100", delta: { changePercent: 4, direction: "up-is-good" }, hint: "Good" },
    ],
    keywords: seoKeywords,
    trend: seoTrend,
    technical: { issues: seoIssues, score: 92 },
    topPages: seoTopPages,
  },
  crm: {
    pipeline: crmPipeline,
    sources: crmSources,
    leadsTrend: crmLeadsTrend,
    recentLeads,
    team: teamPerf,
  },
  automation: {
    kpis: [
      { label: "Active Workflows", value: "4", delta: { changePercent: 33, direction: "up-is-good" }, hint: "2 active, 1 paused, 1 error" },
      { label: "Total Runs", value: "2,004", delta: { changePercent: 15, direction: "up-is-good" }, hint: "this month" },
      { label: "Success Rate", value: "96.2%", delta: { changePercent: 1.8, direction: "up-is-good" }, hint: "vs last month" },
      { label: "Avg Duration", value: "520ms", delta: { changePercent: 12, direction: "down-is-good" }, hint: "−12% faster" },
      { label: "Failed Runs", value: "14", delta: { changePercent: 8, direction: "down-is-good" }, hint: "2 need attention" },
      { label: "Queue Backlog", value: "17", delta: { changePercent: 0, direction: "up-is-good" }, hint: "3 queues active" },
    ],
    successTrend: automationSuccessTrend,
    workflows: automationWorkflows,
    runs: automationRuns,
    queues: automationQueues,
  },
};
