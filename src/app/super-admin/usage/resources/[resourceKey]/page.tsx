import type { Metadata } from "next";
import { Suspense } from "react";
import { ResourceDetailPage } from "@/features/usage-limits/pages/resource-detail";

export const metadata: Metadata = {
  title: "Resource",
  description: "Resource definition, limit behaviour and policy.",
};

export default function Page() {
  // Filters live in the URL, which needs a Suspense boundary.
  return (
    <Suspense fallback={null}>
      <ResourceDetailPage />
    </Suspense>
  );
}
