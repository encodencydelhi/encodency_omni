/**
 * In-memory provider backed by the deterministic dataset.
 *
 * It behaves like a real service in every way the UI can observe: reads are
 * asynchronous and take time, commands mutate state that later reads see, and
 * a scan progresses through stages rather than completing instantly.
 *
 * It is deliberately *not* an HTTP route — there are no fake backend endpoints
 * anywhere in this module. When the crawler exists, a second provider with the
 * same shape replaces this one and nothing in the UI changes.
 */

import { MOCK_LATENCY_MS, MOCK_SCAN_DURATION_MS } from "./config";
import {
  buildDataset,
  findClientProfile,
  listFixGuides,
  type WebsiteDataset,
} from "./mock-dataset";
import {
  NoWebsiteConfiguredError,
  ServiceUnavailableError,
  type AnalyticsData,
  type FixGuide,
  type IntegrationKey,
  type IssueRecord,
  type IssueStatus,
  type PageAudit,
  type PageRecord,
  type ScanProgress,
  type ScanRecord,
  type ScanType,
  type SeoData,
  type TechnologyDetection,
  type TrendPoint,
  type WebsiteCapabilityState,
  type WebsiteDataProvider,
  type WebsiteSettings,
  type WebsiteSummary,
  type WebsiteTarget,
} from "./types";

const delay = (ms = MOCK_LATENCY_MS) => new Promise<void>((resolve) => setTimeout(resolve, ms));

const SCAN_STAGES: Record<ScanType, string[]> = {
  "full-crawl": [
    "Resolving DNS and TLS handshake",
    "Fetching robots.txt and sitemap.xml",
    "Discovering pages",
    "Auditing metadata and headings",
    "Checking links and redirects",
    "Measuring performance",
    "Detecting forms and CTAs",
    "Compiling issues",
  ],
  "seo-audit": [
    "Fetching robots.txt and sitemap.xml",
    "Auditing metadata",
    "Checking headings and images",
    "Validating structured data",
    "Compiling issues",
  ],
  performance: [
    "Loading pages on a simulated 4G connection",
    "Measuring Core Web Vitals",
    "Analysing resource weight",
    "Compiling recommendations",
  ],
  uptime: ["Checking origin from 3 regions", "Verifying certificate"],
  page: ["Fetching page", "Auditing metadata", "Measuring performance", "Compiling issues"],
};

interface ScanSession extends ScanProgress {
  /** Wall-clock start, used to derive progress without a timer. */
  startedAtMs: number;
  durationMs: number;
  clientId: string;
  totalPages: number;
  pageId?: string;
}

export class MockWebsiteProvider implements WebsiteDataProvider {
  readonly id = "mock" as const;

  private datasets = new Map<string, WebsiteDataset>();
  private scans = new Map<string, ScanSession>();

  private dataset(clientId: string): WebsiteDataset {
    const cached = this.datasets.get(clientId);
    if (cached) return cached;

    const profile = findClientProfile(clientId);
    if (!profile) throw new NoWebsiteConfiguredError(clientId);

    const built = buildDataset(profile);
    if (!built) throw new NoWebsiteConfiguredError(clientId);

    this.datasets.set(clientId, built);
    return built;
  }

  /* Reads ---------------------------------------------------------- */

  async getTarget(clientId: string): Promise<WebsiteTarget> {
    await delay();
    return this.dataset(clientId).target;
  }

  async getCapabilities(clientId: string): Promise<WebsiteCapabilityState> {
    await delay(120);
    return this.dataset(clientId).capabilities;
  }

  async getSummary(clientId: string): Promise<WebsiteSummary> {
    await delay();
    const data = this.dataset(clientId);
    const open = data.issues.filter((issue) => issue.status === "open");
    return {
      ...data.summary,
      target: data.target,
      openIssues: open.length,
      criticalIssues: open.filter((issue) => issue.severity === "critical").length,
    };
  }

  async getTrend(clientId: string, days: 7 | 30 | 90): Promise<TrendPoint[]> {
    await delay(180);
    return this.dataset(clientId).trend90.slice(-days);
  }

  async getTechnologies(clientId: string): Promise<TechnologyDetection[]> {
    await delay(160);
    return this.dataset(clientId).technologies;
  }

  async getScans(clientId: string): Promise<ScanRecord[]> {
    await delay(160);
    return this.dataset(clientId).scans;
  }

  async getPages(clientId: string): Promise<PageRecord[]> {
    await delay();
    return this.dataset(clientId).pages;
  }

  async getPageAudit(clientId: string, pageId: string): Promise<PageAudit> {
    await delay(320);
    const audit = this.dataset(clientId).audits[pageId];
    if (!audit) throw new Error(`No audit recorded for page "${pageId}".`);
    return audit;
  }

  async getIssues(clientId: string): Promise<IssueRecord[]> {
    await delay();
    return this.dataset(clientId).issues;
  }

  async getFixGuide(guideId: string): Promise<FixGuide> {
    await delay(140);
    const guide = listFixGuides().find((entry) => entry.id === guideId);
    if (!guide) throw new Error(`No fix guide published for "${guideId}".`);
    return guide;
  }

  async getSeo(clientId: string): Promise<SeoData> {
    await delay();
    return this.dataset(clientId).seo;
  }

  async getPerformance(clientId: string) {
    await delay();
    return this.dataset(clientId).performance;
  }

  async getAnalytics(clientId: string, period: string): Promise<AnalyticsData | null> {
    await delay(300);
    const data = this.dataset(clientId);
    if (data.capabilities.integrations.ga4.status !== "connected") return null;
    if (!data.analytics) return null;
    return { ...data.analytics, period };
  }

  async getForms(clientId: string) {
    await delay();
    return this.dataset(clientId).forms;
  }

  async getMonitoring(clientId: string) {
    await delay();
    return this.dataset(clientId).monitoring;
  }

  async getSettings(clientId: string): Promise<WebsiteSettings> {
    await delay(180);
    return this.dataset(clientId).settings;
  }

  /* Commands ------------------------------------------------------- */

  async startScan(clientId: string, type: ScanType, pageId?: string): Promise<ScanProgress> {
    const data = this.dataset(clientId);
    await delay(200);
    const scanId = `scan-${type}-${Date.now()}`;
    const durationMs = type === "uptime" ? 1800 : type === "page" ? 3200 : MOCK_SCAN_DURATION_MS;
    const session: ScanSession = {
      scanId,
      type,
      status: "running",
      progress: 0,
      stage: SCAN_STAGES[type][0] ?? "Starting",
      pagesScanned: 0,
      startedAt: new Date().toISOString(),
      startedAtMs: Date.now(),
      durationMs,
      clientId,
      totalPages: type === "page" ? 1 : data.pages.length,
      ...(pageId ? { pageId } : {}),
    };
    this.scans.set(`${clientId}:${scanId}`, session);
    return this.toProgress(session);
  }

  async getScanProgress(clientId: string, scanId: string): Promise<ScanProgress> {
    const session = this.scans.get(`${clientId}:${scanId}`);
    if (!session) throw new Error("That scan is no longer being tracked.");
    const progress = this.toProgress(session);
    if (progress.status === "completed" && session.status !== "completed") {
      session.status = "completed";
      this.completeScan(clientId, session);
    }
    return progress;
  }

  private toProgress(session: ScanSession): ScanProgress {
    const elapsed = Date.now() - session.startedAtMs;
    const ratio = Math.min(1, elapsed / session.durationMs);
    const stages = SCAN_STAGES[session.type];
    const stageIndex = Math.min(stages.length - 1, Math.floor(ratio * stages.length));
    return {
      scanId: session.scanId,
      type: session.type,
      status: ratio >= 1 ? "completed" : "running",
      progress: Math.round(ratio * 100),
      stage: ratio >= 1 ? "Finished" : (stages[stageIndex] ?? "Working"),
      pagesScanned: Math.round(ratio * session.totalPages),
      startedAt: session.startedAt,
    };
  }

  /** Writes the finished scan back into the dataset so later reads see it. */
  private completeScan(clientId: string, session: ScanSession) {
    const data = this.dataset(clientId);
    const openIssues = data.issues.filter((issue) => issue.status === "open").length;
    const record: ScanRecord = {
      id: `${clientId}--${session.scanId}`,
      type: session.type,
      startedAt: session.startedAt,
      durationSeconds: Math.round(session.durationMs / 1000),
      pagesScanned: session.type === "page" ? 1 : data.pages.length,
      issuesFound: session.type === "page" ? 1 : openIssues,
      status: "completed",
      note: null,
    };
    const scannedAt = new Date().toISOString();
    const nextScanAt = new Date(Date.now() + 20 * 3_600_000).toISOString();

    data.scans = [record, ...data.scans];
    data.target = { ...data.target, lastScannedAt: scannedAt, nextScanAt };
    data.summary = { ...data.summary, target: data.target };

    if (session.pageId) {
      data.pages = data.pages.map((page) =>
        page.id === session.pageId ? { ...page, lastScannedAt: scannedAt } : page,
      );
      const audit = data.audits[session.pageId];
      if (audit) {
        data.audits[session.pageId] = {
          ...audit,
          page: { ...audit.page, lastScannedAt: scannedAt },
        };
      }
    } else {
      data.pages = data.pages.map((page) => ({ ...page, lastScannedAt: scannedAt }));
    }
  }

  async saveSettings(clientId: string, settings: WebsiteSettings): Promise<WebsiteSettings> {
    await delay(420);
    const data = this.dataset(clientId);
    data.settings = settings;
    return data.settings;
  }

  async setIssueStatus(clientId: string, issueId: string, status: IssueStatus): Promise<IssueRecord> {
    await delay(260);
    const data = this.dataset(clientId);
    let updated: IssueRecord | undefined;
    data.issues = data.issues.map((issue) => {
      if (issue.id !== issueId) return issue;
      updated = {
        ...issue,
        status,
        resolvedAt: status === "resolved" ? new Date().toISOString() : null,
      };
      return updated;
    });
    if (!updated) throw new Error("That issue no longer exists.");

    // Page issue counts follow the issue list.
    const openByPage = new Map<string, { total: number; critical: number }>();
    for (const issue of data.issues) {
      if (issue.status !== "open") continue;
      for (const pageId of issue.affectedPageIds) {
        const entry = openByPage.get(pageId) ?? { total: 0, critical: 0 };
        entry.total += 1;
        if (issue.severity === "critical") entry.critical += 1;
        openByPage.set(pageId, entry);
      }
    }
    data.pages = data.pages.map((page) => {
      const entry = openByPage.get(page.id) ?? { total: 0, critical: 0 };
      return { ...page, issueCount: entry.total, criticalIssueCount: entry.critical };
    });

    return updated;
  }

  async connectIntegration(
    clientId: string,
    key: IntegrationKey,
    property: string,
  ): Promise<WebsiteCapabilityState> {
    await delay(700);
    const data = this.dataset(clientId);
    const previous = data.capabilities.integrations[key];
    const connectedStatus = key === "omniTracking" ? "installed" : "connected";
    data.capabilities = {
      ...data.capabilities,
      integrations: {
        ...data.capabilities.integrations,
        [key]: {
          ...previous,
          status: connectedStatus,
          property,
          lastSyncAt: new Date().toISOString(),
          detail:
            key === "omniTracking"
              ? "Snippet detected and receiving events."
              : "Connected. First sync completed just now.",
        },
      },
    };
    this.refreshIntegrationDerivedData(clientId);
    return data.capabilities;
  }

  async disconnectIntegration(clientId: string, key: IntegrationKey): Promise<WebsiteCapabilityState> {
    await delay(420);
    const data = this.dataset(clientId);
    const previous = data.capabilities.integrations[key];
    data.capabilities = {
      ...data.capabilities,
      integrations: {
        ...data.capabilities.integrations,
        [key]: {
          ...previous,
          status: key === "omniTracking" ? "not-installed" : "not-connected",
          property: null,
          lastSyncAt: null,
          detail:
            key === "omniTracking"
              ? "Add the tracking snippet to the website to capture on-page behaviour."
              : "Not connected.",
        },
      },
    };
    this.refreshIntegrationDerivedData(clientId);
    return data.capabilities;
  }

  /**
   * Integration state decides whether GA4, Search Console and tracking-derived
   * data exist at all. Rebuilding here keeps "connect" and "disconnect"
   * honest rather than leaving stale numbers on screen.
   */
  private refreshIntegrationDerivedData(clientId: string) {
    const data = this.dataset(clientId);
    const profile = {
      ...data.profile,
      integrations: {
        ga4: data.capabilities.integrations.ga4.status,
        searchConsole: data.capabilities.integrations.searchConsole.status,
        omniTracking: data.capabilities.integrations.omniTracking.status,
        ownership: data.capabilities.integrations.ownership.status,
      },
    };
    const rebuilt = buildDataset(profile);
    if (!rebuilt) return;
    data.analytics = rebuilt.analytics;
    data.seo = { ...data.seo, searchConsole: rebuilt.seo.searchConsole };
    data.technologies = rebuilt.technologies;
    data.profile = profile;
  }

  async archiveMonitoring(clientId: string, archived: boolean): Promise<WebsiteSettings> {
    await delay(380);
    const data = this.dataset(clientId);
    data.settings = {
      ...data.settings,
      monitoringArchived: archived,
      monitoring: { ...data.settings.monitoring, enabled: archived ? false : data.settings.monitoring.enabled },
    };
    return data.settings;
  }
}

/**
 * Production-mode provider. Every read reports the missing service rather than
 * dressing mock numbers up as live data.
 */
export class UnavailableWebsiteProvider implements WebsiteDataProvider {
  readonly id = "live" as const;

  private fail(service: string): never {
    throw new ServiceUnavailableError(service);
  }

  async getTarget(clientId: string) {
    const profile = findClientProfile(clientId);
    if (!profile?.domain) throw new NoWebsiteConfiguredError(clientId);
    // The URL genuinely comes from the Client Profile, so it is safe to return.
    return {
      clientId,
      clientName: profile.clientName,
      domain: profile.domain,
      url: `https://${profile.domain}`,
      https: true,
      status: "unknown",
      verified: false,
      lastScannedAt: null,
      nextScanAt: null,
      sourceLabel: "Client Profile → Website URL",
    } satisfies WebsiteTarget;
  }

  async getCapabilities(clientId: string): Promise<WebsiteCapabilityState> {
    void clientId;
    return this.fail("Website crawler");
  }
  async getSummary(): Promise<WebsiteSummary> {
    return this.fail("Website crawler");
  }
  async getTrend(): Promise<TrendPoint[]> {
    return this.fail("Website history service");
  }
  async getTechnologies(): Promise<TechnologyDetection[]> {
    return this.fail("Technology detection");
  }
  async getScans(): Promise<ScanRecord[]> {
    return this.fail("Scan service");
  }
  async getPages(): Promise<PageRecord[]> {
    return this.fail("Website crawler");
  }
  async getPageAudit(): Promise<PageAudit> {
    return this.fail("Page audit service");
  }
  async getIssues(): Promise<IssueRecord[]> {
    return this.fail("Issue service");
  }
  async getFixGuide(guideId: string): Promise<FixGuide> {
    // Fix guides are editorial content, not a live service.
    const guide = listFixGuides().find((entry) => entry.id === guideId);
    if (!guide) throw new Error(`No fix guide published for "${guideId}".`);
    return guide;
  }
  async getSeo(): Promise<SeoData> {
    return this.fail("SEO audit service");
  }
  async getPerformance() {
    return this.fail("Performance service");
  }
  async getAnalytics(): Promise<AnalyticsData | null> {
    return this.fail("Google Analytics");
  }
  async getForms() {
    return this.fail("Form & CTA detection");
  }
  async getMonitoring() {
    return this.fail("Monitoring service");
  }
  async getSettings(): Promise<WebsiteSettings> {
    return this.fail("Website settings service");
  }
  async startScan(): Promise<ScanProgress> {
    return this.fail("Scan service");
  }
  async getScanProgress(): Promise<ScanProgress> {
    return this.fail("Scan service");
  }
  async saveSettings(): Promise<WebsiteSettings> {
    return this.fail("Website settings service");
  }
  async setIssueStatus(): Promise<IssueRecord> {
    return this.fail("Issue service");
  }
  async connectIntegration(): Promise<WebsiteCapabilityState> {
    return this.fail("Integration service");
  }
  async disconnectIntegration(): Promise<WebsiteCapabilityState> {
    return this.fail("Integration service");
  }
  async archiveMonitoring(): Promise<WebsiteSettings> {
    return this.fail("Monitoring service");
  }
}
