"use client";

import {
  BanIcon,
  BellIcon,
  BuildingIcon,
  CircleCheckIcon,
  DownloadIcon,
  MoreHorizontalIcon,
  PlusIcon,
  RotateCcwIcon,
  SearchXIcon,
  SparklesIcon,
  TriangleAlertIcon,
  UploadIcon,
  UserCogIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { DataTable } from "@/components/shared/data-table/data-table";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ROUTES } from "@/config/routes";
import { useTableQueryState } from "@/hooks/use-table-query-state";
import { formatNumber } from "@/lib/utils/format";
import { CompanyCards, buildCompanyColumns } from "../components/companies-table";
import { CompanyFilterBar, FILTER_KEYS, buildCompanyQuery } from "../components/company-filters";
import { CompanyImportDialog } from "../components/company-import-dialog";
import { CompanyPreviewDrawer } from "../components/company-preview-drawer";
import { CreateCompanyWizard } from "../components/company-create-wizard";
import { KpiStrip, NeedsAttentionPanel, RecentSignupsPanel, TenantHealthPanel } from "../components/portfolio-panels";
import { SectionError, TableSkeleton } from "../components/states";
import { useCompanyActions } from "../components/use-company-actions";
import { COMPANIES_MOCK_MODE } from "../data/config";
import { describeError, useCompaniesList, useCompanyMutations, usePortfolio } from "../data/hooks";
import { companiesRepository } from "../data/repository";
import type { CompanySummary } from "../data/types";
import { downloadCsv } from "../lib/csv";
import { formatIsoDate } from "../lib/format";

const CSV_HEADERS = [
  "Company ID",
  "Company",
  "Domain",
  "Account status",
  "Subscription status",
  "Plan",
  "Billing cycle",
  "Billing status",
  "MRR (minor units)",
  "Currency",
  "Owner",
  "Owner email",
  "Users",
  "Clients",
  "Connections",
  "Highest utilisation %",
  "Health",
  "Created",
];

function exportRows(rows: CompanySummary[], filename: string) {
  downloadCsv(
    filename,
    CSV_HEADERS,
    rows.map((row) => [
      row.company.displayId,
      row.company.name,
      row.company.domain,
      row.company.accountStatus,
      row.subscriptionStatus,
      row.plan.name,
      row.plan.billingCycle,
      row.billingStatus,
      row.mrrMinor,
      row.currency,
      row.owner.name,
      row.owner.email,
      row.counts.users,
      row.counts.clients,
      row.counts.connections,
      row.usage.utilization,
      row.health.status,
      formatIsoDate(row.company.createdAt),
    ]),
  );
}

/** The tenant register: portfolio KPIs, what needs attention, and every company. */
export function CompaniesListPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const mutations = useCompanyMutations();
  const { capabilities, openFlow, rowMenu, dialogs } = useCompanyActions();

  const table = useTableQueryState({ filterKeys: FILTER_KEYS, defaultSort: { field: "createdAt", direction: "desc" } });
  const query = useMemo(() => buildCompanyQuery(table), [table]);

  const portfolio = usePortfolio();
  const list = useCompaniesList(query);
  const rows = useMemo(() => list.data?.data ?? [], [list.data]);

  // Selection belongs to the rows on screen: it is tagged with the query it was made
  // under, so a new page, filter or sort starts fresh without an effect to reset it.
  const queryKey = JSON.stringify(query);
  const [selection, setSelection] = useState<{ key: string; ids: string[] }>({ key: queryKey, ids: [] });
  const selectedIds = selection.key === queryKey ? selection.ids : [];
  const setSelectedIds = useCallback((ids: string[]) => setSelection({ key: queryKey, ids }), [queryKey]);
  const [creating, setCreating] = useState(false);
  const [importing, setImporting] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [exporting, setExporting] = useState(false);

  const previewId = searchParams.get("preview");
  const setPreview = useCallback(
    (id: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (id) params.set("preview", id);
      else params.delete("preview");
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const selectedSummaries = rows.filter((row) => selectedIds.includes(row.company.id));
  const columns = useMemo(() => buildCompanyColumns((summary) => rowMenu(summary, { onPreview: (item) => setPreview(item.company.id) })), [rowMenu, setPreview]);
  const cardMenu = useCallback((summary: CompanySummary) => rowMenu(summary, { onPreview: (item) => setPreview(item.company.id) }), [rowMenu, setPreview]);

  const extraTags = useMemo(() => [...new Set(rows.flatMap((row) => row.company.internalTags))], [rows]);

  const runExport = async (scope: { query?: typeof query; ids?: string[] }, filename: string) => {
    setExporting(true);
    try {
      const all = await companiesRepository.exportCompanies(scope);
      exportRows(all, filename);
      toast.success(`Exported ${formatNumber(all.length)} ${all.length === 1 ? "company" : "companies"}`);
    } catch (failure) {
      toast.error(describeError(failure, "The export could not be created.").message);
    } finally {
      setExporting(false);
    }
  };

  const failed = (list.error ?? portfolio.error) && !list.data && !portfolio.data;
  const hasFilters = table.activeFilterCount > 0;

  const emptyState = (() => {
    if (!hasFilters && portfolio.data && portfolio.data.total === 0) {
      return (
        <EmptyState
          icon={BuildingIcon}
          title="No companies yet"
          description="Organisations appear here as soon as they are created or complete onboarding."
          action={capabilities.canCreateCompany ? <Button onClick={() => setCreating(true)}><PlusIcon />Create company</Button> : undefined}
        />
      );
    }
    if (query.subscriptionStatus === "trialing") {
      return <EmptyState icon={SparklesIcon} title="No trial companies" description="No company is in a trial right now. New trials appear here." action={<Button variant="outline" onClick={table.clearFilters}>Clear filters</Button>} />;
    }
    if (query.health === "at_risk") {
      return <EmptyState icon={CircleCheckIcon} title="No companies need attention" description="Every assessed company is healthy." action={<Button variant="outline" onClick={table.clearFilters}>View all companies</Button>} />;
    }
    return (
      <EmptyState
        icon={SearchXIcon}
        title="No companies match these filters"
        description="Try a broader search, or clear the filters to see every company."
        action={<Button variant="outline" onClick={table.clearFilters}>Clear filters</Button>}
      />
    );
  })();

  const suspendable = selectedSummaries.filter((row) => row.company.accountStatus === "active");
  const reactivatable = selectedSummaries.filter((row) => row.company.accountStatus === "suspended");

  return (
    <div className="space-y-3">
      <PageHeader
        title="Companies"
        description="Manage organizations, subscriptions, usage and tenant health across OmniPlatform."
        actions={
          <>
            {capabilities.canExportCompanyData ? (
              <Button variant="outline" size="sm" onClick={() => void runExport({}, "companies.csv")} disabled={exporting}>
                <DownloadIcon />
                Export
              </Button>
            ) : null}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon-sm" aria-label="More company actions">
                  <MoreHorizontalIcon />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {capabilities.canCreateCompany ? (
                  <DropdownMenuItem onSelect={() => setImporting(true)}>
                    <UploadIcon />
                    Import Companies
                  </DropdownMenuItem>
                ) : null}
                <DropdownMenuItem asChild>
                  <Link href={`${ROUTES.superAdmin.companies}?health=at_risk`}>
                    <TriangleAlertIcon />
                    View Companies Needing Attention
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href={`${ROUTES.superAdmin.companies}?accountStatus=suspended`}>
                    <BanIcon />
                    View Suspended Companies
                  </Link>
                </DropdownMenuItem>
                {COMPANIES_MOCK_MODE ? (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onSelect={() => setConfirmReset(true)}>
                      <RotateCcwIcon />
                      Reset demo data
                    </DropdownMenuItem>
                  </>
                ) : null}
              </DropdownMenuContent>
            </DropdownMenu>
            {capabilities.canCreateCompany ? (
              <Button size="sm" onClick={() => setCreating(true)}>
                <PlusIcon />
                Create Company
              </Button>
            ) : null}
          </>
        }
      />

      {failed ? (
        <SectionError subject="Companies" error={list.error ?? portfolio.error} onRetry={() => { void list.refetch(); void portfolio.refetch(); }} />
      ) : (
        <>
          <KpiStrip portfolio={portfolio.data} />
          <TenantHealthPanel portfolio={portfolio.data} />

          <div className="space-y-2 pt-1">
            <CompanyFilterBar
              table={table}
              extraTags={extraTags}
              canExport={capabilities.canExportCompanyData}
              exporting={exporting}
              onExportFiltered={() => void runExport({ query: { ...query, page: undefined, pageSize: undefined } }, "companies-filtered.csv")}
            />

            {selectedIds.length > 0 ? (
              <div role="toolbar" aria-label="Bulk company actions" className="flex flex-wrap items-center gap-1.5 rounded-sm border border-primary/30 bg-primary-subtle/50 px-3 py-2">
                <span className="mr-1 text-[0.8125rem] font-medium text-foreground">{selectedIds.length} selected</span>
                {capabilities.canEditCompany ? (
                  <>
                    <Button variant="outline" size="sm" onClick={() => openFlow({ kind: "assign", targets: selectedSummaries })}>
                      <UserCogIcon />
                      Assign internal owner
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => openFlow({ kind: "notify", targets: selectedSummaries })}>
                      <BellIcon />
                      Send platform notification
                    </Button>
                  </>
                ) : null}
                {capabilities.canExportCompanyData ? (
                  <Button variant="outline" size="sm" onClick={() => void runExport({ ids: selectedIds }, "companies-selected.csv")} disabled={exporting}>
                    <DownloadIcon />
                    Export selected
                  </Button>
                ) : null}
                {capabilities.canSuspendCompany && suspendable.length > 0 ? (
                  <Button variant="outline" size="sm" className="text-danger" onClick={() => openFlow({ kind: "suspend", targets: selectedSummaries })}>
                    <BanIcon />
                    Suspend selected
                  </Button>
                ) : null}
                {capabilities.canReactivateCompany && reactivatable.length > 0 ? (
                  <Button variant="outline" size="sm" onClick={() => openFlow({ kind: "reactivate", targets: selectedSummaries })}>
                    <CircleCheckIcon />
                    Reactivate selected
                  </Button>
                ) : null}
                <Button variant="ghost" size="sm" className="ml-auto" onClick={() => setSelectedIds([])}>
                  Clear selection
                </Button>
              </div>
            ) : null}

            {list.error && !list.data ? (
              <SectionError subject="Companies" error={list.error} onRetry={() => void list.refetch()} />
            ) : (
              <>
                <div className="hidden min-[1180px]:block">
                  {list.isPending ? (
                    <TableSkeleton rows={8} columns={8} />
                  ) : (
                    <DataTable
                      columns={columns}
                      rows={rows}
                      getRowId={(summary) => summary.company.id}
                      isLoading={false}
                      isFetching={list.isFetching}
                      caption="Companies on OmniPlatform"
                      sort={table.sort}
                      onToggleSort={table.toggleSort}
                      pagination={list.data?.pagination}
                      onPageChange={table.setPage}
                      onPageSizeChange={table.setPageSize}
                      selection={{ selectedIds, onChange: setSelectedIds }}
                      onRowClick={(summary) => setPreview(summary.company.id)}
                      enableColumnVisibility
                      emptyState={emptyState}
                    />
                  )}
                </div>
                <div className="min-[1180px]:hidden">
                  <CompanyCards
                    rows={rows}
                    isLoading={list.isPending}
                    selectedIds={selectedIds}
                    onSelectionChange={setSelectedIds}
                    onOpen={(summary) => setPreview(summary.company.id)}
                    rowMenu={cardMenu}
                    pagination={list.data?.pagination}
                    onPageChange={table.setPage}
                    onPageSizeChange={table.setPageSize}
                    emptyState={emptyState}
                  />
                </div>
              </>
            )}
          </div>

          <div className="grid gap-1 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <NeedsAttentionPanel portfolio={portfolio.data} initialLimit={5} />
            </div>
            <RecentSignupsPanel companies={portfolio.data?.recentSignups} />
          </div>
        </>
      )}

      <CompanyPreviewDrawer
        companyId={previewId}
        fallback={rows.find((row) => row.company.id === previewId)}
        capabilities={capabilities}
        onOpenFlow={openFlow}
        onClose={() => setPreview(null)}
      />
      <CreateCompanyWizard open={creating} onClose={() => setCreating(false)} />
      <CompanyImportDialog open={importing} onClose={() => setImporting(false)} />
      <ConfirmDialog
        open={confirmReset}
        onOpenChange={setConfirmReset}
        title="Reset demo data?"
        description="Every change made in this demo workspace during this session - created companies, suspensions, plan changes and notes - is discarded and the original dataset is restored."
        confirmLabel="Reset demo data"
        variant="destructive"
        onConfirm={() => {
          void mutations.resetDemoData().then(() => {
            setConfirmReset(false);
            setSelectedIds([]);
            toast.success("Demo data reset");
          });
        }}
      />
      {dialogs}
    </div>
  );
}
