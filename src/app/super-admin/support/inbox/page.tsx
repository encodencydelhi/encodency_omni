"use client";

import React, { useState, useMemo } from "react";
import { useSupport } from "@/features/support-tickets/data/mock-provider";
import { useTicketsByStatus, useUnassignedTickets, useSlaRisks, useEscalatedTickets, useAwaitingCustomer, useBreachedTickets } from "@/features/support-tickets/data/selectors";
import { TicketTable } from "@/features/support-tickets/components/ticket-table";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { useSupportActions } from "@/features/support-tickets/context/support-actions-context";

const QUICK_VIEWS = [
  { id: "all", label: "All Tickets" },
  { id: "new", label: "New" },
  { id: "open", label: "Open" },
  { id: "in-progress", label: "In Progress" },
  { id: "unassigned", label: "Unassigned" },
  { id: "awaiting", label: "Awaiting Support" },
  { id: "waiting-customer", label: "Waiting for Customer" },
  { id: "sla-risk", label: "SLA At Risk" },
  { id: "escalated", label: "Escalated" },
  { id: "resolved", label: "Resolved" },
  { id: "closed", label: "Closed" },
];

export default function TicketInboxPage() {
  const { tickets } = useSupport();
  const { filters } = useSupportActions();
  const activeTickets = useTicketsByStatus("Active");
  const newTickets = useTicketsByStatus("New");
  const openTickets = useTicketsByStatus("Open");
  const unassignedTickets = useUnassignedTickets();
  const inProgressTickets = useTicketsByStatus("In Progress");
  const awaitingSupport = useAwaitingCustomer();
  const slaRisks = useSlaRisks();
  const escalatedTickets = useEscalatedTickets();
  const breachedTickets = useBreachedTickets();
  const waitingCustomerTickets = useTicketsByStatus("Waiting for Customer");
  const waitingInternalTickets = useTicketsByStatus("Waiting for Internal Team");
  const resolvedTickets = useTicketsByStatus("Resolved");
  const closedTickets = useTicketsByStatus("Closed");
  const [activeView, setActiveView] = useState("all");
  const [search, setSearch] = useState("");

  const filteredTickets = useMemo(() => {
    let filtered = tickets;
    switch (activeView) {
      case "new": filtered = newTickets; break;
      case "open": filtered = openTickets; break;
      case "in-progress": filtered = inProgressTickets; break;
      case "unassigned": filtered = unassignedTickets; break;
      case "awaiting": filtered = awaitingSupport; break;
      case "waiting-customer": filtered = waitingCustomerTickets.concat(waitingInternalTickets); break;
      case "sla-risk": filtered = slaRisks; break;
      case "escalated": filtered = escalatedTickets; break;
      case "resolved": filtered = resolvedTickets; break;
      case "closed": filtered = closedTickets; break;
    }

    if (filters.status !== "all") filtered = filtered.filter(t => t.status === filters.status);
    if (filters.priority !== "all") filtered = filtered.filter(t => t.priority === filters.priority);
    if (filters.company !== "all") filtered = filtered.filter(t => t.companyId === filters.company);
    if (filters.category !== "all") filtered = filtered.filter(t => t.category === filters.category);
    if (filters.assignedTo === "unassigned") filtered = filtered.filter(t => !t.assignedStaffId && !t.assignedTeamId);
    else if (filters.assignedTo !== "all") filtered = filtered.filter(t => t.assignedTeamId === filters.assignedTo);

    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(t =>
        t.id.toLowerCase().includes(q) ||
        t.subject.toLowerCase().includes(q) ||
        t.companyId.toLowerCase().includes(q) ||
        t.requester.name.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q)
      );
    }
    return filtered;
  }, [tickets, activeView, search, filters, newTickets, openTickets, unassignedTickets, inProgressTickets, awaitingSupport, slaRisks, escalatedTickets, waitingCustomerTickets, waitingInternalTickets, resolvedTickets, closedTickets]);

  const handleExport = () => {
    const header = "Ticket ID,Subject,Company,Requester,Category,Priority,Status,Assigned To,Created At\n";
    const rows = filteredTickets.map(t =>
      `${t.id},"${t.subject}",${t.companyId},"${t.requester.name}",${t.category},${t.priority},${t.status},${t.assignedStaffId || "Unassigned"},${t.createdAt}`
    ).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tickets-export-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col gap-2 max-w-[1600px] mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Quick search tickets..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 px-3 text-[12px] border border-[#E2E8F0] rounded-sm bg-white focus:outline-none focus:ring-1 focus:ring-[#EB0711] w-[280px]"
          />
        </div>
        <Button size="sm" variant="outline" className="h-8 gap-1.5 border-[#E2E8F0] text-[#475569] text-[12px]" onClick={handleExport}>
          <Download size={12} />
          Export
        </Button>
      </div>

      <div className="flex items-center flex-wrap gap-1 border-b border-[#E2E8F0] pb-0">
        {QUICK_VIEWS.map(view => {
          const count = view.id === "all" ? tickets.length :
            view.id === "new" ? newTickets.length :
            view.id === "open" ? openTickets.length :
            view.id === "unassigned" ? unassignedTickets.length :
            view.id === "in-progress" ? inProgressTickets.length :
            view.id === "sla-risk" ? slaRisks.length :
            view.id === "escalated" ? escalatedTickets.length :
            view.id === "resolved" ? resolvedTickets.length :
            view.id === "closed" ? closedTickets.length :
            view.id === "waiting-customer" ? waitingCustomerTickets.length + waitingInternalTickets.length :
            0;
          const isActive = activeView === view.id;

          return (
            <button
              key={view.id}
              onClick={() => setActiveView(view.id)}
              className={`relative px-3 py-2.5 text-[12px] font-medium whitespace-nowrap flex-shrink-0 transition-colors ${
                isActive ? "text-[#EB0711]" : "text-[#64748B] hover:text-[#EB0711]"
              }`}
            >
              <span className="inline-flex items-center gap-1.5">
                {view.label}
                {count > 0 && (
                  <span className={`inline-flex min-w-5 items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                    isActive ? "bg-[#FEE2E2] text-[#EB0711]" : "bg-[#F1F5F9] text-[#64748B]"
                  }`}>
                    {count}
                  </span>
                )}
              </span>
              {isActive && <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-[#EB0711]" />}
            </button>
          );
        })}
      </div>

      <TicketTable tickets={filteredTickets} />

      <div className="flex items-center justify-between text-[12px] text-[#64748B]">
        <span>Showing {filteredTickets.length} of {tickets.length} tickets</span>
        <div className="flex items-center gap-2">
          <span>Demo Support Data</span>
          <div className="w-1.5 h-1.5 rounded-full bg-[#EAB308]"></div>
        </div>
      </div>
    </div>
  );
}
