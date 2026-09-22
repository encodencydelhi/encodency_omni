"use client";

import Link from "next/link";
import { AlertTriangle, MessageSquareText, Ticket, UserX, Activity, Inbox, Timer, ShieldAlert, Flame } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useAdminSupport } from "@/features/admin/support/data/provider";
import { getActiveTickets, getAwaitingCustomerTickets, getCategoryDistribution, getEscalatedTickets, getSlaRisks, getTicketsByStatus, getUnassignedTickets } from "@/features/admin/support/data/selectors";

export default function AdminSupportOverviewPage() {
  const { tickets, activity } = useAdminSupport();
  const active = getActiveTickets(tickets);
  const newTickets = getTicketsByStatus(tickets, "New");
  const unassigned = getUnassignedTickets(tickets);
  const inProgress = getTicketsByStatus(tickets, "In Progress");
  const waitingCustomer = getAwaitingCustomerTickets(tickets);
  const slaRisks = getSlaRisks(tickets);
  const escalated = getEscalatedTickets(tickets);
  const categoryDistribution = getCategoryDistribution(tickets);

  const kpis = [
    { label: "Active", value: active.length, hint: "In queue", href: "/admin/support/inbox", icon: Inbox, color: "#2563EB", bg: "#EFF6FF" },
    { label: "New", value: newTickets.length, hint: "Needs triage", href: "/admin/support/inbox", icon: Ticket, color: "#7C3AED", bg: "#F5F3FF" },
    { label: "Unassigned", value: unassigned.length, hint: "No owner yet", href: "/admin/support/inbox?filter=unassigned", icon: UserX, color: "#DC2626", bg: "#FEF2F2" },
    { label: "In Progress", value: inProgress.length, hint: "Being worked on", href: "/admin/support/inbox?filter=in-progress", icon: Timer, color: "#D97706", bg: "#FFFBEB" },
    { label: "Awaiting", value: waitingCustomer.length, hint: "Customer reply needed", href: "/admin/support/inbox?filter=waiting-customer", icon: MessageSquareText, color: "#0891B2", bg: "#ECFEFF" },
    { label: "SLA At Risk", value: slaRisks.filter((ticket) => ticket.sla?.state === "At Risk").length, hint: "Deadline near", href: "/admin/support/sla", icon: ShieldAlert, color: "#EA580C", bg: "#FFF7ED" },
    { label: "SLA Breached", value: slaRisks.filter((ticket) => ticket.sla?.state === "Breached").length, hint: "Missed target", href: "/admin/support/sla", icon: Flame, color: "#DC2626", bg: "#FEF2F2" },
    { label: "Escalated", value: escalated.length, hint: "Urgent needed", href: "/admin/support/sla", icon: AlertTriangle, color: "#BE185D", bg: "#FDF2F8" },
  ];

  return (
    <div className="flex max-w-[1600px] flex-col gap-3">
      <div className="flex items-center justify-between px-1">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Company Overview</p>
        <Link href="/admin/support/inbox" className="text-[11px] font-medium text-blue-600 hover:text-blue-700">View full inbox</Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-8">
        {kpis.map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.label} href={item.href} className="group block rounded-sm border border-slate-200/80 bg-white p-4 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg hover:border-slate-300">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500">{item.label}</span>
                <span className="flex size-8 shrink-0 items-center justify-center rounded-sm" style={{ backgroundColor: item.bg, color: item.color }}>
                  <Icon className="size-4" />
                </span>
              </div>
              <div className="mt-3 text-[28px] font-bold tracking-[-0.04em] text-slate-900">{item.value}</div>
              <div className="mt-1 text-[11px] text-slate-500">{item.hint}</div>
            </Link>
          );
        })}
      </div>

      <div className="grid gap-3 xl:grid-cols-[2.2fr_1fr]">
        <div className="flex flex-col gap-3">
          <Card className="rounded-sm border border-slate-200/80 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-[14px] font-semibold text-slate-900">Needs Attention</h2>
              <Link href="/admin/support/inbox" className="text-[11px] font-medium text-blue-600 hover:text-blue-700">View all</Link>
            </div>
            <div className="space-y-2">
              {tickets.slice(0, 4).map((ticket) => (
                <Link key={ticket.id} href={`/admin/support/tickets/${ticket.id}`} className="flex items-center justify-between gap-3 rounded-sm border border-slate-100 bg-slate-50/50 p-3 transition hover:bg-slate-50 hover:border-slate-200">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-sm bg-red-50 text-red-500"><AlertTriangle className="size-4" /></div>
                    <div className="min-w-0">
                      <div className="truncate text-[12px] font-semibold text-slate-900">{ticket.id} · {ticket.subject}</div>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500">
                        <span>{ticket.clientName}</span>
                        <span className="text-slate-300">·</span>
                        <span>{ticket.priority}</span>
                        <span className="text-slate-300">·</span>
                        <span>{ticket.ownerName ?? "Unassigned"}</span>
                      </div>
                    </div>
                  </div>
                  <span className="whitespace-nowrap rounded-sm border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600 transition group-hover:border-blue-200 group-hover:text-blue-600">Open</span>
                </Link>
              ))}
            </div>
          </Card>

          <Card className="rounded-sm border border-slate-200/80 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-[14px] font-semibold text-slate-900">Recent Support Activity</h2>
              <Link href="/admin/support/activity" className="text-[11px] font-medium text-blue-600 hover:text-blue-700">View all</Link>
            </div>
            <div className="space-y-2">
              {activity.slice(0, 5).map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-3 rounded-sm border border-slate-100 bg-slate-50/50 p-3 transition hover:bg-slate-50 hover:border-slate-200">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-sm bg-blue-50 text-blue-500"><Activity className="size-4" /></div>
                    <div>
                      <div className="text-[12px] font-medium text-slate-800">{item.actorName} · {item.actionType}</div>
                      <div className="text-[11px] text-slate-500">{new Date(item.timestamp).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</div>
                    </div>
                  </div>
                  <Link href={`/admin/support/tickets/${item.ticketId}`} className="text-[11px] font-medium text-blue-600 hover:text-blue-700">{item.ticketId}</Link>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="flex flex-col gap-3">
          <Card className="rounded-sm border border-slate-200/80 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-[14px] font-semibold text-slate-900">Status Distribution</h2>
            <div className="space-y-2.5">
              {[
                { label: "New", count: getTicketsByStatus(tickets, "New").length, tone: "bg-blue-500" },
                { label: "Open", count: getTicketsByStatus(tickets, "Open").length, tone: "bg-cyan-500" },
                { label: "In Progress", count: getTicketsByStatus(tickets, "In Progress").length, tone: "bg-amber-500" },
                { label: "Waiting for Customer", count: getAwaitingCustomerTickets(tickets).length, tone: "bg-violet-500" },
                { label: "Waiting for Internal Team", count: getTicketsByStatus(tickets, "Waiting for Internal Team").length, tone: "bg-orange-500" },
                { label: "Resolved", count: getTicketsByStatus(tickets, "Resolved").length, tone: "bg-emerald-500" },
                { label: "Closed", count: getTicketsByStatus(tickets, "Closed").length, tone: "bg-slate-400" },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between text-[12px] text-slate-600">
                  <div className="flex items-center gap-2.5">
                    <span className={`h-2.5 w-2.5 rounded-full ${item.tone}`} />
                    <span>{item.label}</span>
                  </div>
                  <span className="font-semibold text-slate-800">{item.count}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card className="rounded-sm border border-slate-200/80 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-[14px] font-semibold text-slate-900">Ticket Volume & Resolution Trend</h2>
            <div className="flex h-28 items-end gap-2">
              {[38, 52, 46, 62, 58, 74, 69].map((height, index) => (
                <div key={index} className="flex-1 rounded-sm bg-gradient-to-t from-blue-500 to-cyan-400 transition-all duration-300 hover:from-blue-600 hover:to-cyan-500" style={{ height: `${height}%` }} />
              ))}
            </div>
            <div className="mt-3 flex justify-between text-[10px] text-slate-500">
              <span>Mon</span>
              <span>Tue</span>
              <span>Wed</span>
              <span>Thu</span>
              <span>Fri</span>
              <span>Sat</span>
              <span>Sun</span>
            </div>
          </Card>

          <Card className="rounded-sm border border-slate-200/80 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-[14px] font-semibold text-slate-900">Category Distribution</h2>
            <div className="space-y-2.5">
              {categoryDistribution.slice(0, 5).map((item) => (
                <div key={item.category} className="flex items-center justify-between text-[12px] text-slate-600">
                  <span>{item.category}</span>
                  <span className="font-semibold text-slate-800">{item.count}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
