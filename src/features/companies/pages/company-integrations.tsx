"use client";

import { BellIcon, BugIcon, HistoryIcon, NetworkIcon, PlugIcon, SearchXIcon, UnplugIcon } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { ActionMenu, type ActionMenuItem } from "@/components/shared/action-menu";
import { AlertBanner } from "@/components/shared/alert-banner";
import { DataTable } from "@/components/shared/data-table/data-table";
import type { DataTableColumn } from "@/components/shared/data-table/types";
import { EmptyState } from "@/components/shared/empty-state";
import { FilterSelect } from "@/components/shared/filter-select";
import { SearchInput } from "@/components/shared/search-input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import { formatDate, formatDateTime } from "@/lib/utils/format";
import { INTEGRATION_PROVIDER } from "@/types/domain/integration";
import { toStatusOptions } from "@/types/common";
import { FlowDialog } from "../components/flows/flow-kit";
import { ModuleLinkButton } from "../components/module-link";
import { KeyValue, StatCard, StatGrid } from "../components/primitives";
import { SectionError, StatGridSkeleton, TableSkeleton } from "../components/states";
import { ConnectionStateBadge } from "../components/status-badges";
import { useCompanyActions } from "../components/use-company-actions";
import { platformNow, relativeTime } from "../data/clock";
import { CONNECTION_STATE_META } from "../data/config";
import { useCompany, useCompanyIntegrations } from "../data/hooks";
import type { CompanyIntegrationsData } from "../data/repository";
import { buildSyncHistory } from "../data/selectors";
import type { CompanyIntegration } from "../data/types";
import { useDebouncedText, useUrlParams } from "../hooks/use-url-params";
import { useCompanyId } from "./company-shell";

const URL_KEYS = ["q", "state", "client"] as const;
const STATE_OPTIONS = toStatusOptions(CONNECTION_STATE_META);

type Inspecting = { kind: "connection" | "error" | "sync" | "dependencies"; item: CompanyIntegration } | null;

export function CompanyIntegrationsPage() {
  const companyId = useCompanyId();
  const query = useCompanyIntegrations(companyId);

  if (query.error) return <SectionError subject="Integration data" error={query.error} onRetry={() => void query.refetch()} module={{ key: "integrations", label: "Integrations" }} />;
  if (!query.data) {
    return (
      <div className="space-y-1">
        <StatGridSkeleton count={6} className="grid-cols-2 sm:grid-cols-3 xl:grid-cols-6" />
        <TableSkeleton rows={6} columns={7} />
      </div>
    );
  }
  return <IntegrationsBody companyId={companyId} data={query.data} />;
}

function IntegrationsBody({ companyId, data }: { companyId: string; data: CompanyIntegrationsData }) {
  const { integrations, counts } = data;
  const company = useCompany(companyId);
  const { capabilities, openFlow, dialogs } = useCompanyActions();
  const url = useUrlParams(URL_KEYS);
  const [search, setSearch] = useDebouncedText(url.values.q, useCallback((value: string) => url.set({ q: value }), [url]));
  const [inspecting, setInspecting] = useState<Inspecting>(null);

  const clientOptions = useMemo(
    () => [...new Set(integrations.map((item) => item.clientName).filter((name): name is string => Boolean(name)))].sort().map((name) => ({ value: name, label: name })),
    [integrations],
  );

  const filtered = useMemo(() => {
    const term = url.values.q.trim().toLowerCase();
    return integrations.filter((item) => {
      if (url.values.state && item.state !== url.values.state) return false;
      if (url.values.client && item.clientName !== url.values.client) return false;
      return !term || INTEGRATION_PROVIDER[item.provider].label.toLowerCase().includes(term) || item.accountName.toLowerCase().includes(term);
    });
  }, [integrations, url.values.client, url.values.q, url.values.state]);

  const menu = (item: CompanyIntegration): ActionMenuItem[] => [
    { id: "view", label: "View Connection", icon: PlugIcon, onSelect: () => setInspecting({ kind: "connection", item }) },
    ...(item.lastError ? [{ id: "error", label: "Inspect Error", icon: BugIcon, onSelect: () => setInspecting({ kind: "error", item }) }] : []),
    { id: "sync", label: "View Sync History", icon: HistoryIcon, onSelect: () => setInspecting({ kind: "sync", item }) },
    { id: "deps", label: "Review Dependencies", icon: NetworkIcon, onSelect: () => setInspecting({ kind: "dependencies", item }) },
  ];

  const columns: Array<DataTableColumn<CompanyIntegration>> = [
    { id: "provider", header: "Provider", hideable: false, width: "min-w-36", cell: (item) => <span className="text-[0.8125rem] font-semibold text-foreground">{INTEGRATION_PROVIDER[item.provider].label}</span> },
    { id: "account", header: "Connected account", cell: (item) => <span className="block max-w-56 truncate text-[0.8125rem] text-foreground">{item.accountName}</span> },
    { id: "client", header: "Mapped client", cell: (item) => <span className="text-[0.8125rem] text-foreground">{item.clientName ?? "-"}</span> },
    { id: "state", header: "Connection", cell: (item) => <ConnectionStateBadge state={item.state} /> },
    {
      id: "permissions",
      header: "Permissions",
      cell: (item) => (
        <span className={cn("text-[0.8125rem] capitalize", item.permissionHealth === "complete" ? "text-success" : item.permissionHealth === "partial" ? "text-warning" : "text-danger")}>
          {item.permissionHealth}
        </span>
      ),
    },
    { id: "lastSync", header: "Last sync", cell: (item) => <span className="whitespace-nowrap text-2xs text-muted-foreground">{relativeTime(item.lastSyncAt)}</span> },
    { id: "modules", header: "Dependent modules", defaultHidden: true, cell: (item) => <span className="text-2xs text-muted-foreground">{item.dependentModules.join(", ")}</span> },
    { id: "actions", header: <span className="sr-only">Actions</span>, hideable: false, align: "right", width: "w-12", cell: (item) => <ActionMenu items={menu(item)} label={`Actions for ${item.accountName}`} /> },
  ];

  return (
    <div className="space-y-1">
      <StatGrid className="grid-cols-2 sm:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Total connections" value={counts.total} icon={PlugIcon} />
        <StatCard label="Healthy" value={counts.healthy} tone="success" />
        <StatCard label="Needs reconnect" value={counts.needsReconnect} tone={counts.needsReconnect > 0 ? "danger" : "neutral"} />
        <StatCard label="Permission issues" value={counts.permissionIssues} tone={counts.permissionIssues > 0 ? "warning" : "neutral"} />
        <StatCard label="Sync failures" value={counts.syncFailures} tone={counts.syncFailures > 0 ? "warning" : "neutral"} />
        <StatCard label="Rate limited" value={counts.rateLimited} tone={counts.rateLimited > 0 ? "info" : "neutral"} />
      </StatGrid>

      {counts.needsReconnect + counts.permissionIssues > 0 ? (
        <AlertBanner
          tone="warning"
          title="Only the connection owner can re-authorise a provider"
          action={
            capabilities.canEditCompany && company.data ? (
              <Button variant="outline" size="sm" onClick={() => company.data && openFlow({ kind: "notify", targets: [company.data] })}>
                <BellIcon />
                Notify the company
              </Button>
            ) : undefined
          }
        >
          Super Admin does not refresh a company&apos;s OAuth access and provider secrets are never shown here. Ask the organisation to reconnect the affected accounts.
        </AlertBanner>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <SearchInput value={search} onChange={setSearch} placeholder="Search provider or account..." aria-label="Search connections" className="w-full sm:w-64" />
          <FilterSelect label="Status" value={url.values.state || undefined} options={STATE_OPTIONS} onChange={(value) => url.set({ state: value })} />
          <FilterSelect label="Client" value={url.values.client || undefined} options={clientOptions} onChange={(value) => url.set({ client: value })} />
          {url.activeCount > 0 ? <Button variant="ghost" size="sm" onClick={url.clear}>Clear</Button> : null}
        </div>
        <ModuleLinkButton module="integrations" variant="ghost">
          Open Global Integrations
        </ModuleLinkButton>
      </div>

      <DataTable
        columns={columns}
        rows={filtered}
        getRowId={(item) => item.id}
        isLoading={false}
        caption="Provider connections of this company"
        enableColumnVisibility
        emptyState={
          integrations.length === 0 ? (
            <EmptyState icon={UnplugIcon} title="No integrations" description="No provider accounts are connected yet. They appear once the organisation connects a channel." />
          ) : (
            <EmptyState icon={SearchXIcon} title="No connections match" description="Try a different search or clear the filters." action={<Button variant="outline" onClick={url.clear}>Clear filters</Button>} />
          )
        }
      />

      <InspectDialog inspecting={inspecting} onClose={() => setInspecting(null)} />
      {dialogs}
    </div>
  );
}

function InspectDialog({ inspecting, onClose }: { inspecting: Inspecting; onClose: () => void }) {
  const item = inspecting?.item;
  const provider = item ? INTEGRATION_PROVIDER[item.provider].label : "";
  const titles = { connection: "Connection", error: "Error details", sync: "Sync history", dependencies: "Dependencies" } as const;

  return (
    <FlowDialog
      open={inspecting !== null}
      onOpenChange={(open) => !open && onClose()}
      title={inspecting ? `${titles[inspecting.kind]} - ${provider}` : "Connection"}
      description={item ? `${item.accountName}${item.clientName ? ` · ${item.clientName}` : ""}` : undefined}
      footer={<Button variant="outline" onClick={onClose}>Close</Button>}
    >
      {item && inspecting?.kind === "connection" ? (
        <dl className="divide-y divide-border rounded-sm border border-border px-3">
          <KeyValue label="Status"><ConnectionStateBadge state={item.state} /></KeyValue>
          <KeyValue label="Permission health"><span className="capitalize">{item.permissionHealth}</span></KeyValue>
          <KeyValue label="Last sync">{formatDateTime(item.lastSyncAt)}</KeyValue>
          <KeyValue label="Token expires">{item.tokenExpiresAt ? formatDate(item.tokenExpiresAt) : "-"}</KeyValue>
          <KeyValue label="Granted scopes">{item.scopes.join(", ") || "-"}</KeyValue>
          <KeyValue label="Credentials">Not shown - held by the identity service</KeyValue>
        </dl>
      ) : null}

      {item && inspecting?.kind === "error" ? (
        item.lastError ? (
          <dl className="divide-y divide-border rounded-sm border border-border px-3">
            <KeyValue label="Code"><span className="font-mono text-2xs">{item.lastError.code}</span></KeyValue>
            <KeyValue label="Occurred">{formatDateTime(item.lastError.occurredAt)}</KeyValue>
            <KeyValue label="Message"><span className="whitespace-normal text-left">{item.lastError.message}</span></KeyValue>
          </dl>
        ) : (
          <p className="text-[0.8125rem] text-muted-foreground">No error recorded for this connection.</p>
        )
      ) : null}

      {item && inspecting?.kind === "sync" ? (
        <ul className="divide-y divide-border rounded-sm border border-border">
          {buildSyncHistory(item, platformNow()).map((attempt) => (
            <li key={attempt.id} className="flex items-start justify-between gap-3 px-3 py-1.5 text-[0.8125rem]">
              <span className={attempt.ok ? "text-success" : "text-danger"}>{attempt.ok ? "Succeeded" : "Failed"}</span>
              <span className="min-w-0 flex-1 truncate text-muted-foreground">{attempt.detail}</span>
              <span className="shrink-0 text-2xs text-muted-foreground">{formatDateTime(attempt.at)}</span>
            </li>
          ))}
        </ul>
      ) : null}

      {item && inspecting?.kind === "dependencies" ? (
        <div className="space-y-2">
          <p className="text-[0.8125rem] text-muted-foreground">
            These modules read data from this connection. If it is unhealthy they show stale or missing data{item.clientName ? ` for ${item.clientName}` : ""}.
          </p>
          <ul className="divide-y divide-border rounded-sm border border-border">
            {item.dependentModules.map((module) => (
              <li key={module} className="px-3 py-1.5 text-[0.8125rem] text-foreground">{module}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </FlowDialog>
  );
}
