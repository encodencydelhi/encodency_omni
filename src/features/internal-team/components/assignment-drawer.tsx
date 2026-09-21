"use client";

import { useState } from "react";
import { Building2Icon, XIcon } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetBody, SheetFooter } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils/cn";
import { COMPANY_POOL_EXPORT, ASSIGNMENT_RESPONSIBILITIES } from "../data/config";
import { getStaffAvatarColor } from "../data/config";
import { getInitials } from "@/lib/utils/format";
import type { AssignmentResponsibility, StaffMember } from "../data/types";

interface AssignmentDrawerProps {
  member: StaffMember | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (staffId: string, companyId: string, companyName: string, responsibility: AssignmentResponsibility) => void;
  isPending?: boolean;
}

export function AssignmentDrawer({ member, open, onOpenChange, onConfirm, isPending }: AssignmentDrawerProps) {
  const [companyId, setCompanyId] = useState("");
  const [responsibility, setResponsibility] = useState<AssignmentResponsibility>("support_owner");
  if (!member) return null;

  const assignedCompanyIds = new Set(member.assignments.filter((a) => a.status === "active").map((a) => a.companyId));
  const availableCompanies = COMPANY_POOL_EXPORT.filter((c) => !assignedCompanyIds.has(c.id));

  const handleConfirm = () => {
    const company = COMPANY_POOL_EXPORT.find((c) => c.id === companyId);
    if (!company) return;
    onConfirm(member.id, company.id, company.name, responsibility);
    setCompanyId("");
    setResponsibility("support_owner");
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full max-w-md p-0">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Building2Icon className="size-4" /> Assign Company
          </SheetTitle>
        </SheetHeader>
        <SheetBody className="space-y-4">
          <div className="flex items-center gap-3 p-3 rounded-sm bg-slate-50 border border-border">
            <Avatar className="size-10 shrink-0">
              <AvatarFallback className={cn("text-xs font-bold", getStaffAvatarColor(member.name))}>{getInitials(member.name)}</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-semibold text-slate-900">{member.name}</p>
              <p className="text-xs text-slate-500">{member.role}</p>
            </div>
          </div>

          <div className="p-2 rounded-sm bg-slate-50 border border-border text-[11px] text-slate-500">
            Assigning a company establishes operational responsibility. It does not automatically grant Company Admin access.
          </div>

          <div className="grid gap-2">
            <div className="grid gap-1.5">
              <Label className="text-xs">Company *</Label>
              <Select value={companyId} onValueChange={setCompanyId}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select company" /></SelectTrigger>
                <SelectContent>
                  {availableCompanies.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs">Responsibility *</Label>
              <Select value={responsibility} onValueChange={(v) => setResponsibility(v as AssignmentResponsibility)}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select responsibility" /></SelectTrigger>
                <SelectContent>
                  {ASSIGNMENT_RESPONSIBILITIES.map((r) => (
                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {member.assignments.filter((a) => a.status === "active").length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-700 mb-1.5">Current Assignments</p>
              <div className="space-y-1">
                {member.assignments.filter((a) => a.status === "active").map((a) => (
                  <div key={a.id} className="flex items-center justify-between p-2 rounded-sm bg-slate-50 border border-border/50 text-xs">
                    <span className="text-slate-700 truncate">{a.companyName}</span>
                    <Badge tone="info" className="text-2xs shrink-0 ml-2">{a.responsibility.replace(/_/g, " ")}</Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </SheetBody>
        <SheetFooter>
          <div className="flex items-center justify-between w-full">
            <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button size="sm" className="h-8 text-xs bg-blue-600 hover:bg-blue-700" onClick={handleConfirm} disabled={!companyId || isPending}>
              {isPending ? "Assigning..." : "Assign Company"}
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
