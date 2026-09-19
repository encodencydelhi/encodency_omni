/**
 * EnCodency OmniPlatform - Super Admin Integrations Module
 * Internal Navigation Tabs
 */

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";
import { INTEGRATIONS_MODULE_NAV } from "../data/config";
import { useIntegrationIssues, useIntegrationsKpis } from "../data/hooks";

export function IntegrationsNav() {
  const pathname = usePathname();
  const { data: kpis } = useIntegrationsKpis();
  const { data: issues } = useIntegrationIssues();

  const openIssuesCount = issues?.filter((i) => i.status !== "resolved").length ?? 0;

  return (
    <nav
      aria-label="Integrations module navigation"
      className="border-b border-border/80 pb-0 mb-3 overflow-x-auto scrollbar-none"
    >
      <ul className="flex items-center gap-1 min-w-max">
        {INTEGRATIONS_MODULE_NAV.map((item) => {
          const isActive =
            item.href === "/super-admin/integrations"
              ? pathname === "/super-admin/integrations"
              : pathname.startsWith(item.href);

          let badgeCount: number | undefined;
          if (item.id === "providers" && kpis) badgeCount = kpis.totalProviders;
          if (item.id === "connections" && kpis) badgeCount = kpis.activeConnections;
          if (item.id === "issues" && openIssuesCount > 0) badgeCount = openIssuesCount;

          return (
            <li key={item.id}>
              <Link
                href={item.href}
                className={cn(
                  "relative inline-flex items-center gap-2 px-3.5 py-2.5 text-xs font-medium transition-colors outline-hidden",
                  isActive
                    ? "text-blue-600 font-semibold"
                    : "text-slate-600 hover:text-slate-900"
                )}
              >
                <item.icon className={cn("size-3.5", isActive ? "text-blue-600" : "text-slate-400")} />
                <span>{item.label}</span>
                {badgeCount !== undefined && badgeCount > 0 && (
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-xs font-semibold leading-none",
                      item.id === "issues" && openIssuesCount > 0
                        ? "bg-amber-100 text-amber-800"
                        : isActive
                        ? "bg-blue-100 text-blue-700"
                        : "bg-slate-100 text-slate-600"
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
