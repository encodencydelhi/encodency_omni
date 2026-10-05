"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import { ArrowRight, BarChart3, Clock, Download, Eye, FileText, Printer, Radio, Timer, UsersRound, X } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Switch } from "@/components/ui/switch";
import { BarList, ChartLegend, Donut, KpiCard, KpiSkeleton, LegendList, TrendChart, aggregate, type Granularity } from "../components/charts";
import { downloadCsv } from "../components/dialogs";
import { RevenueSection } from "./monetization-page";
import { CapabilityState, ErrorState, PageSkeleton, AnalyticsLagNote } from "../components/states";
import {
  ActionMenu,
  Button,
  Card,
  CardHeader,
  EmptyState,
  PageTitle,
  Segmented,
  SelectMenu,
  Skeleton,
  SortHeader,
  Thumb,
  TypeBadge,
  UnderlineTabs,
  ViewLink,
  buttonClass,
  tdClass,
  thClass,
  type SortDir,
} from "../components/ui";
import { useAnalyticsTopVideos } from "../data/hooks";
import { useChannelAnalytics, usePlaybackLocations, useTrafficSources, useVideoAnalyticsView } from "../data/view-hooks";
import { usePeriod, useQueryState, useWithPeriod } from "../hooks/use-query-state";
import { describeYouTubeError } from "../live/youtube-errors";
import { METRICS, METRIC_ORDER, ytRoutes } from "../lib/constants";
import { compact, duration, hours, percent, relative } from "../lib/format";
import { periodRange } from "../lib/period";
import { useYouTube } from "../store/youtube-store";
import type { ContentType, MetricKey, SeriesPoint, Video } from "../types";

type AnalyticsTab = "overview" | "content" | "reach" | "engagement" | "audience" | "revenue";

const DEFAULTS = { tab: "overview", metric: "views", compare: "1", video: "all", granularity: "daily" };

const KPI_ICONS: Record<MetricKey, typeof Eye> = { views: Eye, watchTime: Clock, subscribers: UsersRound, avgViewDuration: Timer };
/** Every KPI card can drive the trend chart. */
const CHARTABLE: MetricKey[] = ["views", "watchTime", "subscribers", "avgViewDuration"];

export function AnalyticsPage() {
  const { ready, can } = useYouTube();
  if (!ready) return <PageSkeleton />;
  if (!can.canViewAnalytics.allowed) {
    return (
      <div className="space-y-1">
        <PageTitle title="Analytics" description="Understand why your channel's performance is changing." />
        <Card><CapabilityState capability={can.canViewAnalytics} title="Analytics Unavailable" /></Card>
      </div>
    );
  }
  return <Analytics />;
}

function Analytics() {
  const { videos, can } = useYouTube();
  const { days, label, period } = usePeriod();
  const { values, set, reset } = useQueryState(DEFAULTS);
  const tab = values.tab as AnalyticsTab;
  const metric = (CHARTABLE.includes(values.metric as MetricKey) ? values.metric : "views") as MetricKey;
  const compare = values.compare === "1";
  const granularity = (values.granularity === "monthly" && days < 90 ? "weekly" : values.granularity) as Granularity;

  const published = useMemo(() => videos.filter((v) => v.status === "published"), [videos]);
  const selectedVideo = published.find((v) => v.id === values.video);

  // The Video filter swaps the data source to that video's own analytics. The API has no type / country / device filters.
  const channel = useChannelAnalytics(days);
  const single = useVideoAnalyticsView(selectedVideo?.id, days);
  const view = selectedVideo ? single : channel;
  const { current, previous, totals, spark } = view.data;

  const activeFilters = values.video !== "all" ? 1 : 0;

  const exportCsv = () => {
    const rows = aggregate(current, granularity).map((p) => [format(parseISO(p.date), "yyyy-MM-dd"), p.views ?? "", p.watchTime === null ? "" : Math.round(p.watchTime * 60), p.subscribers ?? "", p.avgViewDuration ?? ""]);
    downloadCsv([["Date", "Views", "Watch time (minutes)", "Net subscribers", "Avg view duration (s)"], ...rows], `youtube-analytics-${period}.csv`);
    toast.success("Analytics exported", { description: `${rows.length} rows · ${label}` });
  };

  return (
    <div className="space-y-1">
      <PageTitle
        title="Analytics"
        description={`${label} · compared with the previous ${days} days${selectedVideo ? ` · ${selectedVideo.title}` : ""}`}
        actions={
          <ActionMenu
            label="Export Analytics"
            trigger={<button type="button" className={buttonClass("secondary", "md")}><Download className="size-4" />Export</button>}
            items={[
              { label: "Download CSV", icon: FileText, onSelect: exportCsv },
              { label: "Print / Save As PDF Report", icon: Printer, onSelect: () => window.print() },
            ]}
          />
        }
      />

      <Card>
        <div className="border-b border-[#EEF1F5] px-3 pt-1">
          <UnderlineTabs<AnalyticsTab>
            label="Analytics Sections"
            value={tab}
            onChange={(v) => set({ tab: v })}
            items={[
              { value: "overview", label: "Overview" },
              { value: "content", label: "Content" },
              { value: "reach", label: "Reach" },
              { value: "engagement", label: "Engagement" },
              { value: "audience", label: "Audience" },
              ...(can.canViewRevenue.allowed ? [{ value: "revenue" as const, label: "Revenue" }] : []),
            ]}
          />
        </div>
        <div className="flex flex-wrap items-center gap-2 px-3 py-2.5">
          <label className="flex h-8 cursor-pointer items-center gap-2 rounded-sm border border-[#DCE2EA] bg-white px-2.5 text-[12px] font-medium text-[#24324F]">
            <Switch checked={compare} onCheckedChange={(c) => set({ compare: c ? "1" : "0" })} className="scale-90" aria-label="Compare With Previous Period" />
            Compare to previous
          </label>
          <SelectMenu label="Video" prefix="Video:" className="max-w-[240px]" value={values.video} onChange={(v) => set({ video: v })} options={[{ value: "all", label: "All Content" }, ...published.map((v) => ({ value: v.id, label: v.title }))]} />
          {activeFilters > 0 && <Button size="sm" variant="ghost" icon={X} onClick={() => reset(["tab", "period", "metric", "compare", "granularity"])}>Clear video filter</Button>}
          {selectedVideo && <ViewLink href={ytRoutes.video(selectedVideo.id)}>Open Video</ViewLink>}
        </div>
      </Card>

      {view.error && tab !== "revenue" && (tab === "overview" || tab === "engagement" || tab === "audience") ? (
        <Card><ErrorState error={view.error} onRetry={view.refetch} title="Analytics couldn't load" /></Card>
      ) : (
        <>
          {(tab === "overview" || tab === "engagement" || tab === "reach") && (
            <div className="grid grid-cols-2 gap-1 md:grid-cols-4">
              {view.isLoading ? (
                <KpiSkeleton />
              ) : (
                METRIC_ORDER.map((key) => (
                  <KpiCard
                    key={key}
                    metric={key}
                    icon={KPI_ICONS[key]}
                    value={totals[key].value}
                    previous={compare ? totals[key].previous : null}
                    spark={spark[key]}
                    unavailable={!view.data.hasData ? "No data for this period" : undefined}
                    active={metric === key}
                    onClick={CHARTABLE.includes(key) ? () => set({ metric: key }) : undefined}
                  />
                ))
              )}
            </div>
          )}

          {tab === "overview" && (
            <>
              <TrendCard current={current} previous={previous} metric={metric} compare={compare} granularity={granularity} days={days} loading={view.isLoading} hasData={view.data.hasData} onMetric={(m) => set({ metric: m })} onGranularity={(g) => set({ granularity: g })} />
              <div className="grid gap-1 xl:grid-cols-12">
                <TopContentCard className="xl:col-span-7" videos={videos} days={days} />
                <TrafficTable className="xl:col-span-5" compact days={days} />
              </div>
            </>
          )}

          {tab === "content" && (
            <>
              <div className="grid gap-1 xl:grid-cols-12">
                <TopContentCard className="xl:col-span-8" videos={videos} days={days} full />
                <ContentTypeCard className="xl:col-span-4" videos={videos} days={days} />
              </div>
            </>
          )}

          {tab === "reach" && (
            <>
              <div className="grid gap-1 xl:grid-cols-12">
                <PlaybackCard className="xl:col-span-5" days={days} />
                <TrendCard className="xl:col-span-7" current={current} previous={previous} metric={metric === "views" ? "views" : "views"} compare={compare} granularity={granularity} days={days} loading={view.isLoading} hasData={view.data.hasData} onMetric={(m) => set({ metric: m })} onGranularity={(g) => set({ granularity: g })} metrics={["views"]} />
              </div>
              <TrafficTable days={days} />
            </>
          )}

          {tab === "engagement" && (
            <>
              <TrendCard current={current} previous={previous} metric={metric === "watchTime" || metric === "avgViewDuration" || metric === "subscribers" ? metric : "watchTime"} compare={compare} granularity={granularity} days={days} loading={view.isLoading} hasData={view.data.hasData} onMetric={(m) => set({ metric: m })} onGranularity={(g) => set({ granularity: g })} metrics={["watchTime", "avgViewDuration", "subscribers"]} />
              <EngagementTable videos={published} />
            </>
          )}

          {tab === "audience" && (
            <Card>
              <CardHeader
                title="Subscribers"
                description="Net subscribers over time"
                actions={
                  <>
                    <ViewLink href={`${ytRoutes.audience}?tab=subscribers&period=${period}`}>Subscriber Details</ViewLink>
                    <Button size="sm" variant="secondary" iconRight={ArrowRight} href={`${ytRoutes.audience}?period=${period}`}>Open Audience</Button>
                  </>
                }
              />
              <div className="px-4 pb-4">
                {view.isLoading ? <Skeleton className="h-[240px] w-full" /> : <><TrendChart current={current} previous={previous} metric="subscribers" granularity={granularity} compare={compare} height={240} /><AnalyticsLagNote /></>}
              </div>
            </Card>
          )}

          {tab === "revenue" && can.canViewRevenue.allowed && <RevenueSection />}
        </>
      )}
    </div>
  );
}

function TrendCard({
  className,
  current,
  previous,
  metric,
  compare,
  granularity,
  days,
  loading,
  hasData,
  onMetric,
  onGranularity,
  metrics = ["views", "watchTime", "subscribers", "avgViewDuration"],
}: {
  className?: string;
  current: SeriesPoint[];
  previous: SeriesPoint[];
  metric: MetricKey;
  compare: boolean;
  granularity: Granularity;
  days: number;
  loading: boolean;
  hasData: boolean;
  onMetric: (m: MetricKey) => void;
  onGranularity: (g: Granularity) => void;
  metrics?: MetricKey[];
}) {
  const shown = metrics.includes(metric) ? metric : metrics[0]!;
  return (
    <Card className={className}>
      <CardHeader
        title="Performance Trend"
        actions={
          <SelectMenu<Granularity>
            label="Granularity"
            value={granularity}
            onChange={onGranularity}
            options={[{ value: "daily", label: "Daily" }, { value: "weekly", label: "Weekly" }, { value: "monthly", label: "Monthly", disabled: days < 90, description: days < 90 ? "Needs 90+ days" : undefined }]}
          />
        }
      />
      <div className="px-4 pb-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Segmented<MetricKey> label="Trend Metric" value={shown} onChange={onMetric} className="max-w-full overflow-x-auto" items={metrics.map((m) => ({ value: m, label: METRICS[m].short }))} />
          <ChartLegend items={[{ label: METRICS[shown].label, color: METRICS[shown].color }, ...(compare ? [{ label: "Previous Period", color: "#C9D1DC", dashed: true }] : [])]} />
        </div>
        <div className="mt-3">
          {loading ? <Skeleton className="h-[260px] w-full" /> : !hasData ? (
            <EmptyState compact icon={BarChart3} title="No Data For This Period" description="YouTube hasn't reported data for this date range yet. Try a longer range." />
          ) : (
            <><TrendChart current={current} previous={previous} metric={shown} granularity={granularity} compare={compare} height={260} /><AnalyticsLagNote /></>
          )}
        </div>
      </div>
    </Card>
  );
}

type ContentSort = "views" | "watch" | "avd" | "likes" | "subs";

/** Top videos for the period, from the Analytics API (up to 50), enriched with the video list for titles, types and thumbnails. */
function TopContentCard({ className, videos, days, full: isFull }: { className?: string; videos: Video[]; days: number; full?: boolean }) {
  const [type, setType] = useState<ContentType>("video");
  const [sort, setSort] = useState<ContentSort>("views");
  const [dir, setDir] = useState<SortDir>("desc");
  const range = useMemo(() => periodRange(days), [days]);
  const apiSort = sort === "watch" ? "estimatedMinutesWatched" : sort === "subs" ? "subscribersGained" : "views";
  const q = useAnalyticsTopVideos(range, apiSort, true, 50);
  const byId = useMemo(() => new Map(videos.map((v) => [v.id, v])), [videos]);

  const rows = useMemo(() => {
    const items = (q.data?.items ?? []).map((t) => {
      const known = byId.get(t.videoId);
      return {
        id: t.videoId,
        title: known?.title ?? t.video?.title ?? "Video",
        thumb: known?.thumbnailUrl ?? t.video?.thumbnail ?? "",
        type: (known?.type ?? "video") as ContentType,
        publishedAt: known?.publishedAt ?? t.video?.publishedAt ?? null,
        durationSec: known?.durationSec ?? null,
        views: t.metrics.views ?? null,
        watch: t.metrics.estimatedMinutesWatched === null || t.metrics.estimatedMinutesWatched === undefined ? null : t.metrics.estimatedMinutesWatched / 60,
        avd: t.metrics.averageViewDurationSeconds ?? null,
        likes: t.metrics.likes ?? null,
        subs: t.metrics.subscribersGained ?? null,
      };
    });
    const val = (r: (typeof items)[number]) => (r[sort] === null ? -1 : (r[sort] as number));
    return items.filter((r) => r.type === type).sort((a, b) => (dir === "desc" ? val(b) - val(a) : val(a) - val(b))).slice(0, isFull ? 20 : 5);
  }, [q.data, byId, type, sort, dir, isFull]);

  const toggle = (key: ContentSort) => {
    if (sort === key) setDir(dir === "desc" ? "asc" : "desc");
    else {
      setSort(key);
      setDir("desc");
    }
  };

  return (
    <Card className={className}>
      <CardHeader
        title="Top Content"
        actions={<Segmented<ContentType> label="Content Type" value={type} onChange={setType} items={[{ value: "video", label: "Videos" }, { value: "short", label: "Shorts" }, { value: "live", label: "Live" }]} />}
      />
      {q.isPending ? (
        <div className="space-y-2 px-4 pb-4">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
      ) : q.error ? (
        <ErrorState compact error={describeYouTubeError(q.error)} onRetry={() => void q.refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState compact icon={Radio} title={`No ${type === "live" ? "live replays" : type === "short" ? "Shorts" : "videos"} in this period`} description="Try another content type or a longer date range." />
      ) : (
        <div className="scrollbar-thin overflow-x-auto">
          <table className="w-full min-w-[680px] border-separate border-spacing-0 text-left">
            <thead>
              <tr>
                <th className={cn(thClass, "static pl-4")}>Content</th>
                <SortHeader className="static" label="Views" align="right" active={sort === "views"} dir={dir} onClick={() => toggle("views")} />
                <SortHeader className="static" label="Watch Time" align="right" active={sort === "watch"} dir={dir} onClick={() => toggle("watch")} />
                <SortHeader className="static" label="Avg. Duration" align="right" active={sort === "avd"} dir={dir} onClick={() => toggle("avd")} />
                <SortHeader className="static" label="Likes" align="right" active={sort === "likes"} dir={dir} onClick={() => toggle("likes")} />
                <SortHeader className="static pr-4" label="Subs" align="right" active={sort === "subs"} dir={dir} onClick={() => toggle("subs")} />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="group hover:bg-[#F8FAFC]">
                  <td className={cn(tdClass, "max-w-[320px] pl-4")}>
                    <Link href={`${ytRoutes.video(r.id)}?tab=analytics`} className="flex items-center gap-2.5">
                      <Thumb src={r.thumb} durationSec={r.durationSec} className="w-[68px]" sizes="68px" />
                      <span className="min-w-0">
                        <span className="block truncate text-[12.5px] font-semibold text-[#0F1B3D] group-hover:text-[#2563EB]">{r.title}</span>
                        <span className="text-[11.5px] text-[#98A2B3]">{relative(r.publishedAt)}</span>
                      </span>
                    </Link>
                  </td>
                  <td className={cn(tdClass, "text-right font-semibold tabular-nums text-[#0F1B3D]")}>{compact(r.views)}</td>
                  <td className={cn(tdClass, "text-right tabular-nums")}>{hours(r.watch)}</td>
                  <td className={cn(tdClass, "text-right tabular-nums")}>{duration(r.avd)}</td>
                  <td className={cn(tdClass, "text-right tabular-nums")}>{compact(r.likes)}</td>
                  <td className={cn(tdClass, "pr-4 text-right tabular-nums")}>{r.subs === null ? "—" : `${r.subs >= 0 ? "+" : ""}${compact(r.subs)}`}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {!isFull && <div className="border-t border-[#EEF1F5] px-4 py-2.5"><ViewLink href={`${ytRoutes.analytics}?tab=content`}>All Content Analytics</ViewLink></div>}
    </Card>
  );
}

/** Share of views by content type among the period's top 50 videos (types come from the video list). */
function ContentTypeCard({ className, videos, days }: { className?: string; videos: Video[]; days: number }) {
  const range = useMemo(() => periodRange(days), [days]);
  const q = useAnalyticsTopVideos(range, "views", true, 50);
  const byId = useMemo(() => new Map(videos.map((v) => [v.id, v])), [videos]);
  const data = useMemo(() => {
    const sums: Record<ContentType, number> = { video: 0, short: 0, live: 0 };
    for (const t of q.data?.items ?? []) sums[byId.get(t.videoId)?.type ?? "video"] += t.metrics.views ?? 0;
    const total = sums.video + sums.short + sums.live;
    return total > 0 ? [{ label: "Videos", value: (sums.video / total) * 100 }, { label: "Shorts", value: (sums.short / total) * 100 }, { label: "Live", value: (sums.live / total) * 100 }].filter((r) => r.value > 0) : [];
  }, [q.data, byId]);
  const colors = ["#E5202E", "#7C3AED", "#0891B2"];
  return (
    <Card className={className}>
      <CardHeader title="Views By Content Type" description="Among your top 50 videos" />
      {q.isPending ? (
        <div className="px-4 pb-4"><Skeleton className="mx-auto size-[132px]" /></div>
      ) : data.length === 0 ? (
        <EmptyState compact icon={BarChart3} title="No Data" description="No views reported for this period." />
      ) : (
        <div className="flex flex-col items-center gap-4 px-4 pb-4 sm:flex-row xl:flex-col">
          <Donut data={data} colors={colors} centerValue={`${data.length}`} centerLabel="types" />
          <LegendList data={data} colors={colors} className="w-full" />
        </div>
      )}
    </Card>
  );
}

const SOURCE_COLORS = ["#2563EB", "#7C3AED", "#E5202E", "#0891B2", "#D97706", "#0E9F6E", "#98A2B3"];

function TrafficTable({ className, compact: isCompact, days }: { className?: string; compact?: boolean; days: number }) {
  const withPeriod = useWithPeriod();
  const traffic = useTrafficSources(days);
  const rows = traffic.data.rows;
  return (
    <Card className={className}>
      <CardHeader title="Traffic Sources" description="How viewers find your content" actions={isCompact ? <ViewLink href={withPeriod(`${ytRoutes.analytics}?tab=reach`)}>Details</ViewLink> : undefined} />
      {traffic.isLoading ? (
        <div className="space-y-2 px-4 pb-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-6 w-full" />)}</div>
      ) : traffic.error ? (
        <ErrorState compact error={traffic.error} onRetry={traffic.refetch} />
      ) : rows.length === 0 ? (
        <EmptyState compact icon={BarChart3} title="No Traffic Data" description="YouTube hasn't reported traffic sources for this date range." />
      ) : (
        <div className={cn("grid gap-4 px-4 pb-4", !isCompact && "lg:grid-cols-[220px_1fr]")}>
          {!isCompact && (
            <div className="flex justify-center">
              <Donut data={rows} size={180} thickness={22} centerValue={`${rows.length}`} centerLabel="sources" />
            </div>
          )}
          <div className="scrollbar-thin overflow-x-auto">
            <table className="w-full min-w-[420px] text-left">
              <thead>
                <tr>
                  <th className={cn(thClass, "static bg-white pl-0")}>Source</th>
                  <th className={cn(thClass, "static bg-white text-right")}>Views</th>
                  {!isCompact && <th className={cn(thClass, "static bg-white text-right")}>Watch time</th>}
                  <th className={cn(thClass, "static bg-white pr-0 text-right")}>Avg. duration</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((s, i) => (
                  <tr key={s.label}>
                    <td className={cn(tdClass, "pl-0")}>
                      <span className="flex items-center gap-2"><i className="size-2 rounded-sm" style={{ background: SOURCE_COLORS[i % SOURCE_COLORS.length] }} />{s.label}</span>
                    </td>
                    <td className={cn(tdClass, "text-right font-semibold tabular-nums text-[#0F1B3D]")}>{s.value.toFixed(1)}%</td>
                    {!isCompact && <td className={cn(tdClass, "text-right tabular-nums")}>{hours(s.watchTimeHours ?? null)}</td>}
                    <td className={cn(tdClass, "pr-0 text-right tabular-nums")}>{duration(s.avgViewDurationSec ?? null)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Card>
  );
}

function PlaybackCard({ className, days }: { className?: string; days: number }) {
  const q = usePlaybackLocations(days);
  return (
    <Card className={className}>
      <CardHeader title="Where Views Happen" description="Playback locations, share of views" />
      <div className="px-4 pb-4">
        {q.isLoading ? <Skeleton className="h-32 w-full" /> : q.error ? <ErrorState compact error={q.error} onRetry={q.refetch} /> : q.data.rows.length === 0 ? (
          <EmptyState compact icon={BarChart3} title="No Data" description="YouTube hasn't reported playback locations for this range." />
        ) : (
          <BarList data={q.data.rows} color="#2563EB" />
        )}
      </div>
    </Card>
  );
}

function EngagementTable({ videos }: { videos: Video[] }) {
  // Lifetime likes + comments per view, from the video list (real statistics).
  const rows = [...videos]
    .map((v) => ({ v, rate: v.stats.views && v.stats.views > 0 && v.stats.likes !== null && v.stats.comments !== null ? ((v.stats.likes + v.stats.comments) / v.stats.views) * 100 : null }))
    .filter((r): r is { v: Video; rate: number } => r.rate !== null)
    .sort((a, b) => b.rate - a.rate)
    .slice(0, 8);
  return (
    <Card>
      <CardHeader title="Most Engaging Content" description="Likes and comments per view (lifetime)" />
      {rows.length === 0 ? (
        <EmptyState compact icon={BarChart3} title="Nothing To Rank Yet" description="Engagement appears once videos have views, visible likes and comments." />
      ) : (
        <div className="scrollbar-thin overflow-x-auto">
          <table className="w-full min-w-[620px] text-left">
            <thead>
              <tr>
                <th className={cn(thClass, "static pl-4")}>Content</th>
                <th className={cn(thClass, "static text-right")}>Likes</th>
                <th className={cn(thClass, "static text-right")}>Comments</th>
                <th className={cn(thClass, "static pr-4 text-right")}>Engagement rate</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ v, rate }) => (
                <tr key={v.id} className="group hover:bg-[#F8FAFC]">
                  <td className={cn(tdClass, "max-w-[360px] pl-4")}>
                    <Link href={ytRoutes.video(v.id)} className="flex items-center gap-2.5">
                      <Thumb src={v.thumbnailUrl} className="w-14" sizes="56px" />
                      <span className="truncate text-[12.5px] font-semibold text-[#0F1B3D] group-hover:text-[#2563EB]">{v.title}</span>
                      <TypeBadge type={v.type} />
                    </Link>
                  </td>
                  <td className={cn(tdClass, "text-right tabular-nums")}>{compact(v.stats.likes)}</td>
                  <td className={cn(tdClass, "text-right tabular-nums")}>
                    <Link href={`${ytRoutes.comments}?video=${v.id}`} className="hover:text-[#2563EB] hover:underline">{compact(v.stats.comments)}</Link>
                  </td>
                  <td className={cn(tdClass, "pr-4 text-right font-semibold tabular-nums text-[#0F1B3D]")}>{percent(rate, 2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

