import type { Metadata } from "next";
import { Suspense } from "react";
import { PlanDetailPage } from "@/features/plans-subscriptions/pages/plan-detail";

export const metadata: Metadata = {
  title: "Plan",
  description: "Plan pricing, features, limits, availability and versions.",
};

export default function Page() {
  // Filters and sections live in the URL, which needs a Suspense boundary.
  return (
    <Suspense fallback={null}>
      <PlanDetailPage />
    </Suspense>
  );
}
