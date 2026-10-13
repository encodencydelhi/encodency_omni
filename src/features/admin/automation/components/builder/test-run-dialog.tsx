"use client";

import { useEffect, useMemo, useState } from "react";
import { Play } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getStoredCompanyId } from "@/lib/api/tenancy-storage";
import { crmApi } from "@/features/admin/crm/data/crm-api";
import { automationApi } from "../../data/automation-api";
import { errorMessage } from "../../data/hooks";
import type { AutomationRun, AutomationWorkflow } from "../../data/types";
import { RunStatusChip } from "../shared";

interface CrmRow { id: string; firstName?: string; lastName?: string; name?: string; email?: string; phone?: string }

function samplePayload(trigger: string): string {
  if (trigger === "form_submission" || trigger === "inbound_webhook") {
    return JSON.stringify({ name: "Test Visitor", email: "test.visitor@example.com", phone: "9876543210", message: "This is a test submission" }, null, 2);
  }
  if (trigger === "website_down") return JSON.stringify({ domain: "example.com", url: "https://example.com", status: 503, checkedAt: new Date().toISOString() }, null, 2);
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
      const res = await automationApi.runWorkflow(clientId, workflow.id, {
        payload: parsed.value, eventType: triggerType === "noop" ? "manual" : triggerType, test: true,
        ...(kind !== "none" && recordId ? { recordKind: kind, recordId } : {}),
      });
      setResult(res);
      onRan(res);
      if (res.status === "Failed") toast.error("Test run failed — see the steps for the reason");
      else toast.success(`Test run ${res.status.toLowerCase()}`);
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setRunning(false);
    }
  };

  const rowName = (r: CrmRow) => `${r.firstName ?? ""} ${r.lastName ?? ""}`.trim() || r.name || r.email || r.id;

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Test “{workflow.name}”</DialogTitle>
          <DialogDescription>Runs the saved version once. Real actions happen (messages are sent, records change) unless Sandbox dry-run is on in Settings → Safety.</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
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
            <div className="flex items-center justify-between rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2 text-[12px]">
              <span className="flex items-center gap-2"><RunStatusChip status={result.status} /> {result.steps.filter((s) => s.status === "Successful").length}/{result.steps.length} steps completed</span>
              <span className="font-mono text-[11px] text-[#64748B]">{result.id.slice(0, 8)}</span>
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
          <Button disabled={!parsed.ok || running || (kind !== "none" && !recordId)} onClick={() => void run()}><Play className="size-3.5" /> {running ? "Running..." : "Run test"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
