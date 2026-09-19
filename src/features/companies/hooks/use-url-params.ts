"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

/**
 * Small filters (a search box, a status select) kept in the URL so refresh,
 * sharing and Back/Forward restore the same view. Other parameters on the page
 * are left untouched.
 */
export function useUrlParams<K extends string>(keys: readonly K[]) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const values = useMemo(() => {
    const result = {} as Record<K, string>;
    for (const key of keys) result[key] = searchParams.get(key) ?? "";
    return result;
  }, [keys, searchParams]);

  const set = useCallback(
    (patch: Partial<Record<K, string | null>>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(patch) as Array<[string, string | null | undefined]>) {
        if (value === null || value === undefined || value === "") params.delete(key);
        else params.set(key, value);
      }
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const clear = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    for (const key of keys) params.delete(key);
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [keys, pathname, router, searchParams]);

  return { values, set, clear, activeCount: keys.filter((key) => values[key]).length };
}

/** A text input value that responds instantly and reaches the URL after a short pause. */
export function useDebouncedText(urlValue: string, commit: (value: string) => void, delayMs = 250) {
  const [draft, setDraft] = useState(urlValue);
  const lastCommitted = useRef(urlValue);

  useEffect(() => {
    if (urlValue !== lastCommitted.current) {
      lastCommitted.current = urlValue;
      setDraft(urlValue);
    }
  }, [urlValue]);

  useEffect(() => {
    if (draft === lastCommitted.current) return;
    const timer = setTimeout(() => {
      lastCommitted.current = draft;
      commit(draft);
    }, delayMs);
    return () => clearTimeout(timer);
  }, [draft, commit, delayMs]);

  return [draft, setDraft] as const;
}
