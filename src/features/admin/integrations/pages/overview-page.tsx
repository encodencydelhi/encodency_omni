"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Activity, AlertTriangle, CheckCircle2, Layers, Plug, Plus, RefreshCw, Unplug, XCircle } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { STATUS_COLOR, intRoutes } from "../integrations-data/config";
import { useClientScope, useScopedData } from "../integrations-data/hooks";
import { dependencyLeaders, isActive, providerState, severityCounts } from "../integrations-data/selectors";
import { useIntegrations } from "../store/integrations-store";
import type { ConnectionStatus } from "../integrations-data/types";
import { ActivityTable, ConnectionCard, IssueRow, PageSkeleton, RunDialog } from "../components/blocks";
import { useConnectionActions } from "../components/connection-actions";
import { Button, Card, CardHeader, EmptyState, KpiTile, ModuleChips, ProviderLogo, RelativeTime, SeverityChip, ViewLink, x } from "../components/ui";

export function OverviewPage() {
  const { ready } = useIntegrations();
  if (!ready) return <PageSkeleton variant="overview" />;
  return <Overview />;
}

function Overview() {
  const router = useRouter();
  const { withScope } = useClientScope();
  const { connections, issues, summary } = useScopedData();
  const actions = useConnectionActions();
  const [runId, setRunId] = useState<string | null>(null);
  const active = connections.filter(isActive);

  const go = (query: string) => router.push(withScope(`${intRoutes.connected}${query}`));

  return (
    <div className="space-y-1">
      {/* A. KPIs */}
      <div className="grid grid-cols-2 gap-1 md:grid-cols-3 xl:grid-cols-6">
        <KpiTile label="Connected" value={summary.connected} detail="Healthy and syncing" icon={CheckCircle2} tone="green" onClick={() => go("?health=healthy")} />
        <KpiTile label="Needs attention" value={summary.needsAttention} detail={issues.length ? `${severityCounts(issues).critical} critical` : "All clear"} icon={AlertTriangle} tone={summary.needsAttention ? "amber" : "neutral"} onClick={() => go("?health=attention")} />
        <KpiTile label="Syncing" value={summary.syncing} detail="Running now" icon={RefreshCw} tone="blue" onClick={() => go("?status=syncing")} />
        <KpiTile label="Disconnected" value={summary.disconnected} detail="Previously connected" icon={Unplug} tone="neutral" onClick={() => go("?health=disconnected")} />
        <KpiTile label="Failed syncs" value={summary.failedSyncs} detail="Last 24 hours" icon={XCircle} tone={summary.failedSyncs ? "red" : "neutral"} onClick={() => router.push(withScope(`${intRoutes.activity}?result=failed`))} />
        <KpiTile label="Dependencies" value={summary.dependencies} detail="Features using integrations" icon={Layers} tone="violet" onClick={() => go("?sort=most_used")} />
      </div>

      {/* C + B */}
      <div className="grid gap-1 xl:grid-cols-12">
        <NeedsAttentionCard className="xl:col-span-8" actions={actions} />
        <HealthCard className="xl:col-span-4" />
      </div>

      {/* D */}
      <Card>
        <CardHeader
          title="Connected integrations"
          description={active.length ? `${active.length} active in this view` : "Nothing connected yet"}
          actions={<ViewLink href={withScope(intRoutes.connected)}>Manage all</ViewLink>}
        />
        {active.length === 0 ? (
          <EmptyState
            icon={Plug}
            compact
            title="No integrations connected"
            description="Connect Meta, Google, WhatsApp and more to power content, campaigns, automation and reporting."
            action={<Button variant="primary" icon={Plus} href={withScope(`${intRoutes.available}?connect=1`)}>Connect integration</Button>}
            secondary={<Button variant="secondary" href={withScope(intRoutes.available)}>Browse available</Button>}
          />
        ) : (
          <div className="grid gap-1 px-1 pb-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
            {active.slice(0, 8).map((connection) => (
              <ConnectionCard key={connection.id} connection={connection} actions={actions} />
            ))}
          </div>
        )}
        {active.length > 8 && (
          <div className="border-t border-[#EEF1F5] px-4 py-2 text-right">
            <ViewLink href={withScope(intRoutes.connected)}>View all {active.length} connections</ViewLink>
          </div>
        )}
      </Card>

      {/* E + F */}
      <div className="grid gap-1 xl:grid-cols-12">
        <RecentSyncCard className="xl:col-span-8" onOpenRun={setRunId} />
        <DependencySummary className="xl:col-span-4" />
      </div>

      {/* G */}
      <AvailablePreview />

      {actions.dialogs}
      <RunDialog runId={runId} onOpenChange={(open) => !open && setRunId(null)} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Needs attention                                                     */
/* ------------------------------------------------------------------ */

function NeedsAttentionCard({ className, actions }: { className?: string; actions: ReturnType<typeof useConnectionActions> }) {
  const { issues } = useScopedData();
  const { withScope } = useClientScope();
  const counts = severityCounts(issues);
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? issues : issues.slice(0, 5);

  return (
    <Card className={cn("flex flex-col", className)}>
      <CardHeader
        title="Needs attention"
        icon={AlertTriangle}
        description={issues.length ? `${issues.length} issue${issues.length === 1 ? "" : "s"}, most urgent first` : "No issues in this view"}
        actions={
          issues.length > 0 && (
            <span className="flex items-center gap-1">
              {counts.critical > 0 && <SeverityChip severity="critical" />}
              {counts.critical > 0 && <span className="mr-1.5 text-[12px] font-semibold tabular-nums text-[#C81E2B]">{counts.critical}</span>}
              {counts.warning > 0 && <SeverityChip severity="warning" />}
              {counts.warning > 0 && <span className="mr-1.5 text-[12px] font-semibold tabular-nums text-[#B54708]">{counts.warning}</span>}
              {counts.info > 0 && <SeverityChip severity="info" />}
              {counts.info > 0 && <span className="text-[12px] font-semibold tabular-nums text-[#1D4ED8]">{counts.info}</span>}
            </span>
          )
        }
      />
      {issues.length === 0 ? (
        <EmptyState
          icon={CheckCircle2}
          compact
          className="flex-1"
          title="No sync issues"
          description="Every integration in this view is connected, permitted and syncing on schedule."
          secondary={<Button variant="secondary" href={withScope(intRoutes.activity)}>View activity</Button>}
        />
      ) : (
        <>
          <ul className="divide-y divide-[#EEF1F5] border-t border-[#EEF1F5]">
            {visible.map((issue) => (
              <IssueRow key={issue.id} issue={issue} actions={actions} />
            ))}
          </ul>
          {issues.length > 5 && (
            <div className="border-t border-[#EEF1F5] px-4 py-2">
              <Button size="xs" variant="link" onClick={() => setShowAll((value) => !value)}>
                {showAll ? "Show fewer" : `Show all ${issues.length} issues`}
              </Button>
            </div>
          )}
        </>
      )}
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Health                                                              */
/* ------------------------------------------------------------------ */

const HEALTH_ROWS: { key: string; label: string; statuses: ConnectionStatus[]; query: string }[] = [
  { key: "healthy", label: "Healthy", statuses: ["connected", "syncing"], query: "?health=healthy" },
  { key: "needs_reconnect", label: "Needs reconnect", statuses: ["needs_reconnect"], query: "?status=needs_reconnect" },
  { key: "expiring", label: "Expiring", statuses: ["expiring"], query: "?status=expiring" },
  { key: "permission_missing", label: "Permission missing", statuses: ["permission_missing"], query: "?status=permission_missing" },
  { key: "sync_failed", label: "Sync failed", statuses: ["sync_failed"], query: "?status=sync_failed" },
  { key: "rate_limited", label: "Rate limited", statuses: ["rate_limited"], query: "?status=rate_limited" },
  { key: "disconnected", label: "Disconnected", statuses: ["disconnected"], query: "?health=disconnected" },
];

function HealthCard({ className }: { className?: string }) {
  const { connections } = useScopedData();
  const { withScope } = useClientScope();
  const rows = HEALTH_ROWS.map((row) => ({
    ...row,
    count: connections.filter((connection) => row.statuses.includes(connection.status)).length,
    color: STATUS_COLOR[row.statuses[0]!],
  }));
  const total = connections.length;
  const healthy = rows[0]!.count;
  const active = connections.filter(isActive).length;
  const score = active ? Math.round((healthy / active) * 100) : 0;

  // Donut arcs, drawn directly — no chart library needed for seven slices.
  const radius = 44;
  const circumference = 2 * Math.PI * radius;
  const arcs = rows
    .filter((row) => row.count > 0 && total > 0)
    .reduce<{ key: string; color: string; length: number; offset: number }[]>((list, row) => {
      const previous = list[list.length - 1];
      const offset = previous ? previous.offset + previous.length : 0;
      return [...list, { key: row.key, color: row.color, length: (row.count / total) * circumference, offset }];
    }, []);

  return (
    <Card className={cn("flex flex-col", className)}>
      <CardHeader title="Integration health" description={`${total} integration${total === 1 ? "" : "s"} in this view`} />
      <div className="flex flex-wrap items-center gap-4 px-4 pb-3">
        <div className="relative size-[112px] shrink-0">
          <svg viewBox="0 0 112 112" className="size-full -rotate-90" role="img" aria-label={`${score}% of active integrations are healthy`}>
            <circle cx="56" cy="56" r={radius} fill="none" stroke="#EEF1F5" strokeWidth="12" />
            {arcs.map((arc) => (
              <circle key={arc.key} cx="56" cy="56" r={radius} fill="none" stroke={arc.color} strokeWidth="12" strokeDasharray={`${Math.max(arc.length - 2, 1)} ${circumference}`} strokeDashoffset={-arc.offset} />
            ))}
          </svg>
          <span className="absolute inset-0 grid place-items-center text-center">
            <span>
              <b className="block text-[20px] font-semibold leading-6 tabular-nums text-[#0F1B3D]">{score}%</b>
              <small className="block text-[10.5px] text-[#6B7890]">healthy</small>
            </span>
          </span>
        </div>
        <ul className="min-w-[170px] flex-1 space-y-0.5">
          {rows.map((row) => (
            <li key={row.key}>
              <Link href={withScope(`${intRoutes.connected}${row.query}`)} className={cn("flex items-center gap-2 rounded-sm px-1.5 py-1 text-[12.5px] hover:bg-[#F3F5F9]", !row.count && "opacity-50", x.focus)}>
                <i className="size-2 shrink-0 rounded-full" style={{ background: row.color }} />
                <span className="flex-1 text-[#3C4A66]">{row.label}</span>
                <b className="font-semibold tabular-nums text-[#0F1B3D]">{row.count}</b>
              </Link>
            </li>
          ))}
        </ul>
      </div>
      <HealthBreakdown />
    </Card>
  );
}

/** Below the donut: health per client across the org, or the next syncs inside one client. */
function HealthBreakdown() {
  const { data } = useIntegrations();
  const { clientId, withScope } = useClientScope();
  const { connections } = useScopedData();

  if (clientId === "all") {
    const rows = data.clients.map((client) => {
      const mine = connections.filter((connection) => isActive(connection) && (connection.clientId === client.id || connection.resources.some((resource) => resource.clientId === client.id)));
      const healthy = mine.filter((connection) => connection.status === "connected" || connection.status === "syncing").length;
      return { client, total: mine.length, healthy };
    });
    return (
      <div className="mt-auto border-t border-[#EEF1F5] px-4 py-3">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.04em] text-[#6B7890]">By client</p>
        <ul className="space-y-2">
          {rows.map(({ client, total, healthy }) => (
            <li key={client.id}>
              <Link href={`${intRoutes.overview}?client=${client.id}`} className={cn("block rounded-sm", x.focus)}>
                <span className="flex items-center justify-between gap-2 text-[12px]">
                  <span className="flex min-w-0 items-center gap-1.5 text-[#24324F]">
                    <i className="size-2 shrink-0 rounded-full" style={{ background: client.color }} />
                    <span className="truncate hover:text-[#2563EB]">{client.name}</span>
                  </span>
                  <span className="shrink-0 tabular-nums text-[#6B7890]">
                    <b className="font-semibold text-[#0F1B3D]">{healthy}</b>/{total} healthy
                  </span>
                </span>
                <span className="mt-1 block h-1.5 overflow-hidden rounded-sm bg-[#FDECEC]">
                  <span className="block h-full rounded-sm bg-[#12B76A]" style={{ width: `${total ? (healthy / total) * 100 : 0}%` }} />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  const upcoming = connections
    .filter((connection) => connection.nextSyncAt)
    .sort((a, b) => (a.nextSyncAt ?? "").localeCompare(b.nextSyncAt ?? ""))
    .slice(0, 4);
  return (
    <div className="mt-auto border-t border-[#EEF1F5] px-4 py-3">
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.04em] text-[#6B7890]">Next scheduled syncs</p>
      {upcoming.length === 0 ? (
        <p className="text-[12px] text-[#98A2B3]">Nothing scheduled.</p>
      ) : (
        <ul className="space-y-1.5">
          {upcoming.map((connection) => (
            <li key={connection.id}>
              <Link href={withScope(intRoutes.detail(connection.id, "sync"))} className={cn("flex items-center gap-2 rounded-sm text-[12px] hover:text-[#2563EB]", x.focus)}>
                <ProviderLogo providerId={connection.providerId} className="size-5 rounded-[5px] p-0.5" />
                <span className="min-w-0 flex-1 truncate text-[#24324F]">{data.providers.find((provider) => provider.id === connection.providerId)?.name}</span>
                <span className="shrink-0 text-[#6B7890]"><RelativeTime iso={connection.nextSyncAt} future /></span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Recent sync activity                                                */
/* ------------------------------------------------------------------ */

function RecentSyncCard({ className, onOpenRun }: { className?: string; onOpenRun: (id: string) => void }) {
  const { activity } = useScopedData();
  const { withScope } = useClientScope();
  const recent = useMemo(
    () => activity.filter((item) => item.event.startsWith("sync") || item.event === "reconnected" || item.event === "connected").sort((a, b) => b.at.localeCompare(a.at)).slice(0, 6),
    [activity],
  );

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader title="Recent sync activity" icon={Activity} actions={<ViewLink href={withScope(intRoutes.activity)}>All activity</ViewLink>} />
      {recent.length === 0 ? (
        <EmptyState icon={Activity} compact title="No activity yet" description="Syncs, reconnects and connection changes will appear here." />
      ) : (
        <div className="border-t border-[#EEF1F5]">
          <ActivityTable items={recent} onOpenRun={onOpenRun} showUser={false} compact />
        </div>
      )}
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Dependency summary                                                  */
/* ------------------------------------------------------------------ */

function DependencySummary({ className }: { className?: string }) {
  const { data } = useIntegrations();
  const { connections, dependencies } = useScopedData();
  const { withScope } = useClientScope();
  const leaders = dependencyLeaders(connections, dependencies, 6);

  return (
    <Card className={className}>
      <CardHeader title="What depends on what" icon={Layers} description="Integrations powering the most features" />
      {leaders.length === 0 ? (
        <EmptyState icon={Layers} compact title="No dependencies yet" description="Once modules start using an integration, it shows up here." />
      ) : (
        <ul className="divide-y divide-[#EEF1F5] border-t border-[#EEF1F5]">
          {leaders.map(({ connection, modules, critical }) => {
            const provider = data.providers.find((item) => item.id === connection.providerId);
            const moduleKeys = dependencies.filter((dependency) => dependency.connectionId === connection.id && dependency.activeCount > 0).map((dependency) => dependency.module);
            return (
              <li key={connection.id}>
                <Link href={withScope(intRoutes.detail(connection.id, "usage"))} className={cn("flex items-center gap-2.5 px-4 py-2.5 transition-colors hover:bg-[#FAFBFD]", x.focus)}>
                  <ProviderLogo providerId={connection.providerId} className="size-8 p-1" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[12.5px] font-semibold text-[#0F1B3D]">
                      {provider?.name} <span className="font-normal text-[#98A2B3]">· {connection.accountName}</span>
                    </span>
                    <ModuleChips modules={moduleKeys} max={2} className="mt-0.5" />
                  </span>
                  <span className="shrink-0 text-right">
                    <b className="block text-[14px] font-semibold tabular-nums text-[#0F1B3D]">{modules}</b>
                    <span className="block text-[10.5px] text-[#6B7890]">{critical ? `${critical} critical` : "modules"}</span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Available preview                                                   */
/* ------------------------------------------------------------------ */

function AvailablePreview() {
  const { data, can } = useIntegrations();
  const { clientId, withScope } = useClientScope();
  // In one client: what that client lacks. Across all clients: what at least one client lacks.
  const candidates = data.providers
    .filter((provider) => provider.availability === "available")
    .map((provider) => {
      if (clientId !== "all") {
        const { state } = providerState(provider, data.connections, clientId);
        return { provider, state, missing: [] as string[] };
      }
      const connected = (id: string | null) => data.connections.some((connection) => connection.providerId === provider.id && isActive(connection) && connection.clientId === id);
      const missing = provider.scope === "organization" ? (connected(null) ? [] : ["organization"]) : data.clients.filter((client) => !connected(client.id)).map((client) => client.name);
      const everUsed = data.connections.some((connection) => connection.providerId === provider.id);
      return { provider, state: missing.length ? (everUsed ? "partial" : "not_connected") : "connected", missing };
    })
    .filter((row) => row.state === "not_connected" || row.state === "disconnected" || row.state === "partial")
    .slice(0, 6);

  return (
    <Card>
      <CardHeader title="Available to connect" description="Enabled for your organization but not yet connected here" actions={<ViewLink href={withScope(intRoutes.available)}>View all available</ViewLink>} />
      {candidates.length === 0 ? (
        <EmptyState icon={Plug} compact title="Everything's connected" description="Every integration available to your organization is already connected in this view." />
      ) : (
        <div className="grid gap-1 px-1 pb-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
          {candidates.map(({ provider, state, missing }) => (
            <div key={provider.id} className="flex items-center gap-2.5 rounded-[10px] border border-[#E4E9F0] bg-white px-3 py-2.5">
              <ProviderLogo providerId={provider.id} className="size-8 p-1" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[12.5px] font-semibold text-[#0F1B3D]">{provider.name}</span>
                <span className="block truncate text-[11px] text-[#6B7890]" title={missing.join(", ") || undefined}>
                  {state === "disconnected" ? "Previously connected" : state === "partial" ? `Missing for ${missing.length} client${missing.length === 1 ? "" : "s"}` : "Not connected"}
                </span>
              </span>
              <Button size="xs" variant="secondary" gate={can.canConnect} href={withScope(`${intRoutes.available}?connect=1&provider=${provider.id}${clientId !== "all" ? `&for=${clientId}` : ""}`)}>
                Connect
              </Button>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

