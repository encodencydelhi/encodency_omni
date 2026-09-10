"use client";

import {
  Building2Icon,
  ClockIcon,
  CreditCardIcon,
  IndianRupeeIcon,
  LayersIcon,
  PlugIcon,
  ShieldCheckIcon,
  UsersIcon,
  type LucideIcon,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils/cn";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/utils/format";
import type { DashboardMetric, DashboardMetricKey } from "@/types/domain/dashboard";
import { TrendIndicator } from "@/components/shared/trend-indicator";

/** Icon and accent per measurement, so the grid stays scannable by colour. */
const METRIC_PRESENTATION: Record<
  DashboardMetricKey,
  { label: string; icon: LucideIcon; accent: string }
> = {
  totalCompanies: { label: "Total Companies", icon: Building2Icon, accent: "bg-primary-subtle text-primary" },
  totalUsers: { label: "Total Users", icon: UsersIcon, accent: "bg-info-subtle text-info" },
  totalClients: { label: "Total Clients", icon: LayersIcon, accent: "bg-violet-subtle text-violet" },
  activeSubscriptions: { label: "Active Subscriptions", icon: CreditCardIcon, accent: "bg-info-subtle text-info" },
  monthlyRevenue: { label: "Monthly Revenue", icon: IndianRupeeIcon, accent: "bg-success-subtle text-success" },
  connectedIntegrations: { label: "Connected Integrations", icon: PlugIcon, accent: "bg-neutral-subtle text-neutral" },
  runningJobs: { label: "Running Jobs", icon: ClockIcon, accent: "bg-primary-subtle text-primary" },
  systemUptime: { label: "System Uptime", icon: ShieldCheckIcon, accent: "bg-success-subtle text-success" },
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
  "systemUptime",
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
  const { label, icon: Icon, accent } = METRIC_PRESENTATION[metric.key];

  return (
    <div className="flex items-start gap-3 rounded-xl border border-border bg-card px-4 py-3.5 shadow-xs">
      <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-full", accent)}>
        <Icon className="size-[1.125rem]" />
      </span>

      <div className="min-w-0 flex-1 flex flex-col">
        <p className="truncate text-[0.8125rem] font-medium leading-none text-muted-foreground mb-1.5">{label}</p>

        <div className="flex items-end justify-between gap-2">
          <div className="flex flex-wrap items-baseline gap-2">
            <span className="text-xl font-semibold leading-none tracking-tight tabular text-foreground">
              {formatValue(metric)}
            </span>
            {metric.delta ? <TrendIndicator delta={metric.delta} /> : null}
          </div>
          
          {metric.series ? (
            <div className="flex items-end gap-[1px] h-6 w-[60px] shrink-0 text-primary opacity-25 hover:opacity-100 transition-opacity">
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
    <div className="flex items-start gap-3 rounded-xl border border-border bg-card px-4 py-3.5">
      <Skeleton className="size-10 shrink-0 rounded-full" />
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
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {METRIC_ORDER.map((key) => (
          <MetricTileSkeleton key={key} />
        ))}
      </div>
    );
  }

  const byKey = new Map(metrics.map((metric) => [metric.key, metric]));

  return (
    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
      {METRIC_ORDER.map((key) => {
        const metric = byKey.get(key);
        return metric ? <MetricTile key={key} metric={metric} /> : null;
      })}
    </div>
  );
}
