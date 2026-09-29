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