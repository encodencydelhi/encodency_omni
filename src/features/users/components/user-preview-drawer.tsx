import {
  ActivityIcon,
  BanIcon,
  Building2Icon,
  CheckCircle2Icon,
  ExternalLinkIcon,
  KeyRoundIcon,
  ShieldAlertIcon,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ROUTES } from "@/config/routes";
import { formatRelativeTime, getInitials } from "@/lib/utils/format";
import { MembershipStatusBadge, RoleBadge, SecurityStatusBadge, UserStatusBadge } from "./status-badges";
import type { UserAggregate } from "../data/types";

interface UserPreviewDrawerProps {
  user: UserAggregate | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuspendClick?: (user: UserAggregate) => void;
  onReactivateClick?: (user: UserAggregate) => void;
  onRequire2faClick?: (user: UserAggregate) => void;
  onRequireResetClick?: (user: UserAggregate) => void;
}

export function UserPreviewDrawer({
  user,
  open,
  onOpenChange,
  onSuspendClick,
  onReactivateClick,
}: UserPreviewDrawerProps) {
  const router = useRouter();

  if (!user) return null;

  const isSuspended = user.identity.globalStatus === "suspended";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="sm:max-w-md w-full p-0 flex flex-col">
        <SheetHeader className="p-4 border-b border-border bg-slate-50/60">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <Avatar className="size-11 rounded-full border border-border shadow-xs">
                {user.identity.avatarUrl && (
                  <AvatarImage src={user.identity.avatarUrl} alt={user.identity.name} />
                )}
                <AvatarFallback className="bg-slate-200 text-slate-800 font-bold text-sm">
                  {getInitials(user.identity.name)}
                </AvatarFallback>
              </Avatar>

              <div>
                <SheetTitle className="text-base font-bold text-slate-900 flex items-center gap-1.5">
                  <span>{user.identity.name}</span>
                </SheetTitle>
                <SheetDescription className="text-xs text-slate-500 truncate max-w-[240px]">
                  {user.identity.email}
                </SheetDescription>
              </div>
            </div>

            <div className="flex flex-col items-end gap-1">
              <UserStatusBadge status={user.identity.globalStatus} />
              <span className="text-xs text-slate-400 font-mono">
                {user.identity.id}
              </span>
            </div>
          </div>
        </SheetHeader>

        <SheetBody className="p-4 overflow-y-auto gap-2 flex-1 flex flex-col">
          {/* Quick Metrics Strip */}
          <div className="grid grid-cols-4 gap-2">
            <div className="p-2 rounded-lg border border-slate-200 bg-slate-50 text-center min-h-[72px] flex flex-col justify-center">
              <div className="text-xs uppercase font-bold text-slate-500">Companies</div>
              <div className="text-lg font-bold text-slate-900 mt-0.5">
                {user.memberships.length}
              </div>
            </div>

            <div className="p-2 rounded-lg border border-slate-200 bg-slate-50 text-center min-h-[72px] flex flex-col justify-center">
              <div className="text-xs uppercase font-bold text-slate-500">Clients</div>
              <div className="text-lg font-bold text-slate-900 mt-0.5">
                {user.totalClientsCount}
              </div>
            </div>

            <div className="p-2 rounded-lg border border-slate-200 bg-slate-50 text-center min-h-[72px] flex flex-col justify-center">
              <div className="text-xs uppercase font-bold text-slate-500">Sessions</div>
              <div className="text-lg font-bold text-slate-900 mt-0.5">
                {user.activeSessionsCount}
              </div>
            </div>

            <div className="p-2 rounded-lg border border-slate-200 bg-slate-50 text-center min-h-[72px] flex flex-col justify-center">
              <div className="text-xs uppercase font-bold text-slate-500">2FA</div>
              <div className="text-xs font-bold mt-1">
                {user.security.mfaEnabled ? (
                  <span className="text-emerald-600">Active</span>
                ) : user.security.twoFactorRequired ? (
                  <span className="text-amber-600">Missing</span>
                ) : (
                  <span className="text-slate-400">Off</span>
                )}
              </div>
            </div>
          </div>

          {/* Security Warnings */}
          {user.security.securityWarnings.length > 0 && (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-2.5 space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-amber-800">
                <ShieldAlertIcon className="size-3.5 shrink-0" />
                <span>Security Notice</span>
              </div>
              <ul className="text-xs text-amber-900/90 pl-5 list-disc space-y-0.5">
                {user.security.securityWarnings.map((w, idx) => (
                  <li key={idx}>{w}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Company Memberships */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-900">
              <span className="flex items-center gap-1.5">
                <Building2Icon className="size-3.5 text-blue-500" />
                <span>Company Memberships ({user.memberships.length})</span>
              </span>
              <Link
                href={`${ROUTES.superAdmin.user(user.identity.id)}?tab=company-access`}
                className="text-xs text-blue-600 hover:underline font-medium"
              >
                Manage Access
              </Link>
            </div>

            <div className="space-y-2">
              {user.memberships.length > 0 ? (
                user.memberships.map((m) => (
                  <div
                    key={m.id}
                    className="p-2.5 rounded-lg border border-slate-200 bg-white text-xs flex flex-col gap-1"
                  >
                    <div className="flex items-center justify-between gap-1">
                      <Link
                        href={ROUTES.superAdmin.company(m.companyId)}
                        className="font-semibold text-slate-800 hover:text-blue-600 truncate"
                      >
                        {m.companyName}
                      </Link>
                      <MembershipStatusBadge status={m.status} />
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-500 mt-0.5">
                      <RoleBadge role={m.role} isOwner={m.isOwner} />
                      <span>{m.clientAccess.clients.length} clients accessible</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-xs text-slate-400 italic p-3 border border-dashed rounded text-center">
                  No company memberships assigned
                </div>
              )}
            </div>
          </div>

          {/* Security & Sessions */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-900">
              <span className="flex items-center gap-1.5">
                <KeyRoundIcon className="size-3.5 text-indigo-500" />
                <span>Security & Sessions</span>
              </span>
              <Link
                href={`${ROUTES.superAdmin.user(user.identity.id)}?tab=security`}
                className="text-xs text-blue-600 hover:underline font-medium"
              >
                Review Security
              </Link>
            </div>

            <div className="rounded-lg border border-slate-200 p-2.5 bg-white text-xs space-y-1.5">
              <div className="flex items-center justify-between py-0.5">
                <span className="text-slate-500">2FA Enrollment</span>
                <SecurityStatusBadge status={user.security.twoFactorStatus} />
              </div>
              <div className="flex items-center justify-between py-0.5">
                <span className="text-slate-500">Last Successful Login</span>
                <span className="font-medium text-slate-700">
                  {user.identity.lastLoginAt ? formatRelativeTime(user.identity.lastLoginAt) : "Never"}
                </span>
              </div>
              <div className="flex items-center justify-between py-0.5">
                <span className="text-slate-500">Active Sessions</span>
                <span className="font-medium text-slate-700">
                  {user.activeSessionsCount} active
                </span>
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          {user.recentActivity.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-900">
                <span className="flex items-center gap-1.5">
                  <ActivityIcon className="size-3.5 text-slate-500" />
                  <span>Recent User Activity</span>
                </span>
                <Link
                  href={`${ROUTES.superAdmin.user(user.identity.id)}?tab=activity`}
                  className="text-xs text-blue-600 hover:underline font-medium"
                >
                  Full History
                </Link>
              </div>

              <div className="rounded-lg border border-slate-200 divide-y divide-border bg-white text-xs">
                {user.recentActivity.slice(0, 3).map((act) => (
                  <div key={act.id} className="p-2 space-y-0.5">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-slate-800">{act.action}</span>
                      <span className="text-xs text-slate-400">{formatRelativeTime(act.timestamp)}</span>
                    </div>
                    <p className="text-xs text-slate-500 truncate">{act.summary}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </SheetBody>

        <div className="p-3 border-t border-border bg-slate-50 flex items-center justify-between gap-2">
          <Button
            type="button"
            variant="default"
            size="sm"
            className="flex-1 text-xs gap-1.5"
            onClick={() => {
              onOpenChange(false);
              router.push(ROUTES.superAdmin.user(user.identity.id));
            }}
          >
            <span>Open Full Profile</span>
            <ExternalLinkIcon className="size-3" />
          </Button>

          {isSuspended ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-xs text-emerald-700 hover:bg-emerald-50 border-emerald-300"
              onClick={() => onReactivateClick?.(user)}
            >
              <CheckCircle2Icon className="size-3.5 mr-1" />
              Reactivate
            </Button>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-xs text-rose-700 hover:bg-rose-50 border-rose-300"
              onClick={() => onSuspendClick?.(user)}
            >
              <BanIcon className="size-3.5 mr-1" />
              Suspend
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
