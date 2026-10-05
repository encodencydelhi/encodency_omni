"use client";

import { useMemo, useState } from "react";
import { Clock, Monitor, Smartphone, Tablet, Timer, Tv, UsersRound, Eye, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { BarList, BubbleMap, Donut, LegendList, TrendChart } from "../components/charts";
import { CapabilityState, ErrorState, PageSkeleton, AnalyticsLagNote } from "../components/states";
import { Card, CardHeader, PageTitle, Segmented, Skeleton, SortHeader, TrendDelta, UnderlineTabs, ViewLink, tdClass, thClass, yt, type SortDir } from "../components/ui";
import { useAudienceData, useChannelAnalytics } from "../data/view-hooks";
import { usePeriod, useQueryState, useWithPeriod } from "../hooks/use-query-state";
import { ytRoutes } from "../lib/constants";
import { changePct, compact, duration, full, hours } from "../lib/format";
import { useYouTube } from "../store/youtube-store";
import type { AudienceData, GeographyRow, MetricKey } from "../types";

type AudienceTab = "overview" | "demographics" | "geography" | "devices" | "subscribers";

const DEFAULTS = { tab: "overview", geoMetric: "views", country: "" };

export function AudiencePage() {
  const { ready, can } = useYouTube();
  if (!ready) return <PageSkeleton />;
  return (
    <div className="space-y-1">
      <PageTitle title="Audience" description="Who watches your content and where they are." />
      {can.canViewAnalytics.allowed ? <Audience /> : <Card><CapabilityState capability={can.canViewAnalytics} title="Audience Data Unavailable" /></Card>}
    </div>
  );
}

function Audience() {
  const { days, label } = usePeriod();
  const analytics = useChannelAnalytics(days);
  const audience = useAudienceData(days);
  const { values, set } = useQueryState(DEFAULTS);
  const tab = values.tab as AudienceTab;
  const t = analytics.data.totals;

  // YouTube's Analytics API reports channel totals for the period; unique / returning / new viewer counts are not available to OmniPlatform.
  const kpis: { label: string; key: MetricKey; value: number | null; prev: number | null; icon: LucideIcon; hint: string; format: (v: number) => string }[] = [
    { label: "Views", key: "views", value: t.views.value, prev: t.views.previous, icon: Eye, hint: "In The Selected Period", format: compact },
    { label: "Watch Time", key: "watchTime", value: t.watchTime.value, prev: t.watchTime.previous, icon: Clock, hint: "Time Watched", format: (v) => hours(v) },
    { label: "Subscribers (Net)", key: "subscribers", value: t.subscribers.value, prev: t.subscribers.previous, icon: UsersRound, hint: "Gained Minus Lost", format: (v) => `${v >= 0 ? "+" : ""}${full(v)}` },
    { label: "Avg. View Duration", key: "avgViewDuration", value: t.avgViewDuration.value, prev: t.avgViewDuration.previous, icon: Timer, hint: "Per View", format: (v) => duration(v) },
  ];

  return (
    <div className="space-y-1">
      <div className="border-b border-[#E4E9F0]">
        <UnderlineTabs<AudienceTab>
          label="Audience Sections"
          value={tab}
          onChange={(v) => set({ tab: v })}
          items={[
            { value: "overview", label: "Overview" },
            { value: "demographics", label: "Demographics" },
            { value: "geography", label: "Geography" },
            { value: "devices", label: "Devices" },
            { value: "subscribers", label: "Subscribers" },
          ]}
        />
      </div>

      {analytics.error ? (
        <Card><ErrorState error={analytics.error} onRetry={analytics.refetch} title="Audience totals couldn't load" /></Card>
      ) : (
        <div className="grid grid-cols-2 gap-1 xl:grid-cols-4">
          {kpis.map((k) => (
            <div key={k.label} className={cn(yt.card, "p-3.5")}>
              <p className="flex items-center gap-1.5 text-[12px] text-[#6B7890]"><k.icon className="size-3.5" />{k.label}</p>
              {analytics.isLoading ? (
                <Skeleton className="mt-2 h-6 w-24" />
              ) : k.value === null ? (
                <p className="mt-2 text-[12.5px] leading-5 text-[#98A2B3]">Not enough data yet</p>
              ) : (
                <>
                  <p className="mt-1.5 text-[21px] font-semibold tabular-nums tracking-[-0.02em] text-[#0F1B3D]">{k.format(k.value)}</p>
                  <p className="flex flex-wrap items-center gap-1.5 text-[11.5px] text-[#98A2B3]"><TrendDelta value={changePct(k.value, k.prev)} />{k.hint}</p>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {audience.error ? (
        <Card><ErrorState error={audience.error} onRetry={audience.refetch} title="Audience data couldn't load" /></Card>
      ) : (
        <>
          {tab === "overview" && (
            <div className="grid gap-1 xl:grid-cols-12">
              <DemographicsCard className="xl:col-span-4" compactView audience={audience.data} loading={audience.isLoading} onMore={() => set({ tab: "demographics" })} />
              <GeographyCard className="xl:col-span-8" compactView metric="views" audience={audience.data} loading={audience.isLoading} onMore={() => set({ tab: "geography" })} />
              <DevicesCard className="xl:col-span-12" detailed audience={audience.data} loading={audience.isLoading} />
            </div>
          )}
          {tab === "demographics" && <DemographicsCard audience={audience.data} loading={audience.isLoading} />}
          {tab === "geography" && <GeographyCard audience={audience.data} loading={audience.isLoading} metric={values.geoMetric as GeoMetric} onMetric={(m) => set({ geoMetric: m })} selected={values.country || null} onSelect={(c) => set({ country: c === values.country ? "" : c })} />}
          {tab === "devices" && <DevicesCard detailed audience={audience.data} loading={audience.isLoading} />}
          {tab === "subscribers" && (
            <div className="grid gap-1 xl:grid-cols-12">
              <Card className="xl:col-span-8">
                <CardHeader title="Subscriber Growth" description={`${label} vs previous period`} />
                <div className="grid grid-cols-3 gap-2 px-4">
                  {[
                    { label: "Gained", value: analytics.data.subscribers.gained === null ? "—" : `+${full(analytics.data.subscribers.gained)}`, tone: "text-[#067647]" },
                    { label: "Lost", value: analytics.data.subscribers.lost === null ? "—" : `−${full(analytics.data.subscribers.lost)}`, tone: "text-[#C81E2B]" },
                    { label: "Net", value: t.subscribers.value === null ? "—" : `${t.subscribers.value >= 0 ? "+" : ""}${full(t.subscribers.value)}`, tone: "text-[#0F1B3D]" },
                  ].map((s) => (
                    <div key={s.label} className="rounded-sm bg-[#F8FAFC] px-3 py-2">
                      <p className="text-[11.5px] text-[#6B7890]">{s.label}</p>
                      <p className={cn("text-[18px] font-semibold tabular-nums", s.tone)}>{s.value}</p>
                    </div>
                  ))}
                </div>
                <div className="px-4 pb-4 pt-3">
                  {analytics.isLoading ? <Skeleton className="h-[240px] w-full" /> : <><TrendChart current={analytics.data.current} previous={analytics.data.previous} metric="subscribers" granularity={days > 90 ? "weekly" : "daily"} height={240} /><AnalyticsLagNote /></>}
                </div>
              </Card>
              <Card className="xl:col-span-4">
                <CardHeader title="Views By Subscriber Status" />
                <div className="px-4 pb-4">
                  {audience.isLoading ? <Skeleton className="h-24 w-full" /> : audience.data.subscribed ? <BarList data={audience.data.subscribed} color="#E5202E" /> : <ThresholdNotice />}
                </div>
              </Card>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export function ThresholdNotice() {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center">
      <span className="grid size-10 place-items-center rounded-sm bg-[#F3F5F9] text-[#6B7890] ring-1 ring-[#E4E9F0]"><UsersRound className="size-5" /></span>
      <p className="mt-3 text-[13.5px] font-semibold text-[#0F1B3D]">Not enough audience data yet</p>
      <p className="mt-1 max-w-[320px] text-[12.5px] leading-5 text-[#6B7890]">YouTube only shares this breakdown once enough viewers have watched, to protect their privacy. Try a longer date range.</p>
    </div>
  );
}

function CardSkeleton() {
  return <div className="space-y-2 px-4 pb-4"><Skeleton className="h-5 w-full" /><Skeleton className="h-5 w-full" /><Skeleton className="h-5 w-3/4" /></div>;
}

function DemographicsCard({ className, compactView, onMore, audience, loading }: { className?: string; compactView?: boolean; onMore?: () => void; audience: AudienceData; loading: boolean }) {
  return (
    <Card className={className}>
      <CardHeader title="Age & Gender" description="Share of viewers" actions={onMore ? <button type="button" onClick={onMore} className="text-[12px] font-semibold text-[#2563EB] hover:underline">Details</button> : undefined} />
      {loading ? (
        <CardSkeleton />
      ) : !audience.age || !audience.gender ? (
        <ThresholdNotice />
      ) : (
        <div className={cn("grid gap-5 px-4 pb-4", !compactView && "md:grid-cols-[260px_1fr]")}>
          <div className="flex items-center gap-4">
            <Donut data={audience.gender} colors={["#2563EB", "#DB2777", "#98A2B3"]} size={compactView ? 110 : 150} thickness={compactView ? 14 : 18} centerValue="Gender" centerLabel="of viewers" />
            <LegendList data={audience.gender} colors={["#2563EB", "#DB2777", "#98A2B3"]} className="flex-1" />
          </div>
          <BarList data={compactView ? audience.age.slice(1, 5) : audience.age} color="#0891B2" />
        </div>
      )}
    </Card>
  );
}

type GeoMetric = "views" | "watchTimeHours" | "subscribers";

function GeographyCard({ className, compactView, metric, onMetric, selected, onSelect, onMore, audience, loading }: { className?: string; compactView?: boolean; metric: GeoMetric; onMetric?: (m: GeoMetric) => void; selected?: string | null; onSelect?: (code: string) => void; onMore?: () => void; audience: AudienceData; loading: boolean }) {
  const withPeriod = useWithPeriod();
  const [sort, setSort] = useState<GeoMetric>("views");
  const [dir, setDir] = useState<SortDir>("desc");
  const rows = useMemo(() => [...(audience.geography ?? [])].sort((a, b) => (dir === "desc" ? b[sort] - a[sort] : a[sort] - b[sort])), [audience.geography, sort, dir]);
  const total = rows.reduce((s, r) => s + r.views, 0);
  const toggle = (k: GeoMetric) => {
    if (sort === k) setDir(dir === "desc" ? "asc" : "desc");
    else {
      setSort(k);
      setDir("desc");
    }
  };

  return (
    <Card className={className}>
      <CardHeader
        title="Top Geographies"
        description="Where your viewers are"
        actions={
          onMore ? <button type="button" onClick={onMore} className="text-[12px] font-semibold text-[#2563EB] hover:underline">Details</button> : onMetric ? (
            <Segmented<GeoMetric> label="Map Metric" value={metric} onChange={onMetric} items={[{ value: "views", label: "Views" }, { value: "watchTimeHours", label: "Watch Time" }, { value: "subscribers", label: "Subscribers" }]} />
          ) : undefined
        }
      />
      {loading ? (
        <CardSkeleton />
      ) : !audience.geography ? (
        <ThresholdNotice />
      ) : (
        <div className={cn("grid gap-4 px-4 pb-4", compactView ? "md:grid-cols-[1.3fr_1fr]" : "")}>
          <BubbleMap rows={rows} metric={metric} selected={selected} onSelect={onSelect} />
          {compactView ? (
            <BarList data={rows.slice(0, 6).map((r) => ({ label: r.country, value: total > 0 ? (r.views / total) * 100 : 0 }))} color="#E5202E" />
          ) : (
            <div className="scrollbar-thin overflow-x-auto rounded-sm border border-[#EEF1F5]">
              <table className="w-full min-w-[560px] border-separate border-spacing-0 text-left">
                <thead>
                  <tr>
                    <th className={cn(thClass, "static pl-4")}>Country</th>
                    <SortHeader className="static" label="Views" align="right" active={sort === "views"} dir={dir} onClick={() => toggle("views")} />
                    <SortHeader className="static" label="Watch Time" align="right" active={sort === "watchTimeHours"} dir={dir} onClick={() => toggle("watchTimeHours")} />
                    <SortHeader className="static pr-4" label="Subscribers" align="right" active={sort === "subscribers"} dir={dir} onClick={() => toggle("subscribers")} />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r: GeographyRow) => (
                    <tr key={r.code} onClick={() => onSelect?.(r.code)} className={cn("cursor-pointer", selected === r.code ? "bg-[#FFF8F8]" : "hover:bg-[#F8FAFC]")} aria-selected={selected === r.code}>
                      <td className={cn(tdClass, "pl-4 font-medium text-[#0F1B3D]")}>
                        <span className="mr-2 inline-block w-7 rounded bg-[#F1F4F8] text-center text-[10.5px] font-semibold text-[#475467]">{r.code}</span>
                        {r.country}
                      </td>
                      <td className={cn(tdClass, "text-right tabular-nums")}><b className="font-semibold text-[#0F1B3D]">{compact(r.views)}</b> <span className="text-[11.5px] text-[#98A2B3]">{total > 0 ? ((r.views / total) * 100).toFixed(1) : "0.0"}%</span></td>
                      <td className={cn(tdClass, "text-right tabular-nums")}>{hours(r.watchTimeHours)}</td>
                      <td className={cn(tdClass, "pr-4 text-right tabular-nums")}>{full(r.subscribers)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {!compactView && selected && <ViewLink href={withPeriod(`${ytRoutes.analytics}?country=${selected}`)}>Analyse views from {rows.find((r) => r.code === selected)?.country}</ViewLink>}
        </div>
      )}
    </Card>
  );
}

const DEVICE_ICON: Record<string, LucideIcon> = { "Mobile phone": Smartphone, Computer: Monitor, TV: Tv, Tablet: Tablet };

function DevicesCard({ className, detailed, audience, loading }: { className?: string; detailed?: boolean; audience: AudienceData; loading: boolean }) {
  return (
    <Card className={className}>
      <CardHeader title="Devices" description="Share of views by device type" />
      {loading ? (
        <CardSkeleton />
      ) : !audience.devices ? (
        <ThresholdNotice />
      ) : (
        <div className={cn("grid gap-3 px-4 pb-4", detailed ? "sm:grid-cols-2 xl:grid-cols-4" : "grid-cols-2")}>
          {audience.devices.map((d) => {
            const Icon = DEVICE_ICON[d.label] ?? Monitor;
            return (
              <div key={d.label} className="rounded-sm border border-[#EEF1F5] p-3">
                <div className="flex items-center justify-between">
                  <span className="grid size-8 place-items-center rounded-sm bg-[#F4F0FF] text-[#6D28D9]"><Icon className="size-4" /></span>
                  <span className="text-[18px] font-semibold tabular-nums text-[#0F1B3D]">{d.value.toFixed(1)}%</span>
                </div>
                <p className="mt-2 text-[12.5px] font-medium text-[#24324F]">{d.label}</p>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-sm bg-[#EEF1F5]"><span className="block h-full rounded-sm bg-[#7C3AED]" style={{ width: `${Math.min(100, d.value)}%` }} /></div>
                {detailed && d.watchTimeHours !== undefined && <p className="mt-1.5 text-[11.5px] text-[#6B7890]">{hours(d.watchTimeHours)} watch time</p>}
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

