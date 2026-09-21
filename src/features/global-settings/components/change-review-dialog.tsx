"use client";

import { ArrowRightIcon, CheckCircle2Icon, Loader2Icon, ShieldAlertIcon, ServerCogIcon } from "lucide-react";
import { useState } from "react";
import { AlertBanner } from "@/components/shared/alert-banner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils/cn";
import { ENFORCEMENT_LABEL, SECTION_BY_KEY, TIMING_LABEL } from "../data/config";
import { useReview } from "../data/hooks";
import type { ChangeReview, EditableSectionKey, RequiredCheck, ReviewRow, SettingValues } from "../data/types";
import { ScopeBadge, SensitivityBadge } from "./badges";
import { SettingsError } from "./states";

const DIRECTION = {
  stricter: { label: "Stricter", tone: "success" },
  weaker: { label: "Weaker", tone: "warning" },
} as const;

function RowCard({ row }: { row: ReviewRow }) {
  return (
    <li className="space-y-1.5 rounded-sm border border-border bg-card p-3">
      <div className="flex flex-wrap items-center gap-1.5">
        <p className="text-[0.8125rem] font-medium text-foreground">{row.name}</p>
        <ScopeBadge scope={row.scope} />
        {row.sensitivity !== "low" ? <SensitivityBadge sensitivity={row.sensitivity} /> : null}
        {row.direction !== "neutral" ? <Badge tone={DIRECTION[row.direction].tone}>{DIRECTION[row.direction].label}</Badge> : null}
        {row.pending ? <Badge tone="warning">Held As Pending Draft</Badge> : null}
      </div>
      <div className="flex flex-wrap items-center gap-2 text-[0.8125rem]">
        <span className="rounded-sm bg-muted px-2 py-0.5 text-muted-foreground line-through decoration-muted-foreground/50">{row.previousText}</span>
        <ArrowRightIcon className="size-3.5 text-muted-foreground" aria-hidden />
        <span className="rounded-sm bg-primary-subtle px-2 py-0.5 font-medium text-foreground">{row.nextText}</span>
      </div>
      <dl className="grid gap-x-4 gap-y-1 text-2xs sm:grid-cols-2">
        <div>
          <dt className="font-medium text-muted-foreground">Existing Accounts</dt>
          <dd className="text-foreground">{row.existingImpact}</dd>
        </div>
        <div>
          <dt className="font-medium text-muted-foreground">New Accounts</dt>
          <dd className="text-foreground">{row.newImpact}</dd>
        </div>
        <div>
          <dt className="font-medium text-muted-foreground">Takes Effect</dt>
          <dd className="text-foreground">{TIMING_LABEL[row.timing].label}</dd>
        </div>
        <div>
          <dt className="font-medium text-muted-foreground">Enforced by</dt>
          <dd className="text-foreground">{ENFORCEMENT_LABEL[row.enforcement].label}</dd>
        </div>
      </dl>
      {row.warning ? <p className="text-2xs text-warning">{row.warning}</p> : null}
    </li>
  );
}

const CHECK_STYLE: Record<RequiredCheck["state"], { label: string; tone: "success" | "warning" | "neutral"; icon: typeof CheckCircle2Icon }> = {
  recorded: { label: "Recorded", tone: "success", icon: CheckCircle2Icon },
  backend_required: { label: "Backend Required", tone: "warning", icon: ServerCogIcon },
  not_required: { label: "Not Required", tone: "neutral", icon: CheckCircle2Icon },
};

export function RequiredChecks({ checks }: { checks: RequiredCheck[] }) {
  if (checks.length === 0) return null;
  return (
    <div className="space-y-1.5">
      <p className="text-2xs font-semibold uppercase tracking-wide text-muted-foreground">Required Checks</p>
      <ul className="divide-y divide-border rounded-sm border border-border">
        {checks.map((check) => {
          const style = CHECK_STYLE[check.state];
          return (
            <li key={check.id} className="flex items-start gap-2 px-3 py-2">
              <style.icon className={cn("mt-0.5 size-3.5 shrink-0", style.tone === "success" ? "text-success" : style.tone === "warning" ? "text-warning" : "text-muted-foreground")} aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="text-[0.8125rem] text-foreground">{check.label}</p>
                <p className="text-2xs text-muted-foreground">{check.note}</p>
              </div>
              <Badge tone={style.tone}>{style.label}</Badge>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/**
 * The review shown before a save that matters: current against proposed, who is
 * affected, what still needs a backend, and why. It does not perform any check
 * it cannot perform - the checks it lists as backend-required stay that way.
 */
export function ChangeReviewDialog({
  open,
  onOpenChange,
  section,
  patch,
  saving,
  error,
  reasonError,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  section: EditableSectionKey;
  patch: SettingValues;
  saving: boolean;
  error: string | null;
  reasonError?: string;
  onConfirm: (reason: string) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(next) => !saving && onOpenChange(next)}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        {/* Mounted only while open, so the reason and acknowledgement start empty every time. */}
        <ReviewBody section={section} patch={patch} saving={saving} error={error} reasonError={reasonError} onCancel={() => onOpenChange(false)} onConfirm={onConfirm} />
      </DialogContent>
    </Dialog>
  );
}

function ReviewBody({
  section,
  patch,
  saving,
  error,
  reasonError,
  onCancel,
  onConfirm,
}: {
  section: EditableSectionKey;
  patch: SettingValues;
  saving: boolean;
  error: string | null;
  reasonError?: string;
  onCancel: () => void;
  onConfirm: (reason: string) => void;
}) {
  const query = useReview(section, patch);
  const [reason, setReason] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);
  const review: ChangeReview | undefined = query.data;

  const needsAcknowledgement = Boolean(review && (review.hasPending || review.rows.some((row) => row.sensitivity === "critical" || row.sensitivity === "high")));
  const canConfirm = Boolean(review && review.rows.length > 0 && (!review.requiresReason || reason.trim()) && (!needsAcknowledgement || acknowledged) && !saving);
  const allPending = Boolean(review && review.rows.length > 0 && review.rows.every((row) => row.pending));

  return (
    <>
      <DialogHeader>
        <DialogTitle>Review Changes</DialogTitle>
        <DialogDescription>{SECTION_BY_KEY[section].label}: check what changes and who it affects before it is recorded.</DialogDescription>
      </DialogHeader>

      {query.error && !review ? (
        <SettingsError subject="Review" error={query.error} onRetry={() => void query.refetch()} />
      ) : !review ? (
        <div className="flex items-center gap-2 py-8 text-[0.8125rem] text-muted-foreground" role="status">
          <Loader2Icon className="size-4 animate-spin" aria-hidden />
          Preparing the review...
        </div>
      ) : (
        <div className="space-y-3">
          {review.warnings.map((warning) => (
            <AlertBanner key={warning} tone="info">{warning}</AlertBanner>
          ))}
          <ul className="space-y-1.5" aria-label="Changes to review">
            {review.rows.map((row) => <RowCard key={row.key} row={row} />)}
          </ul>
          <RequiredChecks checks={review.checks} />

          <div className="space-y-1">
            <Label htmlFor="review-reason" className="text-[0.8125rem]">
              Reason{review.requiresReason ? <span className="ml-0.5 text-danger" aria-hidden>*</span> : <span className="ml-1 text-muted-foreground">(optional)</span>}
            </Label>
            <Textarea id="review-reason" rows={2} value={reason} maxLength={300} placeholder="Why is this changing?" aria-invalid={Boolean(reasonError) || undefined} onChange={(event) => setReason(event.target.value)} />
            {reasonError ? <p role="alert" className="text-2xs text-danger">{reasonError}</p> : <p className="text-2xs text-muted-foreground">Recorded with the change in configuration history.</p>}
          </div>

          {needsAcknowledgement ? (
            <label className="flex cursor-pointer items-start gap-2 rounded-sm border border-border bg-muted/40 p-2.5 text-[0.8125rem]">
              <Checkbox checked={acknowledged} onCheckedChange={(checked) => setAcknowledged(checked === true)} className="mt-0.5" />
              <span>I understand this records demo configuration only. No real account, session, service or data is changed.</span>
            </label>
          ) : null}

          {error ? <AlertBanner tone="danger" title="Nothing Was Saved">{error}</AlertBanner> : null}
        </div>
      )}

      <DialogFooter>
        <Button variant="outline" onClick={onCancel} disabled={saving}>Cancel</Button>
        <Button onClick={() => onConfirm(reason)} disabled={!canConfirm}>
          {saving ? <Loader2Icon className="animate-spin" /> : allPending ? <ShieldAlertIcon /> : null}
          {allPending ? "Submit As Pending Draft" : review?.hasPending ? "Apply and Hold Sensitive Changes" : "Save Changes"}
        </Button>
      </DialogFooter>
    </>
  );
}
