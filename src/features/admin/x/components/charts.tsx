"use client";

/**
 * Chart primitives for the X workspace. Same visual language as the other
 * OmniPlatform channel modules: thin grid lines, no chart junk, one accent per
 * series, and a tooltip that always states the comparison.
 */

import { useMemo, useState, type ComponentType } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { format, parseISO, startOfMonth, startOfWeek } from "date-fns";
import { cn } from "@/lib/utils/cn";
import { METRICS } from "../lib/constants";
import { changePct, compact, formatMetric } from "../lib/format";
import type { BreakdownRow, GeographyRow, MetricKey, SeriesPoint } from "../x-data/types";
import { InfoTip, Skeleton, TrendDelta, x } from "./ui";

/** Categorical palette — distinguishable in order, and at small sizes. */
export const PALETTE = ["#2563EB", "#7C3AED", "#0891B2", "#D97706", "#0E9F6E", "#DB2777", "#64748B"];

const axisTick = { fontSize: 11, fill: "#8792A8" };

/* ------------------------------------------------------------------ */
/* Aggregation                                                         */
/* ------------------------------------------------------------------ */

export type Granularity = "daily" | "weekly" | "monthly";

/** Buckets daily points. Rate metrics average; volume metrics sum. */
export function aggregate(series: SeriesPoint[], granularity: Granularity): SeriesPoint[] {
  if (granularity === "daily") return series;
  const buckets = new Map<string, SeriesPoint[]>();
  for (const point of series) {
    const date = parseISO(point.date);
    const key = (granularity === "weekly" ? startOfWeek(date, { weekStartsOn: 1 }) : startOfMonth(date)).toISOString();
    buckets.set(key, [...(buckets.get(key) ?? []), point]);
  }
  return [...buckets.entries()].map(([date, points]) => {
    const sum = (key: keyof SeriesPoint) => points.reduce((total, point) => total + (point[key] as number), 0);
    return {
      date,
      impressions: sum("impressions"),
      engagements: sum("engagements"),
      engagementRate: Number((sum("engagementRate") / points.length).toFixed(2)),
      likes: sum("likes"),
      replies: sum("replies"),
      reposts: sum("reposts"),
      linkClicks: sum("linkClicks"),
      profileVisits: sum("profileVisits"),
      followerGrowth: sum("followerGrowth"),
      videoViews: sum("videoViews"),
    };
  });
}

/** Daily points get noisy past a month, so the chart re-buckets itself. */
export function granularityFor(days: number): Granularity {
  return days > 120 ? "monthly" : days > 45 ? "weekly" : "daily";
}

/* ------------------------------------------------------------------ */
/* Sparkline & KPI                                                     */
/* ------------------------------------------------------------------ */

export function Sparkline({ data, color, height = 30 }: { data: number[]; color: string; height?: number }) {
  const points = useMemo(() => data.map((value, index) => ({ index, value })), [data]);
  const gradientId = `x-spark-${color.replace("#", "")}`;
  if (!data.length) return <span style={{ height }} className="block" />;
  return (
    <div style={{ height }} className="w-full" aria-hidden="true">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={points} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.18} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <YAxis hide domain={["dataMin", "dataMax"]} />
          <Area type="monotone" dataKey="value" stroke={color} strokeWidth={1.5} fill={`url(#${gradientId})`} isAnimationActive={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function KpiCard({
  metric,
  value,
  previous,
  spark,
  icon: Icon,
  onClick,
  active,
  unavailable,
  comparisonLabel = "previous period",
}: {
  metric: MetricKey;
  value: number | null;
  previous: number | null;
  spark?: number[];
  icon?: ComponentType<{ className?: string }>;
  onClick?: () => void;
  active?: boolean;
  unavailable?: string;
  comparisonLabel?: string;
}) {
  const meta = METRICS[metric];
  const delta = changePct(value, previous);
  return (
    <div
      className={cn(
        x.card,
        "relative flex min-w-0 flex-col p-3.5 text-left transition has-[button:focus-visible]:ring-[3px] has-[button:focus-visible]:ring-[#2563EB]/25",
        onClick && "hover:border-[#C9D1DC]",
        active && "border-[#2563EB]/40 ring-[3px] ring-[#2563EB]/8",
      )}
    >
      {onClick && (
        // Full-card hit area — a chart cannot live inside a <button>.
        <button
          type="button"
          onClick={onClick}
          aria-pressed={active}
          aria-label={`Show ${meta.label} on the trend chart`}
          className="absolute inset-0 z-[1] rounded-[10px] focus-visible:outline-none"
        />
      )}
      <span className="flex items-center justify-between gap-2">
        <span className="flex min-w-0 items-center gap-1.5 text-[12px] font-medium text-[#6B7890]">
          {Icon && <Icon className="size-3.5 shrink-0" />}
          <span className="truncate">{meta.label}</span>
        </span>
        <span className="relative z-[2] flex shrink-0 items-center gap-1.5">
          {active && <span className="size-2 rounded-sm" style={{ background: meta.color }} />}
          <InfoTip text={meta.help} label={`What ${meta.label} means`} />
        </span>
      </span>
      {unavailable ? (
        <span className="mt-2 block text-[12px] leading-5 text-[#98A2B3]">{unavailable}</span>
      ) : (
        <>
          <span className="mt-1.5 block text-[21px] font-semibold leading-7 tracking-[-0.02em] text-[#0F1B3D] tabular-nums">
            {formatMetric(metric, value)}
          </span>
          <span className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-[11.5px] text-[#98A2B3]">
            <TrendDelta value={delta} />
            <span className="truncate">
              vs {formatMetric(metric, previous)} {comparisonLabel}
            </span>
          </span>
          {spark && spark.length > 0 && (
            <span className="mt-2 block overflow-hidden">
              <Sparkline data={spark} color={meta.color} />
            </span>
          )}
        </>
      )}
    </div>
  );
}

export function KpiSkeleton({ count = 6 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className={cn(x.card, "p-3.5")}>
          <Skeleton className="h-3 w-20" />
          <Skeleton className="mt-3 h-6 w-24" />
          <Skeleton className="mt-2 h-3 w-28" />
          <Skeleton className="mt-3 h-8 w-full" />
        </div>
      ))}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Trend                                                               */
/* ------------------------------------------------------------------ */

export function TrendChart({
  current,
  previous,
  metric,
  granularity,
  height = 260,
  compare = true,
}: {
  current: SeriesPoint[];
  previous?: SeriesPoint[];
  metric: MetricKey;
  granularity: Granularity;
  height?: number;
  compare?: boolean;
}) {
  const meta = METRICS[metric];
  const data = useMemo(() => {
    const currentPoints = aggregate(current, granularity);
    const previousPoints = previous ? aggregate(previous, granularity) : [];
    return currentPoints.map((point, index) => ({
      date: point.date,
      value: point[metric],
      previous: previousPoints[index]?.[metric] ?? null,
      previousDate: previousPoints[index]?.date ?? null,
    }));
  }, [current, previous, granularity, metric]);

  const pattern = granularity === "monthly" ? "MMM yyyy" : "MMM d";
  const gradientId = `x-trend-${metric}`;

  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={meta.color} stopOpacity={0.16} />
              <stop offset="100%" stopColor={meta.color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#EEF1F5" vertical={false} />
          <XAxis dataKey="date" tickFormatter={(value: string) => format(parseISO(value), pattern)} tick={axisTick} axisLine={false} tickLine={false} minTickGap={28} />
          <YAxis
            tick={axisTick}
            axisLine={false}
            tickLine={false}
            width={48}
            tickFormatter={(value: number) => (metric === "engagementRate" ? `${value}%` : compact(value))}
          />
          <Tooltip
            cursor={{ stroke: "#C9D1DC", strokeDasharray: "3 3" }}
            content={({ active, payload }) => {
              const row = payload?.[0]?.payload as (typeof data)[number] | undefined;
              if (!active || !row) return null;
              const delta = changePct(row.value, row.previous);
              return (
                <div className="min-w-[190px] rounded-sm border border-[#E4E9F0] bg-white px-3 py-2 text-[12px] shadow-[0_12px_32px_-8px_rgba(15,27,61,0.2)]">
                  <p className="font-semibold text-[#0F1B3D]">
                    {format(parseISO(row.date), granularity === "daily" ? "EEE, MMM d, yyyy" : granularity === "weekly" ? "'Week of' MMM d" : "MMMM yyyy")}
                  </p>
                  <p className="mt-1.5 flex items-center justify-between gap-4">
                    <span className="flex items-center gap-1.5 text-[#6B7890]">
                      <i className="size-2 rounded-sm" style={{ background: meta.color }} />
                      {meta.label}
                    </span>
                    <b className="tabular-nums text-[#0F1B3D]">{formatMetric(metric, row.value)}</b>
                  </p>
                  {compare && row.previous !== null && (
                    <>
                      <p className="mt-1 flex items-center justify-between gap-4">
                        <span className="flex items-center gap-1.5 text-[#6B7890]">
                          <i className="h-0 w-3 border-t-2 border-dashed border-[#C9D1DC]" />
                          Previous{row.previousDate ? ` (${format(parseISO(row.previousDate), "MMM d")})` : ""}
                        </span>
                        <span className="tabular-nums text-[#3C4A66]">{formatMetric(metric, row.previous)}</span>
                      </p>
                      <p className="mt-1 text-right">
                        <TrendDelta value={delta} />
                      </p>
                    </>
                  )}
                </div>
              );
            }}
          />
          {compare && previous && (
            <Area type="monotone" dataKey="previous" stroke="#C9D1DC" strokeDasharray="4 4" strokeWidth={1.5} fill="none" isAnimationActive={false} dot={false} />
          )}
          <Area
            type="monotone"
            dataKey="value"
            stroke={meta.color}
            strokeWidth={2}
            fill={`url(#${gradientId})`}
            isAnimationActive={false}
            dot={false}
            activeDot={{ r: 4, strokeWidth: 2, stroke: "#fff" }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ChartLegend({ items }: { items: { label: string; color: string; dashed?: boolean }[] }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11.5px] text-[#6B7890]">
      {items.map((item) => (
        <span key={item.label} className="flex items-center gap-1.5">
          {item.dashed ? (
            <i className="h-0 w-3.5 border-t-2 border-dashed" style={{ borderColor: item.color }} />
          ) : (
            <i className="h-0.5 w-3.5 rounded" style={{ background: item.color }} />
          )}
          {item.label}
        </span>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Follower growth (gained vs lost)                                    */
/* ------------------------------------------------------------------ */

export function FollowerGrowthChart({
  data,
  height = 240,
}: {
  data: { date: string; gained: number; lost: number }[];
  height?: number;
}) {
  const rows = useMemo(() => data.map((row) => ({ ...row, lost: -Math.abs(row.lost), net: row.gained - Math.abs(row.lost) })), [data]);
  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} stackOffset="sign" margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid stroke="#EEF1F5" vertical={false} />
          <XAxis dataKey="date" tickFormatter={(value: string) => format(parseISO(value), "MMM d")} tick={axisTick} axisLine={false} tickLine={false} minTickGap={32} />
          <YAxis tick={axisTick} axisLine={false} tickLine={false} width={44} tickFormatter={(value: number) => compact(value)} />
          <Tooltip
            cursor={{ fill: "#F3F5F9" }}
            content={({ active, payload }) => {
              const row = payload?.[0]?.payload as (typeof rows)[number] | undefined;
              if (!active || !row) return null;
              return (
                <div className="rounded-sm border border-[#E4E9F0] bg-white px-3 py-2 text-[12px] shadow-[0_12px_32px_-8px_rgba(15,27,61,0.2)]">
                  <p className="font-semibold text-[#0F1B3D]">{format(parseISO(row.date), "EEE, MMM d")}</p>
                  <p className="mt-1.5 flex items-center justify-between gap-5 text-[#067647]">
                    New followers <b className="tabular-nums">+{row.gained}</b>
                  </p>
                  <p className="flex items-center justify-between gap-5 text-[#C81E2B]">
                    Unfollows <b className="tabular-nums">{row.lost}</b>
                  </p>
                  <p className="mt-1 flex items-center justify-between gap-5 border-t border-[#EEF1F5] pt-1 text-[#0F1B3D]">
                    Net <b className="tabular-nums">{row.net > 0 ? "+" : ""}{row.net}</b>
                  </p>
                </div>
              );
            }}
          />
          <Bar dataKey="gained" stackId="growth" fill="#12B76A" radius={[3, 3, 0, 0]} isAnimationActive={false} />
          <Bar dataKey="lost" stackId="growth" fill="#F0A9AE" radius={[0, 0, 3, 3]} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Donut & bars                                                        */
/* ------------------------------------------------------------------ */

export function Donut({
  data,
  size = 132,
  thickness = 16,
  centerValue,
  centerLabel,
  colors = PALETTE,
}: {
  data: BreakdownRow[];
  size?: number;
  thickness?: number;
  centerValue?: string;
  centerLabel?: string;
  colors?: string[];
}) {
  const [hover, setHover] = useState<number | null>(null);
  const focus = hover !== null ? data[hover] : undefined;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="label"
            innerRadius={size / 2 - thickness}
            outerRadius={size / 2}
            paddingAngle={1.5}
            strokeWidth={0}
            isAnimationActive={false}
            onMouseEnter={(_, index) => setHover(index)}
            onMouseLeave={() => setHover(null)}
          >
            {data.map((row, index) => (
              <Cell key={row.label} fill={colors[index % colors.length]} opacity={hover === null || hover === index ? 1 : 0.35} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
        <span className="px-3">
          <b className="block text-[16px] font-semibold leading-5 text-[#0F1B3D] tabular-nums">{focus ? `${focus.value.toFixed(1)}%` : centerValue}</b>
          <small className="block max-w-[92px] truncate text-[11px] text-[#6B7890]">{focus ? focus.label : centerLabel}</small>
        </span>
      </div>
    </div>
  );
}

export function LegendList({
  data,
  colors = PALETTE,
  unit = "%",
  className,
}: {
  data: BreakdownRow[];
  colors?: string[];
  unit?: string;
  className?: string;
}) {
  return (
    <ul className={cn("min-w-0 space-y-1.5", className)}>
      {data.map((row, index) => (
        <li key={row.label} className="flex items-center gap-2 text-[12.5px]">
          <i className="size-2 shrink-0 rounded-sm" style={{ background: colors[index % colors.length] }} />
          <span className="min-w-0 flex-1 truncate text-[#3C4A66]">{row.label}</span>
          <b className="shrink-0 font-semibold tabular-nums text-[#0F1B3D]">{unit === "%" ? `${row.value.toFixed(1)}%` : compact(row.value)}</b>
        </li>
      ))}
    </ul>
  );
}

export function BarList({
  data,
  color = "#2563EB",
  format: formatValue = (value: number) => `${value.toFixed(2)}%`,
  max,
  emptyLabel = "Not enough data yet",
}: {
  data: BreakdownRow[];
  color?: string;
  format?: (value: number) => string;
  max?: number;
  emptyLabel?: string;
}) {
  if (!data.length) return <p className="py-4 text-center text-[12.5px] text-[#98A2B3]">{emptyLabel}</p>;
  const top = max ?? Math.max(...data.map((row) => row.value), 0.01);
  return (
    <ul className="space-y-2">
      {data.map((row) => (
        <li key={row.label} className="grid grid-cols-[minmax(64px,110px)_1fr_auto] items-center gap-2.5 text-[12.5px]">
          <span className="truncate text-[#3C4A66]" title={row.label}>
            {row.label}
          </span>
          <span className="h-2 overflow-hidden rounded-sm bg-[#EEF1F5]">
            <span className="block h-full rounded-sm transition-[width] duration-500" style={{ width: `${Math.max(2, (row.value / top) * 100)}%`, background: color }} />
          </span>
          <b className="min-w-[46px] text-right font-semibold tabular-nums text-[#0F1B3D]">{formatValue(row.value)}</b>
        </li>
      ))}
    </ul>
  );
}

export function ColumnChart({
  data,
  height = 170,
  color = "#2563EB",
  valueLabel,
  formatValue = (value: number) => value.toLocaleString("en-IN"),
}: {
  data: { label: string; value: number }[];
  height?: number;
  color?: string;
  valueLabel: string;
  formatValue?: (value: number) => string;
}) {
  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
          <CartesianGrid stroke="#EEF1F5" vertical={false} />
          <XAxis dataKey="label" tick={axisTick} axisLine={false} tickLine={false} minTickGap={8} />
          <YAxis tick={axisTick} axisLine={false} tickLine={false} width={40} tickFormatter={(value: number) => compact(value)} />
          <Tooltip
            cursor={{ fill: "#F3F5F9" }}
            content={({ active, payload }) => {
              const row = payload?.[0]?.payload as { label: string; value: number } | undefined;
              if (!active || !row) return null;
              return (
                <div className="rounded-sm border border-[#E4E9F0] bg-white px-2.5 py-1.5 text-[12px] shadow-md">
                  <p className="text-[#6B7890]">{row.label}</p>
                  <b className="text-[#0F1B3D]">
                    {formatValue(row.value)} {valueLabel}
                  </b>
                </div>
              );
            }}
          />
          <Bar dataKey="value" fill={color} radius={[3, 3, 0, 0]} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Activity heatmap                                                    */
/* ------------------------------------------------------------------ */

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function ActivityHeatmap({ matrix, timezone }: { matrix: number[][]; timezone: string }) {
  const max = Math.max(...matrix.flat(), 1);
  return (
    <div>
      <div className="scrollbar-thin overflow-x-auto">
        <div className="min-w-[540px]">
          <div className="grid grid-cols-[34px_repeat(24,1fr)] gap-[3px]">
            <span />
            {Array.from({ length: 24 }, (_, hour) => (
              <span key={hour} className="text-center text-[10px] text-[#98A2B3]">
                {hour % 3 === 0 ? (hour === 0 ? "12a" : hour < 12 ? `${hour}a` : hour === 12 ? "12p" : `${hour - 12}p`) : ""}
              </span>
            ))}
            {matrix.map((row, dayIndex) => (
              <HeatmapRow key={DAYS[dayIndex]} day={DAYS[dayIndex] ?? ""} row={row} max={max} />
            ))}
          </div>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[11.5px] text-[#6B7890]">
        <span>Times shown in {timezone}</span>
        <span className="flex items-center gap-1.5">
          Quieter
          {[0.12, 0.32, 0.54, 0.76, 1].map((opacity) => (
            <i key={opacity} className="size-3 rounded-[3px]" style={{ background: `rgba(37,99,235,${opacity})` }} />
          ))}
          Busier
        </span>
      </div>
    </div>
  );
}

function HeatmapRow({ day, row, max }: { day: string; row: number[]; max: number }) {
  return (
    <>
      <span className="self-center text-[11px] font-medium text-[#6B7890]">{day}</span>
      {row.map((value, hour) => (
        <span
          key={hour}
          title={`${day} ${String(hour).padStart(2, "0")}:00 — ${Math.round((value / max) * 100)}% of peak activity`}
          className="aspect-square min-h-3 rounded-[3px]"
          style={{ background: `rgba(37,99,235,${Math.max(0.06, value / max)})` }}
        />
      ))}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Bubble map                                                          */
/* ------------------------------------------------------------------ */

// Coarse land mask (latitude band → longitude ranges, 5° grid). Enough for a
// recognisable dotted world without shipping geometry.
const LAND: [number, [number, number][]][] = [
  [75, [[-120, -70], [-60, -20], [15, 25], [60, 140]]],
  [70, [[-165, -140], [-135, -65], [-55, -20], [15, 30], [35, 180]]],
  [65, [[-165, -140], [-140, -60], [-50, -35], [-22, -14], [10, 30], [30, 180]]],
  [60, [[-160, -140], [-135, -65], [-48, -42], [5, 30], [30, 165]]],
  [55, [[-130, -60], [-8, 0], [8, 140], [155, 162]]],
  [50, [[-125, -55], [-5, 2], [0, 140]]],
  [45, [[-125, -65], [-2, 145]]],
  [40, [[-125, -72], [-9, 30], [26, 125], [138, 142]]],
  [35, [[-120, -77], [-8, 120], [130, 140]]],
  [30, [[-115, -81], [-10, 122]]],
  [25, [[-110, -97], [-15, 35], [36, 57], [68, 92], [98, 120]]],
  [20, [[-105, -87], [-17, 40], [42, 58], [72, 87], [93, 110]]],
  [15, [[-92, -83], [-17, 42], [43, 52], [74, 80], [97, 108], [120, 124]]],
  [10, [[-85, -76], [-73, -62], [-15, 45], [76, 79], [98, 106], [122, 126]]],
  [5, [[-78, -52], [-10, 42], [100, 104], [110, 118]]],
  [0, [[-80, -50], [9, 42], [98, 106], [110, 118], [120, 124]]],
  [-5, [[-80, -35], [12, 40], [105, 120], [135, 150]]],
  [-10, [[-78, -36], [13, 40], [130, 142]]],
  [-15, [[-75, -39], [13, 40], [44, 50], [125, 145]]],
  [-20, [[-70, -40], [13, 35], [44, 48], [114, 150]]],
  [-25, [[-70, -48], [15, 33], [114, 153]]],
  [-30, [[-72, -50], [17, 31], [115, 153]]],
  [-35, [[-72, -57], [18, 26], [136, 150]]],
  [-40, [[-73, -62], [145, 148], [172, 176]]],
  [-45, [[-75, -65], [167, 172]]],
  [-50, [[-75, -68]]],
];

const LAND_DOTS = LAND.flatMap(([lat, ranges]) =>
  Array.from({ length: 72 }, (_, index) => -177.5 + index * 5)
    .filter((lon) => ranges.some(([from, to]) => lon >= from && lon <= to))
    .map((lon) => [lat, lon] as const),
);

export function BubbleMap({
  rows,
  metric,
  selected,
  onSelect,
}: {
  rows: GeographyRow[];
  metric: "followers" | "engagements";
  selected?: string | null;
  onSelect?: (code: string) => void;
}) {
  const WIDTH = 720;
  const HEIGHT = 340;
  const max = Math.max(...rows.map((row) => row[metric]), 1);
  const project = (lat: number, lon: number) => [((lon + 180) / 360) * WIDTH, ((75 - lat) / 135) * HEIGHT] as const;

  return (
    <div className="relative w-full overflow-hidden rounded-sm bg-[linear-gradient(180deg,#F8FAFC,#F2F5F9)] ring-1 ring-inset ring-[#EEF1F5]">
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="block h-auto w-full" role="img" aria-label={`Followers by country`}>
        {LAND_DOTS.map(([lat, lon]) => {
          const [cx, cy] = project(lat, lon);
          return <circle key={`${lat}:${lon}`} cx={cx} cy={cy} r={3.1} fill="#D5DCE6" />;
        })}
        {rows.map((row) => {
          const [cx, cy] = project(row.lat, row.lon);
          // Area-proportional, so a bubble twice as wide is four times the value.
          const radius = 5 + Math.sqrt(row[metric] / max) * 34;
          const active = selected === row.code;
          return (
            <g key={row.code} onClick={() => onSelect?.(row.code)} className={onSelect ? "cursor-pointer" : undefined}>
              <title>{`${row.country}: ${compact(row[metric])}`}</title>
              <circle
                cx={cx}
                cy={cy}
                r={radius}
                fill="#2563EB"
                fillOpacity={active ? 0.42 : 0.18}
                stroke="#2563EB"
                strokeOpacity={active ? 1 : 0.55}
                strokeWidth={active ? 2 : 1}
              />
              <circle cx={cx} cy={cy} r={2.5} fill="#2563EB" />
              {radius > 14 && (
                <text x={cx} y={cy - radius - 4} textAnchor="middle" className="fill-[#3C4A66] text-[11px] font-semibold">
                  {row.code}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Score ring                                                          */
/* ------------------------------------------------------------------ */

const RING_COLOR = { green: "#12B76A", amber: "#F79009", red: "#E11D48" } as const;

export function ScoreRing({
  score,
  tone,
  size = 104,
  label,
}: {
  score: number;
  tone: keyof typeof RING_COLOR;
  size?: number;
  label?: string;
}) {
  const stroke = 9;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" role="img" aria-label={`${label ?? "Score"}: ${score} out of 100`}>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#EEF1F5" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={RING_COLOR[tone]}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - score / 100)}
          className="transition-[stroke-dashoffset] duration-700"
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <span>
          <b className="block text-[22px] font-semibold leading-6 text-[#0F1B3D] tabular-nums">{score}</b>
          <small className="block text-[10.5px] text-[#6B7890]">out of 100</small>
        </span>
      </div>
    </div>
  );
}
