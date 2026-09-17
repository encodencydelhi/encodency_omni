"use client";

/**
 * Pages — everything the crawler found.
 *
 * This is a discovery view, not a CMS: there is no edit, publish, duplicate or
 * delete here, because we have no write access to the client's website. Every
 * action either opens our audit or opens their live page.
 */

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Copy,
  Download,
  ExternalLink,
  FileSearch,
  FileStack,
  MoreHorizontal,
  RefreshCw,
  X,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useWebsiteIssues, useWebsitePages } from "../../data/hooks";
import { websiteRepository } from "../../data/repository";
import {
  ageInHours,
  downloadFile,
  formatNumber,
  formatRelative,
  httpStatusTone,
  matchesPageSearch,
  pageTypeLabel,
  scoreBand,
  slugForFile,
  toCsv,
} from "../../data/selectors";
import type { PageRecord, PageType } from "../../data/types";
import {
  Card,
  Chip,
  DataTable,
  FilterSelect,
  Pagination,
  SearchInput,
  SubTabs,
  Toolbar,
  usePagination,
  useSortedRows,
  WButton,
  type Column,
  type SortState,
} from "../ui/kit";
import { EmptyState, QueryErrorState, SkeletonTable } from "../ui/states";
import { ScoreCell } from "./overview-page";
import { useUrlParams, useUrlState } from "../use-url-state";
import { useWebsiteWorkspace } from "../website-workspace";

type TypeFilter = "all" | PageType;

const TYPE_TABS: { value: TypeFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "standard", label: "Standard" },
  { value: "landing", label: "Landing pages" },
  { value: "blog", label: "Blog" },
  { value: "legal", label: "Legal" },
  { value: "utility", label: "Utility" },
  { value: "redirect", label: "Redirects" },
  { value: "error", label: "Errors" },
];

const STATUS_OPTIONS = [
  { value: "all", label: "Any HTTP status" },
  { value: "200", label: "200 OK" },
  { value: "3xx", label: "3xx Redirect" },
  { value: "404", label: "404 Not found" },
  { value: "5xx", label: "5xx Server error" },
];

const SCORE_OPTIONS = [
  { value: "all", label: "Any score" },
  { value: "good", label: "Good (80+)" },
  { value: "warn", label: "Needs work (60–79)" },
  { value: "bad", label: "Poor (< 60)" },
];

const ISSUE_OPTIONS = [
  { value: "all", label: "Any issue count" },
  { value: "critical", label: "Has critical issues" },
  { value: "any", label: "Has issues" },
  { value: "none", label: "No issues" },
];

const SCANNED_OPTIONS = [
  { value: "all", label: "Any scan time" },
  { value: "24h", label: "Scanned in last 24h" },
  { value: "7d", label: "Scanned in last 7 days" },
  { value: "older", label: "Older than 7 days" },
];

function inScoreBand(value: number | null, band: string): boolean {
  if (band === "all") return true;
  if (value === null) return false;
  return scoreBand(value) === (band === "good" ? "good" : band === "warn" ? "warn" : "bad");
}

export function WebsitePagesListPage() {
  const router = useRouter();
  const { clientId, runScan, scan, navigate } = useWebsiteWorkspace();
  const pages = useWebsitePages(clientId);
  const issues = useWebsiteIssues(clientId);
  const { get, setMany } = useUrlParams();

  const [type, setType] = useUrlState<TypeFilter>("type", "all", [
    "all",
    "standard",
    "landing",
    "blog",
    "legal",
    "utility",
    "redirect",
    "error",
  ]);
  // Sort key and direction are written together: two separate query-param
  // writes in one handler would each start from the same stale snapshot and
  // the second would drop the first.
  const sortKey = get("sort") ?? "issues";
  const sortDir = get("dir") === "asc" ? "asc" : "desc";

  const search = get("q") ?? "";
  const status = get("status") ?? "all";
  const seoBand = get("seo") ?? "all";
  const perfBand = get("perf") ?? "all";
  const a11yBand = get("a11y") ?? "all";
  const issueFilter = get("issues") ?? "all";
  const scanned = get("scanned") ?? "all";
  const issueId = get("issue");

  const focusedIssue = useMemo(
    () => (issues.data ?? []).find((issue) => issue.id === issueId) ?? null,
    [issues.data, issueId],
  );

  const all = useMemo(() => pages.data ?? [], [pages.data]);

  const typeCounts = useMemo(() => {
    const counts = new Map<TypeFilter, number>([["all", all.length]]);
    for (const page of all) counts.set(page.type, (counts.get(page.type) ?? 0) + 1);
    return counts;
  }, [all]);

  const filtered = useMemo(
    () =>
      all.filter((page) => {
        if (type !== "all" && page.type !== type) return false;
        if (!matchesPageSearch(page, search)) return false;
        if (focusedIssue && !focusedIssue.affectedPageIds.includes(page.id)) return false;

        if (status !== "all") {
          if (status === "200" && page.httpStatus !== 200) return false;
          if (status === "3xx" && !(page.httpStatus >= 300 && page.httpStatus < 400)) return false;
          if (status === "404" && page.httpStatus !== 404) return false;
          if (status === "5xx" && page.httpStatus < 500) return false;
        }

        if (!inScoreBand(page.seoScore, seoBand)) return false;
        if (!inScoreBand(page.performanceScore, perfBand)) return false;
        if (!inScoreBand(page.accessibilityScore, a11yBand)) return false;

        if (issueFilter === "critical" && page.criticalIssueCount === 0) return false;
        if (issueFilter === "any" && page.issueCount === 0) return false;
        if (issueFilter === "none" && page.issueCount > 0) return false;

        if (scanned !== "all") {
          const ageHours = ageInHours(page.lastScannedAt);
          if (scanned === "24h" && ageHours > 24) return false;
          if (scanned === "7d" && ageHours > 24 * 7) return false;
          if (scanned === "older" && ageHours <= 24 * 7) return false;
        }

        return true;
      }),
    [all, type, search, focusedIssue, status, seoBand, perfBand, a11yBand, issueFilter, scanned],
  );

  const columns = useMemo<Column<PageRecord>[]>(
    () => [
      {
        key: "page",
        header: "Page",
        primary: true,
        width: "26%",
        sortValue: (page) => page.title,
        cell: (page) => (
          <div className="min-w-0">
            <p className="truncate text-[11.5px] font-semibold text-[#28354C]">{page.title}</p>
            <p className="truncate font-mono text-[10.5px] text-[#6B7A94]">{page.path}</p>
          </div>
        ),
      },
      {
        key: "type",
        header: "Type",
        sortValue: (page) => page.type,
        cell: (page) => (
          <Chip tone={page.type === "error" ? "bad" : page.type === "redirect" ? "warn" : "muted"}>
            {pageTypeLabel[page.type]}
          </Chip>
        ),
      },
      {
        key: "status",
        header: "HTTP",
        align: "center",
        sortValue: (page) => page.httpStatus,
        cell: (page) => <Chip tone={httpStatusTone(page.httpStatus)}>{page.httpStatus}</Chip>,
      },
      {
        key: "seo",
        header: "SEO",
        align: "center",
        sortValue: (page) => page.seoScore ?? -1,
        cell: (page) => <ScoreCell value={page.seoScore} />,
      },
      {
        key: "perf",
        header: "Perf",
        align: "center",
        sortValue: (page) => page.performanceScore ?? -1,
        cell: (page) => <ScoreCell value={page.performanceScore} />,
      },
      {
        key: "a11y",
        header: "A11y",
        align: "center",
        sortValue: (page) => page.accessibilityScore ?? -1,
        cell: (page) => <ScoreCell value={page.accessibilityScore} />,
      },
      {
        key: "words",
        header: "Words",
        align: "right",
        sortValue: (page) => page.wordCount,
        cell: (page) => (
          <span className={page.wordCount > 0 && page.wordCount < 300 ? "font-semibold text-[#9A5B08]" : ""}>
            {page.wordCount > 0 ? formatNumber(page.wordCount) : "—"}
          </span>
        ),
      },
      {
        key: "issues",
        header: "Issues",
        align: "center",
        sortValue: (page) => page.criticalIssueCount * 100 + page.issueCount,
        cell: (page) =>
          page.issueCount === 0 ? (
            <Chip tone="good">Clean</Chip>
          ) : (
            <span className="inline-flex items-center gap-1">
              <b className="text-[12px] font-semibold text-[#28354C]">{page.issueCount}</b>
              {page.criticalIssueCount > 0 ? <Chip tone="bad">{page.criticalIssueCount} critical</Chip> : null}
            </span>
          ),
      },
      {
        key: "scanned",
        header: "Last scanned",
        sortValue: (page) => page.lastScannedAt,
        hideOnMobile: true,
        cell: (page) => <span className="text-[11px] text-[#6B7A94]">{formatRelative(page.lastScannedAt)}</span>,
      },
    ],
    [],
  );

  const sort: SortState = { key: sortKey, direction: sortDir };
  const sorted = useSortedRows(filtered, columns, sort);
  const pagination = usePagination(sorted.length, 25);
  const visible = pagination.slice(sorted);

  const exportAudit = (page: PageRecord) => {
    void websiteRepository
      .getPageAudit(clientId, page.id)
      .then((audit) => {
        const rows = [
          ...audit.seoChecks.map((check) => ["SEO", check.label, check.status, check.value ?? "", check.detail]),
          ...audit.technicalChecks.map((check) => ["Technical", check.label, check.status, check.value ?? "", check.detail]),
          ...audit.accessibilityChecks.map((check) => [
            "Accessibility",
            check.label,
            check.status,
            check.value ?? "",
            check.detail,
          ]),
        ];
        downloadFile(
          `${slugForFile(page.path === "/" ? "home" : page.path)}-audit.csv`,
          toCsv(["Group", "Check", "Status", "Value", "Detail"], rows),
        );
        toast.success("Page audit exported");
      })
      .catch(() => toast.error("Could not export this audit."));
  };

  const clearFilters = () =>
    setMany({ q: null, status: null, seo: null, perf: null, a11y: null, issues: null, scanned: null, issue: null });

  const filtersActive =
    Boolean(search) ||
    status !== "all" ||
    seoBand !== "all" ||
    perfBand !== "all" ||
    a11yBand !== "all" ||
    issueFilter !== "all" ||
    scanned !== "all" ||
    Boolean(issueId);

  return (
    <div className="space-y-1">
      <Card
        title="Discovered pages"
        subtitle="Found by crawling the public website — read-only, because we have no CMS access"
        icon={FileStack}
        action={
          <>
            <WButton
              size="sm"
              icon={RefreshCw}
              disabled={scan.isRunning}
              disabledReason="A scan is already running"
              onClick={() => runScan("full-crawl")}
            >
              Re-crawl
            </WButton>
            <WButton
              size="sm"
              icon={Download}
              disabled={sorted.length === 0}
              disabledReason="Nothing to export with the current filters"
              onClick={() => {
                downloadFile(
                  "website-pages.csv",
                  toCsv(
                    ["Title", "Path", "Type", "HTTP", "SEO", "Performance", "Accessibility", "Words", "Issues", "Last scanned"],
                    sorted.map((page) => [
                      page.title,
                      page.path,
                      pageTypeLabel[page.type],
                      page.httpStatus,
                      page.seoScore,
                      page.performanceScore,
                      page.accessibilityScore,
                      page.wordCount,
                      page.issueCount,
                      page.lastScannedAt,
                    ]),
                  ),
                );
                toast.success(`${sorted.length} pages exported`);
              }}
            >
              Export
            </WButton>
          </>
        }
        bodyClassName="p-0"
      >
        <div className="space-y-2.5 border-b border-[#EEF2F8] p-3">
          <SubTabs
            ariaLabel="Page type"
            value={type}
            onChange={(next) => {
              setType(next);
              pagination.reset();
            }}
            options={TYPE_TABS.map((tab) => ({
              value: tab.value,
              label: tab.label,
              count: typeCounts.get(tab.value) ?? 0,
            }))}
          />

          <Toolbar>
            <SearchInput
              className="w-full sm:w-64"
              label="Search pages by title or URL"
              placeholder="Search title or URL…"
              value={search}
              onChange={(value) => {
                setMany({ q: value || null });
                pagination.reset();
              }}
            />
            <FilterSelect label="HTTP status" value={status} options={STATUS_OPTIONS} onChange={(value) => setMany({ status: value === "all" ? null : value })} />
            <FilterSelect label="SEO health" value={seoBand} options={SCORE_OPTIONS.map((o) => ({ ...o, label: o.value === "all" ? "Any SEO score" : o.label }))} onChange={(value) => setMany({ seo: value === "all" ? null : value })} />
            <FilterSelect label="Performance" value={perfBand} options={SCORE_OPTIONS.map((o) => ({ ...o, label: o.value === "all" ? "Any performance" : o.label }))} onChange={(value) => setMany({ perf: value === "all" ? null : value })} />
            <FilterSelect label="Accessibility" value={a11yBand} options={SCORE_OPTIONS.map((o) => ({ ...o, label: o.value === "all" ? "Any accessibility" : o.label }))} onChange={(value) => setMany({ a11y: value === "all" ? null : value })} />
            <FilterSelect label="Issues" value={issueFilter} options={ISSUE_OPTIONS} onChange={(value) => setMany({ issues: value === "all" ? null : value })} />
            <FilterSelect label="Last scanned" value={scanned} options={SCANNED_OPTIONS} onChange={(value) => setMany({ scanned: value === "all" ? null : value })} />
            {filtersActive ? (
              <WButton size="sm" icon={X} onClick={clearFilters}>
                Clear filters
              </WButton>
            ) : null}
          </Toolbar>

          {focusedIssue ? (
            <div className="flex flex-wrap items-center gap-2 rounded-md bg-[#EFF5FE] px-2.5 py-1.5">
              <span className="text-[11px] text-[#1D4ED8]">
                Showing pages affected by <b className="font-semibold">{focusedIssue.title}</b>
              </span>
              <WButton size="sm" icon={X} onClick={() => setMany({ issue: null })}>
                Remove filter
              </WButton>
            </div>
          ) : null}
        </div>

        {pages.isLoading ? (
          <SkeletonTable rows={8} />
        ) : pages.error ? (
          <QueryErrorState error={pages.error} onRetry={() => void pages.refetch()} />
        ) : (
          <>
            <DataTable<PageRecord>
              columns={columns}
              rows={visible}
              getRowId={(page) => page.id}
              sort={sort}
              onSortChange={(next) =>
                setMany({
                  sort: next.key === "issues" ? null : next.key,
                  dir: next.direction === "desc" ? null : next.direction,
                })
              }
              onRowClick={(page) => router.push(`/admin/website/pages/${encodeURIComponent(page.id)}`)}
              caption="Discovered pages with audit scores"
              empty={
                all.length === 0 ? (
                  <EmptyState
                    title="No pages discovered"
                    body="The crawler has not found any pages on this website yet. Run a crawl to discover them."
                    actions={
                      <WButton tone="primary" icon={RefreshCw} onClick={() => runScan("full-crawl")}>
                        Run a crawl
                      </WButton>
                    }
                  />
                ) : (
                  <EmptyState
                    title="No pages match these filters"
                    body="Try widening the filters, or clear them to see every discovered page."
                    actions={<WButton onClick={clearFilters}>Clear filters</WButton>}
                  />
                )
              }
              rowActions={(page) => (
                <div className="flex items-center justify-end gap-1">
                  <WButton
                    size="sm"
                    icon={FileSearch}
                    onClick={() => router.push(`/admin/website/pages/${encodeURIComponent(page.id)}`)}
                  >
                    Audit
                  </WButton>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        aria-label={`More actions for ${page.path}`}
                        className="grid size-7 cursor-pointer place-items-center rounded-md border border-[#DAE1EC] bg-white text-[#4A5A73] hover:bg-[#F7F9FC] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]/35"
                      >
                        <MoreHorizontal className="size-3.5" aria-hidden />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem
                        className="text-[12px]"
                        onSelect={() => router.push(`/admin/website/pages/${encodeURIComponent(page.id)}`)}
                      >
                        <FileSearch className="size-3.5" /> View audit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-[12px]"
                        disabled={scan.isRunning}
                        onSelect={() => runScan("page", page.id)}
                      >
                        <RefreshCw className="size-3.5" /> Re-scan page
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-[12px]"
                        onSelect={() => window.open(page.url, "_blank", "noopener,noreferrer")}
                      >
                        <ExternalLink className="size-3.5" /> Open live page
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-[12px]"
                        onSelect={() => {
                          void navigator.clipboard
                            .writeText(page.url)
                            .then(() => toast.success("URL copied"))
                            .catch(() => toast.error("Could not copy the URL."));
                        }}
                      >
                        <Copy className="size-3.5" /> Copy URL
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-[12px]" onSelect={() => exportAudit(page)}>
                        <Download className="size-3.5" /> Export audit
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )}
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
          </>
        )}
      </Card>

      <p className="px-1 text-[11px] text-[#94A3B8]">
        Landing pages appear here as a page type. Editing, publishing and deleting are not offered:{" "}
        <button
          type="button"
          onClick={() => navigate("/admin/website/settings")}
          className="cursor-pointer font-semibold text-[#2563EB] hover:underline"
        >
          this module observes the website from outside
        </button>
        .
      </p>
    </div>
  );
}
