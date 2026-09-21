"use client";

/**
 * React access layer over the repository.
 *
 * Every Audit Logs query key sits under the Companies key root as well, because most events
 * derive from company, subscription and plan records; anything that refreshes those refreshes
 * this. Audit data is also always treated as stale on mount, so a change just made in Feature
 * Flags or Global Settings is present the moment you open Event Explorer.
 */
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { useAuth } from "@/features/auth/components/auth-provider";
import { useCurrentStaff } from "@/features/companies/data/capability-provider";
import { platformNow } from "@/features/companies/data/clock";
import { companyKeys } from "@/features/companies/data/hooks";
import { downloadTextFile } from "@/features/companies/lib/csv";
import { useUrlParams } from "@/features/companies/hooks/use-url-params";
import { ApiError } from "@/types/api";
import { deriveAuditCapabilities, type AuditCapabilities } from "./capabilities";
import { DEFAULT_RANGE, RANGES } from "./config";
import { resolveWindow } from "./filters";
import { auditRepository } from "./repository";
import type { CreateInvestigationInput, DateWindow, Environment, EventQuery, ExportRequest, InvestigationPriority, InvestigationQuery, InvestigationStatus, RangeKey } from "./types";

const ROOT = [...companyKeys.all, "audit-logs"] as const;

export const auditKeys = {
  all: ROOT,
  overview: (window: DateWindow, environment: Environment | null) => [...ROOT, "overview", window, environment] as const,
  activity: (window: DateWindow, metric: string, environment: Environment | null) => [...ROOT, "activity", window, metric, environment] as const,
  events: (query: EventQuery) => [...ROOT, "events", query] as const,
  facets: [...ROOT, "facets"] as const,
  scopes: [...ROOT, "scopes"] as const,
  event: (id: string) => [...ROOT, "event", id] as const,
  security: (window: DateWindow) => [...ROOT, "security", window] as const,
  sensitive: (window: DateWindow) => [...ROOT, "sensitive", window] as const,
  settings: [...ROOT, "settings"] as const,
  investigations: (query: InvestigationQuery) => [...ROOT, "investigations", query] as const,
  investigation: (id: string) => [...ROOT, "investigation", id] as const,
  owners: [...ROOT, "owners"] as const,
  link: (investigationId: string, eventId: string) => [...ROOT, "link", investigationId, eventId] as const,
};

export function useAuditCapabilities(): AuditCapabilities {
  const { can } = useAuth();
  return useMemo(() => deriveAuditCapabilities(can), [can]);
}

const RANGE_KEYS = ["range", "from", "to"] as const;
const HOUR = 3_600_000;

/**
 * The date window every Audit Logs screen shares. It lives in the URL (?range=, ?from=, ?to=),
 * so refresh, Back and a shared link keep the same period. The end of the window is rounded up
 * to the hour so the query key does not change on every render.
 */
export function useAuditWindow(): { range: RangeKey; window: DateWindow; from: string; to: string; setRange: (range: RangeKey) => void; setCustom: (from: string, to: string) => void; invalidCustom: boolean } {
  const url = useUrlParams(RANGE_KEYS);
  const requested = url.values.range;
  const range: RangeKey = RANGES.find((item) => item.value === requested)?.value ?? DEFAULT_RANGE;
  const now = Math.ceil(platformNow() / HOUR) * HOUR;
  const custom = range === "custom";
  const window = useMemo(() => resolveWindow(range, now, url.values.from, url.values.to), [range, now, url.values.from, url.values.to]);
  // A custom range with missing or reversed dates falls back to 30 days, and says so.
  const invalidCustom = custom && (!url.values.from || !url.values.to || Date.parse(url.values.from) > Date.parse(url.values.to));
  return {
    range,
    window: invalidCustom ? resolveWindow("30d", now) : window,
    from: url.values.from,
    to: url.values.to,
    setRange: (next) => url.set({ range: next === DEFAULT_RANGE ? null : next, from: null, to: null }),
    setCustom: (from, to) => url.set({ range: "custom", from, to }),
    invalidCustom,
  };
}

const fresh = { staleTime: 0 } as const;

export const useOverview = (window: DateWindow, environment: Environment | null) => useQuery({ queryKey: auditKeys.overview(window, environment), queryFn: () => auditRepository.getOverview(window, environment), placeholderData: keepPreviousData, ...fresh });

export const useActivity = (window: DateWindow, metric: string, environment: Environment | null) => useQuery({ queryKey: auditKeys.activity(window, metric, environment), queryFn: () => auditRepository.getActivity(window, metric, environment), placeholderData: keepPreviousData, ...fresh });

export const useEvents = (query: EventQuery) => useQuery({ queryKey: auditKeys.events(query), queryFn: () => auditRepository.listEvents(query), placeholderData: keepPreviousData, ...fresh });

export const useFacets = () => useQuery({ queryKey: auditKeys.facets, queryFn: () => auditRepository.getFacets(), ...fresh });

export const useScopeOptions = () => useQuery({ queryKey: auditKeys.scopes, queryFn: () => auditRepository.getScopeOptions() });

export const useEvent = (id: string) => useQuery({ queryKey: auditKeys.event(id), queryFn: () => auditRepository.getEvent(id), retry: false, ...fresh });

export const useSecurityCounts = (window: DateWindow) => useQuery({ queryKey: auditKeys.security(window), queryFn: () => auditRepository.getSecurityCounts(window), placeholderData: keepPreviousData, ...fresh });

export const useSensitiveCounts = (window: DateWindow) => useQuery({ queryKey: auditKeys.sensitive(window), queryFn: () => auditRepository.getSensitiveCounts(window), placeholderData: keepPreviousData, ...fresh });

export const useAuditSettings = () => useQuery({ queryKey: auditKeys.settings, queryFn: () => auditRepository.getSettings(), ...fresh });

export const useInvestigations = (query: InvestigationQuery) => useQuery({ queryKey: auditKeys.investigations(query), queryFn: () => auditRepository.listInvestigations(query), placeholderData: keepPreviousData, ...fresh });

export const useInvestigation = (id: string) => useQuery({ queryKey: auditKeys.investigation(id), queryFn: () => auditRepository.getInvestigation(id), retry: false, ...fresh });

export const useOwners = () => useQuery({ queryKey: auditKeys.owners, queryFn: () => auditRepository.listOwners() });

export const useLinkCheck = (investigationId: string | null, eventId: string | null) =>
  useQuery({ queryKey: auditKeys.link(investigationId ?? "", eventId ?? ""), queryFn: () => auditRepository.checkLink(investigationId ?? "", eventId ?? ""), enabled: Boolean(investigationId && eventId), retry: false, ...fresh });

export function describeError(error: unknown, fallback = "Something went wrong. Nothing was changed.") {
  if (ApiError.isApiError(error)) return { message: error.message, fieldErrors: error.fieldErrors ?? {} };
  return { message: fallback, fieldErrors: {} as Record<string, string> };
}

export function useAuditMutations() {
  const queryClient = useQueryClient();
  const actor = useCurrentStaff();
  return useMemo(() => {
    const done = async <T,>(work: Promise<T>): Promise<T> => {
      const result = await work;
      await queryClient.invalidateQueries({ queryKey: ROOT });
      return result;
    };
    return {
      createInvestigation: (input: CreateInvestigationInput) => done(auditRepository.createInvestigation(input, actor)),
      addEvents: (investigationId: string, eventIds: string[], note: string) => done(auditRepository.addEvents(investigationId, eventIds, note, actor)),
      unlinkEvent: (investigationId: string, eventId: string) => done(auditRepository.unlinkEvent(investigationId, eventId, actor)),
      editRelevance: (investigationId: string, eventId: string, note: string) => done(auditRepository.editRelevance(investigationId, eventId, note, actor)),
      addNote: (investigationId: string, text: string, correctsNoteId?: string | null) => done(auditRepository.addNote(investigationId, text, actor, correctsNoteId)),
      changeOwner: (investigationId: string, ownerId: string, reason: string) => done(auditRepository.changeOwner(investigationId, ownerId, reason, actor)),
      changeStatus: (investigationId: string, status: InvestigationStatus) => done(auditRepository.changeStatus(investigationId, status, actor)),
      changePriority: (investigationId: string, priority: InvestigationPriority) => done(auditRepository.changePriority(investigationId, priority, actor)),
      closeInvestigation: (investigationId: string, input: { reason: string; conclusion: string }) => done(auditRepository.closeInvestigation(investigationId, input, actor)),
      /** Builds the file in the browser, downloads it, and records the export as an audit event. */
      exportEvents: async (request: ExportRequest) => {
        const result = await done(auditRepository.exportEvents(request, actor));
        downloadTextFile(result.filename, result.content, result.format === "csv" ? "text/csv;charset=utf-8" : "application/json;charset=utf-8");
        return result;
      },
      resetDemoData: async () => {
        await auditRepository.resetDemoData?.();
        queryClient.removeQueries({ queryKey: ROOT });
        await queryClient.invalidateQueries({ queryKey: ROOT });
      },
    };
  }, [actor, queryClient]);
}

export type AuditMutations = ReturnType<typeof useAuditMutations>;
