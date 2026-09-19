import type { Metadata } from "next";
import { Suspense } from "react";
import { CompanyIntegrationsPage } from "@/features/companies/pages/company-integrations";

export const metadata: Metadata = {
  title: "Company integrations",
  description: "Provider connections and their operational health.",
};

export default function Page() {
  return (
    <Suspense fallback={null}>
      <CompanyIntegrationsPage />
    </Suspense>
  );
}
