/**
 * EnCodency OmniPlatform - Reconciliation Exception Detail Drawer
 * Inspection and operational investigation of financial discrepancies.
 */

"use client";

import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatDate } from "@/lib/utils/format";
import { formatMoney } from "../../data/money";
import { ReconciliationStatusBadge } from "../status-badges";
import { useReconciliation } from "../../data/hooks";
import type { ReconciliationException, ReconciliationStatus } from "../../data/types";
import { toast } from "sonner";
import {
  CheckIcon,
  Building2Icon,
} from "lucide-react";

interface ExceptionDetailDrawerProps {
  exception: ReconciliationException | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function ExceptionDetailDrawer({
  exception,
  isOpen,
  onClose,
  onSuccess,
}: ExceptionDetailDrawerProps) {
  const { updateReconciliationIssue } = useReconciliation();

  const [status, setStatus] = useState<ReconciliationStatus>(exception?.status ?? "open");
  const [assignedOwner, setAssignedOwner] = useState<string>(exception?.assignedOwner ?? "Sompal Singh");
  const [newNote, setNewNote] = useState<string>("");

  if (!exception) return null;

  const severityStyles = {
    low: "bg-slate-100 text-slate-700 border-slate-300",
    medium: "bg-blue-50 text-blue-700 border-blue-200",
    high: "bg-amber-50 text-amber-700 border-amber-200",
    critical: "bg-rose-50 text-rose-700 border-rose-200 font-semibold",
  };

  const handleSaveInvestigation = () => {
    try {
      updateReconciliationIssue(exception.id, {
        status,
        assignedOwner: assignedOwner.trim() || undefined,
        newNote: newNote.trim() || undefined,
      });

      toast.success("Investigation notes and status updated successfully");
      setNewNote("");
      onClose();
      if (onSuccess) onSuccess();
    } catch (err: any) {
      toast.error(err.message || "Failed to update exception");
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="sm:max-w-md w-full p-0 flex flex-col justify-between overflow-hidden rounded-l-sm bg-card">
        {/* Header */}
        <div className="p-4 border-b border-border bg-muted/20">
          <SheetHeader className="text-left space-y-1">
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-xs font-semibold text-muted-foreground uppercase">
                {exception.issueType.replace(/_/g, " ")}
              </span>
              <div className="flex items-center gap-1.5">
                <span className={`px-1.5 py-0.5 rounded-sm border text-xs capitalize ${severityStyles[exception.severity]}`}>
                  {exception.severity}
                </span>
                <ReconciliationStatusBadge status={exception.status} />
              </div>
            </div>
            <SheetTitle className="text-lg font-bold tracking-tight text-foreground font-mono">
              {exception.financialReference}
            </SheetTitle>
            <SheetDescription className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Building2Icon className="size-3.5" />
              <span>{exception.companyName}</span>
            </SheetDescription>
          </SheetHeader>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs scrollbar-thin">
          {/* Amounts Grid */}
          <div className="grid grid-cols-3 gap-2">
            <div className="p-2.5 rounded-sm bg-slate-50 border border-slate-200">
              <div className="text-muted-foreground font-medium text-[11px]">Expected</div>
              <div className="font-bold font-mono text-foreground mt-0.5">
                {formatMoney(exception.expectedAmountMinor, exception.currency)}
              </div>
            </div>
            <div className="p-2.5 rounded-sm bg-slate-50 border border-slate-200">
              <div className="text-muted-foreground font-medium text-[11px]">Recorded</div>
              <div className="font-bold font-mono text-foreground mt-0.5">
                {formatMoney(exception.recordedAmountMinor, exception.currency)}
              </div>
            </div>
            <div className="p-2.5 rounded-sm bg-amber-50 border border-amber-200">
              <div className="text-amber-800 font-medium text-[11px]">Difference</div>
              <div className="font-bold font-mono text-amber-900 mt-0.5">
                {formatMoney(exception.differenceMinor, exception.currency)}
              </div>
            </div>
          </div>

          {/* Workflow Status Controls */}
          <div className="p-3 bg-muted/20 border border-border rounded-sm space-y-2.5">
            <div className="space-y-1">
              <Label className="text-xs font-medium text-foreground">Investigation Status</Label>
              <Select value={status} onValueChange={(val: any) => setStatus(val)}>
                <SelectTrigger className="h-8 text-xs rounded-sm bg-background border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-sm">
                  <SelectItem value="open" className="text-xs">Open — Uninvestigated</SelectItem>
                  <SelectItem value="investigating" className="text-xs">Investigating In Progress</SelectItem>
                  <SelectItem value="awaiting_evidence" className="text-xs">Awaiting Bank Evidence</SelectItem>
                  <SelectItem value="resolved" className="text-xs">Resolved & Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-medium text-foreground">Assigned Internal Owner</Label>
              <Input
                value={assignedOwner}
                onChange={(e) => setAssignedOwner(e.target.value)}
                placeholder="Staff assignee..."
                className="h-8 text-xs rounded-sm bg-background border-border"
              />
            </div>
          </div>

          {/* Investigation Notes & Audit History */}
          <div className="space-y-2">
            <div className="font-semibold text-foreground uppercase tracking-wider text-[11px] flex items-center justify-between">
              <span>Investigation Log ({exception.investigationNotes.length})</span>
              <span className="text-muted-foreground text-[11px]">Detected {formatDate(exception.detectedAt)}</span>
            </div>

            <div className="space-y-1.5 border border-border rounded-sm p-2.5 bg-card divide-y divide-border/50">
              {exception.investigationNotes.map((note, idx) => (
                <div key={idx} className="py-1.5 first:pt-0 last:pb-0 text-muted-foreground flex items-start gap-1.5">
                  <span className="size-1.5 rounded-full bg-slate-400 mt-1.5 shrink-0" />
                  <p className="flex-1 text-slate-800 leading-relaxed">{note}</p>
                </div>
              ))}
            </div>

            <div className="space-y-1 pt-1">
              <Label className="text-[11px] text-muted-foreground">Add Investigation Note</Label>
              <Input
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Attach findings, bank UTR confirmation, or notes..."
                className="h-8 text-xs rounded-sm bg-background border-border"
              />
            </div>
          </div>

          <div className="p-2.5 rounded-sm bg-slate-50 border border-slate-200 text-slate-600 text-xs">
            <strong>Reconciliation Rule:</strong> Marking an exception as resolved updates operations tracking. Verified bank ledger reconciliation requires verified external statement matching.
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border bg-muted/20 flex items-center justify-between gap-2">
          <Button variant="outline" size="sm" onClick={onClose} className="rounded-sm text-xs border-border">
            Cancel
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={handleSaveInvestigation}
            className="rounded-sm text-xs bg-slate-900 text-white hover:bg-slate-800"
          >
            <CheckIcon className="size-3.5 mr-1" />
            Save Investigation Changes
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
