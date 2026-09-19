import type { Metadata } from "next";
import { Suspense } from "react";
import { SubscriptionDetailPage } from "@/features/plans-subscriptions/pages/subscription-detail";

export const metadata: Metadata = {
  title: "Subscription",
  description: "A company subscription: overview, entitlements and history.",
};

export default function Page() {
  // Filters and sections live in the URL, which needs a Suspense boundary.
  return (
    <Suspense fallback={null}>
      <SubscriptionDetailPage />
    </Suspense>
  );
}
