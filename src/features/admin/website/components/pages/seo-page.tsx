"use client";

/**
 * SEO — what the crawl found, plus real search data when Search Console is
 * connected. The Search Performance tab is the one place organic numbers can
 * come from; without the integration it stays locked rather than estimated.
 */

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Bot,
  Braces,
  Download,
  ExternalLink,
  FileCode2,
  Link2,
  ListTree,
  RefreshCw,
  Search,
  ShieldCheck,
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
import { useWebsiteCapabilities, useWebsiteIssues, useWebsitePages, useWebsiteSeo } from "../../data/hooks";
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
import type { IssueRecord, PageRecord, SearchQueryRow, SitemapEntry } from "../../data/types";
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
  usePagination,
  WButton,
  type Column,
} from "../ui/kit";
import { AXIS_PROPS, ChartLegend, GRID_PROPS, makeTooltip, SERIES_COLORS } from "../ui/charts";
import { EmptyState, LockedState, QueryErrorState, SkeletonBlock, SkeletonStats, SkeletonTable } from "../ui/states";
import { ScoreCell } from "./overview-page";
import { useUrlState } from "../use-url-state";
import { useWebsiteWorkspace } from "../website-workspace";

type SeoTab = "overview" | "issues" | "pages" | "links" | "sitemap" | "robots" | "schema" | "search";

const TABS: { value: SeoTab; label: string }[] = [
  { value: "overview", label: "Overview" },
  { value: "issues", label: "Issues" },
  { value: "pages", label: "Pages" },
  { value: "links", label: "Links" },
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
    () => sortIssues((issues.data ?? []).filter((issue) => issue.status === "open" && issue.category === "seo")),
    [issues.data],
  );

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
                <Card title="OmniPlatform SEO score" icon={Search} subtitle="Composite of every on-page check we run" bodyClassName="p-2.5">
                  <div className="grid grid-cols-[1fr_1fr] items-stretch gap-2.5 h-full">
                    <div className="flex flex-col items-center justify-center gap-1 rounded-xl border border-[#E6EBF4] bg-gradient-to-br from-[#FAFCFF] to-[#F1F5F9] p-2.5 shadow-sm h-full">
                      <ScoreDial
                        value={seo.data.overview.score}
                        tone={scoreBand(seo.data.overview.score)}
                        size={68}
                        label={`SEO score ${seo.data.overview.score}`}
                      />
                      <div className="flex flex-col items-center text-center mt-1">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-[#64748B] mb-0.5">
                          Overall Score
                        </p>
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
                        <span className="text-[11.5px] font-bold text-[#991B1B]">{formatNumber(seo.data.overview.errors)}</span>
                      </div>
                      <div className="flex items-center justify-between rounded-lg bg-[#FFFBEB] py-1 px-2.5 border border-[#FEF3C7]">
                        <span className="text-[11px] font-semibold text-[#B45309]">Warnings</span>
                        <span className="text-[11.5px] font-bold text-[#92400E]">{formatNumber(seo.data.overview.warnings)}</span>
                      </div>
                      <div className="flex items-center justify-between rounded-lg bg-[#F0FDF4] py-1 px-2.5 border border-[#DCFCE7]">
                        <span className="text-[11px] font-semibold text-[#15803D]">Passed checks</span>
                        <span className="text-[11.5px] font-bold text-[#166534]">{formatNumber(seo.data.overview.passedChecks)}</span>
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
                    {seo.data.overview.categories.map((category) => (
                      <li key={category.key} className="flex flex-col gap-1.5 rounded-xl border border-[#E6EBF4] bg-white px-2.5 py-1.5 shadow-sm transition-all hover:border-[#C9D6EA] hover:shadow-md">
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-[11.5px] font-bold text-[#0F172A]">{category.label}</span>
                          <b
                            className={cn(
                              "text-[12.5px] font-extrabold",
                              scoreBand(category.score) === "good"
                                ? "text-[#10B981]"
                                : scoreBand(category.score) === "warn"
                                  ? "text-[#F59E0B]"
                                  : "text-[#EF4444]",
                            )}
                          >
                            {category.score}
                          </b>
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
                          <Meter value={category.score} tone={scoreBand(category.score)} label={category.label} />
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
                  sub="SEO score 80 or above"
                  tone="good"
                  icon={ShieldCheck}
                  onClick={() => navigate("/admin/website/pages?seo=good")}
                />
                <StatTile
                  label="Warning pages"
                  value={formatNumber(seo.data.overview.warningPages)}
                  sub="SEO score 60–79"
                  tone="warn"
                  icon={TriangleAlert}
                  onClick={() => navigate("/admin/website/pages?seo=warn")}
                />
                <StatTile
                  label="Critical pages"
                  value={formatNumber(seo.data.overview.criticalPages)}
                  sub="SEO score below 60"
                  tone="bad"
                  icon={TriangleAlert}
                  onClick={() => navigate("/admin/website/pages?seo=bad")}
                />
                <StatTile
                  label="Open SEO issues"
                  value={formatNumber(seoIssues.length)}
                  sub="Across every category"
                  tone="info"
                  icon={Search}
                  onClick={() => setTab("issues")}
                />
              </div>
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

          {tab === "links" ? <SeoLinksTab data={seo.data.links} /> : null}

          {tab === "sitemap" ? <SitemapTab report={seo.data.sitemap} /> : null}

          {tab === "robots" ? <RobotsTab report={seo.data.robots} /> : null}

          {tab === "schema" ? <SchemaTab report={seo.data.schema} /> : null}

          {tab === "search" ? (
            searchFeature.available && seo.data.searchConsole ? (
              <SearchConsoleTab data={seo.data.searchConsole} />
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
            getRowId={(row) => `${row.from}-${row.to}`}
            empty={<EmptyState title="No broken links" body="Every link resolved on the last crawl." icon={ShieldCheck} compact />}
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
          body="We could not find sitemap.xml at the usual locations or in robots.txt. A sitemap helps search engines find every page."
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
      cell: (entry) => (
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
                  report.entries.map((entry) => [entry.loc, entry.status, entry.lastModified, entry.valid ? "Yes" : "No", entry.note]),
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
          body="Without robots.txt, crawlers assume everything is allowed. That is usually fine, but a file lets you exclude search and admin paths."
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

function SearchConsoleTab({ data }: { data: NonNullable<NonNullable<ReturnType<typeof useWebsiteSeo>["data"]>["searchConsole"]> }) {
  const queryColumns: Column<SearchQueryRow>[] = [
    {
      key: "query",
      header: "Query",
      primary: true,
      sortValue: (row) => row.query,
      cell: (row) => <span className="truncate text-[11.5px] font-medium text-[#28354C]">{row.query}</span>,
    },
    { key: "clicks", header: "Clicks", align: "right", sortValue: (row) => row.clicks, cell: (row) => formatNumber(row.clicks) },
    {
      key: "impressions",
      header: "Impressions",
      align: "right",
      sortValue: (row) => row.impressions,
      cell: (row) => formatCompact(row.impressions),
    },
    { key: "ctr", header: "CTR", align: "right", sortValue: (row) => row.ctr, cell: (row) => `${row.ctr.toFixed(1)}%` },
    {
      key: "position",
      header: "Position",
      align: "right",
      sortValue: (row) => row.position,
      cell: (row) => row.position.toFixed(1),
    },
  ];

  return (
    <div className="space-y-1">
      <div className="grid grid-cols-2 gap-1 lg:grid-cols-4">
        <StatTile label="Clicks" value={formatNumber(data.totals.clicks)} delta={data.deltas.clicks} tone="info" sub="Last 28 days" />
        <StatTile label="Impressions" value={formatCompact(data.totals.impressions)} delta={data.deltas.impressions} tone="violet" sub="Last 28 days" />
        <StatTile label="CTR" value={`${data.totals.ctr.toFixed(2)}%`} delta={data.deltas.ctr} deltaSuffix="pp" tone="good" sub="Clicks ÷ impressions" />
        <StatTile
          label="Average position"
          value={data.totals.position.toFixed(1)}
          delta={data.deltas.position}
          inverseDelta
          deltaSuffix=""
          tone="warn"
          sub="Lower is better"
        />
      </div>

      <Card title="Search performance" icon={Search} subtitle="Google Search Console · last 28 days" bodyClassName="p-3.5 pt-2">
        <ChartLegend
          className="mb-1"
          items={[
            { key: "clicks", label: "Clicks", color: SERIES_COLORS[0] },
            { key: "impressions", label: "Impressions", color: SERIES_COLORS[3] },
          ]}
        />
        <div className="h-[220px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data.trend} margin={{ top: 6, right: 8, left: -18, bottom: 0 }}>
              <CartesianGrid {...GRID_PROPS} />
              <XAxis dataKey="date" {...AXIS_PROPS} tickFormatter={formatShortDate} minTickGap={28} />
              <YAxis {...AXIS_PROPS} width={46} tickFormatter={(value: number) => formatCompact(value)} />
              <Tooltip content={makeTooltip((entry) => formatNumber(entry.value), (label) => formatDate(label))} />
              <Line type="monotone" dataKey="clicks" name="Clicks" stroke={SERIES_COLORS[0]} strokeWidth={2} dot={false} />
              <Line
                type="monotone"
                dataKey="impressions"
                name="Impressions"
                stroke={SERIES_COLORS[3]}
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <p className="mt-1 text-[10px] text-[#94A3B8]">
          Clicks and impressions share one axis, so the gap between them is the real gap — not a rescaled one.
        </p>
      </Card>

      <div className="grid gap-1 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <Card title="Top queries" icon={Search} bodyClassName="p-0">
          <DataTable columns={queryColumns} rows={data.queries} getRowId={(row) => row.query} empty={<EmptyState title="No queries" body="No search data in this period." />} dense />
        </Card>

        <div className="grid gap-1">
          <Card title="Devices" icon={ListTree} bodyClassName="p-3.5 pt-2">
            <div className="h-[132px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.devices} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid {...GRID_PROPS} />
                  <XAxis dataKey="device" {...AXIS_PROPS} />
                  <YAxis {...AXIS_PROPS} width={42} tickFormatter={(value: number) => formatCompact(value)} />
                  <Tooltip content={makeTooltip((entry) => formatNumber(entry.value), (label) => label)} cursor={{ fill: "#F4F7FB" }} />
                  <Bar dataKey="clicks" name="Clicks" fill={SERIES_COLORS[0]} radius={[4, 4, 0, 0]} maxBarSize={38} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card title="Top countries" icon={ListTree} bodyClassName="p-0">
            <ul className="divide-y divide-[#F2F5FA]">
              {data.countries.map((country) => (
                <li key={country.country} className="flex items-center justify-between gap-2 px-3.5 py-2">
                  <span className="text-[11.5px] text-[#334155]">{country.country}</span>
                  <span className="text-[11.5px] font-semibold text-[#28354C]">{formatNumber(country.clicks)}</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}
