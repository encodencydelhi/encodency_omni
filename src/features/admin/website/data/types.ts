/**
 * Website Intelligence — data contracts.
 *
 * These types are the contract between the UI and whatever supplies the data.
 * Today that is the in-memory mock provider; later it will be the crawler,
 * PageSpeed, GA4, Search Console and monitoring services. Components must only
 * ever depend on the shapes declared here — never on the mock module itself.
 *
 * Everything here describes a website we observe **from the outside**. There is
 * no CMS, no server access and no deployment access, so nothing in this file
 * models editing, publishing or deleting a page.
 */

/* ------------------------------------------------------------------ */
/* Primitives                                                          */
/* ------------------------------------------------------------------ */

/** ISO-8601 timestamp. Kept as a string so it survives a JSON boundary. */
export type IsoDate = string;

export type Severity = "critical" | "high" | "medium" | "low";

export type IssueStatus = "open" | "resolved" | "ignored";

export type CheckStatus = "pass" | "warning" | "error" | "unknown";

export type VitalBand = "good" | "needs-improvement" | "poor";

export type LiveStatus = "live" | "degraded" | "down" | "unknown";

/** How sure the detector is. Nothing observed from outside is ever certain. */
export type Confidence = "high" | "medium" | "low";

export type IssueCategory =
  | "seo"
  | "performance"
  | "accessibility"
  | "links"
  | "monitoring"
  | "ssl"
  | "forms"
  | "security"
  | "technical";

export type PageType =
  | "standard"
  | "landing"
  | "blog"
  | "legal"
  | "utility"
  | "redirect"
  | "error";

/* ------------------------------------------------------------------ */
/* Capabilities & integrations                                         */
/* ------------------------------------------------------------------ */

/**
 * What we can learn from the URL alone. Every one of these is answerable by
 * fetching public pages, so they are available as soon as a client has a URL.
 */
export type WebsiteCapability =
  | "canCrawlWebsite"
  | "canAuditSEO"
  | "canAuditPerformance"
  | "canAuditAccessibility"
  | "canDetectForms"
  | "canDetectCTAs"
  | "canMonitorUptime"
  | "canCheckSSL"
  | "canDetectTechnologies"
  | "canCheckSecurityHygiene"
  | "canCaptureScreenshots"
  | "canDetectChanges";

export type IntegrationKey = "ga4" | "searchConsole" | "omniTracking" | "ownership";

export type IntegrationStatus =
  | "connected"
  /** Omni Tracking only: the snippet is on the site and reporting. */
  | "installed"
  | "not-connected"
  | "needs-attention"
  | "not-installed"
  | "pending-verification";

export interface IntegrationState {
  key: IntegrationKey;
  name: string;
  status: IntegrationStatus;
  /** Short human explanation of the current status. */
  detail: string;
  /** GA4 property, Search Console property, tracking site id, … */
  property: string | null;
  lastSyncAt: IsoDate | null;
  /** What connecting this integration turns on, for the locked-state copy. */
  unlocks: string[];
}

export interface WebsiteCapabilityState {
  capabilities: Record<WebsiteCapability, boolean>;
  integrations: Record<IntegrationKey, IntegrationState>;
}

/* ------------------------------------------------------------------ */
/* The website itself                                                  */
/* ------------------------------------------------------------------ */

/**
 * The website under observation. The URL is owned by the Client Profile — this
 * module reads it and never edits it.
 */
export interface WebsiteTarget {
  clientId: string;
  clientName: string;
  /** Bare host, e.g. `mokshasewa.org`. */
  domain: string;
  /** Canonical absolute URL, e.g. `https://mokshasewa.org`. */
  url: string;
  https: boolean;
  status: LiveStatus;
  /** Ownership verified via DNS/meta tag — gates Search Console style features. */
  verified: boolean;
  lastScannedAt: IsoDate | null;
  nextScanAt: IsoDate | null;
  /** Where the URL came from, shown in Settings so the source is never a mystery. */
  sourceLabel: string;
}

export interface ScoreSet {
  /** OmniPlatform Website Health — our composite, never a Google score. */
  health: number;
  seo: number;
  performance: number;
  accessibility: number;
  bestPractices: number;
}

export interface WebsiteSummary {
  target: WebsiteTarget;
  scores: ScoreSet;
  /** Change vs. the previous scan, same order of keys as `scores`. */
  scoreDeltas: ScoreSet;
  uptimePct: number;
  pagesDiscovered: number;
  criticalIssues: number;
  openIssues: number;
}

export interface TrendPoint {
  date: IsoDate;
  health: number;
  seo: number;
  performance: number;
  uptime: number;
}

export interface TechnologyDetection {
  name: string;
  category: string;
  confidence: Confidence;
  /** What gave it away, e.g. `x-powered-by header`. */
  evidence: string;
}

export type ScanType = "full-crawl" | "seo-audit" | "performance" | "uptime" | "page";

export type ScanStatus = "completed" | "running" | "failed" | "partial";

export interface ScanRecord {
  id: string;
  type: ScanType;
  startedAt: IsoDate;
  durationSeconds: number;
  pagesScanned: number;
  issuesFound: number;
  status: ScanStatus;
  /** Populated when `status` is `failed` or `partial`. */
  note: string | null;
}

/** Live progress of a scan the user just started. */
export interface ScanProgress {
  scanId: string;
  type: ScanType;
  status: "queued" | "running" | "completed" | "failed";
  /** 0–100. */
  progress: number;
  stage: string;
  pagesScanned: number;
  startedAt: IsoDate;
}

/* ------------------------------------------------------------------ */
/* Pages                                                               */
/* ------------------------------------------------------------------ */

export interface PageRecord {
  id: string;
  title: string;
  /** Path portion, e.g. `/donate`. */
  path: string;
  url: string;
  type: PageType;
  httpStatus: number;
  seoScore: number | null;
  performanceScore: number | null;
  accessibilityScore: number | null;
  wordCount: number;
  issueCount: number;
  criticalIssueCount: number;
  indexable: boolean;
  lastScannedAt: IsoDate;
  /** Transfer size in kilobytes. */
  pageWeightKb: number;
  loadTimeMs: number;
  depth: number;
}

/** One audited assertion about a page. Pass / warning / error, with the evidence. */
export interface AuditCheck {
  id: string;
  label: string;
  status: CheckStatus;
  /** The observed value, e.g. the actual title text or `214 characters`. */
  value: string | null;
  detail: string;
  recommendation: string | null;
}

export interface PageLinkRecord {
  href: string;
  text: string;
  kind: "internal" | "external";
  status: number | null;
  /** Set when the link resolves through one or more redirects. */
  redirectsTo: string | null;
}

export interface PageResourceBreakdown {
  label: string;
  requests: number;
  weightKb: number;
}

export interface PagePerformanceDetail {
  score: number | null;
  lcpMs: number;
  inpMs: number;
  cls: number;
  ttfbMs: number;
  pageWeightKb: number;
  requests: number;
  breakdown: PageResourceBreakdown[];
  thirdParty: { name: string; weightKb: number; blocking: boolean }[];
}

export interface PageContentDetail {
  wordCount: number;
  thinContent: boolean;
  duplicateSimilarityPct: number;
  duplicateOf: string | null;
  headings: { level: number; text: string }[];
  images: { total: number; missingAlt: number; oversized: number };
  videos: number;
  ctas: { text: string; kind: CtaKind; destination: string }[];
  readability: { label: string; score: number; note: string };
}

export interface PageScreenshots {
  /** Mock viewport renders — no worker is capturing these yet. */
  available: boolean;
  capturedAt: IsoDate | null;
  note: string;
}

export interface PageAudit {
  page: PageRecord;
  canonical: string | null;
  indexabilityNote: string;
  screenshots: PageScreenshots;
  seoChecks: AuditCheck[];
  technicalChecks: AuditCheck[];
  accessibilityChecks: AuditCheck[];
  content: PageContentDetail;
  links: {
    internal: number;
    external: number;
    broken: number;
    redirected: number;
    orphanRisk: boolean;
    samples: PageLinkRecord[];
  };
  performance: PagePerformanceDetail;
  issueIds: string[];
}

/* ------------------------------------------------------------------ */
/* Issues                                                              */
/* ------------------------------------------------------------------ */

export interface IssueRecord {
  id: string;
  title: string;
  description: string;
  severity: Severity;
  category: IssueCategory;
  status: IssueStatus;
  detectedAt: IsoDate;
  resolvedAt: IsoDate | null;
  /** Page ids this issue was found on. Empty for site-wide issues. */
  affectedPageIds: string[];
  /** Site-wide issues still need a count, e.g. "robots.txt" affects the site. */
  affectedCount: number;
  recommendation: string;
  fixGuideId: string;
  /** e.g. `LCP 4.8s` — the measurement that triggered the issue. */
  evidence: string | null;
}

export interface FixGuide {
  id: string;
  title: string;
  summary: string;
  impact: "high" | "medium" | "low";
  effort: "low" | "medium" | "high";
  steps: string[];
  /** Who normally has to do it — we usually cannot, we have no site access. */
  ownedBy: string;
  reference: { label: string; url: string } | null;
}

/* ------------------------------------------------------------------ */
/* SEO                                                                 */
/* ------------------------------------------------------------------ */

export interface SeoCategoryScore {
  key: string;
  label: string;
  score: number;
  passed: number;
  warnings: number;
  errors: number;
}

export interface SeoOverview {
  score: number;
  pagesCrawled: number;
  indexablePages: number;
  errors: number;
  warnings: number;
  passedChecks: number;
  healthyPages: number;
  warningPages: number;
  criticalPages: number;
  categories: SeoCategoryScore[];
}

export interface SitemapEntry {
  loc: string;
  lastModified: IsoDate | null;
  status: number | null;
  valid: boolean;
  note: string | null;
}

export interface SitemapReport {
  detected: boolean;
  url: string | null;
  fetchedAt: IsoDate | null;
  childSitemaps: { url: string; urlCount: number }[];
  urlsDiscovered: number;
  invalidUrls: number;
  entries: SitemapEntry[];
}

export interface RobotsReport {
  detected: boolean;
  url: string | null;
  fetchedAt: IsoDate | null;
  raw: string;
  allowedPaths: string[];
  blockedPaths: string[];
  sitemapReferences: string[];
  warnings: string[];
}

export interface SchemaTypeReport {
  type: string;
  pages: number;
  status: CheckStatus;
  issues: string[];
}

export interface SchemaReport {
  detectedTypes: SchemaTypeReport[];
  valid: number;
  warnings: number;
  errors: number;
}

export interface SearchQueryRow {
  query: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export interface SearchPageRow {
  page: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export interface SearchConsoleData {
  totals: { clicks: number; impressions: number; ctr: number; position: number };
  deltas: { clicks: number; impressions: number; ctr: number; position: number };
  trend: { date: IsoDate; clicks: number; impressions: number; position: number }[];
  queries: SearchQueryRow[];
  pages: SearchPageRow[];
  countries: { country: string; clicks: number; impressions: number }[];
  devices: { device: string; clicks: number; impressions: number }[];
}

export interface SeoData {
  overview: SeoOverview;
  sitemap: SitemapReport;
  robots: RobotsReport;
  schema: SchemaReport;
  /** Internal-link view used by the SEO → Links sub-tab. */
  links: {
    internalLinks: number;
    externalLinks: number;
    brokenLinks: number;
    redirectChains: number;
    nofollowLinks: number;
    orphanPages: number;
    broken: { from: string; to: string; status: number; text: string }[];
    redirects: { from: string; to: string; hops: number }[];
  };
  /** Null until Search Console is connected. */
  searchConsole: SearchConsoleData | null;
}

/* ------------------------------------------------------------------ */
/* Performance                                                         */
/* ------------------------------------------------------------------ */

export interface CoreWebVital {
  key: "lcp" | "inp" | "cls" | "ttfb";
  label: string;
  value: number;
  /** Formatted for display, e.g. `2.4 s`. */
  display: string;
  band: VitalBand;
  thresholds: { good: number; poor: number };
  /** Share of audited pages in each band. */
  distribution: { good: number; needsImprovement: number; poor: number };
}

export interface PerformanceRecommendation {
  id: string;
  title: string;
  description: string;
  impact: "high" | "medium" | "low";
  effort: "low" | "medium" | "high";
  estimatedSavingMs: number;
  affectedPages: number;
  fixGuideId: string;
}

export interface PerformanceData {
  score: number;
  scoreDelta: number;
  vitals: CoreWebVital[];
  avgPageWeightKb: number;
  avgRequests: number;
  trend: { date: IsoDate; score: number; lcp: number; inp: number; cls: number }[];
  pages: {
    pageId: string;
    path: string;
    score: number;
    lcpMs: number;
    inpMs: number;
    cls: number;
    ttfbMs: number;
    pageWeightKb: number;
  }[];
  resources: { label: string; weightKb: number; requests: number; share: number }[];
  thirdParty: { name: string; weightKb: number; blockingMs: number; pages: number }[];
  recommendations: PerformanceRecommendation[];
}

/* ------------------------------------------------------------------ */
/* Analytics (GA4) and tracking                                        */
/* ------------------------------------------------------------------ */

export interface AnalyticsKpi {
  key: string;
  label: string;
  value: string;
  raw: number;
  delta: number;
  /** Lower is better for e.g. bounce rate. */
  inverse?: boolean;
}

export interface FunnelStage {
  key: string;
  label: string;
  value: number | null;
  /** Percentage of the previous stage, null when the stage is unavailable. */
  conversionPct: number | null;
  available: boolean;
  /** Why the stage has no data, e.g. "Requires Omni Tracking". */
  unavailableReason: string | null;
}

export interface AnalyticsData {
  period: string;
  kpis: AnalyticsKpi[];
  trend: { date: IsoDate; users: number; sessions: number; views: number }[];
  acquisition: { channel: string; users: number; sessions: number; engagementRate: number }[];
  topPages: { path: string; views: number; users: number; avgEngagementSec: number }[];
  landingPages: { path: string; sessions: number; bounceRate: number; conversions: number }[];
  devices: { device: string; users: number; share: number }[];
  geography: { country: string; users: number; share: number }[];
  newVsReturning: { label: string; users: number; share: number }[];
  events: { name: string; count: number; users: number; source: "ga4" | "omni-tracking" }[];
  conversions: { name: string; count: number; value: number | null; delta: number }[];
  funnel: FunnelStage[];
}

/* ------------------------------------------------------------------ */
/* Forms & CTAs                                                        */
/* ------------------------------------------------------------------ */

export type CtaKind =
  | "button"
  | "whatsapp"
  | "phone"
  | "email"
  | "donation"
  | "booking"
  | "external-checkout"
  | "link";

export interface FormFieldRecord {
  name: string;
  label: string | null;
  type: string;
  required: boolean;
  hasLabel: boolean;
  autocomplete: string | null;
}

export interface FormRecord {
  id: string;
  pageId: string;
  pagePath: string;
  /** Best guess from the fields present, e.g. "Contact", "Donation". */
  formType: string;
  fields: FormFieldRecord[];
  method: "GET" | "POST" | "unknown";
  action: string;
  actionSecure: boolean;
  requiredFields: number;
  consentDetected: boolean;
  captchaDetected: boolean;
  httpsPage: boolean;
  accessibilityFindings: string[];
  issueIds: string[];
  detectedAt: IsoDate;
}

export interface CtaRecord {
  id: string;
  pageId: string;
  pagePath: string;
  text: string;
  kind: CtaKind;
  destination: string;
  /** Rough placement, from the DOM position. */
  placement: "above-fold" | "below-fold" | "footer" | "header";
  status: CheckStatus;
  note: string | null;
}

export interface ContactLinkRecord {
  id: string;
  kind: Extract<CtaKind, "whatsapp" | "phone" | "email">;
  value: string;
  pages: number;
  status: CheckStatus;
  note: string | null;
}

export interface FormsData {
  counts: {
    forms: number;
    ctas: number;
    whatsappLinks: number;
    phoneLinks: number;
    emailLinks: number;
    donationLinks: number;
    bookingLinks: number;
  };
  forms: FormRecord[];
  ctas: CtaRecord[];
  contactLinks: ContactLinkRecord[];
  issueIds: string[];
}

/* ------------------------------------------------------------------ */
/* Monitoring                                                          */
/* ------------------------------------------------------------------ */

export interface UptimeIncident {
  id: string;
  startedAt: IsoDate;
  endedAt: IsoDate | null;
  durationMinutes: number;
  kind: "down" | "degraded" | "ssl" | "timeout";
  httpStatus: number | null;
  note: string;
}

export interface UptimeData {
  status: LiveStatus;
  uptimePct30d: number;
  uptimePct90d: number;
  avgResponseMs: number;
  lastCheckedAt: IsoDate;
  lastDowntimeAt: IsoDate | null;
  checkIntervalMinutes: number;
  responseTrend: { date: IsoDate; responseMs: number; uptimePct: number }[];
  /** One entry per day, newest last — drives the uptime bar strip. */
  dailyStatus: { date: IsoDate; uptimePct: number; incidents: number }[];
  incidents: UptimeIncident[];
}

export interface SslData {
  httpsEnabled: boolean;
  certificateValid: boolean;
  issuer: string;
  subject: string;
  validFrom: IsoDate;
  validTo: IsoDate;
  daysRemaining: number;
  protocol: string;
  hstsEnabled: boolean;
  mixedContentPages: number;
}

export interface DnsData {
  resolves: boolean;
  resolvedIps: string[];
  nameservers: string[];
  records: { type: string; name: string; value: string; status: CheckStatus }[];
  /** Registrar/expiry needs a WHOIS provider we have not connected. */
  registrarDataAvailable: false;
  registrarNote: string;
}

export interface SecurityHeaderCheck {
  header: string;
  present: boolean;
  value: string | null;
  status: CheckStatus;
  recommendation: string;
}

export interface ErrorSample {
  id: string;
  path: string;
  status: number | "timeout" | "redirect-loop" | "unreachable";
  occurrences: number;
  firstSeenAt: IsoDate;
  lastSeenAt: IsoDate;
  referrer: string | null;
}

export interface ChangeRecord {
  id: string;
  path: string;
  field: string;
  previous: string;
  current: string;
  detectedAt: IsoDate;
  impact: "positive" | "negative" | "neutral";
}

export interface MonitoringData {
  uptime: UptimeData;
  ssl: SslData;
  dns: DnsData;
  securityHeaders: SecurityHeaderCheck[];
  errors: ErrorSample[];
  changes: ChangeRecord[];
}

/* ------------------------------------------------------------------ */
/* Settings                                                            */
/* ------------------------------------------------------------------ */

export type CrawlFrequency = "manual" | "daily" | "weekly";

export interface CrawlSettings {
  frequency: CrawlFrequency;
  depth: number;
  maxPages: number;
  includePaths: string[];
  excludePaths: string[];
  respectRobots: boolean;
  crawlJs: boolean;
}

export interface MonitoringSettings {
  enabled: boolean;
  intervalMinutes: number;
  responseTimeThresholdMs: number;
  sslExpiryWarningDays: number;
  uptimeAlertThresholdPct: number;
}

export interface NotificationSetting {
  key: string;
  label: string;
  description: string;
  email: boolean;
  inApp: boolean;
}

export interface TeamAccessRow {
  id: string;
  name: string;
  email: string;
  role: string;
  permissions: string[];
}

export interface ReportSettings {
  scheduleEnabled: boolean;
  frequency: "weekly" | "monthly";
  recipients: string[];
  sections: string[];
  format: "pdf" | "csv";
}

export interface WebsiteSettings {
  crawl: CrawlSettings;
  monitoring: MonitoringSettings;
  notifications: NotificationSetting[];
  team: TeamAccessRow[];
  reports: ReportSettings;
  monitoringArchived: boolean;
}

/** Permissions used by the Team Access table. */
export const WEBSITE_PERMISSIONS = [
  "View Website",
  "Run Scan",
  "View SEO",
  "View Analytics",
  "Export",
  "Manage Monitoring",
  "Manage Integrations",
  "Manage Settings",
] as const;

export type WebsitePermission = (typeof WEBSITE_PERMISSIONS)[number];

/* ------------------------------------------------------------------ */
/* Provider surface                                                    */
/* ------------------------------------------------------------------ */

/**
 * Raised by a provider when the service behind a screen does not exist yet.
 * The UI renders this as an honest "service not available" state rather than
 * pretending there is no data.
 */
export class ServiceUnavailableError extends Error {
  readonly service: string;

  constructor(service: string, message?: string) {
    super(message ?? `${service} is not connected yet.`);
    this.name = "ServiceUnavailableError";
    this.service = service;
  }

  static is(error: unknown): error is ServiceUnavailableError {
    return error instanceof ServiceUnavailableError;
  }
}

/** Raised when the selected client has no website URL on their Client Profile. */
export class NoWebsiteConfiguredError extends Error {
  readonly clientId: string;

  constructor(clientId: string) {
    super("No website configured for this client.");
    this.name = "NoWebsiteConfiguredError";
    this.clientId = clientId;
  }

  static is(error: unknown): error is NoWebsiteConfiguredError {
    return error instanceof NoWebsiteConfiguredError;
  }
}

/**
 * Everything the Website module can ask for. The mock provider implements this
 * against an in-memory dataset; a future HTTP provider will implement exactly
 * the same surface against the crawler and integration services.
 */
export interface WebsiteDataProvider {
  readonly id: "mock" | "live";
  getTarget(clientId: string): Promise<WebsiteTarget>;
  getCapabilities(clientId: string): Promise<WebsiteCapabilityState>;
  getSummary(clientId: string): Promise<WebsiteSummary>;
  getTrend(clientId: string, days: 7 | 30 | 90): Promise<TrendPoint[]>;
  getTechnologies(clientId: string): Promise<TechnologyDetection[]>;
  getScans(clientId: string): Promise<ScanRecord[]>;
  getPages(clientId: string): Promise<PageRecord[]>;
  getPageAudit(clientId: string, pageId: string): Promise<PageAudit>;
  getIssues(clientId: string): Promise<IssueRecord[]>;
  getFixGuide(guideId: string): Promise<FixGuide>;
  getSeo(clientId: string): Promise<SeoData>;
  getPerformance(clientId: string): Promise<PerformanceData>;
  /** Null when GA4 is not connected — the UI renders the connect state. */
  getAnalytics(clientId: string, period: string): Promise<AnalyticsData | null>;
  getForms(clientId: string): Promise<FormsData>;
  getMonitoring(clientId: string): Promise<MonitoringData>;
  getSettings(clientId: string): Promise<WebsiteSettings>;

  /* Commands ------------------------------------------------------- */
  startScan(clientId: string, type: ScanType, pageId?: string): Promise<ScanProgress>;
  getScanProgress(clientId: string, scanId: string): Promise<ScanProgress>;
  saveSettings(clientId: string, settings: WebsiteSettings): Promise<WebsiteSettings>;
  setIssueStatus(clientId: string, issueId: string, status: IssueStatus): Promise<IssueRecord>;
  connectIntegration(
    clientId: string,
    key: IntegrationKey,
    property: string,
  ): Promise<WebsiteCapabilityState>;
  disconnectIntegration(clientId: string, key: IntegrationKey): Promise<WebsiteCapabilityState>;
  archiveMonitoring(clientId: string, archived: boolean): Promise<WebsiteSettings>;
}
