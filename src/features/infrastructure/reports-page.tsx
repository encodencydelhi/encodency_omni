"use client";

import { useState } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, Eye, FileText, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { env } from "@/config/env";
import { apiClient } from "@/lib/api/client";
import { companyScopeHeaders } from "@/lib/api/company-scope";
import { formatDateTime } from "./format";
import { INFRA_KEY, errorMessage, useScope } from "./hooks";
import { useClientOptions } from "./dialogs";
import { Chip, ConfirmButton, EmptyState, Modal, Notice, Section, Skeleton, Spinner, Td, Th, btn, btnPrimary, field, useRoleFlags } from "./ui";

type Period = "daily" | "weekly" | "monthly" | "yearly" | "custom";
interface ReportRow {
  id: string;
  title: string;
  period: Period;
  from: string;
  to: string;
  status: "PENDING" | "RUNNING" | "READY" | "FAILED";
  ai: { requested: boolean; status: "ok" | "skipped" | "failed" | null; provider: string | null; model: string | null; error: string | null };
  includesBilling: boolean;
  risk: "low" | "medium" | "high" | null;
  findings: number | null;
  error: string | null;
  createdAt: string;
  completedAt: string | null;
}
interface Finding { id: string; severity: "critical" | "high" | "medium" | "low" | "info"; area: string; subject: string; title: string; evidence: string; recommendation: string }
interface ReportDetail extends ReportRow {
  narrative: null | {
    risk: "low" | "medium" | "high";
    summary: string;
    findings: Finding[];
    ai: null | { executiveSummary: string; highlights: string[]; priorities: Array<{ title: string; why: string; action: string; effort: string; findingIds: string[] }>; capacityOutlook: string; nextPeriodFocus: string[] };
  };
}

const PERIODS: Array<{ id: Period; label: string; hint: string }> = [
  { id: "daily", label: "Daily", hint: "Last 24 hours" },
  { id: "weekly", label: "Weekly", hint: "Last 7 days" },
  { id: "monthly", label: "Monthly", hint: "Last 30 days" },
  { id: "yearly", label: "Yearly", hint: "Last 365 days" },
  { id: "custom", label: "Custom", hint: "Pick dates" },
];
const SEV_TONE = { critical: "red", high: "orange", medium: "amber", low: "blue", info: "slate" } as const;
const RISK_TONE = { low: "green", medium: "amber", high: "red" } as const;

const api = {
  list: (c: string, s?: AbortSignal) => apiClient.request<ReportRow[]>({ method: "GET", path: "/infrastructure/reports", headers: companyScopeHeaders(c), signal: s }),
  get: (c: string, id: string, s?: AbortSignal) => apiClient.request<ReportDetail>({ method: "GET", path: `/infrastructure/reports/${id}`, headers: companyScopeHeaders(c), signal: s }),
  create: (c: string, body: Record<string, unknown>) => apiClient.request<ReportRow>({ method: "POST", path: "/infrastructure/reports", headers: companyScopeHeaders(c), body }),
  remove: (c: string, id: string) => apiClient.request<{ id: string }>({ method: "DELETE", path: `/infrastructure/reports/${id}`, headers: companyScopeHeaders(c) }),
};

async function downloadPdf(companyId: string, id: string) {
  const res = await fetch(`${env.apiBaseUrl}/infrastructure/reports/${id}/pdf`, { credentials: "include", headers: { "x-company-id": companyId } });
  if (!res.ok) throw new Error("The PDF could not be downloaded.");
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `infrastructure-report-${id.slice(0, 8)}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function ReportsPage() {
  const { companyId, ready } = useScope();
  const { canWrite } = useRoleFlags();
  const qc = useQueryClient();
  const [period, setPeriod] = useState<Period>("monthly");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [clientId, setClientId] = useState("");
  const [useAi, setUseAi] = useState(true);
  const [preview, setPreview] = useState<string | null>(null);
  const clients = useClientOptions(true);

  const list = useQuery({
    queryKey: [INFRA_KEY, companyId, "reports"],
    enabled: ready,
    queryFn: ({ signal }) => api.list(companyId, signal),
    placeholderData: keepPreviousData,
    // Poll only while a report is being built.
    refetchInterval: (q) => ((q.state.data ?? []).some((r) => r.status === "PENDING" || r.status === "RUNNING") ? 3000 : false),
  });
  const create = useMutation({
    mutationFn: () => api.create(companyId, { period, ...(period === "custom" ? { from, to } : {}), clientId: clientId || undefined, includeAi: useAi }),
    onSuccess: () => { toast.success("Report generation started."); void qc.invalidateQueries({ queryKey: [INFRA_KEY, companyId, "reports"] }); },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const remove = useMutation({
    mutationFn: (id: string) => api.remove(companyId, id),
    onSuccess: () => { toast.success("Report deleted."); void qc.invalidateQueries({ queryKey: [INFRA_KEY, companyId, "reports"] }); },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const busy = (list.data ?? []).some((r) => r.status === "PENDING" || r.status === "RUNNING");
  const customOk = period !== "custom" || (from && to && from <= to);

  return (
    <div className="space-y-1">
      <Section title="Generate Report" description="A complete infrastructure report for your DevOps team: servers, domains, SSL, billing and alerts, with findings and recommendations.">
        <div className="space-y-3">
          <div role="group" aria-label="Report period" className="flex flex-wrap gap-1">
            {PERIODS.map((p) => (
              <button key={p.id} type="button" aria-pressed={period === p.id} onClick={() => setPeriod(p.id)} className={`rounded-sm border px-3 py-1.5 text-left transition ${period === p.id ? "border-[#2563EB] bg-[#EFF5FE] text-[#1D4ED8]" : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"}`}>
                <span className="block text-xs font-semibold">{p.label}</span>
                <span className="block text-[10.5px] font-medium text-slate-500">{p.hint}</span>
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-end gap-2">
            {period === "custom" && (
              <>
                <label className="text-xs font-semibold text-slate-700">From<input type="date" className={`${field} mt-1 w-40`} value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} /></label>
                <label className="text-xs font-semibold text-slate-700">To<input type="date" className={`${field} mt-1 w-40`} value={to} min={from || undefined} max={new Date().toISOString().slice(0, 10)} onChange={(e) => setTo(e.target.value)} /></label>
              </>
            )}
            <label className="text-xs font-semibold text-slate-700">Client
              <select className={`${field} mt-1 w-56`} value={clientId} onChange={(e) => setClientId(e.target.value)}>
                <option value="">All Clients</option>
                {(clients.data ?? []).map((c) => <option key={c.id} value={c.id}>{c.displayName ?? c.name}</option>)}
              </select>
            </label>
            <label className="mb-2 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700">
              <input type="checkbox" checked={useAi} onChange={(e) => setUseAi(e.target.checked)} />
              <Sparkles className="size-3.5 text-[#2563EB]" aria-hidden />Add AI Analysis
            </label>
            <button type="button" className={btnPrimary} disabled={!canWrite || create.isPending || busy || !customOk || !ready} onClick={() => create.mutate()}>
              {create.isPending || busy ? <Spinner /> : <FileText className="size-3.5" />}{busy ? "Generating…" : "Generate Report"}
            </button>
          </div>
          {!canWrite && <p className="text-[11px] font-medium text-slate-500">Only Managers, Admins and Owners can generate reports.</p>}
          <p className="text-[11px] font-medium text-slate-500">
            {useAi ? "The AI writes the summary and prioritises actions from the stored facts only; it cannot add numbers. If the AI is unavailable the report is still produced from the rule-based findings." : "AI analysis is off: the summary is built from fixed rules."}
          </p>
        </div>
      </Section>

      <Section title="Reports" description="Newest first. A report is a snapshot of the period it covers." flush>
        {list.isLoading ? (
          <div className="p-4"><Skeleton className="h-24" /></div>
        ) : list.isError ? (
          <div className="p-4"><Notice tone="red" title="Reports could not be loaded">{errorMessage(list.error)}</Notice></div>
        ) : (list.data?.length ?? 0) === 0 ? (
          <EmptyState icon={FileText} title="No reports yet" description="Generate a daily, weekly, monthly, yearly or custom report above." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] border-collapse">
              <thead><tr><Th>Report</Th><Th>Status</Th><Th>Risk</Th><Th>Findings</Th><Th>AI Analysis</Th><Th>Created</Th><Th /></tr></thead>
              <tbody>
                {list.data!.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/70">
                    <Td><span className="font-semibold text-slate-900">{r.title}</span><div className="text-[11px] normal-case text-slate-500">{r.from.slice(0, 10)} to {r.to.slice(0, 10)}{r.includesBilling ? " · includes billing" : ""}</div></Td>
                    <Td>
                      {r.status === "READY" ? <Chip tone="green">Ready</Chip> : r.status === "FAILED" ? <span title={r.error ?? undefined}><Chip tone="red">Failed</Chip></span> : <Chip tone="blue">Generating…</Chip>}
                    </Td>
                    <Td>{r.risk ? <Chip tone={RISK_TONE[r.risk]}>{r.risk}</Chip> : "—"}</Td>
                    <Td>{r.findings ?? "—"}</Td>
                    <Td>
                      {r.ai.status === "ok" ? <span title={`${r.ai.provider} · ${r.ai.model}`}><Chip tone="green">AI Included</Chip></span>
                        : r.ai.status === "failed" ? <span title={r.ai.error ?? undefined}><Chip tone="amber">AI Unavailable</Chip></span>
                          : r.ai.status === "skipped" ? <span title={r.ai.error ?? undefined}><Chip>{r.ai.requested ? "AI Skipped" : "AI Off"}</Chip></span> : "—"}
                    </Td>
                    <Td>{formatDateTime(r.createdAt)}</Td>
                    <Td>
                      <span className="flex flex-wrap items-center gap-1.5">
                        <button type="button" className={btn} disabled={r.status !== "READY"} onClick={() => setPreview(r.id)}><Eye className="size-3.5" />View</button>
                        <button type="button" className={btnPrimary} disabled={r.status !== "READY"} onClick={() => void downloadPdf(companyId, r.id).catch((e) => toast.error(errorMessage(e)))}><Download className="size-3.5" />PDF</button>
                        {canWrite && <ConfirmButton label={<Trash2 className="size-3.5" />} confirmLabel="Delete" onConfirm={() => remove.mutate(r.id)} />}
                      </span>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      {preview && <PreviewDialog id={preview} companyId={companyId} onClose={() => setPreview(null)} />}
    </div>
  );
}

function PreviewDialog({ id, companyId, onClose }: { id: string; companyId: string; onClose: () => void }) {
  const q = useQuery({ queryKey: [INFRA_KEY, companyId, "report", id], queryFn: ({ signal }) => api.get(companyId, id, signal), staleTime: 60_000 });
  const n = q.data?.narrative;
  return (
    <Modal open onOpenChange={(o) => !o && onClose()} wide title={q.data?.title ?? "Report"} description={q.data ? `${q.data.from.slice(0, 10)} to ${q.data.to.slice(0, 10)}` : undefined}>
      {q.isLoading ? <Skeleton className="h-40" /> : q.isError || !n ? <Notice tone="red" title="The report could not be opened">{errorMessage(q.error)}</Notice> : (
        <div className="space-y-3 text-xs normal-case">
          <div className="flex items-center gap-2"><span className="font-semibold text-slate-600">Overall Risk</span><Chip tone={RISK_TONE[n.risk]}>{n.risk}</Chip>{q.data!.ai.status === "ok" ? <Chip tone="green">AI Included</Chip> : <Chip tone="amber">No AI Narrative</Chip>}</div>
          {q.data!.ai.status !== "ok" && q.data!.ai.error && <Notice tone="amber" title="AI analysis is not included">{q.data!.ai.error}</Notice>}
          <p className="whitespace-pre-line text-[12.5px] font-medium leading-relaxed text-slate-800">{n.ai?.executiveSummary ?? n.summary}</p>
          {n.ai && n.ai.priorities.length > 0 && (
            <div>
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Priority Actions</p>
              <ol className="list-decimal space-y-1.5 pl-4">{n.ai.priorities.map((p, i) => <li key={i}><span className="font-semibold text-slate-900">{p.title}</span> <span className="text-slate-600">— {p.action}</span></li>)}</ol>
            </div>
          )}
          <div>
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Findings ({n.findings.length})</p>
            {n.findings.length === 0 ? <p className="text-slate-600">No findings were raised.</p> : (
              <ul className="max-h-72 space-y-1 overflow-y-auto">
                {n.findings.map((f) => (
                  <li key={f.id} className="rounded-sm border border-slate-200 p-2">
                    <div className="flex items-center gap-1.5"><Chip tone={SEV_TONE[f.severity]}>{f.severity}</Chip><span className="font-semibold text-slate-900">{f.title}</span><span className="text-slate-500">· {f.subject}</span></div>
                    <p className="mt-1 text-slate-600">{f.evidence}</p>
                    <p className="mt-0.5 font-medium text-slate-800">{f.recommendation}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" className={btn} onClick={onClose}>Close</button>
            <button type="button" className={btnPrimary} onClick={() => void downloadPdf(companyId, id).catch((e) => toast.error(errorMessage(e)))}><Download className="size-3.5" />Download PDF</button>
          </div>
        </div>
      )}
    </Modal>
  );
}
