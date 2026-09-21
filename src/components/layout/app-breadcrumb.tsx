"use client";

import { usePathname } from "next/navigation";
import { SUPER_ADMIN_NAV } from "@/config/navigation";
import { ROUTES } from "@/config/routes";
import { ChevronRight, LayoutGrid } from "lucide-react";
import Link from "next/link";
import { useSidebar } from "./sidebar-context";
import { cn } from "@/lib/utils/cn";

export function AppBreadcrumb() {
  const pathname = usePathname();
  const { isCollapsed } = useSidebar();
  let activeSection = null;
  let activeItem = null;

  for (const section of SUPER_ADMIN_NAV) {
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
  const baseLength = activeItem ? activeItem.href.split('/').filter(Boolean).length : 0;
  const nestedSegments = pathSegments.slice(baseLength);

  /** "cmp_namo-gange-trust" -> "namo gange trust"; record-id prefixes are not for people. */
  // Sub-pages of Feature Flags have names of their own; "all" alone would not say what it lists.
  const featureFlagPages: Record<string, string> = { all: "All Flags", rollouts: "Rollouts & Targeting", "company-access": "Company Access", changes: "Changes & Activity", settings: "Settings & Governance" };
  const inFeatureFlags = activeItem?.href === ROUTES.superAdmin.featureFlags;
  // A dotted feature key such as seo.advanced_audit stays exactly as written.
  const toLabel = (segment: string, index = 0) => {
    const decoded = decodeURIComponent(segment);
    if (inFeatureFlags && index === 0 && featureFlagPages[decoded]) return featureFlagPages[decoded];
    if (inFeatureFlags && decoded.includes(".")) return decoded;
    return decoded.replace(/^(cmp|prj|usr)_/, "").replace(/[-_]/g, " ");
  };

  return (
    <div className={cn(
      "fixed top-[56px] right-0 z-20 flex h-7 items-center border-b border-[#E2E8F0] bg-gradient-to-r from-white via-[#F8FAFC] to-white px-4 sm:px-6 lg:px-8 transition-[left] duration-200",
      isCollapsed ? "left-0 lg:left-[64px]" : "left-0 lg:left-[220px]"
    )}>
      <nav className="flex min-w-0 w-full overflow-x-auto whitespace-nowrap text-[12px] font-medium text-slate-500 [scrollbar-width:none]" aria-label="Breadcrumb">
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

          {/* Nested routes beyond the main navigation item: every level, the last one highlighted */}
          {activeItem &&
            nestedSegments.map((segment, index) => {
              const isLast = index === nestedSegments.length - 1;
              const href = `/${pathSegments.slice(0, baseLength + index + 1).join("/")}`;
              return (
                <li key={href}>
                  <div className="flex items-center">
                    <ChevronRight className="size-3.5 mx-0.5 text-slate-300" />
                    {isLast ? (
                      <span className="rounded-md px-2 py-1 text-slate-800 font-semibold capitalize bg-blue-50/50 shadow-sm border border-blue-100/50">
                        {toLabel(segment, index)}
                      </span>
                    ) : (
                      <Link
                        href={href}
                        className="rounded-md px-2 py-1 capitalize hover:bg-slate-100 hover:text-blue-600 transition-all duration-200"
                      >
                        {toLabel(segment, index)}
                      </Link>
                    )}
                  </div>
                </li>
              );
            })}

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
