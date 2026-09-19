"use client";

import { useState } from "react";
import { toast } from "sonner";
import { AlertBanner } from "@/components/shared/alert-banner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ErrorBanner, FlowDialog, SubmitButton } from "@/features/companies/components/flows/flow-kit";
import { Field } from "@/features/companies/components/primitives";
import { pluralise } from "@/features/companies/lib/format";
import { describeError, usePlanMutations, usePlans } from "../../data/hooks";
import type { PlanSummary } from "../../data/types";
import { PlanStatusBadge } from "../badges";

/**
 * Retiring closes a plan to new business. It states, in plain words, what happens
 * to the companies already on it: nothing. Their subscriptions keep referencing
 * the version they are on, at the price they agreed.
 */
export function RetireFlow({ summary, onClose }: { summary: PlanSummary; onClose: () => void }) {
  const mutations = usePlanMutations();
  const plans = usePlans({});
  const { plan, current, subscribers } = summary;
  const [reason, setReason] = useState("");
  const [attempted, setAttempted] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const replacements = (plans.data?.summaries ?? []).filter((item) => item.plan.id !== plan.id && item.plan.status === "published");
  const reasonError = attempted && !reason.trim() ? "A reason is required for the audit trail." : null;

  const submit = async () => {
    setAttempted(true);
    if (!reason.trim()) return;
    setPending(true);
    setError(null);
    try {
      await mutations.retirePlan(plan.id, reason.trim());
      toast.success(`${plan.name} retired. ${subscribers.total} existing ${subscribers.total === 1 ? "subscription is" : "subscriptions are"} unchanged`);
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
      title={`Retire ${plan.name}?`}
      description="Retiring closes the plan to new business. It does not cancel or change any existing subscription."
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={pending}>Cancel</Button>
          <SubmitButton pending={pending} variant="destructive" onClick={() => void submit()}>Retire Plan</SubmitButton>
        </>
      }
    >
      <ErrorBanner message={error} />
      <dl className="divide-y divide-border rounded-sm border border-border px-3 text-[0.8125rem]">
        <div className="flex justify-between gap-3 py-1.5"><dt className="text-muted-foreground">Plan</dt><dd className="text-foreground">{plan.name} <span className="font-mono text-2xs text-muted-foreground">{plan.internalCode}</span></dd></div>
        <div className="flex justify-between gap-3 py-1.5"><dt className="text-muted-foreground">Status now</dt><dd><PlanStatusBadge status={plan.status} /></dd></div>
        <div className="flex justify-between gap-3 py-1.5"><dt className="text-muted-foreground">Published version</dt><dd className="text-foreground">{current ? `Version ${current.version}` : "None"}</dd></div>
        <div className="flex justify-between gap-3 py-1.5"><dt className="text-muted-foreground">Active subscribers</dt><dd className="text-foreground">{subscribers.paid} paid, {subscribers.trial} on trial</dd></div>
      </dl>

      <AlertBanner tone="info" title="What changes">
        <ul className="mt-1 list-disc space-y-0.5 pl-4">
          <li>New purchase, upgrade and downgrade to this plan are switched off.</li>
          <li>{subscribers.total === 0 ? "Nobody is subscribed, so no company is affected." : `${pluralise(subscribers.total, "existing subscription")} keep${subscribers.total === 1 ? "s" : ""} referencing this plan at the version and price they are on. Nothing is cancelled, repriced or migrated.`}</li>
          <li>A retired plan cannot be edited or re-published.</li>
        </ul>
      </AlertBanner>

      <div className="space-y-1">
        <p className="text-[0.8125rem] font-medium text-foreground">Available replacement plans</p>
        {replacements.length === 0 ? (
          <p className="text-2xs text-warning">No other published plan is available. Companies could not be moved anywhere until one is published.</p>
        ) : (
          <ul className="flex flex-wrap gap-1">
            {replacements.map((item) => (
              <li key={item.plan.id} className="rounded-sm border border-border-strong bg-neutral-subtle px-1.5 py-px text-[11px] text-neutral">{item.plan.name}</li>
            ))}
          </ul>
        )}
      </div>

      <Field label="Reason" htmlFor="retire-reason" required error={reasonError}>
        <Textarea id="retire-reason" rows={2} maxLength={300} value={reason} onChange={(event) => setReason(event.target.value)} aria-invalid={Boolean(reasonError)} />
      </Field>
    </FlowDialog>
  );
}
