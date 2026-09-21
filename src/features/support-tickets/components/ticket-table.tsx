"use client";

import React from "react";
import { SupportTicket } from "../data/types";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils/cn";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, FileText } from "lucide-react";
import Link from "next/link";
import { useSupport } from "../data/mock-provider";

interface TicketTableProps {
  tickets: SupportTicket[];
  onQuickPreview?: (ticketId: string) => void;
}

export function TicketTable({ tickets, onQuickPreview }: TicketTableProps) {
  const { teams } = useSupport();

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "Urgent": return "bg-[#EF4444] text-white";
      case "High": return "bg-[#F97316] text-white";
      case "Normal": return "bg-[#E2E8F0] text-[#475569]";
      case "Low": return "bg-[#F1F5F9] text-[#64748B]";
      default: return "bg-[#F1F5F9] text-[#64748B]";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "New": return "text-[#3B82F6]";
      case "Open": return "text-[#0EA5E9]";
      case "In Progress": return "text-[#EAB308]";
      case "Waiting for Customer": return "text-[#8B5CF6]";
      case "Waiting for Internal Team": return "text-[#F59E0B]";
      case "Resolved": return "text-[#10B981]";
      case "Closed": return "text-[#64748B]";
      default: return "text-[#64748B]";
    }
  };

  const getSlaColor = (state?: string) => {
    switch (state) {
      case "On Track": return "text-[#10B981] bg-[#D1FAE5]";
      case "At Risk": return "text-[#EAB308] bg-[#FEF9C3]";
      case "Breached": return "text-[#EF4444] bg-[#FEE2E2]";
      case "Met": return "text-[#10B981] bg-[#D1FAE5]";
      case "Paused": return "text-[#64748B] bg-[#F1F5F9]";
      default: return "text-[#64748B] bg-[#F1F5F9]";
    }
  };

  return (
    <div className="border border-[#E2E8F0] rounded-sm bg-white overflow-hidden">
      <Table>
        <TableHeader className="bg-[#F8FAFC]">
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-[300px] text-[#475569] font-semibold text-[12px] h-9">Ticket / Subject</TableHead>
            <TableHead className="text-[#475569] font-semibold text-[12px] h-9">Company / Requester</TableHead>
            <TableHead className="text-[#475569] font-semibold text-[12px] h-9">Status & Priority</TableHead>
            <TableHead className="text-[#475569] font-semibold text-[12px] h-9">Assigned To</TableHead>
            <TableHead className="text-[#475569] font-semibold text-[12px] h-9">SLA / Timing</TableHead>
            <TableHead className="w-[50px] text-right h-9"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tickets.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="h-32 text-center text-[#64748B] text-[13px]">
                No tickets found.
              </TableCell>
            </TableRow>
          ) : (
            tickets.map((ticket) => {
              const team = teams.find(t => t.id === ticket.assignedTeamId);
              const assignee = ticket.assignedStaffId || (team ? team.name : "Unassigned");

              return (
                <TableRow 
                  key={ticket.id} 
                  className="hover:bg-[#F8FAFC] group cursor-pointer transition-colors"
                  onClick={() => onQuickPreview?.(ticket.id)}
                >
                  <TableCell className="py-2.5">
                    <div className="flex flex-col">
                      <Link 
                        href={`/super-admin/support/tickets/${ticket.id}`} 
                        className="text-[#0F172A] font-semibold text-[13px] hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {ticket.id}
                      </Link>
                      <span className="text-[#64748B] text-[12px] truncate max-w-[280px]">
                        {ticket.subject}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="py-2.5">
                    <div className="flex flex-col">
                      <span className="text-[#0F172A] font-medium text-[13px]">{ticket.companyId}</span>
                      <span className="text-[#64748B] text-[12px]">{ticket.requester.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="py-2.5">
                    <div className="flex flex-col items-start gap-1.5">
                      <span className={cn("text-[12px] font-medium flex items-center gap-1.5", getStatusColor(ticket.status))}>
                        <div className={cn("w-1.5 h-1.5 rounded-full bg-current")} />
                        {ticket.status}
                      </span>
                      <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded-[4px] leading-none uppercase tracking-wider", getPriorityColor(ticket.priority))}>
                        {ticket.priority}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="py-2.5 text-[13px] text-[#475569]">
                    {assignee}
                  </TableCell>
                  <TableCell className="py-2.5">
                    <div className="flex flex-col items-start gap-1.5">
                      {ticket.slaInstance && (
                        <span className={cn("text-[11px] font-medium px-2 py-0.5 rounded-sm", getSlaColor(ticket.slaInstance.firstResponseState))}>
                          SLA {ticket.slaInstance.firstResponseState}
                        </span>
                      )}
                      <span className="text-[#94A3B8] text-[11px]">
                        {formatDistanceToNow(new Date(ticket.updatedAt), { addSuffix: true })}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="py-2.5 text-right">
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-[#94A3B8] hover:text-[#0F172A] opacity-0 group-hover:opacity-100">
                      <MoreHorizontal size={14} />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}
