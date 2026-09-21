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
  closeTicket: (id: string) => void;
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
    description: "I keep getting a 403 error when trying to access the content studio for my brand. This started happening after the latest platform update.",
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
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    updatedAt: new Date(Date.now() - 3600000).toISOString(),
    reopenCount: 0,
    slaInstance: {
      id: "SLA-001",
      policyId: "POL-STANDARD",
      startTime: new Date(Date.now() - 3600000).toISOString(),
      firstResponseDeadline: new Date(Date.now() + 3600000).toISOString(),
      firstResponseState: "At Risk",
      resolutionDeadline: new Date(Date.now() + 82800000).toISOString(),
      resolutionState: "On Track",
    }
  },
  {
    id: "TIC-2026-002",
    subject: "Billing failed for this month",
    description: "My credit card was charged but the invoice says failed. I need this resolved urgently as it affects my subscription.",
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
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 43200000).toISOString(),
    reopenCount: 0,
    relatedResourceReferences: ["INV-2026-0107"],
    slaInstance: {
      id: "SLA-002",
      policyId: "POL-PREMIUM",
      startTime: new Date(Date.now() - 86400000).toISOString(),
      firstResponseRecordedAt: new Date(Date.now() - 80000000).toISOString(),
      firstResponseState: "Met",
      resolutionDeadline: new Date(Date.now() - 3600000).toISOString(),
      resolutionState: "Breached",
    }
  },
  {
    id: "TIC-2026-003",
    subject: "How do I connect Instagram?",
    description: "Looking for a guide to connect our IG business account. We have been trying for 2 days now.",
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
    createdAt: new Date(Date.now() - 172800000).toISOString(),
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
  },
  {
    id: "TIC-2026-004",
    subject: "Campaign scheduling not working",
    description: "When I try to schedule a post for next week, the calendar shows an error and the post does not get saved. This is blocking our content calendar.",
    companyId: "COMP-E5F6",
    requester: {
      id: "USER-789",
      type: "CompanyUser",
      name: "Priya Sharma",
      email: "priya@example.com",
      companyId: "COMP-E5F6",
    },
    sourceChannel: "Support Form",
    category: "Publishing & Scheduling",
    priority: "High",
    status: "Open",
    assignedTeamId: "team-tech",
    assignedStaffId: "STAFF-003",
    createdAt: new Date(Date.now() - 259200000).toISOString(),
    updatedAt: new Date(Date.now() - 172800000).toISOString(),
    reopenCount: 1,
    relatedResourceReferences: ["JOB-PUB-445"],
    slaInstance: {
      id: "SLA-004",
      policyId: "POL-STANDARD",
      startTime: new Date(Date.now() - 259200000).toISOString(),
      firstResponseRecordedAt: new Date(Date.now() - 250000000).toISOString(),
      firstResponseState: "Met",
      resolutionDeadline: new Date(Date.now() + 43200000).toISOString(),
      resolutionState: "On Track",
    }
  },
  {
    id: "TIC-2026-005",
    subject: "SEO audit report showing wrong data",
    description: "The SEO audit for our website shows a score of 45 but when I check manually, everything looks fine. Need someone to look into this discrepancy.",
    companyId: "COMP-G7H8",
    requester: {
      id: "USER-012",
      type: "CompanyUser",
      name: "Rahul Verma",
      email: "rahul@example.com",
      companyId: "COMP-G7H8",
    },
    sourceChannel: "Email",
    category: "SEO & Website",
    priority: "Normal",
    status: "In Progress",
    assignedTeamId: "team-tech",
    assignedStaffId: "STAFF-001",
    createdAt: new Date(Date.now() - 345600000).toISOString(),
    updatedAt: new Date(Date.now() - 259200000).toISOString(),
    reopenCount: 0,
    slaInstance: {
      id: "SLA-005",
      policyId: "POL-STANDARD",
      startTime: new Date(Date.now() - 345600000).toISOString(),
      firstResponseRecordedAt: new Date(Date.now() - 340000000).toISOString(),
      firstResponseState: "Met",
      resolutionDeadline: new Date(Date.now() + 172800000).toISOString(),
      resolutionState: "On Track",
    }
  },
  {
    id: "TIC-2026-006",
    subject: "Upgrade subscription plan",
    description: "I want to upgrade from Starter to Professional plan. Please help me with the process and any pricing details.",
    companyId: "COMP-I9J0",
    requester: {
      id: "USER-345",
      type: "CompanyUser",
      name: "Amit Patel",
      email: "amit@example.com",
      companyId: "COMP-I9J0",
    },
    sourceChannel: "Support Form",
    category: "Subscription & Plans",
    priority: "Normal",
    status: "Resolved",
    assignedTeamId: "team-billing",
    assignedStaffId: "STAFF-002",
    createdAt: new Date(Date.now() - 604800000).toISOString(),
    updatedAt: new Date(Date.now() - 518400000).toISOString(),
    resolvedAt: new Date(Date.now() - 518400000).toISOString(),
    reopenCount: 0,
    slaInstance: {
      id: "SLA-006",
      policyId: "POL-STANDARD",
      startTime: new Date(Date.now() - 604800000).toISOString(),
      firstResponseRecordedAt: new Date(Date.now() - 600000000).toISOString(),
      firstResponseState: "Met",
      resolutionRecordedAt: new Date(Date.now() - 518400000).toISOString(),
      resolutionState: "Met",
    }
  },
  {
    id: "TIC-2026-007",
    subject: "WhatsApp integration disconnected",
    description: "Our WhatsApp Business API integration disconnected suddenly. All our automated messages have stopped working. This is critical for our business.",
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
    priority: "Urgent",
    status: "In Progress",
    assignedTeamId: "team-tech",
    assignedStaffId: "STAFF-003",
    createdAt: new Date(Date.now() - 14400000).toISOString(),
    updatedAt: new Date(Date.now() - 7200000).toISOString(),
    reopenCount: 0,
    escalationId: "ESC-002",
    slaInstance: {
      id: "SLA-007",
      policyId: "POL-PREMIUM",
      startTime: new Date(Date.now() - 14400000).toISOString(),
      firstResponseRecordedAt: new Date(Date.now() - 10000000).toISOString(),
      firstResponseState: "Met",
      resolutionDeadline: new Date(Date.now() + 28800000).toISOString(),
      resolutionState: "At Risk",
    }
  },
  {
    id: "TIC-2026-008",
    subject: "Need help with content creation",
    description: "I am new to the platform and need guidance on how to create effective social media content using your content studio.",
    companyId: "COMP-K1L2",
    requester: {
      id: "USER-678",
      type: "CompanyUser",
      name: "Neha Gupta",
      email: "neha@example.com",
      companyId: "COMP-K1L2",
    },
    sourceChannel: "Support Form",
    category: "Content Studio",
    priority: "Low",
    status: "Closed",
    assignedTeamId: "team-triage",
    assignedStaffId: "STAFF-002",
    createdAt: new Date(Date.now() - 1209600000).toISOString(),
    updatedAt: new Date(Date.now() - 1036800000).toISOString(),
    resolvedAt: new Date(Date.now() - 1123200000).toISOString(),
    closedAt: new Date(Date.now() - 1036800000).toISOString(),
    reopenCount: 0,
    slaInstance: {
      id: "SLA-008",
      policyId: "POL-STANDARD",
      startTime: new Date(Date.now() - 1209600000).toISOString(),
      firstResponseRecordedAt: new Date(Date.now() - 1200000000).toISOString(),
      firstResponseState: "Met",
      resolutionRecordedAt: new Date(Date.now() - 1123200000).toISOString(),
      resolutionState: "Met",
    }
  },
  {
    id: "TIC-2026-009",
    subject: "AI content suggestions not working",
    description: "The AI content suggestions feature shows a loading spinner forever and never returns any results. This affects multiple users in our team.",
    companyId: "COMP-C3D4",
    requester: {
      id: "USER-456",
      type: "CompanyUser",
      name: "Mike Ross",
      email: "mike@example.com",
      companyId: "COMP-C3D4",
    },
    sourceChannel: "Email",
    category: "AI & Usage",
    priority: "High",
    status: "New",
    createdAt: new Date(Date.now() - 7200000).toISOString(),
    updatedAt: new Date(Date.now() - 7200000).toISOString(),
    reopenCount: 0,
    slaInstance: {
      id: "SLA-009",
      policyId: "POL-PREMIUM",
      startTime: new Date(Date.now() - 7200000).toISOString(),
      firstResponseDeadline: new Date(Date.now() + 7200000).toISOString(),
      firstResponseState: "On Track",
      resolutionDeadline: new Date(Date.now() + 172800000).toISOString(),
      resolutionState: "On Track",
    }
  },
  {
    id: "TIC-2026-010",
    subject: "Request for custom report feature",
    description: "We need a custom reporting feature that allows us to export data in a specific format. This would greatly help our monthly reporting workflow.",
    companyId: "COMP-E5F6",
    requester: {
      id: "USER-789",
      type: "CompanyUser",
      name: "Priya Sharma",
      email: "priya@example.com",
      companyId: "COMP-E5F6",
    },
    sourceChannel: "Support Form",
    category: "Feature Request",
    priority: "Low",
    status: "Open",
    assignedTeamId: "team-triage",
    createdAt: new Date(Date.now() - 432000000).toISOString(),
    updatedAt: new Date(Date.now() - 345600000).toISOString(),
    reopenCount: 0,
    slaInstance: {
      id: "SLA-010",
      policyId: "POL-STANDARD",
      startTime: new Date(Date.now() - 432000000).toISOString(),
      firstResponseRecordedAt: new Date(Date.now() - 400000000).toISOString(),
      firstResponseState: "Met",
      resolutionState: "Paused",
    }
  },
  {
    id: "TIC-2026-011",
    subject: "Platform slow performance",
    description: "The platform has been very slow for the past 2 days. Page loads take 10+ seconds. This is affecting our productivity significantly.",
    companyId: "COMP-G7H8",
    requester: {
      id: "USER-012",
      type: "CompanyUser",
      name: "Rahul Verma",
      email: "rahul@example.com",
      companyId: "COMP-G7H8",
    },
    sourceChannel: "In-App Chat",
    category: "Platform Performance",
    priority: "High",
    status: "Waiting for Internal Team",
    assignedTeamId: "team-tech",
    assignedStaffId: "STAFF-001",
    createdAt: new Date(Date.now() - 172800000).toISOString(),
    updatedAt: new Date(Date.now() - 86400000).toISOString(),
    reopenCount: 0,
    escalationId: "ESC-003",
    slaInstance: {
      id: "SLA-011",
      policyId: "POL-STANDARD",
      startTime: new Date(Date.now() - 172800000).toISOString(),
      firstResponseRecordedAt: new Date(Date.now() - 170000000).toISOString(),
      firstResponseState: "Met",
      resolutionDeadline: new Date(Date.now() - 3600000).toISOString(),
      resolutionState: "Breached",
    }
  },
  {
    id: "TIC-2026-012",
    subject: "Duplicate invoice received",
    description: "I received two invoices for the same billing period. Please investigate and issue a credit for the duplicate charge.",
    companyId: "COMP-I9J0",
    requester: {
      id: "USER-345",
      type: "CompanyUser",
      name: "Amit Patel",
      email: "amit@example.com",
      companyId: "COMP-I9J0",
    },
    sourceChannel: "Email",
    category: "Billing & Payments",
    priority: "Normal",
    status: "New",
    createdAt: new Date(Date.now() - 1800000).toISOString(),
    updatedAt: new Date(Date.now() - 1800000).toISOString(),
    reopenCount: 0,
    relatedResourceReferences: ["INV-2026-0112", "INV-2026-0113"],
    slaInstance: {
      id: "SLA-012",
      policyId: "POL-STANDARD",
      startTime: new Date(Date.now() - 1800000).toISOString(),
      firstResponseDeadline: new Date(Date.now() + 14400000).toISOString(),
      firstResponseState: "On Track",
      resolutionDeadline: new Date(Date.now() + 259200000).toISOString(),
      resolutionState: "On Track",
    }
  },
];

const mockMessages: TicketMessage[] = [
  {
    id: "MSG-001",
    ticketId: "TIC-2026-002",
    senderType: "Customer",
    senderName: "Mike Ross",
    direction: "Inbound",
    channel: "Email",
    body: "My credit card was charged but the invoice says failed. I need this resolved urgently as it affects my subscription.",
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
    body: "Hi Mike, I'm looking into this right away. It seems like a sync issue with Stripe. I'll have an update for you within 2 hours.",
    visibility: "Public",
    createdAt: new Date(Date.now() - 80000000).toISOString(),
    deliveryState: "Delivered",
  },
  {
    id: "MSG-003",
    ticketId: "TIC-2026-002",
    senderType: "Customer",
    senderName: "Mike Ross",
    direction: "Inbound",
    channel: "Email",
    body: "Any updates on this? I'm getting worried about my subscription being affected.",
    visibility: "Public",
    createdAt: new Date(Date.now() - 50000000).toISOString(),
  },
  {
    id: "MSG-004",
    ticketId: "TIC-2026-002",
    senderType: "Platform Support Staff",
    senderName: "Aditya Raghunath",
    senderId: "STAFF-001",
    direction: "Outbound",
    channel: "Email",
    body: "Hi Mike, I've confirmed the payment was successful on Stripe's end. Our system had a webhook delay. I've manually updated your invoice status. Your subscription is fully active.",
    visibility: "Public",
    createdAt: new Date(Date.now() - 43200000).toISOString(),
    deliveryState: "Delivered",
  },
  {
    id: "MSG-005",
    ticketId: "TIC-2026-003",
    senderType: "Customer",
    senderName: "Sarah Jenkins",
    direction: "Inbound",
    channel: "In-App Chat",
    body: "How do I connect Instagram? I've been trying for 2 days now.",
    visibility: "Public",
    createdAt: new Date(Date.now() - 172800000).toISOString(),
  },
  {
    id: "MSG-006",
    ticketId: "TIC-2026-003",
    senderType: "Platform Support Staff",
    senderName: "Kavya Nair",
    senderId: "STAFF-002",
    direction: "Outbound",
    channel: "In-App Chat",
    body: `Hi Sarah! I'd be happy to help you connect Instagram. Could you please share:
1. Are you using Instagram Business or Creator account?
2. What error message do you see when trying to connect?`,
    visibility: "Public",
    createdAt: new Date(Date.now() - 170000000).toISOString(),
    deliveryState: "Delivered",
  },
  {
    id: "MSG-007",
    ticketId: "TIC-2026-004",
    senderType: "Customer",
    senderName: "Priya Sharma",
    direction: "Inbound",
    channel: "Support Form",
    body: "When I try to schedule a post for next week, the calendar shows an error and the post does not get saved. This is blocking our content calendar.",
    visibility: "Public",
    createdAt: new Date(Date.now() - 259200000).toISOString(),
  },
  {
    id: "MSG-008",
    ticketId: "TIC-2026-004",
    senderType: "Platform Support Staff",
    senderName: "Arjun Mehta",
    senderId: "STAFF-003",
    direction: "Outbound",
    channel: "Email",
    body: "Hi Priya, I've identified the issue. There was a timezone configuration problem that was affecting the scheduling module. I've deployed a fix. Could you try scheduling again?",
    visibility: "Public",
    createdAt: new Date(Date.now() - 172800000).toISOString(),
    deliveryState: "Delivered",
  },
  {
    id: "MSG-009",
    ticketId: "TIC-2026-007",
    senderType: "Customer",
    senderName: "Sarah Jenkins",
    direction: "Inbound",
    channel: "In-App Chat",
    body: "Our WhatsApp Business API integration disconnected suddenly. All our automated messages have stopped working. This is critical for our business.",
    visibility: "Public",
    createdAt: new Date(Date.now() - 14400000).toISOString(),
  },
  {
    id: "MSG-010",
    ticketId: "TIC-2026-007",
    senderType: "Platform Support Staff",
    senderName: "Arjun Mehta",
    senderId: "STAFF-003",
    direction: "Outbound",
    channel: "In-App Chat",
    body: "Hi Sarah, I understand this is critical. I've escalated this to our integration team. We're investigating the OAuth token refresh issue. Expected resolution within 4 hours.",
    visibility: "Public",
    createdAt: new Date(Date.now() - 10000000).toISOString(),
    deliveryState: "Delivered",
  },
  {
    id: "MSG-011",
    ticketId: "TIC-2026-005",
    senderType: "Customer",
    senderName: "Rahul Verma",
    direction: "Inbound",
    channel: "Email",
    body: "The SEO audit for our website shows a score of 45 but when I check manually, everything looks fine. Need someone to look into this discrepancy.",
    visibility: "Public",
    createdAt: new Date(Date.now() - 345600000).toISOString(),
  },
  {
    id: "MSG-012",
    ticketId: "TIC-2026-005",
    senderType: "Platform Support Staff",
    senderName: "Aditya Raghunath",
    senderId: "STAFF-001",
    direction: "Outbound",
    channel: "Email",
    body: "Hi Rahul, I've checked our SEO audit engine logs. There was a caching issue that was affecting score calculations. I've cleared the cache and re-run the audit. Your actual score is 78. Sorry for the confusion!",
    visibility: "Public",
    createdAt: new Date(Date.now() - 259200000).toISOString(),
    deliveryState: "Delivered",
  },
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
  },
  {
    id: "NOTE-002",
    ticketId: "TIC-2026-002",
    authorName: "Aditya Raghunath",
    authorStaffId: "STAFF-001",
    body: "Engineering confirmed the webhook payload was malformed. Fixed the handler. Invoice status updated manually.",
    createdAt: new Date(Date.now() - 40000000).toISOString(),
    visibility: "Internal Only",
  },
  {
    id: "NOTE-003",
    ticketId: "TIC-2026-004",
    authorName: "Arjun Mehta",
    authorStaffId: "STAFF-003",
    body: "Root cause: UTC offset calculation was incorrect for IST timezone. Patch deployed to staging. Monitoring for 24 hours before closing.",
    createdAt: new Date(Date.now() - 200000000).toISOString(),
    visibility: "Internal Only",
    relatedResourceReferences: ["JOB-PATCH-789"]
  },
  {
    id: "NOTE-004",
    ticketId: "TIC-2026-007",
    authorName: "Arjun Mehta",
    authorStaffId: "STAFF-003",
    body: "WhatsApp OAuth token expired. Need to refresh via Meta Business API. Contacting Meta support for expedited token renewal.",
    createdAt: new Date(Date.now() - 12000000).toISOString(),
    visibility: "Internal Only",
    relatedResourceReferences: ["INTG-WA-001"]
  },
  {
    id: "NOTE-005",
    ticketId: "TIC-2026-011",
    authorName: "Aditya Raghunath",
    authorStaffId: "STAFF-001",
    body: "Performance degradation confirmed across multiple regions. Infrastructure team notified. Suspected cause: CDN cache invalidation storm.",
    createdAt: new Date(Date.now() - 100000000).toISOString(),
    visibility: "Internal Only",
    relatedResourceReferences: ["INC-SYS-045"]
  },
];

const mockActivities: SupportActivity[] = [
  { id: "ACT-001", ticketId: "TIC-2026-002", actorType: "Customer", actorName: "Mike Ross", actionType: "Ticket Created", timestamp: new Date(Date.now() - 86400000).toISOString() },
  { id: "ACT-002", ticketId: "TIC-2026-002", actorType: "PlatformStaff", actorName: "Aditya Raghunath", actionType: "Assignment Changed", newValue: "STAFF-001", timestamp: new Date(Date.now() - 85000000).toISOString() },
  { id: "ACT-003", ticketId: "TIC-2026-002", actorType: "PlatformStaff", actorName: "Aditya Raghunath", actionType: "Status Changed", newValue: "In Progress", timestamp: new Date(Date.now() - 84000000).toISOString() },
  { id: "ACT-004", ticketId: "TIC-2026-002", actorType: "PlatformStaff", actorName: "Aditya Raghunath", actionType: "Response Drafted", timestamp: new Date(Date.now() - 80000000).toISOString() },
  { id: "ACT-005", ticketId: "TIC-2026-002", actorType: "PlatformStaff", actorName: "Aditya Raghunath", actionType: "Internal Note Added", timestamp: new Date(Date.now() - 43200000).toISOString() },
  { id: "ACT-006", ticketId: "TIC-2026-001", actorType: "Customer", actorName: "Sarah Jenkins", actionType: "Ticket Created", timestamp: new Date(Date.now() - 3600000).toISOString() },
  { id: "ACT-007", ticketId: "TIC-2026-003", actorType: "Customer", actorName: "Sarah Jenkins", actionType: "Ticket Created", timestamp: new Date(Date.now() - 172800000).toISOString() },
  { id: "ACT-008", ticketId: "TIC-2026-003", actorType: "PlatformStaff", actorName: "Kavya Nair", actionType: "Assignment Changed", newValue: "STAFF-002", timestamp: new Date(Date.now() - 171000000).toISOString() },
  { id: "ACT-009", ticketId: "TIC-2026-003", actorType: "PlatformStaff", actorName: "Kavya Nair", actionType: "Status Changed", newValue: "Waiting for Customer", timestamp: new Date(Date.now() - 86400000).toISOString() },
  { id: "ACT-010", ticketId: "TIC-2026-004", actorType: "Customer", actorName: "Priya Sharma", actionType: "Ticket Created", timestamp: new Date(Date.now() - 259200000).toISOString() },
  { id: "ACT-011", ticketId: "TIC-2026-004", actorType: "PlatformStaff", actorName: "Arjun Mehta", actionType: "Status Changed", newValue: "Open", timestamp: new Date(Date.now() - 258000000).toISOString() },
  { id: "ACT-012", ticketId: "TIC-2026-004", actorType: "PlatformStaff", actorName: "Arjun Mehta", actionType: "Priority Changed", newValue: "High", timestamp: new Date(Date.now() - 250000000).toISOString() },
  { id: "ACT-013", ticketId: "TIC-2026-007", actorType: "Customer", actorName: "Sarah Jenkins", actionType: "Ticket Created", timestamp: new Date(Date.now() - 14400000).toISOString() },
  { id: "ACT-014", ticketId: "TIC-2026-007", actorType: "PlatformStaff", actorName: "Arjun Mehta", actionType: "Escalation Opened", timestamp: new Date(Date.now() - 13000000).toISOString() },
  { id: "ACT-015", ticketId: "TIC-2026-011", actorType: "Customer", actorName: "Rahul Verma", actionType: "Ticket Created", timestamp: new Date(Date.now() - 172800000).toISOString() },
  { id: "ACT-016", ticketId: "TIC-2026-011", actorType: "PlatformStaff", actorName: "Aditya Raghunath", actionType: "Status Changed", newValue: "Waiting for Internal Team", timestamp: new Date(Date.now() - 86400000).toISOString() },
];

const mockEscalations: TicketEscalation[] = [
  {
    id: "ESC-001",
    ticketId: "TIC-2026-002",
    reason: "Payment succeeded but system shows failed. Requires engineering review.",
    type: "Technical Review",
    currentTeamId: "team-tech",
    priority: "Urgent",
    state: "Resolved",
    createdAt: new Date(Date.now() - 43200000).toISOString(),
    updatedAt: new Date(Date.now() - 40000000).toISOString(),
  },
  {
    id: "ESC-002",
    ticketId: "TIC-2026-007",
    reason: "WhatsApp integration critical for business operations. Token refresh failure affecting automated messaging.",
    type: "Integration Failure",
    currentTeamId: "team-tech",
    priority: "Urgent",
    state: "Active",
    createdAt: new Date(Date.now() - 13000000).toISOString(),
    updatedAt: new Date(Date.now() - 10000000).toISOString(),
  },
  {
    id: "ESC-003",
    ticketId: "TIC-2026-011",
    reason: "Platform performance affecting multiple companies. SLA breached. Infrastructure investigation required.",
    type: "Infrastructure",
    currentTeamId: "team-tech",
    priority: "High",
    state: "Active",
    createdAt: new Date(Date.now() - 100000000).toISOString(),
    updatedAt: new Date(Date.now() - 86400000).toISOString(),
  },
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
    const newTicket: SupportTicket = { ...ticketData, id: newId, createdAt: now, updatedAt: now, reopenCount: 0 };
    setTickets(prev => [newTicket, ...prev]);
    setActivities(prev => [{ id: `ACT-${Date.now()}`, ticketId: newId, actorType: "PlatformStaff", actorName: "System User", actionType: "Ticket Created", timestamp: now }, ...prev]);
  };

  const updateTicketStatus = (id: string, status: SupportTicket["status"]) => {
    const now = new Date().toISOString();
    setTickets(prev => prev.map(t => t.id === id ? { ...t, status, updatedAt: now } : t));
    setActivities(prev => [{ id: `ACT-${Date.now()}`, ticketId: id, actorType: "PlatformStaff", actorName: "System User", actionType: "Status Changed", newValue: status, timestamp: now }, ...prev]);
  };

  const updateTicketPriority = (id: string, priority: SupportTicket["priority"]) => {
    const now = new Date().toISOString();
    setTickets(prev => prev.map(t => t.id === id ? { ...t, priority, updatedAt: now } : t));
    setActivities(prev => [{ id: `ACT-${Date.now()}`, ticketId: id, actorType: "PlatformStaff", actorName: "System User", actionType: "Priority Changed", newValue: priority, timestamp: now }, ...prev]);
  };

  const assignTicket = (id: string, teamId?: string, staffId?: string) => {
    const now = new Date().toISOString();
    setTickets(prev => prev.map(t => t.id === id ? { ...t, assignedTeamId: teamId, assignedStaffId: staffId, updatedAt: now } : t));
    setActivities(prev => [{ id: `ACT-${Date.now()}`, ticketId: id, actorType: "PlatformStaff", actorName: "System User", actionType: "Assignment Changed", newValue: staffId || teamId || "Unassigned", timestamp: now }, ...prev]);
  };

  const addMessage = (messageData: Omit<TicketMessage, "id" | "createdAt">) => {
    const now = new Date().toISOString();
    const newMessage: TicketMessage = { ...messageData, id: `MSG-${Date.now()}`, createdAt: now };
    setMessages(prev => [...prev, newMessage]);
    setActivities(prev => [{ id: `ACT-${Date.now()}`, ticketId: messageData.ticketId, actorType: messageData.senderType === "Customer" ? "Customer" : "PlatformStaff", actorName: messageData.senderName, actionType: messageData.direction === "Outbound" ? "Response Drafted" : "Customer Message Received", timestamp: now }, ...prev]);
  };

  const addNote = (noteData: Omit<TicketInternalNote, "id" | "createdAt">) => {
    const now = new Date().toISOString();
    const newNote: TicketInternalNote = { ...noteData, id: `NOTE-${Date.now()}`, createdAt: now };
    setNotes(prev => [...prev, newNote]);
    setActivities(prev => [{ id: `ACT-${Date.now()}`, ticketId: noteData.ticketId, actorType: "PlatformStaff", actorName: noteData.authorName, actionType: "Internal Note Added", timestamp: now }, ...prev]);
  };

  const resolveTicket = (id: string, resolutionDetails?: string) => {
    const now = new Date().toISOString();
    setTickets(prev => prev.map(t => t.id === id ? { ...t, status: "Resolved", resolvedAt: now, updatedAt: now } : t));
    setActivities(prev => [{ id: `ACT-${Date.now()}`, ticketId: id, actorType: "PlatformStaff", actorName: "System User", actionType: "Resolution Recorded", reason: resolutionDetails, timestamp: now }, ...prev]);
  };

  const closeTicket = (id: string) => {
    const now = new Date().toISOString();
    setTickets(prev => prev.map(t => t.id === id ? { ...t, status: "Closed", closedAt: now, updatedAt: now } : t));
    setActivities(prev => [{ id: `ACT-${Date.now()}`, ticketId: id, actorType: "PlatformStaff", actorName: "System User", actionType: "Ticket Closed", timestamp: now }, ...prev]);
  };

  const reopenTicket = (id: string, reason?: string) => {
    const now = new Date().toISOString();
    setTickets(prev => prev.map(t => t.id === id ? { ...t, status: "In Progress", updatedAt: now, reopenCount: t.reopenCount + 1 } : t));
    setActivities(prev => [{ id: `ACT-${Date.now()}`, ticketId: id, actorType: "PlatformStaff", actorName: "System User", actionType: "Ticket Reopened", reason, timestamp: now }, ...prev]);
  };

  const createEscalation = (escData: Omit<TicketEscalation, "id" | "createdAt" | "updatedAt">) => {
    const now = new Date().toISOString();
    const newEsc: TicketEscalation = { ...escData, id: `ESC-${Date.now()}`, createdAt: now, updatedAt: now };
    setEscalations(prev => [...prev, newEsc]);
    setTickets(prev => prev.map(t => t.id === escData.ticketId ? { ...t, escalationId: newEsc.id, updatedAt: now } : t));
    setActivities(prev => [{ id: `ACT-${Date.now()}`, ticketId: escData.ticketId, actorType: "PlatformStaff", actorName: "System User", actionType: "Escalation Opened", timestamp: now }, ...prev]);
  };

  const value = useMemo(() => ({
    tickets, messages, notes, activities, teams, escalations,
    addTicket, updateTicketStatus, updateTicketPriority, assignTicket,
    addMessage, addNote, resolveTicket, closeTicket, reopenTicket, createEscalation
  }), [tickets, messages, notes, activities, teams, escalations]);

  return <SupportContext.Provider value={value}>{children}</SupportContext.Provider>;
}

export function useSupport() {
  const context = useContext(SupportContext);
  if (context === undefined) throw new Error("useSupport must be used within a SupportProvider");
  return context;
}
