"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  MoreHorizontalIcon,
  CheckCircle2Icon,
  EyeIcon,
  ShieldCheckIcon,
  UserIcon,
  Building2Icon,
  FolderIcon,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ROUTES } from "@/config/routes";
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
  const router = useRouter();

  return (
    <div className="rounded-sm border border-border bg-white shadow-2xs w-full min-w-0 overflow-hidden">
      <div className="w-full overflow-x-auto min-w-0">
        <Table className="w-full min-w-200">
          <TableHeader className="bg-slate-50 border-b border-border text-xs font-semibold tracking-wider text-slate-500 uppercase">
            <TableRow className="hover:bg-transparent">
              <TableHead className="px-3">Staff Member</TableHead>
              <TableHead className="px-3">Role</TableHead>
              <TableHead className="px-3 whitespace-nowrap">Privileged</TableHead>
              <TableHead className="px-3">MFA</TableHead>
              <TableHead className="px-3 whitespace-nowrap">Last Review</TableHead>
              <TableHead className="px-3 whitespace-nowrap">Next Review</TableHead>
              <TableHead className="px-3">Status</TableHead>
              <TableHead className="w-28 text-right pr-3"><span className="sr-only">Actions</span></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-border/60">
            {isLoading ? (
              Array.from({ length: 4 }).map((_, idx) => (
                <TableRow key={idx} className="animate-pulse h-11">
                  <TableCell colSpan={8} className="py-2 px-3">
                    <div className="h-4 bg-slate-100 rounded w-3/4" />
                  </TableCell>
                </TableRow>
              ))
            ) : reviews.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="py-8 text-center text-slate-400 text-xs italic">
                  No access reviews found.
                </TableCell>
              </TableRow>
            ) : (
              reviews.map((review) => {
                const profileUrl = `${ROUTES.superAdmin.team}/${review.staffId}`;
                const isDue = review.status === "due" || review.status === "overdue";

                return (
                  <TableRow
                    key={review.id}
                    className="text-xs hover:bg-slate-50/80 transition-colors"
                  >
                    <TableCell className="py-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Link href={profileUrl} className="shrink-0 group block" title={`View profile for ${review.staffName}`}>
                          <Avatar className="size-7 shrink-0 transition-transform group-hover:scale-105">
                            <AvatarFallback className={cn("text-[10px] font-semibold", getStaffAvatarColor(review.staffName))}>
                              {getInitials(review.staffName)}
                            </AvatarFallback>
                          </Avatar>
                        </Link>
                        <div className="min-w-0">
                          <Link
                            href={profileUrl}
                            className="font-semibold text-slate-900 hover:text-blue-600 hover:underline truncate block transition-colors"
                            title={`View profile for ${review.staffName}`}
                          >
                            {review.staffName}
                          </Link>
                          <span className="text-[11px] text-slate-500 truncate block">{review.staffEmail}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="py-2">
                      <StaffRoleBadge role={review.role} />
                    </TableCell>
                    <TableCell className="py-2">
                      {review.role === "super_admin" || review.role === "technical_admin" ? (
                        <PrivilegedBadge privileged />
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </TableCell>
                    <TableCell className="py-2">
                      <MfaStateBadge state={review.mfaState} />
                    </TableCell>
                    <TableCell className="py-2 text-xs text-slate-500 whitespace-nowrap">
                      {review.lastReviewDate ? formatDate(review.lastReviewDate) : "Never"}
                    </TableCell>
                    <TableCell className="py-2 text-xs text-slate-500 whitespace-nowrap">
                      {review.nextReviewDate ? formatDate(review.nextReviewDate) : "—"}
                    </TableCell>
                    <TableCell className="py-2">
                      <AccessReviewStatusBadge status={review.status} />
                    </TableCell>
                    <TableCell className="py-2 text-right pr-3" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        {isDue && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => onCompleteReview?.(review)}
                            className="h-6 px-2 text-[11px] font-medium text-blue-700 bg-blue-50/60 border-blue-200 hover:bg-blue-100 hover:text-blue-800 gap-1 rounded-sm shrink-0"
                            title="Complete Access Review"
                          >
                            <CheckCircle2Icon className="size-3 text-blue-600" />
                            <span>Review</span>
                          </Button>
                        )}

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              type="button"
                              className="size-7 rounded-sm p-0 hover:bg-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
                              aria-label={`Actions for ${review.staffName}`}
                            >
                              <MoreHorizontalIcon className="size-4" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-52 text-xs">
                            <DropdownMenuLabel className="font-semibold text-slate-700">
                              {review.staffName}
                            </DropdownMenuLabel>
                            <DropdownMenuSeparator />

                            <DropdownMenuItem
                              onClick={() => onCompleteReview?.(review)}
                              className="gap-2 cursor-pointer text-blue-600 font-medium"
                            >
                              <CheckCircle2Icon className="size-3.5 text-blue-600" />
                              <span>{isDue ? "Complete Access Review" : "Conduct Access Review"}</span>
                            </DropdownMenuItem>

                            <DropdownMenuSeparator />

                            <DropdownMenuItem
                              onClick={() => router.push(profileUrl)}
                              className="gap-2 cursor-pointer"
                            >
                              <UserIcon className="size-3.5 text-slate-500" />
                              <span>Open Staff Profile</span>
                            </DropdownMenuItem>

                            <DropdownMenuItem
                              onClick={() => router.push(`${profileUrl}?tab=access`)}
                              className="gap-2 cursor-pointer"
                            >
                              <EyeIcon className="size-3.5 text-slate-500" />
                              <span>View Roles & Access</span>
                            </DropdownMenuItem>

                            <DropdownMenuItem
                              onClick={() => router.push(`${profileUrl}?tab=assignments`)}
                              className="gap-2 cursor-pointer"
                            >
                              <Building2Icon className="size-3.5 text-slate-500" />
                              <span>View Company Assignments</span>
                            </DropdownMenuItem>

                            <DropdownMenuItem
                              onClick={() => router.push(`${profileUrl}?tab=security`)}
                              className="gap-2 cursor-pointer"
                            >
                              <ShieldCheckIcon className="size-3.5 text-slate-500" />
                              <span>View Security & MFA</span>
                            </DropdownMenuItem>

                            <DropdownMenuItem
                              onClick={() => router.push(`${profileUrl}?tab=activity`)}
                              className="gap-2 cursor-pointer"
                            >
                              <FolderIcon className="size-3.5 text-slate-500" />
                              <span>View Activity Audit</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
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
