"use client";

import { AnimatedIcon, type AnimatedIconName } from "@/components/shared/animated-icon";
import { isMockMode } from "@/config/env";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils/cn";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/utils/format";
import type { DashboardMetric, DashboardMetricKey } from "@/types/domain/dashboard";
import { TrendIndicator } from "@/components/shared/trend-indicator";
import { STAT_COLORS, type StatColor } from "@/components/shared/stat-color";

const TONES = STAT_COLORS;
type Tone = StatColor;

/** Icon and colour per measurement. */
const METRIC_PRESENTATION: Record<
  DashboardMetricKey,
  { label: string; icon: AnimatedIconName; tone: Tone }
> = {
  totalCompanies: { label: "Total Companies", icon: "companies", tone: "blue" },
  totalUsers: { label: "Total Users", icon: "users", tone: "violet" },
  totalClients: { label: "Total Clients", icon: "plans", tone: "red" },
  activeSubscriptions: { label: "Active Subscriptions", icon: "subscription", tone: "green" },
  monthlyRevenue: { label: "Monthly Revenue", icon: "revenue", tone: "amber" },
  connectedIntegrations: { label: "Connected Integrations", icon: "integrations", tone: "blue" },
  runningJobs: { label: "Running Jobs", icon: "clock", tone: "violet" },
  systemUptime: { label: "System Uptime", icon: "roles", tone: "green" },
  openIncidents: { label: "Open Incidents", icon: "roles", tone: "danger" },
};

/** Display order. The first row is scale, the second is operations. */
const METRIC_ORDER: DashboardMetricKey[] = [
  "totalCompanies",
  "totalUsers",
  "totalClients",
  "activeSubscriptions",
  "monthlyRevenue",
  "connectedIntegrations",
  "runningJobs",
  isMockMode ? "systemUptime" : "openIncidents",
];

function formatValue(metric: DashboardMetric): string {
  switch (metric.format) {
    case "currency":
      return formatCurrency(metric.value, metric.currency);
    case "percent":
      return formatPercent(metric.value, 2);
    default:
      return formatNumber(metric.value);
  }
}

function MetricTile({ metric }: { metric: DashboardMetric }) {
  const { label, icon, tone: presetTone } = METRIC_PRESENTATION[metric.key];
  const tone: Tone = metric.key === "openIncidents" && metric.value === 0 ? "green" : presetTone;
  const { card, chip, ink } = TONES[tone];
  const series = metric.series;
  const seriesMax = Math.max(1, ...(series ?? []));

  return (
    <article className={cn("group flex min-w-0 items-start gap-3 rounded-lg border px-4 py-3.5 shadow-xs transition-shadow duration-200 hover:shadow-md", card)}>
      <span className={cn("grid size-10 shrink-0 place-items-center rounded-lg", chip)}>
        <AnimatedIcon name={icon} size={23} active />
      </span>
      <div className="min-w-0 flex-1">
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <p className="truncate text-[0.8125rem] font-medium leading-none text-muted-foreground" title={label}>{label}</p>
          <span className={cn(
            "inline-flex shrink-0 items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold leading-none",
            metric.isLive ? "bg-white/70 text-success" : "bg-muted text-muted-foreground",
          )}>
            <span className={cn("size-1.5 rounded-full", metric.isLive ? "bg-success" : "bg-muted-foreground/50")} />
            {metric.isLive ? "Live" : "Demo"}
          </span>
        </div>
        <div className="flex items-end justify-between gap-2">
          <div className="flex flex-wrap items-baseline gap-2">
            <span className="text-xl font-semibold leading-none tracking-tight text-foreground tabular-nums">
              {formatValue(metric)}
            </span>
            {metric.delta ? <TrendIndicator delta={metric.delta} /> : null}
          </div>
          {series && series.length > 0 ? (
            <div aria-hidden="true" className={cn("flex h-6 w-[60px] shrink-0 items-end gap-px opacity-50", ink)}>
              {series.map((value, index) => (
                <span key={index} className="flex-1 rounded-t-sm bg-current" style={{ height: `${Math.max((value / seriesMax) * 100, 12)}%` }} />
              ))}
            </div>
          ) : null}
        </div>
        <p className="mt-1.5 truncate text-2xs leading-none text-muted-foreground capitalize" title={metric.hint}>{metric.hint}</p>
      </div>
    </article>
  );
}

function MetricTileSkeleton() {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/40 px-4 py-3.5">
      <Skeleton className="size-10 shrink-0 rounded-lg" />
      <div className="w-full space-y-2">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-2.5 w-32" />
      </div>
    </div>
  );
}

interface DashboardMetricsProps {
  metrics: DashboardMetric[];
  isLoading: boolean;
}

export function DashboardMetrics({ metrics, isLoading }: DashboardMetricsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 xl:grid-cols-4">
        {METRIC_ORDER.map((key) => (
          <MetricTileSkeleton key={key} />
        ))}
      </div>
    );
  }

  const byKey = new Map(metrics.map((metric) => [metric.key, metric]));

  return (
    <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 xl:grid-cols-4">
      {METRIC_ORDER.map((key) => {
        const metric = byKey.get(key);
        return metric ? <MetricTile key={key} metric={metric} /> : null;
      })}
    </div>
  );
}
