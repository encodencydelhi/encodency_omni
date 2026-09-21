import type { Metadata } from "next";
import { Suspense } from "react";
import { InvestigationsPage } from "@/features/audit-logs/pages/investigations";

export const metadata: Metadata = {
  title: "Investigations",
  description: "Internal cases that group audit events for review.",
};

export default function Page() {
  // Filters and the date range live in the URL, which needs a Suspense boundary.
  return (
    <Suspense fallback={null}>
      <InvestigationsPage />
    </Suspense>
  );
}
