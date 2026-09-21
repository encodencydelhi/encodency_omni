"use client";

import { Loader2Icon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AlertBanner } from "@/components/shared/alert-banner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetBody, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { Stepper } from "@/features/companies/components/flows/flow-kit";
import { Field } from "@/features/companies/components/primitives";
import { useUnsavedGuard } from "@/features/companies/hooks/use-unsaved-guard";
import { INVESTIGATION_PRIORITY, auditRoutes } from "../data/config";
import { describeError, useAuditMutations, useOwners, useScopeOptions } from "../data/hooks";
import type { CreateInvestigationInput, InvestigationPriority, ScopeLevel } from "../data/types";
import { EventPicker } from "./event-picker";

const STEPS = ["Details", "Review"] as const;
const NONE = "__none__";
const SCOPE_LEVELS: Array<{ value: ScopeLevel; label: string }> = [
  { value: "platform", label: "Platform" },
  { value: "company", label: "Company" },
  { value: "client", label: "Client" },
];

const blank = (eventIds: string[], ownerId: string): CreateInvestigationInput => ({ title: "", description: "", scope: { level: "platform", companyId: null, clientId: null }, ownerId, priority: "normal", eventIds, note: "" });

/**
 * Opens an investigation: a group of audit events for organised review. It is not a confirmed
 * incident and not a finding about anyone. Creating one only creates a case record; the audit
 * events it links are never touched.
 */
export function CreateInvestigationDrawer({ initialEventIds = [], labels = {}, defaultCompanyId = null, onClose }: { initialEventIds?: string[]; labels?: Record<string, string>; defaultCompanyId?: string | null; onClose: () => void }) {
  const router = useRouter();
  const mutations = useAuditMutations();
  const owners = useOwners();
  const scopes = useScopeOptions();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<CreateInvestigationInput>(() => ({ ...blank(initialEventIds, ""), scope: defaultCompanyId ? { level: "company", companyId: defaultCompanyId, clientId: null } : { level: "platform", companyId: null, clientId: null } }));
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [general, setGeneral] = useState<string | null>(null);

  const initial = useMemo(() => JSON.stringify({ ...blank(initialEventIds, ""), scope: defaultCompanyId ? { level: "company", companyId: defaultCompanyId, clientId: null } : { level: "platform", companyId: null, clientId: null } }), [initialEventIds, defaultCompanyId]);
  const dirty = JSON.stringify(form) !== initial;
  const guard = useUnsavedGuard({ dirty: dirty && !busy, onDiscard: onClose, label: "this investigation" });

  const company = scopes.data?.find((item) => item.id === form.scope.companyId);
  const ownerName = owners.data?.find((item) => item.id === form.ownerId)?.name;
  const patch = (next: Partial<CreateInvestigationInput>) => { setForm((current) => ({ ...current, ...next })); setErrors({}); setGeneral(null); };

  const localIssues = (): Record<string, string> => {
    const issues: Record<string, string> = {};
    if (!form.title.trim()) issues.title = "Give the investigation a title.";
    if (form.scope.level !== "platform" && !form.scope.companyId) issues.scope = "Choose the company.";
    if (form.scope.level === "client" && !form.scope.clientId) issues.scope = "Choose the client.";
    if (!form.ownerId) issues.ownerId = "Choose an internal owner.";
    return issues;
  };

  const review = () => {
    const issues = localIssues();
    setErrors(issues);
    if (Object.keys(issues).length === 0) setStep(1);
  };

  const create = async () => {
    setBusy(true);
    setGeneral(null);
    try {
      const created = await mutations.createInvestigation(form);
      toast.success(`${created.id} Created`, { description: "Demo investigation. It groups audit events for review and does not change them." });
      onClose();
      router.push(auditRoutes.investigation(created.id));
    } catch (failure) {
      const { message, fieldErrors } = describeError(failure);
      setErrors(fieldErrors);
      setGeneral(message);
      if (Object.keys(fieldErrors).length > 0) setStep(0);
      setBusy(false);
    }
  };

  return (
    <>
      <Sheet open onOpenChange={(open) => !open && !busy && guard.requestClose()}>
        <SheetContent className="w-full max-w-none sm:max-w-2xl" showClose={!busy}>
          <SheetHeader className="gap-2">
            <SheetTitle>Create Investigation</SheetTitle>
            <SheetDescription>Group audit events for organised review. An investigation is not a confirmed incident and not a finding about anyone.</SheetDescription>
            <Stepper steps={[...STEPS]} current={step} className="pt-1" />
          </SheetHeader>
          <SheetBody className="space-y-3">
            {step === 0 ? (
              <>
                <Field label="Investigation Title" htmlFor="inv-title" required error={errors.title}>
                  <Input id="inv-title" value={form.title} maxLength={120} aria-invalid={Boolean(errors.title)} onChange={(event) => patch({ title: event.target.value })} placeholder="What is being reviewed?" />
                </Field>
                <Field label="Description" htmlFor="inv-description" error={errors.description} hint="Optional. What prompted the review, and what would answer it.">
                  <Textarea id="inv-description" rows={3} maxLength={800} value={form.description} onChange={(event) => patch({ description: event.target.value })} />
                </Field>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <Field label="Scope" htmlFor="inv-scope" required error={errors.scope}>
                    <Select value={form.scope.level} onValueChange={(value) => patch({ scope: { level: value as ScopeLevel, companyId: value === "platform" ? null : form.scope.companyId, clientId: value === "client" ? form.scope.clientId : null } })}>
                      <SelectTrigger id="inv-scope" className="w-full"><SelectValue /></SelectTrigger>
                      <SelectContent>{SCOPE_LEVELS.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </Field>
                  <Field label="Related Company" htmlFor="inv-company">
                    <Select value={form.scope.companyId ?? NONE} disabled={form.scope.level === "platform"} onValueChange={(value) => patch({ scope: { level: form.scope.level, companyId: value === NONE ? null : value, clientId: null } })}>
                      <SelectTrigger id="inv-company" className="w-full"><SelectValue placeholder="Choose a company" /></SelectTrigger>
                      <SelectContent><SelectItem value={NONE}>None</SelectItem>{(scopes.data ?? []).map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </Field>
                  <Field label="Related Client" htmlFor="inv-client" hint={form.scope.level === "client" ? undefined : "Only for a client-scope case."}>
                    <Select value={form.scope.clientId ?? NONE} disabled={form.scope.level !== "client" || !form.scope.companyId} onValueChange={(value) => patch({ scope: { ...form.scope, clientId: value === NONE ? null : value } })}>
                      <SelectTrigger id="inv-client" className="w-full"><SelectValue placeholder="Choose a client" /></SelectTrigger>
                      <SelectContent><SelectItem value={NONE}>None</SelectItem>{(company?.clients ?? []).map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </Field>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Field label="Internal Owner" htmlFor="inv-owner" required error={errors.ownerId} hint="Only active staff who can read audit records.">
                    <Select value={form.ownerId || undefined} onValueChange={(value) => patch({ ownerId: value })}>
                      <SelectTrigger id="inv-owner" className="w-full" aria-invalid={Boolean(errors.ownerId)}><SelectValue placeholder="Choose an owner" /></SelectTrigger>
                      <SelectContent>{(owners.data ?? []).map((item) => <SelectItem key={item.id} value={item.id}>{item.name} - {item.role}</SelectItem>)}</SelectContent>
                    </Select>
                  </Field>
                  <Field label="Priority" htmlFor="inv-priority">
                    <Select value={form.priority} onValueChange={(value) => patch({ priority: value as InvestigationPriority })}>
                      <SelectTrigger id="inv-priority" className="w-full"><SelectValue /></SelectTrigger>
                      <SelectContent>{(Object.keys(INVESTIGATION_PRIORITY) as InvestigationPriority[]).map((item) => <SelectItem key={item} value={item}>{INVESTIGATION_PRIORITY[item].label}</SelectItem>)}</SelectContent>
                    </Select>
                  </Field>
                </div>
                <div className="space-y-1">
                  <p className="text-[0.8125rem] font-medium text-foreground">Initial Linked Audit Events</p>
                  <EventPicker selected={form.eventIds} onChange={(ids) => patch({ eventIds: ids })} labels={labels} companyId={form.scope.level === "platform" ? null : form.scope.companyId} />
                  {errors.eventIds ? <p role="alert" className="text-2xs text-danger">{errors.eventIds}</p> : null}
                </div>
                <Field label="Initial Investigation Note" htmlFor="inv-note" hint="Optional. Internal only.">
                  <Textarea id="inv-note" rows={2} maxLength={1500} value={form.note} onChange={(event) => patch({ note: event.target.value })} />
                </Field>
              </>
            ) : (
              <>
                <dl className="divide-y divide-border rounded-sm border border-border px-3 text-[0.8125rem]">
                  {[
                    ["Title", form.title],
                    ["Scope", form.scope.level === "platform" ? "Platform" : form.scope.level === "company" ? (company?.name ?? "Company") : `${company?.name ?? "Company"} > ${company?.clients.find((item) => item.id === form.scope.clientId)?.name ?? "Client"}`],
                    ["Internal Owner", ownerName ?? "-"],
                    ["Priority", INVESTIGATION_PRIORITY[form.priority].label],
                    ["Linked Events", String(form.eventIds.length)],
                    ["Initial Note", form.note.trim() || "None"],
                  ].map(([label, value]) => (
                    <div key={label} className="flex items-baseline justify-between gap-3 py-1.5"><dt className="shrink-0 text-muted-foreground">{label}</dt><dd className="min-w-0 truncate text-right font-medium text-foreground">{value}</dd></div>
                  ))}
                </dl>
                <AlertBanner tone="info" title="What Creating Does">A case record is created with the events linked to it. The audit events are not changed, and being owner does not give anyone access to company data.</AlertBanner>
              </>
            )}
            {general ? <AlertBanner tone="danger" title="Investigation Not Created">{general}</AlertBanner> : null}
          </SheetBody>
          <SheetFooter className="flex-wrap justify-between gap-2">
            <Button variant="ghost" onClick={() => guard.requestClose()} disabled={busy}>Cancel</Button>
            <div className="flex items-center gap-1.5">
              {step === 1 ? <Button variant="outline" onClick={() => setStep(0)} disabled={busy}>Back</Button> : null}
              {step === 0 ? <Button onClick={review}>Review</Button> : <Button onClick={() => void create()} disabled={busy}>{busy ? <Loader2Icon className="animate-spin" /> : null}Create Demo Investigation</Button>}
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>
      {guard.guardDialog}
    </>
  );
}
