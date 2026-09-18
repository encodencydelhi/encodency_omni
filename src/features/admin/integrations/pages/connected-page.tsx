"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Download, Filter, KeyRound, Plug, Plus, RefreshCw, SlidersHorizontal, Stethoscope } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetBody, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils/cn";
import { syncCapability, reconnectCapability } from "../integrations-data/capability-provider";
import { MODULE_META, STATUS_META, STATUS_ORDER, intRoutes } from "../integrations-data/config";
import { useClientScope, useQueryState, useScopedData } from "../integrations-data/hooks";
import {
  clientName,
  connectionClientIds,
  dependenciesFor,
  downloadFile,
  filterConnections,
  isActive,
  scopedDisplay,
  toCsv,
  type ConnectionFilters,
} from "../integrations-data/selectors";
import { useIntegrations } from "../store/integrations-store";
import type { IntegrationConnection, IntegrationIssue, ModuleKey } from "../integrations-data/types";
import { PageSkeleton } from "../components/blocks";
import { SyncButton, useConnectionActions } from "../components/connection-actions";
import {
  ActionMenu,
  Button,
  Card,
  ClientTag,
  EmptyState,
  HealthDot,
  ModuleChips,
  ProviderLogo,
  RelativeTime,
  SearchField,
  SelectMenu,
  SeverityChip,
  StatusChip,
  buttonClass,
  tdClass,
  thClass,
  useDebounced,
  x,
} from "../components/ui";

const DEFAULTS = { q: "", provider: "all", status: "all", health: "all", module: "all", sync: "all", sort: "name" };

export function ConnectedPage() {
  const { ready } = useIntegrations();
  if (!ready) return <PageSkeleton variant="table" />;
  return <Connected />;
}

function Connected() {
  const { data, can, syncJobs, runSyncAll } = useIntegrations();
  const { withScope, clientId, label } = useClientScope();
  const { connections, dependencies, issues } = useScopedData();
  const { values, set, reset } = useQueryState(useMemo(() => DEFAULTS, []));
  const { value: search, pending } = useDebounced(values.q, 200);
  const actions = useConnectionActions();
  const [selected, setSelected] = useState<string[]>([]);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [healthOpen, setHealthOpen] = useState(false);

  const filters = useMemo<ConnectionFilters>(
    () => ({
      search,
      provider: values.provider,
      status: values.status,
      health: values.health as ConnectionFilters["health"],
      module: values.module,
      lastSync: values.sync as ConnectionFilters["lastSync"],
      sort: values.sort as ConnectionFilters["sort"],
    }),
    [search, values],
  );
  const rows = useMemo(() => filterConnections(connections, data.providers, dependencies, filters), [connections, data.providers, dependencies, filters]);

  const activeFilters = ["provider", "status", "health", "module", "sync"].filter((key) => values[key as keyof typeof values] !== "all").length + (values.q ? 1 : 0);
  const issuesFor = (id: string) => issues.filter((issue) => issue.connectionId === id);
  const selectedRows = rows.filter((row) => selected.includes(row.id));
  const syncableSelected = selectedRows.filter((row) => syncCapability(row, can.canSync, Boolean(syncJobs[row.id])).allowed);

  const providerOptions = [...new Set(connections.map((connection) => connection.providerId))];
  const moduleOptions = [...new Set(dependencies.map((dependency) => dependency.module))] as ModuleKey[];

  const exportRows = (list: IntegrationConnection[]) => {
    downloadFile(
      `integrations-${new Date().toISOString().slice(0, 10)}.csv`,
      toCsv(
        list.map((connection) => ({
          integration: data.providers.find((provider) => provider.id === connection.providerId)?.name,
          account: connection.accountName,
          clients: connectionClientIds(connection).map((id) => clientName(data.clients, id)).join(" | "),
          status: STATUS_META[connection.status].label,
          last_sync: connection.lastSyncAt ?? "",
          next_sync: connection.nextSyncAt ?? "",
          dependencies: dependenciesFor(dependencies, connection.id).filter((dependency) => dependency.activeCount > 0).length,
        })),
      ),
      "text/csv;charset=utf-8",
    );
  };

  const filterControls = (
    <>
      <SelectMenu label="Provider" prefix="Provider:" value={values.provider} onChange={(value) => set({ provider: value })} options={[{ value: "all", label: "All" }, ...providerOptions.map((id) => ({ value: id, label: data.providers.find((provider) => provider.id === id)?.name ?? id }))]} />
      <SelectMenu label="Status" prefix="Status:" value={values.status} onChange={(value) => set({ status: value })} options={[{ value: "all", label: "Any" }, ...STATUS_ORDER.map((status) => ({ value: status, label: STATUS_META[status].label }))]} />
      <SelectMenu
        label="Health"
        prefix="Health:"
        value={values.health}
        onChange={(value) => set({ health: value })}
        options={[
          { value: "all", label: "Any" },
          { value: "healthy", label: "Healthy" },
          { value: "attention", label: "Needs attention" },
          { value: "disconnected", label: "Disconnected" },
        ]}
      />
      <SelectMenu label="Used by module" prefix="Used by:" value={values.module} onChange={(value) => set({ module: value })} options={[{ value: "all", label: "Any module" }, ...moduleOptions.map((module) => ({ value: module, label: MODULE_META[module].label }))]} />
      <SelectMenu
        label="Last sync"
        prefix="Last sync:"
        value={values.sync}
        onChange={(value) => set({ sync: value })}
        options={[
          { value: "all", label: "Any time" },
          { value: "1h", label: "Within an hour" },
          { value: "24h", label: "Within 24 hours" },
          { value: "stale", label: "Over 24 hours ago" },
        ]}
      />
    </>
  );

  const sortControl = (
    <SelectMenu
      label="Sort"
      prefix="Sort:"
      align="end"
      value={values.sort}
      onChange={(value) => set({ sort: value })}
      options={[
        { value: "name", label: "Name" },
        { value: "last_sync", label: "Last sync" },
        { value: "health", label: "Health" },
        { value: "most_used", label: "Most used" },
      ]}
    />
  );

  return (
    <div className="space-y-1">
      <Card className="overflow-hidden">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-1.5 border-b border-[#EEF1F5] px-3 py-2.5">
          <SearchField value={values.q} onChange={(value) => set({ q: value })} loading={pending} placeholder="Search integrations" className="min-w-[180px] flex-1 lg:max-w-[260px]" />
          <div className="hidden flex-wrap items-center gap-1.5 lg:flex">{filterControls}</div>
          <Button size="sm" variant="secondary" icon={SlidersHorizontal} className="lg:hidden" onClick={() => setFiltersOpen(true)}>
            Filters{activeFilters ? ` (${activeFilters})` : ""}
          </Button>
          {activeFilters > 0 && (
            <Button size="sm" variant="ghost" icon={Filter} onClick={() => reset(["client", "sort"])}>
              Clear ({activeFilters})
            </Button>
          )}
          <div className="ml-auto flex items-center gap-1.5">
            {sortControl}
            <Button size="sm" variant="primary" icon={Plus} gate={can.canConnect} href={withScope(`${intRoutes.connected}?connect=1${clientId !== "all" ? `&for=${clientId}` : ""}`)}>
              Connect
            </Button>
          </div>
        </div>

        {/* Bulk bar */}
        {selected.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 border-b border-[#D5E1FD] bg-[#F5F8FF] px-3 py-2" role="region" aria-label="Bulk actions">
            <span className="text-[12.5px] font-semibold text-[#1D4ED8]">{selected.length} selected</span>
            <Button
              size="sm"
              variant="primary"
              icon={RefreshCw}
              gate={can.canSync}
              disabled={syncableSelected.length === 0}
              disabledReason="None of the selected integrations can sync right now."
              onClick={() => {
                void runSyncAll(syncableSelected.map((row) => row.id));
                setSelected([]);
              }}
            >
              Sync selected{syncableSelected.length !== selected.length ? ` (${syncableSelected.length})` : ""}
            </Button>
            <Button size="sm" variant="secondary" icon={Download} onClick={() => exportRows(selectedRows)}>
              Export
            </Button>
            <Button size="sm" variant="secondary" icon={Stethoscope} onClick={() => setHealthOpen(true)}>
              View health
            </Button>
            <Button size="sm" variant="ghost" className="ml-auto" onClick={() => setSelected([])}>
              Clear selection
            </Button>
          </div>
        )}

        {rows.length === 0 ? (
          connections.length === 0 ? (
            <EmptyState
              icon={Plug}
              title="No integrations connected"
              description={`Nothing is connected for ${label} yet. Connect a service to start syncing data.`}
              action={<Button variant="primary" icon={Plus} gate={can.canConnect} href={withScope(`${intRoutes.connected}?connect=1`)}>Connect integration</Button>}
              secondary={<Button variant="secondary" href={withScope(intRoutes.available)}>Browse available</Button>}
            />
          ) : (
            <EmptyState
              icon={Filter}
              title="No integrations match these filters"
              description="Try a different search, or clear the filters to see everything in this view."
              action={<Button variant="primary" onClick={() => reset(["client"])}>Clear filters</Button>}
            />
          )
        ) : (
          <>
            <ConnectionsTable rows={rows} issuesFor={issuesFor} selected={selected} onSelect={setSelected} actions={actions} />
            <ConnectionsList rows={rows} issuesFor={issuesFor} actions={actions} />
            <p className="border-t border-[#EEF1F5] px-4 py-2.5 text-[12px] text-[#6B7890]">
              Showing <b className="font-semibold text-[#0F1B3D]">{rows.length}</b> of {connections.length} integrations in {label}
            </p>
          </>
        )}
      </Card>

      <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
        <SheetContent side="bottom" className="border-[#E4E9F0] bg-white">
          <SheetHeader className="border-[#EEF1F5]">
            <SheetTitle className="text-[15px] text-[#0F1B3D]">Filters</SheetTitle>
          </SheetHeader>
          <SheetBody className="flex flex-col items-stretch gap-2 [&>button]:w-full">{filterControls}</SheetBody>
          <div className="flex gap-2 border-t border-[#EEF1F5] px-5 py-3">
            <Button variant="ghost" className="flex-1" onClick={() => reset(["client", "sort"])}>
              Clear all
            </Button>
            <Button variant="primary" className="flex-1" onClick={() => setFiltersOpen(false)}>
              Show {rows.length} results
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <HealthDialog open={healthOpen} onOpenChange={setHealthOpen} rows={selectedRows} issuesFor={issuesFor} />
      {actions.dialogs}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Table                                                               */
/* ------------------------------------------------------------------ */

function ConnectionsTable({
  rows,
  issuesFor,
  selected,
  onSelect,
  actions,
}: {
  rows: IntegrationConnection[];
  issuesFor: (id: string) => IntegrationIssue[];
  selected: string[];
  onSelect: (ids: string[]) => void;
  actions: ReturnType<typeof useConnectionActions>;
}) {
  const { data, can, syncJobs } = useIntegrations();
  const { withScope, clientId } = useClientScope();
  const all = rows.length > 0 && rows.every((row) => selected.includes(row.id));

  return (
    <div className="scrollbar-thin hidden overflow-x-auto lg:block">
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th scope="col" className={cn(thClass, "w-px")}>
              <input type="checkbox" aria-label="Select all" checked={all} onChange={(event) => onSelect(event.target.checked ? rows.map((row) => row.id) : [])} className="size-3.5 accent-[#2563EB]" />
            </th>
            <th scope="col" className={cn(thClass, "min-w-[220px]")}>Integration</th>
            <th scope="col" className={thClass}>Client</th>
            <th scope="col" className={thClass}>Health</th>
            <th scope="col" className={thClass}>Last sync</th>
            <th scope="col" className={cn(thClass, "max-xl:hidden")}>Next sync</th>
            <th scope="col" className={cn(thClass, "max-xl:hidden")}>Used by</th>
            <th scope="col" className={thClass}>Status</th>
            <th scope="col" className={cn(thClass, "w-px")}><span className="sr-only">Actions</span></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((connection) => {
            const provider = data.providers.find((item) => item.id === connection.providerId);
            const connectionIssues = issuesFor(connection.id);
            const top = connectionIssues[0];
            const modules = dependenciesFor(data.dependencies, connection.id).filter((dependency) => dependency.activeCount > 0).map((dependency) => dependency.module);
            const needsReconnect = ["needs_reconnect", "expiring", "permission_missing"].includes(connection.status);
            const isSelected = selected.includes(connection.id);
            const clients = connectionClientIds(connection);
            const view = scopedDisplay(connection, clientId);
            return (
              <tr key={connection.id} className={cn("group transition-colors hover:bg-[#FAFBFD]", isSelected && "bg-[#F5F8FF] hover:bg-[#F0F5FF]", !isActive(connection) && "text-[#98A2B3]")}>
                <td className={tdClass}>
                  <input
                    type="checkbox"
                    aria-label={`Select ${provider?.name} ${connection.accountName}`}
                    checked={isSelected}
                    onChange={(event) => onSelect(event.target.checked ? [...selected, connection.id] : selected.filter((id) => id !== connection.id))}
                    className="size-3.5 accent-[#2563EB]"
                  />
                </td>
                <td className={tdClass}>
                  <Link href={withScope(intRoutes.detail(connection.id))} className={cn("flex items-center gap-2.5 rounded", x.focus)}>
                    <ProviderLogo providerId={connection.providerId} className="size-8 p-1" muted={!isActive(connection)} />
                    <span className="min-w-0">
                      <span className="block truncate font-semibold text-[#0F1B3D] hover:text-[#2563EB]">{provider?.name}</span>
                      <span className="block max-w-[240px] truncate text-[11.5px] text-[#6B7890]">
                        {view.accountName}
                        {view.extra > 0 && ` +${view.extra}`}
                      </span>
                    </span>
                  </Link>
                </td>
                <td className={cn(tdClass, "whitespace-nowrap")}>
                  <ClientTag clientId={view.clientId} />
                  {clientId === "all" && clients.length > 1 && <span className="block text-[11px] text-[#98A2B3]">+{clients.length - 1} mapped</span>}
                </td>
                <td className={tdClass}>
                  {top ? (
                    <span className="flex items-center gap-1.5" title={top.title}>
                      <SeverityChip severity={top.severity} />
                      {connectionIssues.length > 1 && <span className="text-[11px] text-[#6B7890]">+{connectionIssues.length - 1}</span>}
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 text-[12px] text-[#6B7890]">
                      <HealthDot status={connection.status} />
                      {isActive(connection) ? "Healthy" : "Off"}
                    </span>
                  )}
                </td>
                <td className={cn(tdClass, "whitespace-nowrap")}><RelativeTime iso={connection.lastSyncAt} fallback="Never" /></td>
                <td className={cn(tdClass, "whitespace-nowrap max-xl:hidden")}>{connection.nextSyncAt ? <RelativeTime iso={connection.nextSyncAt} future /> : <span className="text-[#98A2B3]">Paused</span>}</td>
                <td className={cn(tdClass, "max-xl:hidden")}><ModuleChips modules={modules} max={1} nowrap /></td>
                <td className={tdClass}><StatusChip status={connection.status} progress={syncJobs[connection.id]?.progress} /></td>
                <td className={cn(tdClass, "text-right")}>
                  <span className="flex items-center justify-end gap-1">
                    {needsReconnect ? (
                      <Button size="xs" variant="primary" icon={KeyRound} gate={reconnectCapability(connection, can.canReconnect)} onClick={() => actions.openReconnect(connection)}>
                        Reconnect
                      </Button>
                    ) : isActive(connection) ? (
                      <SyncButton connection={connection} size="xs" />
                    ) : (
                      <Button size="xs" variant="secondary" gate={can.canConnect} href={withScope(`${intRoutes.connected}?connect=1&provider=${connection.providerId}${connection.clientId ? `&for=${connection.clientId}` : ""}`)}>
                        Connect again
                      </Button>
                    )}
                    <ActionMenu
                      label={`More actions for ${provider?.name}`}
                      items={actions.menuItems(connection)}
                      trigger={
                        <button type="button" className={buttonClass("ghost", "iconSm")}>
                          <span aria-hidden="true" className="text-[14px] font-bold leading-none tracking-[0.08em]">⋯</span>
                        </button>
                      }
                    />
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Card list (tablet & mobile)                                         */
/* ------------------------------------------------------------------ */

function ConnectionsList({ rows, issuesFor, actions }: { rows: IntegrationConnection[]; issuesFor: (id: string) => IntegrationIssue[]; actions: ReturnType<typeof useConnectionActions> }) {
  const { data, can, syncJobs } = useIntegrations();
  const { withScope, clientId } = useClientScope();
  return (
    <ul className="grid gap-1 p-1 sm:grid-cols-2 lg:hidden">
      {rows.map((connection) => {
        const provider = data.providers.find((item) => item.id === connection.providerId);
        const top = issuesFor(connection.id)[0];
        const needsReconnect = ["needs_reconnect", "expiring", "permission_missing"].includes(connection.status);
        return (
          <li key={connection.id} className="rounded-[10px] border border-[#E4E9F0] bg-white p-3">
            <div className="flex items-start gap-2.5">
              <ProviderLogo providerId={connection.providerId} className="size-8 p-1" muted={!isActive(connection)} />
              <Link href={withScope(intRoutes.detail(connection.id))} className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-semibold text-[#0F1B3D]">{provider?.name}</span>
                <span className="block truncate text-[11.5px] text-[#6B7890]">{scopedDisplay(connection, clientId).accountName}</span>
              </Link>
              <StatusChip status={connection.status} progress={syncJobs[connection.id]?.progress} />
            </div>
            {top && <p className="mt-2 rounded-sm bg-[#FFFAF0] px-2 py-1.5 text-[11.5px] leading-4 text-[#B54708]">{top.title}</p>}
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px] text-[#6B7890]">
              <ClientTag clientId={scopedDisplay(connection, clientId).clientId} className="text-[11.5px]" />
              <span>Synced <RelativeTime iso={connection.lastSyncAt} fallback="never" /></span>
            </div>
            <div className="mt-2.5 flex items-center gap-1">
              <Button size="xs" variant="secondary" href={withScope(intRoutes.detail(connection.id))}>Details</Button>
              {needsReconnect ? (
                <Button size="xs" variant="primary" icon={KeyRound} gate={reconnectCapability(connection, can.canReconnect)} onClick={() => actions.openReconnect(connection)}>Reconnect</Button>
              ) : isActive(connection) ? (
                <SyncButton connection={connection} size="xs" />
              ) : null}
              <span className="ml-auto" />
              <ActionMenu
                label={`More actions for ${provider?.name}`}
                items={actions.menuItems(connection, { hideView: true })}
                trigger={
                  <button type="button" className={buttonClass("ghost", "iconSm")}>
                    <span aria-hidden="true" className="text-[14px] font-bold leading-none tracking-[0.08em]">⋯</span>
                  </button>
                }
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/* ------------------------------------------------------------------ */
/* Bulk health                                                         */
/* ------------------------------------------------------------------ */

function HealthDialog({ open, onOpenChange, rows, issuesFor }: { open: boolean; onOpenChange: (open: boolean) => void; rows: IntegrationConnection[]; issuesFor: (id: string) => IntegrationIssue[] }) {
  const { data } = useIntegrations();
  const { withScope } = useClientScope();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-24px)] max-w-[520px] gap-0 p-0">
        <div className="px-5 pt-5">
          <DialogTitle className="text-[15px] text-[#0F1B3D]">Health of {rows.length} selected</DialogTitle>
          <DialogDescription className="mt-1 text-[12.5px] text-[#6B7890]">Status and the most important issue for each selected integration.</DialogDescription>
        </div>
        <ul className="mx-5 mt-3 max-h-[50vh] divide-y divide-[#EEF1F5] overflow-y-auto rounded-sm border border-[#E4E9F0]">
          {rows.map((connection) => {
            const provider = data.providers.find((item) => item.id === connection.providerId);
            const top = issuesFor(connection.id)[0];
            return (
              <li key={connection.id} className="flex items-start gap-2.5 px-3 py-2.5">
                <ProviderLogo providerId={connection.providerId} className="size-7 p-1" />
                <div className="min-w-0 flex-1">
                  <Link href={withScope(intRoutes.detail(connection.id))} onClick={() => onOpenChange(false)} className="block truncate text-[12.5px] font-semibold text-[#0F1B3D] hover:text-[#2563EB]">
                    {provider?.name} · {connection.accountName}
                  </Link>
                  <p className="text-[11.5px] leading-4 text-[#6B7890]">{top ? top.todo : "No issues. Syncing on schedule."}</p>
                </div>
                <StatusChip status={connection.status} />
              </li>
            );
          })}
        </ul>
        <div className="mt-4 flex justify-end border-t border-[#EEF1F5] px-5 py-3">
          <Button variant="primary" onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
