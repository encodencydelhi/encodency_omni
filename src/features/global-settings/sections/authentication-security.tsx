"use client";

import { CheckCircle2Icon, CircleAlertIcon, ServerCogIcon } from "lucide-react";
import Link from "next/link";
import { AlertBanner } from "@/components/shared/alert-banner";
import { Badge } from "@/components/ui/badge";
import { Panel } from "@/features/companies/components/primitives";
import { PanelSkeleton } from "@/features/companies/components/states";
import { SECURITY_TABS, routes, type SecurityTab } from "../data/config";
import { useSecurityReview } from "../data/hooks";
import type { ConfigurationChange, ConfigurationSnapshot, SettingValues } from "../data/types";
import { SectionData, SettingGroup, SubTabs, useTab, ViewOnlyNotice } from "../components/section-parts";
import { SettingsError } from "../components/states";
import { useSectionEditor, type SectionEditor } from "../components/use-section-editor";
import { formatSettingValue, relativeLabel } from "../data/formatting";
import { getDefinition } from "../data/registry";

const SENSITIVE_ACTIONS = ["Changing Mandatory MFA Requirements",
  "Changing other security-critical settings",
  "Changing high-impact data policies (retention, export, deletion)",
  "Enabling an access-restricting maintenance mode",
];

function ScopeNote() {
  return (
    <AlertBanner tone="info" title="Policy, Not Enforcement">
      These values define the platform policy. The frontend records them; it does not lock accounts, challenge MFA or end sessions. Enforcement belongs to the authentication backend.
    </AlertBanner>
  );
}

function TripleNote() {
  const cards = [
    { title: "Policy Requirement", body: "What is required of accounts. Set here, and recorded as configuration." },
    { title: "Individual Enrolment", body: "Whether each person has enrolled. Managed per account in Internal Team / Users." },
    { title: "Backend Enforcement", body: "Whether sign-in is actually refused without MFA. Not connected in this phase." },
  ];
  return (
    <div className="grid grid-cols-1 gap-1 sm:grid-cols-3">
      {cards.map((card) => (
        <div key={card.title} className="rounded-sm border border-border bg-card px-3 py-2">
          <p className="text-[0.8125rem] font-medium text-foreground">{card.title}</p>
          <p className="text-2xs text-muted-foreground">{card.body}</p>
        </div>
      ))}
      <p className="text-2xs text-muted-foreground sm:col-span-3">
        Secrets, enrolment seeds and recovery codes are never shown or stored here. Reset and enrolment flows live with each account&apos;s security page.
      </p>
    </div>
  );
}

function SessionImpact({ saved, values }: { saved: SettingValues; values: SettingValues }) {
  const key = "security.sessions.idle_timeout_minutes";
  const definition = getDefinition(key);
  const changed = saved[key] !== values[key];
  return (
    <Panel title="Session Policy Impact" description="How the staff idle timeout compares. Saving does not end any session that is already open.">
      <dl className="grid grid-cols-2 gap-1 sm:grid-cols-4">
        {[
          ["Current Staff Idle Timeout", formatSettingValue(definition, saved[key])],
          ["Proposed", changed ? formatSettingValue(definition, values[key]) : "No Change"],
          ["Affected Scope", "Platform Staff"],
          ["Expected Behaviour", "Applies to sessions started after the backend enforces it"],
        ].map(([label, value]) => (
          <div key={label} className="rounded-sm border border-border bg-muted/30 px-3 py-2">
            <dt className="text-2xs font-medium uppercase tracking-wide text-muted-foreground">{label}</dt>
            <dd className="mt-0.5 text-[0.8125rem] font-medium text-foreground">{value}</dd>
          </div>
        ))}
      </dl>
    </Panel>
  );
}

function SecurityReview({ config }: { config: ConfigurationSnapshot }) {
  const query = useSecurityReview();
  if (query.error && !query.data) return <SettingsError subject="Security review" error={query.error} onRetry={() => void query.refetch()} />;
  if (!query.data) return <PanelSkeleton rows={5} />;
  const review = query.data;

  return (
    <div className="space-y-1">
      <AlertBanner tone={review.status === "configured" ? "success" : "warning"} title={review.status === "configured" ? "Configuration Is Complete" : "Configuration Needs Review"}>
        This describes the configuration only. It is not a score and makes no claim about real protection: nothing here is enforced until the backend is connected.
      </AlertBanner>
      <div className="grid grid-cols-1 gap-1 lg:grid-cols-2">
        <Panel title="Configured Requirements" description="Mandatory minimums currently set">
          <ul className="divide-y divide-border">
            {review.configured.map((item) => (
              <li key={item.key} className="flex items-center justify-between gap-3 py-1.5 text-[0.8125rem]">
                <span className="text-muted-foreground">{item.label}</span>
                <span className="text-right font-medium text-foreground">{item.value}</span>
              </li>
            ))}
          </ul>
        </Panel>
        <Panel title="Incomplete Configuration" description="Gaps in the configured requirements">
          {review.incomplete.length === 0 ? (
            <p className="flex items-center gap-2 text-[0.8125rem] text-muted-foreground"><CheckCircle2Icon className="size-4 text-success" aria-hidden />Nothing outstanding.</p>
          ) : (
            <ul className="space-y-1.5">
              {review.incomplete.map((item) => (
                <li key={item.key} className="flex items-start gap-2">
                  <CircleAlertIcon className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden />
                  <div>
                    <p className="text-[0.8125rem] font-medium text-foreground">{item.label}</p>
                    <p className="text-2xs text-muted-foreground">{item.detail}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
        <Panel title="Backend Enforcement Dependencies" description="Policies that only take effect once a service enforces them">
          <ul className="space-y-1.5">
            {review.backendDependencies.map((item) => (
              <li key={item.key} className="flex items-start gap-2 text-[0.8125rem]">
                <ServerCogIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
                <span className="text-foreground">{item.label}</span>
                <Badge tone="warning" className="ml-auto">Not Connected</Badge>
              </li>
            ))}
          </ul>
        </Panel>
        <Panel
          title="Pending Sensitive Changes"
          description="Held for review; not part of the effective configuration"
          action={<Link href={routes.history("pending")} className="text-2xs font-medium text-primary hover:underline">View Pending</Link>}
        >
          {review.pendingSensitive.length === 0 ? (
            <p className="text-[0.8125rem] text-muted-foreground">No sensitive changes are waiting.</p>
          ) : (
            <ul className="divide-y divide-border">
              {review.pendingSensitive.map((change) => (
                <li key={change.id} className="py-1.5 text-[0.8125rem]">
                  <span className="font-medium text-foreground">{change.settingName}</span>
                  <span className="block text-2xs text-muted-foreground">Requested by {change.actorName} {relativeLabel(change.at)}</span>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-2 border-t border-border pt-2 text-2xs text-muted-foreground">
            Last security configuration update: {review.lastUpdatedAt ? relativeLabel(review.lastUpdatedAt) : "Never"}. Configuration version {config.version.label}.
          </p>
        </Panel>
      </div>
    </div>
  );
}

function TabBody({ tab, editor, config }: { tab: SecurityTab; editor: SectionEditor; config: ConfigurationSnapshot }) {
  switch (tab) {
    case "login":
      return (
        <>
          <ScopeNote />
          <SettingGroup editor={editor} group="login" />
          <p className="text-2xs text-muted-foreground">
            Staff MFA is set under <Link href={routes.section("security", { tab: "mfa" })} className="font-medium text-primary hover:underline">MFA / TOTP</Link>. Lockout values describe the intended policy; no account is locked by this frontend.
          </p>
        </>
      );
    case "mfa":
      return (
        <>
          <TripleNote />
          <SettingGroup editor={editor} group="mfa" />
        </>
      );
    case "session":
      return (
        <>
          <SettingGroup editor={editor} group="session" />
          <SessionImpact saved={editor.saved} values={editor.values} />
        </>
      );
    case "password":
      return (
        <>
          <SettingGroup editor={editor} group="password" />
          <p className="text-2xs text-muted-foreground">Mandatory periodic password rotation is deliberately not offered. Reset email delivery and templates are managed in Notifications.</p>
        </>
      );
    case "sensitive":
      return (
        <>
          <SettingGroup editor={editor} group="sensitive" />
          <Panel title="Actions Classed As Sensitive" description="These changes always need the checks above. The frontend lists the checks; it cannot perform genuine verification.">
            <ul className="grid grid-cols-1 gap-1 sm:grid-cols-2">
              {SENSITIVE_ACTIONS.map((action) => (
                <li key={action} className="rounded-sm border border-border px-3 py-2 text-[0.8125rem] text-foreground">{action}</li>
              ))}
            </ul>
          </Panel>
        </>
      );
    default:
      return <SecurityReview config={config} />;
  }
}

function Editor({ config, pending }: { config: ConfigurationSnapshot; pending: ConfigurationChange[] }) {
  const editor = useSectionEditor("security", config, pending);
  const tab = useTab(SECURITY_TABS);
  return (
    <div className="space-y-3">
      <SubTabs tabs={SECURITY_TABS} current={tab} label="Authentication and security" />
      {!editor.canEdit ? <ViewOnlyNotice section="security" /> : null}
      {editor.banner}
      <div className="space-y-3">
        <TabBody tab={tab} editor={editor} config={config} />
      </div>
      {editor.bar}
      {editor.dialog}
    </div>
  );
}

export function AuthenticationSecuritySection() {
  return <SectionData>{({ config, pending }) => <Editor config={config} pending={pending} />}</SectionData>;
}
