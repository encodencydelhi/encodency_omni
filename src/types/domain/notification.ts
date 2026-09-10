import type { StatusRegistry } from "@/types/common";

export const NOTIFICATION_CATEGORY = {
  system: { label: "System", tone: "neutral" },
  billing: { label: "Billing", tone: "info" },
  integration: { label: "Integration", tone: "warning" },
  support: { label: "Support", tone: "neutral" },
  security: { label: "Security", tone: "danger" },
} as const satisfies StatusRegistry<string>;

export type NotificationCategory = keyof typeof NOTIFICATION_CATEGORY;

export const NOTIFICATION_SEVERITY = {
  critical: { label: "Critical", tone: "danger" },
  warning: { label: "Warning", tone: "warning" },
  info: { label: "Info", tone: "info" },
} as const satisfies StatusRegistry<string>;

export type NotificationSeverity = keyof typeof NOTIFICATION_SEVERITY;

export interface AdminNotification {
  id: string;
  title: string;
  body: string;
  category: NotificationCategory;
  severity: NotificationSeverity;
  isRead: boolean;
  href: string | null;
  source: string;
  createdAt: string;
}

export interface NotificationFilters {
  category: NotificationCategory;
  severity: NotificationSeverity;
  readState: "read" | "unread";
}
