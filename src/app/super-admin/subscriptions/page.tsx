import type { Metadata } from "next";
import { Suspense } from "react";
import { SubscriptionsListPage } from "@/features/plans-subscriptions/pages/subscriptions-list";

export const metadata: Metadata = {
  title: "Company subscriptions",
  description: "Monitor subscription status, plan assignments, renewals and trials.",
};

export default function Page() {
  // Filters and sections live in the URL, which needs a Suspense boundary.
  return (
    <Suspense fallback={null}>
      <SubscriptionsListPage />
    </Suspense>
  );
}
