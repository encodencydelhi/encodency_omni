"use client";

import { usePathname } from "next/navigation";
import { adminNavigation } from "@/config/admin-navigation";
import { ChevronRight, LayoutGrid } from "lucide-react";
import Link from "next/link";
import { useAdminContext } from "./admin-context";
import { cn } from "@/lib/utils/cn";
import { TooltipProvider } from "@/components/ui/tooltip";
import { InfrastructureLiveStatus } from "./infrastructure-live-status";
import { WebsiteLiveStatus } from "./website-live-status";

export function AdminBreadcrumb() {
  const pathname = usePathname();
  const { isSidebarCollapsed } = useAdminContext();
  let activeSection = null;
  let activeItem = null;

  for (const section of adminNavigation) {
    for (const item of section.items) {
      if (pathname === item.href || pathname.startsWith(`${item.href}/`)) {
        if (!activeItem || item.href.length > activeItem.href.length) {
          activeSection = section;
          activeItem = item;
        }
      }
    }
  }

  const pathSegments = pathname.split("/").filter(Boolean);
  const lastSegment = pathSegments.length > 0 ? pathSegments[pathSegments.length - 1] : "";

  return (
    <TooltipProvider delayDuration={120}>
      <div
        className={cn(
          "fixed top-[60px] right-0 z-20 flex h-8 items-center border-b border-slate-200/80 bg-white/95 backdrop-blur-xs px-3 sm:px-5 lg:px-6 transition-[left] duration-200",
          isSidebarCollapsed ? "left-0 lg:left-[64px]" : "left-0 lg:left-[220px]",
        )}
      >
        <nav
          className="flex text-[12px] font-medium text-slate-500 w-full items-center justify-between min-w-0"
          aria-label="Breadcrumb"
        >
          {/* Breadcrumb Trail (Left) */}
          <ol className="flex items-center space-x-1 sm:space-x-1.5 min-w-0 flex-1 overflow-hidden">
            {activeSection && (
              <li className="inline-flex items-center shrink-0">
                <div className="flex items-center gap-1.5 px-1.5 py-0.5">
                  <LayoutGrid className="size-3.5 text-slate-400" />
                  <span className="text-slate-500 font-medium">{activeSection.label}</span>
                </div>
              </li>
            )}

            {activeItem && (
              <li className="inline-flex items-center min-w-0">
                <div className="flex items-center min-w-0">
                  {activeSection && <ChevronRight className="size-3.5 mx-0.5 text-slate-300 shrink-0" />}
                  <Link
                    href={activeItem.href}
                    className="flex items-center gap-1.5 rounded px-1.5 py-0.5 hover:bg-slate-100 hover:text-blue-600 transition-colors min-w-0"
                  >
                    <activeItem.icon className="size-3.5 text-slate-400 shrink-0" />
                    <span
                      className={cn(
                        "truncate",
                        !lastSegment || pathSegments.length === activeItem.href.split("/").filter(Boolean).length
                          ? "text-slate-800 font-semibold"
                          : "text-slate-600",
                      )}
                    >
                      {activeItem.label}
                    </span>
                  </Link>
                </div>
              </li>
            )}

            {/* Nested routes beyond the main navigation item */}
            {activeItem && lastSegment && pathSegments.length > activeItem.href.split("/").filter(Boolean).length && (
              <li className="inline-flex items-center min-w-0">
                <div className="flex items-center min-w-0">
                  <ChevronRight className="size-3.5 mx-0.5 text-slate-300 shrink-0" />
                  <span className="rounded px-2 py-0.5 text-slate-800 font-semibold capitalize bg-slate-100/90 border border-slate-200/70 truncate text-[11.5px]">
                    {lastSegment.replace(/-/g, " ")}
                  </span>
                </div>
              </li>
            )}

            {!activeItem && pathSegments.length > 1 && lastSegment && (
              <li className="inline-flex items-center min-w-0">
                <div className="flex items-center min-w-0">
                  {(activeSection || activeItem) && (
                    <ChevronRight className="size-3.5 mx-0.5 text-slate-300 shrink-0" />
                  )}
                  <span className="rounded px-2 py-0.5 text-slate-800 font-semibold capitalize bg-slate-100/90 border border-slate-200/70 truncate text-[11.5px]">
                    {lastSegment.replace(/-/g, " ")}
                  </span>
                </div>
              </li>
            )}
          </ol>

          {/* Live Infrastructure & Website Status Pills (Right) */}
          <div className="ml-auto flex shrink-0 items-center gap-1 pl-2">
            <div className="hidden sm:block h-3.5 w-px bg-slate-200/80 mr-0.5" />
            <WebsiteLiveStatus />
            <InfrastructureLiveStatus />
          </div>
        </nav>
      </div>
    </TooltipProvider>
  );
}
