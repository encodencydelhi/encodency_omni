"use client";

import { useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { useAdminSupport } from "@/features/admin/support/data/provider";

const DEFAULT_QUEUES = [
  { id: "all", name: "All Tickets", count: 7 },
  { id: "my", name: "My Tickets", count: 4 },
  { id: "unassigned", name: "Unassigned", count: 1 },
  { id: "waiting-customer", name: "Waiting Customer", count: 2 },
  { id: "sla-risk", name: "SLA At Risk", count: 3 },
  { id: "escalated", name: "Escalated", count: 1 },
  { id: "resolved", name: "Resolved", count: 2 },
  { id: "closed", name: "Closed", count: 1 },
];

export default function AdminSupportQueuesPage() {
  const { savedViews } = useAdminSupport();
  const [viewName, setViewName] = useState("");
  const [views, setViews] = useState(savedViews);

  const saveView = () => {
    if (!viewName.trim()) return;
    setViews((current) => [{ id: `view-${Date.now()}`, name: viewName, filter: "status=all", visibility: "Private" }, ...current]);
    setViewName("");
  };

  return (
    <div className="mx-auto flex max-w-[1400px] flex-col gap-2">
      <div className="grid gap-2 lg:grid-cols-[1.3fr_1fr]">
        <Card className="rounded-sm border border-slate-200 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-[13px] font-semibold text-slate-900">Default queues</h2>
            <Link href="/admin/support/inbox" className="text-[11px] font-medium text-blue-600">Open inbox</Link>
          </div>
          <div className="space-y-2">
            {DEFAULT_QUEUES.map((queue) => (
              <div key={queue.id} className="flex items-center justify-between rounded-sm border border-slate-200 bg-slate-50 p-2.5">
                <div className="text-[12px] font-medium text-slate-700">{queue.name}</div>
                <div className="flex items-center gap-2 text-[11px] text-slate-500">
                  <span>{queue.count}</span>
                  <Link href="/admin/support/inbox" className="text-blue-600">Open</Link>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="rounded-sm border border-slate-200 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
          <h2 className="mb-3 text-[13px] font-semibold text-slate-900">Saved views</h2>
          <div className="space-y-2">
            {views.length === 0 ? (
              <div className="rounded-sm border border-dashed border-slate-200 bg-slate-50 p-3 text-[12px] text-slate-500">No saved views yet.</div>
            ) : (
              views.map((view) => (
                <div key={view.id} className="flex items-center justify-between rounded-sm border border-slate-200 bg-slate-50 p-2.5">
                  <div>
                    <div className="text-[12px] font-medium text-slate-700">{view.name}</div>
                    <div className="text-[11px] text-slate-500">{view.visibility}</div>
                  </div>
                  <Link href="/admin/support/inbox" className="text-[11px] font-medium text-blue-600">Open</Link>
                </div>
              ))
            )}
          </div>
          <div className="mt-4 space-y-2">
            <label className="block text-[12px] text-slate-600">
              View name
              <input value={viewName} onChange={(event) => setViewName(event.target.value)} className="mt-1 w-full rounded-sm border border-slate-200 bg-slate-50 px-3 py-2 text-[12px] text-slate-700 outline-none" placeholder="New saved view" />
            </label>
            <button onClick={saveView} disabled={!viewName.trim()} className="rounded-sm bg-red-600 px-3 py-2 text-[12px] font-medium text-white disabled:cursor-not-allowed disabled:opacity-50">Save View</button>
          </div>
        </Card>
      </div>
    </div>
  );
}
