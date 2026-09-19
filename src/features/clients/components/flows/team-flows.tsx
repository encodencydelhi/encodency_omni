"use client";

import { ArrowLeftIcon, ArrowRightIcon, CheckIcon, XIcon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { AlertBanner } from "@/components/shared/alert-banner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ErrorBanner, FlowDialog, Stepper, SubmitButton } from "@/features/companies/components/flows/flow-kit";
import { Field } from "@/features/companies/components/primitives";
import { companySectionHref } from "@/features/companies/data/config";
import { cn } from "@/lib/utils/cn";
import { ORGANISATION_ROLE } from "@/types/domain/user";
import { ACCESS_LEVEL_META, ACCESS_LEVEL_PERMISSIONS } from "../../data/config";
import { describeError, useClientMutations } from "../../data/hooks";
import { defaultAccessLevel } from "../../data/selectors";
import type { ClientAccessLevel, ClientAssignmentView, ClientSummary, EligibleMember } from "../../data/types";
import { AccessLevelBadge } from "../status-badges";

const LEVELS: ClientAccessLevel[] = ["admin", "editor", "viewer"];
const NONE = "__none__";

function PermissionList({ level }: { level: ClientAccessLevel }) {
  return (
    <ul className="divide-y divide-border rounded-sm border border-border" aria-label={`Effective permissions for ${ACCESS_LEVEL_META[level].label}`}>
      {ACCESS_LEVEL_PERMISSIONS[level].map((permission) => (
        <li key={permission.label} className="flex items-center justify-between gap-3 px-3 py-1.5 text-[0.8125rem]">
          <span className={permission.allowed ? "text-foreground" : "text-muted-foreground"}>{permission.label}</span>
          <span className={cn("inline-flex items-center gap-1 text-2xs font-medium", permission.allowed ? "text-success" : "text-muted-foreground")}>
            {permission.allowed ? <CheckIcon className="size-3" strokeWidth={3} aria-hidden /> : <XIcon className="size-3" aria-hidden />}
            {permission.allowed ? "Allowed" : "Not allowed"}
          </span>
        </li>
      ))}
    </ul>
  );
}

function LevelPicker({ value, onChange, idPrefix }: { value: ClientAccessLevel; onChange: (level: ClientAccessLevel) => void; idPrefix: string }) {
  return (
    <RadioGroup value={value} onValueChange={(next) => onChange(next as ClientAccessLevel)} className="gap-1.5" aria-label="Client access level">
      {LEVELS.map((level) => (
        <div key={level} className={cn("flex items-start gap-2.5 rounded-sm border px-3 py-2", value === level ? "border-primary/40 bg-primary-subtle/50" : "border-border")}>
          <RadioGroupItem value={level} id={`${idPrefix}-${level}`} className="mt-0.5" />
          <Label htmlFor={`${idPrefix}-${level}`} className="flex-1 cursor-pointer font-normal">
            <span className="block text-[0.8125rem] font-medium text-foreground">{ACCESS_LEVEL_META[level].label}</span>
            <span className="block text-2xs text-muted-foreground">
              {level === "admin" ? "Runs the client, including its team and connections." : level === "editor" ? "Creates, edits and publishes content." : "Views analytics and reports only."}
            </span>
          </Label>
        </div>
      ))}
    </RadioGroup>
  );
}

const SCOPE_NOTE = "Client access applies to this client only. It does not change the person's company role or their access to other clients.";

/* ------------------------------------------------------------------ */
/* Assign - four steps                                                 */
/* ------------------------------------------------------------------ */

export function AssignMemberFlow({ summary, members, onClose }: { summary: ClientSummary; members: EligibleMember[]; onClose: () => void }) {
  const mutations = useClientMutations();
  const available = members.filter((member) => !member.alreadyAssigned);
  const [step, setStep] = useState(0);
  const [membershipId, setMembershipId] = useState<string>("");
  const [level, setLevel] = useState<ClientAccessLevel>("editor");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const member = available.find((item) => item.membershipId === membershipId);

  const choose = (id: string) => {
    setMembershipId(id);
    const picked = available.find((item) => item.membershipId === id);
    if (picked) setLevel(defaultAccessLevel(picked.companyRole));
  };

  const submit = async () => {
    if (!member) return;
    setPending(true);
    setError(null);
    try {
      await mutations.assignMember(summary.client.id, { membershipId: member.membershipId, level });
      toast.success(`${member.name} now has ${ACCESS_LEVEL_META[level].label} access to ${summary.client.name}`);
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
      title="Assign member"
      description={`Give a member of ${summary.company.name} access to ${summary.client.name}.`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={pending} className="mr-auto">
            Cancel
          </Button>
          {step > 0 ? (
            <Button variant="outline" onClick={() => setStep(step - 1)} disabled={pending}>
              <ArrowLeftIcon />
              Back
            </Button>
          ) : null}
          {step < 3 ? (
            <Button onClick={() => setStep(step + 1)} disabled={step === 0 && !member}>
              Next
              <ArrowRightIcon />
            </Button>
          ) : (
            <SubmitButton pending={pending} onClick={() => void submit()}>
              Assign member
            </SubmitButton>
          )}
        </>
      }
    >
      <Stepper steps={["Member", "Access level", "Permissions", "Confirm"]} current={step} />
      <ErrorBanner message={error} />

      {step === 0 ? (
        available.length === 0 ? (
          <div className="flex flex-col items-start gap-2 rounded-sm border border-dashed border-border-strong px-3 py-4">
            <p className="text-[0.8125rem] text-foreground">Everyone with an active membership in {summary.company.name} already has access to this client.</p>
            <p className="text-2xs text-muted-foreground">Only active members of the same company can be assigned. Invite or reactivate people in the company first.</p>
            <Button asChild variant="outline" size="sm">
              <Link href={companySectionHref(summary.company.id, "users")}>Open Company Users</Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-1.5">
            <p className="text-2xs text-muted-foreground">Only active members of {summary.company.name} are listed.</p>
            <RadioGroup value={membershipId} onValueChange={choose} className="max-h-64 gap-0 divide-y divide-border overflow-y-auto rounded-sm border border-border scrollbar-thin" aria-label="Member to assign">
              {available.map((item) => (
                <div key={item.membershipId} className="flex items-center gap-2.5 px-3 py-2">
                  <RadioGroupItem value={item.membershipId} id={`assign-${item.membershipId}`} />
                  <Label htmlFor={`assign-${item.membershipId}`} className="min-w-0 flex-1 cursor-pointer font-normal">
                    <span className="block truncate text-[0.8125rem] font-medium text-foreground">{item.name}</span>
                    <span className="block truncate text-2xs text-muted-foreground">{item.email} · {ORGANISATION_ROLE[item.companyRole].label}</span>
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>
        )
      ) : null}

      {step === 1 ? (
        <div className="space-y-2">
          <p className="text-[0.8125rem] text-foreground">Access level for <span className="font-medium">{member?.name}</span></p>
          <LevelPicker value={level} onChange={setLevel} idPrefix="assign-level" />
        </div>
      ) : null}

      {step === 2 ? (
        <div className="space-y-2">
          <p className="text-[0.8125rem] text-foreground">
            What <span className="font-medium">{member?.name}</span> can do in <span className="font-medium">{summary.client.name}</span> as {ACCESS_LEVEL_META[level].label}:
          </p>
          <PermissionList level={level} />
          <p className="text-2xs text-muted-foreground">{SCOPE_NOTE}</p>
        </div>
      ) : null}

      {step === 3 && member ? (
        <div className="space-y-2">
          <dl className="divide-y divide-border rounded-sm border border-border px-3 text-[0.8125rem]">
            <div className="flex justify-between gap-3 py-1.5"><dt className="text-muted-foreground">Member</dt><dd className="text-foreground">{member.name}</dd></div>
            <div className="flex justify-between gap-3 py-1.5"><dt className="text-muted-foreground">Company role</dt><dd className="text-foreground">{ORGANISATION_ROLE[member.companyRole].label} (unchanged)</dd></div>
            <div className="flex justify-between gap-3 py-1.5"><dt className="text-muted-foreground">Client</dt><dd className="text-foreground">{summary.client.name}</dd></div>
            <div className="flex justify-between gap-3 py-1.5"><dt className="text-muted-foreground">Client access</dt><dd><AccessLevelBadge level={level} /></dd></div>
          </dl>
          <p className="text-2xs text-muted-foreground">{SCOPE_NOTE}</p>
        </div>
      ) : null}
    </FlowDialog>
  );
}

/* ------------------------------------------------------------------ */
/* Change access                                                       */
/* ------------------------------------------------------------------ */

export function ChangeAccessFlow({ summary, member, onClose }: { summary: ClientSummary; member: ClientAssignmentView; onClose: () => void }) {
  const mutations = useClientMutations();
  const [level, setLevel] = useState<ClientAccessLevel>(member.level);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setPending(true);
    setError(null);
    try {
      await mutations.changeAccess(summary.client.id, { membershipId: member.membershipId, level });
      toast.success(`${member.name} is now ${ACCESS_LEVEL_META[level].label} on ${summary.client.name}`);
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
      title={`Change access for ${member.name}`}
      description={`Currently ${ACCESS_LEVEL_META[member.level].label} on ${summary.client.name}.`}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <SubmitButton pending={pending} disabled={level === member.level} onClick={() => void submit()}>
            Save access level
          </SubmitButton>
        </>
      }
    >
      <ErrorBanner message={error} />
      <LevelPicker value={level} onChange={setLevel} idPrefix="change-level" />
      <div className="space-y-1">
        <p className="text-[0.8125rem] font-medium text-foreground">Effective permissions</p>
        <PermissionList level={level} />
      </div>
      <p className="text-2xs text-muted-foreground">{SCOPE_NOTE}</p>
    </FlowDialog>
  );
}

/* ------------------------------------------------------------------ */
/* Remove access                                                       */
/* ------------------------------------------------------------------ */

export function RemoveAccessFlow({ summary, member, others, onClose }: { summary: ClientSummary; member: ClientAssignmentView; others: ClientAssignmentView[]; onClose: () => void }) {
  const mutations = useClientMutations();
  const replacements = others.filter((item) => item.membershipId !== member.membershipId && item.membershipStatus === "active");
  const [newLeadId, setNewLeadId] = useState<string>(NONE);
  const [note, setNote] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastActive = member.membershipStatus === "active" && replacements.length === 0;

  const submit = async () => {
    setPending(true);
    setError(null);
    try {
      await mutations.removeAccess(summary.client.id, { membershipId: member.membershipId, newLeadId: member.isLead && newLeadId !== NONE ? newLeadId : null, note: note.trim() });
      toast.success(`${member.name} no longer has access to ${summary.client.name}`);
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
      title={`Remove ${member.name}'s access?`}
      description={`This removes access to ${summary.client.name} only.`}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <SubmitButton pending={pending} variant="destructive" onClick={() => void submit()}>
            Remove access
          </SubmitButton>
        </>
      }
    >
      <ErrorBanner message={error} />
      <ul className="space-y-1 rounded-sm border border-border bg-surface-sunken px-3 py-2 text-[0.8125rem] text-foreground">
        <li>{member.name} will no longer be able to open {summary.client.name}.</li>
        <li className="text-muted-foreground">Their account, company membership and access to other clients are not affected.</li>
        <li className="text-muted-foreground">Nothing they created in this client is deleted.</li>
      </ul>

      {member.isLead ? (
        <AlertBanner tone="warning" title={`${member.name} is the client lead`}>
          {replacements.length > 0 ? "Choose another assigned member to lead, or leave the client without a lead." : "There is no other active member to take over, so the client will have no lead."}
        </AlertBanner>
      ) : null}
      {member.isLead && replacements.length > 0 ? (
        <Field label="New client lead" htmlFor="remove-new-lead" hint="Only active members already assigned to this client.">
          <Select value={newLeadId} onValueChange={setNewLeadId}>
            <SelectTrigger id="remove-new-lead"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>No lead</SelectItem>
              {replacements.map((item) => (
                <SelectItem key={item.membershipId} value={item.membershipId}>{item.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      ) : null}
      {lastActive ? (
        <AlertBanner tone="warning" title="Last active member">
          After this, {summary.client.name} will have no active members and will show as needing attention until someone is assigned.
        </AlertBanner>
      ) : null}

      <Field label="Note (optional)" htmlFor="remove-note">
        <Textarea id="remove-note" rows={2} maxLength={300} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Added to the client's activity history" />
      </Field>
    </FlowDialog>
  );
}
