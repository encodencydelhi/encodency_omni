"use client";

import React from "react";
import { SupportKpiCard } from "@/features/support-tickets/components/support-kpi-card";
import { 
  useSupport 
} from "@/features/support-tickets/data/mock-provider";
import { 
  useTicketsByStatus, 
  useUnassignedTickets, 
  useSlaRisks,
  useEscalatedTickets
} from "@/features/support-tickets/data/selectors";
import { Card } from "@/components/ui/card";
import { Ticket, Clock, AlertTriangle, AlertOctagon, UserX, Activity, ArrowRight } from "lucide-react";

export default function SupportOverviewPage() {
  const { tickets } = useSupport();
  const activeTickets = useTicketsByStatus("Active");
  const newTickets = useTicketsByStatus("New");
  const unassignedTickets = useUnassignedTickets();
  const inProgressTickets = useTicketsByStatus("In Progress");
  const waitingCustomerTickets = useTicketsByStatus("Waiting for Customer");
  const slaRisks = useSlaRisks();
  const escalatedTickets = useEscalatedTickets();

  return (
    <div className="flex flex-col gap-6 max-w-[1600px] mx-auto">
      {/* KPI Section - using gap-1 for related sibling cards as requested */}
      <div className="grid grid-cols-4 xl:grid-cols-8 gap-1">
        <SupportKpiCard 
          title="Active Tickets" 
          value={activeTickets.length} 
          icon={<Ticket size={16} />} 
          description="Total non-terminal cases" 
          href="/super-admin/support/inbox?filter=active"
        />
        <SupportKpiCard 
          title="New Tickets" 
          value={newTickets.length} 
          icon={<Activity size={16} />} 
          description="Awaiting initial triage" 
          href="/super-admin/support/inbox?filter=new"
        />
        <SupportKpiCard 
          title="Unassigned" 
          value={unassignedTickets.length} 
          icon={<UserX size={16} />} 
          description="Requires owner assignment"
          trend="bad"
          href="/super-admin/support/inbox?filter=unassigned"
        />
        <SupportKpiCard 
          title="In Progress" 
          value={inProgressTickets.length} 
          icon={<Clock size={16} />} 
          description="Currently being worked on" 
        />
        <SupportKpiCard 
          title="Waiting for Cust." 
          value={waitingCustomerTickets.length} 
          icon={<Clock size={16} />} 
          description="Pending customer response" 
        />
        <SupportKpiCard 
          title="SLA At Risk" 
          value={slaRisks.length} 
          icon={<AlertTriangle size={16} />} 
          description="Approaching SLA deadline" 
          trend="bad"
          alertLevel="warning"
        />
        <SupportKpiCard 
          title="SLA Breached" 
          value={0} // Mocked 0 for overview demo
          icon={<AlertOctagon size={16} />} 
          description="Missed target deadlines" 
          alertLevel="critical"
        />
        <SupportKpiCard 
          title="Escalated" 
          value={escalatedTickets.length} 
          icon={<AlertTriangle size={16} />} 
          description="Active escalation workflows" 
        />
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 flex flex-col gap-6">
          <Card className="p-5 border-[#E2E8F0] shadow-sm rounded-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[14px] font-semibold text-[#0F172A]">Needs Attention</h3>
              <button className="text-[12px] text-[#2563EB] font-medium flex items-center gap-1 hover:underline">
                View All <ArrowRight size={14} />
              </button>
            </div>
            
            <div className="flex flex-col gap-2">
              {slaRisks.map(ticket => (
                <div key={ticket.id} className="flex items-center justify-between p-3 border border-[#E2E8F0] rounded-sm bg-[#FAFAFA]">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] font-semibold text-[#0F172A]">{ticket.id}</span>
                      <span className="text-[12px] text-[#64748B]">{ticket.subject}</span>
                    </div>
                    <div className="flex items-center gap-3 text-[11px]">
                      <span className="text-[#EAB308] font-medium bg-[#FEF9C3] px-1.5 py-0.5 rounded-sm">SLA At Risk</span>
                      <span className="text-[#64748B]">{ticket.companyId}</span>
                    </div>
                  </div>
                  <button className="text-[12px] bg-white border border-[#E2E8F0] px-3 py-1.5 rounded-sm font-medium text-[#0F172A] hover:bg-[#F8FAFC]">
                    Review Ticket
                  </button>
                </div>
              ))}
              {escalatedTickets.map(ticket => (
                <div key={ticket.id} className="flex items-center justify-between p-3 border border-[#E2E8F0] rounded-sm bg-[#FAFAFA]">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] font-semibold text-[#0F172A]">{ticket.id}</span>
                      <span className="text-[12px] text-[#64748B]">{ticket.subject}</span>
                    </div>
                    <div className="flex items-center gap-3 text-[11px]">
                      <span className="text-[#EF4444] font-medium bg-[#FEE2E2] px-1.5 py-0.5 rounded-sm">Escalated</span>
                      <span className="text-[#64748B]">{ticket.companyId}</span>
                    </div>
                  </div>
                  <button className="text-[12px] bg-white border border-[#E2E8F0] px-3 py-1.5 rounded-sm font-medium text-[#0F172A] hover:bg-[#F8FAFC]">
                    Review Ticket
                  </button>
                </div>
              ))}
            </div>
          </Card>
        </div>
        
        <div className="flex flex-col gap-6">
          <Card className="p-5 border-[#E2E8F0] shadow-sm rounded-sm">
            <h3 className="text-[14px] font-semibold text-[#0F172A] mb-4">Status Distribution</h3>
            <div className="flex flex-col gap-3">
              {[
                { label: "New", count: newTickets.length, color: "bg-[#3B82F6]" },
                { label: "In Progress", count: inProgressTickets.length, color: "bg-[#EAB308]" },
                { label: "Waiting for Customer", count: waitingCustomerTickets.length, color: "bg-[#8B5CF6]" }
              ].map(stat => (
                <div key={stat.label} className="flex items-center justify-between text-[13px]">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${stat.color}`}></div>
                    <span className="text-[#475569]">{stat.label}</span>
                  </div>
                  <span className="font-semibold text-[#0F172A]">{stat.count}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
