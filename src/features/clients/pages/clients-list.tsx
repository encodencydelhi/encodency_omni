"use client";

import {
  ArchiveIcon,
  CircleCheckIcon,
  CirclePauseIcon,
  CirclePlayIcon,
  DownloadIcon,
  FolderIcon,
  MoreHorizontalIcon,
  PlusIcon,
  RotateCcwIcon,
  SearchXIcon,
  TriangleAlertIcon,
} from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { DataTable } from "@/components/shared/data-table/data-table";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useTableQueryState } from "@/hooks/use-table-query-state";
import { formatNumber } from "@/lib/utils/format";
import { CreateClientWizard } from "../components/client-create-wizard";
import { ClientFilterBar, CLIENT_FILTER_KEYS, buildClientQuery, type ClientFilterKey } from "../components/client-filters";
import { ClientCards, buildClientColumns } from "../components/clients-table";
import { ClientPreviewDrawer } from "../components/client-preview-drawer";
import { ClientKpiStrip } from "../components/kpi-strip";
import { ClientError, TableSkeleton } from "../components/states";
import { DemoTag } from "../components/status-badges";
import { useClientActions } from "../components/use-client-actions";
import { CLIENTS_MOCK_MODE, resolveClientBasePath } from "../data/config";
import { describeError, useClientMutations, useClientPortfolio, useClientsList } from "../data/hooks";
import { clientsRepository } from "../data/repository";
import type { ClientSummary } from "../data/types";
import { exportClientRows } from "../lib/csv-export";
import { rememberListQuery } from "../lib/list-query";

export function ClientsListPage({ basePath: propBasePath }: { basePath?: string } = {}) {
  const router = useRouter();
  const pathname = usePathname();
  const basePath = propBasePath ?? resolveClientBasePath(pathname);
  const searchParams = useSearchParams();
  const mutations = useClientMutations();
  const { capabilities, openFlow, rowMenu, dialogs } = useClientActions();

  const table = useTableQueryState({ filterKeys: CLIENT_FILTER_KEYS, defaultSort: { field: "createdAt", direction: "desc" } });
  const query = useMemo(() => buildClientQuery(table), [table]);

  const portfolio = useClientPortfolio();
  const list = useClientsList(query);
  const rows = useMemo(() => list.data?.data ?? [], [list.data]);

  // Selection belongs to the rows on screen: it is tagged with the query it was made under,
  // so a new page, filter or sort starts fresh without an effect to reset it.
  const queryKey = JSON.stringify(query);
  const [selection, setSelection] = useState<{ key: string; ids: string[] }>({ key: queryKey, ids: [] });
  const selectedIds = selection.key === queryKey ? selection.ids : [];
  const setSelectedIds = useCallback((ids: string[]) => setSelection({ key: queryKey, ids }), [queryKey]);
  const [creating, setCreating] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [exporting, setExporting] = useState(false);

  const search = searchParams.toString();
  useEffect(() => {
    rememberListQuery(search);
  }, [search]);

  // Older links (from Companies) carried `companyId`; the list's own key is `company`.
  useEffect(() => {
    const legacy = searchParams.get("companyId");
    if (!legacy) return;
    const params = new URLSearchParams(searchParams.toString());
    params.delete("companyId");
    if (!params.get("company")) params.set("company", legacy);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [pathname, router, searchParams]);

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

  const applyView = useCallback(
    (filters: Partial<Record<ClientFilterKey, string>>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const key of CLIENT_FILTER_KEYS) params.delete(key);
      params.delete("search");
      params.delete("page");
      for (const [key, value] of Object.entries(filters)) if (value) params.set(key, value);
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const selectedSummaries = rows.filter((row) => selectedIds.includes(row.client.id));
  const menu = useCallback((summary: ClientSummary) => rowMenu(summary, { onPreview: (item) => setPreview(item.client.id) }), [rowMenu, setPreview]);
  const columns = useMemo(() => buildClientColumns(menu, basePath), [menu, basePath]);

  const runExport = async (scope: { query?: typeof query; ids?: string[] }, filename: string) => {
    setExporting(true);
    try {
      const all = await clientsRepository.exportClients(scope);
      exportClientRows(all, filename);
      toast.success(`Exported ${formatNumber(all.length)} ${all.length === 1 ? "client" : "clients"}`);
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
          icon={FolderIcon}
          title="No clients yet"
          description="Client workspaces appear here as soon as a company creates one."
          action={capabilities.canCreateClient ? <Button onClick={() => setCreating(true)}><PlusIcon />Create Client</Button> : undefined}
        />
      );
    }
    if (query.health === "at_risk" && Object.keys(table.filters).length === 1 && !query.search) {
      return <EmptyState icon={CircleCheckIcon} title="No clients need attention" description="Every assessed client is healthy." action={<Button variant="outline" onClick={table.clearFilters}>View all clients</Button>} />;
    }
    return (
      <EmptyState
        icon={SearchXIcon}
        title="No clients match these filters"
        description="Try a broader search, or clear the filters to see every client."
        action={<Button variant="outline" onClick={table.clearFilters}>Clear Filters</Button>}
      />
    );
  })();

  const can = (action: "pause" | "resume" | "archive") => {
    if (action === "pause") return capabilities.canPauseClient && selectedSummaries.some((row) => row.workspace === "active");
    if (action === "resume") return capabilities.canResumeClient && selectedSummaries.some((row) => row.workspace === "paused");
    return capabilities.canArchiveClient && selectedSummaries.some((row) => row.workspace !== "archived");
  };

  const filterCompany = query.company;

  return (
    <div className="space-y-3">
      <PageHeader
        title="Clients"
        description="Monitor and manage client workspaces across all companies on OmniPlatform."
        meta={CLIENTS_MOCK_MODE ? <DemoTag>Demo data</DemoTag> : undefined}
        actions={
          <>
            {capabilities.canExportClientData ? (
              <Button variant="outline" size="sm" onClick={() => void runExport({}, "clients.csv")} disabled={exporting}>
                <DownloadIcon />
                Export
              </Button>
            ) : null}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon-sm" aria-label="More client actions">
                  <MoreHorizontalIcon />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => applyView({ health: "at_risk" })}>
                  <TriangleAlertIcon />
                  View Clients Needing Attention
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => applyView({ workspace: "paused" })}>
                  <CirclePauseIcon />
                  View Paused Clients
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => applyView({ workspace: "archived" })}>
                  <ArchiveIcon />
                  View Archived Clients
                </DropdownMenuItem>
                {CLIENTS_MOCK_MODE ? (
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
            {capabilities.canCreateClient ? (
              <Button size="sm" onClick={() => setCreating(true)}>
                <PlusIcon />
                Create Client
              </Button>
            ) : null}
          </>
        }
      />

      {failed ? (
        <ClientError subject="Clients" error={list.error ?? portfolio.error} onRetry={() => { void list.refetch(); void portfolio.refetch(); }} />
      ) : (
        <>
          <ClientKpiStrip portfolio={portfolio.data} />

          <div className="space-y-2 pt-1">
            <ClientFilterBar
              table={table}
              canExport={capabilities.canExportClientData}
              exporting={exporting}
              onExportFiltered={() => void runExport({ query: { ...query, page: undefined, pageSize: undefined } }, "clients-filtered.csv")}
              onQuickView={applyView}
            />

            {selectedIds.length > 0 ? (
              <div role="toolbar" aria-label="Bulk client actions" className="flex flex-wrap items-center gap-1.5 rounded-sm border border-primary/30 bg-primary-subtle/50 px-3 py-2">
                <span className="mr-1 text-[0.8125rem] font-medium text-foreground">{selectedIds.length} selected</span>
                {capabilities.canExportClientData ? (
                  <Button variant="outline" size="sm" onClick={() => void runExport({ ids: selectedIds }, "clients-selected.csv")} disabled={exporting}>
                    <DownloadIcon />
                    Export Selected
                  </Button>
                ) : null}
                {can("pause") ? (
                  <Button variant="outline" size="sm" onClick={() => openFlow({ kind: "pause", targets: selectedSummaries })}>
                    <CirclePauseIcon />
                    Pause Selected
                  </Button>
                ) : null}
                {can("resume") ? (
                  <Button variant="outline" size="sm" onClick={() => openFlow({ kind: "resume", targets: selectedSummaries })}>
                    <CirclePlayIcon />
                    Resume Selected
                  </Button>
                ) : null}
                {can("archive") ? (
                  <Button variant="outline" size="sm" className="text-danger" onClick={() => openFlow({ kind: "archive", targets: selectedSummaries })}>
                    <ArchiveIcon />
                    Archive Selected
                  </Button>
                ) : null}
                <Button variant="ghost" size="sm" className="ml-auto" onClick={() => setSelectedIds([])}>
                  Clear selection
                </Button>
              </div>
            ) : null}

            {list.error && !list.data ? (
              <ClientError subject="Clients" error={list.error} onRetry={() => void list.refetch()} />
            ) : (
              <>
                <div className="hidden min-[1180px]:block">
                  {list.isPending ? (
                    <TableSkeleton rows={8} columns={8} />
                  ) : (
                    <DataTable
                      columns={columns}
                      rows={rows}
                      getRowId={(summary) => summary.client.id}
                      isLoading={false}
                      isFetching={list.isFetching}
                      caption="Clients on OmniPlatform"
                      sort={table.sort}
                      onToggleSort={table.toggleSort}
                      pagination={list.data?.pagination}
                      onPageChange={table.setPage}
                      onPageSizeChange={table.setPageSize}
                      selection={{ selectedIds, onChange: setSelectedIds }}
                      onRowClick={(summary) => setPreview(summary.client.id)}
                      enableColumnVisibility
                      emptyState={emptyState}
                    />
                  )}
                </div>
                <div className="min-[1180px]:hidden">
                  <ClientCards
                    rows={rows}
                    isLoading={list.isPending}
                    selectedIds={selectedIds}
                    onSelectionChange={setSelectedIds}
                    onOpen={(summary) => setPreview(summary.client.id)}
                    rowMenu={menu}
                    pagination={list.data?.pagination}
                    onPageChange={table.setPage}
                    onPageSizeChange={table.setPageSize}
                    emptyState={emptyState}
                    basePath={basePath}
                  />
                </div>
              </>
            )}
          </div>
        </>
      )}

      <ClientPreviewDrawer clientId={previewId} fallback={rows.find((row) => row.client.id === previewId)} onClose={() => setPreview(null)} />
      <CreateClientWizard open={creating} initialCompanyId={filterCompany} onClose={() => setCreating(false)} />
      <ConfirmDialog
        open={confirmReset}
        onOpenChange={setConfirmReset}
        title="Reset demo data?"
        description="Every change made in this demo workspace during this session - created clients and companies, pauses, assignments and edits - is discarded and the original dataset is restored. This resets Companies too, because both modules share one dataset."
        confirmLabel="Reset demo data"
        variant="destructive"
        onConfirm={() => {
          void mutations
            .resetDemoData()
            .then(() => {
              setConfirmReset(false);
              setSelectedIds([]);
              toast.success("Demo data reset");
            })
            .catch((failure: unknown) => toast.error(describeError(failure).message));
        }}
      />
      {dialogs}
    </div>
  );
}
