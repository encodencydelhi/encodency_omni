"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Download, FileSearch, RefreshCw, Search, Target, TrendingDown, TrendingUp } from "lucide-react";
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
import { EmptyState, QueryErrorState, SkeletonStats, SkeletonTable } from "../ui/states";
import { useWebsiteWorkspace } from "../website-workspace";
import { useKeywordResearch, useRankTracking } from "../../data/hooks";
import { downloadFile, toCsv } from "../../data/selectors";
import type { KeywordResearchData, RankTrackingData } from "../../data/types";
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
  getMovement,
} from "./search-performance-ui";

type MovementFilter = "all" | "improved" | "declined" | "unchanged" | "missing";
type PositionFilter = "all" | "top3" | "top10" | "top20" | "beyond20";
type SortKey = "current" | "previous" | "movement" | "clicks" | "impressions" | "ctr";

type RankRow = RankTrackingData & {
  clicks: number | null;
  impressions: number | null;
  ctr: number | null;
  lastDataDate: string | null;
};

function positionMatches(position: number, filter: PositionFilter) {
  if (filter === "top3") return position <= 3;
  if (filter === "top10") return position <= 10;
  if (filter === "top20") return position <= 20;
  if (filter === "beyond20") return position > 20;
  return true;
}

function movementMatches(row: RankRow, filter: MovementFilter) {
  const movement = getMovement(row.currentPosition, row.previousPosition);
  if (filter === "missing") return !movement;
  if (filter === "improved") return movement?.value != null && movement.value > 0;
  if (filter === "declined") return movement?.value != null && movement.value < 0;
  if (filter === "unchanged") return movement?.value === 0;
  return true;
}

function joinMetrics(rankData: RankTrackingData[], keywordData: KeywordResearchData[]): RankRow[] {
  const metrics = new Map(keywordData.map((item) => [item.query.toLowerCase(), item]));
  return rankData.map((row) => {
    const metric = metrics.get(row.keyword.toLowerCase());
    return {
      ...row,
      clicks: metric?.clicks ?? null,
      impressions: metric?.impressions ?? null,
      ctr: metric?.ctr ?? null,
      lastDataDate: row.history.at(-1)?.date ?? null,
    };
  });
}

export function WebsiteRankTrackingPage() {
  const { clientId } = useWebsiteWorkspace();
  const rankQuery = useRankTracking(clientId);
  const keywordQuery = useKeywordResearch(clientId);
  const rowsAll = useMemo(() => joinMetrics(rankQuery.data ?? [], keywordQuery.data ?? []), [rankQuery.data, keywordQuery.data]);

  const [search, setSearch] = useState("");
  const [position, setPosition] = useState<PositionFilter>("all");
  const [movement, setMovement] = useState<MovementFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("current");
  const [sort, setSort] = useState<SortState>({ key: "current", direction: "asc" });
  const [selected, setSelected] = useState<RankRow | null>(null);

  const filtered = useMemo(() => {
    return rowsAll.filter((row) => {
      if (search && !row.keyword.toLowerCase().includes(search.toLowerCase())) return false;
      if (!positionMatches(row.currentPosition, position)) return false;
      if (!movementMatches(row, movement)) return false;
      return true;
    });
  }, [rowsAll, search, position, movement]);

  const columns = useMemo<Column<RankRow>[]>(
    () => [
      { key: "keyword", header: "Keyword", primary: true, sortValue: (row) => row.keyword, cell: (row) => <span className="font-semibold text-[#1F2A44]">{row.keyword}</span> },
      { key: "current", header: "Current avg position", align: "right", sortValue: (row) => row.currentPosition, cell: (row) => formatPosition(row.currentPosition) },
      { key: "previous", header: "Previous avg position", align: "right", sortValue: (row) => row.previousPosition ?? 999, cell: (row) => formatPosition(row.previousPosition) },
      {
        key: "movement",
        header: "Position movement",
        sortValue: (row) => getMovement(row.currentPosition, row.previousPosition)?.value ?? -999,
        cell: (row) => <MovementChip current={row.currentPosition} previous={row.previousPosition} />,
      },
      { key: "clicks", header: "Clicks", align: "right", sortValue: (row) => row.clicks ?? -1, cell: (row) => formatNumber(row.clicks) },
      { key: "impressions", header: "Impressions", align: "right", sortValue: (row) => row.impressions ?? -1, cell: (row) => formatNumber(row.impressions) },
      { key: "ctr", header: "CTR", align: "right", sortValue: (row) => row.ctr ?? -1, cell: (row) => formatPct(row.ctr) },
      { key: "page", header: "Associated page", hideOnMobile: true, cell: (row) => (row.url ? <PathLabel url={row.url} /> : <UnavailableText>Not available</UnavailableText>) },
      { key: "last", header: "Last data date", hideOnMobile: true, cell: (row) => row.lastDataDate ?? <UnavailableText>Not available</UnavailableText> },
    ],
    [],
  );

  const sorted = useSortedRows(filtered, columns, sort);
  const pagination = usePagination(sorted.length, 25);
  useEffect(() => pagination.reset(), [search, position, movement, sortKey]);
  const rows = pagination.slice(sorted);

  const comparable = filtered.filter((row) => getMovement(row.currentPosition, row.previousPosition));
  const improved = comparable.filter((row) => getMovement(row.currentPosition, row.previousPosition)!.value > 0).length;
  const declined = comparable.filter((row) => getMovement(row.currentPosition, row.previousPosition)!.value < 0).length;
  const unchanged = comparable.filter((row) => getMovement(row.currentPosition, row.previousPosition)!.value === 0).length;

  const handleExport = () => {
    downloadFile(
      `rank-tracking-${new Date().toISOString().split("T")[0]}.csv`,
      toCsv(
        ["Keyword", "Current position", "Previous position", "Movement", "Clicks", "Impressions", "CTR", "Associated page", "Last data date"],
        filtered.map((row) => [
          row.keyword,
          row.currentPosition,
          row.previousPosition ?? "No previous-period data",
          getMovement(row.currentPosition, row.previousPosition)?.label ?? "No previous-period data",
          row.clicks ?? "",
          row.impressions ?? "",
          row.ctr ?? "",
          row.url ?? "",
          row.lastDataDate ?? "",
        ]),
      ),
    );
    toast.success("Rankings exported");
  };

  if (rankQuery.isLoading) {
    return (
      <div className="space-y-3">
        <SkeletonStats count={5} />
        <Card title="Rank tracking">
          <SkeletonTable />
        </Card>
      </div>
    );
  }

  if (rankQuery.error) {
    return (
      <Card title="Rank Tracking">
        <QueryErrorState error={rankQuery.error} onRetry={() => void rankQuery.refetch()} />
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <PageHeader
        title="Rank Tracking"
        subtitle="Monitor Google Search Console query positions and period-over-period changes."
        actions={
          <>
            <WButton size="sm" icon={RefreshCw} onClick={() => void rankQuery.refetch()}>
              Refresh
            </WButton>
            <WButton size="sm" icon={Download} onClick={handleExport} disabled={filtered.length === 0}>
              Export
            </WButton>
          </>
        }
        note="Ranking movement uses the correct direction: lower numerical position is better. Movement is counted only when both current and previous positions exist."
      />

      <MetricGrid
        metrics={[
          { label: "Queries with positions", value: formatNumber(filtered.length), icon: Target },
          { label: "Average position", value: formatPosition(average(filtered.map((row) => row.currentPosition))), sub: "Lower is better", icon: TrendingUp },
          { label: "Improved queries", value: formatNumber(improved), tone: "good", icon: TrendingUp },
          { label: "Declined queries", value: formatNumber(declined), tone: "bad", icon: TrendingDown },
          { label: "Unchanged queries", value: formatNumber(unchanged), tone: "muted", icon: Target },
        ]}
      />

      <Card title="Ranking performance" subtitle="Full-width query position table with period-over-period movement." bodyClassName="p-0">
        <div className="flex flex-wrap items-center gap-2 border-b border-[#EEF2F8] p-3">
          <SearchInput value={search} onChange={setSearch} placeholder="Search keyword" className="min-w-[220px] flex-1" />
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
            label="Movement"
            value={movement}
            onChange={(value) => setMovement(value as MovementFilter)}
            options={[
              { value: "all", label: "All movement" },
              { value: "improved", label: "Improved" },
              { value: "declined", label: "Declined" },
              { value: "unchanged", label: "Unchanged" },
              { value: "missing", label: "No previous data" },
            ]}
          />
          <FilterSelect
            label="Sort"
            value={sortKey}
            onChange={(value) => {
              const key = value as SortKey;
              setSortKey(key);
              setSort({ key, direction: key === "current" || key === "previous" ? "asc" : "desc" });
            }}
            options={[
              { value: "current", label: "Sort by current position" },
              { value: "previous", label: "Sort by previous position" },
              { value: "movement", label: "Sort by movement" },
              { value: "clicks", label: "Sort by clicks" },
              { value: "impressions", label: "Sort by impressions" },
              { value: "ctr", label: "Sort by CTR" },
            ]}
          />
        </div>
        <DataTable
          columns={columns}
          rows={rows}
          getRowId={(row) => row.keyword}
          onRowClick={setSelected}
          sort={sort}
          onSortChange={setSort}
          caption="Rank tracking table"
          empty={<EmptyState title="No ranking rows found" body="Adjust the search, position or movement filters to find matching queries." compact />}
          rowActions={(row) => (
            <WButton size="sm" icon={FileSearch} onClick={() => setSelected(row)}>
              Details
            </WButton>
          )}
        />
        <Pagination page={pagination.page} pageSize={pagination.pageSize} total={sorted.length} onPageChange={pagination.setPage} onPageSizeChange={pagination.setPageSize} />
      </Card>

      <RankDrawer row={selected} onClose={() => setSelected(null)} />
    </div>
  );
}

function RankDrawer({ row, onClose }: { row: RankRow | null; onClose: () => void }) {
  const movement = row ? getMovement(row.currentPosition, row.previousPosition) : null;
  return (
    <Sheet open={Boolean(row)} onOpenChange={(open) => (open ? undefined : onClose())}>
      <SheetContent className="w-full max-w-xl border-[#E6EBF4] bg-white p-0 sm:max-w-xl">
        <SheetHeader className="border-[#EEF2F8] px-5 py-4 pr-12">
          <span className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[#6B7A94]">Ranking detail</span>
          <SheetTitle className="text-[15px] font-semibold text-[#111C3A]">{row?.keyword ?? "Keyword"}</SheetTitle>
        </SheetHeader>
        <SheetBody className="px-5 py-4">
          {row ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                <DetailMetric label="Current position" value={formatPosition(row.currentPosition)} />
                <DetailMetric label="Previous position" value={formatPosition(row.previousPosition)} tone={row.previousPosition == null ? "muted" : "info"} />
                <DetailMetric label="Movement" value={movement?.label ?? "No previous-period data"} tone={movement?.tone ?? "muted"} />
                <DetailMetric label="Clicks" value={formatNumber(row.clicks)} tone="good" />
                <DetailMetric label="Impressions" value={formatNumber(row.impressions)} />
                <DetailMetric label="CTR" value={formatPct(row.ctr)} />
              </div>
              <dl className="divide-y divide-[#F2F5FA] rounded-lg border border-[#E6EBF4] px-3">
                <KeyValue label="Associated page">{row.url ? <PathLabel url={row.url} /> : "Not available"}</KeyValue>
                <KeyValue label="Last data date">{row.lastDataDate ?? "Not available"}</KeyValue>
                <KeyValue label="Click/impression change">Not available in current response</KeyValue>
              </dl>
              <div className="rounded-lg border border-[#E6EBF4] p-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[#6B7A94]">Historical data</p>
                {row.history.length ? (
                  <p className="mt-1 text-[12px] text-[#4A5A73]">
                    {row.history.length} historical position snapshot{row.history.length === 1 ? "" : "s"} are available for this keyword.
                  </p>
                ) : (
                  <p className="mt-1 text-[12px] text-[#4A5A73]">No comparable historical rank snapshots are available for this keyword.</p>
                )}
              </div>
              <div className="rounded-lg bg-[#F7F9FC] p-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[#6B7A94]">Optimization opportunities</p>
                <p className="mt-1 text-[12px] text-[#4A5A73]">
                  Prioritize queries with high impressions, weak CTR, or positions outside the top 10. AI insights appear here once integrated.
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
