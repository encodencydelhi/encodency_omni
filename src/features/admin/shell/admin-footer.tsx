"use client";

import { useAdminContext } from "./admin-context";
import { cn } from "@/lib/utils/cn";
import { FooterLinks } from "@/components/layout/footer-links";
import { usePublicIdentity } from "@/features/global-settings/live/public-identity";
import { APP } from "@/config/app";

export function AdminFooter() {
  const { isSidebarCollapsed } = useAdminContext();
  const { data } = usePublicIdentity();
  const shortName = typeof data?.["identity.platform_short_name"] === "string" ? data["identity.platform_short_name"] as string : APP.shortName;
  // Wraps below ~500px so the footer never forces the page to scroll sideways.
  return (
    <footer className={cn(
      "fixed bottom-0 right-0 z-50 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t border-slate-800 bg-slate-900/95 px-5 py-2.5 text-[12px] font-medium text-slate-400 backdrop-blur-md xl:px-8 shadow-[0_-4px_20px_rgba(0,0,0,0.1)] transition-[left] duration-200",
      isSidebarCollapsed ? "left-0 lg:left-[64px]" : "left-0 lg:left-[220px]"
    )}>
      <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
        <span className="flex items-center gap-1.5">
          <span className="bg-gradient-to-r from-red-500 to-rose-400 bg-clip-text font-bold tracking-wide text-transparent">
            {shortName}
          </span>
        </span>
        <span className="h-3 w-px bg-slate-700" />
        <span>&copy; {new Date().getFullYear()} EnCodency Pvt. Ltd.</span>
      </div>

      <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-1">
        <span className="flex items-center gap-1.5 transition-colors hover:text-slate-200 cursor-pointer">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-sm bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex h-2 w-2 rounded-sm bg-emerald-500"></span>
          </span>
          All systems operational
        </span>
        <span className="h-3 w-px bg-slate-700" />
        <FooterLinks surface="admin" />
      </div>
    </footer>
  );
}
