"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { ROUTES } from "@/config/routes";
import { RouteGuard } from "@/features/auth/components/route-guard";
import { cn } from "@/lib/utils/cn";
import { AppSidebar } from "./app-sidebar";
import { AppFooter } from "./app-footer";
import { BreadcrumbLabelProvider, Breadcrumbs } from "./breadcrumbs";
import { SidebarProvider, useSidebar } from "./sidebar-context";
import { Topbar } from "./topbar";

function ShellFrame({ children }: { children: ReactNode }) {
  const { isCollapsed } = useSidebar();
  const pathname = usePathname();

  // The dashboard is the root of the panel, so a trail of one is just noise.
  const showBreadcrumbs = pathname !== ROUTES.superAdmin.dashboard;

  return (
    <div className="min-h-dvh bg-background">
      <AppSidebar />
      <div
        className={cn(
          "flex min-h-dvh flex-col transition-[padding] duration-200",
          isCollapsed ? "lg:pl-(--sidebar-width-collapsed)" : "lg:pl-(--sidebar-width)",
        )}
      >
        <Topbar />

        <main className="page-gutter flex-1 py-5">
          <div className="mx-auto w-full max-w-(--content-max-width) space-y-2">
            {showBreadcrumbs ? <Breadcrumbs /> : null}
            {children}
          </div>
        </main>

        <AppFooter />
      </div>
    </div>
  );
}

/**
 * The authenticated Super Admin shell.
 *
 * Guarding happens once, here, rather than in every page — a route inside the
 * shell can assume there is a session and an entitled role.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <RouteGuard returnTo={pathname}>
      <SidebarProvider>
        <BreadcrumbLabelProvider>
          <ShellFrame>{children}</ShellFrame>
        </BreadcrumbLabelProvider>
      </SidebarProvider>
    </RouteGuard>
  );
}
