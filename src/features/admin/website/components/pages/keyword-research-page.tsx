"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Download, FileSearch, RefreshCw, Search, Target, TrendingUp } from "lucide-react";
import { Sheet, SheetBody, SheetContent, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  Card,
  Chip,
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
import { EmptyState, QueryErrorState, SkeletonStats, SkeletonTable } from "../ui/states";
import { useWebsiteWorkspace } from "../website-workspace";
import { useKeywordResearch, useWebsiteSeo } from "../../data/hooks";
import { downloadFile, toCsv } from "../../data/selectors";
import type { KeywordResearchData, SearchPageRow } from "../../data/types";
import {
  DetailMetric,
  MetricGrid,
  MovementChip,
  PageHeader,
  PathLabel,
  UnavailableText,
  average,
  formatNumber,
  formatPct,
  formatPosition,
} from "./search-performance-ui";

type IntentFilter = "all" | KeywordResearchData["intent"];
type PositionFilter = "all" | "top3" | "top10" | "top20" | "beyond20";
type SortKey = "position" | "clicks" | "impressions" | "ctr";

function positionMatches(position: number, filter: PositionFilter) {
  if (filter === "top3") return position <= 3;
  if (filter === "top10") return position <= 10;
  if (filter === "top20") return position <= 20;
  if (filter === "beyond20") return position > 20;
  return true;
}

function intentTone(intent: KeywordResearchData["intent"]) {
  return intent === "transactional" ? "warn" : intent === "commercial" ? "info" : intent === "navigational" ? "violet" : "good";
}

function associatedPages(query: string, pages: SearchPageRow[]) {
  const terms = query.toLowerCase().split(/\s+/).filter((part) => part.length > 2);
  return pages
    .filter((page) => terms.some((term) => page.page.toLowerCase().includes(term)))
    .sort((a, b) => b.clicks - a.clicks)
    .slice(0, 5);
}

export function WebsiteKeywordResearchPage() {
  const { clientId } = useWebsiteWorkspace();
  const keywords = useKeywordResearch(clientId);
  const seo = useWebsiteSeo(clientId);
  const keywordData = keywords.data ?? [];
  const searchPages = seo.data?.searchConsole?.pages ?? [];

  const [query, setQuery] = useState("");
  const [intent, setIntent] = useState<IntentFilter>("all");
  const [position, setPosition] = useState<PositionFilter>("all");
  const [volume, setVolume] = useState("all");
  const [sortKey, setSortKey] = useState<SortKey>("impressions");
  const [sort, setSort] = useState<SortState>({ key: "impressions", direction: "desc" });
  const [selected, setSelected] = useState<KeywordResearchData | null>(null);

  const intentOptions = useMemo(() => {
    const counts = keywordData.reduce<Record<string, number>>((acc, item) => {
      acc[item.intent] = (acc[item.intent] ?? 0) + 1;
      return acc;
    }, {});
    return [
      { value: "all", label: "All intents", count: keywordData.length },
      ...Object.entries(counts).map(([value, count]) => ({ value, label: value, count })),
    ];
  }, [keywordData]);

  const filtered = useMemo(() => {
    return keywordData.filter((item) => {
      if (query && !item.query.toLowerCase().includes(query.toLowerCase())) return false;
      if (intent !== "all" && item.intent !== intent) return false;
      if (!positionMatches(item.position, position)) return false;
      if (volume === "clicks" && item.clicks <= 0) return false;
      if (volume === "impressions" && item.impressions <= 0) return false;
      return true;
    });
  }, [keywordData, query, intent, position, volume]);

  const columns = useMemo<Column<KeywordResearchData>[]>(
    () => [
      {
        key: "keyword",
        header: "Keyword",
        primary: true,
        sortValue: (row) => row.query,
        cell: (row) => <span className="font-semibold text-[#1F2A44]">{row.query}</span>,
      },
      { key: "intent", header: "Intent", cell: (row) => <Chip tone={intentTone(row.intent)}>{row.intent}</Chip> },
      { key: "clicks", header: "Clicks", align: "right", sortValue: (row) => row.clicks, cell: (row) => formatNumber(row.clicks) },
      { key: "impressions", header: "Impressions", align: "right", sortValue: (row) => row.impressions, cell: (row) => formatNumber(row.impressions) },
      { key: "ctr", header: "CTR", align: "right", sortValue: (row) => row.ctr, cell: (row) => formatPct(row.ctr) },
      { key: "position", header: "Avg position", align: "right", sortValue: (row) => row.position, cell: (row) => formatPosition(row.position) },
      { key: "previous", header: "Previous", align: "right", cell: () => <UnavailableText>No previous-period data</UnavailableText> },
      { key: "change", header: "Change", cell: () => <UnavailableText>Not available</UnavailableText> },
      {
        key: "pages",
        header: "Associated pages",
        hideOnMobile: true,
        cell: (row) => {
          const pages = associatedPages(row.query, searchPages);
          return pages.length ? <PathLabel url={pages[0]!.page} /> : <UnavailableText>Not measured</UnavailableText>;
        },
      },
    ],
    [searchPages],
  );

  const sorted = useSortedRows(filtered, columns, sort);
  const pagination = usePagination(sorted.length, 25);
  useEffect(() => pagination.reset(), [query, intent, position, volume, sortKey]);

  const rows = pagination.slice(sorted);
  const avgCtr = average(filtered.map((item) => item.ctr));
  const hasSearchVolume = filtered.some((item) => item.searchVolume != null && item.searchVolume > 0);

  const handleExport = () => {
    downloadFile(
      "keyword-research.csv",
      toCsv(
        ["Keyword", "Intent", "Clicks", "Impressions", "CTR", "Average position", "Search volume"],
        filtered.map((item) => [
          item.query,
          item.intent,
          item.clicks,
          item.impressions,
          item.ctr,
          item.position,
          hasSearchVolume ? item.searchVolume ?? "" : "Not available",
        ]),
      ),
    );
    toast.success("Keywords exported");
  };

  if (keywords.isLoading) {
    return (
      <div className="space-y-3">
        <SkeletonStats count={5} />
        <Card title="Keyword research">
          <SkeletonTable />
        </Card>
      </div>
    );
  }

  if (keywords.error) {
    return (
      <Card title="Keyword Research">
        <QueryErrorState error={keywords.error} onRetry={() => void keywords.refetch()} />
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <PageHeader
        title="Keyword Research"
        subtitle="Discover search queries, analyze visibility and identify optimization opportunities."
        actions={
          <>
            <WButton size="sm" icon={RefreshCw} onClick={() => void keywords.refetch()}>
              Refresh
            </WButton>
            <WButton size="sm" icon={Download} onClick={handleExport} disabled={filtered.length === 0}>
              Export
            </WButton>
          </>
        }
        note="Clicks, impressions, CTR and average position come from Google Search Console. Search Console does not provide monthly keyword search volume, so volume is shown only when a genuine provider supplies it."
      />

      <MetricGrid
        metrics={[
          { label: "Total queries", value: formatNumber(filtered.length), sub: "Visible in current result set", icon: Search },
          { label: "Avg position", value: formatPosition(average(filtered.map((item) => item.position))), sub: "Lower is better", icon: TrendingUp },
          { label: "Total impressions", value: formatNumber(filtered.reduce((sum, item) => sum + item.impressions, 0)), icon: Target },
          { label: "Total clicks", value: formatNumber(filtered.reduce((sum, item) => sum + item.clicks, 0)), tone: "good", icon: Target },
          {
            label: "Average CTR",
            value: avgCtr == null ? "Not available" : formatPct(avgCtr),
            sub: hasSearchVolume ? `Volume ${formatNumber(filtered.reduce((sum, item) => sum + (item.searchVolume ?? 0), 0))}` : "Search volume not available",
            icon: TrendingUp,
          },
        ]}
      />

      <Card title="Keyword table" subtitle="Click a row to inspect available query data." bodyClassName="p-0">
        <div className="flex flex-wrap items-center gap-2 border-b border-[#EEF2F8] p-3">
          <SearchInput value={query} onChange={setQuery} placeholder="Search keyword" className="min-w-[220px] flex-1" />
          <FilterSelect label="Intent" value={intent} onChange={(value) => setIntent(value as IntentFilter)} options={intentOptions} />
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
            label="Volume"
            value={volume}
            onChange={setVolume}
            options={[
              { value: "all", label: "All traffic" },
              { value: "clicks", label: "Has clicks" },
              { value: "impressions", label: "Has impressions" },
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
              { value: "impressions", label: "Sort by impressions" },
              { value: "clicks", label: "Sort by clicks" },
              { value: "position", label: "Sort by position" },
              { value: "ctr", label: "Sort by CTR" },
            ]}
          />
        </div>
        <DataTable
          columns={columns}
          rows={rows}
          getRowId={(row) => row.query}
          onRowClick={setSelected}
          sort={sort}
          onSortChange={setSort}
          caption="Keyword research table"
          empty={<EmptyState title="No keywords found" body="Adjust the search or filters to find matching Google Search Console queries." compact />}
          rowActions={(row) => (
            <WButton size="sm" icon={FileSearch} onClick={() => setSelected(row)}>
              Details
            </WButton>
          )}
        />
        <Pagination page={pagination.page} pageSize={pagination.pageSize} total={sorted.length} onPageChange={pagination.setPage} onPageSizeChange={pagination.setPageSize} />
      </Card>

      <KeywordDrawer keyword={selected} pages={searchPages} onClose={() => setSelected(null)} />
    </div>
  );
}

function KeywordDrawer({
  keyword,
  pages,
  onClose,
}: {
  keyword: KeywordResearchData | null;
  pages: SearchPageRow[];
  onClose: () => void;
}) {
  const pageMatches = keyword ? associatedPages(keyword.query, pages) : [];
  return (
    <Sheet open={Boolean(keyword)} onOpenChange={(open) => (open ? undefined : onClose())}>
      <SheetContent className="w-full max-w-xl border-[#E6EBF4] bg-white p-0 sm:max-w-xl">
        <SheetHeader className="border-[#EEF2F8] px-5 py-4 pr-12">
          <Chip tone={keyword ? intentTone(keyword.intent) : "muted"}>{keyword?.intent ?? "Intent"}</Chip>
          <SheetTitle className="text-[15px] font-semibold text-[#111C3A]">{keyword?.query ?? "Keyword"}</SheetTitle>
        </SheetHeader>
        <SheetBody className="px-5 py-4">
          {keyword ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                <DetailMetric label="Current position" value={formatPosition(keyword.position)} />
                <DetailMetric label="Previous position" value="No previous-period data" tone="muted" />
                <DetailMetric label="Clicks" value={formatNumber(keyword.clicks)} tone="good" />
                <DetailMetric label="Impressions" value={formatNumber(keyword.impressions)} />
                <DetailMetric label="CTR" value={formatPct(keyword.ctr)} />
                <DetailMetric label="Search volume" value="Not available" tone="muted" />
              </div>
              <div className="rounded-lg border border-[#E6EBF4] p-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[#6B7A94]">Historical trend</p>
                <p className="mt-1 text-[12px] leading-relaxed text-[#4A5A73]">
                  Per-keyword historical snapshots are not available in the current API response. The table uses the current Search Console period only.
                </p>
              </div>
              <div>
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.05em] text-[#6B7A94]">Associated landing pages</p>
                {pageMatches.length ? (
                  <dl className="divide-y divide-[#F2F5FA] rounded-lg border border-[#E6EBF4] px-3">
                    {pageMatches.map((page) => (
                      <KeyValue key={page.page} label={`${formatNumber(page.clicks)} clicks`}>
                        <PathLabel url={page.page} />
                      </KeyValue>
                    ))}
                  </dl>
                ) : (
                  <p className="rounded-lg border border-dashed border-[#DAE1EC] p-3 text-[12px] text-[#6B7A94]">
                    No associated page is independently measured for this query in the current response.
                  </p>
                )}
              </div>
              <div className="rounded-lg bg-[#F7F9FC] p-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[#6B7A94]">SEO opportunities</p>
                <p className="mt-1 text-[12px] text-[#4A5A73]">
                  Improve pages where this query has high impressions and low CTR, or where average position is outside the top 10. AI recommendations appear here once integrated.
                </p>
              </div>
            </div>
          ) : null}
        </SheetBody>
        <SheetFooter className="border-t border-[#EEF2F8] px-5 py-3">
          <WButton onClick={onClose}>Close</WButton>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
