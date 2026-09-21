"use client";

/**
 * React access layer over the repository.
 *
 * Every Global Settings query shares one key root. Saving also invalidates the
 * Companies caches, because new-company defaults feed the Create Company flow.
 */
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { APP } from "@/config/app";
import { useAuth } from "@/features/auth/components/auth-provider";
import { useCurrentStaff } from "@/features/companies/data/capability-provider";
import { companyKeys } from "@/features/companies/data/hooks";
import { platformNow } from "@/features/companies/data/clock";
import { ApiError } from "@/types/api";
import { deriveGlobalSettingsCapabilities } from "./capabilities";
import { settingsRepository } from "./repository";
import { bannerFor, type BannerState } from "./selectors";
import type {
  ChangeQuery,
  EditableSectionKey,
  GlobalSettingsCapabilities,
  SaveSectionInput,
  SettingValues,
} from "./types";

const ROOT = ["global-settings"] as const;

export const settingsKeys = {
  all: ROOT,
  config: [...ROOT, "config"] as const,
  newCompany: [...ROOT, "new-company-defaults"] as const,
  review: (section: string, patch: unknown) => [...ROOT, "review", section, patch] as const,
  changes: (query: ChangeQuery) => [...ROOT, "changes", query] as const,
  change: (id: string) => [...ROOT, "change", id] as const,
  pending: [...ROOT, "pending"] as const,
  versions: [...ROOT, "versions"] as const,
  comparison: (from: string, to: string) => [...ROOT, "comparison", from, to] as const,
  security: [...ROOT, "security-review"] as const,
};

export function useGlobalSettingsCapabilities(): GlobalSettingsCapabilities {
  const { can } = useAuth();
  return useMemo(() => deriveGlobalSettingsCapabilities(can), [can]);
}

export const useConfiguration = () => useQuery({ queryKey: settingsKeys.config, queryFn: () => settingsRepository.getConfiguration(), staleTime: 15_000 });

export const useNewCompanyDefaults = () => useQuery({ queryKey: settingsKeys.newCompany, queryFn: () => settingsRepository.getNewCompanyDefaults(), staleTime: 15_000 });

export function useReview(section: EditableSectionKey, patch: SettingValues | null) {
  return useQuery({
    queryKey: settingsKeys.review(section, patch),
    queryFn: () => settingsRepository.reviewChanges(section, patch ?? {}),
    enabled: patch !== null,
    retry: false,
  });
}

export const useChanges = (query: ChangeQuery) =>
  useQuery({ queryKey: settingsKeys.changes(query), queryFn: () => settingsRepository.listChanges(query), placeholderData: keepPreviousData });

export const useChange = (id: string | null) =>
  useQuery({ queryKey: settingsKeys.change(id ?? ""), queryFn: () => settingsRepository.getChange(id ?? ""), enabled: Boolean(id), retry: false });

export const usePendingChanges = () => useQuery({ queryKey: settingsKeys.pending, queryFn: () => settingsRepository.listPending() });

export const useVersions = () => useQuery({ queryKey: settingsKeys.versions, queryFn: () => settingsRepository.listVersions() });

export const useVersionComparison = (from: string | null, to: string | null) =>
  useQuery({
    queryKey: settingsKeys.comparison(from ?? "", to ?? ""),
    queryFn: () => settingsRepository.compareVersions(from ?? "", to ?? ""),
    enabled: Boolean(from && to),
    retry: false,
  });

export const useSecurityReview = () => useQuery({ queryKey: settingsKeys.security, queryFn: () => settingsRepository.getSecurityReview() });

/**
 * The platform identity the shell should display. Falls back to the static
 * application constants while the configuration loads or is unavailable, so the
 * shell never shows an empty name.
 */
export function usePlatformIdentity() {
  const { data } = useConfiguration();
  return useMemo(
    () => ({
      name: typeof data?.values["identity.platform_name"] === "string" ? (data.values["identity.platform_name"] as string) : APP.name,
      shortName: typeof data?.values["identity.platform_short_name"] === "string" ? (data.values["identity.platform_short_name"] as string) : APP.shortName,
      supportEmail: typeof data?.values["identity.support_email"] === "string" ? (data.values["identity.support_email"] as string) : APP.supportEmail,
    }),
    [data],
  );
}

/** The maintenance banner for one audience, evaluated against the demo clock. */
export function useMaintenanceBanner(audience: "platform_staff" | "all_companies" | "public_visitors"): BannerState | null {
  const { data } = useConfiguration();
  return useMemo(() => (data ? bannerFor(data.values, platformNow(), audience) : null), [data, audience]);
}

export function describeError(error: unknown, fallback = "Something went wrong. Nothing was changed."): { message: string; fieldErrors: Record<string, string> } {
  if (ApiError.isApiError(error)) return { message: error.message, fieldErrors: error.fieldErrors ?? {} };
  return { message: fallback, fieldErrors: {} };
}

export function useSettingsMutations() {
  const queryClient = useQueryClient();
  const actor = useCurrentStaff();

  return useMemo(() => {
    const repo = settingsRepository;
    const refresh = () => Promise.all([queryClient.invalidateQueries({ queryKey: ROOT }), queryClient.invalidateQueries({ queryKey: companyKeys.all })]);
    const done = async <T,>(work: Promise<T>): Promise<T> => {
      const result = await work;
      await refresh();
      return result;
    };
    return {
      saveSection: (input: SaveSectionInput) => done(repo.saveSection(input, actor)),
      withdrawPending: (id: string, reason: string) => done(repo.withdrawPending(id, reason, actor)),
      resetDemoData: async () => {
        await repo.resetDemoData?.();
        queryClient.removeQueries({ queryKey: ROOT });
        await refresh();
      },
    };
  }, [actor, queryClient]);
}

export type SettingsMutations = ReturnType<typeof useSettingsMutations>;
