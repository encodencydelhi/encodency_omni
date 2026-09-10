import type { Metadata } from "next";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { AuthCard } from "@/features/auth/components/auth-card";
import { LoginView } from "@/features/auth/components/login-view";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to the EnCodency omniPlatform administration panels.",
};

/** Matches the card's footprint so the panel does not shift once hydrated. */
function LoginFallback() {
  return (
    <AuthCard>
      <Skeleton className="h-4 w-24" />
      <Skeleton className="mt-4 h-8 w-72" />
      <Skeleton className="mt-4 h-5 w-full max-w-md" />
      <div className="mt-9 space-y-5">
        <Skeleton className="h-14 w-full rounded-xl" />
        <Skeleton className="h-14 w-full rounded-xl" />
        <Skeleton className="h-14 w-full rounded-xl" />
      </div>
    </AuthCard>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginView />
    </Suspense>
  );
}
