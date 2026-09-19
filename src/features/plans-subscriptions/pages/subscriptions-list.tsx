"use client";

import { DownloadIcon, Loader2Icon, SearchXIcon, SlidersHorizontalIcon, TimerIcon, CalendarClockIcon, LayersIcon } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { DataTable } from "@/components/shared/data-table/data-table";
import { EmptyState } from "@/components/shared/empty-state";
import { FilterSelect, type FilterOption } from "@/components/shared/filter-select";
import { PageHeader } from "@/components/shared/page-header";
import { SearchInput } from "@/components/shared/search-input";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetBody, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { StatCard, StatGrid } from "@/features/companies/components/primitives";
import { BILLING_STATUS_META } from "@/features/companies/data/config";
import { StatGridSkeleton, TableSkeleton } from "@/features/companies/components/states";
import { useTableQueryState } from "@/hooks/use-table-query-state";
import { formatNumber } from "@/lib/utils/format";
import { toStatusOptions } from "@/types/common";
import { DemoTag } from "../components/badges";
import { PlansError } from "../components/states";
import { SubscriptionPreviewDrawer } from "../components/subscription-preview-drawer";
import { SubscriptionCards, buildSubscriptionColumns } from "../components/subscription-table";
import { useSubscriptionActions } from "../components/use-subscription-actions";
import { CREATED_OPTIONS, PLANS_MOCK_MODE, RENEWAL_OPTIONS, SUBSCRIPTION_SORT_OPTIONS, routes } from "../data/config";
import { describeError, useSubscriptionFacets, useSubscriptions } from "../data/hooks";
import { plansRepository } from "../data/repository";
import type { SubscriptionListQuery, SubscriptionRow } from "../data/types";
import { exportSubscriptionRows } from "../lib/csv-export";

const FILTER_KEYS = ["company", "plan", "status", "cycle", "billing", "trialEnding", "renewal", "created", "version"] as const;
type FilterKey = (typeof FILTER_KEYS)[number];

const STATUS_OPTIONS: FilterOption[] = [
  { value: "current", label: "All current (not ended)" },
  { value: "paid", label: "Active paid" },
  { value: "active", label: "Active" },
  { value: "trialing", label: "Trialing" },
  { value: "past_due", label: "Past due" },
  { value: "paused", label: "Paused" },
  { value: "scheduled_cancellation", label: "Scheduled cancellation" },
  { value: "cancelled", label: "Cancelled" },
  { value: "expired", label: "Expired" },
  { value: "ended", label: "Cancelled or expired" },
];
const CYCLE_OPTIONS: FilterOption[] = [
  { value: "monthly", label: "Monthly" },
  { value: "annual", label: "Annual" },
];
const TRIAL_OPTIONS: FilterOption[] = [{ value: "1", label: "Ending within 7 days" }];
const VERSION_OPTIONS: FilterOption[] = [{ value: "legacy", label: "On an older plan version" }];

function SortSelect({ table }: { table: ReturnType<typeof useTableQueryState<FilterKey>> }) {
  const current = table.sort ? `${table.sort.field}:${table.sort.direction}` : "renewsAt:asc";
  const known = SUBSCRIPTION_SORT_OPTIONS.some((option) => option.value === current);
  return (
    <Select
      value={known ? current : ""}
      onValueChange={(value) => {
        const option = SUBSCRIPTION_SORT_OPTIONS.find((item) => item.value === value);
        if (option) table.setSort(option.field, option.direction);
      }}
    >
      <SelectTrigger size="sm" aria-label="Sort subscriptions" className="w-auto min-w-[10.5rem] gap-1.5">
        <span className="text-muted-foreground">Sort:</span>
        <SelectValue placeholder="Custom" />
      </SelectTrigger>
      <SelectContent>
        {SUBSCRIPTION_SORT_OPTIONS.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

/** The company subscription directory: table first, every filter in the URL. */
export function SubscriptionsListPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const actions = useSubscriptionActions();
  const { capabilities } = actions;
  const facets = useSubscriptionFacets();
  const table = useTableQueryState({ filterKeys: FILTER_KEYS, defaultSort: { field: "renewsAt", direction: "asc" } });

  const query = useMemo<SubscriptionListQuery>(
    () => ({ search: table.listParams.search, ...table.filters, sort: table.sort, page: table.page, pageSize: table.pageSize }),
    [table],
  );
  const list = useSubscriptions(query);
  const rows = useMemo(() => list.data?.data ?? [], [list.data]);
  const kpis = list.data?.kpis;
  const [exporting, setExporting] = useState(false);
  const [sheet, setSheet] = useState(false);

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

  const menu = useCallback((row: SubscriptionRow) => actions.menu(row, { onPreview: (item) => setPreview(item.id) }), [actions, setPreview]);
  const columns = useMemo(() => buildSubscriptionColumns(menu), [menu]);

  const filterDefs = useMemo(
    () => ({
      primary: [
        { key: "company" as const, label: "Company", options: (facets.data?.companies ?? []).map((item) => ({ value: item.id, label: item.name })) },
        { key: "plan" as const, label: "Plan", options: (facets.data?.plans ?? []).map((item) => ({ value: item.key, label: item.name })) },
        { key: "status" as const, label: "Status", options: STATUS_OPTIONS },
        { key: "cycle" as const, label: "Cycle", options: CYCLE_OPTIONS },
      ],
      secondary: [
        { key: "billing" as const, label: "Billing health", options: toStatusOptions(BILLING_STATUS_META) },
        { key: "trialEnding" as const, label: "Trial", options: TRIAL_OPTIONS },
        { key: "renewal" as const, label: "Renewal", options: RENEWAL_OPTIONS },
        { key: "created" as const, label: "Created", options: CREATED_OPTIONS },
        { key: "version" as const, label: "Version", options: VERSION_OPTIONS },
      ],
    }),
    [facets.data],
  );
  const secondaryActive = filterDefs.secondary.filter((def) => table.filters[def.key]).length;
  const hasFilters = table.activeFilterCount > 0;

  const renderFilter = (def: { key: FilterKey; label: string; options: FilterOption[] }, className?: string) => (
    <FilterSelect key={def.key} label={def.label} value={table.filters[def.key]} options={def.options} onChange={(value) => table.setFilter(def.key, value)} className={className} />
  );

  const runExport = async (scope: { query?: SubscriptionListQuery }, filename: string) => {
    setExporting(true);
    try {
      const all = await plansRepository.exportSubscriptions(scope);
      exportSubscriptionRows(all, filename);
      toast.success(`Exported ${formatNumber(all.length)} ${all.length === 1 ? "subscription" : "subscriptions"}`);
    } catch (failure) {
      toast.error(describeError(failure, "The export could not be created.").message);
    } finally {
      setExporting(false);
    }
  };

  const emptyState = (
    <EmptyState
      icon={hasFilters ? SearchXIcon : LayersIcon}
      title={hasFilters ? "No subscriptions match these filters" : "No subscriptions yet"}
      description={hasFilters ? "Try a broader search, or clear the filters." : "Company subscriptions appear here as soon as a company subscribes to a plan."}
      action={hasFilters ? <Button variant="outline" onClick={table.clearFilters}>Clear Filters</Button> : undefined}
    />
  );

  const link = (params: string) => `${routes.subscriptions}?${params}`;

  return (
    <div className="space-y-3">
      <PageHeader
        title="Company Subscriptions"
        description="Monitor subscription status, plan assignments, renewals, trials and company-specific entitlements."
        meta={PLANS_MOCK_MODE ? <DemoTag>Demo data</DemoTag> : undefined}
        actions={
          <>
            {capabilities.canExportSubscriptions ? (
              <Button variant="outline" size="sm" onClick={() => void runExport({}, "subscriptions.csv")} disabled={exporting}>
                <DownloadIcon />
                Export
              </Button>
            ) : null}
            <Button variant="outline" size="sm" onClick={() => table.setFilter("trialEnding", "1")}>
              <TimerIcon />
              Review Expiring Trials
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href={routes.changes("scheduled")}><CalendarClockIcon />Review Pending Changes</Link>
            </Button>
          </>
        }
      />

      {kpis ? (
        <StatGrid className="grid-cols-2 sm:grid-cols-3 xl:grid-cols-6">
          <StatCard compact label="Active Paid" value={formatNumber(kpis.activePaid)} hint="In good standing" tone="success" href={link("status=paid")} />
          <StatCard compact label="Trialing" value={formatNumber(kpis.trialing)} hint="Not counted as paid" tone="info" href={link("status=trialing")} />
          <StatCard compact label="Past Due" value={formatNumber(kpis.pastDue)} hint="Payment outstanding" tone="danger" href={link("status=past_due")} />
          <StatCard compact label="Scheduled Cancellation" value={formatNumber(kpis.scheduledCancellation)} hint="Still paying" tone="warning" href={link("status=scheduled_cancellation")} />
          <StatCard compact label="Cancelled / Expired" value={formatNumber(kpis.ended)} hint="Ended" href={link("status=ended")} />
          <StatCard compact label="Renewals Soon" value={formatNumber(kpis.renewalsSoon)} hint="Within 14 days" href={link("renewal=14d")} />
        </StatGrid>
      ) : (
        <StatGridSkeleton count={6} className="grid-cols-2 sm:grid-cols-3 xl:grid-cols-6" />
      )}

      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <SearchInput value={table.search} onChange={table.setSearch} placeholder="Search company, subscription ID or plan..." aria-label="Search subscriptions" className="w-full sm:w-[22rem]" />
          <div className="hidden flex-wrap items-center gap-1.5 lg:flex">
            {filterDefs.primary.map((def) => renderFilter(def))}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className={secondaryActive > 0 ? "border-primary/40 bg-primary-subtle" : undefined}>
                  <SlidersHorizontalIcon />
                  More filters
                  {secondaryActive > 0 ? <span className="rounded-sm bg-primary px-1 text-2xs text-primary-foreground tabular">{secondaryActive}</span> : null}
                </Button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-64 space-y-2">{filterDefs.secondary.map((def) => renderFilter(def, "w-full justify-between"))}</PopoverContent>
            </Popover>
          </div>
          <Button variant="outline" size="sm" className="lg:hidden" onClick={() => setSheet(true)}>
            <SlidersHorizontalIcon />
            Filters
            {table.activeFilterCount > 0 ? <span className="rounded-sm bg-primary px-1 text-2xs text-primary-foreground tabular">{table.activeFilterCount}</span> : null}
          </Button>
          <div className="ml-auto flex items-center gap-1.5">
            <SortSelect table={table} />
            {hasFilters ? <Button variant="ghost" size="sm" onClick={table.clearFilters}>Clear Filters</Button> : null}
            {capabilities.canExportSubscriptions ? (
              <Button variant="outline" size="sm" onClick={() => void runExport({ query: { ...query, page: undefined, pageSize: undefined } }, "subscriptions-filtered.csv")} disabled={exporting}>
                {exporting ? <Loader2Icon className="animate-spin" /> : <DownloadIcon />}
                <span className="hidden sm:inline">Export Filtered</span>
              </Button>
            ) : null}
          </div>
        </div>

        {list.error && !list.data ? (
          <PlansError subject="Subscriptions" error={list.error} onRetry={() => void list.refetch()} />
        ) : (
          <>
            <div className="hidden min-[1180px]:block">
              {list.isPending ? (
                <TableSkeleton rows={8} columns={7} />
              ) : (
                <DataTable
                  columns={columns}
                  rows={rows}
                  getRowId={(row) => row.id}
                  isLoading={false}
                  isFetching={list.isFetching}
                  caption="Company subscriptions"
                  sort={table.sort}
                  onToggleSort={table.toggleSort}
                  pagination={list.data?.pagination}
                  onPageChange={table.setPage}
                  onPageSizeChange={table.setPageSize}
                  onRowClick={(row) => setPreview(row.id)}
                  enableColumnVisibility
                  emptyState={emptyState}
                />
              )}
            </div>
            <div className="min-[1180px]:hidden">
              <SubscriptionCards rows={rows} isLoading={list.isPending} onOpen={(row) => setPreview(row.id)} rowMenu={menu} pagination={list.data?.pagination} onPageChange={table.setPage} onPageSizeChange={table.setPageSize} emptyState={emptyState} />
            </div>
          </>
        )}
      </div>

      <Sheet open={sheet} onOpenChange={setSheet}>
        <SheetContent side="bottom" className="max-h-[88dvh]">
          <SheetHeader><SheetTitle>Filter subscriptions</SheetTitle><SheetDescription>Results update as you choose.</SheetDescription></SheetHeader>
          <SheetBody className="space-y-2">{[...filterDefs.primary, ...filterDefs.secondary].map((def) => renderFilter(def, "w-full justify-between"))}</SheetBody>
          <SheetFooter>
            <Button variant="ghost" onClick={table.clearFilters}>Clear all</Button>
            <Button onClick={() => setSheet(false)}>Done</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <SubscriptionPreviewDrawer subscriptionId={previewId} actions={actions} onClose={() => setPreview(null)} />
      {actions.dialogs}
    </div>
  );
}
