"use client";

import { Card } from "@/components/ui/card";
import { useAdminSupport } from "@/features/admin/support/data/provider";
import { getTeamWorkload } from "@/features/admin/support/data/selectors";

export default function AdminSupportWorkloadPage() {
  const { tickets } = useAdminSupport();
  const workload = getTeamWorkload(tickets);

  return (
    <div className="">
      <Card className="rounded-sm border border-slate-200 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        <h2 className="mb-3 text-[13px] font-semibold text-slate-900">Team workload</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-[12px]">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-3 py-2 font-medium">Staff Member</th>
                <th className="px-3 py-2 font-medium">Team</th>
                <th className="px-3 py-2 font-medium">Active Tickets</th>
                <th className="px-3 py-2 font-medium">Urgent Tickets</th>
                <th className="px-3 py-2 font-medium">SLA Risk</th>
                <th className="px-3 py-2 font-medium">Waiting Customer</th>
              </tr>
            </thead>
            <tbody>
              {workload.map((row) => (
                <tr key={row.name} className="border-t border-slate-200 hover:bg-slate-50">
                  <td className="px-3 py-3 text-slate-700">{row.name}</td>
                  <td className="px-3 py-3 text-slate-700">Technical Support</td>
                  <td className="px-3 py-3 text-slate-700">{row.active}</td>
                  <td className="px-3 py-3 text-slate-700">{row.urgent}</td>
                  <td className="px-3 py-3 text-slate-700">{row.slaRisk}</td>
                  <td className="px-3 py-3 text-slate-700">{row.waitingCustomer}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
