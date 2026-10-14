"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Download, ExternalLink, FileSearch, Link, RefreshCw, Search, TrendingUp } from "lucide-react";
import { Sheet, SheetBody, SheetContent, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  Card,
  DataTable,
  FilterSelect,
  KeyValue,
  Pagination,
  SearchInput,
  WButton,
  type Column,
  type SortState,
  usePagination,
  useSortedRows,
} from "../ui/kit";
import { EmptyState, LockedState, QueryErrorState, SkeletonStats, SkeletonTable } from "../ui/states";
import { useWebsiteWorkspace } from "../website-workspace";
import { useSearchConsole, useWebsitePages } from "../../data/hooks";
import { downloadFile, toCsv } from "../../data/selectors";
import type { PageRecord, SearchPageRow, SearchQueryRow } from "../../data/types";
import {
  DetailMetric,
  MetricGrid,
  PageHeader,
  PathLabel,
  UnavailableText,
  average,
  formatNumber,
  formatPct,
  formatPosition,
} from "./search-performance-ui";

type PositionFilter = "all" | "top3" | "top10" | "top20" | "beyond20";
type SortKey = "clicks" | "impressions" | "position" | "ctr";

function positionMatches(position: number, filter: PositionFilter) {
  if (filter === "top3") return position <= 3;
  if (filter === "top10") return position <= 10;
  if (filter === "top20") return position <= 20;
  if (filter === "beyond20") return position > 20;
  return true;
}

function relatedQueries(page: string, queries: SearchQueryRow[]) {
  const pathParts = page
    .toLowerCase()
    .split(/[/?#\-_]+/)
    .filter((part) => part.length > 3);
  return queries
    .filter((query) => pathParts.some((part) => query.query.toLowerCase().includes(part)))
    .sort((a, b) => b.clicks - a.clicks)
    .slice(0, 8);
}

function matchingAuditPage(row: SearchPageRow, pages: PageRecord[]) {
  return pages.find((page) => row.page === page.url || row.page.endsWith(page.path));
}

export function WebsiteBacklinkAnalysisPage() {
  const { clientId, navigate } = useWebsiteWorkspace();
  const searchConsole = useSearchConsole(clientId);
  const websitePages = useWebsitePages(clientId);
  const gscPages = searchConsole.data ?? [];
  const queries = searchConsole.queries ?? [];

  const [search, setSearch] = useState("");
  const [position, setPosition] = useState<PositionFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("clicks");
  const [sort, setSort] = useState<SortState>({ key: "clicks", direction: "desc" });
  const [selected, setSelected] = useState<SearchPageRow | null>(null);

  const filtered = useMemo(() => {
    return gscPages.filter((page) => {
      if (search && !page.page.toLowerCase().includes(search.toLowerCase())) return false;
      if (!positionMatches(page.position, position)) return false;
      return true;
    });
  }, [gscPages, search, position]);

  const columns = useMemo<Column<SearchPageRow>[]>(
    () => [
      { key: "page", header: "Landing page", primary: true, sortValue: (row) => row.page, cell: (row) => <PathLabel url={row.page} /> },
      { key: "clicks", header: "Clicks", align: "right", sortValue: (row) => row.clicks, cell: (row) => formatNumber(row.clicks) },
      { key: "impressions", header: "Impressions", align: "right", sortValue: (row) => row.impressions, cell: (row) => formatNumber(row.impressions) },
      { key: "ctr", header: "CTR", align: "right", sortValue: (row) => row.ctr, cell: (row) => formatPct(row.ctr) },
      { key: "position", header: "Avg position", align: "right", sortValue: (row) => row.position, cell: (row) => formatPosition(row.position) },
      { key: "previous", header: "Previous clicks", align: "right", cell: () => <UnavailableText>Not measured</UnavailableText> },
      { key: "change", header: "Click change", cell: () => <UnavailableText>Not available</UnavailableText> },
      {
        key: "visibility",
        header: "Search visibility",
        cell: (row) => (row.position <= 10 ? "Top 10" : row.position <= 20 ? "Top 20" : "Beyond 20"),
      },
    ],
    [],
  );

  const sorted = useSortedRows(filtered, columns, sort);
  const pagination = usePagination(sorted.length, 25);
  useEffect(() => pagination.reset(), [search, position, sortKey]);
  const rows = pagination.slice(sorted);

  const handleExport = () => {
    downloadFile(
      `organic-landing-pages-${new Date().toISOString().split("T")[0]}.csv`,
      toCsv(
        ["Landing Page", "Clicks", "Impressions", "CTR %", "Average Position"],
        filtered.map((row) => [row.page, row.clicks, row.impressions, row.ctr?.toFixed(2) ?? "", row.position?.toFixed(1) ?? ""]),
      ),
    );
    toast.success("Organic landing pages exported");
  };

  if (searchConsole.isLoading) {
    return (
      <div className="space-y-3">
        <SkeletonStats count={5} />
        <Card title="Organic landing pages">
          <SkeletonTable />
        </Card>
      </div>
    );
  }

  if (searchConsole.error) {
    return (
      <Card title="Organic Landing Pages">
        <QueryErrorState error={searchConsole.error} compact />
      </Card>
    );
  }

  if (!searchConsole.isLoading && gscPages.length === 0) {
    return (
      <LockedState
        title="Connect Google Search Console to view organic landing page data"
        body="Google Search Console provides verified landing pages, clicks, impressions, CTR and average positions. No sample organic traffic is shown here."
        ctaLabel="Open integrations"
        onCta={() => navigate("/admin/website/settings?section=integrations")}
      />
    );
  }

  return (
    <div className="space-y-3">
      <PageHeader
        title="Organic Landing Pages"
        subtitle="Understand which website pages attract organic Google Search traffic."
        actions={
          <>
            <WButton size="sm" icon={RefreshCw} onClick={() => void searchConsole.refetch()}>
              Refresh
            </WButton>
            <WButton size="sm" icon={Download} onClick={handleExport} disabled={filtered.length === 0}>
              Export
            </WButton>
          </>
        }
        note="These are Google Search Console clicks, impressions, CTR and average positions. They are not GA4 sessions and are not treated as equivalent traffic."
      />

      <MetricGrid
        metrics={[
          { label: "Total landing pages", value: formatNumber(filtered.length), icon: Link },
          { label: "Total clicks", value: formatNumber(filtered.reduce((sum, page) => sum + page.clicks, 0)), tone: "good", icon: TrendingUp },
          { label: "Total impressions", value: formatNumber(filtered.reduce((sum, page) => sum + page.impressions, 0)), icon: Search },
          { label: "Average CTR", value: formatPct(average(filtered.map((page) => page.ctr))), icon: TrendingUp },
          { label: "Average position", value: formatPosition(average(filtered.map((page) => page.position))), sub: "Lower is better", icon: TrendingUp },
        ]}
      />

      <Card title="Landing pages" subtitle="Click a row to inspect available Search Console details." bodyClassName="p-0">
        <div className="flex flex-wrap items-center gap-2 border-b border-[#EEF2F8] p-3">
          <SearchInput value={search} onChange={setSearch} placeholder="Search page URL" className="min-w-[240px] flex-1" />
          <FilterSelect
            label="Position"
            value={position}
            onChange={(value) => setPosition(value as PositionFilter)}
            options={[
              { value: "all", label: "All positions" },
              { value: "top3", label: "Top 3" },
              { value: "top10", label: "Top 10" },
              { value: "top20", label: "Top 20" },
              { value: "beyond20", label: "Beyond 20" },
            ]}
          />
          <FilterSelect
            label="Sort"
            value={sortKey}
            onChange={(value) => {
              const key = value as SortKey;
              setSortKey(key);
              setSort({ key, direction: key === "position" ? "asc" : "desc" });
            }}
            options={[
              { value: "clicks", label: "Sort by clicks" },
              { value: "impressions", label: "Sort by impressions" },
              { value: "position", label: "Sort by position" },
              { value: "ctr", label: "Sort by CTR" },
            ]}
          />
        </div>
        <DataTable
          columns={columns}
          rows={rows}
          getRowId={(row) => row.page}
          onRowClick={setSelected}
          sort={sort}
          onSortChange={setSort}
          caption="Organic landing pages table"
          empty={<EmptyState title="No landing pages found" body="Adjust the search or position filter to find matching pages." compact />}
          rowActions={(row) => (
            <WButton size="sm" icon={FileSearch} onClick={() => setSelected(row)}>
              Details
            </WButton>
          )}
        />
        <Pagination page={pagination.page} pageSize={pagination.pageSize} total={sorted.length} onPageChange={pagination.setPage} onPageSizeChange={pagination.setPageSize} />
      </Card>

      <LandingPageDrawer
        page={selected}
        queries={queries}
        auditPage={selected ? matchingAuditPage(selected, websitePages.data ?? []) : undefined}
        onClose={() => setSelected(null)}
        navigate={navigate}
      />
    </div>
  );
}

function LandingPageDrawer({
  page,
  queries,
  auditPage,
  onClose,
  navigate,
}: {
  page: SearchPageRow | null;
  queries: SearchQueryRow[];
  auditPage?: PageRecord;
  onClose: () => void;
  navigate: (href: string) => void;
}) {
  const related = page ? relatedQueries(page.page, queries) : [];
  return (
    <Sheet open={Boolean(page)} onOpenChange={(open) => (open ? undefined : onClose())}>
      <SheetContent className="w-full max-w-xl border-[#E6EBF4] bg-white p-0 sm:max-w-xl">
        <SheetHeader className="border-[#EEF2F8] px-5 py-4 pr-12">
          <span className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[#6B7A94]">Organic landing page</span>
          <SheetTitle className="truncate text-[15px] font-semibold text-[#111C3A]">{page?.page ?? "Page"}</SheetTitle>
        </SheetHeader>
        <SheetBody className="px-5 py-4">
          {page ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                <DetailMetric label="Clicks" value={formatNumber(page.clicks)} tone="good" />
                <DetailMetric label="Impressions" value={formatNumber(page.impressions)} />
                <DetailMetric label="CTR" value={formatPct(page.ctr)} />
                <DetailMetric label="Avg position" value={formatPosition(page.position)} />
              </div>
              <dl className="divide-y divide-[#F2F5FA] rounded-lg border border-[#E6EBF4] px-3">
                <KeyValue label="Previous clicks">Not measured</KeyValue>
                <KeyValue label="Click change">Not available</KeyValue>
                <KeyValue label="Search visibility">{page.position <= 10 ? "Top 10" : page.position <= 20 ? "Top 20" : "Beyond 20"}</KeyValue>
              </dl>
              <div>
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.05em] text-[#6B7A94]">Contributing queries</p>
                {related.length ? (
                  <dl className="divide-y divide-[#F2F5FA] rounded-lg border border-[#E6EBF4] px-3">
                    {related.map((query) => (
                      <KeyValue key={query.query} label={`${formatNumber(query.clicks)} clicks`}>
                        {query.query}
                      </KeyValue>
                    ))}
                  </dl>
                ) : (
                  <p className="rounded-lg border border-dashed border-[#DAE1EC] p-3 text-[12px] text-[#6B7A94]">
                    Query-to-page attribution is not independently available in the current response.
                  </p>
                )}
              </div>
              <div className="rounded-lg border border-[#E6EBF4] p-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[#6B7A94]">Historical charts</p>
                <p className="mt-1 text-[12px] text-[#4A5A73]">The current API response does not include per-page historical snapshots.</p>
              </div>
            </div>
          ) : null}
        </SheetBody>
        <SheetFooter className="flex-wrap gap-2 border-t border-[#EEF2F8] px-5 py-3">
          {page ? (
            <a
              href={page.page}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex h-8.5 items-center gap-1.5 rounded-md border border-[#DEE5EF] bg-white px-3 text-[12px] font-semibold text-[#28354C] hover:bg-[#F7FAFE]"
            >
              <ExternalLink className="size-3.5" /> Open page
            </a>
          ) : null}
          {auditPage ? (
            <WButton
              icon={FileSearch}
              onClick={() => {
                onClose();
                navigate(`/admin/website/pages/${encodeURIComponent(auditPage.id)}`);
              }}
            >
              Page audit
            </WButton>
          ) : null}
          <WButton onClick={onClose}>Close</WButton>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
