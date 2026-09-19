"use client";

import { ArrowRightIcon, CircleCheckIcon, ExternalLinkIcon, HeadsetIcon, PencilIcon, UserCogIcon } from "lucide-react";
import Link from "next/link";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { formatDate, formatDateTime } from "@/lib/utils/format";
import { CompanyNotesPanel } from "../components/company-notes";
import { ModuleLinkButton } from "../components/module-link";
import { Panel, KeyValue } from "../components/primitives";
import { AttentionRow } from "../components/portfolio-panels";
import { PanelSkeleton, SectionError } from "../components/states";
import { AccountStatusBadge, FactorBadge, ResourceStatusBadge, SeverityBadge, SubscriptionStatusBadge } from "../components/status-badges";
import { useCompanyActions } from "../components/use-company-actions";
import { UsageBar } from "../components/usage-bar";
import { relativeTime } from "../data/clock";
import { OWNER_STATE_LABEL, USAGE_RESOURCES, companySectionHref } from "../data/config";
import { useCompanyOverview } from "../data/hooks";
import type { CompanyOverviewData } from "../data/repository";
import { formatLimit, formatMrr, formatUsed } from "../lib/format";
import { useCompanyId } from "./company-shell";

const OVERVIEW_RESOURCES = ["users", "clients", "connectedAccounts", "aiCredits", "automationRuns", "scheduledPosts", "apiRequests", "storage"] as const;

export function CompanyOverviewPage() {
  const companyId = useCompanyId();
  const query = useCompanyOverview(companyId);

  if (query.error) return <SectionError subject="Company overview" error={query.error} onRetry={() => void query.refetch()} />;
  if (!query.data) {
    return (
      <div className="grid gap-1 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, index) => (
          <PanelSkeleton key={index} rows={5} className={index === 3 ? "lg:col-span-2" : undefined} />
        ))}
      </div>
    );
  }

  return <OverviewBody data={query.data} />;
}

function OverviewBody({ data }: { data: CompanyOverviewData }) {
  const { summary, subscription, usage, support, recentActivity, notes } = data;
  const { company, owner } = summary;
  const id = company.id;
  const { capabilities, openFlow, dialogs } = useCompanyActions();
  const operating = company.accountStatus !== "archived";
  const owners = [
    { label: "Account Manager", person: summary.internalOwners.accountManager },
    { label: "Support Owner", person: summary.internalOwners.supportOwner },
    { label: "Technical Owner", person: summary.internalOwners.technicalOwner },
  ];

  return (
    <div className="space-y-1">
      <div className="grid gap-1 lg:grid-cols-3">
        <Panel
          title="Company profile"
          action={
            capabilities.canEditCompany && operating ? (
              <Button variant="ghost" size="sm" onClick={() => openFlow({ kind: "edit", summary })}>
                <PencilIcon />
                Edit
              </Button>
            ) : null
          }
        >
          <dl className="divide-y divide-border">
            <KeyValue label="Company">{company.name}</KeyValue>
            <KeyValue label="Legal name">{company.profile.legalName ?? "-"}</KeyValue>
            <KeyValue label="Website">
              {company.profile.website ? (
                <a href={company.profile.website} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 hover:underline">
                  {company.domain}
                  <ExternalLinkIcon className="size-3" aria-hidden />
                </a>
              ) : (
                "-"
              )}
            </KeyValue>
            <KeyValue label="Industry">{company.profile.industry}</KeyValue>
            <KeyValue label="Country">{company.profile.country}</KeyValue>
            <KeyValue label="Created">{formatDate(company.createdAt)}</KeyValue>
            <KeyValue label="Account"><AccountStatusBadge status={company.accountStatus} /></KeyValue>
            <KeyValue label="Owner">
              <Link href={companySectionHref(id, "users", owner.email ? { q: owner.email } : undefined)} className="hover:underline">
                {owner.name}
              </Link>
              <span className="block text-2xs text-muted-foreground">{owner.email || OWNER_STATE_LABEL[owner.state]}</span>
            </KeyValue>
            <KeyValue label="Internal owner">{summary.internalOwners.accountManager?.name ?? <span className="text-muted-foreground">Unassigned</span>}</KeyValue>
          </dl>
        </Panel>

        <Panel
          title="Subscription"
          action={
            <Button asChild variant="ghost" size="sm">
              <Link href={companySectionHref(id, "subscription")}>
                View Subscription
                <ArrowRightIcon />
              </Link>
            </Button>
          }
        >
          <dl className="divide-y divide-border">
            <KeyValue label="Plan">{summary.plan.name}</KeyValue>
            <KeyValue label="Billing cycle"><span className="capitalize">{subscription.billingCycle}</span></KeyValue>
            <KeyValue label="Status"><SubscriptionStatusBadge status={subscription.status} /></KeyValue>
            <KeyValue label="Start date">{formatDate(subscription.startedAt)}</KeyValue>
            {subscription.status === "trialing" && subscription.trialEndsAt ? (
              <KeyValue label="Trial ends">{formatDate(subscription.trialEndsAt)}</KeyValue>
            ) : null}
            <KeyValue label={subscription.status === "scheduled_cancellation" ? "Ends" : "Renewal date"}>{formatDate(subscription.renewsAt)}</KeyValue>
            <KeyValue label="MRR contribution">{formatMrr(summary.mrrMinor, summary.currency)}</KeyValue>
            {subscription.scheduledChange ? <KeyValue label="Scheduled change">To {subscription.scheduledChange.planTier} on {formatDate(subscription.scheduledChange.effectiveAt)}</KeyValue> : null}
          </dl>
        </Panel>

        <Panel title="Internal account ownership" description="Platform staff only - never visible to the company.">
          <ul className="divide-y divide-border">
            {owners.map(({ label, person }) => (
              <li key={label} className="flex items-center justify-between gap-2 py-1.5">
                <div className="min-w-0">
                  <p className="text-2xs text-muted-foreground">{label}</p>
                  <p className="truncate text-[0.8125rem] font-medium text-foreground">{person ? person.name : <span className="font-normal text-muted-foreground">Unassigned</span>}</p>
                  {person ? <p className="truncate text-2xs text-muted-foreground">{person.department}</p> : null}
                </div>
                {capabilities.canEditCompany && operating ? (
                  <Button variant="ghost" size="sm" onClick={() => openFlow({ kind: "assign", targets: [summary] })}>
                    {person ? "Change" : "Assign"}
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
          <div className="mt-2 flex items-center gap-2">
            <ModuleLinkButton module="team" variant="ghost">
              <UserCogIcon />
              Open Internal Team Member
            </ModuleLinkButton>
          </div>
        </Panel>
      </div>

      <div className="grid gap-1 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Panel
            title="Usage summary"
            description="Consumption against effective limits for the current period."
            className="h-full"
            action={
              <Button asChild variant="ghost" size="sm">
                <Link href={companySectionHref(id, "usage")}>
                  View Full Usage
                  <ArrowRightIcon />
                </Link>
              </Button>
            }
          >
            <ul className="grid gap-x-6 gap-y-2.5 sm:grid-cols-2">
              {OVERVIEW_RESOURCES.map((key) => {
                const record = usage.records.find((item) => item.resource === key);
                const def = USAGE_RESOURCES.find((item) => item.key === key);
                if (!record || !def) return null;
                return (
                  <li key={key} className="min-w-0 space-y-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="truncate text-[0.8125rem] text-foreground">{def.label}</span>
                      <span className="shrink-0 text-2xs tabular text-muted-foreground">
                        {formatUsed(record.used, key)} / {formatLimit(record.effectiveLimit, key)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <UsageBar utilization={record.utilization} status={record.status} label={def.label} className="flex-1" />
                      <ResourceStatusBadge status={record.status} />
                    </div>
                  </li>
                );
              })}
            </ul>
          </Panel>
        </div>

        <Panel title="Tenant health" description={summary.health.reason} className="h-full">
          {summary.health.factors.length === 0 ? (
            <p className="text-[0.8125rem] text-muted-foreground">{summary.health.reason}</p>
          ) : (
            <ul className="divide-y divide-border">
              {summary.health.factors.map((factor) => (
                <li key={factor.area}>
                  <Link href={companySectionHref(id, factor.section)} className="flex items-center justify-between gap-2 py-1.5 hover:bg-accent/40">
                    <span className="min-w-0">
                      <span className="block truncate text-[0.8125rem] font-medium capitalize text-foreground">{factor.area === "jobs" ? "Background jobs" : factor.area === "activity" ? "Recent activity" : factor.area}</span>
                      <span className="block truncate text-2xs text-muted-foreground">{factor.detail}</span>
                    </span>
                    <FactorBadge status={factor.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <div id="needs-attention" className="scroll-mt-24">
        <Panel title="Needs attention" description={summary.attention.length > 0 ? `${summary.attention.length} open` : undefined} flush>
          {summary.attention.length === 0 ? (
            <EmptyState
              icon={CircleCheckIcon}
              size="sm"
              title={operating && company.accountStatus === "active" ? "Nothing needs attention" : "Issues are not tracked"}
              description={company.accountStatus === "active" ? "Billing, limits, integrations and security are in order." : `Issue tracking is paused while the account is ${company.accountStatus}.`}
            />
          ) : (
            <ul className="divide-y divide-border border-t border-border">
              {summary.attention.map((item) => (
                <AttentionRow key={item.id} item={item} showCompany={false} />
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <div className="grid gap-1 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <CompanyNotesPanel companyId={id} notes={notes} canManage={capabilities.canManageInternalNotes} />
        </div>
        <div className="space-y-1">
          <Panel title="Support snapshot">
            <dl className="grid grid-cols-3 gap-1 text-center">
              {[
                { label: "Open", value: support.openTickets },
                { label: "High priority", value: support.highPriorityTickets },
                { label: "SLA breaches", value: support.slaBreaches, danger: support.slaBreaches > 0 },
              ].map((item) => (
                <div key={item.label} className="rounded-sm border border-border bg-surface-sunken px-1 py-1.5">
                  <dt className="text-[11px] text-muted-foreground">{item.label}</dt>
                  <dd className={item.danger ? "text-base font-semibold tabular text-danger" : "text-base font-semibold tabular text-foreground"}>{item.value}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-2 truncate text-2xs text-muted-foreground">
              {support.latest ? (
                <>Latest: <span className="text-foreground">{support.latest.reference}</span> - {support.latest.subject}</>
              ) : (
                "No support tickets."
              )}
            </p>
            <div className="mt-2">
              <ModuleLinkButton module="support" query={{ companyId: id }}>
                <HeadsetIcon />
                View Company Tickets
              </ModuleLinkButton>
            </div>
          </Panel>

          <Panel
            title="Recent activity"
            action={
              <Button asChild variant="ghost" size="sm">
                <Link href={companySectionHref(id, "activity")}>View All Activity</Link>
              </Button>
            }
          >
            {recentActivity.length === 0 ? (
              <p className="text-[0.8125rem] text-muted-foreground">No recorded activity yet.</p>
            ) : (
              <ul className="space-y-2">
                {recentActivity.slice(0, 6).map((entry) => (
                  <li key={entry.id} className="min-w-0">
                    <p className="truncate text-[0.8125rem] text-foreground">{entry.summary}</p>
                    <p className="flex items-center gap-1.5 truncate text-2xs text-muted-foreground" title={formatDateTime(entry.at)}>
                      {entry.actor.name} · {relativeTime(entry.at)}
                      {entry.severity !== "info" ? <SeverityBadge severity={entry.severity} /> : null}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>
      {dialogs}
    </div>
  );
}
