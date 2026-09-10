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
    { id: "att-1", title: "LinkedIn needs reconnect", detail: "Token expired 2 hours ago", severity: "critical" as const, actionLabel: "Reconnect" },
    { id: "att-2", title: "5 Google reviews unanswered", detail: "Oldest review is 3 days old", severity: "warning" as const, actionLabel: "Reply now" },
    { id: "att-3", title: "8 SEO issues detected", detail: "3 critical issues affect indexing", severity: "warning" as const, actionLabel: "View issues" },
  ],
  recentLeads: [
    { id: "lead-1", name: "Riya Kapoor", source: "Meta", campaign: "Moksha Awareness", stage: "New" as const, receivedAt: "8 min ago" },
    { id: "lead-2", name: "Aditya Verma", source: "Website", campaign: "Organic Enquiry", stage: "Qualified" as const, receivedAt: "32 min ago" },
    { id: "lead-3", name: "Meera Joshi", source: "WhatsApp", campaign: "Volunteer Drive", stage: "Contacted" as const, receivedAt: "1 hr ago" },
    { id: "lead-4", name: "Kabir Singh", source: "Google", campaign: "Search · Delhi", stage: "Proposal" as const, receivedAt: "2 hrs ago" },
  ],
  scheduledContent: [
    { id: "post-1", title: "Stories of service: September", channel: "Instagram", scheduledFor: "Today · 6:30 PM", status: "scheduled" as const },
    { id: "post-2", title: "Weekly impact update", channel: "LinkedIn", scheduledFor: "Tomorrow · 10:00 AM", status: "scheduled" as const },
    { id: "post-3", title: "Volunteer spotlight", channel: "Google Business", scheduledFor: "12 Sep · 9:00 AM", status: "draft" as const },
  ],
  activity: [
    { id: "act-1", title: "Instagram reel published", meta: "Moksha Sewa · by Priya", occurredAt: "24 min ago", kind: "publish" as const },
    { id: "act-2", title: "New lead assigned to Rahul", meta: "Meta Lead Ads", occurredAt: "48 min ago", kind: "lead" as const },
    { id: "act-3", title: "SEO audit completed", meta: "142 pages crawled", occurredAt: "2 hrs ago", kind: "seo" as const },
    { id: "act-4", title: "Campaign budget updated", meta: "Moksha Awareness", occurredAt: "Yesterday", kind: "campaign" as const },
  ],
  integrationHealth: { connected: 7, total: 8, synced: 6, attention: 2 },
};

export const adminDashboardByScope: Record<string, AdminDashboardSnapshot> = {
  all: {
    scopeId: "all",
    metrics: [
      { key: "Clients", label: "Active Clients", value: 3, formattedValue: "3", change: 0, comparison: "All running smoothly" },
      { key: "leads", label: "New leads", value: 684, formattedValue: "684", change: 12.4, comparison: "vs last 30 days" },
      { key: "campaigns", label: "Live campaigns", value: 8, formattedValue: "8", change: 2, comparison: "2 launched this month" },
      { key: "reach", label: "Social reach", value: 248300, formattedValue: "248.3K", change: 18.2, comparison: "vs last 30 days" },
      { key: "visits", label: "Website visits", value: 42860, formattedValue: "42.9K", change: 8.7, comparison: "vs last 30 days" },
      { key: "seo", label: "SEO health", value: 82, formattedValue: "82/100", change: 4, comparison: "4 points improved" },
    ],
    trend: [
      { label: "Aug 5", leads: 72, visits: 3300 }, { label: "Aug 10", leads: 88, visits: 3850 },
      { label: "Aug 15", leads: 81, visits: 3600 }, { label: "Aug 20", leads: 112, visits: 4510 },
      { label: "Aug 25", leads: 126, visits: 4680 }, { label: "Aug 30", leads: 119, visits: 5100 },
      { label: "Sep 4", leads: 151, visits: 5750 }, { label: "Sep 9", leads: 164, visits: 6020 },
    ],
    channels: [
      { id: "meta", name: "Meta & Instagram", shortName: "M", metric: "142.8K", metricLabel: "reach", change: 21.4, status: "healthy" as const, color: "#4F78C4" },
      { id: "google", name: "Google Business", shortName: "G", metric: "4.8", metricLabel: "rating", change: 5.2, status: "attention" as const, color: "#C88632" },
      { id: "whatsapp", name: "WhatsApp", shortName: "W", metric: "1,842", metricLabel: "messages", change: 14.8, status: "healthy" as const, color: "#3B8A69" },
      { id: "linkedin", name: "LinkedIn", shortName: "in", metric: "31.2K", metricLabel: "impressions", change: -3.1, status: "disconnected" as const, color: "#4A7193" },
      { id: "youtube", name: "YouTube", shortName: "▶", metric: "72.6K", metricLabel: "views", change: 9.6, status: "healthy" as const, color: "#D6474F" },
    ],
    updatedAt: "Today, 10:42 AM",
    ...common,
  },
  "moksha-sewa": {
    scopeId: "moksha-sewa",
    metrics: [
      { key: "Clients", label: "Project status", value: 1, formattedValue: "Active", change: 0, comparison: "Moksha Sewa" },
      { key: "leads", label: "New leads", value: 426, formattedValue: "426", change: 16.8, comparison: "vs last 30 days" },
      { key: "campaigns", label: "Live campaigns", value: 5, formattedValue: "5", change: 1, comparison: "1 launched this month" },
      { key: "reach", label: "Social reach", value: 174600, formattedValue: "174.6K", change: 22.3, comparison: "vs last 30 days" },
      { key: "visits", label: "Website visits", value: 28420, formattedValue: "28.4K", change: 11.2, comparison: "vs last 30 days" },
      { key: "seo", label: "SEO health", value: 86, formattedValue: "86/100", change: 6, comparison: "6 points improved" },
    ],
    trend: [
      { label: "Aug 5", leads: 44, visits: 2100 }, { label: "Aug 10", leads: 51, visits: 2350 },
      { label: "Aug 15", leads: 49, visits: 2210 }, { label: "Aug 20", leads: 68, visits: 2850 },
      { label: "Aug 25", leads: 75, visits: 3100 }, { label: "Aug 30", leads: 71, visits: 3340 },
      { label: "Sep 4", leads: 92, visits: 3750 }, { label: "Sep 9", leads: 104, visits: 4010 },
    ],
    channels: [
      { id: "meta", name: "Meta & Instagram", shortName: "M", metric: "106.4K", metricLabel: "reach", change: 25.1, status: "healthy" as const, color: "#4F78C4" },
      { id: "google", name: "Google Business", shortName: "G", metric: "4.9", metricLabel: "rating", change: 4.4, status: "attention" as const, color: "#C88632" },
      { id: "whatsapp", name: "WhatsApp", shortName: "W", metric: "1,204", metricLabel: "messages", change: 18.2, status: "healthy" as const, color: "#3B8A69" },
      { id: "linkedin", name: "LinkedIn", shortName: "in", metric: "21.8K", metricLabel: "impressions", change: -2.7, status: "disconnected" as const, color: "#4A7193" },
      { id: "youtube", name: "YouTube", shortName: "▶", metric: "46.3K", metricLabel: "views", change: 8.1, status: "healthy" as const, color: "#D6474F" },
    ],
    updatedAt: "Today, 10:42 AM",
    ...common,
  },
};
