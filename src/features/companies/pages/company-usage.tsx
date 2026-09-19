"use client";

import { ArrowRightIcon, DownloadIcon, GaugeIcon, LineChartIcon, SlidersHorizontalIcon, TriangleAlertIcon } from "lucide-react";
import Link from "next/link";
import { useMemo, useRef } from "react";
import { EmptyState } from "@/components/shared/empty-state";
import { CHART_COLORS } from "@/components/shared/charts/chart-theme";
import { TrendAreaChart } from "@/components/shared/charts/trend-area-chart";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils/cn";
import { formatDate, formatNumber } from "@/lib/utils/format";
import { Field, Panel, StatCard, StatGrid, WithTooltip } from "../components/primitives";
import { SectionError, PanelSkeleton, StatGridSkeleton, TableSkeleton } from "../components/states";
import { ResourceStatusBadge } from "../components/status-badges";
import { useCompanyActions } from "../components/use-company-actions";
import { UsageBar } from "../components/usage-bar";
import { platformNow, relativeTime } from "../data/clock";
import { USAGE_METHOD, USAGE_RESOURCES, USAGE_RESOURCE_BY_KEY, companySectionHref } from "../data/config";
import { useCompanyUsage, useUsageHistory } from "../data/hooks";
import type { CompanyUsageSummary, UsageResource } from "../data/types";
import { downloadCsv } from "../lib/csv";
import { formatLimit, formatPercent1, formatUsed, toDateInput } from "../lib/format";
import { useUrlParams } from "../hooks/use-url-params";
import { useCompanyId } from "./company-shell";

const URL_KEYS = ["metric", "range", "from", "to"] as const;
const RANGES = [
  { value: "7", label: "7D" },
  { value: "30", label: "30D" },
  { value: "90", label: "90D" },
  { value: "custom", label: "Custom" },
] as const;

export function CompanyUsagePage() {
  const companyId = useCompanyId();
  const query = useCompanyUsage(companyId);

  if (query.error) return <SectionError subject="Usage data" error={query.error} onRetry={() => void query.refetch()} module={{ key: "usage", label: "Usage & Limits" }} />;
  if (!query.data) {
    return (
      <div className="space-y-1">
        <StatGridSkeleton count={6} className="grid-cols-2 sm:grid-cols-3 xl:grid-cols-6" />
        <TableSkeleton rows={9} columns={7} />
        <PanelSkeleton rows={5} />
      </div>
    );
  }
  return <UsageBody companyId={companyId} usage={query.data} />;
}

function UsageBody({ companyId, usage }: { companyId: string; usage: CompanyUsageSummary }) {
  const { capabilities, openFlow, dialogs } = useCompanyActions();
  const chartRef = useRef<HTMLDivElement>(null);
  const url = useUrlParams(URL_KEYS);

  const resource = (USAGE_RESOURCES.some((def) => def.key === url.values.metric) ? url.values.metric : "aiCredits") as UsageResource;
  const rangeKey = RANGES.some((item) => item.value === url.values.range) ? url.values.range : "30";
  const def = USAGE_RESOURCE_BY_KEY[resource];

  const today = toDateInput(new Date(platformNow()).toISOString());
  const range = useMemo(() => {
    if (rangeKey === "custom") {
      const from = url.values.from || toDateInput(new Date(platformNow() - 29 * 86_400_000).toISOString());
      const to = url.values.to || today;
      return { from, to: to < from ? from : to };
    }
    const days = Number(rangeKey);
    return { from: toDateInput(new Date(platformNow() - (days - 1) * 86_400_000).toISOString()), to: today };
  }, [rangeKey, today, url.values.from, url.values.to]);

  const history = useUsageHistory(companyId, resource, range);
  const points = history.data?.points ?? [];
  const hasData = points.some((point) => point.value > 0);

  const highest = usage.highest;
  const trend = highest && highest.previousUsed > 0 ? ((highest.used - highest.previousUsed) / highest.previousUsed) * 100 : null;
  const canOverride = capabilities.canApplyUsageOverride;

  const exportUsage = () =>
    downloadCsv(
      "company-usage.csv",
      ["Resource", "Used", "Included limit", "Override limit", "Effective limit", "Utilisation %", "Status", "Previous period used", "Last updated"],
      usage.records.map((record) => [
        USAGE_RESOURCE_BY_KEY[record.resource].label,
        record.used,
        record.includedLimit ?? (USAGE_RESOURCE_BY_KEY[record.resource].metric ? "Unlimited" : "Not plan-controlled"),
        record.activeOverride?.overrideLimit ?? "",
        record.effectiveLimit ?? "",
        record.utilization ?? "",
        record.status,
        record.previousUsed,
        record.updatedAt,
      ]),
    );

  return (
    <div className="space-y-1">
      <StatGrid className="grid-cols-2 sm:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Current period" value={<span className="text-[0.8125rem]">{formatDate(usage.periodStart)}</span>} hint={`to ${formatDate(usage.periodEnd)}`} />
        <StatCard label="Previous period" value={<span className="text-[0.8125rem]">{formatDate(usage.previousPeriodStart)}</span>} hint={`to ${formatDate(usage.periodStart)}`} />
        <StatCard
          label="Highest utilisation"
          value={highest ? formatPercent1(highest.utilization) : "-"}
          hint={highest ? USAGE_RESOURCE_BY_KEY[highest.resource].label : "No alertable resource"}
          tone={highest?.status === "exceeded" ? "danger" : highest?.status === "near_limit" ? "warning" : "neutral"}
          title={USAGE_METHOD}
        />
        <StatCard
          label="Usage trend"
          value={trend === null ? "-" : `${trend > 0 ? "+" : ""}${trend.toFixed(0)}%`}
          hint={highest ? `${USAGE_RESOURCE_BY_KEY[highest.resource].label} vs previous` : "No comparison"}
        />
        <StatCard label="Near limit" value={usage.nearLimit.length} tone={usage.nearLimit.length > 0 ? "warning" : "neutral"} hint="At or above 90%" />
        <StatCard label="Exceeded" value={usage.exceeded.length} tone={usage.exceeded.length > 0 ? "danger" : "neutral"} hint="Above 100%" />
      </StatGrid>

      <Panel
        title="Resource usage"
        description={USAGE_METHOD}
        flush
        action={
          <div className="flex flex-wrap items-center gap-1.5">
            {usage.exceeded.length > 0 ? (
              <Button variant="outline" size="sm" onClick={() => document.getElementById("usage-table")?.scrollIntoView({ behavior: "smooth" })}>
                <TriangleAlertIcon />
                Review overages
              </Button>
            ) : null}
            <Button variant="outline" size="sm" onClick={() => chartRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}>
              <LineChartIcon />
              View usage history
            </Button>
            <Button variant="outline" size="sm" onClick={exportUsage}>
              <DownloadIcon />
              Export usage
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href={companySectionHref(companyId, "subscription")}>
                Open subscription
                <ArrowRightIcon />
              </Link>
            </Button>
          </div>
        }
      >
        <div id="usage-table" className="relative overflow-x-auto border-t border-border">
          <table className="w-full min-w-[56rem] text-[0.8125rem]">
            <thead className="bg-surface-sunken text-left text-2xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-semibold">Resource</th>
                <th className="px-3 py-2 text-right font-semibold">Used</th>
                <th className="px-3 py-2 text-right font-semibold">Included</th>
                <th className="px-3 py-2 text-right font-semibold">Override</th>
                <th className="px-3 py-2 text-right font-semibold">Effective</th>
                <th className="w-40 px-3 py-2 font-semibold">Utilisation</th>
                <th className="px-3 py-2 font-semibold">Status</th>
                <th className="px-3 py-2 font-semibold">Updated</th>
                <th className="px-3 py-2"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {usage.records.map((record) => {
                const item = USAGE_RESOURCE_BY_KEY[record.resource];
                const attention = record.status === "near_limit" || record.status === "exceeded";
                return (
                  <tr key={record.resource} className={cn(record.status === "exceeded" && "bg-danger-subtle/40", record.status === "near_limit" && "bg-warning-subtle/30")}>
                    <td className="px-3 py-2">
                      <button type="button" className="text-left font-medium text-foreground hover:underline" onClick={() => { url.set({ metric: record.resource }); chartRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }); }}>
                        {item.label}
                      </button>
                      {item.capped ? <span className="block text-2xs text-muted-foreground">Hard cap</span> : null}
                    </td>
                    <td className="px-3 py-2 text-right tabular text-foreground">{formatUsed(record.used, record.resource)}</td>
                    <td className="px-3 py-2 text-right tabular text-muted-foreground">{formatLimit(record.includedLimit, record.resource)}</td>
                    <td className="px-3 py-2 text-right tabular text-info">{record.activeOverride ? formatLimit(record.activeOverride.overrideLimit, record.resource) : <span className="text-muted-foreground">-</span>}</td>
                    <td className="px-3 py-2 text-right font-medium tabular text-foreground">{formatLimit(record.effectiveLimit, record.resource)}</td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <UsageBar utilization={record.utilization} status={record.status} label={item.label} className="flex-1" />
                        <span className="w-10 shrink-0 text-right text-2xs tabular text-muted-foreground">{formatPercent1(record.utilization)}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2"><ResourceStatusBadge status={record.status} /></td>
                    <td className="whitespace-nowrap px-3 py-2 text-2xs text-muted-foreground">{relativeTime(record.updatedAt)}</td>
                    <td className="px-3 py-2 text-right">
                      {item.metric && canOverride && attention ? (
                        <Button variant="ghost" size="sm" onClick={() => openFlow({ kind: "override", companyId, resource: record.resource })}>
                          <SlidersHorizontalIcon />
                          Adjust limit
                        </Button>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>

      <div ref={chartRef} className="scroll-mt-24">
        <Panel
          title={`${def.label} over time`}
          description={def.kind === "flow" ? `Daily ${def.unit} consumed. One metric at a time - units are never combined on a chart.` : `${def.label} at the end of each day.`}
          action={
            <div className="flex flex-wrap items-center gap-1.5">
              {canOverride && def.metric ? (
                <Button variant="ghost" size="sm" onClick={() => openFlow({ kind: "override", companyId, resource })}>
                  <SlidersHorizontalIcon />
                  Adjust temporary limit
                </Button>
              ) : null}
              {points.length > 0 ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => downloadCsv(`usage-${resource}.csv`, ["Date", `${def.label} (${def.unit})`], points.map((point) => [point.date, point.value]))}
                >
                  <DownloadIcon />
                  Export series
                </Button>
              ) : null}
            </div>
          }
        >
          <div className="mb-3 flex flex-wrap items-end gap-2">
            <Field label="Metric" htmlFor="usage-metric" className="w-52">
              <Select value={resource} onValueChange={(value) => url.set({ metric: value })}>
                <SelectTrigger id="usage-metric" size="sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {USAGE_RESOURCES.map((item) => (
                    <SelectItem key={item.key} value={item.key}>{item.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <div role="group" aria-label="Date range" className="inline-flex overflow-hidden rounded-sm border border-border-strong">
              {RANGES.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  aria-pressed={rangeKey === item.value}
                  onClick={() => url.set({ range: item.value === "30" ? null : item.value, ...(item.value !== "custom" ? { from: null, to: null } : {}) })}
                  className={cn("h-8 px-3 text-[0.8125rem] font-medium transition-colors", rangeKey === item.value ? "bg-primary-subtle text-primary" : "bg-card text-muted-foreground hover:bg-accent")}
                >
                  {item.label}
                </button>
              ))}
            </div>
            {rangeKey === "custom" ? (
              <div className="flex items-end gap-1.5">
                <Field label="From" htmlFor="usage-from"><Input id="usage-from" type="date" value={range.from} max={today} onChange={(event) => url.set({ from: event.target.value })} className="h-8" /></Field>
                <Field label="To" htmlFor="usage-to"><Input id="usage-to" type="date" value={range.to} min={range.from} max={today} onChange={(event) => url.set({ to: event.target.value })} className="h-8" /></Field>
              </div>
            ) : null}
            <p className="ml-auto text-2xs text-muted-foreground">
              Effective limit <span className="font-medium text-foreground">{formatLimit(history.data?.limit ?? usage.records.find((record) => record.resource === resource)?.effectiveLimit ?? null, resource)}</span>
              {def.kind === "flow" ? " per period" : ""}
            </p>
          </div>

          {history.error ? (
            <SectionError subject="Usage history" error={history.error} onRetry={() => void history.refetch()} />
          ) : history.isPending ? (
            <div className="h-56 animate-pulse rounded-sm bg-muted" aria-busy />
          ) : !hasData ? (
            <EmptyState icon={GaugeIcon} size="sm" title="No usage history" description={`No ${def.label.toLowerCase()} recorded in this range. Try a longer range or a different metric.`} />
          ) : (
            <WithTooltip content={`${points.length} days · peak ${formatNumber(Math.max(...points.map((point) => point.value)))} ${def.unit}`} className="block">
              <TrendAreaChart
                series={[{ key: resource, label: `${def.label} (${def.unit})`, color: CHART_COLORS[1], data: points }]}
                height={240}
                tickInterval={Math.max(0, Math.floor(points.length / 8) - 1)}
              />
            </WithTooltip>
          )}
        </Panel>
      </div>
      {dialogs}
    </div>
  );
}
