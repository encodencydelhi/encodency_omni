"use client";

import { Bell, ChevronDown, Menu, Plus, Search } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MOCK_ADMIN_USER } from "@/config/admin-permissions";
import { Clientswitcher } from "./project-switcher";
import { useAdminContext } from "./admin-context";
import { useAuth } from "@/features/auth/components/auth-provider";
import Image from "next/image";

export function AdminTopbar() {
  const { setMobileNavOpen } = useAdminContext();
  const { logout } = useAuth();

  return (
    <header className="sticky top-0 z-30 flex h-[60px] items-center gap-4 border-b border-[#E2E8F0] bg-white px-4 sm:px-6 lg:px-8">
      <button
        className="grid size-9 place-items-center rounded-sm text-[#64748B] hover:bg-[#F1F5F9] transition-colors lg:hidden"
        onClick={() => setMobileNavOpen(true)}
        aria-label="Open navigation"
      >
        <Menu className="size-5" />
      </button>

      <div className="hidden flex-1 md:flex">
        <label className="relative flex h-9 w-full max-w-[480px] items-center gap-2.5 rounded-sm bg-[#F4F4F5] px-4 transition-colors hover:bg-[#E4E4E7] focus-within:bg-white focus-within:ring-2 focus-within:ring-[#E4E4E7] focus-within:hover:bg-white">
          <Search className="size-4 text-[#A1A1AA]" />
          <input
            className="min-w-0 flex-1 bg-transparent text-[13px] text-[#27272A] outline-none placeholder:text-[#A1A1AA]"
            placeholder="Search..."
          />
          <kbd className="hidden sm:flex items-center gap-1 rounded bg-white px-1.5 py-0.5 text-[12px] font-medium text-[#A1A1AA] shadow-[0_1px_2px_rgba(0,0,0,0.05)] border border-[#E4E4E7]">
            <span>⌘</span>K
          </kbd>
        </label>
      </div>

      <div className="ml-auto flex items-center gap-1.5 sm:gap-3">
        <div className="hidden items-center gap-2 lg:flex mr-2">
          <span className="text-[12px] font-semibold text-[#A1A1AA]">Project</span>
          <Clientswitcher />
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="hidden h-8 items-center gap-1.5 rounded-sm bg-[#EB0711] pl-3 pr-2.5 text-[12px] font-medium text-white shadow-sm hover:bg-[#D60811] transition-all hover:shadow md:flex">
              <Plus className="size-3.5" />
              <span>Create</span>
              <ChevronDown className="size-3.5 opacity-70 ml-0.5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 rounded-sm">
            <DropdownMenuLabel className="text-[12px] font-medium text-[#A1A1AA]">Create new</DropdownMenuLabel>
            {["Create post", "Add lead", "Create campaign", "Add Client", "Run SEO audit"].map((item) => (
              <DropdownMenuItem key={item} className="text-[13px] rounded-sm cursor-pointer">{item}</DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="h-4 w-[1px] bg-[#E4E4E7] hidden sm:block mx-1" />

        <button
          className="relative grid size-9 place-items-center rounded-sm text-[#71717A] hover:bg-[#F4F4F5] hover:text-[#18181B] transition-colors"
          aria-label="Notifications"
        >
          <Bell className="size-[18px]" />
          <span className="absolute right-2 top-2 size-2 rounded-sm border-2 border-white bg-[#EB0711]" />
        </button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2.5 rounded-[10px] p-1.5 pr-3 hover:bg-slate-100/80 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 group">
              <div className="relative shrink-0">
                <Image
                  src="/user-avatar.png"
                  alt={MOCK_ADMIN_USER.name}
                  width={32}
                  height={32}
                  className="rounded-[8px] object-cover border border-slate-200 bg-slate-50 shadow-xs group-hover:border-slate-300 transition-colors"
                />
              </div>
              <span className="hidden text-left xl:block">
                <span className="block text-[14px] font-semibold tracking-tight text-[#0f172a]">
                  {MOCK_ADMIN_USER.name}
                </span>
              </span>
              <ChevronDown className="hidden size-4 text-slate-400 group-hover:text-slate-600 transition-colors xl:block" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 rounded-sm">
            <DropdownMenuLabel className="font-normal p-2 normal-case tracking-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none text-[#18181B]">{MOCK_ADMIN_USER.name}</p>
                <p className="text-xs leading-none text-[#A1A1AA]">{MOCK_ADMIN_USER.email}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="rounded-sm cursor-pointer">Profile settings</DropdownMenuItem>
            <DropdownMenuItem className="rounded-sm cursor-pointer">Organization settings</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="rounded-sm cursor-pointer text-red-600 focus:text-red-600" onSelect={() => void logout()}>Sign out</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
