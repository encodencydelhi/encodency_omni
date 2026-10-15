"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { env } from "@/config/env";
import { useAuth } from "@/features/auth/components/auth-provider";
import { getStoredCompanyId } from "@/lib/api/tenancy-storage";
import { ApiError } from "@/types/api";
import { infraApi } from "./api";

export const INFRA_KEY = "infrastructure";

export function errorMessage(error: unknown, fallback = "Something went wrong. Please try again."): string {
  return ApiError.isApiError(error) && error.message ? error.message : fallback;
}

/**
 * The active Company, resolved from the signed-in user's memberships and the stored selection. Deliberately NOT
 * useTenancyContext(): that hook is not shared state, so every call re-fetched /clients (once per hook per page).
 * Servers & Domains needs only the Company; the Client list is loaded once, on demand, by the dialogs that need it.
 */
export function useScope() {
  const { user } = useAuth();
  const stored = getStoredCompanyId();
  const memberships = user?.memberships ?? [];
  const companyId = memberships.find((m) => m.companyId === stored)?.companyId ?? memberships[0]?.companyId ?? "";
  return { companyId, ready: Boolean(user) && Boolean(companyId) };
}

type Q = Record<string, string | number | undefined>;

export function useDashboard() {
  const { companyId, ready } = useScope();
  return useQuery({ queryKey: [INFRA_KEY, companyId, "dashboard"], enabled: ready, queryFn: ({ signal }) => infraApi.dashboard(companyId, signal), staleTime: 30_000 });
}
export function useInfraCapabilities() {
  const { companyId, ready } = useScope();
  return useQuery({ queryKey: [INFRA_KEY, companyId, "capabilities"], enabled: ready, queryFn: ({ signal }) => infraApi.capabilities(companyId, signal), staleTime: 5 * 60_000 });
}
export function useServers(q: Q) {
  const { companyId, ready } = useScope();
  return useQuery({ queryKey: [INFRA_KEY, companyId, "servers", q], enabled: ready, queryFn: ({ signal }) => infraApi.servers(companyId, q, signal), placeholderData: keepPreviousData, staleTime: 15_000 });
}
export function useDomains(q: Q) {
  const { companyId, ready } = useScope();
  return useQuery({ queryKey: [INFRA_KEY, companyId, "domains", q], enabled: ready, queryFn: ({ signal }) => infraApi.domains(companyId, q, signal), placeholderData: keepPreviousData, staleTime: 15_000 });
}
export function useAsset(id: string) {
  const { companyId, ready } = useScope();
  return useQuery({
    queryKey: [INFRA_KEY, companyId, "asset", id], enabled: ready && Boolean(id), queryFn: ({ signal }) => infraApi.asset(companyId, id, signal), staleTime: 10_000,
    retry: (count, error) => (ApiError.isApiError(error) && error.status === 404 ? false : count < 2),
  });
}
export function useCertificates() {
  const { companyId, ready } = useScope();
  return useQuery({ queryKey: [INFRA_KEY, companyId, "certificates"], enabled: ready, queryFn: ({ signal }) => infraApi.certificates(companyId, signal), staleTime: 30_000 });
}
export function useSubscriptions() {
  const { companyId, ready } = useScope();
  return useQuery({ queryKey: [INFRA_KEY, companyId, "subscriptions"], enabled: ready, queryFn: ({ signal }) => infraApi.subscriptions(companyId, signal), staleTime: 15_000 });
}
export function useRenewals(q: Q) {
  const { companyId, ready } = useScope();
  return useQuery({ queryKey: [INFRA_KEY, companyId, "renewals", q], enabled: ready, queryFn: ({ signal }) => infraApi.renewals(companyId, q, signal), placeholderData: keepPreviousData, staleTime: 15_000 });
}
export function usePaymentHistory(enabled: boolean) {
  const { companyId, ready } = useScope();
  return useQuery({ queryKey: [INFRA_KEY, companyId, "payments"], enabled: ready && enabled, queryFn: ({ signal }) => infraApi.paymentHistory(companyId, signal), staleTime: 60_000 });
}
export function useProviders() {
  const { companyId, ready } = useScope();
  return useQuery({ queryKey: [INFRA_KEY, companyId, "providers"], enabled: ready, queryFn: ({ signal }) => infraApi.providers(companyId, signal), staleTime: 15_000 });
}
export function useAlerts(q: Q) {
  const { companyId, ready } = useScope();
  return useQuery({ queryKey: [INFRA_KEY, companyId, "alerts", q], enabled: ready, queryFn: ({ signal }) => infraApi.alerts(companyId, q, signal), placeholderData: keepPreviousData, staleTime: 10_000 });
}
export function useInfraSettings() {
  const { companyId, ready } = useScope();
  return useQuery({ queryKey: [INFRA_KEY, companyId, "settings"], enabled: ready, queryFn: ({ signal }) => infraApi.settings(companyId, signal), staleTime: 60_000 });
}

/** Runs a write, reports the outcome, and refreshes every infrastructure view (counts, cost and alerts depend on each other). */
export function useInfraMutation<TInput, TResult>(run: (companyId: string, input: TInput) => Promise<TResult>, messages: { success?: string | ((result: TResult) => string); error?: string } = {}) {
  const { companyId } = useScope();
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: TInput) => run(companyId, input),
    onSuccess: (result) => {
      const msg = typeof messages.success === "function" ? messages.success(result) : messages.success;
      if (msg) toast.success(msg);
      void client.invalidateQueries({ queryKey: [INFRA_KEY, companyId] });
    },
    onError: (error) => toast.error(errorMessage(error, messages.error)),
  });
}

/** CSV download with the session cookie and Company header (a plain link would not carry the header). */
export async function downloadExport(companyId: string, what: "domains" | "servers" | "renewals") {
  const response = await fetch(`${env.apiBaseUrl}${infraApi.exportUrl(what)}`, { credentials: "include", headers: { "x-company-id": companyId } });
  if (!response.ok) throw new Error("The export could not be created.");
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `infrastructure-${what}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
