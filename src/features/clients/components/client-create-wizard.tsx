"use client";

import { ArrowLeftIcon, ArrowRightIcon, CircleCheckIcon, SearchIcon } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
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
import { INDUSTRIES, LANGUAGES, REPORTING_PERIODS, SESSION_STORAGE_KEYS, TIMEZONES, clientHref, resolveClientBasePath } from "../data/config";
import { describeError, useClientMutations, useClientsList, useCreationCompanies, useEligibleMembers } from "../data/hooks";
import type { ClientCreationCompany, ClientSummary, CreateClientInput } from "../data/types";
import { ClientAvatar } from "./client-avatar";
import { LogoPicker } from "./logo-picker";
import { clientsApi, describeClientLogoError } from "@/features/admin/projects/live/clients-api";
import { useAuth } from "@/features/auth/components/auth-provider";
import { getStoredCompanyId } from "@/lib/api/tenancy-storage";

const SUPER_ADMIN_STEPS = ["Parent company", "Client identity", "Defaults & team", "Review"];
const ADMIN_STEPS = ["Client identity", "Defaults & team", "Review"];
const NONE = "__none__";

interface Draft {
  companyId: string;
  name: string;
  displayName: string;
  industry: string;
  website: string;
  contactEmail: string;
  contactPhone: string;
  targetAudience: string;
  description: string;
  logoDataUrl: string | null;
  timezone: string;
  language: string;
  reportingPeriod: "7d" | "30d" | "90d";
  memberIds: string[];
  leadUserId: string;
}

const EMPTY: Draft = {
  companyId: "",
  name: "",
  displayName: "",
  industry: "Technology",
  website: "",
  contactEmail: "",
  contactPhone: "",
  targetAudience: "",
  description: "",
  logoDataUrl: null,
  timezone: "Asia/Kolkata",
  language: "English",
  reportingPeriod: "30d",
  memberIds: [],
  leadUserId: NONE,
};

function readDraft(): Draft | null {
  // Always return null so client form opens clean and completely empty as requested
  return null;
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

function IdentityStep({
  draft,
  update,
  errors,
  onFileSelect,
}: {
  draft: Draft;
  update: (patch: Partial<Draft>) => void;
  errors: Record<string, string>;
  onFileSelect: (file: File | null) => void;
}) {
  // Duplicates only matter inside one company: two companies can each have a "Northwind".
  const siblings = useClientsList({ company: draft.companyId, pageSize: 100 });
  const duplicate = draft.name.trim() && (siblings.data?.data ?? []).find((client) => client.client.name.trim().toLowerCase() === draft.name.trim().toLowerCase());

  return (
    <div className="space-y-3">
      <LogoPicker
        name={draft.name}
        value={draft.logoDataUrl}
        onChange={(logoDataUrl) => update({ logoDataUrl })}
        onFileSelect={onFileSelect}
      />
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
        <Field label="Primary website" htmlFor="create-website" error={errors.website} hint="Optional. E.g. https://example.com">
          <Input id="create-website" value={draft.website} onChange={(event) => update({ website: event.target.value })} placeholder="https://example.com" aria-invalid={Boolean(errors.website)} />
        </Field>
        <Field label="Contact email" htmlFor="create-email" error={errors.contactEmail}>
          <Input id="create-email" type="email" value={draft.contactEmail} onChange={(event) => update({ contactEmail: event.target.value })} placeholder="contact@example.com" aria-invalid={Boolean(errors.contactEmail)} />
        </Field>
        <Field label="Contact phone" htmlFor="create-phone" error={errors.contactPhone}>
          <Input id="create-phone" value={draft.contactPhone} onChange={(event) => update({ contactPhone: event.target.value })} placeholder="+91 9876543210" aria-invalid={Boolean(errors.contactPhone)} />
        </Field>
        <Field label="Target audience" htmlFor="create-target-audience" className="sm:col-span-2" hint="Key audience demographic, market segment or customer profile">
          <Input id="create-target-audience" value={draft.targetAudience} onChange={(event) => update({ targetAudience: event.target.value })} placeholder="e.g. B2B Enterprise, Tech Startups, Retail Consumers" />
        </Field>
        <Field label="Description & Notes" htmlFor="create-description" className="sm:col-span-2">
          <Textarea id="create-description" rows={3} maxLength={1000} value={draft.description} onChange={(event) => update({ description: event.target.value })} placeholder="Brief background, goals, or notes about the client..." />
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
      <div className="grid gap-3 sm:grid-cols-3">
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
        <Field label="Reporting timeframe" htmlFor="create-reporting-period" hint="Default reporting window">
          <Select value={draft.reportingPeriod} onValueChange={(reportingPeriod: "7d" | "30d" | "90d") => update({ reportingPeriod })}>
            <SelectTrigger id="create-reporting-period"><SelectValue /></SelectTrigger>
            <SelectContent>
              {REPORTING_PERIODS.map((option) => (
                <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
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
        <KeyValue label="Timezone / language">
          {draft.timezone} · {draft.language} ({REPORTING_PERIODS.find((r) => r.value === draft.reportingPeriod)?.label ?? draft.reportingPeriod})
        </KeyValue>
        {draft.targetAudience.trim() ? (
          <KeyValue label="Target audience">{draft.targetAudience.trim()}</KeyValue>
        ) : null}
        {draft.description.trim() ? (
          <KeyValue label="Description">{draft.description.trim()}</KeyValue>
        ) : null}
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
  const pathname = usePathname();
  const basePath = resolveClientBasePath(pathname);
  const mutations = useClientMutations();
  const companies = useCreationCompanies();
  const { user } = useAuth();

  const isSuperAdmin = pathname.startsWith("/super-admin");
  const steps = isSuperAdmin ? SUPER_ADMIN_STEPS : ADMIN_STEPS;
  const maxStep = isSuperAdmin ? 3 : 2;

  const adminCompany = useMemo(() => user?.memberships?.[0] ?? null, [user]);
  const defaultCompanyId = useMemo(() => {
    return (
      initialCompanyId ||
      adminCompany?.companyId ||
      getStoredCompanyId() ||
      ""
    );
  }, [initialCompanyId, adminCompany]);

  const [draft, setDraft] = useState<Draft>(() => {
    // Open clean and empty with admin's company bound by default
    if (typeof window !== "undefined") {
      try {
        window.sessionStorage.removeItem(SESSION_STORAGE_KEYS.createDraft);
      } catch {}
    }
    return { ...EMPTY, companyId: defaultCompanyId };
  });

  const [step, setStep] = useState(0);
  const [attempted, setAttempted] = useState(false);
  const [pending, setPending] = useState(false);
  const [pendingLogoFile, setPendingLogoFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [serverErrors, setServerErrors] = useState<Record<string, string>>({});
  const [created, setCreated] = useState<ClientSummary | null>(null);

  useEffect(() => {
    if (!created) writeDraft(draft);
  }, [created, draft]);

  // Auto-select company context if not selected yet
  useEffect(() => {
    if (!draft.companyId) {
      if (defaultCompanyId) {
        setDraft((prev) => ({ ...prev, companyId: defaultCompanyId }));
      } else if (companies.data && companies.data.length > 0) {
        const activeStored = typeof window !== "undefined" ? window.localStorage.getItem("omni_active_company") : null;
        const matched =
          companies.data.find((c) => c.id === activeStored && c.eligibility.ok) ||
          companies.data.find((c) => c.eligibility.ok) ||
          companies.data[0];
        if (matched) {
          setDraft((prev) => ({ ...prev, companyId: matched.id }));
        }
      }
    }
  }, [companies.data, defaultCompanyId, draft.companyId]);

  const update = (patch: Partial<Draft>) => setDraft((current) => ({ ...current, ...patch }));

  const company = useMemo(() => {
    const targetId = draft.companyId || defaultCompanyId;
    if (targetId && companies.data) {
      const found = companies.data.find((item) => item.id === targetId);
      if (found) return found;
    }
    if (adminCompany) {
      return {
        id: adminCompany.companyId,
        name: adminCompany.companyName,
        accountStatus: "active",
        planName: "Active Plan",
        clientsUsed: 0,
        clientLimit: null,
        availableSlots: null,
        eligibleMembers: 1,
        eligibility: { ok: true, code: "ok", reason: null },
      } as ClientCreationCompany;
    }
    return companies.data?.[0];
  }, [draft.companyId, defaultCompanyId, companies.data, adminCompany]);

  const isIdentityStep = isSuperAdmin ? step >= 1 : step >= 0;
  const errors: Record<string, string> = {};
  if (isIdentityStep) {
    const trimmedName = draft.name.trim().replace(/\s+/g, " ");
    if (!trimmedName) {
      errors.name = "Client name is required.";
    } else if (trimmedName.length < 3) {
      errors.name = "Client name must be at least 3 characters.";
    }
    if (draft.website.trim() && !isValidWebsite(draft.website)) errors.website = "Enter a valid website, e.g. example.com.";
    if (draft.contactEmail.trim() && !isValidEmail(draft.contactEmail)) errors.contactEmail = "Enter a valid email address.";
    if (draft.contactPhone.trim() && !isValidPhone(draft.contactPhone)) errors.contactPhone = "Enter a valid phone number.";
  }
  const shown = { ...(attempted ? errors : {}), ...serverErrors };

  const blocked = isSuperAdmin && step === 0 && (!company || !company.eligibility.ok);
  const identityInvalid = Boolean(errors.name || errors.website || errors.contactEmail || errors.contactPhone);

  const next = () => {
    if (isSuperAdmin) {
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
      setStep((current) => Math.min(maxStep, current + 1));
    } else {
      // Admin Flow:
      // step 0: Identity
      // step 1: Defaults & Team
      // step 2: Review
      if (step === 0) {
        setAttempted(true);
        if (identityInvalid) return;
        setAttempted(false);
        setStep(1);
        return;
      }
      setStep((current) => Math.min(maxStep, current + 1));
    }
  };

  const discard = () => {
    writeDraft(null);
    setPendingLogoFile(null);
    onClose();
  };

  const submit = async () => {
    const normalizedName = draft.name.trim().replace(/\s+/g, " ");
    if (!normalizedName || normalizedName.length < 3) {
      setStep(isSuperAdmin ? 1 : 0);
      setAttempted(true);
      return;
    }

    setPending(true);
    setError(null);
    setServerErrors({});
    const effectiveCompanyId = draft.companyId || defaultCompanyId || company?.id || "";
    const input: CreateClientInput = {
      companyId: effectiveCompanyId,
      name: normalizedName,
      displayName: draft.displayName.trim().replace(/\s+/g, " ") || undefined,
      industry: draft.industry,
      website: draft.website.trim() || undefined,
      contactEmail: draft.contactEmail.trim() || undefined,
      contactPhone: draft.contactPhone.trim() || undefined,
      // IMAGE-01 Phase 3: POST /clients remains JSON-only; do NOT send logoDataUrl or file
      logoDataUrl: null,
      description: draft.description.trim() || undefined,
      targetAudience: draft.targetAudience.trim() || draft.description.trim() || undefined,
      timezone: draft.timezone,
      language: draft.language,
      reportingPeriod: draft.reportingPeriod,
      leadMembershipId: draft.leadUserId === NONE ? null : draft.leadUserId,
      membershipIds: draft.memberIds,
      leadUserId: draft.leadUserId === NONE ? null : draft.leadUserId,
      memberIds: draft.memberIds,
    };
    try {
      // Step 1 & 2: Create client first and receive created Client ID
      let summary = await mutations.createClient(input);

      // Step 3: If user selected a logo, upload it to PUT /api/v1/clients/:id/logo
      if (pendingLogoFile && summary?.client?.id) {
        try {
          const uploadRes = await clientsApi.uploadLogo(
            summary.company.id || draft.companyId,
            summary.client.id,
            pendingLogoFile,
          );
          if (uploadRes?.logo) {
            summary = {
              ...summary,
              client: { ...summary.client, logo: uploadRes.logo },
              profile: {
                ...summary.profile,
                logo: uploadRes.logo,
                logoDataUrl: uploadRes.logo.url,
              },
            };
          }
        } catch (uploadErr) {
          toast.error("Client created, but logo upload failed", {
            description: describeClientLogoError(uploadErr),
          });
        }
      }

      writeDraft(null);
      setPendingLogoFile(null);
      setCreated(summary);
      toast.success(`${summary.client.name} created`);
    } catch (failure) {
      const described = describeError(failure);
      setError(described.message);
      setServerErrors(described.fieldErrors);
      toast.error("Failed to create client", {
        description: described.message,
      });
      // Send the operator back to the step that holds the problem.
      if (described.fieldErrors.members) setStep(isSuperAdmin ? 2 : 1);
      else if (Object.keys(described.fieldErrors).length > 0) setStep(isSuperAdmin ? 1 : 0);
    } finally {
      setPending(false);
    }
  };

  const another = () => {
    setCreated(null);
    setPendingLogoFile(null);
    setDraft({ ...EMPTY, companyId: defaultCompanyId });
    setStep(0);
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
            <Button onClick={() => router.push(clientHref(created.client.id, basePath))}>Open Client</Button>
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
      title="Add Client"
      description="Add a new client workspace to an organization."
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={discard} disabled={pending} className="mr-auto">
            Cancel
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setDraft({ ...EMPTY, companyId: defaultCompanyId })}
            disabled={pending}
            type="button"
            className="text-muted-foreground hover:text-foreground text-xs"
          >
            Clear Form
          </Button>
          {step > 0 ? (
            <Button variant="outline" onClick={() => { setAttempted(false); setStep(step - 1); }} disabled={pending}>
              <ArrowLeftIcon />
              Back
            </Button>
          ) : null}
          {step < maxStep ? (
            <Button onClick={next} disabled={blocked || pending}>
              Next
              <ArrowRightIcon />
            </Button>
          ) : (
            <SubmitButton pending={pending} disabled={pending} onClick={() => void submit()}>
              {pending ? "Saving..." : "Create Client"}
            </SubmitButton>
          )}
        </>
      }
    >
      <Stepper steps={steps} current={step} />
      {!isSuperAdmin && (company?.name || adminCompany?.companyName) ? (
        <div className="flex items-center justify-between rounded-sm border border-border/80 bg-surface-sunken px-3 py-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Creating for Organization:</span>
            <span className="font-semibold text-foreground">{company?.name || adminCompany?.companyName}</span>
          </div>
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-2xs font-medium text-primary">Company Workspace</span>
        </div>
      ) : null}
      <ErrorBanner message={error} />
      {isSuperAdmin ? (
        <>
          {step === 0 ? <CompanyStep draft={draft} update={update} /> : null}
          {step === 1 ? <IdentityStep draft={draft} update={update} errors={shown} onFileSelect={setPendingLogoFile} /> : null}
          {step === 2 ? <TeamStep draft={draft} update={update} errors={shown} /> : null}
          {step === 3 ? <ReviewStep draft={draft} company={company} /> : null}
        </>
      ) : (
        <>
          {step === 0 ? <IdentityStep draft={draft} update={update} errors={shown} onFileSelect={setPendingLogoFile} /> : null}
          {step === 1 ? <TeamStep draft={draft} update={update} errors={shown} /> : null}
          {step === 2 ? <ReviewStep draft={draft} company={company} /> : null}
        </>
      )}
    </FlowDialog>
  );
}
