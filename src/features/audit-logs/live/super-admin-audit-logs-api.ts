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

export interface SuperAdminAuditLogItem {
  id: string;
  createdAt: string;
  action: string;
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
    const q: Record<string, string | number | undefined> = {};
    if (query?.page) q.page = query.page;
    if (query?.limit) q.limit = query.limit;
    if (query?.action) q.action = query.action;
    if (query?.resourceType) q.resourceType = query.resourceType;
    if (query?.outcome) q.outcome = query.outcome;
    if (query?.actorUserId) q.actorUserId = query.actorUserId;
    if (query?.companyId) q.companyId = query.companyId;
    if (query?.clientId) q.clientId = query.clientId;
    if (query?.from) q.from = query.from;
    if (query?.to) q.to = query.to;

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
};
