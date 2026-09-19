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
import { BillingStatusBadge, SubscriptionStatusBadge } from "@/features/companies/components/status-badges";
import { daysUntil, relativeTime } from "@/features/companies/data/clock";
import { cn } from "@/lib/utils/cn";
import { formatDate, getInitials } from "@/lib/utils/format";
import type { PaginationMeta } from "@/types/api";
import { routes } from "../data/config";
import type { SubscriptionRow } from "../data/types";
import { money } from "../lib/money";
import { LegacyVersionTag, UsageRiskBadge } from "./badges";

const stop = (event: { stopPropagation: () => void }) => event.stopPropagation();

export function CompanyCell({ row }: { row: SubscriptionRow }) {
  return (
    <div className="flex min-w-0 max-w-[15rem] items-center gap-2.5">
      <Avatar className="size-8 shrink-0 rounded-sm">
        <AvatarFallback className="rounded-sm text-[11px] font-semibold">{getInitials(row.company.name)}</AvatarFallback>
      </Avatar>
      <div className="min-w-0">
        <Link href={routes.subscription(row.id)} onClick={stop} className="block truncate text-[0.8125rem] font-semibold text-foreground hover:text-primary hover:underline">
          {row.company.name}
        </Link>
        <p className="truncate text-2xs text-muted-foreground">{row.company.displayId} · {row.id}</p>
      </div>
    </div>
  );
}

function PlanCell({ row }: { row: SubscriptionRow }) {
  return (
    <div>
      <Link href={row.planMissing ? "#" : routes.plan(`plan_${row.planKey}`)} onClick={stop} className="block text-[0.8125rem] font-medium text-foreground hover:underline">
        {row.planName}
      </Link>
      <span className="flex items-center gap-1.5 text-2xs text-muted-foreground">
        v{row.planVersion} · <span className="capitalize">{row.billingCycle}</span>
        {row.isLegacyVersion ? <LegacyVersionTag version={row.planVersion} current={row.currentVersion} /> : null}
        {row.planMissing ? <span className="text-danger">Plan missing</span> : null}
      </span>
    </div>
  );
}

/** Renewal for paying subscriptions, trial end for trials, the end date for ended ones. */
export function PeriodCell({ row }: { row: SubscriptionRow }) {
  if (row.status === "cancelled" || row.status === "expired") {
    return <span className="text-2xs text-muted-foreground">Ended {formatDate(row.endedAt ?? row.renewsAt)}</span>;
  }
  const trial = row.status === "trialing" && row.trialEndsAt;
  const at = trial ? (row.trialEndsAt as string) : row.renewsAt;
  const days = daysUntil(at);
  return (
    <div className="whitespace-nowrap">
      <span className="block text-[0.8125rem] tabular text-foreground">{formatDate(at)}</span>
      <span className={cn("block text-2xs", trial && days <= 7 ? "font-medium text-warning" : "text-muted-foreground")}>
        {trial ? "Trial ends" : row.status === "scheduled_cancellation" ? "Ends" : "Renews"} {days < 0 ? `${-days}d ago` : days === 0 ? "today" : `in ${days}d`}
      </span>
    </div>
  );
}

export function buildSubscriptionColumns(rowMenu: (row: SubscriptionRow) => ActionMenuItem[]): Array<DataTableColumn<SubscriptionRow>> {
  return [
    { id: "company", header: "Company", sortField: "company", hideable: false, className: "px-3", cell: (row) => <CompanyCell row={row} /> },
    { id: "plan", header: "Plan / Version", className: "px-3", cell: (row) => <PlanCell row={row} /> },
    { id: "cycle", header: "Billing Cycle", className: "px-3", hideBelow: 1600, cell: (row) => <span className="text-[0.8125rem] capitalize">{row.billingCycle}</span> },
    {
      id: "status",
      header: "Subscription Status",
      className: "px-3",
      cell: (row) => (
        <div className="space-y-0.5">
          <SubscriptionStatusBadge status={row.status} />
          {row.pendingChanges > 0 && row.status !== "scheduled_cancellation" ? <span className="block text-2xs text-info">Change scheduled</span> : null}
        </div>
      ),
    },
    {
      id: "mrr",
      header: "MRR",
      align: "right",
      sortField: "mrr",
      className: "px-3",
      cell: (row) => <span className="tabular">{row.mrrMinor > 0 ? money(row.mrrMinor, row.currency) : row.status === "trialing" ? <span className="text-2xs text-muted-foreground">Trial</span> : "-"}</span>,
    },
    { id: "period", header: "Renewal / Trial End", sortField: "renewsAt", className: "px-3", cell: (row) => <PeriodCell row={row} /> },
    {
      id: "billing",
      header: "Billing Health",
      className: "px-3",
      hideBelow: 1500,
      cell: (row) => (
        <Link href={`${ROUTES.superAdmin.company(row.company.id)}/billing`} onClick={stop} className="inline-block">
          <BillingStatusBadge status={row.billingStatus} />
        </Link>
      ),
    },
    { id: "usage", header: "Usage", className: "px-3", hideBelow: 1600, cell: (row) => <UsageRiskBadge risk={row.usageRisk} /> },
    { id: "started", header: "Created", sortField: "startedAt", defaultHidden: true, cell: (row) => <span className="whitespace-nowrap text-2xs text-muted-foreground">{relativeTime(row.startedAt)}</span> },
    {
      id: "actions",
      header: <span className="sr-only">Actions</span>,
      hideable: false,
      align: "right",
      width: "w-12",
      className: "px-2",
      cell: (row) => <ActionMenu items={rowMenu(row)} label={`Actions for ${row.company.name}`} />,
    },
  ];
}

/** Narrow screens get cards instead of a horizontally scrolling table. */
export function SubscriptionCards({
  rows,
  isLoading,
  onOpen,
  rowMenu,
  pagination,
  onPageChange,
  onPageSizeChange,
  emptyState,
  selectedIds,
  onSelectionChange,
}: {
  rows: SubscriptionRow[];
  isLoading: boolean;
  onOpen: (row: SubscriptionRow) => void;
  rowMenu: (row: SubscriptionRow) => ActionMenuItem[];
  pagination: PaginationMeta | undefined;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  emptyState: ReactNode;
  selectedIds?: string[];
  onSelectionChange?: (ids: string[]) => void;
}) {
  if (isLoading) {
    return (
      <div className="space-y-1">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="space-y-2 rounded-sm border border-border bg-card p-3"><Skeleton className="h-4 w-40" /><Skeleton className="h-3 w-56" /><Skeleton className="h-3 w-32" /></div>
        ))}
      </div>
    );
  }
  if (rows.length === 0) return <div className="rounded-sm border border-border bg-card">{emptyState}</div>;

  return (
    <div className="space-y-1">
      {rows.map((row) => {
        const selected = selectedIds?.includes(row.id) ?? false;
        return (
          <article key={row.id} className={cn("rounded-sm border bg-card p-3 shadow-xs", selected ? "border-primary/40 bg-primary-subtle/40" : "border-border")}>
            <div className="flex items-start gap-2.5">
              {onSelectionChange ? (
                <Checkbox checked={selected} onCheckedChange={() => onSelectionChange(selected ? (selectedIds ?? []).filter((id) => id !== row.id) : [...(selectedIds ?? []), row.id])} aria-label={`Select ${row.company.name}`} className="mt-1" />
              ) : null}
              <button type="button" onClick={() => onOpen(row)} className="min-w-0 flex-1 text-left"><CompanyCell row={row} /></button>
              <ActionMenu items={rowMenu(row)} label={`Actions for ${row.company.name}`} />
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <SubscriptionStatusBadge status={row.status} />
              <BillingStatusBadge status={row.billingStatus} />
              <UsageRiskBadge risk={row.usageRisk} />
            </div>
            <dl className="mt-2 grid grid-cols-3 gap-2 text-2xs">
              <div><dt className="text-muted-foreground">Plan</dt><dd className="font-medium text-foreground">{row.planName} v{row.planVersion}</dd></div>
              <div><dt className="text-muted-foreground">MRR</dt><dd className="font-medium tabular text-foreground">{row.mrrMinor > 0 ? money(row.mrrMinor, row.currency, true) : "-"}</dd></div>
              <div><dt className="text-muted-foreground">{row.status === "trialing" ? "Trial ends" : "Renews"}</dt><dd className="font-medium text-foreground">{formatDate(row.status === "trialing" && row.trialEndsAt ? row.trialEndsAt : row.renewsAt)}</dd></div>
            </dl>
          </article>
        );
      })}
      {pagination ? (
        <div className="rounded-sm border border-border bg-card"><DataTablePagination pagination={pagination} onPageChange={onPageChange} onPageSizeChange={onPageSizeChange} /></div>
      ) : null}
    </div>
  );
}
