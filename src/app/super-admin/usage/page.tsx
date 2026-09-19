import type { Metadata } from "next";
import { Suspense } from "react";
import { UsageLimitsWorkspace } from "@/features/usage-limits/pages/workspace";

export const metadata: Metadata = {
  title: "Usage & Limits",
  description: "Monitor platform usage, quota health, overages and company-specific usage overrides.",
};

export default async function UsagePage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const params = await searchParams;
  const tab = params.tab === "companies" || params.tab === "resources" || params.tab === "alerts" || params.tab === "overrides" || params.tab === "activity" ? params.tab : "overview";
  return (
    <Suspense fallback={null}>
      <UsageLimitsWorkspace initialTab={tab} />
    </Suspense>
  );
}
