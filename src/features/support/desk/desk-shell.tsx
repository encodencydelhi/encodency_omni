"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, type FormEvent, type ReactNode } from "react";
import { Activity, BarChart3, Headset, Inbox, LayoutDashboard, Layers, RefreshCw, Timer, UsersRound } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils/cn";
import { DESK_KEY, useDeskQueues } from "../hooks";
import { btn, field } from "../ui";

export function DeskShell({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? "/super-admin/support";
  const router = useRouter();
  const queryClient = useQueryClient();
  const queues = useDeskQueues();
  const [jump, setJump] = useState("");
  const q = queues.data?.queues;

  const tabs = [
    { label: "Overview", href: "/super-admin/support", icon: LayoutDashboard },
    { label: "Ticket Inbox", href: "/super-admin/support/inbox", icon: Inbox, badge: q?.all, tone: "slate" },
    { label: "Queues & Saved Views", href: "/super-admin/support/queues", icon: Layers },
    { label: "SLA & Escalations", href: "/super-admin/support/sla", icon: Timer, badge: q ? q.breached : undefined, tone: "red" },
    { label: "Team Workload", href: "/super-admin/support/workload", icon: UsersRound },
    { label: "Reports & Insights", href: "/super-admin/support/reports", icon: BarChart3 },
    { label: "Activity & Settings", href: "/super-admin/support/activity", icon: Activity },
  ];

  const go = (event: FormEvent) => {
    event.preventDefault();
    const number = Number(jump.replace(/^#/, "").trim());
    if (Number.isInteger(number) && number > 0) {
      router.push(`/super-admin/support/tickets/${number}`);
      setJump("");
    }
  };

  return (
    <div className="-mx-4 -my-4 flex min-h-[calc(100dvh-84px)] flex-col overflow-visible bg-[#f8fafc] capitalize sm:-mx-5 xl:-mx-6">
      <div className="border-b border-slate-200 bg-white px-5 pt-4 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-sm bg-red-50 text-red-600 ring-1 ring-red-100">
              <Headset className="size-5" />
            </span>
            <div className="min-w-0">
              <h1 className="text-base font-semibold tracking-tight text-slate-900">Support Desk</h1>
              <p className="text-xs font-medium text-slate-600">Tickets raised by every Company. Work them, reply, hand them over and keep the SLA.</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <form onSubmit={go} className="flex items-center gap-1.5">
              <label className="sr-only" htmlFor="jump-ticket">
                Go to ticket number
              </label>
              <input id="jump-ticket" value={jump} onChange={(event) => setJump(event.target.value)} placeholder="Go to ticket #" inputMode="numeric" className={cn(field, "h-8 w-36")} />
            </form>
            <button type="button" className={btn} onClick={() => void queryClient.invalidateQueries({ queryKey: [DESK_KEY] })}>
              <RefreshCw className="size-3.5" />
              Refresh
            </button>
          </div>
        </div>
        <nav className="mt-3 flex gap-1 overflow-x-auto overflow-y-hidden" aria-label="Support desk sections">
          {tabs.map((tab) => {
            const current = tab.href === "/super-admin/support" ? pathname === tab.href : pathname.startsWith(tab.href) || (tab.href.endsWith("/inbox") && pathname.includes("/tickets/"));
            return (
              <Link
                key={tab.href}
                href={tab.href}
                aria-current={current ? "page" : undefined}
                className={cn("inline-flex shrink-0 items-center gap-2 border-b-2 px-3.5 py-2.5 text-xs font-semibold transition", current ? "border-red-600 text-red-600" : "border-transparent text-slate-500 hover:text-slate-900")}
              >
                <tab.icon className="size-3.5" />
                {tab.label}
                {tab.badge !== undefined && tab.badge > 0 && <span className={cn("rounded-sm px-1.5 py-px text-[10px] font-bold", tab.tone === "red" ? "bg-rose-100 text-rose-700" : "bg-slate-100 text-slate-600")}>{tab.badge}</span>}
              </Link>
            );
          })}
        </nav>
      </div>
      <div className="flex-1 px-5 py-4 sm:px-6">{children}</div>
    </div>
  );
}
