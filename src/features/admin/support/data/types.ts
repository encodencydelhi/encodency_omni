export type SupportStatus =
  | "New"
  | "Open"
  | "In Progress"
  | "Waiting for Customer"
  | "Waiting for Internal Team"
  | "Resolved"
  | "Closed";

export type SupportPriority = "Low" | "Normal" | "High" | "Urgent";
export type SupportSlaState = "On Track" | "At Risk" | "Breached" | "Paused" | "Unknown";
export type SupportSource =
  | "Company Admin Support Form"
  | "Admin Manual Entry"
  | "Email"
  | "WhatsApp"
  | "In-App Chat"
  | "API";

export interface AdminSupportCompany {
  id: string;
  name: string;
  timezone: string;
}

export interface AdminSupportRequester {
  id: string;
  type: "CompanyUser" | "ExternalContact";
  name: string;
  email: string;
  role: string;
  companyId: string;
}

export interface AdminSupportSla {
  id: string;
  policy: string;
  firstResponseTarget: string;
  resolutionTarget: string;
  state: SupportSlaState;
  firstResponseActual?: string;
  resolutionRemaining?: string;
  deadline: string;
}

export interface AdminSupportEscalation {
  id: string;
  ticketId: string;
  reason: string;
  currentOwner: string;
  team: string;
  owner: string;
  priority: SupportPriority;
  state: "Requested" | "Active" | "Handover Pending" | "Resolved" | "Cancelled";
  createdAt: string;
  handoverNote?: string;
}

export interface AdminSupportRelatedResource {
  id: string;
  kind: "Integration" | "Campaign" | "Social Account" | "Publishing Job" | "Invoice" | "API Request" | "System Incident";
  label: string;
  href: string;
}

export interface AdminSupportTicket {
  id: string;
  subject: string;
  description: string;
  companyId: string;
  clientName: string;
  requester: AdminSupportRequester;
  source: SupportSource;
  category: string;
  subcategory?: string;
  priority: SupportPriority;
  status: SupportStatus;
  assignedTeamId?: string;
  assignedStaffId?: string;
  ownerName?: string;
  sla?: AdminSupportSla;
  escalation?: AdminSupportEscalation;
  relatedResources: AdminSupportRelatedResource[];
  createdAt: string;
  updatedAt: string;
  reopenCount: number;
}

export interface AdminSupportMessage {
  id: string;
  ticketId: string;
  senderType: "Customer" | "Support Agent" | "System";
  senderName: string;
  direction: "Inbound" | "Outbound" | "Internal";
  channel: string;
  body: string;
  createdAt: string;
  visibility: "Public" | "Internal";
  deliveryState: "Demo Only" | "Queued" | "Sent" | "Delivered" | "Not Connected";
}

export interface AdminSupportNote {
  id: string;
  ticketId: string;
  authorName: string;
  authorStaffId: string;
  body: string;
  createdAt: string;
  visibility: "Internal Only";
}

export interface AdminSupportActivity {
  id: string;
  ticketId: string;
  actorType: "System" | "Support Agent" | "Customer";
  actorName: string;
  actionType: string;
  timestamp: string;
  previousValue?: string;
  newValue?: string;
  reason?: string;
}

export interface AdminSupportTeam {
  id: string;
  name: string;
  description: string;
}

export interface AdminSupportTemplate {
  id: string;
  name: string;
  category: string;
  subject: string;
  body: string;
  active: boolean;
}

export interface AdminSupportSavedView {
  id: string;
  name: string;
  filter: string;
  visibility: "Private" | "Company Support Team";
}

export interface AdminSupportSnapshot {
  company: AdminSupportCompany;
  tickets: AdminSupportTicket[];
  messages: AdminSupportMessage[];
  notes: AdminSupportNote[];
  activity: AdminSupportActivity[];
  teams: AdminSupportTeam[];
  escalations: AdminSupportEscalation[];
  templates: AdminSupportTemplate[];
  savedViews: AdminSupportSavedView[];
}
