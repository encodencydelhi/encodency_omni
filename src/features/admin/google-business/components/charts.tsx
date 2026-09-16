"use client";

import { useMemo, type ComponentType } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { format, parseISO, startOfMonth, startOfWeek } from "date-fns";
import { cn } from "@/lib/utils/cn";
import type { MetricSeriesPoint } from "../data/selectors";
import { METRICS, type MetricKey } from "../lib/constants";
import { changePct, compact } from "../lib/format";
import { Skeleton, TrendDelta, gb } from "./ui";
import { Star } from "lucide-react";

export const PALETTE = ["#1A73E8", "#188038", "#E8710A", "#9334E6", "#12B5CB", "#D93025", "#80868B"];

const axisTick = { fontSize: 11, fill: "#80868B" };

export type Granularity = "daily" | "weekly" | "monthly";

/** Buckets daily points into weeks or months for longer ranges. */
export function aggregate(series: MetricSeriesPoint[], granularity: Granularity): MetricSeriesPoint[] {
  if (granularity === "daily") return series;
  const buckets = new Map<string, MetricSeriesPoint[]>();
  for (const point of series) {
    const date = parseISO(point.date);
    const key = (granularity === "weekly" ? startOfWeek(date, { weekStartsOn: 1 }) : startOfMonth(date)).toISOString();
    buckets.set(key, [...(buckets.get(key) ?? []), point]);
  }
  return [...buckets.entries()].map(([date, points]) => ({
    date,
    values: Object.fromEntries(
      (Object.keys(METRICS) as MetricKey[]).map((metric) => [metric, points.reduce((sum, point) => sum + point.values[metric], 0)]),
    ) as Record<MetricKey, number>,
  }));
}

/* ------------------------------------------------------------------ */
/* KPI                                                                 */
/* ------------------------------------------------------------------ */

export function Sparkline({ data, color, height = 20 }: { data: number[]; color: string; height?: number }) {
  const points = useMemo(() => data.map((value, index) => ({ index, value })), [data]);
  const id = `gb-spark-${color.replace("#", "")}`;
  return (
    <div style={{ height }} className="w-full overflow-hidden" aria-hidden="true">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={points} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.2} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <YAxis hide domain={["dataMin", "dataMax"]} />
          <Area type="monotone" dataKey="value" stroke={color} strokeWidth={1.5} fill={`url(#${id})`} isAnimationActive={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function KpiCard({
  label,
  value,
  previous,
  spark,
  color = "#1A73E8",
  icon: Icon,
  onClick,
  active,
  hint,
  unavailable,
  format: formatValue = (input: number | null) => compact(input),
}: {
  label: string;
  value: number | null;
  previous?: number | null;
  spark?: number[];
  color?: string;
  icon?: ComponentType<{ className?: string }>;
  onClick?: () => void;
  active?: boolean;
  hint?: string;
  unavailable?: string;
  format?: (value: number | null) => string;
}) {
  const delta = changePct(value, previous ?? null);
  return (
    <div
      className={cn(
        gb.card,
        "relative flex min-w-0 flex-col p-2.5 transition has-[button:focus-visible]:ring-[3px] has-[button:focus-visible]:ring-[#1A73E8]/30",
        onClick && "hover:border-[#C6C9CD]",
        active && "border-[#1A73E8]/40 ring-[3px] ring-[#1A73E8]/10",
      )}
    >
      {onClick && (
        // Full-card hit area; charts cannot live inside a <button>.
        <button type="button" onClick={onClick} aria-pressed={active} aria-label={`Show ${label} on the chart`} className="absolute inset-0 z-[1] rounded-lg focus-visible:outline-none" />
      )}
      <span className="flex items-center justify-between gap-2">
        <span className="flex min-w-0 items-center gap-1.5 text-[11px] text-[#5F6368]">
          {Icon && <Icon className="size-3.5 shrink-0" />}
          <span className="truncate">{label}</span>
        </span>
        {active && <span className="size-2 shrink-0 rounded-full" style={{ background: color }} />}
      </span>
      {unavailable ? (
        <span className="mt-1 block text-[11px] leading-4 text-[#80868B]">{unavailable}</span>
      ) : (
        <>
          <span className="mt-1 block text-[18px] font-medium leading-6 tracking-[-0.02em] text-[#202124] tabular-nums">{formatValue(value)}</span>
          <span className="mt-0 flex flex-wrap items-center gap-x-1.5 text-[10px] leading-[14px] text-[#80868B]">
            {previous === undefined ? <span className="truncate">{hint}</span> : <><TrendDelta value={delta} /><span className="truncate">{hint ?? `vs ${formatValue(previous ?? null)} prev.`}</span></>}
          </span>
          {spark && (
            <span className="mt-1 block">
              <Sparkline data={spark} color={color} />
            </span>
          )}
        </>
      )}
    </div>
  );
}

export function KpiSkeleton({ count = 4 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className={cn(gb.card, "p-3.5")}>
          <Skeleton className="h-3 w-24" />
          <Skeleton className="mt-3 h-6 w-20" />
          <Skeleton className="mt-2 h-3 w-28" />
          <Skeleton className="mt-3 h-7 w-full" />
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
  metrics,
  granularity = "daily",
  height = 260,
  compare = true,
}: {
  current: MetricSeriesPoint[];
  previous?: MetricSeriesPoint[];
  metrics: MetricKey[];
  granularity?: Granularity;
  height?: number;
  compare?: boolean;
}) {
  const data = useMemo(() => {
    const currentSeries = aggregate(current, granularity);
    const previousSeries = previous ? aggregate(previous, granularity) : [];
    return currentSeries.map((point, index) => {
      const row: Record<string, string | number | null> = { date: point.date };
      metrics.forEach((metric) => {
        row[metric] = point.values[metric];
        row[`${metric}__prev`] = previousSeries[index]?.values[metric] ?? null;
      });
      return row;
    });
  }, [current, previous, metrics, granularity]);

  const pattern = granularity === "monthly" ? "MMM yyyy" : "MMM d";

  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <defs>
            {metrics.map((metric) => (
              <linearGradient key={metric} id={`gb-trend-${metric}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={METRICS[metric].color} stopOpacity={0.16} />
                <stop offset="100%" stopColor={METRICS[metric].color} stopOpacity={0} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid stroke="#F1F3F4" vertical={false} />
          <XAxis dataKey="date" tickFormatter={(value: string) => format(parseISO(value), pattern)} tick={axisTick} axisLine={false} tickLine={false} minTickGap={28} />
          <YAxis tick={axisTick} axisLine={false} tickLine={false} width={48} tickFormatter={(value: number) => compact(value)} />
          <Tooltip
            cursor={{ stroke: "#DADCE0", strokeDasharray: "3 3" }}
            content={({ active, payload }) => {
              const row = payload?.[0]?.payload as Record<string, string | number | null> | undefined;
              if (!active || !row) return null;
              return (
                <div className="min-w-[200px] rounded-lg border border-[#E8EAED] bg-white px-3 py-2 text-[12px] shadow-[0_8px_24px_rgba(60,64,67,0.22)]">
                  <p className="font-medium text-[#202124]">
                    {format(parseISO(String(row.date)), granularity === "daily" ? "EEE, MMM d, yyyy" : granularity === "weekly" ? "'Week of' MMM d" : "MMMM yyyy")}
                  </p>
                  {metrics.map((metric) => {
                    const value = Number(row[metric] ?? 0);
                    const prev = row[`${metric}__prev`] === null ? null : Number(row[`${metric}__prev`]);
                    return (
                      <p key={metric} className="mt-1 flex items-center justify-between gap-4">
                        <span className="flex items-center gap-1.5 text-[#5F6368]">
                          <i className="size-2 rounded-full" style={{ background: METRICS[metric].color }} />
                          {METRICS[metric].label}
                        </span>
                        <span className="flex items-center gap-2">
                          <b className="tabular-nums text-[#202124]">{compact(value)}</b>
                          {compare && prev !== null && <TrendDelta value={changePct(value, prev)} />}
                        </span>
                      </p>
                    );
                  })}
                </div>
              );
            }}
          />
          {compare &&
            previous &&
            metrics.map((metric) => (
              <Area key={`${metric}-prev`} type="monotone" dataKey={`${metric}__prev`} stroke="#DADCE0" strokeDasharray="4 4" strokeWidth={1.5} fill="none" isAnimationActive={false} dot={false} />
            ))}
          {metrics.map((metric) => (
            <Area
              key={metric}
              type="monotone"
              dataKey={metric}
              stroke={METRICS[metric].color}
              strokeWidth={2}
              fill={metrics.length === 1 ? `url(#gb-trend-${metric})` : "none"}
              isAnimationActive={false}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 2, stroke: "#fff" }}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ChartLegend({ items }: { items: { label: string; color: string; dashed?: boolean }[] }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11.5px] text-[#5F6368]">
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
/* Bars, columns & donut                                               */
/* ------------------------------------------------------------------ */

export function BarList({
  data,
  format: formatValue = (value: number) => compact(value),
  max,
}: {
  data: { label: string; value: number; hint?: string }[];
  format?: (value: number) => string;
  max?: number;
}) {
  const top = max ?? Math.max(...data.map((row) => row.value), 1);
  return (
    <ul className="space-y-1.5">
      {data.map((row) => (
        <li key={row.label} className="relative flex h-[26px] items-center justify-between rounded-md px-2 text-[12px]">
          <span className="absolute inset-y-0 left-0 rounded-md bg-[#E8F0FE] transition-all" style={{ width: `${(row.value / top) * 100}%` }} />
          <span className="relative z-10 truncate font-medium text-[#1967D2]" title={row.label}>
            {row.label}
          </span>
          <b className="relative z-10 font-medium tabular-nums text-[#1967D2]">{formatValue(row.value)}</b>
        </li>
      ))}
    </ul>
  );
}

export function ColumnChart({
  data,
  height = 170,
  color = "#1A73E8",
  labelFormat,
  valueLabel,
}: {
  data: { label: string; value: number }[];
  height?: number;
  color?: string;
  labelFormat: (label: string) => string;
  valueLabel: string;
}) {
  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
          <CartesianGrid stroke="#F1F3F4" vertical={false} />
          <XAxis dataKey="label" tickFormatter={labelFormat} tick={axisTick} axisLine={false} tickLine={false} minTickGap={20} />
          <YAxis tick={axisTick} axisLine={false} tickLine={false} width={44} tickFormatter={(value: number) => compact(value)} />
          <Tooltip
            cursor={{ fill: "#F8F9FA" }}
            content={({ active, payload }) => {
              const row = payload?.[0]?.payload as { label: string; value: number } | undefined;
              if (!active || !row) return null;
              return (
                <div className="rounded-lg border border-[#E8EAED] bg-white px-2.5 py-1.5 text-[12px] shadow-md">
                  <p className="text-[#5F6368]">{labelFormat(row.label)}</p>
                  <b className="text-[#202124]">
                    {compact(row.value)} {valueLabel}
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

export function Donut({
  data,
  size = 140,
  thickness = 18,
  centerValue,
  centerLabel,
  colors = PALETTE,
}: {
  data: { label: string; value: number }[];
  size?: number;
  thickness?: number;
  centerValue?: string;
  centerLabel?: string;
  colors?: string[];
}) {
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="label" innerRadius={size / 2 - thickness} outerRadius={size / 2} paddingAngle={1.5} strokeWidth={0} isAnimationActive={false}>
            {data.map((row, index) => (
              <Cell key={row.label} fill={colors[index % colors.length]} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
        <span className="px-3">
          <b className="block text-[16px] font-medium leading-5 text-[#202124] tabular-nums">{centerValue}</b>
          <small className="block max-w-[92px] truncate text-[11px] text-[#5F6368]">{centerLabel}</small>
        </span>
      </div>
    </div>
  );
}

export function LegendList({
  data,
  colors = PALETTE,
  format: formatValue = (value: number) => compact(value),
  className,
}: {
  data: { label: string; value: number }[];
  colors?: string[];
  format?: (value: number) => string;
  className?: string;
}) {
  return (
    <ul className={cn("min-w-0 space-y-1.5", className)}>
      {data.map((row, index) => (
        <li key={row.label} className="flex items-center gap-2 text-[12.5px]">
          <i className="size-2 shrink-0 rounded-sm" style={{ background: colors[index % colors.length] }} />
          <span className="min-w-0 flex-1 truncate text-[#3C4043]">{row.label}</span>
          <b className="shrink-0 font-medium tabular-nums text-[#202124]">{formatValue(row.value)}</b>
        </li>
      ))}
    </ul>
  );
}
export function RatingBars({ distribution, total }: { distribution: { star: number; count: number }[]; total: number }) {
  return (
    <ul className="space-y-1.5">
      {distribution.map((row) => (
        <li key={row.star} className="grid grid-cols-[24px_1fr_32px] items-center gap-2 text-[12px]">
          <span className="flex items-center gap-0.5 font-medium text-[#202124]">
            {row.star} <Star className="h-2.5 w-2.5 fill-[#F59E0B] text-[#F59E0B]" />
          </span>
          <span className="h-2 overflow-hidden rounded-full bg-[#E5E7EB]">
            <span className="block h-full rounded-full bg-[#F59E0B]" style={{ width: `${total ? (row.count / total) * 100 : 0}%` }} />
          </span>
          <b className="text-right font-medium tabular-nums text-[#202124]">{row.count}</b>
        </li>
      ))}
    </ul>
  );
}
