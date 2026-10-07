"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ASSIGNMENT_RESPONSIBILITIES, DEPARTMENTS } from "../data/config";
import { useStaffList } from "../data/hooks";
import type { AssignmentResponsibility, StaffAssignment, StaffMember } from "../data/types";

/** Active staff other than `exceptId`, for "who takes over" pickers. */
export function useColleagues(exceptId?: string): StaffMember[] {
  const { data } = useStaffList({ pageSize: 100, status: "active", page: 1 });
  return (data?.items ?? []).filter((s) => s.id !== exceptId);
}

/* ------------------------------ edit profile ------------------------------ */

interface EditProfileProps {
  member: StaffMember | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (input: { name: string; phone: string; jobTitle: string; department: string }) => void;
  isPending?: boolean;
}

export function EditStaffProfileDialog({ member, open, onOpenChange, onConfirm, isPending }: EditProfileProps) {
  return (
    <Dialog open={open && member !== null} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        {open && member && <EditProfileBody member={member} onClose={() => onOpenChange(false)} onConfirm={onConfirm} isPending={isPending} />}
      </DialogContent>
    </Dialog>
  );
}

function EditProfileBody({ member, onClose, onConfirm, isPending }: { member: StaffMember; onClose: () => void; onConfirm: EditProfileProps["onConfirm"]; isPending?: boolean }) {
  const [name, setName] = useState(member.name === member.email ? "" : member.name);
  const [phone, setPhone] = useState(member.phone ?? "");
  const [jobTitle, setJobTitle] = useState(member.jobTitle);
  const [department, setDepartment] = useState(member.department);
  return (
    <>
      <DialogHeader>
        <DialogTitle>Edit staff profile</DialogTitle>
        <DialogDescription>Name and phone belong to the account; job title and department are internal team details.</DialogDescription>
      </DialogHeader>
      <div className="space-y-3 text-xs">
        <div className="grid gap-1.5"><Label htmlFor="staff-name">Full name</Label><Input id="staff-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={200} className="h-8 text-xs" /></div>
        <div className="grid gap-1.5"><Label htmlFor="staff-phone">Phone</Label><Input id="staff-phone" value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={30} className="h-8 text-xs" /></div>
        <div className="grid grid-cols-2 gap-2">
          <div className="grid gap-1.5"><Label htmlFor="staff-title">Job title</Label><Input id="staff-title" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} maxLength={100} className="h-8 text-xs" /></div>
          <div className="grid gap-1.5">
            <Label>Department</Label>
            <Select value={department || "none"} onValueChange={(v) => setDepartment(v === "none" ? "" : v)}>
              <SelectTrigger className="h-8 text-xs" aria-label="Department"><SelectValue placeholder="Department" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {Array.from(new Set([...(department ? [department] : []), ...DEPARTMENTS])).map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" size="sm" className="h-8 text-xs" onClick={onClose}>Cancel</Button>
        <Button size="sm" className="h-8 text-xs" disabled={isPending} onClick={() => { onConfirm({ name, phone, jobTitle, department }); onClose(); }}>{isPending ? "Saving..." : "Save"}</Button>
      </DialogFooter>
    </>
  );
}

/* ------------------------------- reassign -------------------------------- */

interface ReassignProps {
  assignment: StaffAssignment | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (assignmentId: string, newStaffId: string, reason: string) => void;
  isPending?: boolean;
}

export function ReassignAssignmentDialog({ assignment, open, onOpenChange, onConfirm, isPending }: ReassignProps) {
  return (
    <Dialog open={open && assignment !== null} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        {open && assignment && <ReassignBody assignment={assignment} onClose={() => onOpenChange(false)} onConfirm={onConfirm} isPending={isPending} />}
      </DialogContent>
    </Dialog>
  );
}

function ReassignBody({ assignment, onClose, onConfirm, isPending }: { assignment: StaffAssignment; onClose: () => void; onConfirm: ReassignProps["onConfirm"]; isPending?: boolean }) {
  const colleagues = useColleagues(assignment.staffId);
  const [newStaffId, setNewStaffId] = useState("");
  const [reason, setReason] = useState("");
  return (
    <>
      <DialogHeader>
        <DialogTitle>Reassign {assignment.companyName}</DialogTitle>
        <DialogDescription>Hand this {assignment.responsibility.replace(/_/g, " ")} responsibility to another active staff member.</DialogDescription>
      </DialogHeader>
      <div className="space-y-3 text-xs">
        <div className="grid gap-1.5">
          <Label>New owner *</Label>
          <Select value={newStaffId} onValueChange={setNewStaffId}>
            <SelectTrigger className="h-8 text-xs" aria-label="New owner"><SelectValue placeholder="Choose a staff member" /></SelectTrigger>
            <SelectContent>{colleagues.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
          </Select>
          {colleagues.length === 0 && <p className="text-amber-700">No other active staff are available.</p>}
        </div>
        <div className="grid gap-1.5"><Label>Reason *</Label><Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Why is this changing hands?" className="text-xs min-h-[60px]" /></div>
      </div>
      <DialogFooter>
        <Button variant="outline" size="sm" className="h-8 text-xs" onClick={onClose}>Cancel</Button>
        <Button size="sm" className="h-8 text-xs" disabled={!newStaffId || reason.trim().length < 3 || isPending} onClick={() => { onConfirm(assignment.id, newStaffId, reason.trim()); onClose(); }}>{isPending ? "Reassigning..." : "Reassign"}</Button>
      </DialogFooter>
    </>
  );
}

/* ----------------------------- assign an owner ----------------------------- */

interface AssignOwnerProps {
  company: { id: string; name: string } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (staffId: string, companyId: string, companyName: string, responsibility: AssignmentResponsibility) => void;
  isPending?: boolean;
}

/** Company first: pick who looks after it and in which role. */
export function AssignOwnerDialog({ company, open, onOpenChange, onConfirm, isPending }: AssignOwnerProps) {
  return (
    <Dialog open={open && company !== null} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        {open && company && <AssignOwnerBody company={company} onClose={() => onOpenChange(false)} onConfirm={onConfirm} isPending={isPending} />}
      </DialogContent>
    </Dialog>
  );
}

function AssignOwnerBody({ company, onClose, onConfirm, isPending }: { company: { id: string; name: string }; onClose: () => void; onConfirm: AssignOwnerProps["onConfirm"]; isPending?: boolean }) {
  const colleagues = useColleagues();
  const [staffId, setStaffId] = useState("");
  const [responsibility, setResponsibility] = useState<AssignmentResponsibility>("primary_owner");
  return (
    <>
      <DialogHeader>
        <DialogTitle>Assign owner for {company.name}</DialogTitle>
        <DialogDescription>Establishes operational responsibility. It does not grant Company Admin access.</DialogDescription>
      </DialogHeader>
      <div className="space-y-3 text-xs">
        <div className="grid gap-1.5">
          <Label>Staff member *</Label>
          <Select value={staffId} onValueChange={setStaffId}>
            <SelectTrigger className="h-8 text-xs" aria-label="Staff member"><SelectValue placeholder="Choose a staff member" /></SelectTrigger>
            <SelectContent>{colleagues.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="grid gap-1.5">
          <Label>Responsibility *</Label>
          <Select value={responsibility} onValueChange={(v) => setResponsibility(v as AssignmentResponsibility)}>
            <SelectTrigger className="h-8 text-xs" aria-label="Responsibility"><SelectValue /></SelectTrigger>
            <SelectContent>{ASSIGNMENT_RESPONSIBILITIES.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" size="sm" className="h-8 text-xs" onClick={onClose}>Cancel</Button>
        <Button size="sm" className="h-8 text-xs" disabled={!staffId || isPending} onClick={() => { onConfirm(staffId, company.id, company.name, responsibility); onClose(); }}>{isPending ? "Assigning..." : "Assign"}</Button>
      </DialogFooter>
    </>
  );
}

/* ----------------------------- schedule review ----------------------------- */

interface ScheduleProps {
  member: { id: string; name: string } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (staffId: string, dueAt: string) => void;
  isPending?: boolean;
}

export function ScheduleReviewDialog({ member, open, onOpenChange, onConfirm, isPending }: ScheduleProps) {
  return (
    <Dialog open={open && member !== null} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        {open && member && <ScheduleBody member={member} onClose={() => onOpenChange(false)} onConfirm={onConfirm} isPending={isPending} />}
      </DialogContent>
    </Dialog>
  );
}

function ScheduleBody({ member, onClose, onConfirm, isPending }: { member: { id: string; name: string }; onClose: () => void; onConfirm: ScheduleProps["onConfirm"]; isPending?: boolean }) {
  const [dueAt, setDueAt] = useState(() => new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10));
  return (
    <>
      <DialogHeader>
        <DialogTitle>Schedule access review</DialogTitle>
        <DialogDescription>When should {member.name}&apos;s access next be reviewed?</DialogDescription>
      </DialogHeader>
      <div className="grid gap-1.5 text-xs">
        <Label htmlFor="review-due">Due date</Label>
        <Input id="review-due" type="date" value={dueAt} onChange={(e) => setDueAt(e.target.value)} className="h-8 text-xs" />
      </div>
      <DialogFooter>
        <Button variant="outline" size="sm" className="h-8 text-xs" onClick={onClose}>Cancel</Button>
        <Button size="sm" className="h-8 text-xs" disabled={!dueAt || isPending} onClick={() => { onConfirm(member.id, dueAt); onClose(); }}>{isPending ? "Scheduling..." : "Schedule"}</Button>
      </DialogFooter>
    </>
  );
}
