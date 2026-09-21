"use client";

/**
 * React access layer over the repository.
 *
 * Every Usage & Limits query key sits under the Companies key root. Usage is
 * derived from company bundles, plans and overrides, so anything that invalidates
 * the Companies caches - a new client, a plan change, an override granted or
 * revoked in Plans & Subscriptions - refreshes Usage & Limits with no extra wiring.
 */
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { useAuth } from "@/features/auth/components/auth-provider";
import { useCurrentStaff } from "@/features/companies/data/capability-provider";
import { companyKeys } from "@/features/companies/data/hooks";
import { ApiError } from "@/types/api";
import { deriveUsageCapabilities, type UsageCapabilities } from "./capabilities";
import { usageRepository } from "./repository";
import type { AlertQuery, CompanyUsageQuery, EventQuery, OverrideQuery, Period, ResourceKey, ThresholdPolicy } from "./types";

const ROOT = [...companyKeys.all, "usage-limits"] as const;

export const usageKeys = {
  all: ROOT,
  overview: (period: Period) => [...ROOT, "overview", period] as const,
  trend: (resource: string, period: Period, scope: unknown) => [...ROOT, "trend", resource, period, scope] as const,
  top: (resource: string, sort: string) => [...ROOT, "top", resource, sort] as const,
  companies: (query: CompanyUsageQuery) => [...ROOT, "companies", query] as const,
  company: (id: string) => [...ROOT, "company", id] as const,
  resources: [...ROOT, "resources"] as const,
  resource: (key: string) => [...ROOT, "resource", key] as const,
  alerts: (query: AlertQuery) => [...ROOT, "alerts", query] as const,
  alert: (id: string) => [...ROOT, "alert", id] as const,
  overrides: (query: OverrideQuery) => [...ROOT, "overrides", query] as const,
  override: (id: string) => [...ROOT, "override", id] as const,
  metering: [...ROOT, "metering"] as const,
  events: (query: EventQuery) => [...ROOT, "events", query] as const,
  event: (id: string) => [...ROOT, "event", id] as const,
};

export function useUsageCapabilities(): UsageCapabilities {
  const { can } = useAuth();
  return useMemo(() => deriveUsageCapabilities(can), [can]);
}

export const useOverview = (period: Period) => useQuery({ queryKey: usageKeys.overview(period), queryFn: () => usageRepository.getOverview(period), placeholderData: keepPreviousData });

export const useTrend = (resource: ResourceKey, period: Period, scope: { companyId?: string; clientId?: string } = {}) =>
  useQuery({ queryKey: usageKeys.trend(resource, period, scope), queryFn: () => usageRepository.getTrend(resource, period, scope), placeholderData: keepPreviousData });

export const useTopConsumers = (resource: ResourceKey, sort: "consumption" | "utilization") => useQuery({ queryKey: usageKeys.top(resource, sort), queryFn: () => usageRepository.getTopConsumers(resource, sort), placeholderData: keepPreviousData });

export const useCompanyUsageList = (query: CompanyUsageQuery) => useQuery({ queryKey: usageKeys.companies(query), queryFn: () => usageRepository.listCompanyUsage(query), placeholderData: keepPreviousData });

/** Fetches a directory result on demand, for exports that need every row rather than the visible page. */
export function useFetchCompanyUsage() {
  const queryClient = useQueryClient();
  return useMemo(() => (query: CompanyUsageQuery) => queryClient.fetchQuery({ queryKey: usageKeys.companies(query), queryFn: () => usageRepository.listCompanyUsage(query), staleTime: 0 }), [queryClient]);
}

export const useCompanyUsageDetail = (id: string) => useQuery({ queryKey: usageKeys.company(id), queryFn: () => usageRepository.getCompanyUsage(id), retry: false });

export const useResources = () => useQuery({ queryKey: usageKeys.resources, queryFn: () => usageRepository.listResources() });

export const useResource = (key: string) => useQuery({ queryKey: usageKeys.resource(key), queryFn: () => usageRepository.getResource(key), retry: false });

export const useAlerts = (query: AlertQuery) => useQuery({ queryKey: usageKeys.alerts(query), queryFn: () => usageRepository.listAlerts(query), placeholderData: keepPreviousData });

export const useAlert = (id: string | null) => useQuery({ queryKey: usageKeys.alert(id ?? ""), queryFn: () => usageRepository.getAlert(id ?? ""), enabled: Boolean(id), retry: false });

export const useOverrides = (query: OverrideQuery) => useQuery({ queryKey: usageKeys.overrides(query), queryFn: () => usageRepository.listOverrides(query), placeholderData: keepPreviousData });

export const useMetering = () => useQuery({ queryKey: usageKeys.metering, queryFn: () => usageRepository.getMetering() });

export const useEvents = (query: EventQuery) => useQuery({ queryKey: usageKeys.events(query), queryFn: () => usageRepository.listEvents(query), placeholderData: keepPreviousData });

export const useEvent = (id: string | null) => useQuery({ queryKey: usageKeys.event(id ?? ""), queryFn: () => usageRepository.getEvent(id ?? ""), enabled: Boolean(id), retry: false });

export function describeError(error: unknown, fallback = "Something went wrong. Nothing was changed.") {
  if (ApiError.isApiError(error)) return { message: error.message, fieldErrors: error.fieldErrors ?? {} };
  return { message: fallback, fieldErrors: {} as Record<string, string> };
}

export function useUsageMutations() {
  const queryClient = useQueryClient();
  const actor = useCurrentStaff();
  return useMemo(() => {
    const done = async <T,>(work: Promise<T>): Promise<T> => {
      const result = await work;
      await queryClient.invalidateQueries({ queryKey: ROOT });
      return result;
    };
    return {
      acknowledgeAlert: (id: string, note: string) => done(usageRepository.acknowledgeAlert(id, note, actor)),
      updateResourcePolicy: (key: ResourceKey, thresholds: ThresholdPolicy, reason: string) => done(usageRepository.updateResourcePolicy(key, thresholds, reason, actor)),
      resetDemoData: async () => {
        await usageRepository.resetDemoData?.();
        queryClient.removeQueries({ queryKey: ROOT });
        await queryClient.invalidateQueries({ queryKey: ROOT });
      },
    };
  }, [actor, queryClient]);
}

export type UsageMutations = ReturnType<typeof useUsageMutations>;
