import type { Metadata } from "next";
import { Suspense } from "react";
import { CompanyActivityPage } from "@/features/companies/pages/company-activity";

export const metadata: Metadata = {
  title: "Company activity",
  description: "Administrative and operational activity for this company.",
};

export default function Page() {
  return (
    <Suspense fallback={null}>
      <CompanyActivityPage />
    </Suspense>
  );
}
