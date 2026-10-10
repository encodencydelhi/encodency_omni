import { apiClient } from "@/lib/api/client";

export type SuperAdminSearchKind =
  | "page"
  | "command"
  | "company"
  | "client"
  | "user"
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

export const superAdminSearchApi = {
  search(q: string, limit = 30, signal?: AbortSignal) {
    return apiClient.request<{ items: SuperAdminSearchResult[] }>({
      method: "GET",
      path: "/super-admin/search",
      query: { q, limit },
      signal,
    });
  },
};
