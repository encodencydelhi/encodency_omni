"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AlertBanner } from "@/components/shared/alert-banner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/features/companies/components/primitives";
import { ErrorBanner, FlowDialog, ImpactList, SubmitButton } from "@/features/companies/components/flows/flow-kit";
import { pluralise } from "@/features/companies/lib/format";
import { formatDate } from "@/lib/utils/format";
import { ARCHIVE_SLOT_POLICY, PAUSE_IMPACTS, PAUSE_REASONS, PAUSE_REASON_LABEL } from "../../data/config";
import { describeError, useClientMutations } from "../../data/hooks";
import type { BulkResult, ClientSummary, PauseReason } from "../../data/types";
import { ClientAvatar } from "../client-avatar";
import { WorkspaceBadge } from "../status-badges";

export type LifecycleKind = "pause" | "resume" | "archive";

const VALID_FROM: Record<LifecycleKind, ClientSummary["workspace"][]> = {
  pause: ["active"],
  resume: ["paused"],
  archive: ["active", "paused"],
};

const COPY: Record<LifecycleKind, { title: string; verb: string; done: string; submit: string }> = {
  pause: { title: "Pause", verb: "pause", done: "Paused", submit: "Pause" },
  resume: { title: "Resume", verb: "resume", done: "Resumed", submit: "Resume" },
  archive: { title: "Archive", verb: "archive", done: "Archived", submit: "Archive" },
};

function reportBulk(done: string, result: BulkResult) {
  if (result.updated.length > 0) {
    toast.success(`${done} ${pluralise(result.updated.length, "client")} in the demo workspace`, {
      description: result.skipped.length > 0 ? `${result.skipped.length} skipped: ${result.skipped.map((item) => `${item.name} (${item.reason})`).join("; ")}` : undefined,
    });
  } else if (result.skipped.length > 0) {
    toast.error("No client was changed", { description: result.skipped.map((item) => `${item.name}: ${item.reason}`).join("; ") });
  }
}

function affectedTotals(targets: ClientSummary[]) {
  const companies = new Map<string, string>();
  let members = 0;
  let posts = 0;
  let connections = 0;
  let automations = 0;
  for (const target of targets) {
    companies.set(target.company.id, target.company.name);
    members += target.counts.activeMembers;
    posts += target.operations.scheduledPosts;
    connections += target.counts.connections;
    automations += target.operations.processingJobs;
  }
  return { companies: [...companies.values()], members, posts, connections, automations };
}

/**
 * Pause, resume and archive for one or many clients. Each says exactly what it
 * changes in the records and what it would do in production, and asks for an
 * explicit confirmation - nothing is destructive and nothing is deleted.
 */
export function LifecycleFlow({ kind, targets, onClose }: { kind: LifecycleKind; targets: ClientSummary[]; onClose: () => void }) {
  const mutations = useClientMutations();
  const copy = COPY[kind];
  const valid = useMemo(() => targets.filter((target) => VALID_FROM[kind].includes(target.workspace)), [kind, targets]);
  const skipped = targets.filter((target) => !valid.includes(target));
  const totals = useMemo(() => affectedTotals(valid), [valid]);

  const [reason, setReason] = useState<PauseReason>("customer_request");
  const [note, setNote] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const noteRequired = kind === "pause" && reason === "other";
  const noteError = attempted && noteRequired && !note.trim() ? "Explain the reason in the note." : null;
  const single = valid.length === 1 ? valid[0] : undefined;

  const submit = async () => {
    setAttempted(true);
    if (valid.length === 0 || !confirmed || (noteRequired && !note.trim())) return;
    setPending(true);
    setError(null);
    try {
      const ids = valid.map((target) => target.client.id);
      const result =
        kind === "pause"
          ? await mutations.changeLifecycle(ids, { kind: "pause", reason, note: note.trim() })
          : kind === "resume"
            ? await mutations.changeLifecycle(ids, { kind: "resume", note: note.trim() })
            : await mutations.changeLifecycle(ids, { kind: "archive", note: note.trim() });
      reportBulk(copy.done, result);
      onClose();
    } catch (failure) {
      setError(describeError(failure).message);
    } finally {
      setPending(false);
    }
  };

  const heading = valid.length === 1 && single ? `${copy.title} ${single.client.name}?` : `${copy.title} ${pluralise(valid.length, "client")}?`;

  return (
    <FlowDialog
      open
      onOpenChange={(open) => !open && !pending && onClose()}
      title={heading}
      description={
        kind === "pause"
          ? "Pausing holds the workspace. Nothing is deleted and it can be resumed at any time."
          : kind === "resume"
            ? "Resuming returns the workspace to Active."
            : "Archiving retires the workspace from day-to-day operation. All data and history are kept."
      }
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <SubmitButton pending={pending} variant={kind === "resume" ? "default" : "destructive"} disabled={valid.length === 0} onClick={() => void submit()}>
            {copy.submit} {valid.length > 1 ? pluralise(valid.length, "client") : "client"}
          </SubmitButton>
        </>
      }
    >
      <ErrorBanner message={error} />

      {valid.length === 0 ? (
        <AlertBanner tone="warning" title={`Nothing to ${copy.verb}`}>
          None of the selected clients can be {copy.done.toLowerCase()} from their current workspace status.
        </AlertBanner>
      ) : (
        <>
          <section aria-label="Affected clients" className="space-y-1.5">
            <p className="text-[0.8125rem] font-medium text-foreground">
              {pluralise(valid.length, "client")} across {pluralise(totals.companies.length, "company", "companies")}
            </p>
            <ul className="max-h-40 divide-y divide-border overflow-y-auto rounded-sm border border-border scrollbar-thin">
              {valid.map((target) => (
                <li key={target.client.id} className="flex items-center justify-between gap-3 px-3 py-1.5">
                  <span className="flex min-w-0 items-center gap-2">
                    <ClientAvatar name={target.client.name} logo={target.profile.logoDataUrl} className="size-6" />
                    <span className="min-w-0">
                      <span className="block truncate text-[0.8125rem] font-medium text-foreground">{target.client.name}</span>
                      <span className="block truncate text-2xs text-muted-foreground">{target.company.name}</span>
                    </span>
                  </span>
                  <WorkspaceBadge status={target.workspace} />
                </li>
              ))}
            </ul>
            {skipped.length > 0 ? (
              <p className="text-2xs text-muted-foreground">
                {pluralise(skipped.length, "selected client")} will be skipped because {skipped.length === 1 ? "it is" : "they are"} not eligible: {skipped.map((item) => `${item.client.name} (${item.workspace})`).join(", ")}.
              </p>
            ) : null}
          </section>

          {kind === "resume" && single?.pause ? (
            <div className="rounded-sm border border-border bg-surface-sunken px-3 py-2 text-[0.8125rem]">
              <p className="font-medium text-foreground">Paused {formatDate(single.pause.pausedAt)} by {single.pause.pausedBy}</p>
              <p className="text-muted-foreground">Reason: {PAUSE_REASON_LABEL[single.pause.reason]}{single.pause.note ? ` - ${single.pause.note}` : ""}</p>
            </div>
          ) : null}
          {kind === "resume" && valid.length > 1 ? (
            <ul className="space-y-0.5 text-2xs text-muted-foreground">
              {valid.map((target) => (
                <li key={target.client.id}>
                  {target.client.name}: {target.pause ? `${PAUSE_REASON_LABEL[target.pause.reason]}, paused ${formatDate(target.pause.pausedAt)}` : "paused"}
                </li>
              ))}
            </ul>
          ) : null}

          <dl className="grid grid-cols-2 gap-1 sm:grid-cols-4">
            {[
              ["Active members", totals.members],
              ["Scheduled posts", totals.posts],
              ["Connected accounts", totals.connections],
              ["Running jobs", totals.automations],
            ].map(([label, value]) => (
              <div key={label} className="rounded-sm border border-border px-2.5 py-1.5">
                <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</dt>
                <dd className="text-sm font-semibold tabular text-foreground">{value}</dd>
              </div>
            ))}
          </dl>

          {kind === "pause" ? (
            <>
              <Field label="Reason" htmlFor="lifecycle-reason" required>
                <Select value={reason} onValueChange={(value) => setReason(value as PauseReason)}>
                  <SelectTrigger id="lifecycle-reason">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAUSE_REASONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label} - {option.hint}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <div>
                <p className="mb-1 text-[0.8125rem] font-medium text-foreground">What pausing is intended to do</p>
                <ImpactList items={PAUSE_IMPACTS} />
                <p className="mt-1 text-2xs text-muted-foreground">This demo records the status change and its history. The behaviours above are enforced by the backend once it is connected.</p>
              </div>
            </>
          ) : null}

          {kind === "archive" ? (
            <>
              <AlertBanner tone="info" title="Client slot">
                {ARCHIVE_SLOT_POLICY}
              </AlertBanner>
              <p className="text-2xs text-muted-foreground">Content, connections, history and audit records are retained. There is no permanent delete.</p>
            </>
          ) : null}

          <Field label={noteRequired ? "Note" : "Note (optional)"} htmlFor="lifecycle-note" error={noteError} required={noteRequired}>
            <Textarea id="lifecycle-note" value={note} onChange={(event) => setNote(event.target.value)} rows={2} maxLength={400} placeholder="Added to the client's activity history" aria-invalid={Boolean(noteError)} />
          </Field>

          <div className="flex items-start gap-2">
            <Checkbox id="lifecycle-confirm" checked={confirmed} onCheckedChange={(value) => setConfirmed(value === true)} className="mt-0.5" />
            <Label htmlFor="lifecycle-confirm" className="text-[0.8125rem] font-normal leading-snug">
              I understand this will {copy.verb} {valid.length === 1 ? "this client" : `these ${valid.length} clients`}
              {kind === "pause" ? " and hold their operations" : kind === "archive" ? " and stop day-to-day operation" : ""}.
            </Label>
          </div>
          {attempted && !confirmed ? (
            <p role="alert" className="text-2xs text-danger">
              Confirm to continue.
            </p>
          ) : null}
        </>
      )}
    </FlowDialog>
  );
}
