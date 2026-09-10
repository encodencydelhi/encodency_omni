import type { Metadata } from "next";
import { Suspense } from "react";
import { CompaniesView } from "@/features/companies/components/companies-view";

export const metadata: Metadata = {
  title: "Companies",
};

export default function CompaniesPage() {
  // The view reads its state from the URL, so it needs a Suspense boundary.
  return (
    <Suspense fallback={null}>
      <CompaniesView />
    </Suspense>
  );
}
