import { apiClient } from "@/lib/api/client";

export type SuperAdminSearchKind =
  | "page"
  | "command"
  | "company"
  | "client"
  | "user"
  | "staff"
  | "support_ticket"
  | "plan"
  | "subscription"
  | "invoice"
  | "payment"
  | "billing_account"
  | "integration"
  | "audit_log"
  | "notification"
  | "webhook"
  | "api_request";

export interface SuperAdminSearchResult {
  id: string;
  kind: SuperAdminSearchKind;
  group: string;
  title: string;
  subtitle: string;
  href: string;
  badge?: string;
  tone?: "brand" | "success" | "warning" | "danger" | "info" | "neutral";
  preview: Array<{ label: string; value: string }>;
  score: number;
}

export interface SuperAdminSearchMore {
  kind: SuperAdminSearchKind;
  group: string;
  total: number;
  shown: number;
}

export interface SuperAdminSearchResponse {
  items: SuperAdminSearchResult[];
  scope: SuperAdminSearchKind[] | null;
  text: string;
  more: SuperAdminSearchMore[];
}

export const superAdminSearchApi = {
  search(q: string, limit = 30, signal?: AbortSignal) {
    return apiClient.request<SuperAdminSearchResponse>({
      method: "GET",
      path: "/super-admin/search",
      query: { q, limit },
      signal,
    });
  },
  recordClick(query: string, result: SuperAdminSearchResult, source = "global") {
    return apiClient.request<void>({
      method: "POST",
      path: "/super-admin/search/click",
      body: { query, result, source },
    });
  },
};
