"use client";

import { useQuery } from "@tanstack/react-query";
import { integrationsApi, type ClientChannelOverview, type ProviderOverview } from "@/features/admin/integrations/live/integrations-api";

export const linkedinKeys = {
  overview: (companyId: string, clientId: string) => ["linkedin-channel", "overview", companyId, clientId] as const,
};

export function useLinkedInOverview(companyId: string, clientId: string, enabled: boolean) {
  return useQuery<ClientChannelOverview>({
    queryKey: linkedinKeys.overview(companyId, clientId),
    enabled: enabled && Boolean(companyId) && Boolean(clientId),
    queryFn: ({ signal }) => integrationsApi.getOverview(companyId, clientId, signal),
    staleTime: 15_000,
  });
}

export function linkedinProvider(
  overview: ClientChannelOverview | undefined,
): ProviderOverview | null {
  return overview?.providers.find((row) => row.provider === "LINKEDIN") ?? null;
}
