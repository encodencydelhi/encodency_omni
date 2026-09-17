"use client";

/**
 * Query-string state.
 *
 * Filters, tabs and periods live in the URL so a view can be linked, shared and
 * reloaded: /admin/website/issues?severity=critical is a real destination, not
 * a state someone has to rebuild by clicking.
 */

import { useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
let pendingWrite: { pathname: string; query: string; at: number } | null = null;

/** A pending write is only trusted briefly, so Back/Forward is never fought. */
const PENDING_TTL_MS = 2000;

function baseParams(pathname: string, committed: string): URLSearchParams {
  if (pendingWrite && pendingWrite.pathname === pathname) {
    if (pendingWrite.query === committed) {
      pendingWrite = null; // The router caught up; the snapshot is authoritative.
    } else if (Date.now() - pendingWrite.at < PENDING_TTL_MS) {
      return new URLSearchParams(pendingWrite.query);
    } else {
      pendingWrite = null;
    }
  }
  return new URLSearchParams(committed);
}

function commit(
  router: ReturnType<typeof useRouter>,
  pathname: string,
  params: URLSearchParams,
): void {
  const query = params.toString();
  pendingWrite = { pathname, query, at: Date.now() };
  router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
}

export function useUrlState<T extends string>(
  key: string,
  fallback: T,
  allowed?: readonly T[],
): [T, (value: T) => void] {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const raw = searchParams.get(key);
  const value = raw && (!allowed || allowed.includes(raw as T)) ? (raw as T) : fallback;

  const setValue = useCallback(
    (next: T) => {
      const params = baseParams(pathname, searchParams.toString());
      if (next === fallback) params.delete(key);
      else params.set(key, next);
      commit(router, pathname, params);
    },
    [fallback, key, pathname, router, searchParams],
  );

  return [value, setValue];
}

/** Several query params at once, so a filter bar updates the URL in one push. */
export function useUrlParams() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const get = useCallback((key: string) => searchParams.get(key), [searchParams]);

  const setMany = useCallback(
    (updates: Record<string, string | null>) => {
      const params = baseParams(pathname, searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === "") params.delete(key);
        else params.set(key, value);
      }
      commit(router, pathname, params);
    },
    [pathname, router, searchParams],
  );

  return { get, setMany };
}
