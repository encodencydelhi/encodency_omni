import { apiClient } from "@/lib/api/client";
import { companyScopeHeaders } from "@/lib/api/company-scope";
import type { ScheduledPostStatus } from "@/features/admin/content/live/scheduling-api";

export type CalendarStatusGroup = "scheduled" | "published" | "failed" | "cancelled" | "draft";
export type CalendarChannel = "FACEBOOK_PAGE" | "INSTAGRAM_ACCOUNT" | "GOOGLE_BUSINESS_LOCATION" | "LINKEDIN_ORGANIZATION" | "YOUTUBE_CHANNEL" | "WHATSAPP";
export type CalendarSource = "post" | "youtube" | "whatsapp" | "draft";
export type CalendarStatus = ScheduledPostStatus | "DRAFT";

export interface CalendarPost {
  id: string;
  source: CalendarSource;
  clientId: string;
  clientName: string | null;
  draftId: string | null;
  variantId: string | null;
  title: string;
  content: string;
  channel: CalendarChannel | "DRAFT";
  provider: string;
  accountName: string | null;
  externalResourceId: string | null;
  scheduledFor: string;
  status: CalendarStatus;
  failureCode: string | null;
  lastErrorCode: string | null;
  attemptCount: number;
  publishedAt: string | null;
  cancelledAt: string | null;
  campaignId: string | null;
  campaignName: string | null;
  mediaCount: number;
  createdById: string | null;
  createdBy: string | null;
  createdAt: string;
  reviewStatus: string | null;
  canCancel: boolean;
}

export interface CalendarActivity {
  id: string;
  at: string;
  action: string;
  label: string;
  actor: string;
  clientName: string | null;
  outcome: "SUCCESS" | "FAILURE";
  resourceId: string | null;
}

export interface CalendarResponse {
  window: { from: string; to: string };
  items: CalendarPost[];
  total: number;
  truncated: boolean;
  scope: { seesEveryone: boolean; viewingPersonId: string | null };
  counts: { scheduled: number; published: number; failed: number; cancelled: number; draftsInView: number; drafts: number; draftsPendingReview: number; bySource: Record<CalendarSource, number> };
  clients: Array<{ id: string; name: string }>;
  campaigns: Array<{ id: string; name: string; clientId: string }>;
  people: Array<{ id: string; name: string }>;
  activity: CalendarActivity[];
}

export interface CalendarQuery {
  from: string;
  to: string;
  clientId?: string;
  campaignId?: string;
  statusGroup?: CalendarStatusGroup;
  channel?: CalendarChannel;
  personId?: string;
  limit?: number;
}

/** GET /content/calendar: every Client the member can open, one window of time (no x-client-id needed). */
export const calendarApi = {
  list(companyId: string, query: CalendarQuery, signal?: AbortSignal): Promise<CalendarResponse> {
    const q: Record<string, string | number> = { from: query.from, to: query.to };
    if (query.clientId) q.clientId = query.clientId;
    if (query.campaignId) q.campaignId = query.campaignId;
    if (query.statusGroup) q.statusGroup = query.statusGroup;
    if (query.channel) q.channel = query.channel;
    if (query.personId) q.personId = query.personId;
    if (query.limit) q.limit = query.limit;
    return apiClient.request<CalendarResponse>({ method: "GET", path: "/content/calendar", headers: companyScopeHeaders(companyId), query: q, signal });
  },
};
