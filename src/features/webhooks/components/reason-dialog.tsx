/**
 * Media360 - Super Admin Webhooks Module
 * A small confirm dialog that asks for a reason (at least 3 characters) before an audited action.
 */

"use client";

import { Loader2Icon } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function ReasonDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  placeholder = "Why?",
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel: string;
  placeholder?: string;
  onConfirm: (reason: string) => Promise<void>;
}) {
  const [reason, setReason] = useState("");
  const [touched, setTouched] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const reasonError = touched && reason.trim().length < 3 ? "Give a reason of at least 3 characters." : null;

  function reset() {
    setReason("");
    setTouched(false);
    setPending(false);
    setError(null);
  }

  async function submit() {
    setTouched(true);
    if (reason.trim().length < 3) return;
    setPending(true);
    setError(null);
    try {
      await onConfirm(reason.trim());
      reset();
      onOpenChange(false);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "This could not be saved.");
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next && pending) return; if (!next) reset(); onOpenChange(next); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label htmlFor="reason-dialog-text">Reason *</Label>
          <Textarea id="reason-dialog-text" rows={3} value={reason} onChange={(event) => setReason(event.target.value)} aria-invalid={Boolean(reasonError)} placeholder={placeholder} />
          {reasonError ? <p className="text-2xs text-danger">{reasonError}</p> : null}
          {error ? <p role="alert" className="text-2xs text-danger">{error}</p> : null}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => { reset(); onOpenChange(false); }} disabled={pending}>Cancel</Button>
          <Button onClick={() => void submit()} disabled={pending}>
            {pending ? <Loader2Icon className="animate-spin" /> : null}
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
