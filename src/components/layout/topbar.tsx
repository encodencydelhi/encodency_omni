"use client";

import { ChevronDown, Menu, Plus } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useSidebar } from "./sidebar-context";
import { useAuth } from "@/features/auth/components/auth-provider";
import { NotificationsMenu } from "./notifications-menu";
import { GlobalSearch } from "./global-search";
import Image from "next/image";

export function Topbar() {
  const { setMobileOpen, toggleCollapsed } = useSidebar();
  const { user, logout } = useAuth();

  return (
    <header className="sticky top-0 z-30 flex h-[56px] items-center gap-4 border-b border-[#E2E8F0] bg-white px-4 sm:px-6 lg:px-8">
      <button
        className="grid size-9 place-items-center rounded-sm text-[#64748B] hover:bg-[#F1F5F9] transition-colors lg:hidden"
        onClick={() => setMobileOpen(true)}
        aria-label="Open navigation"
      >
        <Menu className="size-5" />
      </button>

      <button
        className="hidden grid size-9 place-items-center rounded-sm text-[#64748B] hover:bg-[#F1F5F9] transition-colors lg:grid"
        onClick={toggleCollapsed}
        aria-label="Toggle navigation"
      >
        <Menu className="size-5" />
      </button>

      <div className="hidden flex-1 md:flex items-center gap-6">
        <div className="flex items-center gap-3 border-r border-[#E2E8F0] pr-6">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-50 to-indigo-50 shadow-[inset_0_1px_2px_rgba(255,255,255,0.8)] border border-blue-100">
            <span className="text-[15px] drop-shadow-sm">
              {(() => {
                const hour = new Date().getHours();
                if (hour < 12) return "☀️";
                if (hour < 18) return "⛅";
                return "🌙";
              })()}
            </span>
          </div>
          <div className="flex flex-col justify-center">
            <span className="text-[13px] font-bold text-slate-800 leading-tight">
              {(() => {
                const hour = new Date().getHours();
                if (hour < 12) return "Good Morning";
                if (hour < 18) return "Good Afternoon";
                return "Good Evening";
              })()}, <span className="text-blue-600">{user?.name?.split(' ')[0] ?? 'Admin'}</span>
            </span>
            <span className="text-[11px] font-medium text-slate-500 leading-tight mt-0.5">
              Ready to Crush it Today? 🚀
            </span>
          </div>
        </div>
        <GlobalSearch />
      </div>

      <div className="ml-auto flex items-center gap-1.5 sm:gap-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="hidden h-8 items-center gap-1.5 rounded-sm bg-[#EB0711] pl-3 pr-2.5 text-[12px] font-medium text-white shadow-sm hover:bg-[#D60811] transition-all hover:shadow md:flex">
              <Plus className="size-3.5" />
              <span>Create</span>
              <ChevronDown className="size-3.5 opacity-70 ml-0.5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52 rounded-sm">
            <DropdownMenuLabel className="text-[11px] font-bold tracking-wider text-[#A1A1AA]">MANAGEMENT</DropdownMenuLabel>
            {["Create Company", "Create Internal User"].map((item) => (
              <DropdownMenuItem key={item} className="text-[13px] rounded-sm cursor-pointer">{item}</DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-[11px] font-bold tracking-wider text-[#A1A1AA]">BUSINESS</DropdownMenuLabel>
            {["Create Plan"].map((item) => (
              <DropdownMenuItem key={item} className="text-[13px] rounded-sm cursor-pointer">{item}</DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-[11px] font-bold tracking-wider text-[#A1A1AA]">CONTROL</DropdownMenuLabel>
            {["Create Feature Flag", "Create Support Ticket"].map((item) => (
              <DropdownMenuItem key={item} className="text-[13px] rounded-sm cursor-pointer">{item}</DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="h-4 w-[1px] bg-[#E4E4E7] hidden sm:block mx-1" />

        <NotificationsMenu />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2.5 rounded-[10px] p-1.5 pr-3 hover:bg-slate-100/80 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 group">
              <div className="relative shrink-0">
                <Image
                  src={user?.avatarUrl || "/user-avatar.png"}
                  alt={user?.name ?? 'Admin'}
                  width={32}
                  height={32}
                  className="rounded-[8px] object-cover border border-slate-200 bg-slate-50 shadow-xs group-hover:border-slate-300 transition-colors"
                />
              </div>
              <span className="hidden text-left xl:block">
                <span className="block text-[14px] font-semibold tracking-tight text-[#0f172a]">
                  {user?.name ?? 'Admin'}
                </span>
              </span>
              <ChevronDown className="hidden size-4 text-slate-400 group-hover:text-slate-600 transition-colors xl:block" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 rounded-sm">
            <DropdownMenuLabel className="font-normal p-2 normal-case tracking-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none text-[#18181B]">{user?.name ?? 'Admin'}</p>
                <p className="text-xs leading-none text-[#A1A1AA]">{user?.email ?? 'admin@example.com'}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="rounded-sm cursor-pointer">My Profile</DropdownMenuItem>
            <DropdownMenuItem className="rounded-sm cursor-pointer">Security</DropdownMenuItem>
            <DropdownMenuItem className="rounded-sm cursor-pointer">Preferences</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="rounded-sm cursor-pointer text-red-600 focus:text-red-600" onSelect={() => void logout()}>Sign out</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
