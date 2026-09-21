"use client";

import { MoreHorizontalIcon, CheckCircle2Icon, EyeIcon, ShieldCheckIcon } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { formatDate, getInitials } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import { getStaffAvatarColor } from "../data/config";
import { StaffRoleBadge, MfaStateBadge, AccessReviewStatusBadge, PrivilegedBadge } from "./staff-status-badges";
import type { StaffAccessReview } from "../data/types";

interface AccessReviewTableProps {
  reviews: StaffAccessReview[];
  isLoading?: boolean;
  onCompleteReview?: (review: StaffAccessReview) => void;
}

export function AccessReviewTable({ reviews, isLoading, onCompleteReview }: AccessReviewTableProps) {
  return (
    <div className="rounded-sm border border-border bg-white shadow-2xs w-full min-w-0 overflow-hidden">
      <div className="w-full overflow-x-auto min-w-0">
        <Table className="w-full min-w-[800px]">
          <TableHeader className="bg-slate-50 border-b border-border text-xs font-semibold tracking-wider text-slate-500 uppercase">
            <TableRow className="hover:bg-transparent">
              <TableHead className="px-3">Staff Member</TableHead>
              <TableHead className="px-3">Role</TableHead>
              <TableHead className="px-3 whitespace-nowrap">Privileged</TableHead>
              <TableHead className="px-3">MFA</TableHead>
              <TableHead className="px-3 whitespace-nowrap">Last Review</TableHead>
              <TableHead className="px-3 whitespace-nowrap">Next Review</TableHead>
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
            ) : reviews.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="py-8 text-center text-slate-400 text-xs italic">No access reviews found.</TableCell>
              </TableRow>
            ) : (
              reviews.map((review) => (
                <TableRow key={review.id} className="text-xs hover:bg-slate-50/80">
                  <TableCell className="py-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Avatar className="size-7 shrink-0">
                        <AvatarFallback className={cn("text-[10px] font-semibold", getStaffAvatarColor(review.staffName))}>
                          {getInitials(review.staffName)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <span className="font-semibold text-slate-900 truncate block">{review.staffName}</span>
                        <span className="text-[11px] text-slate-500 truncate block">{review.staffEmail}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="py-2"><StaffRoleBadge role={review.role} /></TableCell>
                  <TableCell className="py-2">
                    {review.role === "super_admin" || review.role === "technical_admin" ? (
                      <PrivilegedBadge privileged />
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </TableCell>
                  <TableCell className="py-2"><MfaStateBadge state={review.mfaState} /></TableCell>
                  <TableCell className="py-2 text-xs text-slate-500 whitespace-nowrap">
                    {review.lastReviewDate ? formatDate(review.lastReviewDate) : "Never"}
                  </TableCell>
                  <TableCell className="py-2 text-xs text-slate-500 whitespace-nowrap">
                    {review.nextReviewDate ? formatDate(review.nextReviewDate) : "—"}
                  </TableCell>
                  <TableCell className="py-2"><AccessReviewStatusBadge status={review.status} /></TableCell>
                  <TableCell className="py-2 text-right pr-3">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button type="button" className="size-7 rounded-sm p-0 hover:bg-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-900 transition-colors cursor-pointer">
                          <MoreHorizontalIcon className="size-4" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48 text-xs">
                        <DropdownMenuLabel className="font-semibold text-slate-700">{review.staffName}</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {(review.status === "due" || review.status === "overdue") && (
                          <DropdownMenuItem onClick={() => onCompleteReview?.(review)} className="gap-2 cursor-pointer text-blue-600 font-medium">
                            <CheckCircle2Icon className="size-3.5" /> Complete Review
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem className="gap-2 cursor-pointer">
                          <EyeIcon className="size-3.5 text-slate-500" /> View Effective Access
                        </DropdownMenuItem>
                        <DropdownMenuItem className="gap-2 cursor-pointer">
                          <ShieldCheckIcon className="size-3.5 text-slate-500" /> View Security
                        </DropdownMenuItem>
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
