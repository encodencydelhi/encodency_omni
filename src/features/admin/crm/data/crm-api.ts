import { apiClient } from "@/lib/api/client";
import { companyScopeHeaders } from "@/lib/api/company-scope";
import { getStoredClientId, getStoredCompanyId } from "@/lib/api/tenancy-storage";
import { ApiError } from "@/types/api";
import { collectCrmPages, type CrmPage } from "./crm-pagination";

export type CrmAccountFilter = "all" | "customer" | "prospect" | "discovered";
export interface CrmAccount {
  id: string; name: string; industry: string; website: string; location: string; ownerId?: string; ownerName?: string;
  status?: string; persisted: boolean; contactCount: number; dealCount: number; pipelineValue: number; wonValue: number;
}
export interface CrmAccountTotals { accounts: number; contacts: number; pipelineValue: number; wonValue: number }
export interface CrmAccountDetail {
  account: CrmAccount;
  contacts: Array<{ id: string; firstName: string; lastName: string; name: string; role: string }>;
  deals: Array<{ id: string; name: string; stage: string; value: number }>;
}
export type CrmDealsFilters = { pipelineId?: string; search?: string; ownerId?: string; priority?: string; close?: string; today?: string };
export type CrmDealsPageOptions = CrmDealsFilters & { stage: string; cursor?: string; limit?: number };
export interface CrmDealsSummary {
  pipelineId: string;
  total: number;
  stages: Array<{ stage: string; total: number; count: number; value: number }>;
  metrics: { open: { count: number; value: number; weighted: number }; won: { count: number }; lost: { count: number }; wonThisMonth: { count: number; value: number } };
  forecast: { closingCount: number; bestCase: number; expected: number; committed: number; overdue: number };
  owners: Array<{ id: string; name: string }>;
  pipelineCounts: Record<string, number>;
}
export type CrmTasksPageOptions = { relatedDealId?: string; cursor?: string; limit?: number; search?: string; status?: string; priority?: string; type?: string; sort?: string; dir?: "asc" | "desc" };
export interface CrmTasksStats {
  total: number;
  byStatus: Record<string, number>; byPriority: Record<string, number>; byType: Record<string, number>;
  byAssignee: Array<{ name: string; count: number }>;
  created: Array<{ date: string; count: number }>; completed: Array<{ date: string; count: number }>;
  monthly: Array<{ month: string; count: number }>;
  overdue: number; dueToday: number;
}
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

  listPage<T>(kind: CrmKind, options: { entityId?: string; cursor?: string; limit?: number; search?: string; status?: string; source?: string; ownerId?: string; group?: string; tag?: string } = {}, scope?: CrmScope): Promise<CrmPage<T>> {
    return apiClient.request<CrmPage<T>>({ method: "GET", path: `/crm/${kind}/page`, query: options, headers: headers(scope) });
  },

  /** Accounts (companies + names discovered on contacts/deals) with counts and values computed by the server. */
  accountsPage(options: { cursor?: string; limit?: number; search?: string; filter?: CrmAccountFilter } = {}, scope?: CrmScope): Promise<CrmPage<CrmAccount>> {
    return apiClient.request<CrmPage<CrmAccount>>({ method: "GET", path: "/crm/accounts/page", query: options, headers: headers(scope) });
  },

  /** Per-stage counts and values, the cards' figures, the forecast, owners and pipeline sizes, computed by the database. */
  dealsSummary(filters: CrmDealsFilters, scope?: CrmScope, signal?: AbortSignal): Promise<CrmDealsSummary> {
    return apiClient.request<CrmDealsSummary>({ method: "GET", path: "/crm/deals/summary", query: filters, headers: headers(scope), signal });
  },

  /** One stage's cards (newest first), with a cursor; `total` and `value` are that stage's filtered figures. */
  dealsPage<T>(options: CrmDealsPageOptions, scope?: CrmScope, signal?: AbortSignal): Promise<CrmPage<T> & { total: number; value: number }> {
    return apiClient.request<CrmPage<T> & { total: number; value: number }>({ method: "GET", path: "/crm/deals/page", query: options, headers: headers(scope), signal });
  },

  /** Moves one deal between stages atomically. `fromStage` makes a move from a stale board fail with 409 instead of overriding. */
  moveDeal<T>(id: string, body: { stage: string; fromStage?: string; lostReason?: string }, scope?: CrmScope): Promise<T> {
    return apiClient.request<T>({ method: "POST", path: `/crm/deals/${encodeURIComponent(id)}/move`, headers: headers(scope), body });
  },

  /** Tasks, filtered, sorted and paged by the server. `total` is the filtered count for the whole scope. */
  tasksPage<T>(options: CrmTasksPageOptions = {}, scope?: CrmScope, signal?: AbortSignal): Promise<CrmPage<T> & { total: number }> {
    return apiClient.request<CrmPage<T> & { total: number }>({ method: "GET", path: "/crm/tasks/page", query: options, headers: headers(scope), signal });
  },

  /** Counts for the cards, charts and board headers; `today` is the viewer's local date (YYYY-MM-DD). */
  tasksStats(today: string, scope?: CrmScope, signal?: AbortSignal): Promise<CrmTasksStats> {
    return apiClient.request<CrmTasksStats>({ method: "GET", path: "/crm/tasks/stats", query: { today }, headers: headers(scope), signal });
  },

  accountTotals(scope?: CrmScope): Promise<CrmAccountTotals> {
    return apiClient.request<CrmAccountTotals>({ method: "GET", path: "/crm/accounts/totals", headers: headers(scope) });
  },

  accountDetail(id: string, scope?: CrmScope, signal?: AbortSignal): Promise<CrmAccountDetail> {
    return apiClient.request<CrmAccountDetail>({ method: "GET", path: `/crm/accounts/${encodeURIComponent(id)}`, headers: headers(scope), signal });
  },

  list<T>(kind: CrmKind, scope?: CrmScope): Promise<T[]> {
    // Resolve selection once so switching tenants cannot mix two scopes into one result.
    const scopeHeaders = headers(scope);
    return collectCrmPages<T>((cursor) => apiClient.request<CrmPage<T>>({
      method: "GET", path: `/crm/${kind}/page`, query: { cursor, limit: 200 }, headers: scopeHeaders,
    }));
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
