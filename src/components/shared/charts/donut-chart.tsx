"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { CHART_TOOLTIP_STYLE } from "./chart-theme";

export interface DonutSegment {
  key: string;
  label: string;
  value: number;
  color: string;
}

interface DonutChartProps {
  segments: DonutSegment[];
  /** Rendered in the hole — the figure the ring is a breakdown of. */
  centerValue: string;
  centerLabel: string;
  size?: number;
}

/**
 * A ring with the total in the middle.
 *
 * The centre carries the number, so the chart never depends on the reader
 * estimating arc lengths; the ring only conveys proportion.
 */
export function DonutChart({ segments, centerValue, centerLabel, size = 176 }: DonutChartProps) {
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={segments}
            dataKey="value"
            nameKey="label"
            innerRadius="66%"
            outerRadius="100%"
            paddingAngle={2}
            strokeWidth={0}
          >
            {segments.map((segment) => (
              <Cell key={segment.key} fill={segment.color} />
            ))}
          </Pie>
          <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
        </PieChart>
      </ResponsiveContainer>

      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xl font-semibold tabular text-foreground">{centerValue}</span>
        <span className="text-2xs text-muted-foreground">{centerLabel}</span>
      </div>
    </div>
  );
}
