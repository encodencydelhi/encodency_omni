import { apiClient } from "@/lib/api/client";
import { companyScopeHeaders } from "@/lib/api/company-scope";

/** Wire shape of `GET /super-admin/dashboard/overview` (backend: super-admin-overview.service.ts). */
export interface SuperAdminOverviewResponse {
  generatedAt: string;
  range: { key: string; days: number; from: string; to: string };
  metrics: {
    companies: { total: number; active: number; newInRange: number; changePercent: number | null };
    users: { total: number; deactivated: number; newInRange: number; changePercent: number | null };
    clients: { total: number; newInRange: number; changePercent: number | null };
    subscriptions: { active: number; pastDue: number; suspended: number; canceled: number };
    mrr: { amountMinor: number; currency: string };
    integrations: { connected: number; needAttention: number };
    incidents: { open: number };
  };
  companyGrowth: { total: number; series: Array<{ month: string; value: number }> };
  revenue: { mrrMinor: number; currency: string; collectedSeries: Array<{ month: string; value: number }> };
  subscriptionDistribution: { activeTotal: number; segments: Array<{ key: string; label: string; companies: number }> };
  latestSignups: Array<{ id: string; name: string; createdAt: string; plan: string | null; subscriptionStatus: string | null }>;
  apiUsage: {
    totalRequests: number;
    changePercent: number | null;
    successRate: number | null;
    failedRequests: number;
    serverErrors: number;
    avgResponseMs: number | null;
    series: number[];
  };
  integrationStatus: Array<{ id: string; name: string; status: "Connected" | "Error"; connections: number; needAttention: number }>;
  attention: Array<{ id: string; title: string; detail: string; severity: "critical" | "warning" | "info"; count: number; href: string; actionLabel: string }>;
  recentActivity: Array<{
    id: string;
    kind: "company_registered" | "plan_upgraded" | "user_invited" | "integration_connected" | "ticket_opened" | "payment_failed" | "other";
    action: string;
    title: string;
    actor: string;
    companyName: string | null;
    outcome: "SUCCESS" | "FAILURE";
    createdAt: string;
  }>;
}

export type CompanyChannelStatus = "Connected" | "Needs attention";

/** Wire shape of `GET /dashboard/company-overview` (backend: company-overview.service.ts). */
export interface CompanyOverviewResponse {
  generatedAt: string;
  range: { key: string; days: number; from: string; to: string };
  scope: { clientId: string | null; clients: Array<{ id: string; name: string }> };
  stats: {
    clients: { total: number; newInRange: number; previousNew: number };
    activeCampaigns: { count: number; endingSoon: number };
    scheduledPosts: { upcoming: number; nextSevenDays: number };
    publishedInRange: number;
    failedInRange: number;
    drafts: { total: number; pendingReview: number };
    channels: { connections: number; needAttention: number; providers: number };
    mediaAssets: number;
    members: number;
    pendingInvitations: number;
  };
  publishingActivity: Array<{ date: string; published: number; failed: number; scheduled: number }>;
  channels: Array<{ provider: string; label: string; status: CompanyChannelStatus; connections: number; needAttention: number; clientsUsing: number; resourcesMapped: number }>;
  attention: Array<{ id: string; title: string; detail: string; severity: "critical" | "warning" | "info"; kind: string; href: string }>;
  upcoming: Array<{ id: string; clientId: string; clientName: string | null; channel: string; scheduledFor: string; status: string; title: string }>;
  campaigns: Array<{ id: string; clientId: string; clientName: string | null; name: string; status: string; objective: string | null; startDate: string | null; endDate: string | null }>;
  activity: Array<{ id: string; action: string; label: string; actor: string; outcome: "SUCCESS" | "FAILURE"; createdAt: string }>;
}

export const overviewApi = {
  superAdmin: (range: string, signal?: AbortSignal) =>
    apiClient.request<SuperAdminOverviewResponse>({ method: "GET", path: "/super-admin/dashboard/overview", query: { range }, signal }),
  company: (companyId: string, params: { range: string; clientId?: string }, signal?: AbortSignal) =>
    apiClient.request<CompanyOverviewResponse>({
      method: "GET",
      path: "/dashboard/company-overview",
      query: params.clientId ? { range: params.range, clientId: params.clientId } : { range: params.range },
      headers: companyScopeHeaders(companyId),
      signal,
    }),
};
