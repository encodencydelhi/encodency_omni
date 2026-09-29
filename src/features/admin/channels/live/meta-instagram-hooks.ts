"use client";

import { useQuery } from "@tanstack/react-query";
import { integrationsApi, type ClientChannelOverview, type ProviderOverview } from "@/features/admin/integrations/live/integrations-api";
import { campaignsApi, type CampaignRecord } from "@/features/admin/campaigns/live/campaigns-api";
import { schedulingApi, type ScheduledPost } from "@/features/admin/content/live/scheduling-api";

/**
 * React Query bindings behind `/admin/meta` (Meta & Instagram).
 *
 * Every panel on that page maps to a real backend route — no panel falls back
 * to a hard-coded array:
 *   • connection status, mapped resources  → GET /integrations/overview
 *   • published / scheduled / failed posts → GET /content/scheduled-posts
 *   • campaign performance                 → GET /campaigns
 * Panels that have no backend at all (reach, audience demographics, inbox)
 * render an explicit "demo data" label instead of pretending to be live.
 */
export const metaKeys = {
  overview: (companyId: string, clientId: string) => ["meta-channel", "overview", companyId, clientId] as const,
  scheduledPosts: (companyId: string, clientId: string) => ["meta-channel", "scheduled-posts", companyId, clientId] as const,
  campaigns: (companyId: string, clientId: string) => ["meta-channel", "campaigns", companyId, clientId] as const,
};

/** Rows on this page are limited to what the Meta/Instagram console shows. */
type MetaProviderName = "META" | "INSTAGRAM";

/** GET /integrations/overview → the META and INSTAGRAM rows only. */
export function useMetaOverview(companyId: string, clientId: string, enabled: boolean) {
  return useQuery<ClientChannelOverview>({
    queryKey: metaKeys.overview(companyId, clientId),
    enabled: enabled && Boolean(companyId) && Boolean(clientId),
    queryFn: ({ signal }) => integrationsApi.getOverview(companyId, clientId, signal),
    staleTime: 15_000,
  });
}

/**
 * GET /content/scheduled-posts — one request for the whole publishing panel;
 * published / scheduled / failed rows are derived from the same result so a
 * status filter never costs a second round trip.
 */
export function useMetaScheduledPosts(companyId: string, clientId: string, enabled: boolean) {
  return useQuery<{ items: ScheduledPost[]; total: number; page: number; limit: number }>({
    queryKey: metaKeys.scheduledPosts(companyId, clientId),
    enabled: enabled && Boolean(companyId) && Boolean(clientId),
    queryFn: ({ signal }) => schedulingApi.list(companyId, clientId, { limit: 100 }, signal),
    staleTime: 15_000,
  });
}

/** GET /campaigns — the campaign performance panel. */
export function useMetaCampaigns(companyId: string, clientId: string, enabled: boolean) {
  return useQuery<{ items: CampaignRecord[]; total: number; page: number; limit: number }>({
    queryKey: metaKeys.campaigns(companyId, clientId),
    enabled: enabled && Boolean(companyId) && Boolean(clientId),
    queryFn: ({ signal }) => campaignsApi.list(companyId, clientId, { limit: 100 }, signal),
    staleTime: 15_000,
  });
}

export function metaProvider(
  overview: ClientChannelOverview | undefined,
  provider: MetaProviderName,
): ProviderOverview | null {
  return overview?.providers.find((row) => row.provider === provider) ?? null;
}
