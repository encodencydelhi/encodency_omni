"use client";

/**
 * Analytics — verified GA4 reporting dashboard.
 *
 * All visitor metrics originate from Google Analytics 4 API.
 * Values are never estimated or fabricated.
 */

import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Activity,
  ArrowUpRight,
  BarChart3,
  Check,
  Copy,
  ExternalLink,
  Eye,
  Globe2,
  Info,
  Layers,
  Monitor,
  MonitorSmartphone,
  MousePointerClick,
  Percent,
  RefreshCw,
  Smartphone,
  Sparkles,
  Tablet,
  Target,
  Users,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useWebsiteAnalytics, useWebsiteCapabilities } from "../../data/hooks";
import { evaluateFeature } from "../../data/capability-provider";
import {
  formatCompact,
  formatDate,
  formatDuration,
  formatNumber,
  formatRelative,
  formatShortDate,
} from "../../data/selectors";
import type { AnalyticsData, FunnelStage } from "../../data/types";
import { Card, Chip, DataTable, SegmentedControl, StatTile, WButton, type Column } from "../ui/kit";
import { AXIS_PROPS, ChartTooltip, GRID_PROPS, SERIES_COLORS } from "../ui/charts";
import { EmptyState, LockedState, QueryErrorState, SkeletonBlock, SkeletonStats } from "../ui/states";
import { useUrlState } from "../use-url-state";
import { useWebsiteWorkspace } from "../website-workspace";

const PERIODS = [
  { value: "7d" as const, label: "7 days" },
  { value: "28d" as const, label: "28 days" },
  { value: "90d" as const, label: "90 days" },
];

/** Formats bounce rate safely handling fractions (0-1) and percentages (0-100) */
function formatBounceRate(rate: number | null | undefined): string {
  if (rate === null || rate === undefined || isNaN(rate)) return "—";
  const pct = rate > 0 && rate <= 1 ? rate * 100 : rate;
  return `${pct.toFixed(1)}%`;
}

/** Formats average engagement seconds safely into clean 4m 50s or 42s */
function formatAvgEngagement(sec: number | null | undefined): string {
  if (!sec || isNaN(sec)) return "0s";
  return formatDuration(Math.round(sec));
}

/** Copy-to-clipboard button with visual feedback */
function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
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

export function WebsiteAnalyticsPage() {
  const { clientId, openIntegration } = useWebsiteWorkspace();
  const [period, setPeriod] = useUrlState<"7d" | "28d" | "90d">("period", "28d", ["7d", "28d", "90d"]);
  const analytics = useWebsiteAnalytics(clientId, period);
  const capabilities = useWebsiteCapabilities(clientId);

  // Toggleable chart series
  const [seriesVisibility, setSeriesVisibility] = useState<{
    users: boolean;
    sessions: boolean;
    views: boolean;
  }>({
    users: true,
    sessions: true,
    views: true,
  });

  const toggleSeries = (key: "users" | "sessions" | "views") => {
    setSeriesVisibility((prev) => {
      const activeCount = Object.values(prev).filter(Boolean).length;
      if (activeCount === 1 && prev[key]) return prev; // keep at least one series visible
      return { ...prev, [key]: !prev[key] };
    });
  };

  const ga4 = evaluateFeature(capabilities.data, "audience-analytics");

  // Sorted trend ensuring strict chronological order
  const sortedTrend = useMemo(() => {
    if (!analytics.data?.trend) return [];
    return [...analytics.data.trend].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [analytics.data?.trend]);

  if (analytics.isLoading || capabilities.isLoading) {
    return (
      <div className="space-y-2">
        <SkeletonStats count={6} />
        <SkeletonBlock lines={10} />
      </div>
    );
  }

  if (analytics.error) {
    return (
      <Card title="Google Analytics">
        <QueryErrorState error={analytics.error} onRetry={() => void analytics.refetch()} />
      </Card>
    );
  }

  if (!ga4.available || !analytics.data) {
    return (
      <AnalyticsLocked
        integration={capabilities.data?.integrations.ga4}
        onConnect={() => openIntegration("ga4")}
      />
    );
  }

  const data = analytics.data;
  const ga4Integration = capabilities.data?.integrations.ga4;

  // Real KPI calculations with real GA4 data fallbacks
  const totalUsers =
    data.kpis.find((k) => k.key === "users")?.raw ??
    sortedTrend.reduce((sum, p) => sum + (p.users || 0), 0);
  const totalSessions =
    data.kpis.find((k) => k.key === "sessions")?.raw ??
    sortedTrend.reduce((sum, p) => sum + (p.sessions || 0), 0);
  const totalViews =
    data.kpis.find((k) => k.key === "views")?.raw ??
    sortedTrend.reduce((sum, p) => sum + (p.views || 0), 0);

  // Engaged sessions: from KPI, trend engagedSessions, or funnel
  const engagedSessionsKpi = data.kpis.find(
    (k) => k.key === "engaged-sessions" || k.key === "engagedSessions",
  );
  const trendEngagedSessions = sortedTrend.reduce(
    (sum, p) => sum + (Number((p as { engagedSessions?: number }).engagedSessions) || 0),
    0,
  );
  const funnelEngaged = data.funnel.find(
    (f) => f.key === "engagedSessions" || f.key === "engaged-sessions",
  )?.value;
  const totalEngagedSessions =
    engagedSessionsKpi?.raw ??
    (trendEngagedSessions > 0
      ? trendEngagedSessions
      : funnelEngaged !== null && funnelEngaged !== undefined
        ? funnelEngaged
        : null);

  // Engagement rate: from KPI, or calculated (engaged / sessions * 100)
  const engagementRateKpi = data.kpis.find(
    (k) => k.key === "engagement-rate" || k.key === "engagementRate",
  );
  const calculatedEngagementRate =
    totalSessions > 0 && totalEngagedSessions !== null
      ? (totalEngagedSessions / totalSessions) * 100
      : null;
  const engagementRate =
    engagementRateKpi?.raw !== undefined ? engagementRateKpi.raw : calculatedEngagementRate;

  // Key events / Conversions: from KPI or conversions sum
  const conversionsKpi = data.kpis.find(
    (k) => k.key === "conversions" || k.key === "key-events" || k.key === "events",
  );
  const conversionsSum = data.conversions?.reduce((sum, c) => sum + (c.count || 0), 0);
  const funnelConversions = data.funnel.find((f) => f.key === "conversions")?.value;
  const totalKeyEvents =
    conversionsKpi?.raw ?? (conversionsSum > 0 ? conversionsSum : (funnelConversions ?? 0));

  // Period comparisons (deltas): ONLY show real deltas from backend, never fake deltas!
  const usersDelta = data.kpis.find((k) => k.key === "users")?.delta ?? undefined;
  const sessionsDelta = data.kpis.find((k) => k.key === "sessions")?.delta ?? undefined;
  const viewsDelta = data.kpis.find((k) => k.key === "views")?.delta ?? undefined;
  const engagedDelta = engagedSessionsKpi?.delta ?? undefined;
  const engagementRateDelta = engagementRateKpi?.delta ?? undefined;
  const keyEventsDelta = conversionsKpi?.delta ?? undefined;

  // Sync timestamp
  const lastSyncText = ga4Integration?.lastSyncAt
    ? `Synced ${formatRelative(ga4Integration.lastSyncAt)}`
    : "Refreshed every 4 hours";

  return (
    <div className="space-y-2">
      {/* A. Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 rounded-xl border border-[#E6EBF4] bg-white px-3.5 py-2.5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
        <div className="flex flex-wrap items-center gap-2.5">
          <Chip tone="good" dot className="font-medium">
            Google Analytics connected
          </Chip>
          <div className="flex items-center gap-1.5 text-[11.5px] text-[#6B7A94]">
            <span className="inline-block size-1 rounded-full bg-[#CBD5E1]" aria-hidden />
            <span>GA4 Reporting API</span>
            <span className="inline-block size-1 rounded-full bg-[#CBD5E1]" aria-hidden />
            <span className="font-medium text-[#4A5A73]">{lastSyncText}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <SegmentedControl
            ariaLabel="Reporting period"
            value={period}
            onChange={setPeriod}
            options={PERIODS}
          />
          <WButton size="sm" onClick={() => openIntegration("ga4")}>
            Manage
          </WButton>
        </div>
      </div>

      {/* B. Verified KPI Cards (6 metrics) */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
        <StatTile
          label="Total Users"
          value={formatNumber(totalUsers)}
          delta={usersDelta}
          tone="info"
          icon={Users}
          sub={usersDelta !== undefined ? `vs previous ${period}` : "Active visitors"}
        />
        <StatTile
          label="Sessions"
          value={formatNumber(totalSessions)}
          delta={sessionsDelta}
          tone="good"
          icon={Activity}
          sub={sessionsDelta !== undefined ? `vs previous ${period}` : "Total visits"}
        />
        <StatTile
          label="Views"
          value={formatNumber(totalViews)}
          delta={viewsDelta}
          tone="violet"
          icon={Layers}
          sub={viewsDelta !== undefined ? `vs previous ${period}` : "Page & screen views"}
        />
        <StatTile
          label="Engaged Sessions"
          value={totalEngagedSessions !== null ? formatNumber(totalEngagedSessions) : "—"}
          delta={engagedDelta}
          tone="info"
          icon={MousePointerClick}
          sub={engagedDelta !== undefined ? `vs previous ${period}` : "Sessions > 10s or 2+ views"}
        />
        <StatTile
          label="Engagement Rate"
          value={engagementRate !== null ? `${engagementRate.toFixed(1)}%` : "—"}
          delta={engagementRateDelta}
          tone="good"
          icon={Target}
          sub={engagementRateDelta !== undefined ? `vs previous ${period}` : "Engaged / total sessions"}
        />
        <StatTile
          label="Key Events"
          value={formatNumber(totalKeyEvents)}
          delta={keyEventsDelta}
          tone="warn"
          icon={Zap}
          sub={keyEventsDelta !== undefined ? `vs previous ${period}` : "Recorded conversions"}
        />
      </div>

      {/* C & D. Traffic Trends Chart + Engagement & Key Events Panel */}
      <div className="grid gap-2 xl:grid-cols-12">
        {/* Traffic Trends */}
        <Card
          title="Traffic Trends"
          icon={Activity}
          subtitle="Chronological daily visitors, sessions, and pageviews"
          className="xl:col-span-8"
          bodyClassName="p-3.5 pt-2"
          action={
            <div className="flex flex-wrap items-center gap-1.5" role="toolbar" aria-label="Toggle series">
              <button
                type="button"
                onClick={() => toggleSeries("users")}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-medium transition-all",
                  seriesVisibility.users
                    ? "bg-[#EFF6FF] text-[#1D4ED8] ring-1 ring-inset ring-[#BFDBFE]"
                    : "bg-white text-[#94A3B8] hover:bg-[#F8FAFC]",
                )}
                title="Toggle Users series"
              >
                <span
                  className="size-2 rounded-full"
                  style={{ backgroundColor: seriesVisibility.users ? SERIES_COLORS[0] : "#CBD5E1" }}
                  aria-hidden
                />
                <span>Users</span>
                <span className="font-semibold text-[#1E293B]">{formatCompact(totalUsers)}</span>
              </button>

              <button
                type="button"
                onClick={() => toggleSeries("sessions")}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-medium transition-all",
                  seriesVisibility.sessions
                    ? "bg-[#ECFDF5] text-[#047857] ring-1 ring-inset ring-[#A7F3D0]"
                    : "bg-white text-[#94A3B8] hover:bg-[#F8FAFC]",
                )}
                title="Toggle Sessions series"
              >
                <span
                  className="size-2 rounded-full"
                  style={{ backgroundColor: seriesVisibility.sessions ? SERIES_COLORS[1] : "#CBD5E1" }}
                  aria-hidden
                />
                <span>Sessions</span>
                <span className="font-semibold text-[#1E293B]">{formatCompact(totalSessions)}</span>
              </button>

              <button
                type="button"
                onClick={() => toggleSeries("views")}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-medium transition-all",
                  seriesVisibility.views
                    ? "bg-[#F5F3FF] text-[#6D28D9] ring-1 ring-inset ring-[#DDD6FE]"
                    : "bg-white text-[#94A3B8] hover:bg-[#F8FAFC]",
                )}
                title="Toggle Views series"
              >
                <span
                  className="size-2 rounded-full"
                  style={{ backgroundColor: seriesVisibility.views ? SERIES_COLORS[3] : "#CBD5E1" }}
                  aria-hidden
                />
                <span>Views</span>
                <span className="font-semibold text-[#1E293B]">{formatCompact(totalViews)}</span>
              </button>
            </div>
          }
        >
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={sortedTrend} margin={{ top: 8, right: 12, left: -18, bottom: 0 }}>
                <defs>
                  <linearGradient id="ga4-grad-users" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={SERIES_COLORS[0]} stopOpacity={0.22} />
                    <stop offset="100%" stopColor={SERIES_COLORS[0]} stopOpacity={0.01} />
                  </linearGradient>
                  <linearGradient id="ga4-grad-sessions" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={SERIES_COLORS[1]} stopOpacity={0.22} />
                    <stop offset="100%" stopColor={SERIES_COLORS[1]} stopOpacity={0.01} />
                  </linearGradient>
                  <linearGradient id="ga4-grad-views" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={SERIES_COLORS[3]} stopOpacity={0.22} />
                    <stop offset="100%" stopColor={SERIES_COLORS[3]} stopOpacity={0.01} />
                  </linearGradient>
                </defs>
                <CartesianGrid {...GRID_PROPS} />
                <XAxis
                  dataKey="date"
                  {...AXIS_PROPS}
                  tickFormatter={formatShortDate}
                  minTickGap={32}
                />
                <YAxis
                  {...AXIS_PROPS}
                  width={44}
                  tickFormatter={(val: number) => formatCompact(val)}
                />
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
                {seriesVisibility.views ? (
                  <Area
                    type="monotone"
                    dataKey="views"
                    name="Views"
                    stroke={SERIES_COLORS[3]}
                    strokeWidth={2}
                    fill="url(#ga4-grad-views)"
                  />
                ) : null}
                {seriesVisibility.sessions ? (
                  <Area
                    type="monotone"
                    dataKey="sessions"
                    name="Sessions"
                    stroke={SERIES_COLORS[1]}
                    strokeWidth={2}
                    fill="url(#ga4-grad-sessions)"
                  />
                ) : null}
                {seriesVisibility.users ? (
                  <Area
                    type="monotone"
                    dataKey="users"
                    name="Users"
                    stroke={SERIES_COLORS[0]}
                    strokeWidth={2}
                    fill="url(#ga4-grad-users)"
                  />
                ) : null}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* D. Engagement & Key Events Panel */}
        <Card
          title="Engagement & Key Events"
          icon={Target}
          subtitle="Session engagement and verified event actions"
          className="xl:col-span-4"
          bodyClassName="p-3.5 space-y-3"
        >
          {/* Section 1: Session to Engaged Sessions Ratio */}
          <div className="rounded-xl border border-[#E6EBF4] bg-[#F8FAFC] p-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[#6B7A94]">
                Session Engagement
              </span>
              <span className="text-[12px] font-bold text-[#111C3A]">
                {engagementRate !== null ? `${engagementRate.toFixed(1)}%` : "—"}
              </span>
            </div>

            {/* Proportional visual bar */}
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-[#E2E8F0]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#2563EB] to-[#12A06D] transition-[width]"
                style={{ width: `${Math.min(100, Math.max(0, engagementRate ?? 0))}%` }}
              />
            </div>

            <div className="mt-2.5 flex items-center justify-between text-[11px]">
              <div>
                <p className="text-[10px] text-[#6B7A94]">Engaged Sessions</p>
                <p className="font-semibold text-[#111C3A]">
                  {totalEngagedSessions !== null ? formatNumber(totalEngagedSessions) : "—"}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-[#6B7A94]">Total Sessions</p>
                <p className="font-semibold text-[#111C3A]">{formatNumber(totalSessions)}</p>
              </div>
            </div>
            <p className="mt-2 text-[10px] leading-tight text-[#94A3B8]">
              GA4 defines engaged sessions as lasting 10+ seconds, viewing 2+ pages, or completing a key event.
            </p>
          </div>

          {/* Section 2: Key Events Breakdown */}
          <div className="rounded-xl border border-[#E6EBF4] bg-white p-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[#6B7A94]">
                  Key Events
                </span>
                <p className="text-[10px] text-[#94A3B8]">Recorded event counts (not unique sessions)</p>
              </div>
              <span className="text-[14px] font-bold text-[#111C3A]">{formatNumber(totalKeyEvents)}</span>
            </div>

            {data.conversions && data.conversions.length > 0 ? (
              <ul className="mt-2.5 divide-y divide-[#F1F5F9]">
                {data.conversions.slice(0, 4).map((conv) => (
                  <li key={conv.name} className="flex items-center justify-between py-1.5 text-[11px]">
                    <span className="truncate pr-2 font-medium text-[#28354C]">{conv.name}</span>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="font-semibold text-[#111C3A]">{formatNumber(conv.count)}</span>
                      {conv.delta !== null && conv.delta !== undefined ? (
                        <span
                          className={cn(
                            "text-[10px] font-semibold",
                            conv.delta >= 0 ? "text-[#0B7A55]" : "text-[#C0261F]",
                          )}
                        >
                          {conv.delta >= 0 ? "▲" : "▼"} {Math.abs(conv.delta)}%
                        </span>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-[11px] text-[#6B7A94]">No individual key events configured in GA4.</p>
            )}
          </div>

          {/* Section 3: Behaviour / Omni stages if present */}
          {data.funnel.some((s) => !s.available) ? (
            <div className="rounded-lg border border-dashed border-[#DAE1EC] bg-[#FAFBFD] p-2.5">
              <div className="flex items-start gap-2">
                <Info className="mt-0.5 size-3.5 shrink-0 text-[#6B7A94]" aria-hidden />
                <p className="text-[10.5px] leading-relaxed text-[#6B7A94]">
                  Granular behaviour funnels (CTA clicks, form starts) require Encodency Omni Tracking script on the site.
                </p>
              </div>
            </div>
          ) : null}
        </Card>
      </div>

      {/* E, F, G. Acquisition + Devices & Retention + Geography */}
      <div className="grid gap-2 lg:grid-cols-3">
        {/* E. Traffic Acquisition */}
        <Card
          title="Traffic Acquisition"
          icon={Layers}
          subtitle="Sessions by default channel group"
          bodyClassName="p-0"
        >
          <div className="divide-y divide-[#F1F5F9]">
            {data.acquisition.map((item) => {
              const share = totalSessions > 0 ? Math.round((item.sessions / totalSessions) * 100) : 0;
              return (
                <div key={item.channel} className="flex items-center gap-3 px-3.5 py-2.5 transition-colors hover:bg-[#F8FAFC]">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between text-[11.5px]">
                      <span className="truncate font-semibold text-[#28354C]">{item.channel}</span>
                      <span className="font-mono text-[11px] font-semibold text-[#111C3A]">
                        {formatNumber(item.sessions)}{" "}
                        <span className="font-sans font-normal text-[#6B7A94]">({share}%)</span>
                      </span>
                    </div>
                    {/* Share Bar */}
                    <div className="mt-1.5 flex items-center gap-2">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#EDF1F7]">
                        <div
                          className="h-full rounded-full bg-[#2563EB]"
                          style={{ width: `${Math.min(100, Math.max(2, share))}%` }}
                        />
                      </div>
                      {item.engagementRate ? (
                        <span className="shrink-0 text-[10px] text-[#6B7A94]">
                          {item.engagementRate.toFixed(1)}% eng.
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* F. Devices & Retention */}
        <Card
          title="Devices & Retention"
          icon={MonitorSmartphone}
          subtitle="Platform breakdown and user return rate"
          bodyClassName="p-3.5 space-y-3.5"
        >
          {/* Devices Breakdown */}
          <div>
            <p className="mb-2 text-[10.5px] font-bold uppercase tracking-[0.05em] text-[#6B7A94]">
              Hardware Platform
            </p>
            <div className="space-y-2">
              {data.devices.map((dev) => {
                const IconComponent =
                  dev.device.toLowerCase() === "desktop"
                    ? Monitor
                    : dev.device.toLowerCase() === "tablet"
                      ? Tablet
                      : Smartphone;
                return (
                  <div key={dev.device} className="flex items-center gap-2.5">
                    <span className="grid size-6 shrink-0 place-items-center rounded bg-[#EFF4FC] text-[#2563EB]">
                      <IconComponent className="size-3.5" aria-hidden />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-medium text-[#28354C]">{dev.device}</span>
                        <span className="font-semibold text-[#111C3A]">
                          {dev.share.toFixed(0)}%{" "}
                          <span className="font-normal text-[#6B7A94]">({formatNumber(dev.users)})</span>
                        </span>
                      </div>
                      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-[#EDF1F7]">
                        <div
                          className="h-full rounded-full bg-[#2563EB]"
                          style={{ width: `${Math.min(100, Math.max(2, dev.share))}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* New vs Returning (Cleanly separated) */}
          <div className="border-t border-[#F1F5F9] pt-3">
            <p className="mb-2 text-[10.5px] font-bold uppercase tracking-[0.05em] text-[#6B7A94]">
              Audience Type (New vs. Returning)
            </p>
            <div className="grid grid-cols-2 gap-2">
              {data.newVsReturning.map((type, idx) => (
                <div
                  key={type.label}
                  className="rounded-lg border border-[#E6EBF4] bg-[#F8FAFC] p-2.5"
                >
                  <p className="text-[10px] font-medium text-[#6B7A94]">{type.label} Visitors</p>
                  <p className="mt-0.5 text-[15px] font-bold text-[#111C3A]">{type.share.toFixed(0)}%</p>
                  <p className="text-[10px] text-[#64748B]">{formatNumber(type.users)} users</p>
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* G. Geography */}
        <Card
          title="Top Geographies"
          icon={Globe2}
          subtitle="Visitor distribution by country"
          bodyClassName="p-0"
        >
          <ul className="divide-y divide-[#F1F5F9]">
            {data.geography.map((row) => (
              <li
                key={row.country}
                className="flex items-center gap-3 px-3.5 py-2 transition-colors hover:bg-[#F8FAFC]"
              >
                <span
                  className="w-28 shrink-0 truncate text-[11.5px] font-medium text-[#28354C]"
                  title={row.country}
                >
                  {row.country}
                </span>
                <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#EDF1F7]">
                  <span
                    className="block h-full rounded-full bg-[#2563EB]"
                    style={{ width: `${Math.min(100, Math.max(2, row.share))}%` }}
                  />
                </span>
                <div className="flex w-24 shrink-0 items-center justify-end gap-1.5 text-right font-mono text-[11px]">
                  <span className="font-semibold text-[#111C3A]">{formatNumber(row.users)}</span>
                  <span className="font-sans text-[10px] text-[#6B7A94]">({row.share.toFixed(0)}%)</span>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      {/* H & I. Top Pages + Landing Pages */}
      <div className="grid gap-2 xl:grid-cols-2">
        {/* Top Pages */}
        <Card
          title="Top Pages"
          icon={BarChart3}
          subtitle="Most viewed pages with readable engagement time"
          bodyClassName="p-0"
        >
          <DataTable
            dense
            columns={topPageColumns}
            rows={data.topPages}
            getRowId={(row) => row.path}
            empty={
              <EmptyState
                title="No page data"
                body="GA4 returned no page rows for this reporting period."
                compact
              />
            }
          />
        </Card>

        {/* Landing Pages */}
        <Card
          title="Landing Pages"
          icon={BarChart3}
          subtitle="Initial session arrival pages and bounce performance"
          bodyClassName="p-0"
        >
          <DataTable
            dense
            columns={landingColumns}
            rows={data.landingPages}
            getRowId={(row) => row.path}
            empty={
              <EmptyState
                title="No landing page data"
                body="GA4 returned no landing pages for this reporting period."
                compact
              />
            }
          />
        </Card>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Locked State                                                        */
/* ------------------------------------------------------------------ */

function AnalyticsLocked({
  integration,
  onConnect,
}: {
  integration?: { property: string | null; status: string; detail: string };
  onConnect: () => void;
}) {
  const unlocks = [
    { icon: Users, label: "Users & sessions", detail: "How many people visit, and how often they return." },
    { icon: Layers, label: "Traffic sources", detail: "Which channels bring visitors — organic, direct, social, paid." },
    { icon: BarChart3, label: "Top & landing pages", detail: "Where visitors arrive and what content they consume." },
    { icon: Target, label: "Key events & goals", detail: "Conversions and event completions tracked in GA4." },
    { icon: MonitorSmartphone, label: "Devices & platforms", detail: "Mobile versus desktop breakdown and performance." },
    { icon: Globe2, label: "Geography", detail: "Countries and territories where your visitors reside." },
  ];

  return (
    <div className="space-y-2">
      <Card title="Google Analytics 4" icon={Activity}>
        <LockedState
          title={integration?.property ? "Google Analytics sync in progress" : "Google Analytics not configured"}
          body={
            integration?.property
              ? `${integration.detail || "The GA4 property is saved."} Visitor metrics appear after the server-side sync completes; traffic is never fabricated.`
              : "Connect your GA4 property to enable verified audience reporting. Numbers are read straight from Google APIs."
          }
          ctaLabel={integration?.property ? "View GA4 configuration" : "Configure Google Analytics"}
          onCta={onConnect}
        />
      </Card>

      <Card title="What connecting GA4 unlocks" icon={Layers}>
        <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {unlocks.map((item) => (
            <li key={item.label} className="flex items-start gap-2.5 rounded-xl border border-[#E6EBF4] bg-white p-3 shadow-[0_1px_2px_rgba(16,24,40,0.02)]">
              <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-[#EAF2FE] text-[#1F5FBF]">
                <item.icon className="size-4" aria-hidden />
              </span>
              <div className="min-w-0">
                <p className="text-[12px] font-semibold text-[#28354C]">{item.label}</p>
                <p className="mt-0.5 text-[11px] leading-relaxed text-[#6B7A94]">{item.detail}</p>
              </div>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Table Column Definitions                                            */
/* ------------------------------------------------------------------ */

const topPageColumns: Column<AnalyticsData["topPages"][number]>[] = [
  {
    key: "path",
    header: "Page",
    primary: true,
    cell: (row) => (
      <div className="flex items-center gap-1.5 min-w-0">
        <span className="truncate font-mono text-[11px] font-medium text-[#28354C]" title={row.path}>
          {row.path}
        </span>
        <CopyButton text={row.path} label="Copy path" />
      </div>
    ),
  },
  {
    key: "views",
    header: "Views",
    align: "right",
    cell: (row) => <span className="font-mono text-[11px]">{formatNumber(row.views)}</span>,
  },
  {
    key: "users",
    header: "Users",
    align: "right",
    cell: (row) => <span className="font-mono text-[11px]">{formatNumber(row.users)}</span>,
  },
  {
    key: "engagement",
    header: "Avg Engagement",
    align: "right",
    cell: (row) => (
      <span className="font-mono text-[11px] font-semibold text-[#111C3A]">
        {formatAvgEngagement(row.avgEngagementSec)}
      </span>
    ),
  },
];

const landingColumns: Column<AnalyticsData["landingPages"][number]>[] = [
  {
    key: "path",
    header: "Landing Page",
    primary: true,
    cell: (row) => (
      <div className="flex items-center gap-1.5 min-w-0">
        <span className="truncate font-mono text-[11px] font-medium text-[#28354C]" title={row.path}>
          {row.path}
        </span>
        <CopyButton text={row.path} label="Copy path" />
      </div>
    ),
  },
  {
    key: "sessions",
    header: "Sessions",
    align: "right",
    cell: (row) => <span className="font-mono text-[11px]">{formatNumber(row.sessions)}</span>,
  },
  {
    key: "bounce",
    header: "Bounce Rate",
    align: "right",
    cell: (row) => {
      const formatted = formatBounceRate(row.bounceRate);
      const isHigh = row.bounceRate > 55 || (row.bounceRate > 0 && row.bounceRate <= 1 && row.bounceRate > 0.55);
      return (
        <span
          className={cn(
            "font-mono text-[11px]",
            isHigh ? "font-bold text-[#9A5B08]" : "text-[#28354C]",
          )}
        >
          {formatted}
        </span>
      );
    },
  },
  {
    key: "conversions",
    header: "Key Events",
    align: "right",
    cell: (row) => (
      <span className="font-mono text-[11px] font-semibold text-[#111C3A]">
        {formatNumber(row.conversions)}
      </span>
    ),
  },
];
