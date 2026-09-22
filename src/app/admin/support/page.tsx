"use client";

import Link from "next/link";
import { ArrowRight, AlertTriangle, CheckCircle2, Clock3, MessageSquareText, Ticket, UserX, Activity, CircleDashed } from "lucide-react";
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
    { label: "Active Tickets", value: active.length, hint: "Non-terminal in queue", href: "/admin/support/inbox" },
    { label: "New Tickets", value: newTickets.length, hint: "Awaiting triage", href: "/admin/support/inbox" },
    { label: "Unassigned Tickets", value: unassigned.length, hint: "Needs owner", href: "/admin/support/inbox?filter=unassigned" },
    { label: "In Progress", value: inProgress.length, hint: "Assigned and active", href: "/admin/support/inbox?filter=in-progress" },
    { label: "Waiting for Customer", value: waitingCustomer.length, hint: "Pending reply", href: "/admin/support/inbox?filter=waiting-customer" },
    { label: "SLA At Risk", value: slaRisks.filter((ticket) => ticket.sla?.state === "At Risk").length, hint: "Approaching deadline", href: "/admin/support/sla" },
    { label: "SLA Breached", value: slaRisks.filter((ticket) => ticket.sla?.state === "Breached").length, hint: "Missed target", href: "/admin/support/sla" },
    { label: "Escalated", value: escalated.length, hint: "Active escalations", href: "/admin/support/sla" },
  ];

  return (
    <div className="flex max-w-[1600px] flex-col gap-2">
      <div className="mb-1 flex items-center justify-between" aria-label="Support overview summary">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Company Overview</p>
        </div>
        <Link href="/admin/support/inbox" className="text-[11px] font-medium text-blue-600 hover:text-blue-700">View full inbox</Link>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-8">
        {kpis.map((item) => (
          <Link key={item.label} href={item.href} className="group block rounded-sm border border-slate-200 bg-white p-3 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition hover:border-slate-300 hover:shadow-[0_2px_8px_rgba(15,23,42,0.08)]">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-slate-500">{item.label}</span>
              <span className="rounded-sm bg-slate-100 p-1 text-slate-500">
                <ArrowRight className="size-3" />
              </span>
            </div>
            <div className="text-[22px] font-bold tracking-[-0.04em] text-slate-900">{item.value}</div>
            <div className="mt-1 text-[11px] text-slate-500">{item.hint}</div>
          </Link>
        ))}
      </div>

      <div className="grid gap-2 xl:grid-cols-[2.2fr_1fr]">
        <div className="flex flex-col gap-2">
          <Card className="rounded-sm border border-slate-200 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-[13px] font-semibold text-slate-900">Needs Attention</h2>
              <Link href="/admin/support/inbox" className="text-[11px] font-medium text-blue-600">View all</Link>
            </div>
            <div className="space-y-2">
              {tickets.slice(0, 4).map((ticket) => (
                <div key={ticket.id} className="flex items-center justify-between gap-3 rounded-sm border border-slate-200 bg-slate-50 p-2.5">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-7 w-7 items-center justify-center rounded-sm bg-red-50 text-red-600"><AlertTriangle className="size-3.5" /></div>
                    <div className="min-w-0">
                      <div className="truncate text-[12px] font-semibold text-slate-900">{ticket.id} · {ticket.subject}</div>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                        <span>{ticket.clientName}</span>
                        <span>•</span>
                        <span>{ticket.priority}</span>
                        <span>•</span>
                        <span>{ticket.ownerName ?? "Unassigned"}</span>
                      </div>
                    </div>
                  </div>
                  <Link href={`/admin/support/tickets/${ticket.id}`} className="whitespace-nowrap rounded-sm border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-700">Open</Link>
                </div>
              ))}
            </div>
          </Card>

          <Card className="rounded-sm border border-slate-200 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-[13px] font-semibold text-slate-900">Recent Support Activity</h2>
              <Link href="/admin/support/activity" className="text-[11px] font-medium text-blue-600">View all</Link>
            </div>
            <div className="space-y-2">
              {activity.slice(0, 5).map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-2 rounded-sm border border-slate-200 bg-slate-50 p-2.5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-7 w-7 items-center justify-center rounded-sm bg-blue-50 text-blue-600"><Activity className="size-3.5" /></div>
                    <div>
                      <div className="text-[12px] font-medium text-slate-800">{item.actorName} · {item.actionType}</div>
                      <div className="text-[11px] text-slate-500">{new Date(item.timestamp).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</div>
                    </div>
                  </div>
                  <Link href={`/admin/support/tickets/${item.ticketId}`} className="text-[11px] font-medium text-blue-600">{item.ticketId}</Link>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="flex flex-col gap-2">
          <Card className="rounded-sm border border-slate-200 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
            <h2 className="mb-3 text-[13px] font-semibold text-slate-900">Status Distribution</h2>
            <div className="space-y-2">
              {[
                { label: "New", count: getTicketsByStatus(tickets, "New").length, tone: "bg-blue-500" },
                { label: "Open", count: getTicketsByStatus(tickets, "Open").length, tone: "bg-cyan-500" },
                { label: "In Progress", count: getTicketsByStatus(tickets, "In Progress").length, tone: "bg-amber-500" },
                { label: "Waiting for Customer", count: getAwaitingCustomerTickets(tickets).length, tone: "bg-violet-500" },
                { label: "Waiting for Internal Team", count: getTicketsByStatus(tickets, "Waiting for Internal Team").length, tone: "bg-orange-500" },
                { label: "Resolved", count: getTicketsByStatus(tickets, "Resolved").length, tone: "bg-emerald-500" },
                { label: "Closed", count: getTicketsByStatus(tickets, "Closed").length, tone: "bg-slate-500" },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between text-[12px] text-slate-600">
                  <div className="flex items-center gap-2">
                    <span className={`h-2.5 w-2.5 rounded-full ${item.tone}`} />
                    <span>{item.label}</span>
                  </div>
                  <span className="font-semibold text-slate-800">{item.count}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card className="rounded-sm border border-slate-200 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
            <h2 className="mb-3 text-[13px] font-semibold text-slate-900">Ticket Volume & Resolution Trend</h2>
            <div className="flex h-24 items-end gap-2">
              {[38, 52, 46, 62, 58, 74, 69].map((height, index) => (
                <div key={index} className="flex-1 rounded-sm bg-gradient-to-t from-blue-500 to-cyan-400" style={{ height: `${height}%` }} />
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

          <Card className="rounded-sm border border-slate-200 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
            <h2 className="mb-3 text-[13px] font-semibold text-slate-900">Category Distribution</h2>
            <div className="space-y-2">
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
