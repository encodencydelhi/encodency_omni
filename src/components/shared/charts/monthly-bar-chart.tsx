"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatCompactNumber } from "@/lib/utils/format";
import {
  CHART_AXIS_PROPS,
  CHART_GRID_PROPS,
  CHART_TOOLTIP_LABEL_STYLE,
  CHART_TOOLTIP_STYLE,
} from "./chart-theme";
import type { MonthlyPoint } from "@/types/domain/dashboard";

interface MonthlyBarChartProps {
  data: MonthlyPoint[];
  color?: string;
  height?: number;
  valueLabel: string;
  formatValue?: (value: number) => string;
}
export function MonthlyBarChart({
  data,
  color = "var(--chart-1)",
  height = 220,
  valueLabel,
  formatValue = formatCompactNumber,
}: MonthlyBarChartProps) {
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }} barCategoryGap="34%">
          <CartesianGrid {...CHART_GRID_PROPS} />
          <XAxis dataKey="month" {...CHART_AXIS_PROPS} />
          <YAxis {...CHART_AXIS_PROPS} width={44} tickFormatter={formatValue} />
          <Tooltip
            cursor={{ fill: "var(--accent)" }}
            contentStyle={CHART_TOOLTIP_STYLE}
            labelStyle={CHART_TOOLTIP_LABEL_STYLE}
            formatter={(value) => [
              typeof value === "number" ? formatValue(value) : String(value ?? ""),
              valueLabel,
            ]}
          />
          <Bar dataKey="value" fill={color} radius={[4, 4, 0, 0]} maxBarSize={44} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
