"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AlertTriangle, CheckCircle2, Info, KeyRound, RefreshCw, ShieldAlert, XCircle } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils/cn";
import { reconnectCapability, syncCapability } from "../integrations-data/capability-provider";
import { DATA_TYPE_LABEL, EVENT_LABEL, MODULE_META, intRoutes } from "../integrations-data/config";
import { useClientScope, useProvider } from "../integrations-data/hooks";
import { dependenciesFor, primaryResource, scopedDisplay } from "../integrations-data/selectors";
import { useIntegrations } from "../store/integrations-store";
import type {
  ActivityResult,
  IntegrationActivity,
  IntegrationConnection,
  IntegrationIssue,
  IntegrationSyncRun,
  SyncRunStatus,
} from "../integrations-data/types";
import type { ConnectionActionsApi } from "./connection-actions";
import { SyncButton } from "./connection-actions";
import {
  ActionMenu,
  Button,
  ClientTag,
  MetaRow,
  ModuleChips,
  ProviderLogo,
  RelativeTime,
  SeverityChip,
  Skeleton,
  StatusChip,
  buttonClass,
  tdClass,
  thClass,
  x,
} from "./ui";

/* ------------------------------------------------------------------ */
/* Needs attention                                                     */
/* ------------------------------------------------------------------ */

export function IssueRow({ issue, actions, compact }: { issue: IntegrationIssue; actions: ConnectionActionsApi; compact?: boolean }) {
  const router = useRouter();
  const { data, can, syncJobs, syncNow } = useIntegrations();
  const { withScope } = useClientScope();
  const connection = data.connections.find((item) => item.id === issue.connectionId);
  if (!connection) return null;

  const Icon = issue.severity === "critical" ? ShieldAlert : issue.severity === "warning" ? AlertTriangle : Info;
  const tone = issue.severity === "critical" ? "bg-[#FEF1F2] text-[#C81E2B]" : issue.severity === "warning" ? "bg-[#FFF7E8] text-[#B54708]" : "bg-[#EFF4FF] text-[#1D4ED8]";
  const running = Boolean(syncJobs[connection.id]);

  const primary =
    issue.action === "reconnect" ? (
      <Button size="sm" variant="primary" icon={KeyRound} gate={reconnectCapability(connection, can.canReconnect)} onClick={() => actions.openReconnect(connection)}>
        Reconnect
      </Button>
    ) : issue.action === "retry_sync" ? (
      running ? (
        <SyncButton connection={connection} />
      ) : (
        <Button size="sm" variant="primary" icon={RefreshCw} gate={syncCapability(connection, can.canSync, running)} onClick={() => void syncNow(connection.id, "retry")}>
          Retry sync
        </Button>
      )
    ) : issue.action === "review_permissions" ? (
      <Button size="sm" variant="primary" onClick={() => router.push(withScope(intRoutes.detail(connection.id, "permissions")))}>
        Review permissions
      </Button>
    ) : (
      <Button size="sm" variant="secondary" onClick={() => router.push(withScope(intRoutes.detail(connection.id)))}>
        View details
      </Button>
    );

  return (
    <li className="flex flex-wrap items-start gap-3 px-4 py-3 transition-colors hover:bg-[#FAFBFD]">
      <span className={cn("mt-0.5 grid size-7 shrink-0 place-items-center rounded-sm", tone)}>
        <Icon className="size-3.5" />
      </span>
      <ProviderLogo providerId={issue.providerId} className="mt-px size-7 p-1 max-sm:hidden" />
      <div className="min-w-[220px] flex-1">
        <p className="flex flex-wrap items-center gap-2 text-[12.5px] font-semibold text-[#0F1B3D]">
          {issue.title}
          <SeverityChip severity={issue.severity} />
        </p>
        <p className="mt-0.5 text-[12px] leading-4 text-[#3C4A66]">{issue.happened}</p>
        {!compact && (
          <p className="mt-1 text-[12px] leading-4 text-[#6B7890]">
            <b className="font-semibold text-[#3C4A66]">Affects:</b> {issue.affects} <b className="ml-1 font-semibold text-[#3C4A66]">Do:</b> {issue.todo}
          </p>
        )}
        <p className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[11.5px] text-[#98A2B3]">
          <ClientTag clientId={issue.clientId} className="text-[11.5px] text-[#6B7890]" />
          <span>
            Detected <RelativeTime iso={issue.detectedAt} />
          </span>
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        {primary}
        {issue.action !== "view_details" && (
          <Button size="sm" variant="ghost" onClick={() => router.push(withScope(intRoutes.detail(connection.id)))}>
            Details
          </Button>
        )}
      </div>
    </li>
  );
}

/* ------------------------------------------------------------------ */
/* Connection card                                                     */
/* ------------------------------------------------------------------ */

export function ConnectionCard({ connection, actions }: { connection: IntegrationConnection; actions: ConnectionActionsApi }) {
  const { data, can, syncJobs } = useIntegrations();
  const { withScope, clientId } = useClientScope();
  const provider = useProvider(connection.providerId);
  const job = syncJobs[connection.id];
  const modules = dependenciesFor(data.dependencies, connection.id)
    .filter((dependency) => dependency.activeCount > 0)
    .map((dependency) => dependency.module);
  const resource = primaryResource(connection);
  const needsReconnect = connection.status === "needs_reconnect" || connection.status === "expiring" || connection.status === "permission_missing";
  const view = scopedDisplay(connection, clientId);

  if (!provider) return null;

  return (
    <article className="group flex min-w-0 flex-col rounded-[10px] border border-[#E4E9F0] bg-white shadow-[0_1px_2px_rgba(15,27,61,0.04)] transition hover:border-[#C9D1DC]">
      <div className="flex items-start gap-2.5 px-3 pt-3">
        <ProviderLogo providerId={connection.providerId} />
        <div className="min-w-0 flex-1">
          <Link href={withScope(intRoutes.detail(connection.id))} className={cn("block truncate rounded text-[13px] font-semibold text-[#0F1B3D] hover:text-[#2563EB]", x.focus)}>
            {provider.name}
          </Link>
          <p className="truncate text-[11.5px] text-[#6B7890]" title={resource?.handle}>
            {view.accountName}
            {view.extra > 0 && <span className="text-[#98A2B3]"> +{view.extra} more</span>}
          </p>
        </div>
        <StatusChip status={connection.status} progress={job?.progress} />
      </div>

      {job && (
        <div className="mx-3 mt-2">
          <span className="block h-1 overflow-hidden rounded-sm bg-[#EEF1F5]">
            <span className="block h-full bg-[#2563EB] transition-[width] duration-300" style={{ width: `${job.progress}%` }} />
          </span>
          <p className="mt-0.5 text-[10.5px] text-[#6B7890]">{job.phase}</p>
        </div>
      )}

      <div className="mt-2.5 space-y-1 px-3">
        <MetaRow label="Client">
          <ClientTag clientId={view.clientId} className="justify-end" />
        </MetaRow>
        <MetaRow label="Last sync">
          <RelativeTime iso={connection.lastSyncAt} fallback="Never" />
        </MetaRow>
        <MetaRow label="Next sync">
          {connection.nextSyncAt ? <RelativeTime iso={connection.nextSyncAt} future /> : <span className="text-[#98A2B3]">{connection.status === "disconnected" ? "—" : "Paused"}</span>}
        </MetaRow>
      </div>

      <div className="mt-2.5 border-t border-[#EEF1F5] px-3 py-2">
        <p className="mb-1 text-[10.5px] font-semibold uppercase tracking-[0.04em] text-[#98A2B3]">Used by</p>
        <ModuleChips modules={modules} max={3} />
      </div>

      <div className="mt-auto flex items-center gap-1 border-t border-[#EEF1F5] px-3 py-2">
        <Button size="xs" variant="secondary" href={withScope(intRoutes.detail(connection.id))}>
          Details
        </Button>
        {needsReconnect ? (
          <Button size="xs" variant="primary" icon={KeyRound} gate={reconnectCapability(connection, can.canReconnect)} onClick={() => actions.openReconnect(connection)}>
            Reconnect
          </Button>
        ) : (
          <SyncButton connection={connection} size="xs" />
        )}
        <span className="ml-auto" />
        <ActionMenu
          label={`More actions for ${provider.name}`}
          items={actions.menuItems(connection, { hideView: true })}
          trigger={
            <button type="button" className={buttonClass("ghost", "iconSm")}>
              <span aria-hidden="true" className="text-[14px] font-bold leading-none tracking-[0.08em]">⋯</span>
            </button>
          }
        />
      </div>
    </article>
  );
}

/* ------------------------------------------------------------------ */
/* Activity & sync runs                                                */
/* ------------------------------------------------------------------ */

const RESULT_META: Record<ActivityResult, { label: string; chip: string; icon: typeof CheckCircle2 }> = {
  success: { label: "Success", chip: "bg-[#ECFAF3] text-[#067647] ring-[#C6EFD9]", icon: CheckCircle2 },
  warning: { label: "Warning", chip: "bg-[#FFF7E8] text-[#B54708] ring-[#FBE3B6]", icon: AlertTriangle },
  failed: { label: "Failed", chip: "bg-[#FEF1F2] text-[#C81E2B] ring-[#FBD5D9]", icon: XCircle },
  info: { label: "Info", chip: "bg-[#F1F4F8] text-[#475467] ring-[#E4E9F0]", icon: Info },
};

export function ResultChip({ result }: { result: ActivityResult }) {
  const meta = RESULT_META[result];
  return (
    <span className={cn("inline-flex h-[22px] items-center gap-1 whitespace-nowrap rounded-sm px-1.5 text-[11px] font-semibold ring-1 ring-inset", meta.chip)}>
      <meta.icon className="size-3" />
      {meta.label}
    </span>
  );
}

const RUN_RESULT: Record<SyncRunStatus, ActivityResult> = { success: "success", partial: "warning", failed: "failed", running: "info" };

export function RunStatusChip({ status }: { status: SyncRunStatus }) {
  if (status === "running") return <StatusChip status="syncing" />;
  const labels = { success: "Success", partial: "Partial", failed: "Failed" } as const;
  const meta = RESULT_META[RUN_RESULT[status]];
  return (
    <span className={cn("inline-flex h-[22px] items-center gap-1 whitespace-nowrap rounded-sm px-1.5 text-[11px] font-semibold ring-1 ring-inset", meta.chip)}>
      <meta.icon className="size-3" />
      {labels[status]}
    </span>
  );
}

export function formatDuration(ms: number | null) {
  if (ms === null) return "—";
  if (ms < 1000) return `${ms}ms`;
  const seconds = ms / 1000;
  return seconds < 60 ? `${seconds.toFixed(1)}s` : `${Math.floor(seconds / 60)}m ${Math.round(seconds % 60)}s`;
}

/** Activity table shared by Overview and the Activity tab. */
export function ActivityTable({ items, onOpenRun, showUser = true, compact }: { items: IntegrationActivity[]; onOpenRun: (runId: string) => void; showUser?: boolean; compact?: boolean }) {
  const { data } = useIntegrations();
  const { withScope } = useClientScope();
  const run = (id: string | null) => (id ? data.syncRuns.find((item) => item.id === id) ?? null : null);

  return (
    <>
      <div className="scrollbar-thin hidden overflow-x-auto md:block">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th scope="col" className={cn(thClass, compact ? "min-w-[150px]" : "min-w-[180px]")}>Integration</th>
              <th scope="col" className={cn(thClass, compact ? "min-w-[170px]" : "min-w-[220px]")}>Event</th>
              <th scope="col" className={cn(thClass, compact && "max-lg:hidden")}>Client</th>
              <th scope="col" className={thClass}>Result</th>
              {!compact && <th scope="col" className={cn(thClass, "text-right max-lg:hidden")}>Duration</th>}
              {showUser && <th scope="col" className={cn(thClass, "max-xl:hidden")}>User</th>}
              <th scope="col" className={thClass}>Time</th>
              <th scope="col" className={cn(thClass, "w-px")}>
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => {
              const provider = data.providers.find((entry) => entry.id === item.providerId);
              const linked = run(item.syncRunId);
              return (
                <tr key={item.id} className="transition-colors hover:bg-[#FAFBFD]">
                  <td className={tdClass}>
                    {provider ? (
                      <span className="flex items-center gap-2">
                        <ProviderLogo providerId={provider.id} className="size-6 p-[3px]" />
                        <span className="truncate font-medium text-[#0F1B3D]">{provider.name}</span>
                      </span>
                    ) : (
                      <span className="text-[#6B7890]">Workspace</span>
                    )}
                  </td>
                  <td className={cn(tdClass, compact ? "max-w-[260px]" : "max-w-[360px]")}>
                    <span className="block font-medium text-[#0F1B3D]">{EVENT_LABEL[item.event]}</span>
                    <span className="block truncate text-[11.5px] text-[#6B7890]" title={item.summary}>{item.summary}</span>
                  </td>
                  <td className={cn(tdClass, "whitespace-nowrap", compact && "max-lg:hidden")}>
                    <ClientTag clientId={item.clientId} />
                  </td>
                  <td className={tdClass}>
                    <ResultChip result={item.result} />
                  </td>
                  {!compact && <td className={cn(tdClass, "text-right tabular-nums max-lg:hidden")}>{formatDuration(linked?.durationMs ?? null)}</td>}
                  {showUser && <td className={cn(tdClass, "whitespace-nowrap max-xl:hidden")}>{item.actor}</td>}
                  <td className={cn(tdClass, "whitespace-nowrap")}>
                    <RelativeTime iso={item.at} />
                  </td>
                  <td className={cn(tdClass, "text-right")}>
                    <ActivityActions item={item} hasRun={Boolean(linked)} onOpenRun={onOpenRun} withScope={withScope} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <ul className="divide-y divide-[#EEF1F5] md:hidden">
        {items.map((item) => {
          const provider = data.providers.find((entry) => entry.id === item.providerId);
          const linked = run(item.syncRunId);
          return (
            <li key={item.id} className="flex items-start gap-2.5 px-4 py-3">
              {provider ? <ProviderLogo providerId={provider.id} className="size-7 p-1" /> : <span className="size-7" />}
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-1.5 text-[12.5px] font-semibold text-[#0F1B3D]">
                  {EVENT_LABEL[item.event]}
                  <ResultChip result={item.result} />
                </p>
                <p className="text-[12px] leading-4 text-[#3C4A66]">{item.summary}</p>
                <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[11.5px] text-[#98A2B3]">
                  <ClientTag clientId={item.clientId} className="text-[11.5px]" />
                  <RelativeTime iso={item.at} />
                  <span>{item.actor}</span>
                </p>
              </div>
              <ActivityActions item={item} hasRun={Boolean(linked)} onOpenRun={onOpenRun} withScope={withScope} />
            </li>
          );
        })}
      </ul>
    </>
  );
}

function ActivityActions({ item, hasRun, onOpenRun, withScope }: { item: IntegrationActivity; hasRun: boolean; onOpenRun: (id: string) => void; withScope: (href: string) => string }) {
  return (
    <ActionMenu
      label={`Actions for ${EVENT_LABEL[item.event]}`}
      width={190}
      items={[
        { label: "View integration", href: item.connectionId ? withScope(intRoutes.detail(item.connectionId)) : withScope(intRoutes.settings) },
        { label: item.result === "failed" ? "View error" : "View sync", onSelect: () => item.syncRunId && onOpenRun(item.syncRunId), hidden: !hasRun },
      ]}
      trigger={
        <button type="button" className={buttonClass("ghost", "iconSm")}>
          <span aria-hidden="true" className="text-[14px] font-bold leading-none tracking-[0.08em]">⋯</span>
        </button>
      }
    />
  );
}

/** Details of one sync run, with a retry when it went wrong. */
export function RunDialog({ runId, onOpenChange }: { runId: string | null; onOpenChange: (open: boolean) => void }) {
  const { data, can, syncJobs, syncNow } = useIntegrations();
  const { withScope } = useClientScope();
  const run = runId ? data.syncRuns.find((item) => item.id === runId) ?? null : null;
  const connection = run ? data.connections.find((item) => item.id === run.connectionId) ?? null : null;
  const provider = useProvider(connection?.providerId);
  const [retried, setRetried] = useState(false);

  return (
    <Dialog open={run !== null} onOpenChange={(open) => { if (!open) setRetried(false); onOpenChange(open); }}>
      <DialogContent className="w-[calc(100vw-24px)] max-w-[480px] gap-0 p-0">
        {run && connection && provider && (
          <>
            <div className="flex items-start gap-3 px-5 pt-5">
              <ProviderLogo providerId={provider.id} />
              <div className="min-w-0 flex-1">
                <DialogTitle className="text-[15px] text-[#0F1B3D]">Sync run · {provider.name}</DialogTitle>
                <DialogDescription className="mt-0.5 text-[12.5px] text-[#6B7890]">{connection.accountName}</DialogDescription>
              </div>
              <RunStatusChip status={run.status} />
            </div>
            <dl className="mx-5 mt-4 divide-y divide-[#EEF1F5] rounded-sm border border-[#E4E9F0]">
              <RunRow label="Started"><RelativeTime iso={run.startedAt} /></RunRow>
              <RunRow label="Duration">{formatDuration(run.durationMs)}</RunRow>
              <RunRow label="Trigger">{run.trigger.replace("_", " ")}</RunRow>
              <RunRow label="Records processed">{run.recordsProcessed.toLocaleString("en-IN")}</RunRow>
              <RunRow label="Failed records">{run.failedRecords.toLocaleString("en-IN")}</RunRow>
              <RunRow label="Data">{run.dataTypes.map((type) => DATA_TYPE_LABEL[type]).join(", ")}</RunRow>
            </dl>
            {run.error && (
              <div className={cn("mx-5 mt-3 rounded-sm border p-3", run.status === "failed" ? "border-[#FBD5D9] bg-[#FEF6F7]" : "border-[#FBE3B6] bg-[#FFFAF0]")}>
                <p className="text-[12.5px] font-semibold text-[#0F1B3D]">{run.error.message}</p>
                <p className="mt-0.5 text-[12px] leading-4 text-[#3C4A66]">{run.error.hint}</p>
              </div>
            )}
            {retried && <p className="mx-5 mt-3 text-[12px] text-[#067647]">Retry started — progress shows on the integration.</p>}
            <DialogFooter className="mt-4 border-t border-[#EEF1F5] px-5 py-3">
              <Button variant="secondary" href={withScope(intRoutes.detail(connection.id, "sync"))}>
                Open sync history
              </Button>
              {run.status !== "success" && (
                <Button
                  variant="primary"
                  icon={RefreshCw}
                  gate={syncCapability(connection, can.canSync, Boolean(syncJobs[connection.id]))}
                  disabled={retried}
                  disabledReason="A retry is already running."
                  onClick={() => {
                    setRetried(true);
                    void syncNow(connection.id, "retry");
                  }}
                >
                  Retry sync
                </Button>
              )}
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function RunRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 px-3 py-2 text-[12.5px]">
      <dt className="text-[#6B7890]">{label}</dt>
      <dd className="text-right font-medium capitalize text-[#0F1B3D]">{children}</dd>
    </div>
  );
}

export function SyncRunsTable({ runs, onOpenRun }: { runs: IntegrationSyncRun[]; onOpenRun: (id: string) => void }) {
  return (
    <div className="scrollbar-thin overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th scope="col" className={thClass}>Started</th>
            <th scope="col" className={cn(thClass, "max-sm:hidden")}>Trigger</th>
            <th scope="col" className={thClass}>Status</th>
            <th scope="col" className={cn(thClass, "text-right")}>Records</th>
            <th scope="col" className={cn(thClass, "text-right")}>Errors</th>
            <th scope="col" className={cn(thClass, "text-right max-sm:hidden")}>Duration</th>
            <th scope="col" className={cn(thClass, "w-px")}><span className="sr-only">Actions</span></th>
          </tr>
        </thead>
        <tbody>
          {runs.map((run) => (
            <tr key={run.id} className="transition-colors hover:bg-[#FAFBFD]">
              <td className={cn(tdClass, "whitespace-nowrap")}><RelativeTime iso={run.startedAt} /></td>
              <td className={cn(tdClass, "capitalize max-sm:hidden")}>{run.trigger.replace("_", " ")}</td>
              <td className={tdClass}><RunStatusChip status={run.status} /></td>
              <td className={cn(tdClass, "text-right tabular-nums")}>{run.recordsProcessed.toLocaleString("en-IN")}</td>
              <td className={cn(tdClass, "text-right tabular-nums", run.failedRecords > 0 && "font-semibold text-[#B54708]")}>{run.status === "failed" ? "—" : run.failedRecords}</td>
              <td className={cn(tdClass, "text-right tabular-nums max-sm:hidden")}>{formatDuration(run.durationMs)}</td>
              <td className={cn(tdClass, "text-right")}>
                <Button size="xs" variant={run.status === "failed" ? "danger" : "ghost"} onClick={() => onOpenRun(run.id)}>
                  {run.status === "failed" ? "View error" : "Details"}
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Module link                                                         */
/* ------------------------------------------------------------------ */

export function ModuleLink({ module }: { module: keyof typeof MODULE_META }) {
  return (
    <Link href={MODULE_META[module].href} className={cn("rounded font-medium text-[#0F1B3D] hover:text-[#2563EB]", x.focus)}>
      {MODULE_META[module].label}
    </Link>
  );
}

/* ------------------------------------------------------------------ */
/* Skeletons                                                           */
/* ------------------------------------------------------------------ */

const card = "rounded-[10px] border border-[#E4E9F0] bg-white";

export function PageSkeleton({ variant }: { variant: "overview" | "table" | "cards" | "detail" | "settings" }) {
  if (variant === "table") {
    return (
      <div className="space-y-1" aria-busy="true" aria-label="Loading">
        <div className={cn(card, "flex flex-wrap gap-2 p-2.5")}>
          {[220, 120, 120, 120, 120].map((width, index) => (
            <span key={index} style={{ width }}>
              <Skeleton className="h-8" />
            </span>
          ))}
        </div>
        <div className={cn(card, "overflow-hidden")}>
          {Array.from({ length: 8 }, (_, index) => (
            <div key={index} className="flex items-center gap-3 border-b border-[#EEF1F5] px-3 py-3 last:border-0">
              <Skeleton className="size-9 rounded-[8px]" />
              <div className="flex-1 space-y-1.5"><Skeleton className="h-3 w-1/3" /><Skeleton className="h-2.5 w-1/5" /></div>
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-7 w-20" />
            </div>
          ))}
        </div>
      </div>
    );
  }
  if (variant === "cards") {
    return (
      <div className="grid gap-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4" aria-busy="true" aria-label="Loading">
        {Array.from({ length: 8 }, (_, index) => (
          <div key={index} className={cn(card, "space-y-2.5 p-3")}>
            <div className="flex gap-2.5"><Skeleton className="size-9 rounded-[8px]" /><div className="flex-1 space-y-1.5"><Skeleton className="h-3 w-2/3" /><Skeleton className="h-2.5 w-1/2" /></div></div>
            <Skeleton className="h-2.5 w-full" /><Skeleton className="h-2.5 w-4/5" /><Skeleton className="h-7 w-full" />
          </div>
        ))}
      </div>
    );
  }
  if (variant === "detail") {
    return (
      <div className="space-y-1" aria-busy="true" aria-label="Loading">
        <div className={cn(card, "flex gap-3 p-4")}><Skeleton className="size-12 rounded-[10px]" /><div className="flex-1 space-y-2"><Skeleton className="h-4 w-56" /><Skeleton className="h-3 w-80" /></div><Skeleton className="h-8 w-32" /></div>
        <div className={cn(card, "flex gap-3 p-3")}>{Array.from({ length: 6 }, (_, index) => <Skeleton key={index} className="h-6 w-20" />)}</div>
        <div className="grid gap-1 lg:grid-cols-3">{[0, 1, 2].map((index) => <div key={index} className={cn(card, "space-y-2 p-4")}><Skeleton className="h-3 w-24" />{[0, 1, 2, 3].map((row) => <Skeleton key={row} className="h-3 w-full" />)}</div>)}</div>
      </div>
    );
  }
  if (variant === "settings") {
    return (
      <div className="grid grid-cols-[minmax(0,1fr)] gap-1 lg:grid-cols-[200px_minmax(0,1fr)]" aria-busy="true" aria-label="Loading">
        <div className={cn(card, "space-y-2 p-3")}>{Array.from({ length: 5 }, (_, index) => <Skeleton key={index} className="h-7 w-full" />)}</div>
        <div className="space-y-1">{[0, 1, 2].map((index) => <div key={index} className={cn(card, "space-y-3 p-4")}><Skeleton className="h-4 w-40" /><Skeleton className="h-3 w-full" /><Skeleton className="h-9 w-64" /></div>)}</div>
      </div>
    );
  }
  return (
    <div className="space-y-1" aria-busy="true" aria-label="Loading">
      <div className="grid grid-cols-2 gap-1 md:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }, (_, index) => <div key={index} className={cn(card, "space-y-2 px-3 py-2.5")}><Skeleton className="h-3 w-20" /><Skeleton className="h-6 w-12" /><Skeleton className="h-2.5 w-24" /></div>)}
      </div>
      <div className="grid gap-1 xl:grid-cols-12">
        <div className={cn(card, "space-y-3 p-4 xl:col-span-8")}>{Array.from({ length: 4 }, (_, index) => <div key={index} className="flex gap-3"><Skeleton className="size-7" /><div className="flex-1 space-y-1.5"><Skeleton className="h-3 w-1/2" /><Skeleton className="h-2.5 w-4/5" /></div><Skeleton className="h-7 w-24" /></div>)}</div>
        <div className={cn(card, "p-4 xl:col-span-4")}><Skeleton className="h-3 w-32" /><Skeleton className="mx-auto mt-5 size-28 rounded-full" /></div>
      </div>
      <div className="grid gap-1 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 4 }, (_, index) => <div key={index} className={cn(card, "h-44 p-3")}><Skeleton className="h-full w-full" /></div>)}</div>
    </div>
  );
}
