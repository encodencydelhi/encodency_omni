import { apiClient } from "@/lib/api/client";
import { companyScopeHeaders } from "@/lib/api/company-scope";
import { env } from "@/config/env";

/** `name` is what the site calls itself (from its home page); null when none was found. */
export interface StudySite { url: string; domain: string; role: "own" | "competitor"; name?: string | null }

export interface SiteMetrics {
  pages: number;
  words: number;
  headings: number;
  ctas: number;
  images: number;
  contact: { phone: boolean; email: boolean; whatsapp: boolean; form: boolean };
  social: string[];
  schemaTypes: string[];
  image: string | null;
}

export interface TechSignals {
  titleLength: number;
  descriptionLength: number;
  h1Count: number;
  headline: string | null;
  canonical: boolean;
  openGraph: boolean;
  viewport: boolean;
  lang: string | null;
  imagesTotal: number;
  imagesWithAlt: number;
  internalLinks: number;
  hasBlog: boolean;
  latestDate: string | null;
  robotsTxt: boolean | null;
  sitemapUrls: number | null;
  sitemapRecent30?: number | null;
  sitemapRecent90?: number | null;
  sitemapLatest?: string | null;
}

/** Your own Google Search Console data (last 28 days); only on your site. */
export interface OwnSearch {
  property: string;
  range: { start: string; end: string };
  totals: { clicks: number; impressions: number; ctr: number; position: number };
  queries: { query: string; clicks: number; impressions: number; position: number }[];
}

/** Measured for one site in one run; nothing here is estimated. */
export interface SiteEvidence {
  url: string;
  domain: string;
  role: "own" | "competitor";
  reachable: boolean;
  error: string | null;
  name: string | null;
  title: string | null;
  description: string | null;
  image: string | null;
  /** Mobile screenshot of the home page from Google PageSpeed (data URL). */
  screenshot?: string | null;
  https: boolean;
  pages: { url: string; title: string; description: string; words: number; headings: number; ctas: string[] }[];
  metrics: SiteMetrics;
  tech?: TechSignals | null;
  speed: { performance: number | null; seo: number | null; accessibility: number | null; bestPractices: number | null; lcpMs: number | null; cls: number | null; tbtMs: number | null } | null;
  speedError: string | null;
  search?: OwnSearch | null;
  brand: { status: "matched" | "possible" | "not_found" | "unavailable"; name: string | null; description: string | null; wikipediaUrl: string | null } | null;
}

export interface CitedPoint { point: string; evidence: string; url: string }
export interface AnalyzerResult {
  overview: string;
  sites: { domain: string; summary: string; audience: string; positioning: string; promise?: string; tone?: string; offerings: string[]; strengths: CitedPoint[]; weaknesses: CitedPoint[] }[];
  scores: { area: string; scores: Record<string, number>; leader: string | null; note: string }[];
  overall: Record<string, number>;
  headToHead: { competitor: string; threat?: "high" | "medium" | "low"; threatReason?: string; theyLead: { point: string; url: string }[]; youLead: { point: string; url: string }[]; verdict: string }[];
  gaps: { topic: string; competitors: string[]; why: string; url: string }[];
  opportunities: string[];
  actions: { priority: "high" | "medium" | "low"; action: string; reason: string; effort: "low" | "medium" | "high"; impact?: "high" | "medium" | "low"; when?: "this week" | "this month" | "this quarter"; learnFrom: string | null }[];
  /** Absent on reports made before the deeper analysis (2026-10-22.2). */
  swot?: { strengths: string[]; weaknesses: string[]; opportunities: string[]; threats: string[] };
  topics?: { topic: string; sites: string[] }[];
  contentIdeas?: { title: string; format: "page" | "blog" | "faq" | "video" | "guide"; why: string; inspiredBy: string | null }[];
}

export type AiBlock =
  | { status: "completed"; generatedAt: string; dropped: number; result: AnalyzerResult }
  | { status: "unavailable" | "failed"; reason: string };

export interface SiteChange { domain: string; kind: string; direction: "up" | "down" | "neutral"; text: string }

export interface RunSummary { id: string; status: "running" | "completed" | "failed" | "cancelled"; stage: string | null; startedAt: string; finishedAt: string | null; errorMessage: string | null }
export interface RunReport extends RunSummary { sites: SiteEvidence[]; ai: AiBlock | null; changes: { since: string; items: SiteChange[] } | null; costUsd: number | null }

export type Schedule = "off" | "weekly" | "monthly";
export interface StudySettings { schedule: Schedule; alerts: boolean; reportEmails: string[]; reportMonthly: boolean }
export type ActionStatus = "todo" | "doing" | "done";
export interface ActionState { status: ActionStatus; action: string; taskId?: string | null; updatedAt: string; updatedBy?: string | null }

export interface StudyListItem {
  id: string;
  name: string;
  clientId: string | null;
  sites: StudySite[];
  updatedAt: string;
  schedule?: Schedule;
  nextCheckAt?: string | null;
  /** Scores come from the last finished check; `checkedAt` is when it finished. */
  latestRun: (RunSummary & { overall: Record<string, number> | null; checkedAt?: string | null }) | null;
  summary?: {
    overview: string;
    threats: { domain: string; threat: "high" | "medium" | "low" | null }[];
    gaps: number;
    actions: { total: number; high: number; done: number; doing: number };
  } | null;
}

export interface StudyDetail {
  id: string;
  name: string;
  clientId: string | null;
  sites: StudySite[];
  createdAt: string;
  updatedAt: string;
  linkedClient?: { id: string; name: string } | null;
  settings?: StudySettings;
  actions?: Record<string, ActionState>;
  nextCheckAt?: string | null;
  nextReportAt?: string | null;
  latestRun: RunSummary | null;
  report: (RunReport & { previous?: { at: string; overall: Record<string, number> | null; scores: Record<string, Record<string, number>> } | null }) | null;
  history: { id: string; at: string; overall: Record<string, number> | null; speed: Record<string, number | null> }[];
}

export interface LookupResult { name: string; description: string | null; url: string; domain: string | null; imageUrl: string | null }

/** Competitor Analyzer. Company-wide: no Client header. Read = clients:read, change/run = clients:write. */
export const analyzerApi = {
  list: (companyId: string) => apiClient.request<StudyListItem[]>({ method: "GET", path: "/competitor-analyzer/studies", headers: companyScopeHeaders(companyId) }),
  get: (companyId: string, id: string) => apiClient.request<StudyDetail>({ method: "GET", path: `/competitor-analyzer/studies/${encodeURIComponent(id)}`, headers: companyScopeHeaders(companyId) }),
  create: (companyId: string, body: { name?: string; own: string; competitors: string[]; clientId?: string; names?: Record<string, string> }) =>
    apiClient.request<StudyDetail>({ method: "POST", path: "/competitor-analyzer/studies", headers: companyScopeHeaders(companyId), body }),
  update: (companyId: string, id: string, body: { name?: string; own?: string; competitors?: string[]; names?: Record<string, string> }) =>
    apiClient.request<StudyDetail>({ method: "PATCH", path: `/competitor-analyzer/studies/${encodeURIComponent(id)}`, headers: companyScopeHeaders(companyId), body }),
  archive: (companyId: string, id: string) => apiClient.request<void>({ method: "DELETE", path: `/competitor-analyzer/studies/${encodeURIComponent(id)}`, headers: companyScopeHeaders(companyId) }),
  run: (companyId: string, id: string) => apiClient.request<{ run: RunSummary; reused: boolean }>({ method: "POST", path: `/competitor-analyzer/studies/${encodeURIComponent(id)}/runs`, headers: companyScopeHeaders(companyId), body: {} }),
  /** The PDF is private: fetched with the session cookie and handed to the browser as a blob, never as a public URL. */
  async downloadReport(companyId: string, id: string, lang: "en" | "hi" = "en"): Promise<{ blob: Blob; fileName: string }> {
    const response = await fetch(`${env.apiBaseUrl}/competitor-analyzer/studies/${encodeURIComponent(id)}/report${lang === "hi" ? "?lang=hi" : ""}`, {
      credentials: "include",
      headers: { "ngrok-skip-browser-warning": "true", ...companyScopeHeaders(companyId) },
    });
    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as { message?: string | string[] };
      throw new Error(Array.isArray(body.message) ? body.message.join(" ") : body.message ?? "The report could not be downloaded.");
    }
    const fileName = /filename="([^"]+)"/.exec(response.headers.get("content-disposition") ?? "")?.[1] ?? "competitor-report.pdf";
    return { blob: await response.blob(), fileName };
  },
  updateSettings: (companyId: string, id: string, body: Partial<StudySettings>) =>
    apiClient.request<StudyDetail>({ method: "PATCH", path: `/competitor-analyzer/studies/${encodeURIComponent(id)}/settings`, headers: companyScopeHeaders(companyId), body }),
  setActionStatus: (companyId: string, id: string, body: { action: string; status: ActionStatus }) =>
    apiClient.request<{ key: string; state: ActionState }>({ method: "PATCH", path: `/competitor-analyzer/studies/${encodeURIComponent(id)}/actions`, headers: companyScopeHeaders(companyId), body }),
  createActionTask: (companyId: string, id: string, body: { action: string; reason?: string; priority?: "high" | "medium" | "low" }) =>
    apiClient.request<{ key: string; state: ActionState; taskId: string; created: boolean }>({ method: "POST", path: `/competitor-analyzer/studies/${encodeURIComponent(id)}/actions/task`, headers: companyScopeHeaders(companyId), body }),
  emailReport: (companyId: string, id: string, to: string[]) =>
    apiClient.request<{ sent: number; to: string[] }>({ method: "POST", path: `/competitor-analyzer/studies/${encodeURIComponent(id)}/report/email`, headers: companyScopeHeaders(companyId), body: { to } }),
  /** Reads only the site's home page to show its name while the address is typed. */
  siteName: (companyId: string, url: string) =>
    apiClient.request<{ domain: string; url: string; name: string | null; reachable: boolean }>({ method: "GET", path: "/competitor-analyzer/site-name", headers: companyScopeHeaders(companyId), query: { url } }),
  lookup: (companyId: string, q: string) => apiClient.request<{ results: LookupResult[]; message: string | null }>({ method: "GET", path: "/competitor-analyzer/lookup", headers: companyScopeHeaders(companyId), query: { q } }),
};
