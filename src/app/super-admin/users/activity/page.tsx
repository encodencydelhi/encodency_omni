import type { Metadata } from "next";
import { Suspense } from "react";
import { UserActivityPage } from "@/features/users/pages/user-activity-page";

export const metadata: Metadata = {
  title: "User Activity Audit Log | OmniPlatform Super Admin",
  description: "Platform-wide user authentication, security, and administrative action audit logs.",
};

export default function Page() {
  return (
    <Suspense fallback={null}>
      <UserActivityPage />
    </Suspense>
  );
}
