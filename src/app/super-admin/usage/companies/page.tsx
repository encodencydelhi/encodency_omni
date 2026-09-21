import type { Metadata } from "next";
import { Suspense } from "react";
import { CompanyUsagePage } from "@/features/usage-limits/pages/company-usage";

export const metadata: Metadata = {
  title: "Company usage",
  description: "Compare company consumption against plan allowances and effective limits.",
};

export default function Page() {
  // Filters live in the URL, which needs a Suspense boundary.
  return (
    <Suspense fallback={null}>
      <CompanyUsagePage />
    </Suspense>
  );
}
