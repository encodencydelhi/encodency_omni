"use client";

import { useState } from "react";
import { ArrowLeftIcon, ArrowRightIcon, CheckIcon, XIcon } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetBody, SheetFooter } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { INTERNAL_ROLE, type InternalRole } from "@/types/domain/team";
import { DEPARTMENTS, ASSIGNMENT_RESPONSIBILITIES, COMPANY_POOL_EXPORT } from "../data/config";
import { useTeamMutations } from "../data/hooks";
import type { AssignmentResponsibility, CreateStaffInvitationInput } from "../data/types";

interface InviteStaffWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const STEPS = ["Identity", "Platform Role", "Access Preview", "Operational Scope", "Review"];

export function InviteStaffWizard({ open, onOpenChange }: InviteStaffWizardProps) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<CreateStaffInvitationInput>({
    name: "", email: "", department: "", jobTitle: "", role: "support", companyAssignments: [],
  });
  const [newAssignment, setNewAssignment] = useState<{ companyId: string; responsibility: AssignmentResponsibility }>({
    companyId: "", responsibility: "support_owner",
  });
  const mutations = useTeamMutations();

  const canNext = () => {
    if (step === 0) return form.name.trim().length > 0 && form.email.trim().length > 0;
    if (step === 1) return Boolean(form.role);
    return true;
  };

  const handleNext = () => { if (step < STEPS.length - 1) setStep(step + 1); };
  const handleBack = () => { if (step > 0) setStep(step - 1); };

  const handleAddAssignment = () => {
    if (!newAssignment.companyId) return;
    const company = COMPANY_POOL_EXPORT.find((c) => c.id === newAssignment.companyId);
    if (!company) return;
    setForm((prev) => ({
      ...prev,
      companyAssignments: [...prev.companyAssignments, { companyId: company.id, companyName: company.name, responsibility: newAssignment.responsibility }],
    }));
    setNewAssignment({ companyId: "", responsibility: "support_owner" });
  };

  const handleRemoveAssignment = (idx: number) => {
    setForm((prev) => ({ ...prev, companyAssignments: prev.companyAssignments.filter((_, i) => i !== idx) }));
  };

  const handleSubmit = async () => {
    await mutations.createInvitation.mutateAsync(form);
    onOpenChange(false);
    setStep(0);
    setForm({ name: "", email: "", department: "", jobTitle: "", role: "support", companyAssignments: [] });
  };

  const roleMeta = INTERNAL_ROLE[form.role];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full max-w-xl p-0">
        <SheetHeader>
          <SheetTitle>Invite Staff Member</SheetTitle>
        </SheetHeader>
        <SheetBody className="space-y-4">
          {/* Stepper */}
          <div className="flex items-center gap-1 px-1">
            {STEPS.map((s, i) => (
              <div key={s} className="flex items-center gap-1 flex-1">
                <div className={`size-6 rounded-full flex items-center justify-center text-2xs font-bold shrink-0 ${i <= step ? "bg-blue-600 text-white" : "bg-slate-200 text-slate-500"}`}>
                  {i < step ? <CheckIcon className="size-3" /> : i + 1}
                </div>
                <span className={`text-[11px] font-medium hidden sm:inline ${i === step ? "text-blue-600" : "text-slate-400"}`}>{s}</span>
                {i < STEPS.length - 1 && <div className={`flex-1 h-px ${i < step ? "bg-blue-600" : "bg-slate-200"}`} />}
              </div>
            ))}
          </div>

          {/* Step 0: Identity */}
          {step === 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-slate-900">Staff Identity</h3>
              <div className="grid gap-2">
                <div className="grid gap-1.5">
                  <Label className="text-xs">Full Name *</Label>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Enter full name" className="h-8 text-xs" />
                </div>
                <div className="grid gap-1.5">
                  <Label className="text-xs">Work Email *</Label>
                  <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="staff@encodency.com" className="h-8 text-xs" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="grid gap-1.5">
                    <Label className="text-xs">Department</Label>
                    <Select value={form.department} onValueChange={(v) => setForm({ ...form, department: v })}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        {DEPARTMENTS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-1.5">
                    <Label className="text-xs">Job Title</Label>
                    <Input value={form.jobTitle} onChange={(e) => setForm({ ...form, jobTitle: e.target.value })} placeholder="e.g. Support Engineer" className="h-8 text-xs" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 1: Platform Role */}
          {step === 1 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-slate-900">Platform Role</h3>
              <div className="space-y-1.5">
                {(Object.keys(INTERNAL_ROLE) as InternalRole[]).map((r) => {
                  const meta = INTERNAL_ROLE[r];
                  const isSelected = form.role === r;
                  return (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setForm({ ...form, role: r })}
                      className={`w-full text-left p-3 rounded-sm border transition-all text-xs ${isSelected ? "border-blue-500 bg-blue-50/50 ring-1 ring-blue-500/20" : "border-border hover:border-slate-300 bg-white"}`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-slate-900">{meta.label}</span>
                        {isSelected && <Badge tone="brand" className="text-2xs">Selected</Badge>}
                      </div>
                      <p className="text-[11px] text-slate-500">{meta.description}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step 2: Access Preview */}
          {step === 2 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-slate-900">Effective Capabilities</h3>
              <p className="text-xs text-slate-500">Preview of what <strong>{roleMeta?.label || form.role}</strong> can access:</p>
              <div className="rounded-sm border border-border p-3 space-y-2 max-h-[300px] overflow-y-auto">
                {["Dashboard", "Companies", "Users", "Clients", "Internal Team", "Plans & Subscriptions", "Billing & Payments", "Usage & Limits", "Integrations", "System Health", "Jobs & Queues", "API Monitoring", "Webhooks", "Feature Flags", "Audit Logs", "Support & Tickets", "Notifications", "Global Settings"].map((module) => {
                  const caps = INTERNAL_ROLE[form.role] ? ["companies:read", "users:read", "platform:read", "billing:read"] : [];
                  const canView = caps.length > 0;
                  return (
                    <div key={module} className="flex items-center justify-between py-1 border-b border-border/50 last:border-0">
                      <span className="text-xs text-slate-700">{module}</span>
                      <Badge tone={canView ? "success" : "neutral"} className="text-2xs">{canView ? "View" : "No Access"}</Badge>
                    </div>
                  );
                })}
              </div>
              {roleMeta && (
                <p className="text-[11px] text-amber-600 bg-amber-50 border border-amber-200 rounded-sm p-2">
                  Assigning this role grants platform-level capabilities. This is separate from company memberships.
                </p>
              )}
            </div>
          )}

          {/* Step 3: Operational Scope */}
          {step === 3 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-slate-900">Operational Assignments</h3>
              <p className="text-[11px] text-slate-500 bg-slate-50 border border-border rounded-sm p-2">
                Assigning a company establishes operational responsibility. It does not automatically grant Company Admin access.
              </p>
              <div className="grid grid-cols-3 gap-2">
                <Select value={newAssignment.companyId} onValueChange={(v) => setNewAssignment({ ...newAssignment, companyId: v })}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Company" /></SelectTrigger>
                  <SelectContent>
                    {COMPANY_POOL_EXPORT.filter((c) => !form.companyAssignments.some((a) => a.companyId === c.id)).map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={newAssignment.responsibility} onValueChange={(v) => setNewAssignment({ ...newAssignment, responsibility: v as AssignmentResponsibility })}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Responsibility" /></SelectTrigger>
                  <SelectContent>
                    {ASSIGNMENT_RESPONSIBILITIES.map((r) => (
                      <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button type="button" size="sm" className="h-8 text-xs" onClick={handleAddAssignment} disabled={!newAssignment.companyId}>Add</Button>
              </div>
              {form.companyAssignments.length > 0 && (
                <div className="space-y-1">
                  {form.companyAssignments.map((a, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 rounded-sm bg-slate-50 border border-border/50 text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-medium text-slate-700 truncate">{a.companyName}</span>
                        <Badge tone="info" className="text-2xs">{a.responsibility.replace(/_/g, " ")}</Badge>
                      </div>
                      <button type="button" onClick={() => handleRemoveAssignment(idx)} className="text-slate-400 hover:text-rose-500 shrink-0 ml-2"><XIcon className="size-3.5" /></button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Step 4: Review */}
          {step === 4 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-slate-900">Review & Confirm</h3>
              <div className="rounded-sm border border-border divide-y divide-border">
                <div className="p-3 grid grid-cols-2 gap-2 text-xs">
                  <div><span className="text-slate-500">Name:</span> <span className="font-medium text-slate-900 ml-1">{form.name}</span></div>
                  <div><span className="text-slate-500">Email:</span> <span className="font-medium text-slate-900 ml-1">{form.email}</span></div>
                  <div><span className="text-slate-500">Department:</span> <span className="font-medium text-slate-900 ml-1">{form.department || "—"}</span></div>
                  <div><span className="text-slate-500">Job Title:</span> <span className="font-medium text-slate-900 ml-1">{form.jobTitle || "—"}</span></div>
                </div>
                <div className="p-3 text-xs">
                  <span className="text-slate-500">Platform Role:</span>
                  <Badge tone={roleMeta?.tone as "brand" | "info" | "neutral" || "neutral"} className="ml-1">{roleMeta?.label || form.role}</Badge>
                </div>
                <div className="p-3 text-xs">
                  <span className="text-slate-500">Company Assignments:</span>
                  {form.companyAssignments.length === 0 ? (
                    <span className="text-slate-400 ml-1">None</span>
                  ) : (
                    <div className="mt-1 space-y-1">
                      {form.companyAssignments.map((a, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <span className="text-slate-700">{a.companyName}</span>
                          <Badge tone="info" className="text-2xs">{a.responsibility.replace(/_/g, " ")}</Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <p className="text-[11px] text-sky-600 bg-sky-50 border border-sky-200 rounded-sm p-2">
                A demo invitation will be created. No real email will be sent.
              </p>
            </div>
          )}
        </SheetBody>
        <SheetFooter>
          <div className="flex items-center justify-between w-full">
            <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => onOpenChange(false)}>Cancel</Button>
            <div className="flex items-center gap-1.5">
              {step > 0 && (
                <Button variant="outline" size="sm" className="h-8 text-xs gap-1" onClick={handleBack}>
                  <ArrowLeftIcon className="size-3" /> Back
                </Button>
              )}
              {step < STEPS.length - 1 ? (
                <Button size="sm" className="h-8 text-xs gap-1" onClick={handleNext} disabled={!canNext()}>
                  Continue <ArrowRightIcon className="size-3" />
                </Button>
              ) : (
                <Button size="sm" className="h-8 text-xs gap-1 bg-blue-600 hover:bg-blue-700" onClick={handleSubmit} disabled={mutations.createInvitation.isPending}>
                  {mutations.createInvitation.isPending ? "Creating..." : "Create Invitation"}
                </Button>
              )}
            </div>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
