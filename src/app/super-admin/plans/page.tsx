import type { Metadata } from "next";
import { Suspense } from "react";
import { PlansSubscriptionsWorkspace } from "@/features/plans-subscriptions/pages/workspace";

export const metadata: Metadata = {
  title: "Plans & Subscriptions",
  description: "Manage platform plans, entitlements and company subscription lifecycle.",
};

export default async function PlansPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const params = await searchParams;
  const tab = params.tab === "plans" || params.tab === "changes" || params.tab === "settings" ? params.tab : "overview";
  return (
    <Suspense fallback={null}>
      <PlansSubscriptionsWorkspace initialTab={tab} />
    </Suspense>
  );
}
