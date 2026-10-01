import { apiClient } from "@/lib/api/client";
import { companyScopeHeaders } from "@/lib/api/company-scope";
import { ApiError } from "@/types/api";

export type WhatsAppMessageStatus =
  | "QUEUED"
  | "SENDING"
  | "SENT"
  | "DELIVERED"
  | "READ"
  | "FAILED"
  | "REJECTED"
  | "OUTCOME_UNKNOWN";

export interface WhatsAppConfigPayload {
  displayName?: string;
  apiBaseUrl: string;
  /** Omit to keep the key already stored on the backend (write-only secret). */
  apiKey?: string;
  webhookSecret?: string;
  senderId?: string;
}

export interface WhatsAppConfigState {
  configured: boolean;
  provider: "AISENSY";
  status: string | null;
  displayName: string | null;
  apiBaseUrl: string | null;
  senderId: string | null;
  hasApiKey: boolean;
  hasWebhookSecret: boolean;
  updatedAt: string | null;
}

export interface WhatsAppConfigResult {
  id: string;
  provider: "AISENSY";
  status: string;
  displayName: string | null;
  apiBaseUrl: string;
  senderId: string | null;
  updatedAt: string;
}

export interface WhatsAppTemplate {
  id: string;
  name: string;
  providerTemplateId: string | null;
  language: string;
  category: string | null;
  status: "ENABLED" | "DISABLED";
  variables: string[];
  body: string | null;
  footer: string | null;
  updatedAt: string;
}

export interface UpsertWhatsAppTemplatePayload {
  name: string;
  providerTemplateId?: string;
  language: string;
  category?: string;
  variables: string[];
  body?: string;
  footer?: string;
}

export interface WhatsAppMessage {
  id: string;
  status: WhatsAppMessageStatus;
  templateId: string;
  destinationPhone: string;
  providerMessageId: string | null;
  failureReasonCode: string | null;
  /** Backend's human sentence for `failureReasonCode` (may be null for unknown codes). */
  failureReasonDetail?: string | null;
  sentAt: string | null;
  deliveredAt: string | null;
  readAt: string | null;
  failedAt: string | null;
  createdAt: string;
}

export interface SendWhatsAppMessagePayload {
  templateId: string;
  destinationPhone: string;
  variables: Record<string, string>;
  campaignId?: string;
}

export interface WhatsAppConfigTestResult {
  ok: boolean;
  /** WhatsAppErrorCode when `ok` is false, otherwise null. */
  code: string | null;
  upstreamStatus: number | null;
  templateCount: number;
  message: string;
}

/**
 * Operator-facing copy for backend WhatsAppErrorCode values. Unknown codes fall
 * back to the raw code so a new backend error never renders as an empty string.
 */
export function describeWhatsAppFailure(code: string | null | undefined): string | null {
  if (!code) return null;
  switch (code) {
    case "provider_endpoint_invalid":
      return "The API base URL does not answer like the AiSensy API. Use https://backend.aisensy.com (not https://aisensy.com).";
    case "provider_auth_failed":
      return "AiSensy rejected the API key. Check the API key in Settings.";
    case "provider_template_not_found":
      return "AiSensy has no API campaign with that name. Create a Live API campaign and sync templates.";
    case "template_variables_invalid":
      return "The template variables do not match the AiSensy campaign parameters.";
    case "provider_rate_limited":
      return "AiSensy rate-limited the request; it is retried automatically.";
    case "provider_temporarily_unavailable":
      return "AiSensy is temporarily unavailable; the request is retried automatically.";
    case "provider_outcome_unknown":
      return "The request timed out before AiSensy answered — delivery outcome is unknown.";
    case "provider_setup_required":
      return "WhatsApp provider setup is required before sending.";
    case "missing_provider_message_id":
      return "AiSensy accepted the request but returned no message ID.";
    case "provider_message_rejected":
      return "AiSensy refused the message — usually the campaign name does not exist in AiSensy or the attached template is not approved. Check the campaign name under Templates.";
    default:
      return code;
  }
}

export interface SendWhatsAppMessageResult {
  id: string;
  status: WhatsAppMessageStatus;
  templateId: string;
  destinationPhone: string;
  createdAt: string;
}

export interface WhatsAppTimelinePoint {
  date: string;
  label: string;
  sent: number;
  delivered: number;
  read: number;
  failed: number;
}

export interface WhatsAppDeliveryFunnel {
  sent: number;
  delivered: number;
  read: number;
  failed?: number;
  deliveryConversion: number;
  readConversion: number;
  failureConversion?: number;
}

export interface WhatsAppFailureReasonItem {
  code: string;
  label: string;
  count: number;
  percentage: number;
}

export interface WhatsAppPlatformImpact {
  messagesProcessed: number;
  campaignsManaged: number;
  contactsReached: number;
  templatesUsed: number;
  failedDetected: number;
  failedRecovered: number;
}

export interface WhatsAppCreditsAnalytics {
  available: boolean;
  reason: string;
  currency: string;
  currentBalance: number | null;
  lastUpdated: string | null;
  historical: Array<{ date: string; balance: number }>;
  consumption: {
    today: number;
    thisWeek: number;
    thisMonth: number;
  } | null;
  note: string;
}

export interface WhatsAppCampaignPerformancePoint {
  id: string;
  name: string;
  status: string;
  sent: number;
  delivered: number;
  read: number;
  failed: number;
  deliveryRate: number;
  readRate: number;
  failureRate: number;
}

export interface WhatsAppCampaignStatusItem {
  status: string;
  count: number;
}

export interface WhatsAppOptInStats {
  optedIn: number;
  optedOut: number;
  optedInPercentage: number;
  optedOutPercentage: number;
  total: number;
}

export interface WhatsAppAudienceGrowthPoint {
  date: string;
  label: string;
  totalContacts: number;
  optedIn: number;
  optedOut: number;
  activeContacts: number;
}

export interface WhatsAppAnalyticsQuery {
  range?: "today" | "7d" | "15d" | "30d" | "90d" | "this_month" | "last_month" | "custom";
  startDate?: string;
  endDate?: string;
}

export interface WhatsAppOverviewAnalytics {
  range?: string;
  total: number;
  sent: number;
  delivered: number;
  read: number;
  failed: number;
  deliveryRate: number;
  readRate: number;
  failureRate: number;
  activeContacts: number;
  totalCampaigns: number;
  timeline: WhatsAppTimelinePoint[];
  deliveryFunnel: WhatsAppDeliveryFunnel;
  failureReasons: WhatsAppFailureReasonItem[];
  platformImpact: WhatsAppPlatformImpact;
  credits: WhatsAppCreditsAnalytics;
  campaignPerformance: WhatsAppCampaignPerformancePoint[];
  campaignStatusDistribution: WhatsAppCampaignStatusItem[];
  templatePerformance: WhatsAppTemplateAnalyticsItem[];
  optInStats: WhatsAppOptInStats;
  audienceGrowth: WhatsAppAudienceGrowthPoint[];
}

export interface WhatsAppCampaignItem {
  id: string;
  name: string;
  type: string;
  status: string;
  audience: number;
  sent: number;
  delivered: number;
  read: number;
  failed: number;
  deliveryRate: number;
  readRate: number;
  createdAt: string;
  updatedAt: string;
}

export interface WhatsAppTemplateAnalyticsItem extends WhatsAppTemplate {
  total: number;
  sent: number;
  delivered: number;
  read: number;
  failed: number;
  deliveryRate: number;
  readRate: number;
  failureRate?: number;
  usageCount?: number;
  campaignsUsed: number;
  lastUsedAt: string | null;
}

export interface WhatsAppContactGrowthPoint {
  date: string;
  label: string;
  newContacts: number;
  totalContacts: number;
  activeContacts: number;
}

export interface WhatsAppContactItem {
  id: string;
  phone: string;
  name: string | null;
  source: string;
  status: string;
  optInStatus: boolean;
  tags: string[];
  lastActiveAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WhatsAppContactsResponse {
  items: WhatsAppContactItem[];
  growthTimeline: WhatsAppContactGrowthPoint[];
}

export interface WhatsAppWebhookHealth {
  status: "ACTIVE" | "NO_EVENTS";
  lastReceivedAt: string | null;
  totalEventsReceived: number;
}

export interface RetryWhatsAppMessageResult {
  id: string;
  status: WhatsAppMessageStatus;
}

function clientScopeHeaders(companyId: string, clientId: string): Record<string, string> {
  if (!clientId) {
    throw new ApiError({
      code: "NO_CLIENT_SELECTED",
      message: "Select a Client to continue.",
      status: 0,
    });
  }
  return companyScopeHeaders(companyId, { "x-client-id": clientId });
}

export const whatsappApi = {
  /**
   * GET /integrations/whatsapp/config
   * Business Purpose: Read back the non-secret AiSensy settings so the Settings
   * tab prefills from the backend instead of the browser. Secrets stay write-only.
   * Auth: @CompanyContextRoute() (x-company-id) + integrations:read.
   */
  async getConfig(companyId: string, signal?: AbortSignal): Promise<WhatsAppConfigState> {
    return apiClient.request<WhatsAppConfigState>({
      method: "GET",
      path: "/integrations/whatsapp/config",
      headers: companyScopeHeaders(companyId),
      signal,
    });
  },

  /**
   * PUT /integrations/whatsapp/config
   * Business Purpose: Create or update the Company-scoped AiSensy connection.
   * `apiKey` may be omitted on later saves to keep the stored key.
   * Auth: @CompanyContextRoute() (x-company-id) + integrations:write.
   */
  async configure(companyId: string, payload: WhatsAppConfigPayload, signal?: AbortSignal): Promise<WhatsAppConfigResult> {
    return apiClient.request<WhatsAppConfigResult>({
      method: "PUT",
      path: "/integrations/whatsapp/config",
      headers: companyScopeHeaders(companyId),
      body: payload,
      signal,
    });
  },

  /**
   * POST /integrations/whatsapp/config/test
   * Business Purpose: dry-run the AiSensy base URL + key without saving them.
   * The backend lists provider templates and answers 200 { ok, code, message }
   * for both outcomes so the form can render the result inline.
   * Auth: @CompanyContextRoute() (x-company-id) + integrations:write.
   */
  async testConfig(
    companyId: string,
    payload: { apiBaseUrl?: string; apiKey?: string },
    signal?: AbortSignal,
  ): Promise<WhatsAppConfigTestResult> {
    return apiClient.request<WhatsAppConfigTestResult>({
      method: "POST",
      path: "/integrations/whatsapp/config/test",
      headers: companyScopeHeaders(companyId),
      body: payload,
      signal,
    });
  },

  async listTemplates(companyId: string, clientId: string, signal?: AbortSignal): Promise<{ items: WhatsAppTemplate[] }> {
    return apiClient.request<{ items: WhatsAppTemplate[] }>({
      method: "GET",
      path: "/integrations/whatsapp/templates",
      headers: clientScopeHeaders(companyId, clientId),
      signal,
    });
  },

  async upsertTemplate(
    companyId: string,
    clientId: string,
    payload: UpsertWhatsAppTemplatePayload,
    signal?: AbortSignal,
  ): Promise<Pick<WhatsAppTemplate, "id" | "name" | "language" | "status" | "variables">> {
    return apiClient.request({
      method: "PUT",
      path: "/integrations/whatsapp/templates",
      headers: clientScopeHeaders(companyId, clientId),
      body: payload,
      signal,
    });
  },

  async syncTemplates(
    companyId: string,
    clientId: string,
    signal?: AbortSignal,
  ): Promise<{ synced: number; created: number; updated: number; items: WhatsAppTemplate[] }> {
    return apiClient.request({
      method: "POST",
      path: "/integrations/whatsapp/templates/sync",
      headers: clientScopeHeaders(companyId, clientId),
      signal,
    });
  },

  async sendMessage(
    companyId: string,
    clientId: string,
    payload: SendWhatsAppMessagePayload,
    signal?: AbortSignal,
  ): Promise<SendWhatsAppMessageResult> {
    return apiClient.request<SendWhatsAppMessageResult>({
      method: "POST",
      path: "/integrations/whatsapp/messages",
      headers: clientScopeHeaders(companyId, clientId),
      body: payload,
      signal,
    });
  },

  async listMessages(
    companyId: string,
    clientId: string,
    status?: WhatsAppMessageStatus,
    signal?: AbortSignal,
  ): Promise<{ items: WhatsAppMessage[] }> {
    return apiClient.request<{ items: WhatsAppMessage[] }>({
      method: "GET",
      path: "/integrations/whatsapp/messages",
      headers: clientScopeHeaders(companyId, clientId),
      query: status ? { status } : undefined,
      signal,
    });
  },

  async getMessage(companyId: string, clientId: string, id: string, signal?: AbortSignal): Promise<WhatsAppMessage> {
    return apiClient.request<WhatsAppMessage>({
      method: "GET",
      path: `/integrations/whatsapp/messages/${encodeURIComponent(id)}`,
      headers: clientScopeHeaders(companyId, clientId),
      signal,
    });
  },

  async getOverviewAnalytics(
    companyId: string,
    clientId: string,
    query?: WhatsAppAnalyticsQuery,
    signal?: AbortSignal,
  ): Promise<WhatsAppOverviewAnalytics> {
    return apiClient.request<WhatsAppOverviewAnalytics>({
      method: "GET",
      path: "/integrations/whatsapp/analytics/overview",
      headers: clientScopeHeaders(companyId, clientId),
      query: query as Record<string, string | number | boolean | undefined>,
      signal,
    });
  },

  async getCreditsAnalytics(
    companyId: string,
    clientId: string,
    signal?: AbortSignal,
  ): Promise<WhatsAppCreditsAnalytics> {
    return apiClient.request<WhatsAppCreditsAnalytics>({
      method: "GET",
      path: "/integrations/whatsapp/analytics/credits",
      headers: clientScopeHeaders(companyId, clientId),
      signal,
    });
  },

  async getFailuresAnalytics(
    companyId: string,
    clientId: string,
    query?: WhatsAppAnalyticsQuery,
    signal?: AbortSignal,
  ): Promise<{ totalFailed: number; items: WhatsAppFailureReasonItem[] }> {
    return apiClient.request<{ totalFailed: number; items: WhatsAppFailureReasonItem[] }>({
      method: "GET",
      path: "/integrations/whatsapp/analytics/failures",
      headers: clientScopeHeaders(companyId, clientId),
      query: query as Record<string, string | number | boolean | undefined>,
      signal,
    });
  },

  async getCampaigns(companyId: string, clientId: string, signal?: AbortSignal): Promise<{ items: WhatsAppCampaignItem[] }> {
    return apiClient.request<{ items: WhatsAppCampaignItem[] }>({
      method: "GET",
      path: "/integrations/whatsapp/analytics/campaigns",
      headers: clientScopeHeaders(companyId, clientId),
      signal,
    });
  },

  async createCampaign(
    companyId: string,
    clientId: string,
    payload: {
      name: string;
      status?: string;
      templateId?: string;
      recipients?: string[];
      variables?: Record<string, string>;
    },
    signal?: AbortSignal,
  ): Promise<WhatsAppCampaignItem> {
    return apiClient.request<WhatsAppCampaignItem>({
      method: "POST",
      path: "/integrations/whatsapp/campaigns",
      headers: clientScopeHeaders(companyId, clientId),
      body: payload,
      signal,
    });
  },

  async getTemplateAnalytics(companyId: string, clientId: string, signal?: AbortSignal): Promise<{ items: WhatsAppTemplateAnalyticsItem[] }> {
    return apiClient.request<{ items: WhatsAppTemplateAnalyticsItem[] }>({
      method: "GET",
      path: "/integrations/whatsapp/analytics/templates",
      headers: clientScopeHeaders(companyId, clientId),
      signal,
    });
  },

  async getContacts(companyId: string, clientId: string, signal?: AbortSignal): Promise<WhatsAppContactsResponse> {
    return apiClient.request<WhatsAppContactsResponse>({
      method: "GET",
      path: "/integrations/whatsapp/contacts",
      headers: clientScopeHeaders(companyId, clientId),
      signal,
    });
  },

  async getWebhookHealth(companyId: string, clientId: string, signal?: AbortSignal): Promise<WhatsAppWebhookHealth> {
    return apiClient.request<WhatsAppWebhookHealth>({
      method: "GET",
      path: "/integrations/whatsapp/webhooks/health",
      headers: clientScopeHeaders(companyId, clientId),
      signal,
    });
  },

  async retryMessage(companyId: string, clientId: string, id: string, signal?: AbortSignal): Promise<RetryWhatsAppMessageResult> {
    return apiClient.request<RetryWhatsAppMessageResult>({
      method: "POST",
      path: `/integrations/whatsapp/messages/${encodeURIComponent(id)}/retry`,
      headers: clientScopeHeaders(companyId, clientId),
      signal,
    });
  },
};