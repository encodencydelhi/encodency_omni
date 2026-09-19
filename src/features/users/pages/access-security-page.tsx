"use client";

import {
  AlertTriangleIcon,
  BanIcon,
  KeyRoundIcon,
  LockIcon,
  LogOutIcon,
  MailIcon,
  MoreHorizontalIcon,
  RotateCcwIcon,
  SearchIcon,
  ShieldAlertIcon,
  ShieldCheckIcon,
  ShieldIcon,
  UnlockIcon,
  UsersIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ROUTES } from "@/config/routes";
import { useCompanyRefs } from "@/features/companies/hooks/use-companies";
import { formatRelativeTime } from "@/lib/utils/format";
import {
  Require2faDialog,
  RequirePasswordResetDialog,
  RevokeSessionsDialog,
  UnlockAccountDialog,
} from "../components/dialogs/security-action-dialogs";
import {
  SecurityPostureBadge,
  SecurityStatusBadge,
  UserStatusBadge,
} from "../components/status-badges";
import { UserIdentityCell } from "../components/user-identity-cell";
import { UsersNav } from "../components/users-nav";
import {
  useAttentionItems,
  useSecurityEvents,
  useSecurityUsers,
  useUserKpis,
} from "../data/hooks";
import type { UserAggregate } from "../data/types";
import { UserCapabilitiesProvider, useUserCapabilities } from "../data/capability-provider";
import { ErrorState } from "@/components/shared/error-state";

export function AccessSecurityPage() {
  return (
    <UserCapabilitiesProvider>
      <AccessSecurityContent />
    </UserCapabilitiesProvider>
  );
}

function AccessSecurityContent() {
  const router = useRouter();
  const capabilities = useUserCapabilities();

  const [search, setSearch] = useState("");
  const [companyId, setCompanyId] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [twoFactorFilter, setTwoFactorFilter] = useState("all");

  // Dialog targets
  const [selectedUser, setSelectedUser] = useState<UserAggregate | null>(null);
  const [require2faOpen, setRequire2faOpen] = useState(false);
  const [passwordResetOpen, setPasswordResetOpen] = useState(false);
  const [revokeSessionsOpen, setRevokeSessionsOpen] = useState(false);
  const [unlockOpen, setUnlockOpen] = useState(false);

  const { data: companies } = useCompanyRefs();
  const { data: kpis } = useUserKpis();
  const { data: securityUsers = [], isLoading, error: securityError, refetch } = useSecurityUsers({
    search: search.trim() || undefined,
    companyId,
    status: statusFilter,
    twoFactor: twoFactorFilter,
  });
  const { data: attentionItems = [] } = useAttentionItems();
  const { data: securityEvents = [] } = useSecurityEvents();

  const companyOptions = (companies ?? []).map((c) => ({ id: c.id, name: c.name }));

  // Security KPIs
  const totalEligible = kpis?.totalUsers ?? securityUsers.length;
  const twoFactorEnabled = securityUsers.filter((u) => u.security.mfaEnabled).length;
  const twoFactorMissingRequired = securityUsers.filter(
    (u) => u.security.twoFactorRequired && !u.security.mfaEnabled,
  ).length;
  const lockedAccounts = securityUsers.filter((u) => u.security.isLocked).length;
  const suspendedAccounts = securityUsers.filter((u) => u.identity.globalStatus === "suspended").length;

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-12 min-w-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/80 pb-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <ShieldIcon className="size-5 text-indigo-600" />
            <span>Access & Security</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Platform-wide security posture, multi-factor compliance and credential safety across all tenant users.
          </p>
        </div>
      </div>

      {/* Security KPIs Row (gap-1, items-stretch for equal height) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-1 items-stretch">
        <div className="p-3 rounded-lg border border-border bg-white h-full min-h-[92px] flex flex-col justify-between shadow-2xs">
          <div className="flex items-center justify-between text-xs uppercase font-bold text-slate-500">
            <span>Eligible Users</span>
            <UsersIcon className="size-3.5 text-slate-400" />
          </div>
          <div>
            <div className="text-xl font-bold text-slate-900">{totalEligible}</div>
            <div className="text-xs text-slate-400">Total identities</div>
          </div>
        </div>

        <div className="p-3 rounded-lg border border-border bg-white h-full min-h-[92px] flex flex-col justify-between shadow-2xs">
          <div className="flex items-center justify-between text-xs uppercase font-bold text-slate-500">
            <span>2FA Active</span>
            <ShieldCheckIcon className="size-3.5 text-emerald-500" />
          </div>
          <div>
            <div className="text-xl font-bold text-emerald-600">{twoFactorEnabled}</div>
            <div className="text-xs text-slate-400">MFA configured</div>
          </div>
        </div>

        <div className="p-3 rounded-lg border border-amber-200 bg-amber-50/30 h-full min-h-[92px] flex flex-col justify-between shadow-2xs">
          <div className="flex items-center justify-between text-xs uppercase font-bold text-amber-700">
            <span>2FA Missing</span>
            <ShieldAlertIcon className="size-3.5 text-amber-600" />
          </div>
          <div>
            <div className="text-xl font-bold text-amber-700">{twoFactorMissingRequired}</div>
            <div className="text-xs text-amber-800/80">Policy mandated</div>
          </div>
        </div>

        <div className="p-3 rounded-lg border border-rose-200 bg-rose-50/30 h-full min-h-[92px] flex flex-col justify-between shadow-2xs">
          <div className="flex items-center justify-between text-xs uppercase font-bold text-rose-700">
            <span>Locked Accounts</span>
            <LockIcon className="size-3.5 text-rose-600" />
          </div>
          <div>
            <div className="text-xl font-bold text-rose-700">{lockedAccounts}</div>
            <div className="text-xs text-rose-800/80">Failed login threshold</div>
          </div>
        </div>

        <div className="p-3 rounded-lg border border-border bg-white h-full min-h-[92px] flex flex-col justify-between shadow-2xs">
          <div className="flex items-center justify-between text-xs uppercase font-bold text-slate-500">
            <span>Suspended</span>
            <BanIcon className="size-3.5 text-slate-400" />
          </div>
          <div>
            <div className="text-xl font-bold text-slate-700">{suspendedAccounts}</div>
            <div className="text-xs text-slate-400">Access revoked</div>
          </div>
        </div>

        <div className="p-3 rounded-lg border border-border bg-white h-full min-h-[92px] flex flex-col justify-between shadow-2xs">
          <div className="flex items-center justify-between text-xs uppercase font-bold text-slate-500">
            <span>Security Alerts</span>
            <AlertTriangleIcon className="size-3.5 text-amber-500" />
          </div>
          <div>
            <div className="text-xl font-bold text-indigo-600">{securityEvents.length}</div>
            <div className="text-xs text-slate-400">Recorded events</div>
          </div>
        </div>
      </div>

      {securityError ? (
        <ErrorState error={securityError} onRetry={() => refetch()} />
      ) : (
      <>
      {/* Module Navigation */}
      <UsersNav />

      {/* Security Attention Queue (Section 44) */}
      {attentionItems.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-3 space-y-2 mt-3">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-900">
            <ShieldAlertIcon className="size-4 text-amber-600" />
            <span>Security Attention Queue ({attentionItems.length})</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-1.5">
            {attentionItems.slice(0, 3).map((item) => (
              <div
                key={item.id}
                className="p-2.5 rounded border border-amber-200/80 bg-white text-xs flex flex-col justify-between space-y-1.5"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-800">{item.userName}</span>
                    <span className="text-xs text-slate-400">{formatRelativeTime(item.timestamp)}</span>
                  </div>
                  <p className="text-xs text-slate-600 mt-0.5 line-clamp-2">
                    {item.issue}
                  </p>
                </div>

                <div className="pt-1 flex items-center justify-between border-t border-slate-100">
                  <span className="text-xs uppercase font-bold text-amber-600">{item.severity}</span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => router.push(ROUTES.superAdmin.user(item.userId))}
                    className="h-6 text-xs px-2"
                  >
                    Inspect User
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="relative flex-1 min-w-[180px] max-w-sm">
          <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search user, email or company..."
            className="h-8.5 pl-8 text-xs bg-white"
          />
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          <Select value={companyId} onValueChange={setCompanyId}>
            <SelectTrigger className="h-8.5 text-xs w-[140px] bg-white">
              <SelectValue placeholder="All Companies" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Companies</SelectItem>
              {companyOptions.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={twoFactorFilter} onValueChange={setTwoFactorFilter}>
            <SelectTrigger className="h-8.5 text-xs w-[130px] bg-white">
              <SelectValue placeholder="2FA Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All 2FA</SelectItem>
              <SelectItem value="enabled">2FA Active</SelectItem>
              <SelectItem value="required_not_configured">Required · Missing</SelectItem>
              <SelectItem value="not_enabled">Not Enabled</SelectItem>
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-8.5 text-xs w-[125px] bg-white">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="suspended">Suspended</SelectItem>
              <SelectItem value="deactivated">Deactivated</SelectItem>
            </SelectContent>
          </Select>

          {(search || companyId !== "all" || twoFactorFilter !== "all" || statusFilter !== "all") && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearch("");
                setCompanyId("all");
                setTwoFactorFilter("all");
                setStatusFilter("all");
              }}
              className="h-8.5 text-xs gap-1"
            >
              <RotateCcwIcon className="size-3" />
              <span>Reset</span>
            </Button>
          )}
        </div>
      </div>

      {/* Security Users Table (Section 45) */}
      <div className="rounded-md border border-border bg-white overflow-hidden shadow-2xs">
        <Table>
          <TableHeader className="bg-slate-50/75 border-b border-border text-xs font-semibold text-slate-500 uppercase tracking-wider">
            <TableRow>
              <TableHead className="min-w-[220px]">User</TableHead>
              <TableHead className="min-w-[140px]">Company Access</TableHead>
              <TableHead className="min-w-[120px]">2FA Status</TableHead>
              <TableHead className="min-w-[100px]">Policy Mandate</TableHead>
              <TableHead className="min-w-[105px]">Last Login</TableHead>
              <TableHead className="min-w-[100px]">Security Posture</TableHead>
              <TableHead className="min-w-[90px]">Account</TableHead>
              <TableHead className="w-12 text-right pr-3">
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>

          <TableBody className="divide-y divide-border/60">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, idx) => (
                <TableRow key={idx} className="animate-pulse h-12">
                  <TableCell colSpan={8} className="py-3 px-4">
                    <div className="h-4 bg-slate-100 rounded w-2/3" />
                  </TableCell>
                </TableRow>
              ))
            ) : securityUsers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="py-8 text-center text-slate-400 text-xs italic">
                  No accounts match the active security filters.
                </TableCell>
              </TableRow>
            ) : (
              securityUsers.map((u) => {
                return (
                  <TableRow
                    key={u.identity.id}
                    onClick={() => router.push(`${ROUTES.superAdmin.user(u.identity.id)}?tab=security`)}
                    className="group text-xs cursor-pointer hover:bg-slate-50/80 transition-colors"
                  >
                    {/* User */}
                    <TableCell className="py-2.5">
                      <UserIdentityCell user={u.identity} hasOwnerAccess={u.hasOwnerAccess} />
                    </TableCell>

                    {/* Company Access */}
                    <TableCell className="py-2.5">
                      <div className="text-slate-700 font-medium truncate max-w-[160px]">
                        {u.memberships.map((m) => m.companyName).join(", ") || "No active company"}
                      </div>
                    </TableCell>

                    {/* 2FA Enrollment */}
                    <TableCell className="py-2.5">
                      <SecurityStatusBadge status={u.security.twoFactorStatus} />
                    </TableCell>

                    {/* 2FA Requirement */}
                    <TableCell className="py-2.5">
                      {u.security.twoFactorRequired ? (
                        <span className="text-xs font-semibold text-amber-700">
                          Mandated
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">Optional</span>
                      )}
                    </TableCell>

                    {/* Last Login */}
                    <TableCell className="py-2.5 text-slate-500 whitespace-nowrap">
                      {u.identity.lastLoginAt ? formatRelativeTime(u.identity.lastLoginAt) : "Never"}
                    </TableCell>

                    {/* Security Status */}
                    <TableCell className="py-2.5">
                      <SecurityPostureBadge posture={u.securityPosture} />
                    </TableCell>

                    {/* Global Account Status */}
                    <TableCell className="py-2.5">
                      <UserStatusBadge status={u.identity.globalStatus} />
                    </TableCell>

                    {/* Row Actions */}
                    <TableCell className="py-2.5 text-right pr-3" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            type="button"
                            className="size-7 rounded p-0 hover:bg-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-900 cursor-pointer"
                          >
                            <MoreHorizontalIcon className="size-4" />
                          </button>
                        </DropdownMenuTrigger>

                        <DropdownMenuContent align="end" className="w-48 text-xs">
                          <DropdownMenuItem
                            onClick={() => router.push(`${ROUTES.superAdmin.user(u.identity.id)}?tab=security`)}
                            className="cursor-pointer gap-2"
                          >
                            <ShieldCheckIcon className="size-3.5 text-slate-500" />
                            <span>Open User Security</span>
                          </DropdownMenuItem>

                          {capabilities.canRequire2FA && (
                            <>
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedUser(u);
                                  setRequire2faOpen(true);
                                }}
                                className="cursor-pointer gap-2"
                              >
                                <KeyRoundIcon className="size-3.5 text-slate-500" />
                                <span>{u.security.twoFactorRequired ? "Relax 2FA Policy" : "Require 2FA"}</span>
                              </DropdownMenuItem>

                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedUser(u);
                                  setPasswordResetOpen(true);
                                }}
                                className="cursor-pointer gap-2"
                              >
                                <MailIcon className="size-3.5 text-slate-500" />
                                <span>Require Password Reset</span>
                              </DropdownMenuItem>

                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedUser(u);
                                  setRevokeSessionsOpen(true);
                                }}
                                className="cursor-pointer gap-2 text-amber-700"
                              >
                                <LogOutIcon className="size-3.5" />
                                <span>Revoke Sessions ({u.activeSessionsCount})</span>
                              </DropdownMenuItem>

                              {u.security.isLocked && (
                                <DropdownMenuItem
                                  onClick={() => {
                                    setSelectedUser(u);
                                    setUnlockOpen(true);
                                  }}
                                  className="cursor-pointer gap-2 text-emerald-600 font-medium"
                                >
                                  <UnlockIcon className="size-3.5" />
                                  <span>Unlock Account</span>
                                </DropdownMenuItem>
                              )}
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Security Action Dialogs */}
      <Require2faDialog user={selectedUser} open={require2faOpen} onOpenChange={setRequire2faOpen} />
      <RequirePasswordResetDialog user={selectedUser} open={passwordResetOpen} onOpenChange={setPasswordResetOpen} />
      <RevokeSessionsDialog user={selectedUser} open={revokeSessionsOpen} onOpenChange={setRevokeSessionsOpen} />
      <UnlockAccountDialog user={selectedUser} open={unlockOpen} onOpenChange={setUnlockOpen} />
      </>
      )}
    </div>
  );
}
