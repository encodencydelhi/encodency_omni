"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { ErrorState } from "@/components/shared/error-state";
import { useAuth } from "@/features/auth/components/auth-provider";
import type { DashboardSnapshot } from "@/types/domain/dashboard";
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

/** Rendered while the first request is in flight, so the layout never jumps. */
const EMPTY_SNAPSHOT: Omit<DashboardSnapshot, "generatedAt"> = {
  metrics: [],
  attention: [],
  companyGrowth: { total: 0, series: [] },
  revenue: { mrrMinor: 0, currency: "INR", series: [] },
  subscriptionDistribution: { activeTotal: 0, segments: [] },
  recentActivity: [],
  platformHealth: [],
  latestSignups: [],
  apiUsage: {
    totalRequests: 0,
    requestDelta: { changePercent: 0, direction: "up-is-good" },
    successRate: 0,
    failedRequests: 0,
    avgResponseMs: 0,
    series: [],
  },
  integrationStatus: [],
};

/**
 * Answers one question: what is happening across the platform right now?
 *
 * The ordering is the argument — scale first, then the trends behind it, then
 * what needs a decision today.
 */
export function DashboardView() {
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const rangeParam = searchParams.get(RANGE_PARAM);
  const range: DashboardRange = isDashboardRange(rangeParam) ? rangeParam : DEFAULT_DASHBOARD_RANGE;

  const { data, isPending, isFetching, error, refetch } = useDashboard(range);

  // The range lives in the URL so a view can be shared or bookmarked.
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

  const snapshot = data ?? EMPTY_SNAPSHOT;

  if (error) {
    return (
      <div className="rounded-xl border border-border bg-card">
        <ErrorState error={error} onRetry={() => void refetch()} />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <DashboardHeader
        firstName={user?.name.split(" ")[0] ?? "there"}
        generatedAt={data?.generatedAt}
        range={range}
        onRangeChange={setRange}
        onRefresh={() => void refetch()}
        isRefreshing={isFetching}
      />

      <DashboardMetrics metrics={snapshot.metrics} isLoading={isPending} />

      <div className="grid gap-2 xl:grid-cols-3">
        <CompanyGrowthChart growth={snapshot.companyGrowth} isLoading={isPending} />
        <RevenueChart revenue={snapshot.revenue} isLoading={isPending} />
        <SubscriptionDistribution
          distribution={snapshot.subscriptionDistribution}
          isLoading={isPending}
        />
      </div>

      <div className="grid gap-2 xl:grid-cols-4">
        <PlanDistributionPanel distribution={snapshot.subscriptionDistribution} isLoading={isPending} />
        <LatestSignupsPanel signups={snapshot.latestSignups} isLoading={isPending} />
        <ApiUsagePanel usage={snapshot.apiUsage} isLoading={isPending} />
        <IntegrationStatusPanel integrations={snapshot.integrationStatus} isLoading={isPending} />
      </div>

      <div className="grid gap-2 xl:grid-cols-3">
        <NeedsAttentionPanel items={snapshot.attention} isLoading={isPending} />
        <RecentActivity entries={snapshot.recentActivity} isLoading={isPending} />
        <PlatformHealth entries={snapshot.platformHealth} isLoading={isPending} />
      </div>
    </div>
  );
}
