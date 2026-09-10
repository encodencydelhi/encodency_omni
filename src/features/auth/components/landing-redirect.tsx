"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { ROUTES, resolveLandingRoute } from "@/config/routes";
import { useAuth } from "./auth-provider";
import { SessionBootScreen } from "./session-boot-screen";

/**
 * Sends a visitor to the right place once the session is known: their panel if
 * they are signed in, the sign-in screen if they are not.
 */
export function LandingRedirect() {
  const { status, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status === "loading") return;
    router.replace(status === "authenticated" ? resolveLandingRoute(user?.role) : ROUTES.login);
  }, [router, status, user?.role]);

  return <SessionBootScreen />;
}
