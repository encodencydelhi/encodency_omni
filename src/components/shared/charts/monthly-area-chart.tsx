"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
  CHART_AXIS_PROPS,
  CHART_GRID_PROPS,
  CHART_TOOLTIP_LABEL_STYLE,
  CHART_TOOLTIP_STYLE,
} from "./chart-theme";
import type { MonthlyPoint } from "@/types/domain/dashboard";

interface MonthlyAreaChartProps {
  data: MonthlyPoint[];
  color?: string;
  height?: number;
  valueLabel: string;
  formatValue: (value: number) => string;
}

/** A continuous monthly measure, such as recurring revenue. */
export function MonthlyAreaChart({
  data,
  color = "var(--chart-1)",
  height = 220,
  valueLabel,
  formatValue,
}: MonthlyAreaChartProps) {
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -8 }}>
          <defs>
            <linearGradient id="fill-monthly-area" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.2} />
              <stop offset="100%" stopColor={color} stopOpacity={0.02} />
            </linearGradient>
          </defs>

          <CartesianGrid {...CHART_GRID_PROPS} />
          <XAxis dataKey="month" {...CHART_AXIS_PROPS} />
          <YAxis {...CHART_AXIS_PROPS} width={56} tickFormatter={formatValue} />
          <Tooltip
            contentStyle={CHART_TOOLTIP_STYLE}
            labelStyle={CHART_TOOLTIP_LABEL_STYLE}
            formatter={(value) => [
              typeof value === "number" ? formatValue(value) : String(value ?? ""),
              valueLabel,
            ]}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2}
            fill="url(#fill-monthly-area)"
            dot={{ r: 3, strokeWidth: 0, fill: color }}
            activeDot={{ r: 4, strokeWidth: 0 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
