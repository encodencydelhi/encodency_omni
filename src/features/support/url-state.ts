"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

/**
 * List filters live in the URL, so a ticket list -> ticket -> back trip restores the exact view and a filtered link can be shared.
 * Setting any filter other than `page` sends the list back to page 1.
 */
export function useUrlState<T extends Record<string, string>>(defaults: T) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const values = useMemo(() => {
    const next = { ...defaults };
    for (const key of Object.keys(defaults) as Array<keyof T>) {
      const value = params?.get(String(key));
      if (value !== null && value !== undefined) next[key] = value as T[keyof T];
    }
    return next;
    // `defaults` is a constant object per page; the URL is the real input.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  const set = useCallback(
    (patch: Partial<T>) => {
      const next = new URLSearchParams(params?.toString());
      for (const [key, value] of Object.entries(patch)) {
        if (!value || value === defaults[key]) next.delete(key);
        else next.set(key, String(value));
      }
      if (!("page" in patch)) next.delete("page");
      const query = next.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [params, pathname, router],
  );

  const reset = useCallback(() => router.replace(pathname, { scroll: false }), [pathname, router]);
  const dirty = useMemo(() => (Object.keys(defaults) as Array<keyof T>).some((key) => key !== "page" && values[key] !== defaults[key]), [defaults, values]);
  return { values, set, reset, dirty };
}

/** A value that follows `value` after a pause: the search box stays responsive while the query waits for the typing to stop. */
export function useDebounced<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}
