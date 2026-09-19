import type { Metadata } from "next";
import { Suspense } from "react";
import { OverviewPage } from "@/features/plans-subscriptions/pages/overview";

export const metadata: Metadata = {
  title: "Plans & Subscriptions",
  description: "Manage platform plans, feature entitlements, company subscriptions and subscription lifecycle.",
};

export default function Page() {
  // Filters and sections live in the URL, which needs a Suspense boundary.
  return (
    <Suspense fallback={null}>
      <OverviewPage />
    </Suspense>
  );
}
