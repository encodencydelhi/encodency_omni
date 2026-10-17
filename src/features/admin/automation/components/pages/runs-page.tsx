"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Activity, Ban, CheckCircle2, ChevronLeft, ChevronRight, Download, Hourglass, RotateCcw, Search, XCircle } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { AutomationPageActions } from "../../automation-page";
import { automationApi } from "../../data/automation-api";
import { errorMessage, useAutomationScope, useInvalidateAutomation, useRuns, useWorkflows } from "../../data/hooks";
import type { AutomationRunStatus } from "../../data/types";
import { EmptyPanel, KpiTile, PANEL, PanelHeader, RunStatusChip, downloadCsv, formatDateTime, formatDuration } from "../shared";

const STATUSES: AutomationRunStatus[] = ["Successful", "Failed", "Waiting", "Running", "Cancelled"];

export function RunsPage({ days, onOpenRun }: AutomationPageActions) {
  const { clientId } = useAutomationScope();
  const invalidate = useInvalidateAutomation();
  const [status, setStatus] = useState<AutomationRunStatus | "all">("all");
  const [workflowId, setWorkflowId] = useState("all");
  const [search, setSearch] = useState("");
  const [onlyTests, setOnlyTests] = useState<"all" | "live" | "test">("all");
  const [selected, setSelected] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState(false);
  const pageSize = 20;

  const { data: runs = [], isLoading, error, refetch, isFetching } = useRuns(clientId, { days, limit: 1000 }, { refetchInterval: 30_000 });
  const { data: workflows = [] } = useWorkflows(clientId, days);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return runs.filter((r) =>
      (status === "all" || r.status === status) &&
      (workflowId === "all" || r.workflowId === workflowId) &&
      (onlyTests === "all" || (onlyTests === "test" ? r.test : !r.test)) &&
      (!q || r.id.toLowerCase().includes(q) || (r.workflowName ?? "").toLowerCase().includes(q) || r.triggerEntity.label.toLowerCase().includes(q) || (r.triggerSource ?? "").toLowerCase().includes(q) || (r.errorSummary?.message ?? "").toLowerCase().includes(q)));
  }, [runs, status, workflowId, onlyTests, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const rows = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const count = (s: AutomationRunStatus) => runs.filter((r) => r.status === s).length;
  const finished = count("Successful") + count("Failed");
  const durations = runs.filter((r) => r.status === "Successful" && r.durationMs).map((r) => r.durationMs);
  const avgDuration = durations.length ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0;
  const retryable = filtered.filter((r) => selected.includes(r.id) && (r.status === "Failed" || r.status === "Cancelled"));

  const exportCsv = () => {
    if (!filtered.length) { toast.error("No runs to export"); return; }
    downloadCsv(`automation-runs-${new Date().toISOString().slice(0, 10)}.csv`, ["Run ID", "Workflow", "Status", "Trigger", "Record", "Started", "Duration (ms)", "Steps succeeded", "Steps total", "Error"],
      filtered.map((r) => [r.id, r.workflowName, r.status, r.triggerSource, r.triggerEntity.label, r.startedAt, r.durationMs, r.stepsSucceeded ?? 0, r.stepsTotal ?? r.steps.length, r.errorSummary?.message ?? ""]));
    toast.success(`Exported ${filtered.length} run${filtered.length === 1 ? "" : "s"}`);
  };

  const retrySelected = async () => {
    const groups = new Map<string, string[]>();
    for (const run of retryable) groups.set(run.clientId, [...(groups.get(run.clientId) ?? []), run.id]);
    setBusy(true);
    try {
      const results = (await Promise.all([...groups.entries()].map(([cid, ids]) => automationApi.bulkRetry(cid, ids)))).flat();
      const ok = results.filter((r) => r.ok).length;
      if (ok) toast.success(`Retried ${ok} run${ok === 1 ? "" : "s"}`);
      if (ok < results.length) toast.error(`${results.length - ok} could not be retried: ${results.find((r) => !r.ok)?.error ?? ""}`);
      setSelected([]);
      invalidate();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const rowAction = async (label: string, fn: () => Promise<unknown>) => {
    try { await fn(); invalidate(); toast.success(label); } catch (e) { toast.error(errorMessage(e)); }
  };

  return (
    <div className="space-y-1 pb-12">
      <div className="flex flex-col justify-between gap-2 rounded-xl border border-[#E6EBF4] bg-white px-3 py-2.5 shadow-[0_1px_2px_rgba(16,24,40,0.04),0_10px_28px_-18px_rgba(16,24,40,0.28)] md:flex-row md:items-center">
        <div className="flex flex-wrap items-center gap-2">
          <select aria-label="Status" value={status} onChange={(e) => { setStatus(e.target.value as typeof status); setPage(1); }} className="h-9 rounded-md border border-[#E2E8F0] bg-white px-3 text-[12px] font-medium text-[#334155]">
            <option value="all">All statuses</option>
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select aria-label="Workflow" value={workflowId} onChange={(e) => { setWorkflowId(e.target.value); setPage(1); }} className="h-9 max-w-[220px] rounded-md border border-[#E2E8F0] bg-white px-3 text-[12px] font-medium text-[#334155]">
            <option value="all">All workflows</option>
            {workflows.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
          <select aria-label="Run type" value={onlyTests} onChange={(e) => { setOnlyTests(e.target.value as typeof onlyTests); setPage(1); }} className="h-9 rounded-md border border-[#E2E8F0] bg-white px-3 text-[12px] font-medium text-[#334155]">
            <option value="all">Live + test runs</option>
            <option value="live">Live runs only</option>
            <option value="test">Test runs only</option>
          </select>
          <Link href="/admin/automation/logs" className="flex h-9 items-center gap-1.5 rounded-md border border-[#BFDBFE] bg-blue-50/50 px-3 text-[12px] font-bold text-[#2563EB] hover:bg-blue-50"><Activity className="size-3.5" /> Logs & DLQ →</Link>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#94A3B8]" />
            <input type="search" placeholder="Search run ID, workflow, record, error..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="h-9 w-[260px] rounded-md border border-[#E2E8F0] bg-white pl-9 pr-3 text-[12px] focus:border-[#3B82F6] focus:outline-none" />
          </div>
          <button type="button" disabled={!retryable.length || busy} onClick={() => void retrySelected()} className="flex h-9 items-center gap-1.5 rounded-md border border-[#E2E8F0] bg-white px-3 text-[12px] font-bold text-[#334155] hover:bg-slate-50 disabled:opacity-50"><RotateCcw className="size-3.5" /> Retry selected ({retryable.length})</button>
          <button type="button" onClick={exportCsv} className="flex h-9 items-center gap-1.5 rounded-md border border-[#E2E8F0] bg-white px-3 text-[12px] font-bold text-[#2563EB] hover:bg-slate-50"><Download className="size-3.5" /> Export CSV</button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-1 lg:grid-cols-6">
        <KpiTile icon={<div className="rounded-lg bg-[#EBF5FF] p-1.5 text-[#3B82F6]"><Activity className="size-4" /></div>} title="Runs" value={runs.length.toLocaleString()} hint={`last ${days} days`} />
        <KpiTile icon={<div className="rounded-lg bg-[#ECFDF5] p-1.5 text-[#10B981]"><CheckCircle2 className="size-4" /></div>} title="Successful" value={String(count("Successful"))} hint={finished ? `${Math.round((count("Successful") / finished) * 100)}% of finished` : "no finished runs"} />
        <KpiTile icon={<div className="rounded-lg bg-[#FEF2F2] p-1.5 text-[#EF4444]"><XCircle className="size-4" /></div>} title="Failed" value={String(count("Failed"))} hint="can be retried" />
        <KpiTile icon={<div className="rounded-lg bg-[#F5F3FF] p-1.5 text-[#7C3AED]"><Hourglass className="size-4" /></div>} title="Waiting" value={String(count("Waiting"))} hint="paused on a delay" />
        <KpiTile icon={<div className="rounded-lg bg-[#F1F5F9] p-1.5 text-[#64748B]"><Ban className="size-4" /></div>} title="Cancelled" value={String(count("Cancelled"))} hint="stopped manually" />
        <KpiTile icon={<div className="rounded-lg bg-[#FFFBEB] p-1.5 text-[#F59E0B]"><Activity className="size-4" /></div>} title="Avg. Duration" value={formatDuration(avgDuration)} hint="successful runs" />
      </div>

      <div className={`flex flex-col overflow-hidden p-4 ${PANEL}`}>
        <PanelHeader title={`Run history (${filtered.length})`} action={
          <span className="text-[10.5px] text-[#94A3B8]">{isFetching ? "Refreshing…" : "Auto-refreshes every 30s"}</span>
        } />
        {error ? (
          <EmptyPanel title="Runs could not be loaded" body={errorMessage(error)} action={<button type="button" onClick={() => void refetch()} className="text-[12px] font-semibold text-[#2563EB] hover:underline">Retry</button>} />
        ) : isLoading ? (
          <div className="space-y-2">{Array.from({ length: 5 }, (_, i) => <div key={i} className="h-10 animate-pulse rounded-md bg-slate-100" />)}</div>
        ) : filtered.length === 0 ? (
          <EmptyPanel title={runs.length ? "No runs match" : "No runs yet"} body={runs.length ? "Try different filters." : "Runs appear when an active workflow is triggered or you test one."} />
        ) : (
          <>
            <div className="-mx-4 overflow-x-auto">
              <table className="w-full text-left text-[12px]">
                <thead>
                  <tr className="whitespace-nowrap border-b border-[#E2E8F0] text-[#64748B]">
                    <th className="w-[30px] py-2 pl-4 pr-2"><input type="checkbox" aria-label="Select all on page" checked={rows.length > 0 && rows.every((r) => selected.includes(r.id))} onChange={(e) => setSelected((prev) => (e.target.checked ? Array.from(new Set([...prev, ...rows.map((r) => r.id)])) : prev.filter((id) => !rows.some((r) => r.id === id))))} /></th>
                    <th className="px-3 py-2 font-medium">Run</th>
                    <th className="px-3 py-2 font-medium">Workflow</th>
                    <th className="px-3 py-2 font-medium">Trigger</th>
                    <th className="px-3 py-2 font-medium">Record</th>
                    <th className="px-3 py-2 font-medium">Started</th>
                    <th className="px-3 py-2 font-medium">Duration</th>
                    <th className="px-3 py-2 font-medium">Steps</th>
                    <th className="px-3 py-2 font-medium">Status</th>
                    <th className="px-4 py-2 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1F5F9]">
                  {rows.map((r) => (
                    <tr key={r.id} className="cursor-pointer whitespace-nowrap hover:bg-[#F8FAFC]" onClick={() => onOpenRun(r)}>
                      <td className="py-2.5 pl-4 pr-2" onClick={(e) => e.stopPropagation()}><input type="checkbox" aria-label={`Select run ${r.id}`} checked={selected.includes(r.id)} onChange={(e) => setSelected((prev) => (e.target.checked ? [...prev, r.id] : prev.filter((id) => id !== r.id)))} /></td>
                      <td className="px-3 py-2.5 font-mono text-[11px] text-[#475569]">{r.id.slice(0, 8)}{r.test ? <span className="ml-1.5 rounded bg-[#FEF3C7] px-1 font-sans text-[9px] font-bold text-[#92400E]">TEST</span> : null}</td>
                      <td className="max-w-[200px] truncate px-3 py-2.5 font-medium text-[#111C3A]">{r.workflowName}</td>
                      <td className="px-3 py-2.5 text-[#64748B]">{(r.triggerSource ?? "").replace(/ \(test\)$/, "")}</td>
                      <td className="max-w-[160px] truncate px-3 py-2.5 text-[#64748B]">{r.triggerEntity.label}</td>
                      <td className="px-3 py-2.5 text-[#64748B]">{formatDateTime(r.startedAt)}</td>
                      <td className="px-3 py-2.5 text-[#64748B]">{formatDuration(r.durationMs)}</td>
                      <td className="px-3 py-2.5 text-[#64748B]">{r.stepsSucceeded ?? 0}/{r.stepsTotal ?? r.steps.length}</td>
                      <td className="px-3 py-2.5"><RunStatusChip status={r.status} /></td>
                      <td className="px-4 py-2.5 text-right" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild><button type="button" className="rounded-md border border-[#E2E8F0] px-2 py-1 text-[11px] font-semibold text-[#334155] hover:bg-slate-50">Actions</button></DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => onOpenRun(r)}>View details</DropdownMenuItem>
                            {r.status === "Failed" || r.status === "Cancelled" ? <DropdownMenuItem onClick={() => void rowAction("Run retried", () => automationApi.retryRun(r.clientId, r.id))}>Retry</DropdownMenuItem> : null}
                            {r.status === "Waiting" || r.status === "Running" ? <DropdownMenuItem variant="destructive" onClick={() => void rowAction("Run cancelled", () => automationApi.cancelRun(r.clientId, r.id))}>Cancel</DropdownMenuItem> : null}
                            <DropdownMenuItem onClick={() => { void navigator.clipboard.writeText(r.id); toast.success("Run ID copied"); }}>Copy run ID</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4 flex items-center justify-between text-[11px] text-[#64748B]">
              <span>Showing {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, filtered.length)} of {filtered.length}</span>
              <div className="flex items-center gap-1">
                <button type="button" aria-label="Previous page" disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)} className="grid size-7 place-items-center rounded border border-[#E2E8F0] disabled:opacity-40"><ChevronLeft className="size-3.5" /></button>
                <span className="px-2">Page {currentPage} of {totalPages}</span>
                <button type="button" aria-label="Next page" disabled={currentPage >= totalPages} onClick={() => setPage(currentPage + 1)} className="grid size-7 place-items-center rounded border border-[#E2E8F0] disabled:opacity-40"><ChevronRight className="size-3.5" /></button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
