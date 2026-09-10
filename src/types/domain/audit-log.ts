import type { EntityRef, StatusRegistry } from "@/types/common";

export const AUDIT_CATEGORY = {
  auth: { label: "Authentication", tone: "neutral" },
  company: { label: "Company", tone: "neutral" },
  user: { label: "User", tone: "neutral" },
  billing: { label: "Billing", tone: "neutral" },
  integration: { label: "Integration", tone: "neutral" },
  platform: { label: "Platform", tone: "neutral" },
  security: { label: "Security", tone: "warning" },
} as const satisfies StatusRegistry<string>;

export type AuditCategory = keyof typeof AUDIT_CATEGORY;

export const AUDIT_OUTCOME = {
  success: { label: "Success", tone: "success" },
  failure: { label: "Failure", tone: "danger" },
  denied: { label: "Denied", tone: "warning" },
} as const satisfies StatusRegistry<string>;

export type AuditOutcome = keyof typeof AUDIT_OUTCOME;

export interface AuditLogEntry {
  id: string;
  actor: {
    id: string;
    name: string;
    email: string;
    type: "internal" | "customer" | "system";
  };
  action: string;
  category: AuditCategory;
  outcome: AuditOutcome;
  resource: {
    type: string;
    id: string;
    label: string;
  };
  company: EntityRef | null;
  ipAddress: string;
  userAgent: string;
  metadata: Record<string, string | number | boolean>;
  createdAt: string;
}

export interface AuditLogFilters {
  category: AuditCategory;
  outcome: AuditOutcome;
  actorType: "internal" | "customer" | "system";
  companyId: string;
  dateFrom: string;
  dateTo: string;
}

export type AuditLogSortField = "createdAt" | "actor" | "action" | "category";
