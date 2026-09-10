"use client";

import { SearchXIcon, UsersIcon } from "lucide-react";
import { useMemo } from "react";
import { DataTable } from "@/components/shared/data-table/data-table";
import { EmptyState } from "@/components/shared/empty-state";
import { FilterBar } from "@/components/shared/filter-bar";
import { FilterSelect } from "@/components/shared/filter-select";
import { PageHeader } from "@/components/shared/page-header";
import { SearchInput } from "@/components/shared/search-input";
import { useCompanyRefs } from "@/features/companies/hooks/use-companies";
import { useTableQueryState } from "@/hooks/use-table-query-state";
import { formatNumber } from "@/lib/utils/format";
import { toStatusOptions } from "@/types/common";
import { ORGANISATION_ROLE, USER_STATUS, type UserFilters } from "@/types/domain/user";
import { useUsers } from "../hooks/use-users";
import { buildUserColumns } from "./user-columns";
import { useUserActions } from "./use-user-actions";

const FILTER_KEYS = ["status", "role", "companyId"] as const satisfies ReadonlyArray<keyof UserFilters>;

const STATUS_OPTIONS = toStatusOptions(USER_STATUS);
const ROLE_OPTIONS = toStatusOptions(ORGANISATION_ROLE);

/** Global user directory across every tenant. */
export function UsersView() {
  const table = useTableQueryState({
    filterKeys: FILTER_KEYS,
    defaultSort: { field: "createdAt", direction: "desc" },
  });

  const { data, isPending, isFetching, error, refetch } = useUsers(table.listParams);
  const { data: companies } = useCompanyRefs();
  const { renderActions, dialogs } = useUserActions();

  const columns = useMemo(() => buildUserColumns({ renderActions }), [renderActions]);

  const companyOptions = useMemo(
    () => (companies ?? []).map((company) => ({ value: company.id, label: company.name })),
    [companies],
  );

  const total = data?.pagination.total;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Users"
        description="Every person with access to a customer organisation, and the state of their account."
        actions={
          total !== undefined ? (
            <span className="text-2xs text-muted-foreground">
              {formatNumber(total)} {total === 1 ? "user" : "users"}
            </span>
          ) : null
        }
      />

      <FilterBar
        search={
          <SearchInput
            value={table.search}
            onChange={table.setSearch}
            placeholder="Search name, email or company…"
            aria-label="Search users"
            className="w-full sm:w-72"
          />
        }
        filters={
          <>
            <FilterSelect
              label="Status"
              value={table.filters.status}
              options={STATUS_OPTIONS}
              onChange={(value) => table.setFilter("status", value)}
            />
            <FilterSelect
              label="Role"
              value={table.filters.role}
              options={ROLE_OPTIONS}
              onChange={(value) => table.setFilter("role", value)}
            />
            <FilterSelect
              label="Company"
              value={table.filters.companyId}
              options={companyOptions}
              onChange={(value) => table.setFilter("companyId", value)}
            />
          </>
        }
        activeFilterCount={table.activeFilterCount}
        onClearFilters={table.clearFilters}
      />

      <DataTable
        columns={columns}
        rows={data?.data ?? []}
        getRowId={(user) => user.id}
        isLoading={isPending}
        isFetching={isFetching}
        error={error}
        onRetry={() => void refetch()}
        caption="Platform users across all organisations"
        sort={table.sort}
        onToggleSort={table.toggleSort}
        pagination={data?.pagination}
        onPageChange={table.setPage}
        onPageSizeChange={table.setPageSize}
        enableColumnVisibility
        emptyState={
          table.activeFilterCount > 0 ? (
            <EmptyState
              icon={SearchXIcon}
              title="No users match these filters"
              description="Adjust the search or clear the filters to see the full directory."
            />
          ) : (
            <EmptyState
              icon={UsersIcon}
              title="No users yet"
              description="People appear here once an organisation invites its team."
            />
          )
        }
      />

      {dialogs}
    </div>
  );
}
