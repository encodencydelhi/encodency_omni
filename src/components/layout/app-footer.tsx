"use client";

import Link from "next/link";
import { useHealth } from "@/features/system-health/context/health-provider";
import { ROUTES } from "@/config/routes";
import { usePlatformIdentity } from "@/features/global-settings/data/hooks";
import { cn } from "@/lib/utils/cn";
import { useSidebar } from "./sidebar-context";

export function AppFooter() {
  const { globalStatus, isLoading } = useHealth();
  const identity = usePlatformIdentity();
  const { isCollapsed } = useSidebar();

  const isUp = globalStatus === "operational";
  const isPending = isLoading;

  return (
    <footer className={cn(
      "fixed bottom-0 right-0 z-50 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t border-slate-800 bg-slate-900/95 px-5 py-2.5 text-[12px] font-medium text-slate-400 backdrop-blur-md xl:px-8 shadow-[0_-4px_20px_rgba(0,0,0,0.1)] transition-[left] duration-200",
      isCollapsed ? "left-0 lg:left-[64px]" : "left-0 lg:left-[220px]"
    )}>
      <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
        <span className="flex items-center gap-1.5">
          <span className="bg-gradient-to-r from-red-500 to-rose-400 bg-clip-text font-bold tracking-wide text-transparent">
            {identity.shortName}
          </span>
        </span>
        <span className="h-3 w-px bg-slate-700" />
        <span>&copy; {new Date().getFullYear()} EnCodency Pvt. Ltd.</span>
      </div>

      <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-1">
        <Link href={ROUTES.superAdmin.systemHealth} className="flex items-center gap-1.5 transition-colors hover:text-slate-200 cursor-pointer">
          <span className="relative flex h-2 w-2">
            {!isPending && isUp && <span className="absolute inline-flex h-full w-full animate-ping rounded-sm bg-emerald-400 opacity-75"></span>}
            <span className={cn(
              "relative inline-flex h-2 w-2 rounded-sm",
              isPending ? "bg-slate-500" : isUp ? "bg-emerald-500" : "bg-amber-500"
            )}></span>
          </span>
          {isPending ? "Checking status..." : isUp ? "All systems operational" : "System issues detected"}
        </Link>
        <span className="h-3 w-px bg-slate-700" />
        <span className="flex gap-3">
          <Link href={ROUTES.superAdmin.support} className="transition-colors hover:text-white">Support</Link>
          <a href="#" className="transition-colors hover:text-white">Documentation</a>
          <a href="#" className="transition-colors hover:text-white">Terms</a>
        </span>
      </div>
    </footer>
  );
}
