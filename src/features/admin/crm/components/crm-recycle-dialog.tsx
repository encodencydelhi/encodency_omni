"use client";

import { useState } from "react";
import { ArchiveRestore, Loader2, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { crmApi, type CrmKind, type CrmScope } from "../data/crm-api";

interface ArchivedRecord { id: string; name?: string; firstName?: string; lastName?: string; title?: string; archivedAt: string }

export function CrmRecycleDialog({ kind, scope, onRestored }: { kind: CrmKind; scope: CrmScope | null; onRestored: () => void }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [restoring, setRestoring] = useState<string | null>(null);
  const [records, setRecords] = useState<ArchivedRecord[]>([]);

  const load = async () => {
    if (!scope) return;
    setLoading(true);
    try { setRecords(await crmApi.archived<ArchivedRecord>(kind, scope)); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Recycle bin could not be loaded."); }
    finally { setLoading(false); }
  };

  const changeOpen = (next: boolean) => {
    setOpen(next);
    if (next) void load();
  };

  const restore = async (record: ArchivedRecord) => {
    if (!scope) return;
    setRestoring(record.id);
    try {
      await crmApi.restore(kind, record.id, scope);
      setRecords((current) => current.filter((item) => item.id !== record.id));
      onRestored();
      toast.success("Record restored");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Record could not be restored."); }
    finally { setRestoring(null); }
  };

  return <>
    <Button variant="outline" size="sm" onClick={() => changeOpen(true)} disabled={!scope}><ArchiveRestore className="size-3.5" /> Recycle Bin</Button>
    <Dialog open={open} onOpenChange={changeOpen}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader><DialogTitle>Recycle Bin</DialogTitle><DialogDescription>Archived {kind} records can be restored without losing their stored details.</DialogDescription></DialogHeader>
        {loading ? <div className="flex justify-center py-8"><Loader2 className="size-5 animate-spin" /></div> : records.length === 0 ? <p className="py-8 text-center text-sm text-slate-500">Recycle bin is empty.</p> : <div className="max-h-80 space-y-2 overflow-y-auto">
          {records.map((record) => <div key={record.id} className="flex items-center justify-between gap-3 rounded-md border p-3"><div className="min-w-0"><p className="truncate text-sm font-medium">{record.name || `${record.firstName ?? ""} ${record.lastName ?? ""}`.trim() || record.title || "Untitled"}</p><p className="text-xs text-slate-500">Archived {new Date(record.archivedAt).toLocaleString()}</p></div><Button size="sm" variant="outline" disabled={restoring === record.id} onClick={() => void restore(record)}><RotateCcw className="size-3.5" /> Restore</Button></div>)}
        </div>}
      </DialogContent>
    </Dialog>
  </>;
}
