"use client";

import { useQueryClient } from "@tanstack/react-query";
import { DownloadIcon, RefreshCwIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ActionMenu } from "@/components/shared/action-menu";
import { AlertBanner } from "@/components/shared/alert-banner";
import { CHART_COLORS } from "@/components/shared/charts/chart-theme";
import { TrendAreaChart } from "@/components/shared/charts/trend-area-chart";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Panel, StatCard, StatGrid } from "@/features/companies/components/primitives";
import { PanelSkeleton, StatGridSkeleton, TableSkeleton } from "@/features/companies/components/states";
import { useUrlParams } from "@/features/companies/hooks/use-url-params";
import { MiniTable } from "@/features/plans-subscriptions/components/mini-table";
import { cn } from "@/lib/utils/cn";
import { formatDateTime } from "@/lib/utils/format";
import { CheckCircle2Icon } from "lucide-react";
import { METERED_RESOURCES, RESOURCE_BY_KEY } from "../data/catalogue";
import { PERIODS, UTILIZATION_STATE, USAGE_MOCK_MODE, usageRoutes } from "../data/config";
import { useFetchCompanyUsage, useOverview, useTopConsumers, useTrend, useUsageCapabilities, usageKeys } from "../data/hooks";
import type { Period, ResourceKey, UtilizationState } from "../data/types";
import { exportUsageRows } from "../lib/export";
import { number, withUnit } from "../lib/format";
import { DemoTag, SeverityBadge, StateBadge, UtilizationBar } from "../components/badges";
import { UsageError } from "../components/states";
import { AlertTypeLabel } from "../components/badges";

const KEYS = ["period", "metric", "top", "sort"] as const;
const DISTRIBUTION: UtilizationState[] = ["within", "near", "at_limit", "exceeded", "unlimited", "not_entitled", "unknown"];
const SEGMENT: Record<UtilizationState, string> = {
  within: "bg-success",
  near: "bg-warning",
  at_limit: "bg-[#EA580C]",
  exceeded: "bg-danger",
  unlimited: "bg-info",
  not_entitled: "bg-neutral",
  unknown: "bg-[#94A3B8]",
  monitored: "bg-neutral",
};

function Segmented<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: ReadonlyArray<{ value: T; label: string }>; onChange: (value: T) => void }) {
  return (
    <div role="group" aria-label={label} className="inline-flex overflow-hidden rounded-sm border border-border-strong">
      {options.map((item) => (
        <button key={item.value} type="button" aria-pressed={value === item.value} onClick={() => onChange(item.value)} className={cn("h-8 px-3 text-[0.8125rem] font-medium transition-colors", value === item.value ? "bg-primary-subtle text-primary" : "bg-card text-muted-foreground hover:bg-accent")}>
          {item.label}
        </button>
      ))}
    </div>
  );
}

export function UsageOverviewPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const capabilities = useUsageCapabilities();
  const url = useUrlParams(KEYS);
  const period = (PERIODS.some((item) => item.value === url.values.period) ? url.values.period : "30d") as Period;
  const chartMetric = (METERED_RESOURCES.includes(url.values.metric as ResourceKey) ? url.values.metric : "aiCredits") as ResourceKey;
  const topResource = (RESOURCE_BY_KEY[url.values.top as ResourceKey] ? url.values.top : "aiCredits") as ResourceKey;
  const topSort = url.values.sort === "utilization" ? "utilization" : "consumption";

  const overview = useOverview(period);
  const trend = useTrend(chartMetric, period);
  const top = useTopConsumers(topResource, topSort);
  const refreshing = overview.isFetching || trend.isFetching || top.isFetching;
  const data = overview.data;

  const fetchUsage = useFetchCompanyUsage();
  const exportAll = async () => exportUsageRows((await fetchUsage({ expand: true, pageSize: 5000 })).rows);

  return (
    <div className="space-y-3">
      <PageHeader
        title="Usage & Limits"
        description="Monitor resource consumption, quota utilization, company limits and metering health across OmniPlatform."
        meta={USAGE_MOCK_MODE ? <DemoTag>Demo usage data - nothing here is measured or enforced</DemoTag> : undefined}
        actions={
          <>
            <Button asChild variant="outline" size="sm"><Link href={usageRoutes.companies}>View Company Usage</Link></Button>
            {capabilities.canExportUsage ? <Button variant="outline" size="sm" onClick={() => void exportAll()}><DownloadIcon />Export Usage</Button> : null}
            <ActionMenu
              label="More Actions"
              items={[
                { id: "near", label: "Review Near-Limit Companies", onSelect: () => router.push(`${usageRoutes.companies}?quick=near`) },
                { id: "overrides", label: "View Active Overrides", onSelect: () => router.push(`${usageRoutes.overrides}?status=active`) },
                { id: "metering", label: "Review Metering Issues", onSelect: () => router.push(usageRoutes.metering) },
              ]}
            />
          </>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <Segmented label="Usage period" value={period} options={PERIODS.map((item) => ({ value: item.value, label: item.label }))} onChange={(value) => url.set({ period: value === "30d" ? null : value })} />
        <Button variant="outline" size="sm" onClick={() => void queryClient.invalidateQueries({ queryKey: usageKeys.all })} disabled={refreshing}>
          <RefreshCwIcon className={cn(refreshing && "animate-spin")} />
          Refresh
        </Button>
        <p className="text-2xs text-muted-foreground">
          {data ? `Last updated ${formatDateTime(data.updatedAt)}.` : "Loading..."} Period totals cover the trailing {PERIODS.find((item) => item.value === period)?.label}; seats, clients and accounts are current snapshots, not period totals.
        </p>
      </div>

      {overview.error && !data ? (
        <UsageError subject="Usage Overview" error={overview.error} onRetry={() => void overview.refetch()} />
      ) : !data ? (
        <div className="space-y-1"><StatGridSkeleton count={8} className="grid-cols-2 sm:grid-cols-4 xl:grid-cols-8" /><PanelSkeleton rows={6} /></div>
      ) : (
        <>
          <StatGrid className="grid-cols-2 sm:grid-cols-4 xl:grid-cols-8">
            <StatCard compact label="Metered Companies" value={`${data.kpis.meteredCompanies} / ${data.kpis.totalCompanies}`} hint="With a valid reading" href={usageRoutes.companies} />
            <StatCard compact label="Near-Limit Companies" value={data.kpis.nearLimitCompanies} hint="Counted once, worst resource" tone={data.kpis.nearLimitCompanies > 0 ? "warning" : "neutral"} href={`${usageRoutes.companies}?quick=near`} />
            <StatCard compact label="Limit-Exceeded" value={data.kpis.exceededCompanies} hint="Above an effective limit" tone={data.kpis.exceededCompanies > 0 ? "danger" : "neutral"} href={`${usageRoutes.companies}?quick=exceeded`} />
            <StatCard compact label="AI Credits Used" value={number(data.kpis.aiCredits)} hint={`credits, last ${period.toUpperCase()}`} href={`${usageRoutes.companies}?resource=aiCredits`} />
            <StatCard compact label="Automation Runs" value={number(data.kpis.automationRuns)} hint={`runs, last ${period.toUpperCase()}`} href={`${usageRoutes.companies}?resource=automationRuns`} />
            <StatCard compact label="API Requests" value={number(data.kpis.apiRequests)} hint={`requests, last ${period.toUpperCase()}`} href={`${usageRoutes.companies}?resource=apiRequests`} />
            <StatCard compact label="Active Overrides" value={data.kpis.activeOverrides} hint="Company exceptions" href={`${usageRoutes.overrides}?status=active`} />
            <StatCard compact label="Metering Issues" value={data.kpis.meteringIssues} hint="Delayed, failed or missing" tone={data.kpis.meteringIssues > 0 ? "warning" : "neutral"} href={usageRoutes.metering} />
          </StatGrid>

          <div className="grid grid-cols-1 gap-1 lg:grid-cols-3">
            <Panel
              className="lg:col-span-2"
              title="Platform Resource Consumption"
              description={`${RESOURCE_BY_KEY[chartMetric].name} consumed across all companies, last ${period.toUpperCase()}. One resource at a time - units are never combined.`}
              action={
                <Select value={chartMetric} onValueChange={(value) => url.set({ metric: value === "aiCredits" ? null : value })}>
                  <SelectTrigger size="sm" aria-label="Resource" className="w-44"><SelectValue /></SelectTrigger>
                  <SelectContent>{METERED_RESOURCES.map((key) => <SelectItem key={key} value={key}>{RESOURCE_BY_KEY[key].name}</SelectItem>)}</SelectContent>
                </Select>
              }
            >
              {trend.error && !trend.data ? (
                <UsageError subject="Trend" error={trend.error} onRetry={() => void trend.refetch()} />
              ) : !trend.data ? (
                <div className="h-56 animate-pulse rounded-sm bg-muted" aria-busy />
              ) : trend.data.points && trend.data.total > 0 ? (
                <>
                  <p className="mb-1 text-2xs text-muted-foreground">
                    Total {withUnit(trend.data.total, chartMetric)}
                    {trend.data.previousTotal !== null && trend.data.previousTotal > 0 ? ` - ${trend.data.total >= trend.data.previousTotal ? "up" : "down"} ${Math.abs(Math.round(((trend.data.total - trend.data.previousTotal) / trend.data.previousTotal) * 100))}% on the previous ${period.toUpperCase()}` : ""}
                    {` - peak ${number(trend.data.peak)} in one ${period === "90d" ? "week" : "day"}`}
                  </p>
                  <TrendAreaChart series={[{ key: chartMetric, label: `${RESOURCE_BY_KEY[chartMetric].name} (${RESOURCE_BY_KEY[chartMetric].unit})`, color: CHART_COLORS[1] ?? "#2563eb", data: trend.data.points.map((point) => ({ date: point.at, value: point.value })) }]} height={220} tickInterval={period === "7d" ? 0 : period === "30d" ? 4 : 1} />
                </>
              ) : (
                <EmptyState icon={CheckCircle2Icon} size="sm" title="No Consumption Recorded" description={trend.data.unavailable ?? `No ${RESOURCE_BY_KEY[chartMetric].name.toLowerCase()} events in this period.`} />
              )}
            </Panel>

            <Panel title="Quota Health" description="Company and resource evaluations by state. Unlimited is never shown as 0% and unknown is never healthy.">
              {(() => {
                const total = DISTRIBUTION.reduce((sum, state) => sum + data.distribution[state], 0);
                return (
                  <div className="space-y-2">
                    <div className="flex h-3 overflow-hidden rounded-sm bg-muted" role="img" aria-label="Quota health distribution">
                      {DISTRIBUTION.map((state) => (data.distribution[state] > 0 ? <div key={state} className={cn("h-full", SEGMENT[state])} style={{ width: `${(data.distribution[state] / total) * 100}%` }} title={`${UTILIZATION_STATE[state].label}: ${data.distribution[state]}`} /> : null))}
                    </div>
                    <ul className="space-y-1">
                      {DISTRIBUTION.map((state) => (
                        <li key={state} className="flex items-center gap-2 text-[0.8125rem]">
                          <span className={cn("size-2 rounded-sm", SEGMENT[state])} aria-hidden />
                          <Link href={`${usageRoutes.companies}?state=${state}`} className="text-foreground hover:underline">{UTILIZATION_STATE[state].label}</Link>
                          <span className="ml-auto tabular text-muted-foreground">{data.distribution[state]}</span>
                        </li>
                      ))}
                    </ul>
                    <p className="text-2xs text-muted-foreground">{total} company-and-resource evaluations. Resources not controlled by a plan are not counted.</p>
                  </div>
                );
              })()}
            </Panel>
          </div>

          <div className="grid grid-cols-1 gap-1 xl:grid-cols-2">
            <Panel title="Resource-Wise Quota Health" description="Companies by state for each resource. Select a resource to open Company Usage filtered to it." flush>
              <MiniTable
                caption="Resource-wise quota health"
                rows={data.resourceHealth}
                getKey={(row) => row.resource}
                onRowClick={(row) => router.push(`${usageRoutes.companies}?resource=${row.resource}`)}
                columns={[
                  { id: "resource", header: "Resource", cell: (row) => <span className="font-medium text-foreground">{RESOURCE_BY_KEY[row.resource].name}</span> },
                  { id: "within", header: "Within", align: "right", cell: (row) => <span className="tabular">{row.within}</span> },
                  { id: "near", header: "Near", align: "right", cell: (row) => <span className={cn("tabular", row.near > 0 && "font-medium text-warning")}>{row.near}</span> },
                  { id: "at", header: "At Limit", align: "right", cell: (row) => <span className={cn("tabular", row.atLimit > 0 && "font-medium text-warning")}>{row.atLimit}</span> },
                  { id: "exceeded", header: "Exceeded", align: "right", cell: (row) => <span className={cn("tabular", row.exceeded > 0 && "font-medium text-danger")}>{row.exceeded}</span> },
                  { id: "unknown", header: "Unknown", align: "right", cell: (row) => <span className="tabular">{row.unknown}</span> },
                ]}
              />
            </Panel>

            <Panel
              title="Top Resource Consumers"
              description={topSort === "consumption" ? `Highest ${RESOURCE_BY_KEY[topResource].name} consumption: raw quantity, not a share of the limit.` : `Highest ${RESOURCE_BY_KEY[topResource].name} utilization: usage as a share of each company's own limit.`}
              flush
              action={
                <div className="flex flex-wrap items-center gap-1.5">
                  <Select value={topResource} onValueChange={(value) => url.set({ top: value === "aiCredits" ? null : value })}>
                    <SelectTrigger size="sm" aria-label="Resource for top consumers" className="w-40"><SelectValue /></SelectTrigger>
                    <SelectContent>{Object.values(RESOURCE_BY_KEY).map((item) => <SelectItem key={item.key} value={item.key}>{item.name}</SelectItem>)}</SelectContent>
                  </Select>
                  <Segmented label="Rank by" value={topSort} options={[{ value: "consumption", label: "Consumption" }, { value: "utilization", label: "Utilization" }]} onChange={(value) => url.set({ sort: value === "consumption" ? null : value })} />
                </div>
              }
            >
              {top.error && !top.data ? (
                <div className="p-3"><UsageError subject="Top Consumers" error={top.error} onRetry={() => void top.refetch()} /></div>
              ) : !top.data ? (
                <div className="p-3"><TableSkeleton rows={5} columns={5} /></div>
              ) : (
                <MiniTable
                  caption="Top resource consumers"
                  rows={top.data}
                  getKey={(row) => row.key}
                  empty={<EmptyState icon={CheckCircle2Icon} size="sm" title="No Usage Data" description="No company has a reading for this resource." />}
                  columns={[
                    { id: "company", header: "Company", cell: (row) => <Link href={usageRoutes.company(row.companyId)} className="font-medium text-foreground hover:text-primary hover:underline">{row.companyName}</Link> },
                    { id: "used", header: "Consumed", align: "right", cell: (row) => <span className="tabular">{number(row.used ?? 0)}</span> },
                    { id: "limit", header: "Effective Limit", align: "right", hideBelow: "md", cell: (row) => <span className="tabular text-muted-foreground">{row.effective === null ? "Unlimited" : row.effective === 0 ? "Not Entitled" : number(row.effective)}</span> },
                    { id: "pct", header: "Utilization", hideBelow: "md", cell: (row) => <UtilizationBar percent={row.resolved.percent} state={row.resolved.state} label={row.companyName} /> },
                    { id: "state", header: "Status", cell: (row) => <StateBadge state={row.resolved.state} /> },
                    { id: "action", header: <span className="sr-only">Action</span>, align: "right", cell: (row) => <Button asChild variant="ghost" size="sm"><Link href={usageRoutes.companyUsage(row.companyId, row.resource)}>Inspect</Link></Button> },
                  ]}
                />
              )}
            </Panel>
          </div>

          <Panel title="Needs Attention" description="Open conditions that need a person. Quota changes go through the shared override review, never a one-click increase." flush>
            {data.attention.length === 0 ? (
              <EmptyState icon={CheckCircle2Icon} size="sm" title="Nothing Needs Attention" description="No open alerts. Acknowledged alerts are listed in Alerts & Overages." action={<Button asChild variant="outline" size="sm"><Link href={usageRoutes.alerts}>View Alerts</Link></Button>} />
            ) : (
              <ul className="divide-y divide-border border-t border-border">
                {data.attention.map((item) => (
                  <li key={item.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2">
                    <SeverityBadge severity={item.severity} />
                    <div className="min-w-0 flex-1">
                      <p className="text-[0.8125rem] font-medium text-foreground">{item.companyName} <span className="font-normal text-muted-foreground">- {RESOURCE_BY_KEY[item.resource].name} - <AlertTypeLabel type={item.kind} /></span></p>
                      <p className="line-clamp-2 text-2xs text-muted-foreground">{item.reason}</p>
                    </div>
                    <span className="whitespace-nowrap text-2xs text-muted-foreground">{formatDateTime(item.detectedAt)}</span>
                    <div className="flex flex-wrap gap-1">
                      <Button asChild variant="outline" size="sm"><Link href={item.kind === "metering" ? usageRoutes.metering : usageRoutes.companyUsage(item.companyId, item.resource)}>{item.kind === "metering" ? "Inspect Metering" : "Inspect Usage"}</Link></Button>
                      {item.kind === "override_expiring" ? <Button asChild variant="outline" size="sm"><Link href={`${usageRoutes.overrides}?company=${item.companyId}&resource=${item.resource}`}>Review Override</Link></Button> : null}
                      {item.subscriptionId && item.kind !== "metering" ? <Button asChild variant="ghost" size="sm"><Link href={usageRoutes.subscription(item.subscriptionId)}>Open Subscription</Link></Button> : null}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
          {USAGE_MOCK_MODE ? <AlertBanner tone="info" title="Demo Data">Usage, alerts and metering health are deterministic demo data derived from the shared company records. No quota is enforced, no charge is made and no worker runs in this frontend phase.</AlertBanner> : null}
        </>
      )}
    </div>
  );
}
