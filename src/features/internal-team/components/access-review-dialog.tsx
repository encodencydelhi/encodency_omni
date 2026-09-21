"use client";

import { useState } from "react";
import { CheckCircle2Icon } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils/cn";
import { getStaffAvatarColor } from "../data/config";
import { getInitials } from "@/lib/utils/format";
import type { CompleteAccessReviewInput, StaffAccessReview } from "../data/types";

interface AccessReviewCompleteDialogProps {
  review: StaffAccessReview | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (input: CompleteAccessReviewInput) => void;
  isPending?: boolean;
}

export function AccessReviewCompleteDialog({ review, open, onOpenChange, onConfirm, isPending }: AccessReviewCompleteDialogProps) {
  const [outcome, setOutcome] = useState<CompleteAccessReviewInput["outcome"]>("confirmed");
  const [notes, setNotes] = useState("");
  if (!review) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2Icon className="size-4 text-emerald-600" /> Complete Access Review
          </DialogTitle>
          <DialogDescription>Record the outcome of this access review.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="flex items-center gap-3 p-3 rounded-sm bg-slate-50 border border-border">
            <Avatar className="size-10 shrink-0">
              <AvatarFallback className={cn("text-xs font-bold", getStaffAvatarColor(review.staffName))}>{getInitials(review.staffName)}</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-semibold text-slate-900">{review.staffName}</p>
              <p className="text-xs text-slate-500">{review.staffEmail}</p>
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label className="text-xs">Review Outcome *</Label>
            <div className="space-y-1.5">
              {([
                { value: "confirmed" as const, label: "Confirm Current Access", desc: "Access is appropriate, no changes needed", tone: "success" as const },
                { value: "role_change_recommended" as const, label: "Recommend Role Change", desc: "Current role should be modified", tone: "warning" as const },
                { value: "access_removal_recommended" as const, label: "Recommend Access Removal", desc: "Access should be revoked or reduced", tone: "danger" as const },
              ]).map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setOutcome(opt.value)}
                  className={cn(
                    "w-full text-left p-2.5 rounded-sm border text-xs transition-all",
                    outcome === opt.value ? "border-blue-500 bg-blue-50/50 ring-1 ring-blue-500/20" : "border-border hover:border-slate-300",
                  )}
                >
                  <span className="font-medium text-slate-900">{opt.label}</span>
                  <p className="text-[11px] text-slate-500 mt-0.5">{opt.desc}</p>
                </button>
              ))}
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label className="text-xs">Review Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Add notes about this review..." className="text-xs min-h-[60px]" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button size="sm" className="h-8 text-xs bg-blue-600 hover:bg-blue-700" onClick={() => onConfirm({ reviewId: review.id, outcome: outcome!, notes })} disabled={!outcome || isPending}>
            {isPending ? "Saving..." : "Complete Review"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
