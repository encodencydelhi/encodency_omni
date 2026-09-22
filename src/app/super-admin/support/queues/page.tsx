"use client";

import React, { useState } from "react";
import { useSupport } from "@/features/support-tickets/data/mock-provider";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import { Plus, Clock, Users, AlertTriangle, Inbox, MoreHorizontal, ArrowRight, Eye, Pencil, Trash2, Copy } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import Link from "next/link";
import { useSupportActions } from "@/features/support-tickets/context/support-actions-context";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

const SAVED_VIEWS = [
  { id: "sv-1", name: "My Unassigned", filter: "unassigned", icon: Inbox, iconColor: "bg-rose-50 text-rose-600" },
  { id: "sv-2", name: "High Priority Open", filter: "high-priority", icon: AlertTriangle, iconColor: "bg-orange-50 text-orange-600" },
  { id: "sv-3", name: "SLA At Risk", filter: "sla-risk", icon: Clock, iconColor: "bg-amber-50 text-amber-600" },
  { id: "sv-4", name: "Waiting > 24h", filter: "waiting-long", icon: Clock, iconColor: "bg-violet-50 text-violet-600" },
];

const QUEUES = [
  { id: "q-1", name: "Triage Queue", description: "New tickets pending initial review", teamId: "team-triage", autoAssign: true },
  { id: "q-2", name: "Technical Backlog", description: "Assigned to technical support", teamId: "team-tech", autoAssign: false },
  { id: "q-3", name: "Billing Queue", description: "Payment and invoice issues", teamId: "team-billing", autoAssign: true },
  { id: "q-4", name: "Escalated Issues", description: "Requires senior review", teamId: null, autoAssign: false },
];

export default function QueuesPage() {
  const { tickets, teams } = useSupport();
  const { openFiltersDrawer } = useSupportActions();
  const [activeTab, setActiveTab] = useState<"queues" | "views">("queues");
  const router = useRouter();

  const getQueueCount = (teamId: string | null) => {
    if (!teamId) return tickets.filter(t => t.escalationId && t.status !== "Resolved" && t.status !== "Closed").length;
    return tickets.filter(t => t.assignedTeamId === teamId && t.status !== "Resolved" && t.status !== "Closed").length;
  };

  const getQueueHealth = (teamId: string | null) => {
    const queueTickets = tickets.filter(t =>
      (teamId ? t.assignedTeamId === teamId : t.escalationId) &&
      t.status !== "Resolved" && t.status !== "Closed"
    );

    if (queueTickets.length === 0) return "green";

    const now = Date.now();
    const hasOldTickets = queueTickets.some(t => now - new Date(t.createdAt).getTime() > 86400000); // > 24h
    const hasMediumTickets = queueTickets.some(t => now - new Date(t.createdAt).getTime() > 14400000); // > 4h

    if (hasOldTickets) return "red";
    if (hasMediumTickets) return "amber";
    return "green";
  };

  return (
    <div className="flex flex-col gap-2 max-w-[1600px] mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[18px] font-bold text-[#0F172A]">Queues & Saved Views</h2>
          <p className="text-[12px] text-[#64748B] mt-1">Manage ticket queues and create custom views for your team</p>
        </div>
        <Button size="sm" className="h-8 gap-2 bg-[#EB0711] hover:bg-[#D60811] text-white text-[12px] font-medium rounded-sm">
          <Plus size={14} />
          Create Queue
        </Button>
      </div>

      <div className="flex items-center gap-1 border-b border-[#E2E8F0] pb-0">
        {[
          { id: "queues" as const, label: "Queues" },
          { id: "views" as const, label: "Saved Views" },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "px-4 py-2.5 text-[12px] font-medium transition-colors relative",
              activeTab === tab.id ? "text-[#EB0711]" : "text-[#64748B] hover:text-[#EB0711]"
            )}
          >
            {tab.label}
            {activeTab === tab.id && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#EB0711]" />}
          </button>
        ))}
      </div>

      {activeTab === "queues" ? (
        <div className="grid grid-cols-2 gap-2">
          {QUEUES.map(queue => {
            const count = getQueueCount(queue.teamId);
            const health = getQueueHealth(queue.teamId);
            return (
              <Card key={queue.id} className="p-5 border-[#E2E8F0] shadow-sm rounded-sm hover:border-[#CBD5E1] transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <h3 className="text-[13px] font-semibold text-[#0F172A]">{queue.name}</h3>
                      <div className={cn("w-2 h-2 rounded-full",
                        health === "green" ? "bg-emerald-500" :
                        health === "amber" ? "bg-amber-500" : "bg-red-500"
                      )} title={`Queue Health: ${health.toUpperCase()}`} />
                      {queue.autoAssign && (
                        <span className="text-[12px] font-medium px-1.5 py-0.5 rounded-sm bg-[#DBEAFE] text-[#2563EB]">AUTO</span>
                      )}
                    </div>
                    <p className="text-[12px] text-[#64748B]">{queue.description}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-[12px] text-[#475569] flex items-center gap-1">
                        <Inbox size={12} />{count} tickets
                      </span>
                      <span className="text-[12px] text-[#475569] flex items-center gap-1">
                        <Users size={12} />{teams.find(t => t.id === queue.teamId)?.name || "Unassigned"}
                      </span>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-[#94A3B8] hover:text-[#0F172A]">
                        <MoreHorizontal size={14} />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-44">
                      <DropdownMenuItem onSelect={(e) => { e.preventDefault(); toast.success(`Viewing tickets in ${queue.name}`); router.push(`/super-admin/support/inbox?queue=${queue.id}`); }}>
                        <Eye size={14} /> View Tickets
                      </DropdownMenuItem>
                      <DropdownMenuItem onSelect={(e) => { e.preventDefault(); toast.info(`Edit queue: ${queue.name}`); }}>
                        <Pencil size={14} /> Edit Queue
                      </DropdownMenuItem>
                      <DropdownMenuItem onSelect={(e) => { e.preventDefault(); toast.success(`Duplicated queue: ${queue.name}`); }}>
                        <Copy size={14} /> Duplicate Queue
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onSelect={(e) => { e.preventDefault(); toast.success(`Deleted queue: ${queue.name}`); }} className="text-[#EF4444] focus:text-[#EF4444]">
                        <Trash2 size={14} /> Delete Queue
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {SAVED_VIEWS.map(view => {
            const Icon = view.icon;
            const count = view.filter === "unassigned"
              ? tickets.filter(t => !t.assignedStaffId && !t.assignedTeamId && t.status !== "Resolved" && t.status !== "Closed").length
              : view.filter === "high-priority"
              ? tickets.filter(t => (t.priority === "High" || t.priority === "Urgent") && t.status !== "Resolved" && t.status !== "Closed").length
              : view.filter === "sla-risk"
              ? tickets.filter(t => t.slaInstance?.firstResponseState === "At Risk" || t.slaInstance?.resolutionState === "At Risk").length
              : tickets.filter(t => t.status === "Waiting for Customer" && t.updatedAt < new Date(Date.now() - 86400000).toISOString()).length;

            return (
              <Link
                key={view.id}
                href={`/super-admin/support/inbox?filter=${view.filter}`}
                className="flex items-center justify-between p-4 border border-[#E2E8F0] rounded-sm bg-white hover:bg-[#F8FAFC] cursor-pointer transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-sm flex items-center justify-center ${view.iconColor}`}>
                    <Icon size={14} />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[13px] font-semibold text-[#0F172A]">{view.name}</span>
                    <span className="text-[12px] text-[#64748B]">{count} tickets matching</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[18px] font-bold text-[#0F172A]">{count}</span>
                  <ArrowRight size={14} className="text-[#94A3B8] opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
