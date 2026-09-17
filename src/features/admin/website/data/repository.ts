/**
 * The single door between the Website UI and its data.
 *
 * Components and hooks call the repository; the repository calls whichever
 * provider the current mode selects. Swapping the mock for real services is a
 * one-line change here, with no edits anywhere in the UI.
 */

import { WEBSITE_MOCK_MODE } from "./config";
import { MockWebsiteProvider, UnavailableWebsiteProvider } from "./mock-provider";
import { findClientProfile } from "./mock-dataset";
import type {
  IntegrationKey,
  IssueStatus,
  ScanType,
  WebsiteDataProvider,
  WebsiteSettings,
} from "./types";

let provider: WebsiteDataProvider | null = null;

function getProvider(): WebsiteDataProvider {
  if (!provider) {
    provider = WEBSITE_MOCK_MODE ? new MockWebsiteProvider() : new UnavailableWebsiteProvider();
  }
  return provider;
}

/** Test seam — lets a future integration test inject an HTTP provider. */
export function setWebsiteProvider(next: WebsiteDataProvider | null) {
  provider = next;
}

export const websiteRepository = {
  get mode() {
    return getProvider().id;
  },

  /**
   * Resolves the website URL saved on the Client Profile. Returns null when the
   * client has no website — the module shows the "no website configured" state
   * rather than asking for a URL it does not own.
   */
  resolveClientWebsite(clientId: string): { clientName: string; domain: string | null } | null {
    const profile = findClientProfile(clientId);
    if (!profile) return null;
    return { clientName: profile.clientName, domain: profile.domain };
  },

  getTarget: (clientId: string) => getProvider().getTarget(clientId),
  getCapabilities: (clientId: string) => getProvider().getCapabilities(clientId),
  getSummary: (clientId: string) => getProvider().getSummary(clientId),
  getTrend: (clientId: string, days: 7 | 30 | 90) => getProvider().getTrend(clientId, days),
  getTechnologies: (clientId: string) => getProvider().getTechnologies(clientId),
  getScans: (clientId: string) => getProvider().getScans(clientId),
  getPages: (clientId: string) => getProvider().getPages(clientId),
  getPageAudit: (clientId: string, pageId: string) => getProvider().getPageAudit(clientId, pageId),
  getIssues: (clientId: string) => getProvider().getIssues(clientId),
  getFixGuide: (guideId: string) => getProvider().getFixGuide(guideId),
  getSeo: (clientId: string) => getProvider().getSeo(clientId),
  getPerformance: (clientId: string) => getProvider().getPerformance(clientId),
  getAnalytics: (clientId: string, period: string) => getProvider().getAnalytics(clientId, period),
  getForms: (clientId: string) => getProvider().getForms(clientId),
  getMonitoring: (clientId: string) => getProvider().getMonitoring(clientId),
  getSettings: (clientId: string) => getProvider().getSettings(clientId),

  startScan: (clientId: string, type: ScanType, pageId?: string) =>
    getProvider().startScan(clientId, type, pageId),
  getScanProgress: (clientId: string, scanId: string) => getProvider().getScanProgress(clientId, scanId),
  saveSettings: (clientId: string, settings: WebsiteSettings) =>
    getProvider().saveSettings(clientId, settings),
  setIssueStatus: (clientId: string, issueId: string, status: IssueStatus) =>
    getProvider().setIssueStatus(clientId, issueId, status),
  connectIntegration: (clientId: string, key: IntegrationKey, property: string) =>
    getProvider().connectIntegration(clientId, key, property),
  disconnectIntegration: (clientId: string, key: IntegrationKey) =>
    getProvider().disconnectIntegration(clientId, key),
  archiveMonitoring: (clientId: string, archived: boolean) =>
    getProvider().archiveMonitoring(clientId, archived),
};

/** React Query cache keys, namespaced per client. */
export const websiteKeys = {
  all: ["website"] as const,
  client: (clientId: string) => ["website", clientId] as const,
  target: (clientId: string) => ["website", clientId, "target"] as const,
  capabilities: (clientId: string) => ["website", clientId, "capabilities"] as const,
  summary: (clientId: string) => ["website", clientId, "summary"] as const,
  trend: (clientId: string, days: number) => ["website", clientId, "trend", days] as const,
  technologies: (clientId: string) => ["website", clientId, "technologies"] as const,
  scans: (clientId: string) => ["website", clientId, "scans"] as const,
  pages: (clientId: string) => ["website", clientId, "pages"] as const,
  pageAudit: (clientId: string, pageId: string) => ["website", clientId, "page", pageId] as const,
  issues: (clientId: string) => ["website", clientId, "issues"] as const,
  fixGuide: (guideId: string) => ["website", "fix-guide", guideId] as const,
  seo: (clientId: string) => ["website", clientId, "seo"] as const,
  performance: (clientId: string) => ["website", clientId, "performance"] as const,
  analytics: (clientId: string, period: string) => ["website", clientId, "analytics", period] as const,
  forms: (clientId: string) => ["website", clientId, "forms"] as const,
  monitoring: (clientId: string) => ["website", clientId, "monitoring"] as const,
  settings: (clientId: string) => ["website", clientId, "settings"] as const,
};
