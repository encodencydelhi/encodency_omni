"use client";

import Link from "next/link";
import { Card } from "@/components/ui/card";
import { useAdminSupport } from "@/features/admin/support/data/provider";
import { getEscalatedTickets, getSlaRisks } from "@/features/admin/support/data/selectors";

export default function AdminSupportSlaPage() {
  const { tickets, escalations } = useAdminSupport();
  const slaRisks = getSlaRisks(tickets);
  const escalated = getEscalatedTickets(tickets);

  return (
    <div className="mx-auto flex max-w-[1400px] flex-col gap-2">
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "First Response At Risk", value: slaRisks.filter((ticket) => ticket.sla?.state === "At Risk").length },
          { label: "First Response Breached", value: slaRisks.filter((ticket) => ticket.sla?.state === "Breached").length },
          { label: "Resolution At Risk", value: tickets.filter((ticket) => ticket.sla?.state === "At Risk").length },
          { label: "Resolution Breached", value: tickets.filter((ticket) => ticket.sla?.state === "Breached").length },
        ].map((item) => (
          <Card key={item.label} className="rounded-sm border border-slate-200 bg-white p-3 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
            <div className="text-[11px] uppercase tracking-[0.08em] text-slate-500">{item.label}</div>
            <div className="mt-2 text-[22px] font-bold tracking-[-0.04em] text-slate-900">{item.value}</div>
          </Card>
        ))}
      </div>

      <Card className="rounded-sm border border-slate-200 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[13px] font-semibold text-slate-900">SLA risk table</h2>
          <Link href="/admin/support/inbox" className="text-[11px] font-medium text-blue-600">Open inbox</Link>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-[12px]">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-3 py-2 font-medium">Ticket</th>
                <th className="px-3 py-2 font-medium">Client</th>
                <th className="px-3 py-2 font-medium">Priority</th>
                <th className="px-3 py-2 font-medium">SLA Type</th>
                <th className="px-3 py-2 font-medium">Deadline</th>
                <th className="px-3 py-2 font-medium">State</th>
                <th className="px-3 py-2 font-medium">Owner</th>
              </tr>
            </thead>
            <tbody>
              {slaRisks.map((ticket) => (
                <tr key={ticket.id} className="border-t border-slate-200 hover:bg-slate-50">
                  <td className="px-3 py-3 text-blue-600"><Link href={`/admin/support/tickets/${ticket.id}`}>{ticket.id}</Link></td>
                  <td className="px-3 py-3 text-slate-700">{ticket.clientName}</td>
                  <td className="px-3 py-3 text-slate-700">{ticket.priority}</td>
                  <td className="px-3 py-3 text-slate-700">{ticket.sla?.policy ?? "Standard"}</td>
                  <td className="px-3 py-3 text-slate-700">{ticket.sla?.deadline ?? "N/A"}</td>
                  <td className="px-3 py-3"><span className="rounded-sm bg-amber-50 px-2 py-1 text-[10px] font-medium text-amber-700">{ticket.sla?.state ?? "Unknown"}</span></td>
                  <td className="px-3 py-3 text-slate-700">{ticket.ownerName ?? "Unassigned"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="rounded-sm border border-slate-200 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[13px] font-semibold text-slate-900">Escalations</h2>
          <span className="text-[11px] text-slate-500">{escalated.length} active</span>
        </div>
        <div className="space-y-2">
          {escalations.map((escalation) => (
            <div key={escalation.id} className="flex items-center justify-between rounded-sm border border-slate-200 bg-slate-50 p-2.5">
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
  );
}
