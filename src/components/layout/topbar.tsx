"use client";

import { ChevronDown, LogOut, Menu, Plus, Settings, ShieldCheck, Sparkles, UserRound } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useSidebar } from "./sidebar-context";
import { useAuth } from "@/features/auth/components/auth-provider";
import { NotificationsMenu } from "./notifications-menu";
import { GlobalSearch } from "./global-search";
import Image from "next/image";
import { cn } from "@/lib/utils/cn";
import { getUserDisplay } from "@/lib/utils/user-display";
import { useState } from "react";
import { MyProfileDialog } from "./my-profile-dialog";

export function Topbar() {
  const { setMobileOpen, toggleCollapsed, isCollapsed } = useSidebar();
  const { user, logout } = useAuth();
  const [profileOpen, setProfileOpen] = useState(false);
  const { fullName, firstName, email: userEmail, initials } = getUserDisplay(user);

  return (
    <header className={cn(
      "fixed top-0 right-0 z-40 flex h-[56px] items-center gap-4 border-b border-[#E2E8F0] bg-white px-4 sm:px-6 lg:px-8 transition-[left] duration-200",
      isCollapsed ? "left-0 lg:left-[64px]" : "left-0 lg:left-[220px]"
    )}>
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
              })()}, <span className="text-blue-600">{firstName}</span>
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
            <button
              className="group flex h-10 items-center gap-1.5 rounded-full border border-slate-200 bg-white p-1 pl-1.5 shadow-sm transition-all hover:border-blue-200 hover:bg-blue-50/50 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-200"
              aria-label="Open account menu"
            >
              <div className="profile-lottie-avatar profile-lottie-avatar--small">
                {user?.avatarUrl ? (
                  <Image
                    src={user.avatarUrl}
                    alt={fullName}
                    width={32}
                    height={32}
                    className="relative z-10 size-full rounded-full object-cover"
                  />
                ) : (
                  <div className="profile-lottie-core">
                    <span className="profile-lottie-orbit profile-lottie-orbit-one" />
                    <span className="profile-lottie-orbit profile-lottie-orbit-two" />
                    <span className="profile-lottie-dot profile-lottie-dot-one" />
                    <span className="profile-lottie-dot profile-lottie-dot-two" />
                    <UserRound className="relative z-10 size-[18px]" />
                  </div>
                )}
                <span className="absolute bottom-0 right-0 size-2.5 rounded-full border-2 border-white bg-emerald-500" />
              </div>
              <ChevronDown className="mr-1 size-4 text-slate-400 transition-colors group-hover:text-blue-600" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64 rounded-lg border-slate-200 p-1.5 shadow-xl shadow-slate-900/10">
            <DropdownMenuLabel className="font-normal p-2 normal-case tracking-normal">
              <div className="flex items-center gap-3">
                <div className="profile-lottie-avatar profile-lottie-avatar--large">
                  {user?.avatarUrl ? (
                    <Image src={user.avatarUrl} alt={fullName} width={40} height={40} className="relative z-10 size-full rounded-full object-cover" />
                  ) : (
                    <div className="profile-lottie-core">
                      <span className="profile-lottie-orbit profile-lottie-orbit-one" />
                      <span className="profile-lottie-orbit profile-lottie-orbit-two" />
                      <span className="profile-lottie-dot profile-lottie-dot-one" />
                      <span className="profile-lottie-dot profile-lottie-dot-two" />
                      <UserRound className="relative z-10 size-5" />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold leading-none text-[#18181B]">{fullName || initials}</p>
                  <p className="mt-1 truncate text-xs leading-none text-[#71717A]">{userEmail}</p>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="gap-2 rounded-md cursor-pointer" onSelect={() => setProfileOpen(true)}><UserRound className="size-4" />My Profile</DropdownMenuItem>
            <DropdownMenuItem className="gap-2 rounded-md cursor-pointer"><ShieldCheck className="size-4" />Security</DropdownMenuItem>
            <DropdownMenuItem className="gap-2 rounded-md cursor-pointer"><Settings className="size-4" />Preferences</DropdownMenuItem>
            <DropdownMenuItem className="gap-2 rounded-md cursor-pointer"><Sparkles className="size-4" />Workspace</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="gap-2 rounded-md cursor-pointer text-red-600 focus:text-red-600" onSelect={() => void logout()}><LogOut className="size-4" />Sign out</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <MyProfileDialog open={profileOpen} onOpenChange={setProfileOpen} />
    </header>
  );
}
