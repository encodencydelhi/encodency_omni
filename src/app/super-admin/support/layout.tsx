"use client";

import React from "react";
import { SupportProvider } from "@/features/support-tickets/data/mock-provider";
import { Topbar } from "@/components/layout/topbar";
import { Button } from "@/components/ui/button";
import { PlusCircle, Search, Filter } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";

const SUPPORT_TABS = [
  { name: "Overview", href: "/super-admin/support" },
  { name: "Ticket Inbox", href: "/super-admin/support/inbox" },
  { name: "Queues & Saved Views", href: "/super-admin/support/queues" },
  { name: "SLA & Escalations", href: "/super-admin/support/sla" },
  { name: "Team Workload", href: "/super-admin/support/workload" },
  { name: "Reports & Insights", href: "/super-admin/support/reports" },
  { name: "Activity & Settings", href: "/super-admin/support/activity" },
];

export default function SupportLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <SupportProvider>
      <div className="flex-1 flex flex-col min-h-0 bg-[#F8FAFC]">
        <Topbar 
          title="Support & Tickets" 
          subtitle="Manage customer requests, support conversations, ticket ownership and resolution across OmniPlatform." 
          breadcrumbs={[{ label: "Super Admin", href: "/super-admin" }, { label: "Support & Tickets" }]}
        />
        
        <div className="flex-1 flex flex-col min-h-0">
          <div className="bg-white border-b border-[#E2E8F0] px-6 pt-6 pb-0 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button size="sm" className="h-8 gap-2 bg-[#0F172A] hover:bg-[#1E293B] text-white">
                  <PlusCircle size={14} />
                  Create Ticket
                </Button>
                <Button size="sm" variant="outline" className="h-8 gap-2 border-[#E2E8F0] text-[#475569]">
                  <Search size={14} />
                  Search
                </Button>
                <Button size="sm" variant="outline" className="h-8 gap-2 border-[#E2E8F0] text-[#475569]">
                  <Filter size={14} />
                  Filters
                </Button>
              </div>
              
              <div className="flex items-center gap-2 text-[12px] text-[#64748B] bg-[#F1F5F9] px-3 py-1.5 rounded-sm font-medium border border-[#E2E8F0]">
                <span className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#EAB308]"></div>
                  Demo Support Data
                </span>
              </div>
            </div>
            
            <div className="flex items-center gap-6 overflow-x-auto no-scrollbar">
              {SUPPORT_TABS.map(tab => {
                const isActive = tab.href === "/super-admin/support" 
                  ? pathname === tab.href 
                  : pathname.startsWith(tab.href);
                  
                return (
                  <Link 
                    key={tab.href} 
                    href={tab.href}
                    className={cn(
                      "pb-3 text-[13px] font-medium whitespace-nowrap transition-colors relative",
                      isActive ? "text-[#0F172A]" : "text-[#64748B] hover:text-[#0F172A]"
                    )}
                  >
                    {tab.name}
                    {isActive && (
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#0F172A] rounded-t-sm" />
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
          
          <div className="flex-1 overflow-auto p-6">
            {children}
          </div>
        </div>
      </div>
    </SupportProvider>
  );
}
