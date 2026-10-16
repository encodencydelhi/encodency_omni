"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Activity, ArrowLeft, Check, FlaskConical, History, PauseCircle, Pencil, Play, RefreshCw, Save, Send, TestTube2, X } from "lucide-react";
import { toast } from "sonner";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { getStoredCompanyId } from "@/lib/api/tenancy-storage";
import { whatsappApi } from "@/features/admin/channels/live/whatsapp-api";
import { teamApi } from "@/features/admin/team/live/team-api";
import type { AutomationEdge, AutomationNode, AutomationRun, AutomationWorkflow, AutomationWorkflowStatus } from "../../data/types";
import { automationApi, type WorkflowInput, type WorkflowVersion } from "../../data/automation-api";
import { errorMessage, useInvalidateAutomation } from "../../data/hooks";
import { RunDetailsSheet } from "../logs/run-details-sheet";
import { WorkflowStatusChip } from "../shared";
import { NodeLibrary, type LibraryItem } from "./node-library";
import { WorkflowCanvas } from "./canvas";
import { NodeConfigPanel, nodeProblem, type BuilderResources } from "./node-config-panel";
import { TestRunDialog } from "./test-run-dialog";
import { graphProblems, linearEdges } from "./graph-utils";
import { VersionHistoryDialog } from "./version-history-dialog";
import { SimulatorDialog } from "../debugger/simulator-dialog";
import { NodeTestDialog } from "../debugger/node-test-dialog";
import { HealthDialog } from "../debugger/health-dialog";

type GraphSnapshot = { nodes: AutomationNode[]; edges: AutomationEdge[] };

export function isUnsaved(workflow: AutomationWorkflow) { return workflow.id.startsWith("draft_"); }

function normalizedEdges(workflow: Pick<AutomationWorkflow, "nodes" | "edges">) { return workflow.edges?.length ? workflow.edges : linearEdges(workflow.nodes ?? []); }

function toInput(name: string, status: AutomationWorkflowStatus, nodes: AutomationNode[], edges: AutomationEdge[], base: AutomationWorkflow): WorkflowInput {
  const trigger = nodes.find((node) => node.type === "trigger");
  const channels = Array.from(new Set(nodes.flatMap((node) => node.actionId === "send_whatsapp" ? ["whatsapp"] : node.actionId === "send_email" ? ["email"] : node.actionId === "meta_lead" ? ["meta"] : [])));
  return { name: name.trim() || "Untitled workflow", status, trigger: { type: trigger?.actionId, label: trigger?.label }, nodes: nodes.map((node) => ({ ...node, status: nodeProblem(node) ? "idle" : "configured" })), edges, channels, executionMode: "graph-v1", ownerId: base.ownerId, templateId: base.templateId };
}

export function WorkflowBuilder({ workflow: initial, clientId, onBack }: { workflow: AutomationWorkflow; clientId: string; onBack: () => void }) {
  const invalidate = useInvalidateAutomation();
  const initialEdges = normalizedEdges(initial);
  const [workflow, setWorkflow] = useState(initial);
  const [nodes, setNodes] = useState<AutomationNode[]>(initial.nodes ?? []);
  const [edges, setEdges] = useState<AutomationEdge[]>(initialEdges);
  const [name, setName] = useState(initial.name);
  const [editingName, setEditingName] = useState(isUnsaved(initial));
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(initial.nodes?.[0]?.id ?? null);
  const [saving, setSaving] = useState<null | "draft" | "publish" | "pause" | "rollback">(null);
  const [savedSnapshot, setSavedSnapshot] = useState(() => JSON.stringify({ name: initial.name, nodes: initial.nodes ?? [], edges: initialEdges }));
  const [past, setPast] = useState<GraphSnapshot[]>([]);
  const [future, setFuture] = useState<GraphSnapshot[]>([]);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [testOpen, setTestOpen] = useState(false);
  const [testKey, setTestKey] = useState(0);
  const [lastRun, setLastRun] = useState<AutomationRun | null>(null);
  const [runSheetOpen, setRunSheetOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [inspecting, setInspecting] = useState<WorkflowVersion | null>(null);
  const [simOpen, setSimOpen] = useState(false);
  const [healthOpen, setHealthOpen] = useState(false);
  const [nodeTestOpen, setNodeTestOpen] = useState(false);
  const [conflict, setConflict] = useState(false);
  const [resources, setResources] = useState<BuilderResources>({ templates: [], templatesError: null, members: [] });

  const dirty = JSON.stringify({ name, nodes, edges }) !== savedSnapshot;
  const visibleNodes = inspecting?.definition.nodes ?? nodes;
  const visibleEdges = inspecting ? (inspecting.definition.edges?.length ? inspecting.definition.edges : linearEdges(visibleNodes)) : edges;
  const selectedNode = visibleNodes.find((node) => node.id === selectedNodeId) ?? null;
  const problems = useMemo(() => nodes.map((node) => ({ node, problem: nodeProblem(node) })).filter((entry) => entry.problem), [nodes]);
  const hasTrigger = nodes.some((node) => node.type === "trigger");
  const saved = !isUnsaved(workflow);

  const commitGraph = useCallback((nextNodes: AutomationNode[], nextEdges: AutomationEdge[]) => { setPast((items) => [...items.slice(-49), { nodes, edges }]); setFuture([]); setNodes(nextNodes); setEdges(nextEdges); }, [edges, nodes]);
  const undo = useCallback(() => { const previous = past.at(-1); if (!previous) return; setFuture((items) => [{ nodes, edges }, ...items]); setPast((items) => items.slice(0, -1)); setNodes(previous.nodes); setEdges(previous.edges); }, [edges, nodes, past]);
  const redo = useCallback(() => { const next = future[0]; if (!next) return; setPast((items) => [...items, { nodes, edges }]); setFuture((items) => items.slice(1)); setNodes(next.nodes); setEdges(next.edges); }, [edges, future, nodes]);

  useEffect(() => {
    const companyId = getStoredCompanyId(); let cancelled = false;
    void Promise.allSettled([whatsappApi.listTemplates(companyId, clientId), teamApi.listMembers(companyId)]).then(([templates, team]) => { if (cancelled) return; setResources({ templates: templates.status === "fulfilled" ? templates.value.items.filter((item) => item.status === "ENABLED").map((item) => ({ id: item.id, name: item.name, language: item.language, variables: item.variables ?? [], status: item.status, providerStatus: item.providerStatus })) : [], templatesError: templates.status === "rejected" ? "WhatsApp is not connected for this client (Channels → WhatsApp)." : null, members: team.status === "fulfilled" ? team.value.filter((member) => !member.suspendedAt).map((member) => ({ id: member.user.id, name: member.user.name?.trim() || member.user.email })) : [] }); });
    return () => { cancelled = true; };
  }, [clientId]);

  useEffect(() => { if (!dirty) return; const warn = (event: BeforeUnloadEvent) => event.preventDefault(); window.addEventListener("beforeunload", warn); return () => window.removeEventListener("beforeunload", warn); }, [dirty]);

  const addNode = (item: LibraryItem, position?: { x: number; y: number }) => {
    if (item.supported === false || inspecting) return;
    const node: AutomationNode = { id: `node_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, type: item.type, actionId: item.id, label: item.label, description: item.description, status: "idle", position, config: item.id === "delay" ? { duration: 1, unit: "hours" } : item.id === "wait_until" ? { mode: "relative", duration: 1, unit: "hours" } : item.id === "approval" ? { approverUserIds: [], expiryMinutes: 1440, reminderMinutes: 60 } : item.id === "sub_workflow" ? { workflowId: "", waitForCompletion: true, timeoutSeconds: 3600, input: {} } : item.id === "send_whatsapp" ? { phone: "{{lead.phone}}", variables: {} } : item.id === "create_task" ? { dueInDays: 1, priority: "medium" } : item.id === "parallel" ? { branches: ["branch-a", "branch-b"], failurePolicy: "fail", timeoutSeconds: 300, cancelRemaining: true } : item.id === "merge" ? { mode: "all" } : item.id === "for_each" ? { arraySource: "trigger.items", itemVariable: "item", concurrency: 2, maxItems: 100, failurePolicy: "fail" } : item.id === "loop" ? { maxIterations: 10, maxDurationSeconds: 3600, stopCondition: { field: "variables.done", operator: "equals", value: "true", valueType: "boolean" } } : {} };
    if (item.type === "trigger") {
      const existing = nodes.find((candidate) => candidate.type === "trigger"); const keep = existing && ["inbound_webhook", "form_submission"].includes(item.id) ? { webhookToken: existing.config?.webhookToken } : {};
      const nextNodes = [{ ...node, config: { ...node.config, ...(keep.webhookToken ? keep : {}) } }, ...nodes.filter((candidate) => candidate.type !== "trigger")];
      const nextEdges = existing ? edges.map((edge) => ({ ...edge, source: edge.source === existing.id ? node.id : edge.source, target: edge.target === existing.id ? node.id : edge.target })) : edges;
      commitGraph(nextNodes, nextEdges); if (existing) toast.info(`Trigger replaced with “${item.label}”`);
    } else {
      const previous = nodes.at(-1);
      const paired = item.id === "merge" ? nodes.map((candidate) => candidate.actionId === "parallel" && !candidate.config?.joinNodeId ? { ...candidate, config: { ...candidate.config, joinNodeId: node.id } } : candidate) : nodes;
      commitGraph([...paired, node], previous ? [...edges, { id: `e_${previous.id}_${node.id}`, source: previous.id, target: node.id }] : edges);
    }
    setSelectedNodeId(node.id);
  };

  const applyResult = (result: AutomationWorkflow) => { const resultEdges = normalizedEdges(result); setWorkflow(result); setNodes(result.nodes); setEdges(resultEdges); setName(result.name); setSavedSnapshot(JSON.stringify({ name: result.name, nodes: result.nodes, edges: resultEdges })); setPast([]); setFuture([]); setConflict(false); setInspecting(null); invalidate(); };

  const save = async (mode: "draft" | "publish") => {
    if (!name.trim()) { toast.error("Give the workflow a name"); setEditingName(true); return; }
    if (mode === "publish") {
      if (!hasTrigger || nodes.length < 2) { toast.error("Add a trigger and at least one action before publishing"); return; }
      if (problems.length) { toast.error(`Finish configuring ${problems[0]!.node.label}: ${problems[0]!.problem}`); setSelectedNodeId(problems[0]!.node.id); return; }
      const graphErrors = graphProblems(nodes, edges); if (graphErrors.size) { const first = graphErrors.values().next().value; toast.error(first ?? "Fix graph validation errors before publishing."); return; }
    }
    setSaving(mode);
    try {
      const input = { ...toInput(name, "Draft", nodes, edges, workflow), ...(saved ? { expectedVersion: workflow.version } : {}) };
      let result = saved && dirty ? await automationApi.updateWorkflow(clientId, workflow.id, input) : saved ? workflow : await automationApi.createWorkflow(clientId, input);
      if (mode === "publish") result = await automationApi.publishWorkflow(clientId, result.id, result.version);
      applyResult(result); toast.success(mode === "publish" ? "Workflow published — it is now live" : "Draft saved");
    } catch (error) { const message = errorMessage(error); if (/edited by someone else|reload/i.test(message)) setConflict(true); toast.error(message); } finally { setSaving(null); }
  };

  const pause = async () => { setSaving("pause"); try { const result = await automationApi.setWorkflowStatus(clientId, workflow.id, "Paused"); applyResult(result); toast.success("Workflow paused"); } catch (error) { toast.error(errorMessage(error)); } finally { setSaving(null); } };
  const reloadLatest = async () => { try { applyResult(await automationApi.getWorkflow(clientId, workflow.id)); toast.success("Latest revision loaded"); } catch (error) { toast.error(errorMessage(error)); } };
  const rollback = async (version: WorkflowVersion) => { setSaving("rollback"); try { const result = await automationApi.rollbackWorkflow(clientId, workflow.id, version.version, workflow.version, true); applyResult(result); setHistoryOpen(false); toast.success(`Version ${version.version} restored as version ${result.version}`); } catch (error) { const message = errorMessage(error); if (/edited by someone else|reload/i.test(message)) setConflict(true); toast.error(message); } finally { setSaving(null); } };
  const openTest = () => { if (!saved) return toast.error("Save the workflow before testing it"); if (dirty) return toast.error("Save your changes first — tests run the saved draft version"); setTestKey((key) => key + 1); setTestOpen(true); };

  return <div className="fixed inset-0 z-[100] flex flex-col bg-slate-50">
    <header className="z-20 flex h-14 shrink-0 items-center justify-between gap-3 border-b border-slate-200 bg-white px-5">
      <div className="flex min-w-0 items-center gap-4"><button type="button" onClick={() => dirty ? setConfirmLeave(true) : onBack()} aria-label="Back to workflows" className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"><ArrowLeft className="size-4" /></button><div className="min-w-0">{editingName ? <input autoFocus value={name} maxLength={200} onChange={(event) => setName(event.target.value)} onBlur={() => setEditingName(false)} onKeyDown={(event) => { if (event.key === "Enter") setEditingName(false); }} className="h-7 w-[280px] rounded-md border border-blue-600 px-2 text-[13px] font-bold" /> : <div className="flex items-center gap-2"><h1 className="truncate text-sm font-bold text-slate-900">{name || "Untitled workflow"}</h1>{!inspecting ? <button type="button" onClick={() => setEditingName(true)}><Pencil className="size-3.5 text-slate-400" /></button> : null}</div>}<div className="flex items-center gap-2 text-[10.5px] text-slate-500">{saved ? <WorkflowStatusChip status={workflow.status} /> : <span className="font-bold">NEW</span>}<span>v{inspecting?.version ?? workflow.version}</span><span>•</span><span className={dirty ? "font-semibold text-amber-700" : ""}>{inspecting ? "Historical revision" : dirty ? "Unsaved changes" : "All changes saved"}</span></div></div></div>
      <div className="flex shrink-0 items-center gap-2">{saved ? <button type="button" onClick={() => setHistoryOpen(true)} className="flex h-8 items-center gap-1.5 rounded-lg border px-3 text-xs font-semibold"><History className="size-3.5" />Versions</button> : null}<button type="button" disabled={!saved || Boolean(inspecting)} title={saved ? "Dry-run the workflow without sending anything" : "Save the workflow before simulating it"} onClick={() => setSimOpen(true)} className="flex h-8 items-center gap-1.5 rounded-lg border px-3 text-xs font-semibold disabled:opacity-40"><FlaskConical className="size-3.5" />Simulate</button>{saved ? <button type="button" onClick={() => setHealthOpen(true)} className="flex h-8 items-center gap-1.5 rounded-lg border px-3 text-xs font-semibold"><Activity className="size-3.5" />Health</button> : null}<button type="button" disabled={Boolean(inspecting)} onClick={openTest} className="flex h-8 items-center gap-1.5 rounded-lg border px-3 text-xs font-semibold disabled:opacity-40"><Play className="size-3.5" />Test Run</button>{saved && workflow.status === "Active" ? <button type="button" disabled={saving !== null || Boolean(inspecting)} onClick={() => void pause()} className="flex h-8 items-center gap-1.5 rounded-lg border px-3 text-xs font-semibold text-amber-700"><PauseCircle className="size-3.5" />Pause</button> : null}<button type="button" disabled={saving !== null || (!dirty && saved) || Boolean(inspecting)} onClick={() => void save("draft")} className="flex h-8 items-center gap-1.5 rounded-lg border px-3 text-xs font-semibold disabled:opacity-40"><Save className="size-3.5" />{saving === "draft" ? "Saving…" : "Save Draft"}</button><button type="button" disabled={saving !== null || Boolean(inspecting)} onClick={() => void save("publish")} className="flex h-8 items-center gap-1.5 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-4 text-xs font-semibold text-white disabled:opacity-40">{workflow.status === "Active" && !dirty ? <Check className="size-3.5" /> : <Send className="size-3.5" />}{saving === "publish" ? "Publishing…" : "Publish"}</button></div>
    </header>
    {conflict ? <div className="flex items-center justify-between border-b border-amber-200 bg-amber-50 px-5 py-2 text-xs text-amber-900"><span>This workflow changed in another editor. Your local changes were not overwritten.</span><button type="button" onClick={() => void reloadLatest()} className="flex items-center gap-1 font-bold"><RefreshCw className="size-3.5" />Discard local changes and reload</button></div> : null}
    {inspecting ? <div className="flex items-center justify-between border-b border-blue-200 bg-blue-50 px-5 py-2 text-xs text-blue-900"><span>Inspecting immutable version {inspecting.version}. Editing and execution controls are disabled.</span><button type="button" onClick={() => { setInspecting(null); setSelectedNodeId(nodes[0]?.id ?? null); }} className="flex items-center gap-1 font-bold"><X className="size-3.5" />Return to draft</button></div> : null}
    <div className="flex flex-1 overflow-hidden"><aside className="flex w-64 shrink-0 flex-col overflow-hidden border-r border-slate-200 bg-white"><NodeLibrary hasTrigger={hasTrigger} readOnly={Boolean(inspecting)} onAddNode={addNode} /></aside><main className="relative flex-1 overflow-hidden"><WorkflowCanvas nodes={visibleNodes} edges={visibleEdges} selectedNodeId={selectedNodeId} readOnly={Boolean(inspecting)} canUndo={past.length > 0} canRedo={future.length > 0} onSelectNode={setSelectedNodeId} onGraphChange={commitGraph} onDropNode={addNode} onUndo={undo} onRedo={redo} /></main><aside className="custom-scrollbar w-80 shrink-0 overflow-y-auto border-l border-slate-200 bg-white">{selectedNode ? <div className={inspecting ? "pointer-events-none opacity-75" : ""}><div className="border-b border-slate-100 px-4 py-2"><button type="button" disabled={!saved} title={saved ? "Evaluate this node against sample data. Nothing is sent." : "Save the workflow before testing a node"} onClick={() => setNodeTestOpen(true)} className="flex h-7 w-full items-center justify-center gap-1.5 rounded border border-slate-200 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40"><TestTube2 className="size-3.5" />Test This Node</button></div><NodeConfigPanel key={`${inspecting?.version ?? "draft"}-${selectedNode.id}`} node={selectedNode} workflowId={saved ? workflow.id : undefined} resources={resources} onChange={(updates) => { if (!inspecting) commitGraph(nodes.map((node) => node.id === selectedNode.id ? { ...node, ...updates } : node), edges); }} /></div> : <div className="flex h-full items-center justify-center p-6 text-center text-xs text-slate-500">Select a node to configure it.</div>}</aside></div>
    {saved ? <><SimulatorDialog key={`sim-${simOpen}`} open={simOpen} onClose={() => setSimOpen(false)} clientId={clientId} workflow={workflow} nodes={nodes} edges={edges} hasUnsavedChanges={dirty} /><HealthDialog open={healthOpen} onClose={() => setHealthOpen(false)} clientId={clientId} workflowId={workflow.id} />{selectedNode ? <NodeTestDialog key={`${selectedNode.id}-${nodeTestOpen}`} open={nodeTestOpen} onClose={() => setNodeTestOpen(false)} clientId={clientId} workflowId={workflow.id} node={selectedNode} /> : null}<TestRunDialog key={testKey} open={testOpen} onClose={() => setTestOpen(false)} workflow={workflow} clientId={clientId} onRan={(run) => { setLastRun(run); invalidate(); }} /><VersionHistoryDialog open={historyOpen} onOpenChange={setHistoryOpen} clientId={clientId} workflowId={workflow.id} currentVersion={workflow.version} onInspect={(version) => { setInspecting(version); setSelectedNodeId(version.definition.nodes?.[0]?.id ?? null); }} onRollback={rollback} /></> : null}
    {lastRun && !testOpen ? <button type="button" onClick={() => setRunSheetOpen(true)} className="fixed bottom-5 right-[22rem] z-20 rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-lg">View last test run</button> : null}<RunDetailsSheet run={lastRun} open={runSheetOpen} onOpenChange={setRunSheetOpen} />
    <AlertDialog open={confirmLeave} onOpenChange={setConfirmLeave}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Leave without saving?</AlertDialogTitle><AlertDialogDescription>Your changes to this workflow will be lost.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Keep editing</AlertDialogCancel><AlertDialogAction variant="destructive" onClick={onBack}>Discard changes</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </div>;
}
