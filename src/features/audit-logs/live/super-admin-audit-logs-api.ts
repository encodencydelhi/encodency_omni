import { apiClient } from "@/lib/api/client";

export type AuditActorType = "USER" | "SYSTEM";
export type AuditOutcomeBackend = "SUCCESS" | "FAILURE";
export type PlatformRole = "SUPER_ADMIN" | "SUPPORT" | "USER";

export interface SuperAdminAuditLogActor {
  type: AuditActorType;
  userId: string | null;
  platformRole: PlatformRole | null;
  membershipId: string | null;
  name: string | null;
  email: string | null;
}

export type LiveAuditCategory = "authentication" | "companies" | "users_access" | "internal_team" | "clients" | "content_campaigns" | "plans_subscriptions" | "billing" | "integrations" | "support_operations";
export type LiveSensitiveCategory = "privileged_access" | "billing_financial" | "subscription_entitlements" | "integrations" | "platform_security" | "data_privacy";
export type LiveSecurityView = "authentication" | "user_access" | "staff" | "policies";

export interface SuperAdminAuditLogItem {
  id: string;
  createdAt: string;
  action: string;
  label: string;
  category: LiveAuditCategory;
  module: string;
  sensitiveCategory: LiveSensitiveCategory | null;
  priority: "high" | "review_recommended" | "informational";
  securityView: LiveSecurityView | null;
  accessChange: boolean;
  configChange: boolean;
  resourceType: string;
  resourceId: string | null;
  outcome: AuditOutcomeBackend;
  actor: SuperAdminAuditLogActor;
  companyId: string | null;
  companyName: string | null;
  clientId: string | null;
  clientName: string | null;
  metadata: Record<string, unknown> | null;
  requestId: string | null;
  ipAddress: string | null;
  userAgent: string | null;
}

export interface ListSuperAdminAuditLogsQuery {
  page?: number;
  limit?: number;
  action?: string;
  resourceType?: string;
  outcome?: AuditOutcomeBackend;
  actorUserId?: string;
  companyId?: string;
  clientId?: string;
  from?: string; // ISO-8601 with timezone (Z or ±hh:mm)
  to?: string;   // ISO-8601 with timezone (Z or ±hh:mm)
  category?: string;
  sensitiveOnly?: boolean;
  sensitiveCategory?: string;
  securityView?: string;
  quick?: string;
  priority?: string;
  actorType?: string;
  requestId?: string;
  module?: string;
  search?: string;
  sort?: "newest" | "oldest" | "actor";
}

export interface SuperAdminAuditLogListResponse {
  items: SuperAdminAuditLogItem[];
  total: number;
  page: number;
  limit: number;
}

export const superAdminAuditLogsApi = {
  /**
   * GET /api/v1/super-admin/audit-logs
   * Super Admin only. Session cookie auth. Read-only append-only audit trail (TASK-17).
   */
  async list(query?: ListSuperAdminAuditLogsQuery, signal?: AbortSignal): Promise<SuperAdminAuditLogListResponse> {
    const q: Record<string, string | number | boolean | undefined> = {};
    for (const [key, value] of Object.entries(query ?? {})) {
      if (value === undefined || value === "" || value === false) continue;
      q[key] = value as string | number | boolean;
    }

    return apiClient.request<SuperAdminAuditLogListResponse>({
      method: "GET",
      path: "/super-admin/audit-logs",
      query: q,
      signal,
    });
  },

  /**
   * GET /api/v1/super-admin/audit-logs/:id
   * Super Admin only. Returns individual audit record with full metadata.
   */
  async get(id: string, signal?: AbortSignal): Promise<SuperAdminAuditLogItem> {
    return apiClient.request<SuperAdminAuditLogItem>({
      method: "GET",
      path: `/super-admin/audit-logs/${encodeURIComponent(id)}`,
      signal,
    });
  },

  /** GET /super-admin/audit-logs/:id together with the other events of the same request. */
  async detail(id: string, signal?: AbortSignal): Promise<SuperAdminAuditLogItem & { sameRequest: SuperAdminAuditLogItem[] }> {
    return apiClient.request({ method: "GET", path: `/super-admin/audit-logs/${encodeURIComponent(id)}`, signal });
  },

  overview(range: { from?: string; to?: string }): Promise<LiveAuditOverview> {
    return apiClient.request({ method: "GET", path: "/super-admin/audit-logs/overview", query: range });
  },

  activity(range: { from?: string; to?: string; metric?: string }): Promise<{ unit: "hour" | "day" | "week"; metric: string; points: Array<{ at: string; value: number }> }> {
    return apiClient.request({ method: "GET", path: "/super-admin/audit-logs/activity", query: range });
  },

  facets(range: { from?: string; to?: string } = {}): Promise<LiveAuditFacets> {
    return apiClient.request({ method: "GET", path: "/super-admin/audit-logs/facets", query: range });
  },

  counts(range: { from?: string; to?: string }): Promise<{ security: Record<LiveSecurityView, number>; sensitive: Record<LiveSensitiveCategory, number> }> {
    return apiClient.request({ method: "GET", path: "/super-admin/audit-logs/counts", query: range });
  },

  coverage(): Promise<LiveAuditCoverage> {
    return apiClient.request({ method: "GET", path: "/super-admin/audit-logs/coverage" });
  },

  export(body: Record<string, unknown>): Promise<{ filename: string; format: "csv" | "json"; content: string; count: number; redactedFields: string[]; exportEventId: string }> {
    return apiClient.request({ method: "POST", path: "/super-admin/audit-logs/export", body });
  },
};

export interface LiveAuditOverview {
  from: string;
  to: string;
  kpis: { total: number; sensitive: number; failed: number; accessChanges: number; authFailures: number; configChanges: number };
  categories: Array<{ category: LiveAuditCategory; count: number }>;
  attention: SuperAdminAuditLogItem[];
  recentSensitive: SuperAdminAuditLogItem[];
  lastRecordedAt: string | null;
  totalRecorded: number;
}

export interface LiveAuditFacets {
  actors: Array<{ id: string; name: string; email: string; type: "staff" | "company_user" }>;
  companies: Array<{ id: string; name: string }>;
  actions: Array<{ key: string; label: string }>;
  resourceTypes: string[];
  sourceModules: string[];
}

export interface LiveAuditCoverage {
  modules: Array<{ module: string; category: LiveAuditCategory; definedActions: number; recordedActions: number; recordedCount: number; lastRecordedAt: string | null }>;
  totalRecorded: number;
  firstRecordedAt: string | null;
  lastRecordedAt: string | null;
  retention: { deletion: "never"; note: string };
  maxRangeDays: number;
  maxExportRows: number;
}

/* ------------------------------ investigations ------------------------------ */

const inv = "/super-admin/audit-investigations";
const enc = encodeURIComponent;

export const auditInvestigationsApi = {
  list(query: Record<string, string | undefined> = {}): Promise<unknown> {
    return apiClient.request({ method: "GET", path: inv, query });
  },
  owners(): Promise<Array<{ id: string; name: string; role: string }>> {
    return apiClient.request({ method: "GET", path: `${inv}/owners` });
  },
  create(body: Record<string, unknown>): Promise<unknown> {
    return apiClient.request({ method: "POST", path: inv, body });
  },
  get(id: string): Promise<{ investigation: unknown; events: Array<{ link: unknown; event: SuperAdminAuditLogItem | null }>; related: unknown[] }> {
    return apiClient.request({ method: "GET", path: `${inv}/${enc(id)}` });
  },
  linkCheck(id: string, eventId: string): Promise<{ ok: boolean; duplicate: boolean; message: string }> {
    return apiClient.request({ method: "GET", path: `${inv}/${enc(id)}/link-check`, query: { eventId } });
  },
  addEvents(id: string, body: { eventIds: string[]; note: string }): Promise<unknown> {
    return apiClient.request({ method: "POST", path: `${inv}/${enc(id)}/events`, body });
  },
  unlink(id: string, eventId: string): Promise<unknown> {
    return apiClient.request({ method: "DELETE", path: `${inv}/${enc(id)}/events/${enc(eventId)}` });
  },
  relevance(id: string, eventId: string, note: string): Promise<unknown> {
    return apiClient.request({ method: "PATCH", path: `${inv}/${enc(id)}/events/${enc(eventId)}`, body: { note } });
  },
  addNote(id: string, body: { text: string; correctsNoteId?: string | null }): Promise<unknown> {
    return apiClient.request({ method: "POST", path: `${inv}/${enc(id)}/notes`, body });
  },
  changeOwner(id: string, body: { ownerId: string; reason: string }): Promise<unknown> {
    return apiClient.request({ method: "PUT", path: `${inv}/${enc(id)}/owner`, body });
  },
  changeStatus(id: string, status: string): Promise<unknown> {
    return apiClient.request({ method: "PUT", path: `${inv}/${enc(id)}/status`, body: { status } });
  },
  changePriority(id: string, priority: string): Promise<unknown> {
    return apiClient.request({ method: "PUT", path: `${inv}/${enc(id)}/priority`, body: { priority } });
  },
  close(id: string, body: { reason: string; conclusion: string }): Promise<unknown> {
    return apiClient.request({ method: "POST", path: `${inv}/${enc(id)}/close`, body });
  },
};
