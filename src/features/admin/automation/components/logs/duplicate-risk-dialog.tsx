"use client";

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
  /** Render above full-screen overlays such as the visual debugger. */
  elevated?: boolean;
}

export function DuplicateRiskDialog({ open, runCount, busy, onOpenChange, onConfirm, elevated }: DuplicateRiskDialogProps) {
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
