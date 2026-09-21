"use client";

import React, { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { useSupport } from "../data/mock-provider";
import { Search as SearchIcon } from "lucide-react";
import Link from "next/link";

interface SearchDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SearchDrawer({ open, onOpenChange }: SearchDrawerProps) {
  const { tickets } = useSupport();
  const [query, setQuery] = useState("");

  const results = query.length >= 2
    ? tickets.filter(t =>
        t.id.toLowerCase().includes(query.toLowerCase()) ||
        t.subject.toLowerCase().includes(query.toLowerCase()) ||
        t.companyId.toLowerCase().includes(query.toLowerCase()) ||
        t.requester.name.toLowerCase().includes(query.toLowerCase()) ||
        t.category.toLowerCase().includes(query.toLowerCase())
      ).slice(0, 10)
    : [];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full max-w-md p-0 flex flex-col">
        <SheetHeader className="px-5 py-4 border-b border-[#E2E8F0]">
          <SheetTitle className="text-[15px] font-semibold text-[#0F172A]">Search Tickets</SheetTitle>
          <SheetDescription className="text-[12px] text-[#64748B]">
            Search by ticket ID, subject, company, requester or category
          </SheetDescription>
        </SheetHeader>
        <div className="px-5 py-3 border-b border-[#F1F5F9]">
          <div className="relative">
            <SearchIcon size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
            <Input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Type to search..."
              className="h-8 pl-8 text-[12px] border-[#E2E8F0]"
              autoFocus
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-3">
          {query.length < 2 ? (
            <p className="text-[12px] text-[#94A3B8] text-center py-8">Type at least 2 characters to search</p>
          ) : results.length === 0 ? (
            <p className="text-[12px] text-[#64748B] text-center py-8">No tickets match &quot;{query}&quot;</p>
          ) : (
            <div className="flex flex-col gap-1">
              {results.map(ticket => (
                <Link
                  key={ticket.id}
                  href={`/super-admin/support/tickets/${ticket.id}`}
                  onClick={() => onOpenChange(false)}
                  className="flex items-center justify-between p-2.5 rounded-sm hover:bg-[#F8FAFC] transition-colors"
                >
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[12px] font-semibold text-[#2563EB]">{ticket.id}</span>
                    <span className="text-[12px] text-[#0F172A] truncate max-w-[250px]">{ticket.subject}</span>
                    <span className="text-[11px] text-[#64748B]">{ticket.companyId} · {ticket.requester.name}</span>
                  </div>
                  <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-sm ${
                    ticket.status === "New" ? "text-[#3B82F6] bg-[#DBEAFE]" :
                    ticket.status === "In Progress" ? "text-[#EAB308] bg-[#FEF9C3]" :
                    ticket.status === "Resolved" ? "text-[#10B981] bg-[#D1FAE5]" :
                    "text-[#64748B] bg-[#F1F5F9]"
                  }`}>{ticket.status}</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
