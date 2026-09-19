import type { Metadata } from "next";
import { Suspense } from "react";
import { CompanyUsagePage } from "@/features/companies/pages/company-usage";

export const metadata: Metadata = {
  title: "Company usage",
  description: "Resource usage against effective limits for this company.",
};

export default function Page() {
  return (
    <Suspense fallback={null}>
      <CompanyUsagePage />
    </Suspense>
  );
}
