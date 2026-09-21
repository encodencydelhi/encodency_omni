"use client";

import { useState } from "react";
import { ArrowRightIcon } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetBody, SheetFooter } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils/cn";
import { INTERNAL_ROLE, type InternalRole, ROLE_PERMISSIONS } from "@/types/domain/team";
import { getStaffAvatarColor } from "../data/config";
import { getInitials } from "@/lib/utils/format";
import { StaffRoleBadge } from "./staff-status-badges";
import type { StaffMember } from "../data/types";

interface RoleChangeDrawerProps {
  member: StaffMember | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (staffId: string, newRole: InternalRole, reason: string) => void;
  isPending?: boolean;
}

export function RoleChangeDrawer({ member, open, onOpenChange, onConfirm, isPending }: RoleChangeDrawerProps) {
  const [newRole, setNewRole] = useState<InternalRole>("support");
  const [reason, setReason] = useState("");
  if (!member) return null;

  const currentPerms = ROLE_PERMISSIONS[member.role];
  const newPerms = ROLE_PERMISSIONS[newRole];
  const addedPerms = newPerms.filter((p) => !currentPerms.includes(p));
  const removedPerms = currentPerms.filter((p) => !newPerms.includes(p));

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full max-w-lg p-0">
        <SheetHeader>
          <SheetTitle>Change Platform Role</SheetTitle>
        </SheetHeader>
        <SheetBody className="space-y-4">
          {/* Current */}
          <div className="flex items-center gap-3 p-3 rounded-sm bg-slate-50 border border-border">
            <Avatar className="size-10 shrink-0">
              <AvatarFallback className={cn("text-xs font-bold", getStaffAvatarColor(member.name))}>{getInitials(member.name)}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-900 truncate">{member.name}</p>
              <p className="text-xs text-slate-500">{member.email}</p>
            </div>
            <StaffRoleBadge role={member.role} />
          </div>

          {/* New Role Selection */}
          <div className="grid gap-1.5">
            <Label className="text-xs font-semibold">New Platform Role</Label>
            <div className="grid grid-cols-2 gap-1.5">
              {(Object.keys(INTERNAL_ROLE) as InternalRole[]).map((r) => {
                const meta = INTERNAL_ROLE[r];
                const isSelected = newRole === r;
                const isCurrent = member.role === r;
                return (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setNewRole(r)}
                    disabled={isCurrent}
                    className={cn(
                      "text-left p-2.5 rounded-sm border text-xs transition-all",
                      isCurrent ? "border-slate-200 bg-slate-50 opacity-50 cursor-not-allowed" : isSelected ? "border-blue-500 bg-blue-50/50 ring-1 ring-blue-500/20" : "border-border hover:border-slate-300 bg-white",
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-slate-900">{meta.label}</span>
                      {isCurrent && <Badge tone="neutral" className="text-2xs">Current</Badge>}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Capability Changes */}
          {newRole !== member.role && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-slate-700">Capability Changes</p>
              {addedPerms.length > 0 && (
                <div className="p-2 rounded-sm bg-emerald-50 border border-emerald-200">
                  <p className="text-[11px] font-semibold text-emerald-700 mb-1">+ Added Capabilities</p>
                  <div className="flex flex-wrap gap-1">
                    {addedPerms.map((p) => <Badge key={p} tone="success" className="text-2xs">{p}</Badge>)}
                  </div>
                </div>
              )}
              {removedPerms.length > 0 && (
                <div className="p-2 rounded-sm bg-rose-50 border border-rose-200">
                  <p className="text-[11px] font-semibold text-rose-700 mb-1">- Removed Capabilities</p>
                  <div className="flex flex-wrap gap-1">
                    {removedPerms.map((p) => <Badge key={p} tone="danger" className="text-2xs">{p}</Badge>)}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="grid gap-1.5">
            <Label className="text-xs">Reason for Role Change *</Label>
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Enter reason..." className="text-xs min-h-[60px]" />
          </div>
        </SheetBody>
        <SheetFooter>
          <div className="flex items-center justify-between w-full">
            <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button size="sm" className="h-8 text-xs bg-blue-600 hover:bg-blue-700" onClick={() => onConfirm(member.id, newRole, reason)} disabled={newRole === member.role || !reason.trim() || isPending}>
              {isPending ? "Changing..." : "Confirm Role Change"}
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
