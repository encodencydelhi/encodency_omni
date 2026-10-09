/** API shapes of the support desk: Company routes (`/support/*`) and the Super Admin desk (`/super-admin/support/*`). */
export const TICKET_STATUSES = ["open", "in_progress", "waiting_on_customer", "resolved", "closed"] as const;
export const TICKET_PRIORITIES = ["low", "normal", "high", "urgent"] as const;
export const TICKET_CATEGORIES = ["technical", "billing", "integration", "publishing", "account", "feature_request", "other"] as const;

export type TicketStatus = (typeof TICKET_STATUSES)[number];
export type TicketPriority = (typeof TICKET_PRIORITIES)[number];
export type TicketCategory = (typeof TICKET_CATEGORIES)[number];
export type SlaState = "on_track" | "at_risk" | "breached" | "paused" | "met" | "missed";

export interface SlaClock {
  state: SlaState;
  dueAt: string;
  at: string | null;
}

export interface Sla {
  state: SlaState;
  firstResponse: SlaClock;
  resolution: SlaClock;
}

export interface Paged<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

/* ------------------------------------------------------------ Company side */

export interface TicketItem {
  id: string;
  number: number;
  subject: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  /** `you`: support replied and waits for you. `support`: you wait for support. */
  awaiting: "you" | "support" | null;
  createdAt: string;
  updatedAt: string;
  lastActivityAt: string;
  createdBy: { id: string; name: string; isYou: boolean };
  assignee: { name: string } | null;
  client: { id: string; name: string } | null;
  replies: number;
  rating: number | null;
  sla: Sla;
}

export interface TicketCounts {
  all: number;
  active: number;
  open: number;
  in_progress: number;
  waiting_on_customer: number;
  resolved: number;
  closed: number;
}

export interface TicketList extends Paged<TicketItem> {
  counts: TicketCounts;
}

export interface CustomerMessage {
  id: string;
  from: "customer" | "support";
  authorName: string;
  isYou: boolean;
  body: string;
  createdAt: string;
}

export interface TimelineEvent {
  id: string;
  kind: string;
  from: string | null;
  to: string | null;
  note: string | null;
  actor: string;
  createdAt: string;
}

export interface TicketDetail extends TicketItem {
  description: string;
  relatedModule: string | null;
  relatedUrl: string | null;
  firstResponseAt: string | null;
  resolvedAt: string | null;
  closedAt: string | null;
  reopenCount: number;
  satisfaction: { rating: number; comment: string | null } | null;
  actions: { canReply: boolean; canReopen: boolean; canClose: boolean; canRate: boolean; reopenWindowDays: number };
  messages: CustomerMessage[];
  events: TimelineEvent[];
}

export interface SupportSummary {
  counts: { active: number; waitingForYou: number; resolvedLast30Days: number };
  awaitingYou: TicketItem[];
  recent: TicketItem[];
  averages: { firstResponseHours: number | null; resolutionHours: number | null; satisfaction: number | null };
  policy: Array<{ priority: TicketPriority; firstResponseHours: number; resolutionHours: number }>;
}

export interface CompanyActivityItem {
  id: string;
  kind: string;
  from: string | null;
  to: string | null;
  note: string | null;
  actor: string;
  isSupport: boolean;
  ticket: { number: number; subject: string };
  createdAt: string;
}

export type CompanyActivity = Paged<CompanyActivityItem>;

export interface CreateTicketInput {
  subject: string;
  description: string;
  category: TicketCategory;
  priority?: TicketPriority;
  clientId?: string;
  relatedModule?: string;
  relatedUrl?: string;
}

/* -------------------------------------------------------------- Desk side */

export interface DeskItem {
  id: string;
  number: number;
  subject: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  company: { id: string; name: string };
  client: { id: string; name: string } | null;
  createdBy: { id: string; name: string; email: string };
  assignee: { id: string; name: string } | null;
  awaiting: "customer" | "support" | null;
  unanswered: boolean;
  createdAt: string;
  lastActivityAt: string;
  replies: number;
  reopenCount: number;
  rating: number | null;
  sla: Sla;
}

export interface DeskMessage {
  id: string;
  from: "customer" | "support";
  internal: boolean;
  authorName: string;
  body: string;
  createdAt: string;
}

export interface DeskEvent extends TimelineEvent {
  actorIsStaff: boolean;
}

export interface DeskDetail extends DeskItem {
  description: string;
  relatedModule: string | null;
  relatedUrl: string | null;
  firstResponseAt: string | null;
  resolvedAt: string | null;
  closedAt: string | null;
  satisfaction: { rating: number; comment: string | null } | null;
  requester: { name: string; email: string; role: string | null };
  companyOwner: { name: string; email: string } | null;
  companyTickets: { total: number; open: number };
  otherTickets: Array<{ number: number; subject: string; status: TicketStatus; createdAt: string }>;
  messages: DeskMessage[];
  events: DeskEvent[];
}

export interface StaffMember {
  id: string;
  name: string;
  email: string;
  open: number;
}

export interface DeskOverview {
  counts: { open: number; unassigned: number; urgent: number; breached: number; atRisk: number; waiting: number; unanswered: number; createdToday: number; resolvedToday: number };
  averages: { firstResponseHours: number | null; resolutionHours: number | null; satisfaction: number | null; ratings: number };
  byStatus: Array<{ status: TicketStatus; count: number }>;
  byPriority: Array<{ priority: TicketPriority; count: number }>;
  byCategory: Array<{ category: TicketCategory; count: number }>;
  trend: Array<{ day: string; created: number; resolved: number }>;
  attention: DeskItem[];
  topCompanies: Array<{ companyId: string; name: string; open: number }>;
}

export interface DeskQueues {
  queues: { all: number; unassigned: number; mine: number; urgent: number; breached: number; atRisk: number; waiting: number; unanswered: number; resolved: number };
  byCategory: Array<{ category: TicketCategory; count: number }>;
}

export interface DeskSla {
  policy: Array<{ priority: TicketPriority; firstResponseHours: number; resolutionHours: number }>;
  counts: { breached: number; atRisk: number; paused: number };
  breached: DeskItem[];
  atRisk: DeskItem[];
}

export interface DeskWorkload {
  unassigned: number;
  staff: Array<{
    id: string;
    name: string;
    email: string;
    open: number;
    inProgress: number;
    waiting: number;
    urgent: number;
    breached: number;
    resolvedLast7Days: number;
    resolvedLast30Days: number;
    avgFirstResponseHours: number | null;
    avgResolutionHours: number | null;
    satisfaction: number | null;
  }>;
}

export interface DeskReports {
  range: string;
  totals: { created: number; resolved: number; reopened: number; stillOpen: number; resolutionRate: number | null };
  averages: { firstResponseHours: number | null; resolutionHours: number | null };
  sla: { firstResponseMetPercent: number | null; resolutionMetPercent: number | null };
  satisfaction: { average: number | null; ratings: number; distribution: Array<{ rating: number; count: number }> };
  trend: Array<{ day: string; created: number; resolved: number }>;
  byCategory: Array<{ key: TicketCategory; count: number }>;
  byPriority: Array<{ key: TicketPriority; count: number }>;
  topCompanies: Array<{ companyId: string; name: string; tickets: number }>;
}

export interface DeskActivityItem {
  id: string;
  kind: string;
  from: string | null;
  to: string | null;
  note: string | null;
  actor: string;
  actorIsStaff: boolean;
  ticket: { number: number; subject: string; company: string };
  createdAt: string;
}

export type DeskActivity = Paged<DeskActivityItem>;

export interface BulkResult {
  updated: number;
  skipped: Array<{ number: number; reason: string }>;
}
