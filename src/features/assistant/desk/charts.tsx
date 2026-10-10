"use client";

import { useState } from "react";
import { dayLabel } from "@/features/support/time";
import { compact } from "./format";

/** Questions per day as bars and tokens per day as a line (each on its own scale), with a read-out on hover. */
export function UsageChart({ data, height = 190 }: { data: Array<{ day: string; questions: number; tokens: number }>; height?: number }) {
  const [hover, setHover] = useState<number | null>(null);
  const maxQ = Math.max(1, ...data.map((d) => d.questions));
  const maxT = Math.max(1, ...data.map((d) => d.tokens));
  const width = 720;
  const pad = { top: 10, right: 40, bottom: 22, left: 30 };
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;
  const step = innerW / Math.max(1, data.length);
  const barW = Math.max(2, Math.min(18, step - 3));
  const labelEvery = Math.ceil(data.length / 8);
  const qTicks = [0, Math.ceil(maxQ / 2), maxQ].filter((v, i, a) => a.indexOf(v) === i);
  const x = (i: number) => pad.left + i * step + step / 2;
  const yT = (v: number) => pad.top + innerH - (v / maxT) * innerH;
  const line = data.map((d, i) => `${x(i)},${yT(d.tokens)}`).join(" ");
  const active = hover !== null ? data[hover] : null;

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-[11px] font-semibold text-slate-600">
        <div className="flex items-center gap-4">
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2.5 rounded-sm bg-blue-500" />
            Questions
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-0.5 w-3 rounded bg-violet-500" />
            Tokens
          </span>
        </div>
        <span className="text-slate-500">{active ? `${dayLabel(active.day)}: ${active.questions} question${active.questions === 1 ? "" : "s"}, ${active.tokens.toLocaleString("en-IN")} tokens` : "Hover a day for details"}</span>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full" role="img" aria-label="Questions and tokens per day">
        {qTicks.map((tick) => {
          const y = pad.top + innerH - (tick / maxQ) * innerH;
          return (
            <g key={tick}>
              <line x1={pad.left} x2={width - pad.right} y1={y} y2={y} stroke="#e2e8f0" strokeDasharray={tick === 0 ? undefined : "3 3"} />
              <text x={pad.left - 6} y={y + 3} textAnchor="end" className="fill-slate-400 text-[9px]">
                {tick}
              </text>
            </g>
          );
        })}
        {[0, maxT].map((tick) => (
          <text key={tick} x={width - pad.right + 6} y={yT(tick) + 3} className="fill-violet-400 text-[9px]">
            {compact(tick)}
          </text>
        ))}
        {data.map((d, i) => {
          const h = (d.questions / maxQ) * innerH;
          return (
            <g key={d.day} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
              <rect x={pad.left + i * step} y={pad.top} width={step} height={innerH} fill={hover === i ? "#f1f5f9" : "transparent"} />
              <rect x={x(i) - barW / 2} y={pad.top + innerH - h} width={barW} height={h} rx={1} className="fill-blue-500" />
              {i % labelEvery === 0 && (
                <text x={x(i)} y={height - 6} textAnchor="middle" className="fill-slate-500 text-[9px]">
                  {dayLabel(d.day)}
                </text>
              )}
            </g>
          );
        })}
        {data.length > 1 && <polyline points={line} fill="none" stroke="#8b5cf6" strokeWidth={1.75} strokeLinejoin="round" strokeLinecap="round" pointerEvents="none" />}
        {hover !== null && active && <circle cx={x(hover)} cy={yT(active.tokens)} r={3.5} className="fill-violet-500" stroke="white" strokeWidth={1.5} pointerEvents="none" />}
      </svg>
    </div>
  );
}

/** Words people use most, bigger = more often. */
export function KeywordCloud({ words }: { words: Array<{ word: string; count: number }> }) {
  if (words.length === 0) return <p className="text-xs font-medium text-slate-500">Words will appear once people start asking.</p>;
  const max = Math.max(...words.map((w) => w.count));
  return (
    <ul className="flex flex-wrap gap-1.5" aria-label="Most used words">
      {words.map((w) => {
        const weight = w.count / max;
        return (
          <li key={w.word} dir="auto" className="inline-flex items-baseline gap-1 rounded-sm border border-slate-200 bg-white px-2 py-1 font-semibold text-slate-700" style={{ fontSize: `${11 + Math.round(weight * 4)}px`, opacity: 0.65 + weight * 0.35 }}>
            {w.word}
            <span className="text-[10px] font-medium text-slate-400">{w.count}</span>
          </li>
        );
      })}
    </ul>
  );
}

export function MiniBarSpark({ data, tone = "blue" }: { data: number[]; tone?: "blue" | "violet" | "green" | "orange" | "red" }) {
  const max = Math.max(1, ...data);
  const color = { blue: "bg-blue-500", violet: "bg-violet-500", green: "bg-emerald-500", orange: "bg-amber-500", red: "bg-rose-500" }[tone];
  return (
    <div className="flex h-8 items-end gap-0.5" aria-hidden="true">
      {data.slice(-18).map((value, index) => (
        <span key={index} className={`${color} w-full min-w-1 rounded-t-[1px] opacity-80`} style={{ height: `${Math.max(12, (value / max) * 100)}%` }} />
      ))}
    </div>
  );
}

export function DonutMeter({ value, label, tone = "blue" }: { value: number; label: string; tone?: "blue" | "green" | "orange" | "red" | "violet" }) {
  const pct = Math.max(0, Math.min(100, value));
  const stroke = { blue: "#2563eb", green: "#059669", orange: "#d97706", red: "#e11d48", violet: "#7c3aed" }[tone];
  return (
    <div className="relative size-20 shrink-0" role="img" aria-label={`${label} ${pct}%`}>
      <svg viewBox="0 0 40 40" className="size-20 -rotate-90">
        <circle cx="20" cy="20" r="15.5" fill="none" stroke="#e2e8f0" strokeWidth="5" />
        <circle cx="20" cy="20" r="15.5" fill="none" stroke={stroke} strokeWidth="5" strokeLinecap="round" strokeDasharray={`${pct} ${100 - pct}`} pathLength={100} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-sm font-bold tabular-nums text-slate-900">{pct}%</span>
        <span className="text-[9px] font-semibold uppercase text-slate-400">{label}</span>
      </div>
    </div>
  );
}
