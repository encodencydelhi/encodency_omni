"use client";

import React, { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSupport } from "../data/mock-provider";
import { TicketCategory, TicketPriority } from "../data/types";
import { ArrowLeft, ArrowRight, Check, Building2, FileText, Link2, UserCheck } from "lucide-react";
import { useRouter } from "next/navigation";

interface TicketCreateDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CATEGORIES: TicketCategory[] = [
  "Account & Access", "Company Setup", "Subscription & Plans", "Billing & Payments",
  "Integrations", "Publishing & Scheduling", "Content Studio", "SEO & Website",
  "Reports & Analytics", "AI & Usage", "Platform Performance", "Technical Issue",
  "Feature Request", "General Inquiry", "Other",
];

const STEPS = [
  { id: 1, label: "Requester & Scope", icon: Building2 },
  { id: 2, label: "Issue Information", icon: FileText },
  { id: 3, label: "Related Resource", icon: Link2 },
  { id: 4, label: "Assignment", icon: UserCheck },
];

export function TicketCreateDrawer({ open, onOpenChange }: TicketCreateDrawerProps) {
  const router = useRouter();
  const { addTicket, teams } = useSupport();
  const [step, setStep] = useState(1);

  const [companyId, setCompanyId] = useState("");
  const [requesterName, setRequesterName] = useState("");
  const [requesterEmail, setRequesterEmail] = useState("");
  const [source, setSource] = useState("Super Admin Manual Entry");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<TicketCategory>("General Inquiry");
  const [priority, setPriority] = useState<TicketPriority>("Normal");
  const [relatedResource, setRelatedResource] = useState("");
  const [teamId, setTeamId] = useState("");
  const [staffId, setStaffId] = useState("");

  const reset = () => {
    setStep(1);
    setCompanyId("");
    setRequesterName("");
    setRequesterEmail("");
    setSource("Super Admin Manual Entry");
    setSubject("");
    setDescription("");
    setCategory("General Inquiry");
    setPriority("Normal");
    setRelatedResource("");
    setTeamId("");
    setStaffId("");
  };

  const handleClose = (v: boolean) => {
    reset();
    onOpenChange(v);
  };

  const handleCreate = () => {
    if (!companyId || !requesterName || !subject || !description || !category) return;
    addTicket({
      subject,
      description,
      companyId,
      requester: {
        id: `USER-${Date.now()}`,
        type: "CompanyUser",
        name: requesterName,
        email: requesterEmail || `${requesterName.toLowerCase().replace(/\s/g, ".")}@example.com`,
        companyId,
      },
      sourceChannel: source,
      category,
      priority,
      status: "New",
      assignedTeamId: teamId || undefined,
      assignedStaffId: staffId || undefined,
      relatedResourceReferences: relatedResource ? [relatedResource] : undefined,
    });
    handleClose(false);
    router.push("/super-admin/support/inbox");
  };

  const canNext = () => {
    if (step === 1) return companyId && requesterName;
    if (step === 2) return subject && description && category;
    return true;
  };

  const currentStep = STEPS[Math.min(Math.max(step - 1, 0), STEPS.length - 1)]!;

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent side="right" className="w-full max-w-lg p-0 flex flex-col">
        <SheetHeader className="px-5 py-4 border-b border-[#E2E8F0]">
          <SheetTitle className="text-[15px] font-semibold text-[#0F172A]">Create Support Ticket</SheetTitle>
          <SheetDescription className="text-[12px] text-[#64748B]">
            Step {step} of {STEPS.length}: {currentStep.label}
          </SheetDescription>
        </SheetHeader>

        <div className="flex items-center gap-1 px-5 py-3 border-b border-[#F1F5F9]">
          {STEPS.map((s, i) => (
            <React.Fragment key={s.id}>
              <div className={`flex items-center gap-1.5 text-[11px] font-medium ${step === s.id ? "text-[#EB0711]" : step > s.id ? "text-[#10B981]" : "text-[#94A3B8]"}`}>
                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${step === s.id ? "bg-[#EB0711] text-white" : step > s.id ? "bg-[#10B981] text-white" : "bg-[#F1F5F9] text-[#94A3B8]"}`}>
                  {step > s.id ? <Check size={10} /> : s.id}
                </div>
                <span className="hidden sm:inline">{s.label}</span>
              </div>
              {i < STEPS.length - 1 && <div className={`flex-1 h-px mx-1 ${step > s.id ? "bg-[#10B981]" : "bg-[#E2E8F0]"}`} />}
            </React.Fragment>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {step === 1 && (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[12px] font-medium text-[#475569]">Company *</label>
                <Select value={companyId} onValueChange={setCompanyId}>
                  <SelectTrigger size="sm"><SelectValue placeholder="Select company" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="COMP-A1B2">COMP-A1B2</SelectItem>
                    <SelectItem value="COMP-C3D4">COMP-C3D4</SelectItem>
                    <SelectItem value="COMP-E5F6">COMP-E5F6</SelectItem>
                    <SelectItem value="COMP-G7H8">COMP-G7H8</SelectItem>
                    <SelectItem value="COMP-I9J0">COMP-I9J0</SelectItem>
                    <SelectItem value="COMP-K1L2">COMP-K1L2</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[12px] font-medium text-[#475569]">Requester Name *</label>
                <Input value={requesterName} onChange={e => setRequesterName(e.target.value)} placeholder="e.g. Sarah Jenkins" className="h-8 text-[12px]" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[12px] font-medium text-[#475569]">Requester Email</label>
                <Input value={requesterEmail} onChange={e => setRequesterEmail(e.target.value)} placeholder="e.g. sarah@example.com" className="h-8 text-[12px]" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[12px] font-medium text-[#475569]">Source</label>
                <Select value={source} onValueChange={setSource}>
                  <SelectTrigger size="sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Super Admin Manual Entry">Super Admin Manual Entry</SelectItem>
                    <SelectItem value="Support Form">Support Form</SelectItem>
                    <SelectItem value="Email">Email</SelectItem>
                    <SelectItem value="In-App Chat">In-App Chat</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[12px] font-medium text-[#475569]">Subject *</label>
                <Input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Brief summary of the issue" className="h-8 text-[12px]" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[12px] font-medium text-[#475569]">Description *</label>
                <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Detailed description of the support request..." className="h-24 p-2.5 text-[12px] border border-[#E2E8F0] rounded-sm resize-none focus:outline-none focus:ring-1 focus:ring-[#EB0711]" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[12px] font-medium text-[#475569]">Category *</label>
                <Select value={category} onValueChange={v => setCategory(v as TicketCategory)}>
                  <SelectTrigger size="sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[12px] font-medium text-[#475569]">Priority</label>
                <Select value={priority} onValueChange={v => setPriority(v as TicketPriority)}>
                  <SelectTrigger size="sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Low">Low</SelectItem>
                    <SelectItem value="Normal">Normal</SelectItem>
                    <SelectItem value="High">High</SelectItem>
                    <SelectItem value="Urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="flex flex-col gap-4">
              <p className="text-[12px] text-[#64748B]">Optionally link this ticket to an existing resource.</p>
              <div className="flex flex-col gap-1.5">
                <label className="text-[12px] font-medium text-[#475569]">Related Resource ID</label>
                <Input value={relatedResource} onChange={e => setRelatedResource(e.target.value)} placeholder="e.g. INV-2026-0107, JOB-PUB-445" className="h-8 text-[12px]" />
              </div>
              <div className="p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-sm">
                <p className="text-[11px] text-[#64748B]">Supported resource types: Invoice, Payment, Integration Connection, Campaign, Background Job, SEO Audit, System Health Incident.</p>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[12px] font-medium text-[#475569]">Support Team</label>
                <Select value={teamId} onValueChange={setTeamId}>
                  <SelectTrigger size="sm"><SelectValue placeholder="Select team (optional)" /></SelectTrigger>
                  <SelectContent>
                    {teams.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[12px] font-medium text-[#475569]">Assigned Staff</label>
                <Select value={staffId} onValueChange={setStaffId}>
                  <SelectTrigger size="sm"><SelectValue placeholder="Select staff (optional)" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="STAFF-001">Aditya Raghunath</SelectItem>
                    <SelectItem value="STAFF-002">Kavya Nair</SelectItem>
                    <SelectItem value="STAFF-003">Arjun Mehta</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="mt-2 p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-sm">
                <h4 className="text-[12px] font-semibold text-[#0F172A] mb-2">Review</h4>
                <div className="flex flex-col gap-1.5 text-[12px]">
                  <div className="flex justify-between"><span className="text-[#64748B]">Company</span><span className="font-medium text-[#0F172A]">{companyId || "—"}</span></div>
                  <div className="flex justify-between"><span className="text-[#64748B]">Requester</span><span className="font-medium text-[#0F172A]">{requesterName || "—"}</span></div>
                  <div className="flex justify-between"><span className="text-[#64748B]">Subject</span><span className="font-medium text-[#0F172A] truncate max-w-[200px]">{subject || "—"}</span></div>
                  <div className="flex justify-between"><span className="text-[#64748B]">Category</span><span className="font-medium text-[#0F172A]">{category}</span></div>
                  <div className="flex justify-between"><span className="text-[#64748B]">Priority</span><span className="font-medium text-[#0F172A]">{priority}</span></div>
                  <div className="flex justify-between"><span className="text-[#64748B]">Team</span><span className="font-medium text-[#0F172A]">{teams.find(t => t.id === teamId)?.name || "Unassigned"}</span></div>
                </div>
              </div>
            </div>
          )}
        </div>

        <SheetFooter className="px-5 py-3 border-t border-[#E2E8F0]">
          <div className="flex items-center justify-between w-full">
            <Button size="sm" variant="ghost" className="h-8 text-[12px] text-[#64748B]" onClick={() => handleClose(false)}>
              Cancel
            </Button>
            <div className="flex items-center gap-2">
              {step > 1 && (
                <Button size="sm" variant="outline" className="h-8 gap-1 border-[#E2E8F0] text-[#475569] text-[12px]" onClick={() => setStep(s => s - 1)}>
                  <ArrowLeft size={12} /> Back
                </Button>
              )}
              {step < 4 ? (
                <Button size="sm" className="h-8 gap-1 bg-[#EB0711] hover:bg-[#D60811] text-white text-[12px]" disabled={!canNext()} onClick={() => setStep(s => s + 1)}>
                  Next <ArrowRight size={12} />
                </Button>
              ) : (
                <Button size="sm" className="h-8 gap-1 bg-[#EB0711] hover:bg-[#D60811] text-white text-[12px]" onClick={handleCreate}>
                  <Check size={12} /> Create Ticket
                </Button>
              )}
            </div>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
