"use client";

import { ArrowLeftIcon, ArrowRightIcon, CircleCheckIcon, SearchIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { AlertBanner } from "@/components/shared/alert-banner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ErrorBanner, FlowDialog, Stepper, SubmitButton } from "@/features/companies/components/flows/flow-kit";
import { Field, KeyValue } from "@/features/companies/components/primitives";
import { companySectionHref } from "@/features/companies/data/config";
import { isValidEmail, isValidPhone, isValidWebsite } from "@/features/companies/lib/validation";
import { ORGANISATION_ROLE } from "@/types/domain/user";
import { cn } from "@/lib/utils/cn";
import { INDUSTRIES, LANGUAGES, SESSION_STORAGE_KEYS, TIMEZONES, clientHref } from "../data/config";
import { describeError, useClientMutations, useClientsList, useCreationCompanies, useEligibleMembers } from "../data/hooks";
import type { ClientCreationCompany, ClientSummary, CreateClientInput } from "../data/types";
import { ClientAvatar } from "./client-avatar";
import { LogoPicker } from "./logo-picker";

const STEPS = ["Parent company", "Client identity", "Defaults & team", "Review"];
const NONE = "__none__";

interface Draft {
  companyId: string;
  name: string;
  displayName: string;
  industry: string;
  website: string;
  contactEmail: string;
  contactPhone: string;
  description: string;
  logoDataUrl: string | null;
  timezone: string;
  language: string;
  memberIds: string[];
  leadUserId: string;
}

const EMPTY: Draft = {
  companyId: "",
  name: "",
  displayName: "",
  industry: "Other",
  website: "",
  contactEmail: "",
  contactPhone: "",
  description: "",
  logoDataUrl: null,
  timezone: "Asia/Kolkata",
  language: "English",
  memberIds: [],
  leadUserId: NONE,
};

function readDraft(): Draft | null {
  try {
    const raw = window.sessionStorage.getItem(SESSION_STORAGE_KEYS.createDraft);
    return raw ? ({ ...EMPTY, ...(JSON.parse(raw) as Partial<Draft>), logoDataUrl: null } as Draft) : null;
  } catch {
    return null;
  }
}

function writeDraft(draft: Draft | null): void {
  try {
    if (draft) window.sessionStorage.setItem(SESSION_STORAGE_KEYS.createDraft, JSON.stringify({ ...draft, logoDataUrl: null }));
    else window.sessionStorage.removeItem(SESSION_STORAGE_KEYS.createDraft);
  } catch {
    /* a draft is a convenience only */
  }
}

/* ------------------------------------------------------------------ */
/* Step 1 - parent company                                             */
/* ------------------------------------------------------------------ */

function EligibilityPanel({ company }: { company: ClientCreationCompany }) {
  const { eligibility } = company;
  const usage = company.clientLimit === null ? `${company.clientsUsed} clients (no limit)` : `${company.clientsUsed} of ${company.clientLimit} clients used`;

  return (
    <div className="space-y-2 rounded-sm border border-border bg-surface-sunken p-3" aria-live="polite">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[0.8125rem] font-semibold text-foreground">{company.name}</p>
        <Badge tone={eligibility.ok ? "success" : "danger"}>{eligibility.ok ? "Can add clients" : "Cannot add clients"}</Badge>
      </div>
      <dl className="grid grid-cols-2 gap-1 sm:grid-cols-4">
        {[
          ["Plan", company.planName],
          ["Clients", usage],
          ["Slots left", company.availableSlots === null ? "Unlimited" : String(company.availableSlots)],
          ["Eligible members", String(company.eligibleMembers)],
        ].map(([label, value]) => (
          <div key={label} className="rounded-sm border border-border bg-card px-2.5 py-1.5">
            <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</dt>
            <dd className="truncate text-[0.8125rem] font-medium text-foreground">{value}</dd>
          </div>
        ))}
      </dl>
      {!eligibility.ok ? (
        <AlertBanner tone="danger" title={eligibility.reason ?? "This company cannot receive new clients."}>
          <span className="block">Limits are never raised silently. Review the company&apos;s subscription or usage first.</span>
          <span className="mt-2 flex flex-wrap gap-1.5">
            <Button asChild variant="outline" size="sm">
              <Link href={companySectionHref(company.id, "subscription")}>Open Company Subscription</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href={companySectionHref(company.id, "usage")}>Review Usage &amp; Limits</Link>
            </Button>
          </span>
        </AlertBanner>
      ) : null}
    </div>
  );
}

function CompanyStep({ draft, update }: { draft: Draft; update: (patch: Partial<Draft>) => void }) {
  const companies = useCreationCompanies();
  const [term, setTerm] = useState("");
  const list = (companies.data ?? []).filter((company) => company.name.toLowerCase().includes(term.trim().toLowerCase()));
  const selected = (companies.data ?? []).find((company) => company.id === draft.companyId);

  return (
    <div className="space-y-3">
      <p className="text-[0.8125rem] text-muted-foreground">Every client belongs to exactly one company. The company cannot be changed afterwards.</p>
      <div className="relative">
        <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <Input value={term} onChange={(event) => setTerm(event.target.value)} placeholder="Search companies..." aria-label="Search companies" className="pl-8" />
      </div>
      {companies.error ? (
        <ErrorBanner message={describeError(companies.error).message} />
      ) : (
        <ul role="radiogroup" aria-label="Parent company" className="max-h-56 divide-y divide-border overflow-y-auto rounded-sm border border-border scrollbar-thin">
          {companies.isPending ? <li className="px-3 py-3 text-[0.8125rem] text-muted-foreground">Loading companies...</li> : null}
          {!companies.isPending && list.length === 0 ? <li className="px-3 py-3 text-[0.8125rem] text-muted-foreground">No company matches &quot;{term}&quot;.</li> : null}
          {list.map((company) => {
            const active = company.id === draft.companyId;
            return (
              <li key={company.id}>
                <button
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => update({ companyId: company.id, memberIds: [], leadUserId: NONE })}
                  className={cn("flex w-full items-center justify-between gap-3 px-3 py-2 text-left transition-colors hover:bg-accent/60", active && "bg-primary-subtle/60")}
                >
                  <span className="min-w-0">
                    <span className="block truncate text-[0.8125rem] font-medium text-foreground">{company.name}</span>
                    <span className="block truncate text-2xs text-muted-foreground">
                      {company.planName} · {company.clientsUsed}
                      {company.clientLimit === null ? "" : ` / ${company.clientLimit}`} clients
                    </span>
                  </span>
                  {!company.eligibility.ok ? <Badge tone="danger">Unavailable</Badge> : active ? <CircleCheckIcon className="size-4 text-primary" aria-hidden /> : null}
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {selected ? <EligibilityPanel company={selected} /> : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Step 2 - identity                                                   */
/* ------------------------------------------------------------------ */

function IdentityStep({ draft, update, errors }: { draft: Draft; update: (patch: Partial<Draft>) => void; errors: Record<string, string> }) {
  // Duplicates only matter inside one company: two companies can each have a "Northwind".
  const siblings = useClientsList({ company: draft.companyId, pageSize: 100 });
  const duplicate = draft.name.trim() && (siblings.data?.data ?? []).find((client) => client.client.name.trim().toLowerCase() === draft.name.trim().toLowerCase());

  return (
    <div className="space-y-3">
      <LogoPicker name={draft.name} value={draft.logoDataUrl} onChange={(logoDataUrl) => update({ logoDataUrl })} />
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Client name" htmlFor="create-name" required error={errors.name}>
          <Input id="create-name" value={draft.name} onChange={(event) => update({ name: event.target.value })} aria-invalid={Boolean(errors.name)} autoFocus />
        </Field>
        <Field label="Display name" htmlFor="create-display" hint="Shown in reports. Defaults to the client name.">
          <Input id="create-display" value={draft.displayName} onChange={(event) => update({ displayName: event.target.value })} />
        </Field>
        {duplicate ? (
          <div className="sm:col-span-2">
            <AlertBanner tone="warning" title="A client with this name already exists in this company">
              {duplicate.client.name} ({duplicate.displayId}) already belongs to the same company. You can still continue if this is a different brand.
            </AlertBanner>
          </div>
        ) : null}
        <Field label="Industry" htmlFor="create-industry">
          <Select value={draft.industry} onValueChange={(industry) => update({ industry })}>
            <SelectTrigger id="create-industry"><SelectValue /></SelectTrigger>
            <SelectContent>
              {INDUSTRIES.map((option) => (
                <SelectItem key={option} value={option}>{option}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Primary website" htmlFor="create-website" error={errors.website} hint="Optional. Some clients have no website.">
          <Input id="create-website" value={draft.website} onChange={(event) => update({ website: event.target.value })} placeholder="example.com" aria-invalid={Boolean(errors.website)} />
        </Field>
        <Field label="Contact email" htmlFor="create-email" error={errors.contactEmail}>
          <Input id="create-email" type="email" value={draft.contactEmail} onChange={(event) => update({ contactEmail: event.target.value })} aria-invalid={Boolean(errors.contactEmail)} />
        </Field>
        <Field label="Contact phone" htmlFor="create-phone" error={errors.contactPhone}>
          <Input id="create-phone" value={draft.contactPhone} onChange={(event) => update({ contactPhone: event.target.value })} aria-invalid={Boolean(errors.contactPhone)} />
        </Field>
        <Field label="Description" htmlFor="create-description" className="sm:col-span-2">
          <Textarea id="create-description" rows={2} maxLength={300} value={draft.description} onChange={(event) => update({ description: event.target.value })} />
        </Field>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Step 3 - defaults and team                                          */
/* ------------------------------------------------------------------ */

function TeamStep({ draft, update, errors }: { draft: Draft; update: (patch: Partial<Draft>) => void; errors: Record<string, string> }) {
  const members = useEligibleMembers(draft.companyId || null);
  const eligible = members.data ?? [];
  const chosen = eligible.filter((member) => draft.memberIds.includes(member.membershipId));

  const toggle = (id: string, on: boolean) => {
    const memberIds = on ? [...draft.memberIds, id] : draft.memberIds.filter((item) => item !== id);
    update({ memberIds, leadUserId: memberIds.includes(draft.leadUserId) ? draft.leadUserId : NONE });
  };

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Timezone" htmlFor="create-timezone">
          <Select value={draft.timezone} onValueChange={(timezone) => update({ timezone })}>
            <SelectTrigger id="create-timezone"><SelectValue /></SelectTrigger>
            <SelectContent>
              {TIMEZONES.map((option) => (
                <SelectItem key={option} value={option}>{option}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Language" htmlFor="create-language">
          <Select value={draft.language} onValueChange={(language) => update({ language })}>
            <SelectTrigger id="create-language"><SelectValue /></SelectTrigger>
            <SelectContent>
              {LANGUAGES.map((option) => (
                <SelectItem key={option} value={option}>{option}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>

      <div className="space-y-1.5">
        <p className="text-[0.8125rem] font-medium text-foreground">Assign team members <span className="font-normal text-muted-foreground">(optional)</span></p>
        <p className="text-2xs text-muted-foreground">Only people with an active membership in this company can be assigned. Assigning does not change their company role.</p>
        {errors.members ? <p role="alert" className="text-2xs text-danger">{errors.members}</p> : null}
        {members.isPending ? (
          <p className="rounded-sm border border-border px-3 py-3 text-[0.8125rem] text-muted-foreground">Loading members...</p>
        ) : eligible.length === 0 ? (
          <div className="flex flex-col items-start gap-2 rounded-sm border border-dashed border-border-strong px-3 py-4">
            <p className="text-[0.8125rem] text-foreground">This company has no members who can be assigned yet.</p>
            <p className="text-2xs text-muted-foreground">You can create the client now and assign people later from Team &amp; Access.</p>
            <Button asChild variant="outline" size="sm">
              <Link href={companySectionHref(draft.companyId, "users")}>Open Company Users</Link>
            </Button>
          </div>
        ) : (
          <ul className="max-h-48 divide-y divide-border overflow-y-auto rounded-sm border border-border scrollbar-thin">
            {eligible.map((member) => (
              <li key={member.membershipId} className="flex items-center gap-2.5 px-3 py-1.5">
                <Checkbox id={`create-member-${member.membershipId}`} checked={draft.memberIds.includes(member.membershipId)} onCheckedChange={(value) => toggle(member.membershipId, value === true)} />
                <label htmlFor={`create-member-${member.membershipId}`} className="min-w-0 flex-1 cursor-pointer">
                  <span className="block truncate text-[0.8125rem] font-medium text-foreground">{member.name}</span>
                  <span className="block truncate text-2xs text-muted-foreground">{member.email} · {ORGANISATION_ROLE[member.companyRole].label}</span>
                </label>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Field label="Client lead" htmlFor="create-lead" hint="Optional. Choose from the members assigned above; a lead is not required to create a client.">
        <Select value={draft.leadUserId} onValueChange={(leadUserId) => update({ leadUserId })} disabled={chosen.length === 0}>
          <SelectTrigger id="create-lead"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE}>No lead yet</SelectItem>
            {chosen.map((member) => (
              <SelectItem key={member.membershipId} value={member.membershipId}>{member.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Step 4 - review                                                     */
/* ------------------------------------------------------------------ */

function ReviewStep({ draft, company }: { draft: Draft; company: ClientCreationCompany | undefined }) {
  const members = useEligibleMembers(draft.companyId || null);
  const names = (members.data ?? []).filter((member) => draft.memberIds.includes(member.membershipId)).map((member) => member.name);
  const lead = (members.data ?? []).find((member) => member.membershipId === draft.leadUserId);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 rounded-sm border border-border p-3">
        <ClientAvatar name={draft.name} logo={draft.logoDataUrl} className="size-11" />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">{draft.name.trim()}</p>
          <p className="truncate text-2xs text-muted-foreground">{company?.name}</p>
        </div>
      </div>
      <dl className="divide-y divide-border rounded-sm border border-border px-3">
        <KeyValue label="Parent company">{company?.name}</KeyValue>
        <KeyValue label="Client slot">
          {company?.clientLimit === null || company?.clientLimit === undefined
            ? "No client limit on this plan"
            : `Uses ${company.clientsUsed + 1} of ${company.clientLimit} client slots`}
        </KeyValue>
        <KeyValue label="Industry">{draft.industry}</KeyValue>
        <KeyValue label="Primary website">{draft.website.trim() || <span className="text-muted-foreground">Not configured</span>}</KeyValue>
        <KeyValue label="Contact">{draft.contactEmail.trim() || draft.contactPhone.trim() || <span className="text-muted-foreground">None</span>}</KeyValue>
        <KeyValue label="Timezone / language">{draft.timezone} · {draft.language}</KeyValue>
        <KeyValue label="Team">{names.length === 0 ? <span className="text-muted-foreground">No members yet</span> : `${names.length} - ${names.join(", ")}`}</KeyValue>
        <KeyValue label="Client lead">{lead?.name ?? <span className="text-muted-foreground">Not assigned</span>}</KeyValue>
      </dl>
      <p className="text-2xs text-muted-foreground">
        The client starts as an Active workspace with onboarding In Progress. No channels are connected; connect them from the client&apos;s Channels section or the company&apos;s Integrations.
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Wizard                                                              */
/* ------------------------------------------------------------------ */

export function CreateClientWizard({ open, initialCompanyId, onClose }: { open: boolean; initialCompanyId?: string; onClose: () => void }) {
  if (!open) return null;
  return <WizardBody initialCompanyId={initialCompanyId} onClose={onClose} />;
}

function WizardBody({ initialCompanyId, onClose }: { initialCompanyId?: string; onClose: () => void }) {
  const router = useRouter();
  const mutations = useClientMutations();
  const companies = useCreationCompanies();
  const [draft, setDraft] = useState<Draft>(() => {
    const restored = typeof window === "undefined" ? null : readDraft();
    return { ...(restored ?? EMPTY), ...(initialCompanyId ? { companyId: initialCompanyId } : {}) };
  });
  const restored = useMemo(() => draft.name.trim().length > 0 && !initialCompanyId, []); // eslint-disable-line react-hooks/exhaustive-deps
  const [step, setStep] = useState(0);
  const [attempted, setAttempted] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [serverErrors, setServerErrors] = useState<Record<string, string>>({});
  const [created, setCreated] = useState<ClientSummary | null>(null);

  useEffect(() => {
    if (!created) writeDraft(draft);
  }, [created, draft]);

  const update = (patch: Partial<Draft>) => setDraft((current) => ({ ...current, ...patch }));
  const company = companies.data?.find((item) => item.id === draft.companyId);

  const errors: Record<string, string> = {};
  if (step >= 1) {
    if (!draft.name.trim()) errors.name = "Client name is required.";
    if (draft.website.trim() && !isValidWebsite(draft.website)) errors.website = "Enter a valid website, e.g. example.com.";
    if (draft.contactEmail.trim() && !isValidEmail(draft.contactEmail)) errors.contactEmail = "Enter a valid email address.";
    if (draft.contactPhone.trim() && !isValidPhone(draft.contactPhone)) errors.contactPhone = "Enter a valid phone number.";
  }
  const shown = { ...(attempted ? errors : {}), ...serverErrors };

  const blocked = step === 0 && (!company || !company.eligibility.ok);
  const identityInvalid = Boolean(errors.name || errors.website || errors.contactEmail || errors.contactPhone);

  const next = () => {
    if (step === 0) {
      if (blocked) return;
      setAttempted(false);
      setStep(1);
      return;
    }
    if (step === 1) {
      setAttempted(true);
      if (identityInvalid) return;
      setAttempted(false);
      setStep(2);
      return;
    }
    setStep((current) => Math.min(3, current + 1));
  };

  const discard = () => {
    writeDraft(null);
    onClose();
  };

  const submit = async () => {
    setPending(true);
    setError(null);
    setServerErrors({});
    const input: CreateClientInput = {
      companyId: draft.companyId,
      name: draft.name.trim(),
      displayName: draft.displayName.trim() || undefined,
      industry: draft.industry,
      website: draft.website.trim() || undefined,
      contactEmail: draft.contactEmail.trim() || undefined,
      contactPhone: draft.contactPhone.trim() || undefined,
      logoDataUrl: draft.logoDataUrl,
      description: draft.description.trim() || undefined,
      timezone: draft.timezone,
      language: draft.language,
      leadUserId: draft.leadUserId === NONE ? null : draft.leadUserId,
      memberIds: draft.memberIds,
    };
    try {
      const summary = await mutations.createClient(input);
      writeDraft(null);
      setCreated(summary);
      toast.success(`${summary.client.name} created`);
    } catch (failure) {
      const described = describeError(failure);
      setError(described.message);
      setServerErrors(described.fieldErrors);
      // Send the operator back to the step that holds the problem.
      if (described.fieldErrors.members) setStep(2);
      else if (Object.keys(described.fieldErrors).length > 0) setStep(1);
    } finally {
      setPending(false);
    }
  };

  const another = () => {
    setCreated(null);
    setDraft({ ...EMPTY, companyId: draft.companyId });
    setStep(1);
    setAttempted(false);
  };

  if (created) {
    return (
      <FlowDialog
        open
        onOpenChange={(open) => !open && onClose()}
        title="Client created"
        footer={
          <>
            <Button variant="ghost" onClick={onClose}>
              Back to Clients
            </Button>
            <Button variant="outline" onClick={another}>
              Create Another
            </Button>
            <Button onClick={() => router.push(clientHref(created.client.id))}>Open Client</Button>
          </>
        }
      >
        <div className="flex flex-col items-center gap-2 py-4 text-center">
          <span className="flex size-10 items-center justify-center rounded-sm bg-success-subtle text-success">
            <CircleCheckIcon className="size-5" aria-hidden />
          </span>
          <p className="text-sm font-semibold text-foreground">{created.client.name} is ready</p>
          <p className="max-w-sm text-[0.8125rem] text-muted-foreground">
            {created.displayId} was added to {created.company.name}. The client list, portfolio numbers and the company&apos;s client count already include it.
          </p>
        </div>
      </FlowDialog>
    );
  }

  return (
    <FlowDialog
      open
      onOpenChange={(open) => !open && !pending && discard()}
      title="Create client"
      description="Add a client workspace to a company."
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={discard} disabled={pending} className="mr-auto">
            Cancel
          </Button>
          {step > 0 ? (
            <Button variant="outline" onClick={() => { setAttempted(false); setStep(step - 1); }} disabled={pending}>
              <ArrowLeftIcon />
              Back
            </Button>
          ) : null}
          {step < 3 ? (
            <Button onClick={next} disabled={blocked}>
              Next
              <ArrowRightIcon />
            </Button>
          ) : (
            <SubmitButton pending={pending} onClick={() => void submit()}>
              Create Client
            </SubmitButton>
          )}
        </>
      }
    >
      <Stepper steps={STEPS} current={step} />
      {restored && step === 0 ? (
        <p className="text-2xs text-muted-foreground">Restored your unfinished draft from this session. <button type="button" className="underline" onClick={() => setDraft(EMPTY)}>Start over</button></p>
      ) : null}
      <ErrorBanner message={error} />
      {step === 0 ? <CompanyStep draft={draft} update={update} /> : null}
      {step === 1 ? <IdentityStep draft={draft} update={update} errors={shown} /> : null}
      {step === 2 ? <TeamStep draft={draft} update={update} errors={shown} /> : null}
      {step === 3 ? <ReviewStep draft={draft} company={company} /> : null}
    </FlowDialog>
  );
}
