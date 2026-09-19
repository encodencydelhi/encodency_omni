"use client";

import { ArrowLeftIcon, ArrowRightIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AlertBanner } from "@/components/shared/alert-banner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ErrorBanner, FlowDialog, Stepper, SubmitButton } from "@/features/companies/components/flows/flow-kit";
import { Field } from "@/features/companies/components/primitives";
import { useCurrentStaff } from "@/features/companies/data/capability-provider";
import { isoDaysFromNow } from "@/features/companies/data/clock";
import { formatDate } from "@/lib/utils/format";
import { RESOURCES, formatLimitValue } from "../../data/catalogue";
import { describeError, usePlanMutations, useSubscription } from "../../data/hooks";
import type { ResourceKey, SubscriptionRow } from "../../data/types";

const OVERRIDABLE = RESOURCES.filter((item) => item.usageResource !== null);

export function OverrideFlow({ row, initialResource, onClose }: { row: SubscriptionRow; initialResource?: ResourceKey; onClose: () => void }) {
  const mutations = usePlanMutations();
  const staff = useCurrentStaff();
  const detail = useSubscription(row.id);
  const [step, setStep] = useState(0);
  const [resource, setResource] = useState<ResourceKey>(initialResource ?? "aiCredits");
  const [rule, setRule] = useState<"additive" | "absolute">("additive");
  const [value, setValue] = useState("");
  const [startsAt, setStartsAt] = useState(() => isoDaysFromNow(0).slice(0, 10));
  const [expiresAt, setExpiresAt] = useState(() => isoDaysFromNow(30).slice(0, 10));
  const [reason, setReason] = useState("");
  const [approvedBy, setApprovedBy] = useState(staff.name);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const def = OVERRIDABLE.find((item) => item.key === resource) ?? OVERRIDABLE[0];
  const entitlement = detail.data?.entitlements.find((item) => item.key === resource);
  const base = entitlement?.effective?.baseValue ?? null;
  const used = entitlement?.used ?? null;
  const number = Number(value);
  const validValue = Number.isInteger(number) && number > 0;
  const effectiveNow = !validValue ? null : rule === "additive" ? (base === null ? null : base + number) : number;
  const unlimitedBase = base === null && rule === "additive";
  const today = isoDaysFromNow(0).slice(0, 10);
  const datesValid = Boolean(startsAt && expiresAt) && expiresAt > startsAt && expiresAt > today;

  const errors: Record<string, string> = {
    ...(value && !validValue ? { value: "Enter a whole number above zero." } : {}),
    ...(!datesValid && startsAt && expiresAt ? { expiresAt: "The expiry must be after the start and in the future." } : {}),
    ...fieldErrors,
  };
  const step0Ready = validValue && datesValid && reason.trim().length > 0 && approvedBy.trim().length > 0;
  const overAfterExpiry = used !== null && base !== null && used > base;

  const submit = async () => {
    setPending(true);
    setError(null);
    setFieldErrors({});
    try {
      await mutations.grantOverride(row.id, {
        resource,
        rule,
        value: number,
        startsAt: new Date(`${startsAt}T00:00:00.000Z`).toISOString(),
        expiresAt: new Date(`${expiresAt}T00:00:00.000Z`).toISOString(),
        reason: reason.trim(),
        approvedBy: approvedBy.trim(),
      });
      toast.success(`${def?.name} override granted to ${row.company.name}`, { description: "The plan itself is unchanged. Effective limits, usage status and client eligibility now use it." });
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
      title="Apply entitlement override"
      description={`${row.company.name} · ${row.planName} (subscription ${row.id})`}
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={pending} className="mr-auto">Cancel</Button>
          {step === 1 ? <Button variant="outline" onClick={() => setStep(0)} disabled={pending}><ArrowLeftIcon />Back</Button> : null}
          {step === 0 ? (
            <Button onClick={() => setStep(1)} disabled={!step0Ready || detail.isPending}>Review<ArrowRightIcon /></Button>
          ) : (
            <SubmitButton pending={pending} onClick={() => void submit()}>Grant Override</SubmitButton>
          )}
        </>
      }
    >
      <Stepper steps={["Override", "Review"]} current={step} />
      <ErrorBanner message={error} />
      {step === 0 ? (
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Resource" htmlFor="override-resource" error={errors.resource}>
              <Select value={resource} onValueChange={(next) => setResource(next as ResourceKey)}>
                <SelectTrigger id="override-resource"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {OVERRIDABLE.map((item) => <SelectItem key={item.key} value={item.key}>{item.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <div className="grid grid-cols-2 gap-1">
              <div className="rounded-sm border border-border px-2.5 py-1.5"><p className="text-[11px] uppercase tracking-wide text-muted-foreground">Plan allowance</p><p className="text-[0.8125rem] font-medium text-foreground">{formatLimitValue(base, def?.unit)}</p></div>
              <div className="rounded-sm border border-border px-2.5 py-1.5"><p className="text-[11px] uppercase tracking-wide text-muted-foreground">In use now</p><p className="text-[0.8125rem] font-medium text-foreground">{used === null ? "-" : `${used} ${def?.unit ?? ""}`}</p></div>
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-[0.8125rem]">Override type</Label>
            <RadioGroup value={rule} onValueChange={(next) => setRule(next as "additive" | "absolute")} className="grid gap-1.5 sm:grid-cols-2">
              {(
                [
                  ["additive", "Add to the plan allowance", "The value is added on top of whatever the plan allows."],
                  ["absolute", "Replace the plan allowance", "The value becomes the limit, whatever the plan says."],
                ] as const
              ).map(([option, label, hint]) => (
                <div key={option} className="flex items-start gap-2.5 rounded-sm border border-border px-3 py-2">
                  <RadioGroupItem value={option} id={`override-${option}`} className="mt-0.5" />
                  <Label htmlFor={`override-${option}`} className="flex-1 cursor-pointer font-normal">
                    <span className="block text-[0.8125rem] font-medium text-foreground">{label}</span>
                    <span className="block text-2xs text-muted-foreground">{hint}</span>
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <Field label={rule === "additive" ? "Additional allowance" : "New limit"} htmlFor="override-value" required error={errors.value} hint={effectiveNow !== null ? `Effective allowance: ${formatLimitValue(effectiveNow, def?.unit)}` : unlimitedBase ? "The plan is unlimited, so it stays unlimited." : undefined}>
              <Input id="override-value" inputMode="numeric" value={value} onChange={(event) => setValue(event.target.value.replace(/\D/g, ""))} aria-invalid={Boolean(errors.value)} className="tabular" />
            </Field>
            <Field label="Starts" htmlFor="override-start" required error={errors.startsAt}>
              <Input id="override-start" type="date" value={startsAt} onChange={(event) => setStartsAt(event.target.value)} />
            </Field>
            <Field label="Expires" htmlFor="override-expiry" required error={errors.expiresAt}>
              <Input id="override-expiry" type="date" value={expiresAt} min={startsAt} onChange={(event) => setExpiresAt(event.target.value)} aria-invalid={Boolean(errors.expiresAt)} />
            </Field>
          </div>
          {unlimitedBase ? <AlertBanner tone="info" title="The plan allowance is unlimited">Adding to an unlimited allowance has no effect. Choose Replace to set a cap.</AlertBanner> : null}
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Reason" htmlFor="override-reason" required error={errors.reason}>
              <Textarea id="override-reason" rows={2} maxLength={300} value={reason} onChange={(event) => setReason(event.target.value)} />
            </Field>
            <Field label="Approved by" htmlFor="override-approver" required error={errors.approvedBy} hint="Who authorised this exception.">
              <Input id="override-approver" value={approvedBy} onChange={(event) => setApprovedBy(event.target.value)} />
            </Field>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <dl className="divide-y divide-border rounded-sm border border-border px-3 text-[0.8125rem]">
            {[
              ["Company", row.company.name],
              ["Resource", def?.name ?? resource],
              ["Rule", rule === "additive" ? `Add ${new Intl.NumberFormat("en-IN").format(number)} to the plan allowance` : `Replace the plan allowance with ${new Intl.NumberFormat("en-IN").format(number)}`],
              ["Plan allowance", formatLimitValue(base, def?.unit)],
              ["Effective allowance", formatLimitValue(effectiveNow, def?.unit)],
              ["Current usage", used === null ? "-" : `${used} ${def?.unit ?? ""}`],
              ["Period", `${formatDate(startsAt)} to ${formatDate(expiresAt)}`],
              ["Approved by", approvedBy],
              ["Reason", reason],
            ].map(([label, text]) => (
              <div key={label} className="flex justify-between gap-3 py-1.5"><dt className="text-muted-foreground">{label}</dt><dd className="max-w-md text-right text-foreground">{text}</dd></div>
            ))}
          </dl>
          <AlertBanner tone={overAfterExpiry ? "warning" : "info"} title="When it expires">
            The limit returns to {formatLimitValue(base, def?.unit)}.{overAfterExpiry ? ` Usage is already ${used}, above that, so ${row.company.name} would be over its limit after ${formatDate(expiresAt)} unless usage falls or the plan changes.` : " Current usage fits within it."}
          </AlertBanner>
          {resource === "Clients" ? <p className="text-2xs text-muted-foreground">Client creation eligibility for this company updates as soon as the override is granted.</p> : null}
        </div>
      )}
    </FlowDialog>
  );
}
