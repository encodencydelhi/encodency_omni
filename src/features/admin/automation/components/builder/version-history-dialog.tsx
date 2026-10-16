"use client";

import { useEffect, useState } from "react";
import { Eye, History, RotateCcw } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { automationApi, type WorkflowVersion } from "../../data/automation-api";
import { errorMessage } from "../../data/hooks";

export function VersionHistoryDialog({ open, clientId, workflowId, currentVersion, onOpenChange, onInspect, onRollback }: {
  open: boolean; clientId: string; workflowId: string; currentVersion: number; onOpenChange: (open: boolean) => void;
  onInspect: (version: WorkflowVersion) => void; onRollback: (version: WorkflowVersion) => Promise<void>;
}) {
  const [versions, setVersions] = useState<WorkflowVersion[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [rollingBack, setRollingBack] = useState<number | null>(null);
  useEffect(() => { if (!open) return; void automationApi.workflowVersions(clientId, workflowId).then((items) => { setError(null); setVersions(items); }).catch((reason) => setError(errorMessage(reason))); }, [clientId, open, workflowId]);
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-w-2xl"><DialogHeader><DialogTitle className="flex items-center gap-2"><History className="size-5" />Version history</DialogTitle><DialogDescription>Inspect an immutable revision or roll it forward as a new published version.</DialogDescription></DialogHeader>
    {error ? <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
    <div className="max-h-[60vh] space-y-2 overflow-y-auto">
      {versions.map((version) => <div key={version.id} className="flex items-center justify-between rounded-xl border border-slate-200 p-3"><div><div className="flex items-center gap-2"><span className="text-sm font-bold text-slate-900">Version {version.version}</span><span className={`rounded px-2 py-0.5 text-[9px] font-bold ${version.state === "PUBLISHED" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{version.state}</span>{version.version === currentVersion ? <span className="text-[10px] text-slate-500">Current draft</span> : null}</div><p className="mt-1 text-[11px] text-slate-500">{new Date(version.createdAt).toLocaleString()}{version.sourceVersion ? ` · restored from v${version.sourceVersion}` : ""}</p></div><div className="flex gap-2"><button type="button" onClick={() => { onInspect(version); onOpenChange(false); }} className="flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold"><Eye className="size-3.5" />Inspect</button><button type="button" disabled={rollingBack !== null || version.version === currentVersion} onClick={() => { setRollingBack(version.version); void onRollback(version).finally(() => setRollingBack(null)); }} className="flex items-center gap-1 rounded-lg bg-slate-900 px-2.5 py-1.5 text-[11px] font-semibold text-white disabled:opacity-40"><RotateCcw className="size-3.5" />Rollback</button></div></div>)}
      {!error && versions.length === 0 ? <p className="py-8 text-center text-sm text-slate-500">Loading versions…</p> : null}
    </div>
  </DialogContent></Dialog>;
}
