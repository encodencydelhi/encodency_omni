import { KeyRoundIcon } from "lucide-react";
import Link from "next/link";
import type { DataTableColumn } from "@/components/shared/data-table/types";
import { EntityCell } from "@/components/shared/entity-cell";
import { StatusBadge } from "@/components/shared/status-badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ROUTES } from "@/config/routes";
import { formatDate, formatRelativeTime } from "@/lib/utils/format";
import { ORGANISATION_ROLE, USER_STATUS, type PlatformUser } from "@/types/domain/user";

interface UserColumnOptions {
  renderActions: (user: PlatformUser) => React.ReactNode;
  /** Omitted when the table already sits inside one company. */
  includeCompany?: boolean;
}

export function buildUserColumns({
  renderActions,
  includeCompany = true,
}: UserColumnOptions): Array<DataTableColumn<PlatformUser>> {
  const columns: Array<DataTableColumn<PlatformUser>> = [
    {
      id: "user",
      header: "User",
      sortField: "name",
      hideable: false,
      width: "min-w-56",
      cell: (user) => (
        <EntityCell
          name={user.name}
          meta={
            <span className="inline-flex items-center gap-1.5">
              {user.email}
              {user.mfaEnabled ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <KeyRoundIcon className="size-3 text-success" aria-label="MFA enabled" />
                  </TooltipTrigger>
                  <TooltipContent>Multi-factor authentication enabled</TooltipContent>
                </Tooltip>
              ) : null}
            </span>
          }
        />
      ),
    },
  ];

  if (includeCompany) {
    columns.push({
      id: "company",
      header: "Company",
      sortField: "company",
      cell: (user) => (
        <Link
          href={ROUTES.superAdmin.company(user.company.id)}
          onClick={(event) => event.stopPropagation()}
          className="truncate text-[0.8125rem] text-foreground underline-offset-4 hover:underline"
        >
          {user.company.name}
        </Link>
      ),
    });
  }

  columns.push(
    {
      id: "role",
      header: "Role",
      sortField: "role",
      cell: (user) => (
        <span className="whitespace-nowrap text-[0.8125rem] text-muted-foreground">
          {ORGANISATION_ROLE[user.role].label}
        </span>
      ),
    },
    {
      id: "status",
      header: "Status",
      sortField: "status",
      cell: (user) => <StatusBadge registry={USER_STATUS} status={user.status} withDot />,
    },
    {
      id: "lastLoginAt",
      header: "Last login",
      sortField: "lastLoginAt",
      cell: (user) => (
        <span className="whitespace-nowrap text-muted-foreground">
          {user.lastLoginAt ? formatRelativeTime(user.lastLoginAt) : "Never"}
        </span>
      ),
    },
    {
      id: "createdAt",
      header: "Created",
      sortField: "createdAt",
      defaultHidden: true,
      cell: (user) => (
        <span className="whitespace-nowrap text-muted-foreground">{formatDate(user.createdAt)}</span>
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
  );

  return columns;
}
