"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { UserFilters, UserSortField } from "../data/types";

const SEARCH_DEBOUNCE_MS = 300;

/**
 * Keeps the users list filters, sort, page and search in the URL.
 *
 * Every list view is therefore linkable, restorable on refresh and correct
 * with browser navigation.
 */
export function useUsersQueryState() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

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
        if (value === null || value === "") params.delete(name);
        else params.set(name, value);
        if (resetPage) params.delete("page");
      });
    },
    [commit],
  );

  // Search with debounce
  const urlSearch = searchParams.get("search") ?? "";
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

  // Parse URL params
  const page = Math.max(1, Number(searchParams.get("page") ?? 1) || 1);
  const pageSize = Number(searchParams.get("pageSize") ?? 25) || 25;
  const sort = (searchParams.get("sort") as UserSortField) || "recentlyActive";

  const filters = useMemo<UserFilters>(() => {
    const result: UserFilters = {};
    const companyId = searchParams.get("company");
    const status = searchParams.get("status");
    const role = searchParams.get("role");
    const twoFactor = searchParams.get("twoFactor");
    const lastActive = searchParams.get("lastActive");
    const multiCompanyOnly = searchParams.get("multiCompanyOnly") === "true";
    const ownerOnly = searchParams.get("ownerOnly") === "true";
    const adminOnly = searchParams.get("adminOnly") === "true";
    const noActiveMembership = searchParams.get("noActiveMembership") === "true";
    const accessIssues = searchParams.get("accessIssues") === "true";

    if (companyId) result.companyId = companyId;
    if (status) result.status = status as UserFilters["status"];
    if (role) result.role = role as UserFilters["role"];
    if (twoFactor) result.twoFactor = twoFactor as UserFilters["twoFactor"];
    if (lastActive) result.lastActive = lastActive as UserFilters["lastActive"];
    if (multiCompanyOnly) result.multiCompanyOnly = true;
    if (ownerOnly) result.ownerOnly = true;
    if (adminOnly) result.adminOnly = true;
    if (noActiveMembership) result.noActiveMembership = true;
    if (accessIssues) result.accessIssues = true;

    return result;
  }, [searchParams]);

  const activeFilterCount = useMemo(() => {
    let count = urlSearch ? 1 : 0;
    if (filters.companyId) count++;
    if (filters.status) count++;
    if (filters.role) count++;
    if (filters.twoFactor) count++;
    if (filters.lastActive) count++;
    if (filters.multiCompanyOnly) count++;
    if (filters.ownerOnly) count++;
    if (filters.adminOnly) count++;
    if (filters.noActiveMembership) count++;
    if (filters.accessIssues) count++;
    return count;
  }, [urlSearch, filters]);

  const setPage = useCallback(
    (next: number) => setParam("page", next > 1 ? String(next) : null, { resetPage: false }),
    [setParam],
  );

  const setPageSize = useCallback(
    (next: number) => setParam("pageSize", String(next)),
    [setParam],
  );

  const setSearch = useCallback((value: string) => setSearchDraft(value), []);

  const setSort = useCallback(
    (value: UserSortField) => setParam("sort", value, { resetPage: false }),
    [setParam],
  );

  const setFilter = useCallback(
    <K extends keyof UserFilters>(key: K, value: UserFilters[K]) => {
      commit((params) => {
        if (value === undefined || value === false || value === null) {
          params.delete(key);
        } else if (typeof value === "boolean") {
          params.set(key, "true");
        } else {
          params.set(key, String(value));
        }
        params.delete("page");
      });
    },
    [commit],
  );

  const clearFilters = useCallback(() => {
    commit((params) => {
      const keysToDelete = [
        "search", "page", "pageSize", "sort",
        "company", "status", "role", "twoFactor", "lastActive",
        "multiCompanyOnly", "ownerOnly", "adminOnly", "noActiveMembership", "accessIssues",
      ];
      for (const key of keysToDelete) params.delete(key);
    });
    setSearchDraft("");
    lastPushedSearch.current = "";
  }, [commit]);

  return {
    page,
    pageSize,
    search: searchDraft,
    sort,
    filters,
    activeFilterCount,
    setPage,
    setPageSize,
    setSearch,
    setSort,
    setFilter,
    clearFilters,
  };
}
