"use client";

import { useMutation, useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { toast } from "sonner";
import { queryKeys } from "@/lib/query/keys";
import { ApiError, type ListParams } from "@/types/api";
import type { ChangeCompanyPlanInput, CompanyStatusChangeInput } from "@/types/domain/company";
import { companyService, type CompanyListParams } from "../services/company-service";

/**
 * `keepPreviousData` is used on every paged list so that changing page or
 * filter does not blank the table — the rows dim and swap instead.
 */
export function useCompanies(params: CompanyListParams) {
  return useQuery({
    queryKey: queryKeys.companies.list(params),
    queryFn: ({ signal }) => companyService.list(params, signal),
    placeholderData: keepPreviousData,
  });
}

export function useCompanyRefs() {
  return useQuery({
    queryKey: queryKeys.companies.list("refs"),
    queryFn: ({ signal }) => companyService.listRefs(signal),
    staleTime: 10 * 60_000,
  });
}

export function useCompany(id: string) {
  return useQuery({
    queryKey: queryKeys.companies.detail(id),
    queryFn: ({ signal }) => companyService.get(id, signal),
  });
}

export function useCompanyOverview(id: string) {
  return useQuery({
    queryKey: [...queryKeys.companies.detail(id), "overview"],
    queryFn: ({ signal }) => companyService.getOverview(id, signal),
  });
}

export function useCompanyClients(id: string, params: ListParams) {
  return useQuery({
    queryKey: [...queryKeys.companies.detail(id), "Clients", params],
    queryFn: ({ signal }) => companyService.listClients(id, params, signal),
    placeholderData: keepPreviousData,
  });
}

export function useCompanyUsers(id: string, params: ListParams) {
  return useQuery({
    queryKey: [...queryKeys.companies.detail(id), "users", params],
    queryFn: ({ signal }) => companyService.listUsers(id, params, signal),
    placeholderData: keepPreviousData,
  });
}

export function useCompanyIntegrations(id: string) {
  return useQuery({
    queryKey: [...queryKeys.companies.detail(id), "integrations"],
    queryFn: ({ signal }) => companyService.listIntegrations(id, signal),
  });
}

export function useCompanySubscription(id: string) {
  return useQuery({
    queryKey: [...queryKeys.companies.detail(id), "subscription"],
    queryFn: ({ signal }) => companyService.getSubscription(id, signal),
  });
}

export function useCompanyUsage(id: string) {
  return useQuery({
    queryKey: [...queryKeys.companies.detail(id), "usage"],
    queryFn: ({ signal }) => companyService.listUsage(id, signal),
  });
}

export function useCompanyActivity(id: string) {
  return useQuery({
    queryKey: [...queryKeys.companies.detail(id), "activity"],
    queryFn: ({ signal }) => companyService.listActivity(id, signal),
  });
}

export function useCompanyAuditLogs(id: string, params: ListParams) {
  return useQuery({
    queryKey: [...queryKeys.companies.detail(id), "audit-logs", params],
    queryFn: ({ signal }) => companyService.listAuditLogs(id, params, signal),
    placeholderData: keepPreviousData,
  });
}

function describeFailure(error: unknown, fallback: string): string {
  return ApiError.isApiError(error) ? error.message : fallback;
}

export function useChangeCompanyStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CompanyStatusChangeInput) => companyService.changeStatus(input),
    onSuccess: (company) => {
      // The dashboard and audit trail both derive from company state.
      void queryClient.invalidateQueries({ queryKey: queryKeys.companies.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
      toast.success(
        company.status === "suspended"
          ? `${company.name} has been suspended`
          : `${company.name} is active again`,
      );
    },
    onError: (error) => {
      toast.error(describeFailure(error, "The status change could not be applied."));
    },
  });
}

export function useChangeCompanyPlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: ChangeCompanyPlanInput) => companyService.changePlan(input),
    onSuccess: (company) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.companies.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.subscriptions.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.billing.all });
      toast.success(`${company.name} moved to the ${company.planTier} plan`);
    },
    onError: (error) => {
      toast.error(describeFailure(error, "The plan change could not be applied."));
    },
  });
}
