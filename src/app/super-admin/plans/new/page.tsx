import type { Metadata } from "next";
import { Suspense } from "react";
import { PlanCreatePage } from "@/features/plans-subscriptions/pages/plan-create";

export const metadata: Metadata = {
  title: "Create plan",
  description: "Define a new platform plan.",
};

export default function Page() {
  // Filters and sections live in the URL, which needs a Suspense boundary.
  return (
    <Suspense fallback={null}>
      <PlanCreatePage />
    </Suspense>
  );
}
