/**
 * Rules for investigations. An investigation is an internal grouping of audit events for review;
 * it is not a confirmed incident, not a finding about anyone, and never modifies an event.
 */
import { STAFF } from "@/features/companies/data/mock/dataset";
import type { AuditEvent, CreateInvestigationInput, EventScope, Investigation, InvestigationStatus, OwnerOption, ValidationIssue } from "./types";

/** Only active staff whose role can read audit records may own a case. */
const OWNER_ROLES = new Set(["super_admin", "technical_admin", "support"]);

export function eligibleOwners(): OwnerOption[] {
  return STAFF.filter((member) => member.status === "active" && OWNER_ROLES.has(member.role)).map((member) => ({ id: member.id, name: member.name, role: member.role.split("_").map((word) => word[0]?.toUpperCase() + word.slice(1)).join(" ") }));
}

export function isEligibleOwner(id: string): boolean {
  return eligibleOwners().some((owner) => owner.id === id);
}

/** Whether an event may be linked to a case: same company for a company case, same client or company-wide for a client case. */
export function scopeCompatibility(scope: EventScope, event: AuditEvent): { ok: boolean; message: string } {
  if (scope.level === "platform") return { ok: true, message: "Platform cases accept events from any scope." };
  if (event.scope.level === "platform") return { ok: false, message: "This is a platform-wide event. It does not belong to the case's company scope." };
  if (event.scope.companyId !== scope.companyId) return { ok: false, message: `This event belongs to ${event.scope.companyName ?? "another company"}, not ${scope.companyName ?? "the case's company"}.` };
  if (scope.level === "client" && event.scope.clientId && event.scope.clientId !== scope.clientId) return { ok: false, message: `This event belongs to another client of ${scope.companyName}.` };
  return { ok: true, message: "Compatible with the case scope." };
}

export function validateCreate(input: CreateInvestigationInput, companyClients: (companyId: string) => Set<string>): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!input.title.trim()) issues.push({ field: "title", message: "Give the investigation a title." });
  else if (input.title.trim().length > 120) issues.push({ field: "title", message: "Keep the title under 120 characters." });
  if (input.description.length > 800) issues.push({ field: "description", message: "Keep the description under 800 characters." });
  if (input.scope.level !== "platform" && !input.scope.companyId) issues.push({ field: "scope", message: "Choose the company this investigation is about." });
  if (input.scope.level === "client") {
    if (!input.scope.clientId) issues.push({ field: "scope", message: "Choose the client." });
    else if (input.scope.companyId && !companyClients(input.scope.companyId).has(input.scope.clientId)) issues.push({ field: "scope", message: "That client does not belong to the chosen company." });
  }
  if (!input.ownerId) issues.push({ field: "ownerId", message: "Choose an internal owner." });
  else if (!isEligibleOwner(input.ownerId)) issues.push({ field: "ownerId", message: "That person cannot own an investigation." });
  return issues;
}

export const NEXT_STATUSES: Record<InvestigationStatus, InvestigationStatus[]> = {
  open: ["in_review", "awaiting_information", "closed"],
  in_review: ["open", "awaiting_information", "closed"],
  awaiting_information: ["open", "in_review", "closed"],
  closed: ["open"],
};

export function canTransition(from: InvestigationStatus, to: InvestigationStatus): boolean {
  return NEXT_STATUSES[from].includes(to);
}

export function isEditable(investigation: Investigation): boolean {
  return investigation.status !== "closed";
}

/** The label used for the compact "Case ID" everywhere. */
export const caseId = (sequence: number) => `INV-${String(sequence).padStart(4, "0")}`;
