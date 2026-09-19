"use client";

/**
 * React access layer over the repository.
 *
 * Queries share one key root, so a single invalidation after any mutation
 * refreshes every screen that shows tenant data - list, KPIs, drawer, detail
 * header and each tab. Company-scoped queries include the company id in their
 * key, so opening Company B can never render Company A's cached records.
 */
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { ApiError } from "@/types/api";
import { useCurrentStaff } from "./capability-provider";
import { companiesRepository } from "./repository";
import type {
  ActivityFilter,
  ChangePlanInput,
  CompanyInternalOwner,
  CompanyListQuery,
  CompanyNotificationInput,
  CreateCompanyInput,
  NoteInput,
  SuspensionReason,
  UpdateCompanyInput,
  UsageOverrideInput,
  UsageResource,
} from "./types";

const ROOT = ["tenant-workspace"] as const;

export const companyKeys = {
  all: ROOT,
  list: (query: CompanyListQuery) => [...ROOT, "list", query] as const,
  portfolio: [...ROOT, "portfolio"] as const,
  directory: [...ROOT, "directory"] as const,
  plans: [...ROOT, "plans"] as const,
  staff: [...ROOT, "staff"] as const,
  platformUsers: (email: string) => [...ROOT, "platform-users", email] as const,
  company: (id: string) => [...ROOT, "company", id] as const,
  section: (id: string, section: string, params?: unknown) => [...ROOT, "company", id, section, params ?? null] as const,
};

/** Lists change often and are re-read after every mutation; keep the old rows while refetching. */
export function useCompaniesList(query: CompanyListQuery) {
  return useQuery({
    queryKey: companyKeys.list(query),
    queryFn: () => companiesRepository.listCompanies(query),
    placeholderData: keepPreviousData,
  });
}

export function usePortfolio() {
  return useQuery({ queryKey: companyKeys.portfolio, queryFn: () => companiesRepository.getPortfolio() });
}

export function useDirectory() {
  return useQuery({ queryKey: companyKeys.directory, queryFn: () => companiesRepository.getDirectory() });
}

export function usePlans() {
  return useQuery({ queryKey: companyKeys.plans, queryFn: () => companiesRepository.listPlans(), staleTime: 10 * 60_000 });
}

export function useStaff() {
  return useQuery({ queryKey: companyKeys.staff, queryFn: () => companiesRepository.listStaff(), staleTime: 10 * 60_000 });
}

export function usePlatformUserLookup(email: string, enabled: boolean) {
  return useQuery({
    queryKey: companyKeys.platformUsers(email),
    queryFn: () => companiesRepository.findPlatformUsers(email),
    enabled,
  });
}

export function useCompany(id: string) {
  return useQuery({ queryKey: companyKeys.company(id), queryFn: () => companiesRepository.getCompany(id), retry: false });
}

export function useCompanyOverview(id: string) {
  return useQuery({ queryKey: companyKeys.section(id, "overview"), queryFn: () => companiesRepository.getOverview(id), retry: false });
}

export function useCompanyUsers(id: string) {
  return useQuery({ queryKey: companyKeys.section(id, "users"), queryFn: () => companiesRepository.getUsers(id), retry: false });
}

export function useCompanyClients(id: string) {
  return useQuery({ queryKey: companyKeys.section(id, "clients"), queryFn: () => companiesRepository.getClients(id), retry: false });
}

export function useCompanySubscription(id: string) {
  return useQuery({ queryKey: companyKeys.section(id, "subscription"), queryFn: () => companiesRepository.getSubscription(id), retry: false });
}

export function useCompanyBilling(id: string) {
  return useQuery({ queryKey: companyKeys.section(id, "billing"), queryFn: () => companiesRepository.getBilling(id), retry: false });
}

export function useCompanyUsage(id: string) {
  return useQuery({ queryKey: companyKeys.section(id, "usage"), queryFn: () => companiesRepository.getUsage(id), retry: false });
}

export function useUsageHistory(id: string, resource: UsageResource, range: { from: string; to: string }) {
  return useQuery({
    queryKey: companyKeys.section(id, "usage-history", { resource, ...range }),
    queryFn: () => companiesRepository.getUsageHistory(id, resource, range),
    placeholderData: keepPreviousData,
    retry: false,
  });
}

export function useCompanyIntegrations(id: string) {
  return useQuery({ queryKey: companyKeys.section(id, "integrations"), queryFn: () => companiesRepository.getIntegrations(id), retry: false });
}

export function useCompanyActivity(id: string, filter: ActivityFilter) {
  return useQuery({
    queryKey: companyKeys.section(id, "activity", filter),
    queryFn: () => companiesRepository.getActivity(id, filter),
    placeholderData: keepPreviousData,
    retry: false,
  });
}

export function useCompanySecurity(id: string) {
  return useQuery({ queryKey: companyKeys.section(id, "security"), queryFn: () => companiesRepository.getSecurity(id), retry: false });
}

/* ------------------------------------------------------------------ */
/* Mutations                                                           */
/* ------------------------------------------------------------------ */

export interface DescribedError {
  message: string;
  fieldErrors: Record<string, string>;
}

export function describeError(error: unknown, fallback = "Something went wrong. Nothing was changed."): DescribedError {
  if (ApiError.isApiError(error)) return { message: error.message, fieldErrors: error.fieldErrors ?? {} };
  return { message: fallback, fieldErrors: {} };
}

/**
 * Every write goes through here so that, once it succeeds, all tenant queries
 * are refreshed before the caller continues. Components own their pending and
 * error state; this hook owns cache consistency and the acting staff member.
 */
export function useCompanyMutations() {
  const queryClient = useQueryClient();
  const actor = useCurrentStaff();

  return useMemo(() => {
    const repo = companiesRepository;
    const done = async <T,>(work: Promise<T>): Promise<T> => {
      const result = await work;
      await queryClient.invalidateQueries({ queryKey: ROOT });
      return result;
    };

    return {
      createCompany: (input: CreateCompanyInput) => done(repo.createCompany(input, actor)),
      updateCompany: (id: string, input: UpdateCompanyInput) => done(repo.updateCompany(id, input, actor)),
      suspendCompanies: (ids: string[], input: { reason: SuspensionReason; note: string }) => done(repo.suspendCompanies(ids, input, actor)),
      reactivateCompanies: (ids: string[], input: { note: string }) => done(repo.reactivateCompanies(ids, input, actor)),
      archiveCompany: (id: string, input: { note: string }) => done(repo.archiveCompany(id, input, actor)),
      transferOwnership: (id: string, input: { newOwnerUserId: string; note: string }) => done(repo.transferOwnership(id, input, actor)),
      assignInternalOwners: (ids: string[], patch: Partial<CompanyInternalOwner>) => done(repo.assignInternalOwners(ids, patch, actor)),
      sendNotification: (ids: string[], input: CompanyNotificationInput) => done(repo.sendNotification(ids, input, actor)),

      changePlan: (id: string, input: ChangePlanInput) => done(repo.changePlan(id, input, actor)),
      extendTrial: (id: string, input: { days: number; reason: string }) => done(repo.extendTrial(id, input, actor)),
      convertTrialToPaid: (id: string, input: { billingCycle: "monthly" | "annual" }) => done(repo.convertTrialToPaid(id, input, actor)),
      changeBillingCycle: (id: string, input: { billingCycle: "monthly" | "annual"; reason: string }) => done(repo.changeBillingCycle(id, input, actor)),
      scheduleCancellation: (id: string, input: { reason: string }) => done(repo.scheduleCancellation(id, input, actor)),
      reactivateSubscription: (id: string) => done(repo.reactivateSubscription(id, actor)),
      applyUsageOverride: (id: string, input: UsageOverrideInput) => done(repo.applyUsageOverride(id, input, actor)),

      setUserStatus: (id: string, userId: string, status: "active" | "suspended") => done(repo.setUserStatus(id, userId, status, actor)),
      requireUserTwoFactor: (id: string, userId: string) => done(repo.requireUserTwoFactor(id, userId, actor)),
      requireCompanyTwoFactor: (id: string) => done(repo.requireCompanyTwoFactor(id, actor)),
      requirePasswordReset: (id: string) => done(repo.requirePasswordReset(id, actor)),
      revokeSessions: (id: string) => done(repo.revokeSessions(id, actor)),
      setAccessLock: (id: string, input: { locked: boolean; reason: string }) => done(repo.setAccessLock(id, input, actor)),
      resendOwnerInvitation: (id: string) => done(repo.resendOwnerInvitation(id, actor)),

      addNote: (id: string, input: NoteInput) => done(repo.addNote(id, input, actor)),
      updateNote: (id: string, noteId: string, input: NoteInput) => done(repo.updateNote(id, noteId, input, actor)),
      setNotePinned: (id: string, noteId: string, pinned: boolean) => done(repo.setNotePinned(id, noteId, pinned, actor)),
      deleteNote: (id: string, noteId: string) => done(repo.deleteNote(id, noteId, actor)),

      resetDemoData: async () => {
        await repo.resetDemoData?.();
        queryClient.removeQueries({ queryKey: ROOT });
        await queryClient.invalidateQueries({ queryKey: ROOT });
      },
    };
  }, [actor, queryClient]);
}

export type CompanyMutations = ReturnType<typeof useCompanyMutations>;
