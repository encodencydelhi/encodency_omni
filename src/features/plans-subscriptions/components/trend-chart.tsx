"use client";

import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CHART_AXIS_PROPS, CHART_GRID_PROPS, CHART_TOOLTIP_LABEL_STYLE, CHART_TOOLTIP_STYLE } from "@/components/shared/charts/chart-theme";
import type { TrendPoint } from "../data/types";

/**
 * One series over time. Stocks (how many are active right now) read as an area
 * so the level is visible; flows (how many started or ended in a period) read as
 * bars, one per period. The title names the series, so there is no legend box.
 */
export function TrendChart({ data, kind, label, height = 200 }: { data: TrendPoint[]; kind: "stock" | "flow"; label: string; height?: number }) {
  const interval = data.length > 14 ? Math.ceil(data.length / 8) - 1 : 0;
  const maximum = Math.max(1, ...data.map((point) => point.value));
  const tooltip = {
    contentStyle: CHART_TOOLTIP_STYLE,
    labelStyle: CHART_TOOLTIP_LABEL_STYLE,
    formatter: (value: unknown) => [String(value ?? ""), label] as [string, string],
  };

  return (
    <div style={{ height }} role="img" aria-label={`${label} over time, ${data.length} points, latest ${data.at(-1)?.value ?? 0}`}>
      <ResponsiveContainer width="100%" height="100%">
        {kind === "stock" ? (
          <AreaChart data={data} margin={{ top: 6, right: 8, bottom: 0, left: -18 }}>
            <defs>
              <linearGradient id="trend-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.2} />
                <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid {...CHART_GRID_PROPS} />
            <XAxis dataKey="label" {...CHART_AXIS_PROPS} interval={interval} />
            <YAxis {...CHART_AXIS_PROPS} allowDecimals={false} width={44} domain={[0, Math.ceil(maximum * 1.15)]} />
            <Tooltip {...tooltip} />
            <Area type="monotone" dataKey="value" name={label} stroke="var(--chart-1)" strokeWidth={2} fill="url(#trend-fill)" dot={false} activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--card)" }} />
          </AreaChart>
        ) : (
          <BarChart data={data} margin={{ top: 6, right: 8, bottom: 0, left: -18 }} barCategoryGap="30%">
            <CartesianGrid {...CHART_GRID_PROPS} />
            <XAxis dataKey="label" {...CHART_AXIS_PROPS} interval={interval} />
            <YAxis {...CHART_AXIS_PROPS} allowDecimals={false} width={44} domain={[0, Math.max(2, Math.ceil(maximum * 1.15))]} />
            <Tooltip {...tooltip} cursor={{ fill: "var(--accent)", opacity: 0.5 }} />
            <Bar dataKey="value" name={label} fill="var(--chart-1)" radius={[3, 3, 0, 0]} maxBarSize={22} />
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}
