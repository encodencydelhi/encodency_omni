"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo, useState } from "react";
import { subDays, parseISO } from "date-fns";
import {
  ArrowLeft,
  ArrowRightLeft,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Database,
  Download,
  ExternalLink,
  KeyRound,
  Layers,
  Plug,
  RefreshCw,
  ShieldAlert,
  Star,
  Unplug,
} from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils/cn";
import { reconnectCapability } from "../integrations-data/capability-provider";
import { DATA_TYPE_LABEL, EVENT_LABEL, FREQUENCY_LABEL, MODULE_META, RESOURCE_LABEL, intRoutes } from "../integrations-data/config";
import { useClientScope, useConnection, useConnectionGates, useProvider, useQueryState, useScopedData } from "../integrations-data/hooks";
import { clientName, dependenciesFor, deriveIssues, disconnectImpact, downloadFile, isActive, primaryResource, scopedResources, toCsv } from "../integrations-data/selectors";
import { useIntegrations } from "../store/integrations-store";
import type { IntegrationConnection, IntegrationProvider, IntegrationResource } from "../integrations-data/types";
import { IssueRow, PageSkeleton, ResultChip, RunDialog, SyncRunsTable, formatDuration } from "../components/blocks";
import { SyncButton, useConnectionActions } from "../components/connection-actions";
import {
  ActionMenu,
  Badge,
  Button,
  Card,
  ClientTag,
  ConfirmDialog,
  DefinitionRow,
  EmptyState,
  ModuleChips,
  PermissionChip,
  ProviderLogo,
  RelativeTime,
  SelectMenu,
  StatusChip,
  UnderlineTabs,
  buttonClass,
  tdClass,
  thClass,
  x,
} from "../components/ui";

type Tab = "overview" | "accounts" | "permissions" | "sync" | "usage" | "activity";
const DEFAULTS = { tab: "overview" };

export function DetailPage() {
  const params = useParams<{ integrationId: string }>();
  const { ready } = useIntegrations();
  const connection = useConnection(typeof params?.integrationId === "string" ? params.integrationId : null);
  const { clientId, withScope } = useClientScope();
  const { connections } = useScopedData();

  if (!ready) return <PageSkeleton variant="detail" />;
  if (!connection) {
    return (
      <Card>
        <EmptyState
          icon={Plug}
          title="Integration not found"
          description="It may have been removed, or the link is out of date."
          action={<Button variant="primary" icon={ArrowLeft} href={withScope(intRoutes.connected)}>Back to connected</Button>}
        />
      </Card>
    );
  }
  // Client scope applies here too — no peeking at another client's connection by URL.
  if (clientId !== "all" && !connections.some((item) => item.id === connection.id)) {
    return (
      <Card>
        <EmptyState
          icon={ShieldAlert}
          title="Not part of this client"
          description="This integration isn't connected for the client you've selected. Switch to “All clients” to see it."
          action={<Button variant="primary" href={intRoutes.detail(connection.id)}>View with all clients</Button>}
          secondary={<Button variant="secondary" href={withScope(intRoutes.connected)}>Back</Button>}
        />
      </Card>
    );
  }
  return <Detail connection={connection} />;
}

function Detail({ connection }: { connection: IntegrationConnection }) {
  const provider = useProvider(connection.providerId)!;
  const { data, syncJobs } = useIntegrations();
  const { withScope } = useClientScope();
  const { values, set } = useQueryState(useMemo(() => DEFAULTS, []));
  const tab = values.tab as Tab;
  const actions = useConnectionActions();
  const gates = useConnectionGates(connection)!;
  const [runId, setRunId] = useState<string | null>(null);

  const dependencies = dependenciesFor(data.dependencies, connection.id);
  const runs = data.syncRuns.filter((run) => run.connectionId === connection.id).sort((a, b) => b.startedAt.localeCompare(a.startedAt));
  const issues = deriveIssues([connection], data.providers, data.dependencies, data.syncRuns);
  const activity = data.activity.filter((item) => item.connectionId === connection.id);
  const lacking = connection.permissions.filter((permission) => permission.status === "missing" || permission.status === "expired").length;
  const live = isActive(connection);
  const needsReconnect = ["needs_reconnect", "expiring", "permission_missing"].includes(connection.status);

  return (
    <div className="space-y-1">
      {/* Header */}
      <Card className="p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <ProviderLogo providerId={connection.providerId} className="size-12 p-2" muted={!live} />
            <div className="min-w-0">
              <Link href={withScope(intRoutes.connected)} className={cn("mb-1 inline-flex items-center gap-1 rounded text-[12px] font-semibold text-[#2563EB] hover:underline", x.focus)}>
                <ArrowLeft className="size-3.5" />
                Connected
              </Link>
              <h2 className="flex flex-wrap items-center gap-2 text-[17px] font-semibold leading-6 text-[#0F1B3D]">
                {provider.name}
                <StatusChip status={connection.status} progress={syncJobs[connection.id]?.progress} />
                {issues.length === 0 && live && <Badge tone="green" icon={CheckCircle2}>Healthy</Badge>}
              </h2>
              <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12.5px] text-[#6B7890]">
                <span className="font-medium text-[#24324F]">{connection.accountName}</span>
                <span className="text-[#C9D1DC]">·</span>
                <ClientTag clientId={connection.clientId} />
                <span className="text-[#C9D1DC]">·</span>
                <span>
                  Last sync <RelativeTime iso={connection.lastSyncAt} fallback="never" />
                </span>
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {live && <SyncButton connection={connection} />}
            {live ? (
              <Button size="sm" variant={needsReconnect ? "primary" : "secondary"} icon={KeyRound} gate={gates.reconnect} onClick={() => actions.openReconnect(connection)}>
                Reconnect
              </Button>
            ) : (
              <Button size="sm" variant="primary" icon={Plug} href={withScope(`${intRoutes.detail(connection.id)}?connect=1&provider=${connection.providerId}${connection.clientId ? `&for=${connection.clientId}` : ""}`)}>
                Connect again
              </Button>
            )}
            {live && (
              <Button size="sm" variant="danger" icon={Unplug} gate={gates.disconnect} onClick={() => actions.openDisconnect(connection)}>
                Disconnect
              </Button>
            )}
            <ActionMenu
              label="More"
              items={[
                { label: "Manage mapping", icon: ArrowRightLeft, onSelect: () => actions.openMapping(connection), gate: gates.mapping, hidden: !live },
                { label: "View usage", icon: Layers, onSelect: () => set({ tab: "usage" }) },
                {
                  label: "Export activity (CSV)",
                  icon: Download,
                  onSelect: () =>
                    downloadFile(
                      `${provider.id}-activity.csv`,
                      toCsv(activity.map((item) => ({ time: item.at, event: EVENT_LABEL[item.event], summary: item.summary, result: item.result, user: item.actor }))),
                      "text/csv;charset=utf-8",
                    ),
                  disabledReason: activity.length ? undefined : "No activity yet.",
                },
                { label: "Provider help", icon: ExternalLink, href: provider.learnMoreUrl, external: provider.learnMoreUrl.startsWith("http") },
              ]}
              trigger={
                <button type="button" className={buttonClass("secondary", "icon", "size-8")}>
                  <span aria-hidden="true" className="text-[15px] font-bold leading-none tracking-[0.08em]">⋯</span>
                </button>
              }
            />
          </div>
        </div>
      </Card>

      {!live && (
        <Card className="flex flex-wrap items-center gap-3 border-[#E4E9F0] bg-[#F8FAFC] px-3.5 py-2.5">
          <Unplug className="size-4 shrink-0 text-[#6B7890]" />
          <p className="min-w-[220px] flex-1 text-[12.5px] leading-5 text-[#3C4A66]">
            <b className="font-semibold text-[#0F1B3D]">Disconnected {connection.disconnectedAt ? <RelativeTime iso={connection.disconnectedAt} /> : ""}.</b> Nothing is syncing, and features that relied on it are paused. History is kept.
          </p>
        </Card>
      )}

      <Card className="overflow-hidden">
        <div className="border-b border-[#E4E9F0] px-3 pt-2">
          <UnderlineTabs
            label="Integration sections"
            value={tab}
            onChange={(value) => set({ tab: value })}
            items={[
              { value: "overview" as Tab, label: "Overview" },
              { value: "accounts" as Tab, label: "Accounts", count: connection.resources.length },
              { value: "permissions" as Tab, label: "Permissions", count: lacking || undefined, alert: lacking > 0 },
              { value: "sync" as Tab, label: "Sync" },
              { value: "usage" as Tab, label: "Usage", count: dependencies.filter((dependency) => dependency.activeCount > 0).length },
              { value: "activity" as Tab, label: "Activity" },
            ]}
          />
        </div>
        <div className="p-4">
          {tab === "overview" && <OverviewTab connection={connection} provider={provider} actions={actions} issuesCount={issues.length} />}
          {tab === "accounts" && <AccountsTab connection={connection} actions={actions} />}
          {tab === "permissions" && <PermissionsTab connection={connection} provider={provider} actions={actions} />}
          {tab === "sync" && <SyncTab connection={connection} provider={provider} runs={runs} onOpenRun={setRunId} />}
          {tab === "usage" && <UsageTab connection={connection} actions={actions} />}
          {tab === "activity" && <ActivityTab connection={connection} onOpenRun={setRunId} />}
        </div>
      </Card>

      {actions.dialogs}
      <RunDialog runId={runId} onOpenChange={(open) => !open && setRunId(null)} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Overview                                                            */
/* ------------------------------------------------------------------ */

function OverviewTab({ connection, provider, actions, issuesCount }: { connection: IntegrationConnection; provider: IntegrationProvider; actions: ReturnType<typeof useConnectionActions>; issuesCount: number }) {
  const { data } = useIntegrations();
  const { withScope } = useClientScope();
  const issues = deriveIssues([connection], data.providers, data.dependencies, data.syncRuns);
  const dependencies = dependenciesFor(data.dependencies, connection.id).filter((dependency) => dependency.activeCount > 0);
  const primary = primaryResource(connection);
  const lastRun = data.syncRuns.filter((run) => run.connectionId === connection.id).sort((a, b) => b.startedAt.localeCompare(a.startedAt))[0];

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] xl:grid-cols-[340px_minmax(0,1fr)]">
      <div>
        <p className="mb-1.5 text-[11.5px] font-semibold uppercase tracking-[0.04em] text-[#6B7890]">Connection</p>
        <dl className="rounded-sm border border-[#E4E9F0] px-3 py-0.5">
          <DefinitionRow label="Status"><StatusChip status={connection.status} /></DefinitionRow>
          <DefinitionRow label="Health">{issuesCount ? `${issuesCount} issue${issuesCount === 1 ? "" : "s"}` : connection.status === "disconnected" ? "Off" : "Healthy"}</DefinitionRow>
          <DefinitionRow label="Connected since"><RelativeTime iso={connection.connectedAt} /></DefinitionRow>
          <DefinitionRow label="Connected by">{connection.connectedBy}</DefinitionRow>
          <DefinitionRow label="Last sync"><RelativeTime iso={connection.lastSyncAt} fallback="Never" /></DefinitionRow>
          <DefinitionRow label="Next sync">{connection.nextSyncAt ? <RelativeTime iso={connection.nextSyncAt} future /> : "Paused"}</DefinitionRow>
          <DefinitionRow label="Primary account">{primary?.name ?? "—"}</DefinitionRow>
          <DefinitionRow label="Mapped client">{clientName(data.clients, connection.clientId)}</DefinitionRow>
          <DefinitionRow label="Sync frequency">{FREQUENCY_LABEL[connection.syncFrequency]}</DefinitionRow>
          {connection.tokenExpiresAt && <DefinitionRow label="Access expires"><RelativeTime iso={connection.tokenExpiresAt} future /></DefinitionRow>}
        </dl>
        <p className="mt-2 text-[11.5px] leading-4 text-[#98A2B3]">Access tokens and provider credentials are held by OmniPlatform&apos;s integration service and never shown here.</p>
      </div>

      <div className="min-w-0 space-y-4">
        <div>
          <p className="mb-1.5 text-[11.5px] font-semibold uppercase tracking-[0.04em] text-[#6B7890]">Needs attention</p>
          {issues.length === 0 ? (
            <p className="flex items-center gap-2 rounded-sm border border-[#C6EFD9] bg-[#F4FCF8] px-3 py-2.5 text-[12.5px] text-[#067647]">
              <CheckCircle2 className="size-4" />
              {connection.status === "disconnected" ? "Disconnected — nothing to fix while it's off." : "Nothing to fix. Syncing on schedule."}
            </p>
          ) : (
            <ul className="divide-y divide-[#EEF1F5] rounded-sm border border-[#E4E9F0]">
              {issues.map((issue) => <IssueRow key={issue.id} issue={issue} actions={actions} />)}
            </ul>
          )}
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <p className="text-[11.5px] font-semibold uppercase tracking-[0.04em] text-[#6B7890]">Used by</p>
            <Link href={withScope(intRoutes.detail(connection.id, "usage"))} className="text-[12px] font-semibold text-[#2563EB] hover:underline">See usage</Link>
          </div>
          {dependencies.length === 0 ? (
            <p className="rounded-sm border border-[#E4E9F0] px-3 py-2.5 text-[12.5px] text-[#6B7890]">
              Not used yet. It can power <ModuleChips modules={provider.modules} max={4} className="mt-1" />
            </p>
          ) : (
            <ul className="grid gap-1 sm:grid-cols-2">
              {dependencies.map((dependency) => (
                <li key={dependency.id} className="flex items-center justify-between gap-2 rounded-sm border border-[#E4E9F0] px-3 py-2">
                  <span className="min-w-0">
                    <Link href={dependency.href} className="block truncate text-[12.5px] font-semibold text-[#0F1B3D] hover:text-[#2563EB]">{MODULE_META[dependency.module].label}</Link>
                    <span className="block truncate text-[11.5px] text-[#6B7890]">{dependency.feature}</span>
                  </span>
                  <span className="shrink-0 text-right text-[12px] tabular-nums text-[#3C4A66]">
                    <b className="block text-[14px] font-semibold text-[#0F1B3D]">{dependency.activeCount}</b>
                    <span className="text-[10.5px] text-[#98A2B3]">{dependency.unit}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {lastRun && (
          <div>
            <p className="mb-1.5 text-[11.5px] font-semibold uppercase tracking-[0.04em] text-[#6B7890]">Last sync result</p>
            <div className="flex flex-wrap items-center gap-3 rounded-sm border border-[#E4E9F0] px-3 py-2.5 text-[12.5px] text-[#3C4A66]">
              <ResultChip result={lastRun.status === "success" ? "success" : lastRun.status === "partial" ? "warning" : lastRun.status === "failed" ? "failed" : "info"} />
              <span>{lastRun.recordsProcessed.toLocaleString("en-IN")} records</span>
              {lastRun.failedRecords > 0 && <span className="text-[#B54708]">{lastRun.failedRecords} skipped</span>}
              <span className="text-[#98A2B3]">{formatDuration(lastRun.durationMs)}</span>
              <span className="ml-auto text-[#98A2B3]"><RelativeTime iso={lastRun.startedAt} /></span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Accounts                                                            */
/* ------------------------------------------------------------------ */

function AccountsTab({ connection, actions }: { connection: IntegrationConnection; actions: ReturnType<typeof useConnectionActions> }) {
  const { can, setPrimary, disconnectResource } = useIntegrations();
  const { clientId } = useClientScope();
  const { visible, hidden } = scopedResources(connection, clientId);
  const [removeTarget, setRemoveTarget] = useState<IntegrationResource | null>(null);
  const [detailTarget, setDetailTarget] = useState<IntegrationResource | null>(null);
  const live = isActive(connection);

  return (
    <div className="space-y-2">
      {hidden > 0 && (
        <p className="rounded-sm bg-[#F5F8FF] px-3 py-2 text-[12px] text-[#3C4A66]">
          {hidden} more account{hidden === 1 ? " is" : "s are"} mapped to other clients and hidden in this view.
        </p>
      )}
      {visible.length === 0 ? (
        <EmptyState icon={Database} compact title="No accounts in this view" description="Every account on this connection belongs to another client." />
      ) : (
        <div className="scrollbar-thin overflow-x-auto rounded-sm border border-[#E4E9F0]">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th scope="col" className={cn(thClass, "min-w-[200px]")}>Account / property</th>
                <th scope="col" className={cn(thClass, "max-md:hidden")}>Type</th>
                <th scope="col" className={thClass}>Client</th>
                <th scope="col" className={thClass}>Primary</th>
                <th scope="col" className={thClass}>Status</th>
                <th scope="col" className={cn(thClass, "max-lg:hidden")}>Last sync</th>
                <th scope="col" className={cn(thClass, "w-px")}><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {visible.map((resource) => (
                <tr key={resource.id} className="transition-colors hover:bg-[#FAFBFD]">
                  <td className={tdClass}>
                    <span className="block font-semibold text-[#0F1B3D]">{resource.name}</span>
                    <span className="block max-w-[260px] truncate text-[11.5px] text-[#6B7890]" title={resource.handle}>{resource.handle}</span>
                  </td>
                  <td className={cn(tdClass, "whitespace-nowrap max-md:hidden")}>{RESOURCE_LABEL[resource.type]}</td>
                  <td className={cn(tdClass, "whitespace-nowrap")}><ClientTag clientId={resource.clientId} /></td>
                  <td className={tdClass}>
                    {resource.primary ? <Badge tone="blue" icon={Star}>Primary</Badge> : <span className="text-[12px] text-[#98A2B3]">—</span>}
                  </td>
                  <td className={tdClass}>
                    {resource.status === "active" ? <Badge tone="green" dot>Active</Badge> : <Badge tone="red" dot>{resource.status === "removed" ? "Removed" : "Access revoked"}</Badge>}
                  </td>
                  <td className={cn(tdClass, "whitespace-nowrap max-lg:hidden")}><RelativeTime iso={resource.lastSyncAt} fallback="Never" /></td>
                  <td className={cn(tdClass, "text-right")}>
                    <ActionMenu
                      label={`Actions for ${resource.name}`}
                      width={210}
                      items={[
                        { label: "View details", onSelect: () => setDetailTarget(resource) },
                        { label: "Set as primary", icon: Star, onSelect: () => void setPrimary(connection.id, resource.id), gate: can.canChangeMapping, hidden: resource.primary || !live },
                        { label: "Change client mapping", icon: ArrowRightLeft, onSelect: () => actions.openMapping(connection, resource), gate: can.canChangeMapping, hidden: !live },
                        "separator",
                        {
                          label: "Disconnect resource",
                          icon: Unplug,
                          danger: true,
                          onSelect: () => setRemoveTarget(resource),
                          gate: can.canDisconnect,
                          disabledReason: connection.resources.length <= 1 ? "This is the only account. Disconnect the whole integration instead." : undefined,
                          hidden: !live,
                        },
                      ]}
                      trigger={
                        <button type="button" className={buttonClass("ghost", "iconSm")}>
                          <span aria-hidden="true" className="text-[14px] font-bold leading-none tracking-[0.08em]">⋯</span>
                        </button>
                      }
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDialog
        open={removeTarget !== null}
        onOpenChange={(open) => !open && setRemoveTarget(null)}
        title={`Stop syncing “${removeTarget?.name ?? ""}”?`}
        description="Only this account stops syncing. The rest of the integration keeps working, and you can add it back by reconnecting."
        affected={removeTarget ? [`${RESOURCE_LABEL[removeTarget.type]} · ${removeTarget.handle}`] : undefined}
        confirmLabel="Disconnect resource"
        onConfirm={() => (removeTarget ? disconnectResource(connection.id, removeTarget.id) : false)}
      />

      <Dialog open={detailTarget !== null} onOpenChange={(open) => !open && setDetailTarget(null)}>
        <DialogContent className="w-[calc(100vw-24px)] max-w-[440px] gap-0 p-0">
          {detailTarget && (
            <>
              <div className="px-5 pt-5">
                <DialogTitle className="text-[15px] text-[#0F1B3D]">{detailTarget.name}</DialogTitle>
                <DialogDescription className="mt-0.5 text-[12.5px] text-[#6B7890]">{RESOURCE_LABEL[detailTarget.type]}</DialogDescription>
              </div>
              <dl className="mx-5 mt-3 rounded-sm border border-[#E4E9F0] px-3 py-0.5">
                <DefinitionRow label="Handle">{detailTarget.handle}</DefinitionRow>
                <DefinitionRow label="Client"><ClientTag clientId={detailTarget.clientId} /></DefinitionRow>
                <DefinitionRow label="Primary">{detailTarget.primary ? "Yes" : "No"}</DefinitionRow>
                <DefinitionRow label="Status">{detailTarget.status === "active" ? "Active" : detailTarget.status === "removed" ? "Removed" : "Access revoked"}</DefinitionRow>
                <DefinitionRow label="Last sync"><RelativeTime iso={detailTarget.lastSyncAt} fallback="Never" /></DefinitionRow>
              </dl>
              <div className="mt-4 flex justify-end gap-2 border-t border-[#EEF1F5] px-5 py-3">
                {live && (
                  <Button variant="secondary" icon={ArrowRightLeft} gate={can.canChangeMapping} onClick={() => { const target = detailTarget; setDetailTarget(null); actions.openMapping(connection, target); }}>
                    Change mapping
                  </Button>
                )}
                <Button variant="primary" onClick={() => setDetailTarget(null)}>Close</Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Permissions                                                         */
/* ------------------------------------------------------------------ */

function PermissionsTab({ connection, provider, actions }: { connection: IntegrationConnection; provider: IntegrationProvider; actions: ReturnType<typeof useConnectionActions> }) {
  const { can } = useIntegrations();
  const [advanced, setAdvanced] = useState(false);
  const lacking = connection.permissions.filter((permission) => permission.status === "missing" || permission.status === "expired");

  return (
    <div className="space-y-2">
      {lacking.length > 0 ? (
        <div className="flex flex-wrap items-center gap-3 rounded-sm border border-[#FCD9C4] bg-[#FFF8F3] px-3 py-2.5">
          <ShieldAlert className="size-4 shrink-0 text-[#C4320A]" />
          <p className="min-w-[220px] flex-1 text-[12.5px] leading-5 text-[#3C4A66]">
            <b className="font-semibold text-[#0F1B3D]">{lacking.length} permission{lacking.length === 1 ? " is" : "s are"} not granted.</b> Permissions can only be changed on {provider.name} — reconnect and approve them there.
          </p>
          <Button size="sm" variant="primary" icon={KeyRound} gate={reconnectCapability(connection, can.canReconnect)} onClick={() => actions.openReconnect(connection)}>
            Reconnect to grant permission
          </Button>
        </div>
      ) : (
        <p className="flex items-center gap-2 rounded-sm border border-[#C6EFD9] bg-[#F4FCF8] px-3 py-2 text-[12.5px] text-[#067647]">
          <CheckCircle2 className="size-4" />
          No permissions missing. Everything OmniPlatform needs is granted.
        </p>
      )}

      <div className="scrollbar-thin overflow-x-auto rounded-sm border border-[#E4E9F0]">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th scope="col" className={cn(thClass, "min-w-[180px]")}>Permission</th>
              <th scope="col" className={cn(thClass, "min-w-[220px] max-md:hidden")}>Description</th>
              <th scope="col" className={thClass}>Status</th>
              <th scope="col" className={thClass}>Required for</th>
            </tr>
          </thead>
          <tbody>
            {provider.permissions.map((definition) => {
              const status = connection.permissions.find((permission) => permission.key === definition.key)?.status ?? "missing";
              return (
                <tr key={definition.key} className="transition-colors hover:bg-[#FAFBFD]">
                  <td className={tdClass}>
                    <span className="block font-semibold text-[#0F1B3D]">{definition.label}</span>
                    <span className="block text-[11.5px] text-[#6B7890] md:hidden">{definition.description}</span>
                    {advanced && <code className="mt-0.5 block font-mono text-[10.5px] text-[#98A2B3]">{definition.technicalScope}</code>}
                  </td>
                  <td className={cn(tdClass, "text-[12px] max-md:hidden")}>{definition.description}</td>
                  <td className={tdClass}><PermissionChip status={status} /></td>
                  <td className={tdClass}><ModuleChips modules={definition.requiredFor} max={3} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <button type="button" onClick={() => setAdvanced((value) => !value)} aria-expanded={advanced} className={cn("inline-flex items-center gap-1 rounded text-[11.5px] font-semibold text-[#6B7890] hover:text-[#0F1B3D]", x.focus)}>
        <ChevronDown className={cn("size-3.5 transition", advanced && "rotate-180")} />
        {advanced ? "Hide" : "Show"} technical scope names
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Sync                                                                */
/* ------------------------------------------------------------------ */

function SyncTab({ connection, provider, runs, onOpenRun }: { connection: IntegrationConnection; provider: IntegrationProvider; runs: ReturnType<typeof useIntegrations>["data"]["syncRuns"]; onOpenRun: (id: string) => void }) {
  const { syncJobs, syncNow } = useIntegrations();
  const gates = useConnectionGates(connection)!;
  const job = syncJobs[connection.id];
  const last = runs[0];
  const failed = runs.find((run) => run.status === "failed");
  const live = isActive(connection);

  const stats = [
    { label: "Last sync", value: <RelativeTime iso={connection.lastSyncAt} fallback="Never" /> },
    { label: "Next sync", value: connection.nextSyncAt ? <RelativeTime iso={connection.nextSyncAt} future /> : "Paused" },
    { label: "Frequency", value: FREQUENCY_LABEL[connection.syncFrequency] },
    { label: "Duration", value: formatDuration(last?.durationMs ?? null) },
    { label: "Records processed", value: last ? last.recordsProcessed.toLocaleString("en-IN") : "—" },
    { label: "Failed records", value: last ? last.failedRecords.toLocaleString("en-IN") : "—" },
  ];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <StatusChip status={connection.status} progress={job?.progress} />
          {job && <span className="text-[12px] text-[#6B7890]">{job.phase}</span>}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {failed && live && connection.status === "sync_failed" && !job && (
            <Button size="sm" variant="primary" icon={RefreshCw} gate={gates.sync} onClick={() => void syncNow(connection.id, "retry")}>
              Retry failed sync
            </Button>
          )}
          {live && <SyncButton connection={connection} />}
        </div>
      </div>

      {job && (
        <span className="block h-1.5 overflow-hidden rounded-sm bg-[#EEF1F5]" role="progressbar" aria-valuenow={job.progress} aria-valuemin={0} aria-valuemax={100} aria-label="Sync progress">
          <span className="block h-full bg-[#2563EB] transition-[width] duration-300" style={{ width: `${job.progress}%` }} />
        </span>
      )}

      <dl className="grid grid-cols-2 gap-1 md:grid-cols-3 xl:grid-cols-6">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-sm border border-[#E4E9F0] px-3 py-2">
            <dt className="text-[11px] text-[#6B7890]">{stat.label}</dt>
            <dd className="mt-0.5 text-[13.5px] font-semibold tabular-nums text-[#0F1B3D]">{stat.value}</dd>
          </div>
        ))}
      </dl>

      <div>
        <p className="mb-1.5 text-[11.5px] font-semibold uppercase tracking-[0.04em] text-[#6B7890]">Data synced</p>
        <div className="flex flex-wrap gap-1">
          {provider.dataTypes.map((type) => (
            <span key={type} className="inline-flex h-6 items-center gap-1 rounded-sm bg-[#F1F4F8] px-2 text-[11.5px] font-medium text-[#24324F]">
              <Clock3 className="size-3 text-[#98A2B3]" />
              {DATA_TYPE_LABEL[type]}
            </span>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-1.5 text-[11.5px] font-semibold uppercase tracking-[0.04em] text-[#6B7890]">Recent sync runs</p>
        {runs.length === 0 ? (
          <EmptyState icon={RefreshCw} compact title="No syncs yet" description="Runs appear here after the first sync." />
        ) : (
          <div className="rounded-sm border border-[#E4E9F0]">
            <SyncRunsTable runs={runs.slice(0, 12)} onOpenRun={onOpenRun} />
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Usage                                                               */
/* ------------------------------------------------------------------ */

const DEP_STATUS = {
  active: { label: "Active", tone: "green" as const },
  ready: { label: "Ready to use", tone: "blue" as const },
  at_risk: { label: "At risk", tone: "amber" as const },
  broken: { label: "Stopped", tone: "red" as const },
};

function UsageTab({ connection, actions }: { connection: IntegrationConnection; actions: ReturnType<typeof useConnectionActions> }) {
  const { data } = useIntegrations();
  const gates = useConnectionGates(connection)!;
  const dependencies = dependenciesFor(data.dependencies, connection.id);
  const impact = disconnectImpact(data.dependencies, connection.id);
  const live = isActive(connection);

  if (dependencies.length === 0) {
    return <EmptyState icon={Layers} compact title="Nothing depends on this yet" description="As modules start using this integration they'll appear here, so you always know what a disconnect would affect." />;
  }

  return (
    <div className="space-y-2">
      <div className={cn("flex flex-wrap items-center gap-3 rounded-sm border px-3 py-2.5", impact.critical.length ? "border-[#FBD5D9] bg-[#FEF6F7]" : "border-[#E4E9F0] bg-[#F8FAFC]")}>
        <Layers className={cn("size-4 shrink-0", impact.critical.length ? "text-[#C81E2B]" : "text-[#6B7890]")} />
        <p className="min-w-[220px] flex-1 text-[12.5px] leading-5 text-[#3C4A66]">
          <b className="font-semibold text-[#0F1B3D]">{impact.totalItems} item{impact.totalItems === 1 ? "" : "s"} across {impact.modules.length} module{impact.modules.length === 1 ? "" : "s"} use this integration.</b>{" "}
          {impact.critical.length ? `${impact.critical.reduce((sum, item) => sum + item.activeCount, 0)} are live and would stop if it were disconnected.` : "None of them would break immediately if it were disconnected."}
        </p>
        {live && (
          <Button size="sm" variant="danger" icon={Unplug} gate={gates.disconnect} onClick={() => actions.openDisconnect(connection)}>
            Review disconnect impact
          </Button>
        )}
      </div>

      <div className="scrollbar-thin overflow-x-auto rounded-sm border border-[#E4E9F0]">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th scope="col" className={thClass}>Module</th>
              <th scope="col" className={cn(thClass, "min-w-[220px]")}>Feature</th>
              <th scope="col" className={thClass}>Status</th>
              <th scope="col" className={cn(thClass, "text-right")}>Active usage</th>
              <th scope="col" className={cn(thClass, "w-px")}><span className="sr-only">Open</span></th>
            </tr>
          </thead>
          <tbody>
            {dependencies.map((dependency) => (
              <tr key={dependency.id} className="transition-colors hover:bg-[#FAFBFD]">
                <td className={cn(tdClass, "whitespace-nowrap font-semibold text-[#0F1B3D]")}>
                  {MODULE_META[dependency.module].label}
                  {dependency.critical && <span className="ml-1.5 rounded-sm bg-[#FEF1F2] px-1 text-[10px] font-semibold text-[#C81E2B]">Critical</span>}
                </td>
                <td className={tdClass}>{dependency.feature}</td>
                <td className={tdClass}><Badge tone={DEP_STATUS[dependency.status].tone} dot>{DEP_STATUS[dependency.status].label}</Badge></td>
                <td className={cn(tdClass, "whitespace-nowrap text-right tabular-nums")}>
                  <b className="font-semibold text-[#0F1B3D]">{dependency.activeCount}</b> <span className="text-[#6B7890]">{dependency.unit}</span>
                </td>
                <td className={cn(tdClass, "text-right")}>
                  <Button size="xs" variant="ghost" href={MODULE_META[dependency.module].href}>Open</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Activity                                                            */
/* ------------------------------------------------------------------ */

const ACTIVITY_DEFAULTS = { event: "all", result: "all", user: "all", range: "all" };

function ActivityTab({ connection, onOpenRun }: { connection: IntegrationConnection; onOpenRun: (id: string) => void }) {
  const { data } = useIntegrations();
  const [filters, setFilters] = useState(ACTIVITY_DEFAULTS);
  const all = data.activity.filter((item) => item.connectionId === connection.id).sort((a, b) => b.at.localeCompare(a.at));
  const users = [...new Set(all.map((item) => item.actor))];
  const events = [...new Set(all.map((item) => item.event))];
  const items = all.filter((item) => {
    if (filters.event !== "all" && item.event !== filters.event) return false;
    if (filters.result !== "all" && item.result !== filters.result) return false;
    if (filters.user !== "all" && item.actor !== filters.user) return false;
    if (filters.range !== "all" && parseISO(item.at) < subDays(new Date(), Number(filters.range))) return false;
    return true;
  });

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        <SelectMenu label="Event" prefix="Event:" value={filters.event} onChange={(event) => setFilters((current) => ({ ...current, event }))} options={[{ value: "all", label: "All" }, ...events.map((event) => ({ value: event, label: EVENT_LABEL[event] }))]} />
        <SelectMenu
          label="Status"
          prefix="Status:"
          value={filters.result}
          onChange={(result) => setFilters((current) => ({ ...current, result }))}
          options={[{ value: "all", label: "Any" }, { value: "success", label: "Success" }, { value: "warning", label: "Warning" }, { value: "failed", label: "Failed" }, { value: "info", label: "Info" }]}
        />
        <SelectMenu label="User" prefix="User:" value={filters.user} onChange={(user) => setFilters((current) => ({ ...current, user }))} options={[{ value: "all", label: "Anyone" }, ...users.map((user) => ({ value: user, label: user }))]} />
        <SelectMenu
          label="Date"
          prefix="Date:"
          value={filters.range}
          onChange={(range) => setFilters((current) => ({ ...current, range }))}
          options={[{ value: "all", label: "All time" }, { value: "1", label: "Last 24 hours" }, { value: "7", label: "Last 7 days" }, { value: "30", label: "Last 30 days" }]}
        />
        {JSON.stringify(filters) !== JSON.stringify(ACTIVITY_DEFAULTS) && (
          <Button size="sm" variant="ghost" onClick={() => setFilters(ACTIVITY_DEFAULTS)}>Clear</Button>
        )}
      </div>

      {items.length === 0 ? (
        <EmptyState icon={Clock3} compact title={all.length ? "No events match" : "No activity"} description={all.length ? "Try clearing the filters." : "Connection changes and syncs will be recorded here."} />
      ) : (
        <ol className="relative space-y-0 pl-4 before:absolute before:bottom-2 before:left-[5px] before:top-2 before:w-px before:bg-[#E4E9F0]">
          {items.map((item) => (
            <li key={item.id} className="relative py-2">
              <span className={cn("absolute -left-4 top-3.5 size-2.5 rounded-full ring-2 ring-white", item.result === "success" ? "bg-[#12B76A]" : item.result === "failed" ? "bg-[#E11D48]" : item.result === "warning" ? "bg-[#F79009]" : "bg-[#98A2B3]")} />
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[12.5px] text-[#24324F]">
                    <b className="font-semibold text-[#0F1B3D]">{EVENT_LABEL[item.event]}</b>
                    {item.actor !== "System" && <span className="text-[#6B7890]"> by {item.actor}</span>}
                  </p>
                  <p className="text-[12px] leading-4 text-[#6B7890]">{item.summary}</p>
                </div>
                <span className="flex items-center gap-2 text-[11.5px] text-[#98A2B3]">
                  <RelativeTime iso={item.at} />
                  {item.syncRunId && data.syncRuns.some((run) => run.id === item.syncRunId) && (
                    <Button size="xs" variant="ghost" onClick={() => onOpenRun(item.syncRunId!)}>
                      {item.result === "failed" ? "View error" : "View sync"}
                    </Button>
                  )}
                </span>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
