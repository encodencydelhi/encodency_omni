import type { AdminDashboardSnapshot, Organization, Project } from "@/types/admin";

export const adminOrganization: Organization = {
  id: "org-namo-gange-trust",
  name: "Namo Gange Trust",
  timezone: "Asia/Kolkata",
};

export const adminClients: Project[] = [
  { id: "moksha-sewa", organizationId: adminOrganization.id, name: "Moksha Sewa", website: "mokshasewa.org", status: "active", color: "#D6474F" },
  { id: "ganga-aarti", organizationId: adminOrganization.id, name: "Ganga Aarti", website: "gangaaarti.org", status: "active", color: "#4F7697" },
  { id: "green-ghats", organizationId: adminOrganization.id, name: "Green Ghats", website: "greenghats.in", status: "active", color: "#43846B" },
];

const common = {
  attention: [
    { id: "att-1", title: "LinkedIn account needs reconnect", detail: "Moksha Sewa · 2 hours ago", severity: "warning" as const, actionLabel: "Connection" },
    { id: "att-2", title: "5 Google reviews unanswered", detail: "Namo Gange Wellness · 4 hours ago", severity: "critical" as const, actionLabel: "Reviews" },
    { id: "att-3", title: "Meta campaign CPL increased", detail: "Ganga Clean Drive · 6 hours ago", severity: "warning" as const, actionLabel: "Campaign" },
    { id: "att-4", title: "8 SEO issues detected", detail: "Moksha Sewa · 8 hours ago", severity: "critical" as const, actionLabel: "SEO" },
    { id: "att-5", title: "WhatsApp campaign failed", detail: "Ganga Clean Drive · 12 hours ago", severity: "critical" as const, actionLabel: "Campaign" },
    { id: "att-6", title: "Website traffic dipped by 18%", detail: "Namo Gange Trust · 14 hours ago", severity: "warning" as const, actionLabel: "Traffic" },
  ],
  recentLeads: [
    { id: "lead-1", name: "Rahul Mehta", source: "Website", project: "Moksha Sewa", stage: "New" as const, assignedTo: "Priya Sharma", receivedAt: "Apr 14, 2025" },
    { id: "lead-2", name: "Priya Sharma", source: "Instagram", project: "Ganga Explorer", stage: "Contacted" as const, assignedTo: "Amit Singh", receivedAt: "Apr 14, 2025" },
    { id: "lead-3", name: "Amit Singh", source: "Facebook", project: "Ganga Drive", stage: "Qualified" as const, assignedTo: "Neha Verma", receivedAt: "Apr 14, 2025" },
    { id: "lead-4", name: "Neha Verma", source: "Website", project: "Namo Gange Trust", stage: "Proposal" as const, assignedTo: "Rohit Kumar", receivedAt: "Apr 13, 2025" },
    { id: "lead-5", name: "Vikram Patel", source: "LinkedIn", project: "Moksha Sewa", stage: "New" as const, assignedTo: "Priya Sharma", receivedAt: "Apr 12, 2025" },
  ],
  scheduledContent: [
    { id: "post-1", title: "Save Rivers, Save Lives", project: "Moksha Sewa", channel: "Instagram", scheduledFor: "Apr 15, 2025\n10:00 AM", status: "scheduled" as const },
    { id: "post-2", title: "Join the Movement", project: "Namo Gange Trust", channel: "LinkedIn", scheduledFor: "Apr 15, 2025\n02:00 PM", status: "scheduled" as const },
    { id: "post-3", title: "Clean Ganga Drive", project: "Ganga Clean Drive", channel: "Facebook", scheduledFor: "Apr 16, 2025\n09:00 AM", status: "scheduled" as const },
    { id: "post-4", title: "Volunteer Spotlight", project: "Namo Gange Trust", channel: "YouTube", scheduledFor: "Apr 16, 2025\n05:00 PM", status: "scheduled" as const },
    { id: "post-5", title: "River Conservation Tips", project: "Ganga Explorer", channel: "Instagram", scheduledFor: "Apr 17, 2025\n11:00 AM", status: "scheduled" as const },
  ],
  activity: [
    { id: "act-1", title: "Instagram reel published", meta: "Moksha Sewa", occurredAt: "24 min ago", kind: "publish" as const },
    { id: "act-2", title: "New lead assigned", meta: "Meta Lead Ads", occurredAt: "48 min ago", kind: "lead" as const },
    { id: "act-3", title: "SEO audit completed", meta: "142 pages", occurredAt: "2 hrs ago", kind: "seo" as const },
  ],
  seoSnapshot: {
    trackedKeywords: "1,245",
    keywordsTrend: 12,
    clicks: "18.4K",
    clicksTrend: 26,
    impressions: "320K",
    impressionsTrend: 18,
    avgPosition: 12.6,
    positionTrend: -2.4,
    issues: [
      { type: "critical" as const, message: "12 keywords dropped > 10 positions" },
      { type: "warning" as const, message: "Missing meta descriptions on 8 pages" },
      { type: "warning" as const, message: "Improve Core Web Vitals (LCP, CLS)" },
    ],
  },
  gmbSnapshot: {
    rating: 4.7,
    reviews: 428,
    ratingTrend: 0.2,
    calls: "1,248",
    callsTrend: 18,
    websiteClicks: "2,836",
    clicksTrend: 24,
    directions: "1,120",
    directionsTrend: 16,
  },
};

export const adminDashboardByScope: Record<string, AdminDashboardSnapshot> = {
  all: {
    scopeId: "all",
    metrics: [
      { key: "projects", label: "Projects", value: 4, formattedValue: "4", change: 33, comparison: "+1 new this month" },
      { key: "leads", label: "Total Leads", value: 248, formattedValue: "248", change: 18, comparison: "+42 new this month" },
      { key: "campaigns", label: "Active Campaigns", value: 6, formattedValue: "6", change: 20, comparison: "2 ending soon" },
      { key: "visits", label: "Website Visits", value: 12400, formattedValue: "12.4K", change: 28, comparison: "+2.4K from last month" },
      { key: "reach", label: "Social Reach", value: 86500, formattedValue: "86.5K", change: 12, comparison: "Across all channels" },
      { key: "seo", label: "SEO Score", value: 78, formattedValue: "78/100", change: 6, comparison: "+5 from last month" },
      { key: "conversion", label: "Conversion Rate", value: 4.8, formattedValue: "4.8%", change: 1.2, comparison: "+0.7% from last month" },
      { key: "gmb", label: "GMB Rating", value: 4.7, formattedValue: "4.7", change: 0.2, comparison: "428 reviews" },
    ],
    trend: [
      { label: "Mar 15", leads: 400, visits: 1000, reach: 600, conversions: 200 },
      { label: "Mar 20", leads: 500, visits: 1400, reach: 800, conversions: 300 },
      { label: "Mar 25", leads: 600, visits: 1600, reach: 1000, conversions: 350 },
      { label: "Mar 30", leads: 800, visits: 2000, reach: 1100, conversions: 400 },
      { label: "Apr 5",  leads: 800, visits: 2200, reach: 1500, conversions: 350 },
      { label: "Apr 10", leads: 1000, visits: 2800, reach: 1800, conversions: 500 },
      { label: "Apr 14", leads: 1200, visits: 3000, reach: 2000, conversions: 600 },
    ],
    channels: [
      { id: "meta", name: "Meta & Instagram", reach: "24.5K", engagement: "3.8%", leads: 72, status: "Connected" as const, trend: 12 },
      { id: "linkedin", name: "LinkedIn", reach: "18.2K", engagement: "4.1%", leads: 48, status: "Connected" as const, trend: 8 },
      { id: "google", name: "Google Business", reach: "12.4K", engagement: "4.8%", leads: 56, status: "Connected" as const, trend: 15 },
      { id: "whatsapp", name: "WhatsApp", reach: "6.2K", engagement: "12.3%", leads: 38, status: "Connected" as const, trend: 20 },
      { id: "youtube", name: "YouTube", reach: "16.6K", engagement: "5.1%", leads: 22, status: "Connected" as const, trend: 9 },
      { id: "website", name: "Website", reach: "12.4K", engagement: "3.2%", leads: 64, status: "Connected" as const, trend: 11 },
    ],
    updatedAt: "Today, 10:42 AM",
    ...common,
  },
  "moksha-sewa": {
    scopeId: "moksha-sewa",
    metrics: [
      { key: "projects", label: "Projects", value: 1, formattedValue: "1", change: 0, comparison: "Moksha Sewa" },
      { key: "leads", label: "Total Leads", value: 124, formattedValue: "124", change: 12, comparison: "+20 new this month" },
      { key: "campaigns", label: "Active Campaigns", value: 2, formattedValue: "2", change: 0, comparison: "Running normally" },
      { key: "visits", label: "Website Visits", value: 6200, formattedValue: "6.2K", change: 15, comparison: "+1.2K from last month" },
      { key: "reach", label: "Social Reach", value: 43200, formattedValue: "43.2K", change: 8, comparison: "Across all channels" },
      { key: "seo", label: "SEO Score", value: 82, formattedValue: "82/100", change: 2, comparison: "+2 from last month" },
      { key: "conversion", label: "Conversion Rate", value: 5.2, formattedValue: "5.2%", change: 0.5, comparison: "+0.5% from last month" },
      { key: "gmb", label: "GMB Rating", value: 4.8, formattedValue: "4.8", change: 0.1, comparison: "210 reviews" },
    ],
    trend: [
      { label: "Mar 15", leads: 200, visits: 500, reach: 300, conversions: 100 },
      { label: "Mar 20", leads: 250, visits: 700, reach: 400, conversions: 150 },
      { label: "Mar 25", leads: 300, visits: 800, reach: 500, conversions: 175 },
      { label: "Mar 30", leads: 400, visits: 1000, reach: 550, conversions: 200 },
      { label: "Apr 5",  leads: 400, visits: 1100, reach: 750, conversions: 175 },
      { label: "Apr 10", leads: 500, visits: 1400, reach: 900, conversions: 250 },
      { label: "Apr 14", leads: 600, visits: 1500, reach: 1000, conversions: 300 },
    ],
    channels: [
      { id: "meta", name: "Meta & Instagram", reach: "12.5K", engagement: "4.2%", leads: 36, status: "Connected" as const, trend: 15 },
      { id: "linkedin", name: "LinkedIn", reach: "9.1K", engagement: "4.5%", leads: 24, status: "Connected" as const, trend: 10 },
      { id: "google", name: "Google Business", reach: "6.2K", engagement: "5.1%", leads: 28, status: "Connected" as const, trend: 18 },
      { id: "whatsapp", name: "WhatsApp", reach: "3.1K", engagement: "14.2%", leads: 19, status: "Connected" as const, trend: 22 },
      { id: "youtube", name: "YouTube", reach: "8.3K", engagement: "5.5%", leads: 11, status: "Connected" as const, trend: 12 },
      { id: "website", name: "Website", reach: "6.2K", engagement: "3.5%", leads: 32, status: "Connected" as const, trend: 14 },
    ],
    updatedAt: "Today, 10:42 AM",
    ...common,
  },
};
