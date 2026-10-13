"use client";

import { useState } from "react";
import { Copy, MoreHorizontal, Pause, Pencil, Play, Rocket, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { automationApi } from "../data/automation-api";
import { errorMessage, useInvalidateAutomation } from "../data/hooks";
import type { AutomationWorkflow } from "../data/types";

/** Row menu used by the overview and workflows tables. */
export function WorkflowActions({ workflow, onEdit, onTest }: { workflow: AutomationWorkflow; onEdit: (wf: AutomationWorkflow) => void; onTest: (wf: AutomationWorkflow) => void }) {
  const invalidate = useInvalidateAutomation();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);

  const run = async (label: string, fn: () => Promise<unknown>) => {
    setBusy(true);
    try {
      await fn();
      invalidate();
      toast.success(label);
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  const isActive = workflow.status === "Active";

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
          <button type="button" aria-label={`Actions for ${workflow.name}`} disabled={busy} className="grid size-7 place-items-center rounded-md text-[#94A3B8] hover:bg-slate-100 hover:text-[#111C3A] disabled:opacity-50"><MoreHorizontal className="size-4" /></button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
          <DropdownMenuItem onClick={() => onEdit(workflow)}><Pencil /> Edit</DropdownMenuItem>
          <DropdownMenuItem onClick={() => onTest(workflow)}><Play /> Test run</DropdownMenuItem>
          {isActive ? (
            <DropdownMenuItem onClick={() => void run(`“${workflow.name}” paused`, () => automationApi.setWorkflowStatus(workflow.clientId, workflow.id, "Paused"))}><Pause /> Pause</DropdownMenuItem>
          ) : (
            <DropdownMenuItem onClick={() => void run(`“${workflow.name}” is now active`, () => automationApi.setWorkflowStatus(workflow.clientId, workflow.id, "Active"))}><Rocket /> Activate</DropdownMenuItem>
          )}
          <DropdownMenuItem onClick={() => void run(`Duplicated “${workflow.name}”`, () => automationApi.duplicateWorkflow(workflow.clientId, workflow.id))}><Copy /> Duplicate</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onClick={() => setConfirmDelete(true)}><Trash2 /> Delete</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent onClick={(e) => e.stopPropagation()}>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{workflow.name}”?</AlertDialogTitle>
            <AlertDialogDescription>The workflow and its run history are deleted permanently. Runs waiting on a delay will not resume.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" disabled={busy} onClick={() => void run(`Deleted “${workflow.name}”`, () => automationApi.deleteWorkflow(workflow.clientId, workflow.id))}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
