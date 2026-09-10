"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useMemo } from "react";
import { ChevronLeft, Headphones, X } from "lucide-react";
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
          "fixed inset-y-0 left-0 z-50 flex bg-[#283647] transition-[width,transform] duration-200 lg:translate-x-0",
          "border-r border-[#3A4B5E] shadow-[1px_0_12px_rgb(2_6_23/0.35)]",
          isSidebarCollapsed ? "w-[64px]" : "w-[220px]",
          isMobileNavOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Brand */}
          <div
            className={cn(
              "flex h-[72px] shrink-0 items-center justify-center border-b border-[#3A4B5E] bg-white",
              isSidebarCollapsed ? "px-0" : "px-3",
            )}
          >
            {isSidebarCollapsed ? (
              <span className="grid size-8 place-items-center rounded-md bg-[#F1F5F9] text-[15px] font-bold text-[#0F172A]">
                e
              </span>
            ) : (
              <>
                <Image
                  src={logo}
                  alt="Namo Gange Trust"
                  width={120}
                  height={49}
                  priority
                  sizes="160px"
                  className="h-[58px] w-auto min-w-0 max-w-full shrink object-contain"
                />
                <button
                  onClick={() => setMobileNavOpen(false)}
                  aria-label="Close navigation"
                  className="ml-2 grid size-7 shrink-0 place-items-center rounded-md text-[#64748B] transition-colors hover:bg-[#F1F5F9] hover:text-[#0F172A] lg:hidden"
                >
                  <X className="size-4" />
                </button>
              </>
            )}
          </div>

          {/* Navigation */}
          <nav
            className="scrollbar-thin scrollbar-dark min-h-0 flex-1 overflow-y-auto py-3"
            aria-label="Admin navigation"
          >
            {adminNavigation.map((section, index) => (
              <div key={section.label} className={cn(index > 0 && "mt-3.5")}>
                {!isSidebarCollapsed ? (
                  <p className="mb-1 px-4 text-[8.5px] font-bold uppercase tracking-[0.14em] text-[#5A6B85]">
                    {section.label}
                  </p>
                ) : (
                  index > 0 && <div className="mx-3 mb-2.5 border-t border-[#3A4B5E]" />
                )}
                <div className="space-y-px">
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
                          "group relative flex h-[31px] items-center gap-2.5 rounded-md text-[11.5px] transition-colors",
                          isSidebarCollapsed ? "justify-center mx-2 px-0" : "mx-2 px-2.5",
                          active
                            ? "bg-[#1A2634] font-semibold text-white"
                            : "font-medium text-[#98A6BE] hover:bg-white/[0.055] hover:text-[#E6EBF3]",
                        )}
                      >
                        {active && (
                          <span className="absolute -left-2 top-1/2 h-[16px] w-[3px] -translate-y-1/2 rounded-r-full bg-[#EB0711]" />
                        )}
                        {brandLabels.has(item.label) ? (
                          <ChannelLogo
                            channel={item.label}
                            className="size-[16px] shrink-0 rounded-[4px] shadow-[0_1px_2px_rgb(2_6_23/0.4)]"
                          />
                        ) : (
                          <Icon
                            className={cn(
                              "size-[15px] shrink-0 transition-colors",
                              active
                                ? "text-[#EB0711]"
                                : "text-[#6B7A94] group-hover:text-[#98A6BE]",
                            )}
                          />
                        )}
                        {!isSidebarCollapsed && <span className="truncate">{item.label}</span>}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>

          {/* Support */}
          {!isSidebarCollapsed ? (
            <button className="mx-2.5 mb-2 flex shrink-0 items-center gap-2.5 rounded-lg border border-[#3A4B5E] bg-white/[0.035] px-2.5 py-2 text-left transition-colors hover:border-[#4B5E73] hover:bg-white/[0.07]">
              <span className="grid size-7 shrink-0 place-items-center rounded-md bg-[#EB0711]/15">
                <Headphones className="size-3.5 text-[#F26D74]" />
              </span>
              <span className="min-w-0">
                <b className="block truncate text-[10.5px] font-bold leading-4 text-[#E6EBF3]">
                  Help &amp; Support
                </b>
                <small className="block truncate text-[8.5px] leading-3 text-[#6B7A94]">
                  Need help? Contact us.
                </small>
              </span>
            </button>
          ) : (
            <div className="mb-2 flex shrink-0 justify-center" title="Help & Support">
              <span className="grid size-8 place-items-center rounded-md bg-[#EB0711]/15">
                <Headphones className="size-4 text-[#F26D74]" />
              </span>
            </div>
          )}

          <button
            onClick={toggleSidebar}
            aria-label={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            className={cn(
              "hidden h-9 shrink-0 items-center gap-2 border-t border-[#3A4B5E] text-[10px] font-semibold text-[#6B7A94] transition-colors hover:bg-white/[0.055] hover:text-[#E6EBF3] lg:flex",
              isSidebarCollapsed ? "justify-center px-0" : "px-4",
            )}
          >
            <ChevronLeft
              className={cn(
                "size-3.5 transition-transform duration-200",
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
