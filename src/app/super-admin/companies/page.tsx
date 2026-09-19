import type { Metadata } from "next";
import { Suspense } from "react";
import { CompaniesListPage } from "@/features/companies/pages/companies-list";

export const metadata: Metadata = {
  title: "Companies",
  description: "Manage organizations, subscriptions, usage and tenant health across OmniPlatform.",
};

export default function CompaniesPage() {
  // The list keeps its filters in the URL, which needs a Suspense boundary.
  return (
    <Suspense fallback={null}>
      <CompaniesListPage />
    </Suspense>
  );
}
