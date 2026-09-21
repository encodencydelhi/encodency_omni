"use client";

import React, { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSupport } from "../data/mock-provider";

interface FiltersDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filters: FilterState;
  onApply: (filters: FilterState) => void;
}

export interface FilterState {
  status: string;
  priority: string;
  company: string;
  category: string;
  assignedTo: string;
}

const EMPTY: FilterState = { status: "all", priority: "all", company: "all", category: "all", assignedTo: "all" };

export function FiltersDrawer({ open, onOpenChange, filters, onApply }: FiltersDrawerProps) {
  const { teams } = useSupport();
  const [local, setLocal] = useState<FilterState>({ ...filters });

  const set = (key: keyof FilterState, val: string) => setLocal(prev => ({ ...prev, [key]: val }));

  const handleApply = () => {
    onApply(local);
    onOpenChange(false);
  };

  const handleClear = () => {
    setLocal({ ...EMPTY });
    onApply({ ...EMPTY });
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full max-w-md p-0 flex flex-col">
        <SheetHeader className="px-5 py-4 border-b border-[#E2E8F0]">
          <SheetTitle className="text-[15px] font-semibold text-[#0F172A]">Filter Tickets</SheetTitle>
          <SheetDescription className="text-[12px] text-[#64748B]">
            Narrow down tickets by status, priority, company and more
          </SheetDescription>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-5 py-4">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-medium text-[#475569]">Status</label>
              <Select value={local.status} onValueChange={v => set("status", v)}>
                <SelectTrigger size="sm"><SelectValue placeholder="All statuses" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="New">New</SelectItem>
                  <SelectItem value="Open">Open</SelectItem>
                  <SelectItem value="In Progress">In Progress</SelectItem>
                  <SelectItem value="Waiting for Customer">Waiting for Customer</SelectItem>
                  <SelectItem value="Waiting for Internal Team">Waiting for Internal Team</SelectItem>
                  <SelectItem value="Resolved">Resolved</SelectItem>
                  <SelectItem value="Closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-medium text-[#475569]">Priority</label>
              <Select value={local.priority} onValueChange={v => set("priority", v)}>
                <SelectTrigger size="sm"><SelectValue placeholder="All priorities" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priorities</SelectItem>
                  <SelectItem value="Urgent">Urgent</SelectItem>
                  <SelectItem value="High">High</SelectItem>
                  <SelectItem value="Normal">Normal</SelectItem>
                  <SelectItem value="Low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-medium text-[#475569]">Company</label>
              <Select value={local.company} onValueChange={v => set("company", v)}>
                <SelectTrigger size="sm"><SelectValue placeholder="All companies" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Companies</SelectItem>
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
              <label className="text-[12px] font-medium text-[#475569]">Category</label>
              <Select value={local.category} onValueChange={v => set("category", v)}>
                <SelectTrigger size="sm"><SelectValue placeholder="All categories" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="Account & Access">Account & Access</SelectItem>
                  <SelectItem value="Billing & Payments">Billing & Payments</SelectItem>
                  <SelectItem value="Integrations">Integrations</SelectItem>
                  <SelectItem value="Publishing & Scheduling">Publishing & Scheduling</SelectItem>
                  <SelectItem value="SEO & Website">SEO & Website</SelectItem>
                  <SelectItem value="AI & Usage">AI & Usage</SelectItem>
                  <SelectItem value="Technical Issue">Technical Issue</SelectItem>
                  <SelectItem value="Feature Request">Feature Request</SelectItem>
                  <SelectItem value="General Inquiry">General Inquiry</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-medium text-[#475569]">Assigned Team</label>
              <Select value={local.assignedTo} onValueChange={v => set("assignedTo", v)}>
                <SelectTrigger size="sm"><SelectValue placeholder="All teams" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Teams</SelectItem>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {teams.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <SheetFooter className="px-5 py-3 border-t border-[#E2E8F0]">
          <div className="flex items-center justify-between w-full">
            <Button size="sm" variant="ghost" className="h-8 text-[12px] text-[#64748B]" onClick={handleClear}>
              Clear All
            </Button>
            <Button size="sm" className="h-8 gap-1 bg-[#EB0711] hover:bg-[#D60811] text-white text-[12px]" onClick={handleApply}>
              Apply Filters
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
