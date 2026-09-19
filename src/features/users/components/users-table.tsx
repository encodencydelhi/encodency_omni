import {
  BanIcon,
  Building2Icon,
  CheckCircle2Icon,
  EyeIcon,
  FolderIcon,
  LogOutIcon,
  MailIcon,
  MoreHorizontalIcon,
  ShieldCheckIcon,
  UserCheckIcon,
  UserIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ROUTES } from "@/config/routes";
import { formatDate, formatRelativeTime } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import { ClientAccessPopover } from "./client-access-popover";
import { CompanyAccessPopover, CompanyRoleAccessCell } from "./company-access-popover";
import { SecurityStatusBadge, UserStatusBadge } from "./status-badges";
import { UserIdentityCell } from "./user-identity-cell";
import type { UserAggregate } from "../data/types";
import { useUserCapabilities } from "../data/capability-provider";

interface UsersTableProps {
  users: UserAggregate[];
  selectedUsers: UserAggregate[];
  onToggleSelect: (user: UserAggregate) => void;
  onToggleSelectAll: () => void;
  onRowClick: (user: UserAggregate) => void;
  onPreviewClick?: (user: UserAggregate) => void;
  onAddMembershipClick?: (user: UserAggregate) => void;
  onSuspendClick?: (user: UserAggregate) => void;
  onReactivateClick?: (user: UserAggregate) => void;
  onRequire2faClick?: (user: UserAggregate) => void;
  onRequireResetClick?: (user: UserAggregate) => void;
  onRevokeSessionsClick?: (user: UserAggregate) => void;
  isLoading?: boolean;
  className?: string;
}

export function UsersTable({
  users,
  selectedUsers,
  onToggleSelect,
  onToggleSelectAll,
  onRowClick,
  onPreviewClick,
  onAddMembershipClick,
  onSuspendClick,
  onReactivateClick,
  onRequire2faClick,
  onRequireResetClick,
  onRevokeSessionsClick,
  isLoading,
  className,
}: UsersTableProps) {
  const router = useRouter();
  const capabilities = useUserCapabilities();

  const isAllSelected = users.length > 0 && selectedUsers.length === users.length;
  const isIndeterminate = selectedUsers.length > 0 && selectedUsers.length < users.length;

  return (
    <div className={cn("rounded-lg border border-border bg-white shadow-2xs w-full min-w-0 max-w-full overflow-hidden", className)}>
      <div className="w-full overflow-x-auto min-w-0">
        <Table className="w-full min-w-[860px]">
          <TableHeader className="bg-slate-50 border-b border-border text-xs font-semibold tracking-wider text-slate-500 uppercase">
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-10 px-3">
                <Checkbox
                  checked={isAllSelected || isIndeterminate}
                  onCheckedChange={onToggleSelectAll}
                  aria-label="Select all users"
                  className="translate-y-0.5"
                />
              </TableHead>
              <TableHead className="px-3">User</TableHead>
              <TableHead className="px-3">Companies</TableHead>
              <TableHead className="px-3">Access</TableHead>
              <TableHead className="px-3 whitespace-nowrap">Clients</TableHead>
              <TableHead className="px-3 whitespace-nowrap">2FA</TableHead>
              <TableHead className="px-3 whitespace-nowrap">Account</TableHead>
              <TableHead className="px-3 whitespace-nowrap">Last Active</TableHead>
              <TableHead className="px-3 whitespace-nowrap hidden xl:table-cell">Joined</TableHead>
              <TableHead className="w-12 text-right pr-3">
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>

        <TableBody className="divide-y divide-border/60">
          {isLoading ? (
            Array.from({ length: 6 }).map((_, idx) => (
              <TableRow key={idx} className="animate-pulse h-12">
                <TableCell colSpan={10} className="py-3 px-4">
                  <div className="h-4 bg-slate-100 rounded w-3/4" />
                </TableCell>
              </TableRow>
            ))
          ) : users.length === 0 ? (
            <TableRow>
              <TableCell colSpan={10} className="py-8 text-center text-slate-400 text-xs italic">
                No users match the active filters.
              </TableCell>
            </TableRow>
          ) : (
            users.map((u) => {
              const isSelected = selectedUsers.some((s) => s.identity.id === u.identity.id);
              const isSuspended = u.identity.globalStatus === "suspended";

              return (
                <TableRow
                  key={u.identity.id}
                  onClick={() => onRowClick(u)}
                  className={cn(
                    "group text-xs cursor-pointer transition-colors hover:bg-slate-50/80",
                    isSelected && "bg-blue-50/40",
                  )}
                >
                  <TableCell
                    className="w-10 px-3 py-2"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleSelect(u);
                    }}
                  >
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => onToggleSelect(u)}
                      aria-label={`Select ${u.identity.name}`}
                      className="translate-y-0.5"
                    />
                  </TableCell>

                  <TableCell className="py-2">
                    <UserIdentityCell user={u.identity} hasOwnerAccess={u.hasOwnerAccess} />
                  </TableCell>

                  <TableCell className="py-2">
                    <CompanyAccessPopover
                      memberships={u.memberships}
                      userId={u.identity.id}
                    />
                  </TableCell>

                  <TableCell className="py-2">
                    <CompanyRoleAccessCell
                      memberships={u.memberships}
                      userId={u.identity.id}
                    />
                  </TableCell>

                  <TableCell className="py-2 whitespace-nowrap">
                    <ClientAccessPopover
                      memberships={u.memberships}
                      totalClients={u.totalClientsCount}
                    />
                  </TableCell>

                  <TableCell className="py-2 whitespace-nowrap">
                    <SecurityStatusBadge status={u.security.twoFactorStatus} />
                  </TableCell>

                  <TableCell className="py-2 whitespace-nowrap">
                    <UserStatusBadge status={u.identity.globalStatus} />
                  </TableCell>

                  <TableCell className="py-2 text-xs text-slate-500 whitespace-nowrap">
                    {u.identity.lastLoginAt
                      ? formatRelativeTime(u.identity.lastLoginAt)
                      : "Never"}
                  </TableCell>

                  <TableCell className="py-2 text-xs text-slate-500 whitespace-nowrap hidden xl:table-cell">
                    {formatDate(u.identity.createdAt)}
                  </TableCell>

                  <TableCell
                    className="py-2 text-right pr-3"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          className="size-7 rounded p-0 hover:bg-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
                          aria-label={`Actions for ${u.identity.name}`}
                        >
                          <MoreHorizontalIcon className="size-4" />
                        </button>
                      </DropdownMenuTrigger>

                      <DropdownMenuContent align="end" className="w-52 text-xs">
                        <DropdownMenuLabel className="font-semibold text-slate-700">
                          {u.identity.name}
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />

                        <DropdownMenuItem
                          onClick={() => router.push(ROUTES.superAdmin.user(u.identity.id))}
                          className="gap-2 cursor-pointer"
                        >
                          <UserIcon className="size-3.5 text-slate-500" />
                          <span>View Full Profile</span>
                        </DropdownMenuItem>

                        <DropdownMenuItem
                          onClick={() => onPreviewClick ? onPreviewClick(u) : router.push(ROUTES.superAdmin.user(u.identity.id))}
                          className="gap-2 cursor-pointer"
                        >
                          <EyeIcon className="size-3.5 text-slate-500" />
                          <span>Quick Preview</span>
                        </DropdownMenuItem>

                        <DropdownMenuItem
                          onClick={() =>
                            router.push(`${ROUTES.superAdmin.user(u.identity.id)}?tab=company-access`)
                          }
                          className="gap-2 cursor-pointer"
                        >
                          <Building2Icon className="size-3.5 text-slate-500" />
                          <span>View Company Access</span>
                        </DropdownMenuItem>

                        <DropdownMenuItem
                          onClick={() =>
                            router.push(`${ROUTES.superAdmin.user(u.identity.id)}?tab=activity`)
                          }
                          className="gap-2 cursor-pointer"
                        >
                          <FolderIcon className="size-3.5 text-slate-500" />
                          <span>View Activity</span>
                        </DropdownMenuItem>

                        {capabilities.canManageMemberships && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => onAddMembershipClick?.(u)}
                              className="gap-2 cursor-pointer text-blue-600 font-medium"
                            >
                              <UserCheckIcon className="size-3.5" />
                              <span>Add to Company</span>
                            </DropdownMenuItem>
                          </>
                        )}

                        {capabilities.canRequire2FA && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => onRequire2faClick?.(u)}
                              className="gap-2 cursor-pointer"
                            >
                              <ShieldCheckIcon className="size-3.5 text-slate-500" />
                              <span>{u.security.twoFactorRequired ? "Relax 2FA Policy" : "Require 2FA Policy"}</span>
                            </DropdownMenuItem>

                            <DropdownMenuItem
                              onClick={() => onRequireResetClick?.(u)}
                              className="gap-2 cursor-pointer"
                            >
                              <MailIcon className="size-3.5 text-slate-500" />
                              <span>Require Password Reset</span>
                            </DropdownMenuItem>

                            <DropdownMenuItem
                              onClick={() => onRevokeSessionsClick?.(u)}
                              className="gap-2 cursor-pointer text-amber-700"
                            >
                              <LogOutIcon className="size-3.5" />
                              <span>Revoke Sessions ({u.activeSessionsCount})</span>
                            </DropdownMenuItem>
                          </>
                        )}

                        {capabilities.canSuspendGlobalAccount && (
                          <>
                            <DropdownMenuSeparator />
                            {isSuspended ? (
                              <DropdownMenuItem
                                onClick={() => onReactivateClick?.(u)}
                                className="gap-2 cursor-pointer text-emerald-600 font-medium"
                              >
                                <CheckCircle2Icon className="size-3.5" />
                                <span>Reactivate Global Account</span>
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem
                                onClick={() => onSuspendClick?.(u)}
                                className="gap-2 cursor-pointer text-rose-600 font-medium"
                              >
                                <BanIcon className="size-3.5" />
                                <span>Suspend Global Account</span>
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
    </div>
  );
}
