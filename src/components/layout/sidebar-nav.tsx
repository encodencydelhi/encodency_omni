"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { SUPER_ADMIN_NAV, isNavItemActive } from "@/config/navigation";
import { useAuth } from "@/features/auth/components/auth-provider";
import { cn } from "@/lib/utils/cn";

interface SidebarNavProps {
  isCollapsed: boolean;
  onNavigate?: () => void;
}

export function SidebarNav({ isCollapsed, onNavigate }: SidebarNavProps) {
  const pathname = usePathname();
  const { can } = useAuth();

  // Groups whose every item is out of reach for this role disappear entirely,
  // rather than leaving an empty heading behind.
  const groups = SUPER_ADMIN_NAV.map((group) => ({
    ...group,
    items: group.items.filter((item) => can(item.permission)),
  })).filter((group) => group.items.length > 0);

  return (
    <nav
      aria-label="Super Admin sections"
      className="scrollbar-thin scrollbar-dark min-h-0 flex-1 space-y-2 overflow-y-auto px-3 py-2"
    >
      {groups.map((group) => (
        <div key={group.id} className="space-y-1">
          {isCollapsed ? (
            <div className="mx-2 h-px bg-slate-800/50" aria-hidden />
          ) : (
            <div className="flex items-center gap-3 px-3 mb-1 mt-2 first:mt-0">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                {group.label}
              </p>
            </div>
          )}

          <ul className="space-y-0.5">
            {group.items.map((item) => {
              const isActive = isNavItemActive(item, pathname);

              const link = (
                <Link
                  href={item.href}
                  onClick={onNavigate}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "group flex h-[28px] items-center gap-3 rounded-md text-[13px] transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
                    isCollapsed ? "justify-center px-0 w-[28px] mx-auto" : "px-3",
                    isActive
                      ? "bg-blue-900/40 text-blue-50 font-semibold shadow-sm border border-blue-800/50"
                      : "bg-transparent font-medium text-slate-400 hover:bg-slate-800/50 hover:text-slate-200 border border-transparent",
                  )}
                >
                  <item.icon
                    className={cn(
                      "size-[16px] shrink-0 transition-colors",
                      isActive ? "text-blue-400" : "text-slate-500 group-hover:text-slate-300",
                    )}
                  />
                  {!isCollapsed ? <span className="truncate">{item.label}</span> : null}
                </Link>
              );

              return (
                <li key={item.href}>
                  {isCollapsed ? (
                    <Tooltip>
                      <TooltipTrigger asChild>{link}</TooltipTrigger>
                      <TooltipContent side="right">{item.label}</TooltipContent>
                    </Tooltip>
                  ) : (
                    link
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
