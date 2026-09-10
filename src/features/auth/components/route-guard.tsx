"use client";

import { ShieldAlertIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { REDIRECT_PARAM, ROUTES, canAccessSuperAdmin, resolveLandingRoute } from "@/config/routes";
import { useAuth } from "./auth-provider";
import { SessionBootScreen } from "./session-boot-screen";

interface RouteGuardProps {
  children: ReactNode;
  /** Path recorded so the user returns here after signing in. */
  returnTo?: string;
}

/**
 * Gate for the Super Admin shell.
 *
 * The proxy already blocks anonymous navigation; this guard covers what the
 * edge cannot know — whether the signed-in role is entitled to *this* panel,
 * and whether a session expired while the app was open.
 */
export function RouteGuard({ children, returnTo }: RouteGuardProps) {
  const { status, user } = useAuth();
  const router = useRouter();

  const isAllowed = canAccessSuperAdmin(user?.role);

  useEffect(() => {
    if (status !== "unauthenticated") return;

    const target = returnTo
      ? `${ROUTES.login}?${REDIRECT_PARAM}=${encodeURIComponent(returnTo)}`
      : ROUTES.login;

    router.replace(target);
  }, [returnTo, router, status]);

  if (status !== "authenticated") {
    return <SessionBootScreen />;
  }

  if (!isAllowed) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background px-6">
        <div className="w-full max-w-md rounded-xl border border-border bg-card">
          <EmptyState
            icon={ShieldAlertIcon}
            title="You do not have access to the Super Admin panel"
            description="This panel is limited to platform owners. Your account has an Admin workspace instead."
            action={
              <Button asChild className="mt-1">
                <Link href={resolveLandingRoute(user?.role)}>Go to my workspace</Link>
              </Button>
            }
          />
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
