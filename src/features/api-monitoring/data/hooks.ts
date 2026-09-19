/**
 * EnCodency OmniPlatform - Super Admin API Monitoring Module
 * React Query Hooks
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiMonitoringRepository } from "./repository";
import type { EndpointStatus, RateLimitState } from "./types";

export const API_MONITORING_QUERY_KEYS = {
  all: ["api-monitoring"] as const,
  kpis: () => [...API_MONITORING_QUERY_KEYS.all, "kpis"] as const,
  endpoints: () => [...API_MONITORING_QUERY_KEYS.all, "endpoints"] as const,
  endpoint: (id: string) => [...API_MONITORING_QUERY_KEYS.all, "endpoint", id] as const,
  providerHealth: () => [...API_MONITORING_QUERY_KEYS.all, "provider-health"] as const,
  errorLogs: (endpointId?: string) => [...API_MONITORING_QUERY_KEYS.all, "error-logs", endpointId ?? "all"] as const,
  requestLogs: (endpointId?: string) => [...API_MONITORING_QUERY_KEYS.all, "request-logs", endpointId ?? "all"] as const,
  errorBreakdown: () => [...API_MONITORING_QUERY_KEYS.all, "error-breakdown"] as const,
  requestTrends: () => [...API_MONITORING_QUERY_KEYS.all, "request-trends"] as const,
  activities: () => [...API_MONITORING_QUERY_KEYS.all, "activities"] as const,
};

export function useApiMonitoringKpis() {
  return useQuery({
    queryKey: API_MONITORING_QUERY_KEYS.kpis(),
    queryFn: () => apiMonitoringRepository.getKpis(),
  });
}

export function useApiEndpoints() {
  return useQuery({
    queryKey: API_MONITORING_QUERY_KEYS.endpoints(),
    queryFn: () => apiMonitoringRepository.getEndpoints(),
  });
}

export function useApiEndpoint(id: string) {
  return useQuery({
    queryKey: API_MONITORING_QUERY_KEYS.endpoint(id),
    queryFn: () => apiMonitoringRepository.getEndpointById(id),
    enabled: Boolean(id),
  });
}

export function useProviderApiHealth() {
  return useQuery({
    queryKey: API_MONITORING_QUERY_KEYS.providerHealth(),
    queryFn: () => apiMonitoringRepository.getProviderHealth(),
  });
}

export function useApiErrorLogs(endpointId?: string) {
  return useQuery({
    queryKey: API_MONITORING_QUERY_KEYS.errorLogs(endpointId),
    queryFn: () => apiMonitoringRepository.getErrorLogs(endpointId),
  });
}

export function useApiRequestLogs(endpointId?: string) {
  return useQuery({
    queryKey: API_MONITORING_QUERY_KEYS.requestLogs(endpointId),
    queryFn: () => apiMonitoringRepository.getRequestLogs(endpointId),
  });
}

export function useApiErrorBreakdown() {
  return useQuery({
    queryKey: API_MONITORING_QUERY_KEYS.errorBreakdown(),
    queryFn: () => apiMonitoringRepository.getErrorBreakdown(),
  });
}

export function useRequestTrends() {
  return useQuery({
    queryKey: API_MONITORING_QUERY_KEYS.requestTrends(),
    queryFn: () => apiMonitoringRepository.getRequestTrends(),
  });
}

export function useApiActivities() {
  return useQuery({
    queryKey: API_MONITORING_QUERY_KEYS.activities(),
    queryFn: () => apiMonitoringRepository.getActivities(),
  });
}

export function useUpdateEndpointStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ endpointId, status }: { endpointId: string; status: EndpointStatus }) =>
      apiMonitoringRepository.updateEndpointStatus(endpointId, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: API_MONITORING_QUERY_KEYS.endpoints() });
      qc.invalidateQueries({ queryKey: API_MONITORING_QUERY_KEYS.providerHealth() });
      qc.invalidateQueries({ queryKey: API_MONITORING_QUERY_KEYS.kpis() });
    },
  });
}

export function useUpdateRateLimitState() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ endpointId, state }: { endpointId: string; state: RateLimitState }) =>
      apiMonitoringRepository.updateRateLimitState(endpointId, state),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: API_MONITORING_QUERY_KEYS.endpoints() });
      qc.invalidateQueries({ queryKey: API_MONITORING_QUERY_KEYS.kpis() });
    },
  });
}

export function useResetApiMonitoringDemo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => apiMonitoringRepository.resetDemo(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: API_MONITORING_QUERY_KEYS.all });
    },
  });
}
