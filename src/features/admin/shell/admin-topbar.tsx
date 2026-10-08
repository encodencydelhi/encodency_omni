"use client";

import Link from "next/link";
import { ChevronDown, LogOut, Menu, Plus, Search, Settings, Upload, UserRound, X } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { NotificationsMenu } from "@/components/layout/notifications-menu";
import { useAdminContext } from "./admin-context";
import { useAuth } from "@/features/auth/components/auth-provider";
import { cn } from "@/lib/utils/cn";
import { getUserDisplay } from "@/lib/utils/user-display";
import Image from "next/image";

import { useRef, useState } from "react";
import { toast } from "sonner";
import {
  userAvatarApi,
  USER_AVATAR_LIMITS,
  isAvatarAssetConflict,
  isAvatarFileTooLarge,
  isAvatarStorageUnavailable,
} from "@/features/auth/services/user-avatar-api";

export function AdminTopbar() {
  const { setMobileNavOpen, isSidebarCollapsed } = useAdminContext();
  const { user, logout, refreshUser } = useAuth();
  const { fullName, firstName, email: userEmail, initials } = getUserDisplay(user);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > USER_AVATAR_LIMITS.maxBytes) {
      toast.error("Avatar image must be smaller than 2MB.");
      return;
    }

    if (!USER_AVATAR_LIMITS.mimeTypes.includes(file.type)) {
      toast.error("Unsupported format. Please upload PNG, JPEG or WebP.");
      return;
    }

    setUploadingAvatar(true);
    const toastId = toast.loading("Updating profile avatar...");
    try {
      await userAvatarApi.upload(file);
      await refreshUser();
      toast.success("Avatar updated successfully", { id: toastId });
    } catch (err) {
      if (isAvatarAssetConflict(err)) {
        toast.error("Avatar was modified elsewhere. Please refresh.", { id: toastId });
      } else if (isAvatarFileTooLarge(err)) {
        toast.error("File is too large. Maximum size is 2MB.", { id: toastId });
      } else if (isAvatarStorageUnavailable(err)) {
        toast.error("Storage service unavailable. Please try again.", { id: toastId });
      } else {
        toast.error("Failed to upload avatar", { id: toastId });
      }
    } finally {
      setUploadingAvatar(false);
      if (e.target) e.target.value = "";
    }
  };

  const handleAvatarRemove = async () => {
    setUploadingAvatar(true);
    const toastId = toast.loading("Removing avatar...");
    try {
      await userAvatarApi.remove();
      await refreshUser();
      toast.success("Avatar removed", { id: toastId });
    } catch {
      toast.error("Failed to remove avatar", { id: toastId });
    } finally {
      setUploadingAvatar(false);
    }
  };

  return (
    <header className={cn(
      "fixed top-0 right-0 z-30 flex h-[60px] items-center gap-4 border-b border-[#E2E8F0] bg-white px-4 sm:px-6 lg:px-8 transition-[left] duration-200",
      isSidebarCollapsed ? "left-0 lg:left-[64px]" : "left-0 lg:left-[220px]"
    )}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={handleAvatarChange}
      />
      <button
        className="grid size-9 place-items-center rounded-sm text-[#64748B] hover:bg-[#F1F5F9] transition-colors lg:hidden"
        onClick={() => setMobileNavOpen(true)}
        aria-label="Open navigation"
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
        <label className="relative flex h-9 w-full max-w-[260px] items-center gap-2.5 rounded-sm bg-[#F4F4F5] px-4 transition-colors hover:bg-[#E4E4E7] focus-within:bg-white focus-within:ring-2 focus-within:ring-[#E4E4E7] focus-within:hover:bg-white">
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
            <DropdownMenuItem asChild className="gap-2 rounded-md cursor-pointer">
              <Link href="/admin/settings"><UserRound className="size-4" />Profile settings</Link>
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={(e) => {
                e.preventDefault();
                fileInputRef.current?.click();
              }}
              disabled={uploadingAvatar}
              className="gap-2 rounded-md cursor-pointer"
            >
              <Upload className="size-4" />
              {user?.avatarUrl ? "Change avatar..." : "Upload avatar..."}
            </DropdownMenuItem>
            {user?.avatarUrl && (
              <DropdownMenuItem
                onSelect={(e) => {
                  e.preventDefault();
                  void handleAvatarRemove();
                }}
                disabled={uploadingAvatar}
                className="gap-2 rounded-md cursor-pointer text-red-600 focus:text-red-600"
              >
                <X className="size-4" />
                Remove avatar
              </DropdownMenuItem>
            )}
            <DropdownMenuItem asChild className="gap-2 rounded-md cursor-pointer">
              <Link href="/admin/settings"><Settings className="size-4" />Organization settings</Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="gap-2 rounded-md cursor-pointer text-red-600 focus:text-red-600" onSelect={() => void logout()}><LogOut className="size-4" />Sign out</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
