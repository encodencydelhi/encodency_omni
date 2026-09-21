import type { Metadata } from "next";
import { Suspense } from "react";
import { RolloutsPage } from "@/features/feature-flags/pages/rollouts";

export const metadata: Metadata = {
  title: "Rollouts & Targeting",
  description: "How each feature is being introduced and which rollout changes are waiting.",
};

export default function Page() {
  // Filters and the environment live in the URL, which needs a Suspense boundary.
  return (
    <Suspense fallback={null}>
      <RolloutsPage />
    </Suspense>
  );
}
