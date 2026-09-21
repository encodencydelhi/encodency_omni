"use client";

import { DownloadIcon, EyeIcon, PlusIcon, SearchXIcon, SlidersHorizontalIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { ActionMenu, type ActionMenuItem } from "@/components/shared/action-menu";
import { EmptyState } from "@/components/shared/empty-state";
import { FilterSelect } from "@/components/shared/filter-select";
import { PageHeader } from "@/components/shared/page-header";
import { SearchInput } from "@/components/shared/search-input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Panel, StatCard, StatGrid } from "@/features/companies/components/primitives";
import { StatGridSkeleton, TableSkeleton } from "@/features/companies/components/states";
import { useDebouncedText, useUrlParams } from "@/features/companies/hooks/use-url-params";
import { MiniTable } from "@/features/plans-subscriptions/components/mini-table";
import { formatDate } from "@/lib/utils/format";
import { RESOURCE_BY_KEY, RESOURCE_DEFINITIONS } from "../data/catalogue";
import { OVERRIDE_SORTS, OVERRIDE_STATUS, USAGE_MOCK_MODE, usageRoutes } from "../data/config";
import { useOverrides, useUsageCapabilities } from "../data/hooks";
import type { OverrideRow, ResourceKey } from "../data/types";
import { exportOverrides } from "../lib/export";
import { number } from "../lib/format";
import { DemoTag, OverrideStatusBadge } from "../components/badges";
import { CreateOverrideDialog, OverrideDrawer, RevokeOverrideDialog } from "../components/override-actions";
import { UsageError } from "../components/states";

const KEYS = ["q", "company", "resource", "rule", "status", "by", "sort", "open"] as const;

const allowance = (value: number | null, resource: ResourceKey) => (value === null ? "Unlimited" : `${number(value)} ${RESOURCE_BY_KEY[resource].unit}`);

export function OverridesPage() {
  const router = useRouter();
  const capabilities = useUsageCapabilities();
  const url = useUrlParams(KEYS);
  const [search, setSearch] = useDebouncedText(url.values.q, (value) => url.set({ q: value }));
  const [creating, setCreating] = useState<{ companyId?: string; resource?: ResourceKey } | null>(null);
  const [revoking, setRevoking] = useState<OverrideRow | null>(null);
  const query = useOverrides({ search: url.values.q || undefined, company: url.values.company || undefined, resource: url.values.resource || undefined, rule: url.values.rule || undefined, status: url.values.status || undefined, approvedBy: url.values.by || undefined, sort: url.values.sort || "expiring" });
  const data = query.data;
  const opened = data?.rows.find((row) => row.id === url.values.open) ?? null;
  const anyFilter = KEYS.filter((key) => key !== "sort" && key !== "open").some((key) => url.values[key]);
  const clear = () => { url.set({ q: null, company: null, resource: null, rule: null, status: null, by: null }); setSearch(""); };
  const subscriptions = useMemo(() => Object.fromEntries((data?.facets.companies ?? []).map((item) => [item.id, item.subscriptionId])), [data]);
  const canManage = capabilities.canManageEntitlementOverrides;

  const menu = (row: OverrideRow): ActionMenuItem[] => {
    const items: ActionMenuItem[] = [
      { id: "view", label: "View Override", icon: EyeIcon, onSelect: () => url.set({ open: row.id }) },
      { id: "usage", label: "Open Company Usage", onSelect: () => router.push(usageRoutes.companyUsage(row.companyId, row.resource)) },
      { id: "sub", label: "Open Subscription", onSelect: () => router.push(usageRoutes.subscription(row.subscriptionId)) },
    ];
    if (canManage) items.push({ id: "create", label: "Create New Override", icon: PlusIcon, separatorBefore: true, onSelect: () => setCreating({ companyId: row.companyId, resource: row.resource }) });
    if (canManage && (row.status === "active" || row.status === "scheduled")) items.push({ id: "revoke", label: "Revoke Override", variant: "destructive", onSelect: () => setRevoking(row) });
    return items;
  };

  return (
    <div className="space-y-3">
      <PageHeader
        title="Overrides"
        description="Approved exceptions to a company's plan allowance. These are the same records Plans & Subscriptions holds: granting or revoking here changes the company's effective limit everywhere."
        meta={USAGE_MOCK_MODE ? <DemoTag>Demo overrides</DemoTag> : undefined}
        actions={
          <>
            {capabilities.canExportUsage && data ? <Button variant="outline" size="sm" onClick={() => exportOverrides(data.rows)}><DownloadIcon />Export</Button> : null}
            {canManage ? <Button size="sm" onClick={() => setCreating({ companyId: url.values.company || undefined, resource: (url.values.resource || undefined) as ResourceKey | undefined })}><PlusIcon />Create New Override</Button> : null}
          </>
        }
      />

      {data ? (
        <StatGrid className="grid-cols-2 sm:grid-cols-4 xl:grid-cols-7">
          <StatCard compact label="Active Overrides" value={data.counts.active} hint="In force now" tone="success" href="?status=active" />
          <StatCard compact label="Scheduled" value={data.counts.scheduled} hint="Start in the future" href="?status=scheduled" />
          <StatCard compact label="Expiring Soon" value={data.counts.expiringSoon} hint="Within 14 days" tone={data.counts.expiringSoon > 0 ? "warning" : "neutral"} />
          <StatCard compact label="Expired" value={data.counts.expired} hint="Ended on their date" href="?status=expired" />
          <StatCard compact label="Revoked" value={data.counts.revoked} hint="Ended early" href="?status=revoked" />
          <StatCard compact label="Companies With Overrides" value={data.counts.companies} hint="With an active one" />
          <StatCard compact label="Needs Review" value={data.counts.needsReview} hint="Usage over base allowance" tone={data.counts.needsReview > 0 ? "warning" : "neutral"} />
        </StatGrid>
      ) : query.error ? null : (
        <StatGridSkeleton count={7} className="grid-cols-2 sm:grid-cols-4 xl:grid-cols-7" />
      )}

      <div className="flex flex-wrap items-center gap-1.5">
        <SearchInput value={search} onChange={setSearch} placeholder="Search company, resource or override ID..." aria-label="Search overrides" className="w-full sm:w-72" />
        <FilterSelect label="Company" value={url.values.company || undefined} options={(data?.facets.companies ?? []).map((item) => ({ value: item.id, label: item.name }))} onChange={(value) => url.set({ company: value })} />
        <FilterSelect label="Resource" value={url.values.resource || undefined} options={RESOURCE_DEFINITIONS.filter((item) => item.planControlled).map((item) => ({ value: item.key, label: item.name }))} onChange={(value) => url.set({ resource: value })} />
        <FilterSelect label="Type" value={url.values.rule || undefined} options={[{ value: "additive", label: "Additive" }, { value: "absolute", label: "Absolute" }]} onChange={(value) => url.set({ rule: value })} />
        <FilterSelect label="Status" value={url.values.status || undefined} options={Object.entries(OVERRIDE_STATUS).map(([value, meta]) => ({ value, label: meta.label }))} onChange={(value) => url.set({ status: value })} />
        <FilterSelect label="Approved By" value={url.values.by || undefined} options={(data?.facets.approvers ?? []).map((item) => ({ value: item, label: item }))} onChange={(value) => url.set({ by: value })} />
        <FilterSelect label="Sort" value={url.values.sort || undefined} options={OVERRIDE_SORTS.map((item) => ({ value: item.value, label: item.label }))} onChange={(value) => url.set({ sort: value })} />
        {anyFilter ? <Button variant="ghost" size="sm" onClick={clear}>Clear Filters</Button> : null}
      </div>

      {query.error && !data ? (
        <UsageError subject="Overrides" error={query.error} onRetry={() => void query.refetch()} />
      ) : !data ? (
        <TableSkeleton rows={7} columns={9} />
      ) : (
        <Panel flush>
          <MiniTable
            caption="Company entitlement overrides"
            rows={data.rows}
            getKey={(row) => row.id}
            onRowClick={(row) => url.set({ open: row.id })}
            empty={
              <EmptyState
                icon={anyFilter ? SearchXIcon : SlidersHorizontalIcon}
                title={anyFilter ? "No Matching Overrides" : "No Overrides"}
                description={anyFilter ? "No override matches these filters." : "No company has an entitlement override."}
                action={anyFilter ? <Button variant="outline" onClick={clear}>Clear Filters</Button> : canManage ? <Button onClick={() => setCreating({})}><PlusIcon />Create New Override</Button> : undefined}
              />
            }
            columns={[
              { id: "company", header: "Company", cell: (row) => <Link href={usageRoutes.company(row.companyId)} onClick={(event) => event.stopPropagation()} className="font-medium text-foreground hover:text-primary hover:underline">{row.companyName}</Link> },
              { id: "resource", header: "Resource", cell: (row) => RESOURCE_BY_KEY[row.resource].name },
              { id: "base", header: "Base Allowance", align: "right", hideBelow: "md", cell: (row) => <span className="tabular text-muted-foreground">{row.base === null ? "Unlimited" : number(row.base)}</span> },
              { id: "override", header: "Override", align: "right", cell: (row) => (<span className="tabular">{row.rule === "additive" ? `+${number(row.amount)}` : number(row.amount)}<Badge tone="neutral" className="ml-1.5">{row.rule === "additive" ? "Additive" : "Absolute"}</Badge></span>) },
              { id: "effective", header: "Effective Allowance", align: "right", cell: (row) => <span className="tabular font-medium text-foreground">{allowance(row.effective, row.resource)}</span> },
              { id: "starts", header: "Starts", hideBelow: "lg", cell: (row) => <span className="whitespace-nowrap text-2xs tabular">{formatDate(row.startsAt)}</span> },
              { id: "expires", header: "Expires", hideBelow: "md", cell: (row) => (<div className="whitespace-nowrap text-2xs tabular"><p>{formatDate(row.expiresAt)}</p>{row.expiresInDays !== null && row.expiresInDays <= 14 ? <p className={row.overAfterExpiry ? "font-medium text-warning" : "text-muted-foreground"}>{row.expiresInDays} days{row.overAfterExpiry ? " - over after" : ""}</p> : null}</div>) },
              { id: "status", header: "Status", cell: (row) => <OverrideStatusBadge status={row.status} /> },
              { id: "by", header: "Approved By", hideBelow: "lg", cell: (row) => <span className="text-2xs">{row.approvedBy}</span> },
              { id: "actions", header: <span className="sr-only">Actions</span>, align: "right", cell: (row) => <span onClick={(event) => event.stopPropagation()}><ActionMenu items={menu(row)} label={`Actions for ${row.companyName} override`} /></span> },
            ]}
          />
        </Panel>
      )}
      <p className="text-2xs text-muted-foreground">Scheduled overrides cannot be edited in place; revoke and create a new one. Expiry is evaluated against the demo clock: no real expiry job runs in this frontend phase.</p>

      <OverrideDrawer row={opened} onClose={() => url.set({ open: null })} canManage={canManage} onRevoke={(row) => { url.set({ open: null }); setRevoking(row); }} />
      {creating ? <CreateOverrideDialog companies={data?.facets.companies ?? []} subscriptions={subscriptions} initial={creating} onClose={() => setCreating(null)} /> : null}
      {revoking ? <RevokeOverrideDialog row={revoking} onClose={() => setRevoking(null)} /> : null}
    </div>
  );
}
