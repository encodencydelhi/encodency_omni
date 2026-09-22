import type { StatusRegistry } from "@/types/common";

/* ------------------------------------------------------------------ */
/* Enums / Literals                                                    */
/* ------------------------------------------------------------------ */

export type LeadStage = "new" | "contacted" | "qualified" | "proposal" | "won" | "lost";
export type LeadSource = "website" | "google" | "facebook" | "instagram" | "linkedin" | "referral" | "campaign" | "import" | "manual" | "other";
export type LeadPriority = "low" | "medium" | "high";
export type LeadScore = "cold" | "warm" | "hot";

export type DealStage = "new" | "qualified" | "discovery" | "proposal" | "negotiation" | "won" | "lost";
export type DealPriority = "low" | "medium" | "high";

export type TaskStatus = "pending" | "in_progress" | "completed" | "cancelled";
export type TaskPriority = "low" | "medium" | "high";
export type TaskType = "call" | "email" | "meeting" | "follow_up" | "demo" | "proposal" | "internal" | "other";

export type ActivityType = "lead_created" | "stage_changed" | "email_sent" | "email_opened" | "call_logged" | "meeting_scheduled" | "note_added" | "task_created" | "task_completed" | "owner_changed" | "deal_created" | "lead_converted" | "value_changed" | "contact_created" | "tag_added" | "tag_removed";

export type ContactStatus = "active" | "inactive" | "lead" | "customer" | "prospect";

/* ------------------------------------------------------------------ */
/* Status Registries (for StatusBadge)                                  */
/* ------------------------------------------------------------------ */

export const LEAD_STAGE_REGISTRY: StatusRegistry<LeadStage> = {
  new:       { label: "New",       tone: "info",      description: "Lead just created" },
  contacted: { label: "Contacted", tone: "warning",   description: "Initial contact made" },
  qualified: { label: "Qualified", tone: "success",   description: "Lead meets criteria" },
  proposal:  { label: "Proposal",  tone: "brand",     description: "Proposal sent" },
  won:       { label: "Won",       tone: "success",   description: "Deal closed won" },
  lost:      { label: "Lost",      tone: "danger",    description: "Deal closed lost" },
};

export const DEAL_STAGE_REGISTRY: StatusRegistry<DealStage> = {
  new:         { label: "New",         tone: "info",      description: "Deal just created" },
  qualified:   { label: "Qualified",   tone: "info",      description: "Deal qualified" },
  discovery:   { label: "Discovery",   tone: "warning",   description: "Discovery phase" },
  proposal:    { label: "Proposal",    tone: "brand",     description: "Proposal sent" },
  negotiation: { label: "Negotiation", tone: "warning",   description: "Negotiation in progress" },
  won:         { label: "Won",         tone: "success",   description: "Deal closed won" },
  lost:        { label: "Lost",        tone: "danger",    description: "Deal closed lost" },
};

export const TASK_STATUS_REGISTRY: StatusRegistry<TaskStatus> = {
  pending:     { label: "Pending",     tone: "neutral",  description: "Not started" },
  in_progress: { label: "In Progress", tone: "info",     description: "Currently working" },
  completed:   { label: "Completed",   tone: "success",  description: "Done" },
  cancelled:   { label: "Cancelled",   tone: "neutral",  description: "Cancelled" },
};

export const TASK_PRIORITY_REGISTRY: StatusRegistry<TaskPriority> = {
  high:   { label: "High",   tone: "danger",  description: "Urgent" },
  medium: { label: "Medium", tone: "warning", description: "Normal" },
  low:    { label: "Low",    tone: "neutral", description: "Low priority" },
};

export const LEAD_PRIORITY_REGISTRY: StatusRegistry<LeadPriority> = {
  high:   { label: "High",   tone: "danger",  description: "High priority" },
  medium: { label: "Medium", tone: "warning", description: "Normal priority" },
  low:    { label: "Low",    tone: "neutral", description: "Low priority" },
};

/* ------------------------------------------------------------------ */
/* Core Entities                                                        */
/* ------------------------------------------------------------------ */

export interface User {
  id: string;
  name: string;
  email: string;
  initials: string;
}

export interface Company {
  id: string;
  name: string;
  industry: string;
  website: string;
  location: string;
}

export interface Tag {
  id: string;
  label: string;
  color: string;
}

/* ------------------------------------------------------------------ */
/* Lead                                                                 */
/* ------------------------------------------------------------------ */

export interface Lead {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  alternatePhone?: string;
  company: string;
  jobTitle: string;
  industry: string;
  website: string;
  location: string;
  streetAddress: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  source: LeadSource;
  campaign: string;
  stage: LeadStage;
  leadScore: number;
  scoreClassification: LeadScore;
  priority: LeadPriority;
  ownerId: string;
  ownerName: string;
  estimatedDealValue: number;
  probability: number;
  expectedCloseDate: string;
  tags: string[];
  notes: string;
  nextFollowUp: string;
  lastContacted: string;
  createdAt: string;
  updatedAt: string;
}

/* ------------------------------------------------------------------ */
/* Contact                                                              */
/* ------------------------------------------------------------------ */

export interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  alternatePhone?: string;
  company: string;
  companyId: string;
  role: string;
  department: string;
  website: string;
  linkedIn: string;
  location: string;
  streetAddress: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  ownerId: string;
  ownerName: string;
  tags: string[];
  groups: string[];
  status: ContactStatus;
  lastContacted: string;
  nextFollowUp: string;
  createdAt: string;
  updatedAt: string;
}

/* ------------------------------------------------------------------ */
/* Deal                                                                 */
/* ------------------------------------------------------------------ */

export interface Deal {
  id: string;
  name: string;
  companyId: string;
  companyName: string;
  primaryContactId: string;
  primaryContactName: string;
  pipelineId: string;
  stage: DealStage;
  value: number;
  probability: number;
  cost: number;
  expectedCloseDate: string;
  ownerId: string;
  ownerName: string;
  source: LeadSource;
  campaign: string;
  products: string;
  tags: string[];
  notes: string;
  priority: DealPriority;
  createdAt: string;
  updatedAt: string;
}

/* ------------------------------------------------------------------ */
/* Task                                                                 */
/* ------------------------------------------------------------------ */

export interface CrmTask {
  id: string;
  title: string;
  description: string;
  type: TaskType;
  priority: TaskPriority;
  status: TaskStatus;
  assigneeId: string;
  assigneeName: string;
  dueDate: string;
  dueTime: string;
  reminder: string;
  relatedLeadId?: string;
  relatedLeadName?: string;
  relatedContactId?: string;
  relatedContactName?: string;
  relatedDealId?: string;
  relatedDealName?: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

/* ------------------------------------------------------------------ */
/* Activity / Timeline                                                  */
/* ------------------------------------------------------------------ */

export interface CrmActivity {
  id: string;
  type: ActivityType;
  actor: string;
  actorInitials: string;
  description: string;
  oldValue?: string;
  newValue?: string;
  entityId: string;
  entityType: "lead" | "contact" | "deal" | "task";
  createdAt: string;
}

/* ------------------------------------------------------------------ */
/* Pipeline                                                             */
/* ------------------------------------------------------------------ */

export interface Pipeline {
  id: string;
  name: string;
  stages: DealStage[];
}

export const DEFAULT_PIPELINE: Pipeline = {
  id: "pipeline_1",
  name: "Sales Pipeline",
  stages: ["new", "qualified", "discovery", "proposal", "negotiation", "won", "lost"],
};

/* ------------------------------------------------------------------ */
/* Contact Group / Segment                                              */
/* ------------------------------------------------------------------ */

export interface ContactGroup {
  id: string;
  name: string;
  description: string;
  contactCount: number;
  createdAt: string;
}

/* ------------------------------------------------------------------ */
/* CRM Analytics                                                        */
/* ------------------------------------------------------------------ */

export interface CrmKpi {
  label: string;
  value: string;
  delta: { changePercent: number; direction: "up-is-good" | "down-is-good" };
  comparisonLabel?: string;
  hint?: string;
}

export interface PipelineStageAnalytics {
  label: string;
  count: number;
  value: string;
  conversionRate: number;
}

/* ------------------------------------------------------------------ */
/* View modes                                                           */
/* ------------------------------------------------------------------ */

export type ContactViewMode = "list" | "grid";
export type TaskViewMode = "list" | "board" | "calendar";
