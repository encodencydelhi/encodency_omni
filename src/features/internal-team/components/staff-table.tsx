"use client";

import { MoreHorizontalIcon, EyeIcon, UserIcon, ShieldCheckIcon, Building2Icon, FolderIcon, BanIcon, CheckCircle2Icon } from "lucide-react";
import { useRouter } from "next/navigation";
import { Checkbox } from "@/components/ui/checkbox";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ROUTES } from "@/config/routes";
import { formatRelativeTime, getInitials } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import { getStaffAvatarColor } from "../data/config";
import { StaffRoleBadge, StaffStatusBadge, MfaStateBadge, AccessReviewStatusBadge, PrivilegedBadge } from "./staff-status-badges";
import type { StaffMember } from "../data/types";
import { useStaffCapabilities } from "../data/capability-provider";

interface StaffTableProps {
  staff: StaffMember[];
  selectedIds: string[];
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: () => void;
  onRowClick: (member: StaffMember) => void;
  onPreview?: (member: StaffMember) => void;
  onSuspend?: (member: StaffMember) => void;
  onReactivate?: (member: StaffMember) => void;
  onChangeRole?: (member: StaffMember) => void;
  isLoading?: boolean;
}

export function StaffTable({
  staff, selectedIds, onToggleSelect, onToggleSelectAll, onRowClick, onPreview, onSuspend, onReactivate, onChangeRole, isLoading,
}: StaffTableProps) {
  const router = useRouter();
  const caps = useStaffCapabilities();
  const isAllSelected = staff.length > 0 && selectedIds.length === staff.length;

  return (
    <div className="rounded-sm border border-border bg-white shadow-2xs w-full min-w-0 overflow-hidden">
      <div className="w-full overflow-x-auto min-w-0">
        <Table className="w-full min-w-[900px]">
          <TableHeader className="bg-slate-50 border-b border-border text-xs font-semibold tracking-wider text-slate-500 uppercase">
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-10 px-3">
                <Checkbox checked={isAllSelected} onCheckedChange={onToggleSelectAll} aria-label="Select all" className="translate-y-0.5" />
              </TableHead>
              <TableHead className="px-3">Staff Member</TableHead>
              <TableHead className="px-3">Role</TableHead>
              <TableHead className="px-3">Department</TableHead>
              <TableHead className="px-3">Status</TableHead>
              <TableHead className="px-3 whitespace-nowrap">Companies</TableHead>
              <TableHead className="px-3 whitespace-nowrap">Security</TableHead>
              <TableHead className="px-3 whitespace-nowrap">Last Active</TableHead>
              <TableHead className="px-3 whitespace-nowrap hidden xl:table-cell">Review</TableHead>
              <TableHead className="w-12 text-right pr-3"><span className="sr-only">Actions</span></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-border/60">
            {isLoading ? (
              Array.from({ length: 6 }).map((_, idx) => (
                <TableRow key={idx} className="animate-pulse h-11">
                  <TableCell colSpan={10} className="py-2 px-3">
                    <div className="h-4 bg-slate-100 rounded w-3/4" />
                  </TableCell>
                </TableRow>
              ))
            ) : staff.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="py-8 text-center text-slate-400 text-xs italic">No staff members match the current filters.</TableCell>
              </TableRow>
            ) : (
              staff.map((member) => {
                const isSelected = selectedIds.includes(member.id);
                const activeAssignments = member.assignments.filter((a) => a.status === "active");
                return (
                  <TableRow
                    key={member.id}
                    onClick={() => onRowClick(member)}
                    className={cn("group text-xs cursor-pointer transition-colors hover:bg-slate-50/80", isSelected && "bg-blue-50/40")}
                  >
                    <TableCell className="w-10 px-3 py-2" onClick={(e) => { e.stopPropagation(); onToggleSelect(member.id); }}>
                      <Checkbox checked={isSelected} onCheckedChange={() => onToggleSelect(member.id)} aria-label={`Select ${member.name}`} className="translate-y-0.5" />
                    </TableCell>
                    <TableCell className="py-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Avatar className="size-8 shrink-0">
                          <AvatarFallback className={cn("text-xs font-semibold", getStaffAvatarColor(member.name))}>
                            {getInitials(member.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-slate-900 truncate">{member.name}</span>
                            <PrivilegedBadge privileged={member.privilegedAccess} />
                          </div>
                          <div className="text-[11px] text-slate-500 truncate">{member.email}</div>
                          <div className="text-[11px] text-slate-400 font-mono">{member.id}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="py-2"><StaffRoleBadge role={member.role} /></TableCell>
                    <TableCell className="py-2 text-xs text-slate-600 truncate max-w-[120px]">{member.department}</TableCell>
                    <TableCell className="py-2"><StaffStatusBadge status={member.status} /></TableCell>
                    <TableCell className="py-2">
                      <span className="text-xs font-medium text-slate-700">{activeAssignments.length} Companies</span>
                    </TableCell>
                    <TableCell className="py-2"><MfaStateBadge state={member.mfaState} /></TableCell>
                    <TableCell className="py-2 text-xs text-slate-500 whitespace-nowrap">
                      {member.lastActiveAt ? formatRelativeTime(member.lastActiveAt) : "Never"}
                    </TableCell>
                    <TableCell className="py-2 hidden xl:table-cell"><AccessReviewStatusBadge status={member.accessReviewStatus} /></TableCell>
                    <TableCell className="py-2 text-right pr-3" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button type="button" className="size-7 rounded-sm p-0 hover:bg-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-900 transition-colors cursor-pointer" aria-label={`Actions for ${member.name}`}>
                            <MoreHorizontalIcon className="size-4" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-52 text-xs">
                          <DropdownMenuLabel className="font-semibold text-slate-700">{member.name}</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => router.push(`${ROUTES.superAdmin.team}/${member.id}`)} className="gap-2 cursor-pointer">
                            <UserIcon className="size-3.5 text-slate-500" /> <span>Open Profile</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onPreview?.(member)} className="gap-2 cursor-pointer">
                            <EyeIcon className="size-3.5 text-slate-500" /> <span>Quick Preview</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => router.push(`${ROUTES.superAdmin.team}/${member.id}?tab=access`)} className="gap-2 cursor-pointer">
                            <ShieldCheckIcon className="size-3.5 text-slate-500" /> <span>View Roles & Access</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => router.push(`${ROUTES.superAdmin.team}/${member.id}?tab=assignments`)} className="gap-2 cursor-pointer">
                            <Building2Icon className="size-3.5 text-slate-500" /> <span>View Assignments</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => router.push(`${ROUTES.superAdmin.team}/${member.id}?tab=activity`)} className="gap-2 cursor-pointer">
                            <FolderIcon className="size-3.5 text-slate-500" /> <span>View Activity</span>
                          </DropdownMenuItem>
                          {caps.canChangePlatformRole && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => onChangeRole?.(member)} className="gap-2 cursor-pointer text-blue-600 font-medium">
                                <ShieldCheckIcon className="size-3.5" /> <span>Change Platform Role</span>
                              </DropdownMenuItem>
                            </>
                          )}
                          {caps.canSuspendStaff && (
                            <>
                              <DropdownMenuSeparator />
                              {member.status === "suspended" ? (
                                <DropdownMenuItem onClick={() => onReactivate?.(member)} className="gap-2 cursor-pointer text-emerald-600 font-medium">
                                  <CheckCircle2Icon className="size-3.5" /> <span>Reactivate Staff</span>
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem onClick={() => onSuspend?.(member)} className="gap-2 cursor-pointer text-rose-600 font-medium">
                                  <BanIcon className="size-3.5" /> <span>Suspend Staff</span>
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
