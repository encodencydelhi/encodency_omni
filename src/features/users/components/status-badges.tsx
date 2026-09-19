import { ShieldAlertIcon, ShieldCheckIcon, ShieldQuestionIcon } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils/cn";
import { ORGANISATION_ROLE, type OrganisationRole } from "@/types/domain/user";
import {
  GLOBAL_USER_STATUS,
  MEMBERSHIP_STATUS,
  SECURITY_POSTURE,
} from "../data/config";
import type {
  GlobalUserStatus,
  MembershipStatus,
  SecurityPosture,
  TwoFactorStatus,
} from "../data/types";

interface UserStatusBadgeProps {
  status: GlobalUserStatus;
  className?: string;
}

export function UserStatusBadge({ status, className }: UserStatusBadgeProps) {
  const meta = GLOBAL_USER_STATUS[status] ?? { label: status, tone: "neutral" };
  const styles: Record<string, string> = {
    success: "bg-emerald-50 text-emerald-700 border-emerald-200",
    info: "bg-sky-50 text-sky-700 border-sky-200",
    danger: "bg-rose-50 text-rose-700 border-rose-200",
    neutral: "bg-slate-100 text-slate-600 border-slate-200",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium border capitalize",
        styles[meta.tone],
        className,
      )}
    >
      <span
        className={cn(
          "mr-1 size-1.5 rounded-full",
          meta.tone === "success" && "bg-emerald-500",
          meta.tone === "info" && "bg-sky-500",
          meta.tone === "danger" && "bg-rose-500",
          meta.tone === "neutral" && "bg-slate-400",
        )}
      />
      {meta.label}
    </span>
  );
}

export function MembershipStatusBadge({ status, className }: { status: MembershipStatus; className?: string }) {
  const meta = MEMBERSHIP_STATUS[status] ?? { label: status, tone: "neutral" };
  const styles: Record<string, string> = {
    success: "bg-emerald-50 text-emerald-700 border-emerald-200",
    info: "bg-blue-50 text-blue-700 border-blue-200",
    danger: "bg-amber-50 text-amber-700 border-amber-200",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium border",
        styles[meta.tone],
        className,
      )}
    >
      {meta.label}
    </span>
  );
}

export function RoleBadge({
  role,
  isOwner,
  className,
}: {
  role: OrganisationRole;
  isOwner?: boolean;
  className?: string;
}) {
  const meta = ORGANISATION_ROLE[role] ?? { label: role, tone: "neutral" };
  const isOwnerOrAdmin = role === "owner" || role === "admin" || isOwner;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium tracking-tight whitespace-nowrap",
        isOwnerOrAdmin
          ? "bg-indigo-50 text-indigo-700 border border-indigo-200 font-semibold"
          : "bg-slate-50 text-slate-700 border border-slate-200",
        className,
      )}
    >
      {isOwner && (
        <span className="size-1.5 rounded-full bg-indigo-500" title="Protected Owner" />
      )}
      {meta.label}
    </span>
  );
}

export function SecurityStatusBadge({ status, className }: { status: TwoFactorStatus; className?: string }) {
  if (status === "enabled") {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={cn("inline-flex items-center gap-1 text-xs font-medium text-emerald-700 cursor-default", className)}>
            <ShieldCheckIcon className="size-3.5 text-emerald-600" />
            <span>2FA Active</span>
          </span>
        </TooltipTrigger>
        <TooltipContent side="top">Multi-factor authentication configured and active</TooltipContent>
      </Tooltip>
    );
  }

  if (status === "required_not_configured") {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={cn("inline-flex items-center gap-1 text-xs font-medium text-amber-700 cursor-default bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200", className)}>
            <ShieldAlertIcon className="size-3.5 text-amber-600 shrink-0" />
            <span>Required · Not Configured</span>
          </span>
        </TooltipTrigger>
        <TooltipContent side="top">
          2FA is required by the user&apos;s organization policy, but enrollment has not been completed.
        </TooltipContent>
      </Tooltip>
    );
  }

  if (status === "setup_pending") {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={cn("inline-flex items-center gap-1 text-xs font-medium text-sky-700 cursor-default", className)}>
            <ShieldQuestionIcon className="size-3.5 text-sky-600" />
            <span>Setup Pending</span>
          </span>
        </TooltipTrigger>
        <TooltipContent side="top">User has been sent setup instructions</TooltipContent>
      </Tooltip>
    );
  }

  return (
    <span className={cn("inline-flex items-center gap-1 text-xs text-slate-500", className)}>
      <span className="size-1.5 rounded-full bg-slate-400" />
      <span>Not Enabled</span>
    </span>
  );
}

export function SecurityPostureBadge({ posture, className }: { posture: SecurityPosture; className?: string }) {
  const meta = SECURITY_POSTURE[posture];
  const styles: Record<SecurityPosture, string> = {
    healthy: "bg-emerald-50 text-emerald-700 border-emerald-200",
    action_required: "bg-amber-50 text-amber-700 border-amber-200",
    locked: "bg-rose-50 text-rose-700 border-rose-200",
    suspended: "bg-slate-100 text-slate-600 border-slate-200",
    security_review: "bg-orange-50 text-orange-700 border-orange-200",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium border capitalize",
        styles[posture],
        className,
      )}
    >
      {meta.label}
    </span>
  );
}

export const CompanyRoleBadge = RoleBadge;
export const TwoFactorStatusBadge = SecurityStatusBadge;
