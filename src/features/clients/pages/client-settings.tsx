"use client";

import { ArchiveIcon, CirclePauseIcon, CirclePlayIcon, ClipboardCheckIcon, PencilIcon } from "lucide-react";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { AlertBanner } from "@/components/shared/alert-banner";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { KeyValue, Panel } from "@/features/companies/components/primitives";
import { relativeTime } from "@/features/companies/data/clock";
import { formatDate, formatDateTime } from "@/lib/utils/format";
import { ClientError, PanelSkeleton } from "../components/states";
import { OnboardingBadge, WorkspaceBadge } from "../components/status-badges";
import { useClientActions } from "../components/use-client-actions";
import { ARCHIVE_SLOT_POLICY, ONBOARDING_STEPS, PAUSE_REASON_LABEL, REPORTING_PERIODS } from "../data/config";
import { describeError, useClientMutations, useClientSettings, useClientTeam } from "../data/hooks";
import type { ClientSettingsData, OnboardingStepKey } from "../data/types";
import { useClientId } from "./client-shell";

const NONE = "__none__";

const EVENT_LABEL = { created: "Created", paused: "Paused", resumed: "Resumed", archived: "Archived" } as const;

function Row({ label, hint, children }: { label: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
      <div className="min-w-0">
        <p className="text-[0.8125rem] font-medium text-foreground">{label}</p>
        {hint ? <p className="text-2xs text-muted-foreground">{hint}</p> : null}
      </div>
      <div className="min-w-0 sm:w-64">{children}</div>
    </div>
  );
}

function SettingsBody({ data }: { data: ClientSettingsData }) {
  const mutations = useClientMutations();
  const { capabilities, openFlow, dialogs } = useClientActions();
  const team = useClientTeam(data.summary.client.id);
  const { summary, lifecycle } = data;
  const id = summary.client.id;
  const archived = summary.workspace === "archived";
  const canManage = capabilities.canManageClientSettings && !archived;
  const activeMembers = (team.data?.assignments ?? []).filter((member) => member.membershipStatus === "active");
  const [busy, setBusy] = useState<string | null>(null);

  const run = async (key: string, work: Promise<unknown>, success: string) => {
    setBusy(key);
    try {
      await work;
      toast.success(success);
    } catch (failure) {
      toast.error(describeError(failure).message);
    } finally {
      setBusy(null);
    }
  };

  const websites = summary.websites;
  const site = summary.primaryWebsite;

  return (
    <div className="grid grid-cols-1 gap-1 lg:grid-cols-2">
      <Panel
        title="Identity"
        action={
          capabilities.canEditClient && !archived ? (
            <Button variant="outline" size="sm" onClick={() => openFlow({ kind: "edit", summary })}>
              <PencilIcon />
              Edit Client
            </Button>
          ) : undefined
        }
      >
        <dl className="divide-y divide-border">
          <KeyValue label="Client name">{summary.client.name}</KeyValue>
          <KeyValue label="Display name">{summary.profile.displayName}</KeyValue>
          <KeyValue label="Client ID">{summary.displayId}</KeyValue>
          <KeyValue label="Industry">{summary.profile.industry}</KeyValue>
          <KeyValue label="Contact email">{summary.profile.contactEmail ?? <span className="text-muted-foreground">Not set</span>}</KeyValue>
          <KeyValue label="Parent company">{summary.company.name} <span className="text-2xs text-muted-foreground">(read-only)</span></KeyValue>
          <KeyValue label="Created">{formatDate(data.createdAt)} by {data.createdBy}</KeyValue>
        </dl>
      </Panel>

      <Panel title="Workspace defaults" description="Change timezone, language and the reporting period in Edit Client.">
        <dl className="divide-y divide-border">
          <KeyValue label="Timezone">{summary.profile.timezone}</KeyValue>
          <KeyValue label="Language">{summary.profile.language}</KeyValue>
          <KeyValue label="Default reporting period">{REPORTING_PERIODS.find((period) => period.value === summary.profile.reportingPeriod)?.label}</KeyValue>
        </dl>
        <div className="divide-y divide-border border-t border-border">
          <Row label="Primary website" hint={websites.length === 0 ? "No website is configured. Add one in Website & SEO." : undefined}>
            <Select
              value={site?.id ?? NONE}
              disabled={!canManage || websites.length < 2 || busy === "site"}
              onValueChange={(value) => value !== NONE && void run("site", mutations.setPrimaryWebsite(id, value), "Primary website updated")}
            >
              <SelectTrigger aria-label="Primary website"><SelectValue /></SelectTrigger>
              <SelectContent>
                {site ? null : <SelectItem value={NONE}>Not configured</SelectItem>}
                {websites.map((item) => (
                  <SelectItem key={item.id} value={item.id}>{item.domain}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Row>
          <Row label="Client lead" hint="An active member already assigned to this client.">
            <Select
              value={summary.lead?.membershipId ?? NONE}
              disabled={!canManage || team.isPending || busy === "lead"}
              onValueChange={(value) => void run("lead", mutations.setLead(id, value === NONE ? null : value), value === NONE ? "Client lead removed" : "Client lead updated")}
            >
              <SelectTrigger aria-label="Client lead"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>No lead</SelectItem>
                {activeMembers.map((member) => (
                  <SelectItem key={member.membershipId} value={member.membershipId}>{member.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Row>
        </div>
      </Panel>

      <div id="onboarding" className="scroll-mt-28">
        <Panel
          title="Onboarding"
          description={"Choose which steps must be done for onboarding to be Completed. Optional steps never block completion."}
          action={<OnboardingBadge status={summary.onboarding.status} />}
        >
          <ul className="divide-y divide-border">
            {ONBOARDING_STEPS.map((step) => {
              const view = summary.onboarding.steps.find((item) => item.key === step.key);
              const required = data.onboarding.required[step.key];
              return (
                <li key={step.key} className="flex items-center justify-between gap-3 py-2">
                  <div className="min-w-0">
                    <p className="text-[0.8125rem] text-foreground">{step.label}</p>
                    <p className="text-2xs text-muted-foreground">
                      {view?.done ? "Done" : "Not done"} · {view?.detail ?? step.hint}
                    </p>
                  </div>
                  <label className="flex shrink-0 items-center gap-2 text-2xs text-muted-foreground">
                    {required ? "Required" : "Optional"}
                    <Switch
                      checked={required}
                      disabled={!canManage || busy === "onboarding"}
                      aria-label={`${step.label} is required`}
                      onCheckedChange={(next) => {
                        const requirements: Record<OnboardingStepKey, boolean> = { ...data.onboarding.required, [step.key]: next };
                        void run("onboarding", mutations.setOnboardingRequirements(id, requirements), "Onboarding requirements updated");
                      }}
                    />
                  </label>
                </li>
              );
            })}
          </ul>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
            <p className="text-2xs text-muted-foreground">
              {data.onboarding.accessReviewedAt ? `Access reviewed ${formatDate(data.onboarding.accessReviewedAt)} by ${data.onboarding.accessReviewedBy}` : "Workspace access has not been reviewed."}
            </p>
            {canManage ? (
              <Button variant="outline" size="sm" disabled={busy === "review"} onClick={() => void run("review", mutations.markAccessReviewed(id), "Access marked as reviewed")}>
                <ClipboardCheckIcon />
                Mark access reviewed
              </Button>
            ) : null}
          </div>
        </Panel>
      </div>

      <Panel title="Ownership" description="Two different roles: the company's own lead for this client, and the OmniPlatform staff member who reviews it.">
        <div className="divide-y divide-border">
          <Row label="Client lead (company)" hint="Someone from the parent company. Set above or in Edit Client.">
            <p className="text-[0.8125rem] text-foreground">{summary.lead?.name ?? <span className="text-warning">Not assigned</span>}</p>
          </Row>
          <Row label="Platform internal reviewer" hint="OmniPlatform staff only. Never shown to the company.">
            <Select
              value={summary.platformReviewer?.id ?? NONE}
              disabled={!canManage || busy === "reviewer"}
              onValueChange={(value) => void run("reviewer", mutations.setPlatformReviewer(id, value === NONE ? null : value), value === NONE ? "Reviewer removed" : "Reviewer updated")}
            >
              <SelectTrigger aria-label="Platform internal reviewer"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>Unassigned</SelectItem>
                {data.staff.filter((member) => member.status === "active").map((member) => (
                  <SelectItem key={member.id} value={member.id}>{member.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Row>
        </div>
      </Panel>

      <Panel title="Operational controls" description="These reflect the workspace status. They are not independent switches.">
        <ul className="divide-y divide-border">
          {[
            ["Scheduled publishing", `${summary.operations.scheduledPosts} scheduled`],
            ["Automations", `${data.automations} active`],
            ["Channel syncing", `${summary.counts.connections} connected`],
            ["Website monitoring", site ? MONITORING_LABEL[site.monitoring] : "No website"],
          ].map(([label, value]) => (
            <li key={label} className="flex items-center justify-between gap-3 py-2">
              <div className="min-w-0">
                <p className="text-[0.8125rem] text-foreground">{label}</p>
                <p className="text-2xs text-muted-foreground">{value}</p>
              </div>
              <span className="shrink-0 rounded-sm border border-border-strong bg-neutral-subtle px-1.5 py-0.5 text-[11px] font-medium text-neutral">
                {summary.workspace === "active" ? "Running" : summary.workspace === "paused" ? "Held with workspace" : "Retired"}
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-2xs text-muted-foreground">
          Pausing or archiving records the status here. Stopping real publishing, automations and syncing is done by the backend once it is connected; this demo does not run any workers.
        </p>
      </Panel>

      <Panel title="Lifecycle" action={<WorkspaceBadge status={summary.workspace} />}>
        {summary.pause ? (
          <div className="mb-2 rounded-sm border border-border bg-surface-sunken px-3 py-2 text-[0.8125rem]">
            <p className="font-medium text-foreground">Paused {formatDate(summary.pause.pausedAt)} by {summary.pause.pausedBy}</p>
            <p className="text-muted-foreground">{PAUSE_REASON_LABEL[summary.pause.reason]}{summary.pause.note ? ` - ${summary.pause.note}` : ""}</p>
          </div>
        ) : null}
        <div className="flex flex-wrap gap-1.5">
          {summary.workspace === "active" && capabilities.canPauseClient ? (
            <Button variant="outline" size="sm" onClick={() => openFlow({ kind: "pause", targets: [summary] })}>
              <CirclePauseIcon />
              Pause Client
            </Button>
          ) : null}
          {summary.workspace === "paused" && capabilities.canResumeClient ? (
            <Button variant="outline" size="sm" onClick={() => openFlow({ kind: "resume", targets: [summary] })}>
              <CirclePlayIcon />
              Resume Client
            </Button>
          ) : null}
          {!archived && capabilities.canArchiveClient ? (
            <Button variant="outline" size="sm" className="text-danger" onClick={() => openFlow({ kind: "archive", targets: [summary] })}>
              <ArchiveIcon />
              Archive Client
            </Button>
          ) : null}
        </div>
        {archived ? (
          <div className="mt-2">
            <AlertBanner tone="info" title="Archived">
              Archived {lifecycle.archive ? formatDate(lifecycle.archive.archivedAt) : ""}. Data is retained. {ARCHIVE_SLOT_POLICY}
            </AlertBanner>
          </div>
        ) : (
          <p className="mt-2 text-2xs text-muted-foreground">{ARCHIVE_SLOT_POLICY} There is no permanent delete.</p>
        )}
        <h4 className="mt-3 text-[0.8125rem] font-semibold text-foreground">History</h4>
        <ol className="mt-1 divide-y divide-border">
          {[...lifecycle.events].reverse().map((event) => (
            <li key={event.id} className="flex items-center justify-between gap-3 py-1.5 text-[0.8125rem]">
              <span className="text-foreground">
                {EVENT_LABEL[event.type]} <span className="text-2xs text-muted-foreground">by {event.by}{event.reason ? ` · ${event.reason.replace(/_/g, " ")}` : ""}</span>
              </span>
              <span className="shrink-0 whitespace-nowrap text-2xs text-muted-foreground" title={formatDateTime(event.at)}>{relativeTime(event.at)}</span>
            </li>
          ))}
        </ol>
      </Panel>
      {dialogs}
    </div>
  );
}

const MONITORING_LABEL = { active: "Monitoring active", paused: "Monitoring paused", stopped: "Monitoring stopped" } as const;

export function ClientSettingsPage() {
  const clientId = useClientId();
  const query = useClientSettings(clientId);

  if (query.error) return <ClientError subject="Settings" error={query.error} onRetry={() => void query.refetch()} />;
  if (!query.data) {
    return (
      <div className="grid grid-cols-1 gap-1 lg:grid-cols-2">
        {Array.from({ length: 4 }, (_, index) => (
          <PanelSkeleton key={index} rows={5} />
        ))}
      </div>
    );
  }
  return <SettingsBody data={query.data} />;
}
