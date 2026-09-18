"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";
import { differenceInCalendarDays, format, isValid, parseISO } from "date-fns";
import { DEFAULT_PERIOD, PERIODS } from "../lib/constants";
import type { Period } from "../x-data/types";

/**
 * Filters, tabs and open drawers live in the URL, so refresh, deep links and
 * list → detail → back all restore the same view. Values equal to the default
 * are dropped from the query string to keep shareable URLs readable.
 */
export function useQueryState<T extends Record<string, string>>(defaults: T) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const values = useMemo(() => {
    const next = { ...defaults };
    for (const key of Object.keys(defaults) as (keyof T)[]) {
      const value = params?.get(String(key));
      if (value !== null && value !== undefined) next[key] = value as T[keyof T];
    }
    return next;
  }, [defaults, params]);

  const set = useCallback(
    (patch: Partial<Record<keyof T, string | null>>) => {
      const next = new URLSearchParams(params?.toString());
      for (const [key, value] of Object.entries(patch)) {
        if (value === null || value === undefined || value === "" || value === defaults[key as keyof T]) next.delete(key);
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
      keep.forEach((key) => {
        const value = params?.get(key);
        if (value) next.set(key, value);
      });
      const query = next.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [params, pathname, router],
  );

  const activeCount = useMemo(
    () => (Object.keys(defaults) as (keyof T)[]).filter((key) => values[key] !== defaults[key]).length,
    [defaults, values],
  );

  return { values, set, reset, activeCount };
}

/**
 * The date range shared by Overview, Analytics and Audience.
 *
 * A custom range is stored as `period=custom&from=YYYY-MM-DD&to=YYYY-MM-DD`.
 * If either bound is missing or unparseable the hook falls back to the default
 * preset rather than rendering a broken window.
 */
export function usePeriod() {
  const params = useSearchParams();
  const raw = params?.get("period");
  const from = params?.get("from");
  const to = params?.get("to");

  if (raw === "custom" && from && to) {
    const start = parseISO(from);
    const end = parseISO(to);
    if (isValid(start) && isValid(end) && end >= start) {
      const days = Math.min(365, differenceInCalendarDays(end, start) + 1);
      return {
        period: "custom" as Period,
        days,
        label: `${format(start, "MMM d")} – ${format(end, "MMM d, yyyy")}`,
        short: "Custom",
        from,
        to,
      };
    }
  }

  const period: Period = PERIODS.some((p) => p.value === raw) ? (raw as Period) : DEFAULT_PERIOD;
  const meta = PERIODS.find((p) => p.value === period) ?? PERIODS[1]!;
  return { period, days: meta.days, label: meta.label, short: meta.short, from: null, to: null };
}

/** Carries the selected period onto cross-tab links so the range survives navigation. */
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
