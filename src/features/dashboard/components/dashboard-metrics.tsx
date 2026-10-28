"use client";

import {
  Building2Icon,
  ClockIcon,
  CreditCardIcon,
  IndianRupeeIcon,
  LayersIcon,
  PlugIcon,
  ShieldAlertIcon,
  ShieldCheckIcon,
  UsersIcon,
  type LucideIcon,
} from "lucide-react";
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
  { label: string; icon: LucideIcon; tone: Tone }
> = {
  totalCompanies: { label: "Total Companies", icon: Building2Icon, tone: "blue" },
  totalUsers: { label: "Total Users", icon: UsersIcon, tone: "violet" },
  totalClients: { label: "Total Clients", icon: LayersIcon, tone: "red" },
  activeSubscriptions: { label: "Active Subscriptions", icon: CreditCardIcon, tone: "green" },
  monthlyRevenue: { label: "Monthly Revenue", icon: IndianRupeeIcon, tone: "amber" },
  connectedIntegrations: { label: "Connected Integrations", icon: PlugIcon, tone: "blue" },
  runningJobs: { label: "Running Jobs", icon: ClockIcon, tone: "violet" },
  systemUptime: { label: "System Uptime", icon: ShieldCheckIcon, tone: "green" },
  openIncidents: { label: "Open Incidents", icon: ShieldAlertIcon, tone: "danger" },
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
  const { label, icon: Icon, tone: presetTone } = METRIC_PRESENTATION[metric.key];
  // Open incidents: red only while something is open; a quiet platform shows green.
  const tone: Tone = metric.key === "openIncidents" && metric.value === 0 ? "green" : presetTone;
  const { card, chip, ink } = TONES[tone];

  return (
    <div className={cn("flex items-start gap-3 rounded-sm border px-4 py-3.5 shadow-xs", card)}>
      <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-sm", chip)}>
        <Icon className="size-[1.125rem]" />
      </span>

      <div className="min-w-0 flex-1 flex flex-col">
        <div className="mb-1.5 flex items-center justify-between gap-1">
          <p className="truncate text-[0.8125rem] font-medium leading-none text-muted-foreground">{label}</p>
          {metric.isLive ? (
            <span className="inline-flex items-center gap-1 rounded-[3px] bg-white/70 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-success">
              <span className="size-1.5 rounded-full bg-success animate-pulse" />
              Live
            </span>
          ) : (
            <span className="inline-flex items-center rounded-[3px] bg-muted px-1.5 py-0.5 text-[10px] font-medium leading-none text-muted-foreground">
              Demo
            </span>
          )}
        </div>

        <div className="flex items-end justify-between gap-2">
          <div className="flex flex-wrap items-baseline gap-2">
            <span className="text-xl font-semibold leading-none tracking-tight tabular text-foreground">
              {formatValue(metric)}
            </span>
            {metric.delta ? <TrendIndicator delta={metric.delta} /> : null}
          </div>

          {metric.series ? (
            <div className={cn("flex items-end gap-[1px] h-6 w-[60px] shrink-0 opacity-40 transition-opacity hover:opacity-100", ink)}>
              {metric.series.map((val, i) => (
                <div key={i} className="flex-1 bg-current rounded-[1px]" style={{ height: `${Math.max((val / Math.max(...(metric.series || [1]))) * 100, 15)}%` }} />
              ))}
            </div>
          ) : null}
        </div>

        <p className="truncate text-2xs leading-none text-muted-foreground mt-1.5">{metric.hint}</p>
      </div>
    </div>
  );
}

function MetricTileSkeleton() {
  return (
    <div className="flex items-start gap-3 rounded-sm border border-border bg-muted/40 px-4 py-3.5">
      <Skeleton className="size-10 shrink-0 rounded-sm" />
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
      <div className="grid gap-1 sm:grid-cols-2 xl:grid-cols-4">
        {METRIC_ORDER.map((key) => (
          <MetricTileSkeleton key={key} />
        ))}
      </div>
    );
  }

  const byKey = new Map(metrics.map((metric) => [metric.key, metric]));

  return (
    <div className="grid gap-1 sm:grid-cols-2 xl:grid-cols-4">
      {METRIC_ORDER.map((key) => {
        const metric = byKey.get(key);
        return metric ? <MetricTile key={key} metric={metric} /> : null;
      })}
    </div>
  );
}
