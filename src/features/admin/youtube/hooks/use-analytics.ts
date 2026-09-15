"use client";

import { useMemo } from "react";
import { buildSeries } from "../data/mock";
import { summarize } from "../components/charts";
import { METRIC_ORDER } from "../lib/constants";
import type { MetricKey } from "../types";

export function useChannelAnalytics(days: number) {
  return useMemo(() => {
    const current = buildSeries(days);
    const previous = buildSeries(days, days);
    const totals = Object.fromEntries(
      METRIC_ORDER.map((key) => [key, { value: summarize(current, key), previous: summarize(previous, key) }]),
    ) as Record<MetricKey, { value: number; previous: number }>;
    const sparkSource = current.slice(-Math.min(days, 28));
    const spark = Object.fromEntries(METRIC_ORDER.map((key) => [key, sparkSource.map((p) => p[key])])) as Record<MetricKey, number[]>;
    return { current, previous, totals, spark };
  }, [days]);
}
