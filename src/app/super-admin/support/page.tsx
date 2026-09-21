"use client";

import React from "react";
import { SupportKpiCard } from "@/features/support-tickets/components/support-kpi-card";
import { useSupport } from "@/features/support-tickets/data/mock-provider";
import { useTicketsByStatus, useUnassignedTickets, useSlaRisks, useEscalatedTickets } from "@/features/support-tickets/data/selectors";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Ticket, Clock, AlertTriangle, AlertOctagon, UserX, Activity, ArrowRight, TrendingUp, CheckCircle, MessageSquare } from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";

export default function SupportOverviewPage() {
  const { tickets, activities } = useSupport();
  const activeTickets = useTicketsByStatus("Active");
  const newTickets = useTicketsByStatus("New");
  const unassignedTickets = useUnassignedTickets();
  const inProgressTickets = useTicketsByStatus("In Progress");
  const waitingCustomerTickets = useTicketsByStatus("Waiting for Customer");
  const slaRisks = useSlaRisks();
  const escalatedTickets = useEscalatedTickets();

  const resolvedCount = tickets.filter(t => t.status === "Resolved" || t.status === "Closed").length;

  return (
    <div className="flex flex-col gap-2 max-w-[1600px] mx-auto">
      <div className="grid grid-cols-4 xl:grid-cols-8 gap-2">
        <SupportKpiCard title="Active Tickets" value={activeTickets.length} icon={<Ticket size={16} />} description="Total non-terminal cases" href="/super-admin/support/inbox" iconClassName="text-blue-600" />
        <SupportKpiCard title="New Tickets" value={newTickets.length} icon={<Activity size={16} />} description="Awaiting initial triage" href="/super-admin/support/inbox?filter=new" iconClassName="text-emerald-600" />
        <SupportKpiCard title="Unassigned" value={unassignedTickets.length} icon={<UserX size={16} />} description="Requires owner assignment" trend="bad" href="/super-admin/support/inbox?filter=unassigned" iconClassName="text-rose-600" />
        <SupportKpiCard title="In Progress" value={inProgressTickets.length} icon={<Clock size={16} />} description="Currently being worked on" iconClassName="text-amber-500" />
        <SupportKpiCard title="Waiting Customer" value={waitingCustomerTickets.length} icon={<MessageSquare size={16} />} description="Pending customer response" iconClassName="text-violet-600" />
        <SupportKpiCard title="SLA At Risk" value={slaRisks.length} icon={<AlertTriangle size={16} />} description="Approaching SLA deadline" alertLevel="warning" href="/super-admin/support/sla" iconClassName="text-orange-500" />
        <SupportKpiCard title="SLA Breached" value={tickets.filter(t => t.slaInstance?.firstResponseState === "Breached" || t.slaInstance?.resolutionState === "Breached").length} icon={<AlertOctagon size={16} />} description="Missed target deadlines" alertLevel="critical" href="/super-admin/support/sla" iconClassName="text-red-600" />
        <SupportKpiCard title="Escalated" value={escalatedTickets.length} icon={<ArrowRight size={16} />} description="Active escalation workflows" href="/super-admin/support/sla" iconClassName="text-indigo-600" />
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="col-span-2 flex flex-col gap-2">
          <Card className="p-5 border-[#E2E8F0] shadow-sm rounded-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[14px] font-semibold text-[#0F172A]">Needs Attention</h3>
              <Link href="/super-admin/support/inbox?filter=unassigned">
                <Button size="sm" variant="ghost" className="h-7 gap-1 text-[12px] text-[#2563EB] font-medium hover:bg-[#EFF6FF] rounded-sm">
                  View All <ArrowRight size={12} />
                </Button>
              </Link>
            </div>
            <div className="flex flex-col gap-2">
              {slaRisks.length === 0 && escalatedTickets.length === 0 ? (
                <p className="text-[12px] text-[#64748B] py-4 text-center">No tickets need attention right now</p>
              ) : (
                <>
                  {slaRisks.map(ticket => (
                    <div key={ticket.id} className="flex items-center justify-between p-3 border border-[#E2E8F0] rounded-sm bg-[#FAFAFA]">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <Link href={`/super-admin/support/tickets/${ticket.id}`} className="text-[12px] font-semibold text-[#2563EB] hover:underline">{ticket.id}</Link>
                          <span className="text-[12px] text-[#64748B]">{ticket.subject}</span>
                        </div>
                        <div className="flex items-center gap-3 text-[12px]">
                          <span className="text-[#EAB308] font-medium bg-[#FEF9C3] px-1.5 py-0.5 rounded-sm">SLA At Risk</span>
                          <span className="text-[#64748B]">{ticket.companyId}</span>
                        </div>
                      </div>
                      <Link href={`/super-admin/support/tickets/${ticket.id}`}>
                        <Button size="sm" variant="outline" className="h-7 text-[12px] border-[#E2E8F0] rounded-sm">Review Ticket</Button>
                      </Link>
                    </div>
                  ))}
                  {escalatedTickets.map(ticket => (
                    <div key={ticket.id} className="flex items-center justify-between p-3 border border-[#E2E8F0] rounded-sm bg-[#FAFAFA]">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <Link href={`/super-admin/support/tickets/${ticket.id}`} className="text-[12px] font-semibold text-[#2563EB] hover:underline">{ticket.id}</Link>
                          <span className="text-[12px] text-[#64748B]">{ticket.subject}</span>
                        </div>
                        <div className="flex items-center gap-3 text-[12px]">
                          <span className="text-[#EF4444] font-medium bg-[#FEE2E2] px-1.5 py-0.5 rounded-sm">Escalated</span>
                          <span className="text-[#64748B]">{ticket.companyId}</span>
                        </div>
                      </div>
                      <Link href={`/super-admin/support/tickets/${ticket.id}`}>
                        <Button size="sm" variant="outline" className="h-7 text-[12px] border-[#E2E8F0] rounded-sm">Review Ticket</Button>
                      </Link>
                    </div>
                  ))}
                </>
              )}
            </div>
          </Card>

          <Card className="p-5 border-[#E2E8F0] shadow-sm rounded-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[14px] font-semibold text-[#0F172A]">Recent Activity</h3>
              <Link href="/super-admin/support/activity">
                <Button size="sm" variant="ghost" className="h-7 gap-1 text-[12px] text-[#2563EB] font-medium hover:bg-[#EFF6FF] rounded-sm">
                  View All <ArrowRight size={12} />
                </Button>
              </Link>
            </div>
            <div className="flex flex-col gap-2">
              {activities.slice(0, 5).map(act => {
                const actionIconColor = act.actionType.includes("Created") ? "bg-blue-50 text-blue-600"
                  : act.actionType.includes("Status") ? "bg-amber-50 text-amber-600"
                  : act.actionType.includes("Assignment") ? "bg-violet-50 text-violet-600"
                  : act.actionType.includes("Priority") ? "bg-orange-50 text-orange-600"
                  : act.actionType.includes("Note") ? "bg-emerald-50 text-emerald-600"
                  : act.actionType.includes("Escalation") ? "bg-rose-50 text-rose-600"
                  : act.actionType.includes("Response") ? "bg-sky-50 text-sky-600"
                  : "bg-slate-50 text-slate-600";
                return (
                <div key={act.id} className="flex items-center justify-between p-3 border border-[#E2E8F0] rounded-sm bg-[#FAFAFA]">
                  <div className="flex items-center gap-3">
                    <div className={`w-7 h-7 rounded-sm flex items-center justify-center ${actionIconColor}`}>
                      <Activity size={12} />
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[12px] text-[#0F172A]">
                        <span className="font-medium">{act.actorName}</span> — {act.actionType}
                      </span>
                      <span className="text-[12px] text-[#94A3B8]">
                        {formatDistanceToNow(new Date(act.timestamp), { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                  <Link href={`/super-admin/support/tickets/${act.ticketId}`}>
                    <span className="text-[12px] text-[#2563EB] font-medium hover:underline">{act.ticketId}</span>
                  </Link>
                </div>
              )})}
            </div>
          </Card>
        </div>
        
        <div className="flex flex-col gap-2">
          <Card className="p-5 border-[#E2E8F0] shadow-sm rounded-sm">
            <h3 className="text-[14px] font-semibold text-[#0F172A] mb-4">Status Distribution</h3>
            <div className="flex flex-col gap-3">
              {[
                { label: "New", count: newTickets.length, color: "bg-[#3B82F6]" },
                { label: "Open", count: tickets.filter(t => t.status === "Open").length, color: "bg-[#0EA5E9]" },
                { label: "In Progress", count: inProgressTickets.length, color: "bg-[#EAB308]" },
                { label: "Waiting for Customer", count: waitingCustomerTickets.length, color: "bg-[#8B5CF6]" },
                { label: "Waiting Internal", count: tickets.filter(t => t.status === "Waiting for Internal Team").length, color: "bg-[#F59E0B]" },
                { label: "Resolved", count: tickets.filter(t => t.status === "Resolved").length, color: "bg-[#10B981]" },
                { label: "Closed", count: tickets.filter(t => t.status === "Closed").length, color: "bg-[#64748B]" },
              ].map(stat => (
                <div key={stat.label} className="flex items-center justify-between text-[12px]">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${stat.color}`}></div>
                    <span className="text-[#475569]">{stat.label}</span>
                  </div>
                  <span className="font-semibold text-[#0F172A]">{stat.count}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-5 border-[#E2E8F0] shadow-sm rounded-sm">
            <h3 className="text-[14px] font-semibold text-[#0F172A] mb-4">Quick Stats</h3>
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between p-2.5 bg-[#FAFAFA] rounded-sm border border-[#E2E8F0]">
                <div className="flex items-center gap-2 text-[12px] text-[#475569]">
                  <span className="flex h-7 w-7 items-center justify-center rounded-md border border-emerald-200 bg-emerald-50">
                    <CheckCircle size={14} className="text-emerald-600" />
                  </span>
                  Resolved This Period
                </div>
                <span className="text-[12px] font-semibold text-[#0F172A]">{resolvedCount}</span>
              </div>
              <div className="flex items-center justify-between p-2.5 bg-[#FAFAFA] rounded-sm border border-[#E2E8F0]">
                <div className="flex items-center gap-2 text-[12px] text-[#475569]">
                  <span className="flex h-7 w-7 items-center justify-center rounded-md border border-sky-200 bg-sky-50">
                    <TrendingUp size={14} className="text-sky-600" />
                  </span>
                  Total Tickets
                </div>
                <span className="text-[12px] font-semibold text-[#0F172A]">{tickets.length}</span>
              </div>
              <div className="flex items-center justify-between p-2.5 bg-[#FAFAFA] rounded-sm border border-[#E2E8F0]">
                <div className="flex items-center gap-2 text-[12px] text-[#475569]">
                  <span className="flex h-7 w-7 items-center justify-center rounded-md border border-amber-200 bg-amber-50">
                    <UserX size={14} className="text-amber-600" />
                  </span>
                  Avg Response
                </div>
                <span className="text-[12px] font-semibold text-[#0F172A]">2.4h</span>
              </div>
            </div>
          </Card>

          <Card className="p-5 border-[#E2E8F0] shadow-sm rounded-sm">
            <h3 className="text-[14px] font-semibold text-[#0F172A] mb-4">Upcoming SLA Deadlines</h3>
            <div className="flex flex-col gap-2">
              {tickets.filter(t => t.slaInstance?.resolutionState === "At Risk" || t.slaInstance?.firstResponseState === "At Risk").slice(0, 3).map(ticket => (
                <div key={ticket.id} className="flex items-center justify-between p-2.5 border border-[#E2E8F0] rounded-sm bg-[#FAFAFA]">
                  <div className="flex flex-col gap-0.5">
                    <Link href={`/super-admin/support/tickets/${ticket.id}`} className="text-[12px] font-semibold text-[#2563EB] hover:underline">{ticket.id}</Link>
                    <span className="text-[12px] text-[#64748B] truncate max-w-[180px]">{ticket.subject}</span>
                  </div>
                  <span className="text-[12px] font-medium text-[#EAB308] bg-[#FEF9C3] px-2 py-0.5 rounded-sm">At Risk</span>
                </div>
              ))}
              {tickets.filter(t => t.slaInstance?.resolutionState === "At Risk" || t.slaInstance?.firstResponseState === "At Risk").length === 0 && (
                <p className="text-[12px] text-[#64748B] text-center py-2">No upcoming SLA risks</p>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
