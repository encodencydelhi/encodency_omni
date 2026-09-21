export type TicketStatus = 
  | "New" 
  | "Open" 
  | "In Progress" 
  | "Waiting for Customer" 
  | "Waiting for Internal Team" 
  | "Resolved" 
  | "Closed";

export type TicketPriority = "Low" | "Normal" | "High" | "Urgent";

export type SlaState = "Not Applicable" | "On Track" | "At Risk" | "Breached" | "Met" | "Paused" | "Unknown";

export type EscalationState = "Requested" | "Active" | "Awaiting Action" | "Resolved" | "Cancelled";

export type TicketCategory = 
  | "Account & Access"
  | "Company Setup"
  | "Subscription & Plans"
  | "Billing & Payments"
  | "Integrations"
  | "Publishing & Scheduling"
  | "Content Studio"
  | "SEO & Website"
  | "Reports & Analytics"
  | "AI & Usage"
  | "Platform Performance"
  | "Technical Issue"
  | "Feature Request"
  | "General Inquiry"
  | "Other";

export type MessageSenderType = "Customer" | "Platform Support Staff" | "Authorized Company User" | "System";
export type MessageDirection = "Inbound" | "Outbound" | "Internal";

export interface TicketRequester {
  id: string;
  type: "CompanyUser" | "ExternalContact" | "PlatformStaff";
  name: string;
  email: string;
  companyId: string;
  clientId?: string;
  membershipContext?: string;
}

export interface TicketSlaInstance {
  id: string;
  policyId: string;
  startTime: string;
  firstResponseDeadline?: string;
  firstResponseRecordedAt?: string;
  firstResponseState: SlaState;
  resolutionDeadline?: string;
  resolutionRecordedAt?: string;
  resolutionState: SlaState;
  pausedIntervals?: any[];
}

export interface TicketEscalation {
  id: string;
  ticketId: string;
  reason: string;
  type: string;
  currentTeamId?: string;
  ownerId?: string;
  priority: TicketPriority;
  state: EscalationState;
  createdAt: string;
  updatedAt: string;
  handoverNote?: string;
  relatedResourceId?: string;
}

export interface SupportTicket {
  id: string;
  subject: string;
  description: string;
  companyId: string;
  clientId?: string;
  requester: TicketRequester;
  sourceChannel: string;
  category: TicketCategory;
  subcategory?: string;
  priority: TicketPriority;
  status: TicketStatus;
  assignedTeamId?: string;
  assignedStaffId?: string;
  slaInstance?: TicketSlaInstance;
  escalationId?: string;
  relatedResourceReferences?: string[];
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  closedAt?: string;
  reopenCount: number;
}

export interface TicketMessage {
  id: string;
  ticketId: string;
  senderType: MessageSenderType;
  senderName: string;
  senderId?: string;
  direction: MessageDirection;
  channel: string;
  body: string;
  visibility: "Public" | "Internal";
  createdAt: string;
  sentAt?: string;
  deliveredAt?: string;
  deliveryState?: "Draft" | "Queued" | "Sent" | "Delivered" | "Failed" | "Not Connected" | "Demo Only";
  attachmentReferences?: string[];
}

export interface TicketInternalNote {
  id: string;
  ticketId: string;
  authorName: string;
  authorStaffId: string;
  body: string;
  createdAt: string;
  attachmentReferences?: string[];
  relatedResourceReferences?: string[];
  visibility: "Internal Only";
}

export interface SupportActivity {
  id: string;
  ticketId: string;
  actorType: "System" | "PlatformStaff" | "Customer";
  actorName: string;
  actorId?: string;
  actionType: string; // e.g., "Status Changed", "Ticket Created"
  timestamp: string;
  previousValue?: string;
  newValue?: string;
  reason?: string;
}

export interface SupportTeam {
  id: string;
  name: string;
  description: string;
}
