"use client";

import { useState } from "react";
import { toast } from "sonner";
import { AlertBanner } from "@/components/shared/alert-banner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ErrorBanner, FlowDialog, SubmitButton } from "@/features/companies/components/flows/flow-kit";
import { Field, KeyValue } from "@/features/companies/components/primitives";
import { isoDaysFromNow } from "@/features/companies/data/clock";
import { formatDate } from "@/lib/utils/format";
import type { PlanKey } from "@/types/domain/plan";
import { describeError, usePlanChoices, usePlanMutations, usePolicy, useSubscription } from "../../data/hooks";
import type { ScheduledChangeView, SubscriptionRow } from "../../data/types";
import { ScheduledKindBadge } from "../badges";

/* ------------------------------------------------------------------ */
/* Cancellation                                                        */
/* ------------------------------------------------------------------ */

/**
 * Cancelling a subscription is not suspending a company. This states the access
 * and billing consequences before asking for confirmation, and leaves the
 * company account exactly as it is.
 */
export function CancelSubscriptionFlow({ row, onClose }: { row: SubscriptionRow; onClose: () => void }) {
  const mutations = usePlanMutations();
  const policy = usePolicy();
  const detail = useSubscription(row.id);
  const [timing, setTiming] = useState<"end_of_term" | "immediate" | null>(null);
  const [reason, setReason] = useState("");
  const [attempted, setAttempted] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const chosen = timing ?? policy.data?.cancellation.defaultTiming ?? "end_of_term";
  const endsAt = row.status === "trialing" && row.trialEndsAt ? row.trialEndsAt : row.renewsAt;
  const reasonError = attempted && !reason.trim() ? "A reason is required for the audit trail." : null;

  const submit = async () => {
    setAttempted(true);
    if (!reason.trim()) return;
    setPending(true);
    setError(null);
    try {
      await mutations.cancelSubscription(row.id, { timing: chosen, reason: reason.trim() });
      toast.success(chosen === "immediate" ? "Subscription cancelled" : "Cancellation scheduled", { description: "The company account is unchanged. Demo only: no refund or charge was made." });
      onClose();
    } catch (failure) {
      setError(describeError(failure).message);
    } finally {
      setPending(false);
    }
  };

  return (
    <FlowDialog
      open
      onOpenChange={(open) => !open && !pending && onClose()}
      title={`Cancel ${row.company.name}'s subscription`}
      description={`${row.planName} · ${row.billingCycle}`}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={pending}>Keep Subscription</Button>
          <SubmitButton pending={pending} variant="destructive" onClick={() => void submit()}>{chosen === "immediate" ? "Cancel Now" : "Schedule Cancellation"}</SubmitButton>
        </>
      }
    >
      <ErrorBanner message={error} />
      <RadioGroup value={chosen} onValueChange={(value) => setTiming(value as "end_of_term" | "immediate")} className="gap-1.5" aria-label="Cancellation timing">
        {(
          [
            ["end_of_term", "At the end of the term", `Access continues until ${formatDate(endsAt)}, then the subscription ends. It can be undone before then.`],
            ["immediate", "Immediately", "The subscription ends today and entitlements stop applying."],
          ] as const
        ).map(([value, label, hint]) => (
          <div key={value} className="flex items-start gap-2.5 rounded-sm border border-border px-3 py-2">
            <RadioGroupItem value={value} id={`cancel-${value}`} className="mt-0.5" />
            <Label htmlFor={`cancel-${value}`} className="flex-1 cursor-pointer font-normal">
              <span className="block text-[0.8125rem] font-medium text-foreground">{label}</span>
              <span className="block text-2xs text-muted-foreground">{hint}</span>
            </Label>
          </div>
        ))}
      </RadioGroup>

      <dl className="divide-y divide-border rounded-sm border border-border px-3">
        <KeyValue label="Effective">{chosen === "immediate" ? "Today" : formatDate(endsAt)}</KeyValue>
        <KeyValue label="Access and entitlements">{chosen === "immediate" ? "Stop applying today" : "Unchanged until the end date"}</KeyValue>
        <KeyValue label="Outstanding billing">{detail.data?.openInvoiceNumber ? `Invoice ${detail.data.openInvoiceNumber} is open` : "No open invoice"}</KeyValue>
        <KeyValue label="Company account">Unchanged (not suspended)</KeyValue>
        <KeyValue label="Scheduled operations">Nothing is deleted; data is retained per the cancellation policy</KeyValue>
      </dl>
      {detail.data?.openInvoiceNumber ? <AlertBanner tone="warning" title="There is an unpaid invoice">Cancelling does not settle or void it. Review it in Billing.</AlertBanner> : null}
      <Field label="Reason" htmlFor="cancel-reason" required error={reasonError}>
        <Textarea id="cancel-reason" rows={2} maxLength={300} value={reason} onChange={(event) => setReason(event.target.value)} aria-invalid={Boolean(reasonError)} />
      </Field>
    </FlowDialog>
  );
}

/* ------------------------------------------------------------------ */
/* Undo cancellation                                                   */
/* ------------------------------------------------------------------ */

export function UndoCancellationFlow({ row, onClose }: { row: SubscriptionRow; onClose: () => void }) {
  const mutations = usePlanMutations();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setPending(true);
    setError(null);
    try {
      await mutations.undoCancellation(row.id, "Scheduled cancellation undone");
      toast.success("Cancellation undone");
      onClose();
    } catch (failure) {
      setError(describeError(failure).message);
    } finally {
      setPending(false);
    }
  };

  return (
    <FlowDialog
      open
      onOpenChange={(open) => !open && !pending && onClose()}
      title="Undo the scheduled cancellation?"
      description={`${row.company.name} keeps its ${row.planName} subscription.`}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={pending}>Not now</Button>
          <SubmitButton pending={pending} onClick={() => void submit()}>Undo Cancellation</SubmitButton>
        </>
      }
    >
      <ErrorBanner message={error} />
      <p className="text-[0.8125rem] text-foreground">The subscription returns to its normal status and renews on {formatDate(row.renewsAt)}. Nothing was charged or refunded.</p>
    </FlowDialog>
  );
}

/* ------------------------------------------------------------------ */
/* Reactivation                                                        */
/* ------------------------------------------------------------------ */

export function ReactivateFlow({ row, onClose }: { row: SubscriptionRow; onClose: () => void }) {
  const mutations = usePlanMutations();
  const policy = usePolicy();
  const choices = usePlanChoices(row.id);
  const detail = useSubscription(row.id);
  const [planKey, setPlanKey] = useState<PlanKey | "">("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const ended = row.status === "cancelled" || row.status === "expired";
  const current = choices.data?.find((choice) => choice.isCurrent);
  const planAvailable = current ? current.summary.plan.status !== "retired" && current.summary.plan.status !== "draft" : true;
  const options = (choices.data ?? []).filter((choice) => choice.eligible && !choice.isCurrent);
  const window = policy.data?.cancellation.reactivationWindowDays ?? 0;
  const endedAt = row.endedAt ?? row.renewsAt;
  const daysSince = Math.floor((Date.parse(isoDaysFromNow(0)) - Date.parse(endedAt)) / 86_400_000);
  const missingPlan = !planAvailable && !planKey;

  const submit = async () => {
    setPending(true);
    setError(null);
    setFieldErrors({});
    try {
      await mutations.reactivateSubscription(row.id, { planKey: planKey || undefined, reason: "Reactivated by Super Admin" });
      toast.success(`${row.company.name}'s subscription reactivated`, { description: ended ? "A new period starts and an invoice is open. Demo only: nothing was charged." : undefined });
      onClose();
    } catch (failure) {
      const described = describeError(failure);
      setError(described.message);
      setFieldErrors(described.fieldErrors);
    } finally {
      setPending(false);
    }
  };

  return (
    <FlowDialog
      open
      onOpenChange={(open) => !open && !pending && onClose()}
      title={`Reactivate ${row.company.name}'s subscription`}
      description={`Currently ${row.status.replace(/_/g, " ")}.`}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={pending}>Cancel</Button>
          <SubmitButton pending={pending} disabled={missingPlan} onClick={() => void submit()}>Reactivate</SubmitButton>
        </>
      }
    >
      <ErrorBanner message={error} />
      <dl className="divide-y divide-border rounded-sm border border-border px-3">
        <KeyValue label="Previous status">{row.status.replace(/_/g, " ")}</KeyValue>
        <KeyValue label={ended ? "Ended" : "Scheduled end"}>{formatDate(endedAt)}{ended && window > 0 ? ` (${daysSince} days ago; window ${window} days)` : ""}</KeyValue>
        <KeyValue label="Plan">{row.planName} · {planAvailable ? "available" : "no longer available"}</KeyValue>
        <KeyValue label="Billing readiness">{detail.data?.paymentMethodLabel ?? "No payment method on file"}</KeyValue>
        <KeyValue label="Effective">Immediately</KeyValue>
      </dl>
      {!planAvailable ? (
        <Field label="Reactivate onto" htmlFor="reactivate-plan" required error={fieldErrors.planKey} hint={`${row.planName} is retired or unpublished, so choose an available plan.`}>
          <Select value={planKey} onValueChange={(value) => setPlanKey(value as PlanKey)}>
            <SelectTrigger id="reactivate-plan"><SelectValue placeholder="Choose a plan" /></SelectTrigger>
            <SelectContent>
              {options.map((choice) => <SelectItem key={choice.summary.plan.key} value={choice.summary.plan.key}>{choice.summary.plan.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
      ) : null}
      <AlertBanner tone="info" title="Demo workspace">
        {ended ? "Reactivating a cancelled or expired subscription starts a new period and opens an invoice. No payment is collected, so billing shows it as pending." : "The scheduled end is removed and the subscription continues."}
      </AlertBanner>
    </FlowDialog>
  );
}

/* ------------------------------------------------------------------ */
/* Scheduled changes                                                   */
/* ------------------------------------------------------------------ */

export function RescheduleFlow({ change, onClose }: { change: ScheduledChangeView; onClose: () => void }) {
  const mutations = usePlanMutations();
  const tomorrow = isoDaysFromNow(1).slice(0, 10);
  const [date, setDate] = useState(change.effectiveAt.slice(0, 10) > tomorrow ? change.effectiveAt.slice(0, 10) : tomorrow);
  const [reason, setReason] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const invalid = !date || date < tomorrow;

  const submit = async () => {
    setPending(true);
    setError(null);
    try {
      await mutations.rescheduleChange(change.subscriptionId, new Date(`${date}T00:00:00.000Z`).toISOString(), reason.trim());
      toast.success("Change rescheduled");
      onClose();
    } catch (failure) {
      setError(describeError(failure).message);
    } finally {
      setPending(false);
    }
  };

  return (
    <FlowDialog
      open
      onOpenChange={(open) => !open && !pending && onClose()}
      title="Reschedule change"
      description={`${change.company.name}: ${change.label}`}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={pending}>Cancel</Button>
          <SubmitButton pending={pending} disabled={invalid} onClick={() => void submit()}>Reschedule</SubmitButton>
        </>
      }
    >
      <ErrorBanner message={error} />
      <p className="text-[0.8125rem] text-foreground"><ScheduledKindBadge kind={change.kind} /> <span className="ml-1">{change.current} → {change.scheduled}, currently {formatDate(change.effectiveAt)}</span></p>
      <Field label="New effective date" htmlFor="reschedule-date" error={invalid ? "Choose a date after today." : null}>
        <Input id="reschedule-date" type="date" min={tomorrow} value={date} onChange={(event) => setDate(event.target.value)} className="w-48" />
      </Field>
      <Field label="Reason (optional)" htmlFor="reschedule-reason">
        <Textarea id="reschedule-reason" rows={2} maxLength={300} value={reason} onChange={(event) => setReason(event.target.value)} />
      </Field>
    </FlowDialog>
  );
}

export function CancelScheduledFlow({ change, onClose }: { change: ScheduledChangeView; onClose: () => void }) {
  const mutations = usePlanMutations();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const target = change.kind === "cancellation" ? "cancellation" : "plan_change";

  const submit = async () => {
    setPending(true);
    setError(null);
    try {
      await mutations.cancelScheduledChange(change.subscriptionId, target, "Cancelled by Super Admin");
      toast.success(target === "cancellation" ? "Scheduled cancellation undone" : "Scheduled change cancelled");
      onClose();
    } catch (failure) {
      setError(describeError(failure).message);
    } finally {
      setPending(false);
    }
  };

  return (
    <FlowDialog
      open
      onOpenChange={(open) => !open && !pending && onClose()}
      title={target === "cancellation" ? "Undo scheduled cancellation?" : "Cancel this scheduled change?"}
      description={`${change.company.name}: ${change.label}`}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={pending}>Keep it</Button>
          <SubmitButton pending={pending} variant="destructive" onClick={() => void submit()}>{target === "cancellation" ? "Undo Cancellation" : "Cancel Change"}</SubmitButton>
        </>
      }
    >
      <ErrorBanner message={error} />
      <p className="text-[0.8125rem] text-foreground">{change.current} stays as it is. Nothing was applied, so nothing needs to be reversed.</p>
    </FlowDialog>
  );
}
