"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  FileCode2,
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  Circle,
  Download,
  FileText,
  ExternalLink,
  Gauge,
  Image as ImageIcon,
  Link2,
  RefreshCw,
  ScrollText,
  Search,
  ShieldCheck,
  TriangleAlert,
  Wrench,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { usePagePerformance, useWebsiteIssues, useWebsitePageAudit } from "../../data/hooks";
import {
  checkLabel,
  checkTone,
  downloadFile,
  formatMs,
  formatNumber,
  formatRelative,
  formatWeight,
  httpStatusTone,
  pageTypeLabel,
  scoreBand,
  severityLabel,
  severityTone,
  slugForFile,
  toCsv,
} from "../../data/selectors";
import type { AuditCheck, CheckStatus, IssueRecord, PageAudit } from "../../data/types";
import {
  Card,
  Chip,
  DataTable,
  KeyValue,
  Meter,
  ScoreDial,
  SubTabs,
  WButton,
  type Column,
} from "../ui/kit";
import { ShareBar, SERIES_COLORS } from "../ui/charts";
import { EmptyState, QueryErrorState, SkeletonBlock, SkeletonStats } from "../ui/states";
import { PageAiPanel } from "../ui/ai-insights";
import { PageReportDialog } from "../dialogs/page-report-dialog";
import { PageLighthouseAccessibility, PagePerformanceTab, PageSearchAndIndexing } from "./page-measurements";
import { useUrlState } from "../use-url-state";
import { useWebsiteWorkspace } from "../website-workspace";

type AuditTab = "overview" | "ai" | "seo" | "content" | "links" | "performance" | "accessibility" | "technical" | "images" | "structured" | "history";

const TABS: { value: AuditTab; label: string }[] = [
  { value: "overview", label: "Overview" },
  { value: "ai", label: "AI insights" },
  { value: "seo", label: "On-page SEO" },
  { value: "technical", label: "Technical SEO" },
  { value: "content", label: "Content" },
  { value: "links", label: "Links" },
  { value: "images", label: "Images" },
  { value: "structured", label: "Structured data" },
  { value: "performance", label: "Performance" },
  { value: "accessibility", label: "Accessibility" },
  { value: "history", label: "Issues & history" },
];

export function WebsitePageAuditPage({ pageId }: { pageId: string }) {
  const router = useRouter();
  const { clientId, runScan, scan, openIssue, openFixGuide } = useWebsiteWorkspace();
  const audit = useWebsitePageAudit(clientId, pageId);
  const issues = useWebsiteIssues(clientId);
  const measured = usePagePerformance(clientId, pageId);
  const [reportOpen, setReportOpen] = useState(false);

  const [tab, setTab] = useUrlState<AuditTab>("tab", "overview", TABS.map((entry) => entry.value));
  const pageIssues = useMemo(
    () => (issues.data ?? []).filter((issue) => issue.affectedPageIds.includes(pageId)),
    [issues.data, pageId],
  );

  if (audit.isLoading) {
    return (
      <div className="space-y-1">
        <SkeletonStats count={4} />
        <SkeletonBlock lines={8} />
      </div>
    );
  }

  if (audit.error) {
    return (
      <Card title="Page audit">
        <QueryErrorState error={audit.error} onRetry={() => void audit.refetch()} />
        <div className="flex justify-center pb-4">
          <WButton icon={ArrowLeft} onClick={() => router.push("/admin/website/pages")}>
            Back to pages
          </WButton>
        </div>
      </Card>
    );
  }

  if (!audit.data) {
    return (
      <Card title="Page audit">
        <EmptyState
          title="Page not found"
          body="This page is not in the latest crawl results. It may have been removed from the website."
          actions={
            <WButton tone="primary" icon={ArrowLeft} onClick={() => router.push("/admin/website/pages")}>
              Back to pages
            </WButton>
          }
        />
      </Card>
    );
  }

  const data = audit.data;
  const page = data.page;
  const perfDevice = measured.data?.mobile.measured ?? measured.data?.desktop.measured ?? null;

  const exportAudit = () => {
    const rows = [
      ...data.seoChecks.map((check) => ["SEO", check.label, check.status, check.value ?? "", check.detail]),
      ...data.technicalChecks.map((check) => ["Technical", check.label, check.status, check.value ?? "", check.detail]),
      ...data.accessibilityChecks.map((check) => [
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
  };

  return (
    <div className="space-y-1">
      {/* Header */}
      <div className="rounded-xl border border-[#E6EBF4] bg-white p-3.5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
        <nav aria-label="Breadcrumb" className="mb-2 flex items-center gap-1 text-[11px] text-[#6B7A94]">
          <button
            type="button"
            onClick={() => router.push("/admin/website/pages")}
            className="cursor-pointer rounded font-medium hover:text-[#2563EB] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]/35"
          >
            Pages
          </button>
          <ChevronRight className="size-3" aria-hidden />
          <span className="truncate font-semibold text-[#28354C]">{page.title}</span>
        </nav>

        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="truncate text-[16px] font-semibold text-[#111C3A]">{page.title}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
              <a
                href={page.url}
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex items-center gap-1 rounded font-mono text-[11px] text-[#2563EB] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]/35"
              >
                {page.url}
                <ExternalLink className="size-3" aria-hidden />
              </a>
              <Chip tone={httpStatusTone(page.httpStatus)}>{page.httpStatus}</Chip>
              <Chip tone="muted">{pageTypeLabel[page.type]}</Chip>
              <Chip tone={page.indexable ? "good" : "muted"}>{page.indexable ? "Indexable" : "Not indexable"}</Chip>
              <span className="text-[11px] text-[#6B7A94]">Last scanned {formatRelative(page.lastScannedAt)}</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <WButton
              tone="primary"
              icon={RefreshCw}
              disabled={scan.isRunning}
              disabledReason="A scan is already running"
              onClick={() => runScan("page", page.id)}
            >
              Re-scan page
            </WButton>
            <WButton icon={ExternalLink} onClick={() => window.open(page.url, "_blank", "noopener,noreferrer")}>
              Open live page
            </WButton>
            <WButton icon={Download} onClick={exportAudit}>
              Export
            </WButton>
            <WButton icon={FileText} onClick={() => setReportOpen(true)}>
              PDF report
            </WButton>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <ScoreSummary label="SEO (executed checks)" value={page.seoScore} />
          <ScoreSummary
            label={perfDevice ? `Performance (Lighthouse ${perfDevice.device})` : "Performance (not measured)"}
            value={perfDevice?.scores.performance ?? null}
          />
          <ScoreSummary
            label={perfDevice?.scores.accessibility != null ? "Accessibility (automated checks)" : "Accessibility (not verified)"}
            value={perfDevice?.scores.accessibility ?? null}
          />
          <div className="flex items-center gap-2.5 rounded-xl border border-[#E6EBF4] p-2.5">
            <span
              className={cn(
                "grid size-9 place-items-center rounded-lg",
                pageIssues.length > 0 ? "bg-[#FDECEB] text-[#C0261F]" : "bg-[#E6F6EF] text-[#0B7A55]",
              )}
            >
              <TriangleAlert className="size-4" aria-hidden />
            </span>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.04em] text-[#6B7A94]">Issues</p>
              <p className="text-[17px] font-semibold text-[#111C3A]">{pageIssues.length}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-[#E6EBF4] bg-white p-2 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
        <SubTabs ariaLabel="Page audit sections" value={tab} onChange={setTab} options={TABS} />
      </div>

      {tab === "overview" ? (
        <div className="grid gap-1 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
          <MetadataEvidencePanel data={data} />

          <div className="grid gap-1">
            <Card title="Summary" icon={ScrollText}>
              <dl className="divide-y divide-[#F2F5FA]">
                <KeyValue label="Title">{page.title}</KeyValue>
                <KeyValue label="URL">
                  <span className="font-mono text-[11px]">{page.path}</span>
                </KeyValue>
                <KeyValue label="Canonical">
                  <span className="font-mono text-[11px]">{data.canonical ?? "Not set"}</span>
                </KeyValue>
                <KeyValue label="HTTP status">
                  <Chip tone={httpStatusTone(page.httpStatus)}>{page.httpStatus}</Chip>
                </KeyValue>
                <KeyValue label="Indexability">
                  <Chip tone={page.indexable ? "good" : "muted"}>{page.indexable ? "Indexable" : "Excluded"}</Chip>
                </KeyValue>
                <KeyValue label="Page size">{formatWeight(page.pageWeightKb)}</KeyValue>
                <KeyValue label="Load time">{formatMs(page.loadTimeMs)}</KeyValue>
                <KeyValue label="Crawl depth">{page.depth}</KeyValue>
              </dl>
              <p className="mt-2 rounded-md bg-[#F7F9FC] px-2.5 py-2 text-[11px] leading-relaxed text-[#6B7A94]">
                {data.indexabilityNote}
              </p>
            </Card>

            <Card title={`Issues on this page (${pageIssues.length})`} icon={TriangleAlert} bodyClassName="p-0">
              {pageIssues.length === 0 ? (
                <EmptyState
                  title="No issues on this page"
                  body="The latest scan found nothing that needs attention here."
                  icon={ShieldCheck}
                  compact
                />
              ) : (
                <ul className="divide-y divide-[#F2F5FA]">
                  {pageIssues.map((issue) => (
                    <li key={issue.id} className="flex items-start gap-2 px-3.5 py-2.5">
                      <Chip tone={severityTone[issue.severity]} className="mt-0.5" dot>
                        {severityLabel[issue.severity]}
                      </Chip>
                      <div className="min-w-0 flex-1">
                        <button
                          type="button"
                          onClick={() => openIssue(issue.id)}
                          className="cursor-pointer text-left text-[11.5px] font-semibold text-[#28354C] hover:text-[#1D4ED8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]/35"
                        >
                          {issue.title}
                        </button>
                        <div className="mt-1 flex gap-1">
                          <WButton size="sm" onClick={() => openIssue(issue.id)}>
                            Details
                          </WButton>
                          <WButton size="sm" icon={Wrench} onClick={() => openFixGuide(issue.fixGuideId)}>
                            Fix guide
                          </WButton>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        </div>
      ) : null}

      {data.evidenceAvailable === false ? (
        <div className="rounded-xl border border-[#F5DDA8] bg-[#FEF6E3] px-3 py-2 text-[11.5px] text-[#9A5B08]">
          {data.legacyNote ?? "This page was scanned before evidence-based audits. Run a new scan for verified results."}
        </div>
      ) : null}
      {tab === "ai" ? <PageAiPanel pageId={pageId} /> : null}
      {tab === "seo" ? <CheckListCard title="On-page SEO checks" icon={Search} checks={data.seoChecks} /> : null}
      {tab === "seo" ? <PageSearchAndIndexing pageId={pageId} /> : null}
      {tab === "accessibility" ? <PageLighthouseAccessibility pageId={pageId} /> : null}
      {tab === "accessibility" ? (
        data.accessibilityChecks.length > 0 ? (
          <CheckListCard title="Accessibility checks" icon={ShieldCheck} checks={data.accessibilityChecks} />
        ) : (
          <Card title="Accessibility" icon={ShieldCheck}>
            <EmptyState
              title="Accessibility is not verified"
              body={data.accessibilityNote ?? "Accessibility needs an automated audit (axe or Lighthouse), which has not run for this page. No score is shown rather than an estimated one."}
            />
          </Card>
        )
      ) : null}
      {tab === "structured" ? <StructuredDataTab data={data} /> : null}
      {tab === "history" ? <HistoryTab data={data} pageIssues={pageIssues} openIssue={openIssue} /> : null}
      {tab === "technical" ? (
        <CheckListCard title="Technical SEO checks" icon={Wrench} checks={data.technicalChecks} />
      ) : null}

      {tab === "content" ? <ContentTab data={data} /> : null}
      {tab === "links" ? <LinksTab data={data} /> : null}
      {tab === "performance" ? (
        <div className="space-y-1">
          <PagePerformanceTab pageId={pageId} />
          <PerformanceTab data={data} />
        </div>
      ) : null}
      {tab === "images" ? <ImagesTab data={data} /> : null}
      <PageReportDialog clientId={clientId} pageId={pageId} pagePath={page.path} open={reportOpen} onClose={() => setReportOpen(false)} />
    </div>
  );
}

/* ------------------------------------------------------------------ */

type DeepPageAudit = PageAudit & {
  social?: { title?: string; description?: string; image?: string; type?: string; url?: string };
  twitter?: { card?: string; title?: string; description?: string; image?: string };
  schema?: { valid: boolean; types: string[] }[];
  keywords?: { term: string; count: number }[];
  inboundLinks?: { pageId: string; path: string; title: string; url: string }[];
};

function MetadataEvidencePanel({ data }: { data: PageAudit }) {
  const deep = data as DeepPageAudit;
  const social = deep.social ?? {};
  const schemaTypes = (deep.schema ?? []).flatMap((item) => item.types).filter(Boolean);
  const rows = [
    { label: "Title tag", value: data.seoChecks.find((check) => check.id === "title")?.value, status: data.seoChecks.find((check) => check.id === "title")?.status, note: "Target 50-60 characters" },
    { label: "Meta description", value: data.seoChecks.find((check) => check.id === "description")?.value, status: data.seoChecks.find((check) => check.id === "description")?.status, note: "Target 120-160 characters" },
    { label: "Canonical", value: data.canonical, status: data.seoChecks.find((check) => check.id === "canonical")?.status, note: "Observed in live HTML" },
    { label: "Robots", value: data.seoChecks.find((check) => check.id === "robots")?.value, status: data.seoChecks.find((check) => check.id === "robots")?.status, note: "Indexing directive" },
    { label: "Screenshots", value: data.screenshots.available ? "Available" : "Not available", status: data.screenshots.available ? "pass" : "warning", note: data.screenshots.note ?? "Screenshot worker is not enabled." },
  ];

  return (
    <Card title="SEO evidence" icon={Search} subtitle="Observed from the latest public crawl">
      <dl className="divide-y divide-[#F2F5FA]">
        {rows.map((row) => (
          <KeyValue key={row.label} label={row.label}>
            <span className="flex min-w-0 items-center justify-end gap-1.5">
              <span className="max-w-[260px] truncate font-mono text-[10.5px] text-[#4A5A73]">{row.value ?? "Not found"}</span>
              <Chip tone={checkTone[(row.status ?? "unknown") as CheckStatus]}>{checkLabel[(row.status ?? "unknown") as CheckStatus]}</Chip>
            </span>
            <span className="block text-right text-[10px] text-[#94A3B8]">{row.note}</span>
          </KeyValue>
        ))}
        <KeyValue label="Open Graph">
          <span className="max-w-[260px] truncate font-mono text-[10.5px] text-[#4A5A73]">{social.title || "Not found"}</span>
        </KeyValue>
        <KeyValue label="Schema types">
          {schemaTypes.length ? <span className="text-[11px] text-[#334155]">{schemaTypes.join(", ")}</span> : <Chip tone="warn">None found</Chip>}
        </KeyValue>
      </dl>
    </Card>
  );
}

function ScoreSummary({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="flex items-center gap-2.5 rounded-xl border border-[#E6EBF4] p-2.5">
      <ScoreDial value={value} tone={scoreBand(value)} size={38} label={`${label} ${value ?? "not scored"}`} />
      <div className="min-w-0">
        <p className="truncate text-[10px] font-semibold uppercase tracking-[0.04em] text-[#6B7A94]">{label}</p>
        <p className="text-[13px] font-semibold text-[#111C3A]">{value === null ? "Not scored" : value}</p>
      </div>
    </div>
  );
}

function CheckIcon({ status }: { status: AuditCheck["status"] }) {
  if (status === "pass") return <CheckCircle2 className="size-4 text-[#12A06D]" aria-hidden />;
  if (status === "warning") return <TriangleAlert className="size-4 text-[#E29208]" aria-hidden />;
  if (status === "error") return <XCircle className="size-4 text-[#DC3A32]" aria-hidden />;
  return <Circle className="size-4 text-[#94A3B8]" aria-hidden />;
}

function CheckListCard({
  title,
  icon,
  checks,
}: {
  title: string;
  icon: typeof Search;
  checks: AuditCheck[];
}) {
  const counts = checks.reduce(
    (acc, check) => ({ ...acc, [check.status]: (acc[check.status] ?? 0) + 1 }),
    {} as Record<string, number>,
  );

  return (
    <Card
      title={title}
      icon={icon}
      subtitle="Each check reports what was observed on the live page"
      action={
        <span className="flex items-center gap-1.5">
          <Chip tone="good">{counts.pass ?? 0} pass</Chip>
          <Chip tone="warn">{counts.warning ?? 0} warning</Chip>
          <Chip tone="bad">{counts.error ?? 0} error</Chip>
        </span>
      }
      bodyClassName="p-0"
    >
      <ul className="divide-y divide-[#F2F5FA]">
        {checks.map((check) => (
          <li key={check.id} className="flex items-start gap-2.5 px-3.5 py-2.5">
            <span className="mt-0.5 shrink-0">
              <CheckIcon status={check.status} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-[12px] font-semibold text-[#28354C]">{check.label}</p>
                <Chip tone={checkTone[check.status]}>{checkLabel[check.status]}</Chip>
              </div>
              {check.value ? (
                <p className="mt-0.5 break-words font-mono text-[10.5px] text-[#4A5A73]">{check.value}</p>
              ) : null}
              <p className="mt-0.5 text-[11px] leading-relaxed text-[#6B7A94]">{check.detail}</p>
              {check.recommendation && check.status !== "pass" ? (
                <p className="mt-1 rounded-md bg-[#F7F9FC] px-2 py-1.5 text-[11px] leading-relaxed text-[#4A5A73]">
                  <b className="font-semibold text-[#28354C]">Recommended:</b> {check.recommendation}
                </p>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function ContentTab({ data }: { data: PageAudit }) {
   const { content } = data;
   const deep = data as DeepPageAudit;
   const keywords = (data as DeepPageAudit).keywords ?? [];
   const aiSignals = (data as PageAudit & { aiSignals?: { kind: string; evidence: string }[] }).aiSignals ?? [];
  return (
    <div className="grid gap-1 lg:grid-cols-2">
      <Card title="Content summary" icon={ScrollText}>
        <dl className="divide-y divide-[#F2F5FA]">
          <KeyValue label="Word count">
            <span className="inline-flex items-center gap-1.5">
              {formatNumber(content.wordCount)}
              {content.thinContent ? <Chip tone="warn">Thin content</Chip> : <Chip tone="good">Sufficient</Chip>}
            </span>
          </KeyValue>
          <KeyValue label="Duplicate-content similarity">
            <span className="inline-flex items-center gap-1.5">
              {content.duplicateSimilarityPct}%
              <Chip tone={content.duplicateSimilarityPct > 30 ? "warn" : "good"}>
                {content.duplicateSimilarityPct > 30 ? "Review" : "Distinct"}
              </Chip>
            </span>
          </KeyValue>
          <KeyValue label="Closest match">{content.duplicateOf ?? "No close match found"}</KeyValue>
          <KeyValue label="Images">
            {content.images.total} total · {content.images.missingAlt} missing alt · {content.images.oversized}{" "}
            oversized
          </KeyValue>
          <KeyValue label="Videos">{content.videos}</KeyValue>
          <KeyValue label="Readability">
            <span className="inline-flex items-center gap-1.5">
              {content.readability.label}
              {content.readability.score !== null ? <Chip tone="muted">{content.readability.score}</Chip> : null}
            </span>
          </KeyValue>
        </dl>
        <p className="mt-2 text-[10.5px] leading-relaxed text-[#94A3B8]">{content.readability.note}</p>
      </Card>

      <div className="grid gap-1">
        <Card title="Heading structure" icon={ScrollText} bodyClassName="p-0">
          {content.headings.length === 0 ? (
            <EmptyState title="No headings found" body="This page has no heading elements to analyse." compact />
          ) : (
            <div className="max-h-[300px] overflow-y-auto">
              <ul className="divide-y divide-[#F2F5FA]">
                {content.headings.map((heading, index) => (
                  <li key={`${heading.level}-${index}`} className="flex items-center gap-2 px-3.5 py-2">
                    <Chip tone={heading.level === 1 ? "info" : "muted"}>H{heading.level}</Chip>
                    <span
                      className="truncate text-[11.5px] text-[#334155]"
                      style={{ paddingLeft: (heading.level - 1) * 10 }}
                    >
                      {heading.text}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>

        <Card title="Detected CTAs" icon={ImageIcon} bodyClassName="p-0">
          {content.ctas.length === 0 ? (
            <EmptyState title="No CTAs detected" body="No buttons or contact links were found on this page." compact />
          ) : (
            <ul className="divide-y divide-[#F2F5FA]">
              {content.ctas.map((cta) => (
                <li key={`${cta.text}-${cta.destination}`} className="flex items-center justify-between gap-2 px-3.5 py-2">
                  <span className="min-w-0">
                    <span className="block truncate text-[11.5px] font-semibold text-[#28354C]">{cta.text}</span>
                    <span className="block truncate font-mono text-[10.5px] text-[#6B7A94]">{cta.destination}</span>
                  </span>
                  <Chip tone="muted">{cta.kind}</Chip>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card title="AI-related signals" icon={ScrollText} className="lg:col-span-2">
        {aiSignals.length === 0 ? (
          <p className="text-[11.5px] leading-relaxed text-[#6B7A94]">
            No public AI-related script or generator metadata was observed. This does not prove that content or images were not created with AI.
          </p>
        ) : (
          <ul className="space-y-2">
            {aiSignals.map((signal, index) => (
              <li key={`${signal.kind}-${index}`} className="border-l-2 border-[#2563EB] pl-2.5">
                <p className="text-[11.5px] font-semibold text-[#28354C]">{signal.kind}</p>
                <p className="break-all font-mono text-[10.5px] text-[#6B7A94]">{signal.evidence}</p>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-3 text-[10.5px] leading-relaxed text-[#94A3B8]">
          Public HTML cannot reliably determine whether prose or images were AI-generated, so this panel reports observable implementation evidence only.
        </p>
      </Card>

      <Card title="Observed keyword themes" icon={Search} className="lg:col-span-2">
        {keywords.length === 0 ? (
          <p className="text-[11.5px] leading-relaxed text-[#6B7A94]">No repeated keyword themes were extracted from the public HTML.</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {keywords.map((keyword) => <Chip key={keyword.term} tone="info">{keyword.term} · {keyword.count}</Chip>)}
          </div>
        )}
        <p className="mt-3 text-[10.5px] leading-relaxed text-[#94A3B8]">
          These are on-page term frequencies, not search-volume, ranking, or keyword-difficulty estimates.
        </p>
      </Card>

      <Card title="Twitter card" icon={ImageIcon} className="lg:col-span-2">
        {deep.twitter ? (
          <div className="space-y-3">
            {deep.twitter.title && (
              <div>
                <p className="text-[11.5px] font-semibold text-[#28354C]">Title</p>
                <p className="truncate font-mono text-[10px] text-[#6B7A94]">{deep.twitter.title}</p>
              </div>
            )}
            {deep.twitter.description && (
              <div>
                <p className="text-[11.5px] font-semibold text-[#28354C]">Description</p>
                <p className="truncate font-mono text-[10px] text-[#6B7A94]">{deep.twitter.description}</p>
              </div>
            )}
            {deep.twitter.image && (
              <img
                src={deep.twitter.image}
                alt={deep.twitter.title || "Twitter card image"}
                className="h-32 w-auto max-w-full rounded-lg border border-[#E6EBF4] object-contain"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = "none";
                }}
              />
            )}
            {deep.twitter.card && (
              <p className="text-[10.5px] text-[#6B7A94]">Card type: {deep.twitter.card}</p>
            )}
          </div>
        ) : (
          <p className="text-[11.5px] leading-relaxed text-[#6B7A94]">No Twitter card metadata found in the page HTML.</p>
        )}
      </Card>
    </div>
  );
}

function LinksTab({ data }: { data: PageAudit }) {
  const { links } = data;
  const inboundLinks = (data as DeepPageAudit).inboundLinks ?? [];
  const columns: Column<PageAudit["links"]["samples"][number]>[] = [
    {
      key: "href",
      header: "Link",
      primary: true,
      cell: (link) => (
        <div className="min-w-0">
          <p className="truncate text-[11.5px] font-semibold text-[#28354C]">{link.text}</p>
          <p className="truncate font-mono text-[10.5px] text-[#6B7A94]">{link.href}</p>
        </div>
      ),
    },
    { key: "kind", header: "Kind", cell: (link) => <Chip tone="muted">{link.kind}</Chip> },
    {
      key: "status",
      header: "Status",
      align: "center",
      cell: (link) => (link.status ? <Chip tone={httpStatusTone(link.status)}>{link.status}</Chip> : <span>—</span>),
    },
    {
      key: "redirect",
      header: "Redirects to",
      cell: (link) => (
        <span className="font-mono text-[10.5px] text-[#6B7A94]">{link.redirectsTo ?? "—"}</span>
      ),
    },
  ];

  return (
    <div className="space-y-1">
      <div className="grid grid-cols-2 gap-1 lg:grid-cols-5">
        <SmallStat label="Internal links" value={links.internal} tone="info" />
        <SmallStat label="External links" value={links.external} tone="muted" />
        <SmallStat label="Broken links" value={links.broken} tone={links.broken > 0 ? "bad" : "good"} />
        <SmallStat label="Redirected links" value={links.redirected} tone={links.redirected > 0 ? "warn" : "good"} />
        <div className="rounded-xl border border-[#E6EBF4] bg-white p-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.04em] text-[#6B7A94]">Orphan risk</p>
          <Chip tone={links.orphanRisk ? "warn" : "good"} className="mt-1.5">
            {links.orphanRisk ? "Few internal links in" : "Well linked"}
          </Chip>
        </div>
      </div>

      <Card title="Link sample" icon={Link2} subtitle="A sample of links found on this page" bodyClassName="p-0">
        <DataTable
          columns={columns}
          rows={links.samples}
          getRowId={(link) => `${link.href}-${link.text}-${links.samples.indexOf(link)}`}
          empty={<EmptyState title="No links found" body="This page contains no anchors." compact />}
          dense
        />
      </Card>

      <Card title={`Internal links to this page (${inboundLinks.length})`} icon={Link2} subtitle="Pages in the latest crawl that link to this URL" bodyClassName="p-0">
        {inboundLinks.length === 0 ? (
          <EmptyState title="No internal links found" body="This can make the page harder for visitors and crawlers to discover. Add relevant links from related pages." compact />
        ) : (
          <ul className="divide-y divide-[#F2F5FA]">
            {inboundLinks.map((link) => (
              <li key={link.pageId} className="flex items-center justify-between gap-3 px-3.5 py-2.5">
                <span className="min-w-0">
                  <span className="block truncate text-[11.5px] font-semibold text-[#28354C]">{link.title}</span>
                  <span className="block truncate font-mono text-[10.5px] text-[#6B7A94]">{link.path}</span>
                </span>
                <a href={link.url} target="_blank" rel="noreferrer noopener" className="shrink-0 text-[10.5px] font-semibold text-[#2563EB] hover:underline">Open</a>
              </li>
            ))}
          </ul>
        )}
        <p className="border-t border-[#F2F5FA] px-3.5 py-2 text-[10.5px] leading-relaxed text-[#94A3B8]">
          External backlinks are not inferred from a public crawl. They require Search Console link data or a dedicated backlink index.
        </p>
      </Card>
    </div>
  );
}

/** Crawl-time observations only. Lighthouse and field metrics live in PagePerformanceTab. */
function PerformanceTab({ data }: { data: PageAudit }) {
  const perf = data.performance;
  return (
    <Card title="Observed during the crawl" subtitle="Single observations from the last crawl — not Core Web Vitals" bodyClassName="p-3">
      <div className="grid grid-cols-2 gap-1 lg:grid-cols-3">
        <SmallStat label="Response time (crawl)" value={perf.ttfbMs === null ? "—" : formatMs(perf.ttfbMs)} tone="muted" />
        <SmallStat label="HTML size" value={perf.pageWeightKb === null ? "—" : formatWeight(perf.pageWeightKb)} tone="muted" />
        <SmallStat label="Requests (Lighthouse)" value={perf.requests === null ? "See Lighthouse above" : perf.requests} tone="muted" />
      </div>
    </Card>
  );
}

function StructuredDataTab({ data }: { data: PageAudit }) {
  const blocks = data.structuredData ?? [];
  return (
    <Card title="Structured data (JSON-LD)" icon={FileCode2} subtitle="Syntax and common-field checks. Not a rich-result eligibility verdict." bodyClassName="p-0">
      {blocks.length === 0 ? (
        <EmptyState title="No JSON-LD found" body="This page has no application/ld+json blocks." compact />
      ) : (
        <ul className="divide-y divide-[#F2F5FA]">
          {blocks.map((block) => (
            <li key={block.index} className="flex items-start justify-between gap-3 px-3.5 py-2.5">
              <div className="min-w-0">
                <p className="text-[11.5px] font-semibold text-[#28354C]">Block {block.index + 1}{block.types.length ? ` · ${block.types.join(", ")}` : ""}</p>
                {block.error ? <p className="mt-0.5 text-[10.5px] text-[#B91C1C]">Invalid JSON: {block.error}</p> : null}
                {block.missingFields.length ? <p className="mt-0.5 text-[10.5px] text-[#9A5B08]">Missing: {block.missingFields.join(", ")}</p> : null}
              </div>
              <Chip tone={!block.valid ? "bad" : block.missingFields.length ? "warn" : "good"}>{!block.valid ? "Invalid" : block.missingFields.length ? "Incomplete" : "Valid"}</Chip>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function HistoryTab({ data, pageIssues, openIssue }: { data: PageAudit; pageIssues: IssueRecord[]; openIssue: (id: string) => void }) {
  const history = data.history ?? [];
  const evidence = data.evidence;
  return (
    <div className="grid gap-1 xl:grid-cols-2">
      <Card title={`Issues (${pageIssues.length})`} icon={TriangleAlert} bodyClassName="p-0">
        {pageIssues.length === 0 ? (
          <EmptyState title="No issues recorded" body="No issue is open or resolved for this page." icon={ShieldCheck} compact />
        ) : (
          <ul className="divide-y divide-[#F2F5FA]">
            {pageIssues.map((issue) => (
              <li key={issue.id} className="px-3.5 py-2.5">
                <button type="button" className="w-full cursor-pointer text-left" onClick={() => openIssue(issue.id)}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-[11.5px] font-semibold text-[#28354C]">{issue.title}</span>
                    <Chip tone={issue.status === "open" ? "warn" : issue.status === "resolved" ? "good" : "muted"}>{issue.status}</Chip>
                  </div>
                  {issue.evidence ? <p className="mt-0.5 truncate text-[10.5px] text-[#6B7A94]">{issue.evidence}</p> : null}
                  <p className="mt-0.5 text-[10px] text-[#94A3B8]">
                    First seen {formatRelative(issue.firstDetectedAt ?? issue.detectedAt)}
                    {issue.reopenedAt ? ` · reopened ${formatRelative(issue.reopenedAt)}` : ""}
                    {issue.notRecheckedAt ? " · not re-verified in the last scan" : ""}
                  </p>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <div className="grid gap-1">
        <Card title="Scan history" icon={RefreshCw} subtitle="Same page, one row per scan" bodyClassName="p-0">
          {history.length === 0 ? (
            <EmptyState title="No history yet" body="History is recorded from the first scan made with the evidence-based audit." compact />
          ) : (
            <ul className="divide-y divide-[#F2F5FA]">
              {history.map((entry, index) => (
                <li key={entry.scanId} className="px-3.5 py-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11.5px] font-semibold text-[#28354C]">{formatRelative(entry.at)}</span>
                    <span className="text-[10.5px] text-[#6B7A94]">HTTP {entry.httpStatus ?? "—"} · {entry.issueCount} issue{entry.issueCount === 1 ? "" : "s"} · {entry.wordCount} words</span>
                  </div>
                  {entry.changes === null ? (
                    <p className="mt-0.5 text-[10.5px] text-[#94A3B8]">{index === history.length - 1 ? "Baseline: first recorded scan" : "No earlier scan to compare"}</p>
                  ) : (
                    <p className="mt-0.5 text-[10.5px] text-[#5B6B85]">
                      {[
                        entry.changes.statusChanged ? `status ${entry.changes.statusChanged.from} → ${entry.changes.statusChanged.to}` : null,
                        entry.changes.titleChanged ? "title changed" : null,
                        entry.changes.descriptionChanged ? "description changed" : null,
                        entry.changes.contentChanged ? `content changed (${entry.changes.wordCountDelta >= 0 ? "+" : ""}${entry.changes.wordCountDelta} words)` : null,
                        entry.changes.newIssues.length ? `${entry.changes.newIssues.length} new issue(s)` : null,
                        entry.changes.resolvedIssues.length ? `${entry.changes.resolvedIssues.length} resolved` : null,
                      ].filter(Boolean).join(" · ") || "No changes since the previous scan"}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>

        {evidence ? (
          <Card title="Crawl evidence" icon={ScrollText}>
            <dl className="divide-y divide-[#F2F5FA]">
              <KeyValue label="Requested URL"><span className="break-all font-mono text-[10.5px]">{evidence.requestedUrl}</span></KeyValue>
              <KeyValue label="Final URL"><span className="break-all font-mono text-[10.5px]">{evidence.finalUrl}</span></KeyValue>
              <KeyValue label="Redirects">{evidence.redirectChain.length ? evidence.redirectChain.map((h) => `${h.status} ${h.url}`).join(" → ") : "None"}</KeyValue>
              <KeyValue label="Found via">{evidence.discoveredVia} · depth {evidence.depth}</KeyValue>
              <KeyValue label="In sitemap">{evidence.inSitemap ? "Yes" : "No"}</KeyValue>
              <KeyValue label="Language">{evidence.lang ?? "Not declared"}</KeyValue>
              <KeyValue label="Content type">{evidence.contentType ?? "Unknown"}</KeyValue>
              <KeyValue label="Crawled">{evidence.crawledAt ? formatRelative(evidence.crawledAt) : "—"}</KeyValue>
            </dl>
          </Card>
        ) : null}
      </div>
    </div>
  );
}

function ImagesTab({ data }: { data: PageAudit }) {
  const { content } = data;
  const totalImages = content.images.total;
  const missingAlt = content.images.missingAlt;
  const oversized = content.images.oversized;
  
  // Extract OG image from SEO checks
  const ogImage = data.seoChecks.find((check) => check.id === "og-image")?.value as string | null;
  const ogImageAlt = data.seoChecks.find((check) => check.id === "og-image")?.detail;
  
  return (
    <div className="grid gap-1">
      <Card title="Image summary" icon={ImageIcon}>
        <dl className="divide-y divide-[#F2F5FA]">
          <KeyValue label="Total images">{totalImages}</KeyValue>
          <KeyValue label="Missing alt text">{missingAlt}</KeyValue>
          <KeyValue label="Oversized images">{oversized} images</KeyValue>
        </dl>
      </Card>

      {ogImage && (
        <Card title="Open Graph image preview" icon={ImageIcon}>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <img
                src={ogImage}
                alt={ogImageAlt ?? "Open Graph image"}
                className="h-32 w-auto max-w-full rounded-lg border border-[#E6EBF4] object-contain"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = "none";
                }}
              />
              <div className="min-w-0">
                <p className="text-[11px] font-semibold text-[#28354C]">og:image</p>
                <p className="truncate font-mono text-[10px] text-[#6B7A94]">{ogImage}</p>
              </div>
            </div>
            <p className="text-[10.5px] text-[#94A3B8]">
              This is the image used when the page is shared on social platforms (Facebook, LinkedIn, X, etc.).
              {ogImageAlt && <span className="ml-1">Alt: {ogImageAlt}</span>}
            </p>
          </div>
        </Card>
      )}

      <Card title="Images without alt text" icon={ImageIcon}>
        {missingAlt === 0 ? (
          <p className="text-[11.5px] leading-relaxed text-[#0B7A55]">All images have alt text — great for accessibility!</p>
        ) : (
          <ul className="divide-y divide-[#F2F5FA]">
            {content.headings?.length ? (
              content.headings.map((heading, index) => (
                <li key={`${heading.level}-${index}`} className="flex items-center gap-2 px-3.5 py-2">
                  <Chip tone="warn">Missing alt</Chip>
                  <span className="truncate text-[11.5px] text-[#334155]">{heading.text}</span>
                </li>
              ))
            ) : (
              <EmptyState title="No headings found" body="Cannot determine which images lack alt text without heading context." compact />
            )}
          </ul>
        )}
      </Card>

      <Card title="Image optimization" icon={ImageIcon}>
        {oversized === null ? (
          <EmptyState title="Image size not measured" body="Oversized-image detection needs per-image byte sizes, which this crawl does not collect." compact />
        ) : oversized > 0 ? (
          <ul className="divide-y divide-[#F2F5FA]">
            <li className="flex items-center gap-2 px-3.5 py-2.5">
              <Chip tone="warn">Oversized images detected</Chip>
              <span className="text-[11.5px] text-[#334155]">{oversized} image{oversized === 1 ? "" : "s"} exceed recommended size</span>
            </li>
            <li className="mt-1 text-[10.5px] text-[#6B7A94]">
              Consider compressing or serving these images in modern formats (WebP/AVIF).
            </li>
          </ul>
        ) : (
          <p className="text-[11.5px] leading-relaxed text-[#0B7A55]">No oversized images detected — good optimization!</p>
        )}
      </Card>

      <Card title="Note" icon={ImageIcon} className="border-[#E29208]">
        <p className="text-[11px] leading-relaxed text-[#6B7A94]">
          Individual image previews (with URLs, dimensions, alt text per image) require enhanced crawl data. 
          The current public crawl captures only aggregate counts and the Open Graph image above.
        </p>
      </Card>
    </div>
  );
}

function SmallStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string | number;
  tone: "good" | "warn" | "bad" | "info" | "muted";
}) {
  return (
    <div className="rounded-xl border border-[#E6EBF4] bg-white p-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.04em] text-[#6B7A94]">{label}</p>
      <p className="mt-0.5 text-[17px] font-semibold tracking-[-0.02em] text-[#111C3A]">{value}</p>
      <Meter
        value={tone === "good" ? 100 : tone === "warn" ? 60 : tone === "bad" ? 30 : 50}
        tone={tone}
        className="mt-1.5"
        label={label}
      />
    </div>
  );
}
