import { apiClient } from '@/lib/api/client';
import { companyScopeHeaders } from '@/lib/api/company-scope';
import { getStoredClientId, getStoredCompanyId } from '@/lib/api/tenancy-storage';
import { env } from '@/config/env';
import type { GenerateReportInput, IntegrationKey, IssueStatus, ReportScheduleInput, ScanStartOptions, ScanType, SearchPeriod, SheetsDataset, TrackingSettings, WebsiteDataProvider, WebsiteSettings } from './types';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function getStoredClientIdSafe(): string {
  if (typeof localStorage === 'undefined') return getStoredClientId() ?? '';
  return localStorage.getItem('omni_active_client_id') ?? getStoredClientId() ?? '';
}

function headers(clientId: string) {
  const targetId = clientId && UUID_PATTERN.test(clientId) ? clientId : getStoredClientIdSafe();
  const companyId = getStoredCompanyId();
  const h: Record<string, string> = {};
  if (companyId && UUID_PATTERN.test(companyId)) {
    h['x-company-id'] = companyId;
  }
  if (targetId && UUID_PATTERN.test(targetId)) {
    h['x-client-id'] = targetId;
  }
  return h;
}

export interface BrandEntity {
  id: string;
  name: string;
  types: string[];
  description: string | null;
  url: string | null;
  wikipediaUrl: string | null;
  summary: string | null;
  imageUrl: string | null;
  score: number;
}

export interface BrandPresence {
  status: 'matched' | 'possible' | 'not_found' | 'unavailable';
  query: string;
  websiteHost: string | null;
  checkedAt: string;
  entity: BrandEntity | null;
  others: BrandEntity[];
  failure: { code: string; message: string } | null;
  cached: boolean;
}

/** GET /website/brand-presence: does Google's Knowledge Graph know the client as a business? `refresh` re-checks now. */
export function fetchBrandPresence(clientId: string, refresh = false): Promise<BrandPresence> {
  return apiClient.request<BrandPresence>({
    method: 'GET',
    path: '/website/brand-presence',
    headers: headers(clientId),
    query: refresh ? { refresh: '1' } : undefined,
  });
}

export interface BusinessResearch {
  query: string;
  checkedAt: string;
  cached: boolean;
  brands: { status: 'ok' | 'unavailable'; items: BrandEntity[]; failure: { code: string; message: string } | null };
}

/** GET /website/research: any brand or company name, from Google's Knowledge Graph. */
export function fetchBusinessResearch(clientId: string, q: string): Promise<BusinessResearch> {
  return apiClient.request<BusinessResearch>({ method: 'GET', path: '/website/research', headers: headers(clientId), query: { q } });
}

function get<T>(clientId: string, section: string, query?: Record<string, string>) {
  return apiClient.request<T>({
    method: 'GET',
    path: `/website/${section}`,
    headers: headers(clientId),
    query,
  });
}

export class LiveWebsiteProvider implements WebsiteDataProvider {
  readonly id = 'live' as const;

  getTarget = (id: string) => get<any>(id, 'target');
  getCapabilities = (id: string) => get<any>(id, 'capabilities');
  getSummary = (id: string) => get<any>(id, 'summary');
  getTrend = (id: string, days: 7 | 30 | 90) => get<any>(id, 'trend', { days: String(days) });
  getTechnologies = (id: string) => get<any>(id, 'technologies');
  getScans = (id: string) => get<any>(id, 'scans');
  getPages = (id: string) => get<any>(id, 'pages');
  getPageAudit = (id: string, pageId: string) => get<any>(id, `pages/${encodeURIComponent(pageId)}`);
  getIssues = (id: string) => get<any>(id, 'issues');

  getFixGuide = (guideId: string) => {
    const companyId = getStoredCompanyId();
    const clientId = getStoredClientIdSafe();
    const h: Record<string, string> = {};
    if (companyId) h['x-company-id'] = companyId;
    if (clientId) h['x-client-id'] = clientId;
    return apiClient.request<any>({
      method: 'GET',
      path: `/website/fix-guides/${encodeURIComponent(guideId)}`,
      headers: h,
    });
  };

  getSeo = (id: string) => get<any>(id, 'seo');
  getPerformance = (id: string) => get<any>(id, 'performance');
  getAnalytics = (id: string, period: string) => get<any>(id, 'analytics', { period });
  getForms = (id: string) => get<any>(id, 'forms');
  getMonitoring = (id: string) => get<any>(id, 'monitoring');
  getSettings = (id: string) => get<any>(id, 'settings');
  getKeywordResearch = (id: string, period: SearchPeriod = '28d') => get<any>(id, 'keyword-research', { period });
  getSearchConsole = (id: string, period: SearchPeriod, refresh = false) => get<any>(id, 'search-console', refresh ? { period, refresh: '1' } : { period });
  getSearchQueryDetail = (id: string, query: string, period: SearchPeriod) => get<any>(id, 'search-console/query', { q: query, period });
  getCompetitorAnalysis = (id: string) => get<any>(id, 'competitor-analysis');
  addCompetitor = (id: string, url: string) => apiClient.request<any>({ method: 'POST', path: '/website/competitors', headers: headers(id), body: { url } });
  analyzeCompetitor = (id: string, competitorId: string) => apiClient.request<any>({ method: 'POST', path: `/website/competitors/${encodeURIComponent(competitorId)}/analyze`, headers: headers(id), body: {} });
  analyzeCompetitorWithAi = (id: string, competitorId: string) => apiClient.request<any>({ method: 'POST', path: `/website/competitors/${encodeURIComponent(competitorId)}/ai`, headers: headers(id), body: {} });
  deleteCompetitor = (id: string, competitorId: string) => apiClient.request<any>({ method: 'DELETE', path: `/website/competitors/${encodeURIComponent(competitorId)}`, headers: headers(id) });
  getTracking = (id: string, period: string) => get<any>(id, 'tracking', { period });
  getTrackingSnippet = (id: string) => get<any>(id, 'tracking/snippet');
  verifyTracking = (id: string) => apiClient.request<any>({ method: 'POST', path: '/website/tracking/verify', headers: headers(id), body: {} });
  updateTrackingSettings = (id: string, settings: Partial<TrackingSettings>) =>
    apiClient.request<any>({ method: 'PATCH', path: '/website/tracking/settings', headers: headers(id), body: settings });
  getBacklinkAnalysis = (id: string) => get<any>(id, 'backlink-analysis');
  getRankTracking = (id: string, period: SearchPeriod = '28d') => get<any>(id, 'rank-tracking', { period });
  getSheets = (id: string) => get<any>(id, 'sheets');
  connectSheets = (id: string, url: string) => apiClient.request<any>({ method: 'PUT', path: '/website/sheets', headers: headers(id), body: { url } });
  disconnectSheets = (id: string) => apiClient.request<any>({ method: 'DELETE', path: '/website/sheets', headers: headers(id) });
  exportToSheets = (id: string, dataset: SheetsDataset, period: SearchPeriod) => apiClient.request<any>({ method: 'POST', path: '/website/sheets/export', headers: headers(id), body: { dataset, period } });
  getCrawlLimits = (id: string) => get<any>(id, 'crawl-limits');
  getPagePerformance = (id: string, pageId: string) => get<any>(id, `pages/${encodeURIComponent(pageId)}/performance`);
  getPageSearch = (id: string, pageId: string, refresh = false) =>
    get<any>(id, `pages/${encodeURIComponent(pageId)}/search`, refresh ? { refresh: 'true' } : undefined);
  getPageInspection = (id: string, pageId: string) => get<any>(id, `pages/${encodeURIComponent(pageId)}/inspection`);
  inspectPage = (id: string, pageId: string) =>
    apiClient.request<any>({ method: 'POST', path: `/website/pages/${encodeURIComponent(pageId)}/inspect`, headers: headers(id), body: {} });
  getPageHistory = (id: string, pageId: string) => get<any>(id, `pages/${encodeURIComponent(pageId)}/history`);

  startScan = (id: string, type: ScanType, pageId?: string, options?: ScanStartOptions) =>
    apiClient.request<any>({
      method: 'POST',
      path: '/website/scans/start',
      headers: headers(id),
      body: { type, pageId, ...(options ?? {}) },
    });

  getReportMeta = (id: string) => get<any>(id, 'reports/meta');
  listReports = (id: string) => get<any>(id, 'reports');
  getReport = (id: string, reportId: string) => get<any>(id, `reports/${encodeURIComponent(reportId)}`);
  generateReport = (id: string, input: GenerateReportInput) =>
    apiClient.request<any>({ method: 'POST', path: '/website/reports', headers: headers(id), body: input });
  cancelReport = (id: string, reportId: string) =>
    apiClient.request<any>({ method: 'POST', path: `/website/reports/${encodeURIComponent(reportId)}/cancel`, headers: headers(id), body: {} });
  deleteReport = (id: string, reportId: string) =>
    apiClient.request<any>({ method: 'DELETE', path: `/website/reports/${encodeURIComponent(reportId)}`, headers: headers(id) });
  listReportSchedules = (id: string) => get<any>(id, 'reports/schedules');
  saveReportSchedule = (id: string, input: ReportScheduleInput, scheduleId?: string) =>
    apiClient.request<any>({
      method: scheduleId ? 'PUT' : 'POST',
      path: scheduleId ? `/website/reports/schedules/${encodeURIComponent(scheduleId)}` : '/website/reports/schedules',
      headers: headers(id),
      body: input,
    });
  deleteReportSchedule = (id: string, scheduleId: string) =>
    apiClient.request<any>({ method: 'DELETE', path: `/website/reports/schedules/${encodeURIComponent(scheduleId)}`, headers: headers(id) });
  /** The file is private: it is fetched with the session cookie and handed to the browser as a blob, never as a public URL. */
  downloadReport = async (id: string, reportId: string) => {
    const response = await fetch(`${env.apiBaseUrl}/website/reports/${encodeURIComponent(reportId)}/download`, {
      credentials: 'include',
      headers: { 'ngrok-skip-browser-warning': 'true', ...headers(id) },
    });
    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as { message?: string | string[] };
      throw new Error(Array.isArray(body.message) ? body.message.join(' ') : body.message ?? 'The report could not be downloaded.');
    }
    const disposition = response.headers.get('content-disposition') ?? '';
    const fileName = /filename="([^"]+)"/.exec(disposition)?.[1] ?? `report-${reportId}`;
    return { blob: await response.blob(), fileName };
  };
  getMonitoringOverview = (id: string) => get<any>(id, 'monitoring/overview');
  sendTestAlert = (id: string) => apiClient.request<any>({ method: 'POST', path: '/website/monitoring/test-alert', headers: headers(id), body: {} });
  getAiStatus = (id: string) => get<any>(id, 'ai/status');
  getAiSummary = (id: string) => get<any>(id, 'ai/summary');
  getPageAi = (id: string, pageId: string) => get<any>(id, `pages/${encodeURIComponent(pageId)}/ai`);
  setAiRecommendationStatus = (id: string, recId: string, status: string) =>
    apiClient.request<any>({ method: 'POST', path: `/website/ai/recommendations/${encodeURIComponent(recId)}/status`, headers: headers(id), body: { status } });

  cancelScan = (id: string, scanId: string) =>
    apiClient.request<any>({
      method: 'POST',
      path: `/website/scans/${encodeURIComponent(scanId)}/cancel`,
      headers: headers(id),
    });

  getScanProgress = (id: string, scanId: string) =>
    apiClient.request<any>({
      method: 'GET',
      path: `/website/scans/${encodeURIComponent(scanId)}/progress`,
      headers: headers(id),
    });

  saveSettings = (id: string, settings: WebsiteSettings) =>
    apiClient.request<WebsiteSettings>({
      method: 'PUT',
      path: '/website/settings/current',
      headers: headers(id),
      body: { settings },
    });

  setIssueStatus = (id: string, issueId: string, status: IssueStatus) =>
    apiClient.request<any>({
      method: 'PATCH',
      path: `/website/issues/${encodeURIComponent(issueId)}`,
      headers: headers(id),
      body: { status },
    });

  connectIntegration = (id: string, key: IntegrationKey, property: string) =>
    apiClient.request<any>({
      method: 'PATCH',
      path: '/website/integrations/current',
      headers: headers(id),
      body: { key, property, connected: true },
    });

  disconnectIntegration = (id: string, key: IntegrationKey) =>
    apiClient.request<any>({
      method: 'PATCH',
      path: '/website/integrations/current',
      headers: headers(id),
      body: { key, connected: false },
    });

  archiveMonitoring = async (id: string, archived: boolean) => {
    const current = await this.getSettings(id);
    return this.saveSettings(id, { ...current, monitoringArchived: archived });
  };
}
