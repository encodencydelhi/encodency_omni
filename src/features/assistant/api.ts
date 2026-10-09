import { apiClient } from "@/lib/api/client";
import { companyScopeHeaders } from "@/lib/api/company-scope";
import type { AssistantBootstrap, AssistantReply } from "./types";

export const assistantApi = {
  bootstrap: (companyId: string, path: string, locale: string | undefined, signal?: AbortSignal) =>
    apiClient.request<AssistantBootstrap>({ method: "GET", path: "/assistant/bootstrap", query: { path, ...(locale ? { locale } : {}) }, headers: companyScopeHeaders(companyId), signal }),
  chat: (companyId: string, body: { path: string; locale?: string; conversationId?: string; messages: Array<{ role: "user" | "assistant"; content: string }> }, signal?: AbortSignal) =>
    apiClient.request<AssistantReply>({ method: "POST", path: "/assistant/chat", body, headers: companyScopeHeaders(companyId), signal }),
  /** Tells the server which conversation a sent ticket came from (best effort). */
  linkTicket: (companyId: string, body: { conversationId: string; ticketNumber: number }) =>
    apiClient.request<{ linked: boolean }>({ method: "POST", path: "/assistant/conversation-ticket", body, headers: companyScopeHeaders(companyId) }),
};
