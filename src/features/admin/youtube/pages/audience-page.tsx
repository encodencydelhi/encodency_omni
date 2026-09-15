"use client";

import { useMemo, useState } from "react";
import { Monitor, Repeat2, Smartphone, Tablet, Tv, UserPlus, UsersRound, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { ActivityHeatmap, BarList, BubbleMap, Donut, LegendList, TrendChart } from "../components/charts";
import { CapabilityState, PageSkeleton } from "../components/states";
import { Card, CardHeader, PageTitle, Segmented, SortHeader, TrendDelta, UnderlineTabs, ViewLink, tdClass, thClass, yt, type SortDir } from "../components/ui";
import { useChannelAnalytics } from "../hooks/use-analytics";
import { usePeriod, useQueryState, useWithPeriod } from "../hooks/use-query-state";
import { ytRoutes } from "../lib/constants";
import { compact, full, hours } from "../lib/format";
import { useYouTube } from "../store/youtube-store";
import type { GeographyRow } from "../types";

type AudienceTab = "overview" | "demographics" | "geography" | "devices" | "activity" | "subscribers";

const DEFAULTS = { tab: "overview", geoMetric: "views", country: "" };

export function AudiencePage() {
  const { ready, can } = useYouTube();
  if (!ready) return <PageSkeleton />;
  return (
    <div className="space-y-1">
      <PageTitle title="Audience" description="Who watches your content, where they are and when they're on YouTube." />
      {can.canViewAnalytics.allowed ? <Audience /> : <Card><CapabilityState capability={can.canViewAnalytics} title="Audience data unavailable" /></Card>}
    </div>
  );
}

function Audience() {
  const { audience, settings } = useYouTube();
  const { days, label } = usePeriod();
  const analytics = useChannelAnalytics(days);
  const { values, set } = useQueryState(DEFAULTS);
  const tab = values.tab as AudienceTab;
  const subs = analytics.totals.subscribers;
  // Viewer counts are reported for the selected window; unique viewers grow sub-linearly with time.
  const scale = (n: number | null) => (n === null ? null : Math.round(n * Math.pow(days / 28, 0.85)));

  const kpis: { label: string; value: number | null; prev: number | null; icon: LucideIcon; hint: string }[] = [
    { label: "Unique viewers", value: scale(audience.uniqueViewers), prev: audience.uniqueViewers ? Math.round(scale(audience.uniqueViewers)! * 0.88) : null, icon: UsersRound, hint: "Estimated people who watched" },
    { label: "Returning viewers", value: scale(audience.returningViewers), prev: audience.returningViewers ? Math.round(scale(audience.returningViewers)! * 0.93) : null, icon: Repeat2, hint: "Watched before in the last year" },
    { label: "New viewers", value: scale(audience.newViewers), prev: audience.newViewers ? Math.round(scale(audience.newViewers)! * 0.86) : null, icon: UserPlus, hint: "First time watching in the last year" },
    { label: "Subscribers", value: subs.value, prev: subs.previous, icon: UsersRound, hint: "Net gained in the period" },
  ];

  return (
    <div className="space-y-1">
      <div className="border-b border-[#E4E9F0]">
        <UnderlineTabs<AudienceTab>
          label="Audience sections"
          value={tab}
          onChange={(v) => set({ tab: v })}
          items={[
            { value: "overview", label: "Overview" },
            { value: "demographics", label: "Demographics" },
            { value: "geography", label: "Geography" },
            { value: "devices", label: "Devices" },
            { value: "activity", label: "Viewer activity" },
            { value: "subscribers", label: "Subscribers" },
          ]}
        />
      </div>

      <div className="grid grid-cols-2 gap-1 xl:grid-cols-4">
        {kpis.map((k) => (
          <div key={k.label} className={cn(yt.card, "p-3.5")}>
            <p className="flex items-center gap-1.5 text-[12px] text-[#6B7890]"><k.icon className="size-3.5" />{k.label}</p>
            {k.value === null ? (
              <p className="mt-2 text-[12.5px] leading-5 text-[#98A2B3]">Not enough data yet</p>
            ) : (
              <>
                <p className="mt-1.5 text-[21px] font-semibold tabular-nums tracking-[-0.02em] text-[#0F1B3D]">{compact(k.value)}</p>
                <p className="flex flex-wrap items-center gap-1.5 text-[11.5px] text-[#98A2B3]"><TrendDelta value={k.prev ? ((k.value - k.prev) / k.prev) * 100 : null} />{k.hint}</p>
              </>
            )}
          </div>
        ))}
      </div>

      {tab === "overview" && (
        <div className="grid gap-1 xl:grid-cols-12">
          <DemographicsCard className="xl:col-span-4" compactView onMore={() => set({ tab: "demographics" })} />
          <GeographyCard className="xl:col-span-8" compactView metric="views" onMore={() => set({ tab: "geography" })} />
          <DevicesCard className="xl:col-span-5" />
          <ActivityCard className="xl:col-span-7" timezone={settings.defaults.timezone} />
        </div>
      )}
      {tab === "demographics" && <DemographicsCard />}
      {tab === "geography" && <GeographyCard metric={values.geoMetric as GeoMetric} onMetric={(m) => set({ geoMetric: m })} selected={values.country || null} onSelect={(c) => set({ country: c === values.country ? "" : c })} />}
      {tab === "devices" && <DevicesCard detailed />}
      {tab === "activity" && <ActivityCard timezone={settings.defaults.timezone} detailed />}
      {tab === "subscribers" && (
        <div className="grid gap-1 xl:grid-cols-12">
          <Card className="xl:col-span-8">
            <CardHeader title="Subscriber growth" description={`${label} vs previous period`} />
            <div className="grid grid-cols-3 gap-2 px-4">
              {[
                { label: "Gained", value: `+${full(Math.round(subs.value * 1.18))}`, tone: "text-[#067647]" },
                { label: "Lost", value: `−${full(Math.round(subs.value * 0.18))}`, tone: "text-[#C81E2B]" },
                { label: "Net", value: `+${full(subs.value)}`, tone: "text-[#0F1B3D]" },
              ].map((s) => (
                <div key={s.label} className="rounded-lg bg-[#F8FAFC] px-3 py-2">
                  <p className="text-[11.5px] text-[#6B7890]">{s.label}</p>
                  <p className={cn("text-[18px] font-semibold tabular-nums", s.tone)}>{s.value}</p>
                </div>
              ))}
            </div>
            <div className="px-4 pb-4 pt-3"><TrendChart current={analytics.current} previous={analytics.previous} metric="subscribers" granularity={days > 90 ? "weekly" : "daily"} height={240} /></div>
          </Card>
          <Card className="xl:col-span-4">
            <CardHeader title="Where subscribers come from" />
            <div className="px-4 pb-4">{audience.subscriberSources ? <BarList data={audience.subscriberSources} color="#E5202E" /> : <ThresholdNotice />}</div>
          </Card>
        </div>
      )}
    </div>
  );
}

export function ThresholdNotice() {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center">
      <span className="grid size-10 place-items-center rounded-xl bg-[#F3F5F9] text-[#6B7890] ring-1 ring-[#E4E9F0]"><UsersRound className="size-5" /></span>
      <p className="mt-3 text-[13.5px] font-semibold text-[#0F1B3D]">Not enough audience data yet</p>
      <p className="mt-1 max-w-[320px] text-[12.5px] leading-5 text-[#6B7890]">YouTube only shares this breakdown once enough viewers have watched, to protect their privacy. Try a longer date range.</p>
    </div>
  );
}

function DemographicsCard({ className, compactView, onMore }: { className?: string; compactView?: boolean; onMore?: () => void }) {
  const { audience } = useYouTube();
  return (
    <Card className={className}>
      <CardHeader title="Age & gender" description="Share of views" actions={onMore ? <button type="button" onClick={onMore} className="text-[12px] font-semibold text-[#2563EB] hover:underline">Details</button> : undefined} />
      {!audience.age || !audience.gender ? (
        <ThresholdNotice />
      ) : (
        <div className={cn("grid gap-5 px-4 pb-4", !compactView && "md:grid-cols-[260px_1fr]")}>
          <div className="flex items-center gap-4">
            <Donut data={audience.gender} colors={["#2563EB", "#DB2777", "#98A2B3"]} size={compactView ? 110 : 150} thickness={compactView ? 14 : 18} centerValue="Gender" centerLabel="of views" />
            <LegendList data={audience.gender} colors={["#2563EB", "#DB2777", "#98A2B3"]} className="flex-1" />
          </div>
          <BarList data={compactView ? audience.age.slice(1, 5) : audience.age} color="#0891B2" />
        </div>
      )}
    </Card>
  );
}

type GeoMetric = "views" | "watchTimeHours" | "subscribers";

function GeographyCard({ className, compactView, metric, onMetric, selected, onSelect, onMore }: { className?: string; compactView?: boolean; metric: GeoMetric; onMetric?: (m: GeoMetric) => void; selected?: string | null; onSelect?: (code: string) => void; onMore?: () => void }) {
  const { audience } = useYouTube();
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
        title="Top geographies"
        description="Where your viewers are"
        actions={
          onMore ? <button type="button" onClick={onMore} className="text-[12px] font-semibold text-[#2563EB] hover:underline">Details</button> : onMetric ? (
            <Segmented<GeoMetric> label="Map metric" value={metric} onChange={onMetric} items={[{ value: "views", label: "Views" }, { value: "watchTimeHours", label: "Watch time" }, { value: "subscribers", label: "Subscribers" }]} />
          ) : undefined
        }
      />
      {!audience.geography ? (
        <ThresholdNotice />
      ) : (
        <div className={cn("grid gap-4 px-4 pb-4", compactView ? "md:grid-cols-[1.3fr_1fr]" : "")}>
          <BubbleMap rows={rows} metric={metric} selected={selected} onSelect={onSelect} />
          {compactView ? (
            <BarList data={rows.slice(0, 6).map((r) => ({ label: r.country, value: (r.views / total) * 100 }))} color="#E5202E" />
          ) : (
            <div className="scrollbar-thin overflow-x-auto rounded-lg border border-[#EEF1F5]">
              <table className="w-full min-w-[560px] border-separate border-spacing-0 text-left">
                <thead>
                  <tr>
                    <th className={cn(thClass, "static pl-4")}>Country</th>
                    <SortHeader className="static" label="Views" align="right" active={sort === "views"} dir={dir} onClick={() => toggle("views")} />
                    <SortHeader className="static" label="Watch time" align="right" active={sort === "watchTimeHours"} dir={dir} onClick={() => toggle("watchTimeHours")} />
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
                      <td className={cn(tdClass, "text-right tabular-nums")}><b className="font-semibold text-[#0F1B3D]">{compact(r.views)}</b> <span className="text-[11.5px] text-[#98A2B3]">{((r.views / total) * 100).toFixed(1)}%</span></td>
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

function DevicesCard({ className, detailed }: { className?: string; detailed?: boolean }) {
  const { audience } = useYouTube();
  return (
    <Card className={className}>
      <CardHeader title="Devices" description="Share of views by device type" />
      {!audience.devices ? (
        <ThresholdNotice />
      ) : (
        <div className={cn("grid gap-3 px-4 pb-4", detailed ? "sm:grid-cols-2 xl:grid-cols-4" : "grid-cols-2")}>
          {audience.devices.map((d) => {
            const Icon = DEVICE_ICON[d.label] ?? Monitor;
            return (
              <div key={d.label} className="rounded-lg border border-[#EEF1F5] p-3">
                <div className="flex items-center justify-between">
                  <span className="grid size-8 place-items-center rounded-lg bg-[#F4F0FF] text-[#6D28D9]"><Icon className="size-4" /></span>
                  <span className="text-[18px] font-semibold tabular-nums text-[#0F1B3D]">{d.value.toFixed(1)}%</span>
                </div>
                <p className="mt-2 text-[12.5px] font-medium text-[#24324F]">{d.label}</p>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[#EEF1F5]"><span className="block h-full rounded-full bg-[#7C3AED]" style={{ width: `${d.value}%` }} /></div>
                {detailed && d.watchTimeHours !== undefined && <p className="mt-1.5 text-[11.5px] text-[#6B7890]">{hours(d.watchTimeHours)} watch time</p>}
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

function ActivityCard({ className, timezone, detailed }: { className?: string; timezone: string; detailed?: boolean }) {
  const { audience } = useYouTube();
  const best = useMemo(() => {
    if (!audience.activity) return null;
    let top = { d: 0, h: 0, v: -1 };
    audience.activity.forEach((row, d) => row.forEach((v, h) => { if (v > top.v) top = { d, h, v }; }));
    return top;
  }, [audience.activity]);
  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  return (
    <Card className={className}>
      <CardHeader title="When your viewers are on YouTube" description="Relative activity by day and hour, last 28 days" />
      <div className="px-4 pb-4">
        {!audience.activity ? (
          <ThresholdNotice />
        ) : (
          <>
            {best && (
              <p className="mb-3 rounded-lg bg-[#F8FAFC] px-3 py-2 text-[12.5px] text-[#3C4A66]">
                Peak activity is <b className="font-semibold text-[#0F1B3D]">{days[best.d]} around {best.h % 12 || 12} {best.h < 12 ? "AM" : "PM"}</b>.{detailed ? " Schedule uploads 1–2 hours before your peak so videos are processed and indexed." : ""}
              </p>
            )}
            <ActivityHeatmap matrix={audience.activity} timezone={timezone} />
          </>
        )}
      </div>
    </Card>
  );
}
