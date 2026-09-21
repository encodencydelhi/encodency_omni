"use client";

import { CheckCircle2Icon, SlidersHorizontalIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ActionMenu } from "@/components/shared/action-menu";
import { EmptyState } from "@/components/shared/empty-state";
import { FilterSelect } from "@/components/shared/filter-select";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Panel, StatCard, StatGrid } from "@/features/companies/components/primitives";
import { StatGridSkeleton, TableSkeleton } from "@/features/companies/components/states";
import { useUrlParams } from "@/features/companies/hooks/use-url-params";
import { MiniTable } from "@/features/plans-subscriptions/components/mini-table";
import { cn } from "@/lib/utils/cn";
import { DemoTag, RolloutCell, StateBadge } from "../components/badges";
import { ChangeDrawer, ChangesTable } from "../components/change-views";
import { EnvironmentSwitch, useEnvironment } from "../components/environment";
import { FlagsError } from "../components/states";
import { useFlagActions } from "../components/use-flag-actions";
import { FLAGS_MOCK_MODE, STRATEGY, flagRoutes } from "../data/config";
import { useChanges, useFlagList } from "../data/hooks";
import type { FlagChange } from "../data/types";
import { ago } from "../lib/format";

const KEYS = ["quick", "strategy", "owner"] as const;
const VIEWS = [
  { value: "", label: "Active Rollouts" },
  { value: "internal", label: "Internal Only" },
  { value: "emergency", label: "Emergency Off" },
  { value: "all", label: "Every Flag" },
] as const;
const quickClass = (active: boolean) => `rounded-sm border px-2.5 py-1 text-2xs font-medium transition-colors ${active ? "border-primary/40 bg-primary-subtle text-primary" : "border-border bg-card text-muted-foreground hover:bg-accent"}`;

/**
 * The rollout workspace: how every flag is being introduced, side by side, and which
 * rollout changes are waiting. Rollouts are edited from a flag's Targeting & Rollout tab,
 * where the current and proposed configuration are shown together.
 */
export function RolloutsPage() {
  const router = useRouter();
  const { environment, set: setEnvironment } = useEnvironment();
  const url = useUrlParams(KEYS);
  const view = url.values.quick || "";
  const actions = useFlagActions();
  const [open, setOpen] = useState<FlagChange | null>(null);
  const list = useFlagList({ environment, quick: view === "all" ? undefined : view || "gradual", strategy: url.values.strategy || undefined, owner: url.values.owner || undefined, sort: "updated" });
  const pending = useChanges({ environment, status: ["pending_approval", "scheduled", "draft"], pageSize: 20 });
  const data = list.data;
  const anyFilter = Boolean(url.values.strategy || url.values.owner);

  return (
    <div className="space-y-3">
      <PageHeader
        title="Rollouts & Targeting"
        description="See how each feature is being introduced in this environment and which rollout changes are waiting. Edit a rollout from the flag's Targeting & Rollout tab."
        meta={FLAGS_MOCK_MODE ? <DemoTag>Demo rollouts - nothing is enforced</DemoTag> : undefined}
        actions={<Button asChild variant="outline" size="sm"><Link href={flagRoutes.changes(environment, "scheduled")}>Scheduled Changes</Link></Button>}
      />

      {data ? (
        <StatGrid className="grid-cols-2 sm:grid-cols-4">
          <StatCard compact label="Active Rollouts" value={data.summary.targeted} hint="Selected or percentage" />
          <StatCard compact label="Internal Only" value={data.summary.internal} hint="No tenant matched" />
          <StatCard compact label="Emergency Off" value={data.summary.emergency} hint="Configuration preserved" tone={data.summary.emergency > 0 ? "danger" : "neutral"} />
          <StatCard compact label="Open Rollout Changes" value={pending.data?.total ?? "-"} hint="Pending, scheduled or draft" tone={(pending.data?.total ?? 0) > 0 ? "warning" : "neutral"} href={flagRoutes.changes(environment, "pending")} />
        </StatGrid>
      ) : list.error ? null : (
        <StatGridSkeleton count={4} className="grid-cols-2 sm:grid-cols-4" />
      )}

      <div className="flex flex-wrap items-center gap-1.5">
        <EnvironmentSwitch environment={environment} onChange={setEnvironment} />
        <div role="group" aria-label="Rollout view" className="flex flex-wrap items-center gap-1">
          {VIEWS.map((item) => <button key={item.value || "active"} type="button" aria-pressed={view === item.value} onClick={() => url.set({ quick: item.value || null })} className={quickClass(view === item.value)}>{item.label}</button>)}
        </div>
        <FilterSelect label="Strategy" value={url.values.strategy || undefined} options={Object.entries(STRATEGY).map(([value, meta]) => ({ value, label: meta.short }))} onChange={(value) => url.set({ strategy: value })} />
        <FilterSelect label="Owner" value={url.values.owner || undefined} options={(data?.facets.owners ?? []).map((item) => ({ value: item, label: item }))} onChange={(value) => url.set({ owner: value })} />
        {anyFilter ? <Button variant="ghost" size="sm" onClick={() => url.set({ strategy: null, owner: null })}>Clear Filters</Button> : null}
      </div>

      {list.error && !data ? (
        <FlagsError subject="Rollouts" error={list.error} onRetry={() => void list.refetch()} />
      ) : !data ? (
        <TableSkeleton rows={6} columns={7} />
      ) : (
        <Panel flush>
          <MiniTable
            caption="Rollouts"
            rows={data.rows}
            getKey={(row) => row.flag.key}
            onRowClick={(row) => router.push(flagRoutes.flag(row.flag.key, environment, "targeting"))}
            empty={<EmptyState icon={CheckCircle2Icon} title="No Rollouts Here" description={anyFilter || view ? "No flag matches this view in this environment." : "No flag is being rolled out gradually in this environment."} action={anyFilter || view ? <Button variant="outline" onClick={() => url.set({ strategy: null, owner: null, quick: null })}>Reset View</Button> : undefined} />}
            columns={[
              { id: "flag", header: "Feature", cell: (row) => <div className="min-w-0"><p className="truncate font-medium text-foreground">{row.flag.name}</p><p className="truncate font-mono text-2xs text-muted-foreground">{row.flag.key}</p></div> },
              { id: "state", header: "State", cell: (row) => <StateBadge state={row.state} /> },
              { id: "rollout", header: "Rollout", cell: (row) => <RolloutCell config={row.config} /> },
              { id: "eligible", header: "Eligible", align: "right", hideBelow: "md", cell: (row) => <span className="tabular">{row.stats.eligible}</span> },
              { id: "matched", header: "Matched", align: "right", hideBelow: "md", cell: (row) => <span className="tabular">{row.stats.targetingMatched}</span> },
              { id: "effective", header: "Effective", align: "right", cell: (row) => <span className="tabular font-medium">{row.stats.effective}</span> },
              { id: "blocked", header: "Blocked", align: "right", hideBelow: "lg", cell: (row) => <span className={cn("tabular", row.stats.blocked > 0 && "text-warning")}>{row.stats.blocked}</span> },
              { id: "pending", header: "Waiting", hideBelow: "lg", cell: (row) => (row.pendingChanges > 0 ? <span className="text-2xs text-warning">{row.pendingChanges} open</span> : <span className="text-2xs text-muted-foreground">-</span>) },
              { id: "updated", header: "Updated", hideBelow: "lg", cell: (row) => <span className="whitespace-nowrap text-2xs text-muted-foreground">{ago(row.config.updatedAt)}</span> },
              { id: "actions", header: <span className="sr-only">Actions</span>, align: "right", cell: (row) => <span onClick={(event) => event.stopPropagation()} className="inline-flex items-center gap-0.5"><Button asChild variant="ghost" size="sm"><Link href={flagRoutes.flag(row.flag.key, environment, "targeting")}><SlidersHorizontalIcon />Edit</Link></Button><ActionMenu items={actions.menuFor(row).filter((item) => !["targeting", "preview"].includes(item.id))} label={`Actions for ${row.flag.name}`} /></span> },
            ]}
          />
        </Panel>
      )}

      <Panel title="Rollout Changes Waiting" description="Drafts, requests for approval and planned changes in this environment. Scheduled changes are records only: no scheduler applies them in this phase." flush>
        {pending.error && !pending.data ? (
          <FlagsError subject="Waiting Changes" error={pending.error} onRetry={() => void pending.refetch()} />
        ) : !pending.data ? (
          <TableSkeleton rows={3} columns={5} />
        ) : (
          <ChangesTable rows={pending.data.rows} onOpen={setOpen} empty={{ title: "Nothing Waiting", description: "No change is waiting for approval or a scheduled time in this environment." }} />
        )}
      </Panel>

      {actions.nodes}
      <ChangeDrawer change={open} onClose={() => setOpen(null)} />
    </div>
  );
}
