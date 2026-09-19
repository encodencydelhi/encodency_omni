"use client";

import { ArrowRightIcon, CircleCheckIcon, TableIcon, LineChartIcon } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useState } from "react";
import { ChartSkeleton } from "@/components/shared/loading-state";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Panel, StatCard, StatGrid } from "@/features/companies/components/primitives";
import { SeverityBadge } from "@/features/companies/components/status-badges";
import { StatGridSkeleton } from "@/features/companies/components/states";
import { companySectionHref } from "@/features/companies/data/config";
import { relativeTime } from "@/features/companies/data/clock";
import { cn } from "@/lib/utils/cn";
import { formatDate, formatNumber } from "@/lib/utils/format";
import { ATTENTION_KIND, TREND_METRICS, TREND_PERIODS, routes } from "../data/config";
import { useTrend } from "../data/hooks";
import type { PlanAdoptionRow, ScheduledChangeView, SubscriptionAttentionItem, SubscriptionEvent, SubscriptionPortfolio, TrendMetric, TrendPeriod, TrialRow } from "../data/types";
import { moneyTotals } from "../lib/money";
import { PlanStatusBadge, ScheduledKindBadge, ScheduledStatusBadge } from "./badges";
import { MiniTable } from "./mini-table";

/** Recharts is heavy and client-only, so the chart is code-split. */
const TrendChart = dynamic(() => import("./trend-chart").then((module) => module.TrendChart), { ssr: false, loading: () => <ChartSkeleton /> });

/* ------------------------------------------------------------------ */
/* KPIs                                                                */
/* ------------------------------------------------------------------ */

/**
 * Status totals are mutually exclusive; a scheduled cancellation is still a paying
 * subscription, so it is shown as an overlap inside Active Paid, never added on top.
 */
export function OverviewKpis({ portfolio }: { portfolio: SubscriptionPortfolio | undefined }) {
  if (!portfolio) return <StatGridSkeleton count={8} className="grid-cols-2 sm:grid-cols-4 xl:grid-cols-8" />;
  const link = (query: Record<string, string>) => routes.subscriptionsFor(query);

  return (
    <StatGrid className="grid-cols-2 sm:grid-cols-4 xl:grid-cols-8">
      <StatCard compact label="Total Current" value={formatNumber(portfolio.totalCurrent)} hint={`+${portfolio.newLast30d} new in 30 days`} href={link({ status: "current" })} title="Subscriptions that are not cancelled or expired: paid + trials + past due + paused" />
      <StatCard compact label="Active Paid" value={formatNumber(portfolio.activePaid)} hint="Paying, in good standing" tone="success" href={link({ status: "paid" })} />
      <StatCard compact label="Active Trials" value={formatNumber(portfolio.trials)} hint="Not counted as paid" tone="info" href={link({ status: "trialing" })} />
      <StatCard compact label="Past Due" value={formatNumber(portfolio.pastDue)} hint="Payment not collected" tone="danger" href={link({ status: "past_due" })} />
      <StatCard compact label="Scheduled Cancellation" value={formatNumber(portfolio.scheduledCancellation)} hint="Within Active Paid" tone="warning" href={link({ status: "scheduled_cancellation" })} title="These are still paying until the term ends, so they are already counted in Active Paid" />
      <StatCard compact label="MRR" value={<span className="text-base">{moneyTotals(portfolio.mrrByCurrency, true)}</span>} hint="Normalized monthly recurring" title="Monthly price, or annual price / 12. Trials, setup fees, tax and credits are excluded. Currencies are never added together." href={`${routes.subscriptions}?sort=mrr:desc`} />
      <StatCard compact label="Trials Ending Soon" value={formatNumber(portfolio.trialsEndingSoon)} hint="Within 7 days" tone="warning" href={link({ trialEnding: "1" })} />
      <StatCard compact label="Needs Attention" value={formatNumber(portfolio.needsAttention)} hint="Open issues" tone="danger" href="#attention" />
    </StatGrid>
  );
}

/* ------------------------------------------------------------------ */
/* Trends                                                              */
/* ------------------------------------------------------------------ */

export function TrendsPanel() {
  const [metric, setMetric] = useState<TrendMetric>("active_paid");
  const [period, setPeriod] = useState<TrendPeriod>("6m");
  const [table, setTable] = useState(false);
  const query = useTrend(metric, period);
  const label = TREND_METRICS.find((item) => item.value === metric)?.label ?? "";
  const flow = metric === "new_subscriptions" || metric === "cancellations";
  const data = query.data ?? [];
  const total = data.reduce((sum, point) => sum + point.value, 0);

  return (
    <Panel
      title="Subscription Trends"
      description={flow ? `${formatNumber(total)} in this period` : `${formatNumber(data.at(-1)?.value ?? 0)} today`}
      action={
        <>
          <Select value={metric} onValueChange={(value) => setMetric(value as TrendMetric)}>
            <SelectTrigger size="sm" aria-label="Trend metric" className="w-auto min-w-[9.5rem]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TREND_METRICS.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div role="group" aria-label="Period" className="inline-flex rounded-sm border border-border-strong p-0.5">
            {TREND_PERIODS.map((item) => (
              <button
                key={item.value}
                type="button"
                aria-pressed={period === item.value}
                onClick={() => setPeriod(item.value)}
                className={cn("rounded-[3px] px-2 py-0.5 text-2xs font-medium transition-colors", period === item.value ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}
              >
                {item.label}
              </button>
            ))}
          </div>
          <Button variant="ghost" size="icon-sm" onClick={() => setTable((value) => !value)} aria-label={table ? "Show chart" : "Show table"} aria-pressed={table}>
            {table ? <LineChartIcon /> : <TableIcon />}
          </Button>
        </>
      }
    >
      {query.isPending ? (
        <ChartSkeleton />
      ) : table ? (
        <div className="max-h-52 overflow-y-auto scrollbar-thin">
          <MiniTable
            caption={`${label} by period`}
            rows={data}
            getKey={(point) => point.at}
            columns={[
              { id: "period", header: "Period ending", cell: (point) => point.label },
              { id: "value", header: label, align: "right", cell: (point) => <span className="tabular">{point.value}</span> },
            ]}
          />
        </div>
      ) : (
        <TrendChart data={data} kind={flow ? "flow" : "stock"} label={label} height={190} />
      )}
      <p className="mt-1 text-2xs text-muted-foreground">Derived from each subscription&apos;s own start, trial and cancellation dates.</p>
    </Panel>
  );
}

/* ------------------------------------------------------------------ */
/* Adoption                                                            */
/* ------------------------------------------------------------------ */

export function AdoptionPanel({ rows }: { rows: PlanAdoptionRow[] | undefined }) {
  return (
    <Panel title="Plan Adoption" description="Subscribers and recurring revenue by plan" flush>
      {rows === undefined ? (
        <div className="px-3 pb-3"><ChartSkeleton /></div>
      ) : (
        <MiniTable
          caption="Plan adoption"
          rows={rows}
          getKey={(row) => row.planId}
          columns={[
            {
              id: "plan",
              header: "Plan",
              cell: (row) => (
                <span className="flex items-center gap-1.5">
                  <Link href={routes.plan(row.planId)} className="font-medium text-foreground hover:text-primary hover:underline">{row.name}</Link>
                  {row.status !== "published" ? <PlanStatusBadge status={row.status} /> : null}
                </span>
              ),
            },
            {
              id: "paid",
              header: "Paid",
              align: "right",
              cell: (row) => <Link href={routes.subscriptionsFor({ plan: row.planKey, status: "paid" })} className="tabular hover:underline">{row.paid}</Link>,
            },
            {
              id: "trial",
              header: "Trials",
              align: "right",
              cell: (row) => <Link href={routes.subscriptionsFor({ plan: row.planKey, status: "trialing" })} className="tabular hover:underline">{row.trial}</Link>,
            },
            { id: "mrr", header: "MRR", align: "right", hideBelow: "sm", cell: (row) => <span className="tabular">{moneyTotals(row.mrrByCurrency, true)}</span> },
            {
              id: "share",
              header: "Share",
              hideBelow: "md",
              cell: (row) => (
                <span className="flex items-center gap-2">
                  <span className="h-1.5 w-16 overflow-hidden rounded-sm bg-muted" aria-hidden>
                    <span className="block h-full rounded-sm bg-primary" style={{ width: `${Math.min(100, row.share)}%` }} />
                  </span>
                  <span className="text-2xs tabular text-muted-foreground">{row.share}%</span>
                </span>
              ),
            },
          ]}
        />
      )}
    </Panel>
  );
}

/* ------------------------------------------------------------------ */
/* Needs attention                                                     */
/* ------------------------------------------------------------------ */

export function AttentionPanel({ items }: { items: SubscriptionAttentionItem[] | undefined }) {
  return (
    <div id="attention" className="scroll-mt-28">
      <Panel title="Subscription Needs Attention" description={items === undefined ? undefined : `${items.length} shown`} flush>
        {items === undefined ? (
          <div className="px-3 pb-3"><ChartSkeleton /></div>
        ) : (
          <MiniTable
            caption="Subscriptions needing attention"
            rows={items}
            getKey={(item) => item.id}
            empty={
              <div className="flex flex-col items-center gap-1 px-6 pt-2 pb-6 text-center">
                <CircleCheckIcon className="size-5 text-success" aria-hidden />
                <p className="text-[0.8125rem] font-medium text-foreground">No subscription needs attention</p>
                <p className="text-2xs text-muted-foreground">Trials, payments, overrides and scheduled changes are all in order.</p>
              </div>
            }
            columns={[
              { id: "severity", header: "Severity", cell: (item) => <SeverityBadge severity={item.severity} /> },
              { id: "company", header: "Company", cell: (item) => <Link href={routes.subscription(item.subscriptionId)} className="font-medium text-foreground hover:text-primary hover:underline">{item.company.name}</Link> },
              { id: "issue", header: "Issue", cell: (item) => <span><span className="block text-2xs font-medium text-muted-foreground">{ATTENTION_KIND[item.kind].label}</span>{item.issue}</span>, className: "min-w-64" },
              { id: "due", header: "Due / Detected", hideBelow: "md", cell: (item) => <span className="whitespace-nowrap text-2xs text-muted-foreground" title={formatDate(item.at)}>{relativeTime(item.at)}</span> },
              {
                id: "actions",
                header: <span className="sr-only">Actions</span>,
                align: "right",
                cell: (item) => (
                  <span className="inline-flex flex-wrap justify-end gap-1">
                    {item.actions.includes("subscription") ? <Button asChild variant="outline" size="sm"><Link href={routes.subscription(item.subscriptionId)}>Open Subscription</Link></Button> : null}
                    {item.actions.includes("company") ? <Button asChild variant="ghost" size="sm"><Link href={`/super-admin/companies/${item.company.id}`}>Open Company</Link></Button> : null}
                    {item.actions.includes("usage") ? <Button asChild variant="ghost" size="sm"><Link href={companySectionHref(item.company.id, "usage")}>Review Usage</Link></Button> : null}
                    {item.actions.includes("billing") ? <Button asChild variant="ghost" size="sm"><Link href={companySectionHref(item.company.id, "billing")}>Review Billing</Link></Button> : null}
                  </span>
                ),
              },
            ]}
          />
        )}
      </Panel>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Upcoming changes                                                    */
/* ------------------------------------------------------------------ */

export function UpcomingPanel({ items }: { items: ScheduledChangeView[] | undefined }) {
  return (
    <Panel
      title="Upcoming Subscription Changes"
      description="Scheduled, not yet applied"
      action={<Button asChild variant="ghost" size="sm"><Link href={routes.changes("scheduled")}>View All Scheduled Changes<ArrowRightIcon /></Link></Button>}
      flush
    >
      {items === undefined ? (
        <div className="px-3 pb-3"><ChartSkeleton /></div>
      ) : (
        <MiniTable
          caption="Upcoming subscription changes"
          rows={items}
          getKey={(item) => item.id}
          empty={<p className="px-3 pb-4 text-[0.8125rem] text-muted-foreground">No changes are scheduled.</p>}
          columns={[
            { id: "company", header: "Company", cell: (item) => <span className="font-medium text-foreground">{item.company.name}</span> },
            { id: "change", header: "Change", cell: (item) => <span><ScheduledKindBadge kind={item.kind} /><span className="mt-0.5 block text-[0.8125rem] text-foreground">{item.label}</span><span className="block text-2xs text-muted-foreground">{item.current} → {item.scheduled}</span></span> },
            { id: "date", header: "Effective", hideBelow: "sm", cell: (item) => <span className="whitespace-nowrap text-2xs tabular">{formatDate(item.effectiveAt)}</span> },
            { id: "status", header: "Status", hideBelow: "md", cell: (item) => <ScheduledStatusBadge status={item.status} /> },
            { id: "actions", header: <span className="sr-only">Actions</span>, align: "right", cell: (item) => <Button asChild variant="ghost" size="sm"><Link href={routes.subscription(item.subscriptionId)}>Open</Link></Button> },
          ]}
        />
      )}
    </Panel>
  );
}

/* ------------------------------------------------------------------ */
/* Ending trials                                                       */
/* ------------------------------------------------------------------ */

export function EndingTrialsPanel({ trials }: { trials: TrialRow[] | undefined }) {
  return (
    <Panel
      title="Trials Ending Soon"
      description="Convert, extend or let them end"
      action={<Button asChild variant="ghost" size="sm"><Link href={routes.changes("trials")}>Manage Trials<ArrowRightIcon /></Link></Button>}
    >
      {trials === undefined ? (
        <ChartSkeleton />
      ) : trials.length === 0 ? (
        <p className="text-[0.8125rem] text-muted-foreground">No trial ends within the next 7 days.</p>
      ) : (
        <ul className="divide-y divide-border">
          {trials.map((trial) => (
            <li key={trial.subscriptionId} className="flex items-center justify-between gap-3 py-1.5">
              <Link href={routes.subscription(trial.subscriptionId)} className="min-w-0 hover:underline">
                <span className="block truncate text-[0.8125rem] font-medium text-foreground">{trial.company.name}</span>
                <span className="block text-2xs text-muted-foreground">{trial.planName}</span>
              </Link>
              <span className={cn("shrink-0 text-2xs font-medium tabular", trial.daysRemaining <= 2 ? "text-danger" : "text-warning")}>
                {trial.daysRemaining < 0 ? `Ended ${-trial.daysRemaining}d ago` : trial.daysRemaining === 0 ? "Ends today" : `${trial.daysRemaining}d left`}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

/* ------------------------------------------------------------------ */
/* Recent activity                                                     */
/* ------------------------------------------------------------------ */

export function ActivityPanel({ events, canViewAll = true }: { events: SubscriptionEvent[] | undefined; canViewAll?: boolean }) {
  return (
    <Panel
      title="Recent Subscription Activity"
      action={canViewAll ? <Button asChild variant="ghost" size="sm"><Link href={routes.changes("recent")}>View all<ArrowRightIcon /></Link></Button> : undefined}
      flush
    >
      {events === undefined ? (
        <div className="px-3 pb-3"><ChartSkeleton /></div>
      ) : (
        <MiniTable
          caption="Recent subscription activity"
          rows={events}
          getKey={(event) => event.id}
          empty={<p className="px-3 pb-4 text-[0.8125rem] text-muted-foreground">No subscription activity yet.</p>}
          columns={[
            { id: "company", header: "Company", cell: (event) => event.company ? <Link href={routes.subscription(event.subscriptionId ?? "")} className="font-medium text-foreground hover:underline">{event.company.name}</Link> : <span className="text-muted-foreground">Platform plan</span> },
            { id: "action", header: "Action", cell: (event) => <span className="line-clamp-2">{event.summary}</span>, className: "min-w-56" },
            { id: "actor", header: "Actor", hideBelow: "md", cell: (event) => event.actor },
            { id: "time", header: "Time", cell: (event) => <span className="whitespace-nowrap text-2xs text-muted-foreground">{relativeTime(event.at)}</span> },
            { id: "result", header: "Result", hideBelow: "sm", cell: (event) => <span className={cn("text-2xs font-medium", event.result === "success" ? "text-success" : "text-danger")}>{event.result === "success" ? "Success" : event.result === "failure" ? "Failed" : "Denied"}</span> },
          ]}
        />
      )}
    </Panel>
  );
}
