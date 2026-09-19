"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";
import { USERS_MODULE_NAV } from "../data/config";
import { useUserKpis } from "../data/hooks";

export function UsersNav() {
  const pathname = usePathname();
  const { data: kpis } = useUserKpis();

  return (
    <nav
      aria-label="Users module sections"
      className="border-b border-border/80 pb-0 mb-3 overflow-x-auto scrollbar-none"
    >
      <ul className="flex items-center gap-1 min-w-max">
        {USERS_MODULE_NAV.map((item) => {
          const isActive =
            item.href === "/super-admin/users"
              ? pathname === "/super-admin/users"
              : pathname.startsWith(item.href);

          let badgeCount: number | undefined;
          if (item.id === "all" && kpis) badgeCount = kpis.totalUsers;
          if (item.id === "invitations" && kpis) badgeCount = kpis.pendingInvites;
          if (item.id === "security" && kpis && kpis.needsAttentionCount > 0)
            badgeCount = kpis.needsAttentionCount;

          return (
            <li key={item.id}>
              <Link
                href={item.href}
                className={cn(
                  "relative inline-flex items-center gap-1.5 px-3 py-2 text-[13px] font-medium transition-colors outline-hidden",
                  isActive
                    ? "text-blue-600 font-semibold"
                    : "text-slate-600 hover:text-slate-900",
                )}
              >
                <span>{item.label}</span>
                {badgeCount !== undefined && badgeCount > 0 && (
                  <span
                    className={cn(
                      "rounded-full px-1.5 py-0.2 text-xs font-semibold",
                      isActive
                        ? "bg-blue-100 text-blue-700"
                        : "bg-slate-100 text-slate-600",
                    )}
                  >
                    {badgeCount}
                  </span>
                )}
                {isActive && (
                  <span
                    className="absolute inset-x-0 -bottom-px h-0.5 bg-blue-600"
                    aria-hidden
                  />
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
