"use client";

import { useState } from "react";
import { addDays, addHours, format, parseISO } from "date-fns";
import { AlertTriangle, CalendarClock, CheckCircle2, ListChecks, RotateCcw, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetBody, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useNow } from "../hooks/use-now";
import { FAILURE_LABEL, xRoutes } from "../lib/constants";
import { dateTime, postSummary, relative } from "../lib/format";
import { approvalHistory } from "../x-data/selectors";
import { useAccountHealth } from "../x-data/hooks";
import { scoreTone } from "../lib/insights";
import { useX } from "../store/x-store";
import type { XPost } from "../x-data/types";
import { ScoreRing } from "./charts";
import { Badge, Button, FormField, InternalBadge, Meter, SelectMenu, x } from "./ui";

/* ------------------------------------------------------------------ */
/* Schedule / reschedule                                               */
/* ------------------------------------------------------------------ */

const QUICK_SLOTS = [
  { label: "In 1 hour", get: () => addHours(new Date(), 1) },
  { label: "Tomorrow morning", get: () => withTime(addDays(new Date(), 1), 9, 30) },
  { label: "Tomorrow evening", get: () => withTime(addDays(new Date(), 1), 18, 30) },
  { label: "Next Monday", get: () => nextMonday() },
];

function withTime(date: Date, hours: number, minutes: number) {
  const next = new Date(date);
  next.setHours(hours, minutes, 0, 0);
  return next;
}

function nextMonday() {
  const date = new Date();
  const daysAhead = (8 - date.getDay()) % 7 || 7;
  return withTime(addDays(date, daysAhead), 9, 30);
}

const toInput = (date: Date) => format(date, "yyyy-MM-dd'T'HH:mm");

export function ScheduleDialog({
  post,
  open,
  onOpenChange,
}: {
  post: XPost | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { schedulePost, settings } = useX();
  const [value, setValue] = useState(() => toInput(post?.scheduledAt ? parseISO(post.scheduledAt) : withTime(addDays(new Date(), 1), 9, 30)));
  const [busy, setBusy] = useState(false);
  const now = useNow(15_000);

  if (!post) return null;
  const chosen = new Date(value);
  // `now` ticks via the hook, so "too soon" stays correct without reading the
  // clock during render.
  const tooSoon = Number.isNaN(chosen.getTime()) || chosen.getTime() < now + 60_000;
  const rescheduling = Boolean(post.scheduledAt);

  return (
    <Dialog open={open} onOpenChange={(next) => !busy && onOpenChange(next)}>
      <DialogContent className="w-[calc(100vw-24px)] max-w-[460px] gap-0 p-0">
        <DialogHeader className="px-5 pt-5">
          <DialogTitle className="flex items-center gap-2 text-[15px] text-[#0F1B3D]">
            <CalendarClock className="size-4 text-[#2563EB]" />
            {rescheduling ? "Reschedule post" : "Schedule post"}
          </DialogTitle>
          <DialogDescription className="mt-1 text-[12.5px] leading-5 text-[#3C4A66]">
            “{postSummary(post.text, 70)}”
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 px-5 pt-4">
          <div className="flex flex-wrap gap-1.5">
            {QUICK_SLOTS.map((slot) => (
              <Button key={slot.label} size="xs" variant="secondary" onClick={() => setValue(toInput(slot.get()))}>
                {slot.label}
              </Button>
            ))}
          </div>
          <FormField
            label="Publish at"
            htmlFor="x-schedule-input"
            error={tooSoon ? "Pick a time at least a minute from now." : undefined}
            hint={`Times are in ${settings.publishing.timezone}.`}
          >
            <input id="x-schedule-input" type="datetime-local" value={value} onChange={(event) => setValue(event.target.value)} className={x.input} />
          </FormField>
          <p className="flex items-start gap-2 rounded-sm border border-[#E2D8FD] bg-[#F9F7FF] px-2.5 py-2 text-[11.5px] leading-4 text-[#3C4A66]">
            <Sparkles className="mt-px size-3.5 shrink-0 text-[#6D28D9]" />
            OmniPlatform holds the post and publishes it to X at this time. The account must be connected when it fires.
          </p>
        </div>

        <DialogFooter className="mt-4 border-t border-[#EEF1F5] px-5 py-3">
          <Button variant="secondary" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancel
          </Button>
          <Button
            variant="primary"
            loading={busy}
            disabled={tooSoon}
            onClick={async () => {
              setBusy(true);
              const ok = await schedulePost(post.id, chosen.toISOString());
              setBusy(false);
              if (ok) onOpenChange(false);
            }}
          >
            {rescheduling ? "Reschedule" : "Schedule post"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
/* Approval decision                                                   */
/* ------------------------------------------------------------------ */

export function ApprovalDialog({
  post,
  action,
  open,
  onOpenChange,
}: {
  post: XPost | null;
  action: "approved" | "changes_requested" | "rejected";
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { reviewApproval } = useX();
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  if (!post) return null;

  const meta = {
    approved: { title: "Approve this post", label: "Approve", hint: "Once approved the post can be scheduled or published." },
    changes_requested: { title: "Request changes", label: "Request changes", hint: "Say what needs to change — the author sees this note." },
    rejected: { title: "Reject this post", label: "Reject", hint: "Rejecting sends it back without a path to publish." },
  }[action];

  const noteRequired = action !== "approved";

  return (
    <Dialog open={open} onOpenChange={(next) => !busy && onOpenChange(next)}>
      <DialogContent className="w-[calc(100vw-24px)] max-w-[460px] gap-0 p-0">
        <DialogHeader className="px-5 pt-5">
          <DialogTitle className="flex items-center gap-2 text-[15px] text-[#0F1B3D]">
            <ListChecks className="size-4 text-[#6D28D9]" />
            {meta.title}
            <InternalBadge hint="Approvals are an OmniPlatform workflow — X has no equivalent." />
          </DialogTitle>
          <DialogDescription className="mt-1 text-[12.5px] leading-5 text-[#3C4A66]">“{postSummary(post.text, 70)}”</DialogDescription>
        </DialogHeader>

        <div className="px-5 pt-4">
          <FormField label={noteRequired ? "Note to the author" : "Note (optional)"} required={noteRequired} hint={meta.hint}>
            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              rows={4}
              placeholder={action === "changes_requested" ? "What should change before this goes out?" : "Add any context…"}
              className={x.textarea}
            />
          </FormField>
        </div>

        <DialogFooter className="mt-4 border-t border-[#EEF1F5] px-5 py-3">
          <Button variant="secondary" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancel
          </Button>
          <Button
            variant={action === "rejected" ? "dangerSolid" : "primary"}
            loading={busy}
            disabled={noteRequired && !note.trim()}
            disabledReason={noteRequired && !note.trim() ? "Add a note so the author knows what to do." : undefined}
            onClick={async () => {
              setBusy(true);
              const ok = await reviewApproval(post.id, action, note.trim() || undefined);
              setBusy(false);
              if (ok) {
                setNote("");
                onOpenChange(false);
              }
            }}
          >
            {meta.label}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
/* Submit for approval                                                 */
/* ------------------------------------------------------------------ */

export function SubmitApprovalDialog({ post, open, onOpenChange }: { post: XPost | null; open: boolean; onOpenChange: (open: boolean) => void }) {
  const { submitForApproval, settings, memberName } = useX();
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  if (!post) return null;
  const reviewers = settings.approvals.reviewerIds.map(memberName);

  return (
    <Dialog open={open} onOpenChange={(next) => !busy && onOpenChange(next)}>
      <DialogContent className="w-[calc(100vw-24px)] max-w-[460px] gap-0 p-0">
        <DialogHeader className="px-5 pt-5">
          <DialogTitle className="text-[15px] text-[#0F1B3D]">Submit for approval</DialogTitle>
          <DialogDescription className="mt-1 text-[12.5px] leading-5 text-[#3C4A66]">
            {reviewers.length ? `${reviewers.join(" and ")} will be asked to review it.` : "A reviewer will be asked to approve it."}
          </DialogDescription>
        </DialogHeader>
        <div className="px-5 pt-4">
          <FormField label="Note for the reviewer (optional)">
            <textarea value={note} onChange={(event) => setNote(event.target.value)} rows={3} placeholder="Anything they should know…" className={x.textarea} />
          </FormField>
        </div>
        <DialogFooter className="mt-4 border-t border-[#EEF1F5] px-5 py-3">
          <Button variant="secondary" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancel
          </Button>
          <Button
            variant="primary"
            loading={busy}
            onClick={async () => {
              setBusy(true);
              const ok = await submitForApproval(post.id, note.trim() || undefined);
              setBusy(false);
              if (ok) {
                setNote("");
                onOpenChange(false);
              }
            }}
          >
            Submit
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
/* Approval history                                                    */
/* ------------------------------------------------------------------ */

const APPROVAL_EVENT_META = {
  submitted: { tone: "blue", label: "Submitted for approval" },
  approved: { tone: "green", label: "Approved" },
  changes_requested: { tone: "amber", label: "Changes requested" },
  rejected: { tone: "red", label: "Rejected" },
} as const;

export function ApprovalHistory({ postId, className }: { postId: string; className?: string }) {
  const { approvals } = useX();
  const history = approvalHistory(approvals, postId);

  if (!history.length) {
    return <p className={cn("text-[12.5px] text-[#6B7890]", className)}>This post hasn&apos;t been through approval.</p>;
  }

  return (
    <ol className={cn("space-y-3", className)}>
      {history.map((event) => {
        const meta = APPROVAL_EVENT_META[event.action];
        return (
          <li key={event.id} className="flex gap-2.5">
            <span className="mt-1 flex flex-col items-center">
              <span className={cn("size-2 rounded-sm", meta.tone === "green" ? "bg-[#12B76A]" : meta.tone === "red" ? "bg-[#E11D48]" : meta.tone === "amber" ? "bg-[#F79009]" : "bg-[#2563EB]")} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="flex flex-wrap items-center gap-x-1.5 text-[12.5px]">
                <b className="font-semibold text-[#0F1B3D]">{meta.label}</b>
                <span className="text-[#6B7890]">by {event.actor}</span>
                <span className="text-[#98A2B3]">· {relative(event.at)}</span>
              </p>
              {event.note && <p className="mt-0.5 rounded-sm bg-[#F8FAFC] px-2 py-1.5 text-[12px] leading-4 text-[#3C4A66]">{event.note}</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/* ------------------------------------------------------------------ */
/* Failure detail                                                      */
/* ------------------------------------------------------------------ */

export function FailureDetail({
  post,
  onRetry,
  onReschedule,
  onEdit,
  onDiscard,
  compact,
}: {
  post: XPost;
  onRetry?: () => void;
  onReschedule?: () => void;
  onEdit?: () => void;
  onDiscard?: () => void;
  compact?: boolean;
}) {
  const { can } = useX();
  const [busy, setBusy] = useState(false);
  if (!post.failure) return null;
  const { failure } = post;

  return (
    <div className={cn("rounded-sm border border-[#FBD5D9] bg-[#FEF6F7]", compact ? "p-2.5" : "p-3.5")} role="alert">
      <div className="flex flex-wrap items-start gap-2.5">
        <AlertTriangle className="mt-0.5 size-4 shrink-0 text-[#C81E2B]" />
        <div className="min-w-[200px] flex-1">
          <p className="flex flex-wrap items-center gap-2 text-[12.5px] font-semibold text-[#0F1B3D]">
            {FAILURE_LABEL[failure.code]}
            <Badge tone="red">
              {failure.retryCount} {failure.retryCount === 1 ? "retry" : "retries"}
            </Badge>
          </p>
          <p className="mt-0.5 text-[12px] leading-4 text-[#3C4A66]">{failure.message}</p>
          <p className="mt-1 text-[12px] leading-4 text-[#24324F]">
            <b className="font-semibold">What to do:</b> {failure.hint}
          </p>
          <p className="mt-1 text-[11.5px] text-[#98A2B3]">
            Failed {dateTime(failure.at)} · last attempt {relative(failure.lastAttemptAt)}
          </p>
        </div>
      </div>
      {(onRetry || onReschedule || onEdit || onDiscard) && (
        <div className="mt-2.5 flex flex-wrap gap-2 pl-6">
          {onRetry && (
            <Button
              size="sm"
              variant="primary"
              icon={RotateCcw}
              loading={busy}
              gate={can.canCreatePost}
              onClick={async () => {
                setBusy(true);
                await onRetry();
                setBusy(false);
              }}
            >
              Retry now
            </Button>
          )}
          {onEdit && (
            <Button size="sm" variant="secondary" gate={can.canCreatePost} onClick={onEdit}>
              Edit post
            </Button>
          )}
          {onReschedule && (
            <Button size="sm" variant="secondary" icon={CalendarClock} gate={can.canSchedulePost} onClick={onReschedule}>
              Reschedule
            </Button>
          )}
          {onDiscard && (
            <Button size="sm" variant="danger" onClick={onDiscard}>
              Discard
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Account health detail                                               */
/* ------------------------------------------------------------------ */

export function HealthDetailSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { score, factors } = useAccountHealth();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full max-w-[520px] border-[#E4E9F0] bg-white">
        <SheetHeader className="border-[#EEF1F5]">
          <SheetTitle className="flex items-center gap-2 text-[15px] text-[#0F1B3D]">
            X account health
            <InternalBadge hint="Computed by OmniPlatform from your connection, content and inbox. X does not provide this score." />
          </SheetTitle>
          <SheetDescription className="text-[12.5px] text-[#6B7890]">
            Six signals OmniPlatform tracks for this channel, each with what it measures and what to do next.
          </SheetDescription>
        </SheetHeader>
        <SheetBody>
          <div className="flex items-center gap-4 rounded-sm border border-[#E4E9F0] bg-[#F8FAFC] p-4">
            <ScoreRing score={score} tone={scoreTone(score)} size={92} label="Account health" />
            <div className="min-w-0">
              <p className="text-[13px] font-semibold text-[#0F1B3D]">
                {score >= 80 ? "Healthy" : score >= 60 ? "Needs attention" : "At risk"}
              </p>
              <p className="mt-0.5 text-[12.5px] leading-5 text-[#6B7890]">
                The average of the six factors below. Work the lowest one first — it is usually the one holding the rest back.
              </p>
            </div>
          </div>

          <ul className="mt-4 space-y-3">
            {factors.map((factor) => {
              const tone = scoreTone(factor.score);
              return (
                <li key={factor.key} className="rounded-sm border border-[#E4E9F0] p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-[12.5px] font-semibold text-[#0F1B3D]">{factor.label}</p>
                    <Badge tone={tone === "green" ? "green" : tone === "amber" ? "amber" : "red"}>{factor.score}/100</Badge>
                  </div>
                  <Meter value={factor.score} tone={tone === "green" ? "green" : tone === "amber" ? "amber" : "red"} className="mt-2" />
                  <p className="mt-2 text-[12px] leading-4 text-[#3C4A66]">{factor.explanation}</p>
                  <p className="mt-1.5 flex items-start gap-1.5 text-[12px] leading-4 text-[#24324F]">
                    <CheckCircle2 className="mt-px size-3.5 shrink-0 text-[#2563EB]" />
                    {factor.recommendation}
                  </p>
                  {factor.action && (
                    <Button size="xs" variant="link" href={factor.action.href} className="mt-1.5">
                      {factor.action.label} →
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}

/* ------------------------------------------------------------------ */
/* Assign owner                                                        */
/* ------------------------------------------------------------------ */

export function AssignDialog({
  open,
  onOpenChange,
  title,
  description,
  currentId,
  onAssign,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  currentId: string | null;
  onAssign: (id: string | null) => Promise<boolean>;
}) {
  const { team } = useX();
  const [selected, setSelected] = useState(currentId ?? "");
  const [busy, setBusy] = useState(false);

  return (
    <Dialog open={open} onOpenChange={(next) => !busy && onOpenChange(next)}>
      <DialogContent className="w-[calc(100vw-24px)] max-w-[420px] gap-0 p-0">
        <DialogHeader className="px-5 pt-5">
          <DialogTitle className="flex items-center gap-2 text-[15px] text-[#0F1B3D]">
            {title}
            <InternalBadge hint="Assignment is internal to OmniPlatform." />
          </DialogTitle>
          <DialogDescription className="mt-1 text-[12.5px] text-[#3C4A66]">{description}</DialogDescription>
        </DialogHeader>
        <div className="px-5 pt-4">
          <FormField label="Owner">
            <SelectMenu
              label="Owner"
              fullWidth
              size="md"
              value={selected}
              onChange={setSelected}
              placeholder="Unassigned"
              options={[{ value: "", label: "Unassigned" }, ...team.map((member) => ({ value: member.id, label: member.name, description: member.role }))]}
            />
          </FormField>
        </div>
        <DialogFooter className="mt-4 border-t border-[#EEF1F5] px-5 py-3">
          <Button variant="secondary" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancel
          </Button>
          <Button
            variant="primary"
            loading={busy}
            onClick={async () => {
              setBusy(true);
              const ok = await onAssign(selected || null);
              setBusy(false);
              if (ok) onOpenChange(false);
            }}
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
/* Activity log                                                        */
/* ------------------------------------------------------------------ */

export function ActivityLogSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { activity } = useX();
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full max-w-[520px] border-[#E4E9F0] bg-white">
        <SheetHeader className="border-[#EEF1F5]">
          <SheetTitle className="flex items-center gap-2 text-[15px] text-[#0F1B3D]">
            Activity log
            <InternalBadge hint="Recorded by OmniPlatform. Actions made directly on X appear only after a sync." />
          </SheetTitle>
          <SheetDescription className="text-[12.5px] text-[#6B7890]">Everything that happened in this channel, newest first.</SheetDescription>
        </SheetHeader>
        <SheetBody>
          <ul className="space-y-0.5">
            {activity.map((event) => (
              <li key={event.id} className="flex gap-3 rounded-sm px-2 py-2.5 hover:bg-[#F8FAFC]">
                <span className={cn("mt-1.5 size-2 shrink-0 rounded-sm", event.source === "X sync" ? "bg-[#0F1419]" : "bg-[#2563EB]")} />
                <div className="min-w-0 flex-1">
                  <p className="text-[12.5px] leading-4 text-[#24324F]">
                    <b className="font-semibold text-[#0F1B3D]">{event.actor}</b> — {event.summary}
                  </p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-[11.5px] text-[#6B7890]">
                    {event.entity.id && event.entity.type === "post" ? (
                      <a href={xRoutes.post(event.entity.id)} className="truncate text-[#2563EB] hover:underline">
                        {event.entity.label}
                      </a>
                    ) : (
                      <span className="truncate">{event.entity.label}</span>
                    )}
                    <span className="text-[#C9D1DC]">·</span>
                    <span>{relative(event.at)}</span>
                    {event.source === "X sync" && <Badge tone="neutral">From X</Badge>}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}
