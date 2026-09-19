import type { Metadata } from "next";
import { Suspense } from "react";
import { CompanyClientsPage } from "@/features/companies/pages/company-clients";

export const metadata: Metadata = {
  title: "Company clients",
  description: "Clients managed by this company.",
};

export default function Page() {
  return (
    <Suspense fallback={null}>
      <CompanyClientsPage />
    </Suspense>
  );
}
