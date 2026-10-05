"use client";

import { useMemo } from "react";
import type { YouTubeErrorInfo } from "../live/youtube-errors";
import { describeYouTubeError } from "../live/youtube-errors";
import { METRIC_ORDER } from "../lib/constants";
import { periodRange, previousPeriodRange } from "../lib/period";
import { fillSeries } from "../lib/series";
import { useYouTube } from "../store/youtube-store";
import type { AudienceData, BreakdownRow, Maybe, MetricKey, RevenueData, SeriesPoint } from "../types";
import {
  useAnalyticsAudience,
  useAnalyticsDevices,
  useAnalyticsGeography,
  useAnalyticsOverview,
  useAnalyticsPlaybackLocations,
  useAnalyticsRevenue,
  useAnalyticsTimeseries,
  useAnalyticsTraffic,
  useVideoAnalytics,
} from "./hooks";
import { toAudience, toRevenue, toTotals, toTrafficRows, humanize } from "./mappers";

/**
 * Page-level view models built from the analytics queries. Each one returns `{ data, isLoading, error, refetch }`;
 * `hasData:false` from the backend is a normal empty state, a missing metric is `null` (never zero).
 */

export interface QueryView<T> {
  data: T;
  isLoading: boolean;
  error: YouTubeErrorInfo | null;
  refetch: () => void;
  /** Analytics are only requested when the permission is granted and the connection is usable. */
  enabled: boolean;
}

export interface ChannelAnalytics {
  current: SeriesPoint[];
  previous: SeriesPoint[];
  totals: Record<MetricKey, { value: Maybe<number>; previous: Maybe<number> }>;
  spark: Record<MetricKey, (number | null)[]>;
  hasData: boolean;
  rawTotals: { current: ReturnType<typeof toTotals>; previous: ReturnType<typeof toTotals> };
  likes: { current: Maybe<number>; previous: Maybe<number> };
  comments: { current: Maybe<number>; previous: Maybe<number> };
  subscribers: { gained: Maybe<number>; lost: Maybe<number> };
}

/** Channel analytics for the selected period and the equal period before it (real overview + daily series). */
export function useChannelAnalytics(days: number): QueryView<ChannelAnalytics> {
  const { can, connection } = useYouTube();
  const enabled = can.canViewAnalytics.allowed && connection.state !== "disconnected" && connection.state !== "not_mapped";
  const range = useMemo(() => periodRange(days), [days]);
  const prevRange = useMemo(() => previousPeriodRange(days), [days]);

  const overview = useAnalyticsOverview(range, enabled);
  const prevOverview = useAnalyticsOverview(prevRange, enabled);
  const series = useAnalyticsTimeseries(range, "day", enabled);
  const prevSeries = useAnalyticsTimeseries(prevRange, "day", enabled);

  const data = useMemo<ChannelAnalytics>(() => {
    const current = fillSeries(range, series.data?.series ?? []);
    const previous = fillSeries(prevRange, prevSeries.data?.series ?? []);
    const cur = toTotals(overview.data?.hasData ? overview.data.metrics : undefined);
    const prev = toTotals(prevOverview.data?.hasData ? prevOverview.data.metrics : undefined);
    const totals = Object.fromEntries(METRIC_ORDER.map((k) => [k, { value: cur[k], previous: prev[k] }])) as ChannelAnalytics["totals"];
    const tail = current.slice(-Math.min(days, 28));
    const spark = Object.fromEntries(METRIC_ORDER.map((k) => [k, tail.map((p) => p[k])])) as ChannelAnalytics["spark"];
    return {
      current,
      previous,
      totals,
      spark,
      hasData: Boolean(overview.data?.hasData),
      rawTotals: { current: cur, previous: prev },
      likes: { current: overview.data?.metrics.likes ?? null, previous: prevOverview.data?.metrics.likes ?? null },
      comments: { current: overview.data?.metrics.comments ?? null, previous: prevOverview.data?.metrics.comments ?? null },
      subscribers: { gained: overview.data?.metrics.subscribersGained ?? null, lost: overview.data?.metrics.subscribersLost ?? null },
    };
  }, [range, prevRange, series.data, prevSeries.data, overview.data, prevOverview.data, days]);

  const firstError = overview.error ?? series.error ?? null;
  return {
    data,
    isLoading: enabled && (overview.isPending || series.isPending),
    error: firstError ? describeYouTubeError(firstError) : null,
    refetch: () => {
      void overview.refetch();
      void prevOverview.refetch();
      void series.refetch();
      void prevSeries.refetch();
    },
    enabled,
  };
}

/** One video's analytics in the same shape as the channel's, for the Analytics page's "Video" filter. */
export function useVideoAnalyticsView(videoId: string | undefined, days: number): QueryView<ChannelAnalytics> {
  const { can, connection } = useYouTube();
  const enabled = Boolean(videoId) && can.canViewAnalytics.allowed && connection.state !== "disconnected" && connection.state !== "not_mapped";
  const range = useMemo(() => periodRange(days), [days]);
  const prevRange = useMemo(() => previousPeriodRange(days), [days]);
  const current = useVideoAnalytics(videoId, range, "day", enabled);
  const previous = useVideoAnalytics(videoId, prevRange, "day", enabled);
  // Daily reports carry no aggregate metrics (the backend leaves them null), so the totals come from "total" reports.
  const currentTotal = useVideoAnalytics(videoId, range, "total", enabled);
  const previousTotal = useVideoAnalytics(videoId, prevRange, "total", enabled);

  const data = useMemo<ChannelAnalytics>(() => {
    const cur = toTotals(currentTotal.data?.hasData ? currentTotal.data.metrics : undefined);
    const prev = toTotals(previousTotal.data?.hasData ? previousTotal.data.metrics : undefined);
    const currentSeries = fillSeries(range, current.data?.series ?? []);
    const totals = Object.fromEntries(METRIC_ORDER.map((k) => [k, { value: cur[k], previous: prev[k] }])) as ChannelAnalytics["totals"];
    const tail = currentSeries.slice(-Math.min(days, 28));
    const spark = Object.fromEntries(METRIC_ORDER.map((k) => [k, tail.map((p) => p[k])])) as ChannelAnalytics["spark"];
    return {
      current: currentSeries,
      previous: fillSeries(prevRange, previous.data?.series ?? []),
      totals,
      spark,
      hasData: Boolean(current.data?.hasData),
      rawTotals: { current: cur, previous: prev },
      likes: { current: currentTotal.data?.metrics.likes ?? null, previous: previousTotal.data?.metrics.likes ?? null },
      comments: { current: currentTotal.data?.metrics.comments ?? null, previous: previousTotal.data?.metrics.comments ?? null },
      subscribers: { gained: currentTotal.data?.metrics.subscribersGained ?? null, lost: currentTotal.data?.metrics.subscribersLost ?? null },
    };
  }, [current.data, previous.data, currentTotal.data, previousTotal.data, range, prevRange, days]);

  return {
    data,
    isLoading: enabled && (current.isPending || currentTotal.isPending),
    error: current.error ? describeYouTubeError(current.error) : null,
    refetch: () => {
      void current.refetch();
      void currentTotal.refetch();
      void previousTotal.refetch();
      void previous.refetch();
    },
    enabled,
  };
}

/** Traffic sources as shares of views. */
export function useTrafficSources(days: number): QueryView<{ rows: BreakdownRow[]; hasData: boolean }> {
  const { can, connection } = useYouTube();
  const enabled = can.canViewAnalytics.allowed && connection.state !== "disconnected" && connection.state !== "not_mapped";
  const range = useMemo(() => periodRange(days), [days]);
  const q = useAnalyticsTraffic(range, enabled);
  const data = useMemo(() => ({ rows: q.data ? toTrafficRows(q.data.items) : [], hasData: Boolean(q.data?.hasData) }), [q.data]);
  return { data, isLoading: enabled && q.isPending, error: q.error ? describeYouTubeError(q.error) : null, refetch: () => void q.refetch(), enabled };
}

/** Where views were watched (YouTube watch page, embedded players, ...). Provider labels kept readable, never reclassified. */
export function usePlaybackLocations(days: number): QueryView<{ rows: BreakdownRow[]; hasData: boolean }> {
  const { can, connection } = useYouTube();
  const enabled = can.canViewAnalytics.allowed && connection.state !== "disconnected" && connection.state !== "not_mapped";
  const range = useMemo(() => periodRange(days), [days]);
  const q = useAnalyticsPlaybackLocations(range, enabled);
  const data = useMemo(() => {
    const items = q.data?.items.filter((r) => r.views !== null) ?? [];
    const total = items.reduce((s, r) => s + (r.views ?? 0), 0);
    return { rows: items.map((r) => ({ label: humanize(r.playbackLocationType), value: total > 0 ? ((r.views ?? 0) / total) * 100 : 0 })), hasData: Boolean(q.data?.hasData) };
  }, [q.data]);
  return { data, isLoading: enabled && q.isPending, error: q.error ? describeYouTubeError(q.error) : null, refetch: () => void q.refetch(), enabled };
}

/** Demographics, geography, devices and subscribed-vs-not for the period. Empty parts are `null` (below YouTube's privacy thresholds). */
export function useAudienceData(days: number): QueryView<AudienceData> {
  const { can, connection } = useYouTube();
  const enabled = can.canViewAnalytics.allowed && connection.state !== "disconnected" && connection.state !== "not_mapped";
  const range = useMemo(() => periodRange(days), [days]);
  const demographics = useAnalyticsAudience(range, "demographics", enabled);
  const subscribed = useAnalyticsAudience(range, "subscribedStatus", enabled);
  const geography = useAnalyticsGeography(range, enabled);
  const devices = useAnalyticsDevices(range, "deviceType", enabled);

  const data = useMemo<AudienceData>(
    () =>
      toAudience({
        demographics: demographics.data?.demographics,
        subscribed: subscribed.data?.subscribedStatus,
        geography: geography.data?.items,
        devices: devices.data?.items,
      }),
    [demographics.data, subscribed.data, geography.data, devices.data],
  );

  const err = demographics.error ?? geography.error ?? devices.error ?? subscribed.error ?? null;
  return {
    data,
    isLoading: enabled && (demographics.isPending || geography.isPending || devices.isPending),
    error: err ? describeYouTubeError(err) : null,
    refetch: () => {
      void demographics.refetch();
      void subscribed.refetch();
      void geography.refetch();
      void devices.refetch();
    },
    enabled,
  };
}

/** Estimated revenue. `total` is null when YouTube returned no revenue row (unavailable, not zero). Only requested with the monetary permission. */
export function useRevenueData(days: number): QueryView<{ total: Maybe<RevenueData>; previousTotal: Maybe<number> }> {
  const { can, connection } = useYouTube();
  const enabled = can.canViewRevenue.allowed && connection.state !== "disconnected" && connection.state !== "not_mapped";
  const range = useMemo(() => periodRange(days), [days]);
  const prevRange = useMemo(() => previousPeriodRange(days), [days]);
  const totalQ = useAnalyticsRevenue(range, "total", enabled);
  const dailyQ = useAnalyticsRevenue(range, "day", enabled);
  const previousQ = useAnalyticsRevenue(prevRange, "total", enabled);
  const data = useMemo(
    () => ({
      total: totalQ.data ? toRevenue(totalQ.data, dailyQ.data) : null,
      previousTotal: previousQ.data?.hasData ? previousQ.data.totals?.estimatedRevenue ?? null : null,
    }),
    [totalQ.data, dailyQ.data, previousQ.data],
  );
  const err = totalQ.error ?? dailyQ.error ?? null;
  return {
    data,
    isLoading: enabled && totalQ.isPending,
    error: err ? describeYouTubeError(err) : null,
    refetch: () => {
      void totalQ.refetch();
      void dailyQ.refetch();
      void previousQ.refetch();
    },
    enabled,
  };
}
