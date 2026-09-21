"use client";

import { MoreHorizontalIcon, EyeIcon, RotateCwIcon, XCircleIcon, MailIcon } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { formatDate, getInitials } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import { getStaffAvatarColor } from "../data/config";
import { StaffRoleBadge, InvitationStatusBadge } from "./staff-status-badges";
import type { StaffInvitation } from "../data/types";

interface InvitationTableProps {
  invitations: StaffInvitation[];
  isLoading?: boolean;
  onRevoke?: (invitation: StaffInvitation) => void;
  onResend?: (invitation: StaffInvitation) => void;
}

export function InvitationTable({ invitations, isLoading, onRevoke, onResend }: InvitationTableProps) {
  return (
    <div className="rounded-sm border border-border bg-white shadow-2xs w-full min-w-0 overflow-hidden">
      <div className="w-full overflow-x-auto min-w-0">
        <Table className="w-full min-w-[750px]">
          <TableHeader className="bg-slate-50 border-b border-border text-xs font-semibold tracking-wider text-slate-500 uppercase">
            <TableRow className="hover:bg-transparent">
              <TableHead className="px-3">Invitee</TableHead>
              <TableHead className="px-3">Platform Role</TableHead>
              <TableHead className="px-3">Department</TableHead>
              <TableHead className="px-3">Invited By</TableHead>
              <TableHead className="px-3 whitespace-nowrap">Created</TableHead>
              <TableHead className="px-3 whitespace-nowrap">Expires</TableHead>
              <TableHead className="px-3">Status</TableHead>
              <TableHead className="w-12 text-right pr-3"><span className="sr-only">Actions</span></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-border/60">
            {isLoading ? (
              Array.from({ length: 4 }).map((_, idx) => (
                <TableRow key={idx} className="animate-pulse h-11">
                  <TableCell colSpan={8} className="py-2 px-3"><div className="h-4 bg-slate-100 rounded w-3/4" /></TableCell>
                </TableRow>
              ))
            ) : invitations.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="py-8 text-center text-slate-400 text-xs italic">No invitations found.</TableCell>
              </TableRow>
            ) : (
              invitations.map((inv) => (
                <TableRow key={inv.id} className="text-xs hover:bg-slate-50/80">
                  <TableCell className="py-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Avatar className="size-7 shrink-0">
                        <AvatarFallback className={cn("text-[10px] font-semibold", getStaffAvatarColor(inv.name))}>
                          {getInitials(inv.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <span className="font-semibold text-slate-900 truncate block">{inv.name}</span>
                        <span className="text-[11px] text-slate-500 truncate block">{inv.email}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="py-2"><StaffRoleBadge role={inv.role} /></TableCell>
                  <TableCell className="py-2 text-xs text-slate-600">{inv.department}</TableCell>
                  <TableCell className="py-2 text-xs text-slate-600">{inv.invitedBy.name}</TableCell>
                  <TableCell className="py-2 text-xs text-slate-500 whitespace-nowrap">{formatDate(inv.createdAt)}</TableCell>
                  <TableCell className="py-2 text-xs text-slate-500 whitespace-nowrap">{formatDate(inv.expiresAt)}</TableCell>
                  <TableCell className="py-2"><InvitationStatusBadge status={inv.status} /></TableCell>
                  <TableCell className="py-2 text-right pr-3">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button type="button" className="size-7 rounded-sm p-0 hover:bg-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-900 transition-colors cursor-pointer">
                          <MoreHorizontalIcon className="size-4" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48 text-xs">
                        <DropdownMenuLabel className="font-semibold text-slate-700">{inv.name}</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {inv.status === "pending" && (
                          <>
                            <DropdownMenuItem onClick={() => onRevoke?.(inv)} className="gap-2 cursor-pointer text-rose-600">
                              <XCircleIcon className="size-3.5" /> Revoke Invitation
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onResend?.(inv)} className="gap-2 cursor-pointer">
                              <RotateCwIcon className="size-3.5 text-slate-500" /> Resend (Demo)
                            </DropdownMenuItem>
                          </>
                        )}
                        {inv.status === "expired" && (
                          <DropdownMenuItem onClick={() => onResend?.(inv)} className="gap-2 cursor-pointer">
                            <RotateCwIcon className="size-3.5 text-slate-500" /> Re-invite
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
