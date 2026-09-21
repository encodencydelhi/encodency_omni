import type { Metadata } from "next";
import { Suspense } from "react";
import { SettingsSectionPage } from "@/features/global-settings/pages/settings-section-page";

export const metadata: Metadata = {
  title: "Global Settings",
  description: "Platform identity, defaults, security and governance policies.",
};

export default function Page() {
  // Tabs and filters live in the URL, which needs a Suspense boundary.
  return (
    <Suspense fallback={null}>
      <SettingsSectionPage section="identity" />
    </Suspense>
  );
}
