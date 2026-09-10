"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";
import { CHART_COLORS } from "@/components/shared/charts/chart-theme";
import { CardSkeleton } from "@/components/shared/loading-state";
import { SectionCard } from "@/components/shared/section-card";
import { formatNumber } from "@/lib/utils/format";
import type { DashboardSnapshot } from "@/types/domain/dashboard";

const DonutChart = dynamic(
  () => import("@/components/shared/charts/donut-chart").then((module) => module.DonutChart),
  { ssr: false, loading: () => <CardSkeleton lines={4} /> },
);

interface SubscriptionDistributionProps {
  distribution: DashboardSnapshot["subscriptionDistribution"];
  isLoading: boolean;
}

/** Active subscriptions split by plan tier, with the total in the centre. */
export function SubscriptionDistribution({ distribution, isLoading }: SubscriptionDistributionProps) {
  const segments = useMemo(
    () =>
      distribution.segments.map((segment, index) => ({
        key: segment.tier,
        label: segment.label,
        value: segment.companies,
        color: CHART_COLORS[index % CHART_COLORS.length] ?? "var(--chart-1)",
      })),
    [distribution.segments],
  );

  return (
    <SectionCard title="Subscription Distribution">
      {isLoading ? (
        <CardSkeleton lines={5} />
      ) : (
        <div className="flex flex-col items-center gap-6 sm:flex-row">
          <DonutChart
            segments={segments}
            centerValue={formatNumber(distribution.activeTotal)}
            centerLabel="Active"
            size={140}
          />

          <ul className="w-full flex-1 space-y-3">
            {segments.map((segment) => (
              <li key={segment.key} className="flex items-center gap-2.5">
                <span
                  className="size-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: segment.color }}
                  aria-hidden
                />
                <span className="flex-1 truncate text-[0.8125rem] text-foreground">{segment.label}</span>
                <span className="text-[0.8125rem] font-medium tabular text-foreground">
                  {segment.value}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </SectionCard>
  );
}
