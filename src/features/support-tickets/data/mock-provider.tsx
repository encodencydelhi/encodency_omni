"use client";

import React, { createContext, useContext, useState, useMemo, ReactNode } from "react";
import { 
  SupportTicket, 
  TicketMessage, 
  TicketInternalNote, 
  SupportActivity, 
  SupportTeam,
  TicketSlaInstance,
  TicketEscalation
} from "./types";

interface SupportContextType {
  tickets: SupportTicket[];
  messages: TicketMessage[];
  notes: TicketInternalNote[];
  activities: SupportActivity[];
  teams: SupportTeam[];
  addTicket: (ticket: Omit<SupportTicket, "id" | "createdAt" | "updatedAt" | "reopenCount">) => void;
  updateTicketStatus: (id: string, status: SupportTicket["status"]) => void;
  updateTicketPriority: (id: string, priority: SupportTicket["priority"]) => void;
  assignTicket: (id: string, teamId?: string, staffId?: string) => void;
  addMessage: (message: Omit<TicketMessage, "id" | "createdAt">) => void;
  addNote: (note: Omit<TicketInternalNote, "id" | "createdAt">) => void;
  resolveTicket: (id: string, resolutionDetails?: string) => void;
  reopenTicket: (id: string, reason?: string) => void;
  createEscalation: (escalation: Omit<TicketEscalation, "id" | "createdAt" | "updatedAt">) => void;
  escalations: TicketEscalation[];
}

const SupportContext = createContext<SupportContextType | undefined>(undefined);

const initialTeams: SupportTeam[] = [
  { id: "team-triage", name: "Triage Team", description: "First line support and routing" },
  { id: "team-tech", name: "Technical Support", description: "Advanced technical issues" },
  { id: "team-billing", name: "Billing Support", description: "Invoicing and subscription inquiries" },
];

const mockTickets: SupportTicket[] = [
  {
    id: "TIC-2026-001",
    subject: "Cannot access content studio",
    description: "I keep getting a 403 error when trying to access the content studio for my brand.",
    companyId: "COMP-A1B2",
    requester: {
      id: "USER-123",
      type: "CompanyUser",
      name: "Sarah Jenkins",
      email: "sarah@example.com",
      companyId: "COMP-A1B2",
    },
    sourceChannel: "Support Form",
    category: "Account & Access",
    priority: "High",
    status: "New",
    createdAt: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
    updatedAt: new Date(Date.now() - 3600000).toISOString(),
    reopenCount: 0,
    slaInstance: {
      id: "SLA-001",
      policyId: "POL-STANDARD",
      startTime: new Date(Date.now() - 3600000).toISOString(),
      firstResponseDeadline: new Date(Date.now() + 3600000).toISOString(), // 2 hours target
      firstResponseState: "At Risk",
      resolutionDeadline: new Date(Date.now() + 82800000).toISOString(), // 24 hours target
      resolutionState: "On Track",
    }
  },
  {
    id: "TIC-2026-002",
    subject: "Billing failed for this month",
    description: "My credit card was charged but the invoice says failed.",
    companyId: "COMP-C3D4",
    requester: {
      id: "USER-456",
      type: "CompanyUser",
      name: "Mike Ross",
      email: "mike@example.com",
      companyId: "COMP-C3D4",
    },
    sourceChannel: "Email",
    category: "Billing & Payments",
    priority: "Urgent",
    status: "In Progress",
    assignedTeamId: "team-billing",
    assignedStaffId: "STAFF-001",
    createdAt: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
    updatedAt: new Date(Date.now() - 43200000).toISOString(),
    reopenCount: 0,
    relatedResourceReferences: ["INV-2026-0107"],
    slaInstance: {
      id: "SLA-002",
      policyId: "POL-PREMIUM",
      startTime: new Date(Date.now() - 86400000).toISOString(),
      firstResponseRecordedAt: new Date(Date.now() - 80000000).toISOString(),
      firstResponseState: "Met",
      resolutionDeadline: new Date(Date.now() - 3600000).toISOString(), // Breached!
      resolutionState: "Breached",
    }
  },
  {
    id: "TIC-2026-003",
    subject: "How do I connect Instagram?",
    description: "Looking for a guide to connect our IG business account.",
    companyId: "COMP-A1B2",
    requester: {
      id: "USER-123",
      type: "CompanyUser",
      name: "Sarah Jenkins",
      email: "sarah@example.com",
      companyId: "COMP-A1B2",
    },
    sourceChannel: "In-App Chat",
    category: "Integrations",
    priority: "Low",
    status: "Waiting for Customer",
    assignedTeamId: "team-triage",
    assignedStaffId: "STAFF-002",
    createdAt: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
    updatedAt: new Date(Date.now() - 86400000).toISOString(),
    reopenCount: 0,
    slaInstance: {
      id: "SLA-003",
      policyId: "POL-STANDARD",
      startTime: new Date(Date.now() - 172800000).toISOString(),
      firstResponseRecordedAt: new Date(Date.now() - 170000000).toISOString(),
      firstResponseState: "Met",
      resolutionState: "Paused",
    }
  }
];

const mockMessages: TicketMessage[] = [
  {
    id: "MSG-001",
    ticketId: "TIC-2026-002",
    senderType: "Customer",
    senderName: "Mike Ross",
    direction: "Inbound",
    channel: "Email",
    body: "My credit card was charged but the invoice says failed.",
    visibility: "Public",
    createdAt: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: "MSG-002",
    ticketId: "TIC-2026-002",
    senderType: "Platform Support Staff",
    senderName: "Aditya Raghunath",
    senderId: "STAFF-001",
    direction: "Outbound",
    channel: "Email",
    body: "Hi Mike, I'm looking into this right away. It seems like a sync issue with Stripe.",
    visibility: "Public",
    createdAt: new Date(Date.now() - 80000000).toISOString(),
    deliveryState: "Delivered",
  }
];

const mockNotes: TicketInternalNote[] = [
  {
    id: "NOTE-001",
    ticketId: "TIC-2026-002",
    authorName: "Aditya Raghunath",
    authorStaffId: "STAFF-001",
    body: "Checked Stripe dashboard. Payment succeeded but webhook failed to process. Escalating to engineering.",
    createdAt: new Date(Date.now() - 43200000).toISOString(),
    visibility: "Internal Only",
    relatedResourceReferences: ["WEBHOOK-EVT-998"]
  }
];

const mockActivities: SupportActivity[] = [
  {
    id: "ACT-001",
    ticketId: "TIC-2026-002",
    actorType: "Customer",
    actorName: "Mike Ross",
    actionType: "Ticket Created",
    timestamp: new Date(Date.now() - 86400000).toISOString(),
  }
];

const mockEscalations: TicketEscalation[] = [
  {
    id: "ESC-001",
    ticketId: "TIC-2026-002",
    reason: "Payment succeeded but system shows failed. Requires engineering review.",
    type: "Technical Review",
    currentTeamId: "team-tech",
    priority: "Urgent",
    state: "Active",
    createdAt: new Date(Date.now() - 43200000).toISOString(),
    updatedAt: new Date(Date.now() - 43200000).toISOString(),
  }
];

export function SupportProvider({ children }: { children: ReactNode }) {
  const [tickets, setTickets] = useState<SupportTicket[]>(mockTickets);
  const [messages, setMessages] = useState<TicketMessage[]>(mockMessages);
  const [notes, setNotes] = useState<TicketInternalNote[]>(mockNotes);
  const [activities, setActivities] = useState<SupportActivity[]>(mockActivities);
  const [escalations, setEscalations] = useState<TicketEscalation[]>(mockEscalations);
  const [teams] = useState<SupportTeam[]>(initialTeams);

  const addTicket = (ticketData: Omit<SupportTicket, "id" | "createdAt" | "updatedAt" | "reopenCount">) => {
    const newId = `TIC-2026-${String(tickets.length + 1).padStart(3, "0")}`;
    const now = new Date().toISOString();
    
    const newTicket: SupportTicket = {
      ...ticketData,
      id: newId,
      createdAt: now,
      updatedAt: now,
      reopenCount: 0,
    };
    
    setTickets(prev => [newTicket, ...prev]);
    
    setActivities(prev => [{
      id: `ACT-${Date.now()}`,
      ticketId: newId,
      actorType: "PlatformStaff",
      actorName: "System User", // In a real app, this comes from auth context
      actionType: "Ticket Created",
      timestamp: now,
    }, ...prev]);
  };

  const updateTicketStatus = (id: string, status: SupportTicket["status"]) => {
    const now = new Date().toISOString();
    setTickets(prev => prev.map(t => {
      if (t.id === id) {
        return { ...t, status, updatedAt: now };
      }
      return t;
    }));
    
    setActivities(prev => [{
      id: `ACT-${Date.now()}`,
      ticketId: id,
      actorType: "PlatformStaff",
      actorName: "System User",
      actionType: "Status Changed",
      newValue: status,
      timestamp: now,
    }, ...prev]);
  };

  const updateTicketPriority = (id: string, priority: SupportTicket["priority"]) => {
    const now = new Date().toISOString();
    setTickets(prev => prev.map(t => {
      if (t.id === id) {
        return { ...t, priority, updatedAt: now };
      }
      return t;
    }));
    
    setActivities(prev => [{
      id: `ACT-${Date.now()}`,
      ticketId: id,
      actorType: "PlatformStaff",
      actorName: "System User",
      actionType: "Priority Changed",
      newValue: priority,
      timestamp: now,
    }, ...prev]);
  };

  const assignTicket = (id: string, teamId?: string, staffId?: string) => {
    const now = new Date().toISOString();
    setTickets(prev => prev.map(t => {
      if (t.id === id) {
        return { ...t, assignedTeamId: teamId, assignedStaffId: staffId, updatedAt: now };
      }
      return t;
    }));
    
    setActivities(prev => [{
      id: `ACT-${Date.now()}`,
      ticketId: id,
      actorType: "PlatformStaff",
      actorName: "System User",
      actionType: "Assignment Changed",
      newValue: staffId || teamId || "Unassigned",
      timestamp: now,
    }, ...prev]);
  };

  const addMessage = (messageData: Omit<TicketMessage, "id" | "createdAt">) => {
    const now = new Date().toISOString();
    const newMessage: TicketMessage = {
      ...messageData,
      id: `MSG-${Date.now()}`,
      createdAt: now,
    };
    
    setMessages(prev => [...prev, newMessage]);
    
    setActivities(prev => [{
      id: `ACT-${Date.now()}`,
      ticketId: messageData.ticketId,
      actorType: messageData.senderType === "Customer" ? "Customer" : "PlatformStaff",
      actorName: messageData.senderName,
      actionType: messageData.direction === "Outbound" ? "Response Drafted" : "Customer Message Received",
      timestamp: now,
    }, ...prev]);
  };

  const addNote = (noteData: Omit<TicketInternalNote, "id" | "createdAt">) => {
    const now = new Date().toISOString();
    const newNote: TicketInternalNote = {
      ...noteData,
      id: `NOTE-${Date.now()}`,
      createdAt: now,
    };
    
    setNotes(prev => [...prev, newNote]);
    
    setActivities(prev => [{
      id: `ACT-${Date.now()}`,
      ticketId: noteData.ticketId,
      actorType: "PlatformStaff",
      actorName: noteData.authorName,
      actionType: "Internal Note Added",
      timestamp: now,
    }, ...prev]);
  };

  const resolveTicket = (id: string, resolutionDetails?: string) => {
    const now = new Date().toISOString();
    setTickets(prev => prev.map(t => {
      if (t.id === id) {
        return { ...t, status: "Resolved", resolvedAt: now, updatedAt: now };
      }
      return t;
    }));
    
    setActivities(prev => [{
      id: `ACT-${Date.now()}`,
      ticketId: id,
      actorType: "PlatformStaff",
      actorName: "System User",
      actionType: "Resolution Recorded",
      reason: resolutionDetails,
      timestamp: now,
    }, ...prev]);
  };

  const reopenTicket = (id: string, reason?: string) => {
    const now = new Date().toISOString();
    setTickets(prev => prev.map(t => {
      if (t.id === id) {
        return { 
          ...t, 
          status: "In Progress", 
          updatedAt: now,
          reopenCount: t.reopenCount + 1
        };
      }
      return t;
    }));
    
    setActivities(prev => [{
      id: `ACT-${Date.now()}`,
      ticketId: id,
      actorType: "PlatformStaff",
      actorName: "System User",
      actionType: "Ticket Reopened",
      reason,
      timestamp: now,
    }, ...prev]);
  };

  const createEscalation = (escData: Omit<TicketEscalation, "id" | "createdAt" | "updatedAt">) => {
    const now = new Date().toISOString();
    const newEsc: TicketEscalation = {
      ...escData,
      id: `ESC-${Date.now()}`,
      createdAt: now,
      updatedAt: now,
    };
    
    setEscalations(prev => [...prev, newEsc]);
    
    setTickets(prev => prev.map(t => {
      if (t.id === escData.ticketId) {
        return { ...t, escalationId: newEsc.id, updatedAt: now };
      }
      return t;
    }));
    
    setActivities(prev => [{
      id: `ACT-${Date.now()}`,
      ticketId: escData.ticketId,
      actorType: "PlatformStaff",
      actorName: "System User",
      actionType: "Escalation Opened",
      timestamp: now,
    }, ...prev]);
  };

  const value = useMemo(() => ({
    tickets,
    messages,
    notes,
    activities,
    teams,
    escalations,
    addTicket,
    updateTicketStatus,
    updateTicketPriority,
    assignTicket,
    addMessage,
    addNote,
    resolveTicket,
    reopenTicket,
    createEscalation
  }), [tickets, messages, notes, activities, teams, escalations]);

  return (
    <SupportContext.Provider value={value}>
      {children}
    </SupportContext.Provider>
  );
}

export function useSupport() {
  const context = useContext(SupportContext);
  if (context === undefined) {
    throw new Error("useSupport must be used within a SupportProvider");
  }
  return context;
}
