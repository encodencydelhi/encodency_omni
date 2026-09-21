"use client";

import React from "react";
import { useSupport } from "@/features/support-tickets/data/mock-provider";
import { useTeamWorkload } from "@/features/support-tickets/data/selectors";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils/cn";
import { Users, AlertTriangle, Clock, BarChart3 } from "lucide-react";

export default function TeamWorkloadPage() {
  const { tickets } = useSupport();
  const workload = useTeamWorkload();

  const totalActive = tickets.filter(t => t.status !== "Resolved" && t.status !== "Closed").length;
  const totalUnassigned = tickets.filter(t => !t.assignedStaffId && !t.assignedTeamId && t.status !== "Resolved" && t.status !== "Closed").length;
  const totalHighUrgent = tickets.filter(t => (t.priority === "High" || t.priority === "Urgent") && t.status !== "Resolved" && t.status !== "Closed").length;

  return (
    <div className="flex flex-col gap-2 max-w-[1600px] mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[18px] font-bold text-[#0F172A]">Team Workload</h2>
          <p className="text-[12px] text-[#64748B] mt-1">Monitor team capacity and ticket distribution across support teams</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Card className="p-5 border-[#E2E8F0] shadow-sm rounded-sm flex items-center gap-3 h-[80px]">
          <div className="w-10 h-10 rounded-sm bg-[#DBEAFE] flex items-center justify-center shrink-0">
            <BarChart3 size={18} className="text-[#2563EB]" />
          </div>
          <div className="flex flex-col">
            <span className="text-[20px] font-bold text-[#0F172A]">{totalActive}</span>
            <span className="text-[12px] text-[#64748B]">Total Active Tickets</span>
          </div>
        </Card>
        <Card className="p-5 border-[#E2E8F0] shadow-sm rounded-sm flex items-center gap-3 h-[80px]">
          <div className="w-10 h-10 rounded-sm bg-[#FEF9C3] flex items-center justify-center shrink-0">
            <AlertTriangle size={18} className="text-[#EAB308]" />
          </div>
          <div className="flex flex-col">
            <span className="text-[20px] font-bold text-[#0F172A]">{totalUnassigned}</span>
            <span className="text-[12px] text-[#64748B]">Unassigned Tickets</span>
          </div>
        </Card>
        <Card className="p-5 border-[#E2E8F0] shadow-sm rounded-sm flex items-center gap-3 h-[80px]">
          <div className="w-10 h-10 rounded-sm bg-[#FEE2E2] flex items-center justify-center shrink-0">
            <Clock size={18} className="text-[#EF4444]" />
          </div>
          <div className="flex flex-col">
            <span className="text-[20px] font-bold text-[#0F172A]">{totalHighUrgent}</span>
            <span className="text-[12px] text-[#64748B]">High/Urgent Priority</span>
          </div>
        </Card>
      </div>

      <div className="flex flex-col gap-4">
        <h3 className="text-[14px] font-semibold text-[#0F172A]">Team Distribution</h3>
        {workload.map(({ team, activeTickets, unassigned, highUrgent }) => {
          const capacityPercent = Math.min((activeTickets / 10) * 100, 100);
          const isOverloaded = activeTickets > 8;
          return (
            <Card key={team.id} className="p-5 border-[#E2E8F0] shadow-sm rounded-sm hover:border-[#CBD5E1] transition-colors">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className={cn("w-10 h-10 rounded-sm flex items-center justify-center shrink-0",
                    isOverloaded ? "bg-[#FEF2F2]" : "bg-[#D1FAE5]"
                  )}>
                    <Users size={18} className={isOverloaded ? "text-[#EF4444]" : "text-[#10B981]"} />
                  </div>
                  <div className="flex flex-col gap-2">
                    <h4 className="text-[13px] font-semibold text-[#0F172A]">{team.name}</h4>
                    <p className="text-[12px] text-[#64748B]">{team.description}</p>
                    <div className="flex items-center gap-4 mt-1">
                      <span className="text-[12px] text-[#475569] flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#3B82F6]" />{activeTickets} active
                      </span>
                      {unassigned > 0 && (
                        <span className="text-[12px] text-[#EAB308] flex items-center gap-1.5">
                          <div className="w-1.5 h-1.5 rounded-full bg-[#EAB308]" />{unassigned} unassigned
                        </span>
                      )}
                      {highUrgent > 0 && (
                        <span className="text-[12px] text-[#EF4444] flex items-center gap-1.5">
                          <div className="w-1.5 h-1.5 rounded-full bg-[#EF4444]" />{highUrgent} high/urgent
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <span className={cn("text-[12px] font-medium px-2 py-0.5 rounded-sm shrink-0",
                  isOverloaded ? "text-[#EF4444] bg-[#FEE2E2]" : "text-[#10B981] bg-[#D1FAE5]"
                )}>{isOverloaded ? "Overloaded" : "Normal Load"}</span>
              </div>
              <div className="mt-4">
                <div className="flex items-center justify-between text-[12px] text-[#64748B] mb-1.5">
                  <span>Capacity</span><span>{activeTickets}/10 tickets</span>
                </div>
                <div className="w-full h-1.5 bg-[#F1F5F9] rounded-full overflow-hidden">
                  <div className={cn("h-full rounded-full transition-all", isOverloaded ? "bg-[#EF4444]" : "bg-[#10B981]")} style={{ width: `${capacityPercent}%` }} />
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
