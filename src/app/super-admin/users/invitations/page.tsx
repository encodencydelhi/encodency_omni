import type { Metadata } from "next";
import { Suspense } from "react";
import { InvitationsPage } from "@/features/users/pages/invitations-page";

export const metadata: Metadata = {
  title: "User Invitations | OmniPlatform Super Admin",
  description: "Platform-wide company user onboarding invitations.",
};

export default function Page() {
  return (
    <Suspense fallback={null}>
      <InvitationsPage />
    </Suspense>
  );
}
