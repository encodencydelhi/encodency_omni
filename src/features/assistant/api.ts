import { apiClient } from "@/lib/api/client";
import { companyScopeHeaders } from "@/lib/api/company-scope";
import type { AssistantBootstrap, AssistantConversationDetail, AssistantConversationList, AssistantReply } from "./types";

export const assistantApi = {
  bootstrap: (companyId: string, path: string, locale: string | undefined, signal?: AbortSignal) =>
    apiClient.request<AssistantBootstrap>({ method: "GET", path: "/assistant/bootstrap", query: { path, ...(locale ? { locale } : {}) }, headers: companyScopeHeaders(companyId), signal }),
  chat: (companyId: string, body: { path: string; locale?: string; conversationId?: string; messages: Array<{ role: "user" | "assistant"; content: string }> }, signal?: AbortSignal) =>
    apiClient.request<AssistantReply>({ method: "POST", path: "/assistant/chat", body, headers: companyScopeHeaders(companyId), signal }),
  /** Tells the server which conversation a sent ticket came from (best effort). */
  linkTicket: (companyId: string, body: { conversationId: string; ticketNumber: number }) =>
    apiClient.request<{ linked: boolean }>({ method: "POST", path: "/assistant/conversation-ticket", body, headers: companyScopeHeaders(companyId) }),
  conversations: (companyId: string, signal?: AbortSignal) =>
    apiClient.request<AssistantConversationList>({ method: "GET", path: "/assistant/conversations", query: { limit: 10 }, headers: companyScopeHeaders(companyId), signal }),
  conversation: (companyId: string, id: string, signal?: AbortSignal) =>
    apiClient.request<AssistantConversationDetail>({ method: "GET", path: `/assistant/conversations/${id}`, query: { limit: 80 }, headers: companyScopeHeaders(companyId), signal }),
  archiveConversation: (companyId: string, id: string) =>
    apiClient.request<{ archived: true }>({ method: "PATCH", path: `/assistant/conversations/${id}/archive`, headers: companyScopeHeaders(companyId) }),
  deleteConversation: (companyId: string, id: string) =>
    apiClient.request<{ deleted: true }>({ method: "DELETE", path: `/assistant/conversations/${id}`, headers: companyScopeHeaders(companyId) }),
};
