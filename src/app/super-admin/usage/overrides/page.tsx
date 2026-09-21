import type { Metadata } from "next";
import { Suspense } from "react";
import { OverridesPage } from "@/features/usage-limits/pages/overrides";

export const metadata: Metadata = {
  title: "Overrides",
  description: "Company-specific entitlement overrides.",
};

export default function Page() {
  // Filters live in the URL, which needs a Suspense boundary.
  return (
    <Suspense fallback={null}>
      <OverridesPage />
    </Suspense>
  );
}
