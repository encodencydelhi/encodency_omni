"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, MessageSquareText, NotebookPen, AlertTriangle, CheckCircle2, Send, Paperclip, User2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAdminSupport } from "@/features/admin/support/data/provider";

export default function AdminSupportDetailPage() {
  const params = useParams<{ ticketId: string }>();
  const { tickets, messages, notes, addMessage, addNote, assignTicket, updateTicketPriority, updateTicketStatus, company } = useAdminSupport();
  const ticket = tickets.find((item) => item.id === params.ticketId);
  const [reply, setReply] = useState("");
  const [noteBody, setNoteBody] = useState("");
  const [assignment, setAssignment] = useState({ teamId: ticket?.assignedTeamId ?? "team-triage", staffId: ticket?.assignedStaffId ?? "staff-rahul" });

  const ticketMessages = useMemo(() => messages.filter((message) => message.ticketId === ticket?.id), [messages, ticket]);
  const ticketNotes = useMemo(() => notes.filter((note) => note.ticketId === ticket?.id), [notes, ticket]);

  if (!ticket) {
    return (
      <div className="mx-auto flex max-w-3xl flex-col gap-4 rounded-sm border border-red-200 bg-white p-8 text-center shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        <h2 className="text-[18px] font-bold text-slate-900">Ticket not found</h2>
        <p className="text-[12px] text-slate-600">This support ticket does not exist in the current company scope.</p>
        <Link href="/admin/support/inbox" className="inline-flex items-center justify-center rounded-sm bg-red-600 px-3 py-2 text-[12px] font-medium text-white">Back to inbox</Link>
      </div>
    );
  }

  const sendReply = () => {
    if (!reply.trim()) return;
    addMessage({
      id: `msg-${Date.now()}`,
      ticketId: ticket.id,
      senderType: "Support Agent",
      senderName: "Rahul Sharma",
      direction: "Outbound",
      channel: "Email",
      body: reply,
      visibility: "Public",
      createdAt: new Date().toISOString(),
      deliveryState: "Demo Only",
    });
    setReply("");
  };

  const saveNote = () => {
    if (!noteBody.trim()) return;
    addNote({
      id: `note-${Date.now()}`,
      ticketId: ticket.id,
      authorName: "Rahul Sharma",
      authorStaffId: "staff-rahul",
      body: noteBody,
      createdAt: new Date().toISOString(),
      visibility: "Internal Only",
    });
    setNoteBody("");
  };

  return (
    <div className="mx-auto flex max-w-[1500px] flex-col gap-2">
      <div className="rounded-sm border border-slate-200 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <Link href="/admin/support/inbox" className="inline-flex items-center gap-1 text-[12px] text-slate-600"><ArrowLeft className="size-3.5" /> Back to Inbox</Link>
            <div>
              <div className="text-[11px] uppercase tracking-[0.08em] text-slate-500">{ticket.id}</div>
              <h2 className="text-[18px] font-bold tracking-[-0.03em] text-slate-900">{ticket.subject}</h2>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-sm bg-red-50 px-2 py-1 text-[10px] font-medium text-red-700">{ticket.priority}</span>
            <span className="rounded-sm bg-slate-100 px-2 py-1 text-[10px] font-medium text-slate-700">{ticket.status}</span>
            <span className="rounded-sm bg-amber-50 px-2 py-1 text-[10px] font-medium text-amber-700">{ticket.sla?.state ?? "Unknown"}</span>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2 text-[12px] text-slate-600">
          <span>Client: {ticket.clientName}</span>
          <span>•</span>
          <span>Requester: {ticket.requester.name}</span>
          <span>•</span>
          <span>Assigned: {ticket.ownerName ?? "Unassigned"}</span>
          <span>•</span>
          <span>Created: {new Date(ticket.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</span>
        </div>
      </div>

      <div className="grid gap-2 xl:grid-cols-[1.8fr_0.9fr]">
        <div className="space-y-2">
          <Card className="rounded-sm border border-slate-200 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-[13px] font-semibold text-slate-900">Customer Conversation</h3>
              <button onClick={() => updateTicketStatus(ticket.id, "In Progress")} className="rounded-sm border border-slate-200 px-2 py-1 text-[11px] font-medium text-slate-700">Mark Active</button>
            </div>
            <div className="space-y-3">
              {ticketMessages.map((message) => (
                <div key={message.id} className={`rounded-sm border p-3 ${message.direction === "Inbound" ? "border-blue-100 bg-blue-50/40" : "border-slate-200 bg-slate-50"}`}>
                  <div className="mb-2 flex items-center justify-between text-[11px] text-slate-500">
                    <span>{message.senderName}</span>
                    <span>{message.channel}</span>
                  </div>
                  <p className="text-[12px] leading-6 text-slate-700">{message.body}</p>
                  <div className="mt-2 text-[10px] text-slate-500">{message.deliveryState === "Demo Only" ? "Demo Reply — Not Sent" : message.deliveryState}</div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="rounded-sm border border-slate-200 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-[13px] font-semibold text-slate-900">Reply Composer</h3>
              <span className="text-[10px] text-slate-500">Demo Reply — Not Sent</span>
            </div>
            <textarea value={reply} onChange={(event) => setReply(event.target.value)} className="min-h-28 w-full rounded-sm border border-slate-200 bg-slate-50 p-3 text-[12px] text-slate-700 outline-none" placeholder="Write a reply..." />
            <div className="mt-3 flex items-center justify-between gap-2">
              <div className="flex gap-2">
                <button className="inline-flex items-center gap-1 rounded-sm border border-slate-200 bg-white px-2 py-1.5 text-[11px] font-medium text-slate-700"><Paperclip className="size-3.5" /> Attach</button>
                <button className="inline-flex items-center gap-1 rounded-sm border border-slate-200 bg-white px-2 py-1.5 text-[11px] font-medium text-slate-700"><ShieldCheck className="size-3.5" /> Response Template</button>
              </div>
              <button onClick={sendReply} className="inline-flex items-center gap-1 rounded-sm bg-red-600 px-3 py-2 text-[12px] font-medium text-white"><Send className="size-3.5" /> Demo Reply</button>
            </div>
          </Card>

          <Card className="rounded-sm border border-slate-200 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-[13px] font-semibold text-slate-900">Internal Notes</h3>
              <span className="text-[10px] text-slate-500">Visible only to company support staff</span>
            </div>
            {ticketNotes.length === 0 ? (
              <div className="rounded-sm border border-dashed border-slate-200 bg-slate-50 p-3 text-[12px] text-slate-500">No internal notes yet.</div>
            ) : (
              <div className="space-y-2">
                {ticketNotes.map((note) => (
                  <div key={note.id} className="rounded-sm border border-slate-200 bg-slate-50 p-3">
                    <div className="mb-2 flex items-center justify-between text-[11px] text-slate-500">
                      <span>{note.authorName}</span>
                      <span>{new Date(note.createdAt).toLocaleDateString("en-IN")}</span>
                    </div>
                    <p className="text-[12px] leading-6 text-slate-700">{note.body}</p>
                  </div>
                ))}
              </div>
            )}
            <textarea value={noteBody} onChange={(event) => setNoteBody(event.target.value)} className="mt-3 min-h-20 w-full rounded-sm border border-slate-200 bg-slate-50 p-3 text-[12px] text-slate-700 outline-none" placeholder="Add internal note..." />
            <div className="mt-3 flex justify-end">
              <button onClick={saveNote} className="rounded-sm bg-slate-900 px-3 py-2 text-[12px] font-medium text-white">Save Internal Note</button>
            </div>
          </Card>
        </div>

        <div className="space-y-2">
          <Card className="rounded-sm border border-slate-200 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
            <h3 className="text-[13px] font-semibold text-slate-900">Customer Context</h3>
            <div className="mt-3 space-y-2 text-[12px] text-slate-600">
              <div className="flex items-center gap-2"><User2 className="size-3.5 text-slate-400" /> {ticket.requester.name}</div>
              <div>{ticket.requester.role}</div>
              <div>{ticket.requester.email}</div>
              <div>{company.name}</div>
              <div>Client: {ticket.clientName}</div>
            </div>
          </Card>
          <Card className="rounded-sm border border-slate-200 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
            <h3 className="text-[13px] font-semibold text-slate-900">Ticket Information</h3>
            <div className="mt-3 space-y-2 text-[12px] text-slate-600">
              <div>Category: {ticket.category}</div>
              <div>Source: {ticket.source}</div>
              <div>Priority: {ticket.priority}</div>
              <div>Status: {ticket.status}</div>
              <div>Team: {ticket.assignedTeamId ?? "Unassigned"}</div>
              <div>Owner: {ticket.ownerName ?? "Unassigned"}</div>
            </div>
          </Card>
          <Card className="rounded-sm border border-slate-200 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
            <h3 className="text-[13px] font-semibold text-slate-900">SLA</h3>
            <div className="mt-3 space-y-2 text-[12px] text-slate-600">
              <div>State: {ticket.sla?.state ?? "Unknown"}</div>
              <div>Response Target: {ticket.sla?.firstResponseTarget ?? "N/A"}</div>
              <div>Resolution Target: {ticket.sla?.resolutionTarget ?? "N/A"}</div>
              <div>Deadline: {ticket.sla?.deadline ?? "N/A"}</div>
            </div>
          </Card>
          <Card className="rounded-sm border border-slate-200 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
            <h3 className="text-[13px] font-semibold text-slate-900">Actions</h3>
            <div className="mt-3 flex flex-wrap gap-2">
              <button onClick={() => assignTicket(ticket.id, assignment.teamId, assignment.staffId, "Rahul Sharma")} className="rounded-sm border border-slate-200 bg-white px-2 py-1.5 text-[11px] font-medium text-slate-700">Assign</button>
              <button onClick={() => updateTicketPriority(ticket.id, "Urgent")} className="rounded-sm border border-slate-200 bg-white px-2 py-1.5 text-[11px] font-medium text-slate-700">Priority</button>
              <button onClick={() => updateTicketStatus(ticket.id, "Waiting for Customer")} className="rounded-sm border border-slate-200 bg-white px-2 py-1.5 text-[11px] font-medium text-slate-700">Status</button>
              <button onClick={() => updateTicketStatus(ticket.id, "Resolved")} className="rounded-sm bg-emerald-600 px-2 py-1.5 text-[11px] font-medium text-white">Resolve</button>
            </div>
            <div className="mt-3 space-y-2 text-[12px] text-slate-600">
              <label className="block">
                Team
                <select value={assignment.teamId} onChange={(event) => setAssignment((current) => ({ ...current, teamId: event.target.value }))} className="mt-1 w-full rounded-sm border border-slate-200 bg-slate-50 px-2 py-2 text-[12px] text-slate-700 outline-none">
                  <option value="team-triage">Triage Team</option>
                  <option value="team-technical">Technical Support</option>
                  <option value="team-billing">Billing Support</option>
                </select>
              </label>
              <label className="block">
                Assigned staff
                <select value={assignment.staffId} onChange={(event) => setAssignment((current) => ({ ...current, staffId: event.target.value }))} className="mt-1 w-full rounded-sm border border-slate-200 bg-slate-50 px-2 py-2 text-[12px] text-slate-700 outline-none">
                  <option value="staff-rahul">Rahul Sharma</option>
                  <option value="staff-priya">Priya Sen</option>
                  <option value="staff-kavya">Kavya Nair</option>
                </select>
              </label>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
