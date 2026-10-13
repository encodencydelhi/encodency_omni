"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAdminContext } from "../../shell/admin-context";
import { automationApi, type ClientScope, type RunFilters } from "./automation-api";

/** The selected Client (null = "All Clients", read-only). */
export function useAutomationScope(): { clientId: ClientScope; clientName: string } {
  const { Clients, selectedProjectId } = useAdminContext();
  if (selectedProjectId === "all") return { clientId: null, clientName: "All Clients" };
  const client = Clients.find((c) => c.id === selectedProjectId);
  return { clientId: selectedProjectId, clientName: client?.name ?? "Client" };
}

export const automationKeys = {
  all: ["automation"] as const,
  workflows: (clientId: ClientScope, days: number) => ["automation", "workflows", clientId, days] as const,
  runs: (clientId: ClientScope, filters: RunFilters) => ["automation", "runs", clientId, filters] as const,
  analytics: (clientId: ClientScope, days: number) => ["automation", "analytics", clientId, days] as const,
  health: (clientId: ClientScope) => ["automation", "health", clientId] as const,
  logs: (clientId: ClientScope) => ["automation", "logs", clientId] as const,
  templates: (clientId: ClientScope) => ["automation", "templates", clientId] as const,
};

export function useWorkflows(clientId: ClientScope, days = 30) {
  return useQuery({ queryKey: automationKeys.workflows(clientId, days), queryFn: () => automationApi.listWorkflows(clientId, days), staleTime: 15_000 });
}

export function useRuns(clientId: ClientScope, filters: RunFilters, options: { refetchInterval?: number } = {}) {
  return useQuery({ queryKey: automationKeys.runs(clientId, filters), queryFn: () => automationApi.listRuns(clientId, filters), staleTime: 10_000, refetchInterval: options.refetchInterval });
}

export function useAutomationAnalytics(clientId: ClientScope, days: number) {
  return useQuery({ queryKey: automationKeys.analytics(clientId, days), queryFn: () => automationApi.analytics(clientId, days), staleTime: 15_000 });
}

export function useAutomationHealth(clientId: ClientScope, refetchInterval?: number) {
  return useQuery({ queryKey: automationKeys.health(clientId), queryFn: () => automationApi.health(clientId), staleTime: 10_000, refetchInterval });
}

export function useAutomationLogs(clientId: ClientScope, refetchInterval?: number) {
  return useQuery({ queryKey: automationKeys.logs(clientId), queryFn: () => automationApi.logs(clientId), staleTime: 5_000, refetchInterval });
}

export function useAutomationTemplates(clientId: ClientScope) {
  return useQuery({ queryKey: automationKeys.templates(clientId), queryFn: () => automationApi.templates(clientId), staleTime: 60_000 });
}

/** Invalidate everything automation-related after a write. */
export function useInvalidateAutomation() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: automationKeys.all });
}

export function useAutomationMutation<TArgs, TResult>(fn: (args: TArgs) => Promise<TResult>) {
  const invalidate = useInvalidateAutomation();
  return useMutation({ mutationFn: fn, onSuccess: () => invalidate() });
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "The request could not be completed.";
}
