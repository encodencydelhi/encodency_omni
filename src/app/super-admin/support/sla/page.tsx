"use client";

import React, { useState } from "react";
import { useSupport } from "@/features/support-tickets/data/mock-provider";
import { useSlaRisks, useEscalatedTickets } from "@/features/support-tickets/data/selectors";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { cn } from "@/lib/utils/cn";
import { SupportKpiCard } from "@/features/support-tickets/components/support-kpi-card";
import { formatDistanceToNow } from "date-fns";
import { AlertTriangle, AlertOctagon, CheckCircle, ArrowUpRight } from "lucide-react";
import Link from "next/link";

export default function SlaEscalationsPage() {
  const { tickets, escalations, teams } = useSupport();
  const slaRisks = useSlaRisks();
  const escalatedTickets = useEscalatedTickets();
  const [activeTab, setActiveTab] = useState<"sla" | "escalations">("sla");

  const breachedTickets = tickets.filter(t => t.slaInstance?.firstResponseState === "Breached" || t.slaInstance?.resolutionState === "Breached");
  const metTickets = tickets.filter(t => t.slaInstance?.firstResponseState === "Met" || t.slaInstance?.resolutionState === "Met");
  const activeEscalations = escalations.filter(e => e.state === "Active");

  return (
    <div className="flex flex-col gap-2 max-w-[1600px] mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[18px] font-bold text-[#0F172A]">SLA & Escalations</h2>
          <p className="text-[12px] text-[#64748B] mt-1">Monitor SLA compliance and manage escalation workflows</p>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2">
        <SupportKpiCard title="SLA At Risk" value={slaRisks.length} icon={<AlertTriangle size={16} />} description="Tickets approaching deadline" alertLevel="warning" iconClassName="text-orange-500" />
        <SupportKpiCard title="SLA Breached" value={breachedTickets.length} icon={<AlertOctagon size={16} />} description="Missed SLA targets" alertLevel="critical" iconClassName="text-red-600" />
        <SupportKpiCard title="SLA Met" value={metTickets.length} icon={<CheckCircle size={16} />} description="Resolved within SLA" trend="good" iconClassName="text-emerald-600" />
        <SupportKpiCard title="Active Escalations" value={activeEscalations.length} icon={<ArrowUpRight size={16} />} description="Open escalation workflows" iconClassName="text-indigo-600" />
      </div>

      <div className="flex items-center gap-1 border-b border-[#E2E8F0] pb-0">
        {[
          { id: "sla" as const, label: "SLA Policies & Status" },
          { id: "escalations" as const, label: "Escalation Log" },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "px-4 py-2.5 text-[12px] font-medium transition-colors relative",
              activeTab === tab.id ? "text-[#2563EB]" : "text-[#64748B] hover:text-[#2563EB]"
            )}
          >
            {tab.label}
            {activeTab === tab.id && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#2563EB]" />}
          </button>
        ))}
      </div>

      {activeTab === "sla" ? (
        <Card className="p-5 border-[#E2E8F0] shadow-sm rounded-sm">
          <h3 className="text-[14px] font-semibold text-[#0F172A] mb-4">Active SLA Instances</h3>
          <div className="border border-[#E2E8F0] rounded-sm overflow-hidden">
            <Table>
              <TableHeader className="bg-[#F8FAFC]">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-[#475569] font-semibold text-[12px] h-9">Ticket</TableHead>
                  <TableHead className="text-[#475569] font-semibold text-[12px] h-9">Policy</TableHead>
                  <TableHead className="text-[#475569] font-semibold text-[12px] h-9">First Response</TableHead>
                  <TableHead className="text-[#475569] font-semibold text-[12px] h-9">Resolution</TableHead>
                  <TableHead className="text-[#475569] font-semibold text-[12px] h-9">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tickets.filter(t => t.slaInstance).map(ticket => (
                  <TableRow key={ticket.id} className="hover:bg-[#F8FAFC]">
                    <TableCell className="py-2.5">
                      <Link href={`/super-admin/support/tickets/${ticket.id}`} className="text-[12px] font-semibold text-[#2563EB] hover:underline">{ticket.id}</Link>
                      <p className="text-[12px] text-[#64748B] truncate max-w-[200px]">{ticket.subject}</p>
                    </TableCell>
                    <TableCell className="py-2.5 text-[12px] text-[#475569]">{ticket.slaInstance?.policyId}</TableCell>
                    <TableCell className="py-2.5">
                      <span className={cn("text-[12px] font-medium px-2 py-0.5 rounded-sm",
                        ticket.slaInstance?.firstResponseState === "Met" ? "text-[#10B981] bg-[#D1FAE5]" :
                        ticket.slaInstance?.firstResponseState === "At Risk" ? "text-[#EAB308] bg-[#FEF9C3]" :
                        ticket.slaInstance?.firstResponseState === "Breached" ? "text-[#EF4444] bg-[#FEE2E2]" :
                        "text-[#64748B] bg-[#F1F5F9]"
                      )}>{ticket.slaInstance?.firstResponseState}</span>
                    </TableCell>
                    <TableCell className="py-2.5">
                      <span className={cn("text-[12px] font-medium px-2 py-0.5 rounded-sm",
                        ticket.slaInstance?.resolutionState === "Met" ? "text-[#10B981] bg-[#D1FAE5]" :
                        ticket.slaInstance?.resolutionState === "At Risk" ? "text-[#EAB308] bg-[#FEF9C3]" :
                        ticket.slaInstance?.resolutionState === "Breached" ? "text-[#EF4444] bg-[#FEE2E2]" :
                        "text-[#64748B] bg-[#F1F5F9]"
                      )}>{ticket.slaInstance?.resolutionState}</span>
                    </TableCell>
                    <TableCell className="py-2.5 text-[12px] text-[#64748B]">
                      {ticket.slaInstance?.resolutionDeadline ? `Due ${formatDistanceToNow(new Date(ticket.slaInstance.resolutionDeadline), { addSuffix: true })}` : "No deadline"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      ) : (
        <Card className="p-5 border-[#E2E8F0] shadow-sm rounded-sm">
          <h3 className="text-[14px] font-semibold text-[#0F172A] mb-4">Escalation History</h3>
          <div className="border border-[#E2E8F0] rounded-sm overflow-hidden">
            <Table>
              <TableHeader className="bg-[#F8FAFC]">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-[#475569] font-semibold text-[12px] h-9">Escalation ID</TableHead>
                  <TableHead className="text-[#475569] font-semibold text-[12px] h-9">Ticket</TableHead>
                  <TableHead className="text-[#475569] font-semibold text-[12px] h-9">Type & Reason</TableHead>
                  <TableHead className="text-[#475569] font-semibold text-[12px] h-9">Team</TableHead>
                  <TableHead className="text-[#475569] font-semibold text-[12px] h-9">State</TableHead>
                  <TableHead className="text-[#475569] font-semibold text-[12px] h-9">Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {escalations.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center text-[#64748B] text-[12px]">No escalations found.</TableCell>
                  </TableRow>
                ) : (
                  escalations.map(esc => {
                    const team = teams.find(t => t.id === esc.currentTeamId);
                    return (
                      <TableRow key={esc.id} className="hover:bg-[#F8FAFC]">
                        <TableCell className="py-2.5 text-[12px] font-semibold text-[#0F172A]">{esc.id}</TableCell>
                        <TableCell className="py-2.5">
                          <Link href={`/super-admin/support/tickets/${esc.ticketId}`} className="text-[12px] text-[#2563EB] font-medium hover:underline">{esc.ticketId}</Link>
                        </TableCell>
                        <TableCell className="py-2.5">
                          <div className="flex flex-col">
                            <span className="text-[12px] text-[#0F172A] font-medium">{esc.type}</span>
                            <span className="text-[12px] text-[#64748B] truncate max-w-[250px]">{esc.reason}</span>
                          </div>
                        </TableCell>
                        <TableCell className="py-2.5 text-[12px] text-[#475569]">{team?.name || "Unassigned"}</TableCell>
                        <TableCell className="py-2.5">
                          <span className={cn("text-[12px] font-medium px-2 py-0.5 rounded-sm",
                            esc.state === "Active" ? "text-[#2563EB] bg-[#DBEAFE]" :
                            esc.state === "Resolved" ? "text-[#10B981] bg-[#D1FAE5]" :
                            esc.state === "Cancelled" ? "text-[#64748B] bg-[#F1F5F9]" :
                            "text-[#EAB308] bg-[#FEF9C3]"
                          )}>{esc.state}</span>
                        </TableCell>
                        <TableCell className="py-2.5 text-[12px] text-[#64748B]">
                          {formatDistanceToNow(new Date(esc.createdAt), { addSuffix: true })}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}
    </div>
  );
}
