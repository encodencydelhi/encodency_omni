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
import { INTEGRATION_ORDER, integrationStatusLabel, integrationTone } from "../../data/capability-provider";
import type { IssueRecord, PageRecord, Severity } from "../../data/types";
import {
  Card,
  Chip,
  DataTable,
  KeyValue,
  LinkAction,
  Meter,
  ScoreDial,
  SegmentedControl,
  StatTile,
  WButton,
  type Column,
} from "../ui/kit";
import { AXIS_PROPS, ChartLegend, GRID_PROPS, makeTooltip, SERIES_COLORS } from "../ui/charts";
import { EmptyState, QueryErrorState, SkeletonBlock, SkeletonChart, SkeletonStats, SkeletonTable } from "../ui/states";
import { useWebsiteWorkspace } from "../website-workspace";
import { useUrlState } from "../use-url-state";

const TREND_SERIES = [
  { key: "health", label: "Website health", color: SERIES_COLORS[0] },
  { key: "seo", label: "SEO", color: SERIES_COLORS[1] },
  { key: "performance", label: "Performance", color: SERIES_COLORS[2] },
  { key: "uptime", label: "Uptime", color: SERIES_COLORS[3] },
];

const SEVERITY_ORDER: Severity[] = ["critical", "high", "medium", "low"];

export function WebsiteOverviewPage() {
  const router = useRouter();
  const { clientId, domain, websiteUrl, runScan, openExport, openIssue, openFixGuide, openIntegration, navigate, scan } =
    useWebsiteWorkspace();

  const summary = useWebsiteSummary(clientId);
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
            <Card title="OmniPlatform website scores" icon={Gauge}>
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
                  <p className="truncate text-[14px] font-semibold text-[#111C3A]">{domain}</p>
                  <a
                    href={websiteUrl ?? "#"}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="inline-flex items-center gap-1 truncate rounded text-[11px] text-[#2563EB] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]/35"
                  >
                    {websiteUrl}
                    <ExternalLink className="size-3" aria-hidden />
                  </a>
                </div>
              </div>

              <dl className="mt-2 divide-y divide-[#F2F5FA] border-t border-[#F1F4F9] pt-1">
                <KeyValue label="Live status" className="py-1">
                  <Chip tone={summary.data.target.status === "live" ? "good" : summary.data.target.status === "degraded" ? "warn" : "bad"} dot>
                    {summary.data.target.status === "live"
                      ? "Live"
                      : summary.data.target.status === "degraded"
                        ? "Degraded"
                        : summary.data.target.status === "down"
                          ? "Down"
                          : "Unknown"}
                  </Chip>
                </KeyValue>
                <KeyValue label="HTTPS" className="py-1">
                  <Chip tone={summary.data.target.https ? "good" : "bad"} icon={Lock}>
                    {summary.data.target.https ? "Valid certificate" : "Not secure"}
                  </Chip>
                </KeyValue>
                <KeyValue label="Ownership" className="py-1">
                  <Chip tone={summary.data.target.verified ? "good" : "muted"}>
                    {summary.data.target.verified ? "Verified" : "Not verified"}
                  </Chip>
                </KeyValue>
                <KeyValue label="Last scanned" className="py-1">{formatRelative(summary.data.target.lastScannedAt)}</KeyValue>
                <KeyValue label="Next scan" className="py-1">{formatRelative(summary.data.target.nextScanAt)}</KeyValue>
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
              title="OmniPlatform website scores"
              subtitle="Our own composite measures — not Google Lighthouse or PageSpeed scores"
              icon={Gauge}
              bodyClassName="p-4 flex flex-col justify-center"
            >
              <div className="grid grid-cols-[1.1fr_1fr] items-stretch gap-3 h-full">
                <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-[#E6EBF4] bg-gradient-to-br from-[#FAFCFF] to-[#F1F5F9] p-4 shadow-sm h-full">
                  <ScoreDial
                    value={summary.data.scores.health}
                    tone={scoreBand(summary.data.scores.health)}
                    size={76}
                    label={`OmniPlatform Website Health ${summary.data.scores.health}`}
                  />
                  <div className="flex flex-col items-center text-center">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[#64748B] mb-0.5">
                      Overall Health
                    </p>
                    <p className="text-[14px] font-bold text-[#0F172A] leading-none mb-1.5">
                      {scoreLabel(summary.data.scores.health)}
                    </p>
                    <span className="inline-flex items-center justify-center rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-[#475569] shadow-sm ring-1 ring-inset ring-[#E2E8F0]">
                      {summary.data.scoreDeltas.health >= 0 ? "+" : ""}
                      {summary.data.scoreDeltas.health} vs previous
                    </span>
                  </div>
                </div>

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
                      className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-[#E6EBF4] bg-white p-2 text-center shadow-sm transition-all hover:-translate-y-0.5 hover:border-[#C9D6EA] hover:shadow-md hover:bg-[#FAFCFF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]/35 h-full"
                    >
                      <ScoreDial
                        value={score.value}
                        tone={scoreBand(score.value)}
                        size={54}
                        label={`OmniPlatform ${score.label} score ${score.value}`}
                      />
                      <span className="w-full text-center text-[10.5px] font-bold tracking-tight text-[#475569] truncate">
                        {score.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </Card>

            {/* KPI band */}
            <div className="grid grid-cols-2 gap-1">
              <StatTile
                label="Uptime · 30 days"
                value={`${summary.data.uptimePct.toFixed(2)}%`}
                sub="3 regions"
                icon={Wifi}
                tone={summary.data.uptimePct >= 99.9 ? "good" : "warn"}
                onClick={() => navigate("/admin/website/monitoring")}
              />
              <StatTile
                label="Pages"
                value={formatNumber(summary.data.pagesDiscovered)}
                sub={`${(pages.data ?? []).filter((page) => page.indexable).length} indexable`}
                icon={FileStack}
                tone="info"
                onClick={() => navigate("/admin/website/pages")}
              />
              <StatTile
                label="Critical"
                value={formatNumber(summary.data.criticalIssues)}
                sub="Fix first"
                icon={AlertOctagon}
                tone={summary.data.criticalIssues > 0 ? "bad" : "good"}
                onClick={() => navigate("/admin/website/issues?severity=critical")}
              />
              <StatTile
                label="Open issues"
                value={formatNumber(summary.data.openIssues)}
                sub={`${bySeverity.high} high · ${bySeverity.medium} med`}
                icon={TriangleAlert}
                tone={summary.data.openIssues > 12 ? "warn" : "info"}
                onClick={() => navigate("/admin/website/issues")}
              />
            </div>
          </>
        ) : null}
      </div>

      {/* D + C — trend and needs attention */}
      <div className="grid gap-1 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Card
          title="Website health trend"
          subtitle="OmniPlatform composite scores over time"
          icon={History}
          action={
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
                          (entry) => (entry.dataKey === "uptime" ? `${entry.value.toFixed(2)}%` : entry.value),
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
                <MiniStat label="Healthy pages" value={seo.data.overview.healthyPages} tone="good" />
                <MiniStat label="Warnings" value={seo.data.overview.warningPages} tone="warn" />
                <MiniStat label="Critical" value={seo.data.overview.criticalPages} tone="bad" />
                <MiniStat label="Passed checks" value={seo.data.overview.passedChecks} tone="info" />
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
                  <KeyValue key={vital.key} label={vital.label}>
                    <span className="inline-flex items-center gap-1.5">
                      {vital.display}
                      <Chip tone={vitalTone[vital.band]}>{vital.band === "good" ? "Good" : vital.band === "poor" ? "Poor" : "Needs work"}</Chip>
                    </span>
                  </KeyValue>
                ))}
                <KeyValue label="Average page weight">{formatWeight(performance.data.avgPageWeightKb)}</KeyValue>
                <KeyValue label="Average requests">{performance.data.avgRequests}</KeyValue>
              </dl>
            ) : null}
          </Card>
        </div>
      </div>

      {/* H + I + J */}
      <div className="grid gap-1 lg:grid-cols-3">
        <Card title="Integration status" icon={Link2} bodyClassName="p-0">
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
                return (
                  <li key={key} className="flex items-center justify-between gap-2 rounded-xl border border-[#E6EBF4] bg-white px-2.5 py-1.5 shadow-sm transition-all hover:border-[#C9D6EA] hover:shadow-md">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <p className="truncate text-[11.5px] font-bold text-[#0F172A]">{integration.name}</p>
                        <Chip tone={tone === "good" ? "good" : tone === "warn" ? "warn" : "muted"} dot className="shrink-0">
                          {integrationStatusLabel(integration.status)}
                        </Chip>
                      </div>
                      <p className="mt-0.5 truncate text-[10.5px] leading-tight text-[#64748B]">{integration.detail}</p>
                    </div>
                    <WButton size="sm" tone={connected ? undefined : "primary"} onClick={() => openIntegration(key)} className="shrink-0">
                      {connected ? "Manage" : "Connect"}
                    </WButton>
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
                  <span
                    title={`${tech.category} · ${tech.confidence} confidence · ${tech.evidence}`}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-2 py-1 text-[10.5px] font-bold text-[#334155] shadow-sm transition-all hover:bg-white hover:shadow-md"
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
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Recent scans" icon={Timer} bodyClassName="p-0">
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
                <li key={record.id} className="flex flex-col gap-1 rounded-xl border border-[#E6EBF4] bg-white px-2.5 py-1.5 shadow-sm transition-all hover:border-[#C9D6EA] hover:shadow-md">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-[11.5px] font-bold text-[#0F172A]">
                      {scanTypeLabel[record.type]}
                    </p>
                    <Chip
                      tone={
                        record.status === "completed"
                          ? "good"
                          : record.status === "partial"
                            ? "warn"
                            : record.status === "failed"
                              ? "bad"
                              : "info"
                      }
                      dot
                    >
                      {record.status}
                    </Chip>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <span className="inline-flex items-center rounded bg-[#F1F5F9] px-1.5 py-0.5 text-[10px] font-medium text-[#475569]">
                      {formatRelative(record.startedAt)}
                    </span>
                    <span className="inline-flex items-center rounded bg-[#F1F5F9] px-1.5 py-0.5 text-[10px] font-medium text-[#475569]">
                      {formatDuration(record.durationSeconds)}
                    </span>
                    <span className="inline-flex items-center rounded bg-[#F1F5F9] px-1.5 py-0.5 text-[10px] font-medium text-[#475569]">
                      {record.pagesScanned} pages
                    </span>
                    <span className="inline-flex items-center rounded bg-[#F1F5F9] px-1.5 py-0.5 text-[10px] font-medium text-[#475569]">
                      {record.issuesFound} issues
                    </span>
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

function MiniStat({ label, value, tone }: { label: string; value: number; tone: "good" | "warn" | "bad" | "info" }) {
  return (
    <div className="rounded-xl border border-[#E6EBF4] p-2.5">
      <p className="text-[10px] font-semibold uppercase tracking-[0.04em] text-[#6B7A94]">{label}</p>
      <p className="mt-0.5 text-[18px] font-semibold tracking-[-0.02em] text-[#111C3A]">{formatNumber(value)}</p>
      <Meter value={Math.min(100, value)} tone={tone} className="mt-1.5" label={label} />
    </div>
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

