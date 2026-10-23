import { apiClient } from "@/lib/api/client";
import { buildNotificationsSnapshot } from "./provider";
import type { AnnouncementInput, NotificationSnapshot } from "./types";

export interface NotificationsRepository {
  loadSnapshot(): Promise<NotificationSnapshot>;
  /** Puts a failed or not-sent e-mail / WhatsApp delivery back in the queue. */
  retry(deliveryId: string): Promise<NotificationSnapshot>;
  /** Sends a platform announcement now; returns how many people it went to. */
  announce(input: AnnouncementInput): Promise<{ sent: number }>;
}

/** Sample data for NEXT_PUBLIC_NOTIFICATIONS_MOCK_MODE=true only; nothing is sent. */
class MockNotificationsRepository implements NotificationsRepository {
  async loadSnapshot() {
    return buildNotificationsSnapshot("production");
  }
  async retry() {
    return buildNotificationsSnapshot("production");
  }
  async announce() {
    return { sent: 0 };
  }
}

class LiveNotificationsRepository implements NotificationsRepository {
  async loadSnapshot() {
    return apiClient.request<NotificationSnapshot>({ method: "GET", path: "/super-admin/notifications/snapshot" });
  }
  async retry(deliveryId: string) {
    return apiClient.request<NotificationSnapshot>({ method: "POST", path: `/super-admin/notifications/deliveries/${encodeURIComponent(deliveryId)}/retry` });
  }
  async announce(input: AnnouncementInput) {
    return apiClient.request<{ sent: number }>({ method: "POST", path: "/super-admin/notifications/announcements", body: input });
  }
}

export const notificationsRepository: NotificationsRepository =
  process.env.NEXT_PUBLIC_NOTIFICATIONS_MOCK_MODE === "true" ? new MockNotificationsRepository() : new LiveNotificationsRepository();
