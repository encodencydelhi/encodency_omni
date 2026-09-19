"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { ActionMenu, type ActionMenuItem } from "@/components/shared/action-menu";
import type { DataTableColumn } from "@/components/shared/data-table/types";
import { DataTablePagination } from "@/components/shared/data-table/data-table-pagination";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { ROUTES } from "@/config/routes";
import { cn } from "@/lib/utils/cn";
import { formatDate, formatNumber, formatRelativeTime, getInitials } from "@/lib/utils/format";
import type { PaginationMeta } from "@/types/api";
import { platformNow } from "../data/clock";
import { ACCOUNT_STATUS, OWNER_STATE_LABEL, SUBSCRIPTION_STATUS_META, USAGE_LEVEL_META, USAGE_RESOURCE_BY_KEY, USAGE_METHOD, companySectionHref } from "../data/config";
import type { CompanySummary } from "../data/types";
import { formatMrr, formatPercent1 } from "../lib/format";
import { WithTooltip } from "./primitives";
import { AccountStatusBadge, BillingStatusBadge, HealthBadge, SubscriptionStatusBadge } from "./status-badges";

const stop = (event: { stopPropagation: () => void }) => event.stopPropagation();

function relative(iso: string): string {
  return formatRelativeTime(iso, platformNow());
}

/* ------------------------------------------------------------------ */
/* Cells                                                               */
/* ------------------------------------------------------------------ */

function CompanyCell({ summary }: { summary: CompanySummary }) {
  const { company } = summary;
  return (
    <div className="flex min-w-0 max-w-[15rem] items-center gap-2.5">
      <Avatar className="size-8 shrink-0 rounded-sm">
        <AvatarFallback className="rounded-sm text-[11px] font-semibold">{getInitials(company.name)}</AvatarFallback>
      </Avatar>
      <div className="min-w-0">
        <div className="flex min-w-0 items-center gap-1.5">
          <Link
            href={ROUTES.superAdmin.company(company.id)}
            onClick={stop}
            className="truncate text-[0.8125rem] font-semibold text-foreground hover:text-primary hover:underline"
          >
            {company.name}
          </Link>
          {company.accountStatus !== "active" ? (
            <span
              className={cn(
                "shrink-0 rounded-sm border px-1 text-[10px] font-medium leading-4",
                ACCOUNT_STATUS[company.accountStatus].tone === "danger" ? "border-danger/20 bg-danger-subtle text-danger" : "border-border-strong bg-neutral-subtle text-neutral",
              )}
            >
              {ACCOUNT_STATUS[company.accountStatus].label}
            </span>
          ) : null}
        </div>
        <p className="truncate text-2xs text-muted-foreground">
          {company.domain ?? "No domain"} <span aria-hidden>·</span> {company.displayId}
        </p>
      </div>
    </div>
  );
}

const SUBSCRIPTION_TEXT_TONE = {
  info: "text-info",
  success: "text-success",
  warning: "text-warning",
  danger: "text-danger",
  neutral: "text-muted-foreground",
  brand: "text-primary",
} as const;

function PlanCell({ summary }: { summary: CompanySummary }) {
  const meta = SUBSCRIPTION_STATUS_META[summary.subscriptionStatus];
  return (
    <Link href={companySectionHref(summary.company.id, "subscription")} onClick={stop} className="block rounded-sm hover:underline">
      <span className="block text-[0.8125rem] font-medium text-foreground">{summary.plan.name}</span>
      <span className="block whitespace-nowrap text-2xs text-muted-foreground">
        <span className="capitalize">{summary.plan.billingCycle}</span>
        {summary.subscriptionStatus !== "active" ? <span className={cn("font-medium", SUBSCRIPTION_TEXT_TONE[meta.tone])}> · {meta.label}</span> : null}
      </span>
    </Link>
  );
}

function OwnerCell({ summary }: { summary: CompanySummary }) {
  const { owner } = summary;
  const pending = owner.state !== "active" && owner.state !== "none";
  return (
    <WithTooltip content={[owner.email || "No email", pending ? OWNER_STATE_LABEL[owner.state] : null].filter(Boolean).join(" · ")} className="block">
      <Link
        href={companySectionHref(summary.company.id, "users", owner.email ? { q: owner.email } : undefined)}
        onClick={stop}
        className="flex min-w-0 items-center gap-2 rounded-sm hover:underline"
      >
        <Avatar className="size-5 shrink-0">
          <AvatarFallback className="text-[10px]">{getInitials(owner.name)}</AvatarFallback>
        </Avatar>
        <span className="min-w-0 max-w-24 truncate text-[0.8125rem] text-foreground">{owner.name}</span>
        {pending ? <span className="size-1.5 shrink-0 rounded-sm bg-warning" aria-label={OWNER_STATE_LABEL[owner.state]} /> : null}
      </Link>
    </WithTooltip>
  );
}

function CountLink({ summary, section, value, sub, subTone }: { summary: CompanySummary; section: "users" | "clients" | "integrations"; value: number; sub?: string; subTone?: "warning" }) {
  return (
    <Link href={companySectionHref(summary.company.id, section)} onClick={stop} className="inline-block rounded-sm text-right hover:underline">
      <span className="block text-[0.8125rem] font-medium tabular text-foreground">{formatNumber(value)}</span>
      {sub ? <span className={cn("block text-2xs", subTone === "warning" ? "text-warning" : "text-muted-foreground")}>{sub}</span> : null}
    </Link>
  );
}

function UsageCell({ summary }: { summary: CompanySummary }) {
  const { usage } = summary;
  const percent = usage.utilization;
  const meta = USAGE_LEVEL_META[usage.level];
  const resource = usage.resource ? USAGE_RESOURCE_BY_KEY[usage.resource].label : null;
  const tone = usage.level === "exceeded" ? "bg-danger" : usage.level === "near_limit" ? "bg-warning" : usage.level === "high" ? "bg-info" : "bg-success";

  return (
    <WithTooltip
      className="block"
      content={
        percent === null
          ? "No metered limits apply to this company."
          : `Highest limit utilization: ${formatPercent1(percent)}${resource ? ` (${resource})` : ""}. ${USAGE_METHOD}`
      }
    >
      <Link href={companySectionHref(summary.company.id, "usage")} onClick={stop} className="block min-w-24 rounded-sm">
        <span className="flex items-baseline gap-1.5">
          <span className="text-[0.8125rem] font-medium tabular text-foreground">{percent === null ? "-" : `${Math.round(percent)}%`}</span>
          <span className="text-2xs text-muted-foreground">{meta.label}</span>
        </span>
        <span className="mt-1 block h-1 overflow-hidden rounded-sm bg-muted" aria-hidden>
          <span className={cn("block h-full rounded-sm", tone)} style={{ width: `${Math.min(100, Math.max(percent ?? 0, percent === null ? 0 : 3))}%` }} />
        </span>
      </Link>
    </WithTooltip>
  );
}

/* ------------------------------------------------------------------ */
/* Columns                                                             */
/* ------------------------------------------------------------------ */

export function buildCompanyColumns(rowMenu: (summary: CompanySummary) => ActionMenuItem[]): Array<DataTableColumn<CompanySummary>> {
  return [
    { id: "company", header: "Company", sortField: "name", hideable: false, className: "px-3", cell: (summary) => <CompanyCell summary={summary} /> },
    { id: "plan", header: "Plan", className: "px-3", cell: (summary) => <PlanCell summary={summary} /> },
    { id: "owner", header: "Owner", className: "px-3", hideBelow: 1320, cell: (summary) => <OwnerCell summary={summary} /> },
    { id: "users", header: "Users", align: "right", className: "px-2", hideBelow: 1400, cell: (summary) => <CountLink summary={summary} section="users" value={summary.counts.users} /> },
    { id: "clients", header: "Clients", align: "right", className: "px-2", hideBelow: 1500, cell: (summary) => <CountLink summary={summary} section="clients" value={summary.counts.clients} /> },
    {
      id: "connections",
      header: "Connections",
      align: "right",
      className: "px-3",
      hideBelow: 1600,
      cell: (summary) => (
        <CountLink
          summary={summary}
          section="integrations"
          value={summary.counts.connections}
          sub={summary.counts.attentionConnections > 0 ? `${summary.counts.attentionConnections} need attention` : undefined}
          subTone={summary.counts.attentionConnections > 0 ? "warning" : undefined}
        />
      ),
    },
    { id: "usage", header: "Usage", sortField: "usage", className: "px-3", cell: (summary) => <UsageCell summary={summary} /> },
    {
      id: "billing",
      header: "Billing",
      className: "px-3",
      cell: (summary) => (
        <Link href={companySectionHref(summary.company.id, "billing")} onClick={stop} className="inline-block">
          <BillingStatusBadge status={summary.billingStatus} />
        </Link>
      ),
    },
    {
      id: "health",
      header: "Health",
      className: "px-3",
      cell: (summary) => (
        <Link href={`${ROUTES.superAdmin.company(summary.company.id)}#needs-attention`} onClick={stop} className="inline-block">
          <HealthBadge health={summary.health} />
        </Link>
      ),
    },
    {
      id: "lastActive",
      header: "Last active",
      sortField: "lastActiveAt",
      className: "px-3",
      hideBelow: 1720,
      cell: (summary) => <span className="whitespace-nowrap text-2xs text-muted-foreground">{relative(summary.company.lastActiveAt)}</span>,
    },
    { id: "mrr", header: "MRR", align: "right", sortField: "mrr", defaultHidden: true, cell: (summary) => <span className="tabular">{formatMrr(summary.mrrMinor, summary.currency)}</span> },
    { id: "subscription", header: "Subscription", defaultHidden: true, cell: (summary) => <SubscriptionStatusBadge status={summary.subscriptionStatus} /> },
    { id: "account", header: "Account", defaultHidden: true, cell: (summary) => <AccountStatusBadge status={summary.company.accountStatus} /> },
    { id: "created", header: "Created", sortField: "createdAt", defaultHidden: true, cell: (summary) => <span className="whitespace-nowrap text-2xs text-muted-foreground">{formatDate(summary.company.createdAt)}</span> },
    {
      id: "accountManager",
      header: "Account manager",
      defaultHidden: true,
      cell: (summary) => <span className="whitespace-nowrap text-[0.8125rem]">{summary.internalOwners.accountManager?.name ?? <span className="text-muted-foreground">Unassigned</span>}</span>,
    },
    {
      id: "tags",
      header: "Internal tags",
      defaultHidden: true,
      cell: (summary) => <span className="text-2xs text-muted-foreground">{summary.company.internalTags.join(", ") || "-"}</span>,
    },
    {
      id: "actions",
      header: <span className="sr-only">Actions</span>,
      hideable: false,
      align: "right",
      width: "w-12",
      className: "px-2",
      cell: (summary) => <ActionMenu items={rowMenu(summary)} label={`Actions for ${summary.company.name}`} />,
    },
  ];
}

/* ------------------------------------------------------------------ */
/* Mobile cards                                                        */
/* ------------------------------------------------------------------ */

export function CompanyCards({
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
}: {
  rows: CompanySummary[];
  isLoading: boolean;
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  onOpen: (summary: CompanySummary) => void;
  rowMenu: (summary: CompanySummary) => ActionMenuItem[];
  pagination: PaginationMeta | undefined;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  emptyState: ReactNode;
}) {
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
        const selected = selectedIds.includes(summary.company.id);
        return (
          <article
            key={summary.company.id}
            className={cn("rounded-sm border bg-card p-3 shadow-xs", selected ? "border-primary/40 bg-primary-subtle/40" : "border-border")}
          >
            <div className="flex items-start gap-2.5">
              <Checkbox
                checked={selected}
                onCheckedChange={() => onSelectionChange(selected ? selectedIds.filter((id) => id !== summary.company.id) : [...selectedIds, summary.company.id])}
                aria-label={`Select ${summary.company.name}`}
                className="mt-1"
              />
              <button type="button" onClick={() => onOpen(summary)} className="min-w-0 flex-1 text-left">
                <CompanyCell summary={summary} />
              </button>
              <ActionMenu items={rowMenu(summary)} label={`Actions for ${summary.company.name}`} />
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <HealthBadge health={summary.health} />
              <BillingStatusBadge status={summary.billingStatus} />
              <SubscriptionStatusBadge status={summary.subscriptionStatus} />
            </div>
            <dl className="mt-2 grid grid-cols-4 gap-2 text-2xs">
              <div><dt className="text-muted-foreground">Plan</dt><dd className="font-medium text-foreground">{summary.plan.name}</dd></div>
              <div><dt className="text-muted-foreground">Users</dt><dd className="font-medium tabular text-foreground">{summary.counts.users}</dd></div>
              <div><dt className="text-muted-foreground">Clients</dt><dd className="font-medium tabular text-foreground">{summary.counts.clients}</dd></div>
              <div><dt className="text-muted-foreground">Usage</dt><dd className="font-medium tabular text-foreground">{summary.usage.utilization === null ? "-" : `${Math.round(summary.usage.utilization)}%`}</dd></div>
            </dl>
            <p className="mt-2 truncate text-2xs text-muted-foreground">
              {summary.owner.name} · active {relative(summary.company.lastActiveAt)}
            </p>
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
