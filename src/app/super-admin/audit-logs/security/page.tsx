import type { Metadata } from "next";
import { Suspense } from "react";
import { AccessSecurityPage } from "@/features/audit-logs/pages/access-security";

export const metadata: Metadata = {
  title: "Access & Security",
  description: "Authentication, user access, platform staff and security policy events.",
};

export default function Page() {
  // Filters and the date range live in the URL, which needs a Suspense boundary.
  return (
    <Suspense fallback={null}>
      <AccessSecurityPage />
    </Suspense>
  );
}
