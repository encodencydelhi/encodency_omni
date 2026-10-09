"use client";

import { useState } from "react";
import { cn } from "@/lib/utils/cn";
import { dayLabel } from "./time";

/** Created vs resolved per day: paired bars, a hover read-out and a table-like title for screen readers. */
export function TrendChart({ data, height = 168 }: { data: Array<{ day: string; created: number; resolved: number }>; height?: number }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...data.flatMap((d) => [d.created, d.resolved]));
  const width = 640;
  const pad = { top: 8, right: 8, bottom: 22, left: 28 };
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;
  const step = innerW / Math.max(1, data.length);
  const barW = Math.max(2, Math.min(14, step / 2 - 2));
  const ticks = [0, Math.ceil(max / 2), max].filter((v, i, a) => a.indexOf(v) === i);
  const labelEvery = Math.ceil(data.length / 7);
  const active = hover !== null ? data[hover] : null;
  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-[11px] font-semibold text-slate-600">
        <div className="flex items-center gap-4">
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2.5 rounded-sm bg-blue-500" />
            Raised
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2.5 rounded-sm bg-emerald-500" />
            Resolved
          </span>
        </div>
        <span className="text-slate-500">{active ? `${dayLabel(active.day)}: ${active.created} raised, ${active.resolved} resolved` : "Hover a day for details"}</span>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full" role="img" aria-label="Tickets raised and resolved per day">
        {ticks.map((tick) => {
          const y = pad.top + innerH - (tick / max) * innerH;
          return (
            <g key={tick}>
              <line x1={pad.left} x2={width - pad.right} y1={y} y2={y} stroke="#e2e8f0" strokeDasharray={tick === 0 ? undefined : "3 3"} />
              <text x={pad.left - 6} y={y + 3} textAnchor="end" className="fill-slate-400 text-[9px]">
                {tick}
              </text>
            </g>
          );
        })}
        {data.map((d, i) => {
          const x = pad.left + i * step + step / 2;
          const h1 = (d.created / max) * innerH;
          const h2 = (d.resolved / max) * innerH;
          return (
            <g key={d.day} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
              <rect x={pad.left + i * step} y={pad.top} width={step} height={innerH} fill={hover === i ? "#f1f5f9" : "transparent"} />
              <rect x={x - barW - 1} y={pad.top + innerH - h1} width={barW} height={h1} rx={1} className="fill-blue-500" />
              <rect x={x + 1} y={pad.top + innerH - h2} width={barW} height={h2} rx={1} className="fill-emerald-500" />
              {i % labelEvery === 0 && (
                <text x={x} y={height - 6} textAnchor="middle" className="fill-slate-500 text-[9px]">
                  {dayLabel(d.day)}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/** A labelled horizontal bar per row, scaled to the largest value. */
export function BarList({ rows, color = "bg-blue-500", empty = "Nothing to show yet." }: { rows: Array<{ key: string; label: string; value: number; hint?: string }>; color?: string; empty?: string }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  if (rows.every((r) => r.value === 0)) return <p className="py-6 text-center text-xs font-medium text-slate-500">{empty}</p>;
  return (
    <ul className="space-y-2.5">
      {rows.map((row) => (
        <li key={row.key}>
          <div className="mb-1 flex items-baseline justify-between gap-3 text-xs">
            <span className="min-w-0 truncate font-semibold text-slate-700">{row.label}</span>
            <span className="shrink-0 font-semibold tabular-nums text-slate-900">
              {row.value}
              {row.hint && <span className="ml-1.5 font-medium text-slate-500">{row.hint}</span>}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-sm bg-slate-100">
            <div className={cn("h-full rounded-sm", color)} style={{ width: `${(row.value / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

/** One bar split into labelled segments (ticket status mix). */
export function SegmentBar({ segments }: { segments: Array<{ key: string; label: string; value: number; className: string }> }) {
  const total = segments.reduce((sum, s) => sum + s.value, 0);
  if (total === 0) return <p className="py-3 text-center text-xs font-medium text-slate-500">No tickets yet.</p>;
  return (
    <div>
      <div className="flex h-3 overflow-hidden rounded-sm bg-slate-100" role="img" aria-label={segments.map((s) => `${s.label} ${s.value}`).join(", ")}>
        {segments.filter((s) => s.value > 0).map((s) => (
          <div key={s.key} className={s.className} style={{ width: `${(s.value / total) * 100}%` }} title={`${s.label}: ${s.value}`} />
        ))}
      </div>
      <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 sm:grid-cols-3">
        {segments.map((s) => (
          <li key={s.key} className="flex items-center justify-between gap-2 text-xs">
            <span className="inline-flex min-w-0 items-center gap-1.5 truncate font-medium text-slate-600">
              <span className={cn("size-2.5 shrink-0 rounded-sm", s.className)} />
              {s.label}
            </span>
            <span className="font-semibold tabular-nums text-slate-900">{s.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
