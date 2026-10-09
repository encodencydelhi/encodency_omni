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

/** Support notifications open the ticket: staff-facing types on the desk, customer-facing types on the Company's Support page. */
const DESK_SUPPORT_TYPES = new Set(["support.ticket_created", "support.customer_replied", "support.ticket_reopened", "support.ticket_assigned"]);

function supportHref(item: BackendNotificationItem): string | null {
  const number = item.data?.ticketNumber;
  if (!item.type.startsWith("support.") || typeof number !== "number") return null;
  return DESK_SUPPORT_TYPES.has(item.type) ? `/super-admin/support/tickets/${number}` : `/admin/support/tickets/${number}`;
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

  let href: string | null = supportHref(item);
  if (!href) {
    if (typeof item.data?.scheduledPostId === "string") {
      href = `/admin/content?post=${encodeURIComponent(item.data.scheduledPostId)}`;
    } else if (typeof item.data?.draftId === "string") {
      href = `/admin/content-studio`;
    } else if (typeof item.data?.clientId === "string") {
      href = `/admin/clients/${encodeURIComponent(item.data.clientId)}`;
    } else if (typeof item.data?.href === "string") {
      href = item.data.href;
    } else if (typeof item.data?.link === "string") {
      href = item.data.link;
    }
  }

  return {
    id: item.id,
    title: item.title,
    body: item.message,
    category,
    severity,
    isRead: Boolean(item.readAt),
    href,
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

    try {
      const res = await apiClient.request<BackendNotificationListResponse | PaginatedResponse<AdminNotification>>({
        method: "GET",
        path: "/notifications",
        query,
        signal,
      });

      if ("items" in res && Array.isArray(res.items)) {
        const page = res.page || 1;
        const pageSize = res.limit || 25;
        const total =
          query.unreadOnly && typeof res.unreadCount === "number"
            ? res.unreadCount
            : res.total || 0;
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
    } catch (err) {
      console.warn("Failed to fetch notifications:", err);
      return {
        data: [],
        pagination: {
          page: 1,
          pageSize: params.pageSize || 25,
          total: 0,
          totalPages: 1,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      };
    }
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
