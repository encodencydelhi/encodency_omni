import type { Metadata } from "next";
import { Suspense } from "react";
import { AlertsOveragesPage } from "@/features/usage-limits/pages/alerts-overages";

export const metadata: Metadata = {
  title: "Alerts & overages",
  description: "Quota warnings, exceeded limits and metering issues.",
};

export default function Page() {
  // Filters live in the URL, which needs a Suspense boundary.
  return (
    <Suspense fallback={null}>
      <AlertsOveragesPage />
    </Suspense>
  );
}
