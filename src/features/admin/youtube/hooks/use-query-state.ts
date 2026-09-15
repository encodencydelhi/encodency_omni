"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";
import { PERIODS } from "../lib/constants";
import type { Period } from "../types";

/**
 * Filters and tabs live in the URL so refresh, sharing and list → detail → back
 * all restore the same view. Defaults are omitted from the URL to keep it clean.
 */
export function useQueryState<T extends Record<string, string>>(defaults: T) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const values = useMemo(() => {
    const next = { ...defaults };
    for (const key of Object.keys(defaults) as (keyof T)[]) {
      const v = params?.get(String(key));
      if (v !== null && v !== undefined) next[key] = v as T[keyof T];
    }
    return next;
  }, [defaults, params]);

  const set = useCallback(
    (patch: Partial<Record<keyof T, string>>) => {
      const next = new URLSearchParams(params?.toString());
      for (const [key, value] of Object.entries(patch)) {
        if (value === undefined || value === "" || value === defaults[key as keyof T]) next.delete(key);
        else next.set(key, value);
      }
      const query = next.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [defaults, params, pathname, router],
  );

  const reset = useCallback(
    (keep: string[] = []) => {
      const next = new URLSearchParams();
      keep.forEach((k) => {
        const v = params?.get(k);
        if (v) next.set(k, v);
      });
      const query = next.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [params, pathname, router],
  );

  const activeCount = useMemo(
    () => (Object.keys(defaults) as (keyof T)[]).filter((k) => values[k] !== defaults[k]).length,
    [defaults, values],
  );

  return { values, set, reset, activeCount };
}

/** Global date range shared by Overview, Analytics, Audience and Monetization. */
export function usePeriod() {
  const params = useSearchParams();
  const raw = params?.get("period");
  const period: Period = PERIODS.some((p) => p.value === raw) ? (raw as Period) : "28d";
  const meta = PERIODS.find((p) => p.value === period) ?? PERIODS[1]!;
  return { period, days: meta.days, label: meta.label };
}

/** Carries the current period onto cross-tab links so the range survives navigation. */
export function useWithPeriod() {
  const params = useSearchParams();
  const period = params?.get("period");
  return useCallback(
    (href: string) => {
      if (!period || href.startsWith("http")) return href;
      const [path, query = ""] = href.split("?");
      const next = new URLSearchParams(query);
      if (!next.has("period")) next.set("period", period);
      return `${path}?${next.toString()}`;
    },
    [period],
  );
}
