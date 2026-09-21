import type { Metadata } from "next";
import { Suspense } from "react";
import { SettingsPage } from "@/features/feature-flags/pages/settings";

export const metadata: Metadata = {
  title: "Settings & Governance",
  description: "The governance policy for flag creation, production changes, rollouts and lifecycle.",
};

export default function Page() {
  // Filters and the environment live in the URL, which needs a Suspense boundary.
  return (
    <Suspense fallback={null}>
      <SettingsPage />
    </Suspense>
  );
}
