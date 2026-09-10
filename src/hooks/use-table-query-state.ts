"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { APP } from "@/config/app";
import type { ListParams, SortSpec } from "@/types/api";

const SEARCH_DEBOUNCE_MS = 300;

export interface TableQueryOptions<TFilterKey extends string> {
  /** Filter names this table understands; anything else in the URL is ignored. */
  filterKeys: readonly TFilterKey[];
  defaultSort?: SortSpec;
  defaultPageSize?: number;
  /**
   * Prefix for every parameter, so several tables can share one URL
   * (a detail page with tabbed tables, for example).
   */
  namespace?: string;
}

export interface TableQueryState<TFilterKey extends string> {
  page: number;
  pageSize: number;
  search: string;
  sort: SortSpec | null;
  filters: Partial<Record<TFilterKey, string>>;
  activeFilterCount: number;
  /** Ready to hand straight to a service call. */
  listParams: ListParams<Record<TFilterKey, string>>;

  setPage: (page: number) => void;
  setPageSize: (pageSize: number) => void;
  setSearch: (search: string) => void;
  toggleSort: (field: string) => void;
  setFilter: (key: TFilterKey, value: string | null) => void;
  clearFilters: () => void;
}

function parseSortParam(raw: string | null): SortSpec | null {
  if (!raw) return null;
  const [field, direction] = raw.split(":");
  if (!field) return null;
  return { field, direction: direction === "desc" ? "desc" : "asc" };
}

/**
 * Keeps table state in the URL.
 *
 * Every list view is therefore linkable, restorable on refresh and correct
 * with browser navigation — the behaviour operators expect from an admin tool.
 */
export function useTableQueryState<TFilterKey extends string>(
  options: TableQueryOptions<TFilterKey>,
): TableQueryState<TFilterKey> {
  const { filterKeys, defaultSort, defaultPageSize = APP.defaultPageSize, namespace } = options;

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const key = useCallback(
    (name: string) => (namespace ? `${namespace}_${name}` : name),
    [namespace],
  );

  const commit = useCallback(
    (mutate: (params: URLSearchParams) => void) => {
      const params = new URLSearchParams(searchParams.toString());
      mutate(params);
      const queryString = params.toString();
      router.replace(queryString ? `${pathname}?${queryString}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const setParam = useCallback(
    (name: string, value: string | null, { resetPage = true } = {}) => {
      commit((params) => {
        if (value === null || value === "") params.delete(key(name));
        else params.set(key(name), value);
        if (resetPage) params.delete(key("page"));
      });
    },
    [commit, key],
  );

  const urlSearch = searchParams.get(key("search")) ?? "";

  // The input stays responsive while the URL (and therefore the query) updates
  // on a trailing debounce.
  const [searchDraft, setSearchDraft] = useState(urlSearch);
  const lastPushedSearch = useRef(urlSearch);

  useEffect(() => {
    if (urlSearch !== lastPushedSearch.current) {
      lastPushedSearch.current = urlSearch;
      setSearchDraft(urlSearch);
    }
  }, [urlSearch]);

  useEffect(() => {
    if (searchDraft === lastPushedSearch.current) return;
    const timer = setTimeout(() => {
      lastPushedSearch.current = searchDraft;
      setParam("search", searchDraft);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchDraft, setParam]);

  const page = Math.max(1, Number(searchParams.get(key("page")) ?? 1) || 1);
  const pageSize = Number(searchParams.get(key("pageSize")) ?? defaultPageSize) || defaultPageSize;
  const sort = parseSortParam(searchParams.get(key("sort"))) ?? defaultSort ?? null;

  const filters = useMemo(() => {
    const result: Partial<Record<TFilterKey, string>> = {};
    for (const filterKey of filterKeys) {
      const value = searchParams.get(key(filterKey));
      if (value) result[filterKey] = value;
    }
    return result;
  }, [filterKeys, key, searchParams]);

  const toggleSort = useCallback(
    (field: string) => {
      const isSameField = sort?.field === field;
      const direction = isSameField && sort?.direction === "asc" ? "desc" : "asc";
      setParam("sort", `${field}:${direction}`, { resetPage: false });
    },
    [setParam, sort],
  );

  const clearFilters = useCallback(() => {
    commit((params) => {
      for (const filterKey of filterKeys) params.delete(key(filterKey));
      params.delete(key("search"));
      params.delete(key("page"));
    });
    setSearchDraft("");
    lastPushedSearch.current = "";
  }, [commit, filterKeys, key]);

  const listParams = useMemo<ListParams<Record<TFilterKey, string>>>(
    () => ({ page, pageSize, search: urlSearch, sort, filters }),
    [filters, page, pageSize, sort, urlSearch],
  );

  return {
    page,
    pageSize,
    search: searchDraft,
    sort,
    filters,
    activeFilterCount: Object.keys(filters).length + (urlSearch ? 1 : 0),
    listParams,

    setPage: (next) => setParam("page", next > 1 ? String(next) : null, { resetPage: false }),
    setPageSize: (next) => setParam("pageSize", String(next)),
    setSearch: setSearchDraft,
    toggleSort,
    setFilter: (filterKey, value) => setParam(filterKey, value),
    clearFilters,
  };
}
