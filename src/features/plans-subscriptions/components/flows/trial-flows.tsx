"use client";

import { ArrowLeftIcon, ArrowRightIcon, CalendarPlusIcon, CircleCheckIcon, CircleXIcon, EyeIcon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { AlertBanner } from "@/components/shared/alert-banner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ErrorBanner, FlowDialog, Stepper, SubmitButton } from "@/features/companies/components/flows/flow-kit";
import { Field, KeyValue } from "@/features/companies/components/primitives";
import { daysUntil } from "@/features/companies/data/clock";
import { ROUTES } from "@/config/routes";
import { formatDate } from "@/lib/utils/format";
import type { PlanKey } from "@/types/domain/plan";
import type { BillingCycle } from "@/types/domain/subscription";
import { MAX_TRIAL_EXTENSION_DAYS } from "../../data/config";
import { describeError, usePlanChoices, usePlanMutations, usePolicy, useSubscription } from "../../data/hooks";
import type { SubscriptionRow } from "../../data/types";
import { money } from "../../lib/money";

/* ------------------------------------------------------------------ */
/* Trial management                                                    */
/* ------------------------------------------------------------------ */

/** Everything about one trial in one place, with the three things you can do to it. */
export function TrialManagementDialog({ row, onAction, onClose }: { row: SubscriptionRow; onAction: (kind: "extend" | "convert" | "endTrial") => void; onClose: () => void }) {
  const detail = useSubscription(row.id);
  const policy = usePolicy();
  const days = row.trialEndsAt ? daysUntil(row.trialEndsAt) : 0;
  const data = detail.data;
  const used = data?.extendedDays ?? 0;
  const limit = policy.data?.trial.extensionLimitDays ?? 0;

  return (
    <FlowDialog
      open
      onOpenChange={(open) => !open && onClose()}
      title={`Manage trial - ${row.company.name}`}
      description={`${row.planName} trial. A trial is not a paid subscription and carries no MRR.`}
      footer={<Button variant="outline" onClick={onClose}>Close</Button>}
    >
      <dl className="divide-y divide-border rounded-sm border border-border px-3">
        <KeyValue label="Trial start">{formatDate(row.startedAt)}</KeyValue>
        <KeyValue label="Trial end">{row.trialEndsAt ? formatDate(row.trialEndsAt) : "-"}</KeyValue>
        <KeyValue label="Days remaining"><span className={days <= 3 ? "font-medium text-danger" : undefined}>{days < 0 ? `Ended ${-days} days ago` : `${days} days`}</span></KeyValue>
        <KeyValue label="Trial plan">{row.planName}</KeyValue>
        <KeyValue label="Extensions used">{used} of {limit} days</KeyValue>
        <KeyValue label="Current usage">{row.usageRisk === "ok" ? "Within limits" : row.usageRisk === "near_limit" ? "Near a limit" : "Over a limit"}</KeyValue>
        <KeyValue label="Payment method">{data?.paymentMethodLabel ?? "None on file"}</KeyValue>
      </dl>
      <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-3">
        <Button variant="outline" onClick={() => onAction("extend")}><CalendarPlusIcon />Extend Trial</Button>
        <Button onClick={() => onAction("convert")}><CircleCheckIcon />Convert to Paid</Button>
        <Button variant="outline" className="text-danger" onClick={() => onAction("endTrial")}><CircleXIcon />End Trial</Button>
      </div>
      <Button asChild variant="ghost" size="sm"><Link href={ROUTES.superAdmin.company(row.company.id)}><EyeIcon />View Company</Link></Button>
    </FlowDialog>
  );
}

/* ------------------------------------------------------------------ */
/* Extend                                                              */
/* ------------------------------------------------------------------ */

export function ExtendTrialFlow({ row, onClose }: { row: SubscriptionRow; onClose: () => void }) {
  const mutations = usePlanMutations();
  const detail = useSubscription(row.id);
  const policy = usePolicy();
  const [step, setStep] = useState(0);
  const [days, setDays] = useState("7");
  const [reason, setReason] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const count = Number(days);
  const used = detail.data?.extendedDays ?? 0;
  const limit = policy.data?.trial.extensionLimitDays ?? MAX_TRIAL_EXTENSION_DAYS;
  const left = Math.max(0, limit - used);
  const validDays = Number.isInteger(count) && count >= 1 && count <= Math.min(MAX_TRIAL_EXTENSION_DAYS, left);
  const newEnd = row.trialEndsAt && validDays ? new Date(Date.parse(row.trialEndsAt) + count * 86_400_000).toISOString() : null;
  const daysError = fieldErrors.days ?? (!validDays && days ? (left === 0 ? "The trial extension limit has been used." : `Enter 1 to ${Math.min(MAX_TRIAL_EXTENSION_DAYS, left)} days.`) : null);
  const reasonMissing = !reason.trim();

  const submit = async () => {
    setPending(true);
    setError(null);
    setFieldErrors({});
    try {
      await mutations.extendTrial(row.id, { days: count, reason: reason.trim() });
      toast.success(`Trial extended by ${count} days`);
      onClose();
    } catch (failure) {
      const described = describeError(failure);
      setError(described.message);
      setFieldErrors(described.fieldErrors);
      setStep(0);
    } finally {
      setPending(false);
    }
  };

  return (
    <FlowDialog
      open
      onOpenChange={(open) => !open && !pending && onClose()}
      title="Extend trial"
      description={`${row.company.name} - ${row.planName}`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={pending} className="mr-auto">Cancel</Button>
          {step === 1 ? <Button variant="outline" onClick={() => setStep(0)} disabled={pending}><ArrowLeftIcon />Back</Button> : null}
          {step === 0 ? (
            <Button onClick={() => setStep(1)} disabled={!validDays || reasonMissing}>Review<ArrowRightIcon /></Button>
          ) : (
            <SubmitButton pending={pending} onClick={() => void submit()}>Confirm Extension</SubmitButton>
          )}
        </>
      }
    >
      <Stepper steps={["Details", "Review"]} current={step} />
      <ErrorBanner message={error} />
      {step === 0 ? (
        <div className="space-y-3">
          <dl className="grid grid-cols-1 gap-1 sm:grid-cols-3">
            {[
              ["Current trial end", row.trialEndsAt ? formatDate(row.trialEndsAt) : "-"],
              ["New trial end", newEnd ? formatDate(newEnd) : "-"],
              ["Extension allowance", `${used} used · ${left} left of ${limit}`],
            ].map(([label, value]) => (
              <div key={label} className="rounded-sm border border-border px-3 py-2"><dt className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</dt><dd className="text-[0.8125rem] font-medium text-foreground">{value}</dd></div>
            ))}
          </dl>
          <Field label="Extend by (days)" htmlFor="extend-days" error={daysError} required>
            <div className="flex flex-wrap items-center gap-1.5">
              <Input id="extend-days" inputMode="numeric" value={days} onChange={(event) => setDays(event.target.value.replace(/\D/g, ""))} className="w-24 tabular" aria-invalid={Boolean(daysError)} />
              {[7, 14, 30].map((preset) => (
                <Button key={preset} type="button" variant="outline" size="sm" onClick={() => setDays(String(preset))} disabled={preset > left}>+{preset}</Button>
              ))}
            </div>
          </Field>
          <Field label="Reason" htmlFor="extend-reason" required error={fieldErrors.reason}>
            <Textarea id="extend-reason" rows={2} maxLength={300} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Why is the trial being extended?" />
          </Field>
          {detail.data && detail.data.extendedDays > 0 ? <p className="text-2xs text-muted-foreground">This trial was already extended by {detail.data.extendedDays} days.</p> : null}
        </div>
      ) : (
        <div className="space-y-2">
          <dl className="divide-y divide-border rounded-sm border border-border px-3 text-[0.8125rem]">
            <div className="flex justify-between gap-3 py-1.5"><dt className="text-muted-foreground">Company</dt><dd>{row.company.name}</dd></div>
            <div className="flex justify-between gap-3 py-1.5"><dt className="text-muted-foreground">Trial end</dt><dd>{row.trialEndsAt ? formatDate(row.trialEndsAt) : "-"} → <span className="font-medium">{newEnd ? formatDate(newEnd) : "-"}</span></dd></div>
            <div className="flex justify-between gap-3 py-1.5"><dt className="text-muted-foreground">Extension</dt><dd>{count} days</dd></div>
            <div className="flex justify-between gap-3 py-1.5"><dt className="text-muted-foreground">Reason</dt><dd className="max-w-sm text-right">{reason}</dd></div>
          </dl>
          <p className="text-2xs text-muted-foreground">The trial end, the upcoming trial queue and the subscription history update immediately. No customer notification is sent in this demo.</p>
        </div>
      )}
    </FlowDialog>
  );
}

/* ------------------------------------------------------------------ */
/* Convert                                                             */
/* ------------------------------------------------------------------ */

export function ConvertTrialFlow({ row, onClose }: { row: SubscriptionRow; onClose: () => void }) {
  const mutations = usePlanMutations();
  const choices = usePlanChoices(row.id);
  const detail = useSubscription(row.id);
  const [step, setStep] = useState(0);
  const [planKey, setPlanKey] = useState<PlanKey>(row.planKey);
  const [cycle, setCycle] = useState<BillingCycle>(row.billingCycle);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const choice = choices.data?.find((item) => item.summary.plan.key === planKey);
  const version = choice?.summary.current;
  const recurring = version ? (cycle === "annual" ? version.price.annualMinor : version.price.monthlyMinor) : 0;
  const method = detail.data?.paymentMethodLabel ?? null;
  const eligible = choice ? choice.eligible || choice.isCurrent : false;

  const submit = async () => {
    setPending(true);
    setError(null);
    try {
      const result = await mutations.convertTrial(row.id, { planKey, billingCycle: cycle });
      toast.success(`${row.company.name} is now a paid ${result.row.planName} subscription`, {
        description: result.openInvoiceNumber ? `Payment pending: invoice ${result.openInvoiceNumber} is open. Demo only - nothing was charged.` : "Demo only - nothing was charged.",
      });
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
      title="Convert trial to paid"
      description={`${row.company.name} - currently on a ${row.planName} trial`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={pending} className="mr-auto">Cancel</Button>
          {step === 1 ? <Button variant="outline" onClick={() => setStep(0)} disabled={pending}><ArrowLeftIcon />Back</Button> : null}
          {step === 0 ? (
            <Button onClick={() => setStep(1)} disabled={!eligible || !version}>Review<ArrowRightIcon /></Button>
          ) : (
            <SubmitButton pending={pending} onClick={() => void submit()}>Convert to Paid</SubmitButton>
          )}
        </>
      }
    >
      <Stepper steps={["Plan & billing", "Review"]} current={step} />
      <ErrorBanner message={error} />
      {step === 0 ? (
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Paid plan" htmlFor="convert-plan">
              <Select value={planKey} onValueChange={(value) => setPlanKey(value as PlanKey)}>
                <SelectTrigger id="convert-plan"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(choices.data ?? []).map((item) => (
                    <SelectItem key={item.summary.plan.key} value={item.summary.plan.key} disabled={!item.eligible && !item.isCurrent}>
                      {item.summary.plan.name}{item.isCurrent ? " (trial plan)" : ""}{item.reason ? ` - ${item.reason}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Billing cycle" htmlFor="convert-cycle">
              <Select value={cycle} onValueChange={(value) => setCycle(value as BillingCycle)}>
                <SelectTrigger id="convert-cycle"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="annual">Annual</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>
          <dl className="grid grid-cols-1 gap-1 sm:grid-cols-3">
            {[
              ["Recurring amount", version ? `${money(recurring, version.price.currency)} / ${cycle === "annual" ? "year" : "month"}` : "-"],
              ["Effective", "Immediately"],
              ["Payment readiness", method ? method : "No payment method on file"],
            ].map(([label, value]) => (
              <div key={label} className="rounded-sm border border-border px-3 py-2"><dt className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</dt><dd className="text-[0.8125rem] font-medium text-foreground">{value}</dd></div>
            ))}
          </dl>
          {!method ? <AlertBanner tone="warning" title="No payment method">The subscription will start, but payment stays pending until a method is added and the invoice is paid.</AlertBanner> : null}
        </div>
      ) : (
        <div className="space-y-2">
          <dl className="divide-y divide-border rounded-sm border border-border px-3 text-[0.8125rem]">
            <div className="flex justify-between gap-3 py-1.5"><dt className="text-muted-foreground">Company</dt><dd>{row.company.name}</dd></div>
            <div className="flex justify-between gap-3 py-1.5"><dt className="text-muted-foreground">Plan</dt><dd>{choice?.summary.plan.name} · v{version?.version} · {cycle}</dd></div>
            <div className="flex justify-between gap-3 py-1.5"><dt className="text-muted-foreground">Recurring amount</dt><dd>{version ? money(recurring, version.price.currency) : "-"}</dd></div>
            <div className="flex justify-between gap-3 py-1.5"><dt className="text-muted-foreground">Result</dt><dd>Active - payment pending</dd></div>
          </dl>
          <AlertBanner tone="info" title="Demo payment policy">
            Converting issues an open invoice and starts the paid period. No payment is collected here, so billing shows the amount as pending until it is paid. It is never presented as paid.
          </AlertBanner>
        </div>
      )}
    </FlowDialog>
  );
}

/* ------------------------------------------------------------------ */
/* End                                                                 */
/* ------------------------------------------------------------------ */

export function EndTrialFlow({ row, onClose }: { row: SubscriptionRow; onClose: () => void }) {
  const mutations = usePlanMutations();
  const [reason, setReason] = useState("");
  const [attempted, setAttempted] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setAttempted(true);
    if (!reason.trim()) return;
    setPending(true);
    setError(null);
    try {
      await mutations.endTrial(row.id, reason.trim());
      toast.success(`${row.company.name}'s trial ended`);
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
      title={`End ${row.company.name}'s trial now?`}
      description="The subscription becomes Expired today instead of on its trial end date."
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={pending}>Cancel</Button>
          <SubmitButton pending={pending} variant="destructive" onClick={() => void submit()}>End Trial</SubmitButton>
        </>
      }
    >
      <ErrorBanner message={error} />
      <AlertBanner tone="info" title="What this does and does not do">
        Ending a trial expires the subscription. It does not suspend the company account, delete data or remove users; the company can be moved to a paid plan later.
      </AlertBanner>
      <Field label="Reason" htmlFor="end-trial-reason" required error={attempted && !reason.trim() ? "A reason is required for the audit trail." : null}>
        <Textarea id="end-trial-reason" rows={2} maxLength={300} value={reason} onChange={(event) => setReason(event.target.value)} />
      </Field>
    </FlowDialog>
  );
}
