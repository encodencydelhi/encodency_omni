"use client";

import { useQueryClient } from "@tanstack/react-query";
import { CheckCircle2Icon, RefreshCwIcon, ShieldCheckIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ActionMenu } from "@/components/shared/action-menu";
import { EmptyState } from "@/components/shared/empty-state";
import { FilterSelect } from "@/components/shared/filter-select";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Panel, StatCard, StatGrid } from "@/features/companies/components/primitives";
import { useUrlParams } from "@/features/companies/hooks/use-url-params";
import { cn } from "@/lib/utils/cn";
import { ActivityChart } from "../components/activity-chart";
import { DemoTag, OutcomeBadge, PriorityBadge } from "../components/badges";
import { ExportDialog } from "../components/export-dialog";
import { RangeControl } from "../components/range-control";
import { AuditError, PanelSkeleton, StatGridSkeleton } from "../components/states";
import { AUDIT_MOCK_MODE, CATEGORY, ENVIRONMENTS, METRIC_OPTIONS, auditRoutes } from "../data/config";
import { auditKeys, useActivity, useAuditCapabilities, useAuditWindow, useOverview } from "../data/hooks";
import type { AuditCategory, Environment } from "../data/types";
import { ago, plural, scopeText, utcShort } from "../lib/format";

const KEYS = ["metric", "env"] as const;
const LABEL_TONE = { "Review Recommended": "warning", Failed: "danger", "Pending Review": "info", "Collection Issue": "neutral" } as const;

/** The investigation-oriented overview: what was recorded, what needs a look, and how far to trust the trail. */
export function AuditOverviewPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const capabilities = useAuditCapabilities();
  const { window: dateWindow, range, from, to } = useAuditWindow();
  const url = useUrlParams(KEYS);
  const environment = (ENVIRONMENTS.find((item) => item.value === url.values.env)?.value ?? null) as Environment | null;
  const metric = METRIC_OPTIONS.find((item) => item.value === url.values.metric)?.value ?? "all";
  const [exporting, setExporting] = useState(false);

  const overview = useOverview(dateWindow, environment);
  const activity = useActivity(dateWindow, metric, environment);
  const data = overview.data;
  const scope = { range: range === "30d" ? undefined : range, from: from || undefined, to: to || undefined };
  const explorer = (extra: Record<string, string | undefined> = {}) => auditRoutes.events({ ...scope, env: environment ?? undefined, ...extra });
  const refreshing = overview.isFetching || activity.isFetching;

  return (
    <div className="space-y-3">
      <PageHeader
        title="Audit Logs"
        description="Review platform actions, security events and configuration changes across OmniPlatform."
        meta={AUDIT_MOCK_MODE ? <DemoTag>Demo Audit Data - Backend Ingestion Not Connected</DemoTag> : undefined}
        actions={
          <>
            <Button asChild size="sm"><Link href={auditRoutes.events(scope)}>Explore Events</Link></Button>
            <Button asChild variant="outline" size="sm"><Link href={auditRoutes.security(undefined, scope)}>Access &amp; Security</Link></Button>
            <ActionMenu
              label="More Actions"
              items={[
                { id: "sensitive", label: "View Sensitive Changes", onSelect: () => router.push(auditRoutes.sensitive(scope)) },
                { id: "investigations", label: "Open Investigations", onSelect: () => router.push(auditRoutes.investigations()) },
                { id: "settings", label: "View Audit Settings", onSelect: () => router.push(auditRoutes.settings()) },
                { id: "export", label: "Export Authorized Events", disabled: !capabilities.canExport, onSelect: () => setExporting(true) },
              ]}
            />
          </>
        }
      />

      <div className="flex flex-wrap items-center gap-1.5">
        <RangeControl />
        <FilterSelect label="Environment" value={environment ?? undefined} options={ENVIRONMENTS.map((item) => ({ value: item.value, label: item.label }))} onChange={(value) => url.set({ env: value })} />
        <Button variant="outline" size="sm" onClick={() => void queryClient.invalidateQueries({ queryKey: auditKeys.all })} disabled={refreshing}>
          <RefreshCwIcon className={cn(refreshing && "animate-spin")} />Refresh
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        {data ? `Last recorded event ${data.lastRecordedAt ? `${utcShort(data.lastRecordedAt)} (${ago(data.lastRecordedAt)})` : "not available"}. ` : "Loading... "}
        Source: {data?.source.dataSource ?? "Demo Records"}. Period counts cover the selected window; Open Investigations and Collection Issues are current state, not period totals.
      </p>

      {overview.error && !data ? (
        <AuditError subject="Audit Overview" error={overview.error} onRetry={() => void overview.refetch()} />
      ) : !data ? (
        <div className="space-y-1"><StatGridSkeleton count={8} className="grid-cols-2 sm:grid-cols-4 min-[1600px]:grid-cols-8" /><PanelSkeleton rows={6} /></div>
      ) : (
        <>
          <StatGrid className="grid-cols-2 sm:grid-cols-4 min-[1600px]:grid-cols-8">
            <StatCard compact label="Total Events" value={data.kpis.total} hint="In the selected period" href={explorer()} />
            <StatCard compact label="Sensitive Actions" value={data.kpis.sensitive} hint="High-impact, by class" href={explorer({ quick: "sensitive" })} />
            <StatCard compact label="Failed / Denied" value={data.kpis.failedDenied} hint="Not applied or refused" tone={data.kpis.failedDenied > 0 ? "warning" : "neutral"} href={explorer({ quick: "failed" })} />
            <StatCard compact label="Access Changes" value={data.kpis.accessChanges} hint="Applied, not requested" href={explorer({ quick: "access" })} />
            <StatCard compact label="Authentication Failures" value={data.kpis.authFailures} hint="Failed sign-in or MFA" href={auditRoutes.security(undefined, { ...scope, outcome: "failed" })} />
            <StatCard compact label="Configuration Changes" value={data.kpis.configChanges} hint="Applied platform changes" href={explorer({ quick: "config" })} />
            <StatCard compact label="Open Investigations" value={data.kpis.openInvestigations} hint="Current, not by period" href={auditRoutes.investigations()} />
            <StatCard compact label="Collection Issues" value={data.kpis.collectionIssues} hint="Known gaps, as of now" tone={data.kpis.collectionIssues > 0 ? "warning" : "neutral"} href={auditRoutes.settings({ section: "coverage" })} />
          </StatGrid>

          <div className="grid grid-cols-1 gap-1 xl:grid-cols-3">
            <Panel
              className="xl:col-span-2 flex flex-col"
              bodyClassName="flex flex-col flex-1 min-h-[220px]"
              title="Audit Event Activity"
              description={`Recorded events per ${activity.data?.unit ?? "day"}, by when they occurred. Empty periods are zero; nothing is added to fill them.`}
              action={
                <Select value={metric} onValueChange={(value) => url.set({ metric: value === "all" ? null : value })}>
                  <SelectTrigger size="sm" aria-label="Metric" className="w-48"><SelectValue /></SelectTrigger>
                  <SelectContent>{METRIC_OPTIONS.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent>
                </Select>
              }
            >
              {activity.error && !activity.data ? <AuditError subject="Activity" error={activity.error} onRetry={() => void activity.refetch()} /> : !activity.data ? <div className="h-56 animate-pulse rounded-sm bg-muted" aria-busy /> : activity.data.points.every((point) => point.value === 0) ? (
                <EmptyState icon={CheckCircle2Icon} size="sm" title="No Events In This Period" description="Nothing matching this metric was recorded in the selected window." />
              ) : (
                <ActivityChart points={activity.data.points} unit={activity.data.unit} name={METRIC_OPTIONS.find((item) => item.value === metric)?.label ?? "Events"} />
              )}
            </Panel>

            <Panel title="Events By Category" description="Categories present in the selected period. Select one to open it in Event Explorer.">
              {data.categories.length === 0 ? (
                <EmptyState icon={CheckCircle2Icon} size="sm" title="Nothing To Break Down" description="No events in the selected period." />
              ) : (
                <ul className="space-y-1.5">
                  {data.categories.map((row) => {
                    const max = data.categories[0]?.count ?? 1;
                    return (
                      <li key={row.category}>
                        <Link href={explorer({ category: row.category })} className="group block">
                          <div className="flex items-baseline justify-between gap-2 text-[0.8125rem]"><span className="truncate text-foreground group-hover:text-primary group-hover:underline">{CATEGORY[row.category as AuditCategory].label}</span><span className="tabular text-muted-foreground">{row.count}</span></div>
                          <div className="mt-0.5 h-1.5 overflow-hidden rounded-sm bg-muted"><div className={cn("h-full rounded-sm", CATEGORY[row.category as AuditCategory].bar)} style={{ width: `${(row.count / max) * 100}%` }} /></div>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Panel>
          </div>

          <div className="grid grid-cols-1 gap-1 xl:grid-cols-3">
            <Panel title="Needs Attention" description="Recorded items worth a review. Not a verdict on anyone." flush>
              <div className="h-[19rem] overflow-y-auto scrollbar-thin">
                {data.attention.length === 0 ? (
                  <EmptyState icon={ShieldCheckIcon} size="sm" title="Nothing Needs Review" description="No failed, pending or high-impact event in this period, and no known collection gap." />
                ) : (
                  <ul className="divide-y divide-border">
                    {data.attention.map((item) => (
                      <li key={item.id}>
                        <Link href={item.href} className="block px-3 py-2 hover:bg-accent/40">
                          <div className="flex items-center gap-1.5"><Badge tone={LABEL_TONE[item.label]}>{item.label}</Badge><span className="min-w-0 flex-1 truncate text-[0.8125rem] font-medium text-foreground">{item.title}</span><span className="shrink-0 text-xs text-muted-foreground">{ago(item.at)}</span></div>
                          <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{item.detail}</p>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </Panel>

            <Panel className="xl:col-span-2" title="Recent Sensitive Events" description="The latest high-impact administrative events in the selected period." flush action={<Button asChild variant="ghost" size="sm"><Link href={auditRoutes.sensitive(scope)}>View All Sensitive Changes</Link></Button>}>
              <div className="h-[19rem] overflow-auto scrollbar-thin">
                {data.recentSensitive.length === 0 ? (
                  <EmptyState icon={CheckCircle2Icon} size="sm" title="No Sensitive Events" description="No high-impact action was recorded in this period." />
                ) : (
                  <table className="w-full text-[0.8125rem]">
                    <caption className="sr-only">Recent sensitive events</caption>
                    <thead className="sticky top-0 bg-surface-sunken text-left text-xs uppercase tracking-wide text-muted-foreground"><tr><th className="px-2 py-1.5 font-medium">Timestamp</th><th className="px-2 py-1.5 font-medium">Actor</th><th className="px-2 py-1.5 font-medium">Action</th><th className="hidden px-2 py-1.5 font-medium md:table-cell">Target</th><th className="hidden px-2 py-1.5 font-medium lg:table-cell">Scope</th><th className="px-2 py-1.5 font-medium">Result</th><th className="px-2 py-1.5 font-medium"><span className="sr-only">Open</span></th></tr></thead>
                    <tbody className="divide-y divide-border">
                      {data.recentSensitive.map((event) => (
                        <tr key={event.id} className="cursor-pointer hover:bg-accent/40" onClick={() => router.push(auditRoutes.event(event.id))}>
                          <td className="whitespace-nowrap px-2 py-1.5 text-xs tabular">{utcShort(event.occurredAt)}</td>
                          <td className="max-w-32 truncate px-2 py-1.5">{event.actor.displayName}</td>
                          <td className="px-2 py-1.5 font-medium text-foreground"><span className="block max-w-48 truncate">{event.actionLabel}</span></td>
                          <td className="hidden max-w-40 truncate px-2 py-1.5 md:table-cell">{event.target.displayName}</td>
                          <td className="hidden max-w-36 truncate px-2 py-1.5 lg:table-cell">{scopeText(event.scope)}</td>
                          <td className="px-2 py-1.5"><div className="flex flex-wrap items-center gap-1"><OutcomeBadge outcome={event.outcome} />{event.priority !== "informational" ? <span className="hidden xl:inline"><PriorityBadge priority={event.priority} /></span> : null}</div></td>
                          <td className="px-2 py-1.5 text-right"><Link href={auditRoutes.event(event.id)} onClick={(click) => click.stopPropagation()} className="text-xs font-medium text-primary hover:underline">Open</Link></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </Panel>
          </div>

          <Panel title="Audit Source" description="What this trail is built from. Frontend demo records are not production audit evidence.">
            <dl className="grid grid-cols-1 gap-x-6 gap-y-1 text-[0.8125rem] sm:grid-cols-2 lg:grid-cols-4">
              {[
                ["Data Source", data.source.dataSource],
                ["Backend Ingestion", data.source.ingestion],
                ["Integrity Verification", data.source.integrity],
                ["Production Coverage", data.source.productionCoverage],
              ].map(([label, value]) => <div key={label}><dt className="text-xs text-muted-foreground">{label}</dt><dd className="font-medium text-foreground">{value}</dd></div>)}
            </dl>
            <p className="mt-2 text-xs text-muted-foreground">{plural(data.source.knownGaps, "known collection gap")}. <Link href={auditRoutes.settings()} className="text-primary hover:underline">Review coverage and retention</Link></p>
          </Panel>
        </>
      )}

      {exporting ? <ExportDialog query={{ window: dateWindow, environment: environment ?? undefined }} subject="Every event" onClose={() => setExporting(false)} /> : null}
    </div>
  );
}
