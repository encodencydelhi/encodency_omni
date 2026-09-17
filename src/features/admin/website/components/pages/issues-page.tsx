"use client";

/**
 * Issues — every finding, from every category, in one place.
 *
 * "Mark resolved" changes our record, not the website. Nothing here claims an
 * external site was fixed automatically; the next scan is the only thing that
 * can confirm a fix.
 */

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowRight,
  CheckCheck,
  Download,
  RefreshCw,
  ShieldCheck,
  TriangleAlert,
  Wrench,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useSetIssueStatus, useWebsiteIssues, useWebsitePages } from "../../data/hooks";
import {
  ageInHours,
  categoryLabel,
  downloadFile,
  formatDate,
  formatRelative,
  severityLabel,
  severityTone,
  sortIssues,
  toCsv,
} from "../../data/selectors";
import type { IssueCategory, IssueRecord, Severity } from "../../data/types";
import {
  Card,
  Chip,
  FilterSelect,
  SearchInput,
  StatTile,
  SubTabs,
  Pagination,
  Toolbar,
  usePagination,
  WButton,
} from "../ui/kit";
import { EmptyState, QueryErrorState, SkeletonBlock, SkeletonStats } from "../ui/states";
import { useUrlParams, useUrlState } from "../use-url-state";
import { useWebsiteWorkspace } from "../website-workspace";

type IssueTab = "all" | Severity | "resolved";

const TABS: { value: IssueTab; label: string }[] = [
  { value: "all", label: "All" },
  { value: "critical", label: "Critical" },
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
  { value: "resolved", label: "Resolved" },
];

const CATEGORIES: IssueCategory[] = [
  "seo",
  "performance",
  "accessibility",
  "links",
  "monitoring",
  "ssl",
  "forms",
  "security",
  "technical",
];

const AGE_OPTIONS = [
  { value: "all", label: "Any age" },
  { value: "24h", label: "Detected in last 24h" },
  { value: "7d", label: "Detected in last 7 days" },
  { value: "30d", label: "Detected in last 30 days" },
  { value: "older", label: "Older than 30 days" },
];

export function WebsiteIssuesPage() {
  const router = useRouter();
  const { clientId, runScan, scan, openIssue, openFixGuide, navigate } = useWebsiteWorkspace();
  const issues = useWebsiteIssues(clientId);
  const pages = useWebsitePages(clientId);
  const setStatus = useSetIssueStatus(clientId);
  const { get, setMany } = useUrlParams();

  const [tab, setTab] = useUrlState<IssueTab>("severity", "all", TABS.map((entry) => entry.value));
  const search = get("q") ?? "";
  const category = get("category") ?? "all";
  const pageFilter = get("page") ?? "all";
  const age = get("age") ?? "all";

  const all = useMemo(() => issues.data ?? [], [issues.data]);
  const pageOptions = useMemo(
    () => [
      { value: "all", label: "Any page" },
      ...(pages.data ?? []).map((page) => ({ value: page.id, label: page.path })),
    ],
    [pages.data],
  );

  const counts = useMemo(() => {
    const open = all.filter((issue) => issue.status === "open");
    return {
      all: open.length,
      critical: open.filter((issue) => issue.severity === "critical").length,
      high: open.filter((issue) => issue.severity === "high").length,
      medium: open.filter((issue) => issue.severity === "medium").length,
      low: open.filter((issue) => issue.severity === "low").length,
      resolved: all.filter((issue) => issue.status === "resolved").length,
    };
  }, [all]);

  const filtered = useMemo(() => {
    const rows = all.filter((issue) => {
      if (tab === "resolved") {
        if (issue.status !== "resolved") return false;
      } else {
        if (issue.status !== "open") return false;
        if (tab !== "all" && issue.severity !== tab) return false;
      }
      if (category !== "all" && issue.category !== category) return false;
      if (pageFilter !== "all" && !issue.affectedPageIds.includes(pageFilter)) return false;
      if (search.trim()) {
        const needle = search.trim().toLowerCase();
        if (!`${issue.title} ${issue.description} ${issue.recommendation}`.toLowerCase().includes(needle)) return false;
      }
      if (age !== "all") {
        const hours = ageInHours(issue.detectedAt);
        if (age === "24h" && hours > 24) return false;
        if (age === "7d" && hours > 24 * 7) return false;
        if (age === "30d" && hours > 24 * 30) return false;
        if (age === "older" && hours <= 24 * 30) return false;
      }
      return true;
    });
    return sortIssues(rows);
  }, [all, tab, category, pageFilter, search, age]);

  const pagination = usePagination(filtered.length, 10);
  const visible = pagination.slice(filtered);

  const filtersActive = category !== "all" || pageFilter !== "all" || age !== "all" || Boolean(search);

  const clearFilters = () => setMany({ category: null, page: null, age: null, q: null });

  return (
    <div className="space-y-1">
      <div className="grid grid-cols-2 gap-1 lg:grid-cols-4">
        <StatTile
          label="Open issues"
          value={counts.all}
          sub="Across every category"
          icon={TriangleAlert}
          tone={counts.all > 0 ? "warn" : "good"}
          onClick={() => setTab("all")}
        />
        <StatTile
          label="Critical"
          value={counts.critical}
          sub="Fix these first"
          icon={TriangleAlert}
          tone={counts.critical > 0 ? "bad" : "good"}
          onClick={() => setTab("critical")}
        />
        <StatTile
          label="Resolved"
          value={counts.resolved}
          sub="Confirmed by a later scan or marked by the team"
          icon={CheckCheck}
          tone="good"
          onClick={() => setTab("resolved")}
        />
        <StatTile
          label="Oldest open issue"
          value={
            counts.all === 0
              ? "—"
              : formatRelative(
                  [...all.filter((issue) => issue.status === "open")].sort(
                    (a, b) => new Date(a.detectedAt).getTime() - new Date(b.detectedAt).getTime(),
                  )[0]?.detectedAt ?? null,
                )
          }
          sub="Age of the longest-standing finding"
          icon={RefreshCw}
          tone="info"
        />
      </div>

      <Card
        title="Issues"
        icon={TriangleAlert}
        subtitle="Findings are grouped by severity, then by how recently they were detected"
        action={
          <>
            <WButton
              size="sm"
              icon={RefreshCw}
              disabled={scan.isRunning}
              disabledReason="A scan is already running"
              onClick={() => runScan("full-crawl")}
            >
              Re-scan
            </WButton>
            <WButton
              size="sm"
              icon={Download}
              disabled={filtered.length === 0}
              disabledReason="Nothing to export with the current filters"
              onClick={() => {
                downloadFile(
                  "website-issues.csv",
                  toCsv(
                    ["Severity", "Category", "Issue", "Status", "Affected", "Detected", "Evidence", "Recommendation"],
                    filtered.map((issue) => [
                      severityLabel[issue.severity],
                      categoryLabel[issue.category],
                      issue.title,
                      issue.status,
                      issue.affectedCount,
                      formatDate(issue.detectedAt),
                      issue.evidence,
                      issue.recommendation,
                    ]),
                  ),
                );
                toast.success(`${filtered.length} issues exported`);
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
            ariaLabel="Issue severity"
            value={tab}
            onChange={(next) => {
              setTab(next);
              pagination.reset();
            }}
            options={TABS.map((entry) => ({ value: entry.value, label: entry.label, count: counts[entry.value] }))}
          />

          <Toolbar>
            <SearchInput
              className="w-full sm:w-64"
              label="Search issues"
              placeholder="Search issues…"
              value={search}
              onChange={(value) => {
                setMany({ q: value || null });
                pagination.reset();
              }}
            />
            <FilterSelect
              label="Category"
              value={category}
              onChange={(value) => setMany({ category: value === "all" ? null : value })}
              options={[
                { value: "all", label: "All categories" },
                ...CATEGORIES.map((key) => ({ value: key, label: categoryLabel[key] })),
              ]}
            />
            <FilterSelect
              label="Page"
              value={pageFilter}
              onChange={(value) => setMany({ page: value === "all" ? null : value })}
              options={pageOptions}
            />
            <FilterSelect
              label="Detected"
              value={age}
              onChange={(value) => setMany({ age: value === "all" ? null : value })}
              options={AGE_OPTIONS}
            />
            {filtersActive ? (
              <WButton size="sm" icon={X} onClick={clearFilters}>
                Clear filters
              </WButton>
            ) : null}
          </Toolbar>
        </div>

        {issues.isLoading ? (
          <>
            <SkeletonStats count={4} />
            <SkeletonBlock lines={8} />
          </>
        ) : issues.error ? (
          <QueryErrorState error={issues.error} onRetry={() => void issues.refetch()} />
        ) : visible.length === 0 ? (
          all.length === 0 ? (
            <EmptyState
              title="No issues recorded"
              body="Run a scan to check this website for SEO, performance, accessibility, link, form and security problems."
              icon={ShieldCheck}
              actions={
                <WButton tone="primary" icon={RefreshCw} onClick={() => runScan("full-crawl")}>
                  Run a scan
                </WButton>
              }
            />
          ) : tab === "resolved" ? (
            <EmptyState
              title="Nothing resolved yet"
              body="Issues appear here once a later scan stops finding them, or once someone marks them resolved."
              icon={CheckCheck}
            />
          ) : filtersActive ? (
            <EmptyState
              title="No issues match these filters"
              body="Try widening the filters, or clear them to see everything."
              actions={<WButton onClick={clearFilters}>Clear filters</WButton>}
            />
          ) : (
            <EmptyState
              title={`No ${tab === "all" ? "open" : tab} issues`}
              body="Nothing at this severity in the latest scan results."
              icon={ShieldCheck}
            />
          )
        ) : (
          <>
            <ul className="divide-y divide-[#F2F5FA]">
              {visible.map((issue) => (
                <IssueRow
                  key={issue.id}
                  issue={issue}
                  isSaving={setStatus.isPending}
                  onOpen={() => openIssue(issue.id)}
                  onFixGuide={() => openFixGuide(issue.fixGuideId)}
                  onAffected={() => {
                    if (issue.affectedPageIds.length === 1) {
                      router.push(`/admin/website/pages/${encodeURIComponent(issue.affectedPageIds[0] as string)}`);
                    } else if (issue.affectedPageIds.length > 1) {
                      navigate(`/admin/website/pages?issue=${encodeURIComponent(issue.id)}`);
                    } else {
                      toast.info("This is a site-wide issue", {
                        description: "It is not tied to a single page, so there is no page list to open.",
                      });
                    }
                  }}
                  onRescan={() => runScan("full-crawl")}
                  onToggleResolved={() =>
                    setStatus.mutate(
                      { issueId: issue.id, status: issue.status === "resolved" ? "open" : "resolved" },
                      {
                        onSuccess: () =>
                          toast.success(
                            issue.status === "resolved" ? "Issue reopened" : "Issue marked resolved",
                            {
                              description:
                                issue.status === "resolved"
                                  ? "It is back in the open issue lists."
                                  : "This records your view. The next scan confirms whether the website actually changed.",
                            },
                          ),
                        onError: () => toast.error("Could not update this issue."),
                      },
                    )
                  }
                />
              ))}
            </ul>
            <Pagination
              page={pagination.page}
              pageSize={pagination.pageSize}
              total={filtered.length}
              onPageChange={pagination.setPage}
              onPageSizeChange={pagination.setPageSize}
            />
          </>
        )}
      </Card>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function IssueRow({
  issue,
  isSaving,
  onOpen,
  onFixGuide,
  onAffected,
  onRescan,
  onToggleResolved,
}: {
  issue: IssueRecord;
  isSaving: boolean;
  onOpen: () => void;
  onFixGuide: () => void;
  onAffected: () => void;
  onRescan: () => void;
  onToggleResolved: () => void;
}) {
  const resolved = issue.status === "resolved";
  return (
    <li className={cn("px-3.5 py-3", resolved && "bg-[#FCFDFE]")}>
      <div className="flex flex-wrap items-start gap-2.5">
        <Chip tone={resolved ? "muted" : severityTone[issue.severity]} className="mt-0.5" dot>
          {severityLabel[issue.severity]}
        </Chip>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onOpen}
              className={cn(
                "cursor-pointer text-left text-[12.5px] font-semibold hover:text-[#1D4ED8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]/35",
                resolved ? "text-[#6B7A94] line-through decoration-[#CBD5E1]" : "text-[#28354C]",
              )}
            >
              {issue.title}
            </button>
            <Chip tone="muted">{categoryLabel[issue.category]}</Chip>
            {resolved ? <Chip tone="good">Resolved {formatRelative(issue.resolvedAt)}</Chip> : null}
          </div>

          <p className="mt-0.5 text-[11.5px] leading-relaxed text-[#6B7A94]">{issue.description}</p>

          <p className="mt-1 text-[10.5px] text-[#94A3B8]">
            {issue.affectedPageIds.length > 0
              ? `${issue.affectedCount} affected page${issue.affectedCount === 1 ? "" : "s"}`
              : "Site-wide"}{" "}
            · detected {formatRelative(issue.detectedAt)}
            {issue.evidence ? ` · ${issue.evidence}` : ""}
          </p>

          <p className="mt-1.5 rounded-md bg-[#F7F9FC] px-2.5 py-1.5 text-[11px] leading-relaxed text-[#4A5A73]">
            <b className="font-semibold text-[#28354C]">Recommended:</b> {issue.recommendation}
          </p>

          <div className="mt-2 flex flex-wrap gap-1">
            <WButton size="sm" onClick={onOpen}>
              View details
            </WButton>
            <WButton size="sm" icon={ArrowRight} onClick={onAffected}>
              View affected pages
            </WButton>
            <WButton size="sm" icon={Wrench} onClick={onFixGuide}>
              Fix guide
            </WButton>
            <WButton size="sm" icon={RefreshCw} onClick={onRescan}>
              Re-scan
            </WButton>
            <WButton
              size="sm"
              tone={resolved ? "secondary" : "success"}
              icon={CheckCheck}
              disabled={isSaving}
              disabledReason="Saving…"
              onClick={onToggleResolved}
            >
              {resolved ? "Reopen" : "Mark resolved"}
            </WButton>
          </div>
        </div>
      </div>
    </li>
  );
}
