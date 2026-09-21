"use client";

import Link from "next/link";
import { AlertBanner } from "@/components/shared/alert-banner";
import { KeyValue, Panel, StatCard, StatGrid } from "@/features/companies/components/primitives";
import { MiniTable } from "@/features/plans-subscriptions/components/mini-table";
import { operationalState } from "../../data/selectors";
import { ENVIRONMENTS, FLAG_TYPE, IMPLEMENTATION, STRATEGY, CHANGE_TYPE, flagRoutes } from "../../data/config";
import type { FlagDetail } from "../../data/repository";
import type { Environment } from "../../data/types";
import { ago, rolloutText } from "../../lib/format";
import { ChangeStatusBadge, RolloutCell, StateBadge } from "../badges";

/** What the flag is, where it stands in each environment, and what is waiting on it. */
export function OverviewTab({ detail, environment }: { detail: FlagDetail; environment: Environment }) {
  const { flag, row } = detail;
  const stats = row.stats;
  return (
    <div className="space-y-1">
      {flag.implementation === "not_implemented" ? <AlertBanner tone="danger" title="Feature Not Implemented">{IMPLEMENTATION.not_implemented.description} It cannot be enabled until the implementation status changes in the feature registry.</AlertBanner> : null}
      {flag.lifecycle === "deprecated" ? <AlertBanner tone="warning" title="Deprecated">This flag is marked for retirement. It still runs where it is enabled.</AlertBanner> : null}

      <StatGrid className="grid-cols-2 sm:grid-cols-4 min-[1600px]:grid-cols-7">
        <StatCard compact label="Eligible" value={stats.eligible} hint="Plan and subscription" />
        <StatCard compact label="Targeting Matched" value={stats.targetingMatched} hint="Before eligibility" />
        <StatCard compact label="Effective" value={`${stats.effective} / ${stats.totalCompanies}`} hint="Available now" tone={stats.effective > 0 ? "success" : "neutral"} />
        <StatCard compact label="Blocked" value={stats.blocked} hint="Targeted but unavailable" tone={stats.blocked > 0 ? "warning" : "neutral"} />
        <StatCard compact label="Plan Blocked" value={stats.blockedByPlan} hint="Not in plan" />
        <StatCard compact label="Dependency Blocked" value={stats.blockedByDependency} hint="Prerequisite missing" />
        <StatCard compact label="Integration Blocked" value={stats.blockedByIntegration} hint="Not connected or unhealthy" />
      </StatGrid>
      <p className="px-0.5 pb-1 text-2xs text-muted-foreground">Blocked reasons are counted independently, so a company can appear in more than one and the reasons need not add up to the blocked total.</p>

      <div className="grid grid-cols-1 gap-1 lg:grid-cols-2">
        <Panel title="Feature Definition">
          <p className="mb-2 text-[0.8125rem] text-muted-foreground">{flag.description}</p>
          <dl className="divide-y divide-border">
            <KeyValue label="Stable Key"><span className="font-mono">{flag.key}</span></KeyValue>
            <KeyValue label="Category">{flag.category}</KeyValue>
            <KeyValue label="Type">{FLAG_TYPE[flag.type].label}</KeyValue>
            <KeyValue label="Owner Team">{flag.ownerTeam}</KeyValue>
            <KeyValue label="Related Module">{flag.relatedModule}</KeyValue>
            <KeyValue label="Created">{ago(flag.createdAt)} by {flag.createdBy}</KeyValue>
            <KeyValue label="Last Updated">{ago(flag.updatedAt)} by {flag.updatedBy}</KeyValue>
            <KeyValue label="Documentation">{flag.documentation ? <a href={flag.documentation} target="_blank" rel="noreferrer" className="text-primary hover:underline">Open Link</a> : "Not Linked"}</KeyValue>
          </dl>
          {flag.knownLimitations.length > 0 ? (
            <div className="mt-2">
              <p className="text-2xs font-medium text-foreground">Known Limitations</p>
              <ul className="list-disc pl-4 text-2xs text-muted-foreground">{flag.knownLimitations.map((item) => <li key={item}>{item}</li>)}</ul>
            </div>
          ) : null}
        </Panel>

        <Panel title="Environments" description="The same flag can be configured differently in each environment." flush>
          <MiniTable
            caption="Environment configuration"
            rows={ENVIRONMENTS}
            getKey={(item) => item.value}
            columns={[
              { id: "env", header: "Environment", cell: (item) => <Link href={flagRoutes.flag(flag.key, item.value)} className={item.value === environment ? "font-semibold text-primary" : "font-medium text-foreground hover:underline"}>{item.label}</Link> },
              { id: "state", header: "State", cell: (item) => <StateBadge state={operationalState(flag.environments[item.value])} /> },
              { id: "rollout", header: "Rollout", cell: (item) => <RolloutCell config={flag.environments[item.value]} /> },
              { id: "version", header: "Version", align: "right", cell: (item) => <span className="tabular">v{flag.environments[item.value].version}</span> },
              { id: "updated", header: "Updated", hideBelow: "md", cell: (item) => <span className="whitespace-nowrap text-2xs text-muted-foreground">{ago(flag.environments[item.value].updatedAt)}</span> },
            ]}
          />
        </Panel>
      </div>

      <div className="grid grid-cols-1 gap-1 lg:grid-cols-2">
        <Panel title="Current Rollout">
          <dl className="divide-y divide-border">
            <KeyValue label="Strategy">{STRATEGY[row.config.strategy].label}</KeyValue>
            <KeyValue label="Size">{rolloutText(row.config)}</KeyValue>
            <KeyValue label="Configuration Version">v{row.config.version}</KeyValue>
            {row.config.emergencyOff ? <KeyValue label="Emergency Reason">{row.config.emergencyReason ?? "Not recorded"}</KeyValue> : null}
          </dl>
          <p className="mt-2 text-2xs text-muted-foreground">{STRATEGY[row.config.strategy].description}</p>
        </Panel>

        <Panel title="Waiting On A Decision" description="Drafts, requests for approval and planned changes for this environment." flush>
          <MiniTable
            caption="Open changes"
            rows={detail.changes}
            getKey={(change) => change.id}
            empty={<p className="px-3 pb-3 text-[0.8125rem] text-muted-foreground">No pending, scheduled or draft change in this environment.</p>}
            columns={[
              { id: "type", header: "Change", cell: (change) => <span className="font-medium text-foreground">{CHANGE_TYPE[change.type]}</span> },
              { id: "status", header: "Status", cell: (change) => <ChangeStatusBadge status={change.status} /> },
              { id: "by", header: "Requested", hideBelow: "md", cell: (change) => <span className="text-2xs text-muted-foreground">{change.requestedBy}, {ago(change.requestedAt)}</span> },
            ]}
          />
        </Panel>
      </div>
    </div>
  );
}
