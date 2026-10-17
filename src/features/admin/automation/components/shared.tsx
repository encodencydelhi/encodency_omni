"use client";

import { AlertTriangle, CheckCircle2, Clock, Hourglass, TrendingDown, TrendingUp, XCircle } from "lucide-react";
import type { ReactNode } from "react";
import type { AutomationRunStatus, AutomationWorkflowStatus } from "../data/types";

/* ------------------------------------------------------------------ */
/* Periods                                                              */
/* ------------------------------------------------------------------ */

export interface PeriodOption {
  label: string;
  days: number;
}

export const PERIOD_OPTIONS: PeriodOption[] = [
  { label: "Last 7 days", days: 7 },
  { label: "Last 30 days", days: 30 },
  { label: "Last 90 days", days: 90 },
  { label: "Last 365 days", days: 365 },
];

export function periodRangeLabel(days: number): string {
  const end = new Date();
  const start = new Date(end.getTime() - days * 86_400_000);
  const fmt = (d: Date) => d.toLocaleDateString("en-IN", { month: "short", day: "2-digit", year: "numeric" });
  return `${fmt(start)} – ${fmt(end)}`;
}

/* ------------------------------------------------------------------ */
/* Formatting                                                           */
/* ------------------------------------------------------------------ */

export function timeAgo(iso?: string | null): string {
  if (!iso) return "—";
  const ms = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(ms)) return "—";
  const future = ms < 0;
  const abs = Math.abs(ms);
  const m = Math.round(abs / 60_000);
  const text = m < 1 ? "just now" : m < 60 ? `${m} min` : m < 60 * 24 ? `${Math.round(m / 60)} hr` : `${Math.round(m / 1440)} d`;
  if (text === "just now") return text;
  return future ? `in ${text}` : `${text} ago`;
}

export function formatDuration(ms?: number | null): string {
  if (!ms) return "—";
  if (ms < 1000) return `${ms}ms`;
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  return m < 60 ? `${m}m ${s % 60}s` : `${Math.floor(m / 60)}h ${m % 60}m`;
}

export function formatDateTime(iso?: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-IN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function downloadCsv(filename: string, header: string[], rows: Array<Array<string | number | null | undefined>>) {
  const cell = (v: string | number | null | undefined) => {
    const t = v === null || v === undefined ? "" : String(v);
    const safe = /^[=+\-@]/.test(t) && Number.isNaN(Number(t)) ? `'${t}` : t;
    return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
  };
  const csv = [header, ...rows].map((r) => r.map(cell).join(",")).join("\r\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/* ------------------------------------------------------------------ */
/* Status chips                                                         */
/* ------------------------------------------------------------------ */

const WORKFLOW_STATUS_STYLE: Record<AutomationWorkflowStatus, { chip: string; dot: string }> = {
  Active: { chip: "bg-[#ECFDF5] text-[#047857]", dot: "bg-[#10B981]" },
  Paused: { chip: "bg-[#FEF3C7] text-[#B45309]", dot: "bg-[#D97706]" },
  Draft: { chip: "bg-[#F1F5F9] text-[#475569]", dot: "bg-[#94A3B8]" },
  Error: { chip: "bg-[#FEF2F2] text-[#B91C1C]", dot: "bg-[#EF4444]" },
  Archived: { chip: "bg-[#F1F5F9] text-[#64748B]", dot: "bg-[#CBD5E1]" },
};

export function WorkflowStatusChip({ status }: { status: AutomationWorkflowStatus }) {
  const style = WORKFLOW_STATUS_STYLE[status] ?? WORKFLOW_STATUS_STYLE.Draft;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-bold ${style.chip}`}>
      <span className={`size-1.5 rounded-full ${style.dot}`} />
      {status}
    </span>
  );
}

const RUN_STATUS_STYLE: Record<AutomationRunStatus, { chip: string; icon: ReactNode }> = {
  Successful: { chip: "bg-[#ECFDF5] text-[#047857]", icon: <CheckCircle2 className="size-3 shrink-0" /> },
  Failed: { chip: "bg-[#FEF2F2] text-[#B91C1C]", icon: <XCircle className="size-3 shrink-0" /> },
  Running: { chip: "bg-[#EFF6FF] text-[#1D4ED8]", icon: <Clock className="size-3 shrink-0 animate-spin" /> },
  Waiting: { chip: "bg-[#F5F3FF] text-[#6D28D9]", icon: <Hourglass className="size-3 shrink-0" /> },
  Cancelled: { chip: "bg-[#F1F5F9] text-[#475569]", icon: <XCircle className="size-3 shrink-0" /> },
  "Partial Failure": { chip: "bg-[#FFFBEB] text-[#B45309]", icon: <AlertTriangle className="size-3 shrink-0" /> },
};

export function RunStatusChip({ status }: { status: AutomationRunStatus }) {
  const style = RUN_STATUS_STYLE[status] ?? RUN_STATUS_STYLE.Cancelled;
  return (
    <span className={`inline-flex items-center justify-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${style.chip}`}>
      {style.icon}
      {status}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* KPI card                                                             */
/* ------------------------------------------------------------------ */

export function KpiTile({ icon, title, value, trend, hint, badge, invertTrend = false }: { icon: ReactNode; title: string; value: string; trend?: number | null; hint?: string; badge?: ReactNode; invertTrend?: boolean }) {
  const showTrend = typeof trend === "number" && trend !== 0;
  const good = showTrend && (invertTrend ? trend! < 0 : trend! > 0);
  return (
    <div className="group relative flex items-center gap-2.5 overflow-hidden rounded-xl border border-[#E6EBF4] bg-gradient-to-b from-white via-white to-[#F9FBFE] px-3 py-2.5 shadow-[0_1px_2px_rgba(16,24,40,0.04),0_10px_28px_-18px_rgba(16,24,40,0.28)] transition-all duration-200 hover:-translate-y-px hover:border-[#C9D6EA] hover:shadow-[0_1px_2px_rgba(16,24,40,0.06),0_16px_32px_-20px_rgba(16,24,40,0.45)]">
      {/* Soft top accent keeps the tile readable at a glance without colouring text. */}
      <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#2563EB]/35 to-transparent" aria-hidden />
      <div className="shrink-0 rounded-[10px] ring-1 ring-inset ring-[#0F172A]/5 transition-transform duration-200 group-hover:scale-105">{icon}</div>
      <div className="min-w-0 flex-1">
      <h4 className="truncate text-[11px] font-semibold leading-tight text-[#64748B]">{title}</h4>
      <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
        <span className="text-[19px] font-bold leading-tight tracking-[-0.02em] text-[#111C3A] tabular-nums">{value}</span>
        {showTrend ? (
          <span className={`inline-flex items-center gap-0.5 rounded-md border px-1 py-px text-[10px] font-bold leading-none ${good ? "border-[#A7F3D0] bg-[#ECFDF5] text-[#047857]" : "border-[#FECACA] bg-[#FEF2F2] text-[#B91C1C]"}`}>
            {trend! > 0 ? <TrendingUp className="size-2.5" /> : <TrendingDown className="size-2.5" />}
            {Math.abs(trend!)}%
          </span>
        ) : null}
        {badge ? <span className="inline-flex items-center rounded-md border border-[#A7F3D0] bg-[#ECFDF5] px-1.5 py-px text-[10px] font-bold leading-none text-[#047857]">{badge}</span> : null}
      </div>
      <p className="truncate text-[10px] font-medium leading-tight text-[#94A3B8]">{hint ?? (showTrend ? "vs previous period" : " ")}</p>
      </div>
    </div>
  );
}

export function EmptyPanel({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
      <p className="text-[13px] font-semibold text-[#111C3A]">{title}</p>
      <p className="max-w-sm text-[11.5px] text-[#64748B]">{body}</p>
      {action}
    </div>
  );
}

export const TRIGGER_OPTIONS = [
  { id: "new_lead", label: "New Lead" },
  { id: "meta_lead", label: "New Meta Lead" },
  { id: "new_customer", label: "New Customer" },
  { id: "form_submission", label: "Form Submission" },
  { id: "inbound_webhook", label: "Inbound Webhook" },
  { id: "website_down", label: "Website Down" },
  { id: "manual", label: "Manual Trigger" },
] as const;

export function channelLabel(channel: string): string {
  const map: Record<string, string> = { whatsapp: "WhatsApp", email: "Email", meta: "Meta", system: "System" };
  return map[channel] ?? channel;
}

/* ------------------------------------------------------------------ */
/* Surfaces                                                            */
/* ------------------------------------------------------------------ */

/** Elevated white panel used by every automation card (mirrors the website UI kit CARD). */
export const PANEL =
  "rounded-xl border border-[#E6EBF4] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04),0_10px_28px_-18px_rgba(16,24,40,0.28)] transition-shadow duration-200 hover:border-[#D5DDEA] hover:shadow-[0_1px_2px_rgba(16,24,40,0.06),0_16px_32px_-20px_rgba(16,24,40,0.45)]";

/**
 * Full-bleed header band for a `PANEL` card. The parent card must use
 * `p-4 overflow-hidden` so the band's `-mx-4 -mt-4` aligns with its edges.
 */
export function PanelHeader({ title, sub, action }: { title: string; sub?: ReactNode; action?: ReactNode }) {
  return (
    <div className="-mx-4 -mt-4 mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-[#EEF2F8] bg-gradient-to-b from-[#FBFCFE] to-white px-4 py-2.5">
      <div className="flex min-w-0 items-center gap-2">
        <span className="h-3.5 w-1 shrink-0 rounded-full bg-gradient-to-b from-[#3B82F6] to-[#2563EB]" aria-hidden />
        <div className="min-w-0">
          <h3 className="text-[12.5px] font-semibold tracking-[-0.01em] text-[#111C3A]">{title}</h3>
          {sub ? <p className="text-[10.5px] leading-snug text-[#6B7A94]">{sub}</p> : null}
        </div>
      </div>
      {action ? <div className="flex flex-wrap shrink-0 items-center gap-1.5">{action}</div> : null}
    </div>
  );
}
