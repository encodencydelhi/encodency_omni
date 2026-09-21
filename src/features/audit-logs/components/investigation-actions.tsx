"use client";

import { Loader2Icon } from "lucide-react";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { AlertBanner } from "@/components/shared/alert-banner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useUnsavedGuard } from "@/features/companies/hooks/use-unsaved-guard";
import { INVESTIGATION_STATUS } from "../data/config";
import { describeError, useAuditMutations, useOwners } from "../data/hooks";
import type { Investigation } from "../data/types";
import { EventPicker } from "./event-picker";

/** Shared shell: a dialog with an optional unsaved-text guard, a busy state and an error line. */
function ActionDialog({ title, description, children, confirmLabel, confirmVariant = "default", dirty, disabled, onSubmit, onClose, error, wide = false }: { title: string; description: string; children: ReactNode; confirmLabel: string; confirmVariant?: "default" | "destructive"; dirty: boolean; disabled: boolean; onSubmit: () => Promise<void>; onClose: () => void; error: string | null; wide?: boolean }) {
  const [busy, setBusy] = useState(false);
  const guard = useUnsavedGuard({ dirty: dirty && !busy, onDiscard: onClose, label: "what you typed" });
  return (
    <>
      <Dialog open onOpenChange={(open) => !open && !busy && guard.requestClose()}>
        <DialogContent className={wide ? "max-w-lg" : "max-w-md"}>
          <DialogHeader><DialogTitle>{title}</DialogTitle><DialogDescription>{description}</DialogDescription></DialogHeader>
          {children}
          {error ? <AlertBanner tone="danger" title="Not Saved">{error}</AlertBanner> : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => guard.requestClose()} disabled={busy}>Cancel</Button>
            <Button variant={confirmVariant} disabled={busy || disabled} onClick={async () => { setBusy(true); try { await onSubmit(); } finally { setBusy(false); } }}>{busy ? <Loader2Icon className="animate-spin" /> : null}{confirmLabel}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {guard.guardDialog}
    </>
  );
}

function useAction() {
  const [error, setError] = useState<string | null>(null);
  const run = async (work: () => Promise<unknown>, success: { title: string; description?: string }, onClose: () => void) => {
    setError(null);
    try {
      await work();
      toast.success(success.title, { description: success.description });
      onClose();
    } catch (failure) {
      setError(describeError(failure).message);
    }
  };
  return { error, run };
}

export function AddNoteDialog({ investigation, correcting, onClose }: { investigation: Investigation; correcting?: string | null; onClose: () => void }) {
  const mutations = useAuditMutations();
  const [text, setText] = useState("");
  const { error, run } = useAction();
  return (
    <ActionDialog title={correcting ? "Add Correction Note" : "Add Internal Note"} description={correcting ? "Notes are append-only. A correction is a new note that points at the one it corrects; the original stays as written." : "Internal only. Never shown to Company Admin users, and it cannot change an audit event."} confirmLabel="Add Note" dirty={text.trim().length > 0} disabled={!text.trim()} error={error} onClose={onClose} onSubmit={() => run(() => mutations.addNote(investigation.id, text, correcting ?? null), { title: "Note Added" }, onClose)}>
      <div className="space-y-1">
        <Label htmlFor="case-note" className="text-[0.8125rem]">Note</Label>
        <Textarea id="case-note" rows={4} maxLength={1500} value={text} onChange={(event) => setText(event.target.value)} placeholder="What was reviewed, or what is still needed?" />
        <p className="text-2xs text-muted-foreground">{text.length}/1500</p>
      </div>
    </ActionDialog>
  );
}

export function ChangeOwnerDialog({ investigation, onClose }: { investigation: Investigation; onClose: () => void }) {
  const mutations = useAuditMutations();
  const owners = useOwners();
  const [ownerId, setOwnerId] = useState("");
  const [reason, setReason] = useState("");
  const { error, run } = useAction();
  const proposed = owners.data?.find((item) => item.id === ownerId);
  return (
    <ActionDialog title="Change Owner" description="Reassign the case to another eligible internal team member. This does not grant them access to any company's data." confirmLabel="Confirm Owner Change" dirty={reason.trim().length > 0 || Boolean(ownerId)} disabled={!ownerId || !reason.trim()} error={error} onClose={onClose} onSubmit={() => run(() => mutations.changeOwner(investigation.id, ownerId, reason), { title: "Owner Changed", description: `${investigation.id} is now owned by ${proposed?.name ?? "the new owner"}.` }, onClose)}>
      <dl className="divide-y divide-border rounded-sm border border-border px-3 text-[0.8125rem]">
        <div className="flex justify-between gap-3 py-1.5"><dt className="text-muted-foreground">Current Owner</dt><dd className="font-medium">{investigation.ownerName}</dd></div>
        <div className="flex justify-between gap-3 py-1.5"><dt className="text-muted-foreground">Current Status</dt><dd className="font-medium">{INVESTIGATION_STATUS[investigation.status].label}</dd></div>
        <div className="flex justify-between gap-3 py-1.5"><dt className="text-muted-foreground">Scope</dt><dd className="font-medium">{investigation.scope.companyName ?? "Platform"}</dd></div>
      </dl>
      <div className="space-y-1">
        <Label htmlFor="owner-select" className="text-[0.8125rem]">Proposed Owner <span className="text-danger" aria-hidden>*</span></Label>
        <Select value={ownerId || undefined} onValueChange={setOwnerId}>
          <SelectTrigger id="owner-select" className="w-full"><SelectValue placeholder="Choose an owner" /></SelectTrigger>
          <SelectContent>{(owners.data ?? []).filter((item) => item.id !== investigation.ownerId).map((item) => <SelectItem key={item.id} value={item.id}>{item.name} - {item.role}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <Label htmlFor="owner-reason" className="text-[0.8125rem]">Assignment Reason <span className="text-danger" aria-hidden>*</span></Label>
        <Textarea id="owner-reason" rows={2} maxLength={300} value={reason} onChange={(event) => setReason(event.target.value)} />
      </div>
    </ActionDialog>
  );
}

const CLOSURE_REASONS = ["Review complete", "No further action needed", "Referred elsewhere", "Duplicate of another case", "Unable to conclude"];

export function CloseInvestigationDialog({ investigation, onClose }: { investigation: Investigation; onClose: () => void }) {
  const mutations = useAuditMutations();
  const [reason, setReason] = useState("");
  const [conclusion, setConclusion] = useState("");
  const { error, run } = useAction();
  return (
    <ActionDialog title="Close Investigation" description="Record how the review ended. Closing does not modify any audit event, and it does not label anyone." confirmLabel="Close Investigation" confirmVariant="destructive" dirty={conclusion.trim().length > 0 || Boolean(reason)} disabled={!reason || conclusion.trim().length < 10} error={error} onClose={onClose} wide onSubmit={() => run(() => mutations.closeInvestigation(investigation.id, { reason, conclusion }), { title: `${investigation.id} Closed`, description: "The linked audit events were not changed." }, onClose)}>
      <dl className="divide-y divide-border rounded-sm border border-border px-3 text-[0.8125rem]">
        <div className="flex justify-between gap-3 py-1.5"><dt className="text-muted-foreground">Case</dt><dd className="min-w-0 truncate font-medium">{investigation.id} - {investigation.title}</dd></div>
        <div className="flex justify-between gap-3 py-1.5"><dt className="text-muted-foreground">Current Status</dt><dd className="font-medium">{INVESTIGATION_STATUS[investigation.status].label}</dd></div>
        <div className="flex justify-between gap-3 py-1.5"><dt className="text-muted-foreground">Linked Events</dt><dd className="font-medium">{investigation.links.length}</dd></div>
      </dl>
      <div className="space-y-1">
        <Label htmlFor="close-reason" className="text-[0.8125rem]">Closure Reason <span className="text-danger" aria-hidden>*</span></Label>
        <Select value={reason || undefined} onValueChange={setReason}>
          <SelectTrigger id="close-reason" className="w-full"><SelectValue placeholder="Choose a reason" /></SelectTrigger>
          <SelectContent>{CLOSURE_REASONS.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <Label htmlFor="close-conclusion" className="text-[0.8125rem]">Outcome / Conclusion <span className="text-danger" aria-hidden>*</span></Label>
        <Textarea id="close-conclusion" rows={4} maxLength={1000} value={conclusion} onChange={(event) => setConclusion(event.target.value)} placeholder="What was reviewed and what was concluded? State facts; do not label anyone without verified findings." />
      </div>
    </ActionDialog>
  );
}

export function AddEventsDialog({ investigation, onClose }: { investigation: Investigation; onClose: () => void }) {
  const mutations = useAuditMutations();
  const [ids, setIds] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const { error, run } = useAction();
  return (
    <ActionDialog wide title="Add Audit Events" description="Link events to this case. Events already linked, or from another company's scope, are refused. The events themselves are not changed." confirmLabel={`Add ${ids.length || ""} ${ids.length === 1 ? "Event" : "Events"}`.replace("  ", " ")} dirty={ids.length > 0 || note.trim().length > 0} disabled={ids.length === 0} error={error} onClose={onClose} onSubmit={() => run(() => mutations.addEvents(investigation.id, ids, note), { title: "Events Linked", description: "The audit events were not changed." }, onClose)}>
      <EventPicker selected={ids} onChange={setIds} companyId={investigation.scope.level === "platform" ? null : investigation.scope.companyId} disabledIds={investigation.links.map((link) => link.eventId)} />
      <div className="space-y-1">
        <Label htmlFor="add-note" className="text-[0.8125rem]">Relevance Note <span className="text-muted-foreground">(optional)</span></Label>
        <Textarea id="add-note" rows={2} maxLength={300} value={note} onChange={(event) => setNote(event.target.value)} />
      </div>
    </ActionDialog>
  );
}

export function EditRelevanceDialog({ investigation, eventId, initial, onClose }: { investigation: Investigation; eventId: string; initial: string; onClose: () => void }) {
  const mutations = useAuditMutations();
  const [note, setNote] = useState(initial);
  const { error, run } = useAction();
  return (
    <ActionDialog title="Edit Relevance Note" description="This note belongs to the link, not to the audit event." confirmLabel="Save Note" dirty={note !== initial} disabled={note === initial} error={error} onClose={onClose} onSubmit={() => run(() => mutations.editRelevance(investigation.id, eventId, note), { title: "Relevance Note Saved" }, onClose)}>
      <Textarea id="relevance-note" aria-label="Relevance note" rows={3} maxLength={300} value={note} onChange={(event) => setNote(event.target.value)} />
    </ActionDialog>
  );
}
