"use client";

import {
  ArrowRightIcon,
  BuildingIcon,
  CircleCheckIcon,
  ClockIcon,
  CreditCardIcon,
  HeartPulseIcon,
  PauseCircleIcon,
  SparklesIcon,
  TrendingUpIcon,
  TriangleAlertIcon,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/config/routes";
import { cn } from "@/lib/utils/cn";
import { formatCurrency, formatDate, formatNumber } from "@/lib/utils/format";
import { relativeTime } from "../data/clock";
import { ATTENTION_KIND_META, HEALTH_METHOD, companySectionHref } from "../data/config";
import type { CompanyAttentionItem, CompanySummary, PortfolioSummary } from "../data/types";
import { Panel, StatCard, StatGrid, WithTooltip } from "./primitives";
import { OnboardingBadge, SeverityBadge } from "./status-badges";
import { PanelSkeleton, StatGridSkeleton } from "./states";

const LIST = ROUTES.superAdmin.companies;

/* ------------------------------------------------------------------ */
/* KPI strip                                                           */
/* ------------------------------------------------------------------ */

export function KpiStrip({ portfolio }: { portfolio: PortfolioSummary | undefined }) {
  if (!portfolio) return <StatGridSkeleton count={8} className="grid-cols-2 sm:grid-cols-4 xl:grid-cols-8" />;

  const { accountStatus } = portfolio;
  const percent = portfolio.total === 0 ? 0 : Math.round((portfolio.active / portfolio.total) * 100);
  const delta = portfolio.newThisMonth - portfolio.newLastMonth;

  return (
    <div className="space-y-1.5">
      <StatGrid className="grid-cols-2 sm:grid-cols-4 xl:grid-cols-8">
        <StatCard
          compact
          label="Total companies"
          value={formatNumber(portfolio.total)}
          hint={`+${portfolio.newThisMonth} this month`}
          icon={BuildingIcon}
          href={LIST}
          title="Every registered company, in any account state"
        />
        <StatCard
          compact
          label="Active"
          value={formatNumber(portfolio.active)}
          hint={`${percent}% of companies`}
          icon={CircleCheckIcon}
          tone="success"
          href={`${LIST}?accountStatus=active`}
        />
        <StatCard
          compact
          label="Trial"
          value={formatNumber(portfolio.trialing)}
          hint={portfolio.trialsEndingSoon > 0 ? `${portfolio.trialsEndingSoon} ending soon` : "None ending soon"}
          icon={SparklesIcon}
          tone="info"
          href={`${LIST}?subscriptionStatus=trialing`}
          title="Subscriptions in a trial, among active accounts"
        />
        <StatCard
          compact
          label="Past due"
          value={formatNumber(portfolio.pastDue)}
          hint={portfolio.pastDue > 0 ? "Requires follow-up" : "Nothing overdue"}
          icon={CreditCardIcon}
          tone={portfolio.pastDue > 0 ? "warning" : "neutral"}
          href={`${LIST}?subscriptionStatus=past_due`}
        />
        <StatCard
          compact
          label="Suspended"
          value={formatNumber(portfolio.suspended)}
          hint="Access restricted"
          icon={PauseCircleIcon}
          tone={portfolio.suspended > 0 ? "danger" : "neutral"}
          href={`${LIST}?accountStatus=suspended`}
        />
        <StatCard
          compact
          label="New this month"
          value={formatNumber(portfolio.newThisMonth)}
          hint={delta === 0 ? `Same as last month (${portfolio.newLastMonth})` : `${delta > 0 ? "+" : ""}${delta} vs last month`}
          icon={ClockIcon}
          href={`${LIST}?created=30d&sort=createdAt:desc`}
        />
        <StatCard
          compact
          label="MRR"
          value={formatCurrency(portfolio.mrrMinor, portfolio.currency, { compact: true })}
          hint={`${portfolio.payingCompanies} paying`}
          icon={TrendingUpIcon}
          tone="brand"
          href={`${LIST}?sort=mrr:desc`}
          title="Monthly recurring revenue from active, paying subscriptions"
        />
        <StatCard
          compact
          label="Needs attention"
          value={formatNumber(portfolio.needsAttention)}
          hint={`${portfolio.attentionItems.filter((item) => item.severity !== "info").length} open items`}
          icon={TriangleAlertIcon}
          tone={portfolio.needsAttention > 0 ? "warning" : "neutral"}
          href={`${LIST}?health=at_risk`}
        />
      </StatGrid>
      <p className="text-2xs text-muted-foreground">
        Account status: {accountStatus.active} active · {accountStatus.suspended} suspended · {accountStatus.deactivated} deactivated · {accountStatus.archived} archived ={" "}
        <span className="font-medium text-foreground">{portfolio.total} companies</span>. Trial and Past due are subscription states within active accounts.
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Tenant health                                                       */
/* ------------------------------------------------------------------ */

export function TenantHealthPanel({ portfolio }: { portfolio: PortfolioSummary | undefined }) {
  if (!portfolio) return <PanelSkeleton rows={1} title={false} />;

  const { health } = portfolio;
  const assessed = health.healthy + health.needs_attention + health.critical + health.suspended;
  const tiles = [
    { key: "healthy", label: "Healthy", count: health.healthy, bar: "bg-success", text: "text-success", href: `${LIST}?health=healthy` },
    { key: "needs_attention", label: "Needs attention", count: health.needs_attention, bar: "bg-warning", text: "text-warning", href: `${LIST}?health=needs_attention` },
    { key: "critical", label: "Critical", count: health.critical, bar: "bg-danger", text: "text-danger", href: `${LIST}?health=critical` },
    { key: "suspended", label: "Suspended", count: health.suspended, bar: "bg-neutral", text: "text-neutral", href: `${LIST}?health=suspended` },
  ];

  return (
    <Panel bodyClassName="p-0">
      <div className="flex flex-col gap-2.5 px-3 py-2.5 lg:flex-row lg:items-center lg:gap-5">
        <div className="shrink-0 lg:w-40">
          <h3 className="text-[13px] font-semibold tracking-tight text-foreground">Tenant health</h3>
          <WithTooltip content={HEALTH_METHOD} className="text-2xs text-muted-foreground underline decoration-dotted underline-offset-2">
            How is this calculated?
          </WithTooltip>
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex h-2 gap-px overflow-hidden rounded-sm bg-muted" role="img" aria-label={`Health distribution across ${assessed} assessed companies`}>
            {tiles.map((tile) => (
              <span key={tile.key} className={tile.bar} style={{ width: `${assessed === 0 ? 0 : (tile.count / assessed) * 100}%` }} />
            ))}
          </div>
          {health.notAssessed > 0 ? (
            <p className="text-2xs text-muted-foreground">
              {health.notAssessed} deactivated or archived {health.notAssessed === 1 ? "company is" : "companies are"} not assessed.
            </p>
          ) : null}
        </div>
        <div className="grid grid-cols-2 gap-1 sm:grid-cols-4 lg:w-[26rem]">
          {tiles.map((tile) => (
            <Link key={tile.key} href={tile.href} className="rounded-sm border border-border px-2 py-1 transition-colors hover:bg-accent/50">
              <span className="block truncate text-2xs text-muted-foreground">{tile.label}</span>
              <span className={cn("text-base font-semibold leading-tight tabular", tile.text)}>{tile.count}</span>
            </Link>
          ))}
        </div>
      </div>
    </Panel>
  );
}

/* ------------------------------------------------------------------ */
/* Needs attention                                                     */
/* ------------------------------------------------------------------ */

const AREA_LABEL: Record<CompanyAttentionItem["area"], string> = {
  billing: "Billing",
  subscription: "Subscription",
  usage: "Usage",
  integrations: "Integrations",
  security: "Security",
  jobs: "Background jobs",
  activity: "Activity",
  support: "Support",
  users: "Users",
};

export function AttentionRow({ item, showCompany }: { item: CompanyAttentionItem; showCompany: boolean }) {
  return (
    <li className="grid items-center gap-x-3 gap-y-1 px-3 py-2 sm:grid-cols-[6rem_minmax(0,1.6fr)_minmax(0,1fr)_6.5rem_auto]">
      <span><SeverityBadge severity={item.severity} /></span>
      <div className="min-w-0">
        <p className="truncate text-[0.8125rem] font-medium text-foreground">{item.title}</p>
        <p className="truncate text-2xs text-muted-foreground">{item.description}</p>
      </div>
      <p className="min-w-0 truncate text-[0.8125rem] text-foreground">
        {showCompany ? (
          <Link href={companySectionHref(item.companyId, "overview")} className="hover:underline">
            {item.companyName}
          </Link>
        ) : (
          <span className="text-muted-foreground">{AREA_LABEL[item.area]}</span>
        )}
        {showCompany ? <span className="block text-2xs text-muted-foreground">{AREA_LABEL[item.area]}</span> : null}
      </p>
      <span className="text-2xs text-muted-foreground" title={formatDate(item.detectedAt)}>{relativeTime(item.detectedAt)}</span>
      <Button asChild variant="ghost" size="sm" className="justify-self-start sm:justify-self-end">
        <Link href={companySectionHref(item.companyId, item.section)}>
          {item.actionLabel}
          <ArrowRightIcon />
        </Link>
      </Button>
    </li>
  );
}

export function NeedsAttentionPanel({ portfolio, initialLimit = 4 }: { portfolio: PortfolioSummary | undefined; initialLimit?: number }) {
  const [expanded, setExpanded] = useState(false);
  if (!portfolio) return <PanelSkeleton rows={4} />;

  const items = portfolio.attentionItems.filter((item) => item.severity !== "info");
  const shown = expanded ? items : items.slice(0, initialLimit);

  return (
    <Panel
      title="Needs attention"
      description={items.length > 0 ? `${items.length} open items across ${portfolio.needsAttention} companies` : undefined}
      flush
      action={
        items.length > initialLimit ? (
          <Button variant="ghost" size="sm" onClick={() => setExpanded((value) => !value)}>
            {expanded ? "Show fewer" : `View all ${items.length}`}
          </Button>
        ) : null
      }
    >
      {items.length === 0 ? (
        <EmptyState icon={CircleCheckIcon} size="sm" title="No companies need attention" description="Payments, limits, integrations and security are all in order." />
      ) : (
        <>
          <div className="flex flex-wrap gap-1 border-y border-border px-3 py-2">
            {portfolio.attentionByKind
              .filter((entry) => ATTENTION_KIND_META[entry.kind].severity !== "info")
              .map((entry) => (
                <Link
                  key={entry.kind}
                  href={`${LIST}?issue=${entry.kind}`}
                  className="rounded-sm border border-border-strong bg-neutral-subtle px-2 py-0.5 text-2xs text-foreground transition-colors hover:bg-accent"
                >
                  {ATTENTION_KIND_META[entry.kind].plural(entry.companies)}
                </Link>
              ))}
          </div>
          <ul className="divide-y divide-border">
            {shown.map((item) => (
              <AttentionRow key={item.id} item={item} showCompany />
            ))}
          </ul>
        </>
      )}
    </Panel>
  );
}

/* ------------------------------------------------------------------ */
/* Recent signups                                                      */
/* ------------------------------------------------------------------ */

export function RecentSignupsPanel({ companies }: { companies: CompanySummary[] | undefined }) {
  if (!companies) return <PanelSkeleton rows={4} />;

  return (
    <Panel
      title="Recent signups"
      flush
      className="h-full"
      action={
        <Button asChild variant="ghost" size="sm">
          <Link href={`${LIST}?created=90d&sort=createdAt:desc`}>View all</Link>
        </Button>
      }
    >
      {companies.length === 0 ? (
        <EmptyState icon={HeartPulseIcon} size="sm" title="No recent signups" description="New companies appear here as they are created." />
      ) : (
        <ul className="divide-y divide-border border-t border-border">
          {companies.map((summary) => (
            <li key={summary.company.id}>
              <Link href={ROUTES.superAdmin.company(summary.company.id)} className="flex items-center justify-between gap-3 px-3 py-2 transition-colors hover:bg-accent/40">
                <span className="min-w-0">
                  <span className="block truncate text-[0.8125rem] font-medium text-foreground">{summary.company.name}</span>
                  <span className="block truncate text-2xs text-muted-foreground">
                    {summary.owner.name} · {summary.plan.name} · {formatDate(summary.company.createdAt)}
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-1.5">
                  <OnboardingBadge status={summary.onboarding} />
                  <ArrowRightIcon className="size-3.5 text-muted-foreground" aria-hidden />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
