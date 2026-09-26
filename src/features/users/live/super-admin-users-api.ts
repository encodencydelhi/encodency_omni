import { apiClient } from "@/lib/api/client";

export type PlatformRole = "SUPER_ADMIN" | "SUPPORT" | "USER";
export type SystemRole = "OWNER" | "ADMIN" | "MANAGER" | "VIEWER";
export type CompanyStatus = "ACTIVE" | "SUSPENDED" | "ARCHIVED";

export interface SuperAdminUserSummary {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  platformRole: PlatformRole;
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
};
