"use client";

import { ExternalLinkIcon, FolderIcon } from "lucide-react";
import { useMemo } from "react";
import { ActionMenu } from "@/components/shared/action-menu";
import { DataTable } from "@/components/shared/data-table/data-table";
import { EmptyState } from "@/components/shared/empty-state";
import { SearchInput } from "@/components/shared/search-input";
import { buildProjectColumns } from "@/features/projects/components/project-columns";
import { useTableQueryState } from "@/hooks/use-table-query-state";
import type { Project } from "@/types/domain/project";
import { useCompanyClients } from "../../hooks/use-companies";

const NO_FILTERS = [] as const;
export function CompanyClientsTab({ companyId }: { companyId: string }) {
  const table = useTableQueryState({
    filterKeys: NO_FILTERS,
    namespace: "prj",
    defaultSort: { field: "lastActivityAt", direction: "desc" },
  });

  const { data, isPending, isFetching, error, refetch } = useCompanyClients(
    companyId,
    table.listParams,
  );

  const columns = useMemo(
    () =>
      buildProjectColumns({
        includeCompany: false,
        renderActions: (project: Project) =>
          project.websiteUrl ? (
            <ActionMenu
              label={`Actions for ${project.name}`}
              items={[
                {
                  id: "website",
                  label: "Open website",
                  icon: ExternalLinkIcon,
                  onSelect: () => window.open(project.websiteUrl ?? "", "_blank", "noopener"),
                },
              ]}
            />
          ) : null,
      }),
    [],
  );

  return (
    <div className="space-y-4">
      <SearchInput
        value={table.search}
        onChange={table.setSearch}
        placeholder="Search Clients…"
        aria-label="Search Clients in this company"
        className="w-full sm:w-64"
      />

      <DataTable
        columns={columns}
        rows={data?.data ?? []}
        getRowId={(project) => project.id}
        isLoading={isPending}
        isFetching={isFetching}
        error={error}
        onRetry={() => void refetch()}
        caption="Clients in this company"
        sort={table.sort}
        onToggleSort={table.toggleSort}
        pagination={data?.pagination}
        onPageChange={table.setPage}
        emptyState={
          <EmptyState
            icon={FolderIcon}
            title="No Clients yet"
            description="This organisation has not created a brand on the platform."
          />
        }
      />
    </div>
  );
}
