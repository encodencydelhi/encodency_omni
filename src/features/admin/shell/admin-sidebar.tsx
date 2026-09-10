"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useMemo } from "react";
import { ChevronRight, ChevronsLeft, Headphones, X } from "lucide-react";
import { adminNavigation } from "@/config/admin-navigation";
import { cn } from "@/lib/utils/cn";
import { useAdminContext } from "./admin-context";
import { ChannelLogo } from "../shared/channel-logo";
import logo from "@/assets/namogange.webp";

const brandLabels = new Set([
  "Meta & Instagram",
  "LinkedIn",
  "Google Business",
  "WhatsApp",
  "YouTube",
]);

const iconColors: Record<string, string> = {
  "Dashboard": "text-[#38BDF8]",
  "Clients": "text-[#3B82F6]",
  "Content Studio": "text-[#A78BFA]",
  "Calendar": "text-[#F472B6]",
  "Campaigns": "text-[#FB923C]",
  "Media Library": "text-[#2DD4BF]",
  "SEO Overview": "text-[#7DD3FC]",
  "Site Audit": "text-[#CBD5E1]",
  "Pages": "text-[#BAE6FD]",
};
function useActiveHref(pathname: string) {
  return useMemo(() => {
    const hrefs = adminNavigation.flatMap((section) =>
      section.items.map((item) => item.href),
    );
    return hrefs
      .filter((href) => pathname === href || pathname.startsWith(`${href}/`))
      .sort((a, b) => b.length - a.length)[0];
  }, [pathname]);
}

export function AdminSidebar() {
  const pathname = usePathname();
  const activeHref = useActiveHref(pathname);
  const { isSidebarCollapsed, toggleSidebar, isMobileNavOpen, setMobileNavOpen } =
    useAdminContext();

  return (
    <>
      {isMobileNavOpen && (
        <button
          className="fixed inset-0 z-40 bg-gray-950/50 backdrop-blur-sm lg:hidden"
          aria-label="Close navigation"
          onClick={() => setMobileNavOpen(false)}
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex bg-[#0B1121] transition-[width,transform] duration-200 lg:translate-x-0",
          "border-r border-[#1E293B] shadow-[1px_0_12px_rgb(0_0_0/0.5)]",
          isSidebarCollapsed ? "w-[64px]" : "w-[220px]",
          isMobileNavOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        {/* Glow effect in the background */}
        <div className="absolute top-0 left-0 right-0 h-[200px] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/20 via-transparent to-transparent pointer-events-none" />

        <div className="flex min-w-0 flex-1 flex-col relative z-10">
          {/* Brand */}
          <div
            className={cn(
              "flex h-[80px] shrink-0 items-center justify-center border-b border-white/5",
              isSidebarCollapsed ? "px-0" : "px-3",
            )}
          >
            {isSidebarCollapsed ? (
              <span className="grid size-8 place-items-center rounded-md bg-[#1E293B] text-[15px] font-bold text-white shadow-[0_0_10px_rgba(59,130,246,0.3)]">
                e
              </span>
            ) : (
              <>
                <Image
                  src={logo}
                  alt="Namo Gange Trust"
                  width={140}
                  height={56}
                  priority
                  sizes="160px"
                  className="h-[60px] w-auto min-w-0 max-w-full shrink object-contain drop-shadow-[0_0_8px_rgba(59,130,246,0.3)]"
                />
                <button
                  onClick={() => setMobileNavOpen(false)}
                  aria-label="Close navigation"
                  className="ml-2 grid size-7 shrink-0 place-items-center rounded-md text-[#64748B] transition-colors hover:bg-[#1E293B] hover:text-white lg:hidden"
                >
                  <X className="size-4" />
                </button>
              </>
            )}
          </div>

          {/* Navigation */}
          {/* Navigation */}
          <nav
            className="scrollbar-thin scrollbar-dark min-h-0 flex-1 overflow-y-auto px-3 py-4"
            aria-label="Admin navigation"
          >
            {adminNavigation.map((section, index) => (
              <div key={section.label} className={cn(index > 0 && "mt-5")}>
                {!isSidebarCollapsed ? (
                  <div className="flex items-center gap-3 px-2 mb-3">
                    <p className="text-[9.5px] font-bold uppercase tracking-widest text-[#7E8DA6]">
                      {section.label}
                    </p>
                    <div className="h-[1px] w-8 bg-[#1E293B]" />
                  </div>
                ) : (
                  index > 0 && <div className="mx-3 mb-3 border-t border-[#1E293B]" />
                )}
                <div className="space-y-1.5">
                  {section.items.map((item) => {
                    const active = item.href === activeHref;
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        aria-current={active ? "page" : undefined}
                        title={isSidebarCollapsed ? item.label : undefined}
                        onClick={() => setMobileNavOpen(false)}
                        className={cn(
                          "group flex h-[36px] items-center gap-3 rounded-xl border text-[12px] transition-all duration-200",
                          isSidebarCollapsed ? "justify-center px-0" : "px-3",
                          active
                            ? "border-[#2563EB]/50 bg-[#1E3A8A]/30 text-white shadow-[0_0_15px_rgba(59,130,246,0.2)]"
                            : "border-[#1E293B] bg-[#131C2F] font-medium text-[#E2E8F0] hover:border-[#334155] hover:bg-[#1E293B]",
                        )}
                      >
                        {brandLabels.has(item.label) ? (
                          <ChannelLogo
                            channel={item.label}
                            className="size-[18px] shrink-0 rounded-[4px]"
                          />
                        ) : (
                          <Icon
                            className={cn(
                              "size-[16px] shrink-0 transition-colors",
                              active
                                ? "text-[#38BDF8]"
                                : iconColors[item.label] || "text-[#94A3B8]",
                            )}
                          />
                        )}
                        {!isSidebarCollapsed && (
                          <>
                            <span className="truncate">{item.label}</span>
                            <ChevronRight className="size-3.5 ml-auto text-[#475569] group-hover:text-[#94A3B8] transition-colors" />
                          </>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>

          {/* Support */}
          {!isSidebarCollapsed ? (
            <button className="mx-3 mb-3 mt-1 flex h-[46px] shrink-0 items-center gap-3 rounded-xl border border-[#D946EF]/30 bg-[#D946EF]/10 px-3 text-left transition-all hover:border-[#D946EF]/60 shadow-[0_0_15px_rgba(217,70,239,0.1)] group">
              <span className="grid size-8 shrink-0 place-items-center">
                <Headphones className="size-4 text-[#D946EF]" />
              </span>
              <span className="min-w-0 flex-1">
                <b className="block truncate text-[11.5px] font-bold leading-tight text-white">
                  Help &amp; Support
                </b>
                <small className="block truncate text-[9px] leading-tight text-[#94A3B8] mt-0.5">
                  Need help? Contact us.
                </small>
              </span>
              <ChevronRight className="size-3.5 text-[#D946EF]/50 group-hover:text-[#D946EF] transition-colors" />
            </button>
          ) : (
            <div className="mb-3 flex shrink-0 justify-center" title="Help & Support">
              <span className="grid size-[36px] place-items-center rounded-xl border border-[#D946EF]/30 bg-[#D946EF]/10 shadow-[0_0_15px_rgba(217,70,239,0.1)]">
                <Headphones className="size-4 text-[#D946EF]" />
              </span>
            </div>
          )}

          <button
            onClick={toggleSidebar}
            aria-label={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            className={cn(
              "hidden h-12 shrink-0 items-center gap-3 border-t border-[#1E293B] text-[11.5px] font-medium text-[#94A3B8] transition-colors hover:bg-white/[0.02] hover:text-white lg:flex",
              isSidebarCollapsed ? "justify-center px-0" : "px-5",
            )}
          >
            <ChevronsLeft
              className={cn(
                "size-4 transition-transform duration-200",
                isSidebarCollapsed && "rotate-180",
              )}
            />
            {!isSidebarCollapsed && "Collapse sidebar"}
          </button>
        </div>
      </aside>
    </>
  );
}
