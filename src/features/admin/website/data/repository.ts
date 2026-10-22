/**
 * The single door between the Website UI and its data.
 *
 * Components and hooks call the repository; the repository calls whichever
 * provider the current mode selects. Swapping the mock for real services is a
 * one-line change here, with no edits anywhere in the UI.
 */

import { WEBSITE_MOCK_MODE } from "./config";
import { MockWebsiteProvider, UnavailableWebsiteProvider } from "./mock-provider";
import { LiveWebsiteProvider } from "./live-provider";
import type {
  IntegrationKey,
  IssueStatus,
  ScanType,
  GenerateReportInput,
  ReportScheduleInput,
  ScanStartOptions,
  SearchPeriod,
  SheetsDataset,
  AiRecommendationStatus,
  WebsiteDataProvider,
  WebsiteSettings,
} from "./types";

let provider: WebsiteDataProvider | null = null;

function getProvider(): WebsiteDataProvider {
  if (!provider) {
    provider = WEBSITE_MOCK_MODE ? new MockWebsiteProvider() : new LiveWebsiteProvider();
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
    return null;
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
  getKeywordResearch: (clientId: string, period?: SearchPeriod) => getProvider().getKeywordResearch(clientId, period),
  getSearchConsole: (clientId: string, period: SearchPeriod, refresh?: boolean) => getProvider().getSearchConsole(clientId, period, refresh),
  getSearchQueryDetail: (clientId: string, query: string, period: SearchPeriod) => getProvider().getSearchQueryDetail(clientId, query, period),
  getCompetitorAnalysis: (clientId: string) => getProvider().getCompetitorAnalysis(clientId),
  addCompetitor: (clientId: string, url: string) => getProvider().addCompetitor(clientId, url),
  analyzeCompetitor: (clientId: string, id: string) => getProvider().analyzeCompetitor(clientId, id),
  analyzeCompetitorWithAi: (clientId: string, id: string) => getProvider().analyzeCompetitorWithAi(clientId, id),
  deleteCompetitor: (clientId: string, id: string) => getProvider().deleteCompetitor(clientId, id),
  getTracking: (clientId: string, period: string) => getProvider().getTracking(clientId, period),
  getTrackingSnippet: (clientId: string) => getProvider().getTrackingSnippet(clientId),
  verifyTracking: (clientId: string) => getProvider().verifyTracking(clientId),
  updateTrackingSettings: (clientId: string, settings: Parameters<WebsiteDataProvider["updateTrackingSettings"]>[1]) =>
    getProvider().updateTrackingSettings(clientId, settings),
  getBacklinkAnalysis: (clientId: string) => getProvider().getBacklinkAnalysis(clientId),
  getRankTracking: (clientId: string, period?: SearchPeriod) => getProvider().getRankTracking(clientId, period),
  getSheets: (clientId: string) => getProvider().getSheets(clientId),
  connectSheets: (clientId: string, url: string) => getProvider().connectSheets(clientId, url),
  disconnectSheets: (clientId: string) => getProvider().disconnectSheets(clientId),
  exportToSheets: (clientId: string, dataset: SheetsDataset, period: SearchPeriod) => getProvider().exportToSheets(clientId, dataset, period),
  getCrawlLimits: (clientId: string) => getProvider().getCrawlLimits(clientId),
  getPagePerformance: (clientId: string, pageId: string) => getProvider().getPagePerformance(clientId, pageId),
  getPageSearch: (clientId: string, pageId: string, refresh?: boolean) => getProvider().getPageSearch(clientId, pageId, refresh),
  getPageInspection: (clientId: string, pageId: string) => getProvider().getPageInspection(clientId, pageId),
  inspectPage: (clientId: string, pageId: string) => getProvider().inspectPage(clientId, pageId),
  getPageHistory: (clientId: string, pageId: string) => getProvider().getPageHistory(clientId, pageId),

  startScan: (clientId: string, type: ScanType, pageId?: string, options?: ScanStartOptions) =>
    getProvider().startScan(clientId, type, pageId, options),
  getReportMeta: (clientId: string) => getProvider().getReportMeta(clientId),
  listReports: (clientId: string) => getProvider().listReports(clientId),
  getReport: (clientId: string, id: string) => getProvider().getReport(clientId, id),
  generateReport: (clientId: string, input: GenerateReportInput) => getProvider().generateReport(clientId, input),
  cancelReport: (clientId: string, id: string) => getProvider().cancelReport(clientId, id),
  deleteReport: (clientId: string, id: string) => getProvider().deleteReport(clientId, id),
  downloadReport: (clientId: string, id: string) => getProvider().downloadReport(clientId, id),
  listReportSchedules: (clientId: string) => getProvider().listReportSchedules(clientId),
  saveReportSchedule: (clientId: string, input: ReportScheduleInput, id?: string) => getProvider().saveReportSchedule(clientId, input, id),
  deleteReportSchedule: (clientId: string, id: string) => getProvider().deleteReportSchedule(clientId, id),
  getMonitoringOverview: (clientId: string) => getProvider().getMonitoringOverview(clientId),
  sendTestAlert: (clientId: string) => getProvider().sendTestAlert(clientId),
  getAiStatus: (clientId: string) => getProvider().getAiStatus(clientId),
  getAiSummary: (clientId: string) => getProvider().getAiSummary(clientId),
  getPageAi: (clientId: string, pageId: string) => getProvider().getPageAi(clientId, pageId),
  setAiRecommendationStatus: (clientId: string, id: string, status: AiRecommendationStatus) =>
    getProvider().setAiRecommendationStatus(clientId, id, status),
  getScanProgress: (clientId: string, scanId: string) => getProvider().getScanProgress(clientId, scanId),
  cancelScan: (clientId: string, scanId: string) => getProvider().cancelScan(clientId, scanId),
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
  keywordResearch: (clientId: string, period: SearchPeriod = "28d") => ["website", clientId, "keyword-research", period] as const,
  searchConsole: (clientId: string, period: SearchPeriod) => ["website", clientId, "search-console", period] as const,
  sheets: (clientId: string) => ["website", clientId, "sheets"] as const,
  searchQuery: (clientId: string, query: string, period: SearchPeriod) => ["website", clientId, "search-console-query", query, period] as const,
  competitorAnalysis: (clientId: string) => ["website", clientId, "competitor-analysis"] as const,
  tracking: (clientId: string, period: string) => ["website", clientId, "tracking", period] as const,
  trackingSnippet: (clientId: string) => ["website", clientId, "tracking-snippet"] as const,
  backlinkAnalysis: (clientId: string) => ["website", clientId, "backlink-analysis"] as const,
  rankTracking: (clientId: string, period: SearchPeriod = "28d") => ["website", clientId, "rank-tracking", period] as const,
  crawlLimits: (clientId: string) => ["website", clientId, "crawl-limits"] as const,
  pagePerformance: (clientId: string, pageId: string) => ["website", clientId, "page-performance", pageId] as const,
  pageSearch: (clientId: string, pageId: string) => ["website", clientId, "page-search", pageId] as const,
  pageInspection: (clientId: string, pageId: string) => ["website", clientId, "page-inspection", pageId] as const,
  pageHistory: (clientId: string, pageId: string) => ["website", clientId, "page-history", pageId] as const,
};
