import { superAdminUsersApi } from "../live/super-admin-users-api";
import type { ListParams, PaginatedResponse } from "@/types/api";
import type { PlatformUser, UserStatus } from "@/types/domain/user";

export type UserListParams = ListParams<Record<string, string>>;

export const userService = {
  async list(params: UserListParams, signal?: AbortSignal): Promise<PaginatedResponse<PlatformUser>> {
    const raw = await superAdminUsersApi.list(
      {
        page: params.page,
        limit: params.pageSize,
        search: params.search,
        companyId: params.filters?.companyId,
      },
      signal,
    );

    const totalPages = Math.ceil(raw.total / raw.limit) || 1;
    const data: PlatformUser[] = raw.items.map((u) => ({
      id: u.id,
      email: u.email,
      name: u.name ?? u.email.split("@")[0] ?? "User",
      avatarUrl: u.avatarUrl,
      company: {
        id: "platform",
        name: "OmniPlatform",
      },
      role: (u.platformRole === "SUPER_ADMIN" ? "owner" : "viewer") as any,
      status: "active" as UserStatus,
      projectCount: u.companyCount,
      createdAt: u.createdAt,
      lastLoginAt: u.updatedAt,
      mfaEnabled: u.mfaEnabled,
    }));

    return {
      data,
      pagination: {
        page: raw.page,
        pageSize: raw.limit,
        total: raw.total,
        totalPages,
        hasNextPage: raw.page < totalPages,
        hasPreviousPage: raw.page > 1,
      },
    };
  },

  async get(id: string, signal?: AbortSignal): Promise<PlatformUser> {
    const u = await superAdminUsersApi.get(id, signal);
    const firstMembership = u.memberships[0];

    return {
      id: u.id,
      email: u.email,
      name: u.name ?? u.email.split("@")[0] ?? "User",
      avatarUrl: u.avatarUrl,
      company: firstMembership
        ? {
            id: firstMembership.company.id,
            name: firstMembership.company.name,
          }
        : {
            id: "platform",
            name: "OmniPlatform",
          },
      role: (firstMembership?.systemRole?.toLowerCase() === "owner" ? "owner" : "viewer") as any,
      status: "active" as UserStatus,
      projectCount: u.memberships.reduce((acc, m) => acc + (m.clientAccessCount || 0), 0),
      createdAt: u.createdAt,
      lastLoginAt: u.updatedAt,
      mfaEnabled: u.mfaEnabled,
    };
  },

  async changeStatus(id: string, _status: UserStatus): Promise<PlatformUser> {
    // TASK-16 V1 is read-only on backend. Return current user state.
    return this.get(id);
  },
};
