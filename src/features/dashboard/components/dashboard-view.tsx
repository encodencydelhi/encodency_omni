"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";
import type { DashboardSnapshot } from "@/types/domain/dashboard";
import { DASHBOARD_SNAPSHOT } from "@/mocks/data/dashboard";
import { useDashboard } from "../hooks/use-dashboard";
import {
  DEFAULT_DASHBOARD_RANGE,
  isDashboardRange,
  type DashboardRange,
} from "../services/dashboard-service";
import { DashboardHeader } from "./dashboard-header";
import { DashboardMetrics } from "./dashboard-metrics";
import { CompanyGrowthChart, RevenueChart } from "./growth-and-revenue";
import { NeedsAttentionPanel } from "./needs-attention-panel";
import { PlatformHealth } from "./platform-health";
import { RecentActivity } from "./recent-activity";
import { SubscriptionDistribution } from "./subscription-distribution";
import {
  ApiUsagePanel,
  IntegrationStatusPanel,
  LatestSignupsPanel,
  PlanDistributionPanel,
} from "./dashboard-extra-panels";

const RANGE_PARAM = "range";

export function DashboardView() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const rangeParam = searchParams.get(RANGE_PARAM);
  const range: DashboardRange = isDashboardRange(rangeParam) ? rangeParam : DEFAULT_DASHBOARD_RANGE;

  const { data, isPending, isFetching, error, refetch } = useDashboard(range);

  const setRange = useCallback(
    (next: DashboardRange) => {
      const params = new URLSearchParams(searchParams.toString());
      if (next === DEFAULT_DASHBOARD_RANGE) params.delete(RANGE_PARAM);
      else params.set(RANGE_PARAM, next);

      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const snapshot = useMemo(() => {
    if (data && Array.isArray(data.metrics) && data.metrics.length > 0) {
      return data;
    }
    return DASHBOARD_SNAPSHOT;
  }, [data]);

  return (
    <div className="-mx-4 -my-5 min-h-[calc(100dvh-60px)] px-4 py-4 sm:-mx-5 sm:px-5 xl:-mx-6 xl:px-6">
      <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-1">
        <DashboardHeader
          generatedAt={snapshot.generatedAt || data?.generatedAt}
          range={range}
          onRangeChange={setRange}
          onRefresh={() => void refetch()}
          isRefreshing={isFetching}
        />

        <DashboardMetrics metrics={snapshot.metrics} isLoading={isPending} />

        <div className="grid gap-1 xl:grid-cols-3">
          <CompanyGrowthChart growth={snapshot.companyGrowth} isLoading={isPending} />
          <RevenueChart revenue={snapshot.revenue} isLoading={isPending} />
          <SubscriptionDistribution
            distribution={snapshot.subscriptionDistribution}
            isLoading={isPending}
          />
        </div>

        <div className="grid gap-1 xl:grid-cols-4">
          <PlanDistributionPanel distribution={snapshot.subscriptionDistribution} isLoading={isPending} />
          <LatestSignupsPanel signups={snapshot.latestSignups} isLoading={isPending} />
          <ApiUsagePanel usage={snapshot.apiUsage} isLoading={isPending} />
          <IntegrationStatusPanel integrations={snapshot.integrationStatus} isLoading={isPending} />
        </div>

        <div className="grid gap-1 xl:grid-cols-3">
          <NeedsAttentionPanel items={snapshot.attention} isLoading={isPending} />
          <RecentActivity entries={snapshot.recentActivity} isLoading={isPending} />
          <PlatformHealth />
        </div>
      </div>
    </div>
  );
}
