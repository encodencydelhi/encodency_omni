import type { Metadata } from "next";
import { Suspense } from "react";
import { FlagsOverviewPage } from "@/features/feature-flags/pages/overview";

export const metadata: Metadata = {
  title: "Feature Flags",
  description: "Control feature availability, manage company rollouts and review platform feature changes.",
};

export default function Page() {
  // Filters and the environment live in the URL, which needs a Suspense boundary.
  return (
    <Suspense fallback={null}>
      <FlagsOverviewPage />
    </Suspense>
  );
}
