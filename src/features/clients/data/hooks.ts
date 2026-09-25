"use client";

/**
 * React access layer over the repository.
 *
 * Client queries share one key root, and every write also invalidates the
 * Companies cache: a paused client or a new assignment changes a company's
 * client list, counts and usage, so both modules refresh together. Client-scoped
 * queries carry the client id in their key, so opening client B can never show
 * client A's cached records.
 */
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { companyKeys } from "@/features/companies/data/hooks";
import { useCurrentStaff } from "@/features/companies/data/capability-provider";
import { useAuth } from "@/features/auth/components/auth-provider";
import { ApiError } from "@/types/api";
import { deriveClientCapabilities, type ClientCapabilities } from "./capabilities";
import { clientsRepository, type LifecycleAction } from "./repository";
import type {
  ClientAccessLevel,
  ClientActivityFilter,
  ClientListQuery,
  CreateClientInput,
  OnboardingStepKey,
  UpdateClientInput,
} from "./types";

const ROOT = ["clients-workspace"] as const;

export const clientKeys = {
  all: ROOT,
  list: (query: ClientListQuery) => [...ROOT, "list", query] as const,
  portfolio: [...ROOT, "portfolio"] as const,
  facets: [...ROOT, "facets"] as const,
  creationCompanies: [...ROOT, "creation-companies"] as const,
  eligibleMembers: (companyId: string) => [...ROOT, "eligible-members", companyId] as const,
  client: (id: string) => [...ROOT, "client", id] as const,
  section: (id: string, section: string, params?: unknown) => [...ROOT, "client", id, section, params ?? null] as const,
};

export function useClientCapabilities(): ClientCapabilities {
  const { can } = useAuth();
  return useMemo(() => deriveClientCapabilities(can), [can]);
}

export function useClientsList(query: ClientListQuery) {
  return useQuery({ queryKey: clientKeys.list(query), queryFn: () => clientsRepository.listClients(query), placeholderData: keepPreviousData });
}

export function useClientPortfolio() {
  return useQuery({ queryKey: clientKeys.portfolio, queryFn: () => clientsRepository.getPortfolio() });
}

export function useClientFacets() {
  return useQuery({ queryKey: clientKeys.facets, queryFn: () => clientsRepository.getFacets(), staleTime: 60_000 });
}

export function useCreationCompanies(enabled = true) {
  return useQuery({ queryKey: clientKeys.creationCompanies, queryFn: () => clientsRepository.listCreationCompanies(), enabled });
}

export function useEligibleMembers(companyId: string | null) {
  return useQuery({
    queryKey: clientKeys.eligibleMembers(companyId ?? ""),
    queryFn: () => clientsRepository.listEligibleMembers(companyId ?? ""),
    enabled: Boolean(companyId),
  });
}

export function useClient(id: string) {
  return useQuery({ queryKey: clientKeys.client(id), queryFn: () => clientsRepository.getClient(id), retry: false });
}

export function useClientOverview(id: string) {
  return useQuery({ queryKey: clientKeys.section(id, "overview"), queryFn: () => clientsRepository.getOverview(id), retry: false });
}

export function useClientTeam(id: string) {
  return useQuery({ queryKey: clientKeys.section(id, "team"), queryFn: () => clientsRepository.getTeam(id), retry: false });
}

export function useClientChannels(id: string) {
  return useQuery({ queryKey: clientKeys.section(id, "channels"), queryFn: () => clientsRepository.getChannels(id), retry: false });
}

export function useClientWebsiteSeo(id: string) {
  return useQuery({ queryKey: clientKeys.section(id, "website-seo"), queryFn: () => clientsRepository.getWebsiteSeo(id), retry: false });
}

export function useClientActivity(id: string, filter: ClientActivityFilter) {
  return useQuery({
    queryKey: clientKeys.section(id, "activity", filter),
    queryFn: () => clientsRepository.getActivity(id, filter),
    placeholderData: keepPreviousData,
    retry: false,
  });
}

export function useClientSettings(id: string) {
  return useQuery({ queryKey: clientKeys.section(id, "settings"), queryFn: () => clientsRepository.getSettings(id), retry: false });
}

/* ------------------------------------------------------------------ */
/* Mutations                                                           */
/* ------------------------------------------------------------------ */

export interface DescribedError {
  message: string;
  fieldErrors: Record<string, string>;
}

export function describeError(error: unknown, fallback = "Something went wrong. Nothing was changed."): DescribedError {
  if (ApiError.isApiError(error)) {
    let msg = error.message;
    if (error.status === 400 && (!msg || msg === "Bad Request")) {
      msg = "Please verify all required client details and try again.";
    } else if (error.status === 401) {
      msg = "Your session has expired. Please log in again.";
    } else if (error.status === 403) {
      msg = "You do not have permission to manage clients in this company.";
    } else if (error.status === 404) {
      msg = "The requested resource could not be found.";
    } else if (error.status === 409) {
      msg = "A client with this name or details already exists.";
    } else if (error.status === 429) {
      msg = "Too many requests. Please wait a moment and try again.";
    } else if (error.status >= 500) {
      msg = "The server encountered an error processing your request. Please try again shortly.";
    }
    return { message: msg || fallback, fieldErrors: error.fieldErrors ?? {} };
  }
  if (error instanceof Error) return { message: error.message, fieldErrors: {} };
  return { message: fallback, fieldErrors: {} };
}

export function useClientMutations() {
  const queryClient = useQueryClient();
  const actor = useCurrentStaff();

  return useMemo(() => {
    const repo = clientsRepository;
    const done = async <T,>(work: Promise<T>): Promise<T> => {
      const result = await work;
      // Clients live in company bundles: refresh both modules' views of them.
      await Promise.all([queryClient.invalidateQueries({ queryKey: ROOT }), queryClient.invalidateQueries({ queryKey: companyKeys.all })]);
      return result;
    };

    return {
      createClient: (input: CreateClientInput) => done(repo.createClient(input, actor)),
      updateClient: (id: string, input: UpdateClientInput) => done(repo.updateClient(id, input, actor)),
      changeLifecycle: (ids: string[], action: LifecycleAction) => done(repo.changeLifecycle(ids, action, actor)),
      assignMember: (id: string, input: { membershipId: string; level: ClientAccessLevel }) => done(repo.assignMember(id, input, actor)),
      changeAccess: (id: string, input: { membershipId: string; level: ClientAccessLevel }) => done(repo.changeAccess(id, input, actor)),
      removeAccess: (id: string, input: { membershipId: string; newLeadId?: string | null; note: string }) => done(repo.removeAccess(id, input, actor)),
      setLead: (id: string, membershipId: string | null) => done(repo.setLead(id, membershipId, actor)),
      addWebsite: (id: string, input: { url: string; makePrimary: boolean }) => done(repo.addWebsite(id, input, actor)),
      setPrimaryWebsite: (id: string, websiteId: string) => done(repo.setPrimaryWebsite(id, websiteId, actor)),
      removeWebsite: (id: string, websiteId: string) => done(repo.removeWebsite(id, websiteId, actor)),
      setOnboardingRequirements: (id: string, required: Record<OnboardingStepKey, boolean>) => done(repo.setOnboardingRequirements(id, required, actor)),
      markAccessReviewed: (id: string) => done(repo.markAccessReviewed(id, actor)),
      setPlatformReviewer: (id: string, staffId: string | null) => done(repo.setPlatformReviewer(id, staffId, actor)),
      requestReconnection: (id: string, connectionId: string) => done(repo.requestReconnection(id, connectionId, actor)),
      resetDemoData: async () => {
        await repo.resetDemoData?.();
        queryClient.removeQueries({ queryKey: ROOT });
        queryClient.removeQueries({ queryKey: companyKeys.all });
        await Promise.all([queryClient.invalidateQueries({ queryKey: ROOT }), queryClient.invalidateQueries({ queryKey: companyKeys.all })]);
      },
    };
  }, [actor, queryClient]);
}

export type ClientMutations = ReturnType<typeof useClientMutations>;
