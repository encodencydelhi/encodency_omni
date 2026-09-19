import type { Metadata } from "next";
import { Suspense } from "react";
import { CompanyBillingPage } from "@/features/companies/pages/company-billing";

export const metadata: Metadata = {
  title: "Company billing",
  description: "Invoices, payments and billing status for this company.",
};

export default function Page() {
  return (
    <Suspense fallback={null}>
      <CompanyBillingPage />
    </Suspense>
  );
}
