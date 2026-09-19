"use client";

import { ArrowRightIcon, CheckIcon, CircleIcon } from "lucide-react";
import Link from "next/link";
import { INTEGRATION_PROVIDER } from "@/types/domain/integration";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { KeyValue, Panel } from "@/features/companies/components/primitives";
import { ModuleLinkButton } from "@/features/companies/components/module-link";
import { StatusBadge } from "@/components/shared/status-badge";
import { CONNECTION_STATE_META, companySectionHref } from "@/features/companies/data/config";
import { relativeTime } from "@/features/companies/data/clock";
import { ROUTES } from "@/config/routes";
import { getInitials, formatNumber } from "@/lib/utils/format";
import { ClientError, PanelSkeleton } from "../components/states";
import { AccessLevelBadge, DemoTag, FactorBadge, OnboardingBadge, SeverityBadge } from "../components/status-badges";
import { ANALYTICS_LINK_META, HEALTH_AREA_LABEL, MONITORING_META, clientSectionHref } from "../data/config";
import { useClientOverview } from "../data/hooks";
import type { ClientOverviewData } from "../data/types";
import { useClientId } from "./client-shell";

function ProfilePanel({ data }: { data: ClientOverviewData }) {
  const { summary } = data;
  const { profile, company } = summary;
  return (
    <Panel title="Client profile" action={<Button asChild variant="ghost" size="sm"><Link href={clientSectionHref(summary.client.id, "settings")}>Settings</Link></Button>}>
      <dl className="divide-y divide-border">
        <KeyValue label="Parent company"><Link href={ROUTES.superAdmin.company(company.id)} className="hover:underline">{company.name}</Link></KeyValue>
        <KeyValue label="Industry">{profile.industry}</KeyValue>
        <KeyValue label="Contact">{profile.contactEmail ?? <span className="text-muted-foreground">Not set</span>}</KeyValue>
        <KeyValue label="Timezone">{profile.timezone}</KeyValue>
        <KeyValue label="Language">{profile.language}</KeyValue>
        <KeyValue label="Client lead">{summary.lead?.name ?? <span className="text-warning">Not assigned</span>}</KeyValue>
      </dl>
      {profile.description ? <p className="mt-2 text-2xs text-muted-foreground">{profile.description}</p> : null}
    </Panel>
  );
}

function HealthPanel({ data }: { data: ClientOverviewData }) {
  const { health } = data.summary;
  return (
    <Panel title="Operational health" description={health.reason}>
      <ul className="divide-y divide-border">
        {health.factors.map((factor) => (
          <li key={factor.area} className="flex items-center justify-between gap-2 py-1.5">
            <Link href={clientSectionHref(data.summary.client.id, factor.section)} className="min-w-0 hover:underline" title={factor.detail}>
              <span className="block truncate text-[0.8125rem] text-foreground">{HEALTH_AREA_LABEL[factor.area]}</span>
              <span className="block truncate text-2xs text-muted-foreground">{factor.detail}</span>
            </Link>
            <FactorBadge status={factor.status} />
          </li>
        ))}
      </ul>
    </Panel>
  );
}

function OnboardingPanel({ data }: { data: ClientOverviewData }) {
  const { onboarding } = data.summary;
  return (
    <Panel
      title="Onboarding"
      description={`${onboarding.requiredDone} / ${onboarding.requiredTotal} required steps completed`}
      action={<OnboardingBadge status={onboarding.status} />}
    >
      <ul className="space-y-1.5">
        {onboarding.steps.map((step) => (
          <li key={step.key} className="flex items-start gap-2">
            <span className={step.done ? "mt-0.5 text-success" : "mt-0.5 text-muted-foreground"} aria-hidden>
              {step.done ? <CheckIcon className="size-3.5" strokeWidth={3} /> : <CircleIcon className="size-3.5" />}
            </span>
            <div className="min-w-0">
              <p className="text-[0.8125rem] text-foreground">
                {step.label} <span className="text-2xs text-muted-foreground">{step.required ? "Required" : "Optional"}</span>
                <span className="sr-only">{step.done ? " - completed" : " - not completed"}</span>
              </p>
              <p className="text-2xs text-muted-foreground">{step.detail}</p>
            </div>
          </li>
        ))}
      </ul>
      {onboarding.blockedReason ? <p className="mt-2 text-2xs text-danger">{onboarding.blockedReason}</p> : null}
      <Button asChild variant="outline" size="sm" className="mt-3">
        <Link href={`${clientSectionHref(data.summary.client.id, "settings")}#onboarding`}>Review Onboarding</Link>
      </Button>
    </Panel>
  );
}

function AttentionPanel({ data }: { data: ClientOverviewData }) {
  const { summary } = data;
  const items = summary.attention;
  return (
    <Panel title="Needs attention" description={items.length === 0 ? undefined : `${items.length} open`}>
      <div id="needs-attention" className="scroll-mt-24">
        {items.length === 0 ? (
          <p className="text-[0.8125rem] text-muted-foreground">
            {summary.workspace === "active" ? "No open issues." : `Issues are not tracked while the workspace is ${summary.workspace}.`}
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {items.map((item) => (
              <li key={item.id} className="flex items-start justify-between gap-3 py-2">
                <div className="min-w-0 space-y-0.5">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <SeverityBadge severity={item.severity} />
                    <span className="text-[0.8125rem] font-medium text-foreground">{item.title}</span>
                  </div>
                  <p className="text-2xs text-muted-foreground">
                    {item.description} <span aria-hidden>·</span> <span className="capitalize">{item.module}</span> <span aria-hidden>·</span> {relativeTime(item.detectedAt)}
                  </p>
                </div>
                <Button asChild variant="outline" size="sm" className="shrink-0">
                  <Link href={clientSectionHref(summary.client.id, item.section, item.query)}>
                    {item.actionLabel}
                    <ArrowRightIcon />
                  </Link>
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Panel>
  );
}

function TeamPanel({ data }: { data: ClientOverviewData }) {
  const id = data.summary.client.id;
  return (
    <Panel title="Assigned team" description={`${data.summary.counts.activeMembers} active · ${data.team.length} assigned`} action={<Button asChild variant="ghost" size="sm"><Link href={clientSectionHref(id, "team")}>Manage</Link></Button>}>
      {data.team.length === 0 ? (
        <p className="text-[0.8125rem] text-muted-foreground">No one is assigned to this client yet.</p>
      ) : (
        <ul className="space-y-1.5">
          {data.team.slice(0, 5).map((member) => (
            <li key={member.membershipId} className="flex items-center justify-between gap-2">
              <span className="flex min-w-0 items-center gap-2">
                <Avatar className="size-6">
                  <AvatarFallback className="text-[10px]">{getInitials(member.name)}</AvatarFallback>
                </Avatar>
                <span className="min-w-0">
                  <span className="block truncate text-[0.8125rem] text-foreground">{member.name}{member.isLead ? <span className="ml-1 text-2xs text-primary">Lead</span> : null}</span>
                  {member.issue ? <span className="block truncate text-2xs text-warning">{member.issue}</span> : null}
                </span>
              </span>
              <AccessLevelBadge level={member.level} />
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

function ChannelsPanel({ data }: { data: ClientOverviewData }) {
  const { summary, connections } = data;
  const id = summary.client.id;
  return (
    <Panel
      title="Channels"
      description={connections.length === 0 ? undefined : `${summary.counts.healthyConnections} of ${connections.length} healthy`}
      action={<Button asChild variant="ghost" size="sm"><Link href={clientSectionHref(id, "channels")}>View all</Link></Button>}
    >
      {connections.length === 0 ? (
        <p className="text-[0.8125rem] text-muted-foreground">No channels connected. Connect accounts from the Channels section.</p>
      ) : (
        <ul className="divide-y divide-border">
          {connections.slice(0, 5).map((connection) => (
            <li key={connection.id} className="flex items-center justify-between gap-2 py-1.5">
              <span className="min-w-0">
                <span className="block truncate text-[0.8125rem] text-foreground">{INTEGRATION_PROVIDER[connection.provider].label}</span>
                <span className="block truncate text-2xs text-muted-foreground">{connection.accountName}</span>
              </span>
              <StatusBadge registry={CONNECTION_STATE_META} status={connection.state} />
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

function PublishingPanel({ data }: { data: ClientOverviewData }) {
  const { summary } = data;
  const { operations } = summary;
  return (
    <Panel
      title="Publishing & jobs"
      className="scroll-mt-24"
      action={<ModuleLinkButton module="jobs" query={{ client: summary.client.id, company: summary.company.id }} variant="ghost">View Client Operations</ModuleLinkButton>}
    >
      <div id="publishing" className="scroll-mt-24">
        <dl className="divide-y divide-border">
          <KeyValue label="Scheduled posts">{formatNumber(operations.scheduledPosts)}</KeyValue>
          <KeyValue label="Failed posts"><span className={operations.failedPosts > 0 ? "font-medium text-danger" : undefined}>{formatNumber(operations.failedPosts)}</span></KeyValue>
          <KeyValue label="Retries pending">{formatNumber(operations.retryPending)}</KeyValue>
          <KeyValue label="Jobs processing">{formatNumber(operations.processingJobs)}</KeyValue>
          <KeyValue label="Last published">{operations.lastPublishedAt ? relativeTime(operations.lastPublishedAt) : <span className="text-muted-foreground">Nothing yet</span>}</KeyValue>
        </dl>
      </div>
    </Panel>
  );
}

function WebsitePanel({ data }: { data: ClientOverviewData }) {
  const { summary, search } = data;
  const site = summary.primaryWebsite;
  const id = summary.client.id;
  return (
    <Panel title="Website & SEO" action={<Button asChild variant="ghost" size="sm"><Link href={clientSectionHref(id, "website-seo")}>Open</Link></Button>}>
      {site ? (
        <dl className="divide-y divide-border">
          <KeyValue label="Primary website">{site.domain}</KeyValue>
          <KeyValue label="Monitoring">{MONITORING_META[site.monitoring].label}</KeyValue>
          <KeyValue label="Search Console"><StatusBadge registry={ANALYTICS_LINK_META} status={search.gscState} /></KeyValue>
          <KeyValue label="Analytics (GA4)"><StatusBadge registry={ANALYTICS_LINK_META} status={search.ga4State} /></KeyValue>
          <KeyValue label="Technical data"><DemoTag>Demo data</DemoTag></KeyValue>
        </dl>
      ) : (
        <p className="text-[0.8125rem] text-muted-foreground">No website is configured for this client. Some clients do not have one.</p>
      )}
    </Panel>
  );
}

function UsagePanel({ data }: { data: ClientOverviewData }) {
  const { summary, usage } = data;
  return (
    <Panel
      title="Client usage"
      description={usage.attributableNote}
      action={<Button asChild variant="ghost" size="sm"><Link href={companySectionHref(summary.company.id, "usage")}>Open Company Usage</Link></Button>}
    >
      <ul className="divide-y divide-border">
        {usage.rows.map((row) => (
          <li key={row.key} className="flex items-baseline justify-between gap-3 py-1.5 text-[0.8125rem]">
            <span className="text-muted-foreground">{row.label}</span>
            <span className="text-right">
              <span className="font-medium tabular text-foreground">{formatNumber(row.used)}</span> <span className="text-2xs text-muted-foreground">{row.unit}</span>
              {row.companyUsed !== null ? (
                <span className="block text-2xs text-muted-foreground">
                  Company-wide: {formatNumber(row.companyUsed)}{row.companyLimit !== null ? ` / ${formatNumber(row.companyLimit)}` : ""}
                </span>
              ) : null}
            </span>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

function RecentActivityPanel({ data }: { data: ClientOverviewData }) {
  const id = data.summary.client.id;
  return (
    <Panel title="Recent activity" action={<Button asChild variant="ghost" size="sm"><Link href={clientSectionHref(id, "activity")}>View all</Link></Button>}>
      {data.recentActivity.length === 0 ? (
        <p className="text-[0.8125rem] text-muted-foreground">No activity recorded yet.</p>
      ) : (
        <ul className="divide-y divide-border">
          {data.recentActivity.slice(0, 6).map((entry) => (
            <li key={entry.id} className="flex items-start justify-between gap-3 py-1.5">
              <div className="min-w-0">
                <p className="truncate text-[0.8125rem] text-foreground">{entry.summary}</p>
                <p className="truncate text-2xs text-muted-foreground">{entry.actor.name}</p>
              </div>
              <span className="shrink-0 whitespace-nowrap text-2xs text-muted-foreground">{relativeTime(entry.at)}</span>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

export function ClientOverviewPage() {
  const clientId = useClientId();
  const query = useClientOverview(clientId);

  if (query.error) return <ClientError subject="Overview" error={query.error} onRetry={() => void query.refetch()} />;
  if (!query.data) {
    return (
      <div className="grid grid-cols-1 gap-1 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, index) => (
          <PanelSkeleton key={index} rows={5} />
        ))}
      </div>
    );
  }

  const data = query.data;
  return (
    <div className="grid grid-cols-1 gap-1 lg:grid-cols-3">
      <ProfilePanel data={data} />
      <HealthPanel data={data} />
      <OnboardingPanel data={data} />
      <div className="lg:col-span-2">
        <AttentionPanel data={data} />
      </div>
      <TeamPanel data={data} />
      <ChannelsPanel data={data} />
      <PublishingPanel data={data} />
      <WebsitePanel data={data} />
      <UsagePanel data={data} />
      <div className="lg:col-span-2">
        <RecentActivityPanel data={data} />
      </div>
    </div>
  );
}
