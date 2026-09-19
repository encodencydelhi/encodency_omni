"use client";

import { CheckIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AlertBanner } from "@/components/shared/alert-banner";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils/cn";
import { formatCompactNumber, formatCurrency, formatDate } from "@/lib/utils/format";
import type { BillingCycle } from "@/types/domain/subscription";
import { isoDaysFromNow, nowIso, platformNow } from "../../data/clock";
import { OVERRIDABLE_RESOURCES, USAGE_RESOURCES, USAGE_RESOURCE_BY_KEY } from "../../data/config";
import { describeError, useCompanyMutations, useCompanySubscription } from "../../data/hooks";
import { cyclePrice, estimateProration, monthlyEquivalent } from "../../data/selectors";
import type { UsageResource } from "../../data/types";
import { useCurrentStaff } from "../../data/capability-provider";
import { useUnsavedGuard } from "../../hooks/use-unsaved-guard";
import { formatLimit, toDateInput } from "../../lib/format";
import { Field } from "../primitives";
import { SectionError } from "../states";
import { ConfirmPhrase, ErrorBanner, FlowDialog, Stepper, SubmitButton, phraseMatches } from "./flow-kit";

function LoadingBody() {
  return <p className="py-6 text-center text-[0.8125rem] text-muted-foreground">Loading subscription...</p>;
}

/* ------------------------------------------------------------------ */
/* Change plan                                                         */
/* ------------------------------------------------------------------ */

export function ChangePlanFlow({ companyId, onClose }: { companyId: string; onClose: () => void }) {
  const query = useCompanySubscription(companyId);
  const mutations = useCompanyMutations();
  const data = query.data;

  const [step, setStep] = useState(0);
  const [planTier, setPlanTier] = useState<string | null>(null);
  const [cycle, setCycle] = useState<BillingCycle | null>(null);
  const [effective, setEffective] = useState<"immediately" | "next_renewal">("immediately");
  const [reason, setReason] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const subscription = data?.subscription;
  const selectedTier = planTier ?? subscription?.planTier ?? "starter";
  const selectedCycle = cycle ?? subscription?.billingCycle ?? "monthly";
  const current = data?.plan;
  const next = data?.plans.find((plan) => plan.tier === selectedTier);

  const unchanged = subscription ? selectedTier === subscription.planTier && selectedCycle === subscription.billingCycle : true;
  const dirty = !unchanged || reason.trim() !== "" || effective !== "immediately";

  const proration = useMemo(
    () => (data && current && next && subscription ? estimateProration(current, next, subscription, selectedCycle, platformNow()) : null),
    [data, current, next, subscription, selectedCycle],
  );

  const overLimit = useMemo(() => {
    if (!data || !next) return [];
    return data.usage.records.filter((record) => {
      const def = USAGE_RESOURCE_BY_KEY[record.resource];
      if (!def.metric || record.activeOverride) return false;
      const limit = next.limits[def.metric];
      return limit !== null && record.used > limit;
    });
  }, [data, next]);

  const submit = async (): Promise<boolean> => {
    if (!next) return false;
    setPending(true);
    setError(null);
    try {
      await mutations.changePlan(companyId, { planTier: next.tier, billingCycle: selectedCycle, effective, reason: reason.trim() });
      toast.success(
        effective === "immediately"
          ? `${data?.companyName ?? "Company"} moved to ${next.name} in the demo workspace`
          : `Plan change to ${next.name} scheduled for the next renewal`,
      );
      return true;
    } catch (failure) {
      setError(describeError(failure).message);
      return false;
    } finally {
      setPending(false);
    }
  };

  const guard = useUnsavedGuard({ dirty, onDiscard: onClose, label: "this plan change" });

  const blocked = data && (data.subscription.status === "cancelled" || data.subscription.status === "expired");

  return (
    <>
      <FlowDialog
        open
        onOpenChange={(open) => !open && !pending && guard.requestClose()}
        size="xl"
        title="Change plan"
        description={data ? `Move ${data.companyName} to a different plan or billing cycle.` : undefined}
        footer={
          <>
            <Button variant="outline" onClick={guard.requestClose} disabled={pending}>
              Cancel
            </Button>
            {step > 0 ? (
              <Button variant="outline" onClick={() => setStep(0)} disabled={pending}>
                Back
              </Button>
            ) : null}
            {step === 0 ? (
              <Button onClick={() => setStep(1)} disabled={unchanged || !data || Boolean(blocked)}>
                Review change
              </Button>
            ) : (
              <SubmitButton
                pending={pending}
                disabled={!confirmed}
                onClick={async () => {
                  if (await submit()) onClose();
                }}
              >
                <CheckIcon />
                Confirm plan change
              </SubmitButton>
            )}
          </>
        }
      >
        <Stepper steps={["Choose plan", "Review & confirm"]} current={step} />
        <ErrorBanner message={error} />
        {query.error ? <SectionError subject="Subscription data" error={query.error} onRetry={() => void query.refetch()} /> : null}
        {query.isPending ? <LoadingBody /> : null}
        {blocked ? (
          <AlertBanner tone="warning" title="Reactivate the subscription first">
            An {data?.subscription.status} subscription cannot change plan. Use Reactivate Subscription, then change the plan.
          </AlertBanner>
        ) : null}

        {data && current && step === 0 ? (
          <div className="space-y-3">
            <div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-4">
              {data.plans.map((plan) => {
                const isCurrent = plan.tier === data.subscription.planTier;
                const selected = plan.tier === selectedTier;
                return (
                  <button
                    key={plan.tier}
                    type="button"
                    onClick={() => setPlanTier(plan.tier)}
                    aria-pressed={selected}
                    className={cn(
                      "rounded-sm border px-3 py-2.5 text-left transition-colors",
                      selected ? "border-primary bg-primary-subtle" : "border-border hover:bg-accent",
                    )}
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span className="text-[0.8125rem] font-semibold text-foreground">{plan.name}</span>
                      {isCurrent ? <span className="rounded-sm bg-muted px-1.5 text-[11px] font-medium text-muted-foreground">Current</span> : null}
                    </span>
                    <span className="mt-1 block text-sm font-semibold tabular text-foreground">
                      {formatCurrency(cyclePrice(plan, selectedCycle), plan.currency)}
                      <span className="text-2xs font-normal text-muted-foreground"> / {selectedCycle === "annual" ? "year" : "month"}</span>
                    </span>
                    <span className="mt-1 block text-2xs text-muted-foreground">
                      {formatLimit(plan.limits.users, "users")} users · {formatLimit(plan.limits.Clients, "clients")} clients
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <fieldset>
                <legend className="mb-1.5 text-[0.8125rem] font-medium text-foreground">Billing cycle</legend>
                <RadioGroup value={selectedCycle} onValueChange={(value) => setCycle(value as BillingCycle)} className="grid grid-cols-2 gap-1.5">
                  {(["monthly", "annual"] as const).map((option) => (
                    <Label key={option} className={cn("flex cursor-pointer items-center gap-2 rounded-sm border px-3 py-2 font-normal capitalize", selectedCycle === option ? "border-primary/40 bg-primary-subtle" : "border-border")}>
                      <RadioGroupItem value={option} />
                      {option}
                    </Label>
                  ))}
                </RadioGroup>
              </fieldset>
              <fieldset>
                <legend className="mb-1.5 text-[0.8125rem] font-medium text-foreground">Effective</legend>
                <RadioGroup value={effective} onValueChange={(value) => setEffective(value as typeof effective)} className="grid gap-1.5">
                  <Label className={cn("flex cursor-pointer items-start gap-2 rounded-sm border px-3 py-2 font-normal", effective === "immediately" ? "border-primary/40 bg-primary-subtle" : "border-border")}>
                    <RadioGroupItem value="immediately" className="mt-0.5" />
                    <span>Immediately<span className="block text-2xs text-muted-foreground">Limits and MRR update now</span></span>
                  </Label>
                  <Label className={cn("flex cursor-pointer items-start gap-2 rounded-sm border px-3 py-2 font-normal", effective === "next_renewal" ? "border-primary/40 bg-primary-subtle" : "border-border")}>
                    <RadioGroupItem value="next_renewal" className="mt-0.5" />
                    <span>At next renewal<span className="block text-2xs text-muted-foreground">{formatDate(data.subscription.renewsAt)}</span></span>
                  </Label>
                </RadioGroup>
              </fieldset>
            </div>

            <Field label="Reason (optional)" htmlFor="plan-reason">
              <Textarea id="plan-reason" value={reason} onChange={(event) => setReason(event.target.value)} className="min-h-14" placeholder="Recorded in the activity log." />
            </Field>
          </div>
        ) : null}

        {data && current && next && step === 1 ? (
          <div className="space-y-3">
            <div className="overflow-x-auto rounded-sm border border-border">
              <table className="w-full min-w-[30rem] text-[0.8125rem]">
                <thead className="bg-surface-sunken text-left text-2xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-3 py-1.5 font-semibold">&nbsp;</th>
                    <th className="px-3 py-1.5 font-semibold">Current</th>
                    <th className="px-3 py-1.5 font-semibold">New</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  <ReviewCompare label="Plan" from={current.name} to={next.name} />
                  <ReviewCompare label="Billing cycle" from={data.subscription.billingCycle} to={selectedCycle} capitalise />
                  <ReviewCompare label="Price per cycle" from={formatCurrency(cyclePrice(current, data.subscription.billingCycle), current.currency)} to={formatCurrency(cyclePrice(next, selectedCycle), next.currency)} />
                  <ReviewCompare label="MRR contribution" from={formatCurrency(data.mrrMinor, current.currency)} to={effective === "immediately" ? formatCurrency(monthlyEquivalent(next, selectedCycle), next.currency) : "Unchanged until renewal"} />
                  <ReviewCompare label="Effective date" from="-" to={effective === "immediately" ? "Today" : formatDate(data.subscription.renewsAt)} />
                </tbody>
              </table>
            </div>

            <div className="overflow-x-auto rounded-sm border border-border">
              <table className="w-full min-w-[30rem] text-[0.8125rem]">
                <thead className="bg-surface-sunken text-left text-2xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-3 py-1.5 font-semibold">Limit</th>
                    <th className="px-3 py-1.5 font-semibold">Current plan</th>
                    <th className="px-3 py-1.5 font-semibold">New plan</th>
                    <th className="px-3 py-1.5 font-semibold">Used</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {USAGE_RESOURCES.filter((def) => def.metric).map((def) => {
                    const record = data.usage.records.find((item) => item.resource === def.key);
                    const newLimit = def.metric ? next.limits[def.metric] : null;
                    const over = record && newLimit !== null && record.used > newLimit && !record.activeOverride;
                    return (
                      <tr key={def.key} className={cn(over && "bg-danger-subtle/50")}>
                        <td className="px-3 py-1.5 text-foreground">{def.label}</td>
                        <td className="px-3 py-1.5 tabular text-muted-foreground">{formatLimit(record?.includedLimit ?? null, def.key)}</td>
                        <td className="px-3 py-1.5 tabular text-foreground">{formatLimit(newLimit, def.key)}</td>
                        <td className={cn("px-3 py-1.5 tabular", over ? "font-semibold text-danger" : "text-muted-foreground")}>{formatCompactNumber(record?.used ?? 0)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {overLimit.length > 0 ? (
              <AlertBanner tone="warning" title="Current usage exceeds the new plan">
                {overLimit.map((record) => USAGE_RESOURCE_BY_KEY[record.resource].label).join(", ")} would be over the new limit. Existing data is kept; the backend decides how the excess is handled.
              </AlertBanner>
            ) : null}

            {effective === "immediately" && proration && data.subscription.status !== "trialing" ? (
              <div className="rounded-sm border border-border bg-surface-sunken px-3 py-2 text-[0.8125rem]">
                <p className="font-medium text-foreground">Proration estimate</p>
                <p className="text-2xs text-muted-foreground">
                  {proration.daysRemaining} of {proration.periodDays} days remain. Credit {formatCurrency(proration.creditMinor, current.currency)}, charge {formatCurrency(proration.chargeMinor, current.currency)}, net{" "}
                  <span className="font-semibold text-foreground">{formatCurrency(proration.netMinor, current.currency)}</span>. Estimate only - no payment is taken in demo mode.
                </p>
              </div>
            ) : null}

            {data.usage.overrides.length > 0 ? (
              <p className="text-2xs text-muted-foreground">Active limit overrides are kept and continue to apply on top of the new plan.</p>
            ) : null}

            <label className="flex cursor-pointer items-start gap-2.5 text-[0.8125rem] text-foreground">
              <Checkbox checked={confirmed} onCheckedChange={(value) => setConfirmed(value === true)} className="mt-0.5" />
              <span>I confirm the change of {data.companyName} from {current.name} to {next.name}.</span>
            </label>
          </div>
        ) : null}
      </FlowDialog>
      {guard.guardDialog}
    </>
  );
}

function ReviewCompare({ label, from, to, capitalise }: { label: string; from: string; to: string; capitalise?: boolean }) {
  const changed = from !== to;
  return (
    <tr>
      <td className="px-3 py-1.5 text-muted-foreground">{label}</td>
      <td className={cn("px-3 py-1.5 tabular", capitalise && "capitalize")}>{from}</td>
      <td className={cn("px-3 py-1.5 tabular", capitalise && "capitalize", changed ? "font-semibold text-foreground" : "text-foreground")}>{to}</td>
    </tr>
  );
}

/* ------------------------------------------------------------------ */
/* Usage override                                                      */
/* ------------------------------------------------------------------ */

export function UsageOverrideDialog({ companyId, initialResource, onClose }: { companyId: string; initialResource?: UsageResource; onClose: () => void }) {
  const query = useCompanySubscription(companyId);
  const mutations = useCompanyMutations();
  const staff = useCurrentStaff();
  const data = query.data;

  const [resource, setResource] = useState<UsageResource>(initialResource && OVERRIDABLE_RESOURCES.includes(initialResource) ? initialResource : "aiCredits");
  const [limit, setLimit] = useState("");
  const [reason, setReason] = useState("");
  const [startsAt, setStartsAt] = useState(() => toDateInput(nowIso()));
  const [expiresAt, setExpiresAt] = useState(() => toDateInput(isoDaysFromNow(30)));
  const [confirmed, setConfirmed] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const record = data?.usage.records.find((item) => item.resource === resource);
  const def = USAGE_RESOURCE_BY_KEY[resource];
  const overrideLimit = Number(limit);

  const clientErrors: Record<string, string> = {};
  if (limit !== "" && !(overrideLimit > 0)) clientErrors.overrideLimit = "Enter a limit above zero.";
  if (record?.includedLimit !== null && record?.includedLimit !== undefined && overrideLimit > 0 && overrideLimit <= record.includedLimit) {
    clientErrors.overrideLimit = "An override should raise the limit above the plan limit.";
  }
  if (expiresAt <= startsAt) clientErrors.expiresAt = "The expiry must be after the start.";
  const valid = limit !== "" && Object.keys(clientErrors).length === 0 && reason.trim().length >= 5 && confirmed;
  const dirty = limit !== "" || reason !== "";

  const submit = async (): Promise<boolean> => {
    setPending(true);
    setError(null);
    setFieldErrors({});
    try {
      await mutations.applyUsageOverride(companyId, { resource, overrideLimit, reason: reason.trim(), startsAt, expiresAt });
      toast.success(`Temporary ${def.label} override recorded`);
      return true;
    } catch (failure) {
      const described = describeError(failure);
      setError(described.message);
      setFieldErrors(described.fieldErrors);
      return false;
    } finally {
      setPending(false);
    }
  };

  const guard = useUnsavedGuard({ dirty, onDiscard: onClose, label: "this limit override" });
  const shown = { ...fieldErrors, ...clientErrors };

  return (
    <>
      <FlowDialog
        open
        onOpenChange={(open) => !open && !pending && guard.requestClose()}
        title="Apply temporary limit override"
        description="A time-limited exception for this company. The plan definition itself is never changed."
        footer={
          <>
            <Button variant="outline" onClick={guard.requestClose} disabled={pending}>
              Cancel
            </Button>
            <SubmitButton
              pending={pending}
              disabled={!valid}
              onClick={async () => {
                if (await submit()) onClose();
              }}
            >
              Apply override
            </SubmitButton>
          </>
        }
      >
        <ErrorBanner message={error} />
        {query.isPending ? <LoadingBody /> : null}
        {query.error ? <SectionError subject="Subscription data" error={query.error} onRetry={() => void query.refetch()} /> : null}
        {data ? (
          <>
            <Field label="Resource" htmlFor="override-resource" error={shown.resource}>
              <Select value={resource} onValueChange={(value) => setResource(value as UsageResource)}>
                <SelectTrigger id="override-resource">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {OVERRIDABLE_RESOURCES.map((key) => (
                    <SelectItem key={key} value={key}>
                      {USAGE_RESOURCE_BY_KEY[key].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <dl className="grid grid-cols-3 gap-1">
              <MiniStat label="Plan limit" value={formatLimit(record?.includedLimit ?? null, resource)} />
              <MiniStat label="Current usage" value={formatCompactNumber(record?.used ?? 0)} />
              <MiniStat label="Effective limit" value={formatLimit(record?.effectiveLimit ?? null, resource)} />
            </dl>

            <Field label={`Override limit (${def.unit})`} htmlFor="override-limit" required error={shown.overrideLimit}>
              <Input id="override-limit" type="number" min={1} value={limit} onChange={(event) => setLimit(event.target.value)} aria-invalid={Boolean(shown.overrideLimit)} />
            </Field>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Start date" htmlFor="override-start">
                <Input id="override-start" type="date" value={startsAt} onChange={(event) => setStartsAt(event.target.value)} />
              </Field>
              <Field label="Expiry date" htmlFor="override-expiry" error={shown.expiresAt}>
                <Input id="override-expiry" type="date" value={expiresAt} min={startsAt} onChange={(event) => setExpiresAt(event.target.value)} aria-invalid={Boolean(shown.expiresAt)} />
              </Field>
            </div>

            <Field label="Reason" htmlFor="override-reason" required error={shown.reason} hint="Required. Recorded in the activity log with the approver.">
              <Textarea id="override-reason" value={reason} onChange={(event) => setReason(event.target.value)} className="min-h-16" aria-invalid={Boolean(shown.reason)} />
            </Field>

            <p className="text-[0.8125rem] text-muted-foreground">
              Approved by <span className="font-medium text-foreground">{staff.name}</span>
            </p>

            <label className="flex cursor-pointer items-start gap-2.5 text-[0.8125rem] text-foreground">
              <Checkbox checked={confirmed} onCheckedChange={(value) => setConfirmed(value === true)} className="mt-0.5" />
              <span>I confirm this raises the {def.label} limit for {data.companyName} until {expiresAt}.</span>
            </label>
          </>
        ) : null}
      </FlowDialog>
      {guard.guardDialog}
    </>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-sm border border-border bg-surface-sunken px-3 py-2">
      <dt className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 truncate text-[0.8125rem] font-semibold text-foreground tabular">{value}</dd>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Trial, cycle, cancellation, reactivation                            */
/* ------------------------------------------------------------------ */

export type SubscriptionAction = "extend_trial" | "convert_trial" | "change_cycle" | "schedule_cancellation" | "reactivate";

export function SubscriptionActionDialog({ companyId, action, onClose }: { companyId: string; action: SubscriptionAction; onClose: () => void }) {
  const query = useCompanySubscription(companyId);
  const mutations = useCompanyMutations();
  const data = query.data;

  const [days, setDays] = useState("7");
  const [reason, setReason] = useState("");
  const [cycle, setCycle] = useState<BillingCycle | null>(null);
  const [phrase, setPhrase] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentCycle = data?.subscription.billingCycle ?? "monthly";
  const chosenCycle = cycle ?? (action === "change_cycle" ? (currentCycle === "monthly" ? "annual" : "monthly") : currentCycle);

  const run = async () => {
    if (!data) return;
    setPending(true);
    setError(null);
    try {
      if (action === "extend_trial") {
        await mutations.extendTrial(companyId, { days: Number(days), reason: reason.trim() });
        toast.success(`Trial extended by ${days} days`);
      } else if (action === "convert_trial") {
        await mutations.convertTrialToPaid(companyId, { billingCycle: chosenCycle });
        toast.success("Trial converted. An invoice was issued; no payment was collected.");
      } else if (action === "change_cycle") {
        await mutations.changeBillingCycle(companyId, { billingCycle: chosenCycle, reason: reason.trim() });
        toast.success(`Billing cycle changed to ${chosenCycle}`);
      } else if (action === "schedule_cancellation") {
        await mutations.scheduleCancellation(companyId, { reason: reason.trim() });
        toast.success("Cancellation scheduled for the end of the period");
      } else {
        await mutations.reactivateSubscription(companyId);
        toast.success("Subscription reactivated");
      }
      onClose();
    } catch (failure) {
      setError(describeError(failure).message);
    } finally {
      setPending(false);
    }
  };

  if (action === "reactivate") {
    return (
      <ConfirmDialog
        open
        onOpenChange={(open) => !open && !pending && onClose()}
        title="Reactivate this subscription?"
        description={
          error ??
          (data
            ? `${data.companyName}'s subscription returns to Active.${data.subscription.status === "cancelled" || data.subscription.status === "expired" ? " A new period starts today and an invoice is issued; no payment is collected in demo mode." : ""}`
            : "Loading...")
        }
        confirmLabel="Reactivate subscription"
        isPending={pending}
        onConfirm={() => void run()}
      />
    );
  }

  const copy = {
    extend_trial: { title: "Extend trial", description: "Give the company more time before the first invoice.", submit: "Extend trial" },
    convert_trial: { title: "Convert trial to paid", description: "Ends the trial and starts the paid subscription.", submit: "Convert to paid" },
    change_cycle: { title: "Change billing cycle", description: "Switch between monthly and annual billing.", submit: "Change cycle" },
    schedule_cancellation: { title: "Schedule cancellation", description: "The subscription ends at the close of the current period.", submit: "Schedule cancellation" },
  }[action];

  const needsReason = action === "extend_trial" || action === "change_cycle" || action === "schedule_cancellation";
  const cancellationConfirmed = action !== "schedule_cancellation" || (data ? phraseMatches(phrase, data.companyName) : false);
  const valid = (!needsReason || reason.trim().length >= 3) && cancellationConfirmed && (action !== "extend_trial" || Number(days) > 0);

  return (
    <FlowDialog
      open
      onOpenChange={(open) => !open && !pending && onClose()}
      title={copy.title}
      description={copy.description}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <SubmitButton pending={pending} variant={action === "schedule_cancellation" ? "destructive" : "default"} disabled={!valid || !data} onClick={run}>
            {copy.submit}
          </SubmitButton>
        </>
      }
    >
      <ErrorBanner message={error} />
      {query.isPending ? <LoadingBody /> : null}
      {data ? (
        <>
          {action === "extend_trial" ? (
            <>
              <p className="text-[0.8125rem] text-muted-foreground">
                Trial currently ends {data.subscription.trialEndsAt ? formatDate(data.subscription.trialEndsAt) : "-"}.
              </p>
              <Field label="Extend by" htmlFor="trial-days">
                <Select value={days} onValueChange={setDays}>
                  <SelectTrigger id="trial-days">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["7", "14", "30"].map((value) => (
                      <SelectItem key={value} value={value}>
                        {value} days
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </>
          ) : null}

          {action === "convert_trial" || action === "change_cycle" ? (
            <fieldset>
              <legend className="mb-1.5 text-[0.8125rem] font-medium text-foreground">Billing cycle</legend>
              <RadioGroup value={chosenCycle} onValueChange={(value) => setCycle(value as BillingCycle)} className="grid grid-cols-2 gap-1.5">
                {(["monthly", "annual"] as const).map((option) => (
                  <Label key={option} className={cn("flex cursor-pointer items-center justify-between gap-2 rounded-sm border px-3 py-2 font-normal", chosenCycle === option ? "border-primary/40 bg-primary-subtle" : "border-border")}>
                    <span className="flex items-center gap-2 capitalize">
                      <RadioGroupItem value={option} />
                      {option}
                    </span>
                    <span className="tabular text-2xs text-muted-foreground">{formatCurrency(cyclePrice(data.plan, option), data.plan.currency)}</span>
                  </Label>
                ))}
              </RadioGroup>
            </fieldset>
          ) : null}

          {action === "convert_trial" ? (
            <AlertBanner tone="info" title="No payment is collected">
              {data.subscription.paymentMethod
                ? `A payment method is on file (${data.subscription.paymentMethod.brand} ...${data.subscription.paymentMethod.last4}), but demo mode never charges it. An open invoice is issued instead.`
                : "There is no payment method on file. An open invoice is issued and the company shows as Payment Due."}
            </AlertBanner>
          ) : null}

          {needsReason ? (
            <Field label="Reason" htmlFor="sub-reason" required>
              <Textarea id="sub-reason" value={reason} onChange={(event) => setReason(event.target.value)} className="min-h-16" placeholder="Recorded in the activity log." />
            </Field>
          ) : null}

          {action === "schedule_cancellation" ? (
            <>
              <AlertBanner tone="warning" title="Access continues until the period ends">
                {data.companyName} keeps its plan until {formatDate(data.subscription.trialEndsAt ?? data.subscription.renewsAt)}, then the subscription ends. You can reactivate it before then.
              </AlertBanner>
              <ConfirmPhrase id="cancel-confirm" phrase={data.companyName} value={phrase} onChange={setPhrase} />
            </>
          ) : null}
        </>
      ) : null}
      {query.error ? <SectionError subject="Subscription data" error={query.error} onRetry={() => void query.refetch()} /> : null}
    </FlowDialog>
  );
}
