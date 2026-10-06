import { apiClient } from "@/lib/api/client";
import { buildNotificationsSnapshot } from "./provider";
import type { NotificationEnvironment, NotificationSnapshot } from "./types";

export interface NotificationsRepository {
  loadSnapshot(environment: NotificationEnvironment): Promise<NotificationSnapshot>;
  replaceSection<K extends keyof NotificationSnapshot>(environment: NotificationEnvironment, section: K, value: NotificationSnapshot[K]): Promise<NotificationSnapshot>;
  requestRecovery(environment: NotificationEnvironment, deliveryId: string): Promise<NotificationSnapshot>;
}

class MockNotificationsRepository implements NotificationsRepository {
  async loadSnapshot(environment: NotificationEnvironment) {
    return buildNotificationsSnapshot(environment);
  }
  async replaceSection<K extends keyof NotificationSnapshot>(environment: NotificationEnvironment, section: K, value: NotificationSnapshot[K]) {
    return { ...buildNotificationsSnapshot(environment), [section]: value };
  }
  async requestRecovery(environment: NotificationEnvironment, deliveryId: string) {
    const snapshot = buildNotificationsSnapshot(environment);
    return {
      ...snapshot,
      deliveries: snapshot.deliveries.map((delivery) => delivery.id === deliveryId ? { ...delivery, recoveryRequested: true } : delivery),
      recoveryRequests: [{ id: `rec_${Date.now()}`, deliveryId, requestedAt: new Date().toISOString(), requestedBy: "Super Admin", reason: "Manual delivery outcome review" }, ...snapshot.recoveryRequests],
    };
  }
}

class LiveNotificationsRepository implements NotificationsRepository {
  async loadSnapshot(environment: NotificationEnvironment) {
    return apiClient.request<NotificationSnapshot>({ method: "GET", path: "/super-admin/notifications/snapshot", query: { environment } });
  }
  async replaceSection<K extends keyof NotificationSnapshot>(environment: NotificationEnvironment, section: K, value: NotificationSnapshot[K]) {
    return apiClient.request<NotificationSnapshot>({ method: "PUT", path: `/super-admin/notifications/sections/${String(section)}`, query: { environment }, body: { value } });
  }
  async requestRecovery(environment: NotificationEnvironment, deliveryId: string) {
    return apiClient.request<NotificationSnapshot>({ method: "POST", path: `/super-admin/notifications/deliveries/${deliveryId}/recovery`, query: { environment } });
  }
}

export const notificationsRepository: NotificationsRepository =
  process.env.NEXT_PUBLIC_NOTIFICATIONS_MOCK_MODE === "true" ? new MockNotificationsRepository() : new LiveNotificationsRepository();
