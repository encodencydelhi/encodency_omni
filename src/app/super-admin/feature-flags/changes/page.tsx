import type { Metadata } from "next";
import { Suspense } from "react";
import { ChangesPage } from "@/features/feature-flags/pages/changes";

export const metadata: Metadata = {
  title: "Changes & Activity",
  description: "Pending, scheduled and historical flag changes and configuration versions.",
};

export default function Page() {
  // Filters and the environment live in the URL, which needs a Suspense boundary.
  return (
    <Suspense fallback={null}>
      <ChangesPage />
    </Suspense>
  );
}
