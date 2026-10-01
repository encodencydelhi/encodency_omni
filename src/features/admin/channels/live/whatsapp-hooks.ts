"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { integrationsApi, type ProviderOverview } from "@/features/admin/integrations/live/integrations-api";
import {
  whatsappApi,
  type RetryWhatsAppMessageResult,
  type WhatsAppCampaignItem,
  type WhatsAppConfigState,
  type WhatsAppContactItem,
  type WhatsAppContactsResponse,
  type WhatsAppMessage,
  type WhatsAppMessageStatus,
  type WhatsAppOverviewAnalytics,
  type WhatsAppTemplate,
  type WhatsAppTemplateAnalyticsItem,
  type WhatsAppWebhookHealth,
  type WhatsAppAnalyticsQuery,
} from "./whatsapp-api";

/**
 * React Query bindings for the WhatsApp channel.
 *
 * Every request is its own query so a single failing endpoint (for example a
 * 403 on the Client-scoped overview) can never blank the whole page: the
 * Company-scoped Settings tab keeps working from `useWhatsAppConfig` alone.
 * The message status filter is part of the query key, so changing it issues
 * exactly one request instead of the previous double fetch.
 */
export const whatsappKeys = {
  config: (companyId: string) => ["whatsapp", "config", companyId] as const,
  overview: (companyId: string, clientId: string) => ["whatsapp", "overview", companyId, clientId] as const,
  overviewAnalytics: (companyId: string, clientId: string, query?: WhatsAppAnalyticsQuery) =>
    ["whatsapp", "overview-analytics", companyId, clientId, query] as const,
  campaigns: (companyId: string, clientId: string) => ["whatsapp", "campaigns", companyId, clientId] as const,
  templateAnalytics: (companyId: string, clientId: string) => ["whatsapp", "template-analytics", companyId, clientId] as const,
  contacts: (companyId: string, clientId: string) => ["whatsapp", "contacts", companyId, clientId] as const,
  webhookHealth: (companyId: string, clientId: string) => ["whatsapp", "webhook-health", companyId, clientId] as const,
  templates: (companyId: string, clientId: string) => ["whatsapp", "templates", companyId, clientId] as const,
  messages: (companyId: string, clientId: string, status: WhatsAppMessageStatus | "ALL") =>
    ["whatsapp", "messages", companyId, clientId, status] as const,
};

/** GET /integrations/whatsapp/config — Company-scoped, works without a Client. */
export function useWhatsAppConfig(companyId: string, enabled: boolean) {
  return useQuery<WhatsAppConfigState>({
    queryKey: whatsappKeys.config(companyId),
    enabled: enabled && Boolean(companyId),
    queryFn: ({ signal }) => whatsappApi.getConfig(companyId, signal),
    staleTime: 15_000,
  });
}

/** GET /integrations/overview filtered down to the WhatsApp provider row. */
export function useWhatsAppOverview(companyId: string, clientId: string, enabled: boolean) {
  return useQuery<ProviderOverview | null>({
    queryKey: whatsappKeys.overview(companyId, clientId),
    enabled: enabled && Boolean(companyId) && Boolean(clientId),
    queryFn: async ({ signal }) => {
      const overview = await integrationsApi.getOverview(companyId, clientId, signal);
      return overview.providers.find((provider) => provider.provider === "WHATSAPP") ?? null;
    },
    staleTime: 15_000,
  });
}

/** GET /integrations/whatsapp/analytics/overview — Client-scoped overview metrics (rates, totals). */
export function useWhatsAppOverviewAnalytics(
  companyId: string,
  clientId: string,
  queryOrEnabled?: WhatsAppAnalyticsQuery | boolean,
  enabled?: boolean,
) {
  const query = typeof queryOrEnabled === "object" ? queryOrEnabled : undefined;
  const isEnabled = typeof queryOrEnabled === "boolean" ? queryOrEnabled : (enabled ?? true);
  return useQuery<WhatsAppOverviewAnalytics>({
    queryKey: whatsappKeys.overviewAnalytics(companyId, clientId, query),
    enabled: isEnabled && Boolean(companyId) && Boolean(clientId),
    queryFn: ({ signal }) => whatsappApi.getOverviewAnalytics(companyId, clientId, query, signal),
    staleTime: 10_000,
  });
}

/** GET /integrations/whatsapp/analytics/campaigns — Client-scoped campaign list with message count. */
export function useWhatsAppCampaigns(companyId: string, clientId: string, enabled: boolean) {
  return useQuery<{ items: WhatsAppCampaignItem[] }>({
    queryKey: whatsappKeys.campaigns(companyId, clientId),
    enabled: enabled && Boolean(companyId) && Boolean(clientId),
    queryFn: ({ signal }) => whatsappApi.getCampaigns(companyId, clientId, signal),
    staleTime: 15_000,
  });
}

/** GET /integrations/whatsapp/analytics/templates — Client-scoped templates with message counts. */
export function useWhatsAppTemplateAnalytics(companyId: string, clientId: string, enabled: boolean) {
  return useQuery<{ items: WhatsAppTemplateAnalyticsItem[] }>({
    queryKey: whatsappKeys.templateAnalytics(companyId, clientId),
    enabled: enabled && Boolean(companyId) && Boolean(clientId),
    queryFn: ({ signal }) => whatsappApi.getTemplateAnalytics(companyId, clientId, signal),
    staleTime: 15_000,
  });
}

/** GET /integrations/whatsapp/contacts — Client-scoped WhatsApp contacts. */
export function useWhatsAppContacts(companyId: string, clientId: string, enabled: boolean) {
  return useQuery<WhatsAppContactsResponse>({
    queryKey: whatsappKeys.contacts(companyId, clientId),
    enabled: enabled && Boolean(companyId) && Boolean(clientId),
    queryFn: ({ signal }) => whatsappApi.getContacts(companyId, clientId, signal),
    staleTime: 15_000,
  });
}

/** GET /integrations/whatsapp/webhooks/health — Client-scoped webhook health monitoring. */
export function useWhatsAppWebhookHealth(companyId: string, clientId: string, enabled: boolean) {
  return useQuery<WhatsAppWebhookHealth>({
    queryKey: whatsappKeys.webhookHealth(companyId, clientId),
    enabled: enabled && Boolean(companyId) && Boolean(clientId),
    queryFn: ({ signal }) => whatsappApi.getWebhookHealth(companyId, clientId, signal),
    staleTime: 10_000,
  });
}

/** GET /integrations/whatsapp/templates — Client-scoped. */
export function useWhatsAppTemplates(companyId: string, clientId: string, enabled: boolean) {
  return useQuery<{ items: WhatsAppTemplate[] }>({
    queryKey: whatsappKeys.templates(companyId, clientId),
    enabled: enabled && Boolean(companyId) && Boolean(clientId),
    queryFn: ({ signal }) => whatsappApi.listTemplates(companyId, clientId, signal),
    staleTime: 15_000,
  });
}

/** GET /integrations/whatsapp/messages[?status=…&campaignId=…] — Client-scoped, paginated to the backend's 50-row cap. */
export function useWhatsAppMessages(companyId: string, clientId: string, status: WhatsAppMessageStatus | "ALL", enabled: boolean, campaignId?: string) {
  return useQuery<{ items: WhatsAppMessage[] }>({
    queryKey: [...whatsappKeys.messages(companyId, clientId, status), campaignId],
    enabled: enabled && Boolean(companyId) && Boolean(clientId),
    queryFn: ({ signal }) => whatsappApi.listMessages(companyId, clientId, status === "ALL" ? undefined : status, campaignId, signal),
    staleTime: 5_000,
    // Keeps the previous status's rows on screen while the next filter loads.
    placeholderData: keepPreviousData,
  });
}

/** POST /integrations/whatsapp/messages/:id/retry — Retries a failed or rejected message. */
export function useRetryWhatsAppMessage() {
  const queryClient = useQueryClient();
  return useMutation<RetryWhatsAppMessageResult, Error, { companyId: string; clientId: string; messageId: string }>({
    mutationFn: ({ companyId, clientId, messageId }) => whatsappApi.retryMessage(companyId, clientId, messageId),
    onSuccess: (_, { companyId, clientId }) => {
      void queryClient.invalidateQueries({ queryKey: ["whatsapp", "messages", companyId, clientId] });
      void queryClient.invalidateQueries({ queryKey: whatsappKeys.overviewAnalytics(companyId, clientId) });
    },
  });
}

/** POST /integrations/whatsapp/campaigns — Create a new WhatsApp campaign & optional broadcast. */
export function useCreateWhatsAppCampaign() {
  const queryClient = useQueryClient();
  return useMutation<
    WhatsAppCampaignItem,
    Error,
    {
      companyId: string;
      clientId: string;
      name: string;
      status?: string;
      templateId?: string;
      recipients?: string[];
      variables?: Record<string, string>;
    }
  >({
    mutationFn: ({ companyId, clientId, ...payload }) =>
      whatsappApi.createCampaign(companyId, clientId, payload),
    onSuccess: (_, { companyId, clientId }) => {
      void queryClient.invalidateQueries({ queryKey: whatsappKeys.campaigns(companyId, clientId) });
      void queryClient.invalidateQueries({ queryKey: whatsappKeys.overviewAnalytics(companyId, clientId) });
      void queryClient.invalidateQueries({ queryKey: ["whatsapp", "messages", companyId, clientId] });
      void queryClient.invalidateQueries({ queryKey: whatsappKeys.contacts(companyId, clientId) });
    },
  });
}

/** POST /integrations/whatsapp/templates/sync — Pull approved templates from AiSensy. */
export function useSyncWhatsAppTemplates() {
  const queryClient = useQueryClient();
  return useMutation<
    { synced: number; created: number; updated: number; items: WhatsAppTemplate[] },
    Error,
    { companyId: string; clientId: string }
  >({
    mutationFn: ({ companyId, clientId }) => whatsappApi.syncTemplates(companyId, clientId),
    onSuccess: (_, { companyId, clientId }) => {
      void queryClient.invalidateQueries({ queryKey: whatsappKeys.templates(companyId, clientId) });
      void queryClient.invalidateQueries({ queryKey: whatsappKeys.templateAnalytics(companyId, clientId) });
      void queryClient.invalidateQueries({ queryKey: whatsappKeys.overviewAnalytics(companyId, clientId) });
      void queryClient.invalidateQueries({ queryKey: whatsappKeys.overview(companyId, clientId) });
    },
  });
}
