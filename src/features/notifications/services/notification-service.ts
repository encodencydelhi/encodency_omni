import { apiClient } from "@/lib/api/client";
import { toListQuery } from "@/lib/api/transport";
import type { ListParams, PaginatedResponse } from "@/types/api";
import type { AdminNotification, NotificationFilters } from "@/types/domain/notification";

export type NotificationListParams = ListParams<Record<keyof NotificationFilters, string>>;

export const notificationService = {
  list(params: NotificationListParams, signal?: AbortSignal) {
    return apiClient.request<PaginatedResponse<AdminNotification>>({
      method: "GET",
      path: "/notifications",
      query: toListQuery(params),
      signal,
    });
  },

  markRead(id: string) {
    return apiClient.request<{ success: boolean }>({
      method: "PATCH",
      path: `/notifications/${id}/read`,
    });
  },

  markAllRead() {
    return apiClient.request<{ success: boolean }>({
      method: "POST",
      path: "/notifications/read-all",
    });
  },
};
