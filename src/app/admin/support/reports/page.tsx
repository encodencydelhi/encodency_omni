"use client";

import { ArrowUpRight, CheckCheck, FileText, RefreshCcw, BarChart3 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useAdminSupport } from "@/features/admin/support/data/provider";
import { getCategoryDistribution, getPriorityDistribution } from "@/features/admin/support/data/selectors";

export default function AdminSupportReportsPage() {
  const { tickets } = useAdminSupport();
  const categories = getCategoryDistribution(tickets);
  const priorities = getPriorityDistribution(tickets);

  return (
    <div className="mx-auto flex max-w-[1400px] flex-col gap-2">
      <div className="mb-1 flex items-center justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Support Reports</p>
        </div>
        <div className="inline-flex items-center gap-1 rounded-sm border border-slate-200 bg-white px-2 py-1 text-[10px] font-medium text-slate-600">
          <BarChart3 className="size-3" />
          Company scope
        </div>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Tickets Created", value: tickets.length, icon: FileText, tint: "bg-blue-50 text-blue-600 border-blue-200" },
          { label: "Tickets Resolved", value: tickets.filter((item) => item.status === "Resolved").length, icon: CheckCheck, tint: "bg-emerald-50 text-emerald-600 border-emerald-200" },
          { label: "Tickets Reopened", value: tickets.reduce((sum, item) => sum + item.reopenCount, 0), icon: RefreshCcw, tint: "bg-amber-50 text-amber-600 border-amber-200" },
          { label: "Open Tickets", value: tickets.filter((item) => item.status !== "Resolved" && item.status !== "Closed").length, icon: ArrowUpRight, tint: "bg-violet-50 text-violet-600 border-violet-200" },
        ].map((item) => {
          const Icon = item.icon;

          return (
            <Card key={item.label} className="rounded-sm border border-slate-200 bg-white p-3 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-[11px] uppercase tracking-[0.08em] text-slate-500">{item.label}</div>
                  <div className="mt-2 text-[22px] font-bold tracking-[-0.04em] text-slate-900">{item.value}</div>
                </div>
                <div className={`flex h-8 w-8 items-center justify-center rounded-sm border ${item.tint}`}>
                  <Icon className="size-3.5" />
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-2 lg:grid-cols-2">
        <Card className="rounded-sm border border-slate-200 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
          <h2 className="mb-3 text-[13px] font-semibold text-slate-900">Category distribution</h2>
          <div className="space-y-2">
            {categories.map((item) => (
              <div key={item.category} className="flex items-center justify-between text-[12px] text-slate-600">
                <span>{item.category}</span>
                <span className="font-semibold text-slate-800">{item.count}</span>
              </div>
            ))}
          </div>
        </Card>
        <Card className="rounded-sm border border-slate-200 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
          <h2 className="mb-3 text-[13px] font-semibold text-slate-900">Priority distribution</h2>
          <div className="space-y-2">
            {priorities.map((item) => (
              <div key={item.priority} className="flex items-center justify-between text-[12px] text-slate-600">
                <span>{item.priority}</span>
                <span className="font-semibold text-slate-800">{item.count}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
