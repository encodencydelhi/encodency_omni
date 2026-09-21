"use client";

import React, { useState } from "react";
import { useSupport } from "@/features/support-tickets/data/mock-provider";
import { TicketTable } from "@/features/support-tickets/components/ticket-table";
import { Button } from "@/components/ui/button";

export default function TicketInboxPage() {
  const { tickets } = useSupport();
  const [filter, setFilter] = useState("all");

  const filteredTickets = tickets.filter(t => {
    if (filter === "all") return true;
    if (filter === "unassigned") return !t.assignedStaffId && !t.assignedTeamId;
    if (filter === "new") return t.status === "New";
    if (filter === "my-tickets") return t.assignedStaffId === "STAFF-001"; // Mocked current user
    return true;
  });

  return (
    <div className="flex flex-col gap-4 max-w-[1600px] mx-auto">
      <div className="flex items-center gap-2 border-b border-[#E2E8F0] pb-2">
        {[
          { id: "all", label: "All Active" },
          { id: "my-tickets", label: "My Tickets" },
          { id: "unassigned", label: "Unassigned" },
          { id: "new", label: "New" }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setFilter(tab.id)}
            className={`px-3 py-1.5 text-[13px] font-medium rounded-sm transition-colors ${
              filter === tab.id 
                ? "bg-[#0F172A] text-white" 
                : "text-[#64748B] hover:bg-[#F1F5F9]"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      
      <TicketTable tickets={filteredTickets} />
    </div>
  );
}
