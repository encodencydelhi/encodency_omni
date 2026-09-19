/**
 * EnCodency OmniPlatform - Super Admin Integrations Module
 * React Query Hooks for Integrations Data and Mutations
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { integrationsRepository } from "./repository";
import type {
  IntegrationSettings,
  IssueStatus,
  PlatformAvailability,
  ProviderConfiguration,
} from "./types";

export const INTEGRATION_QUERY_KEYS = {
  all: ["integrations"] as const,
  kpis: () => [...INTEGRATION_QUERY_KEYS.all, "kpis"] as const,
  providers: () => [...INTEGRATION_QUERY_KEYS.all, "providers"] as const,
  provider: (id: string) => [...INTEGRATION_QUERY_KEYS.all, "provider", id] as const,
  providerConfig: (id: string) => [...INTEGRATION_QUERY_KEYS.all, "provider-config", id] as const,
  capabilities: (providerId?: string) => [...INTEGRATION_QUERY_KEYS.all, "capabilities", providerId ?? "all"] as const,
  connections: (providerId?: string) => [...INTEGRATION_QUERY_KEYS.all, "connections", providerId ?? "all"] as const,
  connection: (id: string) => [...INTEGRATION_QUERY_KEYS.all, "connection", id] as const,
  resources: (authId?: string) => [...INTEGRATION_QUERY_KEYS.all, "resources", authId ?? "all"] as const,
  mappings: (authId?: string) => [...INTEGRATION_QUERY_KEYS.all, "mappings", authId ?? "all"] as const,
  issues: () => [...INTEGRATION_QUERY_KEYS.all, "issues"] as const,
  issue: (id: string) => [...INTEGRATION_QUERY_KEYS.all, "issue", id] as const,
  activities: () => [...INTEGRATION_QUERY_KEYS.all, "activities"] as const,
  reauthRequests: () => [...INTEGRATION_QUERY_KEYS.all, "reauth-requests"] as const,
  settings: () => [...INTEGRATION_QUERY_KEYS.all, "settings"] as const,
};

// -------------------------------------------------------------
// Queries
// -------------------------------------------------------------

const DEFAULT_STALE_TIME = 5 * 60 * 1000;

export function useIntegrationsKpis() {
  return useQuery({
    queryKey: INTEGRATION_QUERY_KEYS.kpis(),
    queryFn: () => integrationsRepository.getOverviewKpis(),
    staleTime: DEFAULT_STALE_TIME,
  });
}

export function useProviders() {
  return useQuery({
    queryKey: INTEGRATION_QUERY_KEYS.providers(),
    queryFn: () => integrationsRepository.getProviders(),
    staleTime: DEFAULT_STALE_TIME,
  });
}

export function useProvider(id: string) {
  return useQuery({
    queryKey: INTEGRATION_QUERY_KEYS.provider(id),
    queryFn: () => integrationsRepository.getProviderById(id),
    enabled: Boolean(id),
    staleTime: DEFAULT_STALE_TIME,
  });
}

export function useProviderConfig(providerId: string) {
  return useQuery({
    queryKey: INTEGRATION_QUERY_KEYS.providerConfig(providerId),
    queryFn: () => integrationsRepository.getProviderConfig(providerId),
    enabled: Boolean(providerId),
    staleTime: DEFAULT_STALE_TIME,
  });
}

export function useProviderCapabilities(providerId?: string) {
  return useQuery({
    queryKey: INTEGRATION_QUERY_KEYS.capabilities(providerId),
    queryFn: () => integrationsRepository.getProviderCapabilities(providerId),
    staleTime: DEFAULT_STALE_TIME,
  });
}

export function useConnections(providerId?: string) {
  return useQuery({
    queryKey: INTEGRATION_QUERY_KEYS.connections(providerId),
    queryFn: () => integrationsRepository.getAuthorizations(providerId),
    staleTime: DEFAULT_STALE_TIME,
  });
}

export function useConnection(id: string) {
  return useQuery({
    queryKey: INTEGRATION_QUERY_KEYS.connection(id),
    queryFn: () => integrationsRepository.getAuthorizationById(id),
    enabled: Boolean(id),
    staleTime: DEFAULT_STALE_TIME,
  });
}

export function useConnectionResources(authId?: string) {
  return useQuery({
    queryKey: INTEGRATION_QUERY_KEYS.resources(authId),
    queryFn: () => integrationsRepository.getResources(authId),
    staleTime: DEFAULT_STALE_TIME,
  });
}

export function useConnectionMappings(authId?: string) {
  return useQuery({
    queryKey: INTEGRATION_QUERY_KEYS.mappings(authId),
    queryFn: () => integrationsRepository.getMappings(authId),
    staleTime: DEFAULT_STALE_TIME,
  });
}

export function useIntegrationIssues() {
  return useQuery({
    queryKey: INTEGRATION_QUERY_KEYS.issues(),
    queryFn: () => integrationsRepository.getIssues(),
    staleTime: DEFAULT_STALE_TIME,
  });
}

export function useIntegrationIssue(id: string) {
  return useQuery({
    queryKey: INTEGRATION_QUERY_KEYS.issue(id),
    queryFn: () => integrationsRepository.getIssueById(id),
    enabled: Boolean(id),
    staleTime: DEFAULT_STALE_TIME,
  });
}

export function useIntegrationActivities() {
  return useQuery({
    queryKey: INTEGRATION_QUERY_KEYS.activities(),
    queryFn: () => integrationsRepository.getActivities(),
    staleTime: DEFAULT_STALE_TIME,
  });
}

export function useReauthorizationRequests() {
  return useQuery({
    queryKey: INTEGRATION_QUERY_KEYS.reauthRequests(),
    queryFn: () => integrationsRepository.getReauthorizationRequests(),
    staleTime: DEFAULT_STALE_TIME,
  });
}

export function useIntegrationSettings() {
  return useQuery({
    queryKey: INTEGRATION_QUERY_KEYS.settings(),
    queryFn: () => integrationsRepository.getSettings(),
    staleTime: DEFAULT_STALE_TIME,
  });
}

// -------------------------------------------------------------
// Mutations
// -------------------------------------------------------------

export function useUpdateProviderAvailability() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (variables: {
      providerId: string;
      newAvailability: PlatformAvailability;
      reason: string;
    }) =>
      integrationsRepository.updateProviderAvailability(
        variables.providerId,
        variables.newAvailability,
        variables.reason
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: INTEGRATION_QUERY_KEYS.all });
    },
  });
}

export function useUpdateProviderOperationalControls() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (variables: {
      providerId: string;
      controls: Partial<Pick<ProviderConfiguration, "allowNewConnections" | "allowExistingPublishing" | "allowExistingSync" | "enableWebhooks" | "maintenanceMode" | "visibilityInCompanyAdmin">>;
    }) =>
      integrationsRepository.updateProviderOperationalControls(
        variables.providerId,
        variables.controls
      ),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: INTEGRATION_QUERY_KEYS.providerConfig(variables.providerId) });
      queryClient.invalidateQueries({ queryKey: INTEGRATION_QUERY_KEYS.provider(variables.providerId) });
      queryClient.invalidateQueries({ queryKey: INTEGRATION_QUERY_KEYS.activities() });
    },
  });
}

export function useUpdateProviderConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (variables: {
      providerId: string;
      updates: Partial<ProviderConfiguration>;
    }) =>
      integrationsRepository.updateProviderConfig(
        variables.providerId,
        variables.updates
      ),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: INTEGRATION_QUERY_KEYS.providerConfig(variables.providerId) });
      queryClient.invalidateQueries({ queryKey: INTEGRATION_QUERY_KEYS.provider(variables.providerId) });
      queryClient.invalidateQueries({ queryKey: INTEGRATION_QUERY_KEYS.providers() });
      queryClient.invalidateQueries({ queryKey: INTEGRATION_QUERY_KEYS.activities() });
    },
  });
}

export function useToggleCapability() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (variables: { capabilityId: string; enabled: boolean }) =>
      integrationsRepository.toggleCapability(variables.capabilityId, variables.enabled),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: INTEGRATION_QUERY_KEYS.all });
    },
  });
}

export function useCreateReauthorizationRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (variables: {
      providerId: string;
      authorizationId: string;
      companyId: string;
      companyName: string;
      affectedAccount: string;
      affectedClients: string[];
      missingScopes: string[];
      reason: string;
      targetRole: "owner" | "admin";
    }) => integrationsRepository.createReauthorizationRequest(variables),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: INTEGRATION_QUERY_KEYS.reauthRequests() });
      queryClient.invalidateQueries({ queryKey: INTEGRATION_QUERY_KEYS.connections() });
      queryClient.invalidateQueries({ queryKey: INTEGRATION_QUERY_KEYS.kpis() });
      queryClient.invalidateQueries({ queryKey: INTEGRATION_QUERY_KEYS.activities() });
    },
  });
}

export function useUpdateIssueStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (variables: {
      issueId: string;
      newStatus: IssueStatus;
      noteContent?: string;
    }) =>
      integrationsRepository.updateIssueStatus(
        variables.issueId,
        variables.newStatus,
        variables.noteContent
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: INTEGRATION_QUERY_KEYS.issues() });
      queryClient.invalidateQueries({ queryKey: INTEGRATION_QUERY_KEYS.kpis() });
      queryClient.invalidateQueries({ queryKey: INTEGRATION_QUERY_KEYS.activities() });
    },
  });
}

export function useAssignIssueOwner() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (variables: {
      issueId: string;
      owner: { id: string; name: string; email: string } | null;
    }) => integrationsRepository.assignIssueOwner(variables.issueId, variables.owner),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: INTEGRATION_QUERY_KEYS.issues() });
    },
  });
}

export function useAddIssueNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (variables: { issueId: string; content: string }) =>
      integrationsRepository.addIssueNote(variables.issueId, variables.content),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: INTEGRATION_QUERY_KEYS.issues() });
    },
  });
}

export function useUpdateIntegrationSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (newSettings: Partial<IntegrationSettings>) =>
      integrationsRepository.updateSettings(newSettings),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: INTEGRATION_QUERY_KEYS.settings() });
      queryClient.invalidateQueries({ queryKey: INTEGRATION_QUERY_KEYS.activities() });
    },
  });
}

export function useResetIntegrationsDemo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => integrationsRepository.resetDemo(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: INTEGRATION_QUERY_KEYS.all });
    },
  });
}
