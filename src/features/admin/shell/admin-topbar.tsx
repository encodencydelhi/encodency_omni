"use client";

import { Bell, ChevronDown, Menu, Plus, Search } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MOCK_ADMIN_USER } from "@/config/admin-permissions";
import { Clientswitcher } from "./project-switcher";
import { useAdminContext } from "./admin-context";
import { useAuth } from "@/features/auth/components/auth-provider";

export function AdminTopbar() {
  const { setMobileNavOpen } = useAdminContext();
  const { logout } = useAuth();
  return <header className="sticky top-0 z-30 flex h-[60px] items-center gap-3 border-b border-[#DCE3ED] bg-white px-4 shadow-[0_2px_8px_rgb(29_53_87/0.04)] sm:px-5 xl:px-6">
    <button className="grid size-9 place-items-center rounded-lg text-[#66727B] hover:bg-white lg:hidden" onClick={() => setMobileNavOpen(true)} aria-label="Open navigation"><Menu className="size-5" /></button>
    <label className="hidden h-9 max-w-[590px] flex-1 items-center gap-2 rounded-lg border border-[#DCE3ED] bg-[#F5F8FC] px-3 md:flex"><Search className="size-3.5 text-[#27406F]" /><input className="min-w-0 flex-1 bg-transparent text-[11px] text-[#17254A] outline-none placeholder:text-[#7583A2]" placeholder="Search Clients, content, leads, campaigns..." /><kbd className="rounded bg-white px-1.5 py-0.5 text-[9px] text-[#53617F] shadow-sm">⌘ K</kbd></label>
    <div className="ml-auto flex items-center gap-2"><div className="hidden border-r border-[#E0E6EF] pr-3 text-right xl:block"><span className="block text-[8px] font-medium uppercase tracking-wider text-[#8290AA]">Organization</span><strong className="block text-[10px] text-[#17254A]">Namo Gange Trust</strong></div><span className="hidden text-[10px] font-medium text-[#21335F] xl:block">Project</span><Clientswitcher />
      <DropdownMenu><DropdownMenuTrigger asChild><button className="hidden h-9 items-center gap-2 rounded-lg bg-[#EB0711] px-3.5 text-[11px] font-semibold text-white shadow-sm hover:bg-[#D60811] md:flex"><Plus className="size-4" />Create<ChevronDown className="size-3" /></button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuLabel>Create new</DropdownMenuLabel>{["Create post", "Add lead", "Create campaign", "Add project", "Run SEO audit"].map((item) => <DropdownMenuItem key={item}>{item}</DropdownMenuItem>)}</DropdownMenuContent></DropdownMenu>
      <button className="relative grid size-9 place-items-center rounded-lg border border-[#E2DFDC] bg-white text-[#68737C] hover:bg-[#F7F5F2]" aria-label="Notifications"><Bell className="size-4" /><span className="absolute right-2 top-2 size-1.5 rounded-full bg-[#C9343B] ring-2 ring-white" /></button>
      <DropdownMenu><DropdownMenuTrigger asChild><button className="flex h-9 items-center gap-2 rounded-lg pl-1 pr-1.5 hover:bg-[#F1EFEC]"><span className="grid size-8 place-items-center rounded-lg bg-[#2F4553] text-[10px] font-bold text-white">{MOCK_ADMIN_USER.initials}</span><span className="hidden text-left xl:block"><span className="block text-[10px] font-semibold text-[#36424B]">{MOCK_ADMIN_USER.name}</span><span className="block text-[9px] text-[#8B949A]">{MOCK_ADMIN_USER.role}</span></span><ChevronDown className="hidden size-3 text-[#8B949A] xl:block" /></button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuLabel>{MOCK_ADMIN_USER.email}</DropdownMenuLabel><DropdownMenuSeparator /><DropdownMenuItem>Profile settings</DropdownMenuItem><DropdownMenuItem>Organization settings</DropdownMenuItem><DropdownMenuSeparator /><DropdownMenuItem onSelect={() => void logout()}>Sign out</DropdownMenuItem></DropdownMenuContent></DropdownMenu>
    </div>
  </header>;
}
