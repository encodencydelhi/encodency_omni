"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils/cn";
import { ROUTES } from "@/config/routes";
import { SECTIONS, routes } from "../data/config";
import type { SectionKey } from "../data/types";

export function activeSection(pathname: string): SectionKey {
  const rest = pathname.replace(ROUTES.superAdmin.settings, "").replace(/^\/+|\/+$/g, "");
  return SECTIONS.find((section) => (section.slug ?? "") === rest)?.key ?? "identity";
}

/**
 * The compact section navigator inside the content area (the application's own
 * sidebar is untouched). A vertical list on desktop; below `lg` it becomes one
 * horizontally scrolling row so the page never grows a second sidebar.
 */
export function SettingsNav({ pendingCount }: { pendingCount: number }) {
  const pathname = usePathname();
  const current = activeSection(pathname);

  return (
    <nav aria-label="Settings sections" className="min-w-0">
      <ul className="flex gap-0.5 overflow-x-auto pb-1 scrollbar-thin lg:flex-col lg:overflow-visible lg:pb-0">
        {SECTIONS.map((section) => {
          const active = section.key === current;
          const Icon = section.icon;
          return (
            <li key={section.key} className="shrink-0 lg:shrink">
              <Link
                href={routes.section(section.key)}
                aria-current={active ? "page" : undefined}
                title={section.description}
                className={cn(
                  "flex items-center gap-2 rounded-sm border border-transparent px-2.5 py-1.5 text-[0.8125rem] font-medium whitespace-nowrap transition-colors",
                  active ? "border-border bg-card text-foreground shadow-xs lg:border-l-2 lg:border-l-primary" : "text-muted-foreground hover:bg-accent hover:text-foreground",
                )}
              >
                <Icon className={cn("size-4 shrink-0", active ? "text-primary" : "")} aria-hidden />
                <span className="lg:truncate">{section.label}</span>
                {section.key === "history" && pendingCount > 0 ? <Badge tone="warning" className="ml-auto px-1.5 py-0">{pendingCount}</Badge> : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
