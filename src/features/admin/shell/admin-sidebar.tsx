"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Building2, ChevronDown, ChevronLeft, Headphones, X } from "lucide-react";
import { adminNavigation } from "@/config/admin-navigation";
import { cn } from "@/lib/utils/cn";
import { useAdminContext } from "./admin-context";
import { ChannelLogo } from "../shared/channel-logo";
import logo from "@/assets/namogange.webp"
const brandLabels = new Set(["Meta & Instagram", "LinkedIn", "Google Business", "WhatsApp", "YouTube"]);

export function AdminSidebar() {
  const pathname = usePathname();
  const { isSidebarCollapsed, toggleSidebar, isMobileNavOpen, setMobileNavOpen } = useAdminContext();
  return (
    <>
      {isMobileNavOpen && <button className="fixed inset-0 z-40 bg-slate-950/25 backdrop-blur-[1px] lg:hidden" aria-label="Close navigation" onClick={() => setMobileNavOpen(false)} />}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 flex border-r border-gray-200 bg-[#F0EDE8] transition-[width,transform] duration-200 lg:translate-x-0",
        isSidebarCollapsed ? "w-[72px]" : "w-[236px]", isMobileNavOpen ? "translate-x-0" : "-translate-x-full",
      )}>
        <div className="flex min-w-0 flex-1 flex-col">
          {!isSidebarCollapsed && (
            <div className="mt-2 mb-2 border-b-2 border-gray-400">
              <div className="relative mx-4 flex h-[80px] items-center justify-center overflow-hidden">
                <div className="relative z-[2] h-[55px] w-full px-2">
                  <Image src={logo} alt="Namo Gange Trust" fill priority sizes="200px" className="object-contain object-center" />
                </div>
              </div>
            </div>
          )}
          {isSidebarCollapsed && (
            <div className="flex h-[48px] shrink-0 items-center justify-center">
              <div className="grid h-10 w-10 place-items-center rounded-xl border border-gray-200 bg-white text-xl font-bold text-[#071f3c] shadow-sm">e</div>
            </div>
          )}
          <nav className="scrollbar-thin flex-1 overflow-y-auto px-3 py-3" aria-label="Admin navigation">
            {adminNavigation.map((section) => (
              <div key={section.label} className="mb-3">
                {!isSidebarCollapsed && <p className="mb-1 px-2 text-[9px] font-bold uppercase tracking-[0.16em] text-gray-400">{section.label}</p>}
                <div className="space-y-0.5">
                  {section.items.map((item) => {
                    const active = item.href === "/admin" ? pathname === item.href : pathname.startsWith(item.href);
                    const Icon = item.icon;
                    return <Link key={item.href} href={item.href} title={isSidebarCollapsed ? item.label : undefined} onClick={() => setMobileNavOpen(false)} className={cn(
                      "group flex h-8 items-center gap-2.5 rounded-md px-2 text-[12px] font-medium transition-colors",
                      active ? "bg-gray-800 text-white" : "text-gray-600 hover:bg-gray-100 hover:text-gray-900",
                      isSidebarCollapsed && "justify-center px-0",
                    )}>{brandLabels.has(item.label) ? <ChannelLogo channel={item.label} className="size-[17px]" /> : <Icon className={cn("size-[15px] shrink-0", active ? "text-white" : "text-gray-400 group-hover:text-gray-600")} />}{!isSidebarCollapsed && <span className="truncate">{item.label}</span>}</Link>;
                  })}
                </div>
              </div>
            ))}
          </nav>
          {!isSidebarCollapsed && <div className="mx-3 mb-3 rounded-lg border border-gray-200 bg-white p-3 shadow-sm"><div className="flex items-start gap-2"><Headphones className="mt-0.5 size-4 text-gray-600" /><div><p className="text-[10px] font-bold text-gray-900">Help & Support</p><p className="mt-0.5 text-[8.5px] leading-3 text-gray-500">Need help?<br />Get support from our team</p></div></div></div>}
          <button onClick={toggleSidebar} className="hidden h-9 items-center gap-2 border-t border-gray-200 px-4 text-[10px] font-medium text-gray-500 hover:bg-gray-100 lg:flex">
            <ChevronLeft className={cn("size-4 transition-transform", isSidebarCollapsed && "rotate-180")} />{!isSidebarCollapsed && "Collapse sidebar"}
          </button>
        </div>
      </aside>
    </>
  );
}
