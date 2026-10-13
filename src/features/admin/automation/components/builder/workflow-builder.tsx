"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Check, Pencil, Play, Send, Save, PauseCircle } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { getStoredCompanyId } from "@/lib/api/tenancy-storage";
import { whatsappApi } from "@/features/admin/channels/live/whatsapp-api";
import { teamApi } from "@/features/admin/team/live/team-api";
import type { AutomationNode, AutomationRun, AutomationWorkflow, AutomationWorkflowStatus } from "../../data/types";
import { automationApi, type WorkflowInput } from "../../data/automation-api";
import { errorMessage, useInvalidateAutomation } from "../../data/hooks";
import { RunDetailsSheet } from "../logs/run-details-sheet";
import { WorkflowStatusChip } from "../shared";
import { NodeLibrary, type LibraryItem } from "./node-library";
import { WorkflowCanvas } from "./canvas";
import { NodeConfigPanel, nodeProblem, type BuilderResources } from "./node-config-panel";
import { TestRunDialog } from "./test-run-dialog";

/** A workflow that has never been saved has an id starting with "draft_". */
export function isUnsaved(workflow: AutomationWorkflow) {
  return workflow.id.startsWith("draft_");
}

function toInput(name: string, status: AutomationWorkflowStatus, nodes: AutomationNode[], base: AutomationWorkflow): WorkflowInput {
  const trigger = nodes.find((n) => n.type === "trigger");
  const channels = Array.from(new Set(nodes.flatMap((n) => (n.actionId === "send_whatsapp" ? ["whatsapp"] : n.actionId === "send_email" ? ["email"] : n.actionId === "meta_lead" ? ["meta"] : []))));
  return {
    name: name.trim() || "Untitled workflow",
    status,
    trigger: { type: trigger?.actionId, label: trigger?.label },
    nodes: nodes.map((n) => ({ ...n, status: nodeProblem(n) ? "idle" : "configured" })),
    edges: nodes.slice(1).map((n, i) => ({ id: `e${i + 1}`, source: nodes[i]!.id, target: n.id })),
    channels,
    ownerId: base.ownerId,
    templateId: base.templateId,
  };
}

export function WorkflowBuilder({ workflow: initial, clientId, onBack }: { workflow: AutomationWorkflow; clientId: string; onBack: () => void }) {
  const invalidate = useInvalidateAutomation();
  const [workflow, setWorkflow] = useState(initial);
  const [nodes, setNodes] = useState<AutomationNode[]>(initial.nodes ?? []);
  const [name, setName] = useState(initial.name);
  const [editingName, setEditingName] = useState(isUnsaved(initial));
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(initial.nodes?.[0]?.id ?? null);
  const [saving, setSaving] = useState<null | "draft" | "publish" | "pause">(null);
  const [savedSnapshot, setSavedSnapshot] = useState(() => JSON.stringify({ name: initial.name, nodes: initial.nodes ?? [] }));
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [testOpen, setTestOpen] = useState(false);
  const [testKey, setTestKey] = useState(0);
  const [lastRun, setLastRun] = useState<AutomationRun | null>(null);
  const [runSheetOpen, setRunSheetOpen] = useState(false);
  const [resources, setResources] = useState<BuilderResources>({ templates: [], templatesError: null, members: [] });

  const dirty = JSON.stringify({ name, nodes }) !== savedSnapshot;
  const selectedNode = nodes.find((n) => n.id === selectedNodeId) ?? null;
  const problems = useMemo(() => nodes.map((n) => ({ node: n, problem: nodeProblem(n) })).filter((p) => p.problem), [nodes]);
  const hasTrigger = nodes.some((n) => n.type === "trigger");
  const saved = !isUnsaved(workflow);

  useEffect(() => {
    const companyId = getStoredCompanyId();
    let cancelled = false;
    void Promise.allSettled([whatsappApi.listTemplates(companyId, clientId), teamApi.listMembers(companyId)]).then(([tpl, team]) => {
      if (cancelled) return;
      setResources({
        templates: tpl.status === "fulfilled" ? tpl.value.items.filter((t) => t.status === "ENABLED").map((t) => ({ id: t.id, name: t.name, language: t.language, variables: t.variables ?? [], status: t.status, providerStatus: t.providerStatus })) : [],
        templatesError: tpl.status === "rejected" ? "WhatsApp is not connected for this client (Channels → WhatsApp)." : null,
        members: team.status === "fulfilled" ? team.value.filter((m) => !m.suspendedAt).map((m) => ({ id: m.user.id, name: m.user.name?.trim() || m.user.email })) : [],
      });
    });
    return () => { cancelled = true; };
  }, [clientId]);

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const addNode = (item: LibraryItem) => {
    const node: AutomationNode = { id: `node_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, type: item.type, actionId: item.id, label: item.label, description: item.description, status: "idle", config: item.id === "delay" ? { duration: 1, unit: "hours" } : item.id === "send_whatsapp" ? { phone: "{{lead.phone}}", variables: {} } : item.id === "create_task" ? { dueInDays: 1, priority: "medium" } : {} };
    if (item.type === "trigger") {
      const existing = nodes.find((n) => n.type === "trigger");
      // Replacing a trigger keeps a webhook token only if the new trigger is a webhook type too.
      const keep = existing && ["inbound_webhook", "form_submission"].includes(item.id) ? { webhookToken: existing.config?.webhookToken } : {};
      setNodes((prev) => [{ ...node, config: { ...node.config, ...(keep.webhookToken ? keep : {}) } }, ...prev.filter((n) => n.type !== "trigger")]);
      if (existing) toast.info(`Trigger replaced with “${item.label}”`);
    } else {
      setNodes((prev) => [...prev, node]);
    }
    setSelectedNodeId(node.id);
  };

  const updateNode = (id: string, updates: Partial<AutomationNode>) => setNodes((prev) => prev.map((n) => (n.id === id ? { ...n, ...updates } : n)));

  const moveNode = (id: string, dir: -1 | 1) => setNodes((prev) => {
    const i = prev.findIndex((n) => n.id === id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= prev.length || prev[j]!.type === "trigger" || prev[i]!.type === "trigger") return prev;
    const next = [...prev];
    [next[i], next[j]] = [next[j]!, next[i]!];
    return next;
  });

  const deleteNode = (id: string) => {
    setNodes((prev) => prev.filter((n) => n.id !== id));
    if (selectedNodeId === id) setSelectedNodeId(null);
  };

  const save = async (mode: "draft" | "publish" | "pause") => {
    if (!name.trim()) { toast.error("Give the workflow a name"); setEditingName(true); return; }
    if (mode === "publish") {
      if (!hasTrigger) { toast.error("Add a trigger before publishing"); return; }
      if (nodes.length < 2) { toast.error("Add at least one step after the trigger"); return; }
      if (problems.length) { toast.error(`Finish configuring: ${problems[0]!.node.label} — ${problems[0]!.problem}`); setSelectedNodeId(problems[0]!.node.id); return; }
    }
    const status: AutomationWorkflowStatus = mode === "publish" ? "Active" : mode === "pause" ? "Paused" : saved ? workflow.status : "Draft";
    setSaving(mode);
    try {
      const input = toInput(name, status, nodes, workflow);
      const result = saved ? await automationApi.updateWorkflow(clientId, workflow.id, input) : await automationApi.createWorkflow(clientId, input);
      setWorkflow(result);
      setNodes(result.nodes);
      setName(result.name);
      setSavedSnapshot(JSON.stringify({ name: result.name, nodes: result.nodes }));
      invalidate();
      toast.success(mode === "publish" ? "Workflow published — it is now live" : mode === "pause" ? "Workflow paused" : "Draft saved");
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setSaving(null);
    }
  };

  const openTest = () => {
    if (!saved) { toast.error("Save the workflow before testing it"); return; }
    if (dirty) { toast.error("Save your changes first — tests run the saved version"); return; }
    setTestKey((k) => k + 1);
    setTestOpen(true);
  };

  const back = () => (dirty ? setConfirmLeave(true) : onBack());

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-[#F8FAFC]">
      <header className="z-20 flex h-14 shrink-0 items-center justify-between gap-3 border-b border-[#E2E8F0] bg-white px-5">
        <div className="flex min-w-0 items-center gap-4">
          <button type="button" onClick={back} aria-label="Back to workflows" className="rounded-lg p-1.5 text-[#64748B] hover:bg-[#F1F5F9]"><ArrowLeft className="size-4" /></button>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              {editingName ? (
                <input autoFocus value={name} maxLength={200} onChange={(e) => setName(e.target.value)} onBlur={() => setEditingName(false)} onKeyDown={(e) => { if (e.key === "Enter") setEditingName(false); }} className="h-7 w-[280px] rounded-md border border-[#2563EB] px-2 text-[13px] font-bold text-[#111C3A] focus:outline-none" placeholder="Workflow name" />
              ) : (
                <>
                  <h1 className="truncate text-[14px] font-bold text-[#111C3A]">{name || "Untitled workflow"}</h1>
                  <button type="button" aria-label="Rename workflow" onClick={() => setEditingName(true)} className="rounded p-1 text-[#94A3B8] hover:bg-[#F1F5F9] hover:text-[#64748B]"><Pencil className="size-3.5" /></button>
                </>
              )}
            </div>
            <div className="flex items-center gap-2 text-[10.5px] text-[#6B7A94]">
              {saved ? <WorkflowStatusChip status={workflow.status} /> : <span className="rounded bg-[#F1F5F9] px-1.5 py-0.5 text-[10px] font-bold text-[#475569]">NEW</span>}
              {saved ? <span>v{workflow.version}</span> : null}
              <span>•</span>
              <span className={dirty ? "font-semibold text-[#B45309]" : ""}>{dirty ? "Unsaved changes" : saved ? "All changes saved" : "Not saved yet"}</span>
              {problems.length ? <><span>•</span><span className="text-[#B45309]">{problems.length} step{problems.length === 1 ? "" : "s"} need setup</span></> : null}
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <button type="button" onClick={openTest} className="flex h-8 items-center gap-1.5 rounded-lg border border-[#E2E8F0] bg-white px-3 text-[11.5px] font-semibold text-[#334155] hover:bg-slate-50"><Play className="size-3.5" /> Test</button>
          {saved && workflow.status === "Active" ? (
            <button type="button" disabled={saving !== null} onClick={() => void save("pause")} className="flex h-8 items-center gap-1.5 rounded-lg border border-[#E2E8F0] bg-white px-3 text-[11.5px] font-semibold text-[#B45309] hover:bg-amber-50 disabled:opacity-50"><PauseCircle className="size-3.5" /> {saving === "pause" ? "Pausing..." : "Pause"}</button>
          ) : null}
          <button type="button" disabled={saving !== null || (!dirty && saved)} onClick={() => void save("draft")} className="flex h-8 items-center gap-1.5 rounded-lg border border-[#E2E8F0] bg-white px-3 text-[11.5px] font-semibold text-[#111C3A] hover:bg-slate-50 disabled:opacity-50"><Save className="size-3.5" /> {saving === "draft" ? "Saving..." : saved && workflow.status === "Active" ? "Save" : "Save Draft"}</button>
          <button type="button" disabled={saving !== null || (saved && workflow.status === "Active" && !dirty)} onClick={() => void save("publish")} className="flex h-8 items-center gap-1.5 rounded-lg bg-gradient-to-r from-[#2563EB] to-[#4F46E5] px-4 text-[11.5px] font-semibold text-white shadow-sm hover:from-[#1D4ED8] hover:to-[#4338CA] disabled:opacity-50">
            {saved && workflow.status === "Active" && !dirty ? <Check className="size-3.5" /> : <Send className="size-3.5" />}
            {saving === "publish" ? "Publishing..." : saved && workflow.status === "Active" ? (dirty ? "Publish Changes" : "Live") : "Publish"}
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <aside className="flex w-64 shrink-0 flex-col overflow-hidden border-r border-[#E2E8F0] bg-white"><NodeLibrary hasTrigger={hasTrigger} onAddNode={addNode} /></aside>
        <main className="relative flex-1 overflow-hidden bg-[#F8FAFC]">
          <WorkflowCanvas nodes={nodes} selectedNodeId={selectedNodeId} onSelectNode={setSelectedNodeId} onMoveNode={moveNode} onDeleteNode={deleteNode} />
        </main>
        <aside className="custom-scrollbar w-80 shrink-0 overflow-y-auto border-l border-[#E2E8F0] bg-white">
          {selectedNode ? (
            <NodeConfigPanel key={selectedNode.id} node={selectedNode} workflowId={saved ? workflow.id : undefined} resources={resources} onChange={(u) => updateNode(selectedNode.id, u)} />
          ) : (
            <div className="flex h-full items-center justify-center p-6 text-center"><p className="text-[11.5px] text-[#6B7A94]">Select a step on the canvas to configure it.</p></div>
          )}
        </aside>
      </div>

      {saved ? <TestRunDialog key={testKey} open={testOpen} onClose={() => setTestOpen(false)} workflow={workflow} clientId={clientId} onRan={(run) => { setLastRun(run); invalidate(); }} /> : null}
      {lastRun && !testOpen ? (
        <button type="button" onClick={() => setRunSheetOpen(true)} className="fixed bottom-5 right-[22rem] z-20 rounded-full bg-[#111C3A] px-4 py-2 text-[11.5px] font-semibold text-white shadow-lg hover:bg-[#1E293B]">View last test run</button>
      ) : null}
      <RunDetailsSheet run={lastRun} open={runSheetOpen} onOpenChange={setRunSheetOpen} />

      <AlertDialog open={confirmLeave} onOpenChange={setConfirmLeave}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Leave without saving?</AlertDialogTitle>
            <AlertDialogDescription>Your changes to this workflow will be lost.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep editing</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={onBack}>Discard changes</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
