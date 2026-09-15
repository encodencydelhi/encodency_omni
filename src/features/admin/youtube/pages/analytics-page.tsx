"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import { ArrowRight, BarChart3, Clock, Download, Eye, FileText, MousePointerClick, Printer, Radio, Timer, UsersRound, X } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Switch } from "@/components/ui/switch";
import { buildRealtime, buildRetention, externalSites, mockAudience, searchTerms, trafficSources } from "../data/mock";
import {
  BarList,
  ChartLegend,
  ColumnChart,
  Donut,
  Funnel,
  KpiCard,
  LegendList,
  RetentionChart,
  TrendChart,
  aggregate,
  summarize,
  type Granularity,
} from "../components/charts";
import { downloadCsv } from "../components/dialogs";
import { RevenueKpis, RevenueTrendCard, useRevenue } from "./monetization-page";
import { CapabilityState, PageSkeleton } from "../components/states";
import {
  ActionMenu,
  Badge,
  Button,
  Card,
  CardHeader,
  EmptyState,
  PageTitle,
  Segmented,
  SelectMenu,
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
import { useChannelAnalytics } from "../hooks/use-analytics";
import { usePeriod, useQueryState, useWithPeriod } from "../hooks/use-query-state";
import { METRICS, METRIC_ORDER, ytRoutes } from "../lib/constants";
import { compact, duration, full, hours, percent, relative } from "../lib/format";
import { useYouTube } from "../store/youtube-store";
import type { ContentType, MetricKey, SeriesPoint, Video } from "../types";

type AnalyticsTab = "overview" | "content" | "reach" | "engagement" | "audience" | "revenue";

const DEFAULTS = { tab: "overview", metric: "views", compare: "1", type: "all", video: "all", country: "all", device: "all", granularity: "daily" };

const TYPE_SHARE: Record<ContentType | "all", number> = { all: 1, video: 0.62, short: 0.28, live: 0.1 };
const DEVICE_SHARE: Record<string, number> = { all: 1, mobile: 0.712, computer: 0.148, tv: 0.106, tablet: 0.034 };

const COUNTRIES = mockAudience.geography ?? [];
const TOTAL_COUNTRY_VIEWS = Math.max(1, COUNTRIES.reduce((s, c) => s + c.views, 0));

const KPI_ICONS: Record<MetricKey, typeof Eye> = { views: Eye, watchTime: Clock, subscribers: UsersRound, avgViewDuration: Timer, impressions: BarChart3, ctr: MousePointerClick };

export function AnalyticsPage() {
  const { ready, can } = useYouTube();
  if (!ready) return <PageSkeleton />;
  if (!can.canViewAnalytics.allowed) {
    return (
      <div className="space-y-1">
        <PageTitle title="Analytics" description="Understand why your channel's performance is changing." />
        <Card><CapabilityState capability={can.canViewAnalytics} title="Analytics unavailable" /></Card>
      </div>
    );
  }
  return <Analytics />;
}

/** Share of channel totals that matches the active filters (mock-mode approximation of a filtered Analytics API query). */
function filterFactor(type: string, device: string, country: string, videoViews: number | null) {
  let f = TYPE_SHARE[type as ContentType | "all"] ?? 1;
  f *= DEVICE_SHARE[device] ?? 1;
  if (country !== "all") f *= (COUNTRIES.find((c) => c.code === country)?.views ?? 0) / TOTAL_COUNTRY_VIEWS;
  if (videoViews !== null) f *= videoViews / 290_000;
  return f;
}

function scaleSeries(series: SeriesPoint[], factor: number): SeriesPoint[] {
  if (factor === 1) return series;
  return series.map((p) => ({ ...p, views: Math.round(p.views * factor), watchTime: Math.round(p.watchTime * factor), subscribers: Math.round(p.subscribers * factor), impressions: Math.round(p.impressions * factor) }));
}

function Analytics() {
  const { videos, can } = useYouTube();
  const { days, label, period } = usePeriod();
  const base = useChannelAnalytics(days);
  const { values, set, reset } = useQueryState(DEFAULTS);
  const tab = values.tab as AnalyticsTab;
  const metric = (METRIC_ORDER.includes(values.metric as MetricKey) ? values.metric : "views") as MetricKey;
  const compare = values.compare === "1";
  const granularity = (values.granularity === "monthly" && days < 90 ? "weekly" : values.granularity) as Granularity;

  const published = useMemo(() => videos.filter((v) => v.status === "published"), [videos]);
  const selectedVideo = published.find((v) => v.id === values.video);
  const countries = COUNTRIES;
  const selectedViews = selectedVideo?.stats.views ?? null;

  const { type: typeFilter, device: deviceFilter, country: countryFilter } = values;
  const factor = filterFactor(typeFilter, deviceFilter, countryFilter, selectedViews);

  const { current: baseCurrent, previous: basePrevious } = base;
  const current = scaleSeries(baseCurrent, factor);
  const previous = scaleSeries(basePrevious, factor);
  const totals = (key: MetricKey) => ({ value: summarize(current, key), previous: summarize(previous, key) });
  const spark = (key: MetricKey) => current.slice(-28).map((p) => p[key]);

  const activeFilters = (["type", "video", "country", "device"] as const).filter((k) => values[k] !== "all").length;

  const exportCsv = () => {
    const rows = aggregate(current, granularity).map((p) => [format(parseISO(p.date), "yyyy-MM-dd"), p.views, p.watchTime, p.subscribers, p.avgViewDuration, p.impressions, p.ctr]);
    downloadCsv([["Date", "Views", "Watch time (hours)", "Subscribers", "Avg view duration (s)", "Impressions", "CTR (%)"], ...rows], `youtube-analytics-${period}.csv`);
    toast.success("Analytics exported", { description: `${rows.length} rows · ${label}` });
  };

  return (
    <div className="space-y-1">
      <PageTitle
        title="Analytics"
        description={`${label} · compared with the previous ${days} days`}
        actions={
          <ActionMenu
            label="Export analytics"
            trigger={<button type="button" className={buttonClass("secondary", "md")}><Download className="size-4" />Export</button>}
            items={[
              { label: "Download CSV", icon: FileText, onSelect: exportCsv },
              { label: "Print / save as PDF report", icon: Printer, onSelect: () => window.print() },
            ]}
          />
        }
      />

      <Card>
        <div className="border-b border-[#EEF1F5] px-3 pt-1">
          <UnderlineTabs<AnalyticsTab>
            label="Analytics sections"
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
            <Switch checked={compare} onCheckedChange={(c) => set({ compare: c ? "1" : "0" })} className="scale-90" aria-label="Compare with previous period" />
            Compare to previous
          </label>
          <SelectMenu label="Content type" prefix="Type:" value={values.type} onChange={(v) => set({ type: v })} options={[{ value: "all", label: "All" }, { value: "video", label: "Videos" }, { value: "short", label: "Shorts" }, { value: "live", label: "Live" }]} />
          <SelectMenu label="Video" prefix="Video:" className="max-w-[240px]" value={values.video} onChange={(v) => set({ video: v })} options={[{ value: "all", label: "All content" }, ...published.map((v) => ({ value: v.id, label: v.title }))]} />
          <SelectMenu label="Country" prefix="Country:" value={values.country} onChange={(v) => set({ country: v })} options={[{ value: "all", label: "All" }, ...countries.map((c) => ({ value: c.code, label: c.country }))]} />
          <SelectMenu label="Device" prefix="Device:" value={values.device} onChange={(v) => set({ device: v })} options={[{ value: "all", label: "All" }, { value: "mobile", label: "Mobile" }, { value: "computer", label: "Computer" }, { value: "tv", label: "TV" }, { value: "tablet", label: "Tablet" }]} />
          {activeFilters > 0 && <Button size="sm" variant="ghost" icon={X} onClick={() => reset(["tab", "period", "metric", "compare", "granularity"])}>Clear {activeFilters} filter{activeFilters > 1 ? "s" : ""}</Button>}
          {selectedVideo && <ViewLink href={ytRoutes.video(selectedVideo.id)}>Open video</ViewLink>}
        </div>
      </Card>

      {(tab === "overview" || tab === "engagement" || tab === "reach") && (
        <div className="grid grid-cols-2 gap-1 md:grid-cols-3 xl:grid-cols-6">
          {(tab === "reach" ? (["impressions", "ctr", "views", "subscribers", "watchTime", "avgViewDuration"] as MetricKey[]) : METRIC_ORDER).map((key) => (
            <KpiCard key={key} metric={key} icon={KPI_ICONS[key]} value={totals(key).value} previous={compare ? totals(key).previous : null} spark={spark(key)} active={metric === key} onClick={() => set({ metric: key })} />
          ))}
        </div>
      )}

      {tab === "overview" && (
        <>
          <div className="grid gap-1 xl:grid-cols-12">
            <TrendCard className="xl:col-span-8" current={current} previous={previous} metric={metric} compare={compare} granularity={granularity} days={days} onMetric={(m) => set({ metric: m })} onGranularity={(g) => set({ granularity: g })} />
            <RealtimeCard className="xl:col-span-4" videos={published} factor={factor} />
          </div>
          <div className="grid gap-1 xl:grid-cols-12">
            <TopContentCard key={values.type} initialType={values.type === "all" ? undefined : (values.type as ContentType)} className="xl:col-span-7" videos={published} />
            <TrafficTable className="xl:col-span-5" compact />
          </div>
        </>
      )}

      {tab === "content" && (
        <>
          <TopContentCard key={values.type} initialType={values.type === "all" ? undefined : (values.type as ContentType)} videos={published} full />
          <div className="grid gap-1 xl:grid-cols-12">
            <RetentionCard className="xl:col-span-8" videos={published} />
            <Card className="xl:col-span-4">
              <CardHeader title="Views by content type" />
              <div className="flex flex-col items-center gap-4 px-4 pb-4 sm:flex-row xl:flex-col">
                <Donut data={[{ label: "Videos", value: 62 }, { label: "Shorts", value: 28 }, { label: "Live", value: 10 }]} colors={["#E5202E", "#7C3AED", "#0891B2"]} centerValue={compact(totals("views").value)} centerLabel="Views" />
                <LegendList data={[{ label: "Videos", value: 62 }, { label: "Shorts", value: 28 }, { label: "Live", value: 10 }]} colors={["#E5202E", "#7C3AED", "#0891B2"]} className="w-full" />
              </div>
            </Card>
          </div>
        </>
      )}

      {tab === "reach" && (
        <>
          <div className="grid gap-1 xl:grid-cols-12">
            <Card className="xl:col-span-5">
              <CardHeader title="Impressions funnel" description="How impressions turn into watch time and subscribers" />
              <div className="px-4 pb-4">
                <Funnel
                  steps={[
                    { label: "Impressions", value: compact(totals("impressions").value), width: 100, help: "Times your thumbnails were shown on YouTube." },
                    { label: "Views from impressions", value: compact(totals("views").value * 0.72), rate: `${percent(totals("ctr").value)} click-through rate`, width: 62 },
                    { label: "Watch time", value: hours(totals("watchTime").value), rate: `${duration(totals("avgViewDuration").value)} average view duration`, width: 38 },
                    { label: "Subscribers", value: `+${full(totals("subscribers").value)}`, rate: `${((totals("subscribers").value / Math.max(1, totals("views").value)) * 1000).toFixed(1)} per 1K views`, width: 18 },
                  ]}
                />
              </div>
            </Card>
            <TrendCard className="xl:col-span-7" current={current} previous={previous} metric={metric === "impressions" || metric === "ctr" ? metric : "impressions"} compare={compare} granularity={granularity} days={days} onMetric={(m) => set({ metric: m })} onGranularity={(g) => set({ granularity: g })} metrics={["impressions", "ctr", "views"]} />
          </div>
          <TrafficTable />
          <div className="grid gap-1 md:grid-cols-2">
            <Card>
              <CardHeader title="External sources" description="Websites and apps that link to your videos" />
              <div className="px-4 pb-4"><BarList data={externalSites} color="#0891B2" /></div>
            </Card>
            <Card>
              <CardHeader title="YouTube search terms" description="Top searches that led to your content" />
              <div className="px-4 pb-4"><BarList data={searchTerms} color="#D97706" format={(v) => `${compact(v)} views`} /></div>
            </Card>
          </div>
        </>
      )}

      {tab === "engagement" && (
        <>
          <div className="grid gap-1 xl:grid-cols-12">
            <TrendCard className="xl:col-span-7" current={current} previous={previous} metric={metric === "watchTime" || metric === "avgViewDuration" ? metric : "watchTime"} compare={compare} granularity={granularity} days={days} onMetric={(m) => set({ metric: m })} onGranularity={(g) => set({ granularity: g })} metrics={["watchTime", "avgViewDuration", "subscribers"]} />
            <RetentionCard className="xl:col-span-5" videos={published} />
          </div>
          <EngagementTable videos={published} />
        </>
      )}

      {tab === "audience" && (
        <div className="grid gap-1 xl:grid-cols-12">
          <Card className="xl:col-span-8">
            <CardHeader title="Subscribers" description="Net subscribers over time" actions={<ViewLink href={`${ytRoutes.audience}?tab=subscribers&period=${period}`}>Subscriber details</ViewLink>} />
            <div className="px-4 pb-4"><TrendChart current={current} previous={previous} metric="subscribers" granularity={granularity} compare={compare} height={240} /></div>
          </Card>
          <Card className="xl:col-span-4">
            <CardHeader title="Returning vs new viewers" />
            <div className="space-y-3 px-4 pb-4">
              <BarList data={[{ label: "New viewers", value: 74.6 }, { label: "Returning", value: 25.4 }]} color="#2563EB" />
              <p className="text-[12.5px] leading-5 text-[#6B7890]">Demographics, geography, devices and viewer activity live in the Audience tab.</p>
              <Button size="sm" variant="secondary" iconRight={ArrowRight} href={`${ytRoutes.audience}?period=${period}`}>Open Audience</Button>
            </div>
          </Card>
        </div>
      )}

      {tab === "revenue" && can.canViewRevenue.allowed && <RevenueAnalytics current={current} />}
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
  onMetric,
  onGranularity,
  metrics = ["views", "watchTime", "subscribers", "avgViewDuration", "impressions", "ctr"],
}: {
  className?: string;
  current: SeriesPoint[];
  previous: SeriesPoint[];
  metric: MetricKey;
  compare: boolean;
  granularity: Granularity;
  days: number;
  onMetric: (m: MetricKey) => void;
  onGranularity: (g: Granularity) => void;
  metrics?: MetricKey[];
}) {
  return (
    <Card className={className}>
      <CardHeader
        title="Performance trend"
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
          <Segmented<MetricKey> label="Trend metric" value={metrics.includes(metric) ? metric : metrics[0]!} onChange={onMetric} className="max-w-full overflow-x-auto" items={metrics.map((m) => ({ value: m, label: METRICS[m].short }))} />
          <ChartLegend items={[{ label: METRICS[metric].label, color: METRICS[metric].color }, ...(compare ? [{ label: "Previous period", color: "#C9D1DC", dashed: true }] : [])]} />
        </div>
        <div className="mt-3"><TrendChart current={current} previous={previous} metric={metrics.includes(metric) ? metric : metrics[0]!} granularity={granularity} compare={compare} height={260} /></div>
      </div>
    </Card>
  );
}

function RealtimeCard({ className, videos, factor }: { className?: string; videos: Video[]; factor: number }) {
  const data = useMemo(() => buildRealtime().map((d) => ({ label: d.hour, value: Math.round(d.views * factor) })), [factor]);
  const total = data.reduce((s, d) => s + d.value, 0);
  const lastHour = data[data.length - 1]?.value ?? 0;
  const top = [...videos].sort((a, b) => b.stats.views - a.stats.views).slice(0, 3);
  return (
    <Card className={cn("flex flex-col", className)}>
      <CardHeader title="Real-time" badge={<Badge tone="red" dot>Updating</Badge>} description="Last 48 hours · estimated" />
      <div className="flex flex-1 flex-col px-4 pb-4">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-[22px] font-semibold tabular-nums text-[#0F1B3D]">{full(total)}</p>
            <p className="text-[12px] text-[#6B7890]">views · {full(lastHour)} in the last hour</p>
          </div>
        </div>
        <div className="mt-2"><ColumnChart data={data} height={110} labelFormat={(l) => format(parseISO(l), "EEE h a")} /></div>
        <p className="mb-1.5 mt-3 text-[11px] font-semibold uppercase tracking-[0.04em] text-[#98A2B3]">Top content right now</p>
        <ul className="space-y-1.5">
          {top.map((v, i) => (
            <li key={v.id}>
              <Link href={ytRoutes.video(v.id)} className="flex items-center gap-2.5 rounded-sm py-0.5 hover:bg-[#F8FAFC]">
                <Thumb src={v.thumbnailUrl} className="w-12" sizes="48px" />
                <span className="min-w-0 flex-1 truncate text-[12.5px] font-medium text-[#0F1B3D]">{v.title}</span>
                <span className="text-[12px] font-semibold tabular-nums text-[#3C4A66]">{full(Math.round((v.stats.views / 1000) * factor * (3 - i) * 4))}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </Card>
  );
}

type ContentSort = "views" | "watch" | "ctr" | "avd" | "subs";

function TopContentCard({ className, videos, full: isFull, initialType }: { className?: string; videos: Video[]; full?: boolean; initialType?: ContentType }) {
  const [type, setType] = useState<ContentType>(initialType ?? "video");
  const [sort, setSort] = useState<ContentSort>("views");
  const [dir, setDir] = useState<SortDir>("desc");
  const rows = useMemo(() => {
    const val = (v: Video) => (sort === "views" ? v.stats.views : sort === "watch" ? v.stats.watchTimeHours : sort === "ctr" ? v.stats.ctr ?? -1 : sort === "avd" ? v.stats.avgViewDurationSec ?? -1 : v.stats.subscribersGained ?? -1);
    return videos.filter((v) => v.type === type).sort((a, b) => (dir === "desc" ? val(b) - val(a) : val(a) - val(b))).slice(0, isFull ? 20 : 5);
  }, [videos, type, sort, dir, isFull]);
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
        title="Top content"
        actions={<Segmented<ContentType> label="Content type" value={type} onChange={setType} items={[{ value: "video", label: "Videos" }, { value: "short", label: "Shorts" }, { value: "live", label: "Live" }]} />}
      />
      {rows.length === 0 ? (
        <EmptyState compact icon={Radio} title={`No ${type === "live" ? "live replays" : type === "short" ? "Shorts" : "videos"} in this period`} description="Try another content type or a longer date range." />
      ) : (
        <div className="scrollbar-thin overflow-x-auto">
          <table className="w-full min-w-[680px] border-separate border-spacing-0 text-left">
            <thead>
              <tr>
                <th className={cn(thClass, "static pl-4")}>Content</th>
                <SortHeader className="static" label="Views" align="right" active={sort === "views"} dir={dir} onClick={() => toggle("views")} />
                <SortHeader className="static" label="Watch time" align="right" active={sort === "watch"} dir={dir} onClick={() => toggle("watch")} />
                <SortHeader className="static" label="Avg. duration" align="right" active={sort === "avd"} dir={dir} onClick={() => toggle("avd")} />
                <SortHeader className="static" label="CTR" align="right" active={sort === "ctr"} dir={dir} onClick={() => toggle("ctr")} />
                <SortHeader className="static pr-4" label="Subs" align="right" active={sort === "subs"} dir={dir} onClick={() => toggle("subs")} />
              </tr>
            </thead>
            <tbody>
              {rows.map((v) => (
                <tr key={v.id} className="group hover:bg-[#F8FAFC]">
                  <td className={cn(tdClass, "max-w-[320px] pl-4")}>
                    <Link href={`${ytRoutes.video(v.id)}?tab=analytics`} className="flex items-center gap-2.5">
                      <Thumb src={v.thumbnailUrl} durationSec={v.durationSec} className="w-[68px]" sizes="68px" />
                      <span className="min-w-0">
                        <span className="block truncate text-[12.5px] font-semibold text-[#0F1B3D] group-hover:text-[#2563EB]">{v.title}</span>
                        <span className="text-[11.5px] text-[#98A2B3]">{relative(v.publishedAt)}</span>
                      </span>
                    </Link>
                  </td>
                  <td className={cn(tdClass, "text-right font-semibold tabular-nums text-[#0F1B3D]")}>{compact(v.stats.views)}</td>
                  <td className={cn(tdClass, "text-right tabular-nums")}>{hours(v.stats.watchTimeHours)}</td>
                  <td className={cn(tdClass, "text-right tabular-nums")}>{duration(v.stats.avgViewDurationSec)}</td>
                  <td className={cn(tdClass, "text-right tabular-nums")}>{percent(v.stats.ctr)}</td>
                  <td className={cn(tdClass, "pr-4 text-right tabular-nums")}>{v.stats.subscribersGained === null ? "—" : `+${compact(v.stats.subscribersGained)}`}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {!isFull && <div className="border-t border-[#EEF1F5] px-4 py-2.5"><ViewLink href={`${ytRoutes.analytics}?tab=content`}>All content analytics</ViewLink></div>}
    </Card>
  );
}

function TrafficTable({ className, compact: isCompact }: { className?: string; compact?: boolean }) {
  const withPeriod = useWithPeriod();
  return (
    <Card className={className}>
      <CardHeader title="Traffic sources" description="How viewers find your content" actions={isCompact ? <ViewLink href={withPeriod(`${ytRoutes.analytics}?tab=reach`)}>Details</ViewLink> : undefined} />
      <div className={cn("grid gap-4 px-4 pb-4", !isCompact && "lg:grid-cols-[220px_1fr]")}>
        {!isCompact && (
          <div className="flex justify-center">
            <Donut data={trafficSources} size={180} thickness={22} centerValue={`${trafficSources.length}`} centerLabel="sources" />
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
              {trafficSources.map((s, i) => (
                <tr key={s.label}>
                  <td className={cn(tdClass, "pl-0")}>
                    <span className="flex items-center gap-2"><i className="size-2 rounded-sm" style={{ background: ["#2563EB", "#7C3AED", "#E5202E", "#0891B2", "#D97706", "#0E9F6E", "#98A2B3"][i] }} />{s.label}</span>
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
    </Card>
  );
}

function RetentionCard({ className, videos }: { className?: string; videos: Video[] }) {
  const long = videos.filter((v) => v.type !== "short");
  const [videoId, setVideoId] = useState("channel");
  const video = long.find((v) => v.id === videoId);
  const seed = video ? video.durationSec + video.id.length * 131 : 999;
  const data = useMemo(() => buildRetention(seed), [seed]);
  return (
    <Card className={className}>
      <CardHeader
        title="Audience retention"
        description={video ? "Selected video vs typical" : "Average across long-form videos vs typical"}
        actions={<SelectMenu label="Retention for" className="max-w-[220px]" value={videoId} onChange={setVideoId} options={[{ value: "channel", label: "Channel average" }, ...long.map((v) => ({ value: v.id, label: v.title }))]} />}
      />
      <div className="px-4 pb-4">
        <ChartLegend items={[{ label: video ? "This video" : "Your videos", color: "#7C3AED" }, { label: "Typical", color: "#C9D1DC", dashed: true }]} />
        <div className="mt-2"><RetentionChart data={data} durationSec={video?.durationSec} height={230} /></div>
      </div>
    </Card>
  );
}

function EngagementTable({ videos }: { videos: Video[] }) {
  const rows = [...videos].map((v) => ({ v, rate: ((v.stats.likes + v.stats.comments) / Math.max(1, v.stats.views)) * 100 })).sort((a, b) => b.rate - a.rate).slice(0, 8);
  return (
    <Card>
      <CardHeader title="Most engaging content" description="Likes and comments per view" />
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
    </Card>
  );
}


function RevenueAnalytics({ current }: { current: SeriesPoint[] }) {
  const { days, label, period } = usePeriod();
  const revenue = useRevenue(days);
  const views = summarize(current, "views");
  return (
    <div className="space-y-1">
      <RevenueKpis revenue={revenue} label={label} />
      <div className="grid gap-1 xl:grid-cols-12">
        <RevenueTrendCard className="xl:col-span-8" data={revenue.data} label={label} />
        <Card className="xl:col-span-4">
          <CardHeader title="What's driving revenue" />
          <div className="space-y-3 px-4 pb-4 text-[12.5px] leading-5 text-[#3C4A66]">
            <p><b className="font-semibold text-[#0F1B3D]">{compact(views)}</b> views earned an RPM of <b className="font-semibold text-[#0F1B3D]">₹{revenue.data.rpm.toFixed(2)}</b> — revenue per 1,000 views after YouTube&apos;s share.</p>
            <p>Watch page ads make up <b className="font-semibold text-[#0F1B3D]">{revenue.data.sources[0]?.value.toFixed(0)}%</b> of revenue, so longer videos with mid-roll ads move the total most.</p>
            <p>Shorts drive reach but earn far less per view. Watch the RPM trend when your Shorts share grows.</p>
            <Button size="sm" variant="secondary" iconRight={ArrowRight} href={`${ytRoutes.monetization}?period=${period}`}>Top earners &amp; sources</Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
