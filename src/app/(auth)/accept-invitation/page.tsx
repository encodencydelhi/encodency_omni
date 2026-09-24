import type { Metadata } from "next";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { AuthCard } from "@/features/auth/components/auth-card";
import { AcceptInvitationView } from "@/features/auth/components/accept-invitation-view";

export const metadata: Metadata = {
  title: "Accept invitation",
  description: "Create your EnCodency omniPlatform account from an invitation.",
  // The URL carries a one-time token; keep it out of referrers.
  referrer: "no-referrer",
};

function AcceptInvitationFallback() {
  return (
    <AuthCard>
      <Skeleton className="h-4 w-32" />
      <Skeleton className="mt-4 h-8 w-72" />
      <div className="mt-9 space-y-5">
        <Skeleton className="h-14 w-full rounded-sm" />
        <Skeleton className="h-14 w-full rounded-sm" />
      </div>
    </AuthCard>
  );
}

/** Public: the invitee has no account or session yet. Link format: /accept-invitation?token=… */
export default function AcceptInvitationPage() {
  return (
    <Suspense fallback={<AcceptInvitationFallback />}>
      <AcceptInvitationView />
    </Suspense>
  );
}
