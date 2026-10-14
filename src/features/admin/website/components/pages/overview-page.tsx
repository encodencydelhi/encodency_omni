"use client";

/**
 * Overview — is this website healthy, and what needs attention first?
 *
 * Scores shown here are OmniPlatform's own composites. They are labelled as
 * such everywhere: nothing on this screen is presented as a Google score,
 * because none of it comes from Google.
 */

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  AlertOctagon,
  ArrowRight,
  Boxes,
  ExternalLink,
  FileSearch,
  FileStack,
  Gauge,
  History,
  Link2,
  Lock,
  RefreshCw,
  Search,
  ShieldCheck,
  Timer,
  TriangleAlert,
  Wifi,
  Wrench,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import {
  useWebsiteCapabilities,
  useWebsiteIssues,
  useWebsitePages,
  useWebsitePerformance,
  useWebsiteScans,
  useWebsiteSeo,
  useWebsiteMonitoring,
  useWebsiteSummary,
  useWebsiteTechnologies,
  useWebsiteTrend,
} from "../../data/hooks";
import {
  categoryLabel,
  countBySeverity,
  formatDate,
  formatDuration,
  formatNumber,
  formatRelative,
  formatShortDate,
  formatWeight,
  httpStatusTone,
  scanTypeLabel,
  scoreBand,
  scoreLabel,
  severityLabel,
  severityTone,
  sortIssues,
  topProblemPages,
  vitalTone,
} from "../../data/selectors";
import { scanStatusLabel, scanStatusTone } from "../../data/scan-state";
import { INTEGRATION_ORDER, integrationStatusLabel, integrationTone } from "../../data/capability-provider";
import type { IssueRecord, PageRecord, Severity } from "../../data/types";
import {
  Card,
  Chip,
  DataTable,
  LinkAction,
  Meter,
  ScoreDial,
  SegmentedControl,
  StatTile,
  WButton,
  toneText,
  type Column,
} from "../ui/kit";
import { AXIS_PROPS, ChartLegend, GRID_PROPS, makeTooltip, SERIES_COLORS } from "../ui/charts";
import { EmptyState, QueryErrorState, SkeletonBlock, SkeletonChart, SkeletonStats, SkeletonTable } from "../ui/states";
import { AiExecutiveSummaryCard } from "../ui/ai-insights";
import { useWebsiteWorkspace } from "../website-workspace";
import { useUrlState } from "../use-url-state";

const TREND_SERIES = [
  { key: "health", label: "Website health", color: SERIES_COLORS[0] },
  { key: "seo", label: "SEO", color: SERIES_COLORS[1] },
  { key: "performance", label: "Performance", color: SERIES_COLORS[2] },
  { key: "uptime", label: "Uptime", color: SERIES_COLORS[3] },
];

const SEVERITY_ORDER: Severity[] = ["critical", "high", "medium", "low"];

/** Audit priorities are coloured by their impact so severity reads at a glance. */
const PRIORITY_TONE: Record<string, { card: string; rail: string }> = {
  high: { card: "bg-[#FEF2F2] border-[#FCA5A5]", rail: "border-l-[#DC2626]" },
  medium: { card: "bg-[#FFFBEB] border-[#FCD34D]", rail: "border-l-[#F59E0B]" },
  low: { card: "bg-[#ECFDF5] border-[#A7F3D0]", rail: "border-l-[#10B981]" },
};
const PRIORITY_TONE_FALLBACK = { card: "bg-[#F8FAFC] border-[#E2E8F0]", rail: "border-l-[#2563EB]" };
const priorityTone = (impact?: string) => PRIORITY_TONE[String(impact ?? "").toLowerCase()] ?? PRIORITY_TONE_FALLBACK;

export function WebsiteOverviewPage() {
  const router = useRouter();
  const { clientId, domain, websiteUrl, runScan, openExport, openIssue, openFixGuide, openIntegration, navigate, scan } =
    useWebsiteWorkspace();

  const summary = useWebsiteSummary(clientId);
  const monitoring = useWebsiteMonitoring(clientId);
  const issues = useWebsiteIssues(clientId);
  const pages = useWebsitePages(clientId);
  const seo = useWebsiteSeo(clientId);
  const performance = useWebsitePerformance(clientId);
  const technologies = useWebsiteTechnologies(clientId);
  const scans = useWebsiteScans(clientId);
  const capabilities = useWebsiteCapabilities(clientId);

  const [period, setPeriod] = useUrlState<"7d" | "30d" | "90d">("period", "30d", ["7d", "30d", "90d"]);
  const days = period === "7d" ? 7 : period === "30d" ? 30 : 90;
  const trend = useWebsiteTrend(clientId, days);
  const [hiddenSeries, setHiddenSeries] = useState<string[]>([]);

  const openIssues = useMemo(
    () => sortIssues((issues.data ?? []).filter((issue) => issue.status === "open")),
    [issues.data],
  );
  const bySeverity = useMemo(() => countBySeverity(openIssues), [openIssues]);
  const problemPages = useMemo(() => topProblemPages(pages.data ?? [], 6), [pages.data]);

  return (
    <div className="space-y-1">
      <div className="grid gap-1 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)_minmax(0,0.9fr)]">
        {summary.isLoading ? (
          <>
            <Card title="Website" icon={ShieldCheck}>
              <SkeletonBlock lines={6} />
            </Card>
            <Card title="website scores" icon={Gauge}>
              <SkeletonStats count={4} />
            </Card>
            <SkeletonStats count={4} />
          </>
        ) : summary.error ? (
          <Card title="Website health" className="xl:col-span-2">
            <QueryErrorState error={summary.error} onRetry={() => void summary.refetch()} />
          </Card>
        ) : summary.data ? (
          <>
            <Card
              title="Website"
              subtitle="Read from the client profile"
              icon={ShieldCheck}
              bodyClassName="p-3"
              action={
                <WButton size="sm" icon={FileSearch} onClick={() => navigate("/admin/website/issues")}>
                  View full report
                </WButton>
              }
            >
              <div className="flex items-start gap-3">
                <span className="grid size-11 shrink-0 place-items-center rounded-xl border border-[#E6EBF4] bg-[#F7F9FC] text-[13px] font-bold uppercase text-[#2563EB]">
                  {domain?.slice(0, 2) ?? "—"}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] font-semibold normal-case text-[#111C3A]">{domain}</p>
                  <a
                    href={websiteUrl ?? "#"}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="inline-flex items-center gap-1 truncate rounded text-[11px] normal-case text-[#2563EB] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]/35"
                  >
                    {websiteUrl}
                    <ExternalLink className="size-3" aria-hidden />
                  </a>
                </div>
              </div>

              <dl className="mt-2 divide-y divide-[#F2F5FA] border-t border-[#F1F4F9] pt-1">
                <button
                  type="button"
                  onClick={() => navigate("/admin/website/monitoring?tab=uptime")}
                  className="w-full flex items-center justify-between py-1.5 px-1 rounded transition-colors hover:bg-[#F8FAFC] cursor-pointer text-left"
                >
                  <dt className="text-[12px] font-medium text-[#4A5A73]">Live status</dt>
                  <dd className="flex items-center gap-1.5">
                    <Chip tone={summary.data.target.status === "live" ? "good" : summary.data.target.status === "degraded" ? "warn" : "bad"} dot>
                      {summary.data.target.status === "live"
                        ? "Live"
                        : summary.data.target.status === "degraded"
                          ? "Degraded"
                          : summary.data.target.status === "down"
                            ? "Down"
                            : "Unknown"}
                    </Chip>
                    <ArrowRight className="size-3 text-[#94A3B8]" />
                  </dd>
                </button>
                <button
                  type="button"
                  onClick={() => navigate("/admin/website/monitoring?tab=ssl")}
                  className="w-full flex items-center justify-between py-1.5 px-1 rounded transition-colors hover:bg-[#F8FAFC] cursor-pointer text-left"
                >
                  <dt className="text-[12px] font-medium text-[#4A5A73]">HTTPS</dt>
                  <dd className="flex items-center gap-1.5">
                    {/* The URL scheme is not a certificate check: only a real TLS handshake can say "valid". */}
                    {monitoring.data?.ssl?.certificateValid === true ? (
                      <Chip tone="good" icon={Lock}>Valid certificate</Chip>
                    ) : monitoring.data?.ssl?.certificateValid === false ? (
                      <Chip tone="bad" icon={Lock}>Certificate invalid</Chip>
                    ) : (
                      <Chip tone={summary.data.target.https ? "muted" : "bad"} icon={Lock}>
                        {summary.data.target.https ? "HTTPS URL · certificate not checked" : "Not secure"}
                      </Chip>
                    )}
                    <ArrowRight className="size-3 text-[#94A3B8]" />
                  </dd>
                </button>
                <button
                  type="button"
                  onClick={() => navigate("/admin/website/pages")}
                  className="w-full flex items-center justify-between py-1.5 px-1 rounded transition-colors hover:bg-[#F8FAFC] cursor-pointer text-left"
                >
                  <dt className="text-[12px] font-medium text-[#4A5A73]">Last scanned</dt>
                  <dd className="flex items-center gap-1 text-[12px] font-medium text-[#111C3A]">
                    {formatRelative(summary.data.target.lastScannedAt)}
                    <ArrowRight className="size-3 text-[#94A3B8]" />
                  </dd>
                </button>
              </dl>

              <div className="mt-2 flex flex-wrap gap-1.5">
                <WButton
                  tone="primary"
                  size="sm"
                  icon={RefreshCw}
                  disabled={scan.isRunning}
                  disabledReason="A scan is already running"
                  onClick={() => runScan("full-crawl")}
                >
                  Scan now
                </WButton>
                <WButton
                  size="sm"
                  icon={ExternalLink}
                  onClick={() => websiteUrl && window.open(websiteUrl, "_blank", "noopener,noreferrer")}
                >
                  Open website
                </WButton>
                <WButton size="sm" onClick={openExport}>
                  Export report
                </WButton>
              </div>
            </Card>

            <Card
              title="website scores"
              subtitle="Our own composite measures — click any score for full details"
              icon={Gauge}
              bodyClassName="p-4 flex flex-col justify-center"
            >
              <div className="grid grid-cols-[1.1fr_1fr] items-stretch gap-3 h-full">
                <button
                  type="button"
                  onClick={() => navigate("/admin/website/issues")}
                  className="group flex flex-col items-center justify-center gap-3 rounded-xl border border-[#E6EBF4] bg-gradient-to-br from-[#FAFCFF] to-[#F1F5F9] p-4 shadow-sm h-full cursor-pointer transition-all hover:-translate-y-0.5 hover:border-[#C9D6EA] hover:shadow-md hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]/35 text-center"
                >
                  {summary.data.scores.health === null ? (
                    <div className="flex size-[76px] items-center justify-center rounded-full border border-dashed border-[#CBD5E1] text-center text-[10px] font-semibold leading-tight text-[#64748B]">
                      Not scored
                    </div>
                  ) : (
                    <ScoreDial
                      value={summary.data.scores.health}
                      tone={scoreBand(summary.data.scores.health)}
                      size={76}
                      label={`OmniPlatform Website Health ${summary.data.scores.health}`}
                    />
                  )}
                  <div className="flex flex-col items-center text-center">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[#64748B] mb-0.5">
                      Overall Health
                    </p>
                    <p className="text-[14px] font-bold text-[#0F172A] leading-none mb-1 group-hover:text-[#2563EB] transition-colors">
                      {summary.data.scores.health === null ? "No checks run yet" : `${scoreLabel(summary.data.scores.health)} →`}
                    </p>
                    <div className={cn("items-center gap-1.5 mb-1.5", summary.data.scores.health === null ? "hidden" : "flex")}>
                      <span className={cn("inline-flex items-center rounded-md bg-[#F8FAFC] px-1.5 py-0.5 text-[9.5px] font-bold ring-1 ring-inset ring-[#E2E8F0]", toneText[scoreBand(summary.data.scores.health ?? 0)])}>
                        {summary.data.scores.health}
                      </span>
                      <span className="mx-1 text-[#94A3B8]">/</span>
                      <span className="inline-flex items-center rounded-md bg-[#F0FDF4] px-1.5 py-0.5 text-[9.5px] font-bold text-[#15803D] ring-1 ring-inset ring-[#BBF7D0]">
                        100
                      </span>
                    </div>
                    <span className="inline-flex items-center justify-center rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-[#475569] shadow-sm ring-1 ring-inset ring-[#E2E8F0]">
                      {summary.data.scoreDeltas.health == null
                        ? "Baseline scan"
                        : `${summary.data.scoreDeltas.health >= 0 ? "+" : ""}${summary.data.scoreDeltas.health} vs previous`}
                    </span>
                  </div>
                </button>

                <div className="grid grid-cols-2 gap-2">
                  {[
                    { key: "seo", label: "SEO", value: summary.data.scores.seo, href: "/admin/website/seo" },
                    { key: "performance", label: "Performance", value: summary.data.scores.performance, href: "/admin/website/performance" },
                    { key: "accessibility", label: "Accessibility", value: summary.data.scores.accessibility, href: "/admin/website/issues?category=accessibility" },
                    { key: "bestPractices", label: "Best Practices", value: summary.data.scores.bestPractices, href: "/admin/website/issues?category=technical" },
                  ].map((score) => (
                    <button
                      key={score.key}
                      type="button"
                      onClick={() => navigate(score.href)}
                      className="flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border border-[#E6EBF4] bg-white p-2 text-center shadow-sm transition-all hover:-translate-y-0.5 hover:border-[#C9D6EA] hover:shadow-md hover:bg-[#FAFCFF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]/35 h-full"
                    >
                      {score.value === null ? (
                        <div className="flex size-[52px] items-center justify-center rounded-full border border-dashed border-[#CBD5E1] text-center text-[8.5px] font-semibold leading-tight text-[#64748B]">
                          Not measured
                        </div>
                      ) : (
                        <ScoreDial
                          value={score.value}
                          tone={scoreBand(score.value)}
                          size={52}
                          label={`OmniPlatform ${score.label} score ${score.value}`}
                        />
                      )}
                      <span className="w-full text-center text-[10.5px] font-bold tracking-tight text-[#475569] truncate">
                        {score.label} →
                      </span>
                      {score.value === null ? null : (
                        <div className="flex items-center justify-center gap-1 text-[9px] font-bold">
                          <span className={toneText[scoreBand(score.value)]}>{score.value}</span>
                          <span className="mx-1 text-[#94A3B8]">/</span>
                          <span className="text-[#15803D]">100</span>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </Card>

            {/* KPI band */}
            <div className="grid grid-cols-2 gap-1">
              <StatTile
                label="Uptime · 30 days"
                value={summary.data.uptimePct === null ? "Not available" : `${(summary.data.uptimePct ?? 0).toFixed(2)}%`}
                best="100%"
                sub={
                  summary.data.uptimePct === null
                    ? "No background prober · View details →"
                    : `monitored window · View uptime details →`
                }
                icon={Wifi}
                tone={summary.data.uptimePct === null ? "muted" : summary.data.uptimePct >= 99.9 ? "good" : "warn"}
                onClick={() => navigate("/admin/website/monitoring?tab=uptime")}
              />
              <StatTile
                label="Pages"
                value={formatNumber(summary.data.pagesDiscovered)}
                best={`${summary.data.pagesDiscovered} indexed`}
                sub={`${(pages.data ?? []).filter((page) => page.indexable).length} indexable · View all pages →`}
                icon={FileStack}
                tone="info"
                onClick={() => navigate("/admin/website/pages")}
              />
              <StatTile
                label="Critical"
                value={formatNumber(summary.data.criticalIssues)}
                best="0"
                sub="Fix first · View critical issues →"
                icon={AlertOctagon}
                tone={summary.data.criticalIssues > 0 ? "bad" : "good"}
                onClick={() => navigate("/admin/website/issues?severity=critical")}
              />
              <StatTile
                label="Open issues"
                value={formatNumber(summary.data.openIssues)}
                best="0"
                sub={`${bySeverity.high} high · ${bySeverity.medium} med · View all →`}
                icon={TriangleAlert}
                tone={summary.data.openIssues > 12 ? "warn" : "info"}
                onClick={() => navigate("/admin/website/issues")}
              />
            </div>
          </>
        ) : null}
      </div>

      {/* D + C — trend and needs attention */}
      <AiExecutiveSummaryCard />

      <div className="grid gap-1 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Card
          title="Website health trend"
          subtitle="OmniPlatform composite scores over time"
          icon={History}
          action={
            <div className="flex items-center gap-2.5">
              <LinkAction onClick={() => navigate("/admin/website/monitoring")}>Detailed monitoring →</LinkAction>
              <SegmentedControl
                ariaLabel="Trend period"
                size="sm"
                value={period}
                onChange={setPeriod}
                options={[
                  { value: "7d", label: "7d" },
                  { value: "30d", label: "30d" },
                  { value: "90d", label: "90d" },
                ]}
              />
            </div>
          }
          bodyClassName="p-3.5 pt-2"
        >
          {trend.isLoading ? (
            <SkeletonChart height={200} />
          ) : trend.error ? (
            <QueryErrorState error={trend.error} onRetry={() => void trend.refetch()} compact />
          ) : (trend.data?.length ?? 0) === 0 ? (
            <EmptyState
              title="No history yet"
              body="Scores are recorded after each scan. Run a scan to start the trend."
              compact
              actions={
                <WButton tone="primary" icon={RefreshCw} onClick={() => runScan("full-crawl")}>
                  Scan now
                </WButton>
              }
            />
          ) : (
            <>
              <ChartLegend
                className="mb-1"
                items={TREND_SERIES}
                hidden={hiddenSeries}
                onToggle={(key) =>
                  setHiddenSeries((current) =>
                    current.includes(key) ? current.filter((entry) => entry !== key) : [...current, key],
                  )
                }
              />
              <div className="relative flex-1 min-h-[160px] w-full">
                <div className="absolute inset-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trend.data} margin={{ top: 6, right: 8, left: -8, bottom: 0 }}>
                      <CartesianGrid {...GRID_PROPS} />
                      <XAxis
                        dataKey="date"
                        {...AXIS_PROPS}
                        tickFormatter={(value: string) => formatShortDate(value)}
                        minTickGap={28}
                      />
                      <YAxis {...AXIS_PROPS} domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} width={34} />
                      <Tooltip
                        cursor={{ stroke: "#CBD5E1", strokeWidth: 1 }}
                        content={makeTooltip(
                          (entry) =>
                            entry.value === null || entry.value === undefined
                              ? "Not available"
                              : entry.dataKey === "uptime"
                                ? `${Number(entry.value).toFixed(2)}%`
                                : entry.value,
                          (label) => formatDate(label),
                        )}
                      />
                      {TREND_SERIES.filter((series) => !hiddenSeries.includes(series.key)).map((series) => (
                        <Line
                          key={series.key}
                          type="monotone"
                          dataKey={series.key}
                          name={series.label}
                          stroke={series.color}
                          strokeWidth={2}
                          dot={false}
                          activeDot={{ r: 4, strokeWidth: 2, stroke: "#fff" }}
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <p className="mt-1 text-[10px] text-[#94A3B8]">
                All four series share one 0–100 axis. Uptime is a percentage, the other three are OmniPlatform scores.
              </p>
            </>
          )}
        </Card>

        <Card
          title="Needs attention"
          subtitle="Open issues, most severe first"
          icon={TriangleAlert}
          action={<LinkAction onClick={() => navigate("/admin/website/issues")}>View all →</LinkAction>}
          bodyClassName="p-0"
        >
          {issues.isLoading ? (
            <SkeletonTable rows={5} />
          ) : issues.error ? (
            <QueryErrorState error={issues.error} onRetry={() => void issues.refetch()} compact />
          ) : openIssues.length === 0 ? (
            <EmptyState
              title="Nothing needs attention"
              body="No open issues were found in the last scan. That is a good place to be."
              icon={ShieldCheck}
              compact
            />
          ) : (
            <>
              <div className="flex flex-wrap gap-1.5 border-b border-[#EEF2F8] px-3.5 py-2.5">
                {SEVERITY_ORDER.map((severity) => (
                  <button
                    key={severity}
                    type="button"
                    onClick={() => navigate(`/admin/website/issues?severity=${severity}`)}
                    className="cursor-pointer rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]/35"
                  >
                    <Chip tone={severityTone[severity]} dot>
                      {severityLabel[severity]} {bySeverity[severity]}
                    </Chip>
                  </button>
                ))}
              </div>
              <ul className="scrollbar-thin max-h-[220px] divide-y divide-[#F2F5FA] overflow-y-auto">
                {openIssues.slice(0, 8).map((issue) => (
                  <AttentionRow
                    key={issue.id}
                    issue={issue}
                    onOpen={() => openIssue(issue.id)}
                    onFixGuide={() => openFixGuide(issue.fixGuideId)}
                    onAffected={() =>
                      navigate(
                        issue.affectedPageIds.length > 0
                          ? `/admin/website/pages?issue=${encodeURIComponent(issue.id)}`
                          : `/admin/website/issues?category=${issue.category}`,
                      )
                    }
                    onRescan={() => runScan("full-crawl")}
                  />
                ))}
              </ul>
            </>
          )}
        </Card>
      </div>

      {/* E + F/G — problem pages and the two summaries */}
      <div className="grid gap-1 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Card
          title="Top problem pages"
          subtitle="Ranked by critical issues, then total issues"
          icon={FileStack}
          action={<LinkAction onClick={() => navigate("/admin/website/pages")}>All pages →</LinkAction>}
          bodyClassName="p-0"
        >
          {pages.isLoading ? (
            <SkeletonTable rows={5} />
          ) : pages.error ? (
            <QueryErrorState error={pages.error} onRetry={() => void pages.refetch()} compact />
          ) : (
            <DataTable<PageRecord>
              columns={problemColumns}
              rows={problemPages}
              getRowId={(page) => page.id}
              onRowClick={(page) => router.push(`/admin/website/pages/${encodeURIComponent(page.id)}`)}
              empty={
                <EmptyState
                  title="No problem pages"
                  body="Every discovered page passed the last scan without an issue."
                  icon={ShieldCheck}
                  compact
                />
              }
              rowActions={(page) => (
                <WButton
                  size="sm"
                  icon={FileSearch}
                  onClick={() => router.push(`/admin/website/pages/${encodeURIComponent(page.id)}`)}
                >
                  Audit
                </WButton>
              )}
            />
          )}
        </Card>

        <div className="grid gap-1">
          <Card
            title="SEO summary"
            icon={Search}
            action={<LinkAction onClick={() => navigate("/admin/website/seo")}>View SEO →</LinkAction>}
          >
            {seo.isLoading ? (
              <SkeletonBlock lines={4} />
            ) : seo.error ? (
              <QueryErrorState error={seo.error} onRetry={() => void seo.refetch()} compact />
            ) : seo.data ? (
              <div className="grid grid-cols-2 gap-2">
                <MiniStat
                  label="Healthy pages"
                  value={seo.data.overview.healthyPages}
                  best={seo.data.overview.pagesCrawled}
                  tone="good"
                  onClick={() => navigate("/admin/website/seo?tab=pages")}
                />
                <MiniStat
                  label="Warnings"
                  value={seo.data.overview.warningPages}
                  best="0"
                  tone="warn"
                  onClick={() => navigate("/admin/website/issues?category=seo&severity=medium")}
                />
                <MiniStat
                  label="Critical"
                  value={seo.data.overview.criticalPages}
                  best="0"
                  tone="bad"
                  onClick={() => navigate("/admin/website/issues?category=seo&severity=critical")}
                />
                <MiniStat
                  label="Passed checks"
                  value={seo.data.overview.passedChecks}
                  best={seo.data.overview.passedChecks + seo.data.overview.errors + seo.data.overview.warnings}
                  tone="info"
                  onClick={() => navigate("/admin/website/seo?tab=overview")}
                />
              </div>
            ) : null}
          </Card>

          <Card
            title="Performance summary"
            icon={Gauge}
            action={<LinkAction onClick={() => navigate("/admin/website/performance")}>View performance →</LinkAction>}
          >
            {performance.isLoading ? (
              <SkeletonBlock lines={4} />
            ) : performance.error ? (
              <QueryErrorState error={performance.error} onRetry={() => void performance.refetch()} compact />
            ) : performance.data ? (
              <dl className="divide-y divide-[#F2F5FA]">
                {performance.data.vitals.map((vital) => (
                  <button
                    key={vital.key}
                    type="button"
                    onClick={() => navigate("/admin/website/performance?tab=vitals")}
                    className="w-full flex items-center justify-between py-2 text-left hover:bg-[#F8FAFC] px-1 rounded transition-colors cursor-pointer"
                  >
                    <dt className="text-[12px] font-medium text-[#4A5A73]">{vital.label}</dt>
                    <dd className="inline-flex items-center gap-2">
                      <div className="flex items-center gap-1.5 text-[11px]">
                        <span className={cn("font-bold bg-[#F1F5F9] px-1.5 py-0.5 rounded", toneText[vitalTone[vital.band]])}>
                          {vital.display}
                        </span>
                        <span className="font-bold text-[#15803D] bg-[#F0FDF4] px-1.5 py-0.5 rounded border border-[#DCFCE7]">
                          ≤ {vital.thresholds.good}{vital.key === "cls" ? "" : vital.key === "inp" ? "ms" : "s"}
                        </span>
                      </div>
                      <Chip tone={vitalTone[vital.band]}>{vital.band === "good" ? "Good" : vital.band === "poor" ? "Poor" : "Needs work"}</Chip>
                      <ArrowRight className="size-3 text-[#94A3B8]" />
                    </dd>
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => navigate("/admin/website/performance?tab=resources")}
                  className="w-full flex items-center justify-between py-2 text-left hover:bg-[#F8FAFC] px-1 rounded transition-colors cursor-pointer"
                >
                  <dt className="text-[12px] font-medium text-[#4A5A73]">Average page weight</dt>
                  <dd className="inline-flex items-center gap-2 text-[11px]">
                    <span className={cn("font-bold bg-[#F1F5F9] px-1.5 py-0.5 rounded", performance.data.avgPageWeightKb != null && performance.data.avgPageWeightKb <= 1536 ? "text-[#15803D]" : "text-[#B45309]")}>
                      {performance.data.avgPageWeightKb == null ? "—" : formatWeight(performance.data.avgPageWeightKb)}
                    </span>
                    <span className="font-bold text-[#15803D] bg-[#F0FDF4] px-1.5 py-0.5 rounded border border-[#DCFCE7]">
                      &lt; 1.5 MB
                    </span>
                    <ArrowRight className="size-3 text-[#94A3B8]" />
                  </dd>
                </button>
                <button
                  type="button"
                  onClick={() => navigate("/admin/website/performance?tab=resources")}
                  className="w-full flex items-center justify-between py-2 text-left hover:bg-[#F8FAFC] px-1 rounded transition-colors cursor-pointer"
                >
                  <dt className="text-[12px] font-medium text-[#4A5A73]">Average requests</dt>
                  <dd className="inline-flex items-center gap-2 text-[11px]">
                    <span className={cn("font-bold bg-[#F1F5F9] px-1.5 py-0.5 rounded", performance.data.avgRequests != null && performance.data.avgRequests < 50 ? "text-[#15803D]" : "text-[#B45309]")}>
                      {performance.data.avgRequests ?? "—"}
                    </span>
                    <span className="font-bold text-[#15803D] bg-[#F0FDF4] px-1.5 py-0.5 rounded border border-[#DCFCE7]">
                      &lt; 50
                    </span>
                    <ArrowRight className="size-3 text-[#94A3B8]" />
                  </dd>
                </button>
              </dl>
            ) : null}
          </Card>
        </div>
      </div>

      {/* H + I + J */}
      <div className="grid gap-1 lg:grid-cols-3">
        <Card
          title="Integration status"
          icon={Link2}
          action={<LinkAction onClick={() => navigate("/admin/website/settings?section=integrations")}>Manage all →</LinkAction>}
          bodyClassName="p-0"
        >
          {capabilities.isLoading ? (
            <SkeletonBlock lines={4} />
          ) : capabilities.error ? (
            <QueryErrorState error={capabilities.error} onRetry={() => void capabilities.refetch()} compact />
          ) : capabilities.data ? (
            <ul className="flex flex-col gap-1.5 p-2">
              {INTEGRATION_ORDER.map((key) => {
                const integration = capabilities.data.integrations[key];
                const tone = integrationTone(integration.status);
                const connected = tone === "good";
                const targetHref =
                  key === "ga4" && connected
                    ? "/admin/website/analytics"
                    : key === "searchConsole" && connected
                      ? "/admin/website/seo?tab=search"
                      : null;
                return (
                  <li
                    key={key}
                    onClick={() => {
                      if (targetHref) {
                        navigate(targetHref);
                      } else {
                        openIntegration(key);
                      }
                    }}
                    className="flex items-center justify-between gap-2 rounded-xl border border-[#E6EBF4] bg-white px-2.5 py-1.5 shadow-sm transition-all hover:border-[#C9D6EA] hover:shadow-md cursor-pointer"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <p className="truncate text-[11.5px] font-bold text-[#0F172A]">{integration.name}</p>
                        <Chip tone={tone === "good" ? "good" : tone === "warn" ? "warn" : "muted"} dot className="shrink-0">
                          {integrationStatusLabel(integration.status)}
                        </Chip>
                      </div>
                      <p className="mt-0.5 truncate text-[10.5px] leading-tight text-[#64748B]">{integration.detail}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                      {targetHref ? (
                        <WButton size="sm" onClick={() => navigate(targetHref)}>
                          View data
                        </WButton>
                      ) : null}
                      <WButton size="sm" tone={connected ? undefined : "primary"} onClick={() => openIntegration(key)}>
                        {connected ? "Manage" : "Connect"}
                      </WButton>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : null}
        </Card>

        <Card
          title="Detected technologies"
          subtitle="Inferred from public responses — treated as likely, not certain"
          icon={Boxes}
          action={<LinkAction onClick={() => navigate("/admin/website/pages")}>View in pages →</LinkAction>}
        >
          {technologies.isLoading ? (
            <SkeletonBlock lines={4} />
          ) : technologies.error ? (
            <QueryErrorState error={technologies.error} onRetry={() => void technologies.refetch()} compact />
          ) : (technologies.data?.length ?? 0) === 0 ? (
            <EmptyState title="Nothing detected" body="The last crawl did not identify any known technology." compact />
          ) : (
            <ul className="flex flex-wrap gap-1.5 p-2">
              {(technologies.data ?? []).map((tech) => (
                <li key={tech.name}>
                  <button
                    type="button"
                    onClick={() => navigate("/admin/website/pages")}
                    title={`${tech.category} · ${tech.confidence} confidence · Click to view pages`}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-2 py-1 text-[10.5px] font-bold text-[#334155] shadow-sm transition-all hover:bg-white hover:border-[#C9D6EA] hover:shadow-md cursor-pointer"
                  >
                    {tech.name}
                    <span className="ml-1 flex items-center gap-1 rounded bg-white px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[#64748B] ring-1 ring-inset ring-[#E2E8F0]">
                      <span
                        className={cn(
                          "size-1.5 rounded-full",
                          tech.confidence === "high"
                            ? "bg-[#10B981]"
                            : tech.confidence === "medium"
                              ? "bg-[#F59E0B]"
                              : "bg-[#94A3B8]",
                        )}
                        aria-hidden
                      />
                      {tech.confidence}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card
          title="Recent scans"
          icon={Timer}
          action={<LinkAction onClick={() => navigate("/admin/website/settings?section=crawling")}>Crawl settings →</LinkAction>}
          bodyClassName="p-0"
        >
          {scans.isLoading ? (
            <SkeletonTable rows={4} />
          ) : scans.error ? (
            <QueryErrorState error={scans.error} onRetry={() => void scans.refetch()} compact />
          ) : (scans.data?.length ?? 0) === 0 ? (
            <EmptyState
              title="No scans yet"
              body="Run the first scan to populate this website's history."
              compact
              actions={
                <WButton tone="primary" icon={RefreshCw} onClick={() => runScan("full-crawl")}>
                  Scan now
                </WButton>
              }
            />
          ) : (
            <ul className="flex flex-col gap-1.5 p-2 scrollbar-thin max-h-[240px] overflow-y-auto">
              {(scans.data ?? []).slice(0, 4).map((record) => (
                <li
                  key={record.id}
                  onClick={() => navigate("/admin/website/pages")}
                  className="flex flex-col gap-1 rounded-xl border border-[#E6EBF4] bg-white px-2.5 py-1.5 shadow-sm transition-all hover:border-[#C9D6EA] hover:shadow-md cursor-pointer"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-[11.5px] font-bold text-[#0F172A]">
                      {scanTypeLabel[record.type]}
                    </p>
                    <Chip
                      tone={scanStatusTone(record.status) === "muted" ? "info" : scanStatusTone(record.status)}
                      dot
                    >
                      {scanStatusLabel(record.status)}
                    </Chip>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <span className="inline-flex items-center rounded bg-[#F1F5F9] px-1.5 py-0.5 text-[10px] font-medium text-[#475569]">
                      {formatRelative(record.startedAt)}
                    </span>
                    <span className="inline-flex items-center rounded bg-[#F1F5F9] px-1.5 py-0.5 text-[10px] font-medium text-[#475569]">
                      {formatDuration(record.durationSeconds)}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate("/admin/website/pages");
                      }}
                      className="inline-flex items-center rounded bg-[#EFF6FF] text-[#1D4ED8] hover:bg-[#DBEAFE] px-1.5 py-0.5 text-[10px] font-semibold transition-colors cursor-pointer"
                    >
                      {record.pagesScanned} pages →
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate("/admin/website/issues");
                      }}
                      className="inline-flex items-center rounded bg-[#FEF2F2] text-[#B91C1C] hover:bg-[#FEE2E2] px-1.5 py-0.5 text-[10px] font-semibold transition-colors cursor-pointer"
                    >
                      {record.issuesFound} issues →
                    </button>
                  </div>
                  {record.note ? <p className="mt-0.5 text-[10.5px] font-medium text-[#B45309] bg-[#FEF3C7] px-2 py-1 rounded-md">{record.note}</p> : null}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Pieces                                                              */
/* ------------------------------------------------------------------ */

function MiniStat({
  label,
  value,
  best,
  tone,
  onClick,
}: {
  label: string;
  value: number;
  best?: React.ReactNode;
  tone: "good" | "warn" | "bad" | "info";
  onClick?: () => void;
}) {
  const Wrapper = onClick ? "button" : "div";
  return (
    <Wrapper
      {...(onClick ? { type: "button" as const, onClick } : {})}
      className={cn(
        "rounded-xl border border-[#E6EBF4] p-2.5 text-left transition-all",
        onClick &&
        "cursor-pointer hover:-translate-y-0.5 hover:border-[#C9D6EA] hover:shadow-md hover:bg-[#FAFCFF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]/35",
      )}
    >
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-bold uppercase tracking-[0.04em] text-[#6B7A94]">{label}</p>
        {onClick ? <ArrowRight className="size-3 text-[#94A3B8]" /> : null}
      </div>
      <div className="mt-1 flex items-baseline justify-between gap-1 flex-wrap">
        <p className={cn("text-[18px] font-bold tracking-[-0.02em] leading-none", toneText[tone])}>{formatNumber(value)}</p>
        {best !== undefined ? <span className="mx-1 text-[#15803D] font-bold text-[9.5px]">/</span> : null}
        {best !== undefined ? (
          <span className="inline-flex items-center rounded bg-[#F0FDF4] px-1.5 py-0.5 text-[9.5px] font-bold text-[#15803D] ring-1 ring-inset ring-[#BBF7D0]">
            {best}
          </span>
        ) : null}
      </div>
      <Meter value={Math.min(100, value)} tone={tone} className="mt-1.5" label={label} />
    </Wrapper>
  );
}

function AttentionRow({
  issue,
  onOpen,
  onFixGuide,
  onAffected,
  onRescan,
}: {
  issue: IssueRecord;
  onOpen: () => void;
  onFixGuide: () => void;
  onAffected: () => void;
  onRescan: () => void;
}) {
  return (
    <li className="px-3.5 py-2.5 flex flex-col gap-2">
      <div className="flex items-start gap-2">
        <Chip tone={severityTone[issue.severity]} className="mt-0.5 shrink-0" dot>
          {severityLabel[issue.severity]}
        </Chip>
        <div className="min-w-0 flex-1">
          <button
            type="button"
            onClick={onOpen}
            className="cursor-pointer text-left text-[12px] font-semibold text-[#28354C] hover:text-[#1D4ED8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]/35"
          >
            {issue.title}
          </button>
          <p className="mt-0.5 text-[10.5px] text-[#6B7A94]">
            {categoryLabel[issue.category]} · {issue.affectedCount} affected · {formatRelative(issue.detectedAt)}
          </p>
        </div>
      </div>
      <div className="flex flex-nowrap gap-1 overflow-x-auto scrollbar-hide">
        <WButton size="sm" onClick={onOpen}>
          View issue
        </WButton>
        <WButton size="sm" icon={ArrowRight} onClick={onAffected}>
          Affected pages
        </WButton>
        <WButton size="sm" icon={Wrench} onClick={onFixGuide}>
          Fix guide
        </WButton>
        <WButton size="sm" icon={RefreshCw} onClick={onRescan}>
          Re-scan
        </WButton>
      </div>
    </li>
  );
}

const problemColumns: Column<PageRecord>[] = [
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
  {
    key: "status",
    header: "HTTP",
    align: "center",
    cell: (page) => <Chip tone={httpStatusTone(page.httpStatus)}>{page.httpStatus}</Chip>,
  },
  {
    key: "seo",
    header: "SEO",
    align: "center",
    cell: (page) => <ScoreCell value={page.seoScore} />,
  },
  {
    key: "performance",
    header: "Perf",
    align: "center",
    cell: (page) => <ScoreCell value={page.performanceScore} />,
  },
  {
    key: "accessibility",
    header: "A11y",
    align: "center",
    cell: (page) => <ScoreCell value={page.accessibilityScore} />,
  },
  {
    key: "issues",
    header: "Issues",
    align: "center",
    cell: (page) => (
      <span className="inline-flex items-center gap-1">
        <b className="text-[12px] font-semibold text-[#28354C]">{page.issueCount}</b>
        {page.criticalIssueCount > 0 ? <Chip tone="bad">{page.criticalIssueCount} critical</Chip> : null}
      </span>
    ),
  },
];

export function ScoreCell({ value }: { value: number | null }) {
  if (value === null) return <span className="text-[11px] text-[#94A3B8]">—</span>;
  const tone = scoreBand(value);
  return (
    <span className="inline-flex flex-col items-center gap-1">
      <b className={cn("text-[12px] font-semibold", tone === "good" ? "text-[#0B7A55]" : tone === "warn" ? "text-[#9A5B08]" : "text-[#C0261F]")}>
        {value}
      </b>
      <Meter value={value} tone={tone} className="w-10" label={`Score ${value}`} />
    </span>
  );
}

