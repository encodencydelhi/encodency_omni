import { apiClient } from "@/lib/api/client";
import { companyScopeHeaders } from "@/lib/api/company-scope";
import { env } from "@/config/env";

export interface StudySite { url: string; domain: string; role: "own" | "competitor" }

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

export interface StudyListItem {
  id: string;
  name: string;
  clientId: string | null;
  sites: StudySite[];
  updatedAt: string;
  latestRun: (RunSummary & { overall: Record<string, number> | null }) | null;
}

export interface StudyDetail {
  id: string;
  name: string;
  clientId: string | null;
  sites: StudySite[];
  createdAt: string;
  updatedAt: string;
  latestRun: RunSummary | null;
  report: RunReport | null;
  history: { id: string; at: string; overall: Record<string, number> | null; speed: Record<string, number | null> }[];
}

export interface LookupResult { name: string; description: string | null; url: string; domain: string | null; imageUrl: string | null }

/** Competitor Analyzer. Company-wide: no Client header. Read = clients:read, change/run = clients:write. */
export const analyzerApi = {
  list: (companyId: string) => apiClient.request<StudyListItem[]>({ method: "GET", path: "/competitor-analyzer/studies", headers: companyScopeHeaders(companyId) }),
  get: (companyId: string, id: string) => apiClient.request<StudyDetail>({ method: "GET", path: `/competitor-analyzer/studies/${encodeURIComponent(id)}`, headers: companyScopeHeaders(companyId) }),
  create: (companyId: string, body: { name?: string; own: string; competitors: string[]; clientId?: string }) =>
    apiClient.request<StudyDetail>({ method: "POST", path: "/competitor-analyzer/studies", headers: companyScopeHeaders(companyId), body }),
  update: (companyId: string, id: string, body: { name?: string; own?: string; competitors?: string[] }) =>
    apiClient.request<StudyDetail>({ method: "PATCH", path: `/competitor-analyzer/studies/${encodeURIComponent(id)}`, headers: companyScopeHeaders(companyId), body }),
  archive: (companyId: string, id: string) => apiClient.request<void>({ method: "DELETE", path: `/competitor-analyzer/studies/${encodeURIComponent(id)}`, headers: companyScopeHeaders(companyId) }),
  run: (companyId: string, id: string) => apiClient.request<{ run: RunSummary; reused: boolean }>({ method: "POST", path: `/competitor-analyzer/studies/${encodeURIComponent(id)}/runs`, headers: companyScopeHeaders(companyId), body: {} }),
  /** The PDF is private: fetched with the session cookie and handed to the browser as a blob, never as a public URL. */
  async downloadReport(companyId: string, id: string): Promise<{ blob: Blob; fileName: string }> {
    const response = await fetch(`${env.apiBaseUrl}/competitor-analyzer/studies/${encodeURIComponent(id)}/report`, {
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
  lookup: (companyId: string, q: string) => apiClient.request<{ results: LookupResult[]; message: string | null }>({ method: "GET", path: "/competitor-analyzer/lookup", headers: companyScopeHeaders(companyId), query: { q } }),
};
