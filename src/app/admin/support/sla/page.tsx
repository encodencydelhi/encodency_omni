"use client";

import Link from "next/link";
import { ShieldAlert, Flame, Clock, AlertTriangle, CheckCircle2, TrendingUp, Users, Timer } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useAdminSupport } from "@/features/admin/support/data/provider";
import { getEscalatedTickets, getSlaRisks } from "@/features/admin/support/data/selectors";

export default function AdminSupportSlaPage() {
  const { tickets, escalations } = useAdminSupport();
  const slaRisks = getSlaRisks(tickets);
  const escalated = getEscalatedTickets(tickets);

  const onTrack = tickets.filter((t) => t.sla?.state === "On Track").length;
  const atRisk = tickets.filter((t) => t.sla?.state === "At Risk").length;
  const breached = tickets.filter((t) => t.sla?.state === "Breached").length;
  const total = tickets.length;
  const complianceRate = total > 0 ? Math.round((onTrack / total) * 100) : 0;

  const urgentTickets = tickets.filter((t) => t.priority === "Urgent");
  const highTickets = tickets.filter((t) => t.priority === "High");
  const normalTickets = tickets.filter((t) => t.priority === "Normal");
  const lowTickets = tickets.filter((t) => t.priority === "Low");

  const slaByPriority = [
    { priority: "Urgent", total: urgentTickets.length, onTrack: urgentTickets.filter((t) => t.sla?.state === "On Track").length, atRisk: urgentTickets.filter((t) => t.sla?.state === "At Risk").length, breached: urgentTickets.filter((t) => t.sla?.state === "Breached").length, responseTarget: "1h", resolutionTarget: "4h" },
    { priority: "High", total: highTickets.length, onTrack: highTickets.filter((t) => t.sla?.state === "On Track").length, atRisk: highTickets.filter((t) => t.sla?.state === "At Risk").length, breached: highTickets.filter((t) => t.sla?.state === "Breached").length, responseTarget: "2h", resolutionTarget: "8h" },
    { priority: "Normal", total: normalTickets.length, onTrack: normalTickets.filter((t) => t.sla?.state === "On Track").length, atRisk: normalTickets.filter((t) => t.sla?.state === "At Risk").length, breached: normalTickets.filter((t) => t.sla?.state === "Breached").length, responseTarget: "4h", resolutionTarget: "24h" },
    { priority: "Low", total: lowTickets.length, onTrack: lowTickets.filter((t) => t.sla?.state === "On Track").length, atRisk: lowTickets.filter((t) => t.sla?.state === "At Risk").length, breached: lowTickets.filter((t) => t.sla?.state === "Breached").length, responseTarget: "8h", resolutionTarget: "48h" },
  ];

  const metrics = [
    { label: "First Response At Risk", value: slaRisks.filter((ticket) => ticket.sla?.state === "At Risk").length, icon: ShieldAlert, color: "#EA580C", bg: "#FFF7ED" },
    { label: "First Response Breached", value: slaRisks.filter((ticket) => ticket.sla?.state === "Breached").length, icon: Flame, color: "#DC2626", bg: "#FEF2F2" },
    { label: "Resolution At Risk", value: atRisk, icon: Clock, color: "#D97706", bg: "#FFFBEB" },
    { label: "Resolution Breached", value: breached, icon: AlertTriangle, color: "#BE185D", bg: "#FDF2F8" },
  ];

  const summaryCards = [
    { label: "SLA Compliance", value: `${complianceRate}%`, hint: `${onTrack} of ${total} on track`, color: complianceRate >= 80 ? "#059669" : "#D97706", bg: complianceRate >= 80 ? "#ECFDF5" : "#FFFBEB" },
    { label: "Avg First Response", value: "2h 14m", hint: "Across all tickets", color: "#2563EB", bg: "#EFF6FF" },
    { label: "Avg Resolution Time", value: "6h 42m", hint: "Across all tickets", color: "#7C3AED", bg: "#F5F3FF" },
    { label: "Tickets On Track", value: String(onTrack), hint: `${complianceRate}% compliance`, color: "#059669", bg: "#ECFDF5" },
  ];

  return (
    <div className="mx-auto flex max-w-[1400px] flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((item) => {
          const Icon = item.icon;
          return (
            <Card key={item.label} className="group rounded-sm border border-slate-200/80 bg-white p-3 shadow-sm transition-all duration-200 hover:shadow-md hover:border-slate-300">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500">{item.label}</span>
                <span className="flex size-7 shrink-0 items-center justify-center rounded-sm" style={{ backgroundColor: item.bg, color: item.color }}>
                  <Icon className="size-3.5" />
                </span>
              </div>
              <div className="mt-2 text-[22px] font-bold tracking-[-0.04em] text-slate-900">{item.value}</div>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((item) => (
          <Card key={item.label} className="rounded-sm border border-slate-200/80 bg-white p-3 shadow-sm">
            <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500">{item.label}</span>
            <div className="mt-2 text-[22px] font-bold tracking-[-0.04em]" style={{ color: item.color }}>{item.value}</div>
            <div className="mt-1 text-[11px] text-slate-500">{item.hint}</div>
          </Card>
        ))}
      </div>

      <div className="grid gap-3 xl:grid-cols-[1.2fr_1fr]">
        <Card className="rounded-sm border border-slate-200/80 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-[14px] font-semibold text-slate-900">SLA Risk Table</h2>
            <Link href="/admin/support/inbox" className="text-[11px] font-medium text-blue-600 hover:text-blue-700">Open inbox</Link>
          </div>
          <div className="overflow-hidden rounded-sm border border-slate-200/80">
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-[12px]">
                <thead className="bg-slate-50/80 text-slate-600">
                  <tr>
                    <th className="px-4 py-2.5 font-medium">Ticket</th>
                    <th className="px-4 py-2.5 font-medium">Client</th>
                    <th className="px-4 py-2.5 font-medium">Priority</th>
                    <th className="px-4 py-2.5 font-medium">SLA Type</th>
                    <th className="px-4 py-2.5 font-medium">Deadline</th>
                    <th className="px-4 py-2.5 font-medium">State</th>
                    <th className="px-4 py-2.5 font-medium">Owner</th>
                  </tr>
                </thead>
                <tbody>
                  {slaRisks.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-6 text-center text-[12px] text-slate-500">No SLA risks currently.</td>
                    </tr>
                  )}
                  {slaRisks.map((ticket) => (
                    <tr key={ticket.id} className="border-t border-slate-100 transition hover:bg-slate-50/80">
                      <td className="px-4 py-3.5 text-blue-600 hover:text-blue-700"><Link href={`/admin/support/tickets/${ticket.id}`}>{ticket.id}</Link></td>
                      <td className="px-4 py-3.5 text-slate-700">{ticket.clientName}</td>
                      <td className="px-4 py-3.5 text-slate-700">{ticket.priority}</td>
                      <td className="px-4 py-3.5 text-slate-700">{ticket.sla?.policy ?? "Standard"}</td>
                      <td className="px-4 py-3.5 text-slate-700">{ticket.sla?.deadline ?? "N/A"}</td>
                      <td className="px-4 py-3.5"><span className="rounded-sm bg-amber-50 px-2 py-1 text-[10px] font-medium text-amber-700">{ticket.sla?.state ?? "Unknown"}</span></td>
                      <td className="px-4 py-3.5 text-slate-700">{ticket.ownerName ?? "Unassigned"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Card>

        <div className="flex flex-col gap-3">
          <Card className="rounded-sm border border-slate-200/80 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-[14px] font-semibold text-slate-900">SLA by Priority</h2>
              <span className="text-[11px] text-slate-500">{tickets.length} total</span>
            </div>
            <div className="space-y-3">
              {slaByPriority.map((item) => (
                <div key={item.priority} className="rounded-sm border border-slate-100 p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] font-semibold text-slate-800">{item.priority}</span>
                    <span className="text-[11px] text-slate-500">{item.total} tickets</span>
                  </div>
                  <div className="mt-2 flex gap-4 text-[11px]">
                    <span className="text-green-600">On Track: {item.onTrack}</span>
                    <span className="text-amber-600">At Risk: {item.atRisk}</span>
                    <span className="text-red-600">Breached: {item.breached}</span>
                  </div>
                  <div className="mt-2 flex gap-4 text-[10px] text-slate-500">
                    <span>Response: {item.responseTarget}</span>
                    <span>Resolution: {item.resolutionTarget}</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="rounded-sm border border-slate-200/80 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-[14px] font-semibold text-slate-900">Escalations</h2>
              <span className="rounded-sm bg-red-50 px-2 py-1 text-[10px] font-medium text-red-700">{escalated.length} active</span>
            </div>
            <div className="space-y-2">
              {escalations.length === 0 && (
                <div className="rounded-sm border border-dashed border-slate-200 bg-slate-50 p-3 text-center text-[12px] text-slate-500">No active escalations.</div>
              )}
              {escalations.map((escalation) => (
                <div key={escalation.id} className="flex items-center justify-between rounded-sm border border-slate-100 bg-slate-50/50 p-3 transition hover:bg-slate-50 hover:border-slate-200">
                  <div>
                    <div className="text-[12px] font-medium text-slate-700">{escalation.ticketId}</div>
                    <div className="text-[11px] text-slate-500">{escalation.reason}</div>
                  </div>
                  <div className="text-[11px] font-medium text-slate-600">{escalation.state}</div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      <div className="grid gap-3 xl:grid-cols-3">
        <Card className="rounded-sm border border-slate-200/80 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <div className="flex size-7 items-center justify-center rounded-sm bg-green-50 text-green-600"><CheckCircle2 className="size-3.5" /></div>
            <h2 className="text-[13px] font-semibold text-slate-900">SLA Policies</h2>
          </div>
          <div className="space-y-2 text-[12px]">
            <div className="flex items-center justify-between border-b border-slate-100 py-2"><span className="text-slate-600">Standard Support</span><span className="font-medium text-slate-800">4h / 24h</span></div>
            <div className="flex items-center justify-between border-b border-slate-100 py-2"><span className="text-slate-600">Premium Support</span><span className="font-medium text-slate-800">1h / 8h</span></div>
            <div className="flex items-center justify-between border-b border-slate-100 py-2"><span className="text-slate-600">Enterprise SLA</span><span className="font-medium text-slate-800">30m / 4h</span></div>
            <div className="flex items-center justify-between py-2"><span className="text-slate-600">Critical Escalation</span><span className="font-medium text-slate-800">15m / 2h</span></div>
          </div>
        </Card>

        <Card className="rounded-sm border border-slate-200/80 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <div className="flex size-7 items-center justify-center rounded-sm bg-blue-50 text-blue-600"><TrendingUp className="size-3.5" /></div>
            <h2 className="text-[13px] font-semibold text-slate-900">SLA Trend (7 Days)</h2>
          </div>
          <div className="space-y-2 text-[12px]">
            {[
              { day: "Mon", onTrack: 8, breached: 0 },
              { day: "Tue", onTrack: 7, breached: 1 },
              { day: "Wed", onTrack: 9, breached: 0 },
              { day: "Thu", onTrack: 6, breached: 2 },
              { day: "Fri", onTrack: 7, breached: 1 },
              { day: "Sat", onTrack: 5, breached: 0 },
              { day: "Sun", onTrack: 4, breached: 0 },
            ].map((item) => (
              <div key={item.day} className="flex items-center gap-3">
                <span className="w-8 text-slate-500">{item.day}</span>
                <div className="flex-1">
                  <div className="flex gap-1">
                    <div className="h-2 rounded-sm bg-green-400" style={{ width: `${(item.onTrack / 10) * 100}%` }} />
                    <div className="h-2 rounded-sm bg-red-400" style={{ width: `${(item.breached / 10) * 100}%` }} />
                  </div>
                </div>
                <span className="text-[10px] text-slate-500">{item.onTrack}/{item.onTrack + item.breached}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 flex gap-3 text-[10px] text-slate-500">
            <span className="flex items-center gap-1"><span className="size-2 rounded-sm bg-green-400" /> On Track</span>
            <span className="flex items-center gap-1"><span className="size-2 rounded-sm bg-red-400" /> Breached</span>
          </div>
        </Card>

        <Card className="rounded-sm border border-slate-200/80 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <div className="flex size-7 items-center justify-center rounded-sm bg-purple-50 text-purple-600"><Users className="size-3.5" /></div>
            <h2 className="text-[13px] font-semibold text-slate-900">Team SLA Performance</h2>
          </div>
          <div className="space-y-2.5 text-[12px]">
            {[
              { team: "Triage Team", compliance: 92, tickets: 5 },
              { team: "Technical Support", compliance: 78, tickets: 8 },
              { team: "Billing Support", compliance: 85, tickets: 4 },
            ].map((item) => (
              <div key={item.team}>
                <div className="flex items-center justify-between">
                  <span className="text-slate-700">{item.team}</span>
                  <span className="font-medium text-slate-800">{item.compliance}%</span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-sm bg-slate-100">
                  <div className="h-full rounded-sm bg-blue-500" style={{ width: `${item.compliance}%` }} />
                </div>
                <div className="mt-1 text-[10px] text-slate-500">{item.tickets} tickets managed</div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
