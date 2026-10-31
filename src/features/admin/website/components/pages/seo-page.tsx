"use client";

/**
 * SEO — what the crawl found, plus real search data when Search Console is
 * connected. The Search Performance tab is the one place organic numbers can
 * come from; without the integration it stays locked rather than estimated.
 */

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowUpDown,
  Bot,
  Braces,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Copy,
  Download,
  ExternalLink,
  Eye,
  FileCode2,
  Filter,
  Globe2,
  Link2,
  ListTree,
  Monitor,
  MousePointerClick,
  RefreshCw,
  Search,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Tablet,
  Target,
  TrendingDown,
  TrendingUp,
  TriangleAlert,
  Wrench,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { cn } from "@/lib/utils/cn";
import { useSearchConsoleReport, useWebsiteCapabilities, useWebsiteIssues, useWebsitePages, useWebsiteSeo } from "../../data/hooks";
import { evaluateFeature } from "../../data/capability-provider";
import {
  categoryLabel,
  downloadFile,
  formatCompact,
  formatDate,
  formatNumber,
  formatRelative,
  formatShortDate,
  httpStatusTone,
  scoreBand,
  severityLabel,
  severityTone,
  sortIssues,
  toCsv,
} from "../../data/selectors";
import type { IssueRecord, PageRecord, SearchConsoleData, SearchPeriod, SearchQueryRow, SitemapEntry } from "../../data/types";
import { Sheet, SheetBody, SheetContent, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ApiError } from "@/types/api";
import { PeriodPicker, QueryInsight, periodLabel, rangeText, useSearchPeriod } from "../search-console-shared";
import { SheetsExportButton } from "../google-sheets-export";
import {
  Card,
  Chip,
  DataTable,
  KeyValue,
  Meter,
  Pagination,
  ScoreDial,
  StatTile,
  SubTabs,
  toneText,
  usePagination,
  WButton,
  type Column,
} from "../ui/kit";
import { AXIS_PROPS, ChartLegend, ChartTooltip, GRID_PROPS, makeTooltip, SERIES_COLORS } from "../ui/charts";
import { EmptyState, LockedState, QueryErrorState, SkeletonBlock, SkeletonStats, SkeletonTable } from "../ui/states";
import { ScoreCell } from "./overview-page";
import { useUrlState } from "../use-url-state";
import { useWebsiteWorkspace } from "../website-workspace";
import { BrandPresenceCard } from "../brand-presence-card";

type SeoTab = "overview" | "issues" | "pages" | "links" | "duplicates" | "sitemap" | "robots" | "schema" | "search";

const TABS: { value: SeoTab; label: string }[] = [
  { value: "overview", label: "Overview" },
  { value: "issues", label: "Issues" },
  { value: "pages", label: "Pages" },
  { value: "links", label: "Links" },
  { value: "duplicates", label: "Duplicates" },
  { value: "sitemap", label: "Sitemap" },
  { value: "robots", label: "Robots" },
  { value: "schema", label: "Schema" },
  { value: "search", label: "Search performance" },
];

export function WebsiteSeoPage() {
  const router = useRouter();
  const { clientId, runScan, scan, openIssue, openFixGuide, openIntegration, navigate } = useWebsiteWorkspace();
  const seo = useWebsiteSeo(clientId);
  const issues = useWebsiteIssues(clientId);
  const pages = useWebsitePages(clientId);
  const capabilities = useWebsiteCapabilities(clientId);

  const [tab, setTab] = useUrlState<SeoTab>("tab", "overview", TABS.map((entry) => entry.value));
  const searchFeature = evaluateFeature(capabilities.data, "search-performance");

  const seoIssues = useMemo(
    () =>
      sortIssues(
        (issues.data ?? []).filter(
          (issue) =>
            issue.status === "open" &&
            (issue.category === "seo" ||
              issue.category === "technical" ||
              issue.id.includes("-h1") ||
              issue.id.includes("-alt") ||
              issue.id.includes("-description") ||
              issue.id.includes("-canonical") ||
              issue.title.toLowerCase().includes("h1") ||
              issue.title.toLowerCase().includes("alt text")),
        ),
      ),
    [issues.data],
  );

  const categories = useMemo(() => {
    if (seo.data?.overview?.categories && seo.data.overview.categories.length > 0) {
      return seo.data.overview.categories;
    }
    // No category data means no check has run: show nothing rather than invented categories.
    return [] as NonNullable<typeof seo.data>["overview"]["categories"];
  }, [seo.data?.overview]);

  return (
    <div className="space-y-1">
      <div className="rounded-xl border border-[#E6EBF4] bg-white p-2 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
        <SubTabs
          ariaLabel="SEO sections"
          value={tab}
          onChange={setTab}
          options={TABS.map((entry) => ({
            value: entry.value,
            label: entry.label,
            ...(entry.value === "issues" ? { count: seoIssues.length } : {}),
            ...(entry.value === "search" ? { locked: !searchFeature.available } : {}),
          }))}
        />
      </div>

      {seo.isLoading ? (
        <>
          <SkeletonStats count={6} />
          <SkeletonBlock lines={6} />
        </>
      ) : seo.error ? (
        <Card title="SEO">
          <QueryErrorState error={seo.error} onRetry={() => void seo.refetch()} />
        </Card>
      ) : seo.data ? (
        <>
          {tab === "overview" ? (
            <div className="space-y-1">
              <div className="grid gap-1 xl:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
                <Card title="Media360 SEO score" icon={Search} subtitle="Composite of every on-page check we run" bodyClassName="p-2.5">
                  <div className="grid grid-cols-[1fr_1fr] items-stretch gap-2.5 h-full">
                    <div className="flex flex-col items-center justify-center gap-1 rounded-xl border border-[#E6EBF4] bg-gradient-to-br from-[#FAFCFF] to-[#F1F5F9] p-2.5 shadow-sm h-full">
                      {seo.data.overview.score === null ? (
                        <div className="flex size-[68px] items-center justify-center rounded-full border border-dashed border-[#CBD5E1] text-center text-[10px] font-semibold text-[#64748B]">
                          Not scored
                        </div>
                      ) : (
                        <ScoreDial
                          value={seo.data.overview.score}
                          tone={scoreBand(seo.data.overview.score)}
                          size={68}
                          label={`SEO score ${seo.data.overview.score}`}
                        />
                      )}
                      <div className="flex flex-col items-center text-center mt-1">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-[#64748B] mb-0.5">
                          Overall Score
                        </p>
                        <div className="flex items-center gap-1 text-[9.5px] font-bold mt-0.5">
                          {seo.data.overview.score === null ? (
                            <span className="rounded bg-[#F8FAFC] px-1.5 py-0.5 text-[#64748B] ring-1 ring-inset ring-[#E2E8F0]">No checks run yet</span>
                          ) : (
                            <>
                              <span className={cn("rounded bg-[#F8FAFC] px-1.5 py-0.5 ring-1 ring-inset ring-[#E2E8F0]", toneText[scoreBand(seo.data.overview.score)])}>{seo.data.overview.score}</span>
                              <span className="rounded bg-[#F0FDF4] px-1.5 py-0.5 text-[#15803D] ring-1 ring-inset ring-[#BBF7D0]">100</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col justify-center gap-1">
                      <div className="flex items-center justify-between rounded-lg bg-white py-1 px-2.5 border border-[#F1F5F9] shadow-sm">
                        <span className="text-[11px] font-semibold text-[#475569]">Pages crawled</span>
                        <span className="text-[11.5px] font-bold text-[#0F172A]">{formatNumber(seo.data.overview.pagesCrawled)}</span>
                      </div>
                      <div className="flex items-center justify-between rounded-lg bg-white py-1 px-2.5 border border-[#F1F5F9] shadow-sm">
                        <span className="text-[11px] font-semibold text-[#475569]">Indexable pages</span>
                        <span className="text-[11.5px] font-bold text-[#0F172A]">{formatNumber(seo.data.overview.indexablePages)}</span>
                      </div>
                      <div className="flex items-center justify-between rounded-lg bg-[#FEF2F2] py-1 px-2.5 border border-[#FEE2E2]">
                        <span className="text-[11px] font-semibold text-[#B91C1C]">Errors</span>
                        <div className="flex items-center gap-1.5">
                          <span className={cn("text-[11.5px] font-bold", seo.data.overview.errors > 0 ? "text-[#991B1B]" : "text-[#166534]")}>{formatNumber(seo.data.overview.errors)}</span>
                          <span className="rounded bg-white px-1 py-0.5 text-[9px] font-bold text-[#15803D]">0</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between rounded-lg bg-[#FFFBEB] py-1 px-2.5 border border-[#FEF3C7]">
                        <span className="text-[11px] font-semibold text-[#B45309]">Warnings</span>
                        <div className="flex items-center gap-1.5">
                          <span className={cn("text-[11.5px] font-bold", seo.data.overview.warnings > 0 ? "text-[#92400E]" : "text-[#166534]")}>{formatNumber(seo.data.overview.warnings)}</span>
                          <span className="rounded bg-white px-1 py-0.5 text-[9px] font-bold text-[#15803D]">0</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between rounded-lg bg-[#F0FDF4] py-1 px-2.5 border border-[#DCFCE7]">
                        <span className="text-[11px] font-semibold text-[#15803D]">Passed checks</span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11.5px] font-bold text-[#166534]">{formatNumber(seo.data.overview.passedChecks)}</span>
                          <span className="rounded bg-white px-1 py-0.5 text-[9px] font-bold text-[#15803D]">{seo.data.overview.passedChecks + seo.data.overview.errors + seo.data.overview.warnings}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>

                <Card
                  title="Category breakdown"
                  icon={ListTree}
                  subtitle="Where the score comes from"
                  action={
                    <WButton
                      size="sm"
                      icon={RefreshCw}
                      disabled={scan.isRunning}
                      disabledReason="A scan is already running"
                      onClick={() => runScan("seo-audit")}
                    >
                      Run SEO audit
                    </WButton>
                  }
                  bodyClassName="p-2.5"
                >
                  <ul className="grid grid-cols-2 gap-1.5">
                    {categories.map((category) => (
                      <li key={category.key} className="flex flex-col gap-1.5 rounded-xl border border-[#E6EBF4] bg-white px-2.5 py-1.5 shadow-sm transition-all hover:border-[#C9D6EA] hover:shadow-md">
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-[11.5px] font-bold text-[#0F172A]">{category.label}</span>
                          <div className="flex items-baseline gap-1">
                            <b
                              className={cn(
                                "text-[12.5px] font-extrabold",
                                category.score === null
                                  ? "text-[#94A3B8]"
                                  : scoreBand(category.score) === "good"
                                    ? "text-[#10B981]"
                                    : scoreBand(category.score) === "warn"
                                      ? "text-[#F59E0B]"
                                      : "text-[#EF4444]",
                              )}
                            >
                              {category.score === null ? "Not run" : category.score}
                            </b>
                            <span className="text-[9px] font-bold text-[#15803D] bg-[#F0FDF4] px-1 py-0.5 rounded border border-[#DCFCE7]">
                              100
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="inline-flex items-center rounded bg-[#F0FDF4] px-1 py-0.5 text-[9px] font-bold text-[#166534] ring-1 ring-inset ring-[#DCFCE7]">
                            {category.passed} passed
                          </span>
                          <span className="inline-flex items-center rounded bg-[#FFFBEB] px-1 py-0.5 text-[9px] font-bold text-[#B45309] ring-1 ring-inset ring-[#FEF3C7]">
                            {category.warnings} warn
                          </span>
                          <span className="inline-flex items-center rounded bg-[#FEF2F2] px-1 py-0.5 text-[9px] font-bold text-[#B91C1C] ring-1 ring-inset ring-[#FEE2E2]">
                            {category.errors} err
                          </span>
                        </div>
                        <div className="mt-0.5">
                          {category.score === null ? null : <Meter value={category.score} tone={scoreBand(category.score)} label={category.label} />}
                        </div>
                      </li>
                    ))}
                  </ul>
                </Card>
              </div>

              <div className="grid grid-cols-2 gap-1 lg:grid-cols-4">
                <StatTile
                  label="Healthy pages"
                  value={formatNumber(seo.data.overview.healthyPages)}
                  best={seo.data.overview.pagesCrawled}
                  sub="SEO score 80 or above"
                  tone="good"
                  icon={ShieldCheck}
                  onClick={() => navigate("/admin/website/pages?seo=good")}
                />
                <StatTile
                  label="Warning pages"
                  value={formatNumber(seo.data.overview.warningPages)}
                  best="0"
                  sub="SEO score 60–79"
                  tone="warn"
                  icon={TriangleAlert}
                  onClick={() => navigate("/admin/website/pages?seo=warn")}
                />
                <StatTile
                  label="Critical pages"
                  value={formatNumber(seo.data.overview.criticalPages)}
                  best="0"
                  sub="SEO score below 60"
                  tone="bad"
                  icon={TriangleAlert}
                  onClick={() => navigate("/admin/website/pages?seo=bad")}
                />
                <StatTile
                  label="Open SEO issues"
                  value={formatNumber(seoIssues.length)}
                  best="0"
                  sub="Across every category"
                  tone="info"
                  icon={Search}
                  onClick={() => setTab("issues")}
                />
              </div>
              <BrandPresenceCard clientId={clientId} />
            </div>
          ) : null}

          {tab === "issues" ? (
            <SeoIssuesTab
              issues={seoIssues}
              onOpen={openIssue}
              onFixGuide={openFixGuide}
              onAffected={(issue) =>
                navigate(
                  issue.affectedPageIds.length > 0
                    ? `/admin/website/pages?issue=${encodeURIComponent(issue.id)}`
                    : "/admin/website/issues?category=seo",
                )
              }
              onRescan={() => runScan("seo-audit")}
            />
          ) : null}

          {tab === "pages" ? (
            <SeoPagesTab
              pages={pages.data ?? []}
              isLoading={pages.isLoading}
              onOpen={(page) => router.push(`/admin/website/pages/${encodeURIComponent(page.id)}`)}
            />
          ) : null}

          {tab === "links" ? <SeoLinksTab data={seo.data.links} /> : null}          {tab === "duplicates" ? <SeoDuplicatesTab groups={seo.data.duplicates ?? []} engine={seo.data.engine} /> : null}


          {tab === "sitemap" ? <SitemapTab report={seo.data.sitemap} /> : null}

          {tab === "robots" ? <RobotsTab report={seo.data.robots} /> : null}

          {tab === "schema" ? <SchemaTab report={seo.data.schema} /> : null}

          {tab === "search" ? (
            searchFeature.available && seo.data.searchConsole ? (
              <SearchConsoleLive clientId={clientId} saved={seo.data.searchConsole} integration={capabilities.data?.integrations.searchConsole} />
            ) : (
              <Card title="Search performance" icon={Search}>
                <LockedState
                  title={searchFeature.lockedTitle}
                  body={searchFeature.lockedBody}
                  ctaLabel={searchFeature.ctaLabel}
                  onCta={() => openIntegration("searchConsole")}
                  unlocks={["Queries", "Clicks", "Impressions", "CTR", "Average position", "Countries", "Devices"]}
                />
              </Card>
            )
          ) : null}
        </>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */

function SeoIssuesTab({
  issues,
  onOpen,
  onFixGuide,
  onAffected,
  onRescan,
}: {
  issues: IssueRecord[];
  onOpen: (id: string) => void;
  onFixGuide: (id: string) => void;
  onAffected: (issue: IssueRecord) => void;
  onRescan: () => void;
}) {
  return (
    <Card
      title={`SEO issues (${issues.length})`}
      icon={TriangleAlert}
      subtitle="Ordered by severity, then by how recently they were detected"
      bodyClassName="p-0"
    >
      {issues.length === 0 ? (
        <EmptyState
          title="No open SEO issues"
          body="Every SEO check passed on the last crawl."
          icon={ShieldCheck}
        />
      ) : (
        <ul className="divide-y divide-[#F2F5FA]">
          {issues.map((issue) => (
            <li key={issue.id} className="px-3.5 py-3">
              <div className="flex flex-wrap items-start gap-2">
                <Chip tone={severityTone[issue.severity]} dot>
                  {severityLabel[issue.severity]}
                </Chip>
                <div className="min-w-0 flex-1">
                  <button
                    type="button"
                    onClick={() => onOpen(issue.id)}
                    className="cursor-pointer text-left text-[12.5px] font-semibold text-[#28354C] hover:text-[#1D4ED8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]/35"
                  >
                    {issue.title}
                  </button>
                  <p className="mt-0.5 text-[11.5px] leading-relaxed text-[#6B7A94]">{issue.description}</p>
                  <p className="mt-1 text-[10.5px] text-[#94A3B8]">
                    {categoryLabel[issue.category]} · {issue.affectedCount} affected · detected{" "}
                    {formatRelative(issue.detectedAt)}
                    {issue.evidence ? ` · ${issue.evidence}` : ""}
                  </p>
                  <p className="mt-1.5 rounded-md bg-[#F7F9FC] px-2.5 py-1.5 text-[11px] leading-relaxed text-[#4A5A73]">
                    <b className="font-semibold text-[#28354C]">Recommended:</b> {issue.recommendation}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    <WButton size="sm" onClick={() => onAffected(issue)}>
                      View affected pages
                    </WButton>
                    <WButton size="sm" icon={Wrench} onClick={() => onFixGuide(issue.fixGuideId)}>
                      Fix guide
                    </WButton>
                    <WButton size="sm" icon={RefreshCw} onClick={onRescan}>
                      Re-scan
                    </WButton>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function SeoPagesTab({
  pages,
  isLoading,
  onOpen,
}: {
  pages: PageRecord[];
  isLoading: boolean;
  onOpen: (page: PageRecord) => void;
}) {
  const ranked = useMemo(() => [...pages].sort((a, b) => (a.seoScore ?? 101) - (b.seoScore ?? 101)), [pages]);
  const pagination = usePagination(ranked.length, 10);

  const columns: Column<PageRecord>[] = [
    {
      key: "page",
      header: "Page",
      primary: true,
      cell: (page) => (
        <div className="min-w-0">
          <p className="truncate text-[11.5px] font-semibold text-[#28354C]">{page.title}</p>
          <p className="truncate font-mono text-[10.5px] text-[#6B7A94]">{page.path}</p>
        </div>
      ),
    },
    { key: "status", header: "HTTP", align: "center", cell: (page) => <Chip tone={httpStatusTone(page.httpStatus)}>{page.httpStatus}</Chip> },
    { key: "seo", header: "SEO", align: "center", cell: (page) => <ScoreCell value={page.seoScore} /> },
    {
      key: "indexable",
      header: "Indexable",
      align: "center",
      cell: (page) => <Chip tone={page.indexable ? "good" : "muted"}>{page.indexable ? "Yes" : "No"}</Chip>,
    },
    {
      key: "words",
      header: "Words",
      align: "right",
      cell: (page) => (page.wordCount > 0 ? formatNumber(page.wordCount) : "—"),
    },
    { key: "issues", header: "Issues", align: "center", cell: (page) => page.issueCount },
  ];

  return (
    <Card title="Pages by SEO score" icon={ListTree} subtitle="Weakest first" bodyClassName="p-0">
      {isLoading ? (
        <SkeletonTable rows={6} />
      ) : (
        <>
          <DataTable
            columns={columns}
            rows={pagination.slice(ranked)}
            getRowId={(page) => page.id}
            onRowClick={onOpen}
            empty={<EmptyState title="No pages crawled" body="Run a crawl to populate this list." />}
          />
          {ranked.length > 0 ? (
            <Pagination
              page={pagination.page}
              pageSize={pagination.pageSize}
              total={ranked.length}
              onPageChange={pagination.setPage}
              onPageSizeChange={pagination.setPageSize}
            />
          ) : null}
        </>
      )}
    </Card>
  );
}

function SeoLinksTab({ data }: { data: NonNullable<ReturnType<typeof useWebsiteSeo>["data"]>["links"] }) {
  return (
    <div className="space-y-1">
      {data.unchecked && (data.unchecked.internal > 0 || data.unchecked.external > 0) ? (
        <p className="rounded-lg border border-[#E6EBF4] bg-white px-3 py-2 text-[11px] text-[#5B6B85]">
          Coverage: {formatNumber(data.unchecked.internal)} internal and {formatNumber(data.unchecked.external)} external link target(s) were not checked
          (outside the crawl limits or the external-check budget). They are not counted as working or broken.
        </p>
      ) : null}
      <div className="grid grid-cols-2 gap-1 lg:grid-cols-6">
        <StatTile label="Internal links" value={formatNumber(data.internalLinks)} tone="info" icon={Link2} />
        <StatTile label="External links" value={formatNumber(data.externalLinks)} tone="muted" icon={ExternalLink} />
        <StatTile label="Broken links" value={formatNumber(data.brokenLinks)} tone={data.brokenLinks > 0 ? "bad" : "good"} icon={TriangleAlert} />
        <StatTile label="Redirect chains" value={formatNumber(data.redirectChains)} tone={data.redirectChains > 0 ? "warn" : "good"} icon={ListTree} />
        <StatTile label="Nofollow links" value={formatNumber(data.nofollowLinks)} tone="muted" icon={Link2} />
        <StatTile label="Orphan pages" value={formatNumber(data.orphanPages)} tone={data.orphanPages > 0 ? "warn" : "good"} icon={ListTree} />
      </div>

      <div className="grid gap-1 lg:grid-cols-2">
        <Card title="Broken links" icon={TriangleAlert} bodyClassName="p-0">
          <DataTable
            dense
            columns={[
              {
                key: "from",
                header: "From",
                primary: true,
                cell: (row: (typeof data.broken)[number]) => (
                  <div className="min-w-0">
                    <p className="truncate font-mono text-[11px] text-[#28354C]">{row.from}</p>
                    <p className="truncate text-[10.5px] text-[#6B7A94]">“{row.text}”</p>
                  </div>
                ),
              },
              {
                key: "to",
                header: "To",
                cell: (row: (typeof data.broken)[number]) => (
                  <span className="truncate font-mono text-[10.5px] text-[#6B7A94]">{row.to}</span>
                ),
              },
              {
                key: "status",
                header: "Status",
                align: "center",
                cell: (row: (typeof data.broken)[number]) => <Chip tone="bad">{row.status}</Chip>,
              },
            ]}
            rows={data.broken}
            getRowId={(row) => `${row.from}-${row.to}-${data.broken.indexOf(row)}`}
            empty={<EmptyState title="No broken links" body="Every link resolved on the last crawl." icon={ShieldCheck} compact />}
          />
        </Card>

        <Card title="Orphan page candidates" icon={ListTree} subtitle={data.orphanConclusionSound === false ? "Crawl did not cover every discovered URL — no conclusion drawn" : "Listed in the sitemap, linked from no crawled page"} bodyClassName="p-0">
          <DataTable
            dense
            columns={[{ key: "url", header: "URL", primary: true, cell: (row: { url: string }) => <span className="truncate font-mono text-[11px] text-[#28354C]">{row.url}</span> }]}
            rows={(data.orphanCandidates ?? []).map((url) => ({ url }))}
            getRowId={(row) => row.url}
            empty={<EmptyState title={data.orphanConclusionSound === false ? "Not assessed" : "No orphan candidates"} body={data.orphanConclusionSound === false ? "Raise the page limit or depth so the crawl covers every discovered URL." : "Every sitemap page is linked from a crawled page."} icon={ShieldCheck} compact />}
          />
        </Card>

        <Card title="Weak anchor text" icon={Link2} bodyClassName="p-0">
          <DataTable
            dense
            columns={[
              { key: "anchor", header: "Anchor", primary: true, cell: (row: NonNullable<typeof data.weakAnchors>[number]) => <span className="text-[11px] text-[#28354C]">“{row.anchor}”</span> },
              { key: "source", header: "On page", cell: (row: NonNullable<typeof data.weakAnchors>[number]) => <span className="truncate font-mono text-[10.5px] text-[#6B7A94]">{row.source}</span> },
              { key: "reason", header: "Why", cell: (row: NonNullable<typeof data.weakAnchors>[number]) => <span className="text-[10.5px] text-[#6B7A94]">{row.reason}</span> },
            ]}
            rows={data.weakAnchors ?? []}
            getRowId={(row) => `${row.source}-${row.target}-${row.anchor}-${(data.weakAnchors ?? []).indexOf(row)}`}
            empty={<EmptyState title="No weak anchor text" body="Every checked link describes its destination." icon={ShieldCheck} compact />}
          />
        </Card>

        <Card title="Redirect chains" icon={ListTree} bodyClassName="p-0">
          <DataTable
            dense
            columns={[
              {
                key: "from",
                header: "From",
                primary: true,
                cell: (row: (typeof data.redirects)[number]) => (
                  <span className="truncate font-mono text-[11px] text-[#28354C]">{row.from}</span>
                ),
              },
              {
                key: "to",
                header: "Final URL",
                cell: (row: (typeof data.redirects)[number]) => (
                  <span className="truncate font-mono text-[10.5px] text-[#6B7A94]">{row.to}</span>
                ),
              },
              {
                key: "hops",
                header: "Hops",
                align: "center",
                cell: (row: (typeof data.redirects)[number]) => (
                  <Chip tone={row.hops > 1 ? "warn" : "muted"}>{row.hops}</Chip>
                ),
              },
            ]}
            rows={data.redirects}
            getRowId={(row) => row.from}
            empty={<EmptyState title="No redirect chains" body="Every URL resolves in a single hop." icon={ShieldCheck} compact />}
          />
        </Card>
      </div>
    </div>
  );
}

function SitemapTab({ report }: { report: NonNullable<ReturnType<typeof useWebsiteSeo>["data"]>["sitemap"] }) {
  const pagination = usePagination(report.entries.length, 10);

  if (!report.detected) {
    return (
      <Card title="Sitemap" icon={FileCode2}>
        <EmptyState
          title="No sitemap found"
          body={
            report.note ??
            "We could not find sitemap.xml at the usual locations or in robots.txt. A sitemap helps search engines find every page."
          }
        />
      </Card>
    );
  }

  const columns: Column<SitemapEntry>[] = [
    {
      key: "loc",
      header: "URL",
      primary: true,
      cell: (entry) => <span className="truncate font-mono text-[11px] text-[#28354C]">{entry.loc}</span>,
    },
    {
      key: "status",
      header: "Status",
      align: "center",
      cell: (entry) => (entry.status ? <Chip tone={httpStatusTone(entry.status)}>{entry.status}</Chip> : <span>—</span>),
    },
    {
      key: "lastmod",
      header: "Last modified",
      cell: (entry) => <span className="text-[11px] text-[#6B7A94]">{formatDate(entry.lastModified)}</span>,
    },
    {
      key: "valid",
      header: "Valid",
      align: "center",
      cell: (entry) =>
        entry.valid === null ? (
          <Chip tone="muted">Not checked</Chip>
        ) : (
          <Chip tone={entry.valid ? "good" : "bad"}>{entry.valid ? "Valid" : (entry.note ?? "Invalid")}</Chip>
        ),
    },
  ];

  return (
    <div className="space-y-1">
      <div className="grid gap-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <Card title="Sitemap" icon={FileCode2}>
          <dl className="divide-y divide-[#F2F5FA]">
            <KeyValue label="Location">
              <a
                href={report.url ?? "#"}
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex items-center gap-1 font-mono text-[11px] text-[#2563EB] hover:underline"
              >
                /sitemap.xml
                <ExternalLink className="size-3" aria-hidden />
              </a>
            </KeyValue>
            <KeyValue label="Fetched">{formatRelative(report.fetchedAt)}</KeyValue>
            <KeyValue label="URLs discovered">{formatNumber(report.urlsDiscovered)}</KeyValue>
            <KeyValue label="Invalid URLs">
              <Chip tone={report.invalidUrls > 0 ? "bad" : "good"}>{report.invalidUrls}</Chip>
            </KeyValue>
          </dl>
        </Card>

        <Card title="Nested sitemaps" icon={ListTree} bodyClassName="p-0">
          <ul className="divide-y divide-[#F2F5FA]">
            {report.childSitemaps.map((child) => (
              <li key={child.url} className="flex items-center justify-between gap-2 px-3.5 py-2.5">
                <a
                  href={child.url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="truncate font-mono text-[11px] text-[#2563EB] hover:underline"
                >
                  {child.url}
                </a>
                <Chip tone="muted">{child.urlCount} URLs</Chip>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Card
        title="Sitemap URLs"
        icon={FileCode2}
        action={
          <WButton
            size="sm"
            icon={Download}
            onClick={() => {
              downloadFile(
                "sitemap-urls.csv",
                toCsv(
                  ["URL", "Status", "Last modified", "Valid", "Note"],
                  report.entries.map((entry) => [
                    entry.loc,
                    entry.status,
                    entry.lastModified,
                    entry.valid === null ? "Not checked" : entry.valid ? "Yes" : "No",
                    entry.note,
                  ]),
                ),
              );
              toast.success("Sitemap URLs exported");
            }}
          >
            Export
          </WButton>
        }
        bodyClassName="p-0"
      >
        <DataTable
          columns={columns}
          rows={pagination.slice(report.entries)}
          getRowId={(entry) => entry.loc}
          empty={<EmptyState title="Sitemap is empty" body="The sitemap was found but lists no URLs." />}
          dense
        />
        <Pagination
          page={pagination.page}
          pageSize={pagination.pageSize}
          total={report.entries.length}
          onPageChange={pagination.setPage}
          onPageSizeChange={pagination.setPageSize}
        />
      </Card>
    </div>
  );
}

function RobotsTab({ report }: { report: NonNullable<ReturnType<typeof useWebsiteSeo>["data"]>["robots"] }) {
  if (!report.detected) {
    return (
      <Card title="robots.txt" icon={Bot}>
        <EmptyState
          title="No robots.txt found"
          body={
            report.note ??
            "Without robots.txt, crawlers assume everything is allowed. That is usually fine, but a file lets you exclude search and admin paths."
          }
        />
      </Card>
    );
  }

  return (
    <div className="grid gap-1 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
      <Card
        title="robots.txt"
        icon={Bot}
        subtitle={`Fetched ${formatRelative(report.fetchedAt)}`}
        action={
          <a
            href={report.url ?? "#"}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex items-center gap-1 rounded text-[11px] font-semibold text-[#2563EB] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]/35"
          >
            Open file
            <ExternalLink className="size-3" aria-hidden />
          </a>
        }
      >
        <pre className="scrollbar-thin max-h-[320px] overflow-auto rounded-md bg-[#0F172A] p-3 text-[11px] leading-relaxed text-[#E2E8F0]">
          <code>{report.raw}</code>
        </pre>
      </Card>

      <div className="grid gap-1">
        <Card title="Blocked paths" icon={Bot} bodyClassName="p-0">
          <ul className="divide-y divide-[#F2F5FA]">
            {report.blockedPaths.map((path) => (
              <li key={path} className="flex items-center justify-between gap-2 px-3.5 py-2">
                <span className="font-mono text-[11px] text-[#28354C]">{path}</span>
                <Chip tone="warn">Disallowed</Chip>
              </li>
            ))}
            {report.allowedPaths.map((path) => (
              <li key={`allow-${path}`} className="flex items-center justify-between gap-2 px-3.5 py-2">
                <span className="font-mono text-[11px] text-[#28354C]">{path}</span>
                <Chip tone="good">Allowed</Chip>
              </li>
            ))}
          </ul>
        </Card>

        <Card title="Sitemap references" icon={FileCode2} bodyClassName="p-0">
          <ul className="divide-y divide-[#F2F5FA]">
            {report.sitemapReferences.map((reference) => (
              <li key={reference} className="px-3.5 py-2">
                <span className="truncate font-mono text-[11px] text-[#2563EB]">{reference}</span>
              </li>
            ))}
          </ul>
          {report.warnings.length > 0 ? (
            <ul className="border-t border-[#EEF2F8] bg-[#FDF3E3] px-3.5 py-2">
              {report.warnings.map((warning) => (
                <li key={warning} className="text-[11px] text-[#9A5B08]">
                  {warning}
                </li>
              ))}
            </ul>
          ) : null}
        </Card>
      </div>
    </div>
  );
}

function SchemaTab({ report }: { report: NonNullable<ReturnType<typeof useWebsiteSeo>["data"]>["schema"] }) {
  return (
    <div className="space-y-1">
      <div className="grid grid-cols-3 gap-1">
        <StatTile label="Valid types" value={report.valid} tone="good" icon={ShieldCheck} />
        <StatTile label="With warnings" value={report.warnings} tone="warn" icon={TriangleAlert} />
        <StatTile label="With errors" value={report.errors} tone="bad" icon={TriangleAlert} />
      </div>

      <Card title="Detected structured data" icon={Braces} bodyClassName="p-0">
        {report.detectedTypes.length === 0 ? (
          <EmptyState
            title="No structured data found"
            body="Adding Organization and Breadcrumb markup helps search engines understand the site."
          />
        ) : (
          <ul className="divide-y divide-[#F2F5FA]">
            {report.detectedTypes.map((type) => (
              <li key={type.type} className="flex items-start justify-between gap-3 px-3.5 py-2.5">
                <div className="min-w-0">
                  <p className="text-[12px] font-semibold text-[#28354C]">{type.type}</p>
                  <p className="text-[10.5px] text-[#6B7A94]">
                    Found on {type.pages} page{type.pages === 1 ? "" : "s"}
                  </p>
                  {type.issues.length > 0 ? (
                    <ul className="mt-1 space-y-0.5">
                      {type.issues.map((issue) => (
                        <li key={issue} className="text-[10.5px] text-[#9A5B08]">
                          • {issue}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
                <Chip tone={type.status === "pass" ? "good" : type.status === "warning" ? "warn" : "bad"}>
                  {type.status === "pass" ? "Valid" : type.status === "warning" ? "Warning" : "Error"}
                </Chip>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function QueryCopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      title={copied ? "Copied to clipboard" : `${label}: ${text}`}
      className="inline-flex size-5 shrink-0 items-center justify-center rounded text-[#94A3B8] transition-colors hover:bg-[#EEF2F8] hover:text-[#28354C] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#2563EB]"
      aria-label={copied ? "Copied" : label}
    >
      {copied ? <Check className="size-3 text-[#12A06D]" /> : <Copy className="size-3" />}
    </button>
  );
}

/**
 * Live Search Console report for the chosen period. The copy saved with the last scan is shown only while the
 * default 28-day report loads; another period is never filled with 28-day numbers.
 */
function SearchConsoleLive({
  clientId,
  saved,
  integration,
}: {
  clientId: string;
  saved: SearchConsoleData;
  integration?: { property: string | null; status: string; detail: string; lastSyncAt: string | null };
}) {
  const [period, setPeriod] = useSearchPeriod();
  const report = useSearchConsoleReport(clientId, period);
  const data = report.data?.period === period || (report.data && !report.data.period) ? report.data : period === "28d" ? saved : undefined;
  if (report.error && !report.isFetching) {
    return (
      <Card title="Search performance" icon={Search} action={<PeriodPicker value={period} onChange={setPeriod} />}>
        <QueryErrorState error={report.error} onRetry={() => void report.refetch()} />
      </Card>
    );
  }
  if (!data) return <SkeletonBlock lines={10} />;
  return (
    <SearchConsoleTab
      clientId={clientId}
      data={data}
      integration={integration}
      period={period}
      onPeriodChange={setPeriod}
      loading={report.isFetching || data !== report.data}
      onRefresh={() =>
        report.refresh.mutate(undefined, {
          onSuccess: () => toast.success("Search Console data refreshed"),
          onError: (err) => toast.error(ApiError.isApiError(err) ? err.message : "Could not refresh Search Console data"),
        })
      }
      refreshing={report.refresh.isPending}
    />
  );
}

function SearchConsoleTab({
  clientId,
  data,
  integration,
  period,
  onPeriodChange,
  loading,
  onRefresh,
  refreshing,
}: {
  clientId: string;
  data: SearchConsoleData;
  integration?: { property: string | null; status: string; detail: string; lastSyncAt: string | null };
  period: SearchPeriod;
  onPeriodChange: (period: SearchPeriod) => void;
  loading: boolean;
  onRefresh: () => void;
  refreshing: boolean;
}) {
  const runtime = data as typeof data & { topQueries?: SearchQueryRow[]; topPages?: typeof data.pages };
  const totals = data.totals ?? { clicks: 0, impressions: 0, ctr: 0, position: 0 };
  const deltas = data.deltas ?? { clicks: 0, impressions: 0, ctr: 0, position: 0 };
  const trend = data.trend ?? [];
  const queries = data.queries ?? runtime.topQueries ?? [];
  const devices = data.devices ?? [];
  const countries = data.countries ?? [];
  const ctrPercent = totals.ctr > 0 && totals.ctr <= 1 ? totals.ctr * 100 : totals.ctr;

  // Chart Controls
  const [metricView, setMetricView] = useState<"both" | "clicks" | "impressions">("both");

  // Sorted Trend chronologically
  const sortedTrend = useMemo(() => {
    return [...trend].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [trend]);

  // Table Query Filter & Sorting States
  type SortField = "query" | "clicks" | "impressions" | "ctr" | "position";
  type SortDir = "asc" | "desc";

  const [searchQuery, setSearchQuery] = useState("");
  const [posFilter, setPosFilter] = useState<"all" | "top3" | "top10" | "page2">("all");
  const [oppFilter, setOppFilter] = useState(false);
  const [sortField, setSortField] = useState<SortField>("clicks");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const [openQuery, setOpenQuery] = useState<string | null>(null);
  const [allCountries, setAllCountries] = useState(false);

  // Devices & Countries metric switcher
  const [deviceMetric, setDeviceMetric] = useState<"clicks" | "impressions">("clicks");
  const [countryMetric, setCountryMetric] = useState<"clicks" | "impressions">("clicks");

  // Opportunities calculation (above-average impressions, below-average CTR)
  const avgImpressions = useMemo(() => {
    if (!queries.length) return 0;
    return queries.reduce((sum, q) => sum + q.impressions, 0) / queries.length;
  }, [queries]);

  const avgCtr = useMemo(() => {
    if (!queries.length) return 0;
    return queries.reduce((sum, q) => sum + q.ctr, 0) / queries.length;
  }, [queries]);

  // Filtered queries
  const filteredQueries = useMemo(() => {
    return queries.filter((row) => {
      if (searchQuery.trim() && !row.query.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      if (posFilter === "top3" && row.position > 3) return false;
      if (posFilter === "top10" && row.position > 10) return false;
      if (posFilter === "page2" && row.position <= 10) return false;
      if (oppFilter && !(row.impressions >= avgImpressions && row.ctr < avgCtr)) {
        return false;
      }
      return true;
    });
  }, [queries, searchQuery, posFilter, oppFilter, avgImpressions, avgCtr]);

  // Sorted queries
  const sortedQueries = useMemo(() => {
    return [...filteredQueries].sort((a, b) => {
      let cmp = 0;
      if (sortField === "query") {
        cmp = a.query.localeCompare(b.query);
      } else {
        cmp = (a[sortField] ?? 0) - (b[sortField] ?? 0);
      }
      return sortDir === "desc" ? -cmp : cmp;
    });
  }, [filteredQueries, sortField, sortDir]);

  // Pagination (10 per page)
  const pagination = usePagination(sortedQueries.length, 10);
  const paginatedQueries = pagination.slice(sortedQueries);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir(field === "position" || field === "query" ? "asc" : "desc");
    }
  };

  const handleExportCsv = () => {
    const csvContent = toCsv(
      ["Search Query", "Clicks", "Impressions", "CTR (%)", "Average Position", "Previous Position", "Landing Page"],
      queries.map((row) => [row.query, row.clicks, row.impressions, row.ctr, row.position, row.previousPosition ?? "", row.page ?? ""]),
    );
    downloadFile(`gsc-search-queries-${period}.csv`, csvContent);
    toast.success("Queries exported to CSV");
  };

  // Position badge styler
  const renderPositionBadge = (pos: number) => {
    if (pos <= 3) {
      return (
        <span className="inline-flex items-center rounded-md bg-[#ECFDF5] px-1.5 py-0.5 font-mono text-[10.5px] font-bold text-[#065F46] ring-1 ring-inset ring-[#A7F3D0]">
          {pos.toFixed(1)}
        </span>
      );
    }
    if (pos <= 10) {
      return (
        <span className="inline-flex items-center rounded-md bg-[#EFF6FF] px-1.5 py-0.5 font-mono text-[10.5px] font-bold text-[#1E40AF] ring-1 ring-inset ring-[#BFDBFE]">
          {pos.toFixed(1)}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center rounded-md bg-[#FFFBEB] px-1.5 py-0.5 font-mono text-[10.5px] font-bold text-[#92400E] ring-1 ring-inset ring-[#FDE68A]">
        {pos.toFixed(1)}
      </span>
    );
  };

  const lastSyncText = rangeText(data.range, data.fetchedAt) || (integration?.lastSyncAt ? `Synced ${formatRelative(integration.lastSyncAt)}` : "Verified GSC API data");
  const compareSub = (fallback: string) =>
    !data.period ? fallback : data.previous ? `vs previous ${periodLabel(period)}` : data.previousRange ? `No data in the previous ${periodLabel(period)}` : "No earlier period (Google keeps 16 months)";

  return (
    <div className="space-y-2">
      {/* SECTION 1: Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 rounded-xl border border-[#E6EBF4] bg-white px-3.5 py-2.5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
        <div className="flex flex-wrap items-center gap-2.5">
          <Chip tone="good" dot className="font-medium">
            Google Search Console connected
          </Chip>
          <div className="flex items-center gap-1.5 text-[11.5px] text-[#6B7A94]">
            <span className="inline-block size-1 rounded-full bg-[#CBD5E1]" aria-hidden />
            <span className="font-medium text-[#4A5A73]">{loading ? `Loading ${periodLabel(period)}…` : lastSyncText}</span>
            {integration?.property ? (
              <>
                <span className="inline-block size-1 rounded-full bg-[#CBD5E1]" aria-hidden />
                <span className="font-mono text-[11px] text-[#28354C]">{integration.property}</span>
              </>
            ) : null}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <PeriodPicker value={period} onChange={onPeriodChange} />
          <WButton size="sm" icon={RefreshCw} onClick={onRefresh} disabled={refreshing}>
            {refreshing ? "Refreshing…" : "Refresh"}
          </WButton>
          <WButton size="sm" icon={Download} onClick={handleExportCsv}>
            Export CSV
          </WButton>
          <SheetsExportButton clientId={clientId} dataset="search" period={period} />
        </div>
      </div>

      {/* SECTION 2: 4 KPI Cards */}
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        <StatTile
          label="Total Clicks"
          value={formatNumber(totals.clicks)}
          delta={deltas.clicks ?? undefined}
          tone="info"
          icon={MousePointerClick}
          sub={compareSub("Organic search clicks")}
        />
        <StatTile
          label="Total Impressions"
          value={formatNumber(totals.impressions)}
          delta={deltas.impressions ?? undefined}
          tone="violet"
          icon={Eye}
          sub={compareSub("Search result impressions")}
        />
        <StatTile
          label="Average CTR"
          value={`${ctrPercent.toFixed(2)}%`}
          delta={deltas.ctr ?? undefined}
          deltaSuffix="pp"
          tone="good"
          icon={Target}
          sub={compareSub("Clicks / impressions")}
        />
        <StatTile
          label="Average Position"
          value={totals.position.toFixed(1)}
          delta={deltas.position ?? undefined}
          inverseDelta
          deltaSuffix=""
          tone="warn"
          icon={TrendingUp}
          sub={compareSub("GSC mean rank (lower is better)")}
        />
      </div>

      {/* SECTION 3: Search Performance Chart (Dual-Axes & Responsive) */}
      <Card
        title="Search Performance Trends"
        icon={Search}
        subtitle={`Daily organic clicks and impressions over the last ${periodLabel(period)}`}
        bodyClassName="p-3.5 pt-2"
        action={
          <div className="flex flex-wrap items-center gap-1.5" role="toolbar" aria-label="Chart metric views">
            <button
              type="button"
              onClick={() => setMetricView("both")}
              className={cn(
                "rounded-md px-2 py-1 text-[11px] font-medium transition-all",
                metricView === "both"
                  ? "bg-[#2563EB] text-white shadow-sm"
                  : "bg-[#F1F4F9] text-[#4A5A73] hover:bg-[#E2E8F0]",
              )}
            >
              All Metrics (Dual Axes)
            </button>
            <button
              type="button"
              onClick={() => setMetricView("clicks")}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-medium transition-all",
                metricView === "clicks"
                  ? "bg-[#EFF6FF] text-[#1D4ED8] ring-1 ring-inset ring-[#BFDBFE]"
                  : "bg-white text-[#94A3B8] hover:bg-[#F8FAFC]",
              )}
            >
              <span className="size-2 rounded-full bg-[#2563EB]" aria-hidden />
              <span>Clicks Only</span>
            </button>
            <button
              type="button"
              onClick={() => setMetricView("impressions")}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-medium transition-all",
                metricView === "impressions"
                  ? "bg-[#F5F3FF] text-[#6D28D9] ring-1 ring-inset ring-[#DDD6FE]"
                  : "bg-white text-[#94A3B8] hover:bg-[#F8FAFC]",
              )}
            >
              <span className="size-2 rounded-full bg-[#7C3AED]" aria-hidden />
              <span>Impressions Only</span>
            </button>
          </div>
        }
      >
        <div className="h-[250px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={sortedTrend} margin={{ top: 8, right: 14, left: -14, bottom: 0 }}>
              <CartesianGrid {...GRID_PROPS} />
              <XAxis dataKey="date" {...AXIS_PROPS} tickFormatter={formatShortDate} minTickGap={32} />

              {metricView === "both" ? (
                <>
                  <YAxis
                    yAxisId="left"
                    {...AXIS_PROPS}
                    width={46}
                    stroke="#2563EB"
                    tickFormatter={(val: number) => formatCompact(val)}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    {...AXIS_PROPS}
                    width={46}
                    stroke="#7C3AED"
                    tickFormatter={(val: number) => formatCompact(val)}
                  />
                </>
              ) : metricView === "clicks" ? (
                <YAxis
                  yAxisId="left"
                  {...AXIS_PROPS}
                  width={46}
                  stroke="#2563EB"
                  tickFormatter={(val: number) => formatCompact(val)}
                />
              ) : (
                <YAxis
                  yAxisId="right"
                  {...AXIS_PROPS}
                  width={46}
                  stroke="#7C3AED"
                  tickFormatter={(val: number) => formatCompact(val)}
                />
              )}

              <Tooltip
                content={(props) => {
                  if (!props.active || !props.payload?.length) return null;
                  const dateLabel = formatDate(String(props.label));
                  return (
                    <ChartTooltip
                      title={dateLabel}
                      rows={props.payload.map((item) => ({
                        name: String(item.name),
                        value: formatNumber(Number(item.value ?? 0)),
                        color: item.color,
                      }))}
                    />
                  );
                }}
              />

              {metricView === "both" || metricView === "clicks" ? (
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="clicks"
                  name="Clicks"
                  stroke={SERIES_COLORS[0]}
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{ r: 4, stroke: "#2563EB", strokeWidth: 2, fill: "#fff" }}
                />
              ) : null}

              {metricView === "both" || metricView === "impressions" ? (
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="impressions"
                  name="Impressions"
                  stroke={SERIES_COLORS[3]}
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{ r: 4, stroke: "#7C3AED", strokeWidth: 2, fill: "#fff" }}
                />
              ) : null}
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-2 flex flex-wrap items-center justify-between border-t border-[#F1F5F9] pt-2 text-[10.5px] text-[#6B7A94]">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-[#2563EB]" aria-hidden />
              <span className="font-medium text-[#111C3A]">Clicks</span> ({formatNumber(totals.clicks)} total)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-[#7C3AED]" aria-hidden />
              <span className="font-medium text-[#111C3A]">Impressions</span> ({formatNumber(totals.impressions)} total)
            </span>
          </div>
          <span className="text-[#94A3B8]">
            {metricView === "both"
              ? "Dual axes scaled independently for optimal readability"
              : `Showing focused view for ${metricView}`}
          </span>
        </div>
      </Card>

      {/* SECTION 4: Top Queries (Full-Width, Paginated, Filterable & Sortable) */}
      <Card
        title="Top Search Queries"
        icon={Search}
        subtitle={`${filteredQueries.length} of ${queries.length} queries displayed`}
        bodyClassName="p-0"
        action={
          <div className="flex flex-wrap items-center gap-2">
            {/* Search Input */}
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-[#94A3B8]" />
              <input
                type="text"
                placeholder="Search queries..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-7 w-36 rounded-md border border-[#DEE5EF] bg-white pl-8 pr-2.5 text-[11px] text-[#111C3A] placeholder-[#94A3B8] transition-all focus:w-48 focus:border-[#2563EB] focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
              />
            </div>

            {/* Position Filter */}
            <div className="flex items-center rounded-md border border-[#DEE5EF] bg-white p-0.5 text-[10.5px]">
              <button
                type="button"
                onClick={() => setPosFilter("all")}
                className={cn(
                  "rounded px-2 py-0.5 font-medium transition-colors",
                  posFilter === "all" ? "bg-[#2563EB] text-white" : "text-[#6B7A94] hover:text-[#111C3A]",
                )}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setPosFilter("top3")}
                className={cn(
                  "rounded px-2 py-0.5 font-medium transition-colors",
                  posFilter === "top3" ? "bg-[#2563EB] text-white" : "text-[#6B7A94] hover:text-[#111C3A]",
                )}
              >
                Top 3
              </button>
              <button
                type="button"
                onClick={() => setPosFilter("top10")}
                className={cn(
                  "rounded px-2 py-0.5 font-medium transition-colors",
                  posFilter === "top10" ? "bg-[#2563EB] text-white" : "text-[#6B7A94] hover:text-[#111C3A]",
                )}
              >
                Page 1
              </button>
              <button
                type="button"
                onClick={() => setPosFilter("page2")}
                className={cn(
                  "rounded px-2 py-0.5 font-medium transition-colors",
                  posFilter === "page2" ? "bg-[#2563EB] text-white" : "text-[#6B7A94] hover:text-[#111C3A]",
                )}
              >
                Page 2+
              </button>
            </div>

            {/* High Impression / Low CTR Opportunity Filter */}
            <button
              type="button"
              onClick={() => setOppFilter((prev) => !prev)}
              className={cn(
                "inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold transition-all",
                oppFilter
                  ? "bg-[#FEF3C7] text-[#92400E] ring-1 ring-inset ring-[#FCD34D]"
                  : "bg-[#F1F4F9] text-[#6B7A94] hover:bg-[#E2E8F0] hover:text-[#28354C]",
              )}
              title="Filter queries with high impressions but below-average CTR"
            >
              <Sparkles className="size-3 text-[#D97706]" />
              <span>Opportunities</span>
            </button>
          </div>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#EEF2F8] bg-[#FAFBFD] text-[10.5px] font-bold uppercase tracking-[0.05em] text-[#6B7A94]">
                <th
                  onClick={() => handleSort("query")}
                  className="cursor-pointer px-3.5 py-2.5 transition-colors hover:bg-[#F1F5F9]"
                >
                  <div className="flex items-center gap-1">
                    <span>Search Query</span>
                    <ArrowUpDown className="size-3 text-[#94A3B8]" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort("clicks")}
                  className="cursor-pointer px-3.5 py-2.5 text-right transition-colors hover:bg-[#F1F5F9] w-28"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Clicks</span>
                    <ArrowUpDown className="size-3 text-[#94A3B8]" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort("impressions")}
                  className="cursor-pointer px-3.5 py-2.5 text-right transition-colors hover:bg-[#F1F5F9] w-32"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Impressions</span>
                    <ArrowUpDown className="size-3 text-[#94A3B8]" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort("ctr")}
                  className="cursor-pointer px-3.5 py-2.5 text-right transition-colors hover:bg-[#F1F5F9] w-24"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>CTR</span>
                    <ArrowUpDown className="size-3 text-[#94A3B8]" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort("position")}
                  className="cursor-pointer px-3.5 py-2.5 text-right transition-colors hover:bg-[#F1F5F9] w-28"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Position</span>
                    <ArrowUpDown className="size-3 text-[#94A3B8]" />
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F5F9] text-[11px]">
              {paginatedQueries.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3.5 py-8 text-center text-[#6B7A94]">
                    No search queries found matching your filter criteria.
                  </td>
                </tr>
              ) : (
                paginatedQueries.map((row) => (
                  <tr key={row.query} className="cursor-pointer transition-colors hover:bg-[#F8FAFC]" onClick={() => setOpenQuery(row.query)}>
                    <td className="px-3.5 py-2.5">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="truncate font-medium text-[#111C3A]">{row.query}</span>
                        <QueryCopyButton text={row.query} label="Copy query" />
                      </div>
                      {row.page ? <p className="mt-0.5 truncate font-mono text-[10px] text-[#94A3B8]" title={row.page}>{shortPath(row.page)}</p> : null}
                    </td>
                    <td className="px-3.5 py-2.5 text-right font-mono font-semibold text-[#111C3A]">
                      {formatNumber(row.clicks)}
                    </td>
                    <td className="px-3.5 py-2.5 text-right font-mono text-[#4A5A73]">
                      {formatNumber(row.impressions)}
                    </td>
                    <td className="px-3.5 py-2.5 text-right font-mono font-semibold text-[#28354C]">
                      {row.ctr.toFixed(1)}%
                    </td>
                    <td className="px-3.5 py-2.5 text-right">
                      {renderPositionBadge(row.position)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer with Pagination */}
        {sortedQueries.length > 0 ? (
          <div className="border-t border-[#EEF2F8] px-3.5 py-2">
            <Pagination
              page={pagination.page}
              pageSize={pagination.pageSize}
              total={sortedQueries.length}
              onPageChange={pagination.setPage}
              onPageSizeChange={pagination.setPageSize}
            />
          </div>
        ) : null}
      </Card>

      {/* SECTION 5: Devices & Countries (Side-by-side & Compact) */}
      <div className="grid gap-2 lg:grid-cols-2">
        {/* Devices */}
        <Card
          title="Devices"
          icon={Monitor}
          subtitle="Platform breakdown across organic search"
          bodyClassName="p-3.5 space-y-3"
          action={
            <div className="flex items-center rounded-md border border-[#DEE5EF] bg-white p-0.5 text-[10px]">
              <button
                type="button"
                onClick={() => setDeviceMetric("clicks")}
                className={cn(
                  "rounded px-2 py-0.5 font-semibold transition-colors",
                  deviceMetric === "clicks" ? "bg-[#2563EB] text-white" : "text-[#6B7A94] hover:text-[#111C3A]",
                )}
              >
                Clicks
              </button>
              <button
                type="button"
                onClick={() => setDeviceMetric("impressions")}
                className={cn(
                  "rounded px-2 py-0.5 font-semibold transition-colors",
                  deviceMetric === "impressions" ? "bg-[#2563EB] text-white" : "text-[#6B7A94] hover:text-[#111C3A]",
                )}
              >
                Impressions
              </button>
            </div>
          }
        >
          {(() => {
            const total = devices.reduce((sum, d) => sum + (d[deviceMetric] || 0), 0) || 1;
            return (
              <div className="space-y-2.5">
                {devices.map((dev) => {
                  const val = dev[deviceMetric] || 0;
                  const share = Math.round((val / total) * 100);
                  const IconComp =
                    dev.device.toLowerCase() === "desktop"
                      ? Monitor
                      : dev.device.toLowerCase() === "tablet"
                        ? Tablet
                        : Smartphone;

                  return (
                    <div key={dev.device} className="flex items-center gap-2.5">
                      <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-[#EFF4FC] text-[#2563EB]">
                        <IconComp className="size-4" aria-hidden />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-semibold text-[#28354C]">{dev.device}</span>
                          <span className="font-mono font-semibold text-[#111C3A]">
                            {formatNumber(val)}{" "}
                            <span className="font-sans font-normal text-[#6B7A94]">({share}%)</span>
                          </span>
                        </div>
                        <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-[#EDF1F7]">
                          <div
                            className="h-full rounded-full bg-[#2563EB]"
                            style={{ width: `${Math.min(100, Math.max(2, share))}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </Card>

        {/* Top Countries */}
        <Card
          title="Top Countries"
          icon={Globe2}
          subtitle="Top international search markets"
          bodyClassName="p-3.5 space-y-3"
          action={
            <div className="flex items-center rounded-md border border-[#DEE5EF] bg-white p-0.5 text-[10px]">
              <button
                type="button"
                onClick={() => setCountryMetric("clicks")}
                className={cn(
                  "rounded px-2 py-0.5 font-semibold transition-colors",
                  countryMetric === "clicks" ? "bg-[#2563EB] text-white" : "text-[#6B7A94] hover:text-[#111C3A]",
                )}
              >
                Clicks
              </button>
              <button
                type="button"
                onClick={() => setCountryMetric("impressions")}
                className={cn(
                  "rounded px-2 py-0.5 font-semibold transition-colors",
                  countryMetric === "impressions" ? "bg-[#2563EB] text-white" : "text-[#6B7A94] hover:text-[#111C3A]",
                )}
              >
                Impressions
              </button>
            </div>
          }
        >
          {(() => {
            const total = countries.reduce((sum, c) => sum + (c[countryMetric] || 0), 0) || 1;
            return (
              <div className="space-y-2">
                {[...countries].sort((a, b) => (b[countryMetric] || 0) - (a[countryMetric] || 0)).slice(0, allCountries ? undefined : 10).map((c) => {
                  const val = c[countryMetric] || 0;
                  const share = Math.round((val / total) * 100);

                  return (
                    <div key={c.country} className="flex items-center gap-3">
                      <span className="w-28 shrink-0 truncate text-[11.5px] font-medium normal-case text-[#28354C]" title={c.countryName ?? c.country}>
                        {c.countryName ?? c.country.toUpperCase()}
                      </span>
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#EDF1F7]">
                        <div
                          className="h-full rounded-full bg-[#7C3AED]"
                          style={{ width: `${Math.min(100, Math.max(2, share))}%` }}
                        />
                      </div>
                      <div className="w-24 shrink-0 text-right font-mono text-[11px]">
                        <span className="font-semibold text-[#111C3A]">{formatNumber(val)}</span>{" "}
                        <span className="font-sans text-[10px] text-[#6B7A94]">({share}%)</span>
                      </div>
                    </div>
                  );
                })}
                {countries.length > 10 ? (
                  <button type="button" onClick={() => setAllCountries((v) => !v)} className="text-[11px] font-medium text-[#2563EB] hover:underline">
                    {allCountries ? "Show top 10" : `Show all ${countries.length} countries`}
                  </button>
                ) : null}
              </div>
            );
          })()}
        </Card>
      </div>

      <Sheet open={Boolean(openQuery)} onOpenChange={(open) => (open ? undefined : setOpenQuery(null))}>
        <SheetContent className="w-full max-w-xl border-[#E6EBF4] bg-white p-0 sm:max-w-xl">
          <SheetHeader className="border-[#EEF2F8] px-5 py-4 pr-12">
            <span className="text-[11px] font-semibold text-[#6B7A94]">Keyword · last {periodLabel(period)}</span>
            <SheetTitle className="text-[15px] font-semibold text-[#111C3A]">{openQuery ?? "Keyword"}</SheetTitle>
          </SheetHeader>
          <SheetBody className="px-5 py-4">{openQuery ? <QueryInsight clientId={clientId} query={openQuery} period={period} /> : null}</SheetBody>
          <SheetFooter className="border-t border-[#EEF2F8] px-5 py-3">
            <WButton onClick={() => setOpenQuery(null)}>Close</WButton>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}

function shortPath(url: string) {
  try {
    const u = new URL(url);
    return u.pathname === "/" ? `${u.hostname.replace(/^www\./, "")} (home)` : u.pathname;
  } catch {
    return url;
  }
}


function SeoDuplicatesTab({ groups, engine }: { groups: NonNullable<NonNullable<ReturnType<typeof useWebsiteSeo>["data"]>["duplicates"]>; engine?: string }) {
  const kindLabel: Record<string, string> = { title: "Title", description: "Meta description", h1: "H1", "exact-content": "Identical content", "near-content": "Near-identical content" };
  return (
    <Card title="Duplicate content" icon={ListTree} subtitle="Main content only — navigation, header and footer are excluded" bodyClassName="p-0">
      <DataTable
        dense
        columns={[
          { key: "kind", header: "Type", primary: true, cell: (g: (typeof groups)[number]) => <Chip tone={g.kind.includes("content") ? "bad" : "warn"}>{kindLabel[g.kind] ?? g.kind}</Chip> },
          { key: "value", header: "Shared value", cell: (g: (typeof groups)[number]) => <span className="line-clamp-2 text-[11px] text-[#28354C]">{g.kind === "exact-content" || g.kind === "near-content" ? `${g.urls.length} pages` : g.value}</span> },
          { key: "sim", header: "Similarity", align: "center", cell: (g: (typeof groups)[number]) => (g.similarityPct === null ? "—" : `${g.similarityPct}%`) },
          { key: "urls", header: "Affected URLs", cell: (g: (typeof groups)[number]) => <ul className="space-y-0.5">{g.urls.slice(0, 5).map((u) => <li key={u} className="truncate font-mono text-[10.5px] text-[#6B7A94]">{u}</li>)}{g.urls.length > 5 ? <li className="text-[10px] text-[#94A3B8]">+{g.urls.length - 5} more</li> : null}</ul> },
        ]}
        rows={groups}
        getRowId={(g) => `${g.kind}-${g.value}`}
        empty={<EmptyState title={engine === "m2" ? "No duplicates found" : "Run a new scan"} body={engine === "m2" ? "No two crawled pages share a title, description, H1 or main content." : "Duplicate detection needs a scan made with the current audit engine."} icon={ShieldCheck} compact />}
      />
    </Card>
  );
}
