"use client";

import { useQuery } from "@tanstack/react-query";
import { clientsApi } from "@/features/admin/projects/live/clients-api";
import { useTenancyContext } from "@/lib/api/tenancy-context";

/**
 * The Company's real Clients (names and ids) for the settings page: the header's "Client", the workspace dropdowns and the export.
 * Also tells which Client the person is working on right now, so nothing here is a made-up name.
 */
export function useSettingsClients() {
  const { companyId, clientId, isReady } = useTenancyContext();
  const query = useQuery({
    queryKey: ["settings", companyId, "clients"],
    enabled: isReady && Boolean(companyId),
    queryFn: () => clientsApi.list(companyId),
    staleTime: 30_000,
  });
  const clients = (query.data ?? []).map((client) => ({ id: client.id, name: client.displayName?.trim() || client.name }));
  const current = clients.find((client) => client.id === clientId) ?? null;
  return { clients, names: clients.map((client) => client.name), current, isLoading: query.isLoading };
}
