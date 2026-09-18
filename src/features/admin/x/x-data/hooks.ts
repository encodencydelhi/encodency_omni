"use client";

/**
 * React bindings over the store and the pure selectors. Pages compose these —
 * they never reach for the repository or the mock data themselves.
 */

import { useEffect, useMemo, useState } from "react";
import { useX } from "../store/x-store";
import { accountHealth } from "../lib/insights";
import { ANALYTICS_METRICS } from "../lib/constants";
import {
  attentionItems,
  countMentions,
  filterMentions,
  filterPosts,
  queueHealth,
  sortMentions,
  summarize,
  type MentionFilters,
  type PostFilters,
} from "./selectors";
import type { MetricKey, MetricTotal, SeriesPoint } from "./types";

/* ------------------------------------------------------------------ */
/* Analytics                                                           */
/* ------------------------------------------------------------------ */

export interface AnalyticsResult {
  loading: boolean;
  error: string | null;
  current: SeriesPoint[];
  previous: SeriesPoint[];
  totals: Record<MetricKey, MetricTotal>;
  /** Last 30 points of each metric, for the KPI sparklines. */
  spark: Record<MetricKey, number[]>;
}

const EMPTY_TOTALS = Object.fromEntries(
  ANALYTICS_METRICS.map((key) => [key, { value: null, previous: null }]),
) as Record<MetricKey, MetricTotal>;

const EMPTY_SPARK = Object.fromEntries(ANALYTICS_METRICS.map((key) => [key, [] as number[]])) as Record<MetricKey, number[]>;

/**
 * Loads the current window and the one immediately before it, so every metric
 * can show a like-for-like comparison.
 */
interface SeriesState {
  current: SeriesPoint[];
  previous: SeriesPoint[];
  /** The window these series were loaded for; -1 until the first load lands. */
  days: number;
  error: string | null;
}

export function useXAnalytics(days: number): AnalyticsResult {
  const { repository, ready } = useX();
  const [state, setState] = useState<SeriesState>({ current: [], previous: [], days: -1, error: null });

  useEffect(() => {
    let cancelled = false;
    Promise.all([repository.loadSeries(days), repository.loadSeries(days, days)])
      .then(([current, previous]) => {
        if (!cancelled) setState({ current, previous, days, error: null });
      })
      .catch(() => {
        if (!cancelled) setState({ current: [], previous: [], days, error: "Analytics are unavailable right now." });
      });
    return () => {
      cancelled = true;
    };
  }, [repository, days]);

  // Loading is derived, not stored, so changing the range re-renders as
  // "loading" immediately without a second state write.
  const stale = state.days !== days;
  const { current, previous, error } = state;

  return useMemo(() => {
    if (stale || error || !current.length) {
      return { loading: stale || !ready, error, current: [], previous: [], totals: EMPTY_TOTALS, spark: EMPTY_SPARK };
    }
    const totals = Object.fromEntries(
      ANALYTICS_METRICS.map((key) => [key, { value: summarize(current, key), previous: summarize(previous, key) }]),
    ) as Record<MetricKey, MetricTotal>;
    const window = current.slice(-Math.min(days, 30));
    const spark = Object.fromEntries(ANALYTICS_METRICS.map((key) => [key, window.map((point) => point[key])])) as Record<MetricKey, number[]>;
    return { loading: !ready, error: null, current, previous, totals, spark };
  }, [stale, error, current, previous, days, ready]);
}

/* ------------------------------------------------------------------ */
/* Content                                                             */
/* ------------------------------------------------------------------ */

export function usePost(id: string | null) {
  const { posts } = useX();
  return useMemo(() => (id ? (posts.find((post) => post.id === id) ?? null) : null), [posts, id]);
}

export function useFilteredPosts(filters: PostFilters) {
  const { posts } = useX();
  return useMemo(() => filterPosts(posts, filters), [posts, filters]);
}

export function useQueueHealth() {
  const { posts, settings } = useX();
  return useMemo(() => queueHealth(posts, settings), [posts, settings]);
}

/* ------------------------------------------------------------------ */
/* Mentions                                                            */
/* ------------------------------------------------------------------ */

export function useMention(id: string | null) {
  const { mentions } = useX();
  return useMemo(() => (id ? (mentions.find((mention) => mention.id === id) ?? null) : null), [mentions, id]);
}

export function useFilteredMentions(filters: MentionFilters) {
  const { mentions } = useX();
  return useMemo(() => sortMentions(filterMentions(mentions, filters)), [mentions, filters]);
}

export function useMentionCounts() {
  const { mentions } = useX();
  return useMemo(() => countMentions(mentions), [mentions]);
}

/* ------------------------------------------------------------------ */
/* Account health & attention                                         */
/* ------------------------------------------------------------------ */

export function useAccountHealth() {
  const { account, posts, mentions, connection } = useX();
  return useMemo(() => accountHealth(account, posts, mentions, connection), [account, posts, mentions, connection]);
}

/** Fields X exposes that this profile has not filled in. */
export function useProfileGaps() {
  const { account } = useX();
  return useMemo(() => {
    const gaps: string[] = [];
    if (account.bio.length < 40) gaps.push("bio");
    if (!account.website) gaps.push("website");
    if (!account.location) gaps.push("location");
    if (!account.bannerUrl) gaps.push("header image");
    return gaps;
  }, [account]);
}

export function useAttention() {
  const { posts, mentions, connection } = useX();
  const gaps = useProfileGaps();
  return useMemo(
    () => attentionItems(posts, mentions, connection.state, connection.requestsUsed, connection.requestsLimit, gaps),
    [posts, mentions, connection, gaps],
  );
}
