"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { AlertBanner } from "@/components/shared/alert-banner";
import { cn } from "@/lib/utils/cn";
import { MODULE_TABS, activeModuleTab } from "../data/config";
import { useEnvironment } from "./environment";

/**
 * The compact module navigation shared by every Feature Flags route. Each tab is
 * a real URL that keeps the selected environment, so refresh, Back and Forward land
 * where they were, and the parent sidebar item stays active throughout.
 */
export function ModuleFrame({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const current = activeModuleTab(pathname);
  const { environment, invalid, set } = useEnvironment();

  return (
    <div className="space-y-3">
      <nav aria-label="Feature flags" className="overflow-x-auto border-b border-border scrollbar-thin">
        <ul className="flex min-w-max gap-0.5">
          {MODULE_TABS.map((tab) => {
            const active = tab.key === current;
            return (
              <li key={tab.key}>
                <Link
                  href={tab.href(environment)}
                  aria-current={active ? "page" : undefined}
                  className={cn("relative inline-flex items-center px-3 py-2 text-[0.8125rem] font-medium transition-colors", active ? "text-foreground" : "text-muted-foreground hover:text-foreground")}
                >
                  {tab.label}
                  {active ? <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-sm bg-primary" aria-hidden /> : null}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      {invalid ? (
        <AlertBanner tone="warning" title="Unknown Environment" action={<button type="button" className="text-2xs font-medium text-primary hover:underline" onClick={() => set("production")}>Use Production</button>}>
          &ldquo;{invalid}&rdquo; is not an environment. Showing Production instead.
        </AlertBanner>
      ) : null}
      {children}
    </div>
  );
}
