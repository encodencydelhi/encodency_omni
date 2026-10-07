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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getStaffAvatarColor, TEAM_MOCK_MODE } from "../data/config";
import { useColleagues } from "./staff-live-dialogs";
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
          {TEAM_MOCK_MODE ? (
            <div className="grid gap-1.5">
              <Label className="text-xs">Reason for Reactivation</Label>
              <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Enter reason..." className="text-xs min-h-[60px]" />
            </div>
          ) : (
            <p className="text-xs text-slate-500">They can sign in again straight away. Company assignments that ended when the account was deactivated are not restored.</p>
          )}
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
  onConfirm: (staffId: string, reason: string, reassignments?: Array<{ assignmentId: string; newStaffId: string }>) => void;
  isPending?: boolean;
}

export function DeactivateStaffDialog({ member, open, onOpenChange, onConfirm, isPending }: DeactivateStaffDialogProps) {
  return (
    <Dialog open={open && member !== null} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        {open && member && <DeactivateBody member={member} onClose={() => onOpenChange(false)} onConfirm={onConfirm} isPending={isPending} />}
      </DialogContent>
    </Dialog>
  );
}

function DeactivateBody({ member, onClose, onConfirm, isPending }: { member: StaffMember; onClose: () => void; onConfirm: DeactivateStaffDialogProps["onConfirm"]; isPending?: boolean }) {
  const [reason, setReason] = useState("");
  const [handover, setHandover] = useState<Record<string, string>>({});
  const colleagues = useColleagues(member.id);
  const activeAssignments = member.assignments.filter((a) => a.status === "active" || a.status === "pending_handover");

  const submit = () => {
    const reassignments = Object.entries(handover)
      .filter(([, staffId]) => staffId)
      .map(([assignmentId, newStaffId]) => ({ assignmentId, newStaffId }));
    onConfirm(member.id, reason, TEAM_MOCK_MODE ? undefined : reassignments);
    onClose();
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2 text-rose-700">
          <Trash2Icon className="size-4" /> Deactivate Staff
        </DialogTitle>
        <DialogDescription>
          {TEAM_MOCK_MODE
            ? "Permanently deactivate this staff member's platform membership."
            : "The account can no longer sign in. Nothing is deleted and you can reactivate it later."}
        </DialogDescription>
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
          TEAM_MOCK_MODE ? (
            <div className="p-2 rounded-sm bg-rose-50 border border-rose-200 text-xs text-rose-700">
              <AlertTriangleIcon className="size-3.5 inline mr-1" />
              This staff member has {activeAssignments.length} active assignment(s). Required handover must be completed before deactivation.
            </div>
          ) : (
            <div className="space-y-2 rounded-sm border border-amber-200 bg-amber-50/60 p-2.5 text-xs">
              <p className="font-semibold text-amber-800">
                <AlertTriangleIcon className="size-3.5 inline mr-1" />
                {activeAssignments.length} Company assignment{activeAssignments.length === 1 ? "" : "s"}: hand each one over, or leave it to end.
              </p>
              {activeAssignments.map((a) => (
                <div key={a.id} className="flex items-center justify-between gap-2">
                  <span className="truncate text-slate-700">{a.companyName} <span className="text-slate-400">· {a.responsibility.replace(/_/g, " ")}</span></span>
                  <Select value={handover[a.id] || "end"} onValueChange={(v) => setHandover((prev) => ({ ...prev, [a.id]: v === "end" ? "" : v }))}>
                    <SelectTrigger className="h-7 w-40 text-xs shrink-0" aria-label={`Hand over ${a.companyName}`}><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="end">End assignment</SelectItem>
                      {colleagues.map((c) => <SelectItem key={c.id} value={c.id}>Hand to {c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          )
        )}
        <div className="grid gap-1.5">
          <Label className="text-xs">Deactivation Reason *</Label>
          <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Enter reason for deactivation..." className="text-xs min-h-[60px]" />
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" size="sm" className="h-8 text-xs" onClick={onClose}>Cancel</Button>
        <Button size="sm" className="h-8 text-xs bg-rose-600 hover:bg-rose-700" onClick={submit} disabled={reason.trim().length < 3 || isPending}>
          {isPending ? "Deactivating..." : "Deactivate Staff"}
        </Button>
      </DialogFooter>
    </>
  );
}
