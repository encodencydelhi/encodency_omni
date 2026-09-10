"use client";

import dynamic from "next/dynamic";
import { ChartSkeleton } from "@/components/shared/loading-state";
import { SectionCard } from "@/components/shared/section-card";
import { formatCompactNumber, formatCurrency, formatNumber } from "@/lib/utils/format";
import type { DashboardSnapshot } from "@/types/domain/dashboard";

/** Recharts is heavy and client-only, so both charts are code-split. */
const MonthlyBarChart = dynamic(
  () => import("@/components/shared/charts/monthly-bar-chart").then((m) => m.MonthlyBarChart),
  { ssr: false, loading: () => <ChartSkeleton /> },
);

const MonthlyAreaChart = dynamic(
  () => import("@/components/shared/charts/monthly-area-chart").then((m) => m.MonthlyAreaChart),
  { ssr: false, loading: () => <ChartSkeleton /> },
);

export function CompanyGrowthChart({
  growth,
  isLoading,
}: {
  growth: DashboardSnapshot["companyGrowth"];
  isLoading: boolean;
}) {
  return (
    <SectionCard
      title="Company Growth"
      description="Total companies added over time"
      action={
        <span className="text-2xs text-muted-foreground">
          Total <span className="font-semibold text-foreground">{formatNumber(growth.total)}</span>
        </span>
      }
    >
      {isLoading ? (
        <ChartSkeleton />
      ) : (
        <MonthlyBarChart data={growth.series} valueLabel="Companies" formatValue={formatCompactNumber} height={140} />
      )}
    </SectionCard>
  );
}

export function RevenueChart({
  revenue,
  isLoading,
}: {
  revenue: DashboardSnapshot["revenue"];
  isLoading: boolean;
}) {
  // The series is stored in major units so the axis can label lakhs directly.
  const formatAxis = (value: number) => formatCurrency(value * 100, revenue.currency, { compact: true });

  return (
    <SectionCard
      title="Revenue Overview"
      description="Monthly recurring revenue (MRR)"
      action={
        <span className="text-2xs font-semibold text-foreground">
          {formatCurrency(revenue.mrrMinor, revenue.currency, { compact: true })}
        </span>
      }
    >
      {isLoading ? (
        <ChartSkeleton />
      ) : (
        <MonthlyAreaChart data={revenue.series} valueLabel="MRR" formatValue={formatAxis} height={140} />
      )}
    </SectionCard>
  );
}
