import Link from "next/link";
import { ChannelSummaryCell } from "@/components/shared/channel-summary-cell";
import type { DataTableColumn } from "@/components/shared/data-table/types";
import { EntityCell } from "@/components/shared/entity-cell";
import { StatusBadge } from "@/components/shared/status-badge";
import { UsageProgress } from "@/components/shared/usage-progress";
import { ROUTES } from "@/config/routes";
import { formatCurrency, formatDate, formatNumber, formatRelativeTime } from "@/lib/utils/format";
import { COMPANY_STATUS, type Company } from "@/types/domain/company";
import { PLAN_TIER } from "@/types/domain/plan";

/**
 * Column definitions for the companies table.
 *
 * Kept apart from the view so the table reads as configuration, and so the
 * same columns can be reused (or trimmed) by an embedded list later.
 */
export function buildCompanyColumns(
  renderActions: (company: Company) => React.ReactNode,
): Array<DataTableColumn<Company>> {
  return [
    {
      id: "company",
      header: "Company",
      sortField: "name",
      hideable: false,
      width: "min-w-56",
      cell: (company) => (
        <Link
          href={ROUTES.superAdmin.company(company.id)}
          className="block rounded-sm outline-offset-2"
          onClick={(event) => event.stopPropagation()}
        >
          <EntityCell
            name={company.name}
            shape="square"
            meta={`${company.industry} · ${company.country}`}
          />
        </Link>
      ),
    },
    {
      id: "status",
      header: "Status",
      sortField: "status",
      cell: (company) => <StatusBadge registry={COMPANY_STATUS} status={company.status} withDot />,
    },
    {
      id: "plan",
      header: "Plan",
      sortField: "planTier",
      cell: (company) => <StatusBadge registry={PLAN_TIER} status={company.planTier} />,
    },
    {
      id: "Clients",
      header: "Clients",
      sortField: "Clients",
      align: "right",
      cell: (company) => <span className="tabular">{formatNumber(company.counts.Clients)}</span>,
    },
    {
      id: "users",
      header: "Users",
      sortField: "users",
      align: "right",
      cell: (company) => <span className="tabular">{formatNumber(company.counts.users)}</span>,
    },
    {
      id: "channels",
      header: "Channels",
      cell: (company) => <ChannelSummaryCell channels={company.channels} />,
    },
    {
      id: "usage",
      header: "Usage",
      sortField: "usagePercent",
      width: "w-36",
      cell: (company) => <UsageProgress used={company.usagePercent} limit={100} compact />,
    },
    {
      id: "mrr",
      header: "MRR",
      align: "right",
      defaultHidden: true,
      cell: (company) => (
        <span className="tabular">
          {company.mrrMinor === 0 ? "—" : formatCurrency(company.mrrMinor, company.currency)}
        </span>
      ),
    },
    {
      id: "createdAt",
      header: "Created",
      sortField: "createdAt",
      defaultHidden: true,
      cell: (company) => (
        <span className="whitespace-nowrap text-muted-foreground">{formatDate(company.createdAt)}</span>
      ),
    },
    {
      id: "lastActivityAt",
      header: "Last activity",
      sortField: "lastActivityAt",
      cell: (company) => (
        <span className="whitespace-nowrap text-muted-foreground">
          {formatRelativeTime(company.lastActivityAt)}
        </span>
      ),
    },
    {
      id: "actions",
      header: <span className="sr-only">Actions</span>,
      hideable: false,
      align: "right",
      width: "w-12",
      cell: renderActions,
    },
  ];
}
