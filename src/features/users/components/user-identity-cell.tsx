import { CopyIcon, CheckIcon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ROUTES } from "@/config/routes";
import { getInitials } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import type { UserIdentity } from "../data/types";

interface UserIdentityCellProps {
  user: UserIdentity;
  hasOwnerAccess?: boolean;
  className?: string;
  onClick?: () => void;
}

export function UserIdentityCell({
  user,
  hasOwnerAccess,
  className,
  onClick,
}: UserIdentityCellProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyId = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    void navigator.clipboard.writeText(user.id);
    setCopied(true);
    toast.success(`Copied ID: ${user.id}`);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={cn("flex items-center gap-2.5 py-0.5 max-w-[280px]", className)}>
      <div className="relative shrink-0">
        <Avatar className="size-8.5 rounded-full border border-border shadow-2xs">
          {user.avatarUrl && <AvatarImage src={user.avatarUrl} alt={user.name} />}
          <AvatarFallback className="bg-slate-100 text-slate-700 text-xs font-semibold">
            {getInitials(user.name)}
          </AvatarFallback>
        </Avatar>
        {hasOwnerAccess && (
          <span
            className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full bg-amber-500 ring-2 ring-background"
            title="Company Owner"
          />
        )}
      </div>

      <div className="min-w-0 flex-1 leading-tight">
        <div className="flex items-center gap-1.5">
          <Link
            href={ROUTES.superAdmin.user(user.id)}
            onClick={(e) => {
              if (onClick) {
                e.stopPropagation();
                onClick();
              }
            }}
            className="truncate text-[13px] font-semibold text-slate-900 hover:text-blue-600 hover:underline transition-colors"
          >
            {user.name}
          </Link>
        </div>

        <div className="flex items-center gap-1 text-xs text-slate-500 truncate">
          <span className="truncate select-all">{user.email}</span>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={handleCopyId}
                className="opacity-0 group-hover:opacity-100 hover:opacity-100 hover:text-slate-800 transition-opacity p-0.5 rounded cursor-pointer shrink-0"
                aria-label="Copy User ID"
              >
                {copied ? (
                  <CheckIcon className="size-3 text-emerald-600" />
                ) : (
                  <CopyIcon className="size-3" />
                )}
              </button>
            </TooltipTrigger>
            <TooltipContent side="top">Copy ID: {user.id}</TooltipContent>
          </Tooltip>
        </div>
      </div>
    </div>
  );
}
