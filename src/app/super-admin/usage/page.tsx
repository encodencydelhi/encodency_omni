import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { usageRoutes } from "@/features/usage-limits/data/config";
import { UsageOverviewPage } from "@/features/usage-limits/pages/usage-overview";

export const metadata: Metadata = {
  title: "Usage & Limits",
  description: "Monitor resource consumption, quota utilization, company limits and metering health.",
};

const LEGACY_TABS: Record<string, string> = {
  companies: usageRoutes.companies,
  resources: usageRoutes.resources,
  alerts: usageRoutes.alerts,
  overrides: usageRoutes.overrides,
  activity: usageRoutes.metering,
};

export default async function Page({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  // Older links used ?tab=; every tab is now its own route.
  const legacy = LEGACY_TABS[(await searchParams).tab ?? ""];
  if (legacy) redirect(legacy);
  return (
    <Suspense fallback={null}>
      <UsageOverviewPage />
    </Suspense>
  );
}
