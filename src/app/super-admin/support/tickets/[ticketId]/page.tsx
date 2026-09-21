"use client";

import React, { useState, use } from "react";
import { useSupport } from "@/features/support-tickets/data/mock-provider";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";
import { 
  ArrowLeft, Clock, AlertTriangle, AlertOctagon, CheckCircle, 
  MoreHorizontal, User, Building2, Tag, Calendar, 
  MessageSquare, FileText, Activity, ChevronDown,
  Send, Paperclip, ExternalLink
} from "lucide-react";

export default function TicketDetailPage({ params }: { params: Promise<{ ticketId: string }> }) {
  const { ticketId } = use(params);
  const { tickets, messages, notes, activities, teams, escalations, updateTicketStatus, updateTicketPriority, assignTicket, addMessage, addNote, resolveTicket, closeTicket, reopenTicket } = useSupport();
  const [activeTab, setActiveTab] = useState<"conversation" | "notes" | "activity">("conversation");
  const [replyBody, setReplyBody] = useState("");
  const [noteBody, setNoteBody] = useState("");
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [showPriorityMenu, setShowPriorityMenu] = useState(false);

  const ticket = tickets.find(t => t.id === ticketId);
  if (!ticket) {
    return (
      <div className="flex flex-col items-center justify-center h-[400px] gap-4">
        <h2 className="text-[16px] font-bold text-[#0F172A]">Ticket Not Found</h2>
        <p className="text-[12px] text-[#64748B]">The ticket {ticketId} does not exist.</p>
        <Link href="/super-admin/support/inbox">
          <Button size="sm" className="h-8 gap-1.5 text-[12px]">
            <ArrowLeft size={12} />
            Back to Inbox
          </Button>
        </Link>
      </div>
    );
  }

  const ticketMessages = messages.filter(m => m.ticketId === ticket.id);
  const ticketNotes = notes.filter(n => n.ticketId === ticket.id);
  const ticketActivities = activities.filter(a => a.ticketId === ticket.id);
  const team = teams.find(t => t.id === ticket.assignedTeamId);
  const escalation = escalations.find(e => e.id === ticket.escalationId);

  const getSlaColor = (state?: string) => {
    switch (state) {
      case "On Track": return "text-[#10B981] bg-[#D1FAE5]";
      case "At Risk": return "text-[#EAB308] bg-[#FEF9C3]";
      case "Breached": return "text-[#EF4444] bg-[#FEE2E2]";
      case "Met": return "text-[#10B981] bg-[#D1FAE5]";
      case "Paused": return "text-[#64748B] bg-[#F1F5F9]";
      default: return "text-[#64748B] bg-[#F1F5F9]";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "New": return "text-[#3B82F6] bg-[#DBEAFE]";
      case "Open": return "text-[#0EA5E9] bg-[#E0F2FE]";
      case "In Progress": return "text-[#EAB308] bg-[#FEF9C3]";
      case "Waiting for Customer": return "text-[#8B5CF6] bg-[#EDE9FE]";
      case "Waiting for Internal Team": return "text-[#F59E0B] bg-[#FEF3C7]";
      case "Resolved": return "text-[#10B981] bg-[#D1FAE5]";
      case "Closed": return "text-[#64748B] bg-[#F1F5F9]";
      default: return "text-[#64748B] bg-[#F1F5F9]";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "Urgent": return "text-[#EF4444] bg-[#FEE2E2]";
      case "High": return "text-[#F97316] bg-[#FFF7ED]";
      case "Normal": return "text-[#3B82F6] bg-[#DBEAFE]";
      case "Low": return "text-[#64748B] bg-[#F1F5F9]";
      default: return "text-[#64748B] bg-[#F1F5F9]";
    }
  };

  const handleSendReply = () => {
    if (!replyBody.trim()) return;
    addMessage({
      ticketId: ticket.id,
      senderType: "Platform Support Staff",
      senderName: "Aditya Raghunath",
      senderId: "STAFF-001",
      direction: "Outbound",
      channel: "Email",
      body: replyBody,
      visibility: "Public",
      deliveryState: "Demo Only",
    });
    setReplyBody("");
  };

  const handleAddNote = () => {
    if (!noteBody.trim()) return;
    addNote({
      ticketId: ticket.id,
      authorName: "Aditya Raghunath",
      authorStaffId: "STAFF-001",
      body: noteBody,
      visibility: "Internal Only",
    });
    setNoteBody("");
  };

  return (
    <div className="flex flex-col gap-4 max-w-[1600px] mx-auto">
      <div className="flex items-center gap-2">
        <Link href="/super-admin/support/inbox" className="text-[12px] text-[#64748B] hover:text-[#0F172A] flex items-center gap-1">
          <ArrowLeft size={12} />
          Inbox
        </Link>
        <span className="text-[12px] text-[#94A3B8]">/</span>
        <span className="text-[12px] font-semibold text-[#0F172A]">{ticket.id}</span>
      </div>

      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <h1 className="text-[16px] font-bold text-[#0F172A]">{ticket.subject}</h1>
          </div>
          <div className="flex items-center gap-2">
            <span className={cn("text-[11px] font-medium px-2 py-0.5 rounded-sm", getStatusColor(ticket.status))}>
              {ticket.status}
            </span>
            <span className={cn("text-[11px] font-medium px-2 py-0.5 rounded-sm", getPriorityColor(ticket.priority))}>
              {ticket.priority}
            </span>
            <span className="text-[11px] text-[#64748B]">{ticket.category}</span>
            <span className="text-[11px] text-[#64748B]">|</span>
            <span className="text-[11px] text-[#64748B]">{ticket.companyId}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Button size="sm" variant="outline" className="h-7 gap-1.5 border-[#E2E8F0] text-[#475569] text-[11px]" onClick={() => setShowStatusMenu(!showStatusMenu)}>
              Status <ChevronDown size={10} />
            </Button>
            {showStatusMenu && (
              <div className="absolute right-0 top-8 z-50 bg-white border border-[#E2E8F0] rounded-sm shadow-lg py-1 w-40">
                {["New", "Open", "In Progress", "Waiting for Customer", "Waiting for Internal Team", "Resolved", "Closed"].map(status => (
                  <button key={status} className="w-full text-left px-3 py-1.5 text-[12px] text-[#475569] hover:bg-[#F1F5F9]" onClick={() => { updateTicketStatus(ticket.id, status as any); setShowStatusMenu(false); }}>
                    {status}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="relative">
            <Button size="sm" variant="outline" className="h-7 gap-1.5 border-[#E2E8F0] text-[#475569] text-[11px]" onClick={() => setShowPriorityMenu(!showPriorityMenu)}>
              Priority <ChevronDown size={10} />
            </Button>
            {showPriorityMenu && (
              <div className="absolute right-0 top-8 z-50 bg-white border border-[#E2E8F0] rounded-sm shadow-lg py-1 w-32">
                {["Low", "Normal", "High", "Urgent"].map(priority => (
                  <button key={priority} className="w-full text-left px-3 py-1.5 text-[12px] text-[#475569] hover:bg-[#F1F5F9]" onClick={() => { updateTicketPriority(ticket.id, priority as any); setShowPriorityMenu(false); }}>
                    {priority}
                  </button>
                ))}
              </div>
            )}
          </div>
          {ticket.status !== "Resolved" && ticket.status !== "Closed" && (
            <>
              <Button size="sm" variant="outline" className="h-7 gap-1.5 border-[#E2E8F0] text-[#10B981] text-[11px]" onClick={() => resolveTicket(ticket.id)}>
                <CheckCircle size={10} />
                Resolve
              </Button>
              <Button size="sm" variant="outline" className="h-7 gap-1.5 border-[#E2E8F0] text-[#EF4444] text-[11px]" onClick={() => closeTicket(ticket.id)}>
                Close
              </Button>
            </>
          )}
          {(ticket.status === "Resolved" || ticket.status === "Closed") && (
            <Button size="sm" variant="outline" className="h-7 gap-1.5 border-[#E2E8F0] text-[#EAB308] text-[11px]" onClick={() => reopenTicket(ticket.id, "Reopening for further investigation")}>
              Reopen
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-[1fr_320px] gap-4">
        <div className="flex flex-col gap-4">
          <Card className="p-4 border-[#E2E8F0] shadow-sm rounded-sm">
            <div className="flex items-center gap-1 border-b border-[#E2E8F0] pb-0 mb-4">
              {[
                { id: "conversation" as const, label: "Conversation", icon: MessageSquare, count: ticketMessages.length },
                { id: "notes" as const, label: "Internal Notes", icon: FileText, count: ticketNotes.length },
                { id: "activity" as const, label: "Activity", icon: Activity, count: ticketActivities.length },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "px-3 py-2 text-[12px] font-medium transition-colors relative flex items-center gap-1.5",
                    activeTab === tab.id ? "text-[#0F172A]" : "text-[#64748B] hover:text-[#0F172A]"
                  )}
                >
                  <tab.icon size={12} />
                  {tab.label}
                  <span className="text-[10px] text-[#94A3B8]">({tab.count})</span>
                  {activeTab === tab.id && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#EB0711]" />}
                </button>
              ))}
            </div>

            {activeTab === "conversation" && (
              <div className="flex flex-col gap-3">
                {ticketMessages.length === 0 ? (
                  <p className="text-[12px] text-[#64748B] text-center py-8">No messages yet.</p>
                ) : (
                  ticketMessages.map(msg => (
                    <div key={msg.id} className={cn(
                      "p-3 rounded-sm border",
                      msg.direction === "Inbound" ? "bg-[#F8FAFC] border-[#E2E8F0]" : "bg-[#EFF6FF] border-[#DBEAFE]"
                    )}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 rounded-full bg-[#E2E8F0] flex items-center justify-center text-[9px] font-semibold text-[#475569]">
                            {msg.senderName.charAt(0)}
                          </div>
                          <span className="text-[12px] font-semibold text-[#0F172A]">{msg.senderName}</span>
                          <span className="text-[10px] text-[#94A3B8]">{msg.senderType}</span>
                        </div>
                        <span className="text-[10px] text-[#94A3B8]">
                          {formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true })}
                        </span>
                      </div>
                      <p className="text-[12px] text-[#475569] whitespace-pre-wrap">{msg.body}</p>
                      {msg.deliveryState && (
                        <div className="mt-2 text-[10px] text-[#94A3B8]">
                          {msg.deliveryState === "Delivered" ? "✓ Delivered" : msg.deliveryState === "Demo Only" ? "Demo Reply — Not Sent" : msg.deliveryState}
                        </div>
                      )}
                    </div>
                  ))
                )}
                <div className="mt-2">
                  <textarea
                    value={replyBody}
                    onChange={(e) => setReplyBody(e.target.value)}
                    placeholder="Type your reply..."
                    className="w-full h-20 p-3 text-[12px] border border-[#E2E8F0] rounded-sm resize-none focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
                  />
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline" className="h-7 gap-1 border-[#E2E8F0] text-[#475569] text-[11px]">
                        <Paperclip size={10} />
                        Attach
                      </Button>
                      <span className="text-[10px] text-[#94A3B8]">Demo Reply — Not Sent</span>
                    </div>
                    <Button size="sm" className="h-7 gap-1 bg-[#EB0711] hover:bg-[#D60811] text-white text-[11px]" onClick={handleSendReply} disabled={!replyBody.trim()}>
                      <Send size={10} />
                      Add Demo Reply
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "notes" && (
              <div className="flex flex-col gap-3">
                {ticketNotes.length === 0 ? (
                  <p className="text-[12px] text-[#64748B] text-center py-8">No internal notes.</p>
                ) : (
                  ticketNotes.map(note => (
                    <div key={note.id} className="p-3 bg-[#FFFBEB] border border-[#FEF3C7] rounded-sm">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-[12px] font-semibold text-[#0F172A]">{note.authorName}</span>
                          <span className="text-[10px] text-[#EAB308] bg-[#FEF9C3] px-1.5 py-0.5 rounded-sm font-medium">Internal Only</span>
                        </div>
                        <span className="text-[10px] text-[#94A3B8]">
                          {formatDistanceToNow(new Date(note.createdAt), { addSuffix: true })}
                        </span>
                      </div>
                      <p className="text-[12px] text-[#475569] whitespace-pre-wrap">{note.body}</p>
                      {note.relatedResourceReferences && note.relatedResourceReferences.length > 0 && (
                        <div className="flex items-center gap-1.5 mt-2">
                          {note.relatedResourceReferences.map(ref => (
                            <span key={ref} className="text-[10px] text-[#2563EB] bg-[#EFF6FF] px-1.5 py-0.5 rounded-sm flex items-center gap-1">
                              <ExternalLink size={8} />
                              {ref}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))
                )}
                <div className="mt-2">
                  <textarea
                    value={noteBody}
                    onChange={(e) => setNoteBody(e.target.value)}
                    placeholder="Add an internal note..."
                    className="w-full h-20 p-3 text-[12px] border border-[#FEF3C7] rounded-sm resize-none focus:outline-none focus:ring-1 focus:ring-[#EAB308] bg-[#FFFBEB]"
                  />
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-[10px] text-[#EAB308]">Internal Only — Not visible to customers</span>
                    <Button size="sm" className="h-7 gap-1 bg-[#EAB308] hover:bg-[#CA8A04] text-white text-[11px]" onClick={handleAddNote} disabled={!noteBody.trim()}>
                      <FileText size={10} />
                      Add Note
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "activity" && (
              <div className="flex flex-col gap-0">
                {ticketActivities.length === 0 ? (
                  <p className="text-[12px] text-[#64748B] text-center py-8">No activity recorded.</p>
                ) : (
                  ticketActivities.map((act, idx) => (
                    <div key={act.id} className="flex items-start gap-3 py-2.5 border-b border-[#F1F5F9] last:border-0">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#3B82F6] mt-1.5"></div>
                      <div className="flex flex-col gap-0.5 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[12px] font-medium text-[#0F172A]">{act.actorName}</span>
                          <span className="text-[11px] text-[#64748B]">{act.actionType}</span>
                        </div>
                        {act.newValue && (
                          <span className="text-[11px] text-[#475569]">→ {act.newValue}</span>
                        )}
                        {act.reason && (
                          <span className="text-[11px] text-[#64748B] italic">&quot;{act.reason}&quot;</span>
                        )}
                      </div>
                      <span className="text-[10px] text-[#94A3B8] whitespace-nowrap">
                        {formatDistanceToNow(new Date(act.timestamp), { addSuffix: true })}
                      </span>
                    </div>
                  ))
                )}
              </div>
            )}
          </Card>
        </div>

        <div className="flex flex-col gap-4">
          <Card className="p-4 border-[#E2E8F0] shadow-sm rounded-sm">
            <h3 className="text-[12px] font-semibold text-[#0F172A] mb-3">Ticket Information</h3>
            <div className="flex flex-col gap-2.5">
              <div className="flex items-center justify-between text-[12px]">
                <span className="text-[#64748B]">Ticket ID</span>
                <span className="font-medium text-[#0F172A]">{ticket.id}</span>
              </div>
              <div className="flex items-center justify-between text-[12px]">
                <span className="text-[#64748B]">Source</span>
                <span className="font-medium text-[#0F172A]">{ticket.sourceChannel}</span>
              </div>
              <div className="flex items-center justify-between text-[12px]">
                <span className="text-[#64748B]">Created</span>
                <span className="font-medium text-[#0F172A]">{formatDistanceToNow(new Date(ticket.createdAt), { addSuffix: true })}</span>
              </div>
              <div className="flex items-center justify-between text-[12px]">
                <span className="text-[#64748B]">Updated</span>
                <span className="font-medium text-[#0F172A]">{formatDistanceToNow(new Date(ticket.updatedAt), { addSuffix: true })}</span>
              </div>
              <div className="flex items-center justify-between text-[12px]">
                <span className="text-[#64748B]">Reopens</span>
                <span className="font-medium text-[#0F172A]">{ticket.reopenCount}</span>
              </div>
            </div>
          </Card>

          <Card className="p-4 border-[#E2E8F0] shadow-sm rounded-sm">
            <h3 className="text-[12px] font-semibold text-[#0F172A] mb-3">Company & Requester</h3>
            <div className="flex flex-col gap-2.5">
              <div className="flex items-center gap-2 text-[12px]">
                <Building2 size={12} className="text-[#64748B]" />
                <span className="font-medium text-[#0F172A]">{ticket.companyId}</span>
              </div>
              <div className="flex items-center gap-2 text-[12px]">
                <User size={12} className="text-[#64748B]" />
                <div className="flex flex-col">
                  <span className="font-medium text-[#0F172A]">{ticket.requester.name}</span>
                  <span className="text-[10px] text-[#64748B]">{ticket.requester.email}</span>
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-4 border-[#E2E8F0] shadow-sm rounded-sm">
            <h3 className="text-[12px] font-semibold text-[#0F172A] mb-3">SLA & Ownership</h3>
            <div className="flex flex-col gap-2.5">
              <div className="flex items-center justify-between text-[12px]">
                <span className="text-[#64748B]">Team</span>
                <span className="font-medium text-[#0F172A]">{team?.name || "Unassigned"}</span>
              </div>
              <div className="flex items-center justify-between text-[12px]">
                <span className="text-[#64748B]">Owner</span>
                <span className="font-medium text-[#0F172A]">{ticket.assignedStaffId || "Unassigned"}</span>
              </div>
              {ticket.slaInstance && (
                <>
                  <div className="flex items-center justify-between text-[12px]">
                    <span className="text-[#64748B]">First Response</span>
                    <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded-sm", getSlaColor(ticket.slaInstance.firstResponseState))}>
                      {ticket.slaInstance.firstResponseState}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[12px]">
                    <span className="text-[#64748B]">Resolution</span>
                    <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded-sm", getSlaColor(ticket.slaInstance.resolutionState))}>
                      {ticket.slaInstance.resolutionState}
                    </span>
                  </div>
                </>
              )}
            </div>
          </Card>

          {escalation && (
            <Card className="p-4 border-[#FEE2E2] shadow-sm rounded-sm bg-[#FEF2F2]">
              <h3 className="text-[12px] font-semibold text-[#EF4444] mb-3 flex items-center gap-1.5">
                <AlertTriangle size={12} />
                Active Escalation
              </h3>
              <div className="flex flex-col gap-2">
                <span className="text-[11px] text-[#475569]">{escalation.reason}</span>
                <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded-sm w-fit", escalation.state === "Active" ? "text-[#EF4444] bg-[#FEE2E2]" : "text-[#64748B] bg-[#F1F5F9]")}>
                  {escalation.state}
                </span>
              </div>
            </Card>
          )}

          {ticket.relatedResourceReferences && ticket.relatedResourceReferences.length > 0 && (
            <Card className="p-4 border-[#E2E8F0] shadow-sm rounded-sm">
              <h3 className="text-[12px] font-semibold text-[#0F172A] mb-3">Related Resources</h3>
              <div className="flex flex-col gap-2">
                {ticket.relatedResourceReferences.map(ref => (
                  <div key={ref} className="flex items-center gap-2 text-[12px] text-[#2563EB] hover:underline cursor-pointer">
                    <ExternalLink size={10} />
                    {ref}
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
