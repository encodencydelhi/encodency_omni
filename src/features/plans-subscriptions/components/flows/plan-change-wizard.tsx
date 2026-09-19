"use client";

import { ArrowLeftIcon, ArrowRightIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AlertBanner } from "@/components/shared/alert-banner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ErrorBanner, FlowDialog, Stepper, SubmitButton } from "@/features/companies/components/flows/flow-kit";
import { Field } from "@/features/companies/components/primitives";
import { isoDaysFromNow } from "@/features/companies/data/clock";
import { cn } from "@/lib/utils/cn";
import { formatDate } from "@/lib/utils/format";
import type { PlanKey } from "@/types/domain/plan";
import type { BillingCycle } from "@/types/domain/subscription";
import { describeError, usePlanChangeImpact, usePlanChoices, usePlanMutations, usePolicy } from "../../data/hooks";
import type { SubscriptionRow } from "../../data/types";
import { money, signedMoney } from "../../lib/money";
import { PlanStatusBadge } from "../badges";
import { MiniTable } from "../mini-table";

const STEPS = ["Select plan", "Compare", "Usage impact", "Effective date", "Review"];

type Effective = "immediately" | "next_renewal" | "custom_date";

/**
 * Moving a company to another plan is five deliberate steps, not a dropdown and a
 * Save button: choose, compare, check real usage against the new limits, choose
 * when it applies, then confirm. A future date creates a scheduled change and
 * leaves today's plan untouched.
 */
export function PlanChangeWizard({ row, initialPlan, onClose }: { row: SubscriptionRow; initialPlan?: PlanKey; onClose: () => void }) {
  const mutations = usePlanMutations();
  const choices = usePlanChoices(row.id);
  const policy = usePolicy();
  const [step, setStep] = useState(0);
  const [planKey, setPlanKey] = useState<PlanKey | null>(initialPlan ?? null);
  const [cycle, setCycle] = useState<BillingCycle>(row.billingCycle);
  const [effective, setEffective] = useState<Effective>("immediately");
  const [customDate, setCustomDate] = useState(() => isoDaysFromNow(30).slice(0, 10));
  const [acknowledged, setAcknowledged] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [reason, setReason] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const impact = usePlanChangeImpact(row.id, planKey, cycle);
  const data = impact.data;
  const overLimit = data?.overLimit ?? [];
  const tomorrow = isoDaysFromNow(1).slice(0, 10);
  const dateInvalid = effective === "custom_date" && (!customDate || customDate < tomorrow);

  const canContinue =
    step === 0 ? Boolean(planKey && data && !data.ineligibleReason && (planKey !== row.planKey || cycle !== row.billingCycle || (row.currentVersion !== null && row.planVersion < row.currentVersion))) :
    step === 2 ? overLimit.length === 0 || acknowledged :
    step === 3 ? !dateInvalid : true;

  const confirm = async () => {
    if (!planKey) return;
    setPending(true);
    setError(null);
    setFieldErrors({});
    try {
      const detail = await mutations.changeCompanyPlan(row.id, {
        planKey,
        billingCycle: cycle,
        effective,
        effectiveAt: effective === "custom_date" ? new Date(`${customDate}T00:00:00.000Z`).toISOString() : undefined,
        reason: reason.trim(),
        overLimitAcknowledged: acknowledged,
      });
      toast.success(effective === "immediately" ? `${row.company.name} is now on ${detail.row.planName}` : `Change scheduled for ${row.company.name}`, {
        description: effective === "immediately" ? "Demo only: no payment was charged." : "The current plan stays until the effective date.",
      });
      onClose();
    } catch (failure) {
      const described = describeError(failure);
      setError(described.message);
      setFieldErrors(described.fieldErrors);
      if (described.fieldErrors.effectiveAt) setStep(3);
    } finally {
      setPending(false);
    }
  };

  const changedRows = (data?.rows ?? []).filter((item) => showAll || item.changed);
  const nextChoice = choices.data?.find((choice) => choice.summary.plan.key === planKey);
  const monthlyDelta = data ? data.next.monthlyEquivalentMinor - data.current.monthlyEquivalentMinor : 0;

  return (
    <FlowDialog
      open
      onOpenChange={(open) => !open && !pending && onClose()}
      title="Change plan"
      description={`${row.company.name} is on ${row.planName} (version ${row.planVersion}, ${row.billingCycle}).`}
      size="xl"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={pending} className="mr-auto">Cancel</Button>
          {step > 0 ? (
            <Button variant="outline" onClick={() => setStep(step - 1)} disabled={pending}>
              <ArrowLeftIcon />
              Back
            </Button>
          ) : null}
          {step < 4 ? (
            <Button onClick={() => setStep(step + 1)} disabled={!canContinue || (step > 0 && !data)}>
              Next
              <ArrowRightIcon />
            </Button>
          ) : (
            <SubmitButton pending={pending} onClick={() => void confirm()}>
              {effective === "immediately" ? "Confirm Plan Change" : "Schedule Change"}
            </SubmitButton>
          )}
        </>
      }
    >
      <Stepper steps={STEPS} current={step} />
      <ErrorBanner message={error} />

      {step === 0 ? (
        <div className="space-y-2">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <p className="text-[0.8125rem] text-muted-foreground">Choose the plan {row.company.name} should move to. Plans that are not available for this move are shown, but cannot be chosen.</p>
            <Field label="Billing cycle" htmlFor="change-cycle" className="w-40">
              <Select value={cycle} onValueChange={(value) => setCycle(value as BillingCycle)}>
                <SelectTrigger id="change-cycle" size="sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="annual">Annual</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>
          {choices.error ? <ErrorBanner message={describeError(choices.error).message} /> : null}
          <RadioGroup value={planKey ?? ""} onValueChange={(value) => { setPlanKey(value as PlanKey); setAcknowledged(false); }} className="grid grid-cols-1 gap-1 sm:grid-cols-2" aria-label="New plan">
            {(choices.data ?? []).map((choice) => {
              const version = choice.summary.current;
              const price = version ? (cycle === "annual" ? version.price.annualMinor : version.price.monthlyMinor) : 0;
              const sameAsNow = choice.isCurrent && cycle === row.billingCycle && row.planVersion === (version?.version ?? row.planVersion);
              return (
                <div key={choice.summary.plan.id} className={cn("flex items-start gap-2.5 rounded-sm border px-3 py-2", planKey === choice.summary.plan.key ? "border-primary/40 bg-primary-subtle/50" : "border-border", !choice.eligible && "opacity-60")}>
                  <RadioGroupItem value={choice.summary.plan.key} id={`plan-${choice.summary.plan.key}`} disabled={!choice.eligible} className="mt-0.5" />
                  <Label htmlFor={`plan-${choice.summary.plan.key}`} className="flex-1 cursor-pointer font-normal">
                    <span className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[0.8125rem] font-semibold text-foreground">{choice.summary.plan.name}</span>
                      {choice.isCurrent ? <span className="rounded-sm border border-border-strong bg-neutral-subtle px-1 text-[10px] font-medium text-neutral">Current</span> : null}
                      {choice.summary.plan.status !== "published" ? <PlanStatusBadge status={choice.summary.plan.status} /> : null}
                    </span>
                    <span className="block text-2xs text-muted-foreground">{version ? `${money(price, version.price.currency)} / ${cycle === "annual" ? "year" : "month"} · version ${version.version}` : "No published version"}</span>
                    {choice.reason ? <span className="block text-2xs text-warning">{choice.reason}</span> : null}
                    {sameAsNow ? <span className="block text-2xs text-muted-foreground">Same plan and cycle</span> : null}
                  </Label>
                </div>
              );
            })}
          </RadioGroup>
          {planKey && data?.ineligibleReason ? <AlertBanner tone="danger" title="This move is not possible">{data.ineligibleReason}</AlertBanner> : null}
        </div>
      ) : null}

      {step === 1 ? (
        !data ? (
          <p className="text-[0.8125rem] text-muted-foreground">Comparing...</p>
        ) : (
          <div className="space-y-2">
            <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
              <div className="rounded-sm border border-border px-3 py-2">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Current</p>
                <p className="text-[0.8125rem] font-semibold text-foreground">{data.current.planName} · v{data.current.version}</p>
                <p className="text-2xs text-muted-foreground">{money(data.current.recurringMinor, data.current.currency)} / {data.current.cycle === "annual" ? "year" : "month"}</p>
              </div>
              <div className="rounded-sm border border-primary/30 bg-primary-subtle/40 px-3 py-2">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">New</p>
                <p className="text-[0.8125rem] font-semibold text-foreground">{data.next.planName} · v{data.next.version}</p>
                <p className="text-2xs text-muted-foreground">{money(data.next.recurringMinor, data.next.currency)} / {data.next.cycle === "annual" ? "year" : "month"} ({data.currencyMismatch ? "different currency" : signedMoney(monthlyDelta, data.next.currency) + " per month equivalent"})</p>
              </div>
            </div>
            {data.currencyMismatch ? <AlertBanner tone="warning" title="The currency differs">The new plan is priced in {data.next.currency}, the current one in {data.current.currency}. No conversion is applied or invented.</AlertBanner> : null}
            <div className="flex items-center gap-2">
              <Checkbox id="show-all-rows" checked={showAll} onCheckedChange={(value) => setShowAll(value === true)} />
              <Label htmlFor="show-all-rows" className="text-2xs font-normal text-muted-foreground">Show unchanged entitlements too</Label>
            </div>
            <MiniTable
              caption="Plan comparison"
              rows={changedRows}
              getKey={(item) => `${item.kind}-${item.key}`}
              empty={<p className="text-[0.8125rem] text-muted-foreground">These plan versions have identical entitlements.</p>}
              columns={[
                { id: "name", header: "Entitlement", cell: (item) => item.name },
                { id: "current", header: "Current", cell: (item) => item.current },
                { id: "next", header: "New", cell: (item) => <span className={cn(item.changed && "font-medium text-primary")}>{item.next}</span> },
              ]}
            />
          </div>
        )
      ) : null}

      {step === 2 && data ? (
        <div className="space-y-2">
          <p className="text-[0.8125rem] text-muted-foreground">Real usage today against the new plan&apos;s limits. Nothing is deleted, removed or disconnected as a result of a plan change.</p>
          <MiniTable
            caption="Usage against the new plan"
            rows={data.rows.filter((item) => item.kind === "resource" && item.used !== null)}
            getKey={(item) => item.key}
            columns={[
              { id: "name", header: "Resource", cell: (item) => item.name },
              { id: "used", header: "In use", align: "right", cell: (item) => <span className="tabular">{item.used}</span> },
              { id: "next", header: "New limit", align: "right", cell: (item) => <span className="tabular">{item.next}</span> },
              { id: "status", header: "Status", cell: (item) => (item.over ? <span className="font-medium text-danger">Over new limit</span> : <span className="text-success">Within limit</span>) },
            ]}
          />
          {overLimit.length > 0 ? (
            <AlertBanner tone="warning" title={`${overLimit.length} resource${overLimit.length === 1 ? "" : "s"} above the new allowance`}>
              {data.policyNote}
              <span className="mt-2 flex items-start gap-2">
                <Checkbox id="ack-overlimit" checked={acknowledged} onCheckedChange={(value) => setAcknowledged(value === true)} className="mt-0.5" />
                <Label htmlFor="ack-overlimit" className="font-normal leading-snug">I understand the over-limit policy applies and the company will need to reduce usage or upgrade.</Label>
              </span>
              {fieldErrors.overLimit ? <span role="alert" className="mt-1 block text-danger">{fieldErrors.overLimit}</span> : null}
            </AlertBanner>
          ) : (
            <AlertBanner tone="success" title="Current usage fits the new plan">No resource exceeds the new allowance.</AlertBanner>
          )}
          {policy.data ? <p className="text-2xs text-muted-foreground">Over-limit policy: users - {policy.data.overLimit.users.replace(/_/g, " ")}, clients - {policy.data.overLimit.clients.replace(/_/g, " ")}, connections - {policy.data.overLimit.connectedAccounts.replace(/_/g, " ")}.</p> : null}
        </div>
      ) : null}

      {step === 3 ? (
        <div className="space-y-2">
          <RadioGroup value={effective} onValueChange={(value) => setEffective(value as Effective)} className="gap-1.5" aria-label="Effective date">
            {(
              [
                ["immediately", "Immediately", "The plan changes now. Prices and limits follow at once."],
                ["next_renewal", "At next renewal", `Scheduled for ${formatDate(row.status === "trialing" && row.trialEndsAt ? row.trialEndsAt : row.renewsAt)}. Nothing changes until then.`],
                ["custom_date", "On a custom date", "Choose a future date. A scheduled change is created; nothing changes until then."],
              ] as const
            ).map(([value, label, hint]) => (
              <div key={value} className="flex items-start gap-2.5 rounded-sm border border-border px-3 py-2">
                <RadioGroupItem value={value} id={`eff-${value}`} className="mt-0.5" />
                <Label htmlFor={`eff-${value}`} className="flex-1 cursor-pointer font-normal">
                  <span className="block text-[0.8125rem] font-medium text-foreground">{label}</span>
                  <span className="block text-2xs text-muted-foreground">{hint}</span>
                </Label>
              </div>
            ))}
          </RadioGroup>
          {effective === "custom_date" ? (
            <Field label="Effective date" htmlFor="change-date" error={dateInvalid ? "Choose a date after today." : fieldErrors.effectiveAt}>
              <Input id="change-date" type="date" min={tomorrow} value={customDate} onChange={(event) => setCustomDate(event.target.value)} className="w-48" aria-invalid={dateInvalid} />
            </Field>
          ) : null}
        </div>
      ) : null}

      {step === 4 && data ? (
        <div className="space-y-2">
          <dl className="divide-y divide-border rounded-sm border border-border px-3 text-[0.8125rem]">
            {[
              ["Company", row.company.name],
              ["Current plan", `${data.current.planName} · v${data.current.version} · ${data.current.cycle}`],
              ["New plan", `${data.next.planName} · v${data.next.version} · ${data.next.cycle}`],
              ["Current price", `${money(data.current.recurringMinor, data.current.currency)} / ${data.current.cycle === "annual" ? "year" : "month"}`],
              ["New price", `${money(data.next.recurringMinor, data.next.currency)} / ${data.next.cycle === "annual" ? "year" : "month"}`],
              ["Effective", effective === "immediately" ? "Immediately" : effective === "next_renewal" ? `At next renewal (${formatDate(row.renewsAt)})` : formatDate(customDate)],
              ["Entitlement changes", `${data.rows.filter((item) => item.changed).length} changed`],
              ["Usage conflicts", overLimit.length === 0 ? "None" : overLimit.map((item) => `${item.name} (${item.used} > ${item.nextLimit})`).join(", ")],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between gap-3 py-1.5"><dt className="text-muted-foreground">{label}</dt><dd className="max-w-md text-right text-foreground">{value}</dd></div>
            ))}
          </dl>
          <AlertBanner tone="info" title="Demo workspace">
            {effective === "immediately" ? "The change is applied to the shared demo records only. No payment is charged and no proration is calculated." : "A scheduled change record is created. Nothing is applied until its date, and no background job runs in this demo."}
          </AlertBanner>
          <Field label="Reason (optional)" htmlFor="change-reason" hint="Recorded in the subscription history.">
            <Textarea id="change-reason" rows={2} maxLength={300} value={reason} onChange={(event) => setReason(event.target.value)} />
          </Field>
          {nextChoice && !nextChoice.eligible ? <ErrorBanner message={nextChoice.reason} /> : null}
        </div>
      ) : null}
    </FlowDialog>
  );
}
