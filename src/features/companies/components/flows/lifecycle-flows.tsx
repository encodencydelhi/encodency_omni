"use client";

import { ArchiveIcon, ArrowRightLeftIcon, BellIcon, CircleCheckIcon, UserCogIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AlertBanner } from "@/components/shared/alert-banner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { formatDate, formatNumber } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import { ORGANISATION_ROLE } from "@/types/domain/user";
import { SUSPENSION_IMPACTS, SUSPENSION_REASONS, SUSPENSION_REASON_LABEL } from "../../data/config";
import { describeError, useCompanyBilling, useCompanyMutations, useCompanyUsers, useStaff } from "../../data/hooks";
import type { CompanyInternalOwner, CompanySummary, SuspensionReason } from "../../data/types";
import { useUnsavedGuard } from "../../hooks/use-unsaved-guard";
import { formatMrr } from "../../lib/format";
import { Field } from "../primitives";
import { AccountStatusBadge, BillingStatusBadge, SubscriptionStatusBadge } from "../status-badges";
import { ConfirmPhrase, ErrorBanner, FlowDialog, ImpactList, Stepper, SubmitButton, phraseMatches } from "./flow-kit";

function CompanyChip({ summary }: { summary: CompanySummary }) {
  return (
    <li className="flex items-center justify-between gap-3 px-3 py-1.5 text-[0.8125rem]">
      <span className="min-w-0 truncate font-medium text-foreground">{summary.company.name}</span>
      <span className="flex shrink-0 items-center gap-1.5">
        <AccountStatusBadge status={summary.company.accountStatus} />
      </span>
    </li>
  );
}

function reportBulk(verb: string, result: { updated: string[]; skipped: Array<{ name: string; reason: string }> }) {
  if (result.updated.length > 0) {
    toast.success(`${verb} ${formatNumber(result.updated.length)} ${result.updated.length === 1 ? "company" : "companies"} in the demo workspace`);
  }
  if (result.skipped.length > 0) {
    toast.warning(`${formatNumber(result.skipped.length)} skipped`, {
      description: result.skipped.slice(0, 3).map((item) => `${item.name}: ${item.reason}`).join(" · "),
    });
  }
}

/* ------------------------------------------------------------------ */
/* Suspend                                                             */
/* ------------------------------------------------------------------ */

export function SuspendFlow({ targets, onClose }: { targets: CompanySummary[]; onClose: () => void }) {
  const mutations = useCompanyMutations();
  const [step, setStep] = useState(0);
  const [reason, setReason] = useState<SuspensionReason>("billing");
  const [note, setNote] = useState("");
  const [phrase, setPhrase] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const eligible = targets.filter((target) => target.company.accountStatus === "active");
  const skipped = targets.filter((target) => target.company.accountStatus !== "active");
  const single = eligible.length === 1 ? eligible[0] : undefined;
  const expected = single ? single.company.name : `SUSPEND ${eligible.length}`;
  const noteRequired = reason === "other";
  const reasonValid = !noteRequired || note.trim().length >= 5;

  const submit = async () => {
    setPending(true);
    setError(null);
    try {
      const result = await mutations.suspendCompanies(eligible.map((item) => item.company.id), { reason, note: note.trim() });
      reportBulk("Suspended", result);
      onClose();
    } catch (failure) {
      setError(describeError(failure).message);
    } finally {
      setPending(false);
    }
  };

  return (
    <FlowDialog
      open
      onOpenChange={(open) => !open && !pending && onClose()}
      size="lg"
      title={single ? `Suspend ${single.company.name}?` : `Suspend ${formatNumber(eligible.length)} companies?`}
      description="Suspension restricts access at the account level. It is reversible, and no company data is deleted."
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          {step > 0 ? (
            <Button variant="outline" onClick={() => setStep(step - 1)} disabled={pending}>
              Back
            </Button>
          ) : null}
          {step < 2 ? (
            <Button onClick={() => setStep(step + 1)} disabled={step === 0 && (!reasonValid || eligible.length === 0)}>
              Continue
            </Button>
          ) : (
            <SubmitButton pending={pending} variant="destructive" onClick={submit} disabled={!phraseMatches(phrase, expected) || !acknowledged}>
              Suspend {single ? "company" : `${formatNumber(eligible.length)} companies`}
            </SubmitButton>
          )}
        </>
      }
    >
      <Stepper steps={["Reason", "Impact", "Confirm"]} current={step} />
      <ErrorBanner message={error} />

      {skipped.length > 0 ? (
        <AlertBanner tone="info" title={`${skipped.length} selected ${skipped.length === 1 ? "company is" : "companies are"} not eligible`}>
          {skipped.map((item) => item.company.name).join(", ")} {skipped.length === 1 ? "is" : "are"} not active and will be left unchanged.
        </AlertBanner>
      ) : null}

      {step === 0 ? (
        <div className="space-y-3">
          <fieldset className="space-y-1.5">
            <legend className="mb-1.5 text-[0.8125rem] font-medium text-foreground">Reason for suspension</legend>
            <RadioGroup value={reason} onValueChange={(value) => setReason(value as SuspensionReason)} className="grid gap-1.5 sm:grid-cols-2">
              {SUSPENSION_REASONS.map((option) => (
                <label
                  key={option.value}
                  className={cn(
                    "flex cursor-pointer items-start gap-2.5 rounded-sm border px-3 py-2 transition-colors",
                    reason === option.value ? "border-primary/40 bg-primary-subtle" : "border-border hover:bg-accent",
                  )}
                >
                  <RadioGroupItem value={option.value} className="mt-0.5" />
                  <span>
                    <span className="block text-[0.8125rem] font-medium text-foreground">{option.label}</span>
                    <span className="block text-2xs text-muted-foreground">{option.hint}</span>
                  </span>
                </label>
              ))}
            </RadioGroup>
          </fieldset>
          <Field label="Internal note" htmlFor="suspend-note" required={noteRequired} hint="Recorded in the activity log. Visible to Super Admin only.">
            <Textarea id="suspend-note" value={note} onChange={(event) => setNote(event.target.value)} className="min-h-16" placeholder="What happened, and what needs to change before reactivation?" />
          </Field>
        </div>
      ) : null}

      {step === 1 ? (
        <div className="space-y-3">
          <AlertBanner tone="warning" title="Intended impact - enforced by the backend">
            The demo workspace changes the account status only. It does not end sessions, pause jobs or stop integrations.
          </AlertBanner>
          <ImpactList items={SUSPENSION_IMPACTS} />
          <div>
            <p className="mb-1.5 text-[0.8125rem] font-medium text-foreground">
              Affected companies ({formatNumber(eligible.length)})
            </p>
            <ul className="max-h-40 divide-y divide-border overflow-y-auto rounded-sm border border-border scrollbar-thin">
              {eligible.map((item) => (
                <CompanyChip key={item.company.id} summary={item} />
              ))}
            </ul>
          </div>
          <p className="text-2xs text-muted-foreground">
            Reason: <span className="font-medium text-foreground">{SUSPENSION_REASON_LABEL[reason]}</span>
            {note.trim() ? ` - ${note.trim()}` : ""}
          </p>
        </div>
      ) : null}

      {step === 2 ? (
        <div className="space-y-3">
          <dl className="grid grid-cols-3 gap-1">
            <SummaryTile label="Companies" value={formatNumber(eligible.length)} />
            <SummaryTile label="Reason" value={SUSPENSION_REASON_LABEL[reason]} />
            <SummaryTile label="Users affected" value={formatNumber(eligible.reduce((total, item) => total + item.counts.users, 0))} />
          </dl>
          <ConfirmPhrase id="suspend-confirm" phrase={expected} value={phrase} onChange={setPhrase} />
          <label className="flex cursor-pointer items-start gap-2.5 text-[0.8125rem] text-foreground">
            <Checkbox checked={acknowledged} onCheckedChange={(value) => setAcknowledged(value === true)} className="mt-0.5" />
            <span>
              I understand that {single ? single.company.name : "these companies"} will be marked Suspended and that the backend is responsible for enforcing the impact listed in the previous step.
            </span>
          </label>
        </div>
      ) : null}
    </FlowDialog>
  );
}

function SummaryTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-sm border border-border bg-surface-sunken px-3 py-2">
      <dt className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 truncate text-[0.8125rem] font-semibold text-foreground tabular">{value}</dd>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Reactivate                                                          */
/* ------------------------------------------------------------------ */

export function ReactivateFlow({ targets, onClose }: { targets: CompanySummary[]; onClose: () => void }) {
  const mutations = useCompanyMutations();
  const [note, setNote] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const eligible = targets.filter((target) => target.company.accountStatus === "suspended");
  const skipped = targets.filter((target) => target.company.accountStatus !== "suspended");
  const single = eligible.length === 1 ? eligible[0] : undefined;

  const submit = async () => {
    setPending(true);
    setError(null);
    try {
      const result = await mutations.reactivateCompanies(eligible.map((item) => item.company.id), { note: note.trim() });
      reportBulk("Reactivated", result);
      onClose();
    } catch (failure) {
      setError(describeError(failure).message);
    } finally {
      setPending(false);
    }
  };

  return (
    <FlowDialog
      open
      onOpenChange={(open) => !open && !pending && onClose()}
      size="lg"
      title={single ? `Reactivate ${single.company.name}?` : `Reactivate ${formatNumber(eligible.length)} companies?`}
      description="Review why each company was suspended and what is still outstanding before restoring access."
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <SubmitButton pending={pending} onClick={submit} disabled={eligible.length === 0}>
            <CircleCheckIcon />
            Confirm reactivation
          </SubmitButton>
        </>
      }
    >
      <ErrorBanner message={error} />
      {skipped.length > 0 ? (
        <AlertBanner tone="info" title={`${skipped.length} selected ${skipped.length === 1 ? "company is" : "companies are"} not suspended`}>
          {skipped.map((item) => item.company.name).join(", ")} will be left unchanged.
        </AlertBanner>
      ) : null}

      <ul className="divide-y divide-border rounded-sm border border-border">
        {eligible.map((item) => {
          const suspension = item.company.suspension;
          const outstanding = [
            item.billingStatus === "payment_failed" || item.billingStatus === "payment_due" ? "Unresolved billing" : null,
            item.usage.level === "exceeded" ? "Usage limit exceeded" : null,
            item.counts.attentionConnections > 0 ? `${item.counts.attentionConnections} integration${item.counts.attentionConnections === 1 ? "" : "s"} need attention` : null,
          ].filter((value): value is string => value !== null);

          return (
            <li key={item.company.id} className="space-y-1.5 px-3 py-2.5">
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-[0.8125rem] font-semibold text-foreground">{item.company.name}</p>
                <span className="flex gap-1">
                  <SubscriptionStatusBadge status={item.subscriptionStatus} />
                  <BillingStatusBadge status={item.billingStatus} />
                </span>
              </div>
              <dl className="grid gap-x-4 gap-y-1 text-2xs sm:grid-cols-2">
                <Line label="Reason" value={suspension ? SUSPENSION_REASON_LABEL[suspension.reason] : "Not recorded"} />
                <Line label="Suspended" value={suspension ? `${formatDate(suspension.suspendedAt)} by ${suspension.suspendedBy}` : "-"} />
                <Line label="Previous state" value={suspension?.previousStatus ?? "active"} />
                <Line label="Outstanding" value={outstanding.length > 0 ? outstanding.join(", ") : "Nothing outstanding"} />
              </dl>
              {suspension?.note ? <p className="text-2xs text-muted-foreground">Note: {suspension.note}</p> : null}
            </li>
          );
        })}
      </ul>

      <AlertBanner tone="info" title="What reactivation does not do">
        Only the account status changes. Integrations, scheduled jobs and user sessions are not automatically resumed; the backend decides how each one recovers.
      </AlertBanner>

      <Field label="Note (optional)" htmlFor="reactivate-note">
        <Textarea id="reactivate-note" value={note} onChange={(event) => setNote(event.target.value)} className="min-h-14" placeholder="Why is access being restored?" />
      </Field>
    </FlowDialog>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-1.5">
      <dt className="text-muted-foreground">{label}:</dt>
      <dd className="min-w-0 truncate text-foreground capitalize">{value}</dd>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Archive                                                             */
/* ------------------------------------------------------------------ */

export function ArchiveFlow({ target, onClose }: { target: CompanySummary; onClose: () => void }) {
  const mutations = useCompanyMutations();
  const billing = useCompanyBilling(target.company.id);
  const [note, setNote] = useState("");
  const [phrase, setPhrase] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openInvoices = (billing.data?.invoices ?? []).filter((invoice) => invoice.status === "open" || invoice.status === "overdue");

  const submit = async () => {
    setPending(true);
    setError(null);
    try {
      await mutations.archiveCompany(target.company.id, { note: note.trim() });
      toast.success(`${target.company.name} archived in the demo workspace`);
      onClose();
    } catch (failure) {
      setError(describeError(failure).message);
    } finally {
      setPending(false);
    }
  };

  return (
    <FlowDialog
      open
      onOpenChange={(open) => !open && !pending && onClose()}
      title={`Archive ${target.company.name}?`}
      description="Archiving retires the company from day-to-day operations. Nothing is permanently deleted in this phase."
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <SubmitButton pending={pending} variant="destructive" onClick={submit} disabled={!phraseMatches(phrase, target.company.name)}>
            <ArchiveIcon />
            Archive company
          </SubmitButton>
        </>
      }
    >
      <ErrorBanner message={error} />
      <dl className="grid grid-cols-2 gap-1 sm:grid-cols-3">
        <SummaryTile label="Subscription" value={target.plan.name} />
        <SummaryTile label="Users" value={formatNumber(target.counts.users)} />
        <SummaryTile label="Clients" value={formatNumber(target.counts.clients)} />
        <SummaryTile label="Connections" value={formatNumber(target.counts.connections)} />
        <SummaryTile label="MRR removed" value={formatMrr(target.mrrMinor, target.currency)} />
        <SummaryTile label="Pending invoices" value={billing.isPending ? "..." : formatNumber(openInvoices.length)} />
      </dl>
      <div className="flex flex-wrap items-center gap-1.5 text-2xs text-muted-foreground">
        Current state: <AccountStatusBadge status={target.company.accountStatus} />
        <SubscriptionStatusBadge status={target.subscriptionStatus} labelled />
      </div>
      {openInvoices.length > 0 ? (
        <AlertBanner tone="warning" title="Unpaid invoices remain">
          {openInvoices.length} invoice{openInvoices.length === 1 ? "" : "s"} are still open. Archiving does not settle them.
        </AlertBanner>
      ) : null}
      <AlertBanner tone="warning" title="Active resources are affected">
        {target.counts.clients} client{target.counts.clients === 1 ? "" : "s"} and {target.counts.connections} connection{target.counts.connections === 1 ? "" : "s"} are retained but no longer operated. The backend enforces what stops.
      </AlertBanner>
      <Field label="Reason (recorded in the activity log)" htmlFor="archive-note">
        <Textarea id="archive-note" value={note} onChange={(event) => setNote(event.target.value)} className="min-h-14" />
      </Field>
      <ConfirmPhrase id="archive-confirm" phrase={target.company.name} value={phrase} onChange={setPhrase} />
    </FlowDialog>
  );
}

/* ------------------------------------------------------------------ */
/* Transfer ownership                                                  */
/* ------------------------------------------------------------------ */

export function TransferOwnershipFlow({ target, onClose }: { target: CompanySummary; onClose: () => void }) {
  const mutations = useCompanyMutations();
  const users = useCompanyUsers(target.company.id);
  const [step, setStep] = useState(0);
  const [newOwnerId, setNewOwnerId] = useState<string>("");
  const [note, setNote] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentOwnerId = target.company.ownerUserId;
  const currentOwner = users.data?.users.find((user) => user.id === currentOwnerId);
  const candidate = users.data?.users.find((user) => user.id === newOwnerId);
  const dirty = newOwnerId !== "" || note.trim() !== "";

  const submit = async (): Promise<boolean> => {
    setPending(true);
    setError(null);
    try {
      await mutations.transferOwnership(target.company.id, { newOwnerUserId: newOwnerId, note: note.trim() });
      toast.success(`Ownership of ${target.company.name} moved to ${candidate?.name ?? "the new owner"}`);
      return true;
    } catch (failure) {
      setError(describeError(failure).message);
      return false;
    } finally {
      setPending(false);
    }
  };

  const guard = useUnsavedGuard({ dirty, onDiscard: onClose, label: "this ownership transfer" });

  const eligibility = (user: NonNullable<typeof candidate>): { ok: boolean; reason: string | null } =>
    user.id === currentOwnerId
      ? { ok: false, reason: "Current owner" }
      : user.status !== "active"
        ? { ok: false, reason: `Account is ${user.status}` }
        : { ok: true, reason: null };

  return (
    <>
      <FlowDialog
        open
        onOpenChange={(open) => !open && !pending && guard.requestClose()}
        size="lg"
        title={`Transfer ownership of ${target.company.name}`}
        description="A company always has an owner. The new owner takes over; the current owner becomes an organisation admin."
        footer={
          <>
            <Button variant="outline" onClick={guard.requestClose} disabled={pending}>
              Cancel
            </Button>
            {step > 0 ? (
              <Button variant="outline" onClick={() => setStep(step - 1)} disabled={pending}>
                Back
              </Button>
            ) : null}
            {step < 1 ? (
              <Button onClick={() => setStep(1)} disabled={!candidate}>
                Review
              </Button>
            ) : (
              <SubmitButton
                pending={pending}
                variant="destructive"
                disabled={!acknowledged}
                onClick={async () => {
                  if (await submit()) onClose();
                }}
              >
                <ArrowRightLeftIcon />
                Confirm transfer
              </SubmitButton>
            )}
          </>
        }
      >
        <Stepper steps={["New owner", "Review & confirm"]} current={step} />
        <ErrorBanner message={error} />

        {users.isPending ? (
          <p className="text-[0.8125rem] text-muted-foreground">Loading members...</p>
        ) : step === 0 ? (
          <div className="space-y-3">
            <div className="rounded-sm border border-border bg-surface-sunken px-3 py-2">
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Current owner</p>
              <p className="text-[0.8125rem] font-medium text-foreground">{currentOwner ? `${currentOwner.name} - ${currentOwner.email}` : target.owner.name}</p>
            </div>
            <Field label="New owner" htmlFor="new-owner" required hint="Only active members are eligible.">
              <Select value={newOwnerId} onValueChange={setNewOwnerId}>
                <SelectTrigger id="new-owner">
                  <SelectValue placeholder="Select a member" />
                </SelectTrigger>
                <SelectContent>
                  {(users.data?.users ?? []).map((user) => {
                    const status = eligibility(user);
                    return (
                      <SelectItem key={user.id} value={user.id} disabled={!status.ok}>
                        {user.name} - {ORGANISATION_ROLE[user.role].label}
                        {status.reason ? ` (${status.reason})` : ""}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </Field>
            {users.data && users.data.users.every((user) => !eligibility(user).ok) ? (
              <AlertBanner tone="warning" title="No eligible member">
                Invite or reactivate another member first - a company cannot be left without an owner.
              </AlertBanner>
            ) : null}
            <Field label="Reason (optional)" htmlFor="transfer-note">
              <Textarea id="transfer-note" value={note} onChange={(event) => setNote(event.target.value)} className="min-h-14" />
            </Field>
          </div>
        ) : candidate ? (
          <div className="space-y-3">
            <dl className="divide-y divide-border rounded-sm border border-border text-[0.8125rem]">
              <ReviewRow label="Current owner" value={`${currentOwner?.name ?? target.owner.name} -> becomes Organization Admin`} />
              <ReviewRow label="New owner" value={`${candidate.name} -> becomes Organization Owner`} />
              <ReviewRow label="New owner 2FA" value={candidate.mfaEnabled ? "Enabled" : "Not enabled - consider requiring it"} />
              <ReviewRow label="Role impact" value={`${ORGANISATION_ROLE[candidate.role].label} -> Organization Owner`} />
            </dl>
            {!candidate.mfaEnabled ? (
              <AlertBanner tone="warning" title="New owner has no 2FA">
                Ownership carries billing and security authority. Require 2FA from the Security tab after the transfer.
              </AlertBanner>
            ) : null}
            <label className="flex cursor-pointer items-start gap-2.5 text-[0.8125rem] text-foreground">
              <Checkbox checked={acknowledged} onCheckedChange={(value) => setAcknowledged(value === true)} className="mt-0.5" />
              <span>I confirm the ownership of {target.company.name} should move to {candidate.name}.</span>
            </label>
          </div>
        ) : null}
      </FlowDialog>
      {guard.guardDialog}
    </>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 px-3 py-2">
      <dt className="shrink-0 text-muted-foreground">{label}</dt>
      <dd className="min-w-0 text-right text-foreground">{value}</dd>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Internal owners                                                     */
/* ------------------------------------------------------------------ */

const KEEP = "__keep__";
const NONE = "__none__";

export function AssignOwnersDialog({ targets, onClose }: { targets: CompanySummary[]; onClose: () => void }) {
  const mutations = useCompanyMutations();
  const staff = useStaff();
  const single = targets.length === 1 ? targets[0] : undefined;

  const initial = (current: string | null | undefined) => (single ? (current ?? NONE) : KEEP);
  const [accountManager, setAccountManager] = useState(initial(single?.company.internalOwners.accountManagerId));
  const [supportOwner, setSupportOwner] = useState(initial(single?.company.internalOwners.supportOwnerId));
  const [technicalOwner, setTechnicalOwner] = useState(initial(single?.company.internalOwners.technicalOwnerId));
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const active = useMemo(() => (staff.data ?? []).filter((member) => member.status === "active"), [staff.data]);

  const patch = useMemo(() => {
    const result: Partial<CompanyInternalOwner> = {};
    const apply = (key: keyof CompanyInternalOwner, value: string) => {
      if (value !== KEEP) result[key] = value === NONE ? null : value;
    };
    apply("accountManagerId", accountManager);
    apply("supportOwnerId", supportOwner);
    apply("technicalOwnerId", technicalOwner);
    return result;
  }, [accountManager, supportOwner, technicalOwner]);

  const changed = single
    ? (patch.accountManagerId ?? null) !== single.company.internalOwners.accountManagerId ||
      (patch.supportOwnerId ?? null) !== single.company.internalOwners.supportOwnerId ||
      (patch.technicalOwnerId ?? null) !== single.company.internalOwners.technicalOwnerId
    : Object.keys(patch).length > 0;

  const submit = async (): Promise<boolean> => {
    setPending(true);
    setError(null);
    try {
      const result = await mutations.assignInternalOwners(targets.map((item) => item.company.id), patch);
      reportBulk("Updated internal owners for", result);
      return true;
    } catch (failure) {
      setError(describeError(failure).message);
      return false;
    } finally {
      setPending(false);
    }
  };

  const guard = useUnsavedGuard({ dirty: changed, onDiscard: onClose, onSave: submit, label: "internal ownership" });

  const renderSelect = (id: string, label: string, value: string, onChange: (value: string) => void) => (
    <Field label={label} htmlFor={id}>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger id={id}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {!single ? <SelectItem value={KEEP}>Keep current</SelectItem> : null}
          <SelectItem value={NONE}>Unassigned</SelectItem>
          {active.map((member) => (
            <SelectItem key={member.id} value={member.id}>
              {member.name} - {member.department}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  );

  return (
    <>
      <FlowDialog
        open
        onOpenChange={(open) => !open && !pending && guard.requestClose()}
        title={single ? "Assign internal owners" : `Assign internal owners to ${formatNumber(targets.length)} companies`}
        description="Platform staff responsible for this tenant. These assignments are internal and never shown to the company."
        footer={
          <>
            <Button variant="outline" onClick={guard.requestClose} disabled={pending}>
              Cancel
            </Button>
            <SubmitButton
              pending={pending}
              disabled={!changed}
              onClick={async () => {
                if (await submit()) onClose();
              }}
            >
              <UserCogIcon />
              Save assignments
            </SubmitButton>
          </>
        }
      >
        <ErrorBanner message={error} />
        {staff.isPending ? <p className="text-[0.8125rem] text-muted-foreground">Loading internal team...</p> : null}
        {renderSelect("owner-am", "Account Manager", accountManager, setAccountManager)}
        {renderSelect("owner-support", "Support Owner", supportOwner, setSupportOwner)}
        {renderSelect("owner-tech", "Technical Owner", technicalOwner, setTechnicalOwner)}
        {!single ? (
          <p className="text-2xs text-muted-foreground">
            Fields set to &quot;Keep current&quot; are left as they are on every selected company.
          </p>
        ) : null}
      </FlowDialog>
      {guard.guardDialog}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Notification                                                        */
/* ------------------------------------------------------------------ */

export function SendNotificationDialog({ targets, onClose }: { targets: CompanySummary[]; onClose: () => void }) {
  const mutations = useCompanyMutations();
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [audience, setAudience] = useState<"organisation_admins" | "all_users">("organisation_admins");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const valid = title.trim().length >= 3 && message.trim().length >= 5;

  const submit = async (): Promise<boolean> => {
    setPending(true);
    setError(null);
    try {
      const result = await mutations.sendNotification(targets.map((item) => item.company.id), { title: title.trim(), message: message.trim(), audience });
      reportBulk("Recorded a platform notification for", result);
      return true;
    } catch (failure) {
      setError(describeError(failure).message);
      return false;
    } finally {
      setPending(false);
    }
  };

  const guard = useUnsavedGuard({ dirty: title !== "" || message !== "", onDiscard: onClose, onSave: valid ? submit : undefined, label: "this notification" });

  return (
    <>
      <FlowDialog
        open
        onOpenChange={(open) => !open && !pending && guard.requestClose()}
        title={targets.length === 1 ? `Notify ${targets[0]?.company.name ?? "company"}` : `Notify ${formatNumber(targets.length)} companies`}
        description="Send a platform message to the organisation."
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
              <BellIcon />
              Record notification
            </SubmitButton>
          </>
        }
      >
        <AlertBanner tone="info" title="Demo mode - nothing is delivered">
          The notification is recorded in each company&apos;s activity log. No email or in-app message is sent until a delivery service is connected.
        </AlertBanner>
        <ErrorBanner message={error} />
        <Field label="Title" htmlFor="notify-title" required>
          <Input id="notify-title" value={title} onChange={(event) => setTitle(event.target.value)} maxLength={90} />
        </Field>
        <Field label="Message" htmlFor="notify-message" required>
          <Textarea id="notify-message" value={message} onChange={(event) => setMessage(event.target.value)} className="min-h-24" />
        </Field>
        <fieldset className="space-y-1.5">
          <legend className="mb-1 text-[0.8125rem] font-medium text-foreground">Audience</legend>
          <RadioGroup value={audience} onValueChange={(value) => setAudience(value as typeof audience)} className="grid gap-1.5 sm:grid-cols-2">
            {(
              [
                { value: "organisation_admins", label: "Organisation admins" },
                { value: "all_users", label: "All users" },
              ] as const
            ).map((option) => (
              <Label key={option.value} className={cn("flex cursor-pointer items-center gap-2 rounded-sm border px-3 py-2 font-normal", audience === option.value ? "border-primary/40 bg-primary-subtle" : "border-border")}>
                <RadioGroupItem value={option.value} />
                {option.label}
              </Label>
            ))}
          </RadioGroup>
        </fieldset>
      </FlowDialog>
      {guard.guardDialog}
    </>
  );
}
