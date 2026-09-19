"use client";

import { BellIcon, CircleCheckIcon, ExternalLinkIcon, PencilIcon } from "lucide-react";
import { ActionMenu } from "@/components/shared/action-menu";
import { AlertBanner } from "@/components/shared/alert-banner";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate, getInitials } from "@/lib/utils/format";
import { SUSPENSION_REASON_LABEL, companySectionHref } from "../data/config";
import type { CompanySummary } from "../data/types";
import { AccountStatusBadge, SubscriptionStatusBadge } from "./status-badges";
import { useCompanyActions } from "./use-company-actions";
import { StatCard, StatGrid } from "./primitives";
import { HealthBadge } from "./status-badges";
import { relativeTime } from "../data/clock";
import { formatMrr, formatPercent1 } from "../lib/format";
import { USAGE_RESOURCE_BY_KEY } from "../data/config";
import { Badge } from "@/components/ui/badge";

export function CompanyHeaderSkeleton() {
  return (
    <div className="space-y-1">
      <div className="flex items-start gap-3 rounded-sm border border-border bg-card p-4">
        <Skeleton className="size-12 rounded-sm" />
        <div className="flex-1 space-y-2.5">
          <Skeleton className="h-5 w-56" />
          <Skeleton className="h-3.5 w-80" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-1 sm:grid-cols-4 xl:grid-cols-8">
        {Array.from({ length: 8 }, (_, index) => (
          <div key={index} className="rounded-sm border border-border bg-card px-3 py-2.5">
            <Skeleton className="h-2.5 w-14" />
            <Skeleton className="mt-2.5 h-5 w-12" />
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Identity and state of one tenant, with the actions that change them.
 *
 * There is deliberately no "open as company admin" button. Impersonation needs
 * secure backend infrastructure (explicit permission, a reason, a time-limited
 * session, a visible banner and an audit trail), none of which exists yet.
 */
export function CompanyDetailHeader({ summary }: { summary: CompanySummary }) {
  const { company } = summary;
  const { capabilities, openFlow, detailMenu, dialogs } = useCompanyActions();
  const operating = company.accountStatus !== "archived";
  const menu = detailMenu(summary);
  const suspension = company.suspension;

  return (
    <header className="space-y-1">
      <div className="flex flex-col gap-3 rounded-sm border border-border bg-card p-3.5 shadow-xs sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <Avatar className="size-12 shrink-0 rounded-sm">
            <AvatarFallback className="rounded-sm text-sm font-semibold">{getInitials(company.name)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 space-y-1.5">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <h1 className="truncate text-lg font-semibold tracking-tight text-foreground">{company.name}</h1>
              <AccountStatusBadge status={company.accountStatus} />
              <SubscriptionStatusBadge status={summary.subscriptionStatus} />
              <Badge tone="brand">{summary.plan.name}</Badge>
            </div>
            <p className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-2xs text-muted-foreground">
              {company.domain ? (
                <a href={`https://${company.domain}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 hover:text-foreground hover:underline">
                  {company.domain}
                  <ExternalLinkIcon className="size-3" aria-hidden />
                </a>
              ) : (
                <span>No domain</span>
              )}
              <span>{company.displayId}</span>
              <span>Created {formatDate(company.createdAt)}</span>
              <span className="capitalize">{summary.plan.billingCycle} billing</span>
            </p>
            {company.internalTags.length > 0 ? (
              <ul className="flex flex-wrap gap-1" aria-label="Internal tags">
                {company.internalTags.map((tag) => (
                  <li key={tag} className="rounded-sm border border-border-strong bg-neutral-subtle px-1.5 py-px text-[11px] font-medium text-neutral">
                    {tag}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-1.5">
          {capabilities.canEditCompany && operating ? (
            <Button variant="outline" size="sm" onClick={() => openFlow({ kind: "edit", summary })}>
              <PencilIcon />
              Edit Company
            </Button>
          ) : null}
          {capabilities.canEditCompany && (company.accountStatus === "active" || company.accountStatus === "suspended") ? (
            <Button variant="outline" size="sm" onClick={() => openFlow({ kind: "notify", targets: [summary] })}>
              <BellIcon />
              Send Notification
            </Button>
          ) : null}
          <ActionMenu items={menu} label={`More actions for ${company.name}`} />
        </div>
      </div>

      {company.accountStatus === "suspended" ? (
        <AlertBanner
          tone="danger"
          title="This company is suspended"
          action={
            capabilities.canReactivateCompany ? (
              <Button size="sm" variant="outline" onClick={() => openFlow({ kind: "reactivate", targets: [summary] })}>
                <CircleCheckIcon />
                Reactivate
              </Button>
            ) : undefined
          }
        >
          {suspension
            ? `${SUSPENSION_REASON_LABEL[suspension.reason]} · ${formatDate(suspension.suspendedAt)} by ${suspension.suspendedBy}${suspension.note ? ` - ${suspension.note}` : ""}`
            : "Access is restricted."}
        </AlertBanner>
      ) : null}
      {company.accountStatus === "archived" ? (
        <AlertBanner tone="info" title="This company is archived">
          Archived companies are kept for the record and are read-only. Nothing has been deleted.
        </AlertBanner>
      ) : null}
      {company.accountStatus === "deactivated" ? (
        <AlertBanner tone="info" title="This company is deactivated">
          The organisation has closed its account. Its records are retained.
        </AlertBanner>
      ) : null}
      {dialogs}
    </header>
  );
}

/** The at-a-glance strip under the header. Every card opens the section that explains it. */
export function CompanySummaryStrip({ summary }: { summary: CompanySummary }) {
  const { company, usage } = summary;
  const id = company.id;
  const resource = usage.resource ? USAGE_RESOURCE_BY_KEY[usage.resource].label : null;

  return (
    <StatGrid className="grid-cols-2 sm:grid-cols-4 xl:grid-cols-8">
      <StatCard compact label="Current plan" value={summary.plan.name} hint={<span className="capitalize">{summary.plan.billingCycle}</span>} href={companySectionHref(id, "subscription")} />
      <StatCard compact label="MRR" value={formatMrr(summary.mrrMinor, summary.currency)} hint={summary.mrrMinor === 0 ? "Not generating revenue" : "Recurring"} href={companySectionHref(id, "billing")} />
      <StatCard compact label="Users" value={summary.counts.users} hint={`${summary.counts.activeUsers} active`} href={companySectionHref(id, "users")} />
      <StatCard compact label="Clients" value={summary.counts.clients} href={companySectionHref(id, "clients")} />
      <StatCard
        label="Connections"
        value={summary.counts.connections}
        hint={summary.counts.attentionConnections > 0 ? `${summary.counts.attentionConnections} need attention` : "All healthy"}
        href={companySectionHref(id, "integrations")}
      />
      <StatCard
        label="Usage"
        value={usage.utilization === null ? "-" : formatPercent1(usage.utilization)}
        hint={resource ?? "Highest limit utilisation"}
        href={companySectionHref(id, "usage")}
        title="Highest limit utilisation across plan-controlled resources"
      />
      <StatCard compact label="Tenant health" value={<HealthBadge health={summary.health} />} href={`${companySectionHref(id, "overview")}#needs-attention`} />
      <StatCard compact label="Last active" value={<span className="text-[0.8125rem]">{relativeTime(company.lastActiveAt)}</span>} href={companySectionHref(id, "activity")} />
    </StatGrid>
  );
}

