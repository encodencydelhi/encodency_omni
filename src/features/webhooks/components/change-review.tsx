/**
 * EnCodency OmniPlatform - Super Admin Webhooks Module
 * High-impact change review: current vs proposed configuration, affected scope, impact, reason, confirm.
 */

"use client";

import { Loader2Icon } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Chip, Notice } from "./kit";

export interface ChangeRow {
  label: string;
  current: ReactNode;
  proposed: ReactNode;
}

export function ChangeReviewDialog({
  open,
  onOpenChange,
  title,
  description,
  rows,
  affectedEvents,
  affectedCompanies,
  impact,
  confirmLabel = "Confirm change",
  pending = false,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  rows: ChangeRow[];
  affectedEvents: string[];
  affectedCompanies: string[];
  impact: string;
  confirmLabel?: string;
  pending?: boolean;
  onConfirm: (reason: string) => void;
}) {
  const [reason, setReason] = useState("");
  const [touched, setTouched] = useState(false);
  const error = touched && !reason.trim() ? "A reason is required." : null;

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) { setReason(""); setTouched(false); } onOpenChange(next); }}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="overflow-hidden rounded-sm border border-border">
            <div className="grid grid-cols-[7.5rem_1fr_1fr] gap-2 border-b border-border bg-surface-sunken px-3 py-1.5 text-2xs font-medium uppercase tracking-wider text-muted-foreground">
              <span />
              <span>Current</span>
              <span>Proposed</span>
            </div>
            {rows.map((row) => (
              <div key={row.label} className="grid grid-cols-[7.5rem_1fr_1fr] gap-2 border-b border-border px-3 py-2 text-[0.8125rem] last:border-b-0">
                <span className="text-muted-foreground">{row.label}</span>
                <span className="min-w-0 break-words">{row.current}</span>
                <span className="min-w-0 break-words font-medium">{row.proposed}</span>
              </div>
            ))}
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <div className="space-y-1">
              <p className="text-2xs font-medium uppercase tracking-wider text-muted-foreground">Affected event types</p>
              <div className="flex flex-wrap gap-1">{affectedEvents.length ? affectedEvents.map((key) => <Chip key={key}><span className="font-mono">{key}</span></Chip>) : <span className="text-[0.8125rem] text-muted-foreground">None</span>}</div>
            </div>
            <div className="space-y-1">
              <p className="text-2xs font-medium uppercase tracking-wider text-muted-foreground">Affected companies</p>
              <div className="flex flex-wrap gap-1">{affectedCompanies.length ? affectedCompanies.map((name) => <Chip key={name}>{name}</Chip>) : <span className="text-[0.8125rem] text-muted-foreground">None</span>}</div>
            </div>
          </div>

          <Notice tone="warning" title="Potential delivery impact">
            {impact} Historical deliveries and attempts are never rewritten by a configuration change.
          </Notice>

          <div className="space-y-1.5">
            <Label htmlFor="change-reason">Reason *</Label>
            <Textarea id="change-reason" rows={3} value={reason} onChange={(event) => setReason(event.target.value)} aria-invalid={Boolean(error)} placeholder="Why is this change needed?" />
            {error ? <p className="text-2xs text-danger">{error}</p> : null}
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={pending}>Cancel</Button>
          <Button
            disabled={pending}
            onClick={() => {
              setTouched(true);
              if (reason.trim()) onConfirm(reason.trim());
            }}
          >
            {pending ? <Loader2Icon className="animate-spin" /> : null}
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
