"use client";

import { Loader2Icon, PlusIcon, XIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetBody, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils/cn";
import { COMPANY_SIZES, COUNTRIES, INDUSTRIES, INTERNAL_TAG_OPTIONS } from "../data/config";
import { describeError, useCompanyMutations, useStaff } from "../data/hooks";
import type { CompanyInternalOwner, CompanySize, CompanySummary, UpdateCompanyInput } from "../data/types";
import { useUnsavedGuard } from "../hooks/use-unsaved-guard";
import { isValidEmail, isValidPhone, isValidWebsite } from "../lib/validation";
import { ErrorBanner } from "./flows/flow-kit";
import { Field, Panel } from "./primitives";

const NONE = "__none__";

interface EditForm {
  name: string;
  legalName: string;
  website: string;
  industry: string;
  country: string;
  companySize: string;
  contactEmail: string;
  contactPhone: string;
  tags: string[];
  accountManagerId: string;
  supportOwnerId: string;
  technicalOwnerId: string;
}

function toForm(summary: CompanySummary): EditForm {
  const { company } = summary;
  return {
    name: company.name,
    legalName: company.profile.legalName ?? "",
    website: company.profile.website ?? "",
    industry: company.profile.industry,
    country: company.profile.country,
    companySize: company.profile.companySize ?? NONE,
    contactEmail: company.profile.contactEmail ?? "",
    contactPhone: company.profile.contactPhone ?? "",
    tags: company.internalTags,
    accountManagerId: company.internalOwners.accountManagerId ?? NONE,
    supportOwnerId: company.internalOwners.supportOwnerId ?? NONE,
    technicalOwnerId: company.internalOwners.technicalOwnerId ?? NONE,
  };
}

export function CompanyEditDrawer({ summary, onClose }: { summary: CompanySummary; onClose: () => void }) {
  const mutations = useCompanyMutations();
  const staff = useStaff();
  const initial = useMemo(() => toForm(summary), [summary]);
  const [form, setForm] = useState<EditForm>(initial);
  const [customTag, setCustomTag] = useState("");
  const [attempted, setAttempted] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [serverErrors, setServerErrors] = useState<Record<string, string>>({});

  const update = (patch: Partial<EditForm>) => setForm((current) => ({ ...current, ...patch }));
  const dirty = JSON.stringify(form) !== JSON.stringify(initial);

  const errors: Record<string, string> = {};
  if (!form.name.trim()) errors.name = "Company name is required.";
  if (form.website.trim() && !isValidWebsite(form.website)) errors.website = "Enter a valid website.";
  if (form.contactEmail.trim() && !isValidEmail(form.contactEmail)) errors.contactEmail = "Enter a valid email address.";
  if (form.contactPhone.trim() && !isValidPhone(form.contactPhone)) errors.contactPhone = "Enter a valid phone number.";
  const shown = { ...(attempted ? errors : {}), ...serverErrors };
  const valid = Object.keys(errors).length === 0;

  const save = async (): Promise<boolean> => {
    setAttempted(true);
    if (!valid) return false;
    setPending(true);
    setError(null);
    setServerErrors({});

    const orNull = (value: string) => (value === NONE || value === "" ? null : value);
    const internalOwners: CompanyInternalOwner = {
      accountManagerId: orNull(form.accountManagerId),
      supportOwnerId: orNull(form.supportOwnerId),
      technicalOwnerId: orNull(form.technicalOwnerId),
    };
    const input: UpdateCompanyInput = {
      name: form.name,
      legalName: form.legalName.trim() || null,
      website: form.website.trim() || null,
      industry: form.industry,
      country: form.country,
      contactPhone: form.contactPhone.trim() || null,
      contactEmail: form.contactEmail.trim() || null,
      companySize: (orNull(form.companySize) as CompanySize | null) ?? null,
      internalTags: form.tags,
      internalOwners,
    };

    try {
      await mutations.updateCompany(summary.company.id, input);
      toast.success(`${form.name.trim()} updated`);
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

  const guard = useUnsavedGuard({ dirty, onDiscard: onClose, onSave: save, label: "this company" });

  const addTag = (tag: string) => {
    const clean = tag.trim().slice(0, 28);
    if (clean && !form.tags.some((item) => item.toLowerCase() === clean.toLowerCase())) update({ tags: [...form.tags, clean] });
    setCustomTag("");
  };

  const text = (id: keyof EditForm, label: string, opts: { required?: boolean; type?: string } = {}) => (
    <Field label={label} htmlFor={`edit-${id}`} required={opts.required} error={shown[id]}>
      <Input
        id={`edit-${id}`}
        type={opts.type ?? "text"}
        value={String(form[id])}
        onChange={(event) => update({ [id]: event.target.value } as Partial<EditForm>)}
        aria-invalid={Boolean(shown[id])}
      />
    </Field>
  );

  const staffSelect = (id: keyof EditForm, label: string) => (
    <Field label={label} htmlFor={`edit-${id}`}>
      <Select value={String(form[id])} onValueChange={(value) => update({ [id]: value } as Partial<EditForm>)}>
        <SelectTrigger id={`edit-${id}`}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NONE}>Unassigned</SelectItem>
          {(staff.data ?? []).filter((member) => member.status === "active").map((member) => (
            <SelectItem key={member.id} value={member.id}>
              {member.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  );

  return (
    <>
      <Sheet open onOpenChange={(open) => !open && !pending && guard.requestClose()}>
        <SheetContent className="w-full max-w-none sm:max-w-2xl" showClose={!pending}>
          <SheetHeader>
            <SheetTitle>Edit company</SheetTitle>
            <SheetDescription>
              {summary.company.displayId} · {summary.company.domain ?? "no domain"}
            </SheetDescription>
          </SheetHeader>
          <SheetBody className="space-y-3">
            <ErrorBanner message={error} />

            <Panel title="Company identity">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2">{text("name", "Company name", { required: true })}</div>
                {text("legalName", "Legal name")}
                {text("website", "Website")}
              </div>
            </Panel>

            <Panel title="Contact information">
              <div className="grid gap-3 sm:grid-cols-2">
                {text("contactEmail", "Email", { type: "email" })}
                {text("contactPhone", "Phone")}
              </div>
            </Panel>

            <Panel title="Business details">
              <div className="grid gap-3 sm:grid-cols-3">
                <Field label="Industry" htmlFor="edit-industry">
                  <Select value={form.industry} onValueChange={(value) => update({ industry: value })}>
                    <SelectTrigger id="edit-industry"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {[...new Set([form.industry, ...INDUSTRIES])].map((option) => (
                        <SelectItem key={option} value={option}>{option}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Country" htmlFor="edit-country">
                  <Select value={form.country} onValueChange={(value) => update({ country: value })}>
                    <SelectTrigger id="edit-country"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {[...new Set([form.country, ...COUNTRIES])].map((option) => (
                        <SelectItem key={option} value={option}>{option}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Company size" htmlFor="edit-size">
                  <Select value={form.companySize} onValueChange={(value) => update({ companySize: value })}>
                    <SelectTrigger id="edit-size"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>Not specified</SelectItem>
                      {COMPANY_SIZES.map((option) => (
                        <SelectItem key={option} value={option}>{option}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </div>
            </Panel>

            <Panel title="Internal classification" description="Visible to platform staff only. Never shown to the company.">
              <div className="space-y-3">
                <div>
                  <p className="mb-1.5 text-[0.8125rem] font-medium text-foreground">Internal tags</p>
                  <div className="flex flex-wrap gap-1.5">
                    {[...new Set([...INTERNAL_TAG_OPTIONS, ...form.tags])].map((tag) => {
                      const active = form.tags.includes(tag);
                      return (
                        <button
                          key={tag}
                          type="button"
                          aria-pressed={active}
                          onClick={() => update({ tags: active ? form.tags.filter((item) => item !== tag) : [...form.tags, tag] })}
                          className={cn(
                            "inline-flex items-center gap-1 rounded-sm border px-2 py-0.5 text-2xs font-medium transition-colors",
                            active ? "border-primary/30 bg-primary-subtle text-primary" : "border-border-strong bg-card text-muted-foreground hover:bg-accent",
                          )}
                        >
                          {tag}
                          {active ? <XIcon className="size-3" aria-label={`Remove ${tag}`} /> : null}
                        </button>
                      );
                    })}
                  </div>
                  <div className="mt-2 flex max-w-xs gap-1.5">
                    <Input
                      value={customTag}
                      onChange={(event) => setCustomTag(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          addTag(customTag);
                        }
                      }}
                      placeholder="Add a custom tag"
                      aria-label="Add a custom tag"
                      className="h-8"
                    />
                    <Button type="button" variant="outline" size="sm" onClick={() => addTag(customTag)} disabled={!customTag.trim()}>
                      <PlusIcon />
                      Add
                    </Button>
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  {staffSelect("accountManagerId", "Account Manager")}
                  {staffSelect("supportOwnerId", "Support Owner")}
                  {staffSelect("technicalOwnerId", "Technical Owner")}
                </div>
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
