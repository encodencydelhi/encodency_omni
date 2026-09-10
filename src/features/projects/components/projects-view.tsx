"use client";

import { Building2Icon, ExternalLinkIcon, FolderIcon, SearchXIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { ActionMenu } from "@/components/shared/action-menu";
import { DataTable } from "@/components/shared/data-table/data-table";
import { EmptyState } from "@/components/shared/empty-state";
import { FilterBar } from "@/components/shared/filter-bar";
import { FilterSelect } from "@/components/shared/filter-select";
import { PageHeader } from "@/components/shared/page-header";
import { SearchInput } from "@/components/shared/search-input";
import { ROUTES } from "@/config/routes";
import { useCompanyRefs } from "@/features/companies/hooks/use-companies";
import { useTableQueryState } from "@/hooks/use-table-query-state";
import { formatNumber } from "@/lib/utils/format";
import { toStatusOptions } from "@/types/common";
import { PROJECT_STATUS, SEO_HEALTH_BAND, type Project, type ProjectFilters } from "@/types/domain/project";
import { useClients } from "../hooks/use-projects";
import { buildProjectColumns } from "./project-columns";

const FILTER_KEYS = [
  "status",
  "seoHealth",
  "companyId",
  "hasIntegrationIssue",
] as const satisfies ReadonlyArray<keyof ProjectFilters>;

const STATUS_OPTIONS = toStatusOptions(PROJECT_STATUS);
const SEO_OPTIONS = toStatusOptions(SEO_HEALTH_BAND);
const ISSUE_OPTIONS = [
  { value: "true", label: "Has a broken channel" },
  { value: "false", label: "All channels healthy" },
];

/**
 * Every brand across every organisation.
 *
 * The default sort is last activity, and the channel and SEO columns are
 * placed together, because the question this page answers is "which Clients
 * are quietly failing?".
 */
export function ClientsView() {
  const router = useRouter();

  const table = useTableQueryState({
    filterKeys: FILTER_KEYS,
    defaultSort: { field: "lastActivityAt", direction: "desc" },
  });

  const { data, isPending, isFetching, error, refetch } = useClients(table.listParams);
  const { data: companies } = useCompanyRefs();

  const companyOptions = useMemo(
    () => (companies ?? []).map((company) => ({ value: company.id, label: company.name })),
    [companies],
  );

  const columns = useMemo(
    () =>
      buildProjectColumns({
        renderActions: (project: Project) => (
          <ActionMenu
            label={`Actions for ${project.name}`}
            items={[
              {
                id: "company",
                label: "View company",
                icon: Building2Icon,
                onSelect: () => router.push(ROUTES.superAdmin.company(project.company.id)),
              },
              ...(project.websiteUrl
                ? [
                  {
                    id: "website",
                    label: "Open website",
                    icon: ExternalLinkIcon,
                    onSelect: () => window.open(project.websiteUrl ?? "", "_blank", "noopener"),
                  },
                ]
                : []),
            ]}
          />
        ),
      }),
    [router],
  );

  const total = data?.pagination.total;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Clients"
        description="Brands and business units across every organisation, with channel and SEO health."
        actions={
          total !== undefined ? (
            <span className="text-2xs text-muted-foreground">
              {formatNumber(total)} {total === 1 ? "project" : "Clients"}
            </span>
          ) : null
        }
      />

      <FilterBar
        search={
          <SearchInput
            value={table.search}
            onChange={table.setSearch}
            placeholder="Search project, organisation or domain…"
            aria-label="Search Clients"
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
              label="SEO"
              value={table.filters.seoHealth}
              options={SEO_OPTIONS}
              onChange={(value) => table.setFilter("seoHealth", value)}
            />
            <FilterSelect
              label="Channels"
              value={table.filters.hasIntegrationIssue}
              options={ISSUE_OPTIONS}
              onChange={(value) => table.setFilter("hasIntegrationIssue", value)}
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
        getRowId={(project) => project.id}
        isLoading={isPending}
        isFetching={isFetching}
        error={error}
        onRetry={() => void refetch()}
        caption="Clients across all organisations"
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
              title="No Clients match these filters"
              description="Adjust the search or clear the filters to see every project."
            />
          ) : (
            <EmptyState
              icon={FolderIcon}
              title="No Clients yet"
              description="Clients appear here once an organisation creates its first brand."
            />
          )
        }
      />
    </div>
  );
}
