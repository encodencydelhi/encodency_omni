"use client";

import { useState } from "react";
import { AlertTriangleIcon, BanIcon, CheckCircle2Icon, Trash2Icon } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils/cn";
import { getStaffAvatarColor } from "../data/config";
import { getInitials } from "@/lib/utils/format";
import type { StaffMember } from "../data/types";

interface SuspendStaffDialogProps {
  member: StaffMember | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (staffId: string, reason: string) => void;
  isPending?: boolean;
}

export function SuspendStaffDialog({ member, open, onOpenChange, onConfirm, isPending }: SuspendStaffDialogProps) {
  const [reason, setReason] = useState("");
  if (!member) return null;
  const activeAssignments = member.assignments.filter((a) => a.status === "active");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-rose-700">
            <BanIcon className="size-4" /> Suspend Staff Access
          </DialogTitle>
          <DialogDescription>Temporarily revoke platform access for this staff member.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="flex items-center gap-3 p-3 rounded-sm bg-slate-50 border border-border">
            <Avatar className="size-10 shrink-0">
              <AvatarFallback className={cn("text-xs font-bold", getStaffAvatarColor(member.name))}>{getInitials(member.name)}</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-semibold text-slate-900">{member.name}</p>
              <p className="text-xs text-slate-500">{member.email}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2 rounded-sm border border-border">
              <p className="text-slate-500 mb-0.5">Current Role</p>
              <Badge tone="info">{member.role}</Badge>
            </div>
            <div className="p-2 rounded-sm border border-border">
              <p className="text-slate-500 mb-0.5">Status</p>
              <Badge tone="success">{member.status}</Badge>
            </div>
          </div>
          {activeAssignments.length > 0 && (
            <div className="p-2 rounded-sm bg-amber-50 border border-amber-200 text-xs text-amber-700">
              <AlertTriangleIcon className="size-3.5 inline mr-1" />
              {activeAssignments.length} active assignment(s) will need coverage review.
            </div>
          )}
          <div className="grid gap-1.5">
            <Label className="text-xs">Suspension Reason *</Label>
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Enter reason for suspension..." className="text-xs min-h-[60px]" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button size="sm" className="h-8 text-xs bg-rose-600 hover:bg-rose-700" onClick={() => onConfirm(member.id, reason)} disabled={!reason.trim() || isPending}>
            {isPending ? "Suspending..." : "Suspend Staff"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface ReactivateStaffDialogProps {
  member: StaffMember | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (staffId: string, reason: string) => void;
  isPending?: boolean;
}

export function ReactivateStaffDialog({ member, open, onOpenChange, onConfirm, isPending }: ReactivateStaffDialogProps) {
  const [reason, setReason] = useState("");
  if (!member) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-emerald-700">
            <CheckCircle2Icon className="size-4" /> Reactivate Staff
          </DialogTitle>
          <DialogDescription>Restore platform access for this staff member.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="flex items-center gap-3 p-3 rounded-sm bg-slate-50 border border-border">
            <Avatar className="size-10 shrink-0">
              <AvatarFallback className={cn("text-xs font-bold", getStaffAvatarColor(member.name))}>{getInitials(member.name)}</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-semibold text-slate-900">{member.name}</p>
              <p className="text-xs text-slate-500">{member.email}</p>
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label className="text-xs">Reason for Reactivation</Label>
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Enter reason..." className="text-xs min-h-[60px]" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button size="sm" className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700" onClick={() => onConfirm(member.id, reason)} disabled={isPending}>
            {isPending ? "Reactivating..." : "Reactivate Staff"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface DeactivateStaffDialogProps {
  member: StaffMember | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (staffId: string, reason: string) => void;
  isPending?: boolean;
}

export function DeactivateStaffDialog({ member, open, onOpenChange, onConfirm, isPending }: DeactivateStaffDialogProps) {
  const [reason, setReason] = useState("");
  if (!member) return null;
  const activeAssignments = member.assignments.filter((a) => a.status === "active");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-rose-700">
            <Trash2Icon className="size-4" /> Deactivate Staff
          </DialogTitle>
          <DialogDescription>Permanently deactivate this staff member&apos;s platform membership.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="flex items-center gap-3 p-3 rounded-sm bg-slate-50 border border-border">
            <Avatar className="size-10 shrink-0">
              <AvatarFallback className={cn("text-xs font-bold", getStaffAvatarColor(member.name))}>{getInitials(member.name)}</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-semibold text-slate-900">{member.name}</p>
              <p className="text-xs text-slate-500">{member.email}</p>
            </div>
          </div>
          {activeAssignments.length > 0 && (
            <div className="p-2 rounded-sm bg-rose-50 border border-rose-200 text-xs text-rose-700">
              <AlertTriangleIcon className="size-3.5 inline mr-1" />
              This staff member has {activeAssignments.length} active assignment(s). Required handover must be completed before deactivation.
            </div>
          )}
          <div className="grid gap-1.5">
            <Label className="text-xs">Deactivation Reason *</Label>
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Enter reason for deactivation..." className="text-xs min-h-[60px]" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button size="sm" className="h-8 text-xs bg-rose-600 hover:bg-rose-700" onClick={() => onConfirm(member.id, reason)} disabled={!reason.trim() || isPending}>
            {isPending ? "Deactivating..." : "Deactivate Staff"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
