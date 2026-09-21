"use client";

import React, { useState, useCallback } from "react";
import { SupportProvider } from "@/features/support-tickets/data/mock-provider";
import { SupportActionsContext } from "@/features/support-tickets/context/support-actions-context";
import type { FilterState } from "@/features/support-tickets/components/filters-drawer";
import { Topbar } from "@/components/layout/topbar";
import { Button } from "@/components/ui/button";
import { PlusCircle, Search, SlidersHorizontal } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";
import { TicketCreateDrawer } from "@/features/support-tickets/components/ticket-create-drawer";
import { SearchDrawer } from "@/features/support-tickets/components/search-drawer";
import { FiltersDrawer } from "@/features/support-tickets/components/filters-drawer";

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
  const [createOpen, setCreateOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    status: "all", priority: "all", company: "all", category: "all", assignedTo: "all",
  });

  const openCreateDrawer = useCallback(() => setCreateOpen(true), []);
  const openSearchDrawer = useCallback(() => setSearchOpen(true), []);
  const openFiltersDrawer = useCallback(() => setFiltersOpen(true), []);

  return (
    <SupportProvider>
      <SupportActionsContext.Provider value={{ openCreateDrawer, openSearchDrawer, openFiltersDrawer, filters }}>
        <div className="flex-1 flex flex-col min-h-0 bg-[#F8FAFC]">
          <Topbar />

          <div className="flex-1 flex flex-col min-h-0">
            <div className="bg-white border-b border-[#E2E8F0] px-6 pt-4 pb-0 flex flex-col gap-0">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <h1 className="text-[16px] font-bold text-[#0F172A]">Support & Tickets</h1>
                  <span className="flex items-center gap-1.5 text-[11px] text-[#64748B] bg-[#FEF2F2] px-2.5 py-1 rounded-sm font-medium border border-[#FECACA]">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#EF4444]"></div>
                    Demo Data
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" className="h-8 gap-1.5 border-[#E2E8F0] text-[#475569] text-[12px] font-medium rounded-sm" onClick={openSearchDrawer}>
                    <Search size={14} />
                    Search
                  </Button>
                  <Button size="sm" variant="outline" className="h-8 gap-1.5 border-[#E2E8F0] text-[#475569] text-[12px] font-medium rounded-sm" onClick={openFiltersDrawer}>
                    <SlidersHorizontal size={14} />
                    Filters
                  </Button>
                  <Button size="sm" className="h-8 gap-1.5 bg-[#EB0711] hover:bg-[#D60811] text-white text-[12px] font-medium rounded-sm" onClick={openCreateDrawer}>
                    <PlusCircle size={14} />
                    Create Ticket
                  </Button>
                </div>
              </div>

              <div className="flex items-center flex-nowrap gap-4 sm:gap-6 overflow-x-auto min-w-0 no-scrollbar">
                {SUPPORT_TABS.map(tab => {
                  const isActive = tab.href === "/super-admin/support"
                    ? pathname === tab.href
                    : pathname.startsWith(tab.href);

                  return (
                    <Link
                      key={tab.href}
                      href={tab.href}
                      className={cn(
                        "pb-3 text-[12px] font-medium whitespace-nowrap flex-shrink-0 transition-colors relative",
                        isActive ? "text-[#EB0711]" : "text-[#64748B] hover:text-[#EB0711]"
                      )}
                    >
                      {tab.name}
                      {isActive && (
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#EB0711] rounded-t-sm" />
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>

            <div className="flex-1 overflow-hidden py-2">
              {children}
            </div>
          </div>
        </div>

        <TicketCreateDrawer open={createOpen} onOpenChange={setCreateOpen} />
        <SearchDrawer open={searchOpen} onOpenChange={setSearchOpen} />
        <FiltersDrawer open={filtersOpen} onOpenChange={setFiltersOpen} filters={filters} onApply={setFilters} />
      </SupportActionsContext.Provider>
    </SupportProvider>
  );
}
