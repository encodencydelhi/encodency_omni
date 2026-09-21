import type { Metadata } from "next";
import { Suspense } from "react";
import { SensitiveChangesPage } from "@/features/audit-logs/pages/sensitive-changes";

export const metadata: Metadata = {
  title: "Sensitive Changes",
  description: "High-impact administrative events for review.",
};

export default function Page() {
  // Filters and the date range live in the URL, which needs a Suspense boundary.
  return (
    <Suspense fallback={null}>
      <SensitiveChangesPage />
    </Suspense>
  );
}
