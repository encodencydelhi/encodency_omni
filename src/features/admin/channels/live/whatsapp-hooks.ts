"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { integrationsApi, type ProviderOverview } from "@/features/admin/integrations/live/integrations-api";
import {
  whatsappApi,
  type WhatsAppConfigState,
  type WhatsAppMessage,
  type WhatsAppMessageStatus,
  type WhatsAppTemplate,
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

/** GET /integrations/whatsapp/templates — Client-scoped. */
export function useWhatsAppTemplates(companyId: string, clientId: string, enabled: boolean) {
  return useQuery<{ items: WhatsAppTemplate[] }>({
    queryKey: whatsappKeys.templates(companyId, clientId),
    enabled: enabled && Boolean(companyId) && Boolean(clientId),
    queryFn: ({ signal }) => whatsappApi.listTemplates(companyId, clientId, signal),
    staleTime: 15_000,
  });
}

/** GET /integrations/whatsapp/messages[?status=…] — Client-scoped, paginated to the backend's 50-row cap. */
export function useWhatsAppMessages(companyId: string, clientId: string, status: WhatsAppMessageStatus | "ALL", enabled: boolean) {
  return useQuery<{ items: WhatsAppMessage[] }>({
    queryKey: whatsappKeys.messages(companyId, clientId, status),
    enabled: enabled && Boolean(companyId) && Boolean(clientId),
    queryFn: ({ signal }) => whatsappApi.listMessages(companyId, clientId, status === "ALL" ? undefined : status, signal),
    staleTime: 5_000,
    // Keeps the previous status's rows on screen while the next filter loads.
    placeholderData: keepPreviousData,
  });
}
