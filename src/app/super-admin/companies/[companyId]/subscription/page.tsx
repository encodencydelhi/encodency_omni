import type { Metadata } from "next";
import { Suspense } from "react";
import { CompanySubscriptionPage } from "@/features/companies/pages/company-subscription";

export const metadata: Metadata = {
  title: "Company subscription",
  description: "Plan, limits and subscription governance for this company.",
};

export default function Page() {
  return (
    <Suspense fallback={null}>
      <CompanySubscriptionPage />
    </Suspense>
  );
}
