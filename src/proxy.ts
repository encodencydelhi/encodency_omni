import { NextResponse, type NextRequest } from "next/server";
import { PROTECTED_ROUTE_ROOTS, REDIRECT_PARAM, ROUTES } from "@/config/routes";
import { SESSION_COOKIE } from "@/features/auth/services/session-store";

/**
 * Edge-level route protection for both authenticated panels.
 *
 * The check is intentionally shallow — presence of a session cookie — because
 * verification belongs to the API. It exists so an unauthenticated visitor
 * never sees a panel render before the client-side redirect, and so a signed-in
 * user is not shown the sign-in screen again.
 *
 * Which panel a role may actually open is decided after the session is read,
 * in the shell's route guard, where the role is known.
 */
export default function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const hasSession = Boolean(request.cookies.get(SESSION_COOKIE)?.value);

  const isAuthRoute = pathname === ROUTES.login || pathname === ROUTES.forgotPassword;
  const isProtectedRoute = PROTECTED_ROUTE_ROOTS.some(
    (root) => pathname === root || pathname.startsWith(`${root}/`),
  );

  if (isProtectedRoute && !hasSession) {
    const loginUrl = new URL(ROUTES.login, request.url);
    loginUrl.searchParams.set(REDIRECT_PARAM, `${pathname}${search}`);
    return NextResponse.redirect(loginUrl);
  }

  // A signed-in user hitting the sign-in screen goes to the panel their role
  // owns. The landing decision needs the role, so it happens on the client.
  if (isAuthRoute && hasSession) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/login", "/forgot-password", "/super-admin/:path*", "/admin/:path*"],
};
