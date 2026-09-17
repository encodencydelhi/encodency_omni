"use client";

/**
 * Performance — measured by loading pages ourselves, on a simulated connection.
 *
 * Every recommendation is advice for whoever maintains the website. There is no
 * "fix automatically" anywhere on this screen, because we cannot deploy to a
 * site we do not control.
 */

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Boxes,
  Download,
  FileStack,
  Gauge,
  Lightbulb,
  RefreshCw,
  TriangleAlert,
  Wrench,
  Zap,
  Image as ImageIcon,
  MousePointerClick,
  LayoutTemplate,
  Clock,
} from "lucide-react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { cn } from "@/lib/utils/cn";
import { useWebsitePerformance } from "../../data/hooks";
import {
  downloadFile,
  formatDate,
  formatMs,
  formatNumber,
  formatShortDate,
  formatWeight,
  scoreBand,
  toCsv,
  vitalLabel,
  vitalTone,
} from "../../data/selectors";
import type { CoreWebVital, PerformanceData, PerformanceRecommendation } from "../../data/types";
import {
  Card,
  Chip,
  DataTable,
  Meter,
  Pagination,
  ScoreDial,
  SubTabs,
  usePagination,
  useSortedRows,
  WButton,
  type Column,
  type SortState,
} from "../ui/kit";
import { AXIS_PROPS, ChartLegend, GRID_PROPS, makeTooltip, SERIES_COLORS, ShareBar } from "../ui/charts";
import { EmptyState, QueryErrorState, SkeletonBlock, SkeletonStats } from "../ui/states";
import { useUrlParams, useUrlState } from "../use-url-state";
import { useWebsiteWorkspace } from "../website-workspace";

type PerfTab = "overview" | "vitals" | "pages" | "resources" | "recommendations";

const TABS: { value: PerfTab; label: string }[] = [
  { value: "overview", label: "Overview" },
  { value: "vitals", label: "Core Web Vitals" },
  { value: "pages", label: "Pages" },
  { value: "resources", label: "Resources" },
  { value: "recommendations", label: "Recommendations" },
];

export function WebsitePerformancePage() {
  const { clientId, runScan, scan, openFixGuide } = useWebsiteWorkspace();
  const performance = useWebsitePerformance(clientId);
  const [tab, setTab] = useUrlState<PerfTab>("tab", "overview", TABS.map((entry) => entry.value));
  const [period, setPeriod] = useUrlState<"7d" | "30d">("period", "30d", ["7d", "30d"]);

  const trend = useMemo(() => {
    const rows = performance.data?.trend ?? [];
    return period === "7d" ? rows.slice(-7) : rows;
  }, [performance.data?.trend, period]);

  return (
    <div className="space-y-1">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#E6EBF4] bg-white p-2 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
        <SubTabs ariaLabel="Performance sections" value={tab} onChange={setTab} options={TABS} />
        <WButton
          size="sm"
          icon={RefreshCw}
          disabled={scan.isRunning}
          disabledReason="A scan is already running"
          onClick={() => runScan("performance")}
        >
          Run performance audit
        </WButton>
      </div>

      {performance.isLoading ? (
        <>
          <SkeletonStats count={6} />
          <SkeletonBlock lines={6} />
        </>
      ) : performance.error ? (
        <Card title="Performance">
          <QueryErrorState error={performance.error} onRetry={() => void performance.refetch()} />
        </Card>
      ) : performance.data ? (
        <>
          {tab === "overview" ? (
            <OverviewTab
              data={performance.data}
              trend={trend}
              period={period}
              onPeriodChange={setPeriod}
              onSeeRecommendations={() => setTab("recommendations")}
            />
          ) : null}
          {tab === "vitals" ? <VitalsTab data={performance.data} trend={trend} /> : null}
          {tab === "pages" ? <PagesTab data={performance.data} /> : null}
          {tab === "resources" ? <ResourcesTab data={performance.data} /> : null}
          {tab === "recommendations" ? (
            <RecommendationsTab data={performance.data} onFixGuide={openFixGuide} />
          ) : null}
        </>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */

function VitalTile({ vital }: { vital: CoreWebVital }) {
  const isGood = vital.band === "good";
  const isWarn = vital.band === "needs-improvement";

  const Icon = vital.key === "lcp" ? ImageIcon :
    vital.key === "inp" ? MousePointerClick :
      vital.key === "cls" ? LayoutTemplate :
        vital.key === "ttfb" ? Clock : Gauge;

  return (
    <div className="relative overflow-hidden rounded-xl border border-[#E6EBF4] bg-white p-3.5 shadow-sm transition-all hover:border-[#C9D6EA] hover:shadow-md flex flex-col h-full">
      <div className={cn("absolute inset-x-0 top-0 h-1 z-10", isGood ? "bg-[#10B981]" : isWarn ? "bg-[#F59E0B]" : "bg-[#EF4444]")} />

      <div className="flex flex-col gap-1.5 mt-0.5 relative z-10">
        <div className="flex justify-start">
          <Chip tone={vitalTone[vital.band]} dot className="shrink-0">
            {vitalLabel[vital.band]}
          </Chip>
        </div>
        <div className="min-w-0">
          <p className="text-[10px] leading-[1.3] font-bold uppercase tracking-wider text-[#64748B]">
            {vital.label}
          </p>
          <div className="mt-1 flex items-baseline gap-1.5">
            <p className="text-[26px] font-extrabold tracking-tight text-[#0F172A] leading-none">{vital.display.replace(/ (s|ms)$/, '')}</p>
            <span className="text-[12px] font-bold text-[#64748B]">{vital.key === "cls" ? "" : vital.key === "inp" ? "ms" : "s"}</span>
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-end pr-3 py-2 pointer-events-none">
        <Icon className={cn(
          "w-14 h-14 rotate-[-8deg] opacity-20",
          isGood ? "text-[#10B981]" : isWarn ? "text-[#F59E0B]" : "text-[#EF4444]"
        )} />
      </div>

      <div className="mt-auto space-y-2.5 relative z-10">
        <div className="flex h-2 w-full gap-[2px] overflow-hidden rounded-full bg-[#F1F5F9]" role="img" aria-label={`${vital.label} distribution`}>
          <span className="h-full rounded-l-full bg-[#10B981]" style={{ width: `${vital.distribution.good}%` }} />
          <span className="h-full bg-[#F59E0B]" style={{ width: `${vital.distribution.needsImprovement}%` }} />
          <span className="h-full rounded-r-full bg-[#EF4444]" style={{ width: `${vital.distribution.poor}%` }} />
        </div>

        <div className="flex items-center justify-between text-[10px] font-medium">
          <div className="flex gap-2">
            <span className="text-[#10B981] font-bold">{vital.distribution.good}%</span>
            <span className="text-[#F59E0B] font-bold">{vital.distribution.needsImprovement}%</span>
            <span className="text-[#EF4444] font-bold">{vital.distribution.poor}%</span>
          </div>
          <span className="text-[#94A3B8] font-semibold tracking-wide">
            ≤ {vital.thresholds.good}{vital.key === "cls" ? "" : vital.key === "inp" ? "ms" : "s"}
          </span>
        </div>
      </div>
    </div>
  );
}

function OverviewTab({
  data,
  trend,
  period,
  onPeriodChange,
  onSeeRecommendations,
}: {
  data: PerformanceData;
  trend: PerformanceData["trend"];
  period: "7d" | "30d";
  onPeriodChange: (value: "7d" | "30d") => void;
  onSeeRecommendations: () => void;
}) {
  return (
    <div className="space-y-1">
      <div className="grid gap-1 xl:grid-cols-[minmax(0,1fr)_minmax(0,2.2fr)]">
        <Card
          title="OmniPlatform Performance score"
          icon={Gauge}
          subtitle="Composite of lab measurements"
          bodyClassName="p-2.5"
        >
          <div className="grid grid-cols-[1fr_1fr] items-stretch gap-2.5">
            <div className="flex flex-col items-center justify-center gap-1 rounded-xl border border-[#E6EBF4] bg-gradient-to-br from-[#FAFCFF] to-[#F1F5F9] p-2.5 shadow-sm">
              <ScoreDial value={data.score} tone={scoreBand(data.score)} size={68} label={`Performance ${data.score}`} />
              <div className="flex flex-col items-center text-center mt-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#64748B] mb-0.5">Overall Score</p>
              </div>
            </div>
            <div className="flex flex-col justify-center gap-1">
              <div className="flex items-center justify-between rounded-lg bg-white py-1 px-2.5 border border-[#F1F5F9] shadow-sm">
                <span className="text-[11px] font-semibold text-[#475569]">Change vs previous</span>
                <span className="text-[11.5px] font-bold text-[#0F172A]">
                  {data.scoreDelta >= 0 ? "+" : ""}
                  {data.scoreDelta}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-white py-1 px-2.5 border border-[#F1F5F9] shadow-sm">
                <span className="text-[11px] font-semibold text-[#475569]">Avg page weight</span>
                <span className="text-[11.5px] font-bold text-[#0F172A]">{formatWeight(data.avgPageWeightKb)}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-white py-1 px-2.5 border border-[#F1F5F9] shadow-sm">
                <span className="text-[11px] font-semibold text-[#475569]">Avg requests</span>
                <span className="text-[11.5px] font-bold text-[#0F172A]">{data.avgRequests}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-[#F0FDF4] py-1 px-2.5 border border-[#DCFCE7]">
                <span className="text-[11px] font-semibold text-[#15803D]">Pages measured</span>
                <span className="text-[11.5px] font-bold text-[#166534]">{data.pages.length}</span>
              </div>
            </div>
          </div>
          <WButton className="mt-2.5 w-full" tone="primary" icon={Lightbulb} onClick={onSeeRecommendations}>
            See {data.recommendations.length} recommendations
          </WButton>
        </Card>

        <div className="grid grid-cols-2 gap-1 lg:grid-cols-4 xl:grid-cols-2 2xl:grid-cols-4">
          {data.vitals.map((vital) => (
            <VitalTile key={vital.key} vital={vital} />
          ))}
        </div>
      </div>

      <Card
        title="Performance trend"
        icon={Zap}
        subtitle="OmniPlatform performance score after each scan"
        action={
          <div className="flex items-center gap-1">
            {(["7d", "30d"] as const).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => onPeriodChange(value)}
                aria-pressed={period === value}
                className={cn(
                  "cursor-pointer rounded-md px-2 py-0.5 text-[10.5px] font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]/35",
                  period === value ? "bg-[#EAF2FE] text-[#1D4ED8]" : "text-[#64748B] hover:bg-[#F1F4F9]",
                )}
              >
                {value}
              </button>
            ))}
          </div>
        }
        bodyClassName="p-3.5 pt-2"
      >
        <ChartLegend className="mb-1" items={[{ key: "score", label: "Performance score", color: SERIES_COLORS[0] }]} />
        <div className="h-[200px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trend} margin={{ top: 6, right: 8, left: -22, bottom: 0 }}>
              <CartesianGrid {...GRID_PROPS} />
              <XAxis dataKey="date" {...AXIS_PROPS} tickFormatter={formatShortDate} minTickGap={26} />
              <YAxis {...AXIS_PROPS} domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} width={44} />
              <Tooltip content={makeTooltip((entry) => entry.value, (label) => formatDate(label))} />
              <Line
                type="monotone"
                dataKey="score"
                name="Performance score"
                stroke={SERIES_COLORS[0]}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, strokeWidth: 2, stroke: "#fff" }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}

function VitalsTab({ data, trend }: { data: PerformanceData; trend: PerformanceData["trend"] }) {
  return (
    <div className="space-y-1">
      <div className="grid grid-cols-1 gap-1 sm:grid-cols-2 xl:grid-cols-4">
        {data.vitals.map((vital) => (
          <VitalTile key={vital.key} vital={vital} />
        ))}
      </div>

      <div className="grid gap-1 lg:grid-cols-2">
        <Card title="LCP over time" icon={Zap} subtitle="Seconds — lower is better" bodyClassName="p-3.5 pt-2">
          <div className="h-[190px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend} margin={{ top: 6, right: 8, left: -24, bottom: 0 }}>
                <CartesianGrid {...GRID_PROPS} />
                <XAxis dataKey="date" {...AXIS_PROPS} tickFormatter={formatShortDate} minTickGap={26} />
                <YAxis {...AXIS_PROPS} width={40} />
                <Tooltip content={makeTooltip((entry) => `${entry.value.toFixed(2)} s`, (label) => formatDate(label))} />
                <Line type="monotone" dataKey="lcp" name="LCP" stroke={SERIES_COLORS[2]} strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="INP over time" icon={Zap} subtitle="Milliseconds — lower is better" bodyClassName="p-3.5 pt-2">
          <div className="h-[190px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend} margin={{ top: 6, right: 8, left: -18, bottom: 0 }}>
                <CartesianGrid {...GRID_PROPS} />
                <XAxis dataKey="date" {...AXIS_PROPS} tickFormatter={formatShortDate} minTickGap={26} />
                <YAxis {...AXIS_PROPS} width={46} />
                <Tooltip content={makeTooltip((entry) => `${Math.round(entry.value)} ms`, (label) => formatDate(label))} />
                <Line type="monotone" dataKey="inp" name="INP" stroke={SERIES_COLORS[1]} strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <Card title="What these mean" icon={Gauge}>
        <ul className="grid gap-1 sm:grid-cols-2">
          {data.vitals.map((vital) => (
            <li key={vital.key} className="rounded-xl border border-[#E6EBF4] p-2.5">
              <p className="text-[12px] font-semibold text-[#28354C]">{vital.label}</p>
              <p className="mt-0.5 text-[11px] leading-relaxed text-[#6B7A94]">
                {vital.key === "lcp"
                  ? "How long until the largest thing on screen has rendered. Usually the hero image or headline."
                  : vital.key === "inp"
                    ? "How long the page takes to respond visibly after a tap or click."
                    : vital.key === "cls"
                      ? "How much the layout jumps while loading. Usually images or ads without reserved space."
                      : "How long the server takes to send the first byte — before the browser can do anything."}
              </p>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

function PagesTab({ data }: { data: PerformanceData }) {
  const router = useRouter();
  // Written in one update so the key does not get dropped by the direction.
  const { get, setMany } = useUrlParams();
  const sortKey = get("psort") ?? "score";
  const sortDir = get("pdir") === "desc" ? "desc" : "asc";

  const columns: Column<PerformanceData["pages"][number]>[] = [
    {
      key: "path",
      header: "Page",
      primary: true,
      sortValue: (row) => row.path,
      cell: (row) => <span className="truncate font-mono text-[11px] font-medium text-[#28354C]">{row.path}</span>,
    },
    {
      key: "score",
      header: "Score",
      align: "center",
      sortValue: (row) => row.score,
      cell: (row) => (
        <span className="inline-flex flex-col items-center gap-1">
          <b
            className={cn(
              "text-[12px] font-semibold",
              scoreBand(row.score) === "good"
                ? "text-[#0B7A55]"
                : scoreBand(row.score) === "warn"
                  ? "text-[#9A5B08]"
                  : "text-[#C0261F]",
            )}
          >
            {row.score}
          </b>
          <Meter value={row.score} tone={scoreBand(row.score)} className="w-10" label={`Score ${row.score}`} />
        </span>
      ),
    },
    {
      key: "lcp",
      header: "LCP",
      align: "right",
      sortValue: (row) => row.lcpMs,
      cell: (row) => (
        <span className={row.lcpMs > 2500 ? "font-semibold text-[#C0261F]" : ""}>{formatMs(row.lcpMs)}</span>
      ),
    },
    { key: "inp", header: "INP", align: "right", sortValue: (row) => row.inpMs, cell: (row) => formatMs(row.inpMs) },
    {
      key: "cls",
      header: "CLS",
      align: "right",
      sortValue: (row) => row.cls,
      cell: (row) => <span className={row.cls > 0.1 ? "font-semibold text-[#9A5B08]" : ""}>{row.cls.toFixed(3)}</span>,
    },
    { key: "ttfb", header: "TTFB", align: "right", sortValue: (row) => row.ttfbMs, cell: (row) => formatMs(row.ttfbMs) },
    {
      key: "weight",
      header: "Page weight",
      align: "right",
      sortValue: (row) => row.pageWeightKb,
      cell: (row) => formatWeight(row.pageWeightKb),
    },
  ];

  const sort: SortState = { key: sortKey, direction: sortDir };
  const sorted = useSortedRows(data.pages, columns, sort);
  const pagination = usePagination(sorted.length, 10);

  return (
    <Card
      title="Page performance"
      icon={FileStack}
      subtitle="Measured on a simulated 4G connection"
      action={
        <WButton
          size="sm"
          icon={Download}
          onClick={() => {
            downloadFile(
              "page-performance.csv",
              toCsv(
                ["Path", "Score", "LCP (ms)", "INP (ms)", "CLS", "TTFB (ms)", "Weight (KB)"],
                sorted.map((row) => [row.path, row.score, row.lcpMs, row.inpMs, row.cls, row.ttfbMs, row.pageWeightKb]),
              ),
            );
            toast.success("Page performance exported");
          }}
        >
          Export
        </WButton>
      }
      bodyClassName="p-0"
    >
      <DataTable
        columns={columns}
        rows={pagination.slice(sorted)}
        getRowId={(row) => row.pageId}
        sort={sort}
        onSortChange={(next) =>
          setMany({
            psort: next.key === "score" ? null : next.key,
            pdir: next.direction === "asc" ? null : next.direction,
          })
        }
        onRowClick={(row) => router.push(`/admin/website/pages/${encodeURIComponent(row.pageId)}?tab=performance`)}
        empty={<EmptyState title="No pages measured" body="Run a performance audit to measure these pages." />}
      />
      {sorted.length > 0 ? (
        <Pagination
          page={pagination.page}
          pageSize={pagination.pageSize}
          total={sorted.length}
          onPageChange={pagination.setPage}
          onPageSizeChange={pagination.setPageSize}
        />
      ) : null}
    </Card>
  );
}

function ResourcesTab({ data }: { data: PerformanceData }) {
  const total = data.resources.reduce((sum, row) => sum + row.weightKb, 0) || 1;

  return (
    <div className="grid gap-1 lg:grid-cols-2">
      <Card title="Weight by resource type" icon={Boxes} subtitle={`Average page total: ${formatWeight(total)}`}>
        <ShareBar
          ariaLabel="Average page weight by resource type"
          rows={data.resources.map((row, index) => ({
            label: `${row.label} · ${row.requests} requests`,
            value: formatWeight(row.weightKb),
            share: row.share,
            color: SERIES_COLORS[index % SERIES_COLORS.length] ?? "#2563EB",
          }))}
        />
      </Card>

      <Card
        title="Third-party scripts"
        icon={Boxes}
        subtitle="Loaded from other domains — the slowest thing we cannot cache"
        bodyClassName="p-0"
      >
        <DataTable
          dense
          columns={[
            {
              key: "name",
              header: "Script",
              primary: true,
              cell: (row: PerformanceData["thirdParty"][number]) => (
                <span className="truncate text-[11.5px] font-medium text-[#28354C]">{row.name}</span>
              ),
            },
            {
              key: "weight",
              header: "Weight",
              align: "right",
              cell: (row: PerformanceData["thirdParty"][number]) => formatWeight(row.weightKb),
            },
            {
              key: "blocking",
              header: "Blocking",
              align: "right",
              cell: (row: PerformanceData["thirdParty"][number]) => (
                <Chip tone={row.blockingMs > 200 ? "warn" : "muted"}>{formatMs(row.blockingMs)}</Chip>
              ),
            },
            {
              key: "pages",
              header: "Pages",
              align: "right",
              cell: (row: PerformanceData["thirdParty"][number]) => formatNumber(row.pages),
            },
          ]}
          rows={data.thirdParty}
          getRowId={(row) => row.name}
          empty={<EmptyState title="No third-party scripts" body="Everything is served from the site's own domain." compact />}
        />
      </Card>
    </div>
  );
}

function RecommendationsTab({
  data,
  onFixGuide,
}: {
  data: PerformanceData;
  onFixGuide: (guideId: string) => void;
}) {
  const ranked = useMemo(
    () =>
      [...data.recommendations].sort((a, b) => {
        const rank = { high: 0, medium: 1, low: 2 } as const;
        if (rank[a.impact] !== rank[b.impact]) return rank[a.impact] - rank[b.impact];
        return b.estimatedSavingMs - a.estimatedSavingMs;
      }),
    [data.recommendations],
  );

  return (
    <Card
      title={`Recommendations (${ranked.length})`}
      icon={Lightbulb}
      subtitle="Ordered by impact. These are instructions for whoever maintains the website — we cannot apply them."
      bodyClassName="p-0"
    >
      {ranked.length === 0 ? (
        <EmptyState title="No recommendations" body="Nothing obvious left to improve in the last audit." />
      ) : (
        <ul className="divide-y divide-[#F2F5FA]">
          {ranked.map((recommendation) => (
            <RecommendationRow key={recommendation.id} recommendation={recommendation} onFixGuide={onFixGuide} />
          ))}
        </ul>
      )}
    </Card>
  );
}

function RecommendationRow({
  recommendation,
  onFixGuide,
}: {
  recommendation: PerformanceRecommendation;
  onFixGuide: (guideId: string) => void;
}) {
  return (
    <li className="flex flex-wrap items-start gap-3 px-3.5 py-3">
      <span
        className={cn(
          "grid size-8 shrink-0 place-items-center rounded-lg",
          recommendation.impact === "high"
            ? "bg-[#FDECEB] text-[#C0261F]"
            : recommendation.impact === "medium"
              ? "bg-[#FDF3E3] text-[#9A5B08]"
              : "bg-[#F1F4F9] text-[#64748B]",
        )}
      >
        <TriangleAlert className="size-4" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-[12.5px] font-semibold text-[#28354C]">{recommendation.title}</p>
          <Chip tone={recommendation.impact === "high" ? "bad" : recommendation.impact === "medium" ? "warn" : "muted"}>
            {recommendation.impact} impact
          </Chip>
          <Chip tone="muted">{recommendation.effort} effort</Chip>
        </div>
        <p className="mt-0.5 text-[11.5px] leading-relaxed text-[#6B7A94]">{recommendation.description}</p>
        <p className="mt-1 text-[10.5px] text-[#94A3B8]">
          Estimated saving ≈ {formatMs(recommendation.estimatedSavingMs)} · affects {recommendation.affectedPages} pages
        </p>
      </div>
      <WButton size="sm" icon={Wrench} onClick={() => onFixGuide(recommendation.fixGuideId)}>
        View fix guide
      </WButton>
    </li>
  );
}
