import type { Metadata } from "next";
import { Suspense } from "react";
import { AuditSettingsPage } from "@/features/audit-logs/pages/settings";

export const metadata: Metadata = {
  title: "Settings & Retention",
  description: "Audit coverage, retention reference, export governance and system status.",
};

export default function Page() {
  // Filters and the date range live in the URL, which needs a Suspense boundary.
  return (
    <Suspense fallback={null}>
      <AuditSettingsPage />
    </Suspense>
  );
}
