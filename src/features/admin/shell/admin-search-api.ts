import { apiClient } from "@/lib/api/client";
import { companyScopeHeaders } from "@/lib/api/company-scope";

export type AdminSearchHitKind = "client" | "campaign" | "draft" | "crm" | "ticket" | "member" | "invoice" | "workflow" | "study";

export interface AdminSearchHit {
  id: string;
  kind: AdminSearchHitKind;
  group: string;
  title: string;
  subtitle: string;
  href: string;
  badge?: string;
  tone?: "brand" | "success" | "warning" | "danger" | "info" | "neutral";
  preview: Array<{ label: string; value: string }>;
  score: number;
  clientId?: string;
}

export interface AdminSearchResponse {
  items: AdminSearchHit[];
  scope: AdminSearchHitKind[] | null;
  text: string;
  searchable: string[];
  /** Set when too little matched what was typed: the results are for this close spelling (a word from the person's own records). */
  didYouMean?: string;
}

export interface SavedAdminSearch {
  id: string;
  name: string;
  query: string;
  createdAt: string;
}

export const adminSearchApi = {
  search: (companyId: string, q: string, limit = 20, signal?: AbortSignal) =>
    apiClient.request<AdminSearchResponse>({ method: "GET", path: "/admin-search", query: { q, limit }, headers: companyScopeHeaders(companyId), signal }),
  saved: (companyId: string, signal?: AbortSignal) =>
    apiClient.request<{ items: SavedAdminSearch[] }>({ method: "GET", path: "/admin-search/saved", headers: companyScopeHeaders(companyId), signal }),
  saveSearch: (companyId: string, query: string, name?: string) =>
    apiClient.request<SavedAdminSearch>({ method: "POST", path: "/admin-search/saved", headers: companyScopeHeaders(companyId), body: { query, ...(name ? { name } : {}) } }),
  deleteSaved: (companyId: string, id: string) =>
    apiClient.request<{ deleted: true }>({ method: "DELETE", path: `/admin-search/saved/${encodeURIComponent(id)}`, headers: companyScopeHeaders(companyId) }),
  access: (companyId: string, signal?: AbortSignal) =>
    apiClient.request<{ capabilities: string[] }>({ method: "GET", path: "/admin-search/access", headers: companyScopeHeaders(companyId), signal }),
};
