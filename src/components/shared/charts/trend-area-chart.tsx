"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatCompactNumber } from "@/lib/utils/format";
import {
  CHART_AXIS_PROPS,
  CHART_GRID_PROPS,
  CHART_TOOLTIP_LABEL_STYLE,
  CHART_TOOLTIP_STYLE,
  formatAxisDate,
} from "./chart-theme";

export interface TrendSeries {
  key: string;
  label: string;
  color: string;
  data: Array<{ date: string; value: number }>;
}

interface TrendAreaChartProps {
  series: TrendSeries[];
  height?: number;
  /** Renders every nth tick, so dense series keep a readable axis. */
  tickInterval?: number;
}

interface MergedPoint {
  date: string;
  [seriesKey: string]: string | number;
}

/** Aligns several series onto one x-axis keyed by date. */
function mergeSeries(series: TrendSeries[]): MergedPoint[] {
  const byDate = new Map<string, MergedPoint>();

  for (const entry of series) {
    for (const point of entry.data) {
      const existing = byDate.get(point.date) ?? { date: point.date };
      existing[entry.key] = point.value;
      byDate.set(point.date, existing);
    }
  }

  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
}

export function TrendAreaChart({ series, height = 240, tickInterval = 6 }: TrendAreaChartProps) {
  const data = mergeSeries(series);

  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -12 }}>
          <defs>
            {series.map((entry) => (
              <linearGradient key={entry.key} id={`fill-${entry.key}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={entry.color} stopOpacity={0.22} />
                <stop offset="100%" stopColor={entry.color} stopOpacity={0.02} />
              </linearGradient>
            ))}
          </defs>

          <CartesianGrid {...CHART_GRID_PROPS} />
          <XAxis dataKey="date" {...CHART_AXIS_PROPS} interval={tickInterval} tickFormatter={formatAxisDate} />
          <YAxis {...CHART_AXIS_PROPS} width={48} tickFormatter={(value: number) => formatCompactNumber(value)} />
          <Tooltip
            contentStyle={CHART_TOOLTIP_STYLE}
            labelStyle={CHART_TOOLTIP_LABEL_STYLE}
            labelFormatter={(label) => (typeof label === "string" ? formatAxisDate(label) : label)}
            formatter={(value, name) => [
              typeof value === "number" ? formatCompactNumber(value) : String(value ?? ""),
              String(name ?? ""),
            ]}
          />

          {series.map((entry) => (
            <Area
              key={entry.key}
              type="monotone"
              dataKey={entry.key}
              name={entry.label}
              stroke={entry.color}
              strokeWidth={1.75}
              fill={`url(#fill-${entry.key})`}
              dot={false}
              activeDot={{ r: 3, strokeWidth: 0 }}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Shared legend, so charts do not each invent their own. */
export function ChartLegend({ series }: { series: Array<{ key: string; label: string; color: string }> }) {
  return (
    <ul className="flex flex-wrap items-center gap-4">
      {series.map((entry) => (
        <li key={entry.key} className="flex items-center gap-1.5 text-2xs text-muted-foreground">
          <span className="size-2 rounded-sm" style={{ backgroundColor: entry.color }} aria-hidden />
          {entry.label}
        </li>
      ))}
    </ul>
  );
}
