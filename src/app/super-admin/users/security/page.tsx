import type { Metadata } from "next";
import { Suspense } from "react";
import { AccessSecurityPage } from "@/features/users/pages/access-security-page";

export const metadata: Metadata = {
  title: "Access & Security | OmniPlatform Super Admin",
  description: "Platform-wide user credential security, 2FA compliance and session controls.",
};

export default function Page() {
  return (
    <Suspense fallback={null}>
      <AccessSecurityPage />
    </Suspense>
  );
}
