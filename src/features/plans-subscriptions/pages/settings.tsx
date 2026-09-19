"use client";

import { Loader2Icon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { AlertBanner } from "@/components/shared/alert-banner";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ErrorBanner } from "@/features/companies/components/flows/flow-kit";
import { Field, Panel } from "@/features/companies/components/primitives";
import { useUnsavedGuard } from "@/features/companies/hooks/use-unsaved-guard";
import { PanelSkeleton } from "@/features/companies/components/states";
import { DemoTag } from "../components/badges";
import { PlansError } from "../components/states";
import { FAILED_PAYMENT_HANDLING, OVER_LIMIT_POLICY, OVER_LIMIT_RESOURCES, PLANS_MOCK_MODE, routes } from "../data/config";
import { describeError, usePlanMutations, usePlans, usePolicy, useSubscriptionCapabilities } from "../data/hooks";
import { parseDays, validatePolicy } from "../data/policies";
import type { FailedPaymentHandling, OverLimitPolicy, OverLimitResource, SubscriptionPolicy } from "../data/types";

const KIND_HINT = "Values here apply to the whole platform's subscriptions in this demo workspace.";

function SettingsForm({ initial, canEdit }: { initial: SubscriptionPolicy; canEdit: boolean }) {
  const router = useRouter();
  const mutations = usePlanMutations();
  const plans = usePlans({});
  const [value, setValue] = useState<SubscriptionPolicy>(initial);
  const [trialReminders, setTrialReminders] = useState(initial.trial.reminderDays.join(", "));
  const [renewalReminders, setRenewalReminders] = useState(initial.renewal.reminderDays.join(", "));
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [serverErrors, setServerErrors] = useState<Record<string, string>>({});
  const [attempted, setAttempted] = useState(false);
  const leaveTo = useRef<string | null>(null);

  const draft: SubscriptionPolicy = useMemo(
    () => ({ ...value, trial: { ...value.trial, reminderDays: parseDays(trialReminders) }, renewal: { ...value.renewal, reminderDays: parseDays(renewalReminders) } }),
    [value, trialReminders, renewalReminders],
  );
  const dirty = JSON.stringify(draft) !== JSON.stringify(initial);
  const clientErrors = useMemo(() => validatePolicy(draft), [draft]);
  const errors = { ...(attempted || dirty ? clientErrors : {}), ...serverErrors };
  const hasErrors = Object.keys(clientErrors).length > 0;

  const save = async (): Promise<boolean> => {
    setAttempted(true);
    if (hasErrors) return false;
    setPending(true);
    setError(null);
    setServerErrors({});
    try {
      await mutations.savePolicy(draft);
      toast.success("Subscription policies saved", { description: "Trial extensions, cancellation defaults and reactivation now follow them." });
      return true;
    } catch (failure) {
      const described = describeError(failure);
      setError(described.message);
      setServerErrors(described.fieldErrors);
      return false;
    } finally {
      setPending(false);
    }
  };

  const discard = () => {
    setValue(initial);
    setTrialReminders(initial.trial.reminderDays.join(", "));
    setRenewalReminders(initial.renewal.reminderDays.join(", "));
    setServerErrors({});
    setError(null);
  };

  const guard = useUnsavedGuard({ dirty, onDiscard: () => router.push(leaveTo.current ?? routes.overview), onSave: save, label: "the subscription policies" });

  // In-app links are not intercepted by the browser, so ask before following one while there are unsaved changes.
  useEffect(() => {
    if (!dirty) return;
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
      const anchor = (event.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!anchor || anchor.target === "_blank" || anchor.origin !== window.location.origin) return;
      if (anchor.pathname === window.location.pathname) return;
      event.preventDefault();
      event.stopPropagation();
      leaveTo.current = anchor.pathname + anchor.search;
      guard.requestClose();
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [dirty, guard]);

  const set = <K extends keyof SubscriptionPolicy>(key: K, patch: Partial<SubscriptionPolicy[K]>) => setValue((current) => ({ ...current, [key]: { ...current[key], ...patch } }));
  const number = (text: string) => Number(text.replace(/\D/g, "") || 0);
  const published = (plans.data?.summaries ?? []).filter((item) => item.plan.status === "published");
  const disabled = !canEdit || pending;

  return (
    <div className="space-y-2">
      <ErrorBanner message={error} />
      {!canEdit ? <AlertBanner tone="info" title="View only">You can see these policies but not change them.</AlertBanner> : null}

      <div className="grid grid-cols-1 gap-1 lg:grid-cols-2">
        <Panel title="Trial policy" description="How trials start and how far they can be extended">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Default trial duration (days)" htmlFor="pol-trial-days" error={errors.defaultTrialDays}>
              <Input id="pol-trial-days" inputMode="numeric" disabled={disabled} value={String(value.trial.defaultTrialDays)} onChange={(event) => set("trial", { defaultTrialDays: number(event.target.value) })} aria-invalid={Boolean(errors.defaultTrialDays)} className="tabular" />
            </Field>
            <Field label="Extension limit (total days)" htmlFor="pol-ext-days" error={errors.extensionLimitDays} hint="Across all extensions of one trial.">
              <Input id="pol-ext-days" inputMode="numeric" disabled={disabled} value={String(value.trial.extensionLimitDays)} onChange={(event) => set("trial", { extensionLimitDays: number(event.target.value) })} aria-invalid={Boolean(errors.extensionLimitDays)} className="tabular" />
            </Field>
            <Field label="Expiry reminders (days before)" htmlFor="pol-trial-rem" error={errors.trialReminders} hint="e.g. 7, 3, 1. Recorded as policy; nothing is sent in this demo.">
              <Input id="pol-trial-rem" disabled={disabled} value={trialReminders} onChange={(event) => setTrialReminders(event.target.value)} aria-invalid={Boolean(errors.trialReminders)} />
            </Field>
            <div className="flex items-center justify-between gap-3 rounded-sm border border-border px-3 py-2">
              <Label htmlFor="pol-nopay" className="text-[0.8125rem] font-normal">Allow a trial without a payment method</Label>
              <Switch id="pol-nopay" disabled={disabled} checked={value.trial.allowWithoutPaymentMethod} onCheckedChange={(checked) => set("trial", { allowWithoutPaymentMethod: checked })} />
            </div>
          </div>
        </Panel>

        <Panel title="Default subscription options" description="What a new subscription starts with">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Default trial plan" htmlFor="pol-trial-plan" error={errors.defaultTrialPlan}>
              <Select value={value.trial.defaultTrialPlan} onValueChange={(next) => set("trial", { defaultTrialPlan: next })} disabled={disabled}>
                <SelectTrigger id="pol-trial-plan"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[...new Set([value.trial.defaultTrialPlan, ...published.map((item) => item.plan.key)])].map((key) => (
                    <SelectItem key={key} value={key}>{plans.data?.summaries.find((item) => item.plan.key === key)?.plan.name ?? key}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Default billing cycle" htmlFor="pol-cycle">
              <Select value={value.renewal.defaultBillingCycle} onValueChange={(next) => set("renewal", { defaultBillingCycle: next as "monthly" | "annual" })} disabled={disabled}>
                <SelectTrigger id="pol-cycle"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="annual">Annual</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>
          <p className="mt-2 text-2xs text-muted-foreground">{KIND_HINT}</p>
        </Panel>

        <Panel title="Renewal policy" description="Reminders, grace and what a failed payment does">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Renewal reminders (days before)" htmlFor="pol-ren-rem" error={errors.renewalReminders} hint="e.g. 14, 7.">
              <Input id="pol-ren-rem" disabled={disabled} value={renewalReminders} onChange={(event) => setRenewalReminders(event.target.value)} aria-invalid={Boolean(errors.renewalReminders)} />
            </Field>
            <Field label="Grace period (days)" htmlFor="pol-grace" error={errors.gracePeriodDays} hint="Reference for failed payments. Nothing runs automatically.">
              <Input id="pol-grace" inputMode="numeric" disabled={disabled} value={String(value.renewal.gracePeriodDays)} onChange={(event) => set("renewal", { gracePeriodDays: number(event.target.value) })} aria-invalid={Boolean(errors.gracePeriodDays)} className="tabular" />
            </Field>
            <Field label="Failed payment handling" htmlFor="pol-failed" className="sm:col-span-2" hint={FAILED_PAYMENT_HANDLING[value.renewal.failedPaymentHandling].description}>
              <Select value={value.renewal.failedPaymentHandling} onValueChange={(next) => set("renewal", { failedPaymentHandling: next as FailedPaymentHandling })} disabled={disabled}>
                <SelectTrigger id="pol-failed"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(FAILED_PAYMENT_HANDLING) as FailedPaymentHandling[]).map((key) => <SelectItem key={key} value={key}>{FAILED_PAYMENT_HANDLING[key].label}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
          </div>
          <p className="mt-2 text-2xs text-muted-foreground">Payment gateway settings and secrets are not managed here.</p>
        </Panel>

        <Panel title="Cancellation policy" description="When a cancellation takes effect, and how long a company can come back">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Default cancellation timing" htmlFor="pol-timing" hint={value.cancellation.defaultTiming === "end_of_term" ? "Access continues to the end of the paid term." : "Access ends the day it is cancelled."}>
              <Select value={value.cancellation.defaultTiming} onValueChange={(next) => set("cancellation", { defaultTiming: next as "end_of_term" | "immediate" })} disabled={disabled}>
                <SelectTrigger id="pol-timing"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="end_of_term">End of term</SelectItem>
                  <SelectItem value="immediate">Immediately</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Reactivation window (days)" htmlFor="pol-window" error={errors.reactivationWindowDays} hint="How long after ending a subscription can be reactivated.">
              <Input id="pol-window" inputMode="numeric" disabled={disabled} value={String(value.cancellation.reactivationWindowDays)} onChange={(event) => set("cancellation", { reactivationWindowDays: number(event.target.value) })} aria-invalid={Boolean(errors.reactivationWindowDays)} className="tabular" />
            </Field>
          </div>
          <p className="mt-2 text-2xs text-muted-foreground">Cancelling does not delete data or suspend the company account. Retention is not promised here.</p>
        </Panel>

        <Panel title="Over-limit policy" description="What happens when a company is above an effective limit" className="lg:col-span-2">
          <ul className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
            {OVER_LIMIT_RESOURCES.map((resource) => (
              <li key={resource.key} className="py-2">
                <Field label={resource.label} htmlFor={`pol-over-${resource.key}`} hint={OVER_LIMIT_POLICY[value.overLimit[resource.key]].description}>
                  <Select value={value.overLimit[resource.key]} onValueChange={(next) => set("overLimit", { [resource.key]: next as OverLimitPolicy } as Partial<Record<OverLimitResource, OverLimitPolicy>>)} disabled={disabled}>
                    <SelectTrigger id={`pol-over-${resource.key}`}><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {resource.options.map((option) => <SelectItem key={option} value={option}>{OVER_LIMIT_POLICY[option].label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Field>
              </li>
            ))}
          </ul>
          <p className="text-2xs text-muted-foreground">No option deletes clients, removes users or disconnects accounts. Enforcement belongs to the backend; this records the intended policy.</p>
        </Panel>
      </div>

      {dirty ? (
        <div className="sticky bottom-0 z-10 flex flex-wrap items-center gap-2 rounded-sm border border-primary/30 bg-card px-3 py-2 shadow-md" role="region" aria-label="Unsaved changes">
          <p className="text-[0.8125rem] font-medium text-foreground">You have unsaved changes</p>
          {hasErrors ? <p className="text-2xs text-danger">Fix the highlighted fields to save.</p> : null}
          <div className="ml-auto flex gap-2">
            <Button variant="outline" onClick={discard} disabled={pending}>Discard</Button>
            <Button onClick={() => void save()} disabled={pending || hasErrors}>
              {pending ? <Loader2Icon className="animate-spin" /> : null}
              Save Changes
            </Button>
          </div>
        </div>
      ) : null}
      {guard.guardDialog}
    </div>
  );
}

export function SettingsPage() {
  const capabilities = useSubscriptionCapabilities();
  const policy = usePolicy();

  return (
    <div className="space-y-3">
      <PageHeader
        title="Subscription Settings"
        description="Policies for trials, renewals, cancellations and over-limit handling. Payment gateway settings are managed elsewhere."
        meta={PLANS_MOCK_MODE ? <DemoTag>Demo policy</DemoTag> : undefined}
      />
      {policy.error && !policy.data ? (
        <PlansError subject="Settings" error={policy.error} onRetry={() => void policy.refetch()} />
      ) : !policy.data ? (
        <div className="grid grid-cols-1 gap-1 lg:grid-cols-2">{Array.from({ length: 4 }, (_, index) => <PanelSkeleton key={index} rows={4} />)}</div>
      ) : (
        // Remount when the saved policy changes so the form resets to what was saved.
        <SettingsForm key={JSON.stringify(policy.data)} initial={policy.data} canEdit={capabilities.canManageSubscriptionPolicies} />
      )}
    </div>
  );
}
