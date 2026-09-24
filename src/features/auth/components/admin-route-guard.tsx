"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { REDIRECT_PARAM, ROUTES } from "@/config/routes";
import { useAuth } from "./auth-provider";
import { SessionBootScreen } from "./session-boot-screen";

/**
 * Gate for the Company Admin shell.
 *
 * The session cookie is HttpOnly and scoped to the API path, so pages cannot
 * (and should not) inspect it. Instead nothing renders until the backend has
 * confirmed the session through GET /users/me; an unauthenticated visitor is
 * sent to sign in. Which Company data they may see is decided per request by
 * the API (x-company-id is re-verified server-side every time).
 */
export function AdminRouteGuard({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (status !== "unauthenticated") return;
    const next = pathname ? `?${REDIRECT_PARAM}=${encodeURIComponent(pathname)}` : "";
    router.replace(`${ROUTES.login}${next}`);
  }, [pathname, router, status]);

  if (status !== "authenticated") return <SessionBootScreen />;
  return <>{children}</>;
}
