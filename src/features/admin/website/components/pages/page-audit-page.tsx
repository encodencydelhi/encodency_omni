"use client";

/**
 * Page audit — one discovered page, examined from the outside.
 *
 * Screenshots are explicitly framed as placeholders: no worker is capturing
 * them yet, and a fake browser chrome around invented pixels would be worse
 * than an honest empty frame.
 */

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  Camera,
  CheckCircle2,
  ChevronRight,
  Circle,
  Download,
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
import { useWebsiteIssues, useWebsitePageAudit } from "../../data/hooks";
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
import type { AuditCheck, PageAudit } from "../../data/types";
import {
  Card,
  Chip,
  DataTable,
  KeyValue,
  Meter,
  ScoreDial,
  SegmentedControl,
  SubTabs,
  WButton,
  type Column,
} from "../ui/kit";
import { ShareBar, SERIES_COLORS } from "../ui/charts";
import { EmptyState, QueryErrorState, SkeletonBlock, SkeletonStats } from "../ui/states";
import { useUrlState } from "../use-url-state";
import { useWebsiteWorkspace } from "../website-workspace";

type AuditTab = "overview" | "seo" | "content" | "links" | "performance" | "accessibility" | "technical";

const TABS: { value: AuditTab; label: string }[] = [
  { value: "overview", label: "Overview" },
  { value: "seo", label: "SEO" },
  { value: "content", label: "Content" },
  { value: "links", label: "Links" },
  { value: "performance", label: "Performance" },
  { value: "accessibility", label: "Accessibility" },
  { value: "technical", label: "Technical" },
];

export function WebsitePageAuditPage({ pageId }: { pageId: string }) {
  const router = useRouter();
  const { clientId, runScan, scan, openIssue, openFixGuide } = useWebsiteWorkspace();
  const audit = useWebsitePageAudit(clientId, pageId);
  const issues = useWebsiteIssues(clientId);

  const [tab, setTab] = useUrlState<AuditTab>("tab", "overview", TABS.map((entry) => entry.value));
  const [viewport, setViewport] = useUrlState<"desktop" | "tablet" | "mobile">("viewport", "desktop", [
    "desktop",
    "tablet",
    "mobile",
  ]);

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
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <ScoreSummary label="OmniPlatform SEO" value={page.seoScore} />
          <ScoreSummary label="OmniPlatform Performance" value={page.performanceScore} />
          <ScoreSummary label="OmniPlatform Accessibility" value={page.accessibilityScore} />
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
          <Card
            title="Visual snapshot"
            icon={Camera}
            subtitle={data.screenshots.note}
            action={
              <SegmentedControl
                ariaLabel="Viewport"
                size="sm"
                value={viewport}
                onChange={setViewport}
                options={[
                  { value: "desktop", label: "Desktop" },
                  { value: "tablet", label: "Tablet" },
                  { value: "mobile", label: "Mobile" },
                ]}
              />
            }
          >
            <div
              className={cn(
                "mx-auto overflow-hidden rounded-lg border border-[#DAE1EC] bg-[#F7F9FC]",
                viewport === "desktop" ? "aspect-[16/10] w-full" : viewport === "tablet" ? "aspect-[3/4] w-[62%]" : "aspect-[9/16] w-[38%]",
              )}
            >
              <div className="flex h-full flex-col">
                <div className="flex h-6 shrink-0 items-center gap-1 border-b border-[#E6EBF4] bg-white px-2">
                  <span className="size-1.5 rounded-full bg-[#F1C0BE]" />
                  <span className="size-1.5 rounded-full bg-[#F5DFB8]" />
                  <span className="size-1.5 rounded-full bg-[#BDE8D6]" />
                  <span className="ml-2 truncate font-mono text-[8.5px] text-[#94A3B8]">{page.url}</span>
                </div>
                <div className="flex flex-1 flex-col items-center justify-center gap-1.5 p-4 text-center">
                  <Camera className="size-5 text-[#B4C0D2]" aria-hidden />
                  <p className="text-[11px] font-semibold text-[#5B6B85]">No snapshot captured</p>
                  <p className="max-w-[240px] text-[10.5px] leading-relaxed text-[#94A3B8]">
                    Screenshot capture needs a rendering worker. The {viewport} frame is shown at the right aspect
                    ratio so the layout is ready for it.
                  </p>
                  <WButton
                    size="sm"
                    icon={ExternalLink}
                    onClick={() => window.open(page.url, "_blank", "noopener,noreferrer")}
                  >
                    Open live page instead
                  </WButton>
                </div>
              </div>
            </div>
          </Card>

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

      {tab === "seo" ? <CheckListCard title="SEO checks" icon={Search} checks={data.seoChecks} /> : null}
      {tab === "accessibility" ? (
        <CheckListCard title="Accessibility checks" icon={ShieldCheck} checks={data.accessibilityChecks} />
      ) : null}
      {tab === "technical" ? (
        <CheckListCard title="Technical checks" icon={Wrench} checks={data.technicalChecks} />
      ) : null}

      {tab === "content" ? <ContentTab data={data} /> : null}
      {tab === "links" ? <LinksTab data={data} /> : null}
      {tab === "performance" ? <PerformanceTab data={data} /> : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */

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
              <Chip tone="muted">{content.readability.score}</Chip>
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
    </div>
  );
}

function LinksTab({ data }: { data: PageAudit }) {
  const { links } = data;
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
          getRowId={(link) => `${link.href}-${link.text}`}
          empty={<EmptyState title="No links found" body="This page contains no anchors." compact />}
          dense
        />
      </Card>
    </div>
  );
}

function PerformanceTab({ data }: { data: PageAudit }) {
  const perf = data.performance;
  const totalWeight = perf.breakdown.reduce((sum, row) => sum + row.weightKb, 0) || 1;

  return (
    <div className="space-y-1">
      <div className="grid grid-cols-2 gap-1 lg:grid-cols-6">
        <SmallStat label="LCP" value={formatMs(perf.lcpMs)} tone={perf.lcpMs <= 2500 ? "good" : perf.lcpMs <= 4000 ? "warn" : "bad"} />
        <SmallStat label="INP" value={formatMs(perf.inpMs)} tone={perf.inpMs <= 200 ? "good" : perf.inpMs <= 500 ? "warn" : "bad"} />
        <SmallStat label="CLS" value={perf.cls.toFixed(3)} tone={perf.cls <= 0.1 ? "good" : perf.cls <= 0.25 ? "warn" : "bad"} />
        <SmallStat label="TTFB" value={formatMs(perf.ttfbMs)} tone={perf.ttfbMs <= 800 ? "good" : perf.ttfbMs <= 1800 ? "warn" : "bad"} />
        <SmallStat label="Page weight" value={formatWeight(perf.pageWeightKb)} tone={perf.pageWeightKb < 2000 ? "good" : "warn"} />
        <SmallStat label="Requests" value={perf.requests} tone={perf.requests < 60 ? "good" : "warn"} />
      </div>

      <div className="grid gap-1 lg:grid-cols-2">
        <Card title="Resource weight" icon={Gauge}>
          <ShareBar
            ariaLabel="Page weight by resource type"
            rows={perf.breakdown.map((row, index) => ({
              label: `${row.label} · ${row.requests} requests`,
              value: formatWeight(row.weightKb),
              share: Math.round((row.weightKb / totalWeight) * 100),
              color: SERIES_COLORS[index % SERIES_COLORS.length] ?? "#2563EB",
            }))}
          />
        </Card>

        <Card title="Third-party scripts" icon={Link2} bodyClassName="p-0">
          {perf.thirdParty.length === 0 ? (
            <EmptyState title="No third-party scripts" body="This page loads only first-party resources." compact />
          ) : (
            <ul className="divide-y divide-[#F2F5FA]">
              {perf.thirdParty.map((script) => (
                <li key={script.name} className="flex items-center justify-between gap-2 px-3.5 py-2.5">
                  <span className="min-w-0">
                    <span className="block truncate text-[11.5px] font-semibold text-[#28354C]">{script.name}</span>
                    <span className="block text-[10.5px] text-[#6B7A94]">{formatWeight(script.weightKb)}</span>
                  </span>
                  <Chip tone={script.blocking ? "warn" : "muted"}>
                    {script.blocking ? "Blocks main thread" : "Async"}
                  </Chip>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
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
