"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo, useState } from "react";

/**
 * Filters live in the URL so that a list -> detail -> back trip restores the
 * exact view the user left, and so filtered links from other pages
 * ("View Ads for this campaign") land pre-filtered.
 *
 * `resolvers` translate an incoming value into the one the controls display.
 * Cross-page links carry entity ids (`?campaign=cmp-1002`) while the select
 * options are entity names, so without this the filter would be applied while
 * the dropdown still read "All Campaigns".
 */
export function useFilters<T extends Record<string, string>>(
  defaults: T,
  resolvers?: Partial<Record<keyof T, (value: string) => string>>,
) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const values = useMemo(() => {
    const next = { ...defaults };
    for (const key of Object.keys(defaults) as (keyof T)[]) {
      const fromUrl = params?.get(String(key));
      if (fromUrl === null || fromUrl === undefined) continue;
      const resolve = resolvers?.[key];
      next[key] = (resolve ? resolve(fromUrl) : fromUrl) as T[keyof T];
    }
    return next;
    // `resolvers` is recreated each render by callers; the URL is the real input.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaults, params]);

  const setFilter = useCallback(
    (key: keyof T, value: string) => {
      const next = new URLSearchParams(params?.toString());
      if (!value || value === defaults[key]) next.delete(String(key));
      else next.set(String(key), value);
      const query = next.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [defaults, params, pathname, router],
  );

  /** Change several filters at once — one history entry, no intermediate state. */
  const setFilters = useCallback(
    (patch: Partial<Record<keyof T, string>>) => {
      const next = new URLSearchParams(params?.toString());
      for (const [key, value] of Object.entries(patch)) {
        if (!value || value === defaults[key as keyof T]) next.delete(key);
        else next.set(key, value);
      }
      const query = next.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [defaults, params, pathname, router],
  );

  const reset = useCallback(() => {
    router.replace(pathname, { scroll: false });
  }, [pathname, router]);

  /** True when anything is narrowing the list, so we can offer "Clear". */
  const isFiltered = useMemo(
    () =>
      (Object.keys(defaults) as (keyof T)[]).some(
        (key) => values[key] !== defaults[key],
      ),
    [defaults, values],
  );

  return { values, setFilter, setFilters, reset, isFiltered };
}

/**
 * Client-side pagination for the long tables. Page resets whenever the row set
 * changes size, so filtering never strands the user on an empty page.
 */
export function usePagination<T>(rows: T[], pageSize = 10) {
  const [page, setPage] = useState(1);
  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  const current = Math.min(page, pageCount);
  const start = (current - 1) * pageSize;
  const visible = rows.slice(start, start + pageSize);

  return {
    visible,
    page: current,
    pageCount,
    from: rows.length === 0 ? 0 : start + 1,
    to: Math.min(start + pageSize, rows.length),
    total: rows.length,
    canPrevious: current > 1,
    canNext: current < pageCount,
    previous: () => setPage((p) => Math.max(1, Math.min(p, pageCount) - 1)),
    next: () => setPage((p) => Math.min(pageCount, Math.min(p, pageCount) + 1)),
  };
}
