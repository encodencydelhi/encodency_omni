"use client";

import { ActionPreviewCard, previewOf } from "../action-preview-card";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { AlertTriangle, ArrowLeft, ChevronFirst, ChevronLast, ChevronLeft, ChevronRight, Copy, ExternalLink, GitBranch, Link2, Lock, RefreshCw, RotateCcw, ShieldAlert, Ban } from "lucide-react";
import { toast } from "sonner";
import { automationApi } from "../../data/automation-api";
import { errorMessage } from "../../data/hooks";
import type { RunTrace, TraceEvent, TraceNode } from "../../data/trace-types";
import { DuplicateRiskDialog } from "../logs/duplicate-risk-dialog";
import { EVENT_FILTERS, EVENT_SOURCE_LABEL, NODE_STATE_STYLE, STATE_ORDER, edgeVisual, filterEvents, formatMs, stateCounts, stepEvent, type EventFilterId } from "./debugger-utils";
import { FlowCanvas, type FlowEdgeInput, type FlowNodeInput } from "./flow-canvas";

type Tab = "node" | "timeline" | "investigation" | "relations";

const FAILURE_CLASS_LABEL: Record<string, string> = {
  retries_exhausted: "Retries Exhausted — the step kept failing with a retryable error.",
  permanent: "Permanent Failure — the step cannot succeed without a configuration or data change.",
  unknown_outcome: "Unknown Outcome — the provider may already have processed the request.",
  quota: "Quota Reached — a configured run or action limit blocked the run.",
  runtime: "Runtime Error — an unexpected error stopped the run.",
  stalled: "Stalled — the worker stopped before the run finished.",
};

const time = (iso: string | null) => (iso ? new Date(iso).toLocaleTimeString(undefined, { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" }) + "." + String(new Date(iso).getMilliseconds()).padStart(3, "0") : "—");
const dateTime = (iso: string | null) => (iso ? new Date(iso).toLocaleString() : "—");

function Json({ value }: { value: unknown }) {
  if (value === null || value === undefined) return <p className="text-[11px] text-slate-400">Data Unavailable</p>;
  return <pre className="max-h-48 overflow-auto rounded border border-slate-200 bg-slate-50 p-2 font-mono text-[10px] leading-relaxed text-slate-700">{JSON.stringify(value, null, 2)}</pre>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="min-w-0"><dt className="text-[10px] font-medium text-slate-500">{label}</dt><dd className="mt-0.5 break-words text-[11px] font-medium text-slate-900">{children}</dd></div>;
}

/**
 * Read-only visual inspection of one historical run. The graph is the run's own immutable snapshot (never the editable workflow),
 * node and edge states come from persisted execution data, and every value shown is already redacted by the server.
 */
export function ExecutionDebugger({ clientId, runId: initialRunId, onClose }: { clientId: string; runId: string; onClose: () => void }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [stack, setStack] = useState<string[]>([initialRunId]);
  const runId = stack[stack.length - 1]!;
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [focusToken, setFocusToken] = useState(0);
  const [tab, setTab] = useState<Tab>("timeline");
  const [filter, setFilter] = useState<EventFilterId>("all");
  const [onlySelected, setOnlySelected] = useState(false);
  const [cursor, setCursor] = useState<number | null>(null);
  const [confirmRisk, setConfirmRisk] = useState(false);
  const [busy, setBusy] = useState<"retry" | "cancel" | null>(null);
  const listRef = useRef<HTMLOListElement>(null);

  const query = useQuery({
    queryKey: ["automation", "trace", clientId, runId],
    queryFn: () => automationApi.runTrace(clientId, runId),
    staleTime: 5_000,
    refetchInterval: (state) => (["Running", "Waiting"].includes(state.state.data?.run.status ?? "") ? 5_000 : false),
    retry: false,
  });
  const trace = query.data;

  // Opening another run (parent / child / replay) starts with a clean selection. Adjusted during render, as React recommends, not in an effect.
  const [shownRun, setShownRun] = useState(runId);
  if (shownRun !== runId) { setShownRun(runId); setSelectedId(null); setCursor(null); setOnlySelected(false); }
  useEffect(() => { const down = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); }; window.addEventListener("keydown", down); return () => window.removeEventListener("keydown", down); }, [onClose]);

  const visibleEvents = useMemo(() => {
    if (!trace) return [] as TraceEvent[];
    const base = filterEvents(trace.timeline, filter);
    return onlySelected && selectedId ? base.filter((event) => event.nodeId === selectedId) : base;
  }, [trace, filter, onlySelected, selectedId]);
  const cursorEvent = cursor !== null ? visibleEvents[cursor] ?? null : null;

  const { nodes, edges } = useMemo(() => {
    if (!trace || !trace.snapshot.available) return { nodes: [] as FlowNodeInput[], edges: [] as FlowEdgeInput[] };
    const cursorAt = cursorEvent?.at ?? null;
    const handles = new Map<string, Set<string>>();
    for (const edge of trace.snapshot.edges) if (edge.sourceHandle) handles.set(edge.source, (handles.get(edge.source) ?? new Set()).add(edge.sourceHandle));
    const nodeList: FlowNodeInput[] = trace.snapshot.nodes.map((node) => {
      const data = trace.nodes[node.id];
      const tone = NODE_STATE_STYLE[data?.state ?? "not_executed"];
      const badges: string[] = [];
      if (data?.dryRun) badges.push("Dry Run — Not Sent");
      if (data && data.attempts > 1) badges.push(`${data.attempts} Attempts`);
      if (data && data.executions > 1) badges.push(`${data.executions} Executions`);
      if (trace.iterations.some((item) => item.nodeId === node.id)) badges.push(`${trace.iterations.filter((item) => item.nodeId === node.id).length} Iterations`);
      if (trace.branches.some((branch) => branch.splitNodeId === node.id)) badges.push(`${trace.branches.filter((branch) => branch.splitNodeId === node.id).length} Branches`);
      if (trace.childRuns.some((child) => child.parentNodeId === node.id)) badges.push("Child Run");
      if (trace.approvals.some((approval) => approval.nodeId === node.id)) badges.push("Approval");
      // Timeline scrubbing: nodes that had not started yet at the selected moment are dimmed (derived from recorded timestamps only).
      const dimmed = Boolean(cursorAt && data?.startedAt && data.startedAt > cursorAt);
      return { id: node.id, label: node.label, actionId: node.actionId, type: node.type, position: node.position, tone, badges, dimmed, sourceHandles: [...(handles.get(node.id) ?? [])] };
    });
    const edgeList: FlowEdgeInput[] = trace.snapshot.edges.map((edge) => ({ id: edge.id, source: edge.source, target: edge.target, sourceHandle: edge.sourceHandle, label: edge.label, visual: edgeVisual(edge.state, edge.evidence) }));
    return { nodes: nodeList, edges: edgeList };
  }, [trace, cursorEvent]);

  const select = (id: string | null, focus = false) => { setSelectedId(id); if (id) { setTab("node"); if (focus) setFocusToken((t) => t + 1); } };
  const go = (direction: "first" | "previous" | "next" | "last") => {
    const next = stepEvent(visibleEvents.length, cursor, direction);
    setCursor(next);
    const event = next !== null ? visibleEvents[next] : null;
    if (event?.nodeId) { setSelectedId(event.nodeId); setFocusToken((t) => t + 1); }
    if (next !== null) listRef.current?.children[next]?.scrollIntoView({ block: "nearest" });
  };

  const retry = async (acknowledge: boolean) => {
    setBusy("retry");
    try {
      const run = await automationApi.retryRun(clientId, runId, acknowledge ? { acknowledgeDuplicateRisk: true } : {});
      toast.success("Replay started as a new run");
      setConfirmRisk(false);
      await queryClient.invalidateQueries({ queryKey: ["automation"] });
      if (run?.id) setStack((current) => [...current, run.id]);
    } catch (error) { toast.error(errorMessage(error)); } finally { setBusy(null); }
  };
  const cancel = async () => {
    setBusy("cancel");
    try { await automationApi.cancelRun(clientId, runId); toast.success("Run cancelled"); await query.refetch(); } catch (error) { toast.error(errorMessage(error)); } finally { setBusy(null); }
  };
  const copy = async (text: string, label: string) => { try { await navigator.clipboard.writeText(text); toast.success(`${label} copied`); } catch { toast.error("Copy is not available in this browser"); } };

  const selectedNode: TraceNode | undefined = selectedId && trace ? trace.nodes[selectedId] : undefined;
  const selectedMeta = selectedId && trace ? trace.snapshot.nodes.find((node) => node.id === selectedId) : undefined;
  const counts = trace ? stateCounts(trace) : null;

  return (
    <div className="fixed inset-0 z-[110] flex flex-col bg-slate-50" style={{ pointerEvents: "auto" }} role="dialog" aria-label="Visual execution debugger">
      <header className="flex h-12 shrink-0 items-center justify-between gap-3 border-b border-slate-200 bg-white px-4">
        <div className="flex min-w-0 items-center gap-3">
          <button type="button" aria-label={stack.length > 1 ? "Back to previous run" : "Close debugger"} onClick={() => (stack.length > 1 ? setStack((s) => s.slice(0, -1)) : onClose())} className="rounded p-1.5 text-slate-500 hover:bg-slate-100"><ArrowLeft className="size-4" /></button>
          <div className="min-w-0">
            <h1 className="truncate text-[13px] font-semibold text-slate-900">Visual Debugger{trace?.run.workflowName ? ` · ${trace.run.workflowName}` : ""}</h1>
            <p className="truncate text-[10px] text-slate-500">Run {runId.slice(0, 8)}{stack.length > 1 ? ` · Opened From Run ${stack[stack.length - 2]!.slice(0, 8)}` : ""}</p>
          </div>
          {trace ? <span className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700"><Lock className="size-3" />Read Only · Snapshot v{trace.run.workflowVersion ?? "?"}</span> : null}
        </div>
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => void query.refetch()} className="flex h-7 items-center gap-1 rounded border border-slate-200 px-2 text-[11px] font-medium text-slate-700 hover:bg-slate-50"><RefreshCw className={`size-3 ${query.isFetching ? "animate-spin" : ""}`} />Refresh</button>
          <button type="button" onClick={onClose} className="h-7 rounded bg-slate-900 px-3 text-[11px] font-semibold text-white">Close</button>
        </div>
      </header>

      {query.isLoading ? <div className="flex flex-1 items-center justify-center text-[12px] text-slate-500" role="status">Loading Execution Trace…</div> : null}
      {query.isError ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center" role="alert">
          <AlertTriangle className="size-6 text-amber-500" />
          <p className="text-[13px] font-semibold text-slate-900">The Execution Trace Could Not Be Loaded</p>
          <p className="max-w-md text-[11px] text-slate-500">{errorMessage(query.error)}</p>
          <button type="button" onClick={() => void query.refetch()} className="h-7 rounded border border-slate-200 bg-white px-3 text-[11px] font-medium">Try Again</button>
        </div>
      ) : null}

      {trace ? <>
        <div className="grid shrink-0 grid-cols-2 gap-x-4 gap-y-1.5 border-b border-slate-200 bg-white px-4 py-2 sm:grid-cols-4 xl:grid-cols-8">
          <Field label="Status"><span className={`inline-flex items-center gap-1 ${trace.run.status === "Failed" ? "text-red-700" : trace.run.status === "Successful" ? "text-emerald-700" : "text-slate-800"}`}>{trace.run.status}</span></Field>
          <Field label="Execution Mode">{trace.run.isTest ? "Test Run" : "Live Run"} · {trace.run.executionMode}</Field>
          <Field label="Trigger">{trace.run.triggerSource ?? "—"}</Field>
          <Field label="Started">{dateTime(trace.run.startedAt)}</Field>
          <Field label="Duration">{trace.run.completedAt ? formatMs(trace.run.durationMs) : "In Progress"}</Field>
          <Field label="Run ID"><button type="button" onClick={() => void copy(trace.run.id, "Run ID")} className="inline-flex items-center gap-1 font-mono hover:text-blue-700" title="Copy run ID">{trace.run.id.slice(0, 13)}…<Copy className="size-3" /></button></Field>
          <Field label="Correlation ID">{trace.run.correlationId ? <button type="button" onClick={() => void copy(trace.run.correlationId!, "Correlation ID")} className="inline-flex items-center gap-1 font-mono hover:text-blue-700" title="Copy correlation ID">{trace.run.correlationId.slice(0, 13)}…<Copy className="size-3" /></button> : "Not Recorded"}</Field>
          <Field label="Workflow Version">{trace.run.workflowVersion ?? "Not Recorded"}</Field>
        </div>
        {trace.dataQuality.notes.length ? <div className="flex items-start gap-2 border-b border-amber-200 bg-amber-50 px-4 py-1.5 text-[11px] text-amber-900" role="note"><AlertTriangle className="mt-0.5 size-3.5 shrink-0" /><div>{trace.dataQuality.notes.map((note) => <p key={note}>{note}</p>)}</div></div> : null}
        {counts ? <div className="flex shrink-0 flex-wrap items-center gap-1 border-b border-slate-200 bg-white px-4 py-1.5" aria-label="Node state legend">
          {STATE_ORDER.filter((state) => counts[state] > 0).map((state) => <span key={state} className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] font-medium ${NODE_STATE_STYLE[state].border} ${NODE_STATE_STYLE[state].bg} ${NODE_STATE_STYLE[state].text}`}><span className={`size-1.5 rounded-full ${NODE_STATE_STYLE[state].dot}`} />{NODE_STATE_STYLE[state].label} {counts[state]}</span>)}
          <span className="ml-2 inline-flex items-center gap-1 text-[10px] text-slate-500"><span className="h-0 w-5 border-t-2 border-emerald-600" />Taken (Recorded)</span>
          <span className="inline-flex items-center gap-1 text-[10px] text-slate-500"><span className="h-0 w-5 border-t-2 border-dashed border-emerald-400" />Taken (Inferred)</span>
          <span className="inline-flex items-center gap-1 text-[10px] text-slate-500"><span className="h-0 w-5 border-t-2 border-dashed border-slate-300" />Not Taken</span>
        </div> : null}

        <div className="flex min-h-0 flex-1">
          <main className="relative min-w-0 flex-1">
            {trace.snapshot.available ? <FlowCanvas nodes={nodes} edges={edges} selectedId={selectedId} onSelect={(id) => select(id, false)} focusToken={focusToken} /> : (
              <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center">
                <Lock className="size-6 text-slate-400" />
                <p className="text-[13px] font-semibold text-slate-900">Graph Unavailable For This Run</p>
                <p className="max-w-md text-[11px] text-slate-500">No workflow snapshot was stored for this run, so its graph cannot be drawn. The current editable workflow is intentionally not shown in its place. The recorded timeline is still available.</p>
              </div>
            )}
          </main>

          <aside className="flex w-[25rem] shrink-0 flex-col border-l border-slate-200 bg-white">
            <div className="flex shrink-0 border-b border-slate-200" role="tablist">
              {([["node", "Node"], ["timeline", "Timeline"], ["investigation", "Investigation"], ["relations", "Relations"]] as Array<[Tab, string]>).map(([id, label]) => (
                <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)} className={`flex-1 border-b-2 px-2 py-2 text-[11px] font-semibold ${tab === id ? "border-blue-600 text-blue-700" : "border-transparent text-slate-500 hover:text-slate-800"}`}>{label}</button>
              ))}
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">
              {tab === "node" ? (
                !selectedId || !selectedMeta ? <p className="p-4 text-[11px] text-slate-500">Select a node on the canvas or in the timeline to see its execution details.</p> : (
                  <div className="space-y-3 p-3">
                    <div><p className="text-[13px] font-semibold text-slate-900">{selectedMeta.label}</p><p className="text-[10px] text-slate-500">{selectedMeta.actionId} · {selectedMeta.id}</p></div>
                    {selectedNode ? <>
                      <p className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] font-semibold ${NODE_STATE_STYLE[selectedNode.state].border} ${NODE_STATE_STYLE[selectedNode.state].bg} ${NODE_STATE_STYLE[selectedNode.state].text}`}><span className={`size-1.5 rounded-full ${NODE_STATE_STYLE[selectedNode.state].dot}`} />{NODE_STATE_STYLE[selectedNode.state].label}</p>
                      {selectedNode.dryRun ? <p className="rounded border border-sky-200 bg-sky-50 px-2 py-1 text-[11px] text-sky-900">Reached in a test or dry-run: the external action was suppressed. Nothing was sent or changed.</p> : null}
                      {selectedNode.skipReason ? <p className="rounded border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] text-slate-700">{selectedNode.skipReason}</p> : null}
                      <dl className="grid grid-cols-2 gap-x-3 gap-y-2">
                        <Field label="Started">{dateTime(selectedNode.startedAt)}</Field><Field label="Finished">{dateTime(selectedNode.finishedAt)}</Field>
                        <Field label="Duration">{formatMs(selectedNode.durationMs)}</Field><Field label="Attempts">{selectedNode.attempts}</Field>
                        <Field label="Executions">{selectedNode.executions}</Field><Field label="Selected Route">{selectedNode.selectedEdgeId ?? "—"}</Field>
                        {selectedNode.providerRef ? <Field label="Provider Reference">{selectedNode.providerRef}</Field> : null}
                        {selectedNode.errorCode ? <Field label="Error Code"><span className="font-mono">{selectedNode.errorCode}</span></Field> : null}
                      </dl>
                      {selectedNode.error ? <div className="rounded border border-red-200 bg-red-50 p-2"><p className="text-[10px] font-semibold text-red-800">Error</p><p className="mt-0.5 break-words text-[11px] text-red-900">{selectedNode.error}</p>{selectedNode.recommendation ? <p className="mt-1 text-[11px] text-red-900/80">Recommendation: {selectedNode.recommendation}</p> : null}</div> : null}
                      <div><p className="mb-1 text-[10px] font-semibold text-slate-500">Input (Redacted)</p><Json value={selectedNode.input} /></div>
                      {previewOf(selectedNode.output) ? <ActionPreviewCard preview={previewOf(selectedNode.output)!} /> : null}
                      <div><p className="mb-1 text-[10px] font-semibold text-slate-500">Output (Redacted)</p><Json value={selectedNode.output} /></div>
                    </> : <p className="rounded border border-slate-200 bg-slate-50 p-2 text-[11px] text-slate-600">This node has no recorded execution in this run.</p>}
                    <div><p className="mb-1 text-[10px] font-semibold text-slate-500">Configuration In This Snapshot (Redacted)</p><Json value={selectedMeta.config} /></div>
                  </div>
                )
              ) : null}

              {tab === "timeline" ? (
                <div className="flex h-full flex-col">
                  <div className="space-y-1.5 border-b border-slate-100 p-2">
                    <div className="flex items-center gap-1">
                      <select value={filter} onChange={(e) => { setFilter(e.target.value as EventFilterId); setCursor(null); }} aria-label="Filter timeline events" className="h-7 min-w-0 flex-1 rounded border border-slate-200 bg-white px-1.5 text-[11px]">
                        {EVENT_FILTERS.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
                      </select>
                      <label className="flex items-center gap-1 text-[10px] text-slate-600"><input type="checkbox" checked={onlySelected} disabled={!selectedId} onChange={(e) => { setOnlySelected(e.target.checked); setCursor(null); }} />Selected Node</label>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-slate-500">{cursor !== null ? `Event ${cursor + 1} Of ${visibleEvents.length}` : `${visibleEvents.length} Recorded Events`}</span>
                      <div className="flex gap-0.5">
                        {([["first", ChevronFirst, "First event"], ["previous", ChevronLeft, "Previous event"], ["next", ChevronRight, "Next event"], ["last", ChevronLast, "Last event"]] as const).map(([direction, Icon, label]) => (
                          <button key={direction} type="button" aria-label={label} title={label} disabled={!visibleEvents.length} onClick={() => go(direction)} className="rounded border border-slate-200 p-1 text-slate-600 hover:bg-slate-50 disabled:opacity-40"><Icon className="size-3.5" /></button>
                        ))}
                      </div>
                    </div>
                  </div>
                  {visibleEvents.length === 0 ? <p className="p-4 text-[11px] text-slate-500">No recorded events match this filter.</p> : (
                    <ol ref={listRef} className="min-h-0 flex-1 overflow-y-auto">
                      {visibleEvents.map((event, index) => (
                        <li key={`${event.at}-${event.kind}-${event.refId ?? index}-${index}`}>
                          <button type="button" onClick={() => { setCursor(index); if (event.nodeId) { setSelectedId(event.nodeId); setFocusToken((t) => t + 1); } }} className={`flex w-full gap-2 border-b border-slate-100 px-3 py-1.5 text-left hover:bg-slate-50 ${cursor === index ? "bg-blue-50" : ""}`}>
                            <span className="w-[4.6rem] shrink-0 font-mono text-[10px] text-slate-500">{time(event.at)}</span>
                            <span className="min-w-0 flex-1">
                              <span className="flex items-center gap-1"><span className="rounded bg-slate-100 px-1 text-[9px] font-medium text-slate-600">{EVENT_SOURCE_LABEL[event.source]}</span><span className="truncate text-[11px] font-medium text-slate-900">{event.title}</span></span>
                              {event.detail ? <span className="mt-0.5 block break-words text-[10px] text-slate-500">{event.detail}</span> : null}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ol>
                  )}
                </div>
              ) : null}

              {tab === "investigation" ? <Investigation trace={trace} busy={busy} onRetry={() => (trace.investigation.retryRequiresAcknowledgement ? setConfirmRisk(true) : void retry(false))} onCancel={() => void cancel()} onSelect={(id) => select(id, true)} onRelated={() => router.push(`/admin/automation/logs?correlationId=${encodeURIComponent(trace.run.correlationId ?? "")}`)} onDlq={() => router.push("/admin/automation/logs?tab=dlq")} /> : null}

              {tab === "relations" ? <Relations trace={trace} onOpenRun={(id) => setStack((current) => [...current, id])} onSelect={(id) => select(id, true)} /> : null}
            </div>
          </aside>
        </div>
      </> : null}

      <DuplicateRiskDialog elevated open={confirmRisk} runCount={1} busy={busy === "retry"} onOpenChange={(open) => { if (!open && busy !== "retry") setConfirmRisk(false); }} onConfirm={() => void retry(true)} />
    </div>
  );
}

function Investigation({ trace, busy, onRetry, onCancel, onSelect, onRelated, onDlq }: { trace: RunTrace; busy: "retry" | "cancel" | null; onRetry: () => void; onCancel: () => void; onSelect: (id: string) => void; onRelated: () => void; onDlq: () => void }) {
  const { investigation, run } = trace;
  const attempts = trace.timeline.filter((event) => event.kind.startsWith("step.attempt") || event.kind === "step.outcome_unknown");
  const active = ["Running", "Waiting"].includes(run.status);
  const failed = ["Failed", "Cancelled"].includes(run.status);
  return (
    <div className="space-y-3 p-3">
      {!failed && !active && !investigation.failedNodeId ? <p className="rounded border border-emerald-200 bg-emerald-50 p-2 text-[11px] text-emerald-900">This run finished without a recorded failure.</p> : null}
      {investigation.unknownOutcome ? <div className="flex gap-2 rounded border border-orange-300 bg-orange-50 p-2" role="alert"><ShieldAlert className="mt-0.5 size-4 shrink-0 text-orange-600" /><p className="text-[11px] text-orange-900"><strong>Duplicate Risk.</strong> A step stopped mid-delivery, so the provider may already have processed it. Check the destination before replaying; replay requires you to acknowledge the risk.</p></div> : null}
      {run.error ? <div className="rounded border border-red-200 bg-red-50 p-2"><p className="text-[10px] font-semibold text-red-800">Run Error{run.error.code ? ` · ${run.error.code}` : ""}</p><p className="mt-0.5 break-words text-[11px] text-red-900">{run.error.message}</p>{run.error.recommendation ? <p className="mt-1 text-[11px] text-red-900/80">Recommendation: {run.error.recommendation}</p> : null}</div> : null}
      {run.failureClass ? <div><p className="text-[10px] font-semibold text-slate-500">Failure Classification</p><p className="mt-0.5 text-[11px] text-slate-800">{FAILURE_CLASS_LABEL[run.failureClass] ?? run.failureClass}</p></div> : null}
      <div>
        <p className="text-[10px] font-semibold text-slate-500">Evidence Recorded For This Run</p>
        {investigation.evidence.length ? <ul className="mt-1 list-disc space-y-0.5 pl-4 text-[11px] text-slate-800">{investigation.evidence.map((line) => <li key={line}>{line}</li>)}</ul> : <p className="mt-0.5 text-[11px] text-slate-500">No failure evidence was recorded.</p>}
        <p className="mt-1.5 text-[10px] text-slate-500">These are facts read from persisted records. No cause is inferred; if the evidence is incomplete, the cause is not known.</p>
        {investigation.failedNodeId ? <button type="button" onClick={() => onSelect(investigation.failedNodeId!)} className="mt-1.5 text-[11px] font-medium text-blue-700 hover:underline">Show Affected Node On Canvas</button> : null}
      </div>
      <div>
        <p className="text-[10px] font-semibold text-slate-500">Attempt History</p>
        {attempts.length ? <ul className="mt-1 divide-y divide-slate-100 rounded border border-slate-200">{attempts.map((event, index) => <li key={`${event.at}-${index}`} className="px-2 py-1 text-[11px]"><span className="font-mono text-[10px] text-slate-500">{time(event.at)}</span> <span className="font-medium text-slate-900">{event.title}</span>{event.detail ? <span className="block text-[10px] text-slate-500">{event.detail}</span> : null}</li>)}</ul> : <p className="mt-0.5 text-[11px] text-slate-500">No attempt rows are stored for this run.</p>}
      </div>
      <div className="space-y-1.5 border-t border-slate-100 pt-3">
        <p className="text-[10px] font-semibold text-slate-500">Recovery Actions</p>
        <p className="text-[10px] text-slate-500">Replay creates a new run through the normal engine, so idempotency, authorization, quota and unknown-outcome protection all still apply.</p>
        <div className="flex flex-wrap gap-1">
          <button type="button" disabled={!investigation.canRetry || busy !== null} onClick={onRetry} className="flex h-7 items-center gap-1 rounded bg-slate-900 px-2.5 text-[11px] font-semibold text-white disabled:opacity-40"><RotateCcw className="size-3" />{busy === "retry" ? "Replaying…" : "Replay Run"}</button>
          {active ? <button type="button" disabled={busy !== null} onClick={onCancel} className="flex h-7 items-center gap-1 rounded border border-red-200 px-2.5 text-[11px] font-semibold text-red-700 hover:bg-red-50 disabled:opacity-40"><Ban className="size-3" />Cancel Run</button> : null}
          {run.dlqStatus ? <button type="button" onClick={onDlq} className="flex h-7 items-center gap-1 rounded border border-slate-200 px-2.5 text-[11px] font-medium text-slate-700 hover:bg-slate-50"><ExternalLink className="size-3" />Open Dead-Letter Queue ({run.dlqStatus === "OPEN" ? "Open" : run.dlqStatus === "REPLAYED" ? "Replayed" : "Dismissed"})</button> : null}
          {run.correlationId ? <button type="button" onClick={onRelated} className="flex h-7 items-center gap-1 rounded border border-slate-200 px-2.5 text-[11px] font-medium text-slate-700 hover:bg-slate-50"><Link2 className="size-3" />Runs With This Correlation ID</button> : null}
        </div>
        {!investigation.canRetry && failed ? <p className="text-[10px] text-slate-500">Replay is unavailable: the run payload was erased by the retention policy.</p> : null}
      </div>
    </div>
  );
}

function Relations({ trace, onOpenRun, onSelect }: { trace: RunTrace; onOpenRun: (id: string) => void; onSelect: (id: string) => void }) {
  const { parent, childRuns, approvals, branches, iterations, run } = trace;
  const iterationByNode = new Map<string, Record<string, number>>();
  for (const item of iterations) { const bucket = iterationByNode.get(item.nodeId) ?? {}; bucket[item.status] = (bucket[item.status] ?? 0) + 1; iterationByNode.set(item.nodeId, bucket); }
  const empty = !parent && !run.retryOfId && !childRuns.length && !approvals.length && !branches.length && !iterations.length;
  return (
    <div className="space-y-3 p-3">
      {empty ? <p className="text-[11px] text-slate-500">This run has no parent, child runs, approvals, branches or iterations.</p> : null}
      {parent ? <div><p className="text-[10px] font-semibold text-slate-500">Parent Run</p><button type="button" onClick={() => onOpenRun(parent.id)} className="mt-1 flex w-full items-center justify-between rounded border border-slate-200 px-2 py-1.5 text-left text-[11px] hover:bg-slate-50"><span className="font-medium text-slate-900">{parent.workflowName}</span><span className="text-slate-500">{parent.status} · {parent.id.slice(0, 8)}</span></button></div> : run.parentRunId ? <p className="rounded border border-slate-200 bg-slate-50 p-2 text-[11px] text-slate-600">This run was started by a parent run that is not available in your tenant scope.</p> : null}
      {run.retryOfId ? <div><p className="text-[10px] font-semibold text-slate-500">Replay Of</p><button type="button" onClick={() => onOpenRun(run.retryOfId!)} className="mt-1 text-[11px] font-medium text-blue-700 hover:underline">Run {run.retryOfId.slice(0, 8)}</button></div> : null}
      {childRuns.length ? <div><p className="text-[10px] font-semibold text-slate-500">Child Workflow Runs</p><ul className="mt-1 space-y-1">{childRuns.map((child) => <li key={child.id}><button type="button" onClick={() => onOpenRun(child.id)} className="flex w-full items-center justify-between rounded border border-slate-200 px-2 py-1.5 text-left text-[11px] hover:bg-slate-50"><span className="min-w-0"><span className="block truncate font-medium text-slate-900">{child.workflowName ?? child.workflowId.slice(0, 8)}</span><span className="text-[10px] text-slate-500">Version {child.workflowVersion ?? "?"}{child.parentNodeId ? ` · Node ${child.parentNodeId}` : ""}</span></span><span className="shrink-0 text-slate-500">{child.status}</span></button></li>)}</ul></div> : null}
      {approvals.length ? <div><p className="text-[10px] font-semibold text-slate-500">Approvals</p><ul className="mt-1 divide-y divide-slate-100 rounded border border-slate-200">{approvals.map((approval) => <li key={approval.id}><button type="button" onClick={() => onSelect(approval.nodeId)} className="flex w-full justify-between px-2 py-1.5 text-left text-[11px] hover:bg-slate-50"><span className="font-medium text-slate-900">Node {approval.nodeId}</span><span className="text-slate-500">{approval.status[0]}{approval.status.slice(1).toLowerCase()}{approval.decidedAt ? ` · ${dateTime(approval.decidedAt)}` : ""}</span></button></li>)}</ul></div> : null}
      {branches.length ? <div><p className="flex items-center gap-1 text-[10px] font-semibold text-slate-500"><GitBranch className="size-3" />Parallel Branches</p><ul className="mt-1 divide-y divide-slate-100 rounded border border-slate-200">{branches.map((branch) => <li key={branch.id} className="flex justify-between px-2 py-1.5 text-[11px]"><span className="font-medium text-slate-900">{branch.branchKey.split(":").pop()}</span><span className="text-slate-500">{branch.status}{branch.startedAt && branch.completedAt ? ` · ${formatMs(Date.parse(branch.completedAt) - Date.parse(branch.startedAt))}` : ""}</span></li>)}</ul></div> : null}
      {iterationByNode.size ? <div><p className="text-[10px] font-semibold text-slate-500">Iterations</p><ul className="mt-1 divide-y divide-slate-100 rounded border border-slate-200">{[...iterationByNode.entries()].map(([nodeId, buckets]) => <li key={nodeId}><button type="button" onClick={() => onSelect(nodeId)} className="flex w-full justify-between px-2 py-1.5 text-left text-[11px] hover:bg-slate-50"><span className="font-medium text-slate-900">Node {nodeId}</span><span className="text-slate-500">{Object.entries(buckets).map(([status, count]) => `${count} ${status.toLowerCase()}`).join(" · ")}</span></button></li>)}</ul></div> : null}
    </div>
  );
}
