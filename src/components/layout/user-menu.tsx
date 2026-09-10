"use client";

import { ChevronsUpDownIcon, LifeBuoyIcon, LogOutIcon, SettingsIcon, UserIcon } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { APP } from "@/config/app";
import { ROUTES } from "@/config/routes";
import { useAuth } from "@/features/auth/components/auth-provider";
import { getInitials } from "@/lib/utils/format";
import { INTERNAL_ROLE } from "@/types/domain/team";

export function UserMenu() {
  const { user, logout } = useAuth();
  if (!user) return null;

  const role = INTERNAL_ROLE[user.role];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-9 gap-2 px-1.5 sm:pr-2.5" aria-label="Account menu">
          <Avatar>
            <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
          </Avatar>
          <span className="hidden min-w-0 flex-col items-start sm:flex">
            <span className="max-w-32 truncate text-2xs font-medium text-foreground">{user.name}</span>
            <span className="max-w-32 truncate text-2xs text-muted-foreground">{role.label}</span>
          </span>
          <ChevronsUpDownIcon className="hidden size-3 text-muted-foreground sm:block" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-64">
        <div className="flex items-start gap-3 px-2 py-2.5">
          <Avatar className="size-9">
            <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1 space-y-1">
            <p className="truncate text-[0.8125rem] font-medium text-foreground">{user.name}</p>
            <p className="truncate text-2xs text-muted-foreground">{user.email}</p>
            <Badge tone={role.tone}>{role.label}</Badge>
          </div>
        </div>

        <DropdownMenuSeparator />

        <DropdownMenuItem asChild>
          <Link href={ROUTES.superAdmin.team}>
            <UserIcon />
            Internal team
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href={ROUTES.superAdmin.settings}>
            <SettingsIcon />
            Global settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a href={`mailto:${APP.supportEmail}`}>
            <LifeBuoyIcon />
            Contact platform ops
          </a>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem variant="destructive" onSelect={() => void logout()}>
          <LogOutIcon />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
