"use client";

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Download, Plus, Search, SlidersHorizontal, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAdminSupport } from "@/features/admin/support/data/provider";
import type { AdminSupportTicket } from "@/features/admin/support/data/types";

const QUICK_VIEWS = [
  { name: "All Tickets", filter: "all" },
  { name: "My Tickets", filter: "mine" },
  { name: "Unassigned", filter: "unassigned" },
  { name: "New", filter: "new" },
  { name: "Awaiting Support", filter: "support" },
  { name: "Waiting for Customer", filter: "waiting-customer" },
  { name: "SLA At Risk", filter: "sla-risk" },
  { name: "Escalated", filter: "escalated" },
  { name: "Resolved", filter: "resolved" },
  { name: "Closed", filter: "closed" },
];

function sortByStatusPriority(ticket: AdminSupportTicket) {
  const rank = { New: 1, Open: 2, "In Progress": 3, "Waiting for Customer": 4, "Waiting for Internal Team": 5, Resolved: 6, Closed: 7 };
  return rank[ticket.status] ?? 99;
}

// useSearchParams() needs a Suspense boundary to avoid CSR bailout at build time.
export default function AdminSupportInboxPage() {
  return (
    <Suspense fallback={null}>
      <AdminSupportInboxView />
    </Suspense>
  );
}

function AdminSupportInboxView() {
  const router = useRouter();
  const params = useSearchParams();
  const { tickets, addTicket, company } = useAdminSupport();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [createOpen, setCreateOpen] = useState(Boolean(params.get("create")));
  const [draft, setDraft] = useState({ subject: "", clientName: "Veda Studio", category: "General Inquiry", priority: "Normal" as AdminSupportTicket["priority"], source: "Company Admin Support Form" as AdminSupportTicket["source"] });

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return tickets
      .filter((ticket) => {
        if (statusFilter !== "all") {
          if (statusFilter === "unassigned" && !(ticket.assignedStaffId || ticket.assignedTeamId)) return true;
          if (statusFilter === "new" && ticket.status !== "New") return false;
          if (statusFilter === "mine" && ticket.ownerName !== "Rahul Sharma") return false;
          if (statusFilter === "support" && ticket.status !== "Open" && ticket.status !== "In Progress") return false;
          if (statusFilter === "waiting-customer" && ticket.status !== "Waiting for Customer") return false;
          if (statusFilter === "sla-risk" && !(ticket.sla?.state === "At Risk" || ticket.sla?.state === "Breached")) return false;
          if (statusFilter === "escalated" && !ticket.escalation) return false;
          if (statusFilter === "resolved" && ticket.status !== "Resolved") return false;
          if (statusFilter === "closed" && ticket.status !== "Closed") return false;
        }

        if (!normalized) return true;

        return [ticket.id, ticket.subject, ticket.clientName, ticket.requester.name, ticket.requester.email, ticket.category]
          .some((value) => value.toLowerCase().includes(normalized));
      })
      .sort((a, b) => sortByStatusPriority(a) - sortByStatusPriority(b) || new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }, [query, statusFilter, tickets]);

  const exportData = () => {
    const blob = new Blob([JSON.stringify(filtered, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `support-tickets-${company.name.toLowerCase().replace(/\s+/g, "-")}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleCreateTicket = () => {
    const newTicket: AdminSupportTicket = {
      id: `TKT-${Math.floor(Math.random() * 9000 + 1000)}`,
      subject: draft.subject || "New support request",
      description: "New support request created from the admin support intake form.",
      companyId: company.id,
      clientName: draft.clientName,
      requester: { id: "req-new", type: "CompanyUser", name: "Support Requester", email: "support-requester@encodency.com", role: "Admin", companyId: company.id },
      source: draft.source,
      category: draft.category,
      priority: draft.priority,
      status: "New",
      relatedResources: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      reopenCount: 0,
      sla: { id: `sla-${Date.now()}`, policy: "Standard Support SLA", firstResponseTarget: "4h", resolutionTarget: "24h", state: "On Track", deadline: "24h remaining", firstResponseActual: "N/A", resolutionRemaining: "24h" },
    };
    addTicket(newTicket);
    setCreateOpen(false);
    router.push(`/admin/support/tickets/${newTicket.id}`);
  };

  return (
    <div className="mx-auto flex max-w-[1600px] flex-col gap-3">
      <Card className="rounded-sm border border-slate-200/80 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h2 className="text-[15px] font-bold tracking-[-0.02em] text-slate-900">Ticket Inbox</h2>
            <p className="mt-1 text-[12px] text-slate-600">Review customer requests, assign ownership and manage ticket resolution.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={() => setCreateOpen(true)} className="inline-flex items-center gap-1.5 rounded-sm bg-red-600 px-3.5 py-2 text-[12px] font-medium text-white transition hover:bg-red-500 hover:shadow-md">
              <Plus className="size-3.5" />
              Create Ticket
            </button>
            <button onClick={exportData} className="inline-flex items-center gap-1.5 rounded-sm border border-slate-200 bg-white px-3.5 py-2 text-[12px] font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 hover:shadow-sm">
              <Download className="size-3.5" />
              Export
            </button>
            <Button variant="outline" size="sm" className="h-9 rounded-sm border-slate-200 px-3 text-[12px] font-medium text-slate-700">More</Button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-0">
          {QUICK_VIEWS.map((view) => (
            <button
              key={view.name}
              onClick={() => setStatusFilter(view.filter)}
              className={`border-b-2 px-3 py-2 text-[11px] font-medium transition ${statusFilter === view.filter ? "border-b-red-500 text-red-600" : "border-b-transparent text-slate-500 hover:text-slate-800"}`}
            >
              {view.name}
            </button>
          ))}
        </div>

        <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <label className="flex w-full max-w-xl items-center gap-2 rounded-sm border border-slate-200 bg-slate-50/50 px-3 py-2.5 text-[12px] text-slate-500 transition focus-within:border-blue-300 focus-within:bg-white focus-within:shadow-sm">
            <Search className="size-3.5 text-slate-400" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} className="w-full bg-transparent text-slate-800 outline-none placeholder:text-slate-400" placeholder="Search ticket ID, subject, client, requester or related resource..." />
          </label>
          <button className="inline-flex items-center gap-2 rounded-sm border border-slate-200 bg-white px-3.5 py-2 text-[12px] font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 hover:shadow-sm">
            <SlidersHorizontal className="size-3.5" />
            Filters
          </button>
        </div>

        <div className="mt-4 overflow-hidden rounded-sm border border-slate-200/80">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-[12px]">
              <thead className="bg-slate-50/80 text-slate-600">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Ticket</th>
                  <th className="px-4 py-2.5 font-medium">Client</th>
                  <th className="px-4 py-2.5 font-medium">Category</th>
                  <th className="px-4 py-2.5 font-medium">Priority</th>
                  <th className="px-4 py-2.5 font-medium">Status</th>
                  <th className="px-4 py-2.5 font-medium">Assigned To</th>
                  <th className="px-4 py-2.5 font-medium">SLA</th>
                  <th className="px-4 py-2.5 font-medium">Last Activity</th>
                  <th className="px-4 py-2.5 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-[12px] text-slate-500">No tickets match this view.</td>
                  </tr>
                )}
                {filtered.map((ticket) => (
                  <tr key={ticket.id} className="border-t border-slate-100 transition hover:bg-slate-50/80">
                    <td className="px-4 py-3.5">
                      <Link href={`/admin/support/tickets/${ticket.id}`} className="font-semibold text-blue-600 hover:text-blue-700">{ticket.id}</Link>
                      <div className="mt-1 max-w-[220px] truncate text-slate-600">{ticket.subject}</div>
                    </td>
                    <td className="px-4 py-3.5 text-slate-700">{ticket.clientName}</td>
                    <td className="px-4 py-3.5 text-slate-700">{ticket.category}</td>
                    <td className="px-4 py-3.5">
                      <span className={`rounded-sm px-2 py-1 text-[10px] font-medium ${ticket.priority === "Urgent" ? "bg-red-50 text-red-700" : ticket.priority === "High" ? "bg-orange-50 text-orange-700" : ticket.priority === "Normal" ? "bg-slate-100 text-slate-700" : "bg-emerald-50 text-emerald-700"}`}>
                        {ticket.priority}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="rounded-sm bg-slate-100 px-2 py-1 text-[10px] font-medium text-slate-700">{ticket.status}</span>
                    </td>
                    <td className="px-4 py-3.5 text-slate-700">{ticket.ownerName ?? "Unassigned"}</td>
                    <td className="px-4 py-3.5 text-slate-700">{ticket.sla?.state ?? "Unknown"}</td>
                    <td className="px-4 py-3.5 text-slate-700">{new Date(ticket.updatedAt).toLocaleDateString("en-IN")}</td>
                    <td className="px-4 py-3.5">
                      <Link href={`/admin/support/tickets/${ticket.id}`} className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700">Open <ArrowUpRight className="size-3" /></Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Card>

      {createOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-sm border border-slate-200 bg-white p-5 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h3 className="text-[14px] font-bold text-slate-900">Create support ticket</h3>
                <p className="text-[12px] text-slate-600">Scope is limited to {company.name}.</p>
              </div>
              <button onClick={() => setCreateOpen(false)} className="rounded-sm px-2 py-1 text-[12px] text-slate-500 transition hover:bg-slate-100 hover:text-slate-700">Close</button>
            </div>
            <div className="space-y-3">
              <label className="block text-[12px] text-slate-600">
                Subject
                <input value={draft.subject} onChange={(event) => setDraft((current) => ({ ...current, subject: event.target.value }))} className="mt-1 w-full rounded-sm border border-slate-200 bg-slate-50/50 px-3 py-2.5 text-[12px] text-slate-800 outline-none transition focus:border-blue-300 focus:bg-white focus:shadow-sm" placeholder="Describe the issue" />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block text-[12px] text-slate-600">
                  Client
                  <input value={draft.clientName} onChange={(event) => setDraft((current) => ({ ...current, clientName: event.target.value }))} className="mt-1 w-full rounded-sm border border-slate-200 bg-slate-50/50 px-3 py-2.5 text-[12px] text-slate-800 outline-none transition focus:border-blue-300 focus:bg-white focus:shadow-sm" />
                </label>
                <label className="block text-[12px] text-slate-600">
                  Category
                  <select value={draft.category} onChange={(event) => setDraft((current) => ({ ...current, category: event.target.value }))} className="mt-1 w-full rounded-sm border border-slate-200 bg-slate-50/50 px-3 py-2.5 text-[12px] text-slate-800 outline-none transition focus:border-blue-300 focus:bg-white focus:shadow-sm">
                    {['Account & Access', 'Billing & Payments', 'Integrations', 'Publishing & Scheduling', 'General Inquiry'].map((option) => <option key={option} value={option}>{option}</option>)}
                  </select>
                </label>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <label className="block text-[12px] text-slate-600">
                  Priority
                  <select value={draft.priority} onChange={(event) => setDraft((current) => ({ ...current, priority: event.target.value as AdminSupportTicket["priority"] }))} className="mt-1 w-full rounded-sm border border-slate-200 bg-slate-50/50 px-3 py-2.5 text-[12px] text-slate-800 outline-none transition focus:border-blue-300 focus:bg-white focus:shadow-sm">
                    {['Low', 'Normal', 'High', 'Urgent'].map((option) => <option key={option} value={option}>{option}</option>)}
                  </select>
                </label>
                <label className="block text-[12px] text-slate-600">
                  Source
                  <select value={draft.source} onChange={(event) => setDraft((current) => ({ ...current, source: event.target.value as AdminSupportTicket["source"] }))} className="mt-1 w-full rounded-sm border border-slate-200 bg-slate-50/50 px-3 py-2.5 text-[12px] text-slate-800 outline-none transition focus:border-blue-300 focus:bg-white focus:shadow-sm">
                    {['Company Admin Support Form', 'Admin Manual Entry', 'Email', 'WhatsApp', 'In-App Chat', 'API'].map((option) => <option key={option} value={option}>{option}</option>)}
                  </select>
                </label>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button onClick={() => setCreateOpen(false)} className="rounded-sm border border-slate-200 bg-white px-4 py-2 text-[12px] font-medium text-slate-700 transition hover:bg-slate-50">Cancel</button>
                <button onClick={handleCreateTicket} className="rounded-sm bg-red-600 px-4 py-2 text-[12px] font-medium text-white transition hover:bg-red-500 hover:shadow-md">Create Ticket</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
