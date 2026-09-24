"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";
import { AdminRouteGuard } from "@/features/auth/components/admin-route-guard";
import { AdminProvider, useAdminContext } from "./admin-context";
import { AdminFooter } from "./admin-footer";
import { AdminSidebar } from "./admin-sidebar";
import { AdminTopbar } from "./admin-topbar";

import { AdminBreadcrumb } from "./admin-breadcrumb";

/**
 * Routes that take over the whole viewport: no admin sidebar, topbar or footer.
 * Immersive builders (the Meta Ads Manager campaign wizard) own their own chrome
 * and close back into their workspace.
 */
const FULLSCREEN_ROUTES = [
  "/admin/meta/ads/create",
  "/admin/meta/ads-manager/create",
];

function isFullscreenRoute(pathname: string | null) {
  if (!pathname) return false;
  return FULLSCREEN_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}

function Shell({ children }: { children: ReactNode }) {
  const { isSidebarCollapsed } = useAdminContext();
  const pathname = usePathname();

  if (isFullscreenRoute(pathname)) {
    return (
      <div className="admin-shell h-dvh w-full overflow-hidden bg-[#F5F8FC] text-[#172044]">
        {children}
      </div>
    );
  }

  return (
    <div className="admin-shell min-h-dvh bg-[#F5F8FC] text-[#172044]">
      <AdminSidebar />
      <div className={cn("flex min-h-dvh flex-col transition-[padding] duration-200", isSidebarCollapsed ? "lg:pl-[64px]" : "lg:pl-[220px]")}>
        <AdminTopbar />
        <AdminBreadcrumb />
        <main className="w-full flex-1 px-4 py-5 sm:px-5 xl:px-6">{children}</main>
        <AdminFooter />
      </div>
    </div>
  );
}

export function AdminShell({ children }: { children: ReactNode }) { 
  return (
    // Signed-in check from the server session (GET /users/me); unauthenticated visitors go to /login.
    <AdminRouteGuard>
      <AdminProvider>
        <Shell>{children}</Shell>
      </AdminProvider>
    </AdminRouteGuard>
  ); 
}
