"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { RouteGuard } from "@/features/auth/components/route-guard";
import { cn } from "@/lib/utils/cn";
import { AppSidebar } from "./app-sidebar";
import { AppFooter } from "./app-footer";
import { AppBreadcrumb } from "./app-breadcrumb";
import { SidebarProvider, useSidebar } from "./sidebar-context";
import { Topbar } from "./topbar";
import { HealthProvider } from "@/features/system-health/context/health-provider";

function ShellFrame({ children }: { children: ReactNode }) {
  const { isCollapsed } = useSidebar();

  return (
    <div className="min-h-dvh bg-[#F5F8FC] text-[#172044] overflow-x-clip max-w-full">
      <AppSidebar />
      <div
        className={cn(
          "flex min-h-dvh flex-col transition-[padding] duration-200 min-w-0 max-w-full overflow-x-clip",
          isCollapsed ? "lg:pl-[64px]" : "lg:pl-[220px]",
        )}
      >
        <Topbar />
        <AppBreadcrumb />

        <main className="w-full flex-1 min-w-0 max-w-full px-4 py-4 sm:px-5 xl:px-6">
          {children}
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
        <HealthProvider>
          <ShellFrame>{children}</ShellFrame>
        </HealthProvider>
      </SidebarProvider>
    </RouteGuard>
  );
}
