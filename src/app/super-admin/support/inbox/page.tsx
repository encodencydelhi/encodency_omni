"use client";

import React, { useState } from "react";
import { useSupport } from "@/features/support-tickets/data/mock-provider";
import { useTicketsByStatus, useUnassignedTickets, useSlaRisks, useEscalatedTickets, useAwaitingCustomer, useBreachedTickets } from "@/features/support-tickets/data/selectors";
import { TicketTable } from "@/features/support-tickets/components/ticket-table";
import { Button } from "@/components/ui/button";
import { Search, Plus, Download, Filter } from "lucide-react";

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
  const activeTickets = useTicketsByStatus("Active");
  const newTickets = useTicketsByStatus("New");
  const unassignedTickets = useUnassignedTickets();
  const inProgressTickets = useTicketsByStatus("In Progress");
  const awaitingSupport = useAwaitingCustomer();
  const slaRisks = useSlaRisks();
  const escalatedTickets = useEscalatedTickets();
  const breachedTickets = useBreachedTickets();
  const [activeView, setActiveView] = useState("all");
  const [search, setSearch] = useState("");

  const getFilteredTickets = () => {
    let filtered = tickets;
    switch (activeView) {
      case "new": filtered = newTickets; break;
      case "open": filtered = useTicketsByStatus("Open"); break;
      case "in-progress": filtered = inProgressTickets; break;
      case "unassigned": filtered = unassignedTickets; break;
      case "awaiting": filtered = awaitingSupport; break;
      case "waiting-customer": filtered = useTicketsByStatus("Waiting for Customer").concat(useTicketsByStatus("Waiting for Internal Team")); break;
      case "sla-risk": filtered = slaRisks; break;
      case "escalated": filtered = escalatedTickets; break;
      case "resolved": filtered = useTicketsByStatus("Resolved"); break;
      case "closed": filtered = useTicketsByStatus("Closed"); break;
    }

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
  };

  const filteredTickets = getFilteredTickets();

  return (
    <div className="flex flex-col gap-2 max-w-[1600px] mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
            <input
              type="text"
              placeholder="Search ticket ID, subject, company, requester..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 pl-8 pr-3 text-[12px] border border-[#E2E8F0] rounded-sm bg-white focus:outline-none focus:ring-1 focus:ring-[#2563EB] w-[320px]"
            />
          </div>
          <Button size="sm" variant="outline" className="h-8 gap-1.5 border-[#E2E8F0] text-[#475569] text-[12px]">
            <Filter size={12} />
            Filters
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" className="h-8 gap-1.5 border-[#E2E8F0] text-[#475569] text-[12px]">
            <Download size={12} />
            Export
          </Button>
          <Button size="sm" className="h-8 gap-1.5 bg-[#5B1F1F] hover:bg-[#7A2C2C] text-white text-[12px]">
            <Plus size={12} />
            Create Ticket
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-1 border-b border-[#E2E8F0] pb-0 overflow-x-auto no-scrollbar">
        {QUICK_VIEWS.map(view => {
          const count = view.id === "all" ? tickets.length :
            view.id === "new" ? newTickets.length :
            view.id === "unassigned" ? unassignedTickets.length :
            view.id === "in-progress" ? inProgressTickets.length :
            view.id === "sla-risk" ? slaRisks.length :
            view.id === "escalated" ? escalatedTickets.length :
            0;
          const isActive = activeView === view.id;

          return (
            <button
              key={view.id}
              onClick={() => setActiveView(view.id)}
              className={`relative px-3 py-2.5 text-[12px] font-medium whitespace-nowrap transition-colors ${
                isActive ? "text-[#2563EB]" : "text-[#64748B] hover:text-[#0F172A]"
              }`}
            >
              <span className="inline-flex items-center gap-1.5">
                {view.label}
                {count > 0 && (
                  <span className={`inline-flex min-w-5 items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                    isActive ? "bg-[#DBEAFE] text-[#1D4ED8]" : "bg-[#F1F5F9] text-[#64748B]"
                  }`}>
                    {count}
                  </span>
                )}
              </span>
              {isActive && <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-[#2563EB]" />}
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
