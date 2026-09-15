"use client";

import { useMemo, useState, type ComponentType } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
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
import type { BreakdownRow, GeographyRow, MetricKey, SeriesPoint } from "../types";
import { InfoTip, Skeleton, TrendDelta, yt } from "./ui";

export const PALETTE = ["#2563EB", "#7C3AED", "#E5202E", "#0891B2", "#D97706", "#0E9F6E", "#98A2B3"];

const axisTick = { fontSize: 11, fill: "#8792A8" };

/* ------------------------------------------------------------------ */
/* Aggregation                                                         */
/* ------------------------------------------------------------------ */

export type Granularity = "daily" | "weekly" | "monthly";

/** Buckets daily points; averages rate metrics, sums volume metrics. */
export function aggregate(series: SeriesPoint[], granularity: Granularity): SeriesPoint[] {
  if (granularity === "daily") return series;
  const buckets = new Map<string, SeriesPoint[]>();
  for (const p of series) {
    const d = parseISO(p.date);
    const key = (granularity === "weekly" ? startOfWeek(d, { weekStartsOn: 1 }) : startOfMonth(d)).toISOString();
    buckets.set(key, [...(buckets.get(key) ?? []), p]);
  }
  return [...buckets.entries()].map(([date, points]) => {
    const sum = (k: keyof SeriesPoint) => points.reduce((s, p) => s + (p[k] as number), 0);
    return {
      date,
      views: sum("views"),
      watchTime: sum("watchTime"),
      subscribers: sum("subscribers"),
      impressions: sum("impressions"),
      avgViewDuration: Math.round(sum("avgViewDuration") / points.length),
      ctr: Number((sum("ctr") / points.length).toFixed(2)),
    };
  });
}

export function summarize(series: SeriesPoint[], key: MetricKey): number {
  if (!series.length) return 0;
  const total = series.reduce((s, p) => s + p[key], 0);
  return key === "ctr" || key === "avgViewDuration" ? total / series.length : total;
}

/* ------------------------------------------------------------------ */
/* Sparkline & KPI                                                     */
/* ------------------------------------------------------------------ */

export function Sparkline({ data, color, height = 32 }: { data: number[]; color: string; height?: number }) {
  const points = useMemo(() => data.map((v, i) => ({ i, v })), [data]);
  const id = `spark-${color.replace("#", "")}`;
  return (
    <div style={{ height }} className="w-full" aria-hidden="true">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={points} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.18} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <YAxis hide domain={["dataMin", "dataMax"]} />
          <Area type="monotone" dataKey="v" stroke={color} strokeWidth={1.5} fill={`url(#${id})`} isAnimationActive={false} />
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
}: {
  metric: MetricKey;
  value: number | null;
  previous: number | null;
  spark?: number[];
  icon?: ComponentType<{ className?: string }>;
  onClick?: () => void;
  active?: boolean;
  unavailable?: string;
}) {
  const meta = METRICS[metric];
  const delta = changePct(value, previous);
  return (
    <div
      className={cn(
        yt.card,
        "relative flex min-w-0 flex-col p-3.5 text-left transition has-[button:focus-visible]:ring-[3px] has-[button:focus-visible]:ring-[#E5202E]/25",
        onClick && "hover:border-[#C9D1DC]",
        active && "border-[#0F1B3D]/20 ring-[3px] ring-[#0F1B3D]/6",
      )}
    >
      {onClick && (
        // Full-card hit area; charts can't live inside a <button>.
        <button type="button" onClick={onClick} aria-pressed={active} aria-label={`Show ${meta.label} on the chart`} className="absolute inset-0 z-[1] rounded-[10px] focus-visible:outline-none" />
      )}
      <span className="flex items-center justify-between gap-2">
        <span className="flex min-w-0 items-center gap-1.5 text-[12px] font-medium text-[#6B7890]">
          {Icon && <Icon className="size-3.5 shrink-0" />}
          <span className="truncate">{meta.label}</span>
        </span>
        {active && <span className="size-2 shrink-0 rounded-sm" style={{ background: meta.color }} />}
      </span>
      {unavailable ? (
        <span className="mt-2 block text-[12px] leading-5 text-[#98A2B3]">{unavailable}</span>
      ) : (
        <>
          <span className="mt-1.5 block text-[21px] font-semibold leading-7 tracking-[-0.02em] text-[#0F1B3D] tabular-nums">{formatMetric(metric, value)}</span>
          <span className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-[11.5px] text-[#98A2B3]">
            <TrendDelta value={delta} />
            <span className="truncate">vs {formatMetric(metric, previous)} prev.</span>
          </span>
          {spark && (
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
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className={cn(yt.card, "p-3.5")}>
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
/* Trend with comparison                                               */
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
    const cur = aggregate(current, granularity);
    const prev = previous ? aggregate(previous, granularity) : [];
    return cur.map((p, i) => ({ date: p.date, value: p[metric], previous: prev[i]?.[metric] ?? null, previousDate: prev[i]?.date ?? null }));
  }, [current, previous, granularity, metric]);
  const pattern = granularity === "monthly" ? "MMM yyyy" : "MMM d";
  const gradientId = `trend-${metric}`;

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
          <XAxis dataKey="date" tickFormatter={(d: string) => format(parseISO(d), pattern)} tick={axisTick} axisLine={false} tickLine={false} minTickGap={28} />
          <YAxis tick={axisTick} axisLine={false} tickLine={false} width={48} tickFormatter={(v: number) => (metric === "ctr" ? `${v}%` : metric === "avgViewDuration" ? formatMetric(metric, v) : compact(v))} />
          <Tooltip
            cursor={{ stroke: "#C9D1DC", strokeDasharray: "3 3" }}
            content={({ active, payload }) => {
              const row = payload?.[0]?.payload as (typeof data)[number] | undefined;
              if (!active || !row) return null;
              const delta = changePct(row.value, row.previous);
              return (
                <div className="min-w-[180px] rounded-sm border border-[#E4E9F0] bg-white px-3 py-2 text-[12px] shadow-[0_12px_32px_-8px_rgba(15,27,61,0.2)]">
                  <p className="font-semibold text-[#0F1B3D]">{format(parseISO(row.date), granularity === "daily" ? "EEE, MMM d, yyyy" : granularity === "weekly" ? "'Week of' MMM d" : "MMMM yyyy")}</p>
                  <p className="mt-1.5 flex items-center justify-between gap-4">
                    <span className="flex items-center gap-1.5 text-[#6B7890]"><i className="size-2 rounded-sm" style={{ background: meta.color }} />{meta.label}</span>
                    <b className="tabular-nums text-[#0F1B3D]">{formatMetric(metric, row.value)}</b>
                  </p>
                  {compare && row.previous !== null && (
                    <>
                      <p className="mt-1 flex items-center justify-between gap-4">
                        <span className="flex items-center gap-1.5 text-[#6B7890]"><i className="size-2 rounded-sm bg-[#C9D1DC]" />Previous{row.previousDate ? ` (${format(parseISO(row.previousDate), "MMM d")})` : ""}</span>
                        <span className="tabular-nums text-[#3C4A66]">{formatMetric(metric, row.previous)}</span>
                      </p>
                      <p className="mt-1 text-right"><TrendDelta value={delta} /></p>
                    </>
                  )}
                </div>
              );
            }}
          />
          {compare && previous && <Area type="monotone" dataKey="previous" stroke="#C9D1DC" strokeDasharray="4 4" strokeWidth={1.5} fill="none" isAnimationActive={false} dot={false} />}
          <Area type="monotone" dataKey="value" stroke={meta.color} strokeWidth={2} fill={`url(#${gradientId})`} isAnimationActive={false} dot={false} activeDot={{ r: 4, strokeWidth: 2, stroke: "#fff" }} />
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
          {item.dashed ? <i className="h-0 w-3.5 border-t-2 border-dashed" style={{ borderColor: item.color }} /> : <i className="h-0.5 w-3.5 rounded" style={{ background: item.color }} />}
          {item.label}
        </span>
      ))}
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
            onMouseEnter={(_, i) => setHover(i)}
            onMouseLeave={() => setHover(null)}
          >
            {data.map((row, i) => (
              <Cell key={row.label} fill={colors[i % colors.length]} opacity={hover === null || hover === i ? 1 : 0.35} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
        <span className="px-3">
          <b className="block text-[16px] font-semibold leading-5 text-[#0F1B3D] tabular-nums">{focus ? `${focus.value.toFixed(1)}%` : centerValue}</b>
          <small className="block max-w-[90px] truncate text-[11px] text-[#6B7890]">{focus ? focus.label : centerLabel}</small>
        </span>
      </div>
    </div>
  );
}

export function LegendList({ data, colors = PALETTE, unit = "%", className }: { data: BreakdownRow[]; colors?: string[]; unit?: string; className?: string }) {
  return (
    <ul className={cn("min-w-0 space-y-1.5", className)}>
      {data.map((row, i) => (
        <li key={row.label} className="flex items-center gap-2 text-[12.5px]">
          <i className="size-2 shrink-0 rounded-sm" style={{ background: colors[i % colors.length] }} />
          <span className="min-w-0 flex-1 truncate text-[#3C4A66]">{row.label}</span>
          <b className="shrink-0 font-semibold tabular-nums text-[#0F1B3D]">
            {unit === "%" ? `${row.value.toFixed(1)}%` : compact(row.value)}
          </b>
        </li>
      ))}
    </ul>
  );
}

export function BarList({ data, color = "#2563EB", format: fmt = (v: number) => `${v.toFixed(1)}%`, max }: { data: BreakdownRow[]; color?: string; format?: (v: number) => string; max?: number }) {
  const top = max ?? Math.max(...data.map((d) => d.value), 1);
  return (
    <ul className="space-y-2">
      {data.map((row) => (
        <li key={row.label} className="grid grid-cols-[minmax(72px,120px)_1fr_auto] items-center gap-2.5 text-[12.5px]">
          <span className="truncate text-[#3C4A66]">{row.label}</span>
          <span className="h-2 overflow-hidden rounded-sm bg-[#EEF1F5]">
            <span className="block h-full rounded-sm" style={{ width: `${(row.value / top) * 100}%`, background: color }} />
          </span>
          <b className="min-w-[44px] text-right font-semibold tabular-nums text-[#0F1B3D]">{fmt(row.value)}</b>
        </li>
      ))}
    </ul>
  );
}

export function ColumnChart({ data, height = 160, color = "#E5202E", labelFormat }: { data: { label: string; value: number }[]; height?: number; color?: string; labelFormat: (label: string) => string }) {
  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
          <XAxis dataKey="label" tickFormatter={labelFormat} tick={axisTick} axisLine={false} tickLine={false} minTickGap={24} />
          <YAxis hide />
          <Tooltip
            cursor={{ fill: "#F3F5F9" }}
            content={({ active, payload }) => {
              const row = payload?.[0]?.payload as { label: string; value: number } | undefined;
              if (!active || !row) return null;
              return (
                <div className="rounded-sm border border-[#E4E9F0] bg-white px-2.5 py-1.5 text-[12px] shadow-md">
                  <p className="text-[#6B7890]">{labelFormat(row.label)}</p>
                  <b className="text-[#0F1B3D]">{row.value.toLocaleString("en-IN")} views</b>
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
/* Retention                                                           */
/* ------------------------------------------------------------------ */

export function RetentionChart({ data, height = 240, durationSec }: { data: { position: number; retention: number; typical: number }[]; height?: number; durationSec?: number }) {
  const label = (pos: number) => (durationSec ? formatMetric("avgViewDuration", (pos / 100) * durationSec) : `${pos}%`);
  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid stroke="#EEF1F5" vertical={false} />
          <XAxis dataKey="position" tickFormatter={label} tick={axisTick} axisLine={false} tickLine={false} minTickGap={32} />
          <YAxis tick={axisTick} axisLine={false} tickLine={false} width={40} domain={[0, 100]} tickFormatter={(v: number) => `${v}%`} />
          <Tooltip
            content={({ active, payload }) => {
              const row = payload?.[0]?.payload as { position: number; retention: number; typical: number } | undefined;
              if (!active || !row) return null;
              return (
                <div className="rounded-sm border border-[#E4E9F0] bg-white px-3 py-2 text-[12px] shadow-md">
                  <p className="font-semibold text-[#0F1B3D]">At {label(row.position)}</p>
                  <p className="mt-1 text-[#3C4A66]">This content: <b>{row.retention}%</b> still watching</p>
                  <p className="text-[#6B7890]">Typical: {row.typical}%</p>
                </div>
              );
            }}
          />
          <Line type="monotone" dataKey="typical" stroke="#C9D1DC" strokeDasharray="4 4" strokeWidth={1.5} dot={false} isAnimationActive={false} />
          <Line type="monotone" dataKey="retention" stroke="#7C3AED" strokeWidth={2} dot={false} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Heatmap                                                             */
/* ------------------------------------------------------------------ */

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function ActivityHeatmap({ matrix, timezone }: { matrix: number[][]; timezone: string }) {
  const max = Math.max(...matrix.flat(), 1);
  return (
    <div>
      <div className="scrollbar-thin overflow-x-auto">
        <div className="min-w-[560px]">
          <div className="grid grid-cols-[36px_repeat(24,1fr)] gap-[3px]">
            <span />
            {Array.from({ length: 24 }, (_, h) => (
              <span key={h} className="text-center text-[10px] text-[#98A2B3]">{h % 3 === 0 ? (h === 0 ? "12a" : h < 12 ? `${h}a` : h === 12 ? "12p" : `${h - 12}p`) : ""}</span>
            ))}
            {matrix.map((row, d) => (
              <FragmentRow key={DAYS[d]} day={DAYS[d] ?? ""} row={row} max={max} />
            ))}
          </div>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[11.5px] text-[#6B7890]">
        <span>Times shown in {timezone}</span>
        <span className="flex items-center gap-1.5">
          Fewer
          {[0.1, 0.3, 0.5, 0.75, 1].map((o) => (
            <i key={o} className="size-3 rounded-[3px]" style={{ background: `rgba(229,32,46,${o})` }} />
          ))}
          More viewers
        </span>
      </div>
    </div>
  );
}

function FragmentRow({ day, row, max }: { day: string; row: number[]; max: number }) {
  return (
    <>
      <span className="self-center text-[11px] font-medium text-[#6B7890]">{day}</span>
      {row.map((v, h) => (
        <span
          key={h}
          title={`${day} ${h}:00 — relative activity ${Math.round((v / max) * 100)}%`}
          className="aspect-square min-h-3 rounded-[3px]"
          style={{ background: `rgba(229,32,46,${Math.max(0.06, v / max)})` }}
        />
      ))}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Funnel                                                              */
/* ------------------------------------------------------------------ */

export function Funnel({ steps }: { steps: { label: string; value: string; rate?: string; width: number; help?: string }[] }) {
  return (
    <ol className="space-y-2">
      {steps.map((step, i) => (
        <li key={step.label}>
          {i > 0 && step.rate && (
            <p className="mb-1 pl-3 text-[11px] text-[#6B7890]">
              ↓ <b className="font-semibold text-[#0F1B3D]">{step.rate}</b>
            </p>
          )}
          <div className="relative h-11 overflow-hidden rounded-sm bg-[#F3F5F9]">
            <span className="absolute inset-y-0 left-0 rounded-sm bg-gradient-to-r from-[#FDE3E5] to-[#FBD0D4]" style={{ width: `${Math.max(12, step.width)}%` }} />
            <span className="relative flex h-full items-center justify-between gap-3 px-3">
              <span className="flex items-center gap-1 text-[12.5px] font-medium text-[#24324F]">
                {step.label}
                {step.help && <InfoTip text={step.help} />}
              </span>
              <b className="text-[14px] font-semibold tabular-nums text-[#0F1B3D]">{step.value}</b>
            </span>
          </div>
        </li>
      ))}
    </ol>
  );
}

/* ------------------------------------------------------------------ */
/* Bubble map (equirectangular, no external geometry)                  */
/* ------------------------------------------------------------------ */

// Coarse land mask (lat band → lon ranges, 5° grid) — enough for a recognizable dotted world without geo data.
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
  Array.from({ length: 72 }, (_, i) => -177.5 + i * 5)
    .filter((lon) => ranges.some(([a, b]) => lon >= a && lon <= b))
    .map((lon) => [lat, lon] as const),
);

export function BubbleMap({ rows, metric, selected, onSelect }: { rows: GeographyRow[]; metric: "views" | "watchTimeHours" | "subscribers"; selected?: string | null; onSelect?: (code: string) => void }) {
  const W = 720;
  const H = 340;
  const max = Math.max(...rows.map((r) => r[metric]), 1);
  const project = (lat: number, lon: number) => [((lon + 180) / 360) * W, ((75 - lat) / 135) * H] as const;
  return (
    <div className="relative w-full overflow-hidden rounded-sm bg-[linear-gradient(180deg,#F8FAFC,#F2F5F9)] ring-1 ring-inset ring-[#EEF1F5]">
      <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" role="img" aria-label="Views by country">
        {LAND_DOTS.map(([lat, lon]) => {
          const [x, y] = project(lat, lon);
          return <circle key={`${lat}:${lon}`} cx={x} cy={y} r={3.1} fill="#D5DCE6" />;
        })}
        {rows.map((row) => {
          const [x, y] = project(row.lat, row.lon);
          const r = 5 + Math.sqrt(row[metric] / max) * 34;
          const active = selected === row.code;
          return (
            <g key={row.code} onClick={() => onSelect?.(row.code)} className={onSelect ? "cursor-pointer" : undefined}>
              <title>{`${row.country}: ${compact(row[metric])}`}</title>
              <circle cx={x} cy={y} r={r} fill="#E5202E" fillOpacity={active ? 0.45 : 0.18} stroke="#E5202E" strokeOpacity={active ? 1 : 0.55} strokeWidth={active ? 2 : 1} />
              <circle cx={x} cy={y} r={2.5} fill="#E5202E" />
              {r > 14 && (
                <text x={x} y={y - r - 4} textAnchor="middle" className="fill-[#3C4A66] text-[11px] font-semibold">
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
