"use client";

import { ShieldCheckIcon, Building2Icon, UserIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetBody, SheetFooter } from "@/components/ui/sheet";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ROUTES } from "@/config/routes";
import { formatRelativeTime, getInitials } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import { INTERNAL_ROLE } from "@/types/domain/team";
import { getStaffAvatarColor } from "../data/config";
import { StaffStatusBadge, StaffRoleBadge, MfaStateBadge, AccessReviewStatusBadge } from "./staff-status-badges";
import type { StaffMember } from "../data/types";

interface StaffQuickPreviewProps {
  member: StaffMember | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChangeRole?: (member: StaffMember) => void;
  onSuspend?: (member: StaffMember) => void;
}

export function StaffQuickPreview({ member, open, onOpenChange, onChangeRole, onSuspend }: StaffQuickPreviewProps) {
  const router = useRouter();
  if (!member) return null;
  const activeAssignments = member.assignments.filter((a) => a.status === "active");
  const roleMeta = INTERNAL_ROLE[member.role];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full max-w-md p-0">
        <SheetHeader>
          <SheetTitle>Staff Preview</SheetTitle>
        </SheetHeader>
        <SheetBody className="space-y-4">
          {/* Identity */}
          <div className="flex items-start gap-3">
            <Avatar className="size-12 shrink-0">
              <AvatarFallback className={cn("text-sm font-bold", getStaffAvatarColor(member.name))}>
                {getInitials(member.name)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-slate-900 truncate">{member.name}</h3>
              <p className="text-xs text-slate-500 truncate">{member.email}</p>
              <p className="text-xs text-slate-400 font-mono mt-0.5">{member.id}</p>
            </div>
          </div>

          {/* Quick Info */}
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-sm border border-border p-2.5">
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Role</p>
              <StaffRoleBadge role={member.role} />
            </div>
            <div className="rounded-sm border border-border p-2.5">
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Status</p>
              <StaffStatusBadge status={member.status} />
            </div>
            <div className="rounded-sm border border-border p-2.5">
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">MFA</p>
              <MfaStateBadge state={member.mfaState} />
            </div>
            <div className="rounded-sm border border-border p-2.5">
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Access Review</p>
              <AccessReviewStatusBadge status={member.accessReviewStatus} />
            </div>
          </div>

          {/* Access */}
          <div className="rounded-sm border border-border p-3">
            <div className="flex items-center gap-1.5 mb-2">
              <ShieldCheckIcon className="size-3.5 text-slate-500" />
              <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Access</h4>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Department</span>
                <span className="text-slate-700 font-medium">{member.department}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Job Title</span>
                <span className="text-slate-700 font-medium">{member.jobTitle}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Privileged Access</span>
                {member.privilegedAccess ? <Badge tone="warning">Yes</Badge> : <Badge tone="neutral">No</Badge>}
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Last Active</span>
                <span className="text-slate-700">{member.lastActiveAt ? formatRelativeTime(member.lastActiveAt) : "Never"}</span>
              </div>
            </div>
          </div>

          {/* Assignments */}
          <div className="rounded-sm border border-border p-3">
            <div className="flex items-center gap-1.5 mb-2">
              <Building2Icon className="size-3.5 text-slate-500" />
              <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Assignments</h4>
            </div>
            {activeAssignments.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No active assignments</p>
            ) : (
              <div className="space-y-1.5">
                {activeAssignments.slice(0, 5).map((a) => (
                  <div key={a.id} className="flex items-center justify-between text-xs">
                    <span className="text-slate-700 truncate">{a.companyName}</span>
                    <Badge tone="neutral" className="text-2xs shrink-0 ml-2">{a.responsibility.replace(/_/g, " ")}</Badge>
                  </div>
                ))}
                {activeAssignments.length > 5 && (
                  <p className="text-[11px] text-slate-400">+{activeAssignments.length - 5} more</p>
                )}
              </div>
            )}
          </div>
        </SheetBody>
        <SheetFooter>
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => { onOpenChange(false); router.push(`${ROUTES.superAdmin.team}/${member.id}`); }}>
            <UserIcon className="size-3.5 mr-1" /> Open Full Profile
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
