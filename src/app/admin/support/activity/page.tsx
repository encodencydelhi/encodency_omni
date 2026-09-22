"use client";

import Link from "next/link";
import { Card } from "@/components/ui/card";
import { useAdminSupport } from "@/features/admin/support/data/provider";

export default function AdminSupportActivityPage() {
  const { activity, templates, company } = useAdminSupport();

  return (
    <div className="mx-auto flex max-w-[1400px] flex-col gap-2">
      <div className="mb-1 flex items-center justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Activity & Settings</p>
        </div>
        <Link href="/admin/support/inbox" className="text-[11px] font-medium text-blue-600 hover:text-blue-700">Open inbox</Link>
      </div>
      <div className="grid gap-2 lg:grid-cols-[1.4fr_0.9fr]">
        <Card className="rounded-sm border border-slate-200 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-[13px] font-semibold text-slate-900">Activity feed</h2>
            <Link href="/admin/support/inbox" className="text-[11px] font-medium text-blue-600">Open inbox</Link>
          </div>
          <div className="space-y-2">
            {activity.map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-3 rounded-sm border border-slate-200 bg-slate-50 p-2.5">
                <div>
                  <div className="text-[12px] font-medium text-slate-800">{item.actorName} · {item.actionType}</div>
                  <div className="mt-1 text-[11px] text-slate-500">{new Date(item.timestamp).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</div>
                </div>
                <Link href={`/admin/support/tickets/${item.ticketId}`} className="text-[11px] font-medium text-blue-600">{item.ticketId}</Link>
              </div>
            ))}
          </div>
        </Card>

        <Card className="rounded-sm border border-slate-200 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
          <h2 className="mb-3 text-[13px] font-semibold text-slate-900">Support settings</h2>
          <div className="space-y-2 text-[12px] text-slate-600">
            <div className="rounded-sm border border-slate-200 bg-slate-50 p-2.5">
              <div className="font-medium text-slate-800">Company scope</div>
              <div className="mt-1">{company.name}</div>
            </div>
            <div className="rounded-sm border border-slate-200 bg-slate-50 p-2.5">
              <div className="font-medium text-slate-800">Email routing</div>
              <div className="mt-1">support@{company.name.toLowerCase().replace(/\s+|\.|\&|\//g, "")}.com</div>
            </div>
            <div className="rounded-sm border border-slate-200 bg-slate-50 p-2.5">
              <div className="font-medium text-slate-800">Response templates</div>
              <div className="mt-2 space-y-1">
                {templates.map((template) => (
                  <div key={template.id} className="text-[11px] text-slate-500">{template.name}</div>
                ))}
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
