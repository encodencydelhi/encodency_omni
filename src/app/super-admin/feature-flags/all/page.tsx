import type { Metadata } from "next";
import { Suspense } from "react";
import { AllFlagsPage } from "@/features/feature-flags/pages/all-flags";

export const metadata: Metadata = {
  title: "All Flags",
  description: "Every feature flag with its state, rollout and reach.",
};

export default function Page() {
  // Filters and the environment live in the URL, which needs a Suspense boundary.
  return (
    <Suspense fallback={null}>
      <AllFlagsPage />
    </Suspense>
  );
}
