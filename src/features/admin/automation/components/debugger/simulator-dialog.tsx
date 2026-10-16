"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, FlaskConical, Info, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { automationApi, type SimulateInput } from "../../data/automation-api";
import { errorMessage } from "../../data/hooks";
import type { AutomationEdge, AutomationNode, AutomationWorkflow } from "../../data/types";
import type { SimulationResult } from "../../data/trace-types";
import { SIM_STATE_STYLE, edgeVisual, parseJsonObject, simulationStates } from "./debugger-utils";
import { FlowCanvas, type FlowEdgeInput, type FlowNodeInput } from "./flow-canvas";

type Source = "editor" | "draft" | "published";

function samplePayload(trigger: string | undefined): string {
  if (trigger === "form_submission" || trigger === "inbound_webhook") return JSON.stringify({ name: "Sample Visitor", email: "sample@example.com", phone: "9876543210", message: "Sample message" }, null, 2);
  if (trigger === "website_down") return JSON.stringify({ domain: "example.com", status: 503 }, null, 2);
  return JSON.stringify({ name: "Sample Contact", score: 80 }, null, 2);
}

const ACTION_NODES = new Set(["send_whatsapp", "send_email", "assign_user", "update_record", "create_task"]);

/**
 * Dry-run of the whole workflow. The server evaluates the graph with pure functions: no run row, queue job, quota, provider call or notification
 * is ever created, whatever the workspace's dry-run setting is. Approval and child-workflow outcomes are chosen here, never assumed.
 */
export function SimulatorDialog({ open, onClose, clientId, workflow, nodes, edges, hasUnsavedChanges }: {
  open: boolean; onClose: () => void; clientId: string; workflow: AutomationWorkflow; nodes: AutomationNode[]; edges: AutomationEdge[]; hasUnsavedChanges: boolean;
}) {
  const saved = !workflow.id.startsWith("draft_");
  const [source, setSource] = useState<Source>(hasUnsavedChanges || !saved ? "editor" : "draft");
  const trigger = nodes.find((node) => node.type === "trigger")?.actionId;
  const [payloadText, setPayloadText] = useState(() => samplePayload(trigger));
  const [approvals, setApprovals] = useState<Record<string, "approved" | "rejected" | "expired">>({});
  const [children, setChildren] = useState<Record<string, "success" | "failure">>({});
  const [failing, setFailing] = useState<Record<string, boolean>>({});
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const payload = parseJsonObject(payloadText);
  const approvalNodes = nodes.filter((node) => node.actionId === "approval");
  const childNodes = nodes.filter((node) => node.actionId === "sub_workflow");
  const actionNodes = nodes.filter((node) => ACTION_NODES.has(node.actionId ?? ""));
  const canvasAllowed = source !== "published";

  const run = async () => {
    if (!payload.ok) return;
    setRunning(true); setError(null);
    try {
      const input: SimulateInput = {
        payload: payload.value, approvalOutcomes: approvals, childOutcomes: children,
        mockResponses: Object.fromEntries(Object.entries(failing).filter(([, fail]) => fail).map(([id]) => [id, { success: false, errorCode: "SIMULATED_FAILURE" }])),
        ...(source === "editor" ? { definition: { executionMode: "graph-v1", nodes, edges } } : source === "published" ? { versionTag: "published" as const } : { versionTag: "draft" as const }),
      };
      setResult(await automationApi.simulate(clientId, workflow.id, input));
    } catch (e) { setError(errorMessage(e)); toast.error(errorMessage(e)); } finally { setRunning(false); }
  };

  const states = useMemo(() => (result ? simulationStates(result) : {}), [result]);
  const flow = useMemo(() => {
    if (!result || !canvasAllowed) return { nodes: [] as FlowNodeInput[], edges: [] as FlowEdgeInput[] };
    const handles = new Map<string, Set<string>>();
    for (const edge of edges) if (edge.sourceHandle) handles.set(edge.source, (handles.get(edge.source) ?? new Set()).add(edge.sourceHandle));
    const taken = new Set(result.takenEdgeIds);
    return {
      nodes: nodes.map<FlowNodeInput>((node) => ({ id: node.id, label: node.label, actionId: node.actionId ?? "", type: node.type, position: node.position ?? null, tone: SIM_STATE_STYLE[states[node.id] ?? "not_visited"], badges: result.plannedActions.some((step) => step.nodeId === node.id) ? ["Not Sent — Simulated"] : [], dimmed: false, sourceHandles: [...(handles.get(node.id) ?? [])] })),
      edges: edges.map<FlowEdgeInput>((edge) => ({ id: edge.id, source: edge.source, target: edge.target, sourceHandle: edge.sourceHandle ?? null, label: typeof edge.label === "string" ? edge.label : edge.sourceHandle ?? null, visual: edgeVisual(taken.has(edge.id) ? "taken" : "not_reached", "recorded") })),
    };
  }, [result, canvasAllowed, nodes, edges, states]);

  const selectedStep = selectedId && result ? result.steps.filter((step) => step.nodeId === selectedId) : [];

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onClose(); }}>
      <DialogContent overlayClassName="z-[130]" className="z-[130] max-h-[92vh] w-[min(1100px,96vw)] max-w-none overflow-hidden p-0 sm:max-w-none">
        <DialogHeader className="border-b border-slate-200 px-4 py-3">
          <DialogTitle className="flex items-center gap-2 text-[14px]"><FlaskConical className="size-4 text-sky-600" />Workflow Dry-Run Simulator</DialogTitle>
          <DialogDescription className="text-[11px]">Predicts the path and the actions a run would take. Nothing is sent, saved, queued or counted against quotas.</DialogDescription>
        </DialogHeader>
        <div className="grid max-h-[calc(92vh-5rem)] grid-cols-1 overflow-hidden lg:grid-cols-[22rem_1fr]">
          <div className="space-y-3 overflow-y-auto border-r border-slate-200 p-3">
            <div>
              <label htmlFor="sim-source" className="text-[10px] font-semibold text-slate-600">Definition To Simulate</label>
              <select id="sim-source" value={source} onChange={(e) => { setSource(e.target.value as Source); setResult(null); }} className="mt-1 h-8 w-full rounded border border-slate-200 bg-white px-2 text-[11px]">
                <option value="editor">Current Editor{hasUnsavedChanges ? " (Unsaved Changes)" : ""}</option>
                {saved ? <option value="draft">Saved Draft</option> : null}
                {saved && workflow.publishedVersion ? <option value="published">Published Version {workflow.publishedVersion}</option> : null}
              </select>
            </div>
            <div>
              <label htmlFor="sim-payload" className="text-[10px] font-semibold text-slate-600">Trigger Payload (JSON)</label>
              <textarea id="sim-payload" value={payloadText} onChange={(e) => setPayloadText(e.target.value)} spellCheck={false} rows={8} aria-invalid={!payload.ok} className={`mt-1 w-full rounded border bg-white p-2 font-mono text-[11px] ${payload.ok ? "border-slate-200" : "border-red-400"}`} />
              {!payload.ok ? <p className="mt-1 text-[10px] text-red-700" role="alert">{payload.error}</p> : <p className="mt-1 text-[10px] text-slate-500">Used in memory only. It is not stored.</p>}
            </div>
            {approvalNodes.length ? <fieldset className="space-y-1"><legend className="text-[10px] font-semibold text-slate-600">Approval Outcomes (You Decide)</legend>{approvalNodes.map((node) => (
              <label key={node.id} className="flex items-center justify-between gap-2 text-[11px]"><span className="truncate">{node.label}</span>
                <select value={approvals[node.id] ?? ""} onChange={(e) => setApprovals((current) => ({ ...current, [node.id]: e.target.value as "approved" }))} className="h-7 rounded border border-slate-200 bg-white px-1.5 text-[11px]"><option value="">Not Chosen</option><option value="approved">Approved</option><option value="rejected">Rejected</option><option value="expired">Expired</option></select></label>))}</fieldset> : null}
            {childNodes.length ? <fieldset className="space-y-1"><legend className="text-[10px] font-semibold text-slate-600">Child Workflow Outcomes (You Decide)</legend>{childNodes.map((node) => (
              <label key={node.id} className="flex items-center justify-between gap-2 text-[11px]"><span className="truncate">{node.label}</span>
                <select value={children[node.id] ?? ""} onChange={(e) => setChildren((current) => ({ ...current, [node.id]: e.target.value as "success" }))} className="h-7 rounded border border-slate-200 bg-white px-1.5 text-[11px]"><option value="">Not Chosen</option><option value="success">Success</option><option value="failure">Failure</option></select></label>))}</fieldset> : null}
            {actionNodes.length ? <fieldset className="space-y-1"><legend className="text-[10px] font-semibold text-slate-600">Simulated Provider Failures</legend>{actionNodes.map((node) => (
              <label key={node.id} className="flex items-center gap-2 text-[11px]"><input type="checkbox" checked={Boolean(failing[node.id])} onChange={(e) => setFailing((current) => ({ ...current, [node.id]: e.target.checked }))} /><span className="truncate">{node.label} fails</span></label>))}</fieldset> : null}
            <button type="button" disabled={!payload.ok || running} onClick={() => void run()} className="flex h-8 w-full items-center justify-center gap-1.5 rounded bg-sky-600 text-[12px] font-semibold text-white disabled:opacity-40"><FlaskConical className="size-3.5" />{running ? "Simulating…" : "Run Simulation"}</button>
            <p className="flex gap-1.5 rounded border border-emerald-200 bg-emerald-50 p-2 text-[10px] text-emerald-900"><ShieldCheck className="mt-0.5 size-3.5 shrink-0" />Side effects are impossible here: the simulator has no access to messaging, CRM, queue or quota code.</p>
          </div>

          <div className="min-h-[24rem] overflow-y-auto">
            {error ? <div className="m-3 rounded border border-red-200 bg-red-50 p-3 text-[11px] text-red-900" role="alert">{error}</div> : null}
            {!result && !error ? <div className="flex h-full min-h-[24rem] flex-col items-center justify-center gap-1 px-6 text-center"><FlaskConical className="size-6 text-slate-300" /><p className="text-[12px] font-semibold text-slate-800">No Simulation Yet</p><p className="max-w-sm text-[11px] text-slate-500">Choose the definition and payload, then run the simulation to see the predicted path, actions and warnings.</p></div> : null}
            {result ? <div className="space-y-2 p-3">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="rounded bg-sky-100 px-2 py-0.5 text-[10px] font-bold text-sky-800">SIMULATED</span>
                <span className="text-[11px] font-semibold text-slate-900">Outcome: {result.outcome === "completed" ? "Completed" : result.outcome === "blocked" ? "Needs An Outcome" : result.outcome === "stopped" ? "Stopped By Simulated Failure" : "Invalid Workflow"}</span>
                <span className="text-[10px] text-slate-500">· {result.source === "unsaved_editor" ? "Unsaved Editor" : result.source === "published" ? `Published v${result.version}` : "Saved Draft"} · {result.steps.length} Steps · {result.plannedActions.length} Planned Actions · Side Effects: None</span>
              </div>
              {result.issues.length ? <div className="rounded border border-red-200 bg-red-50 p-2" role="alert"><p className="text-[11px] font-semibold text-red-900">Validation Issues — Fix These Before Publishing</p><ul className="mt-1 list-disc space-y-0.5 pl-4 text-[11px] text-red-900">{result.issues.map((issue, index) => <li key={`${issue.code}-${index}`}>{issue.message}</li>)}</ul></div> : null}
              {result.warnings.length ? <div className="rounded border border-amber-200 bg-amber-50 p-2"><p className="flex items-center gap-1 text-[11px] font-semibold text-amber-900"><AlertTriangle className="size-3.5" />Warnings</p><ul className="mt-1 list-disc space-y-0.5 pl-4 text-[11px] text-amber-900">{result.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul></div> : null}
              {result.truncated ? <p className="rounded border border-amber-200 bg-amber-50 p-2 text-[11px] text-amber-900">The simulation reached its step limit and was truncated.</p> : null}
              {result.canSimulate && canvasAllowed ? <div className="h-72 overflow-hidden rounded border border-slate-200"><FlowCanvas nodes={flow.nodes} edges={flow.edges} selectedId={selectedId} onSelect={setSelectedId} focusToken={0} /></div> : result.canSimulate ? <p className="flex gap-1.5 rounded border border-slate-200 bg-slate-50 p-2 text-[11px] text-slate-600"><Info className="mt-0.5 size-3.5 shrink-0" />The graph view is shown for the editor and the saved draft. The published version is listed as steps below.</p> : null}
              {selectedId ? <div className="rounded border border-slate-200 p-2"><p className="text-[11px] font-semibold text-slate-900">Selected Node Steps</p>{selectedStep.length ? selectedStep.map((step) => <div key={step.seq} className="mt-1 text-[11px] text-slate-700">{step.note}</div>) : <p className="mt-1 text-[11px] text-slate-500">This node is not on the simulated path.</p>}</div> : null}
              <div>
                <p className="text-[11px] font-semibold text-slate-900">Predicted Execution Plan</p>
                {result.steps.length === 0 ? <p className="mt-1 text-[11px] text-slate-500">No steps were simulated.</p> : <ol className="mt-1 divide-y divide-slate-100 rounded border border-slate-200">{result.steps.map((step) => (
                  <li key={step.seq} className="px-2 py-1.5">
                    <div className="flex items-center gap-1.5 text-[11px]"><span className="w-6 shrink-0 font-mono text-[10px] text-slate-400">{step.seq}</span><span className="font-medium text-slate-900">{step.label}</span><span className={`rounded px-1 text-[9px] font-semibold ${SIM_STATE_STYLE[step.status === "planned" || step.status === "skipped" ? "planned" : step.status].text}`}>{step.status === "planned" ? "Planned" : step.status === "blocked" ? "Needs Outcome" : step.status === "failed" ? "Simulated Failure" : "Skipped"}</span>{step.scope ? <span className="truncate text-[10px] text-slate-400">{step.scope}</span> : null}</div>
                    {step.note ? <p className="ml-7 text-[10px] text-slate-500">{step.note}</p> : null}
                    {step.resumeAt ? <p className="ml-7 text-[10px] text-slate-500">Would resume at {new Date(step.resumeAt).toLocaleString()}</p> : null}
                    {step.wouldExecute && step.rendered ? <pre className="ml-7 mt-1 max-h-28 overflow-auto rounded border border-slate-200 bg-slate-50 p-1.5 font-mono text-[10px] text-slate-700">{JSON.stringify(step.rendered, null, 2)}</pre> : null}
                  </li>))}</ol>}
              </div>
              <details className="rounded border border-slate-200 p-2 text-[11px] text-slate-600"><summary className="cursor-pointer font-semibold text-slate-800">What This Simulation Cannot Tell You</summary><ul className="mt-1 list-disc space-y-0.5 pl-4">{result.limitations.map((line) => <li key={line}>{line}</li>)}</ul></details>
            </div> : null}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
