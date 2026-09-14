"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { compactNum, money } from "../format";
import { trendSeries } from "../data";

/**
 * One palette for every chart in the workspace: blue = spend, green = leads,
 * amber = cost. Series keep the same colour on every page.
 */
export const SERIES = {
  spend: "#1877f2",
  leads: "#10b981",
  cpl: "#f59e0b",
  impressions: "#8b5cf6",
  clicks: "#0ea5e9",
} as const;

const axis = { fontSize: 10, fill: "#475569", fontWeight: 600 };

const tooltipStyle = {
  borderRadius: 12,
  border: "1px solid #cbd5e1",
  backgroundColor: "#ffffff",
  fontSize: 12,
  fontWeight: 600,
  color: "#0f172a",
  padding: "8px 12px",
  boxShadow: "0 10px 25px -5px rgba(15, 23, 42, 0.12), 0 8px 10px -6px rgba(15, 23, 42, 0.08)",
};

export function ChartLegend({
  items,
}: {
  items: { label: string; color: string }[];
}) {
  return (
    <div className="mb-2 flex flex-wrap gap-3.5 text-xs font-bold text-slate-700">
      {items.map((item) => (
        <span key={item.label} className="flex items-center gap-1.5">
          <span
            className="size-2.5 rounded-full ring-2 ring-white shadow-2xs"
            style={{ background: item.color }}
            aria-hidden="true"
          />
          {item.label}
        </span>
      ))}
    </div>
  );
}

/** Spend / leads / CPL over the reporting window. */
export function PerformanceTrend({
  height = 200,
  data = trendSeries,
}: {
  height?: number;
  data?: typeof trendSeries;
}) {
  return (
    <>
      <ChartLegend
        items={[
          { label: "Spend", color: SERIES.spend },
          { label: "Leads", color: SERIES.leads },
          { label: "Avg. CPL", color: SERIES.cpl },
        ]}
      />
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={height}>
          <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="spendFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor={SERIES.spend} stopOpacity={0.18} />
                <stop offset="1" stopColor={SERIES.spend} stopOpacity={0.01} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#e5eaf1" vertical={false} />
            <XAxis dataKey="label" tick={axis} axisLine={false} tickLine={false} interval={5} />
            <YAxis width={38} tick={axis} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={tooltipStyle} />
            <Area
              type="monotone"
              dataKey="spend"
              name="Spend (₹)"
              stroke={SERIES.spend}
              strokeWidth={2}
              fill="url(#spendFill)"
              dot={false}
            />
            <Line type="monotone" dataKey="leads" name="Leads" stroke={SERIES.leads} strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="cpl" name="CPL (₹)" stroke={SERIES.cpl} strokeWidth={2} dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </>
  );
}

export function SpendBarChart({
  data,
  height = 200,
}: {
  data: { name: string; value: number }[];
  height?: number;
}) {
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 12, bottom: 0, left: 0 }}>
          <CartesianGrid stroke="#e5eaf1" horizontal={false} />
          <XAxis type="number" tick={axis} axisLine={false} tickLine={false} tickFormatter={(v) => compactNum(v / 100)} />
          <YAxis type="category" dataKey="name" width={130} tick={axis} axisLine={false} tickLine={false} />
          <Tooltip contentStyle={tooltipStyle} formatter={(v) => money(Number(v))} />
          <Bar dataKey="value" name="Spend" fill={SERIES.spend} radius={[0, 4, 4, 0]} barSize={12} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function DonutChart({
  data,
  height = 190,
}: {
  data: { name: string; value: number; color: string }[];
  height?: number;
}) {
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius="52%"
            outerRadius="80%"
            paddingAngle={2}
            stroke="none"
          >
            {data.map((entry) => (
              <Cell key={entry.name} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip contentStyle={tooltipStyle} />
          <Legend
            verticalAlign="bottom"
            height={28}
            iconType="circle"
            iconSize={7}
            formatter={(value) => (
              <span style={{ fontSize: 9, color: "#475569" }}>{value}</span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Impressions -> Clicks -> Form opens -> Leads -> Qualified -> Converted. */
export function FunnelBars({
  steps,
}: {
  steps: { label: string; value: number; hint?: string }[];
}) {
  const top = steps[0]?.value || 1;
  return (
    <ol className="space-y-2">
      {steps.map((step, i) => {
        const width = Math.max((step.value / top) * 100, 2);
        const previous = steps[i - 1];
        const dropOff = previous && previous.value > 0
          ? ((previous.value - step.value) / previous.value) * 100
          : null;
        return (
          <li key={step.label}>
            <div className="flex items-baseline justify-between gap-2 text-[10px]">
              <span className="font-semibold text-[#14213d]">{step.label}</span>
              <span className="flex items-center gap-2">
                <strong className="tabular-nums">{compactNum(step.value)}</strong>
                {dropOff !== null && (
                  <span className="text-[9px] text-[#94a3b8]">
                    −{dropOff.toFixed(1)}%
                  </span>
                )}
              </span>
            </div>
            <div className="mt-1 h-2.5 overflow-hidden rounded bg-[#edf1f5]">
              <div
                className="h-full rounded"
                style={{
                  width: `${width}%`,
                  background: `linear-gradient(90deg, ${SERIES.spend}, ${SERIES.leads})`,
                  opacity: 1 - i * 0.1,
                }}
              />
            </div>
            {step.hint && (
              <p className="mt-0.5 text-[9px] text-[#94a3b8]">{step.hint}</p>
            )}
          </li>
        );
      })}
    </ol>
  );
}
