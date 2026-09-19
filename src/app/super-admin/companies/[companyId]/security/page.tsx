import type { Metadata } from "next";
import { Suspense } from "react";
import { CompanySecurityPage } from "@/features/companies/pages/company-security";

export const metadata: Metadata = {
  title: "Company security",
  description: "Tenant-level security posture and controls.",
};

export default function Page() {
  return (
    <Suspense fallback={null}>
      <CompanySecurityPage />
    </Suspense>
  );
}
