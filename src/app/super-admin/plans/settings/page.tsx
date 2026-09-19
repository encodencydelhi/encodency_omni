import type { Metadata } from "next";
import { Suspense } from "react";
import { SettingsPage } from "@/features/plans-subscriptions/pages/settings";

export const metadata: Metadata = {
  title: "Subscription settings",
  description: "Trial, renewal, cancellation and over-limit policies.",
};

export default function Page() {
  // Filters and sections live in the URL, which needs a Suspense boundary.
  return (
    <Suspense fallback={null}>
      <SettingsPage />
    </Suspense>
  );
}
