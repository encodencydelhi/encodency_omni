"use client";

import { Loader2Icon } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetBody, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { ErrorBanner } from "@/features/companies/components/flows/flow-kit";
import { Field, Panel } from "@/features/companies/components/primitives";
import { useUnsavedGuard } from "@/features/companies/hooks/use-unsaved-guard";
import { isValidEmail, isValidPhone, isValidWebsite } from "@/features/companies/lib/validation";
import { ROUTES } from "@/config/routes";
import { INDUSTRIES, LANGUAGES, REPORTING_PERIODS, TIMEZONES } from "../data/config";
import { describeError, useClientMutations, useClientTeam } from "../data/hooks";
import type { ClientSummary, ReportingPeriod, UpdateClientInput } from "../data/types";
import { LogoPicker } from "./logo-picker";

const NONE = "__none__";

interface EditForm {
  name: string;
  displayName: string;
  industry: string;
  description: string;
  contactEmail: string;
  contactPhone: string;
  logoDataUrl: string | null;
  timezone: string;
  language: string;
  reportingPeriod: ReportingPeriod;
  leadUserId: string;
  primaryWebsite: string;
}

function toForm(summary: ClientSummary): EditForm {
  const { profile, primaryWebsite, lead } = summary;
  return {
    name: summary.client.name,
    displayName: profile.displayName,
    industry: profile.industry,
    description: profile.description,
    contactEmail: profile.contactEmail ?? "",
    contactPhone: profile.contactPhone ?? "",
    logoDataUrl: profile.logoDataUrl,
    timezone: profile.timezone,
    language: profile.language,
    reportingPeriod: profile.reportingPeriod,
    leadUserId: lead?.membershipId ?? NONE,
    primaryWebsite: primaryWebsite?.url ?? "",
  };
}

const withCurrent = (options: readonly string[], current: string) => [...new Set([current, ...options])];

/**
 * Edit a client's own details. The parent company is shown but never editable:
 * moving a client between companies is not part of this release.
 */
export function ClientEditDrawer({ summary, onClose }: { summary: ClientSummary; onClose: () => void }) {
  const mutations = useClientMutations();
  const team = useClientTeam(summary.client.id);
  const initial = useMemo(() => toForm(summary), [summary]);
  const [form, setForm] = useState<EditForm>(initial);
  const [attempted, setAttempted] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [serverErrors, setServerErrors] = useState<Record<string, string>>({});

  const update = (patch: Partial<EditForm>) => setForm((current) => ({ ...current, ...patch }));
  const dirty = JSON.stringify(form) !== JSON.stringify(initial);

  const errors: Record<string, string> = {};
  if (!form.name.trim()) errors.name = "Client name is required.";
  if (form.primaryWebsite.trim() && !isValidWebsite(form.primaryWebsite)) errors.primaryWebsite = "Enter a valid website, e.g. example.com.";
  if (form.contactEmail.trim() && !isValidEmail(form.contactEmail)) errors.contactEmail = "Enter a valid email address.";
  if (form.contactPhone.trim() && !isValidPhone(form.contactPhone)) errors.contactPhone = "Enter a valid phone number.";
  const shown = { ...(attempted ? errors : {}), ...serverErrors };
  const valid = Object.keys(errors).length === 0;

  const leadOptions = (team.data?.assignments ?? []).filter((member) => member.membershipStatus === "active");

  const save = async (): Promise<boolean> => {
    setAttempted(true);
    if (!valid) return false;
    setPending(true);
    setError(null);
    setServerErrors({});
    const input: UpdateClientInput = {
      name: form.name.trim(),
      displayName: form.displayName.trim() || form.name.trim(),
      industry: form.industry,
      description: form.description.trim(),
      contactEmail: form.contactEmail.trim() || null,
      contactPhone: form.contactPhone.trim() || null,
      logoDataUrl: form.logoDataUrl,
      timezone: form.timezone,
      language: form.language,
      reportingPeriod: form.reportingPeriod,
      leadUserId: form.leadUserId === NONE ? null : form.leadUserId,
      primaryWebsite: form.primaryWebsite.trim() || null,
    };
    try {
      await mutations.updateClient(summary.client.id, input);
      toast.success(`${input.name} updated`);
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

  const guard = useUnsavedGuard({ dirty, onDiscard: onClose, onSave: save, label: "this client" });

  const text = (id: keyof EditForm, label: string, opts: { required?: boolean; type?: string; hint?: string } = {}) => (
    <Field label={label} htmlFor={`client-edit-${id}`} required={opts.required} error={shown[id]} hint={opts.hint}>
      <Input
        id={`client-edit-${id}`}
        type={opts.type ?? "text"}
        value={String(form[id] ?? "")}
        onChange={(event) => update({ [id]: event.target.value } as Partial<EditForm>)}
        aria-invalid={Boolean(shown[id])}
      />
    </Field>
  );

  return (
    <>
      <Sheet open onOpenChange={(open) => !open && !pending && guard.requestClose()}>
        <SheetContent className="w-full max-w-none sm:max-w-2xl" showClose={!pending}>
          <SheetHeader>
            <SheetTitle>Edit client</SheetTitle>
            <SheetDescription>
              {summary.displayId} · {summary.client.name}
            </SheetDescription>
          </SheetHeader>
          <SheetBody className="space-y-3">
            <ErrorBanner message={error} />

            <Panel title="Parent company" description="A client belongs to one company. Moving a client is not available in this release.">
              <div className="flex items-center justify-between gap-3 rounded-sm border border-border bg-surface-sunken px-3 py-2">
                <div className="min-w-0">
                  <p className="truncate text-[0.8125rem] font-medium text-foreground">{summary.company.name}</p>
                  <p className="text-2xs text-muted-foreground">{summary.company.planName}</p>
                </div>
                <Button asChild variant="ghost" size="sm">
                  <Link href={ROUTES.superAdmin.company(summary.company.id)}>Open company</Link>
                </Button>
              </div>
            </Panel>

            <Panel title="Identity">
              <div className="space-y-3">
                <LogoPicker name={form.name} value={form.logoDataUrl} onChange={(logoDataUrl) => update({ logoDataUrl })} />
                <div className="grid gap-3 sm:grid-cols-2">
                  {text("name", "Client name", { required: true })}
                  {text("displayName", "Display name", { hint: "Shown in reports. Defaults to the client name." })}
                  <Field label="Industry" htmlFor="client-edit-industry">
                    <Select value={form.industry} onValueChange={(industry) => update({ industry })}>
                      <SelectTrigger id="client-edit-industry"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {withCurrent(INDUSTRIES, form.industry).map((option) => (
                          <SelectItem key={option} value={option}>{option}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  {text("primaryWebsite", "Primary website", { hint: "Optional. Changing it updates the primary website only." })}
                </div>
                <Field label="Description" htmlFor="client-edit-description">
                  <Textarea id="client-edit-description" rows={2} maxLength={300} value={form.description} onChange={(event) => update({ description: event.target.value })} />
                </Field>
              </div>
            </Panel>

            <Panel title="Contact">
              <div className="grid gap-3 sm:grid-cols-2">
                {text("contactEmail", "Contact email", { type: "email" })}
                {text("contactPhone", "Contact phone")}
              </div>
            </Panel>

            <Panel title="Workspace defaults">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Timezone" htmlFor="client-edit-timezone">
                  <Select value={form.timezone} onValueChange={(timezone) => update({ timezone })}>
                    <SelectTrigger id="client-edit-timezone"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {withCurrent(TIMEZONES, form.timezone).map((option) => (
                        <SelectItem key={option} value={option}>{option}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Language" htmlFor="client-edit-language">
                  <Select value={form.language} onValueChange={(language) => update({ language })}>
                    <SelectTrigger id="client-edit-language"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {withCurrent(LANGUAGES, form.language).map((option) => (
                        <SelectItem key={option} value={option}>{option}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Default reporting period" htmlFor="client-edit-period">
                  <Select value={form.reportingPeriod} onValueChange={(value) => update({ reportingPeriod: value as ReportingPeriod })}>
                    <SelectTrigger id="client-edit-period"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {REPORTING_PERIODS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field
                  label="Client lead"
                  htmlFor="client-edit-lead"
                  error={shown.leadUserId}
                  hint={team.isPending ? "Loading members..." : leadOptions.length === 0 ? "No active members are assigned yet. Assign members in Team & Access first." : "An active member already assigned to this client."}
                >
                  <Select value={form.leadUserId} onValueChange={(leadUserId) => update({ leadUserId })} disabled={team.isPending}>
                    <SelectTrigger id="client-edit-lead"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>No lead</SelectItem>
                      {leadOptions.map((member) => (
                        <SelectItem key={member.membershipId} value={member.membershipId}>{member.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </div>
            </Panel>
          </SheetBody>
          <SheetFooter>
            <Button variant="outline" onClick={guard.requestClose} disabled={pending}>
              Cancel
            </Button>
            <Button
              disabled={pending || !dirty}
              onClick={async () => {
                if (await save()) onClose();
              }}
            >
              {pending ? <Loader2Icon className="animate-spin" /> : null}
              Save changes
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
      {guard.guardDialog}
    </>
  );
}
