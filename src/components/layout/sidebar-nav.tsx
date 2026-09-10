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
      className="flex-1 space-y-6 overflow-y-auto px-3 py-5 scrollbar-thin"
    >
      {groups.map((group) => (
        <div key={group.id} className="space-y-1">
          {isCollapsed ? (
            <div className="mx-2 h-px bg-sidebar-border" aria-hidden />
          ) : (
            <p className="px-3 pb-1.5 text-[0.625rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              {group.label}
            </p>
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
                    "group flex items-center gap-3 rounded-lg px-3 py-2 text-[0.8125rem] font-medium transition-colors",
                    isCollapsed && "justify-center px-0",
                    isActive
                      ? "bg-primary-subtle text-primary"
                      : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                  )}
                >
                  <item.icon
                    className={cn(
                      "size-4 shrink-0",
                      isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground",
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
