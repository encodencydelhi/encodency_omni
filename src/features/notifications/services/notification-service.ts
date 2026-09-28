import { apiClient } from "@/lib/api/client";
import type { ListParams, PaginatedResponse } from "@/types/api";
import type { AdminNotification, NotificationFilters } from "@/types/domain/notification";

export type NotificationListParams = ListParams<Record<keyof NotificationFilters, string>>;

export interface BackendNotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  data: Record<string, unknown> | null;
  readAt: string | null;
  createdAt: string;
  companyId: string | null;
  clientId: string | null;
}

export interface BackendNotificationListResponse {
  items: BackendNotificationItem[];
  total: number;
  unreadCount: number;
  page: number;
  limit: number;
}

function toAdminNotification(item: BackendNotificationItem): AdminNotification {
  const isPublishing = item.type.startsWith("publishing.");
  const isDraft = item.type.startsWith("draft.");
  const isInvitation = item.type.startsWith("invitation.");

  const category = isPublishing
    ? "integration"
    : isDraft
    ? "system"
    : isInvitation
    ? "security"
    : "system";

  const severity = item.type === "publishing.failed"
    ? "critical"
    : item.type === "publishing.outcome_unknown"
    ? "warning"
    : "info";

  return {
    id: item.id,
    title: item.title,
    body: item.message,
    category,
    severity,
    isRead: Boolean(item.readAt),
    href: typeof item.data?.scheduledPostId === "string"
      ? `/admin/content?post=${encodeURIComponent(item.data.scheduledPostId)}`
      : null,
    source: item.companyId ?? "system",
    createdAt: item.createdAt,
  };
}

export const notificationService = {
  async list(params: NotificationListParams = {}, signal?: AbortSignal): Promise<PaginatedResponse<AdminNotification>> {
    const query: Record<string, string | number | boolean> = {};
    if (params.page) query.page = params.page;
    if (params.pageSize) query.limit = params.pageSize;
    if (
      params.filters?.readState === "unread" ||
      (params as { unread?: boolean }).unread === true
    ) {
      query.unreadOnly = true;
    }

    const res = await apiClient.request<BackendNotificationListResponse | PaginatedResponse<AdminNotification>>({
      method: "GET",
      path: "/notifications",
      query,
      signal,
    });

    if ("items" in res && Array.isArray(res.items)) {
      const page = res.page || 1;
      const pageSize = res.limit || 25;
      const total = res.total || 0;
      const totalPages = Math.max(1, Math.ceil(total / pageSize));

      return {
        data: res.items.map(toAdminNotification),
        pagination: {
          page,
          pageSize,
          total,
          totalPages,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1,
        },
      };
    }

    return res as PaginatedResponse<AdminNotification>;
  },

  async markRead(id: string): Promise<{ success: boolean }> {
    await apiClient.request({
      method: "PATCH",
      path: `/notifications/${encodeURIComponent(id)}/read`,
    });
    return { success: true };
  },

  async markAllRead(): Promise<{ success: boolean }> {
    await apiClient.request({
      method: "POST",
      path: "/notifications/read-all",
    });
    return { success: true };
  },
};
