import type { Metadata } from "next";
import { Suspense } from "react";
import { AuditOverviewPage } from "@/features/audit-logs/pages/overview";

export const metadata: Metadata = {
  title: "Audit Logs",
  description: "Review platform actions, security events and configuration changes across Media360.",
};

export default function Page() {
  // Filters and the date range live in the URL, which needs a Suspense boundary.
  return (
    <Suspense fallback={null}>
      <AuditOverviewPage />
    </Suspense>
  );
}
