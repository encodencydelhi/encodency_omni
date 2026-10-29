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
}

export const adminSearchApi = {
  search: (companyId: string, q: string, limit = 20, signal?: AbortSignal) =>
    apiClient.request<AdminSearchResponse>({ method: "GET", path: "/admin-search", query: { q, limit }, headers: companyScopeHeaders(companyId), signal }),
  access: (companyId: string, signal?: AbortSignal) =>
    apiClient.request<{ capabilities: string[] }>({ method: "GET", path: "/admin-search/access", headers: companyScopeHeaders(companyId), signal }),
};
