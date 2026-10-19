import { apiClient } from "@/lib/api/client";
import { companyScopeHeaders } from "@/lib/api/company-scope";
import { getStoredClientId, getStoredCompanyId } from "@/lib/api/tenancy-storage";
import { ApiError } from "@/types/api";

export type CrmKind = "lead" | "contact" | "deal" | "task" | "activity" | "group" | "pipeline";
export type CrmAiKind = Extract<CrmKind, "lead" | "contact" | "deal" | "task">;

export interface CrmAiInsight {
  summary: string;
  risks: string[];
  nextBestAction: string;
  suggestedTaskTitle: string;
  score?: number;
  classification?: "cold" | "warm" | "hot";
  scoreReason?: string;
}

export interface CrmScope {
  companyId: string;
  clientId: string;
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
  convertLead<T>(id: string, input: { existingContactId?: string; contact: object; deal?: object }, scope?: CrmScope): Promise<T> {
    return apiClient.request<T>({ method: "POST", path: `/crm/leads/${encodeURIComponent(id)}/convert`, headers: headers(scope), body: input });
  },

  aiInsight(kind: CrmAiKind, id: string, scope?: CrmScope): Promise<{ kind: CrmAiKind; recordId: string; model: string; insight: CrmAiInsight }> {
    return apiClient.request({ method: "POST", path: `/crm/ai/${kind}/${encodeURIComponent(id)}`, headers: headers(scope), body: {} });
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
