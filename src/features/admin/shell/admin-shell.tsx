"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";
import { AdminProvider, useAdminContext } from "./admin-context";
import { AdminFooter } from "./admin-footer";
import { AdminSidebar } from "./admin-sidebar";
import { AdminTopbar } from "./admin-topbar";

function Shell({ children }: { children: ReactNode }) {
  const { isSidebarCollapsed } = useAdminContext();
  return <div className="admin-shell min-h-dvh bg-[#F5F8FC] text-[#172044]"><AdminSidebar /><div className={cn("flex min-h-dvh flex-col transition-[padding] duration-200", isSidebarCollapsed ? "lg:pl-[64px]" : "lg:pl-[220px]")}><AdminTopbar /><main className="mx-auto w-full max-w-[1536px] flex-1 px-4 py-5 sm:px-5 xl:px-6">{children}</main><AdminFooter /></div></div>;
}

export function AdminShell({ children }: { children: ReactNode }) { return <AdminProvider><Shell>{children}</Shell></AdminProvider>; }
