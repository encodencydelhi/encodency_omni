import { apiClient } from "@/lib/api/client";
import { companyScopeHeaders } from "@/lib/api/company-scope";
import { getStoredClientId } from "@/lib/api/tenancy-storage";
import type { AssistantBootstrap, AssistantConversationDetail, AssistantConversationList, AssistantReply } from "./types";

/** The selected Client travels with questions, so lookups such as "how many leads" are about the Client on screen. */
const withClient = (companyId: string) => {
  const clientId = getStoredClientId();
  return companyScopeHeaders(companyId, clientId ? { "x-client-id": clientId } : {});
};

export const assistantApi = {
  bootstrap: (companyId: string, path: string, locale: string | undefined, signal?: AbortSignal) =>
    apiClient.request<AssistantBootstrap>({ method: "GET", path: "/assistant/bootstrap", query: { path, ...(locale ? { locale } : {}) }, headers: withClient(companyId), signal }),
  chat: (companyId: string, body: { path: string; locale?: string; conversationId?: string; messages: Array<{ role: "user" | "assistant"; content: string }> }, signal?: AbortSignal) =>
    apiClient.request<AssistantReply>({ method: "POST", path: "/assistant/chat", body, headers: withClient(companyId), signal }),
  /** Tells the server which conversation a sent ticket came from (best effort). */
  linkTicket: (companyId: string, body: { conversationId: string; ticketNumber: number }) =>
    apiClient.request<{ linked: boolean }>({ method: "POST", path: "/assistant/conversation-ticket", body, headers: companyScopeHeaders(companyId) }),
  /** Thumbs up or down on one of the person's own answers. */
  feedback: (companyId: string, body: { messageId: string; rating: "positive" | "negative"; reason?: string }) =>
    apiClient.request<{ saved: true }>({ method: "POST", path: "/assistant/feedback", body, headers: companyScopeHeaders(companyId) }),
  /** The person pressed Confirm on a card the assistant prepared. Nothing happens without this call. */
  confirmAction: (companyId: string, id: string, body: { title?: string; description?: string; dueDate?: string; priority?: string; workflowId?: string }) =>
    apiClient.request<{ done: true; message: string; href: string | null }>({ method: "POST", path: `/assistant/actions/${id}/confirm`, body, headers: withClient(companyId) }),
  cancelAction: (companyId: string, id: string) =>
    apiClient.request<{ cancelled: boolean }>({ method: "POST", path: `/assistant/actions/${id}/cancel`, headers: companyScopeHeaders(companyId) }),
  conversations: (companyId: string, signal?: AbortSignal) =>
    apiClient.request<AssistantConversationList>({ method: "GET", path: "/assistant/conversations", query: { limit: 10 }, headers: companyScopeHeaders(companyId), signal }),
  conversation: (companyId: string, id: string, signal?: AbortSignal) =>
    apiClient.request<AssistantConversationDetail>({ method: "GET", path: `/assistant/conversations/${id}`, query: { limit: 80 }, headers: companyScopeHeaders(companyId), signal }),
  archiveConversation: (companyId: string, id: string) =>
    apiClient.request<{ archived: true }>({ method: "PATCH", path: `/assistant/conversations/${id}/archive`, headers: companyScopeHeaders(companyId) }),
  deleteConversation: (companyId: string, id: string) =>
    apiClient.request<{ deleted: true }>({ method: "DELETE", path: `/assistant/conversations/${id}`, headers: companyScopeHeaders(companyId) }),
};
