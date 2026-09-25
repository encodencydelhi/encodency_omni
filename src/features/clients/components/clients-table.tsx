"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { ActionMenu, type ActionMenuItem } from "@/components/shared/action-menu";
import type { DataTableColumn } from "@/components/shared/data-table/types";
import { DataTablePagination } from "@/components/shared/data-table/data-table-pagination";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { platformNow } from "@/features/companies/data/clock";
import { cn } from "@/lib/utils/cn";
import { formatDate, formatRelativeTime } from "@/lib/utils/format";
import { ROUTES } from "@/config/routes";
import type { PaginationMeta } from "@/types/api";
import { clientHref, clientSectionHref, resolveClientBasePath } from "../data/config";
import type { ClientSummary } from "../data/types";
import { ClientAvatar } from "./client-avatar";
import { HealthBadge, OnboardingBadge, WorkspaceBadge } from "./status-badges";

const stop = (event: { stopPropagation: () => void }) => event.stopPropagation();

function relative(iso: string): string {
  return formatRelativeTime(iso, platformNow());
}

/* ------------------------------------------------------------------ */
/* Cells                                                               */
/* ------------------------------------------------------------------ */

export function ClientCell({ summary, basePath }: { summary: ClientSummary; basePath?: string }) {
  const pathname = usePathname();
  const effectiveBasePath = basePath ?? resolveClientBasePath(pathname);
  return (
    <div className="flex min-w-0 max-w-[15rem] items-center gap-2.5">
      <ClientAvatar name={summary.client.name} logo={summary.client.logo?.url ?? summary.profile.logo?.url ?? summary.profile.logoDataUrl} />
      <div className="min-w-0">
        <Link href={clientHref(summary.client.id, effectiveBasePath)} onClick={stop} className="block truncate text-[0.8125rem] font-semibold text-foreground hover:text-primary hover:underline">
          {summary.client.name}
        </Link>
        <p className="truncate text-2xs text-muted-foreground">{summary.displayId}</p>
      </div>
    </div>
  );
}

function CompanyCell({ summary, basePath }: { summary: ClientSummary; basePath?: string }) {
  const pathname = usePathname();
  const isAdmin = (basePath ?? pathname)?.startsWith(ROUTES.admin.root);
  const companyHref = isAdmin ? ROUTES.admin.settings : ROUTES.superAdmin.company(summary.company.id);

  return (
    <div className="min-w-0 max-w-[12rem]">
      <Link href={companyHref} onClick={stop} className="block truncate text-[0.8125rem] font-medium text-foreground hover:text-primary hover:underline">
        {summary.company.name}
      </Link>
      <p className="truncate text-2xs text-muted-foreground">{summary.company.planName}</p>
    </div>
  );
}

function WebsiteCell({ summary, basePath }: { summary: ClientSummary; basePath?: string }) {
  const pathname = usePathname();
  const effectiveBasePath = basePath ?? resolveClientBasePath(pathname);
  const { primaryWebsite, websites } = summary;
  if (!primaryWebsite) return <span className="text-2xs text-muted-foreground">Not configured</span>;
  const extra = websites.length - 1;
  return (
    <Link href={clientSectionHref(summary.client.id, "website-seo", undefined, effectiveBasePath)} onClick={stop} className="block min-w-0 max-w-[11rem] rounded-sm hover:underline">
      <span className="block truncate text-[0.8125rem] text-foreground">{primaryWebsite.domain}</span>
      {extra > 0 ? <span className="block text-2xs text-muted-foreground">+{extra} {extra === 1 ? "website" : "websites"}</span> : null}
    </Link>
  );
}

function AccountsCell({ summary, basePath }: { summary: ClientSummary; basePath?: string }) {
  const pathname = usePathname();
  const effectiveBasePath = basePath ?? resolveClientBasePath(pathname);
  const { counts } = summary;
  if (counts.connections === 0) {
    return (
      <Link href={clientSectionHref(summary.client.id, "channels", undefined, effectiveBasePath)} onClick={stop} className="text-2xs text-muted-foreground hover:underline">
        No channels connected
      </Link>
    );
  }
  return (
    <Link href={clientSectionHref(summary.client.id, "channels", undefined, effectiveBasePath)} onClick={stop} className="block rounded-sm hover:underline">
      <span className="block whitespace-nowrap text-[0.8125rem] tabular text-foreground">
        {counts.healthyConnections} / {counts.connections} <span className="text-muted-foreground">Healthy</span>
      </span>
      {counts.attentionConnections > 0 ? <span className="block text-2xs text-warning">{counts.attentionConnections} Needs Attention</span> : null}
    </Link>
  );
}

function TeamCell({ summary, basePath }: { summary: ClientSummary; basePath?: string }) {
  const pathname = usePathname();
  const effectiveBasePath = basePath ?? resolveClientBasePath(pathname);
  const { counts, lead } = summary;
  return (
    <Link href={clientSectionHref(summary.client.id, "team", undefined, effectiveBasePath)} onClick={stop} className="block rounded-sm hover:underline">
      {counts.activeMembers === 0 ? (
        <span className="text-2xs text-warning">No active members</span>
      ) : (
        <>
          <span className="block whitespace-nowrap text-[0.8125rem] tabular text-foreground">
            {counts.activeMembers} {counts.activeMembers === 1 ? "member" : "members"}
          </span>
          <span className="block max-w-28 truncate text-2xs text-muted-foreground">{lead ? `Lead: ${lead.name}` : "No lead"}</span>
        </>
      )}
    </Link>
  );
}

/* ------------------------------------------------------------------ */
/* Columns                                                             */
/* ------------------------------------------------------------------ */

export function buildClientColumns(
  rowMenu: (summary: ClientSummary) => ActionMenuItem[],
  basePath?: string,
): Array<DataTableColumn<ClientSummary>> {
  return [
    { id: "client", header: "Client", sortField: "name", hideable: false, className: "px-3", cell: (summary) => <ClientCell summary={summary} basePath={basePath} /> },
    { id: "company", header: "Parent Company", sortField: "company", className: "px-3", cell: (summary) => <CompanyCell summary={summary} basePath={basePath} /> },
    { id: "website", header: "Primary Website", className: "px-3", hideBelow: 1320, cell: (summary) => <WebsiteCell summary={summary} basePath={basePath} /> },
    { id: "workspace", header: "Workspace", className: "px-3", cell: (summary) => <WorkspaceBadge status={summary.workspace} /> },
    { id: "onboarding", header: "Onboarding", className: "px-3", hideBelow: 1400, cell: (summary) => <OnboardingBadge status={summary.onboarding.status} /> },
    { id: "accounts", header: "Connected Accounts", sortField: "connections", className: "px-3", hideBelow: 1500, cell: (summary) => <AccountsCell summary={summary} basePath={basePath} /> },
    { id: "team", header: "Assigned Team", className: "px-3", hideBelow: 1600, cell: (summary) => <TeamCell summary={summary} basePath={basePath} /> },
    {
      id: "health",
      header: "Health",
      sortField: "issues",
      className: "px-3",
      cell: (summary) => (
        <Link href={`${clientHref(summary.client.id, basePath)}#needs-attention`} onClick={stop} className="inline-block">
          <HealthBadge health={summary.health} />
        </Link>
      ),
    },
    {
      id: "lastActive",
      header: "Last Active",
      sortField: "lastActive",
      className: "px-3",
      hideBelow: 1720,
      cell: (summary) => <span className="whitespace-nowrap text-2xs text-muted-foreground">{relative(summary.lastActiveAt)}</span>,
    },
    { id: "created", header: "Created", sortField: "createdAt", defaultHidden: true, cell: (summary) => <span className="whitespace-nowrap text-2xs text-muted-foreground">{formatDate(summary.client.createdAt)}</span> },
    {
      id: "actions",
      header: <span className="sr-only">Actions</span>,
      hideable: false,
      align: "right",
      width: "w-12",
      className: "px-2",
      cell: (summary) => <ActionMenu items={rowMenu(summary)} label={`Actions for ${summary.client.name}`} />,
    },
  ];
}

/* ------------------------------------------------------------------ */
/* Cards for narrow screens                                            */
/* ------------------------------------------------------------------ */

export function ClientCards({
  rows,
  isLoading,
  selectedIds,
  onSelectionChange,
  onOpen,
  rowMenu,
  pagination,
  onPageChange,
  onPageSizeChange,
  emptyState,
  basePath,
}: {
  rows: ClientSummary[];
  isLoading: boolean;
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  onOpen: (summary: ClientSummary) => void;
  rowMenu: (summary: ClientSummary) => ActionMenuItem[];
  pagination: PaginationMeta | undefined;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  emptyState: ReactNode;
  basePath?: string;
}) {
  const pathname = usePathname();
  const effectiveBasePath = basePath ?? resolveClientBasePath(pathname);
  const isAdmin = effectiveBasePath.startsWith(ROUTES.admin.root);

  if (isLoading) {
    return (
      <div className="space-y-1">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="space-y-2 rounded-sm border border-border bg-card p-3">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-56" />
            <Skeleton className="h-3 w-32" />
          </div>
        ))}
      </div>
    );
  }
  if (rows.length === 0) return <div className="rounded-sm border border-border bg-card">{emptyState}</div>;

  return (
    <div className="space-y-1">
      {rows.map((summary) => {
        const selected = selectedIds.includes(summary.client.id);
        const { counts } = summary;
        return (
          <article key={summary.client.id} className={cn("rounded-sm border bg-card p-3 shadow-xs", selected ? "border-primary/40 bg-primary-subtle/40" : "border-border")}>
            <div className="flex items-start gap-2.5">
              <Checkbox
                checked={selected}
                onCheckedChange={() => onSelectionChange(selected ? selectedIds.filter((id) => id !== summary.client.id) : [...selectedIds, summary.client.id])}
                aria-label={`Select ${summary.client.name}`}
                className="mt-1"
              />
              <button type="button" onClick={() => onOpen(summary)} className="min-w-0 flex-1 text-left">
                <ClientCell summary={summary} basePath={effectiveBasePath} />
              </button>
              <ActionMenu items={rowMenu(summary)} label={`Actions for ${summary.client.name}`} />
            </div>
            <p className="mt-1.5 truncate text-2xs text-muted-foreground">
              <Link href={isAdmin ? ROUTES.admin.settings : ROUTES.superAdmin.company(summary.company.id)} className="hover:underline">{summary.company.name}</Link>
              {summary.primaryWebsite ? ` · ${summary.primaryWebsite.domain}` : " · No website"}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <WorkspaceBadge status={summary.workspace} />
              <OnboardingBadge status={summary.onboarding.status} />
              <HealthBadge health={summary.health} />
            </div>
            <dl className="mt-2 grid grid-cols-3 gap-2 text-2xs">
              <div>
                <dt className="text-muted-foreground">Accounts</dt>
                <dd className="font-medium tabular text-foreground">{counts.connections === 0 ? "None" : `${counts.healthyConnections} / ${counts.connections} healthy`}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Team</dt>
                <dd className="font-medium tabular text-foreground">{counts.activeMembers}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Active</dt>
                <dd className="font-medium text-foreground">{relative(summary.lastActiveAt)}</dd>
              </div>
            </dl>
          </article>
        );
      })}
      {pagination ? (
        <div className="rounded-sm border border-border bg-card">
          <DataTablePagination pagination={pagination} onPageChange={onPageChange} onPageSizeChange={onPageSizeChange} />
        </div>
      ) : null}
    </div>
  );
}
