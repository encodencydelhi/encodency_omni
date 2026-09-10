import type { EntityRef, StatusRegistry } from "@/types/common";
import type { PlanTier } from "./plan";

export const COMPANY_STATUS = {
  active: { label: "Active", tone: "success" },
  trial: { label: "Trial", tone: "info", description: "In an evaluation period" },
  past_due: { label: "Past Due", tone: "warning", description: "Payment failed, grace period active" },
  suspended: { label: "Suspended", tone: "danger", description: "Access revoked by an administrator" },
  churned: { label: "Churned", tone: "neutral" },
} as const satisfies StatusRegistry<string>;

export type CompanyStatus = keyof typeof COMPANY_STATUS;

export interface ChannelSummary {
  connected: number;
  degraded: number;
  disconnected: number;
}

export interface Company {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  status: CompanyStatus;
  planTier: PlanTier;
  industry: string;
  country: string;
  timezone: string;
  website: string | null;
  primaryContact: {
    name: string;
    email: string;
    phone: string | null;
  };
  counts: {
    Clients: number;
    users: number;
  };
  channels: ChannelSummary;
  usagePercent: number;
  mrrMinor: number;
  currency: string;
  createdAt: string;
  lastActivityAt: string;
}

export interface CompanyFilters {
  status: CompanyStatus;
  planTier: PlanTier;
  createdFrom: string;
  createdTo: string;
}

export type CompanySortField =
  | "name"
  | "status"
  | "planTier"
  | "Clients"
  | "users"
  | "usagePercent"
  | "createdAt"
  | "lastActivityAt";

export interface ChangeCompanyPlanInput {
  companyId: string;
  planTier: PlanTier;
  effective: "immediately" | "next_cycle";
  note?: string;
}

export interface CompanyStatusChangeInput {
  companyId: string;
  status: Extract<CompanyStatus, "active" | "suspended">;
  reason?: string;
}

export interface CompanyActivityEntry {
  id: string;
  actor: string;
  action: string;
  target: string;
  createdAt: string;
}

export interface CompanyOverview {
  company: Company;
  Clients: EntityRef[];
  recentActivity: CompanyActivityEntry[];
  subscriptionSummary: {
    planName: string;
    billingCycle: string;
    renewsAt: string;
    amountMinor: number;
    currency: string;
  };
}
