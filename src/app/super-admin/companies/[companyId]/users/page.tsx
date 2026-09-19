import type { Metadata } from "next";
import { Suspense } from "react";
import { CompanyUsersPage } from "@/features/companies/pages/company-users";

export const metadata: Metadata = {
  title: "Company users",
  description: "Users of this company and the state of their accounts.",
};

export default function Page() {
  return (
    <Suspense fallback={null}>
      <CompanyUsersPage />
    </Suspense>
  );
}
