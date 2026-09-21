"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CHART_AXIS_PROPS, CHART_COLORS, CHART_GRID_PROPS, CHART_TOOLTIP_LABEL_STYLE, CHART_TOOLTIP_STYLE } from "@/components/shared/charts/chart-theme";
import type { ActivityPoint } from "../data/types";

/** Real event counts per bucket. Empty buckets are zero; no event is invented to fill them. */
export function ActivityChart({ points, unit, height = 220, name = "Events" }: { points: readonly ActivityPoint[]; unit: "hour" | "day" | "week"; height?: number; name?: string }) {
  const interval = Math.max(0, Math.ceil(points.length / 8) - 1);
  return (
    <div style={{ height }} role="img" aria-label={`${name} per ${unit}`}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={points.map((point) => ({ ...point }))} margin={{ top: 4, right: 8, bottom: 0, left: -18 }}>
          <CartesianGrid {...CHART_GRID_PROPS} />
          <XAxis dataKey="label" {...CHART_AXIS_PROPS} interval={interval} />
          <YAxis {...CHART_AXIS_PROPS} allowDecimals={false} />
          <Tooltip contentStyle={CHART_TOOLTIP_STYLE} labelStyle={CHART_TOOLTIP_LABEL_STYLE} cursor={{ fill: "rgba(148,163,184,0.15)" }} formatter={(value) => [String(value), name]} labelFormatter={(label) => `${label}${unit === "hour" ? " UTC" : ""}`} />
          <Bar dataKey="value" fill={CHART_COLORS[1] ?? "#2563eb"} radius={[2, 2, 0, 0]} maxBarSize={22} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
