"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Building2, ChevronDown, ChevronLeft, Headphones, X } from "lucide-react";
import { adminNavigation } from "@/config/admin-navigation";
import { cn } from "@/lib/utils/cn";
import { useAdminContext } from "./admin-context";
import { ChannelLogo } from "../shared/channel-logo";

const brandLabels = new Set(["Meta & Instagram", "LinkedIn", "Google Business", "WhatsApp", "YouTube"]);

export function AdminSidebar() {
  const pathname = usePathname();
  const { isSidebarCollapsed, toggleSidebar, isMobileNavOpen, setMobileNavOpen } = useAdminContext();
  return (
    <>
      {isMobileNavOpen && <button className="fixed inset-0 z-40 bg-slate-950/25 backdrop-blur-[1px] lg:hidden" aria-label="Close navigation" onClick={() => setMobileNavOpen(false)} />}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 flex border-r border-[#E7E5E2] bg-[#FCFBFA] transition-[width,transform] duration-200 lg:translate-x-0",
        isSidebarCollapsed ? "w-[72px]" : "w-[236px]", isMobileNavOpen ? "translate-x-0" : "-translate-x-full",
      )}>
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="relative flex h-[64px] shrink-0 items-center overflow-hidden bg-[#ED0013]">
            {isSidebarCollapsed ? (
              <div className="grid w-full place-items-center text-xl font-bold text-white">e</div>
            ) : (
              <div className="relative h-full min-w-0 flex-1">
                <Image src="/encodency-logo.jpg" alt="EnCodency Pvt. Ltd. — Raise the Bar" fill priority sizes="236px" className="object-contain object-center p-2" />
              </div>
            )}
            <button className="absolute right-1 top-1 grid size-7 place-items-center rounded-md text-white/80 hover:bg-white/15 lg:hidden" onClick={() => setMobileNavOpen(false)} aria-label="Close navigation"><X className="size-4" /></button>
          </div>
          {!isSidebarCollapsed && <button className="mx-3 mt-3 flex h-12 items-center gap-2.5 rounded-lg border border-[#DDE4ED] bg-white px-3 text-left shadow-sm">
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[#E9F7F4] text-[#22A47A]"><Building2 className="size-4" /></span>
            <span className="min-w-0 flex-1"><span className="block truncate text-[11px] font-bold text-[#111B3D]">Namo Gange Trust</span><span className="block text-[9px] text-[#637396]">Organization</span></span><ChevronDown className="size-3.5 text-[#223462]" />
          </button>}
          <nav className="scrollbar-thin flex-1 overflow-y-auto px-3 py-3" aria-label="Admin navigation">
            {adminNavigation.map((section) => (
              <div key={section.label} className="mb-3">
                {!isSidebarCollapsed && <p className="mb-1 px-2 text-[9px] font-bold uppercase tracking-[0.16em] text-[#A0A7AC]">{section.label}</p>}
                <div className="space-y-0.5">
                  {section.items.map((item) => {
                    const active = item.href === "/admin" ? pathname === item.href : pathname.startsWith(item.href);
                    const Icon = item.icon;
                    return <Link key={item.href} href={item.href} title={isSidebarCollapsed ? item.label : undefined} onClick={() => setMobileNavOpen(false)} className={cn(
                      "group flex h-8 items-center gap-2.5 rounded-md px-2 text-[12px] font-medium transition-colors",
                      active ? "bg-gradient-to-r from-[#FFE7E9] to-[#FFF0F1] text-[#EA111B]" : "text-[#142044] hover:bg-[#F1F5FA] hover:text-[#EA111B]",
                      isSidebarCollapsed && "justify-center px-0",
                    )}>{brandLabels.has(item.label) ? <ChannelLogo channel={item.label} className="size-[17px]" /> : <Icon className={cn("size-[15px] shrink-0", active ? "text-[#C9343B]" : "text-[#8A949B] group-hover:text-[#59666F]")} />}{!isSidebarCollapsed && <span className="truncate">{item.label}</span>}</Link>;
                  })}
                </div>
              </div>
            ))}
          </nav>
          {!isSidebarCollapsed && <div className="mx-3 mb-3 rounded-lg border border-[#E0E5ED] bg-white p-3 shadow-sm"><div className="flex items-start gap-2"><Headphones className="mt-0.5 size-4 text-[#EB0711]" /><div><p className="text-[10px] font-bold text-[#132044]">Help & Support</p><p className="mt-0.5 text-[8.5px] leading-3 text-[#6D7A99]">Need help?<br />Get support from our team</p></div></div></div>}
          <button onClick={toggleSidebar} className="hidden h-9 items-center gap-2 border-t border-[#E7E5E2] px-4 text-[10px] font-medium text-[#7B858D] hover:bg-[#F4F2EF] lg:flex">
            <ChevronLeft className={cn("size-4 transition-transform", isSidebarCollapsed && "rotate-180")} />{!isSidebarCollapsed && "Collapse sidebar"}
          </button>
        </div>
      </aside>
    </>
  );
}
