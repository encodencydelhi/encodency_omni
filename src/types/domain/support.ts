import type { EntityRef, StatusRegistry } from "@/types/common";

export const TICKET_STATUS = {
  open: { label: "Open", tone: "info" },
  in_progress: { label: "In Progress", tone: "brand" },
  waiting: { label: "Waiting on Customer", tone: "warning" },
  resolved: { label: "Resolved", tone: "success" },
  closed: { label: "Closed", tone: "neutral" },
} as const satisfies StatusRegistry<string>;

export type TicketStatus = keyof typeof TICKET_STATUS;

export const TICKET_PRIORITY = {
  urgent: { label: "Urgent", tone: "danger" },
  high: { label: "High", tone: "warning" },
  normal: { label: "Normal", tone: "neutral" },
  low: { label: "Low", tone: "neutral" },
} as const satisfies StatusRegistry<string>;

export type TicketPriority = keyof typeof TICKET_PRIORITY;

export interface SupportTicket {
  id: string;
  reference: string;
  subject: string;
  category: string;
  company: EntityRef;
  requester: { name: string; email: string };
  priority: TicketPriority;
  status: TicketStatus;
  assignee: { id: string; name: string } | null;
  messageCount: number;
  slaMinutesRemaining: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface SupportFilters {
  status: TicketStatus;
  priority: TicketPriority;
  assigneeId: string;
  companyId: string;
}

export type SupportSortField = "createdAt" | "updatedAt" | "priority" | "status" | "company";
