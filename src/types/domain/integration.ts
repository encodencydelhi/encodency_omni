import type { StatusRegistry } from "@/types/common";
export const INTEGRATION_PROVIDER = {
  meta: { label: "Meta", category: "social" },
  instagram: { label: "Instagram", category: "social" },
  linkedin: { label: "LinkedIn", category: "social" },
  google_business: { label: "Google Business Profile", category: "local" },
  whatsapp: { label: "WhatsApp / AiSensy", category: "messaging" },
  youtube: { label: "YouTube", category: "video" },
  search_console: { label: "Search Console", category: "seo" },
  website_analytics: { label: "Website Analytics", category: "analytics" },
} as const;

export type IntegrationProvider = keyof typeof INTEGRATION_PROVIDER;

export const INTEGRATION_STATUS = {
  healthy: { label: "Healthy", tone: "success" },
  degraded: {
    label: "Degraded",
    tone: "warning",
    description: "Elevated error rate or delayed synchronisation",
  },
  token_expiring: {
    label: "Token Expiring",
    tone: "warning",
    description: "Access token expires within 14 days",
  },
  permission_issue: {
    label: "Permission Issue",
    tone: "warning",
    description: "A required scope was revoked by the platform",
  },
  disconnected: { label: "Disconnected", tone: "danger" },
} as const satisfies StatusRegistry<string>;

export type IntegrationStatus = keyof typeof INTEGRATION_STATUS;

export interface IntegrationHealth {
  provider: IntegrationProvider;
  status: IntegrationStatus;
  connectedAccounts: number;
  healthyAccounts: number;
  failedAccounts: number;
  affectedCompanies: number;
  lastSyncAt: string;
  errorRate: number;
  recentErrors: IntegrationError[];
}

export interface IntegrationError {
  id: string;
  code: string;
  message: string;
  companyName: string;
  occurredAt: string;
  occurrences: number;
}

export interface CompanyIntegration {
  id: string;
  provider: IntegrationProvider;
  status: IntegrationStatus;
  accountName: string;
  projectName: string;
  scopes: string[];
  tokenExpiresAt: string | null;
  lastSyncAt: string;
}
