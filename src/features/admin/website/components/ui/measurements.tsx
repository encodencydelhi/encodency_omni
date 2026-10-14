"use client";

/**
 * Building blocks for performance and search measurements. Each one states what
 * kind of measurement it shows (Lighthouse lab, URL field, origin field, Search
 * Console, URL Inspection) and when it was taken, and renders "not measured"
 * instead of a number when there is none.
 */

import { Gauge, Info } from "lucide-react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { cn } from "@/lib/utils/cn";
import { formatDateTime, formatRelative, scoreBand, vitalLabel, vitalTone } from "../../data/selectors";
import type { CruxSnapshotView, FieldBlock, FieldMetricKey, LabMetrics, LighthouseScores, VitalBand } from "../../data/types";
import { Chip, ScoreDial, toneText } from "./kit";
import { AXIS_PROPS, GRID_PROPS, makeTooltip } from "./charts";

export type SourceKind = "lab" | "field-url" | "field-origin" | "crux-api" | "search" | "inspection";

const SOURCE: Record<SourceKind, { label: string; tone: "info" | "good" | "warn" | "muted" | "violet"; title: string }> = {
  lab: { label: "Lighthouse lab", tone: "info", title: "A simulated page load made by Google PageSpeed Insights for this URL at one moment in time." },
  "field-url": { label: "CrUX URL field", tone: "good", title: "Real Chrome users of this exact URL (28-day 75th percentile)." },
  "field-origin": { label: "CrUX origin field", tone: "warn", title: "Real Chrome users across the whole origin. This is NOT a measurement of this individual page." },
  "crux-api": { label: "CrUX API", tone: "good", title: "Chrome UX Report API, queried for the scope shown." },
  search: { label: "Search Console", tone: "violet", title: "Google Search Console performance data for the connected property." },
  inspection: { label: "URL Inspection", tone: "violet", title: "Google's own index status for this single URL." },
};

export function SourceBadge({ kind, className }: { kind: SourceKind; className?: string }) {
  const s = SOURCE[kind];
  return (
    <span title={s.title} className={className}>
      <Chip tone={s.tone}>{s.label}</Chip>
    </span>
  );
}

export function Stamp({ at, prefix = "Measured" }: { at: string | null | undefined; prefix?: string }) {
  if (!at) return null;
  return (
    <span className="text-[10.5px] text-[#6B7A94]" title={formatDateTime(at)}>
      {prefix} {formatRelative(at)}
    </span>
  );
}

/* ---- scores -------------------------------------------------------------------- */

const SCORE_LABELS: { key: keyof LighthouseScores; label: string }[] = [
  { key: "performance", label: "Performance" },
  { key: "accessibility", label: "Accessibility" },
  { key: "seo", label: "SEO" },
  { key: "bestPractices", label: "Best practices" },
];

export function LighthouseScoreRow({ scores, size = 56 }: { scores: LighthouseScores | null; size?: number }) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {SCORE_LABELS.map(({ key, label }) => {
        const value = scores?.[key] ?? null;
        return (
          <div key={key} className="flex flex-col items-center gap-1.5 rounded-xl border border-[#E6EBF4] bg-white p-2.5 text-center shadow-sm">
            {value === null ? (
              <div className="flex items-center justify-center rounded-full border border-dashed border-[#CBD5E1] text-[9px] font-semibold text-[#64748B]" style={{ width: size, height: size }}>
                Not measured
              </div>
            ) : (
              <ScoreDial value={value} tone={scoreBand(value)} size={size} label={`${label} ${value}`} />
            )}
            <span className="text-[11px] font-bold text-[#475569]">{label}</span>
          </div>
        );
      })}
    </div>
  );
}

/* ---- lab metrics ------------------------------------------------------------------ */

const LAB_DEFS: { key: keyof LabMetrics; label: string; good: number; poor: number; fmt: (v: number) => string; note?: string }[] = [
  { key: "fcpMs", label: "First Contentful Paint", good: 1800, poor: 3000, fmt: (v) => `${(v / 1000).toFixed(1)} s` },
  { key: "lcpMs", label: "Largest Contentful Paint", good: 2500, poor: 4000, fmt: (v) => `${(v / 1000).toFixed(1)} s` },
  { key: "speedIndexMs", label: "Speed Index", good: 3400, poor: 5800, fmt: (v) => `${(v / 1000).toFixed(1)} s` },
  { key: "tbtMs", label: "Total Blocking Time", good: 200, poor: 600, fmt: (v) => `${Math.round(v)} ms`, note: "Lab proxy for responsiveness — not INP" },
  { key: "cls", label: "Cumulative Layout Shift", good: 0.1, poor: 0.25, fmt: (v) => v.toFixed(3) },
  { key: "ttfbMs", label: "Server response time", good: 800, poor: 1800, fmt: (v) => `${Math.round(v)} ms` },
];

export function LabMetricsGrid({ lab }: { lab: LabMetrics | null }) {
  return (
    <div className="grid grid-cols-2 gap-1.5 lg:grid-cols-3">
      {LAB_DEFS.map((def) => {
        const value = lab?.[def.key] ?? null;
        const band: VitalBand | null = value === null ? null : value <= def.good ? "good" : value <= def.poor ? "needs-improvement" : "poor";
        return (
          <div key={def.key} className="rounded-xl border border-[#E6EBF4] bg-white p-2.5 shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#64748B]">{def.label}</p>
            <p className={cn("mt-1 text-[20px] font-extrabold leading-none", band ? toneText[vitalTone[band]] : "text-[#94A3B8]")}>
              {value === null ? "Not measured" : def.fmt(value)}
            </p>
            <p className="mt-1 text-[10px] text-[#94A3B8]">{def.note ?? (band ? vitalLabel[band] : "No value returned")}</p>
          </div>
        );
      })}
    </div>
  );
}

/* ---- field data -------------------------------------------------------------------- */

const FIELD_DEFS: { key: FieldMetricKey; label: string; fmt: (v: number) => string }[] = [
  { key: "lcpMs", label: "LCP", fmt: (v) => `${(v / 1000).toFixed(1)} s` },
  { key: "inpMs", label: "INP", fmt: (v) => `${Math.round(v)} ms` },
  { key: "cls", label: "CLS", fmt: (v) => v.toFixed(2) },
  { key: "fcpMs", label: "FCP", fmt: (v) => `${(v / 1000).toFixed(1)} s` },
  { key: "ttfbMs", label: "TTFB", fmt: (v) => `${Math.round(v)} ms` },
];

export function FieldBlockView({ field, empty, scopeLabel }: { field: FieldBlock | null; empty: string; scopeLabel: string }) {
  if (!field) {
    return (
      <div className="flex items-start gap-2 rounded-lg border border-dashed border-[#CBD5E1] bg-[#F8FAFC] px-3 py-3 text-[11.5px] text-[#5B6B85]">
        <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
        <span>{empty}</span>
      </div>
    );
  }
  const rows = FIELD_DEFS.filter((d) => field.metrics[d.key]);
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2 text-[10.5px] text-[#6B7A94]">
        <span>{scopeLabel}</span>
        {field.overallCategory ? <Chip tone={vitalTone[field.overallCategory]}>Core Web Vitals: {vitalLabel[field.overallCategory]}</Chip> : null}
        {field.collectionPeriod ? <span>Data {field.collectionPeriod.start} → {field.collectionPeriod.end}</span> : <span>28-day window</span>}
        {field.formFactor && field.formFactor !== "ALL" ? <span>· {field.formFactor === "PHONE" ? "Phone" : "Desktop"} users</span> : null}
      </div>
      <div className="grid grid-cols-2 gap-1.5 lg:grid-cols-5">
        {rows.map((d) => {
          const m = field.metrics[d.key]!;
          return (
            <div key={d.key} className="rounded-xl border border-[#E6EBF4] bg-white p-2.5 shadow-sm">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#64748B]">{d.label} · p75</p>
              <p className={cn("mt-1 text-[18px] font-extrabold leading-none", m.category ? toneText[vitalTone[m.category]] : "text-[#28354C]")}>{d.fmt(m.p75)}</p>
              {m.distribution ? (
                <div className="mt-2">
                  <div className="flex h-1.5 w-full gap-[1px] overflow-hidden rounded-full bg-[#F1F5F9]" role="img" aria-label={`${d.label} distribution`}>
                    <span className="h-full bg-[#10B981]" style={{ width: `${m.distribution.good}%` }} />
                    <span className="h-full bg-[#F59E0B]" style={{ width: `${m.distribution.needsImprovement}%` }} />
                    <span className="h-full bg-[#EF4444]" style={{ width: `${m.distribution.poor}%` }} />
                  </div>
                  <p className="mt-1 text-[9.5px] text-[#94A3B8]">{m.distribution.good}% good · {m.distribution.needsImprovement}% fair · {m.distribution.poor}% poor</p>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function CruxStatus({ snapshot, label }: { snapshot: CruxSnapshotView | null; label: string }) {
  if (!snapshot) return <p className="text-[11px] text-[#94A3B8]">{label}: not requested yet. Run a performance audit.</p>;
  if (snapshot.status === "measured") return null;
  const text =
    snapshot.status === "no_data"
      ? `${label}: Chrome has no field data for this target (not enough real-user traffic).`
      : snapshot.status === "blocked"
        ? `${label}: ${snapshot.errorMessage ?? "The Chrome UX Report API is not available for this key."}`
        : snapshot.status === "rate_limited"
          ? `${label}: the Chrome UX Report API quota was reached. ${snapshot.errorMessage ?? ""}`
          : `${label}: ${snapshot.errorMessage ?? "the request failed."}`;
  return <p className={cn("text-[11px]", snapshot.status === "no_data" ? "text-[#6B7A94]" : "text-[#9A5B08]")}>{text}</p>;
}

export function CruxHistoryChart({ points, title }: { points: { periodEnd: string; lcpMs: number | null; inpMs: number | null; cls: number | null }[] | null; title: string }) {
  if (!points || points.length < 2) {
    return <p className="text-[11px] text-[#94A3B8]">{title}: {points && points.length === 1 ? "only one collection period is available — a trend needs at least two." : "no history returned by Google."}</p>;
  }
  const data = points.map((p) => ({ date: p.periodEnd, LCP: p.lcpMs !== null ? Math.round(p.lcpMs) : null, INP: p.inpMs !== null ? Math.round(p.inpMs) : null }));
  return (
    <div>
      <p className="mb-1 text-[11px] font-semibold text-[#28354C]">{title}</p>
      <div className="h-[170px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 6, right: 8, left: -12, bottom: 0 }}>
            <CartesianGrid {...GRID_PROPS} />
            <XAxis dataKey="date" {...AXIS_PROPS} />
            <YAxis {...AXIS_PROPS} />
            <Tooltip content={makeTooltip((e) => `${e.value} ms`, (l) => l)} />
            <Line type="monotone" dataKey="LCP" stroke="#2563EB" strokeWidth={2} dot={{ r: 2 }} connectNulls isAnimationActive={false} />
            <Line type="monotone" dataKey="INP" stroke="#7C3AED" strokeWidth={2} dot={{ r: 2 }} connectNulls isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <p className="text-[10px] text-[#94A3B8]"><span className="font-semibold text-[#2563EB]">LCP</span> and <span className="font-semibold text-[#7C3AED]">INP</span> p75 per Google collection period (ms). Only periods Google returned are plotted.</p>
    </div>
  );
}

export function UnavailableNotice({ title, body, tone = "muted" }: { title: string; body: string; tone?: "muted" | "warn" }) {
  return (
    <div className={cn("flex items-start gap-2 rounded-lg border px-3 py-3", tone === "warn" ? "border-[#F5DDA8] bg-[#FEF6E3]" : "border-[#E6EBF4] bg-[#F8FAFC]")}>
      <Gauge className="mt-0.5 size-4 shrink-0 text-[#64748B]" aria-hidden />
      <div>
        <p className="text-[12.5px] font-semibold text-[#28354C]">{title}</p>
        <p className="mt-0.5 text-[11.5px] leading-relaxed text-[#5B6B85]">{body}</p>
      </div>
    </div>
  );
}
