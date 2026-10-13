"use client";

/**
 * Issue detail report page — a semrush-like deep dive into the finding.
 *
 * Shows the issue in context, affected page audits, similar findings across the
 * portfolio and a complete fix guide. This gives the site owner a single place
 * to understand why the problem matters, what impact it has and exactly how
 * to fix it.
 */

import { notFound } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  AlertCircle,
  ArrowRight,
  CheckCheck,
  Download,
  ExternalLink,
  FileSearch,
  RefreshCw,
  ShieldAlert,
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
  formatDateTime,
  formatRelative,
  formatShortDate,
  severityLabel,
  severityTone,
  sortIssues,
  toCsv,
} from "../../data/selectors";
import type { IssueRecord } from "../../data/types";
import {
  Card,
  Chip,
  FilterSelect,
  KeyValue,
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
import type { IssueCategory, Severity } from "../../data/types";

type ReportTab = "overview" | "affected-pages" | "similar-issues" | "history" | "fix-guide";

export default function IssueDetailPage({ params }: { params: { issueId: string } }) {
  const { issueId } = params;
  const router = useRouter();
  const { clientId, runScan, scan, openFixGuide, navigate } = useWebsiteWorkspace();
  const { data: issues, isLoading: issuesLoading, error: issuesError, refetch: refetchIssues } = useWebsiteIssues(clientId, Boolean(issueId));
  const { data: pages } = useWebsitePages(clientId, Boolean(issueId));
  const setStatus = useSetIssueStatus(clientId);

  const issue = issues?.find((entry) => entry.id === issueId) ?? null;

  if (!issueId) {
    notFound();
  }

  const [tab, setTab] = useUrlState<ReportTab>("tab", "overview", ["overview", "affected-pages", "similar-issues", "history", "fix-guide"]);

  const similarIssues = useMemo(() => {
    if (!issue) return [];
    return issues?.filter((i) => i.id !== issue.id && i.category === issue.category && i.status === "open") ?? [];
  }, [issues, issue]);

  const relatedIssues = useMemo(() => {
    if (!issue) return [];
    return issues?.filter((i) => i.id !== issue.id && i.severity === issue.severity && i.status === "open") ?? [];
  }, [issues, issue]);

  const issueHistory = useMemo(() => {
    if (!issue) return [];
    return issues?.filter((i) => i.id === issue.id && i.status === "resolved") ?? [];
  }, [issues, issue]);

  const affectedPages = useMemo(() => {
    if (!issue) return [];
    return (pages ?? []).filter((page) => issue.affectedPageIds.includes(page.id));
  }, [pages, issue]);

  const severityImpact = useMemo(() => {
    if (!issue) return 0;
    const critical = issues?.filter((i) => i.severity === "critical" && i.status === "open").length ?? 0;
    return (issue.severity === "critical" ? critical + 1 : critical) || 0;
  }, [issues, issue]);

  const categoryStats = useMemo(() => {
    if (!issues) return {};
    const totalByCategory = {} as Record<IssueCategory, number>;
    const severityByCategory = {} as Record<IssueCategory, Record<Severity, number>>;
    (issues ?? []).forEach((i) => {
      if (i.status !== "open") return;
      const cat = i.category;
      const sev = i.severity;
      totalByCategory[cat] = (totalByCategory[cat] ?? 0) + 1;
      if (!severityByCategory[cat]) {
        severityByCategory[cat] = { critical: 0, high: 0, medium: 0, low: 0 };
      }
      severityByCategory[cat][sev] = severityByCategory[cat][sev] + 1;
    });
    return { totalByCategory, severityByCategory };
  }, [issues]);

  const priorityScore = useMemo(() => {
    if (!issue) return 0;
    const base = {
      critical: 100,
      high: 75,
      medium: 50,
      low: 25,
    }[issue.severity] ?? 25;
    const ageMultiplier = Math.min(Math.max(ageInHours(issue.detectedAt) / 24, 0.5), 3);
    return Math.round(base * ageMultiplier);
  }, [issue]);

  const handleExportReport = useCallback(() => {
    if (!issue) return;
    downloadFile(
      `issue-${issue.id}-report-${formatShortDate(new Date().toISOString())}.html`,
      toCsv(
        ["Metric", "Value"],
        [
          ["Issue ID", issue.id],
          ["Title", issue.title],
          ["Severity", severityLabel[issue.severity]],
          ["Category", categoryLabel[issue.category]],
          ["Status", issue.status],
          ["Detected", formatDateTime(issue.detectedAt)],
          ["Affected Pages", issue.affectedCount],
          ["Age (hours)", ageInHours(issue.detectedAt)],
          ["Priority Score", priorityScore],
          ["Evidence", issue.evidence ?? "None"],
          ["Recommendation", issue.recommendation],
        ],
      ),
    );
    toast.success("Issue report exported");
  }, [issue, priorityScore]);

  const handleCreateSimilarIssueSearch = useCallback(() => {
    if (!issue) return;
    const searchQuery = `${issue.title} ${issue.category} ${issue.recommendation}`;
    window.open(
      `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}&tbm=nws`,
      "_blank",
      "noopener,noreferrer"
    );
  }, [issue]);

  if (issuesLoading) {
    return <div className="space-y-1"><SkeletonStats count={4} /><SkeletonBlock lines={8} /></div>;
  }

  if (issuesError) {
    return <QueryErrorState error={issuesError} onRetry={() => void refetchIssues()} />;
  }

  if (!issue) {
    return (
      <div className="space-y-1">
        <EmptyState
          title="Issue not found"
          body="This issue is no longer in the current scan results."
          icon={AlertCircle}
          actions={
            <WButton tone="primary" icon={RefreshCw} onClick={() => runScan("full-crawl")}>
              Re-scan
            </WButton>
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#E6EBF4] bg-white p-2 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
        <SubTabs
          ariaLabel="Issue detail sections"
          value={tab}
          onChange={setTab}
          options={[
            { value: "overview", label: "Overview" },
            { value: "affected-pages", label: "Affected pages" },
            { value: "similar-issues", label: "Similar issues", count: similarIssues.length },
            { value: "history", label: "History", count: issueHistory.length },
            { value: "fix-guide", label: "Fix guide" },
          ]}
        />
        <WButton size="sm" icon={RefreshCw} disabled={scan.isRunning} disabledReason="A scan is already running" onClick={() => runScan("full-crawl")}>
          Re-scan
        </WButton>
      </div>

      {tab === "overview" && (
        <div className="space-y-1">
          <Card
            title={issue.title}
            icon={issue.severity === "critical" ? TriangleAlert : issue.severity === "high" ? ShieldAlert : issue.severity === "medium" ? AlertCircle : TriangleAlert}
            subtitle={`${severityLabel[issue.severity]} · ${categoryLabel[issue.category]} issue detected ${formatRelative(issue.detectedAt)}`}
            action={
              <WButton size="sm" icon={Download} onClick={handleExportReport}>
                Export report
              </WButton>
            }
            bodyClassName="p-0"
          >
            <div className="grid gap-1 md:grid-cols-2 lg:grid-cols-4">
              <KeyValue label="Severity">
                <Chip tone={severityTone[issue.severity]} dot>
                  {severityLabel[issue.severity]}
                </Chip>
              </KeyValue>
              <KeyValue label="Category">
                <Chip tone="muted">{categoryLabel[issue.category]}</Chip>
              </KeyValue>
              <KeyValue label="Status">
                <Chip tone={issue.status === "resolved" ? "good" : issue.status === "ignored" ? "muted" : "warn"}>
                  {issue.status === "resolved" ? "Resolved" : issue.status === "ignored" ? "Ignored" : "Open"}
                </Chip>
              </KeyValue>
              <KeyValue label="Age">
                {formatRelative(issue.detectedAt)}
              </KeyValue>
            </div>

            <div className="space-y-4">
              <div>
                <h3 className="mb-1 text-[11px] font-semibold uppercase tracking-[0.05em] text-[#6B7A94]">
                  Description
                </h3>
                <p className="text-[12px] leading-relaxed text-[#334155]">{issue.description}</p>
              </div>

              <div>
                <h3 className="mb-1 text-[11px] font-semibold uppercase tracking-[0.05em] text-[#6B7A94]">
                  Recommendation
                </h3>
                <p className="text-[12px] leading-relaxed text-[#334155]">{issue.recommendation}</p>
              </div>

              <dl className="divide-y divide-[#F2F5FA] rounded-xl border border-[#E6EBF4] px-3">
                <KeyValue label="Detected">
                  <span className="font-medium text-[#111C3A]">{formatDateTime(issue.detectedAt)}</span>
                  <span className="ml-2 text-[11px] text-[#6B7A94]">({formatRelative(issue.detectedAt)})</span>
                </KeyValue>
                <KeyValue label="Priority score">
                  <span className="font-medium text-[#111C3A]">{priorityScore}</span>
                  <span className="ml-1 text-[10.5px] text-[#94A3B8]">
                    ({issue.severity === "critical" ? "100" : issue.severity === "high" ? "75" : issue.severity === "medium" ? "50" : "25"} base × age factor)
                  </span>
                </KeyValue>
                <KeyValue label="Affected">
                  <span className="font-medium text-[#111C3A]">{issue.affectedCount} page{issue.affectedCount === 1 ? "" : "s"}</span>
                  <span className="ml-2 text-[11px] text-[#6B7A94]">
                    {issue.affectedPageIds.length > 0 ? "pages with the issue" : "site-wide"}
                  </span>
                </KeyValue>
                <KeyValue label="Impact">
                  <span className="font-medium text-[#111C3A]">{severityImpact} higher severity {issue.severity} issues</span>
                  <span className="ml-2 text-[11px] text-[#6B7A94]">in the portfolio</span>
                </KeyValue>
                {issue.evidence ? (
                  <KeyValue label="Evidence">
                    <span className="font-mono text-[11px] text-[#28354C]">{issue.evidence}</span>
                  </KeyValue>
                ) : null}
                {issue.resolvedAt ? (
                  <KeyValue label="Resolved">
                    <span className="font-medium text-[#0B7A55]">{formatDateTime(issue.resolvedAt)}</span>
                    <span className="ml-2 text-[11px] text-[#94A3B8]">{formatRelative(issue.resolvedAt)}</span>
                  </KeyValue>
                ) : null}
              </dl>

              <div className="rounded-lg bg-[#FFFCF5] border border-[#F5DFB8] p-3">
                <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.05em] text-[#9A5B08]">
                  Why this matters
                </h3>
                <ul className="space-y-1 text-[11.5px] text-[#6B7A94]">
                  <li className="flex items-start gap-1.5">
                    <ShieldAlert className="mt-0.5 size-3.5 shrink-0 text-[#DC3A32]" />
                    <span>
                      <b className="font-semibold text-[#C0261F]">{severityLabel[issue.severity].toLowerCase()}</b> severity indicates this issue could significantly impact SEO, user experience, or site security.
                    </span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <AlertCircle className="mt-0.5 size-3.5 shrink-0 text-[#E29208]" />
                    <span>
                      Detected {ageInHours(issue.detectedAt) < 24 ? "today" : ageInHours(issue.detectedAt) < 168 ? "in the last week" : "in the last month"}, indicating it may be newly introduced or longstanding.
                    </span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <FileSearch className="mt-0.5 size-3.5 shrink-0 text-[#2563EB]" />
                    <span>
                      Affects {issue.affectedPageIds.length > 0 ? `${issue.affectedCount} page${issue.affectedCount === 1 ? "" : "s"}` : "the entire site"} across {similarIssues.length} similar issues in this category.
                    </span>
                  </li>
                </ul>
              </div>
            </div>
          </Card>
        </div>
      )}

      {tab === "affected-pages" && (
        <div className="space-y-1">
          {affectedPages.length === 0 ? (
            <EmptyState
              title="No affected pages"
              body="This is a site-wide issue that doesn't reference specific pages."
              icon={AlertCircle}
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {affectedPages.map((page) => (
                <Card
                  key={page.id}
                  title={page.title}
                  icon={FileSearch}
                  subtitle={page.path}
                  bodyClassName="p-0"
                >
                  <div className="divide-y divide-[#F2F5FA]">
                    <KeyValue label="Page URL">
                      <a href={page.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[11.5px] font-medium text-[#2563EB] hover:underline">
                        {page.path}
                        <ExternalLink className="size-3.5" />
                      </a>
                    </KeyValue>
                    <KeyValue label="HTTP status">
                      <Chip tone={page.httpStatus < 400 ? "good" : "bad"}>{page.httpStatus}</Chip>
                    </KeyValue>
                    <KeyValue label="Page crawled">
                      {page.lastScannedAt ? formatRelative(page.lastScannedAt) : "Never"}
                    </KeyValue>
                    <KeyValue label="Indexable">
                      <Chip tone={page.indexable ? "good" : "bad"}>{page.indexable ? "Yes" : "No"}</Chip>
                    </KeyValue>
                  </div>

                  <div className="p-3">
                    <WButton
                      size="sm"
                      icon={FileSearch}
                      onClick={() => router.push(`/admin/website/pages/${encodeURIComponent(page.id)}`)}
                    >
                      Page audit
                    </WButton>
                    <WButton
                      size="sm"
                      icon={ExternalLink}
                      onClick={() => window.open(page.url, "_blank", "noopener,noreferrer")}
                    >
                      Open page
                    </WButton>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "similar-issues" && (
        <div className="space-y-1">
          {similarIssues.length === 0 ? (
            <EmptyState
              title="No similar issues"
              body="There are no other open issues in this category at the moment."
              icon={CheckCheck}
            />
          ) : (
            <Card
              title="Similar issues"
              icon={AlertCircle}
              subtitle={`Other ${categoryLabel[issue.category]} issues that may be related`}
              bodyClassName="p-0"
            >
              <ul className="divide-y divide-[#F2F5FA]">
                {similarIssues.map((similar) => (
                  <li key={similar.id} className="flex items-start justify-between gap-3 px-3.5 py-3">
                    <div className="min-w-0 flex-1">
                      <button
                        type="button"
                        onClick={() => navigate(`/admin/website/issues/${encodeURIComponent(similar.id)}`)}
                        className="cursor-pointer text-left text-[12.5px] font-semibold text-[#28354C] hover:text-[#1D4ED8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]/35"
                      >
                        {similar.title}
                      </button>
                      <p className="mt-0.5 text-[11px] text-[#6B7A94]">
                        Detected {formatRelative(similar.detectedAt)} · {similar.affectedPageIds.length > 0 ? `${similar.affectedCount} affected pages` : "Site-wide"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Chip tone={severityTone[similar.severity]} dot>
                        {severityLabel[similar.severity]}
                      </Chip>
                      <WButton
                        size="sm"
                        icon={ArrowRight}
                        onClick={() => navigate(`/admin/website/issues/${encodeURIComponent(similar.id)}?tab=overview`)}
                      >
                        View
                      </WButton>
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      )}

      {tab === "history" && (
        <div className="space-y-1">
          {issueHistory.length === 0 ? (
            <EmptyState
              title="No resolution history"
              body="This issue has not been resolved yet."
              icon={RefreshCw}
            />
          ) : (
            <Card
              title="Resolution history"
              icon={CheckCheck}
              subtitle={`This issue was resolved ${issueHistory.length} time${issueHistory.length === 1 ? "" : "s"}`}
              bodyClassName="p-0"
            >
              <ul className="divide-y divide-[#F2F5FA]">
                {issueHistory.map((historyItem) => (
                  <li key={historyItem.id} className="flex items-start justify-between gap-3 px-3.5 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-[12.5px] font-semibold text-[#0B7A55]">
                        Resolved {formatDateTime(historyItem.resolvedAt)} by {historyItem.resolvedBy || "Unknown user"}
                      </p>
                      <p className="mt-0.5 text-[11px] text-[#6B7A94]">
                        {historyItem.resolutionNotes || "No additional notes provided."}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Chip tone="good">Fixed</Chip>
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      )}

      {tab === "fix-guide" && (
        <div className="space-y-1">
          <Card
            title="Fix guide"
            icon={Wrench}
            subtitle="Step-by-step instructions to resolve this issue"
            action={
              <WButton size="sm" icon={Download} onClick={handleExportReport}>
                Export fix guide
              </WButton>
            }
            bodyClassName="p-0"
          >
            <div className="space-y-4 p-3">
              <div>
                <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.05em] text-[#6B7A94]">
                  Quick fix steps
                </h3>
                <ol className="space-y-1.5 text-[11.5px] text-[#334155]">
                  <li className="flex items-start gap-2">
                    <span className="mt-0.5 size-5 rounded-full bg-[#EEF2F8] text-[#1D4ED8] grid place-items-center text-[10px] font-semibold">1</span>
                    <span>
                      Locate the problematic element on affected pages: Look for {issue.category === "seo" ? "meta tags, headings or structured data" : issue.category === "performance" ? "resource usage, render-blocking assets or slow endpoints" : issue.category === "accessibility" ? "form fields, labels or alt text" : issue.category === "security" ? "headers, redirects or certificate details" : "the relevant HTML element"}.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-0.5 size-5 rounded-full bg-[#EEF2F8] text-[#1D4ED8] grid place-items-center text-[10px] font-semibold">2</span>
                    <span>
                      Apply the recommended fix from the issue description: {issue.recommendation}
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-0.5 size-5 rounded-full bg-[#EEF2F8] text-[#1D4ED8] grid place-items-center text-[10px] font-semibold">3</span>
                    <span>
                      Validate by running a new scan or checking the page audit for the affected page.
                    </span>
                  </li>
                </ol>
              </div>

              <div>
                <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.05em] text-[#6B7A94]">
                  Technical details
                </h3>
                <dl className="divide-y divide-[#F2F5FA] rounded-xl border border-[#E6EBF4] px-3">
                  <KeyValue label="Affected page count">
                    {issue.affectedCount}
                  </KeyValue>
                  <KeyValue label="Issue category">
                    {categoryLabel[issue.category]}
                  </KeyValue>
                  <KeyValue label="Status">
                    <Chip tone={issue.status === "resolved" ? "good" : issue.status === "ignored" ? "muted" : "warn"}>
                      {issue.status === "resolved" ? "Resolved" : issue.status === "ignored" ? "Ignored" : "Open"}
                    </Chip>
                  </KeyValue>
                  <KeyValue label="Date detected">
                    {formatDateTime(issue.detectedAt)}
                  </KeyValue>
                </dl>
              </div>

              <div className="rounded-lg bg-[#F0F9FF] border border-[#BAE6FD] p-3">
                <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.05em] text-[#0369A1]">
                  Pro tips
                </h3>
                <ul className="space-y-1 text-[11.5px] text-[#334155]">
                  <li className="flex items-start gap-1.5">
                    <CheckCheck className="mt-0.5 size-3.5 shrink-0 text-[#10B981]" />
                    <span>
                      Always test fixes on a staging environment before applying to production.
                    </span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <CheckCheck className="mt-0.5 size-3.5 shrink-0 text-[#10B981]" />
                    <span>
                      Use browser devtools (Lighthouse, Elements panel) to verify the fix visually.
                    </span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <CheckCheck className="mt-0.5 size-3.5 shrink-0 text-[#10B981]" />
                    <span>
                      Keep a record of the fix in your project documentation for future reference.
                    </span>
                  </li>
                </ul>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

// Need these for similar issues logic
const CATEGORIES = [
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