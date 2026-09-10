import type { EntityRef, StatusRegistry } from "@/types/common";
import type { IntegrationProvider } from "./integration";

export const PROJECT_STATUS = {
  active: { label: "Active", tone: "success" },
  onboarding: { label: "Onboarding", tone: "info", description: "Channels not fully connected" },
  paused: { label: "Paused", tone: "neutral" },
  archived: { label: "Archived", tone: "neutral" },
} as const satisfies StatusRegistry<string>;

export type Clientstatus = keyof typeof PROJECT_STATUS;

export const SEO_HEALTH_BAND = {
  good: { label: "Good", tone: "success" },
  fair: { label: "Fair", tone: "warning" },
  poor: { label: "Poor", tone: "danger" },
  not_crawled: { label: "Not Crawled", tone: "neutral" },
} as const satisfies StatusRegistry<string>;

export type SeoHealthBand = keyof typeof SEO_HEALTH_BAND;

export interface Project {
  id: string;
  name: string;
  company: EntityRef;
  status: Clientstatus;
  websiteUrl: string | null;
  connectedChannels: IntegrationProvider[];
  disconnectedChannels: IntegrationProvider[];
  leadsLast30Days: number;
  seoScore: number | null;
  seoHealth: SeoHealthBand;
  openSeoIssues: number;
  scheduledPosts: number;
  failedPosts: number;
  lastActivityAt: string;
  createdAt: string;
}

export interface ProjectFilters {
  status: Clientstatus;
  seoHealth: SeoHealthBand;
  companyId: string;
  hasIntegrationIssue: string;
}

export type ClientsortField =
  | "name"
  | "company"
  | "status"
  | "leadsLast30Days"
  | "seoScore"
  | "lastActivityAt"
  | "createdAt";
