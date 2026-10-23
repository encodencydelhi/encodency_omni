import { apiClient } from "@/lib/api/client";
import { companyScopeHeaders } from "@/lib/api/company-scope";

export const WEBHOOK_EVENTS = [
  "support.ticket.created",
  "support.ticket.resolved",
  "scheduled_post.published",
  "scheduled_post.failed",
  "lead.created",
] as const;

export interface CompanyWebhookEndpoint {
  id: string;
  companyId: string;
  url: string;
  events: string[];
  enabled: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface CompanyWebhookDelivery {
  id: string;
  endpointId: string;
  event: string;
  status: "queued" | "sending" | "delivered" | "failed";
  attempts: number;
  nextAttemptAt: string;
  responseCode: number | null;
  lastError: string | null;
  durationMs: number | null;
  deliveredAt: string | null;
  createdAt: string;
  endpoint: { url: string };
}

const headers = (companyId: string) => companyScopeHeaders(companyId);

export const companyWebhooksApi = {
  endpoints: (companyId: string) => apiClient.request<CompanyWebhookEndpoint[]>({ method: "GET", path: "/webhooks/endpoints", headers: headers(companyId) }),
  deliveries: (companyId: string) => apiClient.request<CompanyWebhookDelivery[]>({ method: "GET", path: "/webhooks/deliveries", headers: headers(companyId) }),
  create: (companyId: string, body: { url: string; events: string[]; enabled: boolean }) => apiClient.request<{ endpoint: CompanyWebhookEndpoint; secret: string }>({ method: "POST", path: "/webhooks/endpoints", headers: headers(companyId), body }),
  update: (companyId: string, id: string, body: { url: string; events: string[]; enabled: boolean }) => apiClient.request<CompanyWebhookEndpoint>({ method: "PATCH", path: `/webhooks/endpoints/${encodeURIComponent(id)}`, headers: headers(companyId), body }),
  remove: (companyId: string, id: string) => apiClient.request<{ deleted: boolean }>({ method: "DELETE", path: `/webhooks/endpoints/${encodeURIComponent(id)}`, headers: headers(companyId) }),
  test: (companyId: string, id: string) => apiClient.request<CompanyWebhookDelivery>({ method: "POST", path: `/webhooks/endpoints/${encodeURIComponent(id)}/test`, headers: headers(companyId), body: {} }),
};
