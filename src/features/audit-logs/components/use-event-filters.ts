"use client";

import { useSearchParams } from "next/navigation";
import { useMemo } from "react";
import { useUrlParams } from "@/features/companies/hooks/use-url-params";
import { PAGE_SIZE } from "../data/config";
import { useAuditCapabilities, useAuditWindow } from "../data/hooks";
import type { EventQuery } from "../data/types";

/** Every filter an event list can carry. They live in the URL, so refresh, Back and shared links keep the same view. */
export const FILTER_KEYS = ["q", "category", "outcome", "actorType", "company", "client", "quick", "action", "priority", "actor", "resource", "env", "module", "corr", "req", "sensitive", "sens", "stage", "sort", "page", "open", "view"] as const;
type FilterKey = (typeof FILTER_KEYS)[number];

/** The keys that narrow results, as opposed to sorting, paging, opening a preview or choosing a view. */
const NARROWING: readonly FilterKey[] = ["q", "category", "outcome", "actorType", "company", "client", "quick", "action", "priority", "actor", "resource", "env", "module", "corr", "req", "sensitive", "sens", "stage"];

export function useEventFilters(base: Partial<EventQuery> = {}, pageSize = PAGE_SIZE) {
  const url = useUrlParams(FILTER_KEYS);
  const params = useSearchParams();
  const { window: dateWindow, range, from, to } = useAuditWindow();
  const capabilities = useAuditCapabilities();
  const v = url.values;
  const baseKey = JSON.stringify(base);
  const back = new URLSearchParams(params.toString());
  back.delete("open");

  const query: EventQuery = useMemo(
    () => ({
      window: dateWindow,
      search: v.q || undefined,
      category: v.category || undefined,
      outcome: v.outcome || undefined,
      actorType: v.actorType || undefined,
      companyId: v.company || undefined,
      clientId: v.client || undefined,
      quick: v.quick || undefined,
      actionKey: v.action || undefined,
      priority: v.priority || undefined,
      actorId: v.actor || undefined,
      resourceType: v.resource || undefined,
      environment: v.env || undefined,
      sourceModule: v.module || undefined,
      correlationId: v.corr || undefined,
      requestId: v.req || undefined,
      sensitiveOnly: v.sensitive === "1" || undefined,
      sensitiveCategory: v.sens || undefined,
      workflowStage: v.stage || undefined,
      sort: v.sort || "newest",
      page: Math.max(1, Number(v.page) || 1),
      pageSize,
      searchEmail: capabilities.canViewActorEmail,
      ...(JSON.parse(baseKey) as Partial<EventQuery>),
    }),
    [dateWindow, v, pageSize, capabilities.canViewActorEmail, baseKey],
  );

  const activeCount = NARROWING.filter((key) => v[key]).length;
  const clear = () => url.set({ page: null, ...(Object.fromEntries(NARROWING.map((key) => [key, null])) as Partial<Record<FilterKey, null>>) });

  return {
    values: v,
    query,
    /** Changing what is shown resets to the first page; paging alone keeps every filter. */
    setFilter: (patch: Partial<Record<FilterKey, string | null>>) => url.set({ page: null, ...patch }),
    setPage: (page: number) => url.set({ page: page <= 1 ? null : String(page) }),
    set: url.set,
    clear,
    activeCount,
    range,
    from,
    to,
    /** The current query string, carried to a detail page so Back restores exactly these filters. */
    backString: back.toString(),
  };
}

export type EventFilters = ReturnType<typeof useEventFilters>;
