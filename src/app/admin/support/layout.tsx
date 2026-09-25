"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Plus, ArrowUpRight, Ellipsis } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import { AdminSupportProvider, useAdminSupport } from "@/features/admin/support/data/provider";

const SUPPORT_TABS = [
  { name: "Overview", href: "/admin/support" },
  { name: "Ticket Inbox", href: "/admin/support/inbox" },
  { name: "Queues & Saved Views", href: "/admin/support/queues" },
  { name: "SLA & Escalations", href: "/admin/support/sla" },
  { name: "Team Workload", href: "/admin/support/workload" },
  { name: "Reports & Insights", href: "/admin/support/reports" },
  { name: "Activity & Settings", href: "/admin/support/activity" },
];

function SupportToolbar() {
  const pathname = usePathname();
  const { company } = useAdminSupport();
  const [moreOpen, setMoreOpen] = useState(false);

  const quickLinks = [
    { label: "View Unassigned Tickets", href: "/admin/support/inbox?filter=unassigned" },
    { label: "Review SLA Risks", href: "/admin/support/sla" },
    { label: "View Escalations", href: "/admin/support/sla?tab=escalations" },
    { label: "View Team Workload", href: "/admin/support/workload" },
    { label: "View Support Reports", href: "/admin/support/reports" },
  ];

  return (
    <div className="flex w-full flex-col gap-4 border-b border-slate-200/80 bg-white px-5 py-4 shadow-[0_1px_0_rgba(15,23,42,0.02)] sm:px-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-[16px] font-bold tracking-[-0.02em] text-slate-900">
            Support & Tickets
            <span className="ml-2 align-middle rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
              Preview / Mock Mode
            </span>
          </h1>
          <p className="mt-1 text-[12px] text-slate-600">Manage customer requests, support conversations and ticket resolution for your company.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/admin/support/inbox?create=1" className="inline-flex items-center gap-1.5 rounded-sm border border-slate-200 bg-white px-3.5 py-2 text-[12px] font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 hover:shadow-sm">
            <Plus className="size-3.5" />
            Create Ticket
          </Link>
          <div className="relative">
            <Button
              variant="outline"
              size="sm"
              className="h-9 rounded-sm border-slate-200 px-3 text-[12px] font-medium text-slate-700"
              onClick={() => setMoreOpen((open) => !open)}
            >
              <Ellipsis className="size-3.5" />
              More
            </Button>
            {moreOpen && (
              <div className="absolute right-0 z-20 mt-2 w-56 overflow-hidden rounded-sm border border-slate-200 bg-white shadow-xl">
                {quickLinks.map((item) => (
                  <Link
                    key={item.label}
                    href={item.href}
                    onClick={() => setMoreOpen(false)}
                    className="block border-b border-slate-100 px-3 py-2.5 text-[12px] text-slate-700 transition hover:bg-slate-50 last:border-b-0"
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-sm border border-slate-200/80 bg-slate-50/50 px-3.5 py-2.5 text-[11px] text-slate-600">
        <span className="font-semibold text-slate-700">Company</span>
        <span>{company.name}</span>
        <span className="mx-1 h-3 w-px bg-slate-300" />
        <span className="font-semibold text-slate-700">Date Range</span>
        <span>Last 7 Days</span>
        <span className="mx-1 h-3 w-px bg-slate-300" />
        <span className="font-semibold text-slate-700">Support Team</span>
        <span>All Company Staff</span>
        <span className="mx-1 h-3 w-px bg-slate-300" />
        <span className="font-semibold text-slate-700">Ticket Source</span>
        <span>All Sources</span>
        <span className="mx-1 h-3 w-px bg-slate-300" />
        <span className="font-semibold text-slate-700">Data Source</span>
        <span>Demo Support Data</span>
        <span className="ml-auto inline-flex items-center gap-1 rounded-sm border border-amber-200 bg-amber-50 px-2.5 py-1 text-[10px] font-medium text-amber-700">
          <ArrowUpRight className="size-3" />
          Customer Channels Not Connected
        </span>
      </div>

      <nav className="flex flex-wrap gap-0 border-b border-slate-200/80" aria-label="Support sections">
        {SUPPORT_TABS.map((tab) => {
          const isActive = tab.href === "/admin/support" ? pathname === tab.href : pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "border-b-2 px-3 py-2 text-[12px] font-medium transition",
                isActive ? "border-red-500 text-red-600" : "border-transparent text-slate-500 hover:text-slate-800",
              )}
            >
              {tab.name}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

export default function AdminSupportLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminSupportProvider>
      <div className="flex min-h-full flex-col bg-[#f8fafc]">
        <SupportToolbar />
        <div className="flex-1 py-3">{children}</div>
      </div>
    </AdminSupportProvider>
  );
}
