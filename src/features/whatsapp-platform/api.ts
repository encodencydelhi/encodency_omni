import { apiClient } from "@/lib/api/client";

export interface PlanLimits {
  enabled: boolean;
  maxNumbers: number | null;
  maxMessagesPerMonth: number | null;
}

export interface WhatsAppOverview {
  connections: Array<{ mode: "META" | "MOCK"; status: string; count: number }>;
  liveQuality: Record<string, number>;
  messages: { sentLast24h: number; failedLast24h: number; sentLast7d: number; failedLast7d: number; inboundLast24h: number; sentThisMonth: number };
  activeHolds: number;
  openAlerts: number;
  unroutedWebhooksLast24h: number;
  failedJobsLast24h: number;
  generatedAt: string;
}

export interface Hold {
  id: string;
  companyId: string;
  clientId: string | null;
  reason: string;
  createdAt: string;
  releasedAt?: string | null;
}

export interface ConnectionRow {
  id: string;
  companyId: string;
  companyName: string;
  clientId: string;
  clientName: string;
  mode: "META" | "MOCK";
  status: string;
  quality: string;
  displayPhone: string;
  businessName: string;
  activatedAt: string | null;
  updatedAt: string;
  sentLast7d: number;
  failedLast7d: number;
  lastInboundAt: string | null;
  hold: Hold | null;
  plan: { planName: string | null; limits: PlanLimits; sentThisMonth: number } | null;
}

export interface PlatformAlert {
  id: string;
  companyId: string;
  companyName: string | null;
  clientId: string;
  clientName: string | null;
  connectionId: string;
  kind: "QUALITY_LOW" | "HIGH_FAILURE_RATE" | "WEBHOOKS_SILENT" | "CONNECTION_ERROR";
  severity: "warning" | "critical";
  details: Record<string, number | string>;
  openedAt: string;
  lastSeenAt: string;
  resolvedAt: string | null;
}

export interface PlanRow {
  id: string;
  name: string;
  isActive: boolean;
  companies: number;
  whatsapp: PlanLimits;
}

const base = "/super-admin/whatsapp";

export interface RateCard { currency: string; unit: string; items: Array<{ category: string; ratePaise: number | null; updatedAt: string | null }> }

export const whatsappPlatformApi = {
  overview: (signal?: AbortSignal) => apiClient.request<WhatsAppOverview>({ method: "GET", path: `${base}/overview`, signal }),
  connections: (query: { search?: string; mode?: string; flag?: string; page?: number }, signal?: AbortSignal) =>
    apiClient.request<{ items: ConnectionRow[]; total: number; page: number; pageSize: number }>({
      method: "GET",
      path: `${base}/connections`,
      query: Object.fromEntries(Object.entries(query).filter(([, value]) => value !== undefined && value !== "")),
      signal,
    }),
  createHold: (body: { companyId: string; clientId?: string; reason: string }) => apiClient.request<Hold>({ method: "POST", path: `${base}/holds`, body }),
  releaseHold: (id: string) => apiClient.request<{ released: true }>({ method: "POST", path: `${base}/holds/${id}/release` }),
  alerts: (open: boolean, signal?: AbortSignal) => apiClient.request<PlatformAlert[]>({ method: "GET", path: `${base}/alerts`, query: { open: String(open) }, signal }),
  sweep: () => apiClient.request<{ opened: number; resolved: number; checked: number }>({ method: "POST", path: `${base}/alerts/sweep` }),
  plans: (signal?: AbortSignal) => apiClient.request<PlanRow[]>({ method: "GET", path: `${base}/plans`, signal }),
  rates: (signal?: AbortSignal) => apiClient.request<RateCard>({ method: "GET", path: `${base}/rates`, signal }),
  saveRates: (body: Record<string, number | null>) => apiClient.request<RateCard>({ method: "PUT", path: `${base}/rates`, body }),
  setPlanLimits: (id: string, body: PlanLimits) => apiClient.request<{ id: string; whatsapp: PlanLimits }>({ method: "PUT", path: `${base}/plans/${id}/limits`, body }),
};
