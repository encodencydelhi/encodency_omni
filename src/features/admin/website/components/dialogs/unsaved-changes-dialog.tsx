"use client";

import { AlertTriangle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { WButton } from "../ui/kit";

/** Shown when the user navigates away from a settings form with edits pending. */
export function UnsavedChangesDialog({
  open,
  isSaving,
  onStay,
  onDiscard,
  onSaveAndLeave,
}: {
  open: boolean;
  isSaving: boolean;
  onStay: () => void;
  onDiscard: () => void;
  onSaveAndLeave: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(next) => (next ? undefined : onStay())}>
      <DialogContent className="max-w-md rounded-lg border-[#E6EBF4] bg-white p-5">
        <DialogHeader>
          <span className="mb-1 grid size-9 place-items-center rounded-full bg-[#FDF3E3] text-[#9A5B08]">
            <AlertTriangle className="size-4.5" aria-hidden />
          </span>
          <DialogTitle className="text-[15px] font-semibold text-[#111C3A]">You have unsaved changes</DialogTitle>
          <DialogDescription className="text-[12px] leading-relaxed text-[#6B7A94]">
            Leaving this page now will discard the settings you have edited but not saved.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="mt-4 gap-2">
          <WButton onClick={onStay}>Stay</WButton>
          <WButton tone="danger" onClick={onDiscard}>
            Discard changes
          </WButton>
          <WButton tone="primary" disabled={isSaving} disabledReason="Saving…" onClick={onSaveAndLeave}>
            {isSaving ? "Saving…" : "Save & leave"}
          </WButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
