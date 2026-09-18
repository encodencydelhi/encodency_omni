import type {
  CampaignReportRow,
  ChannelPerformance,
  LeadSourceBreakdown,
  PerformancePoint,
  PipelineStage,
  ReportHistoryRow,
  ReportKpi,
  ReportRecipient,
  ReportTemplate,
  ReportsDashboard,
  RevenueAttribution,
  ScheduledReport,
  TopContent,
} from "@/types/domain/reports";

const kpis: ReportKpi[] = [
  { label: "Total Reach", value: "1.24M", delta: { changePercent: 18.4, direction: "up-is-good" }, hint: "across all channels" },
  { label: "Total Engagement", value: "86.5K", delta: { changePercent: 12.2, direction: "up-is-good" }, hint: "likes, comments, shares" },
  { label: "Total Leads", value: "1,842", delta: { changePercent: 24.6, direction: "up-is-good" }, hint: "+362 this month" },
  { label: "Total Spend", value: "₹3.42L", delta: { changePercent: -8.1, direction: "down-is-good" }, hint: "78% of budget" },
  { label: "Avg. ROAS", value: "4.8x", delta: { changePercent: 14.2, direction: "up-is-good" }, hint: "above 4x target" },
  { label: "Conversion Rate", value: "3.8%", delta: { changePercent: 0.6, direction: "up-is-good" }, hint: "industry avg 2.4%" },
];

const channelPerformance: ChannelPerformance[] = [
  { channel: "meta", channelLabel: "Meta & Instagram", reach: 486000, impressions: 1240000, engagement: 34200, engagementRate: 2.76, clicks: 18400, leads: 620, spend: 142500, roi: 5.2, trend: 18 },
  { channel: "linkedin", channelLabel: "LinkedIn", reach: 128000, impressions: 340000, engagement: 8600, engagementRate: 2.53, clicks: 4200, leads: 180, spend: 68000, roi: 3.8, trend: 22 },
  { channel: "youtube", channelLabel: "YouTube", reach: 224000, impressions: 680000, engagement: 18400, engagementRate: 2.71, clicks: 8600, leads: 240, spend: 52000, roi: 4.2, trend: 15 },
  { channel: "whatsapp", channelLabel: "WhatsApp", reach: 186000, impressions: 420000, engagement: 12800, engagementRate: 3.05, clicks: 6400, leads: 320, spend: 25000, roi: 6.1, trend: 32 },
  { channel: "x", channelLabel: "X (Twitter)", reach: 98000, impressions: 260000, engagement: 5200, engagementRate: 2.0, clicks: 2800, leads: 86, spend: 18000, roi: 2.9, trend: -8 },
  { channel: "google_business", channelLabel: "Google Business", reach: 118000, impressions: 320000, engagement: 7400, engagementRate: 2.31, clicks: 5600, leads: 396, spend: 37000, roi: 5.6, trend: 12 },
];

const performanceTrend: PerformancePoint[] = [
  { date: "Aug 18", reach: 82000, engagement: 5400, leads: 120, conversions: 28 },
  { date: "Aug 20", reach: 94000, engagement: 6200, leads: 142, conversions: 34 },
  { date: "Aug 22", reach: 88000, engagement: 5800, leads: 128, conversions: 30 },
  { date: "Aug 24", reach: 106000, engagement: 7100, leads: 168, conversions: 42 },
  { date: "Aug 26", reach: 118000, engagement: 7800, leads: 192, conversions: 48 },
  { date: "Aug 28", reach: 112000, engagement: 7400, leads: 178, conversions: 44 },
  { date: "Aug 30", reach: 128000, engagement: 8600, leads: 212, conversions: 54 },
  { date: "Sep 1", reach: 134000, engagement: 9200, leads: 228, conversions: 58 },
  { date: "Sep 3", reach: 142000, engagement: 9800, leads: 248, conversions: 64 },
  { date: "Sep 5", reach: 138000, engagement: 9400, leads: 236, conversions: 60 },
  { date: "Sep 7", reach: 152000, engagement: 10200, leads: 264, conversions: 68 },
  { date: "Sep 9", reach: 148000, engagement: 9800, leads: 252, conversions: 64 },
  { date: "Sep 11", reach: 162000, engagement: 11000, leads: 282, conversions: 72 },
  { date: "Sep 13", reach: 158000, engagement: 10600, leads: 274, conversions: 70 },
  { date: "Sep 15", reach: 174000, engagement: 11800, leads: 302, conversions: 78 },
];

const topContent: TopContent[] = [
  { id: "c1", title: "Clean Ganga Awareness Video", channel: "youtube", channelLabel: "YouTube", impressions: 124000, engagement: 8200, clicks: 4800, postedAt: "Sep 12, 2025" },
  { id: "c2", title: "Volunteer Drive — Behind the Scenes", channel: "meta", channelLabel: "Meta & Instagram", impressions: 98000, engagement: 6400, clicks: 3200, postedAt: "Sep 10, 2025" },
  { id: "c3", title: "River Cleanup Impact Report", channel: "linkedin", channelLabel: "LinkedIn", impressions: 42000, engagement: 2800, clicks: 1600, postedAt: "Sep 8, 2025" },
  { id: "c4", title: "Save Rivers — WhatsApp Broadcast", channel: "whatsapp", channelLabel: "WhatsApp", impressions: 38000, engagement: 2400, clicks: 1200, postedAt: "Sep 6, 2025" },
  { id: "c5", title: "Ganga Explorer Campaign Reel", channel: "meta", channelLabel: "Meta & Instagram", impressions: 86000, engagement: 5600, clicks: 2800, postedAt: "Sep 4, 2025" },
  { id: "c6", title: "Google Business — New Review Highlights", channel: "google_business", channelLabel: "Google Business", impressions: 32000, engagement: 1800, clicks: 960, postedAt: "Sep 2, 2025" },
];

const campaignReports: CampaignReportRow[] = [
  { id: "cmp1", name: "Clean Ganga Awareness", channel: "meta", channelLabel: "Meta & Instagram", status: "active", budget: 60000, spend: 48000, impressions: 320000, clicks: 18400, leads: 620, conversions: 148, cpl: 77, roas: 5.2 },
  { id: "cmp2", name: "Volunteer Recruitment Drive", channel: "linkedin", channelLabel: "LinkedIn", status: "active", budget: 35000, spend: 28000, impressions: 140000, clicks: 6800, leads: 180, conversions: 42, cpl: 156, roas: 3.8 },
  { id: "cmp3", name: "Ganga Explorer Tourism", channel: "meta", channelLabel: "Meta & Instagram", status: "active", budget: 45000, spend: 36000, impressions: 240000, clicks: 12400, leads: 340, conversions: 86, cpl: 106, roas: 4.4 },
  { id: "cmp4", name: "Donate for Change", channel: "youtube", channelLabel: "YouTube", status: "active", budget: 25000, spend: 18000, impressions: 180000, clicks: 8200, leads: 160, conversions: 38, cpl: 113, roas: 4.1 },
  { id: "cmp5", name: "Plastic Free Rivers", channel: "x", channelLabel: "X (Twitter)", status: "paused", budget: 20000, spend: 14000, impressions: 96000, clicks: 4200, leads: 86, conversions: 18, cpl: 163, roas: 2.6 },
  { id: "cmp6", name: "Earth Day Awareness", channel: "whatsapp", channelLabel: "WhatsApp", status: "completed", budget: 15000, spend: 12000, impressions: 120000, clicks: 5800, leads: 220, conversions: 52, cpl: 55, roas: 6.8 },
];

const leadSources: LeadSourceBreakdown[] = [
  { channel: "meta", channelLabel: "Meta & Instagram", leads: 620, percentage: 33.7, conversionRate: 4.2 },
  { channel: "google_business", channelLabel: "Google Business", leads: 396, percentage: 21.5, conversionRate: 5.8 },
  { channel: "whatsapp", channelLabel: "WhatsApp", leads: 320, percentage: 17.4, conversionRate: 6.1 },
  { channel: "linkedin", channelLabel: "LinkedIn", leads: 180, percentage: 9.8, conversionRate: 3.4 },
  { channel: "youtube", channelLabel: "YouTube", leads: 240, percentage: 13.0, conversionRate: 2.8 },
  { channel: "x", channelLabel: "X (Twitter)", leads: 86, percentage: 4.7, conversionRate: 1.9 },
];

const pipeline: PipelineStage[] = [
  { stage: "New Leads", count: 486, percentage: 26.4 },
  { stage: "Contacted", count: 412, percentage: 22.4 },
  { stage: "Qualified", count: 348, percentage: 18.9 },
  { stage: "Proposal Sent", count: 284, percentage: 15.4 },
  { stage: "Negotiation", count: 186, percentage: 10.1 },
  { stage: "Closed Won", count: 126, percentage: 6.8 },
];

const revenueAttribution: RevenueAttribution[] = [
  { channel: "meta", channelLabel: "Meta & Instagram", revenue: 480000, spend: 142500, roi: 5.2 },
  { channel: "google_business", channelLabel: "Google Business", revenue: 320000, spend: 37000, roi: 5.6 },
  { channel: "whatsapp", channelLabel: "WhatsApp", revenue: 180000, spend: 25000, roi: 6.1 },
  { channel: "youtube", channelLabel: "YouTube", revenue: 160000, spend: 52000, roi: 4.2 },
  { channel: "linkedin", channelLabel: "LinkedIn", revenue: 120000, spend: 68000, roi: 3.8 },
  { channel: "x", channelLabel: "X (Twitter)", revenue: 48000, spend: 18000, roi: 2.9 },
];

const reportHistory: ReportHistoryRow[] = [
  { id: "rh1", name: "August Marketing Report", period: "Aug 1 – Aug 31", generatedAt: "Sep 1, 2025 · 9:02 AM", size: "2.4 MB", format: "pdf", status: "sent", sections: ["executive_summary", "seo", "meta", "campaigns", "leads"] },
  { id: "rh2", name: "SEO Performance — August", period: "Aug 1 – Aug 31", generatedAt: "Sep 1, 2025 · 9:14 AM", size: "1.8 MB", format: "pdf", status: "sent", sections: ["seo"] },
  { id: "rh3", name: "Campaign Summary Q3", period: "Jul 1 – Sep 15", generatedAt: "Sep 15, 2025 · 8:30 AM", size: "3.1 MB", format: "pdf", status: "sent", sections: ["campaigns", "executive_summary"] },
  { id: "rh4", name: "Lead Attribution Report", period: "Aug 15 – Sep 15", generatedAt: "Sep 15, 2025 · 9:45 AM", size: "420 KB", format: "csv", status: "sent", sections: ["leads"] },
  { id: "rh5", name: "Channel-wise Performance", period: "Aug 1 – Sep 15", generatedAt: "Sep 16, 2025 · 10:00 AM", size: "1.6 MB", format: "pdf", status: "failed", sections: ["meta", "linkedin", "youtube", "whatsapp", "x", "google_business"] },
  { id: "rh6", name: "Monthly Social Media Report", period: "Aug 2025", generatedAt: "Sep 1, 2025 · 9:32 AM", size: "2.1 MB", format: "pdf", status: "sent", sections: ["meta", "linkedin", "youtube", "x"] },
  { id: "rh7", name: "Weekly Campaign Digest", period: "Sep 8 – Sep 14", generatedAt: "Sep 15, 2025 · 8:01 AM", size: "680 KB", format: "pdf", status: "sent", sections: ["campaigns"] },
];

const scheduledReports: ScheduledReport[] = [
  { id: "sr1", name: "Monthly Marketing Overview", type: "Executive", frequency: "monthly", recipients: 8, nextRun: "Oct 1, 2025", format: "pdf", active: true },
  { id: "sr2", name: "Weekly Campaign Digest", type: "Campaigns", frequency: "weekly", recipients: 5, nextRun: "Sep 22, 2025", format: "pdf", active: true },
  { id: "sr3", name: "Lead Attribution Report", type: "Leads", frequency: "weekly", recipients: 4, nextRun: "Sep 22, 2025", format: "csv", active: true },
  { id: "sr4", name: "SEO Performance Monthly", type: "SEO", frequency: "monthly", recipients: 6, nextRun: "Oct 1, 2025", format: "pdf", active: true },
  { id: "sr5", name: "Channel Comparison Report", type: "Channels", frequency: "biweekly", recipients: 3, nextRun: "Sep 29, 2025", format: "excel", active: false },
  { id: "sr6", name: "Trustee Quarterly Report", type: "Executive", frequency: "quarterly", recipients: 12, nextRun: "Dec 31, 2025", format: "pdf", active: false },
];

const recipients: ReportRecipient[] = [
  { id: "rp1", name: "Manish Sirohi", email: "manishsirohi@encodency.com", role: "Organization Admin", reportCount: 6 },
  { id: "rp2", name: "Priya Sharma", email: "priya@namogange.org", role: "Marketing Manager", reportCount: 5 },
  { id: "rp3", name: "Amit Singh", email: "amit@namogange.org", role: "Social Media Manager", reportCount: 4 },
  { id: "rp4", name: "Neha Verma", email: "neha@namogange.org", role: "SEO Manager", reportCount: 5 },
  { id: "rp5", name: "Trustee Board", email: "board@namogangetrust.org", role: "Distribution List", reportCount: 2 },
];

const templates: ReportTemplate[] = [
  { id: "t1", name: "Marketing Overview", detail: "Full cross-channel performance summary with KPIs and trends.", sections: ["executive_summary", "meta", "linkedin", "youtube", "whatsapp", "x", "google_business", "campaigns", "leads"], format: "pdf" },
  { id: "t2", name: "Campaign Deep Dive", detail: "Detailed campaign performance, budget utilization, and ROI.", sections: ["campaigns", "leads", "executive_summary"], format: "pdf" },
  { id: "t3", name: "Lead & Pipeline Report", detail: "Lead sources, pipeline stages, and conversion analysis.", sections: ["leads", "executive_summary"], format: "csv" },
  { id: "t4", name: "SEO Monthly Report", detail: "Keywords, traffic, backlinks, and technical health.", sections: ["seo", "executive_summary"], format: "pdf" },
  { id: "t5", name: "Channel Performance", detail: "Side-by-side channel comparison with engagement metrics.", sections: ["meta", "linkedin", "youtube", "whatsapp", "x", "google_business"], format: "pdf" },
  { id: "t6", name: "Revenue Attribution", detail: "Revenue and ROI breakdown by channel and campaign.", sections: ["campaigns", "executive_summary"], format: "excel" },
];

export const REPORTS_DASHBOARD: ReportsDashboard = {
  kpis,
  channelPerformance,
  performanceTrend,
  topContent,
  campaignReports,
  leadSources,
  pipeline,
  revenueAttribution,
  reportHistory,
  scheduledReports,
  recipients,
  templates,
};
