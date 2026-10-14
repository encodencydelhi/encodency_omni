"use client";

/**
 * Server-generated reports (Milestone 7): generate → live progress → authorised download, history, and schedules.
 *
 * Nothing is faked on the client. A report is a background job; this panel only requests it, watches its status and
 * fetches the private file with the session. Schedules show as running only when the server says a scheduler exists.
 */

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, CalendarClock, CheckCircle2, Clock, Download, FileText, History, Info, Plus, Trash2, XCircle } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils/cn";
import {
  useCancelReport, useDeleteReport, useDeleteReportSchedule, useGenerateReport, useReportMeta, useReportSchedules, useReports, useSaveReportSchedule, useWebsitePages,
} from "../../data/hooks";
import { websiteRepository } from "../../data/repository";
import { formatDateTime, formatRelative } from "../../data/selectors";
import type { GenerateReportInput, ReportFormatKey, ReportScheduleInput, ReportScheduleView, ReportTypeKey, ReportView } from "../../data/types";
import { Chip, SegmentedControl, WButton } from "../ui/kit";

const field = "w-full rounded-md border border-[#DEE5EF] bg-white px-2.5 py-1.5 text-[12px] text-[#28354C] focus:border-[#2563EB] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20";

const TYPE_HINT: Record<ReportTypeKey, string> = {
  complete: "Everything in one document: health, SEO, performance, search, analytics, monitoring and AI actions.",
  technical_seo: "Crawl findings by severity with affected URLs, link and duplicate problems, and the page list.",
  page: "One page: on-page and technical checks, links, images, schema, performance, search data and history.",
  performance: "Lighthouse lab results per device, real-user Core Web Vitals where they exist, and opportunities.",
  search_console: "Clicks, impressions, CTR and position with top queries and pages, as reported by Google.",
  ga4: "Sessions, acquisition, top and landing pages, as reported by Google Analytics 4.",
  monitoring: "Uptime from recorded checks, incidents, SSL and DNS, and the alerts that were raised.",
  ai_actions: "Reviewed AI proposals with evidence and a 7/30-day action plan. Proposals, not verified facts.",
  comparison: "Score changes and scan history over the selected period.",
};

const CSV_TABLES: Partial<Record<ReportTypeKey, { id: string; label: string }[]>> = {
  complete: [{ id: "issues", label: "All issues" }, { id: "pages", label: "Pages" }],
  technical_seo: [{ id: "issues", label: "All issues" }, { id: "pages", label: "Pages" }, { id: "issue_counts", label: "Issue counts" }, { id: "broken_links", label: "Broken links" }],
  performance: [{ id: "lighthouse", label: "Lighthouse results" }, { id: "performance_pages", label: "Measured pages" }],
  search_console: [{ id: "queries", label: "Top queries" }, { id: "search_pages", label: "Top pages" }, { id: "search_devices", label: "Devices" }],
  ga4: [{ id: "acquisition", label: "Acquisition channels" }, { id: "ga4_top_pages", label: "Top pages" }, { id: "ga4_landing", label: "Landing pages" }],
  monitoring: [{ id: "incidents", label: "Incidents" }, { id: "alerts", label: "Alerts" }, { id: "ssl", label: "SSL" }],
  comparison: [{ id: "scans", label: "Scan history" }, { id: "score_change", label: "Score change" }],
  page: [{ id: "page_checks", label: "Checks" }, { id: "page_meta", label: "On-page elements" }],
};

const STATUS: Record<string, { label: string; tone: "info" | "good" | "warn" | "bad" | "muted" }> = {
  queued: { label: "Queued", tone: "info" },
  running: { label: "Generating", tone: "info" },
  completed: { label: "Ready", tone: "good" },
  partial: { label: "Ready — some data unavailable", tone: "warn" },
  failed: { label: "Failed", tone: "bad" },
  cancelled: { label: "Cancelled", tone: "muted" },
};

const bytes = (n: number | null) => (n === null ? "—" : n < 1024 ? `${n} B` : n < 1_048_576 ? `${(n / 1024).toFixed(0)} KB` : `${(n / 1_048_576).toFixed(1)} MB`);
const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const ZONES = ["Asia/Kolkata", "UTC", "Asia/Dubai", "Asia/Singapore", "Europe/London", "Europe/Berlin", "America/New_York", "America/Los_Angeles", "Australia/Sydney"];

/** Fetches the private file with the session and hands it to the browser. */
export async function downloadReportFile(clientId: string, id: string) {
  try {
    const { blob, fileName } = await websiteRepository.downloadReport(clientId, id);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  } catch (error) {
    toast.error("Download failed", { description: error instanceof Error ? error.message : undefined });
  }
}

/* ------------------------------------------------------------------ */
/* One report row / progress                                            */
/* ------------------------------------------------------------------ */

function ReportRow({ clientId, report, compact = false }: { clientId: string; report: ReportView; compact?: boolean }) {
  const cancel = useCancelReport(clientId);
  const del = useDeleteReport(clientId);
  const s = STATUS[report.status] ?? STATUS.queued!;
  const active = report.status === "queued" || report.status === "running";
  return (
    <li className="rounded-xl border border-[#E6EBF4] bg-white p-3" data-testid="report-row" data-status={report.status}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-[12.5px] font-semibold text-[#28354C]">
            {report.typeLabel} <span className="font-normal text-[#94A3B8]">· {report.format.toUpperCase()} · v{report.version}</span>
          </p>
          <p className="mt-0.5 text-[10.5px] text-[#6B7A94]">
            {report.params.from && report.params.to ? `${report.params.from} → ${report.params.to} · ` : ""}
            requested <span title={formatDateTime(report.createdAt)}>{formatRelative(report.createdAt)}</span>
            {report.scheduled ? " · scheduled" : ""}
            {report.sizeBytes !== null ? ` · ${bytes(report.sizeBytes)}` : ""}
          </p>
        </div>
        <Chip tone={s.tone} dot>{s.label}</Chip>
      </div>

      {active ? (
        <div className="mt-2.5">
          <div className="h-1.5 overflow-hidden rounded-full bg-[#EEF2F8]" role="progressbar" aria-valuenow={report.progress} aria-valuemin={0} aria-valuemax={100}>
            <div className="h-full rounded-full bg-[#2563EB] transition-all" style={{ width: `${Math.max(4, report.progress)}%` }} />
          </div>
          <p className="mt-1 text-[10.5px] text-[#6B7A94]">{report.stage ?? "Working…"} · {report.progress}%</p>
        </div>
      ) : null}

      {report.status === "failed" && report.error?.message ? (
        <p className="mt-2 flex items-start gap-1.5 text-[11px] text-[#C0261F]"><XCircle className="mt-0.5 size-3.5 shrink-0" aria-hidden />{report.error.message}</p>
      ) : null}

      {report.status === "partial" && report.notes.length && !compact ? (
        <ul className="mt-2 space-y-0.5 rounded-lg bg-[#FEF6E3] px-2.5 py-2 text-[10.5px] text-[#7A4B06]">
          {report.notes.slice(0, 4).map((n) => <li key={n} className="flex gap-1.5"><AlertTriangle className="mt-0.5 size-3 shrink-0" aria-hidden />{n}</li>)}
        </ul>
      ) : null}

      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
        {report.downloadable ? <WButton size="sm" tone="primary" icon={Download} onClick={() => void downloadReportFile(clientId, report.id)}>Download</WButton> : null}
        {active ? <WButton size="sm" disabled={cancel.isPending} onClick={() => cancel.mutate(report.id)}>Cancel</WButton> : null}
        {!active ? (
          <WButton size="sm" tone="ghost" icon={Trash2} disabled={del.isPending} onClick={() => del.mutate(report.id, { onSuccess: () => toast.success("Report deleted"), onError: (e) => toast.error(e instanceof Error ? e.message : "Could not delete") })}>
            Delete
          </WButton>
        ) : null}
      </div>
    </li>
  );
}

/* ------------------------------------------------------------------ */
/* Generate                                                              */
/* ------------------------------------------------------------------ */

function GenerateTab({ clientId, presetType, presetPageId }: { clientId: string; presetType?: ReportTypeKey; presetPageId?: string }) {
  const meta = useReportMeta(clientId);
  const pages = useWebsitePages(clientId);
  const reports = useReports(clientId);
  const generate = useGenerateReport(clientId);
  const [type, setType] = useState<ReportTypeKey>(presetType ?? "complete");
  const [format, setFormat] = useState<ReportFormatKey>("pdf");
  const [range, setRange] = useState(30);
  const [pageId, setPageId] = useState(presetPageId ?? "");
  const [table, setTable] = useState("");
  const [lastId, setLastId] = useState<string | null>(null);

  useEffect(() => { if (presetType) setType(presetType); }, [presetType]);
  useEffect(() => { if (presetPageId) setPageId(presetPageId); }, [presetPageId]);
  useEffect(() => { setTable(""); }, [type, format]);

  const current = useMemo(() => reports.data?.find((r) => r.id === lastId) ?? null, [reports.data, lastId]);
  const needsPage = type === "page";
  const tables = CSV_TABLES[type] ?? [];

  const submit = () => {
    const input: GenerateReportInput = { type, format, rangeDays: range, ...(needsPage ? { pageId } : {}), ...(format === "csv" && table ? { table } : {}) };
    generate.mutate(input, {
      onSuccess: (r) => { setLastId(r.id); toast.info("Report queued", { description: r.deduplicated ? "An identical report is already being generated." : "It will be ready shortly." }); },
      onError: (e) => toast.error("Could not start the report", { description: e instanceof Error ? e.message : undefined }),
    });
  };

  if (meta.isLoading) return <p className="text-[12px] text-[#6B7A94]">Loading report options…</p>;
  if (meta.error || !meta.data) return <p className="text-[12px] text-[#C0261F]">Reports are not available right now.</p>;

  return (
    <div className="space-y-3">
      <div>
        <label htmlFor="report-type" className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[#6B7A94]">Report</label>
        <select id="report-type" className={cn(field, "mt-1")} value={type} onChange={(e) => setType(e.target.value as ReportTypeKey)}>
          {meta.data.types.map((t) => <option key={t.type} value={t.type}>{t.label}</option>)}
        </select>
        <p className="mt-1 text-[11px] text-[#6B7A94]">{TYPE_HINT[type]}</p>
      </div>

      {needsPage ? (
        <div>
          <label htmlFor="report-page" className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[#6B7A94]">Page</label>
          <select id="report-page" className={cn(field, "mt-1")} value={pageId} onChange={(e) => setPageId(e.target.value)}>
            <option value="">Choose a page…</option>
            {(pages.data ?? []).map((p) => <option key={p.id} value={p.id}>{p.path} — {p.title.slice(0, 50)}</option>)}
          </select>
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="report-range" className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[#6B7A94]">Reporting period</label>
          <select id="report-range" className={cn(field, "mt-1")} value={range} onChange={(e) => setRange(Number(e.target.value))}>
            {meta.data.rangeOptions.map((d) => <option key={d} value={d}>Last {d} days</option>)}
          </select>
        </div>
        <div>
          <span className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[#6B7A94]">Format</span>
          <div className="mt-1">
            <SegmentedControl<ReportFormatKey> ariaLabel="Report format" value={format} onChange={setFormat} options={[{ value: "pdf", label: "PDF" }, { value: "csv", label: "CSV" }]} />
          </div>
        </div>
      </div>

      {format === "csv" ? (
        <div>
          <label htmlFor="report-table" className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[#6B7A94]">Table to export</label>
          <select id="report-table" className={cn(field, "mt-1")} value={table} onChange={(e) => setTable(e.target.value)}>
            <option value="">First available table</option>
            {tables.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
          </select>
          <p className="mt-1 text-[10.5px] text-[#94A3B8]">CSV contains one verified table. Empty cells mean “not measured”, never zero.</p>
        </div>
      ) : null}

      <div className="flex items-center justify-between gap-2">
        <p className="text-[10.5px] text-[#94A3B8]">Up to {meta.data.limits.dailyPerCompany} reports per 24 hours · kept {meta.data.limits.retentionDays} days · private to your team</p>
        <WButton tone="primary" icon={FileText} disabled={generate.isPending || (needsPage && !pageId)} disabledReason={needsPage && !pageId ? "Choose a page first" : "Starting…"} onClick={submit}>
          Generate report
        </WButton>
      </div>

      {current ? <ul className="space-y-2"><ReportRow clientId={clientId} report={current} /></ul> : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* History                                                                */
/* ------------------------------------------------------------------ */

function HistoryTab({ clientId }: { clientId: string }) {
  const reports = useReports(clientId);
  if (reports.isLoading) return <p className="text-[12px] text-[#6B7A94]">Loading history…</p>;
  if (reports.error) return <p className="text-[12px] text-[#C0261F]">Report history could not be loaded.</p>;
  if (!reports.data?.length) return <p className="rounded-lg border border-dashed border-[#CBD5E1] p-4 text-center text-[12px] text-[#6B7A94]">No reports have been generated for this website yet.</p>;
  return <ul className="space-y-2">{reports.data.map((r) => <ReportRow key={r.id} clientId={clientId} report={r} compact />)}</ul>;
}

/* ------------------------------------------------------------------ */
/* Schedules                                                              */
/* ------------------------------------------------------------------ */

const toInput = (s: ReportScheduleView): ReportScheduleInput => ({ name: s.name, type: s.type, format: s.format, frequency: s.frequency, dayOfWeek: s.dayOfWeek ?? 1, dayOfMonth: s.dayOfMonth ?? 1, timeOfDay: s.timeOfDay, timezone: s.timezone, rangeDays: s.rangeDays, recipients: s.recipients, deliverInApp: s.deliverInApp, enabled: s.enabled });

const EMPTY: ReportScheduleInput = { type: "complete", frequency: "weekly", dayOfWeek: 1, dayOfMonth: 1, timeOfDay: "08:00", timezone: "Asia/Kolkata", rangeDays: 30, recipients: [], deliverInApp: true, format: "pdf" };

export function ReportSchedulesPanel({ clientId }: { clientId: string }) {
  const meta = useReportMeta(clientId);
  const schedules = useReportSchedules(clientId);
  const save = useSaveReportSchedule(clientId);
  const del = useDeleteReportSchedule(clientId);
  const [editing, setEditing] = useState<{ id?: string; value: ReportScheduleInput; recipients: string } | null>(null);

  const running = meta.data?.scheduler.running ?? false;
  const startNew = () => setEditing({ value: { ...EMPTY }, recipients: "" });
  const edit = (s: ReportScheduleView) => setEditing({ id: s.id, recipients: s.recipients.join(", "), value: toInput(s) });

  const submit = () => {
    if (!editing) return;
    const recipients = editing.recipients.split(/[,;\n]/).map((x) => x.trim()).filter(Boolean);
    save.mutate({ id: editing.id, schedule: { ...editing.value, recipients } }, {
      onSuccess: () => { toast.success("Schedule saved"); setEditing(null); },
      onError: (e) => toast.error("Could not save the schedule", { description: e instanceof Error ? e.message : undefined }),
    });
  };

  return (
    <div className="space-y-3">
      {meta.data && !meta.data.scheduler.running ? (
        <div className="flex items-start gap-2 rounded-lg border border-[#F5DDA8] bg-[#FEF6E3] px-3 py-2 text-[11.5px] text-[#7A4B06]">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>{meta.data.scheduler.reason} Schedules are saved but will not run, so they are shown as inactive.</span>
        </div>
      ) : null}
      {meta.data && !meta.data.scheduler.emailConfigured ? (
        <div className="flex items-start gap-2 rounded-lg border border-[#E6EBF4] bg-[#F7F9FC] px-3 py-2 text-[11.5px] text-[#4A5A73]">
          <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>{meta.data.scheduler.emailReason}</span>
        </div>
      ) : null}

      {schedules.isLoading ? <p className="text-[12px] text-[#6B7A94]">Loading schedules…</p> : null}
      {schedules.data?.length === 0 && !editing ? <p className="rounded-lg border border-dashed border-[#CBD5E1] p-4 text-center text-[12px] text-[#6B7A94]">No scheduled reports. Create one to have a report generated and delivered automatically.</p> : null}

      <ul className="space-y-2">
        {schedules.data?.map((s) => {
          const live = s.enabled && running;
          return (
            <li key={s.id} className="rounded-xl border border-[#E6EBF4] bg-white p-3" data-testid="schedule-row">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-[12.5px] font-semibold text-[#28354C]">{s.name}</p>
                  <p className="mt-0.5 text-[10.5px] text-[#6B7A94]">
                    {s.typeLabel} · {s.format.toUpperCase()} · {s.frequency === "weekly" ? `every ${DAYS[s.dayOfWeek ?? 1]}` : s.frequency === "monthly" ? `day ${s.dayOfMonth ?? 1} of each month` : "every day"} at {s.timeOfDay} ({s.timezone}) · last {s.rangeDays} days
                  </p>
                  <p className="mt-0.5 text-[10.5px] text-[#6B7A94]">
                    Delivered {[s.deliverInApp ? "in-app" : null, s.recipients.length ? `by email to ${s.recipients.length} recipient${s.recipients.length === 1 ? "" : "s"}` : null].filter(Boolean).join(" and ")}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Chip tone={live ? "good" : s.enabled ? "warn" : "muted"} dot>{live ? "Active" : s.enabled ? "Not running on this server" : "Disabled"}</Chip>
                  <Switch aria-label={`Enable ${s.name}`} checked={s.enabled} onCheckedChange={(v) => save.mutate({ id: s.id, schedule: { ...toInput(s), enabled: v === true } })} />
                </div>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[10.5px] text-[#6B7A94]">
                <span className="inline-flex items-center gap-1"><Clock className="size-3" aria-hidden />Next run: {live && s.nextRunAt ? formatDateTime(s.nextRunAt) : "—"}</span>
                <span className="inline-flex items-center gap-1"><History className="size-3" aria-hidden />Last run: {s.lastRunAt ? `${formatRelative(s.lastRunAt)}${s.lastStatus ? ` (${s.lastStatus})` : ""}` : "never"}</span>
              </div>
              <div className="mt-2 flex gap-1.5">
                <WButton size="sm" onClick={() => edit(s)}>Edit</WButton>
                <WButton size="sm" tone="ghost" icon={Trash2} onClick={() => del.mutate(s.id, { onSuccess: () => toast.success("Schedule deleted") })}>Delete</WButton>
              </div>
            </li>
          );
        })}
      </ul>

      {editing ? (
        <div className="space-y-3 rounded-xl border border-[#BFD5F7] bg-[#F7FAFF] p-3.5" data-testid="schedule-form">
          <p className="text-[12px] font-semibold text-[#28354C]">{editing.id ? "Edit schedule" : "New scheduled report"}</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-[11px] font-semibold text-[#28354C]" htmlFor="sch-type">Report</label>
              <select id="sch-type" className={cn(field, "mt-1")} value={editing.value.type} onChange={(e) => setEditing({ ...editing, value: { ...editing.value, type: e.target.value as ReportTypeKey } })}>
                {(meta.data?.types ?? []).filter((t) => t.schedulable).map((t) => <option key={t.type} value={t.type}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[11px] font-semibold text-[#28354C]" htmlFor="sch-format">Format</label>
              <select id="sch-format" className={cn(field, "mt-1")} value={editing.value.format ?? "pdf"} onChange={(e) => setEditing({ ...editing, value: { ...editing.value, format: e.target.value as ReportFormatKey } })}>
                <option value="pdf">PDF</option><option value="csv">CSV</option>
              </select>
            </div>
            <div>
              <label className="text-[11px] font-semibold text-[#28354C]" htmlFor="sch-freq">Frequency</label>
              <select id="sch-freq" className={cn(field, "mt-1")} value={editing.value.frequency} onChange={(e) => setEditing({ ...editing, value: { ...editing.value, frequency: e.target.value as ReportScheduleInput["frequency"] } })}>
                <option value="daily">Daily</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option>
              </select>
            </div>
            {editing.value.frequency === "weekly" ? (
              <div>
                <label className="text-[11px] font-semibold text-[#28354C]" htmlFor="sch-dow">Day</label>
                <select id="sch-dow" className={cn(field, "mt-1")} value={editing.value.dayOfWeek ?? 1} onChange={(e) => setEditing({ ...editing, value: { ...editing.value, dayOfWeek: Number(e.target.value) } })}>
                  {DAYS.map((d, i) => <option key={d} value={i}>{d}</option>)}
                </select>
              </div>
            ) : null}
            {editing.value.frequency === "monthly" ? (
              <div>
                <label className="text-[11px] font-semibold text-[#28354C]" htmlFor="sch-dom">Day of month</label>
                <select id="sch-dom" className={cn(field, "mt-1")} value={editing.value.dayOfMonth ?? 1} onChange={(e) => setEditing({ ...editing, value: { ...editing.value, dayOfMonth: Number(e.target.value) } })}>
                  {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
            ) : null}
            <div>
              <label className="text-[11px] font-semibold text-[#28354C]" htmlFor="sch-time">Time</label>
              <input id="sch-time" type="time" className={cn(field, "mt-1")} value={editing.value.timeOfDay ?? "08:00"} onChange={(e) => setEditing({ ...editing, value: { ...editing.value, timeOfDay: e.target.value } })} />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-[#28354C]" htmlFor="sch-tz">Time zone</label>
              <select id="sch-tz" className={cn(field, "mt-1")} value={editing.value.timezone ?? "UTC"} onChange={(e) => setEditing({ ...editing, value: { ...editing.value, timezone: e.target.value } })}>
                {[...new Set([editing.value.timezone ?? "UTC", ...ZONES])].map((z) => <option key={z} value={z}>{z}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[11px] font-semibold text-[#28354C]" htmlFor="sch-range">Date range</label>
              <select id="sch-range" className={cn(field, "mt-1")} value={editing.value.rangeDays ?? 30} onChange={(e) => setEditing({ ...editing, value: { ...editing.value, rangeDays: Number(e.target.value) } })}>
                {(meta.data?.rangeOptions ?? [7, 14, 30, 60, 90]).map((d) => <option key={d} value={d}>Last {d} days</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-[11px] font-semibold text-[#28354C]" htmlFor="sch-rcpt">Email recipients <span className="font-normal text-[#94A3B8]">(comma separated)</span></label>
            <input id="sch-rcpt" className={cn(field, "mt-1")} value={editing.recipients} onChange={(e) => setEditing({ ...editing, recipients: e.target.value })} placeholder="client@company.com, team@company.com" />
          </div>
          <label className="flex items-center gap-2 text-[11.5px] text-[#28354C]">
            <Switch aria-label="Deliver in-app" checked={editing.value.deliverInApp ?? true} onCheckedChange={(v) => setEditing({ ...editing, value: { ...editing.value, deliverInApp: v === true } })} />
            Also notify owners and admins in-app
          </label>
          <div className="flex justify-end gap-2">
            <WButton onClick={() => setEditing(null)}>Cancel</WButton>
            <WButton tone="primary" icon={CheckCircle2} disabled={save.isPending} onClick={submit}>Save schedule</WButton>
          </div>
        </div>
      ) : (
        <WButton icon={Plus} onClick={startNew}>New scheduled report</WButton>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Composite                                                              */
/* ------------------------------------------------------------------ */

type Tab = "generate" | "history" | "schedules";

export function ReportsPanel({ clientId, presetType, presetPageId, initialTab = "generate" }: { clientId: string; presetType?: ReportTypeKey; presetPageId?: string; initialTab?: Tab }) {
  const [tab, setTab] = useState<Tab>(initialTab);
  useEffect(() => setTab(initialTab), [initialTab]);
  return (
    <div className="space-y-3">
      <SegmentedControl<Tab>
        ariaLabel="Report sections"
        value={tab}
        onChange={setTab}
        options={[{ value: "generate", label: "Generate" }, { value: "history", label: "History" }, { value: "schedules", label: "Schedules" }]}
      />
      {tab === "generate" ? <GenerateTab clientId={clientId} presetType={presetType} presetPageId={presetPageId} /> : null}
      {tab === "history" ? <HistoryTab clientId={clientId} /> : null}
      {tab === "schedules" ? <ReportSchedulesPanel clientId={clientId} /> : null}
      <p className="flex items-center gap-1.5 text-[10.5px] text-[#94A3B8]"><CalendarClock className="size-3" aria-hidden />Reports are generated in the background from stored, verified measurements. Unavailable data is labelled, never estimated.</p>
    </div>
  );
}
