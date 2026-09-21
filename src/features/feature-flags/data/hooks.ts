"use client";

/**
 * React access layer over the repository.
 *
 * Feature Flags query keys sit under the Companies key root as well: availability
 * is derived from company, subscription and plan records, so anything that
 * invalidates those caches (a plan change, a new company) refreshes flag impact
 * with no extra wiring, and a flag change refreshes everything under this root.
 */
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { useAuth } from "@/features/auth/components/auth-provider";
import { useCurrentStaff } from "@/features/companies/data/capability-provider";
import { companyKeys } from "@/features/companies/data/hooks";
import { ApiError } from "@/types/api";
import { deriveFlagCapabilities, type FlagCapabilities } from "./capabilities";
import type { ChangesQuery, CompanyImpactQuery, OverviewFilter } from "./repository";
import { flagsRepository } from "./repository";
import type { ConfigDiff, CreateFlagInput, Environment, FeatureFlag, FlagListQuery, ProposeChangeInput } from "./types";

const ROOT = [...companyKeys.all, "feature-flags"] as const;

export const flagKeys = {
  all: ROOT,
  overview: (env: Environment, filter: OverviewFilter) => [...ROOT, "overview", env, filter] as const,
  list: (query: FlagListQuery) => [...ROOT, "list", query] as const,
  flag: (key: string, env: Environment) => [...ROOT, "flag", key, env] as const,
  preview: (key: string, env: Environment, proposed: unknown) => [...ROOT, "preview", key, env, proposed] as const,
  impact: (key: string, env: Environment, query: CompanyImpactQuery) => [...ROOT, "impact", key, env, query] as const,
  evaluation: (key: string, env: Environment, company: string) => [...ROOT, "evaluation", key, env, company] as const,
  access: (company: string, env: Environment) => [...ROOT, "access", company, env] as const,
  companies: (term: string) => [...ROOT, "companies", term] as const,
  changes: (query: ChangesQuery) => [...ROOT, "changes", query] as const,
  change: (id: string) => [...ROOT, "change", id] as const,
  activity: (query: ChangesQuery) => [...ROOT, "activity", query] as const,
  versions: (flag: string | null, env: Environment) => [...ROOT, "versions", flag, env] as const,
  comparison: (from: string, to: string) => [...ROOT, "comparison", from, to] as const,
};

export function useFlagCapabilities(): FlagCapabilities {
  const { can } = useAuth();
  return useMemo(() => deriveFlagCapabilities(can), [can]);
}

export const useOverview = (env: Environment, filter: OverviewFilter = {}) => useQuery({ queryKey: flagKeys.overview(env, filter), queryFn: () => flagsRepository.getOverview(env, filter), placeholderData: keepPreviousData });

export const useFlagList = (query: FlagListQuery) => useQuery({ queryKey: flagKeys.list(query), queryFn: () => flagsRepository.listFlags(query), placeholderData: keepPreviousData });

/** Fetches a list result on demand, for exports that need every matching row. */
export function useFetchFlags() {
  const queryClient = useQueryClient();
  return useMemo(() => (query: FlagListQuery) => queryClient.fetchQuery({ queryKey: flagKeys.list(query), queryFn: () => flagsRepository.listFlags(query), staleTime: 0 }), [queryClient]);
}

export const useFlag = (key: string, env: Environment) => useQuery({ queryKey: flagKeys.flag(key, env), queryFn: () => flagsRepository.getFlag(key, env), retry: false });

export const useChangePreview = (key: string, env: Environment, proposed: Partial<ConfigDiff> | null) =>
  useQuery({ queryKey: flagKeys.preview(key, env, proposed), queryFn: () => flagsRepository.previewChange(key, env, proposed ?? {}), enabled: proposed !== null, retry: false, placeholderData: keepPreviousData });

export const useCompanyImpact = (key: string, env: Environment, query: CompanyImpactQuery) => useQuery({ queryKey: flagKeys.impact(key, env, query), queryFn: () => flagsRepository.listCompanyImpact(key, env, query), placeholderData: keepPreviousData });

export const useEvaluation = (key: string | null, env: Environment, company: string | null) =>
  useQuery({ queryKey: flagKeys.evaluation(key ?? "", env, company ?? ""), queryFn: () => flagsRepository.evaluateCompany(key ?? "", env, company ?? ""), enabled: Boolean(key && company), retry: false });

export const useCompanyAccess = (company: string | null, env: Environment) => useQuery({ queryKey: flagKeys.access(company ?? "", env), queryFn: () => flagsRepository.getCompanyAccess(company ?? "", env), enabled: Boolean(company), retry: false, placeholderData: keepPreviousData });

export const useCompanySearch = (term: string) => useQuery({ queryKey: flagKeys.companies(term), queryFn: () => flagsRepository.searchCompanies(term), placeholderData: keepPreviousData });

export const useChanges = (query: ChangesQuery) => useQuery({ queryKey: flagKeys.changes(query), queryFn: () => flagsRepository.listChanges(query), placeholderData: keepPreviousData });

export const useActivity = (query: ChangesQuery) => useQuery({ queryKey: flagKeys.activity(query), queryFn: () => flagsRepository.listActivity(query), placeholderData: keepPreviousData });

export const useVersions = (flag: string | null, env: Environment) => useQuery({ queryKey: flagKeys.versions(flag, env), queryFn: () => flagsRepository.listVersions(flag ?? "", env), placeholderData: keepPreviousData });

export const useComparison = (from: string | null, to: string | null) => useQuery({ queryKey: flagKeys.comparison(from ?? "", to ?? ""), queryFn: () => flagsRepository.compareVersions(from ?? "", to ?? ""), enabled: Boolean(from && to && from !== to), retry: false });

export function describeError(error: unknown, fallback = "Something went wrong. Nothing was changed.") {
  if (ApiError.isApiError(error)) return { message: error.message, fieldErrors: error.fieldErrors ?? {} };
  return { message: fallback, fieldErrors: {} as Record<string, string> };
}

export function useFlagMutations() {
  const queryClient = useQueryClient();
  const actor = useCurrentStaff();
  return useMemo(() => {
    const done = async <T,>(work: Promise<T>): Promise<T> => {
      const result = await work;
      await queryClient.invalidateQueries({ queryKey: ROOT });
      return result;
    };
    return {
      proposeChange: (input: ProposeChangeInput) => done(flagsRepository.proposeChange(input, actor)),
      createFlag: (input: CreateFlagInput) => done(flagsRepository.createFlag(input, actor)),
      validateCreate: (input: CreateFlagInput) => flagsRepository.validateCreate(input),
      updateMetadata: (key: string, patch: Partial<Pick<FeatureFlag, "description" | "ownerTeam" | "relatedModule" | "documentation">>) => done(flagsRepository.updateMetadata(key, patch, actor)),
      setLifecycle: (key: string, action: "deprecate" | "archive", reason: string) => done(flagsRepository.setLifecycle(key, action, reason, actor)),
      cancelChange: (id: string, reason: string) => done(flagsRepository.cancelChange(id, reason, actor)),
      resetDemoData: async () => {
        await flagsRepository.resetDemoData?.();
        queryClient.removeQueries({ queryKey: ROOT });
        await queryClient.invalidateQueries({ queryKey: ROOT });
      },
    };
  }, [actor, queryClient]);
}

export type FlagMutations = ReturnType<typeof useFlagMutations>;
