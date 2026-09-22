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

export const ADMIN_SUPPORT_COMPANY: AdminSupportCompany = {
  id: "cmp-encodency",
  name: "EnCodency Technologies Pvt. Ltd.",
  timezone: "Asia/Kolkata",
};

const teams: AdminSupportTeam[] = [
  { id: "team-triage", name: "Triage Team", description: "Initial request triage and routing" },
  { id: "team-technical", name: "Technical Support", description: "Integration and product troubleshooting" },
  { id: "team-billing", name: "Billing Support", description: "Invoices and subscription inquiries" },
];

const tickets: AdminSupportTicket[] = [
  {
    id: "TKT-1048",
    subject: "Instagram publishing failed after the latest sync",
    description: "Posts are failing to publish for our Instagram channel and the error shows a connection timeout.",
    companyId: ADMIN_SUPPORT_COMPANY.id,
    clientName: "Veda Studio",
    requester: { id: "req-101", type: "CompanyUser", name: "Neha Kapoor", email: "neha@vedastudio.in", role: "Marketing Lead", companyId: ADMIN_SUPPORT_COMPANY.id },
    source: "Company Admin Support Form",
    category: "Integrations",
    subcategory: "Instagram",
    priority: "High",
    status: "In Progress",
    assignedTeamId: "team-technical",
    assignedStaffId: "staff-rahul",
    ownerName: "Rahul Sharma",
    sla: { id: "sla-1048", policy: "Priority Company SLA", firstResponseTarget: "2h", resolutionTarget: "8h", state: "At Risk", deadline: "2h remaining", firstResponseActual: "1h 10m", resolutionRemaining: "5h 40m" },
    escalation: { id: "esc-1048", ticketId: "TKT-1048", reason: "Repeated connection failures", currentOwner: "Rahul Sharma", team: "Technical Support", owner: "Aditi Nair", priority: "High", state: "Active", createdAt: "2026-09-22T09:45:00.000Z", handoverNote: "Escalated for API retry review." },
    relatedResources: [{ id: "int-ig", kind: "Integration", label: "Instagram Business Connection", href: "/admin/integrations" }],
    createdAt: "2026-09-22T08:10:00.000Z",
    updatedAt: "2026-09-22T10:05:00.000Z",
    reopenCount: 0,
  },
  {
    id: "TKT-1049",
    subject: "Billing discrepancy for annual renewal",
    description: "We were charged twice for the same annual plan and the invoice does not match the approved renewal quote.",
    companyId: ADMIN_SUPPORT_COMPANY.id,
    clientName: "Maple Labs",
    requester: { id: "req-102", type: "CompanyUser", name: "Aman Nair", email: "aman@maplelabs.in", role: "Finance Manager", companyId: ADMIN_SUPPORT_COMPANY.id },
    source: "Email",
    category: "Billing & Payments",
    priority: "Urgent",
    status: "Waiting for Customer",
    assignedTeamId: "team-billing",
    assignedStaffId: "staff-priya",
    ownerName: "Priya Sen",
    sla: { id: "sla-1049", policy: "Priority Company SLA", firstResponseTarget: "1h", resolutionTarget: "6h", state: "Breached", deadline: "Breached 1h ago", firstResponseActual: "48m", resolutionRemaining: "-1h 10m" },
    relatedResources: [{ id: "inv-2184", kind: "Invoice", label: "Invoice INV-2184", href: "/admin/billing" }],
    createdAt: "2026-09-21T14:25:00.000Z",
    updatedAt: "2026-09-22T07:15:00.000Z",
    reopenCount: 0,
  },
  {
    id: "TKT-1050",
    subject: "Campaign publishing queue is stuck",
    description: "Several launch posts remain queued and do not move to publishing despite the schedule being valid.",
    companyId: ADMIN_SUPPORT_COMPANY.id,
    clientName: "Northwind Media",
    requester: { id: "req-103", type: "CompanyUser", name: "Jaya Menon", email: "jaya@northwindmedia.in", role: "Campaign Manager", companyId: ADMIN_SUPPORT_COMPANY.id },
    source: "Admin Manual Entry",
    category: "Publishing & Scheduling",
    priority: "Normal",
    status: "New",
    assignedTeamId: undefined,
    assignedStaffId: undefined,
    ownerName: undefined,
    sla: { id: "sla-1050", policy: "Standard Support SLA", firstResponseTarget: "4h", resolutionTarget: "24h", state: "On Track", deadline: "3h 25m remaining", firstResponseActual: "N/A", resolutionRemaining: "21h 40m" },
    relatedResources: [{ id: "job-4821", kind: "Publishing Job", label: "Job #4821", href: "/admin/campaigns" }],
    createdAt: "2026-09-22T06:00:00.000Z",
    updatedAt: "2026-09-22T06:00:00.000Z",
    reopenCount: 0,
  },
  {
    id: "TKT-1051",
    subject: "Need help with media asset approval workflow",
    description: "Our internal review workflow is not showing the correct approval states after a recent brand update.",
    companyId: ADMIN_SUPPORT_COMPANY.id,
    clientName: "Harbor Digital",
    requester: { id: "req-104", type: "CompanyUser", name: "Rohan Iyer", email: "rohan@harbordigital.in", role: "Brand Lead", companyId: ADMIN_SUPPORT_COMPANY.id },
    source: "In-App Chat",
    category: "Content Studio",
    priority: "Low",
    status: "Resolved",
    assignedTeamId: "team-triage",
    assignedStaffId: "staff-kavya",
    ownerName: "Kavya Nair",
    sla: { id: "sla-1051", policy: "Standard Support SLA", firstResponseTarget: "4h", resolutionTarget: "24h", state: "On Track", deadline: "Closed", firstResponseActual: "1h 35m", resolutionRemaining: "Resolved" },
    relatedResources: [],
    createdAt: "2026-09-18T10:30:00.000Z",
    updatedAt: "2026-09-19T11:15:00.000Z",
    reopenCount: 1,
  },
  {
    id: "TKT-1052",
    subject: "Google Business listing not syncing",
    description: "The listing sync has stalled and customer reviews are not returning to the dashboard.",
    companyId: ADMIN_SUPPORT_COMPANY.id,
    clientName: "Grove & Co.",
    requester: { id: "req-105", type: "CompanyUser", name: "Ishita Rao", email: "ishita@groveco.in", role: "Local SEO Manager", companyId: ADMIN_SUPPORT_COMPANY.id },
    source: "WhatsApp",
    category: "Integrations",
    priority: "High",
    status: "Waiting for Internal Team",
    assignedTeamId: "team-technical",
    assignedStaffId: "staff-rahul",
    ownerName: "Rahul Sharma",
    sla: { id: "sla-1052", policy: "Priority Company SLA", firstResponseTarget: "2h", resolutionTarget: "8h", state: "Breached", deadline: "Breached 2h ago", firstResponseActual: "3h 10m", resolutionRemaining: "-2h 15m" },
    relatedResources: [{ id: "int-gb", kind: "Integration", label: "Google Business Profile", href: "/admin/google-business" }],
    createdAt: "2026-09-21T18:10:00.000Z",
    updatedAt: "2026-09-22T08:00:00.000Z",
    reopenCount: 0,
  },
  {
    id: "TKT-1053",
    subject: "AI usage warning triggered without active campaign",
    description: "The usage panel shows AI credits depleted even though no content generation jobs were launched.",
    companyId: ADMIN_SUPPORT_COMPANY.id,
    clientName: "Skyline Digital",
    requester: { id: "req-106", type: "CompanyUser", name: "Deepak Jain", email: "deepak@skylinedigital.in", role: "Operations Manager", companyId: ADMIN_SUPPORT_COMPANY.id },
    source: "Company Admin Support Form",
    category: "AI & Usage",
    priority: "Normal",
    status: "Open",
    assignedTeamId: "team-triage",
    assignedStaffId: "staff-kavya",
    ownerName: "Kavya Nair",
    sla: { id: "sla-1053", policy: "Standard Support SLA", firstResponseTarget: "4h", resolutionTarget: "24h", state: "On Track", deadline: "9h remaining", firstResponseActual: "1h 30m", resolutionRemaining: "18h 40m" },
    relatedResources: [],
    createdAt: "2026-09-21T12:00:00.000Z",
    updatedAt: "2026-09-22T09:00:00.000Z",
    reopenCount: 0,
  },
  {
    id: "TKT-1054",
    subject: "Need seating and permissions cleanup for new admin team",
    description: "We are onboarding two new marketing admins and need their access aligned to the existing workspace roles.",
    companyId: ADMIN_SUPPORT_COMPANY.id,
    clientName: "Everyday Cart",
    requester: { id: "req-107", type: "CompanyUser", name: "Sonia Iqbal", email: "sonia@everydaycart.in", role: "Admin", companyId: ADMIN_SUPPORT_COMPANY.id },
    source: "Admin Manual Entry",
    category: "Account & Access",
    priority: "Normal",
    status: "Closed",
    assignedTeamId: "team-triage",
    assignedStaffId: "staff-rahul",
    ownerName: "Rahul Sharma",
    sla: { id: "sla-1054", policy: "Standard Support SLA", firstResponseTarget: "4h", resolutionTarget: "24h", state: "On Track", deadline: "Closed", firstResponseActual: "55m", resolutionRemaining: "Resolved" },
    relatedResources: [],
    createdAt: "2026-09-15T09:10:00.000Z",
    updatedAt: "2026-09-16T11:40:00.000Z",
    reopenCount: 0,
  },
];

const messages: AdminSupportMessage[] = [
  { id: "msg-1", ticketId: "TKT-1048", senderType: "Customer", senderName: "Neha Kapoor", direction: "Inbound", channel: "Support Form", body: "Posts are failing to publish after the sync.", createdAt: "2026-09-22T08:15:00.000Z", visibility: "Public", deliveryState: "Demo Only" },
  { id: "msg-2", ticketId: "TKT-1048", senderType: "Support Agent", senderName: "Rahul Sharma", direction: "Outbound", channel: "Email", body: "We are reviewing the connection error and checking the latest sync logs.", createdAt: "2026-09-22T09:10:00.000Z", visibility: "Public", deliveryState: "Demo Only" },
  { id: "msg-3", ticketId: "TKT-1049", senderType: "Customer", senderName: "Aman Nair", direction: "Inbound", channel: "Email", body: "I was charged twice and need the invoice corrected.", createdAt: "2026-09-21T14:30:00.000Z", visibility: "Public", deliveryState: "Demo Only" },
  { id: "msg-4", ticketId: "TKT-1050", senderType: "Customer", senderName: "Jaya Menon", direction: "Inbound", channel: "Admin Manual Entry", body: "Several scheduled posts are still queued.", createdAt: "2026-09-22T06:10:00.000Z", visibility: "Public", deliveryState: "Demo Only" },
];

const notes: AdminSupportNote[] = [
  { id: "note-1", ticketId: "TKT-1048", authorName: "Rahul Sharma", authorStaffId: "staff-rahul", body: "Confirmed the Instagram app token refresh is failing for this workspace. We need the app reconnect flow reviewed.", createdAt: "2026-09-22T09:20:00.000Z", visibility: "Internal Only" },
  { id: "note-2", ticketId: "TKT-1049", authorName: "Priya Sen", authorStaffId: "staff-priya", body: "Invoice mismatch reviewed. Finance requested a duplicate payment audit after the renewal approval.", createdAt: "2026-09-22T06:30:00.000Z", visibility: "Internal Only" },
];

const activity: AdminSupportActivity[] = [
  { id: "act-1", ticketId: "TKT-1048", actorType: "Support Agent", actorName: "Rahul Sharma", actionType: "Ticket Created", timestamp: "2026-09-22T08:10:00.000Z", newValue: "New" },
  { id: "act-2", ticketId: "TKT-1048", actorType: "Support Agent", actorName: "Rahul Sharma", actionType: "Status Changed", timestamp: "2026-09-22T09:05:00.000Z", previousValue: "New", newValue: "In Progress" },
  { id: "act-3", ticketId: "TKT-1049", actorType: "Support Agent", actorName: "Priya Sen", actionType: "Priority Updated", timestamp: "2026-09-22T06:20:00.000Z", previousValue: "High", newValue: "Urgent" },
  { id: "act-4", ticketId: "TKT-1050", actorType: "System", actorName: "System", actionType: "Ticket Created", timestamp: "2026-09-22T06:00:00.000Z", newValue: "New" },
  { id: "act-5", ticketId: "TKT-1052", actorType: "Support Agent", actorName: "Rahul Sharma", actionType: "Escalation Created", timestamp: "2026-09-22T08:20:00.000Z", newValue: "Active" },
  { id: "act-6", ticketId: "TKT-1051", actorType: "Support Agent", actorName: "Kavya Nair", actionType: "Resolution Added", timestamp: "2026-09-19T11:15:00.000Z", newValue: "Resolved" },
];

const escalations: AdminSupportEscalation[] = [
  { id: "esc-1048", ticketId: "TKT-1048", reason: "Repeated connection failures", currentOwner: "Rahul Sharma", team: "Technical Support", owner: "Aditi Nair", priority: "High", state: "Active", createdAt: "2026-09-22T09:45:00.000Z", handoverNote: "Continue API retry investigation and confirm token refresh." },
];

const templates: AdminSupportTemplate[] = [
  { id: "tpl-1", name: "Acknowledgement", category: "General", subject: "We’ve received your request", body: "Thank you for contacting EnCodency support. We’ve received your request and will review it shortly.", active: true },
  { id: "tpl-2", name: "Integration Recovery", category: "Integrations", subject: "Connection review in progress", body: "We’re checking the connection details for {{company_name}} and will share the next steps soon.", active: true },
];

const savedViews: AdminSupportSavedView[] = [
  { id: "view-1", name: "My Open Tickets", filter: "assignedTo=me", visibility: "Private" },
  { id: "view-2", name: "SLA Risk Watch", filter: "status=all&sla=at-risk", visibility: "Company Support Team" },
];

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

export function buildAdminSupportSnapshot(): AdminSupportSnapshot {
  return {
    company: ADMIN_SUPPORT_COMPANY,
    tickets,
    messages,
    notes,
    activity,
    teams,
    escalations,
    templates,
    savedViews,
  };
}

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
