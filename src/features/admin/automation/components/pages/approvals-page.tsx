"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Clock3, XCircle } from "lucide-react";
import { toast } from "sonner";
import { automationApi } from "../../data/automation-api";
import type { AutomationApproval } from "../../data/types";
import { errorMessage, useAutomationScope } from "../../data/hooks";

export function ApprovalsPage() {
  const { clientId } = useAutomationScope();
  const [rows, setRows] = useState<AutomationApproval[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const load = useCallback(async () => {
    if (!clientId) { setRows([]); return; }
    try { setRows(await automationApi.approvals(clientId)); } catch (error) { toast.error(errorMessage(error)); }
  }, [clientId]);
  useEffect(() => {
    const timeout = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timeout);
  }, [load]);
  const decide = async (row: AutomationApproval, decision: "APPROVED" | "REJECTED") => {
    if (!clientId) return;
    setBusy(row.id);
    try { await automationApi.decideApproval(clientId, row.id, decision); toast.success(decision === "APPROVED" ? "Approval granted" : "Approval rejected"); await load(); }
    catch (error) { toast.error(errorMessage(error)); } finally { setBusy(null); }
  };
  if (!clientId) return <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">Select a client to review workflow approvals.</div>;
  return <div className="space-y-3">
    <div><h2 className="text-lg font-bold text-slate-900">Workflow approvals</h2><p className="text-xs text-slate-500">Only requests assigned to you are actionable. Completed decisions remain visible for audit history.</p></div>
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      {rows.length ? rows.map((row) => <div key={row.id} className="flex flex-wrap items-center gap-3 border-b border-slate-100 p-4 last:border-0">
        <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-slate-900">{row.workflowName}</p><p className="mt-1 flex items-center gap-1 text-[11px] text-slate-500"><Clock3 className="size-3" />Expires {new Date(row.expiresAt).toLocaleString()}</p></div>
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-600">{row.status}</span>
        {row.status === "PENDING" ? <><button disabled={busy === row.id} onClick={() => void decide(row, "REJECTED")} className="inline-flex h-8 items-center gap-1 rounded-lg border border-red-200 px-3 text-xs font-semibold text-red-700 disabled:opacity-50"><XCircle className="size-3.5" />Reject</button><button disabled={busy === row.id} onClick={() => void decide(row, "APPROVED")} className="inline-flex h-8 items-center gap-1 rounded-lg bg-emerald-600 px-3 text-xs font-semibold text-white disabled:opacity-50"><CheckCircle2 className="size-3.5" />Approve</button></> : null}
      </div>) : <div className="p-8 text-center text-sm text-slate-500">No approval requests.</div>}
    </div>
  </div>;
}
