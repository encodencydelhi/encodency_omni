"use client";

/**
 * Analytics — the only screen whose numbers come from outside our own crawl.
 *
 * Without GA4 there is nothing here but the connect state: we will not model,
 * estimate or infer visitor counts. Behaviour stages (CTA clicks, form starts)
 * need Omni Tracking on the website and stay marked unavailable until it is.
 */

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Activity,
  BarChart3,
  Flame,
  Globe2,
  Layers,
  MonitorSmartphone,
  MousePointerClick,
  Target,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useWebsiteAnalytics, useWebsiteCapabilities } from "../../data/hooks";
import { evaluateFeature } from "../../data/capability-provider";
import { formatCompact, formatDate, formatNumber, formatShortDate } from "../../data/selectors";
import type { AnalyticsData, FunnelStage } from "../../data/types";
import { Card, Chip, DataTable, SegmentedControl, StatTile, WButton, type Column } from "../ui/kit";
import { AXIS_PROPS, ChartLegend, GRID_PROPS, makeTooltip, SERIES_COLORS, ShareBar } from "../ui/charts";
import { EmptyState, LockedState, QueryErrorState, SkeletonBlock, SkeletonStats } from "../ui/states";
import { useUrlState } from "../use-url-state";
import { useWebsiteWorkspace } from "../website-workspace";

const PERIODS = [
  { value: "7d" as const, label: "7 days" },
  { value: "28d" as const, label: "28 days" },
  { value: "90d" as const, label: "90 days" },
];

export function WebsiteAnalyticsPage() {
  const { clientId, openIntegration } = useWebsiteWorkspace();
  const [period, setPeriod] = useUrlState<"7d" | "28d" | "90d">("period", "28d", ["7d", "28d", "90d"]);
  const analytics = useWebsiteAnalytics(clientId, period);
  const capabilities = useWebsiteCapabilities(clientId);

  const ga4 = evaluateFeature(capabilities.data, "audience-analytics");
  const behaviour = evaluateFeature(capabilities.data, "behaviour-events");
  const heatmaps = evaluateFeature(capabilities.data, "heatmaps");

  if (analytics.isLoading || capabilities.isLoading) {
    return (
      <div className="space-y-1">
        <SkeletonStats count={4} />
        <SkeletonBlock lines={8} />
      </div>
    );
  }

  if (analytics.error) {
    return (
      <Card title="Analytics">
        <QueryErrorState error={analytics.error} onRetry={() => void analytics.refetch()} />
      </Card>
    );
  }

  if (!ga4.available || !analytics.data) {
    return <AnalyticsLocked onConnect={() => openIntegration("ga4")} />;
  }

  const data = analytics.data;

  return (
    <div className="space-y-1">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#E6EBF4] bg-white px-3 py-2 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
        <div className="flex items-center gap-2">
          <Chip tone="good" dot>
            Google Analytics connected
          </Chip>
          <span className="text-[11px] text-[#6B7A94]">GA4 reporting API · refreshed every 4 hours</span>
        </div>
        <div className="flex items-center gap-2">
          <SegmentedControl ariaLabel="Reporting period" value={period} onChange={setPeriod} options={PERIODS} />
          <WButton size="sm" onClick={() => openIntegration("ga4")}>
            Manage
          </WButton>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-1 lg:grid-cols-4 2xl:grid-cols-7">
        {data.kpis.map((kpi, index) => (
          <StatTile
            key={kpi.key}
            label={kpi.label}
            value={kpi.value}
            delta={kpi.delta}
            tone={index % 2 === 0 ? "info" : "violet"}
            sub={`vs previous ${period}`}
          />
        ))}
      </div>

      <div className="grid gap-1 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <Card title="Traffic trend" icon={Activity} subtitle="Users, sessions and views" bodyClassName="p-3.5 pt-2">
          <ChartLegend
            className="mb-1"
            items={[
              { key: "users", label: "Users", color: SERIES_COLORS[0] },
              { key: "sessions", label: "Sessions", color: SERIES_COLORS[1] },
              { key: "views", label: "Views", color: SERIES_COLORS[3] },
            ]}
          />
          <div className="h-[224px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.trend} margin={{ top: 6, right: 8, left: -18, bottom: 0 }}>
                <defs>
                  {[SERIES_COLORS[0], SERIES_COLORS[1], SERIES_COLORS[3]].map((color, index) => (
                    <linearGradient key={color} id={`analytics-grad-${index}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={color} stopOpacity={0.22} />
                      <stop offset="100%" stopColor={color} stopOpacity={0.01} />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid {...GRID_PROPS} />
                <XAxis dataKey="date" {...AXIS_PROPS} tickFormatter={formatShortDate} minTickGap={28} />
                <YAxis {...AXIS_PROPS} width={46} tickFormatter={(value: number) => formatCompact(value)} />
                <Tooltip content={makeTooltip((entry) => formatNumber(entry.value), (label) => formatDate(label))} />
                <Area
                  type="monotone"
                  dataKey="views"
                  name="Views"
                  stroke={SERIES_COLORS[3]}
                  strokeWidth={2}
                  fill="url(#analytics-grad-2)"
                />
                <Area
                  type="monotone"
                  dataKey="sessions"
                  name="Sessions"
                  stroke={SERIES_COLORS[1]}
                  strokeWidth={2}
                  fill="url(#analytics-grad-1)"
                />
                <Area
                  type="monotone"
                  dataKey="users"
                  name="Users"
                  stroke={SERIES_COLORS[0]}
                  strokeWidth={2}
                  fill="url(#analytics-grad-0)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card
          title="Conversion funnel"
          icon={Target}
          subtitle="Stages we cannot measure are marked, never estimated"
          bodyClassName="p-3.5"
        >
          <ol className="space-y-2">
            {data.funnel.map((stage, index) => (
              <FunnelRow
                key={stage.key}
                stage={stage}
                first={index === 0}
                maxValue={data.funnel[0]?.value ?? 1}
                onUnlock={() => openIntegration("omniTracking")}
              />
            ))}
          </ol>
          {!behaviour.available ? (
            <p className="mt-2 rounded-md bg-[#FDF3E3] px-2.5 py-2 text-[10.5px] leading-relaxed text-[#9A5B08]">
              CTA clicks and form starts need Omni Tracking on the website. Form submits below come from a GA4 event
              the site already sends.
            </p>
          ) : null}
        </Card>
      </div>

      <div className="grid gap-1 lg:grid-cols-2 xl:grid-cols-3">
        <Card title="Acquisition" icon={Layers} bodyClassName="p-3.5">
          <ShareBar
            ariaLabel="Users by acquisition channel"
            rows={data.acquisition.map((row, index) => ({
              label: row.channel,
              value: formatNumber(row.users),
              share: Math.round((row.users / Math.max(1, data.kpis[0]?.raw ?? 1)) * 100),
              color: SERIES_COLORS[index % SERIES_COLORS.length] ?? "#2563EB",
            }))}
          />
        </Card>

        <Card title="Devices" icon={MonitorSmartphone} bodyClassName="p-3.5">
          <ShareBar
            ariaLabel="Users by device"
            rows={data.devices.map((row, index) => ({
              label: row.device,
              value: formatNumber(row.users),
              share: row.share,
              color: SERIES_COLORS[index % SERIES_COLORS.length] ?? "#2563EB",
            }))}
          />
          <div className="mt-3 border-t border-[#F1F4F9] pt-3">
            <ShareBar
              ariaLabel="New versus returning users"
              rows={data.newVsReturning.map((row, index) => ({
                label: row.label,
                value: formatNumber(row.users),
                share: row.share,
                color: index === 0 ? SERIES_COLORS[0] : SERIES_COLORS[3],
              }))}
            />
          </div>
        </Card>

        <Card title="Geography" icon={Globe2} bodyClassName="p-0">
          <ul className="divide-y divide-[#F2F5FA]">
            {data.geography.map((row) => (
              <li key={row.country} className="flex items-center gap-2 px-3.5 py-2">
                <span className="w-32 shrink-0 truncate text-[11.5px] text-[#334155]">{row.country}</span>
                <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#EDF1F7]">
                  <span className="block h-full rounded-full bg-[#2563EB]" style={{ width: `${row.share}%` }} />
                </span>
                <span className="w-14 shrink-0 text-right text-[11px] font-semibold text-[#28354C]">
                  {formatNumber(row.users)}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <div className="grid gap-1 xl:grid-cols-2">
        <Card title="Top pages" icon={BarChart3} bodyClassName="p-0">
          <DataTable
            dense
            columns={topPageColumns}
            rows={data.topPages}
            getRowId={(row) => row.path}
            empty={<EmptyState title="No page data" body="GA4 returned no page rows for this period." compact />}
          />
        </Card>

        <Card title="Landing pages" icon={BarChart3} bodyClassName="p-0">
          <DataTable
            dense
            columns={landingColumns}
            rows={data.landingPages}
            getRowId={(row) => row.path}
            empty={<EmptyState title="No landing page data" body="GA4 returned no landing pages for this period." compact />}
          />
        </Card>
      </div>

      <div className="grid gap-1 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] xl:items-start">
        <Card title="Events" icon={MousePointerClick} subtitle="Source is shown per event" bodyClassName="p-3.5 pt-2">
          <div className="h-[212px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.events} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                <CartesianGrid {...GRID_PROPS} />
                <XAxis dataKey="name" {...AXIS_PROPS} interval={0} angle={-18} textAnchor="end" height={48} />
                <YAxis {...AXIS_PROPS} width={48} tickFormatter={(value: number) => formatCompact(value)} />
                <Tooltip
                  cursor={{ fill: "#F4F7FB" }}
                  content={makeTooltip((entry) => formatNumber(entry.value), (label) => label)}
                />
                <Bar dataKey="count" name="Event count" fill={SERIES_COLORS[0]} radius={[4, 4, 0, 0]} maxBarSize={42} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {data.events.map((event) => (
              <li key={event.name}>
                <Chip tone={event.source === "ga4" ? "info" : "violet"}>
                  {event.name} · {event.source === "ga4" ? "GA4" : "Omni Tracking"}
                </Chip>
              </li>
            ))}
          </ul>
        </Card>

        <div className="grid gap-1">
          <Card title="Conversions" icon={Target} bodyClassName="p-0">
            <ul className="divide-y divide-[#F2F5FA]">
              {data.conversions.map((conversion) => (
                <li key={conversion.name} className="flex items-center justify-between gap-2 px-3.5 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-[11.5px] font-semibold text-[#28354C]">{conversion.name}</p>
                    {conversion.value !== null ? (
                      <p className="text-[10.5px] text-[#6B7A94]">₹{formatNumber(conversion.value)} value</p>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-2">
                    <b className="text-[13px] font-semibold text-[#111C3A]">{formatNumber(conversion.count)}</b>
                    <Chip tone={conversion.delta >= 0 ? "good" : "bad"}>
                      {conversion.delta >= 0 ? "+" : ""}
                      {conversion.delta.toFixed(1)}%
                    </Chip>
                  </div>
                </li>
              ))}
            </ul>
          </Card>

          <Card title="Heatmaps" icon={Flame}>
            {heatmaps.available ? (
              <EmptyState
                title="Heatmap rendering is not built yet"
                body="Omni Tracking is installed and collecting interaction events. The heatmap renderer ships with the tracking backend."
                icon={Flame}
                compact
                className="!py-4"
              />
            ) : (
              <LockedState
                title={heatmaps.lockedTitle}
                body={heatmaps.lockedBody}
                ctaLabel={heatmaps.ctaLabel}
                onCta={() => openIntegration("omniTracking")}
                compact
                className="!py-4"
              />
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function AnalyticsLocked({ onConnect }: { onConnect: () => void }) {
  const unlocks = [
    { icon: Users, label: "Users & sessions", detail: "How many people visit, and how often they come back." },
    { icon: Layers, label: "Traffic sources", detail: "Which channels bring them — search, social, direct, paid." },
    { icon: BarChart3, label: "Top & landing pages", detail: "Where they arrive and what they actually read." },
    { icon: Target, label: "Conversions", detail: "Donations, signups and other goals already set up in GA4." },
    { icon: MonitorSmartphone, label: "Devices", detail: "Mobile versus desktop, and how each performs." },
    { icon: Globe2, label: "Geography", detail: "Which countries and cities the audience is in." },
  ];

  return (
    <div className="space-y-1">
      <Card title="Google Analytics" icon={Activity}>
        <LockedState
          title="Google Analytics not connected"
          body="This website has no GA4 property linked, so there is no visitor data to show. We will not estimate traffic — connect the property the client already owns and the numbers below become real."
          ctaLabel="Connect Google Analytics"
          onCta={onConnect}
        />
      </Card>

      <Card title="What connecting GA4 unlocks" icon={Layers}>
        <ul className="grid gap-1 sm:grid-cols-2 lg:grid-cols-3">
          {unlocks.map((item) => (
            <li key={item.label} className="flex items-start gap-2.5 rounded-xl border border-[#E6EBF4] p-3">
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

function FunnelRow({
  stage,
  first,
  maxValue,
  onUnlock,
}: {
  stage: FunnelStage;
  first: boolean;
  maxValue: number | null;
  onUnlock: () => void;
}) {
  const width =
    stage.available && stage.value !== null && maxValue ? Math.max(6, (stage.value / maxValue) * 100) : 100;

  return (
    <li>
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="text-[11.5px] font-semibold text-[#28354C]">{stage.label}</span>
        {stage.available ? (
          <span className="text-[11.5px] font-semibold text-[#111C3A]">
            {formatNumber(stage.value ?? 0)}
            {!first && stage.conversionPct !== null ? (
              <span className="ml-1.5 text-[10px] font-medium text-[#6B7A94]">{stage.conversionPct}%</span>
            ) : null}
          </span>
        ) : (
          <Chip tone="muted">Unavailable</Chip>
        )}
      </div>
      <div
        className={cn(
          "h-7 rounded-md",
          stage.available ? "bg-[#2563EB]" : "border border-dashed border-[#DAE1EC] bg-[#F7F9FC]",
        )}
        style={{ width: `${width}%` }}
      />
      {!stage.available ? (
        <p className="mt-1 flex flex-wrap items-center gap-1.5 text-[10.5px] text-[#94A3B8]">
          {stage.unavailableReason}
          <button
            type="button"
            onClick={onUnlock}
            className="cursor-pointer font-semibold text-[#2563EB] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]/35"
          >
            Set up
          </button>
        </p>
      ) : null}
    </li>
  );
}

const topPageColumns: Column<AnalyticsData["topPages"][number]>[] = [
  {
    key: "path",
    header: "Page",
    primary: true,
    cell: (row) => <span className="truncate font-mono text-[11px] text-[#28354C]">{row.path}</span>,
  },
  { key: "views", header: "Views", align: "right", cell: (row) => formatNumber(row.views) },
  { key: "users", header: "Users", align: "right", cell: (row) => formatNumber(row.users) },
  {
    key: "engagement",
    header: "Avg engagement",
    align: "right",
    cell: (row) => `${Math.floor(row.avgEngagementSec / 60)}m ${row.avgEngagementSec % 60}s`,
  },
];

const landingColumns: Column<AnalyticsData["landingPages"][number]>[] = [
  {
    key: "path",
    header: "Landing page",
    primary: true,
    cell: (row) => <span className="truncate font-mono text-[11px] text-[#28354C]">{row.path}</span>,
  },
  { key: "sessions", header: "Sessions", align: "right", cell: (row) => formatNumber(row.sessions) },
  {
    key: "bounce",
    header: "Bounce rate",
    align: "right",
    cell: (row) => (
      <span className={row.bounceRate > 55 ? "font-semibold text-[#9A5B08]" : ""}>{row.bounceRate.toFixed(1)}%</span>
    ),
  },
  { key: "conversions", header: "Conversions", align: "right", cell: (row) => formatNumber(row.conversions) },
];
