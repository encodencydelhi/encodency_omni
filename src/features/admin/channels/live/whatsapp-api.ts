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
};