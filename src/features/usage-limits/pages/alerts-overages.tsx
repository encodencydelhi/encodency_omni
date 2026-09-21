"use client";

import { BellOffIcon, CheckCircle2Icon, DownloadIcon, EyeIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ActionMenu, type ActionMenuItem } from "@/components/shared/action-menu";
import { AlertBanner } from "@/components/shared/alert-banner";
import { EmptyState } from "@/components/shared/empty-state";
import { FilterSelect } from "@/components/shared/filter-select";
import { PageHeader } from "@/components/shared/page-header";
import { SearchInput } from "@/components/shared/search-input";
import { Button } from "@/components/ui/button";
import { Panel, StatCard, StatGrid } from "@/features/companies/components/primitives";
import { StatGridSkeleton, TableSkeleton } from "@/features/companies/components/states";
import { useDebouncedText, useUrlParams } from "@/features/companies/hooks/use-url-params";
import { MiniTable } from "@/features/plans-subscriptions/components/mini-table";
import { formatDate, formatDateTime } from "@/lib/utils/format";
import { RESOURCE_BY_KEY, RESOURCE_DEFINITIONS } from "../data/catalogue";
import { ALERT_QUICK, ALERT_SEVERITY, ALERT_SORTS, ALERT_STATUS, ALERT_TYPE, USAGE_MOCK_MODE, usageRoutes } from "../data/config";
import { useAlerts, useUsageCapabilities } from "../data/hooks";
import type { UsageAlert } from "../data/types";
import { exportAlerts } from "../lib/export";
import { number, percentText, withUnit } from "../lib/format";
import { AcknowledgeDialog, AlertDrawer } from "../components/alert-drawer";
import { AlertStatusBadge, AlertTypeLabel, DemoTag, SeverityBadge } from "../components/badges";
import { UsageError } from "../components/states";

const KEYS = ["q", "severity", "company", "resource", "type", "status", "quick", "sort", "open"] as const;
const quickClass = (active: boolean) => `rounded-sm border px-2.5 py-1 text-2xs font-medium transition-colors ${active ? "border-primary/40 bg-primary-subtle text-primary" : "border-border bg-card text-muted-foreground hover:bg-accent"}`;

export function AlertsOveragesPage() {
  const router = useRouter();
  const capabilities = useUsageCapabilities();
  const url = useUrlParams(KEYS);
  const [search, setSearch] = useDebouncedText(url.values.q, (value) => url.set({ q: value }));
  const [acknowledging, setAcknowledging] = useState<UsageAlert | null>(null);
  const query = useAlerts({
    search: url.values.q || undefined,
    severity: url.values.severity || undefined,
    company: url.values.company || undefined,
    resource: url.values.resource || undefined,
    type: url.values.type || undefined,
    status: url.values.status || undefined,
    quick: url.values.quick || undefined,
    sort: url.values.sort || "severity",
  });
  const data = query.data;
  const anyFilter = KEYS.filter((key) => key !== "sort" && key !== "open").some((key) => url.values[key]);
  const clear = () => { url.set({ q: null, severity: null, company: null, resource: null, type: null, status: null, quick: null }); setSearch(""); };

  const menu = (alert: UsageAlert): ActionMenuItem[] => {
    const items: ActionMenuItem[] = [
      { id: "view", label: "View Alert", icon: EyeIcon, onSelect: () => url.set({ open: alert.id }) },
      { id: "usage", label: "Open Company Usage", onSelect: () => router.push(usageRoutes.companyUsage(alert.companyId, alert.resource)) },
    ];
    if (alert.status === "open" && capabilities.canAcknowledgeUsageAlerts) items.push({ id: "ack", label: "Acknowledge", icon: CheckCircle2Icon, onSelect: () => setAcknowledging(alert) });
    if (alert.type === "override_expiring" || alert.type === "exceeded" || alert.type === "at_limit") items.push({ id: "override", label: "Review Override", onSelect: () => router.push(`${usageRoutes.overrides}?company=${alert.companyId}&resource=${alert.resource}`) });
    if (alert.subscriptionId && alert.type !== "metering") items.push({ id: "sub", label: "Open Subscription", onSelect: () => router.push(usageRoutes.subscription(alert.subscriptionId as string)) });
    if (alert.type === "metering") items.push({ id: "metering", label: "Inspect Metering", onSelect: () => router.push(usageRoutes.metering) });
    return items;
  };

  return (
    <div className="space-y-3">
      <PageHeader
        title="Alerts & Overages"
        description="A platform-wide queue of quota warnings, exceeded limits, expiring overrides and metering issues. Acknowledging an alert records that it was seen; it does not change usage or resolve the condition."
        meta={USAGE_MOCK_MODE ? <DemoTag>Demo alerts</DemoTag> : undefined}
        actions={capabilities.canExportUsage && data ? <Button variant="outline" size="sm" onClick={() => exportAlerts(data.alerts)}><DownloadIcon />Export</Button> : undefined}
      />

      {data ? (
        <StatGrid className="grid-cols-2 sm:grid-cols-4 xl:grid-cols-7">
          <StatCard compact label="Open Alerts" value={data.counts.open} hint="Not yet acknowledged" tone={data.counts.open > 0 ? "warning" : "neutral"} href="?quick=open" />
          <StatCard compact label="Warning" value={data.counts.warning} hint="Live warnings" href="?severity=warning" />
          <StatCard compact label="Critical" value={data.counts.critical} hint="Live critical" tone={data.counts.critical > 0 ? "danger" : "neutral"} href="?quick=critical" />
          <StatCard compact label="At Limit" value={data.counts.atLimit} hint="Exactly at a limit" href="?type=at_limit" />
          <StatCard compact label="Exceeded" value={data.counts.exceeded} hint="Above a limit" tone={data.counts.exceeded > 0 ? "danger" : "neutral"} href="?quick=exceeded" />
          <StatCard compact label="Overrides Expiring" value={data.counts.expiring} hint="Would leave usage over" tone={data.counts.expiring > 0 ? "warning" : "neutral"} href="?quick=expiring" />
          <StatCard compact label="Metering Failures" value={data.counts.metering} hint="Reading missing" href="?quick=metering" />
        </StatGrid>
      ) : query.error ? null : (
        <StatGridSkeleton count={7} className="grid-cols-2 sm:grid-cols-4 xl:grid-cols-7" />
      )}

      <div className="space-y-1.5">
        <div className="flex flex-wrap items-center gap-1.5">
          <SearchInput value={search} onChange={setSearch} placeholder="Search company, resource or alert ID..." aria-label="Search alerts" className="w-full sm:w-72" />
          <FilterSelect label="Severity" value={url.values.severity || undefined} options={Object.entries(ALERT_SEVERITY).map(([value, meta]) => ({ value, label: meta.label }))} onChange={(value) => url.set({ severity: value })} />
          <FilterSelect label="Company" value={url.values.company || undefined} options={(data?.facets.companies ?? []).map((item) => ({ value: item.id, label: item.name }))} onChange={(value) => url.set({ company: value })} />
          <FilterSelect label="Resource" value={url.values.resource || undefined} options={RESOURCE_DEFINITIONS.map((item) => ({ value: item.key, label: item.name }))} onChange={(value) => url.set({ resource: value })} />
          <FilterSelect label="Type" value={url.values.type || undefined} options={Object.entries(ALERT_TYPE).map(([value, meta]) => ({ value, label: meta.label }))} onChange={(value) => url.set({ type: value })} />
          <FilterSelect label="Status" value={url.values.status || undefined} options={Object.entries(ALERT_STATUS).map(([value, meta]) => ({ value, label: meta.label }))} onChange={(value) => url.set({ status: value })} />
          <FilterSelect label="Sort" value={url.values.sort || undefined} options={ALERT_SORTS.map((item) => ({ value: item.value, label: item.label }))} onChange={(value) => url.set({ sort: value })} />
          {anyFilter ? <Button variant="ghost" size="sm" onClick={clear}>Clear Filters</Button> : null}
        </div>
        <div role="group" aria-label="Quick filters" className="flex flex-wrap items-center gap-1">
          <button type="button" aria-pressed={!url.values.quick} onClick={() => url.set({ quick: null })} className={quickClass(!url.values.quick)}>All</button>
          {ALERT_QUICK.map((item) => <button key={item.value} type="button" aria-pressed={url.values.quick === item.value} onClick={() => url.set({ quick: url.values.quick === item.value ? null : item.value })} className={quickClass(url.values.quick === item.value)}>{item.label}</button>)}
        </div>
      </div>

      {query.error && !data ? (
        <UsageError subject="Alerts" error={query.error} onRetry={() => void query.refetch()} />
      ) : !data ? (
        <TableSkeleton rows={8} columns={8} />
      ) : (
        <Panel flush>
          <MiniTable
            caption="Usage alerts"
            rows={data.alerts}
            getKey={(alert) => alert.id}
            onRowClick={(alert) => url.set({ open: alert.id })}
            empty={
              <EmptyState
                icon={anyFilter ? BellOffIcon : CheckCircle2Icon}
                title={anyFilter ? "No Matching Alerts" : "No Active Alerts"}
                description={anyFilter ? "No alert matches these filters." : "Every company is within its limits and every reading is current."}
                action={anyFilter ? <Button variant="outline" onClick={clear}>Clear Filters</Button> : undefined}
              />
            }
            columns={[
              { id: "severity", header: "Severity", cell: (alert) => <SeverityBadge severity={alert.severity} /> },
              { id: "company", header: "Company", cell: (alert) => <Link href={usageRoutes.company(alert.companyId)} onClick={(event) => event.stopPropagation()} className="font-medium text-foreground hover:text-primary hover:underline">{alert.companyName}</Link> },
              { id: "resource", header: "Resource", hideBelow: "md", cell: (alert) => RESOURCE_BY_KEY[alert.resource].name },
              { id: "usage", header: "Usage / Effective Limit", cell: (alert) => (<span className="tabular">{alert.used === null ? "Data Unavailable" : number(alert.used)} / {alert.limit === null ? "Unlimited" : number(alert.limit)}<span className="ml-1 text-2xs text-muted-foreground">{percentText(alert.percent)}</span></span>) },
              { id: "type", header: "Alert Type", cell: (alert) => <AlertTypeLabel type={alert.type} /> },
              { id: "at", header: "Triggered", hideBelow: "lg", cell: (alert) => <span className="whitespace-nowrap text-2xs tabular text-muted-foreground">{formatDateTime(alert.firstTriggeredAt)}</span> },
              { id: "status", header: "Status", cell: (alert) => (<div><AlertStatusBadge status={alert.status} />{alert.status === "acknowledged" && alert.acknowledgedBy ? <p className="mt-0.5 text-2xs text-muted-foreground">by {alert.acknowledgedBy}</p> : null}</div>) },
              { id: "actions", header: <span className="sr-only">Actions</span>, align: "right", cell: (alert) => <span onClick={(event) => event.stopPropagation()}><ActionMenu items={menu(alert)} label={`Actions for ${alert.companyName} alert`} /></span> },
            ]}
          />
        </Panel>
      )}

      {data ? (
        <Panel title="Overages" description="Operational exceeded usage. Whether it is billable is decided by the commercial policy and handled in Billing & Payments." flush>
          <AlertBanner tone="info" className="m-3 mt-0">Billable overages are not configured in the plan catalogue, so no charge is estimated or shown. An exceeded limit is not automatically billable.</AlertBanner>
          <MiniTable
            caption="Exceeded usage"
            rows={data.overages}
            getKey={(row) => row.key}
            empty={<EmptyState icon={CheckCircle2Icon} size="sm" title="No Overages" description="No company is above an effective limit." />}
            columns={[
              { id: "company", header: "Company", cell: (row) => <Link href={usageRoutes.company(row.companyId)} className="font-medium text-foreground hover:text-primary hover:underline">{row.companyName}</Link> },
              { id: "resource", header: "Resource", cell: (row) => RESOURCE_BY_KEY[row.resource].name },
              { id: "included", header: "Included Allowance", align: "right", cell: (row) => <span className="tabular">{withUnit(row.included, row.resource)}</span> },
              { id: "used", header: "Actual Usage", align: "right", cell: (row) => <span className="tabular">{withUnit(row.used, row.resource)}</span> },
              { id: "excess", header: "Excess Quantity", align: "right", cell: (row) => <span className="tabular font-medium text-danger">{withUnit(row.excess, row.resource)}</span> },
              { id: "period", header: "Billing Period Ends", hideBelow: "md", cell: (row) => (row.periodEnd ? formatDate(row.periodEnd) : "Not period-based") },
              { id: "billing", header: "Billing Status", hideBelow: "lg", cell: () => <span className="text-2xs text-muted-foreground">No Charge Configured</span> },
              { id: "action", header: <span className="sr-only">Action</span>, align: "right", cell: (row) => <Button asChild variant="ghost" size="sm"><Link href={usageRoutes.companyUsage(row.companyId, row.resource)}>Inspect</Link></Button> },
            ]}
          />
        </Panel>
      ) : null}

      <AlertDrawer alertId={url.values.open || null} onClose={() => url.set({ open: null })} />
      {acknowledging ? <AcknowledgeDialog alert={acknowledging} onClose={() => setAcknowledging(null)} /> : null}
    </div>
  );
}
