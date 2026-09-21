"use client";

import { useQueryClient } from "@tanstack/react-query";
import { CheckCircle2Icon, PlusIcon, RefreshCwIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ActionMenu } from "@/components/shared/action-menu";
import { EmptyState } from "@/components/shared/empty-state";
import { FilterSelect } from "@/components/shared/filter-select";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Panel, StatCard, StatGrid } from "@/features/companies/components/primitives";
import { PanelSkeleton, StatGridSkeleton } from "@/features/companies/components/states";
import { useUrlParams } from "@/features/companies/hooks/use-url-params";
import { MiniTable } from "@/features/plans-subscriptions/components/mini-table";
import { cn } from "@/lib/utils/cn";
import { formatDateTime } from "@/lib/utils/format";
import { CreateFlagWizard } from "../components/create-flag-wizard";
import { DemoTag, ResultBadge, RolloutCell } from "../components/badges";
import { EnvironmentSwitch, useEnvironment } from "../components/environment";
import { FlagsError } from "../components/states";
import { CHANGE_TYPE, FLAGS_MOCK_MODE, flagRoutes } from "../data/config";
import { flagKeys, useFlagCapabilities, useOverview } from "../data/hooks";
import type { AttentionItem } from "../data/types";
import { ago } from "../lib/format";

const KEYS = ["category", "owner"] as const;
const SEVERITY: Record<AttentionItem["severity"], { label: string; tone: "danger" | "warning" | "info" }> = {
  critical: { label: "Critical", tone: "danger" },
  warning: { label: "Warning", tone: "warning" },
  info: { label: "Info", tone: "info" },
};

export function FlagsOverviewPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const capabilities = useFlagCapabilities();
  const { environment, set: setEnvironment } = useEnvironment();
  const url = useUrlParams(KEYS);
  const [creating, setCreating] = useState(false);
  const query = useOverview(environment, { category: url.values.category || undefined, owner: url.values.owner || undefined });
  const data = query.data;
  const anyFilter = Boolean(url.values.category || url.values.owner);

  const attentionHref = (item: AttentionItem) => (item.kind === "awaiting_approval" ? flagRoutes.changes(environment, "pending") : flagRoutes.flag(item.flagKey, environment, item.kind === "plan_mismatch" || item.kind === "dependency_blocked" ? "impact" : "overview"));

  return (
    <div className="space-y-3">
      <PageHeader
        title="Feature Flags"
        description="Control feature availability, manage company rollouts and review platform feature changes."
        meta={FLAGS_MOCK_MODE ? <DemoTag>Demo flag data - nothing here is enforced by a real platform</DemoTag> : undefined}
        actions={
          <>
            {capabilities.canCreateFlags ? <Button size="sm" onClick={() => setCreating(true)}><PlusIcon />Create Feature Flag</Button> : null}
            <Button asChild variant="outline" size="sm"><Link href={flagRoutes.all(environment)}>View All Flags</Link></Button>
            <ActionMenu
              label="More Actions"
              items={[
                { id: "rollouts", label: "Review Active Rollouts", onSelect: () => router.push(flagRoutes.rollouts(environment)) },
                { id: "pending", label: "Review Pending Changes", onSelect: () => router.push(flagRoutes.changes(environment, "pending")) },
                { id: "access", label: "View Company Access", onSelect: () => router.push(flagRoutes.access(environment)), disabled: !capabilities.canViewCompanyAccess },
                { id: "activity", label: "View Flag Activity", onSelect: () => router.push(flagRoutes.changes(environment, "history")) },
              ]}
            />
          </>
        }
      />

      <div className="flex flex-wrap items-center gap-1.5">
        <EnvironmentSwitch environment={environment} onChange={setEnvironment} />
        <FilterSelect label="Category" value={url.values.category || undefined} options={(data?.facets.categories ?? []).map((item) => ({ value: item, label: item }))} onChange={(value) => url.set({ category: value })} />
        <FilterSelect label="Owner" value={url.values.owner || undefined} options={(data?.facets.owners ?? []).map((item) => ({ value: item, label: item }))} onChange={(value) => url.set({ owner: value })} />
        {anyFilter ? <Button variant="ghost" size="sm" onClick={() => url.clear()}>Clear Filters</Button> : null}
        <Button variant="outline" size="sm" onClick={() => void queryClient.invalidateQueries({ queryKey: flagKeys.all })} disabled={query.isFetching}>
          <RefreshCwIcon className={cn(query.isFetching && "animate-spin")} />
          Refresh
        </Button>
        <p className="text-2xs text-muted-foreground">{data ? `Last updated ${formatDateTime(data.updatedAt)}.` : "Loading..."} Counts are evaluated from the demo company, plan and subscription records.</p>
      </div>

      {query.error && !data ? (
        <FlagsError subject="Feature Flag Overview" error={query.error} onRetry={() => void query.refetch()} />
      ) : !data ? (
        <div className="space-y-1"><StatGridSkeleton count={8} className="grid-cols-2 sm:grid-cols-4 min-[1600px]:grid-cols-8" /><PanelSkeleton rows={6} /></div>
      ) : (
        <>
          <StatGrid className="grid-cols-2 sm:grid-cols-4 min-[1600px]:grid-cols-8">
            <StatCard compact label="Total Flags" value={data.kpis.total} hint="Not archived" href={flagRoutes.all(environment)} />
            <StatCard compact label="Globally Enabled" value={data.kpis.globallyEnabled} hint="All eligible companies" href={flagRoutes.all(environment, { state: "enabled", strategy: "all" })} />
            <StatCard compact label="Disabled" value={data.kpis.disabled} hint="Switched off" href={flagRoutes.all(environment, { state: "disabled" })} />
            <StatCard compact label="Active Rollouts" value={data.kpis.activeRollouts} hint="Partial or internal" href={flagRoutes.rollouts(environment)} />
            <StatCard compact label="Scheduled Changes" value={data.kpis.scheduled} hint="Planned, not applied" href={flagRoutes.changes(environment, "scheduled")} />
            <StatCard compact label="Pending Approval" value={data.kpis.pendingApproval} hint="Demo requests" tone={data.kpis.pendingApproval > 0 ? "warning" : "neutral"} href={flagRoutes.changes(environment, "pending")} />
            <StatCard compact label="Emergency Disabled" value={data.kpis.emergencyOff} hint="Configuration preserved" tone={data.kpis.emergencyOff > 0 ? "danger" : "neutral"} href={flagRoutes.all(environment, { quick: "emergency" })} />
            <StatCard compact label="Cleanup Candidates" value={data.kpis.cleanup} hint="Review and retire" href={flagRoutes.all(environment, { quick: "cleanup" })} />
          </StatGrid>

          <div className="grid grid-cols-1 gap-1 xl:grid-cols-3">
            <Panel className="xl:col-span-2" title="Active Rollout Summary" description="Flags that are enabled for some companies. Effective is the evaluated count, which can differ from a percentage." flush action={<Button asChild variant="ghost" size="sm"><Link href={flagRoutes.rollouts(environment)}>View All</Link></Button>}>
              <div className="h-[20rem] overflow-y-auto scrollbar-thin">
                <MiniTable
                  dense
                  caption="Active rollouts"
                  rows={data.rollouts}
                  getKey={(row) => row.flag.key}
                  onRowClick={(row) => router.push(flagRoutes.flag(row.flag.key, environment, "targeting"))}
                  empty={<EmptyState icon={CheckCircle2Icon} size="sm" title="No Active Rollouts" description={anyFilter ? "No partial rollout matches these filters." : `No flag is partially rolled out in this environment.`} />}
                  columns={[
                    { id: "flag", header: "Feature", cell: (row) => <div className="min-w-0"><p className="truncate font-medium text-foreground">{row.flag.name}</p><p className="truncate font-mono text-2xs text-muted-foreground">{row.flag.key}</p></div> },
                    { id: "strategy", header: "Rollout", cell: (row) => <RolloutCell config={row.config} /> },
                    { id: "eligible", header: "Eligible", align: "right", hideBelow: "md", cell: (row) => <span className="tabular">{row.stats.eligible}</span> },
                    { id: "effective", header: "Effective", align: "right", cell: (row) => <span className="tabular font-medium">{row.stats.effective}<span className="text-2xs font-normal text-muted-foreground"> / {row.stats.totalCompanies}</span></span> },
                    { id: "blocked", header: "Blocked", align: "right", hideBelow: "md", cell: (row) => <span className={cn("tabular", row.stats.blocked > 0 && "text-warning")}>{row.stats.blocked}</span> },
                    { id: "updated", header: "Updated", hideBelow: "lg", cell: (row) => <span className="whitespace-nowrap text-2xs text-muted-foreground">{ago(row.config.updatedAt)}</span> },
                  ]}
                />
              </div>
            </Panel>

            <Panel title="Needs Attention" description="Conditions that need a decision or a check." flush>
              <div className="h-[20rem] overflow-y-auto scrollbar-thin">
                {data.attention.length === 0 ? (
                  <EmptyState icon={CheckCircle2Icon} size="sm" title="Nothing Needs Attention" description="No blocked, pending or inconsistent flag in this environment." />
                ) : (
                  <ul className="divide-y divide-border">
                    {data.attention.map((item) => (
                      <li key={item.id}>
                        <Link href={attentionHref(item)} className="block px-3 py-2 hover:bg-accent/40">
                          <div className="flex items-center gap-1.5">
                            <Badge tone={SEVERITY[item.severity].tone}>{SEVERITY[item.severity].label}</Badge>
                            <span className="min-w-0 flex-1 truncate text-[0.8125rem] font-medium text-foreground">{item.flagName}</span>
                            <span className="shrink-0 text-2xs text-muted-foreground">{ago(item.detectedAt)}</span>
                          </div>
                          <p className="mt-0.5 text-2xs text-muted-foreground">{item.issue}</p>
                          <p className="text-2xs text-muted-foreground">{item.scope}</p>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </Panel>
          </div>

          <Panel title="Recent Activity" description="The latest flag changes, requests and lifecycle events." flush action={<Button asChild variant="ghost" size="sm"><Link href={flagRoutes.changes(environment, "history")}>View History</Link></Button>}>
            {data.activity.length === 0 ? (
              <EmptyState icon={CheckCircle2Icon} size="sm" title="No Recent Activity" description="Changes to flags will appear here." />
            ) : (
              <ul className="max-h-72 divide-y divide-border overflow-y-auto scrollbar-thin">
                {data.activity.map((item) => (
                  <li key={item.id} className="flex items-start gap-3 px-3 py-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-[0.8125rem] text-foreground"><Link href={flagRoutes.flag(item.flagKey, environment)} className="font-medium hover:text-primary hover:underline">{item.flagName}</Link><span className="text-muted-foreground"> - {CHANGE_TYPE[item.type]}</span></p>
                      <p className="text-2xs text-muted-foreground">{item.summary}</p>
                    </div>
                    <div className="shrink-0 text-right"><ResultBadge result={item.result} /><p className="mt-0.5 text-2xs text-muted-foreground">{item.actor} - {ago(item.at)}</p></div>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </>
      )}

      {creating ? <CreateFlagWizard onClose={() => setCreating(false)} /> : null}
    </div>
  );
}
