import type { SlaState, TicketCategory, TicketPriority, TicketStatus } from "./types";

export type Tone = "slate" | "blue" | "amber" | "red" | "green" | "violet" | "orange";

export const STATUS_LABEL: Record<TicketStatus, string> = {
  open: "Open",
  in_progress: "In progress",
  waiting_on_customer: "Waiting for customer",
  resolved: "Resolved",
  closed: "Closed",
};

/** The Company's view of the same statuses: the words describe whose turn it is. */
export const CUSTOMER_STATUS_LABEL: Record<TicketStatus, string> = {
  open: "Open",
  in_progress: "In progress",
  waiting_on_customer: "Needs your reply",
  resolved: "Resolved",
  closed: "Closed",
};

export const STATUS_TONE: Record<TicketStatus, Tone> = {
  open: "blue",
  in_progress: "violet",
  waiting_on_customer: "amber",
  resolved: "green",
  closed: "slate",
};

export const PRIORITY_LABEL: Record<TicketPriority, string> = { low: "Low", normal: "Normal", high: "High", urgent: "Urgent" };
export const PRIORITY_TONE: Record<TicketPriority, Tone> = { low: "slate", normal: "blue", high: "orange", urgent: "red" };

export const CATEGORY_LABEL: Record<TicketCategory, string> = {
  technical: "Technical problem",
  billing: "Billing & plan",
  integration: "Integrations",
  publishing: "Publishing",
  account: "Account & access",
  feature_request: "Feature request",
  other: "Other",
};

export const CATEGORY_HINT: Record<TicketCategory, string> = {
  technical: "Something is broken or behaves unexpectedly",
  billing: "Invoices, payments, plan or limits",
  integration: "Facebook, Instagram, YouTube, LinkedIn, Google…",
  publishing: "Scheduling or posting did not work",
  account: "Login, users, roles, company settings",
  feature_request: "An idea or something you are missing",
  other: "Anything else",
};

export const SLA_LABEL: Record<SlaState, string> = {
  on_track: "On track",
  at_risk: "At risk",
  breached: "Breached",
  paused: "Paused",
  met: "Met",
  missed: "Missed",
};
export const SLA_TONE: Record<SlaState, Tone> = { on_track: "green", at_risk: "amber", breached: "red", paused: "slate", met: "green", missed: "red" };

/** What happened, in the words of the activity trail. */
export const EVENT_LABEL: Record<string, string> = {
  created: "Ticket raised",
  status_changed: "Status changed",
  assigned: "Assigned",
  priority_changed: "Priority changed",
  category_changed: "Category changed",
  reopened: "Reopened",
  closed: "Closed",
  rated: "Rated",
  replied: "Replied",
  note_added: "Internal note",
};

export const TONE_CLASS: Record<Tone, { chip: string; dot: string; text: string; soft: string }> = {
  slate: { chip: "border-slate-200 bg-slate-100 text-slate-700", dot: "bg-slate-400", text: "text-slate-700", soft: "bg-slate-50" },
  blue: { chip: "border-blue-200 bg-blue-50 text-blue-700", dot: "bg-blue-500", text: "text-blue-700", soft: "bg-blue-50" },
  amber: { chip: "border-amber-200 bg-amber-50 text-amber-800", dot: "bg-amber-500", text: "text-amber-800", soft: "bg-amber-50" },
  red: { chip: "border-rose-200 bg-rose-50 text-rose-700", dot: "bg-rose-500", text: "text-rose-700", soft: "bg-rose-50" },
  green: { chip: "border-emerald-200 bg-emerald-50 text-emerald-700", dot: "bg-emerald-500", text: "text-emerald-700", soft: "bg-emerald-50" },
  violet: { chip: "border-violet-200 bg-violet-50 text-violet-700", dot: "bg-violet-500", text: "text-violet-700", soft: "bg-violet-50" },
  orange: { chip: "border-orange-200 bg-orange-50 text-orange-700", dot: "bg-orange-500", text: "text-orange-700", soft: "bg-orange-50" },
};
