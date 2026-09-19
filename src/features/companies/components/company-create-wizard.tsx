"use client";

import { ArrowLeftIcon, ArrowRightIcon, BuildingIcon, CheckCircle2Icon, InfoIcon, Loader2Icon, SaveIcon } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AlertBanner } from "@/components/shared/alert-banner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetBody, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { ROUTES } from "@/config/routes";
import { cn } from "@/lib/utils/cn";
import { formatCurrency } from "@/lib/utils/format";
import type { BillingCycle } from "@/types/domain/subscription";
import type { PlanTier } from "@/types/domain/plan";
import { isoDaysFromNow, nowIso } from "../data/clock";
import {
  COMPANY_SIZES,
  COUNTRIES,
  CURRENCIES,
  INDUSTRIES,
  LANGUAGES,
  OVERRIDABLE_RESOURCES,
  REGIONS,
  SESSION_STORAGE_KEYS,
  TIMEZONES,
  USAGE_RESOURCES,
  USAGE_RESOURCE_BY_KEY,
} from "../data/config";
import { describeError, useCompanyMutations, useDirectory, usePlans, usePlatformUserLookup } from "../data/hooks";
import { cyclePrice } from "../data/selectors";
import type { CompanySize, CompanySummary, CreateCompanyInput, UsageResource } from "../data/types";
import { useUnsavedGuard } from "../hooks/use-unsaved-guard";
import { formatLimit, toDateInput } from "../lib/format";
import { hostnameOf, isValidEmail, isValidPhone, isValidWebsite } from "../lib/validation";
import { ErrorBanner, Stepper } from "./flows/flow-kit";
import { Field, Panel } from "./primitives";
import { AccountStatusBadge, SubscriptionStatusBadge } from "./status-badges";

const STEPS = ["Company", "Owner", "Subscription", "Workspace", "Review"] as const;

interface WizardForm {
  name: string;
  legalName: string;
  website: string;
  industry: string;
  country: string;
  companySize: CompanySize | "";
  contactEmail: string;
  contactPhone: string;

  ownerName: string;
  ownerEmail: string;
  ownerPhone: string;
  existingUserId: string | null;

  planTier: PlanTier;
  billingCycle: BillingCycle;
  mode: "trial" | "paid";
  startDate: string;
  trialEndsAt: string;
  overrideEnabled: boolean;
  overrideResource: UsageResource;
  overrideLimit: string;
  overrideExpiry: string;
  overrideReason: string;
  internalNotes: string;

  timezone: string;
  currency: string;
  language: string;
  region: string;
  createClient: boolean;
  clientName: string;
  clientWebsite: string;
}

function initialForm(): WizardForm {
  return {
    name: "",
    legalName: "",
    website: "",
    industry: "Marketing Agency",
    country: "India",
    companySize: "",
    contactEmail: "",
    contactPhone: "",
    ownerName: "",
    ownerEmail: "",
    ownerPhone: "",
    existingUserId: null,
    planTier: "growth",
    billingCycle: "monthly",
    mode: "trial",
    startDate: toDateInput(nowIso()),
    trialEndsAt: "",
    overrideEnabled: false,
    overrideResource: "aiCredits",
    overrideLimit: "",
    overrideExpiry: toDateInput(isoDaysFromNow(30)),
    overrideReason: "",
    internalNotes: "",
    timezone: "Asia/Kolkata",
    currency: "INR",
    language: "English",
    region: "India (Mumbai)",
    createClient: false,
    clientName: "",
    clientWebsite: "",
  };
}

type Errors = Record<string, string>;

export function validateStep(step: number, form: WizardForm): Errors {
  const errors: Errors = {};
  if (step === 0) {
    if (!form.name.trim()) errors.name = "Company name is required.";
    if (form.website.trim() && !isValidWebsite(form.website)) errors.website = "Enter a valid website, e.g. example.com.";
    if (!form.country) errors.country = "Select a country.";
    if (form.contactEmail.trim() && !isValidEmail(form.contactEmail)) errors.contactEmail = "Enter a valid email address.";
    if (form.contactPhone.trim() && !isValidPhone(form.contactPhone)) errors.contactPhone = "Enter a valid phone number.";
  }
  if (step === 1) {
    if (!form.ownerName.trim()) errors.ownerName = "Owner name is required.";
    if (!form.ownerEmail.trim()) errors.ownerEmail = "Owner email is required.";
    else if (!isValidEmail(form.ownerEmail)) errors.ownerEmail = "Enter a valid email address.";
    if (form.ownerPhone.trim() && !isValidPhone(form.ownerPhone)) errors.ownerPhone = "Enter a valid phone number.";
  }
  if (step === 2) {
    if (!form.startDate) errors.startDate = "Choose a start date.";
    if (form.mode === "trial" && form.trialEndsAt && form.trialEndsAt <= form.startDate) errors.trialEndsAt = "The trial must end after it starts.";
    if (form.overrideEnabled) {
      if (!(Number(form.overrideLimit) > 0)) errors.overrideLimit = "Enter a limit above zero.";
      if (form.overrideReason.trim().length < 5) errors.overrideReason = "A reason is required.";
      if (form.overrideExpiry <= form.startDate) errors.overrideExpiry = "The expiry must be after the start.";
    }
  }
  if (step === 3) {
    if (form.createClient && !form.clientName.trim()) errors.clientName = "Enter the client name.";
    if (form.createClient && form.clientWebsite.trim() && !isValidWebsite(form.clientWebsite)) errors.clientWebsite = "Enter a valid URL.";
  }
  return errors;
}

function readDraft(): WizardForm | null {
  try {
    const raw = window.sessionStorage.getItem(SESSION_STORAGE_KEYS.createDraft);
    return raw ? ({ ...initialForm(), ...(JSON.parse(raw) as Partial<WizardForm>) }) : null;
  } catch {
    return null;
  }
}

function writeDraft(form: WizardForm | null): void {
  try {
    if (form) window.sessionStorage.setItem(SESSION_STORAGE_KEYS.createDraft, JSON.stringify(form));
    else window.sessionStorage.removeItem(SESSION_STORAGE_KEYS.createDraft);
  } catch {
    // Storage may be unavailable; drafts are a convenience.
  }
}

export function CreateCompanyWizard({ open, onClose }: { open: boolean; onClose: () => void }) {
  // Remount on each opening so state never leaks between sessions of the wizard.
  return open ? <WizardBody onClose={onClose} /> : null;
}

function WizardBody({ onClose }: { onClose: () => void }) {
  const mutations = useCompanyMutations();
  const plansQuery = usePlans();
  const directory = useDirectory();

  const [form, setForm] = useState<WizardForm>(initialForm);
  const [step, setStep] = useState(0);
  const [attempted, setAttempted] = useState<number[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [serverErrors, setServerErrors] = useState<Errors>({});
  const [created, setCreated] = useState<CompanySummary | null>(null);
  // The wizard only mounts in the browser (after a click), so reading storage on first render is safe.
  const [draft, setDraft] = useState<WizardForm | null>(readDraft);

  const update = (patch: Partial<WizardForm>) => setForm((current) => ({ ...current, ...patch }));

  const plans = plansQuery.data ?? [];
  const plan = plans.find((item) => item.tier === form.planTier);
  const effectiveTrialEnd = form.trialEndsAt || (plan ? toDateInput(new Date(Date.parse(form.startDate || nowIso()) + plan.trialDays * 86_400_000).toISOString()) : "");

  const dirty = useMemo(() => JSON.stringify(form) !== JSON.stringify(initialForm()), [form]) && !created;

  const stepErrors = (index: number) => validateStep(index, form);
  const allErrors = useMemo(() => STEPS.map((_, index) => validateStep(index, form)), [form]);
  const invalidSteps = allErrors.map((errors, index) => (Object.keys(errors).length > 0 ? index : -1)).filter((index) => index >= 0);

  const visibleErrors: Errors = { ...(attempted.includes(step) ? stepErrors(step) : {}), ...serverErrors };

  const duplicateName = form.name.trim() ? directory.data?.find((entry) => entry.name.toLowerCase() === form.name.trim().toLowerCase()) : undefined;
  const domain = isValidWebsite(form.website) ? hostnameOf(form.website) : null;
  const duplicateDomain = domain ? directory.data?.find((entry) => entry.domain?.toLowerCase() === domain) : undefined;

  const emailReady = isValidEmail(form.ownerEmail);
  const lookup = usePlatformUserLookup(form.ownerEmail.trim().toLowerCase(), emailReady);
  const matches = lookup.data ?? [];
  const chosenMatch = matches.find((match) => match.id === form.existingUserId);

  const saveDraft = () => {
    writeDraft(form);
    toast.success("Draft saved", { description: "Kept for this browser session only." });
  };

  const guard = useUnsavedGuard({
    dirty,
    onDiscard: onClose,
    onSave: async () => {
      writeDraft(form);
      toast.success("Draft saved", { description: "Resume it the next time you create a company." });
      return true;
    },
    label: "this new company",
  });

  const goNext = () => {
    setAttempted((current) => [...new Set([...current, step])]);
    if (Object.keys(stepErrors(step)).length > 0) return;
    setServerErrors({});
    setStep((current) => Math.min(STEPS.length - 1, current + 1));
  };

  const submit = async () => {
    if (invalidSteps.length > 0) {
      setAttempted(STEPS.map((_, index) => index));
      setStep(invalidSteps[0] ?? 0);
      return;
    }
    setPending(true);
    setError(null);
    setServerErrors({});

    const input: CreateCompanyInput = {
      name: form.name.trim(),
      legalName: form.legalName.trim() || undefined,
      website: form.website.trim() || undefined,
      industry: form.industry,
      country: form.country,
      companySize: form.companySize || undefined,
      contactEmail: form.contactEmail.trim() || undefined,
      contactPhone: form.contactPhone.trim() || undefined,
      owner: {
        name: form.ownerName.trim(),
        email: form.ownerEmail.trim(),
        phone: form.ownerPhone.trim() || undefined,
        existingUserId: form.existingUserId ?? undefined,
      },
      subscription: {
        planTier: form.planTier,
        billingCycle: form.billingCycle,
        mode: form.mode,
        startDate: form.startDate,
        trialEndsAt: form.mode === "trial" ? effectiveTrialEnd : undefined,
        limitOverride: form.overrideEnabled
          ? { resource: form.overrideResource, overrideLimit: Number(form.overrideLimit), expiresAt: form.overrideExpiry, reason: form.overrideReason.trim() }
          : undefined,
        internalNotes: form.internalNotes.trim() || undefined,
      },
      workspace: { timezone: form.timezone, currency: form.currency, language: form.language, region: form.region },
      initialClient: form.createClient ? { name: form.clientName.trim(), websiteUrl: form.clientWebsite.trim() || undefined } : undefined,
    };

    try {
      const summary = await mutations.createCompany(input);
      writeDraft(null);
      setCreated(summary);
    } catch (failure) {
      const described = describeError(failure);
      setError(described.message);
      setServerErrors(described.fieldErrors);
    } finally {
      setPending(false);
    }
  };

  const restart = () => {
    setForm(initialForm());
    setStep(0);
    setAttempted([]);
    setCreated(null);
    setError(null);
    setServerErrors({});
  };

  const input = (id: keyof WizardForm, label: string, opts: { required?: boolean; type?: string; placeholder?: string; hint?: string; maxLength?: number } = {}) => (
    <Field label={label} htmlFor={`wiz-${id}`} required={opts.required} hint={opts.hint} error={visibleErrors[id]}>
      <Input
        id={`wiz-${id}`}
        type={opts.type ?? "text"}
        value={String(form[id] ?? "")}
        onChange={(event) => update({ [id]: event.target.value } as Partial<WizardForm>)}
        placeholder={opts.placeholder}
        maxLength={opts.maxLength}
        aria-invalid={Boolean(visibleErrors[id])}
        aria-describedby={visibleErrors[id] ? `wiz-${id}-error` : undefined}
      />
    </Field>
  );

  const select = (id: keyof WizardForm, label: string, options: readonly string[], opts: { required?: boolean; allowEmpty?: boolean } = {}) => (
    <Field label={label} htmlFor={`wiz-${id}`} required={opts.required} error={visibleErrors[id]}>
      <Select value={String(form[id] || (opts.allowEmpty ? "__none__" : ""))} onValueChange={(value) => update({ [id]: value === "__none__" ? "" : value } as Partial<WizardForm>)}>
        <SelectTrigger id={`wiz-${id}`}>
          <SelectValue placeholder="Select" />
        </SelectTrigger>
        <SelectContent>
          {opts.allowEmpty ? <SelectItem value="__none__">Not specified</SelectItem> : null}
          {options.map((option) => (
            <SelectItem key={option} value={option}>
              {option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  );

  return (
    <>
      <Sheet open onOpenChange={(open) => !open && !pending && guard.requestClose()}>
        <SheetContent className="w-full max-w-none sm:max-w-3xl" showClose={!pending}>
          <SheetHeader className="gap-2">
            <SheetTitle>Create company</SheetTitle>
            <SheetDescription>Set up a new tenant on OmniPlatform. Nothing here contacts a real system in demo mode.</SheetDescription>
            {!created ? <Stepper steps={[...STEPS]} current={step} className="pt-1" /> : null}
          </SheetHeader>

          <SheetBody className="space-y-3">
            {created ? (
              <SuccessView summary={created} onCreateAnother={restart} onClose={onClose} />
            ) : (
              <>
                {draft && step === 0 && !dirty ? (
                  <AlertBanner
                    tone="info"
                    title="You have a saved draft"
                    action={
                      <div className="flex shrink-0 gap-1.5">
                        <Button size="sm" variant="outline" onClick={() => { writeDraft(null); setDraft(null); }}>
                          Discard draft
                        </Button>
                        <Button size="sm" onClick={() => { setForm(draft); setDraft(null); }}>
                          Resume
                        </Button>
                      </div>
                    }
                  >
                    Pick up where you left off.
                  </AlertBanner>
                ) : null}
                <ErrorBanner message={error} />

                {step === 0 ? (
                  <Panel title="Company information" description="Only the company name and country are required.">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="sm:col-span-2">{input("name", "Company name", { required: true, placeholder: "Acme Foods Pvt Ltd", maxLength: 80 })}</div>
                      {input("legalName", "Legal name", { placeholder: "As registered" })}
                      {input("website", "Website", { placeholder: "acme.com" })}
                      {select("industry", "Industry", INDUSTRIES)}
                      {select("country", "Country", COUNTRIES, { required: true })}
                      {select("companySize", "Company size", COMPANY_SIZES, { allowEmpty: true })}
                      {input("contactEmail", "Contact email", { type: "email", placeholder: "hello@acme.com" })}
                      {input("contactPhone", "Contact phone", { placeholder: "+91 98765 43210" })}
                    </div>
                    {duplicateName ? (
                      <AlertBanner tone="warning" title="A company with this name already exists" className="mt-3">
                        {duplicateName.name} is already on the platform.{" "}
                        <Link href={ROUTES.superAdmin.company(duplicateName.id)} className="font-medium text-foreground underline underline-offset-2" target="_blank">
                          Open it
                        </Link>{" "}
                        before creating a duplicate.
                      </AlertBanner>
                    ) : null}
                    {duplicateDomain && duplicateDomain.id !== duplicateName?.id ? (
                      <AlertBanner tone="warning" title="This website is already registered" className="mt-3">
                        {duplicateDomain.name} uses {domain}.
                      </AlertBanner>
                    ) : null}
                  </Panel>
                ) : null}

                {step === 1 ? (
                  <Panel title="Company owner" description="The owner administers the organisation and receives the invitation.">
                    <div className="grid gap-3 sm:grid-cols-2">
                      {input("ownerName", "Owner full name", { required: true })}
                      {input("ownerEmail", "Owner email", { required: true, type: "email", placeholder: "owner@acme.com" })}
                      {input("ownerPhone", "Phone (optional)")}
                    </div>

                    {emailReady && lookup.isPending ? <p className="mt-3 text-2xs text-muted-foreground">Checking whether this email already belongs to a platform user...</p> : null}

                    {matches.length > 0 ? (
                      <div className="mt-3 space-y-2 rounded-sm border border-warning/30 bg-warning-subtle/50 p-3">
                        <p className="text-[0.8125rem] font-medium text-foreground">This email belongs to an existing platform user</p>
                        <RadioGroup
                          value={form.existingUserId ?? "__new__"}
                          onValueChange={(value) => {
                            const match = matches.find((item) => item.id === value);
                            update({ existingUserId: match ? match.id : null, ownerName: match ? match.name : form.ownerName });
                          }}
                          className="grid gap-1.5"
                        >
                          {matches.map((match) => (
                            <Label key={match.id} className={cn("flex cursor-pointer items-start gap-2 rounded-sm border bg-card px-3 py-2 font-normal", form.existingUserId === match.id ? "border-primary/40" : "border-border")}>
                              <RadioGroupItem value={match.id} className="mt-0.5" />
                              <span>
                                Use {match.name} as the owner
                                <span className="block text-2xs text-muted-foreground">Currently {match.role} at {match.companyName}</span>
                              </span>
                            </Label>
                          ))}
                          <Label className={cn("flex cursor-pointer items-start gap-2 rounded-sm border bg-card px-3 py-2 font-normal", form.existingUserId === null ? "border-primary/40" : "border-border")}>
                            <RadioGroupItem value="__new__" className="mt-0.5" />
                            <span>
                              Invite a different person
                              <span className="block text-2xs text-muted-foreground">Change the email above.</span>
                            </span>
                          </Label>
                        </RadioGroup>
                        {chosenMatch ? (
                          <p className="text-2xs text-muted-foreground">
                            {chosenMatch.name} is already a member of {chosenMatch.companyName}. Membership of several organisations is enforced by the identity service.
                          </p>
                        ) : null}
                      </div>
                    ) : emailReady && !lookup.isPending ? (
                      <div className="mt-3 flex items-start gap-2 rounded-sm border border-border bg-surface-sunken p-3 text-[0.8125rem]">
                        <InfoIcon className="mt-0.5 size-4 shrink-0 text-info" aria-hidden />
                        <span>
                          <span className="font-medium text-foreground">New owner - invitation summary.</span>{" "}
                          <span className="text-muted-foreground">
                            A pending owner account is created for {form.ownerEmail.trim()} and an invitation is recorded. In demo mode no email is delivered.
                          </span>
                        </span>
                      </div>
                    ) : null}
                  </Panel>
                ) : null}

                {step === 2 ? (
                  <div className="space-y-3">
                    <Panel title="Plan" description="Prices and limits come from the plan catalogue.">
                      {plansQuery.isPending ? (
                        <p className="text-[0.8125rem] text-muted-foreground">Loading plans...</p>
                      ) : (
                        <div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-4">
                          {plans.map((item) => (
                            <button
                              key={item.tier}
                              type="button"
                              onClick={() => update({ planTier: item.tier })}
                              aria-pressed={form.planTier === item.tier}
                              className={cn("rounded-sm border px-3 py-2.5 text-left transition-colors", form.planTier === item.tier ? "border-primary bg-primary-subtle" : "border-border hover:bg-accent")}
                            >
                              <span className="block text-[0.8125rem] font-semibold text-foreground">{item.name}</span>
                              <span className="mt-0.5 block text-sm font-semibold tabular text-foreground">
                                {formatCurrency(cyclePrice(item, form.billingCycle), item.currency)}
                                <span className="text-2xs font-normal text-muted-foreground"> / {form.billingCycle === "annual" ? "yr" : "mo"}</span>
                              </span>
                              <span className="mt-0.5 block text-2xs text-muted-foreground">{item.trialDays}-day trial</span>
                            </button>
                          ))}
                        </div>
                      )}

                      <div className="mt-3 grid gap-3 sm:grid-cols-2">
                        <fieldset>
                          <legend className="mb-1.5 text-[0.8125rem] font-medium text-foreground">Billing cycle</legend>
                          <RadioGroup value={form.billingCycle} onValueChange={(value) => update({ billingCycle: value as BillingCycle })} className="grid grid-cols-2 gap-1.5">
                            {(["monthly", "annual"] as const).map((option) => (
                              <Label key={option} className={cn("flex cursor-pointer items-center gap-2 rounded-sm border px-3 py-2 font-normal capitalize", form.billingCycle === option ? "border-primary/40 bg-primary-subtle" : "border-border")}>
                                <RadioGroupItem value={option} />
                                {option}
                              </Label>
                            ))}
                          </RadioGroup>
                        </fieldset>
                        <fieldset>
                          <legend className="mb-1.5 text-[0.8125rem] font-medium text-foreground">Start as</legend>
                          <RadioGroup value={form.mode} onValueChange={(value) => update({ mode: value as WizardForm["mode"] })} className="grid grid-cols-2 gap-1.5">
                            {(["trial", "paid"] as const).map((option) => (
                              <Label key={option} className={cn("flex cursor-pointer items-center gap-2 rounded-sm border px-3 py-2 font-normal capitalize", form.mode === option ? "border-primary/40 bg-primary-subtle" : "border-border")}>
                                <RadioGroupItem value={option} />
                                {option}
                              </Label>
                            ))}
                          </RadioGroup>
                        </fieldset>
                        <Field label="Subscription start date" htmlFor="wiz-startDate" error={visibleErrors.startDate}>
                          <Input id="wiz-startDate" type="date" value={form.startDate} onChange={(event) => update({ startDate: event.target.value })} />
                        </Field>
                        {form.mode === "trial" ? (
                          <Field label="Trial end date" htmlFor="wiz-trialEndsAt" error={visibleErrors.trialEndsAt} hint={plan ? `Defaults to ${plan.trialDays} days from the start.` : undefined}>
                            <Input id="wiz-trialEndsAt" type="date" value={form.trialEndsAt || effectiveTrialEnd} min={form.startDate} onChange={(event) => update({ trialEndsAt: event.target.value })} />
                          </Field>
                        ) : null}
                      </div>
                    </Panel>

                    {plan ? (
                      <Panel title="Inherited limits" description={`Set by the ${plan.name} plan - not editable here.`}>
                        <dl className="grid grid-cols-2 gap-x-6 gap-y-1 text-[0.8125rem] sm:grid-cols-3">
                          {USAGE_RESOURCES.filter((def) => def.metric).map((def) => (
                            <div key={def.key} className="flex justify-between gap-2">
                              <dt className="text-muted-foreground">{def.label}</dt>
                              <dd className="tabular text-foreground">{formatLimit(def.metric ? plan.limits[def.metric] : null, def.key)}</dd>
                            </div>
                          ))}
                        </dl>
                      </Panel>
                    ) : null}

                    <Panel title="Optional">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-[0.8125rem] font-medium text-foreground">Temporary limit override</p>
                            <p className="text-2xs text-muted-foreground">A time-limited exception on top of the plan.</p>
                          </div>
                          <Switch checked={form.overrideEnabled} onCheckedChange={(value) => update({ overrideEnabled: value })} aria-label="Enable temporary limit override" />
                        </div>
                        {form.overrideEnabled ? (
                          <div className="grid gap-3 sm:grid-cols-2">
                            <Field label="Resource" htmlFor="wiz-overrideResource">
                              <Select value={form.overrideResource} onValueChange={(value) => update({ overrideResource: value as UsageResource })}>
                                <SelectTrigger id="wiz-overrideResource"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  {OVERRIDABLE_RESOURCES.map((key) => (
                                    <SelectItem key={key} value={key}>{USAGE_RESOURCE_BY_KEY[key].label}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </Field>
                            {input("overrideLimit", "Override limit", { type: "number" })}
                            <Field label="Expires" htmlFor="wiz-overrideExpiry" error={visibleErrors.overrideExpiry}>
                              <Input id="wiz-overrideExpiry" type="date" value={form.overrideExpiry} onChange={(event) => update({ overrideExpiry: event.target.value })} />
                            </Field>
                            {input("overrideReason", "Reason")}
                          </div>
                        ) : null}
                        <Field label="Internal notes" htmlFor="wiz-internalNotes" hint="Saved as a Super Admin-only note on the company.">
                          <Textarea id="wiz-internalNotes" value={form.internalNotes} onChange={(event) => update({ internalNotes: event.target.value })} className="min-h-16" />
                        </Field>
                      </div>
                    </Panel>
                  </div>
                ) : null}

                {step === 3 ? (
                  <div className="space-y-3">
                    <Panel title="Workspace defaults" description="Regional settings the organisation starts with. They can be changed later.">
                      <div className="grid gap-3 sm:grid-cols-2">
                        {select("timezone", "Timezone", TIMEZONES)}
                        {select("currency", "Currency", CURRENCIES)}
                        {select("language", "Language", LANGUAGES)}
                        {select("region", "Organisation region", REGIONS)}
                      </div>
                    </Panel>
                    <Panel title="Initial client" description="Optional. Creates the first brand so the owner lands in a ready workspace.">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-[0.8125rem] font-medium text-foreground">Create an initial client</p>
                          <Switch checked={form.createClient} onCheckedChange={(value) => update({ createClient: value })} aria-label="Create an initial client" />
                        </div>
                        {form.createClient ? (
                          <div className="grid gap-3 sm:grid-cols-2">
                            {input("clientName", "Client name", { required: true })}
                            {input("clientWebsite", "Client website (optional)", { placeholder: "brand.com" })}
                          </div>
                        ) : null}
                      </div>
                    </Panel>
                  </div>
                ) : null}

                {step === 4 ? (
                  <ReviewStep
                    form={form}
                    planName={plan?.name ?? form.planTier}
                    price={plan ? formatCurrency(cyclePrice(plan, form.billingCycle), plan.currency) : "-"}
                    trialEnd={effectiveTrialEnd}
                    invalidSteps={invalidSteps}
                    onJump={setStep}
                    ownerIsExisting={Boolean(chosenMatch)}
                  />
                ) : null}
              </>
            )}
          </SheetBody>

          {!created ? (
            <SheetFooter className="flex-wrap justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <Button variant="ghost" onClick={guard.requestClose} disabled={pending}>
                  Cancel
                </Button>
                <Button variant="ghost" onClick={saveDraft} disabled={pending || !dirty}>
                  <SaveIcon />
                  Save draft
                </Button>
              </div>
              <div className="flex items-center gap-1.5">
                {step > 0 ? (
                  <Button variant="outline" onClick={() => setStep(step - 1)} disabled={pending}>
                    <ArrowLeftIcon />
                    Back
                  </Button>
                ) : null}
                {step < STEPS.length - 1 ? (
                  <Button onClick={goNext}>
                    Continue
                    <ArrowRightIcon />
                  </Button>
                ) : (
                  <Button onClick={() => void submit()} disabled={pending || (plansQuery.isPending && !plan)}>
                    {pending ? <Loader2Icon className="animate-spin" /> : <BuildingIcon />}
                    Create company
                  </Button>
                )}
              </div>
            </SheetFooter>
          ) : null}
        </SheetContent>
      </Sheet>
      {guard.guardDialog}
    </>
  );
}

function ReviewStep({
  form,
  planName,
  price,
  trialEnd,
  invalidSteps,
  onJump,
  ownerIsExisting,
}: {
  form: WizardForm;
  planName: string;
  price: string;
  trialEnd: string;
  invalidSteps: number[];
  onJump: (step: number) => void;
  ownerIsExisting: boolean;
}) {
  const section = (title: string, step: number, rows: Array<[string, string]>) => (
    <Panel
      title={title}
      action={
        <Button variant="ghost" size="sm" onClick={() => onJump(step)}>
          Edit
        </Button>
      }
    >
      <dl className="grid gap-x-6 gap-y-1 sm:grid-cols-2">
        {rows.map(([label, value]) => (
          <div key={label} className="flex justify-between gap-3 text-[0.8125rem]">
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="min-w-0 truncate text-right text-foreground">{value || "-"}</dd>
          </div>
        ))}
      </dl>
    </Panel>
  );

  return (
    <div className="space-y-3">
      {invalidSteps.length > 0 ? (
        <AlertBanner tone="danger" title="Fix these before creating the company">
          {invalidSteps.map((index) => (
            <button key={index} type="button" className="mr-3 font-medium underline underline-offset-2" onClick={() => onJump(index)}>
              {STEPS[index]}
            </button>
          ))}
        </AlertBanner>
      ) : (
        <AlertBanner tone="success" title="Everything looks good">
          Review the details below, then create the company in the demo workspace.
        </AlertBanner>
      )}
      {section("Company information", 0, [
        ["Name", form.name],
        ["Legal name", form.legalName],
        ["Website", form.website],
        ["Industry", form.industry],
        ["Country", form.country],
        ["Contact", form.contactEmail || form.contactPhone],
      ])}
      {section("Owner", 1, [
        ["Name", form.ownerName],
        ["Email", form.ownerEmail],
        ["Type", ownerIsExisting ? "Existing platform user" : "New - invitation recorded (demo)"],
      ])}
      {section("Subscription", 2, [
        ["Plan", planName],
        ["Billing cycle", form.billingCycle],
        ["Price", price],
        ["Start", form.mode === "trial" ? `Trial from ${form.startDate}` : `Paid from ${form.startDate}`],
        ["Trial ends", form.mode === "trial" ? trialEnd : "-"],
        ["Limit override", form.overrideEnabled ? `${USAGE_RESOURCE_BY_KEY[form.overrideResource].label}: ${form.overrideLimit}` : "None"],
      ])}
      {section("Workspace defaults", 3, [
        ["Timezone", form.timezone],
        ["Currency", form.currency],
        ["Language", form.language],
        ["Region", form.region],
        ["Initial client", form.createClient ? form.clientName : "None"],
      ])}
    </div>
  );
}

function SuccessView({ summary, onCreateAnother, onClose }: { summary: CompanySummary; onCreateAnother: () => void; onClose: () => void }) {
  return (
    <div className="space-y-4 py-4 text-center">
      <span className="mx-auto flex size-12 items-center justify-center rounded-sm bg-success-subtle text-success">
        <CheckCircle2Icon className="size-6" aria-hidden />
      </span>
      <div className="space-y-1">
        <h2 className="text-base font-semibold text-foreground">Company created in demo workspace</h2>
        <p className="mx-auto max-w-md text-[0.8125rem] text-muted-foreground">
          {summary.company.name} ({summary.company.displayId}) now appears in the Companies list, the KPIs and Recent Signups. No real tenant was provisioned and no email was sent.
        </p>
      </div>
      <dl className="mx-auto grid max-w-md gap-1 text-left">
        <div className="flex items-center justify-between rounded-sm border border-border px-3 py-2 text-[0.8125rem]">
          <dt className="text-muted-foreground">Account</dt>
          <dd><AccountStatusBadge status={summary.company.accountStatus} /></dd>
        </div>
        <div className="flex items-center justify-between rounded-sm border border-border px-3 py-2 text-[0.8125rem]">
          <dt className="text-muted-foreground">Subscription</dt>
          <dd className="flex items-center gap-1.5">{summary.plan.name} <SubscriptionStatusBadge status={summary.subscriptionStatus} /></dd>
        </div>
        <div className="flex items-center justify-between rounded-sm border border-border px-3 py-2 text-[0.8125rem]">
          <dt className="text-muted-foreground">Owner</dt>
          <dd className="text-foreground">{summary.owner.name} <span className="text-muted-foreground">({summary.owner.state === "invited" ? "invitation pending" : summary.owner.state})</span></dd>
        </div>
      </dl>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <Button asChild>
          <Link href={ROUTES.superAdmin.company(summary.company.id)}>Open company</Link>
        </Button>
        <Button variant="outline" onClick={onCreateAnother}>
          Create another
        </Button>
        <Button variant="ghost" onClick={onClose}>
          Back to Companies
        </Button>
      </div>
    </div>
  );
}
