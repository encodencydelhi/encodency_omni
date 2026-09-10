"use client";

import { UsersIcon } from "lucide-react";
import { useMemo } from "react";
import { DataTable } from "@/components/shared/data-table/data-table";
import { EmptyState } from "@/components/shared/empty-state";
import { SearchInput } from "@/components/shared/search-input";
import { buildUserColumns } from "@/features/users/components/user-columns";
import { useUserActions } from "@/features/users/components/use-user-actions";
import { useTableQueryState } from "@/hooks/use-table-query-state";
import { useCompanyUsers } from "../../hooks/use-companies";

const NO_FILTERS = [] as const;

/** Team members inside one organisation. */
export function CompanyUsersTab({ companyId }: { companyId: string }) {
  const table = useTableQueryState({
    filterKeys: NO_FILTERS,
    namespace: "usr",
    defaultSort: { field: "createdAt", direction: "desc" },
  });

  const { data, isPending, isFetching, error, refetch } = useCompanyUsers(companyId, table.listParams);
  const { renderActions, dialogs } = useUserActions({ includeCompanyLink: false });

  const columns = useMemo(
    () => buildUserColumns({ renderActions, includeCompany: false }),
    [renderActions],
  );

  return (
    <div className="space-y-4">
      <SearchInput
        value={table.search}
        onChange={table.setSearch}
        placeholder="Search team members…"
        aria-label="Search users in this company"
        className="w-full sm:w-64"
      />

      <DataTable
        columns={columns}
        rows={data?.data ?? []}
        getRowId={(user) => user.id}
        isLoading={isPending}
        isFetching={isFetching}
        error={error}
        onRetry={() => void refetch()}
        caption="Users in this company"
        sort={table.sort}
        onToggleSort={table.toggleSort}
        pagination={data?.pagination}
        onPageChange={table.setPage}
        emptyState={
          <EmptyState
            icon={UsersIcon}
            title="No team members yet"
            description="The owner has not invited anyone to this workspace."
          />
        }
      />

      {dialogs}
    </div>
  );
}
