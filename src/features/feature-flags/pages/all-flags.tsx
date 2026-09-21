"use client";

import { DownloadIcon, FlagOffIcon, PlusIcon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { ActionMenu } from "@/components/shared/action-menu";
import { EmptyState } from "@/components/shared/empty-state";
import { FilterSelect } from "@/components/shared/filter-select";
import { PageHeader } from "@/components/shared/page-header";
import { SearchInput } from "@/components/shared/search-input";
import { Button } from "@/components/ui/button";
import { Panel, StatCard, StatGrid } from "@/features/companies/components/primitives";
import { StatGridSkeleton, TableSkeleton } from "@/features/companies/components/states";
import { useDebouncedText, useUrlParams } from "@/features/companies/hooks/use-url-params";
import { MiniTable } from "@/features/plans-subscriptions/components/mini-table";
import { cn } from "@/lib/utils/cn";
import { CreateFlagWizard } from "../components/create-flag-wizard";
import { DemoTag, LifecycleBadge, ProtectionBadge, RolloutCell, StateBadge } from "../components/badges";
import { EnvironmentSwitch, useEnvironment } from "../components/environment";
import { FlagPreviewDrawer } from "../components/flag-preview-drawer";
import { FlagsError } from "../components/states";
import { useFlagActions } from "../components/use-flag-actions";
import { FLAGS_MOCK_MODE, FLAG_TYPE, LIFECYCLE, OPERATIONAL_STATE, STRATEGY, flagRoutes } from "../data/config";
import { useFlagCapabilities, useFlagList } from "../data/hooks";
import { exportFlags } from "../lib/export";
import { ago } from "../lib/format";

const KEYS = ["q", "category", "type", "lifecycle", "state", "strategy", "owner", "quick", "sort", "open"] as const;
const QUICK = [
  { value: "enabled", label: "Enabled" },
  { value: "disabled", label: "Disabled" },
  { value: "gradual", label: "Gradual Rollouts" },
  { value: "internal", label: "Internal Only" },
  { value: "emergency", label: "Emergency Off" },
  { value: "cleanup", label: "Cleanup Candidates" },
] as const;
const SORTS = [
  { value: "updated", label: "Recently Updated" },
  { value: "name", label: "Name" },
  { value: "created", label: "Recently Created" },
  { value: "percentage", label: "Rollout Percentage" },
  { value: "owner", label: "Owner" },
] as const;
const quickClass = (active: boolean) => `rounded-sm border px-2.5 py-1 text-2xs font-medium transition-colors ${active ? "border-primary/40 bg-primary-subtle text-primary" : "border-border bg-card text-muted-foreground hover:bg-accent"}`;

export function AllFlagsPage() {
  const capabilities = useFlagCapabilities();
  const { environment, set: setEnvironment } = useEnvironment();
  const url = useUrlParams(KEYS);
  const [search, setSearch] = useDebouncedText(url.values.q, (value) => url.set({ q: value }));
  const [creating, setCreating] = useState(false);
  const actions = useFlagActions();
  const query = useFlagList({
    environment,
    search: url.values.q || undefined,
    category: url.values.category || undefined,
    type: url.values.type || undefined,
    lifecycle: url.values.lifecycle || undefined,
    state: url.values.state || undefined,
    strategy: url.values.strategy || undefined,
    owner: url.values.owner || undefined,
    quick: url.values.quick || undefined,
    sort: url.values.sort || "updated",
  });
  const data = query.data;
  const filterKeys = KEYS.filter((key) => key !== "sort" && key !== "open");
  const anyFilter = filterKeys.some((key) => url.values[key]);
  const clear = () => { url.set({ q: null, category: null, type: null, lifecycle: null, state: null, strategy: null, owner: null, quick: null }); setSearch(""); };

  return (
    <div className="space-y-3">
      <PageHeader
        title="All Flags"
        description="Every feature flag with its state, rollout and reach in the selected environment. Production changes always open an impact review first."
        meta={FLAGS_MOCK_MODE ? <DemoTag>Demo flag data</DemoTag> : undefined}
        actions={
          <>
            {capabilities.canCreateFlags ? <Button size="sm" onClick={() => setCreating(true)}><PlusIcon />Create Feature Flag</Button> : null}
            {capabilities.canExportFlags && data ? <Button variant="outline" size="sm" onClick={() => exportFlags(data.rows)} disabled={data.rows.length === 0}><DownloadIcon />Export</Button> : null}
          </>
        }
      />

      {data ? (
        <StatGrid className="grid-cols-2 sm:grid-cols-4 xl:grid-cols-7">
          <StatCard compact label="Total Flags" value={data.summary.total} hint="Not archived" />
          <StatCard compact label="Enabled" value={data.summary.enabled} hint="Switched on" href={flagRoutes.all(environment, { quick: "enabled" })} />
          <StatCard compact label="Disabled" value={data.summary.disabled} hint="Switched off" href={flagRoutes.all(environment, { quick: "disabled" })} />
          <StatCard compact label="Gradual Rollouts" value={data.summary.targeted} hint="Selected or percentage" href={flagRoutes.all(environment, { quick: "gradual" })} />
          <StatCard compact label="Internal Only" value={data.summary.internal} hint="No tenant matched" href={flagRoutes.all(environment, { quick: "internal" })} />
          <StatCard compact label="Emergency Off" value={data.summary.emergency} hint="Configuration preserved" tone={data.summary.emergency > 0 ? "danger" : "neutral"} href={flagRoutes.all(environment, { quick: "emergency" })} />
          <StatCard compact label="Archived" value={data.summary.archived} hint="Read-only" href={flagRoutes.all(environment, { lifecycle: "archived" })} />
        </StatGrid>
      ) : query.error ? null : (
        <StatGridSkeleton count={7} className="grid-cols-2 sm:grid-cols-4 xl:grid-cols-7" />
      )}

      <div className="space-y-1.5">
        <div className="flex flex-wrap items-center gap-1.5">
          <EnvironmentSwitch environment={environment} onChange={setEnvironment} />
          <SearchInput value={search} onChange={setSearch} placeholder="Search name, key or category..." aria-label="Search feature flags" className="w-full sm:w-72" />
          <FilterSelect label="Category" value={url.values.category || undefined} options={(data?.facets.categories ?? []).map((item) => ({ value: item, label: item }))} onChange={(value) => url.set({ category: value })} />
          <FilterSelect label="Type" value={url.values.type || undefined} options={Object.entries(FLAG_TYPE).map(([value, meta]) => ({ value, label: meta.label }))} onChange={(value) => url.set({ type: value })} />
          <FilterSelect label="Lifecycle" value={url.values.lifecycle || undefined} options={Object.entries(LIFECYCLE).map(([value, meta]) => ({ value, label: meta.label }))} onChange={(value) => url.set({ lifecycle: value })} />
          <FilterSelect label="State" value={url.values.state || undefined} options={Object.entries(OPERATIONAL_STATE).map(([value, meta]) => ({ value, label: meta.label }))} onChange={(value) => url.set({ state: value })} />
          <FilterSelect label="Rollout" value={url.values.strategy || undefined} options={Object.entries(STRATEGY).map(([value, meta]) => ({ value, label: meta.short }))} onChange={(value) => url.set({ strategy: value })} />
          <FilterSelect label="Owner" value={url.values.owner || undefined} options={(data?.facets.owners ?? []).map((item) => ({ value: item, label: item }))} onChange={(value) => url.set({ owner: value })} />
          <FilterSelect label="Sort" value={url.values.sort || undefined} options={SORTS.map((item) => ({ value: item.value, label: item.label }))} onChange={(value) => url.set({ sort: value })} />
          {anyFilter ? <Button variant="ghost" size="sm" onClick={clear}>Clear Filters</Button> : null}
        </div>
        <div role="group" aria-label="Quick filters" className="flex flex-wrap items-center gap-1">
          <button type="button" aria-pressed={!url.values.quick} onClick={() => url.set({ quick: null })} className={quickClass(!url.values.quick)}>All</button>
          {QUICK.map((item) => <button key={item.value} type="button" aria-pressed={url.values.quick === item.value} onClick={() => url.set({ quick: url.values.quick === item.value ? null : item.value })} className={quickClass(url.values.quick === item.value)}>{item.label}</button>)}
        </div>
      </div>

      {query.error && !data ? (
        <FlagsError subject="Feature Flags" error={query.error} onRetry={() => void query.refetch()} />
      ) : !data ? (
        <TableSkeleton rows={8} columns={8} />
      ) : (
        <Panel flush>
          <MiniTable
            caption="Feature flags"
            rows={data.rows}
            getKey={(row) => row.flag.key}
            onRowClick={(row) => url.set({ open: row.flag.key })}
            empty={
              <EmptyState
                icon={FlagOffIcon}
                title={anyFilter ? "No Matching Flags" : "No Feature Flags Yet"}
                description={anyFilter ? "No flag matches these filters in this environment." : "Create the first flag to control a feature's availability."}
                action={anyFilter ? <Button variant="outline" onClick={clear}>Clear Filters</Button> : capabilities.canCreateFlags ? <Button onClick={() => setCreating(true)}><PlusIcon />Create Feature Flag</Button> : undefined}
              />
            }
            columns={[
              { id: "flag", header: "Feature", cell: (row) => <div className="min-w-0"><Link href={flagRoutes.flag(row.flag.key, environment)} onClick={(event) => event.stopPropagation()} className="block truncate font-medium text-foreground hover:text-primary hover:underline">{row.flag.name}</Link><p className="truncate font-mono text-2xs text-muted-foreground">{row.flag.key}</p></div> },
              { id: "category", header: "Category", hideBelow: "lg", cell: (row) => <span className="whitespace-nowrap">{row.flag.category}</span> },
              { id: "type", header: "Type", hideBelow: "lg", cell: (row) => <span className="whitespace-nowrap">{FLAG_TYPE[row.flag.type].label.replace(" Flag", "")}</span> },
              { id: "lifecycle", header: "Lifecycle", hideBelow: "md", cell: (row) => <div className="flex flex-wrap items-center gap-1"><LifecycleBadge status={row.flag.lifecycle} />{row.flag.protection !== "standard" ? <ProtectionBadge level={row.flag.protection} /> : null}</div> },
              { id: "state", header: "State", cell: (row) => <StateBadge state={row.state} /> },
              { id: "rollout", header: "Rollout", cell: (row) => <RolloutCell config={row.config} /> },
              { id: "reach", header: "Reach", align: "right", cell: (row) => <span className="tabular" title="Effective companies out of all companies">{row.stats.effective}<span className="text-2xs text-muted-foreground"> / {row.stats.totalCompanies}</span></span> },
              { id: "owner", header: "Owner", hideBelow: "lg", cell: (row) => <span className="whitespace-nowrap">{row.flag.ownerTeam}</span> },
              { id: "updated", header: "Updated", hideBelow: "md", cell: (row) => <div className="whitespace-nowrap"><p className="text-2xs text-foreground">{ago(row.config.updatedAt)}</p>{row.pendingChanges > 0 ? <p className="text-2xs text-warning">{row.pendingChanges} pending</p> : null}</div> },
              { id: "actions", header: <span className="sr-only">Actions</span>, align: "right", cell: (row) => <span onClick={(event) => event.stopPropagation()}><ActionMenu items={actions.menuFor(row, { onPreview: () => url.set({ open: row.flag.key }) })} label={`Actions for ${row.flag.name}`} /></span> },
            ]}
          />
        </Panel>
      )}

      <p className={cn("text-2xs text-muted-foreground", !data && "hidden")}>Reach is the number of companies the flag is effectively available to after plan, subscription, prerequisite and integration checks. Rollout percentages are stable and evaluated, so the count can differ from the percentage.</p>

      <FlagPreviewDrawer flagKey={url.values.open || null} environment={environment} onClose={() => url.set({ open: null })} />
      {actions.nodes}
      {creating ? <CreateFlagWizard onClose={() => setCreating(false)} /> : null}
    </div>
  );
}
