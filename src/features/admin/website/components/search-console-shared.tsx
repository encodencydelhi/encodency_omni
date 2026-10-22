"use client";

import { useState } from "react";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ApiError } from "@/types/api";
import { useSearchQueryDetail } from "../data/hooks";
import { formatRelative } from "../data/selectors";
import type { SearchPeriod } from "../data/types";
import { AXIS_PROPS, GRID_PROPS, SERIES_COLORS, makeTooltip } from "./ui/charts";
import { KeyValue, SegmentedControl } from "./ui/kit";
import { SkeletonBlock } from "./ui/states";
import { DetailMetric, PathLabel, formatNumber, formatPct, formatPosition, getMovement } from "./pages/search-performance-ui";

export const PERIOD_OPTIONS: { value: SearchPeriod; label: string }[] = [
  { value: "7d", label: "7 days" },
  { value: "28d", label: "28 days" },
  { value: "3m", label: "3 months" },
  { value: "6m", label: "6 months" },
  { value: "12m", label: "12 months" },
  { value: "16m", label: "16 months" },
];

const PERIOD_KEY = "website.search.period";

export function periodLabel(period: SearchPeriod) {
  return PERIOD_OPTIONS.find((p) => p.value === period)?.label ?? "28 days";
}

/** The chosen period is remembered per browser so Search performance, Keyword Research and Rank Tracking agree. */
export function useSearchPeriod(): [SearchPeriod, (period: SearchPeriod) => void] {
  const [period, setPeriod] = useState<SearchPeriod>(() => {
    try {
      const saved = window.localStorage.getItem(PERIOD_KEY);
      return PERIOD_OPTIONS.some((p) => p.value === saved) ? (saved as SearchPeriod) : "28d";
    } catch {
      return "28d";
    }
  });
  const update = (next: SearchPeriod) => {
    setPeriod(next);
    try {
      window.localStorage.setItem(PERIOD_KEY, next);
    } catch {
      /* private mode: the choice lasts for this page only */
    }
  };
  return [period, update];
}

export function PeriodPicker({ value, onChange }: { value: SearchPeriod; onChange: (period: SearchPeriod) => void }) {
  return <SegmentedControl size="sm" ariaLabel="Search Console period" value={value} options={PERIOD_OPTIONS} onChange={onChange} />;
}

/** "21 Sept – 20 Oct 2026 · updated 5 min ago" */
export function rangeText(range?: { start: string; end: string }, fetchedAt?: string) {
  const fmt = (d: string, year: boolean) => new Date(`${d}T00:00:00Z`).toLocaleDateString("en-IN", { day: "numeric", month: "short", ...(year ? { year: "numeric" } : {}), timeZone: "UTC" });
  const parts = [range ? `${fmt(range.start, false)} – ${fmt(range.end, true)}` : null, fetchedAt ? `updated ${formatRelative(fetchedAt)}` : null];
  return parts.filter(Boolean).join(" · ");
}

const dayLabel = (iso: string) => new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "UTC" });

/** Drawer body for one keyword: daily position and clicks, and the pages that rank for it. */
export function QueryInsight({ clientId, query, period }: { clientId: string; query: string; period: SearchPeriod }) {
  const detail = useSearchQueryDetail(clientId, query, period);
  if (detail.isLoading) return <SkeletonBlock lines={6} />;
  if (detail.error) {
    return (
      <p className="rounded-lg border border-dashed border-[#DAE1EC] p-3 text-[12px] text-[#6B7A94]">
        {ApiError.isApiError(detail.error) ? detail.error.message : "Keyword history could not be loaded from Search Console."}
      </p>
    );
  }
  const d = detail.data;
  if (!d || !d.totals) {
    return <p className="rounded-lg border border-dashed border-[#DAE1EC] p-3 text-[12px] text-[#6B7A94]">Search Console has no data for this exact keyword in the last {periodLabel(period)}.</p>;
  }
  const movement = getMovement(d.totals.position, d.previous?.position);
  const daily = d.daily.map((day) => ({ ...day, label: dayLabel(day.date) }));
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <DetailMetric label="Avg position" value={formatPosition(d.totals.position)} />
        <DetailMetric label="Before this period" value={d.previous ? formatPosition(d.previous.position) : "No data"} tone={movement ? movement.tone : "muted"} />
        <DetailMetric label="Clicks" value={formatNumber(d.totals.clicks)} tone="good" />
        <DetailMetric label="Impressions" value={formatNumber(d.totals.impressions)} />
      </div>

      <div className="rounded-lg border border-[#E6EBF4] p-3">
        <p className="text-[11px] font-semibold text-[#6B7A94]">Position by day <span className="font-normal">(higher on the chart = better)</span></p>
        <div className="mt-2 h-[150px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={daily} margin={{ top: 6, right: 8, bottom: 0, left: -18 }}>
              <CartesianGrid {...GRID_PROPS} />
              <XAxis dataKey="label" {...AXIS_PROPS} minTickGap={24} />
              <YAxis {...AXIS_PROPS} reversed allowDecimals={false} domain={[1, "dataMax"]} />
              <Tooltip content={makeTooltip((e) => formatPosition(e.value), (label) => label)} />
              <Line type="monotone" dataKey="position" name="Position" stroke={SERIES_COLORS[0]} strokeWidth={2} dot={daily.length < 40 ? { r: 2.5 } : false} connectNulls />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-lg border border-[#E6EBF4] p-3">
        <p className="text-[11px] font-semibold text-[#6B7A94]">Clicks by day</p>
        <div className="mt-2 h-[120px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={daily} margin={{ top: 6, right: 8, bottom: 0, left: -18 }}>
              <CartesianGrid {...GRID_PROPS} />
              <XAxis dataKey="label" {...AXIS_PROPS} minTickGap={24} />
              <YAxis {...AXIS_PROPS} allowDecimals={false} />
              <Tooltip content={makeTooltip((e) => formatNumber(e.value), (label) => label)} cursor={{ fill: "#F1F4F9" }} />
              <Bar dataKey="clicks" name="Clicks" fill={SERIES_COLORS[0]} radius={[4, 4, 0, 0]} maxBarSize={18} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div>
        <p className="mb-2 text-[11px] font-semibold text-[#6B7A94]">Pages Google shows for this keyword</p>
        {d.pages.length ? (
          <dl className="divide-y divide-[#F2F5FA] rounded-lg border border-[#E6EBF4] px-3">
            {d.pages.map((page) => (
              <KeyValue key={page.page} label={`${formatNumber(page.clicks)} clicks · ${formatNumber(page.impressions)} impr. · pos ${formatPosition(page.position)}`}>
                <PathLabel url={page.page} />
              </KeyValue>
            ))}
          </dl>
        ) : (
          <p className="rounded-lg border border-dashed border-[#DAE1EC] p-3 text-[12px] text-[#6B7A94]">No page data for this keyword.</p>
        )}
      </div>

      {d.devices.length || d.countries.length ? (
        <div className="grid grid-cols-2 gap-2 text-[11px]">
          <div className="rounded-lg border border-[#E6EBF4] p-2.5">
            <p className="mb-1 font-semibold text-[#6B7A94]">Devices</p>
            {d.devices.map((x) => <p key={x.device} className="flex justify-between text-[#28354C]"><span className="capitalize">{x.device.toLowerCase()}</span><span>{formatNumber(x.impressions)} impr.</span></p>)}
          </div>
          <div className="rounded-lg border border-[#E6EBF4] p-2.5">
            <p className="mb-1 font-semibold text-[#6B7A94]">Countries</p>
            {d.countries.slice(0, 5).map((x) => <p key={x.country} className="flex justify-between text-[#28354C]"><span>{x.countryName}</span><span>{formatNumber(x.impressions)} impr.</span></p>)}
          </div>
        </div>
      ) : null}
      <p className="text-[10.5px] text-[#94A3B8]">CTR {formatPct(d.totals.ctr)} · Google Search Console, {rangeText(d.range)}</p>
    </div>
  );
}
