"use client";

import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { ArrowRight, CheckCircle2, ChevronLeft, ChevronRight, FileText, GitMerge, PauseCircle, Play, Search, Activity } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ChannelLogo } from "@/features/admin/shared/channel-logo";
import { useAdminContext } from "@/features/admin/shell/admin-context";
import type { AutomationPageActions } from "../../automation-page";
import { automationApi } from "../../data/automation-api";
import { errorMessage, useAutomationScope, useAutomationTemplates, useInvalidateAutomation, useWorkflows } from "../../data/hooks";
import type { AutomationWorkflow, AutomationWorkflowStatus } from "../../data/types";
import { EmptyPanel, KpiTile, PANEL, PanelHeader, TRIGGER_OPTIONS, WorkflowStatusChip, channelLabel, timeAgo } from "../shared";
import { WorkflowActions } from "../workflow-actions";

const SORTS = [
  { value: "updated", label: "Last updated" },
  { value: "name", label: "Name (A–Z)" },
  { value: "runs", label: "Most runs" },
  { value: "success", label: "Lowest success rate" },
] as const;

const select = "h-8 rounded-md border border-[#E2E8F0] bg-white px-2 text-[11.5px] font-medium text-[#334155] focus:border-[#3B82F6] focus:outline-none";

export function WorkflowsPage({ days, onEdit, onCreate, onTest, onUseTemplate }: AutomationPageActions) {
  const { clientId } = useAutomationScope();
  const { Clients } = useAdminContext();
  const invalidate = useInvalidateAutomation();
  const importRef = useRef<HTMLInputElement>(null);
  const { data: workflows = [], isLoading, error, refetch } = useWorkflows(clientId, days);
  const { data: templates = [] } = useAutomationTemplates(clientId);

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [trigger, setTrigger] = useState<string>("all");
  const [channel, setChannel] = useState<string>("all");
  const [sort, setSort] = useState<(typeof SORTS)[number]["value"]>("updated");
  const [selected, setSelected] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [bulkDelete, setBulkDelete] = useState(false);
  const [bulkBusy, setBulkBusy] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const rows = workflows.filter((wf) =>
      (!q || wf.name.toLowerCase().includes(q) || wf.trigger.label.toLowerCase().includes(q) || (wf.ownerName ?? "").toLowerCase().includes(q)) &&
      (status === "all" || wf.status === status) &&
      (trigger === "all" || wf.trigger.type === trigger) &&
      (channel === "all" || wf.channels.includes(channel)));
    return [...rows].sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name);
      if (sort === "runs") return b.runs - a.runs;
      if (sort === "success") return (a.successRate ?? 101) - (b.successRate ?? 101);
      return b.updatedAt.localeCompare(a.updatedAt);
    });
  }, [workflows, search, status, trigger, channel, sort]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageRows = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const allOnPageSelected = pageRows.length > 0 && pageRows.every((wf) => selected.includes(wf.id));

  const count = (s: AutomationWorkflowStatus) => workflows.filter((w) => w.status === s).length;
  const rated = workflows.filter((w) => w.successRate !== null);
  const avgSuccess = rated.length ? Math.round((rated.reduce((n, w) => n + (w.successRate ?? 0), 0) / rated.length) * 10) / 10 : null;
  const runsInPeriod = workflows.reduce((n, w) => n + w.runs, 0);
  const activeFilters = [status, trigger, channel].filter((v) => v !== "all").length + (search ? 1 : 0);
  const channels = Array.from(new Set(workflows.flatMap((w) => w.channels)));
  const triggerCounts = TRIGGER_OPTIONS.map((t) => ({ ...t, count: workflows.filter((w) => w.trigger.type === t.id).length })).filter((t) => t.count > 0);

  const bulk = async (label: string, fn: (wf: AutomationWorkflow) => Promise<unknown>) => {
    const targets = workflows.filter((w) => selected.includes(w.id));
    setBulkBusy(true);
    const results = await Promise.allSettled(targets.map(fn));
    const failed = results.filter((r) => r.status === "rejected") as PromiseRejectedResult[];
    invalidate();
    setBulkBusy(false);
    setBulkDelete(false);
    if (failed.length < targets.length) toast.success(`${label}: ${targets.length - failed.length} workflow${targets.length - failed.length === 1 ? "" : "s"}`);
    if (failed.length) toast.error(`${failed.length} could not be updated: ${errorMessage(failed[0]!.reason)}`);
    setSelected([]);
  };

  /** One click: creates and publishes every recommended automation this client does not have yet. */
  const activateRecommended = async () => {
    if (!clientId) return;
    setBulkBusy(true);
    try {
      const result = await automationApi.provisionRecommended(clientId);
      invalidate();
      if (result.created.length) toast.success(`${result.created.length} automation${result.created.length === 1 ? "" : "s"} switched on. ${result.skipped.length} you already had.`);
      else toast.info("Everything recommended is already switched on.");
      if (result.failed.length) toast.error(`${result.failed.length} could not be created: ${result.failed[0]!.reason}`);
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBulkBusy(false);
    }
  };

  /** Reads an exported workflow file and creates it as a DRAFT in the selected client. */
  const importFile = async (file: File) => {
    if (!clientId) return;
    try {
      if (file.size > 512_000) throw new Error("The file is larger than 512 KB.");
      const document = JSON.parse(await file.text()) as Record<string, unknown>;
      const result = await automationApi.importWorkflow(clientId, document);
      invalidate();
      toast.success(`Imported “${result.workflow.name}” as a draft. Review it before publishing.`);
      if (result.warnings.length) toast.info(`${result.warnings.length} thing(s) to fix first: ${result.warnings.slice(0, 2).join(" ")}${result.warnings.length > 2 ? " …" : ""}`, { duration: 12000 });
    } catch (error) {
      toast.error(error instanceof SyntaxError ? "That file is not valid JSON." : errorMessage(error));
    }
  };

  const clientNameOf = (id: string) => Clients.find((c) => c.id === id)?.name ?? "";

  return (
    <div className="space-y-1 pb-12">
      <div className="grid grid-cols-2 gap-1 lg:grid-cols-6">
        <KpiTile icon={<div className="rounded-lg bg-[#EBF5FF] p-1.5 text-[#3B82F6]"><GitMerge className="size-4" /></div>} title="Total Workflows" value={String(workflows.length)} hint="all statuses" />
        <KpiTile icon={<div className="rounded-full bg-[#ECFDF5] p-1.5 text-[#10B981]"><Play className="size-4" /></div>} title="Active" value={String(count("Active"))} hint="running on live events" />
        <KpiTile icon={<div className="rounded-lg bg-[#F0F9FF] p-1.5 text-[#0EA5E9]"><FileText className="size-4" /></div>} title="Drafts" value={String(count("Draft"))} hint="not published yet" />
        <KpiTile icon={<div className="rounded-full bg-[#FEF3C7] p-1.5 text-[#D97706]"><PauseCircle className="size-4" /></div>} title="Paused" value={String(count("Paused"))} hint="ignore new events" />
        <KpiTile icon={<div className="rounded-full bg-[#ECFDF5] p-1.5 text-[#10B981]"><CheckCircle2 className="size-4" /></div>} title="Avg. Success Rate" value={avgSuccess === null ? "—" : `${avgSuccess}%`} hint={`workflows with runs in ${days}d`} />
        <KpiTile icon={<div className="rounded-full bg-[#F5F3FF] p-1.5 text-[#8B5CF6]"><Activity className="size-4" /></div>} title="Runs" value={runsInPeriod.toLocaleString()} hint={`last ${days} days`} />
      </div>

      <div className={`flex flex-col overflow-hidden p-4 ${PANEL}`}>
        <PanelHeader title={`Workflows (${filtered.length})`} sub="Create, manage and monitor your automation workflows." action={
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-[#94A3B8]" />
              <input type="search" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Search workflows..." className="h-8 w-[200px] rounded-md border border-[#E2E8F0] pl-8 pr-3 text-[12px] focus:border-[#3B82F6] focus:outline-none" />
            </div>
            <select aria-label="Sort by" className={select} value={sort} onChange={(e) => setSort(e.target.value as typeof sort)}>
              {SORTS.map((s) => <option key={s.value} value={s.value}>Sort: {s.label}</option>)}
            </select>
            <input ref={importRef} type="file" accept="application/json,.json" className="hidden" aria-label="Import workflow file" onChange={(e) => { const file = e.target.files?.[0]; e.target.value = ""; if (file) void importFile(file); }} />
            <button type="button" disabled={!clientId || bulkBusy} onClick={() => void activateRecommended()} className="flex h-8 items-center gap-1 rounded-md border border-[#BBF7D0] bg-emerald-50/60 px-3 text-[12px] font-medium text-[#047857] hover:bg-emerald-50 disabled:opacity-50">Activate recommended</button>
            <button type="button" disabled={!clientId} onClick={() => importRef.current?.click()} className="flex h-8 items-center gap-1 rounded-md border border-[#E2E8F0] bg-white px-3 text-[12px] font-medium text-[#334155] hover:bg-[#F8FAFC] disabled:opacity-50">Import</button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button type="button" disabled={!selected.length || bulkBusy} className="flex h-8 items-center gap-1 rounded-md border border-[#BFDBFE] bg-blue-50/50 px-3 text-[12px] font-medium text-[#2563EB] hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50">
                  Bulk actions {selected.length ? `(${selected.length})` : ""}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => void bulk("Activated", (wf) => automationApi.setWorkflowStatus(wf.clientId, wf.id, "Active"))}>Activate</DropdownMenuItem>
                <DropdownMenuItem onClick={() => void bulk("Paused", (wf) => automationApi.setWorkflowStatus(wf.clientId, wf.id, "Paused"))}>Pause</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onClick={() => setBulkDelete(true)}>Delete…</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        } />

        <div className="mb-3 flex flex-wrap items-center gap-2">
          <select aria-label="Status" className={select} value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
            <option value="all">All statuses</option>
            {(["Active", "Draft", "Paused", "Error"] as const).map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select aria-label="Trigger" className={select} value={trigger} onChange={(e) => { setTrigger(e.target.value); setPage(1); }}>
            <option value="all">All triggers</option>
            {TRIGGER_OPTIONS.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
          </select>
          <select aria-label="Channel" className={select} value={channel} onChange={(e) => { setChannel(e.target.value); setPage(1); }}>
            <option value="all">All channels</option>
            {channels.map((c) => <option key={c} value={c}>{channelLabel(c)}</option>)}
          </select>
          {activeFilters ? <button type="button" onClick={() => { setSearch(""); setStatus("all"); setTrigger("all"); setChannel("all"); setPage(1); }} className="text-[11.5px] font-semibold text-[#2563EB] hover:underline">Clear filters ({activeFilters})</button> : null}
        </div>

        {error ? (
          <EmptyPanel title="Workflows could not be loaded" body={errorMessage(error)} action={<button type="button" onClick={() => void refetch()} className="text-[12px] font-semibold text-[#2563EB] hover:underline">Retry</button>} />
        ) : isLoading ? (
          <div className="space-y-2">{Array.from({ length: 4 }, (_, i) => <div key={i} className="h-10 animate-pulse rounded-md bg-slate-100" />)}</div>
        ) : workflows.length === 0 ? (
          <EmptyPanel title="No workflows yet" body={clientId ? "Create one from scratch or start from a template." : "Select a client to create workflows."} action={<button type="button" onClick={onCreate} className="rounded-md bg-[#2563EB] px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-[#1D4ED8]">Create Workflow</button>} />
        ) : filtered.length === 0 ? (
          <EmptyPanel title="No workflows match" body="Try different filters." />
        ) : (
          <>
            <div className="-mx-4 overflow-x-auto">
              <table className="w-full text-left text-[12px]">
                <thead>
                  <tr className="whitespace-nowrap border-b border-[#E2E8F0] text-[#64748B]">
                    <th className="w-[30px] py-2 pl-4 pr-2"><input type="checkbox" aria-label="Select all on page" checked={allOnPageSelected} onChange={(e) => setSelected((prev) => (e.target.checked ? Array.from(new Set([...prev, ...pageRows.map((w) => w.id)])) : prev.filter((id) => !pageRows.some((w) => w.id === id))))} /></th>
                    <th className="px-3 py-2 font-medium">Workflow</th>
                    <th className="px-3 py-2 font-medium">Trigger</th>
                    <th className="px-3 py-2 font-medium">Channels</th>
                    <th className="px-3 py-2 font-medium">Owner</th>
                    <th className="px-3 py-2 font-medium">Updated</th>
                    <th className="px-3 py-2 text-right font-medium">Runs ({days}d)</th>
                    <th className="px-3 py-2 text-right font-medium">Success</th>
                    <th className="px-3 py-2 font-medium">Status</th>
                    <th className="px-4 py-2 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1F5F9]">
                  {pageRows.map((wf) => (
                    <tr key={wf.id} className="cursor-pointer whitespace-nowrap transition-colors hover:bg-[#F8FAFC]" onClick={() => onEdit(wf)}>
                      <td className="w-[30px] py-2.5 pl-4 pr-2" onClick={(e) => e.stopPropagation()}>
                        <input type="checkbox" aria-label={`Select ${wf.name}`} checked={selected.includes(wf.id)} onChange={(e) => setSelected((prev) => (e.target.checked ? [...prev, wf.id] : prev.filter((id) => id !== wf.id)))} />
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="font-bold text-[#111C3A]">{wf.name}</div>
                        {!clientId ? <div className="text-[10.5px] text-[#94A3B8]">{clientNameOf(wf.clientId)}</div> : null}
                      </td>
                      <td className="px-3 py-2.5 text-[#64748B]">{wf.trigger.label}</td>
                      <td className="px-3 py-2.5">
                        {wf.channels.length ? (
                          <div className="flex items-center -space-x-1">{wf.channels.map((ch) => <ChannelLogo key={ch} channel={channelLabel(ch)} className="size-5 rounded-full border border-white bg-white shadow-2xs" />)}</div>
                        ) : <span className="text-[#94A3B8]">—</span>}
                      </td>
                      <td className="px-3 py-2.5 text-[11.5px] text-[#475569]">{wf.ownerName ?? "—"}</td>
                      <td className="px-3 py-2.5 text-[#64748B]">{timeAgo(wf.updatedAt)}</td>
                      <td className="px-3 py-2.5 text-right font-medium text-[#111C3A]">{wf.runs.toLocaleString()}</td>
                      <td className={`px-3 py-2.5 text-right font-semibold ${wf.successRate === null ? "text-[#94A3B8]" : wf.successRate >= 95 ? "text-[#10B981]" : "text-[#D97706]"}`}>{wf.successRate === null ? "—" : `${wf.successRate}%`}</td>
                      <td className="px-3 py-2.5"><WorkflowStatusChip status={wf.status} /></td>
                      <td className="px-4 py-2.5 text-right" onClick={(e) => e.stopPropagation()}><WorkflowActions workflow={wf} onEdit={onEdit} onTest={onTest} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#64748B]">
              <div>Showing {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, filtered.length)} of {filtered.length}</div>
              <div className="flex items-center gap-1">
                <button type="button" aria-label="Previous page" disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)} className="grid size-7 place-items-center rounded border border-[#E2E8F0] hover:bg-slate-50 disabled:opacity-40"><ChevronLeft className="size-3.5" /></button>
                <span className="px-2">Page {currentPage} of {totalPages}</span>
                <button type="button" aria-label="Next page" disabled={currentPage >= totalPages} onClick={() => setPage(currentPage + 1)} className="grid size-7 place-items-center rounded border border-[#E2E8F0] hover:bg-slate-50 disabled:opacity-40"><ChevronRight className="size-3.5" /></button>
                <select aria-label="Rows per page" className="ml-2 rounded border border-[#E2E8F0] px-1.5 py-1" value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}>
                  {[10, 25, 50].map((n) => <option key={n} value={n}>{n} per page</option>)}
                </select>
              </div>
            </div>
          </>
        )}
      </div>

      <div className="grid grid-cols-1 gap-1 lg:grid-cols-2">
        <div className={`flex flex-col overflow-hidden p-4 ${PANEL}`}>
          <PanelHeader title="Workflows by trigger" sub="Click a trigger to filter the table above." />
          {triggerCounts.length === 0 ? <p className="text-[11.5px] text-[#64748B]">No workflows yet.</p> : (
            <div className="space-y-1">
              {triggerCounts.map((t) => (
                <button key={t.id} type="button" onClick={() => { setTrigger(t.id); setPage(1); }} className="flex w-full items-center gap-2 rounded-md px-1 py-1 text-left transition-colors hover:bg-[#F8FAFC]">
                  <span className="w-32 truncate text-[11.5px] text-[#334155]">{t.label}</span>
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#F1F5F9]"><div className="h-full rounded-full bg-gradient-to-r from-[#3B82F6] to-[#2563EB]" style={{ width: `${(t.count / workflows.length) * 100}%` }} /></div>
                  <span className="w-6 text-right text-[11px] font-bold text-[#111C3A]">{t.count}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <div className={`flex flex-col overflow-hidden p-4 ${PANEL}`}>
          <PanelHeader title="Quick templates" sub="Start from a proven workflow." />
          <div className="grid grid-cols-2 gap-1">
            {templates.slice(0, 4).map((tpl) => (
              <div key={tpl.id} className="group/tpl flex flex-col rounded-lg border border-[#E6EBF4] bg-gradient-to-b from-white to-[#FAFBFD] p-2.5 transition-all duration-200 hover:-translate-y-px hover:border-[#C9D6EA] hover:bg-white hover:shadow-[0_1px_2px_rgba(16,24,40,0.05),0_12px_24px_-18px_rgba(16,24,40,0.4)]">
                <div className="text-[11px] font-bold leading-tight text-[#111C3A] group-hover/tpl:text-[#1D4ED8]">{tpl.name}</div>
                <div className="mb-2 mt-1 line-clamp-2 text-[10px] leading-tight text-[#64748B]">{tpl.description}</div>
                <button type="button" onClick={() => void onUseTemplate(tpl.id)} className="mt-auto inline-flex cursor-pointer items-center justify-center gap-1 rounded-md border border-[#BFDBFE] bg-blue-50/60 py-1 text-[10.5px] font-semibold text-[#2563EB] transition-colors hover:border-[#2563EB] hover:bg-[#2563EB] hover:text-white">Use template <ArrowRight className="size-3" /></button>
              </div>
            ))}
          </div>
        </div>
      </div>

      <AlertDialog open={bulkDelete} onOpenChange={setBulkDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selected.length} workflow{selected.length === 1 ? "" : "s"}?</AlertDialogTitle>
            <AlertDialogDescription>They are deleted permanently together with their run history.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" disabled={bulkBusy} onClick={() => void bulk("Deleted", (wf) => automationApi.deleteWorkflow(wf.clientId, wf.id))}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
