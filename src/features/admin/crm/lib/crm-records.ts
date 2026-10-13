import type {
  Contact, ContactStatus, CrmActivity, ContactGroup, Deal, DealPriority, DealStage, LeadSource, Pipeline,
} from "../types";

export const CONTACT_STATUSES: ContactStatus[] = ["active", "inactive", "lead", "customer", "prospect"];
export const CONTACT_STATUS_LABELS: Record<ContactStatus, string> = {
  active: "Active", inactive: "Inactive", lead: "Lead", customer: "Customer", prospect: "Prospect",
};

export const DEAL_STAGES: DealStage[] = ["new", "qualified", "discovery", "proposal", "negotiation", "won", "lost"];
export const DEAL_STAGE_LABELS: Record<DealStage, string> = {
  new: "New", qualified: "Qualified", discovery: "Discovery", proposal: "Proposal",
  negotiation: "Negotiation", won: "Won", lost: "Lost",
};
export const DEAL_PRIORITIES: DealPriority[] = ["low", "medium", "high"];
export const DEAL_SOURCES: LeadSource[] = ["website", "google", "facebook", "instagram", "linkedin", "referral", "campaign", "import", "manual", "other"];

/** Built-in pipeline: always present, never stored, so existing deals never lose their pipeline. */
export const DEFAULT_PIPELINE_ID = "pipeline_1";
export const BUILTIN_PIPELINE: Pipeline = {
  id: DEFAULT_PIPELINE_ID,
  name: "Sales Pipeline",
  stages: ["new", "qualified", "discovery", "proposal", "negotiation", "won", "lost"],
};

export function newId(prefix: string): string {
  return `${prefix}${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "The request could not be completed.";
}

export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function text(value: unknown): string {
  return value === undefined || value === null ? "" : String(value);
}

function list(value: unknown): string[] {
  return Array.isArray(value) ? value.map(String).filter(Boolean) : [];
}

function finite(value: unknown, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export function normalizeContact(raw: Partial<Contact>): Contact {
  const now = new Date().toISOString();
  return {
    id: text(raw.id), firstName: text(raw.firstName), lastName: text(raw.lastName), email: text(raw.email),
    phone: text(raw.phone), alternatePhone: raw.alternatePhone ? text(raw.alternatePhone) : undefined,
    company: text(raw.company), companyId: text(raw.companyId), role: text(raw.role), department: text(raw.department),
    website: text(raw.website), linkedIn: text(raw.linkedIn), location: text(raw.location),
    streetAddress: text(raw.streetAddress), city: text(raw.city), state: text(raw.state), zipCode: text(raw.zipCode),
    country: text(raw.country), ownerId: text(raw.ownerId), ownerName: text(raw.ownerName) || "Unassigned",
    tags: list(raw.tags), groups: list(raw.groups),
    status: CONTACT_STATUSES.includes(raw.status as ContactStatus) ? (raw.status as ContactStatus) : "lead",
    notes: text(raw.notes), sourceLeadId: raw.sourceLeadId ? text(raw.sourceLeadId) : undefined,
    lastContacted: text(raw.lastContacted), nextFollowUp: text(raw.nextFollowUp),
    createdAt: text(raw.createdAt) || now, updatedAt: text(raw.updatedAt) || now,
  };
}

export function normalizeDeal(raw: Partial<Deal>): Deal {
  const now = new Date().toISOString();
  return {
    id: text(raw.id), name: text(raw.name) || "Untitled deal", companyId: text(raw.companyId),
    companyName: text(raw.companyName), primaryContactId: text(raw.primaryContactId),
    primaryContactName: text(raw.primaryContactName), pipelineId: text(raw.pipelineId) || DEFAULT_PIPELINE_ID,
    stage: DEAL_STAGES.includes(raw.stage as DealStage) ? (raw.stage as DealStage) : "new",
    value: Math.max(0, finite(raw.value, 0)), probability: Math.min(100, Math.max(0, finite(raw.probability, 20))),
    cost: Math.max(0, finite(raw.cost, 0)), expectedCloseDate: text(raw.expectedCloseDate),
    ownerId: text(raw.ownerId), ownerName: text(raw.ownerName) || "Unassigned",
    source: DEAL_SOURCES.includes(raw.source as LeadSource) ? (raw.source as LeadSource) : "manual",
    campaign: text(raw.campaign), products: text(raw.products), tags: list(raw.tags), notes: text(raw.notes),
    priority: DEAL_PRIORITIES.includes(raw.priority as DealPriority) ? (raw.priority as DealPriority) : "medium",
    lostReason: raw.lostReason ? text(raw.lostReason) : undefined,
    createdAt: text(raw.createdAt) || now, updatedAt: text(raw.updatedAt) || now,
  };
}

export function normalizeActivity(raw: Partial<CrmActivity>): CrmActivity {
  return {
    id: text(raw.id), type: raw.type ?? "note_added", actor: text(raw.actor) || "Team member",
    actorInitials: text(raw.actorInitials) || "TM", description: text(raw.description) || "Activity recorded",
    oldValue: raw.oldValue, newValue: raw.newValue, entityId: text(raw.entityId),
    entityType: raw.entityType ?? "contact", createdAt: text(raw.createdAt) || new Date().toISOString(),
  };
}

export function normalizeGroup(raw: Partial<ContactGroup>): ContactGroup {
  return {
    id: text(raw.id), name: text(raw.name), description: text(raw.description),
    contactCount: finite(raw.contactCount, 0), createdAt: text(raw.createdAt) || new Date().toISOString(),
  };
}

/** Keeps only valid, de-duplicated stages and guarantees the terminal won/lost columns exist. */
export function normalizePipeline(raw: Partial<Pipeline>): Pipeline {
  const stages = Array.from(new Set(list(raw.stages).filter((s): s is DealStage => DEAL_STAGES.includes(s as DealStage))));
  const open = stages.filter((s) => s !== "won" && s !== "lost");
  return {
    id: text(raw.id),
    name: text(raw.name) || "Pipeline",
    stages: [...(open.length ? open : (["new"] as DealStage[])), "won", "lost"],
    isDefault: raw.isDefault === true ? true : undefined,
  };
}

/**
 * Pipelines to show: the default first (the user's renamed / re-staged version if
 * one is stored, else the built-in), then every other stored pipeline.
 * Deals always keep pipelineId "pipeline_1" for the default.
 */
export function resolvePipelines(stored: Pipeline[]): Pipeline[] {
  const override = stored.find((p) => p.isDefault);
  const base: Pipeline = override ? { ...override, id: DEFAULT_PIPELINE_ID } : BUILTIN_PIPELINE;
  return [base, ...stored.filter((p) => !p.isDefault)];
}

export function formatInr(value: number): string {
  if (!Number.isFinite(value)) return "₹0";
  const abs = Math.abs(value);
  if (abs >= 1e7) return `₹${(value / 1e7).toFixed(1)}Cr`;
  if (abs >= 1e5) return `₹${(value / 1e5).toFixed(1)}L`;
  if (abs >= 1e3) return `₹${(value / 1e3).toFixed(0)}K`;
  return `₹${Math.round(value)}`;
}

export function shortDate(value: string | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function initialsOf(name: string): string {
  return name.split(/\s+/).filter(Boolean).map((part) => part[0]).join("").slice(0, 2).toUpperCase() || "TM";
}
