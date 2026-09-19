import type { Metadata } from "next";
import { Suspense } from "react";
import { CompanyOverviewPage } from "@/features/companies/pages/company-overview";

export const metadata: Metadata = {
  title: "Company overview",
  description: "Operational profile of one OmniPlatform tenant.",
};

export default function Page() {
  return (
    <Suspense fallback={null}>
      <CompanyOverviewPage />
    </Suspense>
  );
}
