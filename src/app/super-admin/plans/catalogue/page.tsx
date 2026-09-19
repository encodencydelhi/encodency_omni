import type { Metadata } from "next";
import { Suspense } from "react";
import { PlansCataloguePage } from "@/features/plans-subscriptions/pages/plans-catalogue";

export const metadata: Metadata = {
  title: "Platform plans",
  description: "Define pricing, features, usage allowances and availability for company subscriptions.",
};

export default function Page() {
  // Filters and sections live in the URL, which needs a Suspense boundary.
  return (
    <Suspense fallback={null}>
      <PlansCataloguePage />
    </Suspense>
  );
}
