"use client";

import { ArrowRightLeftIcon, KeyRoundIcon, LockIcon, LockOpenIcon, LogOutIcon, MailIcon, ShieldAlertIcon, ShieldCheckIcon, UsersIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { AlertBanner } from "@/components/shared/alert-banner";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { formatDate, formatDateTime } from "@/lib/utils/format";
import { ErrorBanner, FlowDialog, SubmitButton } from "../components/flows/flow-kit";
import { Field, KeyValue, Panel, StatCard, StatGrid } from "../components/primitives";
import { PanelSkeleton, SectionError, StatGridSkeleton } from "../components/states";
import { SeverityBadge } from "../components/status-badges";
import { useCompanyActions } from "../components/use-company-actions";
import { useCompanyCapabilities } from "../data/capability-provider";
import { relativeTime } from "../data/clock";
import { OWNER_STATE_LABEL, companySectionHref } from "../data/config";
import { describeError, useCompany, useCompanyMutations, useCompanySecurity } from "../data/hooks";
import type { CompanySecurityData } from "../data/repository";
import type { SecurityWarning } from "../data/types";
import { useCompanyId } from "./company-shell";

type SecurityAction = "require2fa" | "passwordReset" | "revoke" | "lock" | "unlock";

export function CompanySecurityPage() {
  const companyId = useCompanyId();
  const capabilities = useCompanyCapabilities();
  const query = useCompanySecurity(companyId);

  if (!capabilities.canViewCompanySecurity) {
    return <EmptyState icon={LockIcon} title="You do not have access to security data" description="Your role does not include permission to view a company's security posture. Ask a Super Admin to grant it." />;
  }
  if (query.error) return <SectionError subject="Security data" error={query.error} onRetry={() => void query.refetch()} />;
  if (!query.data) {
    return (
      <div className="space-y-1">
        <StatGridSkeleton count={7} className="grid-cols-2 sm:grid-cols-4 xl:grid-cols-7" />
        <div className="grid gap-1 lg:grid-cols-2">
          <PanelSkeleton rows={4} />
          <PanelSkeleton rows={4} />
        </div>
      </div>
    );
  }
  return <SecurityBody companyId={companyId} data={query.data} />;
}

function SecurityBody({ companyId, data }: { companyId: string; data: CompanySecurityData }) {
  const { security, owner, adoption, warnings } = data;
  const router = useRouter();
  const mutations = useCompanyMutations();
  const company = useCompany(companyId);
  const { capabilities, openFlow, dialogs } = useCompanyActions();
  const eventsRef = useRef<HTMLDivElement>(null);
  const [action, setAction] = useState<SecurityAction | null>(null);
  const manage = capabilities.canManageCompanySecurity;
  const operating = company.data?.company.accountStatus !== "archived";
  const can = manage && operating;

  const runWarning = async (warning: SecurityWarning) => {
    switch (warning.action.kind) {
      case "require_2fa":
        setAction("require2fa");
        return;
      case "resend_invitation":
        try {
          await mutations.resendOwnerInvitation(companyId);
          toast.success("Owner invitation renewed (demo - no email was sent)");
        } catch (failure) {
          toast.error(describeError(failure).message);
        }
        return;
      case "review_events":
        eventsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      case "transfer_ownership":
        if (company.data) openFlow({ kind: "transfer", summary: company.data });
        return;
      default:
        router.push(companySectionHref(companyId, "users"));
    }
  };

  const actionable = (warning: SecurityWarning) => {
    if (warning.action.kind === "open_users" || warning.action.kind === "review_events" || warning.action.kind === "review_client_access") return true;
    if (warning.action.kind === "transfer_ownership") return capabilities.canTransferOwnership && Boolean(company.data);
    return can;
  };

  return (
    <div className="space-y-1">
      <StatGrid className="grid-cols-2 sm:grid-cols-4 xl:grid-cols-7">
        <StatCard label="2FA adoption" value={`${adoption.percent}%`} hint={`${adoption.withTwoFactor} of ${adoption.totalUsers} users`} tone={adoption.percent >= 80 ? "success" : adoption.percent >= 50 ? "warning" : "danger"} />
        <StatCard label="Admins without 2FA" value={adoption.adminsWithout2fa.length} tone={adoption.adminsWithout2fa.length > 0 ? "warning" : "success"} />
        <StatCard label="Active sessions" value={security.activeSessions} hint={security.sessionRevocationRequestedAt ? "Revocation requested (demo)" : undefined} />
        <StatCard label="Account lockouts" value={security.accountLockouts} tone={security.accountLockouts > 0 ? "warning" : "neutral"} />
        <StatCard label="Owner" value={<span className="text-[0.8125rem]">{OWNER_STATE_LABEL[owner.state]}</span>} hint={owner.name} href={companySectionHref(companyId, "users", owner.email ? { q: owner.email } : undefined)} />
        <StatCard label="Security events" value={security.events.length} hint="Recorded" />
        <StatCard label="Allowed domains" value={security.allowedEmailDomains.length} hint={security.allowedEmailDomains.join(", ") || "None restricted"} />
      </StatGrid>

      {security.accessLock ? (
        <AlertBanner tone="danger" title="Company access lock recorded" action={manage ? <Button size="sm" variant="outline" onClick={() => setAction("unlock")}><LockOpenIcon />Unlock</Button> : undefined}>
          Locked by {security.accessLock.lockedBy} on {formatDate(security.accessLock.lockedAt)}: {security.accessLock.reason}. Demo only - access is not actually restricted.
        </AlertBanner>
      ) : null}
      {!manage ? <AlertBanner tone="info" title="Read-only">Your role can view this company&apos;s security posture but not change it.</AlertBanner> : null}

      <div className="grid gap-1 lg:grid-cols-3">
        <div className="space-y-1 lg:col-span-2">
          <Panel title="Security warnings" description={warnings.length > 0 ? `${warnings.length} to review` : undefined} flush>
            {warnings.length === 0 ? (
              <EmptyState icon={ShieldCheckIcon} size="sm" title="No security alerts" description="Ownership, administrators and sign-in activity look healthy." />
            ) : (
              <ul className="divide-y divide-border border-t border-border">
                {warnings.map((warning) => (
                  <li key={warning.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5">
                    <div className="min-w-0 space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <SeverityBadge severity={warning.severity} />
                        <p className="text-[0.8125rem] font-medium text-foreground">{warning.title}</p>
                      </div>
                      <p className="text-2xs text-muted-foreground">{warning.description}</p>
                    </div>
                    <Button variant="outline" size="sm" disabled={!actionable(warning)} onClick={() => void runWarning(warning)}>
                      {warning.action.label}
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <div ref={eventsRef} className="scroll-mt-24">
            <Panel title="Recent security events" flush>
              {security.events.length === 0 ? (
                <EmptyState icon={ShieldAlertIcon} size="sm" title="No security events" description="Sign-in and policy events for this company appear here." />
              ) : (
                <ul className="divide-y divide-border border-t border-border">
                  {security.events.slice(0, 10).map((event) => (
                    <li key={event.id} className="flex items-start justify-between gap-3 px-3 py-2">
                      <div className="min-w-0">
                        <p className="text-[0.8125rem] text-foreground">{event.summary}</p>
                        <p className="text-2xs text-muted-foreground" title={formatDateTime(event.at)}>{event.actorLabel} · {relativeTime(event.at)}</p>
                      </div>
                      {event.severity !== "info" ? <SeverityBadge severity={event.severity} /> : null}
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </div>
        </div>

        <div className="space-y-1">
          <Panel title="Current policies">
            <dl className="divide-y divide-border">
              <KeyValue label="Require 2FA">{security.policies.require2fa ? "Yes" : "No"}</KeyValue>
              <KeyValue label="Password policy"><span className="capitalize">{security.policies.passwordPolicy}</span></KeyValue>
              <KeyValue label="Session timeout">{security.policies.sessionTimeoutMinutes / 60} hours</KeyValue>
              <KeyValue label="Single sign-on">{security.policies.ssoEnabled ? "Enabled" : "Off"}</KeyValue>
              <KeyValue label="IP allowlist">{security.policies.ipAllowlistEnabled ? "Enabled" : "Off"}</KeyValue>
              <KeyValue label="Allowed domains">{security.allowedEmailDomains.join(", ") || "Any"}</KeyValue>
              <KeyValue label="Password reset">{security.passwordResetRequestedAt ? `Requested ${relativeTime(security.passwordResetRequestedAt)} (demo)` : "-"}</KeyValue>
            </dl>
          </Panel>

          <Panel title="Actions" description="Demo mode records the request and its audit entry. It never ends a session or changes a password.">
            <div className="flex flex-col gap-1.5">
              <Button variant="outline" size="sm" className="justify-start" disabled={!can || security.policies.require2fa} onClick={() => setAction("require2fa")}>
                <ShieldCheckIcon />
                {security.policies.require2fa ? "2FA already required" : "Require 2FA"}
              </Button>
              <Button variant="outline" size="sm" className="justify-start" disabled={!can} onClick={() => setAction("passwordReset")}>
                <KeyRoundIcon />
                Require password reset
              </Button>
              <Button variant="outline" size="sm" className="justify-start" disabled={!can} onClick={() => setAction("revoke")}>
                <LogOutIcon />
                Revoke sessions
              </Button>
              <Button variant="outline" size="sm" className="justify-start" disabled={!can || security.accessLock !== null} onClick={() => setAction("lock")}>
                <LockIcon />
                Lock company access
              </Button>
              <Button variant="outline" size="sm" className="justify-start" disabled={!capabilities.canTransferOwnership || !company.data || !operating} onClick={() => company.data && openFlow({ kind: "transfer", summary: company.data })}>
                <ArrowRightLeftIcon />
                Transfer ownership
              </Button>
              <Button variant="outline" size="sm" className="justify-start" onClick={() => eventsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}>
                <ShieldAlertIcon />
                Review security events
              </Button>
              <Button asChild variant="outline" size="sm" className="justify-start">
                <Link href={companySectionHref(companyId, "users")}>
                  <UsersIcon />
                  Review users
                </Link>
              </Button>
            </div>
            {security.sessionRevocationRequestedAt ? <p className="mt-2 flex items-center gap-1 text-2xs text-muted-foreground"><MailIcon className="size-3" aria-hidden />Session revocation requested {relativeTime(security.sessionRevocationRequestedAt)} (demo).</p> : null}
          </Panel>
        </div>
      </div>

      {action ? <SecurityActionDialog companyId={companyId} companyName={company.data?.company.name ?? "this company"} action={action} onClose={() => setAction(null)} /> : null}
      {dialogs}
    </div>
  );
}

const COPY: Record<SecurityAction, { title: string; body: string; submit: string; destructive: boolean }> = {
  require2fa: { title: "Require 2FA for the whole company?", body: "Every user without 2FA will be required to enrol at next sign-in. Demo mode records the policy but does not enforce it.", submit: "Require 2FA", destructive: false },
  passwordReset: { title: "Require a password reset?", body: "Every user would be asked to choose a new password. Demo mode records the request; no password is changed and no email is sent.", submit: "Require password reset", destructive: true },
  revoke: { title: "Revoke all sessions?", body: "This would sign every user out of the organisation. Demo mode records the request only - no session is ended.", submit: "Revoke sessions", destructive: true },
  lock: { title: "Lock company access?", body: "This would block all users of the organisation from signing in. Demo mode records the lock but does not enforce it.", submit: "Lock access", destructive: true },
  unlock: { title: "Unlock company access?", body: "Clears the recorded access lock.", submit: "Unlock access", destructive: false },
};

function SecurityActionDialog({ companyId, companyName, action, onClose }: { companyId: string; companyName: string; action: SecurityAction; onClose: () => void }) {
  const mutations = useCompanyMutations();
  const [reason, setReason] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const copy = COPY[action];
  const needsReason = action === "lock";

  const run = async () => {
    setPending(true);
    setError(null);
    try {
      if (action === "require2fa") await mutations.requireCompanyTwoFactor(companyId);
      else if (action === "passwordReset") await mutations.requirePasswordReset(companyId);
      else if (action === "revoke") await mutations.revokeSessions(companyId);
      else await mutations.setAccessLock(companyId, { locked: action === "lock", reason: reason.trim() });
      toast.success(`${copy.submit}: recorded in the demo workspace`);
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
      title={copy.title}
      description={`Company: ${companyName}`}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={pending}>Cancel</Button>
          <SubmitButton pending={pending} variant={copy.destructive ? "destructive" : "default"} disabled={needsReason && reason.trim().length < 3} onClick={run}>
            {copy.submit}
          </SubmitButton>
        </>
      }
    >
      <ErrorBanner message={error} />
      <AlertBanner tone="warning" title="Demo mode">{copy.body}</AlertBanner>
      {needsReason ? (
        <Field label="Reason" htmlFor="lock-reason" required>
          <Textarea id="lock-reason" value={reason} onChange={(event) => setReason(event.target.value)} className="min-h-16" />
        </Field>
      ) : null}
    </FlowDialog>
  );
}
