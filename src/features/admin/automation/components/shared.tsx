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

export function KpiTile({ icon, title, value, trend, hint, invertTrend = false }: { icon: ReactNode; title: string; value: string; trend?: number | null; hint?: string; invertTrend?: boolean }) {
  const showTrend = typeof trend === "number" && trend !== 0;
  const good = showTrend && (invertTrend ? trend! < 0 : trend! > 0);
  return (
    <div className="flex items-center gap-2.5 rounded-lg border border-[#E2E8F0] bg-white px-3 py-2 shadow-sm">
      <div className="shrink-0">{icon}</div>
      <div className="min-w-0 flex-1">
      <h4 className="truncate text-[11px] font-medium text-[#64748B]">{title}</h4>
      <div className="flex items-baseline gap-1.5">
        <span className="text-[19px] font-bold leading-tight text-[#111C3A]">{value}</span>
        {showTrend ? (
          <span className={`flex items-center text-[10.5px] font-bold ${good ? "text-[#10B981]" : "text-[#EF4444]"}`}>
            {trend! > 0 ? <TrendingUp className="mr-0.5 size-3" /> : <TrendingDown className="mr-0.5 size-3" />}
            {Math.abs(trend!)}%
          </span>
        ) : null}
      </div>
      <p className="truncate text-[10px] leading-tight text-[#94A3B8]">{hint ?? (showTrend ? "vs previous period" : " ")}</p>
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
