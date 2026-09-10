import { ApiError } from "@/types/api";
import type { AuditLogEntry } from "@/types/domain/audit-log";
import { DASHBOARD_SNAPSHOT } from "../data/dashboard";
import type { FeatureFlag, ToggleFeatureFlagInput } from "@/types/domain/feature-flag";
import type { AdminNotification } from "@/types/domain/notification";
import type { PlatformSettings, SettingsSectionKey } from "@/types/domain/settings";
import type { SupportTicket } from "@/types/domain/support";
import { AUDIT_LOG, FEATURE_FLAGS, FLAG_CATEGORIES, NOTIFICATIONS, SUPPORT_TICKETS } from "../data/control";
import { SUPPORT_AGENTS } from "../data/internal-team";
import { PLATFORM_SETTINGS } from "../data/settings";
import { compare, dateAtOrAfter, dateAtOrBefore, equals, queryCollection } from "../lib/collection";
import type { MockRoutes } from "../lib/router";

const flagOverrides = new Map<string, Partial<FeatureFlag>>();
const ticketOverrides = new Map<string, Partial<SupportTicket>>();
const readNotifications = new Set<string>();

function resolveFlags(): FeatureFlag[] {
  return FEATURE_FLAGS.map((flag) => ({ ...flag, ...flagOverrides.get(flag.id) }));
}

function resolveTickets(): SupportTicket[] {
  return SUPPORT_TICKETS.map((ticket) => ({ ...ticket, ...ticketOverrides.get(ticket.id) }));
}

function resolveNotifications(): AdminNotification[] {
  return NOTIFICATIONS.map((notification) =>
    readNotifications.has(notification.id) ? { ...notification, isRead: true } : notification,
  );
}

const auditQueryConfig = {
  searchable: (entry: AuditLogEntry) => [
    entry.actor.name,
    entry.actor.email,
    entry.action,
    entry.resource.label,
    entry.ipAddress,
  ],
  filters: {
    category: equals<AuditLogEntry>((entry) => entry.category),
    outcome: equals<AuditLogEntry>((entry) => entry.outcome),
    actorType: equals<AuditLogEntry>((entry) => entry.actor.type),
    companyId: equals<AuditLogEntry>((entry) => entry.company?.id ?? ""),
    dateFrom: dateAtOrAfter<AuditLogEntry>((entry) => entry.createdAt),
    dateTo: dateAtOrBefore<AuditLogEntry>((entry) => entry.createdAt),
  },
  sorters: {
    createdAt: compare.date<AuditLogEntry>((entry) => entry.createdAt),
    actor: compare.text<AuditLogEntry>((entry) => entry.actor.name),
    action: compare.text<AuditLogEntry>((entry) => entry.action),
    category: compare.text<AuditLogEntry>((entry) => entry.category),
  },
  defaultSort: { field: "createdAt", direction: "desc" as const },
};

const TICKET_PRIORITY_ORDER = ["urgent", "high", "normal", "low"] as const;

const ticketQueryConfig = {
  searchable: (ticket: SupportTicket) => [
    ticket.reference,
    ticket.subject,
    ticket.company.name,
    ticket.requester.email,
  ],
  filters: {
    status: equals<SupportTicket>((ticket) => ticket.status),
    priority: equals<SupportTicket>((ticket) => ticket.priority),
    assigneeId: (ticket: SupportTicket, value: string) =>
      value === "unassigned" ? ticket.assignee === null : ticket.assignee?.id === value,
    companyId: equals<SupportTicket>((ticket) => ticket.company.id),
  },
  sorters: {
    createdAt: compare.date<SupportTicket>((ticket) => ticket.createdAt),
    updatedAt: compare.date<SupportTicket>((ticket) => ticket.updatedAt),
    priority: compare.ordinal<SupportTicket, (typeof TICKET_PRIORITY_ORDER)[number]>(
      TICKET_PRIORITY_ORDER,
      (ticket) => ticket.priority,
    ),
    status: compare.text<SupportTicket>((ticket) => ticket.status),
    company: compare.text<SupportTicket>((ticket) => ticket.company.name),
  },
  defaultSort: { field: "updatedAt", direction: "desc" as const },
};

export const controlRoutes: MockRoutes = {
  "GET /dashboard": () => DASHBOARD_SNAPSHOT,

  "GET /feature-flags/categories": () => FLAG_CATEGORIES,

  "GET /feature-flags": ({ query }) =>
    queryCollection(resolveFlags(), query, {
      searchable: (flag: FeatureFlag) => [flag.name, flag.key, flag.description, flag.category],
      filters: {
        scope: equals<FeatureFlag>((flag) => flag.scope),
        state: equals<FeatureFlag>((flag) => flag.state),
        category: equals<FeatureFlag>((flag) => flag.category),
      },
      sorters: {
        name: compare.text<FeatureFlag>((flag) => flag.name),
        updatedAt: compare.date<FeatureFlag>((flag) => flag.updatedAt),
      },
      defaultSort: { field: "name", direction: "asc" },
      // Flags are reviewed as a whole board rather than paged through.
    }),

  "PATCH /feature-flags/:id": ({ params, body }) => {
    const id = params.id ?? "";
    const flag = resolveFlags().find((item) => item.id === id);
    if (!flag) {
      throw new ApiError({ code: "NOT_FOUND", status: 404, message: "Feature flag not found." });
    }

    const { state } = (body ?? {}) as ToggleFeatureFlagInput;
    const next: Partial<FeatureFlag> = {
      state,
      rolloutPercent: state === "enabled" ? 100 : state === "disabled" ? 0 : flag.rolloutPercent,
      updatedAt: new Date().toISOString(),
    };

    flagOverrides.set(id, { ...flagOverrides.get(id), ...next });
    return { ...flag, ...next };
  },

  "GET /audit-logs": ({ query }) => queryCollection(AUDIT_LOG, query, auditQueryConfig),

  "GET /support/agents": () => SUPPORT_AGENTS,

  "GET /support/tickets": ({ query }) => queryCollection(resolveTickets(), query, ticketQueryConfig),

  "PATCH /support/tickets/:id": ({ params, body }) => {
    const id = params.id ?? "";
    const ticket = resolveTickets().find((item) => item.id === id);
    if (!ticket) {
      throw new ApiError({ code: "NOT_FOUND", status: 404, message: "Ticket not found." });
    }

    const patch = (body ?? {}) as Partial<Pick<SupportTicket, "status" | "priority" | "assignee">>;
    const next = { ...patch, updatedAt: new Date().toISOString() };

    ticketOverrides.set(id, { ...ticketOverrides.get(id), ...next });
    return { ...ticket, ...next };
  },

  "GET /notifications": ({ query }) =>
    queryCollection(resolveNotifications(), query, {
      searchable: (notification: AdminNotification) => [notification.title, notification.body, notification.source],
      filters: {
        category: equals<AdminNotification>((notification) => notification.category),
        severity: equals<AdminNotification>((notification) => notification.severity),
        readState: (notification: AdminNotification, value: string) =>
          value === "read" ? notification.isRead : !notification.isRead,
      },
      sorters: { createdAt: compare.date<AdminNotification>((notification) => notification.createdAt) },
      defaultSort: { field: "createdAt", direction: "desc" },
    }),

  "POST /notifications/read-all": () => {
    for (const notification of NOTIFICATIONS) readNotifications.add(notification.id);
    return { success: true };
  },

  "PATCH /notifications/:id/read": ({ params }) => {
    readNotifications.add(params.id ?? "");
    return { success: true };
  },

  "GET /settings": () => PLATFORM_SETTINGS,

  "PATCH /settings/:section": ({ params, body }) => {
    const section = (params.section ?? "") as SettingsSectionKey;
    if (!(section in PLATFORM_SETTINGS)) {
      throw new ApiError({ code: "NOT_FOUND", status: 404, message: "Unknown settings section." });
    }

    Object.assign(PLATFORM_SETTINGS[section], body as Partial<PlatformSettings[SettingsSectionKey]>);
    return PLATFORM_SETTINGS;
  },
};
