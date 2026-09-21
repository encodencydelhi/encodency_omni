"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";
import { MODULE_TABS, activeModuleTab } from "../data/config";

/**
 * The compact module navigation shared by every Audit Logs route. Each tab is a real URL, so
 * refresh, Back and Forward land where they were, and the parent sidebar item stays active.
 */
export function ModuleFrame({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const current = activeModuleTab(pathname);
  return (
    <div className="space-y-3">
      <nav aria-label="Audit logs" className="overflow-x-auto border-b border-border scrollbar-thin">
        <ul className="flex min-w-max gap-0.5">
          {MODULE_TABS.map((tab) => {
            const active = tab.key === current;
            return (
              <li key={tab.key}>
                <Link href={tab.href} aria-current={active ? "page" : undefined} className={cn("relative inline-flex items-center px-3 py-2 text-[0.8125rem] font-medium transition-colors", active ? "text-foreground" : "text-muted-foreground hover:text-foreground")}>
                  {tab.label}
                  {active ? <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-sm bg-primary" aria-hidden /> : null}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      {children}
    </div>
  );
}
