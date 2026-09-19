"use client";

import { ExternalLinkIcon, FolderIcon, GaugeIcon, PlugIcon, SearchXIcon, SquareArrowOutUpRightIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useMemo } from "react";
import { ActionMenu, type ActionMenuItem } from "@/components/shared/action-menu";
import { DataTable } from "@/components/shared/data-table/data-table";
import type { DataTableColumn } from "@/components/shared/data-table/types";
import { EmptyState } from "@/components/shared/empty-state";
import { FilterSelect } from "@/components/shared/filter-select";
import { SearchInput } from "@/components/shared/search-input";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { formatDate, formatNumber } from "@/lib/utils/format";
import { INTEGRATION_PROVIDER } from "@/types/domain/integration";
import { PROJECT_STATUS } from "@/types/domain/project";
import { toStatusOptions } from "@/types/common";
import { ModuleLinkButton } from "../components/module-link";
import { StatCard, StatGrid, WithTooltip } from "../components/primitives";
import { SectionError, StatGridSkeleton, TableSkeleton } from "../components/states";
import { clientHref } from "@/features/clients/data/config";
import { companySectionHref } from "../data/config";
import { useCompanyClients } from "../data/hooks";
import type { CompanyClientsData } from "../data/repository";
import type { CompanyClient } from "../data/types";
import { useDebouncedText, useUrlParams } from "../hooks/use-url-params";
import { useCompanyId } from "./company-shell";
import { relativeTime } from "../data/clock";

const URL_KEYS = ["q", "status"] as const;
const STATUS_OPTIONS = toStatusOptions(PROJECT_STATUS);

export function CompanyClientsPage() {
  const companyId = useCompanyId();
  const query = useCompanyClients(companyId);

  if (query.error) return <SectionError subject="Clients" error={query.error} onRetry={() => void query.refetch()} module={{ key: "clients", label: "Clients" }} />;
  if (!query.data) {
    return (
      <div className="space-y-1">
        <StatGridSkeleton count={4} className="grid-cols-2 sm:grid-cols-4" />
        <TableSkeleton rows={4} columns={7} />
      </div>
    );
  }
  return <ClientsBody companyId={companyId} data={query.data} />;
}

function ClientsBody({ companyId, data }: { companyId: string; data: CompanyClientsData }) {
  const router = useRouter();
  const url = useUrlParams(URL_KEYS);
  const [search, setSearch] = useDebouncedText(url.values.q, useCallback((value: string) => url.set({ q: value }), [url]));
  const { clients, members } = data;

  const stats = {
    total: clients.length,
    active: clients.filter((client) => client.status === "active").length,
    archived: clients.filter((client) => client.status === "archived").length,
    channels: clients.reduce((total, client) => total + client.connectedChannels.length, 0),
    broken: clients.reduce((total, client) => total + client.brokenChannels.length, 0),
  };

  const filtered = useMemo(() => {
    const term = url.values.q.trim().toLowerCase();
    return clients.filter((client) => {
      if (url.values.status && client.status !== url.values.status) return false;
      return !term || client.name.toLowerCase().includes(term) || (client.websiteUrl ?? "").toLowerCase().includes(term);
    });
  }, [clients, url.values.q, url.values.status]);

  const menu = (client: CompanyClient): ActionMenuItem[] => {
    const items: ActionMenuItem[] = [];
    items.push({ id: "open", label: "Open Client", icon: SquareArrowOutUpRightIcon, onSelect: () => router.push(clientHref(client.id)) });
    items.push({ id: "integrations", label: "View Integrations", icon: PlugIcon, onSelect: () => router.push(companySectionHref(companyId, "integrations", { client: client.name })) });
    items.push({ id: "usage", label: "View Usage", icon: GaugeIcon, onSelect: () => router.push(companySectionHref(companyId, "usage")) });
    return items;
  };

  const columns: Array<DataTableColumn<CompanyClient>> = [
    {
      id: "client",
      header: "Client",
      hideable: false,
      width: "min-w-44",
      cell: (client) => (
        <div className="min-w-0">
          <p className="truncate text-[0.8125rem] font-semibold text-foreground">{client.name}</p>
          <p className="truncate text-2xs text-muted-foreground">Active {relativeTime(client.lastActivityAt)}</p>
        </div>
      ),
    },
    {
      id: "website",
      header: "Website",
      cell: (client) =>
        client.websiteUrl ? (
          <a href={client.websiteUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[0.8125rem] text-foreground hover:underline">
            {client.websiteUrl.replace(/^https?:\/\//, "")}
            <ExternalLinkIcon className="size-3 text-muted-foreground" aria-hidden />
          </a>
        ) : (
          <span className="text-muted-foreground">-</span>
        ),
    },
    { id: "status", header: "Status", cell: (client) => <StatusBadge registry={PROJECT_STATUS} status={client.status} withDot /> },
    {
      id: "members",
      header: "Assigned members",
      cell: (client) => {
        const names = members[client.id] ?? [];
        return (
          <WithTooltip content={names.length > 0 ? names.join(", ") : "No members assigned"}>
            <span className="text-[0.8125rem] tabular text-foreground">{formatNumber(names.length)}</span>
          </WithTooltip>
        );
      },
    },
    {
      id: "channels",
      header: "Connected channels",
      cell: (client) => (
        <WithTooltip
          content={[...client.connectedChannels.map((provider) => `${INTEGRATION_PROVIDER[provider].label} (connected)`), ...client.brokenChannels.map((provider) => `${INTEGRATION_PROVIDER[provider].label} (needs attention)`)].join(", ") || "No channels"}
        >
          <span className="text-[0.8125rem] tabular text-foreground">
            {client.connectedChannels.length}
            {client.brokenChannels.length > 0 ? <span className="ml-1.5 text-2xs text-warning">{client.brokenChannels.length} need attention</span> : null}
          </span>
        </WithTooltip>
      ),
    },
    {
      id: "usage",
      header: "Usage",
      cell: (client) => (
        <span className="whitespace-nowrap text-[0.8125rem] tabular text-foreground">
          {formatNumber(client.scheduledPosts)} scheduled
          {client.failedPosts > 0 ? <span className="ml-1.5 text-2xs text-danger">{client.failedPosts} failed</span> : null}
        </span>
      ),
    },
    { id: "created", header: "Created", cell: (client) => <span className="whitespace-nowrap text-2xs text-muted-foreground">{formatDate(client.createdAt)}</span> },
    { id: "actions", header: <span className="sr-only">Actions</span>, hideable: false, align: "right", width: "w-12", cell: (client) => <ActionMenu items={menu(client)} label={`Actions for ${client.name}`} /> },
  ];

  return (
    <div className="space-y-1">
      <StatGrid className="grid-cols-2 sm:grid-cols-4">
        <StatCard label="Total clients" value={stats.total} icon={FolderIcon} />
        <StatCard label="Active clients" value={stats.active} tone="success" />
        <StatCard label="Archived clients" value={stats.archived} />
        <StatCard label="Connected channels" value={stats.channels} hint={stats.broken > 0 ? `${stats.broken} need attention` : "All healthy"} tone={stats.broken > 0 ? "warning" : "neutral"} />
      </StatGrid>

      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <SearchInput value={search} onChange={setSearch} placeholder="Search client or website..." aria-label="Search clients" className="w-full sm:w-72" />
          <FilterSelect label="Status" value={url.values.status || undefined} options={STATUS_OPTIONS} onChange={(value) => url.set({ status: value })} />
          {url.activeCount > 0 ? (
            <Button variant="ghost" size="sm" onClick={url.clear}>
              Clear
            </Button>
          ) : null}
        </div>
        <ModuleLinkButton module="clients" query={{ company: companyId }} variant="ghost">
          Open in Super Admin Clients
        </ModuleLinkButton>
      </div>

      <DataTable
        columns={columns}
        rows={filtered}
        getRowId={(client) => client.id}
        isLoading={false}
        caption="Clients of this company"
        emptyState={
          clients.length === 0 ? (
            <EmptyState icon={FolderIcon} title="No clients yet" description="Clients appear here once the organisation creates its first brand." />
          ) : (
            <EmptyState icon={SearchXIcon} title="No clients match" description="Try a different search or clear the filters." action={<Button variant="outline" onClick={url.clear}>Clear filters</Button>} />
          )
        }
      />
    </div>
  );
}
