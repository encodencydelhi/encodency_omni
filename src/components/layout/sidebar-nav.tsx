"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { AnimatedIcon, type AnimatedIconName } from "@/components/shared/animated-icon";
import { SUPER_ADMIN_NAV, isNavItemActive } from "@/config/navigation";
import { useAuth } from "@/features/auth/components/auth-provider";
import { cn } from "@/lib/utils/cn";

interface SidebarNavProps {
  isCollapsed: boolean;
  onNavigate?: () => void;
}

const ICON_COLORS: Record<AnimatedIconName, string> = {
  dashboard: "text-sky-400",
  companies: "text-amber-400",
  users: "text-violet-400",
  clients: "text-orange-400",
  team: "text-indigo-400",
  plans: "text-purple-400",
  billing: "text-emerald-400",
  usage: "text-lime-400",
  integrations: "text-teal-400",
  health: "text-rose-400",
  jobs: "text-yellow-400",
  apiMonitoring: "text-cyan-400",
  webhooks: "text-fuchsia-400",
  flags: "text-red-400",
  audit: "text-amber-300",
  support: "text-pink-400",
  assistant: "text-violet-300",
  notifications: "text-yellow-300",
  settings: "text-blue-400",
};

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
                  <AnimatedIcon
                    name={item.animatedIcon}
                    active
                    className={cn(
                      "size-[16px] shrink-0 transition-[filter] group-hover:brightness-125",
                      ICON_COLORS[item.animatedIcon],
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
