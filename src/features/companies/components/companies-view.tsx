"use client";

import { Building2Icon, SearchXIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { DataTable } from "@/components/shared/data-table/data-table";
import { EmptyState } from "@/components/shared/empty-state";
import { FilterBar } from "@/components/shared/filter-bar";
import { FilterSelect } from "@/components/shared/filter-select";
import { PageHeader } from "@/components/shared/page-header";
import { SearchInput } from "@/components/shared/search-input";
import { ROUTES } from "@/config/routes";
import { useTableQueryState } from "@/hooks/use-table-query-state";
import { formatNumber } from "@/lib/utils/format";
import { toStatusOptions } from "@/types/common";
import { COMPANY_STATUS, type CompanyFilters } from "@/types/domain/company";
import { PLAN_TIER } from "@/types/domain/plan";
import { useCompanies } from "../hooks/use-companies";
import { buildCompanyColumns } from "./company-columns";
import { useCompanyActions } from "./use-company-actions";

const FILTER_KEYS = ["status", "planTier"] as const satisfies ReadonlyArray<keyof CompanyFilters>;

const STATUS_OPTIONS = toStatusOptions(COMPANY_STATUS);
const PLAN_OPTIONS = toStatusOptions(PLAN_TIER);

/**
 * The tenant register.
 *
 * All state — page, sort, search and filters — lives in the URL, so a view can
 * be shared with a colleague or reopened from a bookmark and look identical.
 */
export function CompaniesView() {
  const router = useRouter();

  const table = useTableQueryState({
    filterKeys: FILTER_KEYS,
    defaultSort: { field: "lastActivityAt", direction: "desc" },
  });

  const { data, isPending, isFetching, error, refetch } = useCompanies(table.listParams);
  const { renderActions, dialogs } = useCompanyActions();

  const columns = useMemo(() => buildCompanyColumns(renderActions), [renderActions]);

  const total = data?.pagination.total;
  const hasQuery = table.activeFilterCount > 0;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Companies"
        description="Every organisation on the platform, with the plan, usage and channel health behind it."
        actions={
          total !== undefined ? (
            <span className="text-2xs text-muted-foreground">
              {formatNumber(total)} {total === 1 ? "company" : "companies"}
            </span>
          ) : null
        }
      />

      <FilterBar
        search={
          <SearchInput
            value={table.search}
            onChange={table.setSearch}
            placeholder="Search name, contact or industry…"
            aria-label="Search companies"
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
              label="Plan"
              value={table.filters.planTier}
              options={PLAN_OPTIONS}
              onChange={(value) => table.setFilter("planTier", value)}
            />
          </>
        }
        activeFilterCount={table.activeFilterCount}
        onClearFilters={table.clearFilters}
      />

      <DataTable
        columns={columns}
        rows={data?.data ?? []}
        getRowId={(company) => company.id}
        isLoading={isPending}
        isFetching={isFetching}
        error={error}
        onRetry={() => void refetch()}
        caption="Companies on the EnCodency omniPlatform"
        sort={table.sort}
        onToggleSort={table.toggleSort}
        pagination={data?.pagination}
        onPageChange={table.setPage}
        onPageSizeChange={table.setPageSize}
        onRowClick={(company) => router.push(ROUTES.superAdmin.company(company.id))}
        enableColumnVisibility
        emptyState={
          hasQuery ? (
            <EmptyState
              icon={SearchXIcon}
              title="No companies match these filters"
              description="Try a broader search term, or clear the filters to see the full register."
            />
          ) : (
            <EmptyState
              icon={Building2Icon}
              title="No companies yet"
              description="Organisations appear here as soon as they complete onboarding."
            />
          )
        }
      />

      {dialogs}
    </div>
  );
}
