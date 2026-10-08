"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export const MIN_REASON_LENGTH = 3;

interface ReasonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel: string;
  pendingLabel: string;
  isPending: boolean;
  destructive?: boolean;
  onConfirm: (reason: string) => void;
}

/** Asks why before a queue or job is changed. The reason is kept in the audit trail. */
export function ReasonDialog({ open, onOpenChange, ...rest }: ReasonDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">{open && <ReasonBody onClose={() => onOpenChange(false)} {...rest} />}</DialogContent>
    </Dialog>
  );
}

function ReasonBody({ title, description, confirmLabel, pendingLabel, isPending, destructive, onConfirm, onClose }: Omit<ReasonDialogProps, "open" | "onOpenChange"> & { onClose: () => void }) {
  const [reason, setReason] = useState("");
  const ready = reason.trim().length >= MIN_REASON_LENGTH;
  return (
    <>
      <DialogHeader>
        <DialogTitle className="text-base font-bold">{title}</DialogTitle>
        <DialogDescription className="text-xs text-slate-500">{description}</DialogDescription>
      </DialogHeader>
      <div className="space-y-1.5 py-2 text-xs">
        <Label htmlFor="jobs-reason" className="text-xs font-semibold">Reason</Label>
        <Textarea id="jobs-reason" value={reason} maxLength={300} rows={3} placeholder="Why is this needed? Kept in the audit trail." onChange={(e) => setReason(e.target.value)} className="text-xs" />
      </div>
      <DialogFooter className="gap-2">
        <Button type="button" variant="outline" size="sm" className="text-xs" onClick={onClose}>Cancel</Button>
        <Button type="button" size="sm" variant={destructive ? "destructive" : "default"} className="text-xs" disabled={!ready || isPending} onClick={() => onConfirm(reason.trim())}>
          {isPending ? pendingLabel : confirmLabel}
        </Button>
      </DialogFooter>
    </>
  );
}
