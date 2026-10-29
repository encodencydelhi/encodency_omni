"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useMemo, useState, useEffect } from "react";
import { ChevronRight, ChevronsLeft, X } from "lucide-react";
import { adminNavigation } from "@/config/admin-navigation";
import { cn } from "@/lib/utils/cn";
import { useAdminContext } from "./admin-context";
import { ChannelLogo } from "../shared/channel-logo";
import { Clientswitcher } from "./project-switcher";
import { UnderConstructionLottie } from "./under-construction-icon";
import logo from "@/assets/namogange.webp";

function SidebarBrandLogo({
  logoUrl,
  name,
}: {
  logoUrl: string;
  name?: string;
}) {
  const [aspectRatio, setAspectRatio] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    const img = new window.Image();
    img.src = logoUrl;
    img.onload = () => {
      if (active && img.naturalHeight > 0) {
        setAspectRatio(img.naturalWidth / img.naturalHeight);
      }
    };
    return () => {
      active = false;
    };
  }, [logoUrl]);

  // Square or compact logo (< 1.8 ratio):
  // Render sleek icon badge + Company Name + Workspace subtitle so it fills the sidebar width
  if (aspectRatio !== null && aspectRatio < 1.8) {
    return (
      <div className="flex items-center gap-2.5 min-w-0 flex-1 px-1">
        <div className="size-11 rounded-xl bg-white/5 border border-white/10 p-1.5 flex items-center justify-center shrink-0 shadow-[0_0_12px_rgba(59,130,246,0.2)] overflow-hidden">
          <img
            src={logoUrl}
            alt={name || "Company Logo"}
            className="size-full object-contain"
          />
        </div>
        <div className="min-w-0 flex-1 text-left">
          <div className="text-[13px] font-bold text-white tracking-tight truncate leading-snug">
            {name || "Organization"}
          </div>
          <div className="text-[9.5px] text-[#94A3B8] font-medium truncate uppercase tracking-wider mt-0.5">
            Workspace
          </div>
        </div>
      </div>
    );
  }

  // Wide horizontal banner logo (>= 1.8 ratio or initial fallback)
  return (
    <div className="flex items-center justify-center max-w-full min-w-0">
      <img
        src={logoUrl}
        alt={name || "Company Logo"}
        className="h-[52px] max-w-[170px] w-auto shrink object-contain drop-shadow-[0_0_8px_rgba(59,130,246,0.3)]"
      />
    </div>
  );
}

const brandLabels = new Set([
  "Meta & Instagram",
  "LinkedIn",
  "Google Business",
  "WhatsApp",
  "YouTube",
  "X (Twitter)",
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
  const { organization, isSidebarCollapsed, toggleSidebar, isMobileNavOpen, setMobileNavOpen } =
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
              organization.logo ? (
                <span className="grid size-9 place-items-center rounded-lg bg-white/5 p-1 border border-white/10 shadow-[0_0_10px_rgba(59,130,246,0.2)]">
                  <img
                    src={organization.logo}
                    alt={organization.name || "Company Logo"}
                    className="size-full object-contain"
                  />
                </span>
              ) : (
                <span className="grid size-8 place-items-center rounded-sm bg-[#1E293B] text-[15px] font-semibold text-white shadow-[0_0_10px_rgba(59,130,246,0.3)]">
                  {organization.name ? organization.name.charAt(0).toUpperCase() : "e"}
                </span>
              )
            ) : (
              <>
                <div className="flex items-center justify-center max-w-full min-w-0 flex-1">
                  {organization.logo ? (
                    <SidebarBrandLogo
                      logoUrl={organization.logo}
                      name={organization.name}
                    />
                  ) : (
                    <Image
                      src={logo}
                      alt={organization.name || "Company logo"}
                      width={140}
                      height={56}
                      priority
                      sizes="160px"
                      className="h-[60px] w-auto min-w-0 max-w-full shrink object-contain drop-shadow-[0_0_8px_rgba(59,130,246,0.3)]"
                    />
                  )}
                </div>
                <button
                  onClick={() => setMobileNavOpen(false)}
                  aria-label="Close navigation"
                  className="ml-2 grid size-7 shrink-0 place-items-center rounded-sm text-[#64748B] transition-colors hover:bg-[#1E293B] hover:text-white lg:hidden"
                >
                  <X className="size-4" />
                </button>
              </>
            )}
          </div>

          {/* Project Switcher */}
          {!isSidebarCollapsed && (
            <div className="px-3 pt-3 pb-1">
              <div className="text-black">
                <Clientswitcher />
              </div>
            </div>
          )}

          {/* Navigation */}
          <nav
            className="scrollbar-thin scrollbar-dark min-h-0 flex-1 overflow-y-auto px-3 py-1"
            aria-label="Admin navigation"
          >
            {adminNavigation.map((section, index) => (
              <div key={section.label} className={cn(index > 0 && "mt-1")}>
                {!isSidebarCollapsed ? (
                  <div className="flex items-center gap-3 px-2 mb-0.5">
                    <p className="text-[12px] font-semibold uppercase tracking-widest text-[#7E8DA6]">
                      {section.label}
                    </p>
                    <div className="h-[1px] w-8 bg-[#1E293B]" />
                  </div>
                ) : (
                  index > 0 && <div className="mx-3 mb-0.5 border-t border-[#1E293B]" />
                )}
                <div className="space-y-0.5">
                  {section.items.map((item) => {
                    const active = item.href === activeHref;
                    const Icon = item.icon;

                    // Under construction: shown, dimmed, with the animated icon, but not a link: nobody can open it from the sidebar.
                    if (item.underConstruction) {
                      return (
                        <div
                          key={item.href}
                          role="link"
                          aria-disabled="true"
                          title={`${item.label} is under construction`}
                          className={cn(
                            "flex h-[30px] cursor-not-allowed select-none items-center gap-3 rounded-sm border border-transparent text-[12px] font-medium text-[#64748B]",
                            isSidebarCollapsed ? "justify-center px-0" : "px-3",
                          )}
                        >
                          <span className="relative grid shrink-0 place-items-center">
                            {brandLabels.has(item.label) ? (
                              <ChannelLogo channel={item.label} className="size-[18px] shrink-0 rounded-[4px] opacity-35 grayscale" />
                            ) : (
                              <Icon className="size-[16px] shrink-0 text-[#475569]" />
                            )}
                            {isSidebarCollapsed && <UnderConstructionLottie size={14} style={{ position: "absolute", right: -8, bottom: -6 }} />}
                          </span>
                          {!isSidebarCollapsed && (
                            <>
                              <span className="truncate">{item.label}</span>
                              <UnderConstructionLottie size={18} className="ml-auto" />
                            </>
                          )}
                          <span className="sr-only">Under construction</span>
                        </div>
                      );
                    }

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        aria-current={active ? "page" : undefined}
                        title={isSidebarCollapsed ? item.label : undefined}
                        onClick={() => setMobileNavOpen(false)}
                        className={cn(
                          "group flex h-[30px] items-center gap-3 rounded-sm border text-[12px] transition-all duration-200",
                          isSidebarCollapsed ? "justify-center px-0" : "px-3",
                          active
                            ? "border-[#2563EB]/40 bg-[#1E3A8A]/50 text-white shadow-[0_0_20px_rgba(59,130,246,0.25)]"
                            : "border-transparent bg-transparent font-medium text-[#E2E8F0] hover:border-[#334155] hover:bg-[#1E293B]",
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
                            {active && <ChevronRight className="size-3.5 ml-auto text-white/70" />}
                          </>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>


          <button
            onClick={toggleSidebar}
            aria-label={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            className={cn(
              "hidden h-12 shrink-0 items-center gap-3 border-t border-[#1E293B] text-[12px] font-medium text-[#94A3B8] transition-colors hover:bg-white/[0.02] hover:text-white lg:flex",
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
