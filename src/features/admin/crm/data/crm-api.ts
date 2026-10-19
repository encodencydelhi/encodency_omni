import { apiClient } from "@/lib/api/client";
import { companyScopeHeaders } from "@/lib/api/company-scope";
import { getStoredClientId, getStoredCompanyId } from "@/lib/api/tenancy-storage";
import { ApiError } from "@/types/api";

export type CrmKind = "lead" | "contact" | "deal" | "task" | "activity" | "group" | "pipeline" | "company";
export type CrmAiKind = Extract<CrmKind, "lead" | "contact" | "deal" | "task" | "company">;

export interface CrmAiInsight {
  summary: string;
  risks: string[];
  nextBestAction: string;
  suggestedTaskTitle: string;
  emailDraft?: string;
  whatsappDraft?: string;
  score?: number;
  classification?: "cold" | "warm" | "hot";
  scoreReason?: string;
}

export interface CrmScope {
  companyId: string;
  clientId: string;
}

export interface CrmRecordHistory {
  activities: Array<{ id: string; description?: string; type?: string; actor?: string; createdAt: string }>;
  tasks: Array<{ id: string; title?: string; name?: string; status?: string; dueDate?: string; updatedAt: string }>;
  automationRuns: Array<{ id: string; workflowId: string; workflowName: string; status: string; triggerSource?: string | null; startedAt: string; completedAt?: string | null; durationMs: number }>;
}

function headers(scope?: CrmScope): Record<string, string> {
  const companyId = scope?.companyId ?? getStoredCompanyId();
  const clientId = scope?.clientId ?? getStoredClientId();
  if (!clientId) {
    throw new ApiError({
      code: "NO_CLIENT_SELECTED",
      message: "Select a Client to continue.",
      status: 0,
    });
  }
  return companyScopeHeaders(companyId, { "x-client-id": clientId });
}

function body(item: object) {
  const values = item as Record<string, unknown>;
  const person = `${values.firstName ?? ""} ${values.lastName ?? ""}`.trim();
  return {
    name: String(values.name ?? (person || values.title) ?? "Untitled"),
    email: values.email,
    status: values.status ?? values.stage,
    ownerId: values.ownerId,
    payload: values,
  };
}

export const crmApi = {
  duplicates<T>(kind: "lead" | "contact", values: { email?: string; phone?: string; excludeId?: string }, scope?: CrmScope): Promise<T[]> {
    const query = new URLSearchParams();
    if (values.email) query.set("email", values.email);
    if (values.phone) query.set("phone", values.phone);
    if (values.excludeId) query.set("excludeId", values.excludeId);
    return apiClient.request<T[]>({ method: "GET", path: `/crm/duplicates/${kind}?${query}`, headers: headers(scope) });
  },

  mergeContacts<T>(input: { primaryId: string; secondaryId: string; merged: object }, scope?: CrmScope): Promise<{ contact: T; relinked: number }> {
    return apiClient.request({ method: "POST", path: "/crm/contacts/merge", headers: headers(scope), body: input });
  },

  archived<T>(kind: CrmKind, scope?: CrmScope): Promise<Array<T & { archivedAt: string }>> {
    return apiClient.request({ method: "GET", path: `/crm/archived/${kind}`, headers: headers(scope) });
  },

  restore<T>(kind: CrmKind, id: string, scope?: CrmScope): Promise<T> {
    return apiClient.request({ method: "POST", path: `/crm/${kind}/${encodeURIComponent(id)}/restore`, headers: headers(scope), body: {} });
  },

  convertLead<T>(id: string, input: { existingContactId?: string; contact: object; deal?: object }, scope?: CrmScope): Promise<T> {
    return apiClient.request<T>({ method: "POST", path: `/crm/leads/${encodeURIComponent(id)}/convert`, headers: headers(scope), body: input });
  },

  aiInsight(kind: CrmAiKind, id: string, scope?: CrmScope): Promise<{ kind: CrmAiKind; recordId: string; model: string; insight: CrmAiInsight }> {
    return apiClient.request({ method: "POST", path: `/crm/ai/${kind}/${encodeURIComponent(id)}`, headers: headers(scope), body: {} });
  },

  history(kind: CrmKind, id: string, scope?: CrmScope): Promise<CrmRecordHistory> {
    return apiClient.request({ method: "GET", path: `/crm/${kind}/${encodeURIComponent(id)}/history`, headers: headers(scope) });
  },

  list<T>(kind: CrmKind, scope?: CrmScope): Promise<T[]> {
    return apiClient.request<T[]>({ method: "GET", path: `/crm/${kind}`, headers: headers(scope) });
  },

  get<T>(kind: CrmKind, id: string, scope?: CrmScope): Promise<T> {
    return apiClient.request<T>({ method: "GET", path: `/crm/${kind}/${encodeURIComponent(id)}`, headers: headers(scope) });
  },

  create<T extends object>(kind: CrmKind, item: T, scope?: CrmScope): Promise<T> {
    return apiClient.request<T>({ method: "POST", path: `/crm/${kind}`, headers: headers(scope), body: body(item) });
  },

  update<T extends object>(kind: CrmKind, id: string, item: T, scope?: CrmScope): Promise<T> {
    return apiClient.request<T>({ method: "PATCH", path: `/crm/${kind}/${encodeURIComponent(id)}`, headers: headers(scope), body: body(item) });
  },

  remove(kind: CrmKind, id: string, scope?: CrmScope): Promise<void> {
    return apiClient.request<void>({ method: "DELETE", path: `/crm/${kind}/${encodeURIComponent(id)}`, headers: headers(scope) });
  },
};
