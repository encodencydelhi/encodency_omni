import { apiClient } from "@/lib/api/client";

export type PlatformRole = "SUPER_ADMIN" | "SUPPORT" | "USER";
export type SystemRole = "OWNER" | "ADMIN" | "MANAGER" | "VIEWER";
export type CompanyStatus = "ACTIVE" | "SUSPENDED" | "ARCHIVED";
export type UserStatus = "ACTIVE" | "DEACTIVATED";

export interface SuperAdminUserSummary {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  platformRole: PlatformRole;
  status: UserStatus;
  deactivatedAt: string | null;
  mfaEnabled: boolean;
  membershipCount: number;
  companyCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface SuperAdminUserMembership {
  membershipId: string;
  company: {
    id: string;
    name: string;
    status: CompanyStatus;
  };
  systemRole: SystemRole;
  jobTitle: string | null;
  department: string | null;
  clientAccessCount: number;
  createdAt: string;
}

export interface SuperAdminUserDetail extends SuperAdminUserSummary {
  memberships: SuperAdminUserMembership[];
}

export interface ListSuperAdminUsersQuery {
  page?: number;
  limit?: number;
  search?: string;
  platformRole?: PlatformRole;
  companyId?: string;
  systemRole?: SystemRole;
}

export interface SuperAdminUserListResponse {
  items: SuperAdminUserSummary[];
  total: number;
  page: number;
  limit: number;
}

export const superAdminUsersApi = {
  /**
   * GET /api/v1/super-admin/users
   * Super Admin only. No x-company-id header. Read-only V1 (TASK-16).
   */
  async list(query?: ListSuperAdminUsersQuery, signal?: AbortSignal): Promise<SuperAdminUserListResponse> {
    const q: Record<string, string | number | undefined> = {};
    if (query?.page) q.page = query.page;
    if (query?.limit) q.limit = query.limit;
    if (query?.search) q.search = query.search;
    if (query?.platformRole) q.platformRole = query.platformRole;
    if (query?.companyId) q.companyId = query.companyId;
    if (query?.systemRole) q.systemRole = query.systemRole;

    return apiClient.request<SuperAdminUserListResponse>({
      method: "GET",
      path: "/super-admin/users",
      query: q,
      signal,
    });
  },

  /**
   * GET /api/v1/super-admin/users/:userId
   * Super Admin only. No x-company-id header. Returns detail with memberships.
   */
  async get(userId: string, signal?: AbortSignal): Promise<SuperAdminUserDetail> {
    return apiClient.request<SuperAdminUserDetail>({
      method: "GET",
      path: `/super-admin/users/${encodeURIComponent(userId)}`,
      signal,
    });
  },

  /**
   * PATCH /api/v1/super-admin/users/:userId/status (Phase B1)
   * Super Admin only. Sets status to ACTIVE or DEACTIVATED.
   */
  async setStatus(userId: string, status: UserStatus, signal?: AbortSignal): Promise<{ status: UserStatus }> {
    return apiClient.request<{ status: UserStatus }>({
      method: "PATCH",
      path: `/super-admin/users/${encodeURIComponent(userId)}/status`,
      body: { status },
      signal,
    });
  },

  /**
   * POST /api/v1/super-admin/users/:userId/revoke-sessions (Phase B2)
   * Super Admin only. Revokes all active sessions for another user.
   */
  async revokeSessions(userId: string, signal?: AbortSignal): Promise<{ revokedSessions: number }> {
    return apiClient.request<{ revokedSessions: number }>({
      method: "POST",
      path: `/super-admin/users/${encodeURIComponent(userId)}/revoke-sessions`,
      signal,
    });
  },

  /**
   * POST /api/v1/super-admin/users/:userId/password-reset (Phase B3)
   * Super Admin only. Triggers admin-issued password reset email for an active user.
   */
  async passwordReset(userId: string, signal?: AbortSignal): Promise<{ status: "queued" }> {
    return apiClient.request<{ status: "queued" }>({
      method: "POST",
      path: `/super-admin/users/${encodeURIComponent(userId)}/password-reset`,
      signal,
    });
  },
};
