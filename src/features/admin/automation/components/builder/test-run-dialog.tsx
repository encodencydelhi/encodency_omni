"use client";

import { useEffect, useMemo, useState } from "react";
import { FlaskConical, Play, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/features/auth/components/auth-provider";
import { getStoredCompanyId } from "@/lib/api/tenancy-storage";
import { crmApi } from "@/features/admin/crm/data/crm-api";
import { automationApi, type LiveTestTask } from "../../data/automation-api";
import { errorMessage } from "../../data/hooks";
import type { AutomationRun, AutomationWorkflow } from "../../data/types";
import { RunStatusChip } from "../shared";
import { ActionPreviewCard, previewOf } from "../action-preview-card";

interface CrmRow { id: string; firstName?: string; lastName?: string; name?: string; email?: string; phone?: string }

function samplePayload(trigger: string): string {
  if (trigger === "form_submission" || trigger === "inbound_webhook") {
    return JSON.stringify({ name: "Test Visitor", email: "test.visitor@example.com", phone: "9876543210", message: "This is a test submission" }, null, 2);
  }
  if (trigger === "website_down") return JSON.stringify({ website: { id: "sample-website-id", url: "https://example.com", name: "Example Site", httpStatus: 503, errorMessage: "Service unavailable", detectedAt: new Date().toISOString(), region: "Primary", incidentId: "sample-incident" }, company: { id: "sample-company-id", name: "Example Company" }, recipient: { email: null } }, null, 2);
  return JSON.stringify({ note: "Manual test run" }, null, 2);
}

/** Runs a saved workflow once, optionally against a real CRM record. Mount with a changing `key`. */
export function TestRunDialog({ open, onClose, workflow, clientId, onRan }: {
  open: boolean;
  onClose: () => void;
  workflow: AutomationWorkflow;
  clientId: string;
  onRan: (run: AutomationRun) => void;
}) {
  const triggerType = workflow.trigger.type;
  const defaultKind = triggerType === "new_customer" ? "contact" : ["new_lead", "meta_lead"].includes(triggerType) ? "lead" : "none";
  const [kind, setKind] = useState<"none" | "lead" | "contact">(defaultKind as "none" | "lead" | "contact");
  const [records, setRecords] = useState<CrmRow[]>([]);
  const [recordId, setRecordId] = useState("");
  const [payload, setPayload] = useState(() => samplePayload(triggerType));
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<AutomationRun | null>(null);
  const { user } = useAuth();
  const [live, setLive] = useState(false);
  const [recipient, setRecipient] = useState(user?.email ?? "");
  const [createTask, setCreateTask] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [testTasks, setTestTasks] = useState<LiveTestTask[]>([]);
  const [requestKey, setRequestKey] = useState(() => crypto.randomUUID());

  useEffect(() => {
    if (kind === "none") return;
    let cancelled = false;
    crmApi.list<CrmRow>(kind, { companyId: getStoredCompanyId(), clientId })
      .then((rows) => { if (!cancelled) setRecords(rows); })
      .catch(() => { if (!cancelled) setRecords([]); });
    return () => { cancelled = true; };
  }, [kind, clientId]);

  const parsed = useMemo(() => {
    try {
      const value = JSON.parse(payload || "{}");
      return value && typeof value === "object" && !Array.isArray(value) ? { ok: true as const, value } : { ok: false as const };
    } catch {
      return { ok: false as const };
    }
  }, [payload]);

  const run = async () => {
    if (!parsed.ok) return;
    setRunning(true);
    setResult(null);
    try {
      const accepted = live
        ? await automationApi.liveTestWorkflow(clientId, workflow.id, { payload: parsed.value, recipient: recipient.trim(), createTestTask: createTask, confirm: true, requestKey, ...(kind !== "none" && recordId ? { recordKind: kind, recordId } : {}) })
        : await automationApi.runWorkflow(clientId, workflow.id, {
          payload: parsed.value, eventType: triggerType === "noop" ? "manual" : triggerType, test: true,
          ...(kind !== "none" && recordId ? { recordKind: kind, recordId } : {}),
        });
      setResult(accepted);
      let res = accepted;
      for (let attempt = 0; attempt < 60 && ["Waiting", "Running"].includes(res.status); attempt += 1) {
        await new Promise((resolve) => window.setTimeout(resolve, 500));
        res = await automationApi.getRun(clientId, accepted.id);
        setResult(res);
      }
      onRan(res);
      if (live) {
        setRequestKey(crypto.randomUUID());
        setConfirmed(false);
        setTestTasks(await automationApi.liveTestTasks(clientId, res.id).catch(() => []));
      }
      if (res.status === "Failed") toast.error(`${live ? "Live test" : "Test run"} failed — see the steps for the reason`);
      else if (["Waiting", "Running"].includes(res.status)) toast.info(`${live ? "Live test" : "Test run"} is still queued. You can inspect it in execution logs.`);
      else toast.success(`${live ? "Live test" : "Test run"} ${res.status.toLowerCase()}`);
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setRunning(false);
    }
  };

  const removeTestTask = async (task: LiveTestTask) => {
    try {
      await automationApi.deleteLiveTestTask(clientId, task.id);
      setTestTasks((list) => list.filter((t) => t.id !== task.id));
      toast.success("Test task deleted");
    } catch (error) {
      toast.error(errorMessage(error));
    }
  };

  const rowName = (r: CrmRow) => `${r.firstName ?? ""} ${r.lastName ?? ""}`.trim() || r.name || r.email || r.id;

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onClose(); }}>
      <DialogContent overlayClassName="z-[110]" className="z-[120] max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Test “{workflow.name}”</DialogTitle>
          <DialogDescription>{live
            ? "Live Test: sends ONE real email to the test recipient below and, if you ask, creates a clearly marked test task. WhatsApp, assignment and record updates stay blocked. Nothing reaches the real lead."
            : "Safe test: runs the saved version once, but nothing is sent and no record, lead or task is created or changed. Email, WhatsApp, task and record steps show as “Skipped”, each with a preview of exactly what a live run would use."}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-1 rounded-lg bg-[#F1F5F9] p-1 text-[12px] font-semibold" role="tablist" aria-label="Test mode">
            <button type="button" role="tab" aria-selected={!live} onClick={() => { setLive(false); setConfirmed(false); }} className={`rounded-md py-1.5 ${!live ? "bg-white shadow-sm" : "text-[#64748B]"}`}>Safe test</button>
            <button type="button" role="tab" aria-selected={live} onClick={() => setLive(true)} className={`flex items-center justify-center gap-1 rounded-md py-1.5 ${live ? "bg-white text-amber-800 shadow-sm" : "text-[#64748B]"}`}><FlaskConical className="size-3.5" /> Live Test</button>
          </div>
          {live ? (
            <div className="space-y-2 rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-[12px]" data-testid="live-test-options">
              <label className="block"><span className="mb-1 block text-[11.5px] font-semibold text-[#111C3A]">Test recipient (verified team member)</span>
                <input type="email" value={recipient} onChange={(e) => setRecipient(e.target.value)} className="h-9 w-full rounded-lg border border-[#E2E8F0] bg-white px-2.5 text-[12px]" aria-label="Test recipient" />
              </label>
              <label className="flex items-center gap-2"><input type="checkbox" checked={createTask} onChange={(e) => setCreateTask(e.target.checked)} /> Also create a marked test task (assigned to me, deletable below)</label>
              <label className="flex items-start gap-2 font-medium text-amber-900"><input type="checkbox" className="mt-0.5" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} /> I understand this sends a real email to {recipient || "the recipient"}{createTask ? " and creates a real test task" : ""}.</label>
            </div>
          ) : null}
          <div className="grid grid-cols-[8rem_1fr] gap-2">
            <select className="h-9 rounded-lg border border-[#E2E8F0] bg-white px-2 text-[12px]" value={kind} onChange={(e) => { setKind(e.target.value as typeof kind); setRecordId(""); setRecords([]); }} aria-label="Record type">
              <option value="none">No record</option>
              <option value="lead">Lead</option>
              <option value="contact">Contact</option>
            </select>
            {kind === "none" ? (
              <div className="flex items-center rounded-lg border border-dashed border-[#CBD5E1] px-3 text-[11px] text-[#64748B]">Record actions (assign, update, task) need a record</div>
            ) : (
              <select className="h-9 rounded-lg border border-[#E2E8F0] bg-white px-2 text-[12px]" value={recordId} onChange={(e) => setRecordId(e.target.value)} aria-label="Record">
                <option value="">{records.length ? `Select a ${kind}…` : `No ${kind}s found`}</option>
                {records.map((r) => <option key={r.id} value={r.id}>{rowName(r)}{r.phone ? ` · ${r.phone}` : ""}</option>)}
              </select>
            )}
          </div>
          <div>
            <p className="mb-1 text-[11.5px] font-semibold text-[#111C3A]">Trigger payload (JSON)</p>
            <textarea rows={7} value={payload} onChange={(e) => setPayload(e.target.value)} className="w-full resize-none rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-2.5 font-mono text-[11px] focus:border-[#2563EB] focus:outline-none" />
            {!parsed.ok ? <p className="mt-1 text-[11px] text-red-600">Payload must be a JSON object.</p> : null}
          </div>
          {result ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2 text-[12px]">
                <span className="flex items-center gap-2"><RunStatusChip status={result.status} /> {result.steps.filter((s) => s.status === "Successful").length} executed · {result.steps.filter((s) => s.status === "Skipped").length} skipped (not executed)</span>
                <span className="font-mono text-[11px] text-[#64748B]">{result.id.slice(0, 8)}</span>
              </div>
              {["Waiting", "Running"].includes(result.status) ? <p className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-[11.5px] text-blue-900">The run is queued or being processed. Email has not been skipped; this view refreshes until the worker records a final delivery result.</p> : null}
              {!live && result.steps.some((s) => s.status === "Skipped") ? (
                <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11.5px] text-amber-900" data-testid="safe-test-hint">
                  Safe test: <b>no email was sent</b> and nothing was created. To receive a real test email, <button type="button" className="font-semibold underline" onClick={() => { setLive(true); setResult(null); }}>switch to Live Test</button>.
                </p>
              ) : null}
              {testTasks.length ? (
                <ul className="space-y-1" data-testid="live-test-tasks">
                  {testTasks.map((task) => (
                    <li key={task.id} className="flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-[11.5px]"><span className="truncate">Test task: {task.title}</span><Button size="sm" variant="outline" onClick={() => void removeTestTask(task)}><Trash2 className="size-3" /> Delete Test Task</Button></li>
                  ))}
                </ul>
              ) : null}
              <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
                {result.steps.map((s) => {
                  const preview = previewOf(s.output);
                  return (
                    <div key={s.id} className="space-y-1.5">
                      <p className="flex items-center justify-between text-[11.5px] font-semibold text-[#111C3A]"><span>{s.label ?? s.actionId ?? s.nodeId}</span><span className="text-[10.5px] font-medium text-[#64748B]">{s.status}</span></p>
                      {s.error ? <p className="rounded border border-red-200 bg-red-50 px-2 py-1 text-[11px] text-red-800">{s.error}</p> : null}
                      {preview ? <ActionPreviewCard preview={preview} /> : null}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
          <Button disabled={!parsed.ok || running || (kind !== "none" && !recordId) || (live && (!confirmed || !recipient.trim()))} onClick={() => void run()}><Play className="size-3.5" /> {running ? "Running..." : live ? "Run Live Test" : "Run test"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
