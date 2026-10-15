"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Server, Timer } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useDashboard } from "./hooks";
import { formatRelative } from "./format";
import { Badge } from "./ui";

/** Same structure and styling as the Website module's shell: white header, status chips, hairline, text tabs. */
const TABS = [
  { href: "/admin/infrastructure", label: "Overview", exact: true },
  { href: "/admin/infrastructure/servers", label: "Servers & Hosting" },
  { href: "/admin/infrastructure/domains", label: "Domains & DNS" },
  { href: "/admin/infrastructure/certificates", label: "SSL Certificates" },
  { href: "/admin/infrastructure/billing", label: "Billing & Renewals" },
  { href: "/admin/infrastructure/providers", label: "Providers & Integrations" },
  { href: "/admin/infrastructure/alerts", label: "Alerts & History" },
  { href: "/admin/infrastructure/reports", label: "Reports" },
];

function activeHref(pathname: string): string {
  if (pathname.startsWith("/admin/infrastructure/assets")) return "/admin/infrastructure/servers";
  const hit = TABS.filter((t) => !t.exact && pathname.startsWith(t.href)).sort((a, b) => b.href.length - a.href.length)[0];
  return hit?.href ?? "/admin/infrastructure";
}

export function InfrastructureShell({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? "/admin/infrastructure";
  const dash = useDashboard();
  const d = dash.data;
  const t = d?.totals;
  const active = activeHref(pathname);

  return (
    <div className="pb-6">
      <div className="-mx-4 -mt-5 mb-1.5 border-b border-[#E3E9F2] bg-gradient-to-b from-[#FCFDFF] via-white to-[#FAFCFF] px-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)] sm:-mx-5 sm:px-5 xl:-mx-6 xl:px-6">
        <header className="space-y-2.5 pt-3.5">
          <div className="flex min-w-0 items-start gap-3">
            <span className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-[#EFF5FE] text-[#2563EB] ring-1 ring-[#DCE8FB]" aria-hidden>
              <Server className="size-7" />
            </span>
            <div className="min-w-0">
              <h1 className="text-[19px] font-semibold capitalize tracking-[-0.02em] text-[#0F1A38]">Servers &amp; Domains</h1>
              <p className="mt-0.5 text-[12px] font-medium capitalize text-[#64748B]">Servers, domains, DNS, certificates and renewals. A date is shown only when a source confirms it.</p>
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5 capitalize">
                {t && d ? (
                  <>
                    <Badge tone={t.servers === 0 ? "slate" : t.runningServers === t.servers ? "green" : t.runningServers > 0 ? "amber" : "red"} dot>{t.servers === 0 ? "No Servers" : t.runningServers === t.servers ? (t.servers === 1 ? "Server Live" : `${t.servers} Servers Live`) : `${t.runningServers}/${t.servers} Servers Live`}</Badge>
                    <Badge tone={t.servers === 0 ? "slate" : t.monitoredServers === t.servers ? "green" : t.monitoredServers > 0 ? "amber" : "slate"} dot>{t.monitoredServers === t.servers && t.servers > 0 ? (t.servers === 1 ? "Monitoring Live" : "All Monitored") : `${t.monitoredServers}/${t.servers} Monitored`}</Badge>
                    <Badge tone={t.domains === 0 ? "slate" : "blue"} dot>{t.domains} Domain{t.domains === 1 ? "" : "s"}</Badge>
                    {(d.certificateStates.EXPIRED ?? 0) > 0 ? (
                      <Badge tone="red" dot>{d.certificateStates.EXPIRED} SSL Expired</Badge>
                    ) : (d.certificateStates.EXPIRING ?? 0) > 0 ? (
                      <Badge tone="amber" dot>{d.certificateStates.EXPIRING} SSL Expiring</Badge>
                    ) : (d.certificateStates.VALID ?? 0) > 0 ? (
                      <Badge tone="green" dot>{d.certificateStates.VALID} SSL Valid</Badge>
                    ) : null}
                    {t.openAlerts > 0 ? <Badge tone="red" dot>{t.openAlerts} Open Alert{t.openAlerts === 1 ? "" : "s"}</Badge> : <Badge tone="green" dot>No Open Alerts</Badge>}
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium normal-case text-[#6B7A94]"><Timer className="size-3" aria-hidden />Updated {formatRelative(d.generatedAt)}</span>
                  </>
                ) : (
                  <span className="text-[11px] font-medium text-[#94A3B8]">Loading…</span>
                )}
              </div>
            </div>
          </div>
        </header>
        <div className="mt-2.5 border-t border-[#EEF2F8] pt-2.5">
          <nav aria-label="Servers and domains sections" className="scrollbar-thin -mb-px flex gap-5 overflow-x-auto">
            {TABS.map((tab) => {
              const isActive = tab.href === active;
              const count = tab.href.endsWith("/alerts") ? t?.openAlerts : undefined;
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "shrink-0 cursor-pointer whitespace-nowrap border-b-2 pb-2 text-[12px] font-semibold capitalize transition-colors",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]/35",
                    isActive ? "border-[#2563EB] text-[#1D4ED8]" : "border-transparent text-[#64748B] hover:text-[#28354C]",
                  )}
                >
                  {tab.label}
                  {count !== undefined && count > 0 ? (
                    <span className={cn("ml-1.5 rounded px-1 py-px text-[9.5px]", isActive ? "bg-[#EAF2FE] text-[#1D4ED8]" : "bg-[#F1F4F9] text-[#64748B]")}>{count}</span>
                  ) : null}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
      <div className="space-y-1 capitalize [&_.font-mono]:normal-case">{children}</div>
    </div>
  );
}
