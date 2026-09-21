"use client";

import { DownloadIcon, EyeIcon, SearchXIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ActionMenu, type ActionMenuItem } from "@/components/shared/action-menu";
import { EmptyState } from "@/components/shared/empty-state";
import { FilterSelect } from "@/components/shared/filter-select";
import { PageHeader } from "@/components/shared/page-header";
import { SearchInput } from "@/components/shared/search-input";
import { Button } from "@/components/ui/button";
import { Panel, StatCard, StatGrid } from "@/features/companies/components/primitives";
import { StatGridSkeleton, TableSkeleton } from "@/features/companies/components/states";
import { SUBSCRIPTION_STATUS_META } from "@/features/companies/data/config";
import { useDebouncedText, useUrlParams } from "@/features/companies/hooks/use-url-params";
import { MiniTable } from "@/features/plans-subscriptions/components/mini-table";
import { formatDate } from "@/lib/utils/format";
import { RESOURCE_DEFINITIONS, RESOURCE_BY_KEY } from "../data/catalogue";
import { COMPANY_QUICK, COMPANY_SORTS, USAGE_MOCK_MODE, UTILIZATION_STATE, usageRoutes } from "../data/config";
import { useCompanyUsageList, useFetchCompanyUsage, useUsageCapabilities } from "../data/hooks";
import type { ResourceKey, UsageRow } from "../data/types";
import { exportUsageRows } from "../lib/export";
import { baseText, limitText, number, overrideText, withUnit } from "../lib/format";
import { DemoTag, StateBadge, UtilizationBar } from "../components/badges";
import { ResourceDrawer } from "../components/resource-drawer";
import { UsageError } from "../components/states";
import { relativeTime } from "@/features/companies/data/clock";

const KEYS = ["q", "company", "plan", "sub", "resource", "state", "override", "quick", "sort", "page"] as const;
const STATE_OPTIONS = (["within", "near", "at_limit", "exceeded", "unlimited", "not_entitled", "unknown"] as const).map((state) => ({ value: state, label: UTILIZATION_STATE[state].label }));

export function CompanyUsagePage() {
  const router = useRouter();
  const capabilities = useUsageCapabilities();
  const url = useUrlParams(KEYS);
  const [search, setSearch] = useDebouncedText(url.values.q, (value) => url.set({ q: value, page: null }));
  const [drawer, setDrawer] = useState<{ companyId: string; resource: ResourceKey } | null>(null);
  const page = Math.max(1, Number(url.values.page) || 1);
  const resource = RESOURCE_BY_KEY[url.values.resource as ResourceKey] ? (url.values.resource as ResourceKey) : undefined;

  const query = {
    search: url.values.q || undefined,
    company: url.values.company || undefined,
    plan: url.values.plan || undefined,
    subscription: url.values.sub || undefined,
    resource,
    state: url.values.state || undefined,
    override: url.values.override || undefined,
    quick: url.values.quick || undefined,
    sort: url.values.sort || "utilization",
    page,
    pageSize: 10,
  };
  const result = useCompanyUsageList(query);
  const fetchUsage = useFetchCompanyUsage();
  const data = result.data;
  const filterKeys = KEYS.filter((key) => key !== "page" && key !== "sort");
  const anyFilter = filterKeys.some((key) => url.values[key]);
  const clear = () => {
    url.set({ q: null, company: null, plan: null, sub: null, resource: null, state: null, override: null, quick: null, page: null });
    setSearch("");
  };

  const exportRows = async () => exportUsageRows((await fetchUsage({ ...query, expand: !resource, page: 1, pageSize: 5000 })).rows);

  const menu = (row: UsageRow): ActionMenuItem[] => [
    { id: "inspect", label: "Inspect Company Usage", onSelect: () => router.push(usageRoutes.companyUsage(row.companyId, row.resource)) },
    { id: "details", label: "Resource Details", icon: EyeIcon, onSelect: () => setDrawer({ companyId: row.companyId, resource: row.resource }) },
    { id: "company", label: "Open Company", onSelect: () => router.push(usageRoutes.company(row.companyId)) },
    { id: "subscription", label: "View Subscription", onSelect: () => router.push(usageRoutes.subscription(row.subscriptionId)) },
    { id: "history", label: "View Usage History", onSelect: () => router.push(usageRoutes.companyUsage(row.companyId, row.resource)) },
    { id: "overrides", label: "Review Overrides", onSelect: () => router.push(`${usageRoutes.overrides}?company=${row.companyId}&resource=${row.resource}`) },
    { id: "export", label: "Export Company Usage", icon: DownloadIcon, separatorBefore: true, onSelect: () => exportUsageRows([row], `usage-${row.companyDisplayId}-${row.resource}.csv`) },
  ];

  return (
    <div className="space-y-3">
      <PageHeader
        title="Company Usage"
        description="Compare company consumption against plan allowances and effective resource limits."
        meta={USAGE_MOCK_MODE ? <DemoTag>Demo usage data</DemoTag> : undefined}
        actions={capabilities.canExportUsage ? <Button variant="outline" size="sm" onClick={() => void exportRows()}><DownloadIcon />Export</Button> : undefined}
      />

      {data ? (
        <StatGrid className="grid-cols-2 sm:grid-cols-4 xl:grid-cols-7">
          <StatCard compact label="Total Companies" value={data.counts.companies} hint="Each counted once" />
          <StatCard compact label="Within Limits" value={data.counts.within} hint="Worst resource is fine" tone="success" />
          <StatCard compact label="Near Limit" value={data.counts.near} hint="Worst resource near" tone={data.counts.near > 0 ? "warning" : "neutral"} href="?quick=near" />
          <StatCard compact label="At Limit" value={data.counts.atLimit} hint="Worst resource at limit" tone={data.counts.atLimit > 0 ? "warning" : "neutral"} href="?quick=at_limit" />
          <StatCard compact label="Exceeded" value={data.counts.exceeded} hint="A resource is over" tone={data.counts.exceeded > 0 ? "danger" : "neutral"} href="?quick=exceeded" />
          <StatCard compact label="No Usage Data" value={data.counts.noData} hint="A reading is missing" href="?quick=missing" />
          <StatCard compact label="Overrides Active" value={data.counts.overrides} hint="Overlaps the states" href="?quick=overrides" />
        </StatGrid>
      ) : result.error ? null : (
        <StatGridSkeleton count={7} className="grid-cols-2 sm:grid-cols-4 xl:grid-cols-7" />
      )}
      <p className="text-2xs text-muted-foreground">Each company is counted once, in its worst resource state, so the first six cards add up to the total. Overrides Active overlaps them. Used amounts are for each company&apos;s current billing period; seats, clients and accounts are current snapshots.</p>

      <div className="space-y-1.5">
        <div className="flex flex-wrap items-center gap-1.5">
          <SearchInput value={search} onChange={setSearch} placeholder="Search company, company ID or plan..." aria-label="Search companies" className="w-full sm:w-72" />
          <FilterSelect label="Company" value={url.values.company || undefined} options={(data?.facets.companies ?? []).map((item) => ({ value: item.id, label: item.name }))} onChange={(value) => url.set({ company: value, page: null })} />
          <FilterSelect label="Plan" value={url.values.plan || undefined} options={(data?.facets.plans ?? []).map((item) => ({ value: item, label: item }))} onChange={(value) => url.set({ plan: value, page: null })} />
          <FilterSelect label="Subscription" value={url.values.sub || undefined} options={Object.entries(SUBSCRIPTION_STATUS_META).map(([value, meta]) => ({ value, label: meta.label }))} onChange={(value) => url.set({ sub: value, page: null })} />
          <FilterSelect label="Resource" value={resource} options={RESOURCE_DEFINITIONS.map((item) => ({ value: item.key, label: item.name }))} onChange={(value) => url.set({ resource: value, page: null })} />
          <FilterSelect label="Status" value={url.values.state || undefined} options={STATE_OPTIONS} onChange={(value) => url.set({ state: value, page: null })} />
          <FilterSelect label="Override" value={url.values.override || undefined} options={[{ value: "active", label: "Active" }, { value: "none", label: "None" }]} onChange={(value) => url.set({ override: value, page: null })} />
          <FilterSelect label="Sort" value={url.values.sort || undefined} options={COMPANY_SORTS.map((item) => ({ value: item.value, label: item.label }))} onChange={(value) => url.set({ sort: value, page: null })} />
          {anyFilter ? <Button variant="ghost" size="sm" onClick={clear}>Clear Filters</Button> : null}
        </div>
        <div role="group" aria-label="Quick filters" className="flex flex-wrap items-center gap-1">
          <button type="button" aria-pressed={!url.values.quick} onClick={() => url.set({ quick: null, page: null })} className={quickClass(!url.values.quick)}>All</button>
          {COMPANY_QUICK.map((item) => (
            <button key={item.value} type="button" aria-pressed={url.values.quick === item.value} onClick={() => url.set({ quick: url.values.quick === item.value ? null : item.value, page: null })} className={quickClass(url.values.quick === item.value)}>{item.label}</button>
          ))}
          <p className="ml-1 text-2xs text-muted-foreground">
            {resource ? `Showing ${RESOURCE_BY_KEY[resource].name} for each company.` : "Showing each company's most-pressed resource. Choose a resource to compare one resource across companies."}
          </p>
        </div>
      </div>

      {result.error && !data ? (
        <UsageError subject="Company Usage" error={result.error} onRetry={() => void result.refetch()} />
      ) : !data ? (
        <TableSkeleton rows={8} columns={9} />
      ) : (
        <Panel flush>
          <MiniTable
            caption="Company usage"
            rows={data.rows}
            getKey={(row) => row.key}
            empty={
              <EmptyState
                icon={SearchXIcon}
                title={anyFilter ? "No Matching Companies" : "No Usage Data"}
                description={anyFilter ? "No company matches these filters. Try a different resource or clear them." : "No company has usage records yet."}
                action={anyFilter ? <Button variant="outline" onClick={clear}>Clear Filters</Button> : undefined}
              />
            }
            columns={[
              { id: "company", header: "Company", cell: (row) => (<div><Link href={usageRoutes.company(row.companyId)} className="font-medium text-foreground hover:text-primary hover:underline">{row.companyName}</Link><p className="text-2xs text-muted-foreground">{row.companyDisplayId}</p></div>) },
              { id: "plan", header: "Plan", hideBelow: "md", cell: (row) => row.planName },
              { id: "resource", header: "Resource", cell: (row) => <button type="button" className="text-left font-medium text-foreground hover:text-primary hover:underline" onClick={() => setDrawer({ companyId: row.companyId, resource: row.resource })}>{RESOURCE_BY_KEY[row.resource].name}</button> },
              { id: "used", header: "Current Usage", align: "right", cell: (row) => <span className="tabular">{row.used === null ? <span className="text-muted-foreground">Data Unavailable</span> : withUnit(row.used, row.resource)}</span> },
              { id: "base", header: "Base Allowance", align: "right", hideBelow: "lg", cell: (row) => <span className="tabular text-muted-foreground">{baseText(row)}</span> },
              { id: "override", header: "Override", align: "right", hideBelow: "lg", cell: (row) => <span className="tabular text-info">{overrideText(row)}</span> },
              { id: "effective", header: "Effective Allowance", align: "right", cell: (row) => <span className="tabular font-medium text-foreground">{limitText(row.effective, row) === "Unlimited" || row.resolved.limitType === "not_entitled" || row.resolved.limitType === "none" ? limitText(row.effective, row) : number(row.effective ?? 0)}</span> },
              { id: "pct", header: "Utilization", cell: (row) => (<div className="space-y-0.5"><UtilizationBar percent={row.resolved.percent} state={row.resolved.state} label={row.companyName} /><StateBadge state={row.resolved.state} /></div>) },
              { id: "reset", header: "Reset / Updated", hideBelow: "lg", cell: (row) => (<div className="whitespace-nowrap text-2xs text-muted-foreground"><p>{row.resetAt ? `Resets ${formatDate(row.resetAt)}` : "No periodic reset"}</p><p>Updated {relativeTime(row.updatedAt)}</p></div>) },
              { id: "actions", header: <span className="sr-only">Actions</span>, align: "right", cell: (row) => <ActionMenu items={menu(row)} label={`Actions for ${row.companyName}`} /> },
            ]}
          />
          <div className="flex items-center justify-between gap-2 border-t border-border px-3 py-2 text-2xs text-muted-foreground">
            <span>{data.total} row{data.total === 1 ? "" : "s"}</span>
            <div className="flex items-center gap-1.5">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => url.set({ page: String(page - 1) })}>Previous</Button>
              <span className="tabular">Page {page} of {Math.max(1, Math.ceil(data.total / data.pageSize))}</span>
              <Button variant="outline" size="sm" disabled={page >= Math.ceil(data.total / data.pageSize)} onClick={() => url.set({ page: String(page + 1) })}>Next</Button>
            </div>
          </div>
        </Panel>
      )}
      <ResourceDrawer companyId={drawer?.companyId ?? null} resource={drawer?.resource ?? null} onClose={() => setDrawer(null)} />
    </div>
  );
}

function quickClass(active: boolean) {
  return `rounded-sm border px-2.5 py-1 text-2xs font-medium transition-colors ${active ? "border-primary/40 bg-primary-subtle text-primary" : "border-border bg-card text-muted-foreground hover:bg-accent"}`;
}
