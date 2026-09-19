"use client";

import { BellRingIcon, EyeIcon, HistoryIcon, PlugIcon, SquareArrowOutUpRightIcon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { ActionMenu } from "@/components/shared/action-menu";
import { AlertBanner } from "@/components/shared/alert-banner";
import { DataTable } from "@/components/shared/data-table/data-table";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import type { DataTableColumn } from "@/components/shared/data-table/types";
import { Button } from "@/components/ui/button";
import { Sheet, SheetBody, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { KeyValue, Panel, StatCard, StatGrid } from "@/features/companies/components/primitives";
import { ModuleLinkButton } from "@/features/companies/components/module-link";
import { CONNECTION_STATE_META, companySectionHref } from "@/features/companies/data/config";
import { relativeTime } from "@/features/companies/data/clock";
import type { CompanyIntegration } from "@/features/companies/data/types";
import { formatDate } from "@/lib/utils/format";
import { INTEGRATION_PROVIDER } from "@/types/domain/integration";
import { ClientError, StatGridSkeleton, TableSkeleton } from "../components/states";
import { DemoTag } from "../components/status-badges";
import { clientSectionHref } from "../data/config";
import { describeError, useClientCapabilities, useClientChannels, useClientMutations } from "../data/hooks";
import type { ClientChannelsData, ClientSummary } from "../data/types";
import { useClientId } from "./client-shell";

const PERMISSION_LABEL = { complete: "Complete", partial: "Partial", missing: "Missing" } as const;

function ConnectionDrawer({ summary, connection, canAsk, onClose }: { summary: ClientSummary; connection: CompanyIntegration | null; canAsk: boolean; onClose: () => void }) {
  const mutations = useClientMutations();
  const [asking, setAsking] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const label = connection ? INTEGRATION_PROVIDER[connection.provider].label : "";
  const needsAction = connection ? connection.state !== "healthy" : false;

  const request = async () => {
    if (!connection) return;
    setPending(true);
    setError(null);
    try {
      await mutations.requestReconnection(summary.client.id, connection.id);
      toast.success("Reconnection request recorded", { description: "Demo only: nothing was sent and no connection was refreshed." });
      setAsking(false);
    } catch (failure) {
      setError(describeError(failure).message);
    } finally {
      setPending(false);
    }
  };

  return (
    <Sheet open={connection !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="sm:max-w-md">
        {connection ? (
          <>
            <SheetHeader>
              <SheetTitle>{label}</SheetTitle>
              <SheetDescription>{connection.accountName}</SheetDescription>
            </SheetHeader>
            <SheetBody className="space-y-3">
              <div className="flex flex-wrap items-center gap-1.5">
                <StatusBadge registry={CONNECTION_STATE_META} status={connection.state} withDot />
                <DemoTag>Demo data</DemoTag>
              </div>

              {connection.lastError ? (
                <AlertBanner tone={connection.state === "healthy" ? "info" : "warning"} title={connection.lastError.code}>
                  {connection.lastError.message} <span className="text-muted-foreground">({relativeTime(connection.lastError.occurredAt)})</span>
                </AlertBanner>
              ) : null}

              <Panel title="Connection">
                <dl className="divide-y divide-border">
                  <KeyValue label="Provider">{label}</KeyValue>
                  <KeyValue label="Account">{connection.accountName}</KeyValue>
                  <KeyValue label="Permissions">{PERMISSION_LABEL[connection.permissionHealth]}</KeyValue>
                  <KeyValue label="Last sync">{relativeTime(connection.lastSyncAt)}</KeyValue>
                  <KeyValue label="Access expires">{connection.tokenExpiresAt ? formatDate(connection.tokenExpiresAt) : "Does not expire"}</KeyValue>
                </dl>
                <p className="mt-2 text-2xs text-muted-foreground">Access tokens and secrets are never shown here.</p>
              </Panel>

              <Panel title="Granted scopes">
                {connection.scopes.length === 0 ? (
                  <p className="text-[0.8125rem] text-muted-foreground">No scopes recorded.</p>
                ) : (
                  <ul className="flex flex-wrap gap-1">
                    {connection.scopes.map((scope) => (
                      <li key={scope} className="rounded-sm border border-border-strong bg-neutral-subtle px-1.5 py-px text-[11px] text-neutral">{scope}</li>
                    ))}
                  </ul>
                )}
              </Panel>

              <Panel title="Used by">
                <p className="text-[0.8125rem] text-foreground">{connection.dependentModules.length === 0 ? "Nothing depends on this connection." : connection.dependentModules.join(", ")}</p>
              </Panel>

              {asking ? (
                <AlertBanner tone="info" title="Ask the company to reconnect?">
                  Reconnecting needs someone from {summary.company.name} to authorise the account again. OmniPlatform never refreshes a connection silently. This demo records the request in the client&apos;s activity; it sends nothing.
                  <span className="mt-2 flex gap-1.5">
                    <Button size="sm" onClick={() => void request()} disabled={pending}>Record request</Button>
                    <Button size="sm" variant="outline" onClick={() => setAsking(false)} disabled={pending}>Cancel</Button>
                  </span>
                  {error ? <span role="alert" className="mt-1 block text-danger">{error}</span> : null}
                </AlertBanner>
              ) : null}
            </SheetBody>
            <SheetFooter className="flex-wrap justify-between">
              <div className="flex flex-wrap gap-1.5">
                <Button asChild variant="outline" size="sm">
                  <Link href={clientSectionHref(summary.client.id, "activity", { module: "channels" })}>
                    <HistoryIcon />
                    View Sync History
                  </Link>
                </Button>
                <ModuleLinkButton module="integrations" query={{ provider: connection.provider }}>Open Platform Provider Status</ModuleLinkButton>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {canAsk && needsAction ? (
                  <Button variant="outline" size="sm" onClick={() => setAsking(true)} disabled={asking}>
                    <BellRingIcon />
                    Request Reconnection
                  </Button>
                ) : null}
                <Button asChild size="sm">
                  <Link href={companySectionHref(summary.company.id, "integrations", { client: summary.client.name })}>
                    <SquareArrowOutUpRightIcon />
                    Open Company Integration
                  </Link>
                </Button>
              </div>
            </SheetFooter>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

function ChannelsBody({ data }: { data: ClientChannelsData }) {
  const capabilities = useClientCapabilities();
  const [selected, setSelected] = useState<string | null>(null);
  const { summary, connections, unconnectedProviders } = data;
  const count = (state: CompanyIntegration["state"]) => connections.filter((item) => item.state === state).length;
  const selectedConnection = connections.find((item) => item.id === selected) ?? null;
  const archived = summary.workspace === "archived";

  const columns: Array<DataTableColumn<CompanyIntegration>> = [
    {
      id: "provider",
      header: "Provider",
      hideable: false,
      cell: (item) => (
        <div className="min-w-0">
          <p className="truncate text-[0.8125rem] font-medium text-foreground">{INTEGRATION_PROVIDER[item.provider].label}</p>
          <p className="truncate text-2xs text-muted-foreground">{item.accountName}</p>
        </div>
      ),
    },
    { id: "state", header: "Status", cell: (item) => <StatusBadge registry={CONNECTION_STATE_META} status={item.state} withDot /> },
    { id: "permissions", header: "Permissions", hideBelow: "md", cell: (item) => <span className="text-[0.8125rem]">{PERMISSION_LABEL[item.permissionHealth]}</span> },
    { id: "sync", header: "Last sync", hideBelow: "md", cell: (item) => <span className="whitespace-nowrap text-2xs text-muted-foreground">{relativeTime(item.lastSyncAt)}</span> },
    { id: "expires", header: "Access expires", hideBelow: "lg", cell: (item) => <span className="whitespace-nowrap text-2xs text-muted-foreground">{item.tokenExpiresAt ? formatDate(item.tokenExpiresAt) : "-"}</span> },
    {
      id: "actions",
      header: <span className="sr-only">Actions</span>,
      hideable: false,
      align: "right",
      width: "w-12",
      cell: (item) => (
        <ActionMenu
          label={`Actions for ${item.accountName}`}
          items={[
            { id: "review", label: "Review Connection", icon: EyeIcon, onSelect: () => setSelected(item.id) },
          ]}
        />
      ),
    },
  ];

  return (
    <div className="space-y-2">
      <StatGrid className="grid-cols-2 sm:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Total connections" value={connections.length} />
        <StatCard label="Healthy" value={count("healthy")} tone="success" />
        <StatCard label="Needs reconnect" value={count("needs_reconnect")} tone={count("needs_reconnect") > 0 ? "danger" : "neutral"} />
        <StatCard label="Permission issues" value={count("permission_issue")} tone={count("permission_issue") > 0 ? "warning" : "neutral"} />
        <StatCard label="Sync failures" value={count("sync_failure")} tone={count("sync_failure") > 0 ? "warning" : "neutral"} />
        <StatCard label="Rate limited" value={count("rate_limited")} tone={count("rate_limited") > 0 ? "info" : "neutral"} />
      </StatGrid>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-2xs text-muted-foreground">Connections belong to the parent company&apos;s integrations. Connecting or reconnecting happens there, never silently from here.</p>
        <Button asChild variant="outline" size="sm">
          <Link href={companySectionHref(summary.company.id, "integrations", { client: summary.client.name })}>
            <PlugIcon />
            Open Company Integration
          </Link>
        </Button>
      </div>

      <DataTable
        columns={columns}
        rows={connections}
        getRowId={(item) => item.id}
        isLoading={false}
        isFetching={false}
        caption={`Channel connections for ${summary.client.name}`}
        onRowClick={(item) => setSelected(item.id)}
        emptyState={
          <EmptyState
            icon={PlugIcon}
            title="No channels connected"
            description={archived ? "This client is archived." : "Connect this client's social, search and messaging accounts from the company's integrations."}
            action={
              archived ? undefined : (
                <Button asChild variant="outline">
                  <Link href={companySectionHref(summary.company.id, "integrations", { client: summary.client.name })}>Open Company Integration</Link>
                </Button>
              )
            }
          />
        }
      />

      {unconnectedProviders.length > 0 && connections.length > 0 ? (
        <p className="text-2xs text-muted-foreground">
          Not connected: {unconnectedProviders.map((provider) => INTEGRATION_PROVIDER[provider].label).join(", ")}.
        </p>
      ) : null}

      <ConnectionDrawer summary={summary} connection={selectedConnection} canAsk={capabilities.canViewClientConnections && capabilities.canManageClientSettings && !archived} onClose={() => setSelected(null)} />
    </div>
  );
}

export function ClientChannelsPage() {
  const clientId = useClientId();
  const query = useClientChannels(clientId);

  if (query.error) return <ClientError subject="Channels" error={query.error} onRetry={() => void query.refetch()} />;
  if (!query.data) {
    return (
      <div className="space-y-2">
        <StatGridSkeleton count={6} className="grid-cols-2 sm:grid-cols-3 xl:grid-cols-6" />
        <TableSkeleton rows={4} columns={5} />
      </div>
    );
  }
  return <ChannelsBody data={query.data} />;
}
