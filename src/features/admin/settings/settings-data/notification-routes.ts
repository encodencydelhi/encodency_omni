"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { companyScopeHeaders } from "@/lib/api/company-scope";
import { useTenancyContext } from "@/lib/api/tenancy-context";

export type DeliveryChannel = "email" | "whatsapp";

export interface NotificationRouteEvent {
  key: string;
  group: "operational" | "collaboration" | "account";
  title: string;
  description: string;
  email: boolean;
  whatsapp: boolean;
  defaults: Record<DeliveryChannel, boolean>;
  notes: Partial<Record<DeliveryChannel, string>>;
  locked: DeliveryChannel[];
  customized: boolean;
}

export interface NotificationRoutes {
  emailReady: boolean;
  whatsappReady: boolean;
  events: NotificationRouteEvent[];
}

export interface NotificationDeliveryItem {
  id: string;
  channel: DeliveryChannel;
  status: "queued" | "sending" | "sent" | "failed" | "skipped";
  attempts: number;
  error: string | null;
  createdAt: string;
  sentAt: string | null;
  title: string;
  event: string;
  recipient: string;
  recipientEmail: string;
}

export interface NotificationDeliveries {
  lastWeek: Partial<Record<NotificationDeliveryItem["status"], number>>;
  items: NotificationDeliveryItem[];
}

const api = {
  routes: (companyId: string) => apiClient.request<NotificationRoutes>({ method: "GET", path: "/notifications/routes", headers: companyScopeHeaders(companyId) }),
  save: (companyId: string, routes: { event: string; email: boolean; whatsapp: boolean }[]) =>
    apiClient.request<NotificationRoutes>({ method: "PUT", path: "/notifications/routes", headers: companyScopeHeaders(companyId), body: { routes } }),
  deliveries: (companyId: string) => apiClient.request<NotificationDeliveries>({ method: "GET", path: "/notifications/deliveries", headers: companyScopeHeaders(companyId) }),
};

const keys = {
  routes: (companyId: string) => ["notification-routes", companyId] as const,
  deliveries: (companyId: string) => ["notification-deliveries", companyId] as const,
};

/** The Company's notification channels per event, plus its recent e-mail / WhatsApp deliveries (refreshed every 30 s). */
export function useNotificationRouting() {
  const { companyId, isReady } = useTenancyContext();
  const enabled = isReady && Boolean(companyId);
  const qc = useQueryClient();
  const routes = useQuery({ queryKey: keys.routes(companyId), queryFn: () => api.routes(companyId), enabled, retry: false });
  const deliveries = useQuery({ queryKey: keys.deliveries(companyId), queryFn: () => api.deliveries(companyId), enabled, retry: false, refetchInterval: 30_000 });
  const save = useMutation({
    mutationFn: (rows: { event: string; email: boolean; whatsapp: boolean }[]) => api.save(companyId, rows),
    onSuccess: (data) => qc.setQueryData(keys.routes(companyId), data),
  });
  return { routes, deliveries, save };
}
