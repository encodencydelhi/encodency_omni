"use client";

import { useState } from "react";
import { ShieldAlert } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface DuplicateRiskDialogProps {
  open: boolean;
  runCount: number;
  busy: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  /** Single run only: record what really happened instead of replaying. Sends nothing. */
  onReconcile?: (resolution: "DELIVERED" | "NOT_DELIVERED", note: string) => void;
  /** Render above full-screen overlays such as the visual debugger. */
  elevated?: boolean;
}

export function DuplicateRiskDialog({ open, runCount, busy, onOpenChange, onConfirm, onReconcile, elevated }: DuplicateRiskDialogProps) {
  const [note, setNote] = useState("");
  const canReconcile = Boolean(onReconcile) && runCount === 1;
  const noteReady = note.trim().length >= 3;
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className={elevated ? "z-[130]" : undefined} overlayClassName={elevated ? "z-[130]" : undefined}>
        <AlertDialogHeader>
          <div className="mb-1 flex size-10 items-center justify-center rounded-full bg-amber-100 text-amber-700">
            <ShieldAlert className="size-5" />
          </div>
          <AlertDialogTitle>Confirm possible duplicate delivery</AlertDialogTitle>
          <AlertDialogDescription>
            {runCount === 1 ? "This run" : `${runCount} selected runs`} stopped while an irreversible external action was in flight. The provider may already have completed it. Verify the destination first; replaying can send a duplicate message or repeat another side effect.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {canReconcile ? (
          <div className="space-y-2 rounded-md border border-slate-200 bg-slate-50 p-3">
            <label className="block text-[11px] font-semibold text-slate-700">
              Already checked the destination? Record what you found (required)
              <input value={note} maxLength={500} onChange={(event) => setNote(event.target.value)} placeholder="e.g. Confirmed in the recipient's mailbox" className="mt-1 h-8 w-full rounded-md border border-slate-200 bg-white px-2 text-[12px] font-normal" />
            </label>
            <div className="flex gap-2">
              <button type="button" disabled={busy || !noteReady} onClick={() => onReconcile?.("DELIVERED", note.trim())} className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-[11px] font-semibold disabled:opacity-50">It was delivered</button>
              <button type="button" disabled={busy || !noteReady} onClick={() => onReconcile?.("NOT_DELIVERED", note.trim())} className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-[11px] font-semibold disabled:opacity-50">It was not delivered</button>
            </div>
            <p className="text-[10.5px] text-slate-500">This sends nothing. Afterwards you can retry without this warning.</p>
          </div>
        ) : null}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>Cancel and verify</AlertDialogCancel>
          <AlertDialogAction variant="destructive" disabled={busy} onClick={onConfirm}>
            {busy ? "Replaying..." : "I understand — replay"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
