"use client";

/**
 * React access layer over the repository state and the pure selectors.
 * Pages use these hooks rather than reaching into the store or mock data.
 */
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";
import { PERIODS, type Period } from "../lib/constants";
import { useGbp } from "../store/gbp-store";
import type { AttentionIssue, Location, ProfileHealth } from "../types";
import {
  ALL_LOCATIONS,
  buildMetricSeries,
  computeAttention,
  computeProfileHealth,
  filterKeywords,
  periodDays,
  scopeLocationIds,
  sumMetric,
  type MetricSeriesPoint,
} from "./selectors";
import type { MetricKey } from "../lib/constants";

/**
 * Filters and tabs live in the URL so refresh, sharing and back/forward all
 * restore the same view. Defaults are omitted from the URL to keep it short.
 */
export function useQueryState<T extends Record<string, string>>(defaults: T) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const values = useMemo(() => {
    const next = { ...defaults };
    for (const key of Object.keys(defaults) as (keyof T)[]) {
      const fromUrl = params?.get(String(key));
      if (fromUrl !== null && fromUrl !== undefined) next[key] = fromUrl as T[keyof T];
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

/** The selected location travels in `?location=`, so every tab shares the context. */
export function useLocationScope() {
  const { locations } = useGbp();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const raw = params?.get("location") ?? ALL_LOCATIONS;
  const selected = raw !== ALL_LOCATIONS && !locations.some((l) => l.locationId === raw) ? ALL_LOCATIONS : raw;

  const setLocation = useCallback(
    (locationId: string) => {
      const next = new URLSearchParams(params?.toString());
      if (locationId === ALL_LOCATIONS) next.delete("location");
      else next.set("location", locationId);
      const query = next.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [params, pathname, router],
  );

  const location: Location | null = selected === ALL_LOCATIONS ? null : locations.find((l) => l.locationId === selected) ?? null;
  const scopedIds = useMemo(() => scopeLocationIds(locations, selected), [locations, selected]);

  return { selected, location, scopedIds, setLocation, isAll: selected === ALL_LOCATIONS };
}

export function usePeriod() {
  const params = useSearchParams();
  const raw = params?.get("period");
  const period: Period = PERIODS.some((p) => p.value === raw) ? (raw as Period) : "30d";
  const meta = PERIODS.find((p) => p.value === period) ?? PERIODS[1]!;
  return { period, days: meta.days, label: meta.label };
}

/** Carries the current location and period onto cross-tab links. */
export function useWithContext() {
  const params = useSearchParams();
  const location = params?.get("location");
  const period = params?.get("period");
  return useCallback(
    (href: string) => {
      if (href.startsWith("http")) return href;
      const [path, query = ""] = href.split("?");
      const next = new URLSearchParams(query);
      if (location && !next.has("location")) next.set("location", location);
      if (period && !next.has("period")) next.set("period", period);
      const search = next.toString();
      return search ? `${path}?${search}` : (path as string);
    },
    [location, period],
  );
}

export interface MetricTotals {
  current: MetricSeriesPoint[];
  previous: MetricSeriesPoint[];
  total: (metric: MetricKey) => number;
  previousTotal: (metric: MetricKey) => number;
  spark: (metric: MetricKey) => number[];
}

export function useMetrics(locationIds: string[], period: Period): MetricTotals {
  const { performance } = useGbp();
  const days = periodDays(period);
  return useMemo(() => {
    const current = buildMetricSeries(performance, locationIds, days);
    const previous = buildMetricSeries(performance, locationIds, days, days);
    return {
      current,
      previous,
      total: (metric: MetricKey) => sumMetric(current, metric),
      previousTotal: (metric: MetricKey) => sumMetric(previous, metric),
      spark: (metric: MetricKey) => current.map((point) => point.values[metric]),
    };
  }, [performance, locationIds, days]);
}

export function useKeywords(locationIds: string[]) {
  const { searchKeywords } = useGbp();
  return useMemo(() => filterKeywords(searchKeywords, locationIds), [searchKeywords, locationIds]);
}

export function useProfileHealth(locationId: string | null): ProfileHealth | null {
  const { locations, reviews, media, attributeDefinitions } = useGbp();
  return useMemo(() => {
    const location = locationId ? locations.find((l) => l.locationId === locationId) : locations[0];
    if (!location) return null;
    return computeProfileHealth(location, reviews, media, attributeDefinitions);
  }, [locationId, locations, reviews, media, attributeDefinitions]);
}

/** Health across every managed location, averaged - used on the Overview. */
export function useAccountHealth(): ProfileHealth | null {
  const { locations, reviews, media, attributeDefinitions } = useGbp();
  return useMemo(() => {
    if (!locations.length) return null;
    const perLocation = locations.map((l) => computeProfileHealth(l, reviews, media, attributeDefinitions));
    const factors = (perLocation[0]?.factors ?? []).map((factor, index) => {
      const scores = perLocation.map((health) => health.factors[index]?.score ?? 0);
      const score = Math.round(scores.reduce((sum, s) => sum + s, 0) / scores.length);
      const worstIndex = scores.indexOf(Math.min(...scores));
      const worst = perLocation[worstIndex]?.factors[index];
      return {
        ...factor,
        score,
        status: (score >= 80 ? "good" : score >= 50 ? "warning" : "critical") as "good" | "warning" | "critical",
        explanation: scores.every((s) => s >= 80)
          ? factor.explanation
          : `Weakest at ${locations[worstIndex]?.profile.title ?? "a location"}: ${worst?.explanation ?? factor.explanation}`,
        actionLabel: worst?.actionLabel ?? null,
        href: worst?.href ?? null,
      };
    });
    const score = Math.round(factors.reduce((sum, f) => sum + f.score, 0) / Math.max(1, factors.length));
    return { score, factors };
  }, [locations, reviews, media, attributeDefinitions]);
}

export function useAttention(locationId?: string | null): AttentionIssue[] {
  const { locations, reviews, media, attributeDefinitions } = useGbp();
  return useMemo(() => {
    const scoped = locationId ? locations.filter((l) => l.locationId === locationId) : locations;
    const scopedReviews = locationId ? reviews.filter((r) => r.locationId === locationId) : reviews;
    return computeAttention(scoped, scopedReviews, media, attributeDefinitions);
  }, [locations, reviews, media, attributeDefinitions, locationId]);
}
