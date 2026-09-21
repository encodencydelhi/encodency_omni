"use client";

import { DownloadIcon, ExternalLinkIcon, Loader2Icon } from "lucide-react";
import Link from "next/link";
import { CHART_COLORS } from "@/components/shared/charts/chart-theme";
import { TrendAreaChart } from "@/components/shared/charts/trend-area-chart";
import { Button } from "@/components/ui/button";
import { Sheet, SheetBody, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { KeyValue } from "@/features/companies/components/primitives";
import { relativeTime } from "@/features/companies/data/clock";
import { formatDate, formatDateTime } from "@/lib/utils/format";
import { CATEGORY_LABEL, MEASUREMENT_LABEL, RESET_LABEL, RESOURCE_BY_KEY } from "../data/catalogue";
import { usageRoutes } from "../data/config";
import { useAlerts, useCompanyUsageDetail, useEvents, useTrend } from "../data/hooks";
import type { ResourceKey } from "../data/types";
import { exportUsageRows } from "../lib/export";
import { baseText, limitText, number, overrideText, withUnit } from "../lib/format";
import { AlertStatusBadge, AlertTypeLabel, ProcessingBadge, SeverityBadge, StateBadge, UtilizationBar } from "./badges";
import { UsageError } from "./states";

/**
 * A company's consumption of one resource, in full: the allowance and how it was
 * reached, the trend, who contributes, and what has happened lately. It reads the
 * same rows every other Usage & Limits screen shows.
 */
export function ResourceDrawer({ companyId, resource, onClose }: { companyId: string | null; resource: ResourceKey | null; onClose: () => void }) {
  const open = Boolean(companyId && resource);
  return (
    <Sheet open={open} onOpenChange={(next) => !next && onClose()}>
      <SheetContent className="w-full sm:max-w-lg">{open && companyId && resource ? <Body companyId={companyId} resource={resource} /> : null}</SheetContent>
    </Sheet>
  );
}

function Body({ companyId, resource }: { companyId: string; resource: ResourceKey }) {
  const detail = useCompanyUsageDetail(companyId);
  const trend = useTrend(resource, "30d", { companyId });
  const events = useEvents({ company: companyId, resource, range: "30d", pageSize: 5 });
  const alerts = useAlerts({ company: companyId, resource });
  const definition = RESOURCE_BY_KEY[resource];
  const row = detail.data?.summary.rows.find((item) => item.resource === resource);
  const contributions = (detail.data?.contributions ?? []).filter((item) => (item.values[resource] ?? 0) > 0);

  if (detail.error && !detail.data) {
    return <div className="p-4"><UsageError subject="Company Usage" error={detail.error} onRetry={() => void detail.refetch()} back={{ href: usageRoutes.companies, label: "Back to Company Usage" }} /></div>;
  }
  if (!row || !detail.data) {
    return <div className="flex items-center gap-2 p-5 text-[0.8125rem] text-muted-foreground" role="status"><Loader2Icon className="size-4 animate-spin" />Loading resource usage...</div>;
  }

  return (
    <>
      <SheetHeader>
        <SheetTitle>{definition.name}</SheetTitle>
        <SheetDescription>{row.companyName} - {row.planName}</SheetDescription>
      </SheetHeader>
      <SheetBody>
        <div className="space-y-3">
          <div className="space-y-1.5 rounded-sm border border-border p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-lg font-semibold tabular text-foreground">
                {row.used === null ? "Data Unavailable" : `${number(row.used)} / ${limitText(row.effective, row)}`}
              </p>
              <StateBadge state={row.resolved.state} />
            </div>
            <UtilizationBar percent={row.resolved.percent} state={row.resolved.state} label={definition.name} />
            {row.used === null ? <p className="text-2xs text-muted-foreground">No reading for the current window. The last known value was {withUnit(row.lastKnownUsed, resource)}. It is not treated as zero or as healthy.</p> : null}
          </div>

          <dl className="divide-y divide-border">
            <KeyValue label="Resource key"><code className="text-[11px]">{resource}</code></KeyValue>
            <KeyValue label="Category">{CATEGORY_LABEL[definition.category]}</KeyValue>
            <KeyValue label="Unit">{definition.unit}</KeyValue>
            <KeyValue label="Base plan allowance">{baseText(row)}</KeyValue>
            <KeyValue label="Applicable override">{row.override ? `${overrideText(row)} until ${formatDate(row.override.expiresAt)}` : "None"}</KeyValue>
            <KeyValue label="Effective allowance">{limitText(row.effective, row)}</KeyValue>
            <KeyValue label="Remaining capacity">{row.resolved.remaining === null ? "-" : withUnit(row.resolved.remaining, resource)}</KeyValue>
            <KeyValue label="Reset policy">{RESET_LABEL[definition.resetPolicy]}</KeyValue>
            <KeyValue label={definition.resetPolicy === "none" ? "Snapshot" : "Current period"}>
              {definition.resetPolicy === "none" ? `${MEASUREMENT_LABEL[definition.measurement].label}, no periodic reset` : `${formatDate(row.periodStart ?? "")} to ${formatDate(row.periodEnd ?? "")}`}
            </KeyValue>
            {row.resetAt ? <KeyValue label="Next reset">{formatDate(row.resetAt)}</KeyValue> : null}
            <KeyValue label="Last updated">{relativeTime(row.updatedAt)}</KeyValue>
          </dl>

          <section aria-label="Usage trend">
            <p className="mb-1 text-2xs font-semibold uppercase tracking-wide text-muted-foreground">Usage trend (30 days)</p>
            {trend.data?.points ? (
              <TrendAreaChart series={[{ key: resource, label: `${definition.name} (${definition.unit})`, color: CHART_COLORS[1] ?? "#2563eb", data: trend.data.points.map((point) => ({ date: point.at, value: point.value })) }]} height={150} tickInterval={6} />
            ) : (
              <p className="rounded-sm bg-muted/50 px-3 py-2 text-2xs text-muted-foreground">{trend.data?.unavailable ?? "Loading the trend..."}</p>
            )}
          </section>

          <section aria-label="Top contributing clients">
            <p className="mb-1 text-2xs font-semibold uppercase tracking-wide text-muted-foreground">Top contributing clients</p>
            {definition.clientAttribution === "none" ? (
              <p className="text-2xs text-muted-foreground">{definition.name} cannot be split by client. A seat or record can serve several clients, so it is only counted for the company.</p>
            ) : contributions.length === 0 ? (
              <p className="text-2xs text-muted-foreground">No client-attributable usage in this period.</p>
            ) : (
              <ul className="divide-y divide-border rounded-sm border border-border">
                {[...contributions].sort((a, b) => (b.values[resource] ?? 0) - (a.values[resource] ?? 0)).slice(0, 5).map((item) => (
                  <li key={item.clientId ?? "company"} className="flex items-center justify-between gap-2 px-3 py-1.5 text-[0.8125rem]">
                    <span className="truncate text-foreground">{item.clientName}</span>
                    <span className="tabular text-muted-foreground">{number(item.values[resource] ?? 0)}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section aria-label="Recent usage events">
            <p className="mb-1 text-2xs font-semibold uppercase tracking-wide text-muted-foreground">Recent usage events</p>
            {(events.data?.rows.length ?? 0) === 0 ? (
              <p className="text-2xs text-muted-foreground">{definition.measurement === "metered_period" ? "No events in the last 30 days." : `${definition.name} is not an event-based resource, so there are no consumption events.`}</p>
            ) : (
              <ul className="divide-y divide-border rounded-sm border border-border">
                {events.data?.rows.map((event) => (
                  <li key={event.id} className="flex items-center justify-between gap-2 px-3 py-1.5 text-[0.8125rem]">
                    <span className="text-2xs text-muted-foreground">{formatDateTime(event.occurredAt)}</span>
                    <span className="tabular text-foreground">+{number(event.quantity)} {event.unit}</span>
                    <ProcessingBadge status={event.status} />
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section aria-label="Related alerts">
            <p className="mb-1 text-2xs font-semibold uppercase tracking-wide text-muted-foreground">Related alerts</p>
            {(alerts.data?.all.filter((item) => item.companyId === companyId && item.resource === resource).length ?? 0) === 0 ? (
              <p className="text-2xs text-muted-foreground">No alerts for this resource.</p>
            ) : (
              <ul className="space-y-1">
                {alerts.data?.all.filter((item) => item.companyId === companyId && item.resource === resource).map((alert) => (
                  <li key={alert.id} className="flex flex-wrap items-center gap-1.5 rounded-sm border border-border px-3 py-1.5 text-[0.8125rem]">
                    <SeverityBadge severity={alert.severity} />
                    <AlertTypeLabel type={alert.type} />
                    <AlertStatusBadge status={alert.status} />
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </SheetBody>
      <SheetFooter className="flex-wrap">
        <Button asChild variant="outline" size="sm"><Link href={usageRoutes.companyUsage(companyId, resource)}>View Usage History<ExternalLinkIcon /></Link></Button>
        <Button asChild variant="outline" size="sm"><Link href={usageRoutes.subscription(row.subscriptionId)}>View Subscription</Link></Button>
        <Button asChild variant="outline" size="sm"><Link href={`${usageRoutes.overrides}?company=${companyId}&resource=${resource}`}>Review Overrides</Link></Button>
        <Button variant="outline" size="sm" onClick={() => exportUsageRows([row], `usage-${row.companyDisplayId}-${resource}.csv`)}><DownloadIcon />Export Resource Usage</Button>
      </SheetFooter>
    </>
  );
}
