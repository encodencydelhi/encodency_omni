import { apiClient } from "@/lib/api/client";
import { toListQuery } from "@/lib/api/transport";
import type { ListParams, PaginatedResponse } from "@/types/api";
import type { PlatformUser, UserFilters, UserStatus } from "@/types/domain/user";

export type UserListParams = ListParams<Record<keyof UserFilters, string>>;

export const userService = {
  list(params: UserListParams, signal?: AbortSignal) {
    return apiClient.request<PaginatedResponse<PlatformUser>>({
      method: "GET",
      path: "/users",
      query: toListQuery(params),
      signal,
    });
  },

  get(id: string, signal?: AbortSignal) {
    return apiClient.request<PlatformUser>({ method: "GET", path: `/users/${id}`, signal });
  },

  changeStatus(id: string, status: UserStatus) {
    return apiClient.request<PlatformUser>({
      method: "PATCH",
      path: `/users/${id}/status`,
      body: { status },
    });
  },
};
