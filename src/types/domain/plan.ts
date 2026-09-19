import type { StatusRegistry } from "@/types/common";

export const PLAN_TIER = {
  starter: { label: "Starter", tone: "neutral" },
  growth: { label: "Growth", tone: "info" },
  agency: { label: "Agency", tone: "brand" },
  enterprise: { label: "Enterprise", tone: "success" },
} as const satisfies StatusRegistry<string>;

export type PlanTier = keyof typeof PLAN_TIER;
/** A plan key: a core tier or a plan created in the Plans & Subscriptions module. */
export type PlanKey = PlanTier | (string & {});
export const QUOTA_METRICS = {
  Clients: { label: "Clients", unit: "Clients" },
  users: { label: "Team Members", unit: "users" },
  channels: { label: "Connected Channels", unit: "channels" },
  seoPages: { label: "SEO Pages Crawled", unit: "pages" },
  aiCredits: { label: "AI Credits", unit: "credits" },
  automationRuns: { label: "Automation Runs", unit: "runs" },
  storageGb: { label: "Storage", unit: "GB" },
  reports: { label: "Reports", unit: "reports" },
  whatsappMessages: { label: "WhatsApp Messages", unit: "messages" },
  apiCalls: { label: "API Calls", unit: "calls" },
} as const;

export type QuotaMetric = keyof typeof QUOTA_METRICS;

export type QuotaLimits = Record<QuotaMetric, number | null>;

export interface Plan {
  id: string;
  /** Stable plan key. The four core tiers keep their names; plans created later get their own. */
  tier: PlanKey;
  name: string;
  description: string;
  isPublic: boolean;
  isArchived: boolean;
  monthlyPriceMinor: number;
  annualPriceMinor: number;
  currency: string;
  trialDays: number;
  limits: QuotaLimits;
  features: string[];
  subscriberCount: number;
  updatedAt: string;
}
