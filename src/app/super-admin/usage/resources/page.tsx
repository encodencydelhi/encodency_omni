import type { Metadata } from "next";
import { Suspense } from "react";
import { ResourcesLimitsPage } from "@/features/usage-limits/pages/resources-limits";

export const metadata: Metadata = {
  title: "Resources & limits",
  description: "The resource catalogue, limit policies and thresholds.",
};

export default function Page() {
  // Filters live in the URL, which needs a Suspense boundary.
  return (
    <Suspense fallback={null}>
      <ResourcesLimitsPage />
    </Suspense>
  );
}
