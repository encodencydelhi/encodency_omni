import type { Metadata } from "next";
import { Suspense } from "react";
import { CompanyAccessPage } from "@/features/feature-flags/pages/company-access";

export const metadata: Metadata = {
  title: "Company Access",
  description: "Every feature for one company, and why each is or is not available.",
};

export default function Page() {
  // Filters and the environment live in the URL, which needs a Suspense boundary.
  return (
    <Suspense fallback={null}>
      <CompanyAccessPage />
    </Suspense>
  );
}
