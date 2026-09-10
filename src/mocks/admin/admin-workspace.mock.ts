import type { Campaign, ContentItem, WorkspaceModuleRecord } from "@/types/admin";

export const calendarContent: ContentItem[] = [
  { id: "c1", title: "Stories of Service", channel: "Instagram", campaign: "Moksha Awareness", status: "Scheduled", scheduledAt: "2026-09-09T18:30:00" },
  { id: "c2", title: "Weekly Impact Update", channel: "LinkedIn", campaign: "Community Impact", status: "Published", scheduledAt: "2026-09-10T10:00:00" },
  { id: "c3", title: "Volunteer Spotlight", channel: "Google Business", campaign: "Volunteer Drive", status: "Draft", scheduledAt: "2026-09-12T09:00:00" },
  { id: "c4", title: "Serve with Compassion", channel: "Facebook", campaign: "Moksha Awareness", status: "Scheduled", scheduledAt: "2026-09-15T17:00:00" },
  { id: "c5", title: "Donation Appeal", channel: "WhatsApp", campaign: "Donate for Change", status: "Failed", scheduledAt: "2026-09-17T12:30:00" },
  { id: "c6", title: "A Day at Moksha Sewa", channel: "YouTube", campaign: "Community Impact", status: "Scheduled", scheduledAt: "2026-09-21T16:00:00" },
];

export const campaigns: Campaign[] = [
  { id: "moksha-awareness", name: "Moksha Awareness", project: "Moksha Sewa", channels: ["Facebook", "Instagram", "LinkedIn"], status: "Active", startDate: "01 Sep 2026", endDate: "30 Sep 2026", leads: 186, spend: 22400, conversions: 38 },
  { id: "volunteer-drive", name: "Volunteer Drive", project: "Moksha Sewa", channels: ["Instagram", "Google Business", "WhatsApp"], status: "Active", startDate: "05 Sep 2026", endDate: "15 Oct 2026", leads: 92, spend: 12800, conversions: 27 },
  { id: "community-impact", name: "Community Impact", project: "Moksha Sewa", channels: ["LinkedIn", "YouTube"], status: "Draft", startDate: "20 Sep 2026", endDate: "20 Oct 2026", leads: 0, spend: 0, conversions: 0 },
  { id: "donate-for-change", name: "Donate for Change", project: "Moksha Sewa", channels: ["Meta", "WhatsApp", "Website"], status: "Completed", startDate: "01 Aug 2026", endDate: "31 Aug 2026", leads: 148, spend: 18400, conversions: 44 },
];

export const moduleRecords: Record<string, WorkspaceModuleRecord[]> = {
  meta: [{ id: "m1", title: "Moksha Sewa Facebook", subtitle: "Facebook Page", status: "Connected", metric: "106.4K reach", detail: "+25.1% this month" }, { id: "m2", title: "@mokshasewa", subtitle: "Instagram Business", status: "Connected", metric: "68.2K reach", detail: "+18.6% this month" }],
  linkedin: [{ id: "l1", title: "Moksha Sewa", subtitle: "Company Page", status: "Reconnect", metric: "21.8K impressions", detail: "8,420 followers" }],
  "google-business": [{ id: "g1", title: "Moksha Sewa Delhi", subtitle: "Google Business Profile", status: "Connected", metric: "4.9 rating", detail: "428 reviews · 5 unanswered" }],
  whatsapp: [{ id: "w1", title: "Moksha Sewa Support", subtitle: "WhatsApp Business", status: "Connected", metric: "1,204 messages", detail: "94% delivery rate" }],
  youtube: [{ id: "y1", title: "Moksha Sewa", subtitle: "YouTube Channel", status: "Connected", metric: "46.3K views", detail: "+8.1% this month" }],
  website: [{ id: "web1", title: "mokshasewa.org", subtitle: "Primary website", status: "Healthy", metric: "28.4K visits", detail: "3.8% conversion rate" }],
};
