"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import type {
  AdminSupportActivity,
  AdminSupportCompany,
  AdminSupportEscalation,
  AdminSupportMessage,
  AdminSupportNote,
  AdminSupportSavedView,
  AdminSupportSnapshot,
  AdminSupportTeam,
  AdminSupportTemplate,
  AdminSupportTicket,
} from "./types";
import { buildAdminSupportSnapshot } from "./snapshot";

export {
  ADMIN_SUPPORT_COMPANY,
  buildAdminSupportSnapshot,
  teams,
  tickets,
  messages,
  notes,
  activity,
  escalations,
  templates,
  savedViews,
} from "./snapshot";

interface SupportContextValue {
  company: AdminSupportCompany;
  tickets: AdminSupportTicket[];
  messages: AdminSupportMessage[];
  notes: AdminSupportNote[];
  activity: AdminSupportActivity[];
  teams: AdminSupportTeam[];
  escalations: AdminSupportEscalation[];
  templates: AdminSupportTemplate[];
  savedViews: AdminSupportSavedView[];
  addTicket: (ticket: AdminSupportTicket) => void;
  updateTicketStatus: (id: string, status: AdminSupportTicket["status"]) => void;
  updateTicketPriority: (id: string, priority: AdminSupportTicket["priority"]) => void;
  assignTicket: (id: string, teamId: string | undefined, staffId: string | undefined, ownerName?: string) => void;
  addNote: (note: AdminSupportNote) => void;
  addMessage: (message: AdminSupportMessage) => void;
  createEscalation: (escalation: AdminSupportEscalation) => void;
  addActivity: (activity: AdminSupportActivity) => void;
}

const SupportContext = createContext<SupportContextValue | undefined>(undefined);

export function AdminSupportProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AdminSupportSnapshot>(() => buildAdminSupportSnapshot());

  const value = useMemo<SupportContextValue>(() => ({
    company: state.company,
    tickets: state.tickets,
    messages: state.messages,
    notes: state.notes,
    activity: state.activity,
    teams: state.teams,
    escalations: state.escalations,
    templates: state.templates,
    savedViews: state.savedViews,
    addTicket: (ticket) => {
      setState((current) => ({ ...current, tickets: [ticket, ...current.tickets] }));
    },
    updateTicketStatus: (id, status) => {
      setState((current) => ({
        ...current,
        tickets: current.tickets.map((ticket) => ticket.id === id ? { ...ticket, status, updatedAt: new Date().toISOString() } : ticket),
      }));
    },
    updateTicketPriority: (id, priority) => {
      setState((current) => ({
        ...current,
        tickets: current.tickets.map((ticket) => ticket.id === id ? { ...ticket, priority, updatedAt: new Date().toISOString() } : ticket),
      }));
    },
    assignTicket: (id, teamId, staffId, ownerName) => {
      setState((current) => ({
        ...current,
        tickets: current.tickets.map((ticket) => ticket.id === id ? { ...ticket, assignedTeamId: teamId, assignedStaffId: staffId, ownerName: ownerName ?? ticket.ownerName, updatedAt: new Date().toISOString() } : ticket),
      }));
    },
    addNote: (note) => {
      setState((current) => ({ ...current, notes: [note, ...current.notes] }));
    },
    addMessage: (message) => {
      setState((current) => ({ ...current, messages: [message, ...current.messages] }));
    },
    createEscalation: (escalation) => {
      setState((current) => ({ ...current, escalations: [escalation, ...current.escalations] }));
    },
    addActivity: (activityItem) => {
      setState((current) => ({ ...current, activity: [activityItem, ...current.activity] }));
    },
  }), [state]);

  return <SupportContext.Provider value={value}>{children}</SupportContext.Provider>;
}

export function useAdminSupport() {
  const context = useContext(SupportContext);
  if (!context) {
    throw new Error("useAdminSupport must be used within AdminSupportProvider");
  }

  return context;
}
