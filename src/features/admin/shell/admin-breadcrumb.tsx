"use client";

import { usePathname } from "next/navigation";
import { adminNavigation } from "@/config/admin-navigation";
import { ChevronRight, LayoutGrid } from "lucide-react";
import Link from "next/link";
import { useAdminContext } from "./admin-context";
import { cn } from "@/lib/utils/cn";

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

  const pathSegments = pathname.split('/').filter(Boolean);
  const lastSegment = pathSegments.length > 0 ? pathSegments[pathSegments.length - 1] : "";

  return (
    <div className={cn(
      "fixed top-[60px] right-0 z-20 flex h-8 items-center border-b border-[#E2E8F0] bg-gradient-to-r from-white via-[#F8FAFC] to-white px-4 sm:px-6 lg:px-8 transition-[left] duration-200",
      isSidebarCollapsed ? "left-0 lg:left-[64px]" : "left-0 lg:left-[220px]"
    )}>
      <nav className="flex text-[12px] font-medium text-slate-500 w-full" aria-label="Breadcrumb">
        <ol className="inline-flex items-center space-x-1.5 md:space-x-2.5 w-full">
          {activeSection && (
            <li className="inline-flex items-center">
              <div className="flex items-center gap-1.5 px-2 py-1">
                <LayoutGrid className="size-3.5 text-slate-400" />
                <span className="text-slate-500 font-medium">{activeSection.label}</span>
              </div>
            </li>
          )}

          {activeItem && (
            <li>
              <div className="flex items-center">
                {activeSection && <ChevronRight className="size-3.5 mx-0.5 text-slate-300" />}
                <Link
                  href={activeItem.href}
                  className="flex items-center gap-1.5 rounded-md px-2 py-1 hover:bg-slate-100 hover:text-blue-600 transition-all duration-200"
                >
                  <activeItem.icon className="size-3.5" />
                  <span className={(!lastSegment || pathSegments.length === activeItem.href.split('/').filter(Boolean).length) ? "text-slate-800 font-semibold" : ""}>
                    {activeItem.label}
                  </span>
                </Link>
              </div>
            </li>
          )}

          {/* For nested routes beyond the main navigation item */}
          {activeItem && lastSegment && pathSegments.length > activeItem.href.split('/').filter(Boolean).length && (
            <li>
              <div className="flex items-center">
                <ChevronRight className="size-3.5 mx-0.5 text-slate-300" />
                <span className="rounded-md px-2 py-1 text-slate-800 font-semibold capitalize bg-blue-50/50 shadow-sm border border-blue-100/50">
                  {lastSegment.replace(/-/g, ' ')}
                </span>
              </div>
            </li>
          )}

          {!activeItem && pathSegments.length > 1 && lastSegment && (
            <li>
              <div className="flex items-center">
                {(activeSection || activeItem) && <ChevronRight className="size-3.5 mx-0.5 text-slate-300" />}
                <span className="rounded-md px-2 py-1 text-slate-800 font-semibold capitalize bg-blue-50/50 shadow-sm border border-blue-100/50">
                  {lastSegment.replace(/-/g, ' ')}
                </span>
              </div>
            </li>
          )}
        </ol>
      </nav>
    </div>
  );
}
