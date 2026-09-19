import type { Metadata } from "next";
import { Suspense } from "react";
import { UserDetailPage } from "@/features/users/pages/user-detail-page";

export const metadata: Metadata = {
  title: "User Profile & Access Management | OmniPlatform Super Admin",
  description: "Platform-wide user identity, multi-company access governance, and security profile.",
};

export default function Page() {
  return (
    <Suspense fallback={null}>
      <UserDetailPage />
    </Suspense>
  );
}
