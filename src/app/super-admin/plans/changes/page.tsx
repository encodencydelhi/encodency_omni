import type { Metadata } from "next";
import { Suspense } from "react";
import { ChangesPage } from "@/features/plans-subscriptions/pages/changes";

export const metadata: Metadata = {
  title: "Trials & changes",
  description: "Trials, scheduled subscription changes and recent commercial activity.",
};

export default function Page() {
  // Filters and sections live in the URL, which needs a Suspense boundary.
  return (
    <Suspense fallback={null}>
      <ChangesPage />
    </Suspense>
  );
}
