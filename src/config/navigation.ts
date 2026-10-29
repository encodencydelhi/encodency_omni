import {
  ActivityIcon,
  BellIcon,
  Building2Icon,
  FlagIcon,
  FolderIcon,
  GaugeIcon,
  HeartPulseIcon,
  HeadsetIcon,
  HouseIcon,
  LayersIcon,
  ListChecksIcon,
  PlugIcon,
  ReceiptIcon,
  ScrollTextIcon,
  SettingsIcon,
  BotMessageSquareIcon,
  UserCogIcon,
  UsersIcon,
  WebhookIcon,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { AnimatedIconName } from "@/components/shared/animated-icon";
import { ROUTES } from "./routes";
import type { Permission } from "@/types/domain/team";

export interface NavItem {
  label: string;
  description: string;
  href: string;
  icon: LucideIcon;
  animatedIcon: AnimatedIconName;
  /** Hidden when the signed-in staff role lacks this permission. */
  permission: Permission;
  /** Extra path prefixes that should keep this item highlighted. */
  matchPrefixes?: string[];
}

export interface NavGroup {
  id: string;
  label: string;
  items: NavItem[];
}

/**
 * Super Admin navigation.
 *
 * Grouped by intent rather than by module count: what a tenant *is*
 * (Management), what it *pays for* (Business), what *runs* it (Platform), and
 * what the team *controls* (Control).
 *
 * Some entries cover two routes — "Plans & Subscriptions" owns both
 * `/plans` and `/subscriptions` — so the menu stays short while each area
 * keeps its own linkable URL.
 *
 * The Admin panel has its own menu; the two products share components, never
 * a navigation tree.
 */
export const SUPER_ADMIN_NAV: NavGroup[] = [
  {
    id: "overview",
    label: "Overview",
    items: [
      {
        label: "Dashboard",
        description: "View platform activity, revenue, and service health.",
        href: ROUTES.superAdmin.dashboard,
        icon: HouseIcon,
        animatedIcon: "dashboard",
        permission: "companies:read",
      },
    ],
  },
  {
    id: "management",
    label: "Management",
    items: [
      {
        label: "Companies",
        description: "Manage companies, ownership, and account status.",
        href: ROUTES.superAdmin.companies,
        icon: Building2Icon,
        animatedIcon: "companies",
        permission: "companies:read",
        matchPrefixes: [ROUTES.superAdmin.companies],
      },
      {
        label: "Users",
        description: "Manage user accounts, access, and activity.",
        href: ROUTES.superAdmin.users,
        icon: UsersIcon,
        animatedIcon: "users",
        permission: "users:read",
        matchPrefixes: [ROUTES.superAdmin.users],
      },
      {
        label: "Clients",
        description: "Manage client records and company associations.",
        href: ROUTES.superAdmin.Clients,
        icon: FolderIcon,
        animatedIcon: "clients",
        permission: "Clients:read",
        matchPrefixes: [ROUTES.superAdmin.Clients],
      },
      {
        label: "Internal Team",
        description: "Manage internal staff and platform access.",
        href: ROUTES.superAdmin.team,
        icon: UserCogIcon,
        animatedIcon: "team",
        permission: "users:read",
        matchPrefixes: [ROUTES.superAdmin.team],
      },
    ],
  },
  {
    id: "business",
    label: "Business",
    items: [
      {
        label: "Plans & Subscriptions",
        description: "Manage plans, pricing, and company subscriptions.",
        href: ROUTES.superAdmin.plans,
        icon: LayersIcon,
        animatedIcon: "plans",
        permission: "billing:read",
        matchPrefixes: [ROUTES.superAdmin.plans, ROUTES.superAdmin.subscriptions],
      },
      {
        label: "Billing & Payments",
        description: "Review invoices, payments, and billing activity.",
        href: ROUTES.superAdmin.billing,
        icon: ReceiptIcon,
        animatedIcon: "billing",
        permission: "billing:read",
        matchPrefixes: [ROUTES.superAdmin.billing],
      },
      {
        label: "Usage & Limits",
        description: "Monitor consumption, quotas, and limit overrides.",
        href: ROUTES.superAdmin.usage,
        icon: GaugeIcon,
        animatedIcon: "usage",
        matchPrefixes: [ROUTES.superAdmin.usage],
        permission: "companies:read",
      },
    ],
  },
  {
    id: "platform",
    label: "Platform",
    items: [
      {
        label: "Integrations",
        description: "Monitor connected services and connection issues.",
        href: ROUTES.superAdmin.integrations,
        icon: PlugIcon,
        animatedIcon: "integrations",
        permission: "platform:read",
        matchPrefixes: [ROUTES.superAdmin.integrations],
      },
      {
        label: "System Health",
        description: "Check service availability and investigate incidents.",
        href: ROUTES.superAdmin.systemHealth,
        icon: HeartPulseIcon,
        animatedIcon: "health",
        permission: "platform:read",
        matchPrefixes: [ROUTES.superAdmin.systemHealth],
      },
      {
        label: "Jobs & Queues",
        description: "Monitor queues, scheduled jobs, and failures.",
        href: ROUTES.superAdmin.jobs,
        icon: ListChecksIcon,
        animatedIcon: "jobs",
        permission: "platform:read",
      },
      {
        label: "API Monitoring",
        description: "Track API traffic, errors, and response times.",
        href: ROUTES.superAdmin.apiMonitoring,
        icon: ActivityIcon,
        animatedIcon: "apiMonitoring",
        permission: "platform:read",
        matchPrefixes: [ROUTES.superAdmin.apiMonitoring],
      },
      {
        label: "Webhooks",
        description: "Manage endpoints and inspect delivery attempts.",
        href: ROUTES.superAdmin.webhooks,
        icon: WebhookIcon,
        animatedIcon: "webhooks",
        permission: "platform:read",
      },
    ],
  },
  {
    id: "control",
    label: "Control",
    items: [
      {
        label: "Feature Flags",
        description: "Control feature availability and targeted rollouts.",
        href: ROUTES.superAdmin.featureFlags,
        icon: FlagIcon,
        animatedIcon: "flags",
        permission: "platform:read",
        matchPrefixes: [ROUTES.superAdmin.featureFlags],
      },
      {
        label: "Audit Logs",
        description: "Review platform changes and staff actions.",
        href: ROUTES.superAdmin.auditLogs,
        icon: ScrollTextIcon,
        animatedIcon: "audit",
        permission: "audit:read",
      },
      {
        label: "Support & Tickets",
        description: "Track support requests and manage resolutions.",
        href: ROUTES.superAdmin.support,
        icon: HeadsetIcon,
        animatedIcon: "support",
        permission: "companies:read",
      },
      {
        label: "AI Assistant",
        description: "Get help navigating and understanding the platform.",
        href: ROUTES.superAdmin.assistant,
        icon: BotMessageSquareIcon,
        animatedIcon: "assistant",
        permission: "companies:read",
        matchPrefixes: [ROUTES.superAdmin.assistant],
      },
      {
        label: "Notifications",
        description: "Review alerts and manage notification delivery.",
        href: ROUTES.superAdmin.notifications,
        icon: BellIcon,
        animatedIcon: "notifications",
        permission: "companies:read",
      },
    ],
  },
  {
    id: "settings",
    label: "Settings",
    items: [
      {
        label: "Global Settings",
        description: "Configure platform identity, security, and preferences.",
        href: ROUTES.superAdmin.settings,
        icon: SettingsIcon,
        animatedIcon: "settings",
        matchPrefixes: [ROUTES.superAdmin.settings],
        permission: "companies:read",
      },
    ],
  },
];

const ALL_ITEMS = SUPER_ADMIN_NAV.flatMap((group) => group.items);

/** Lookup used to resolve breadcrumb labels and page titles from a pathname. */
export const NAV_ITEMS_BY_HREF = new Map<string, NavItem>(
  ALL_ITEMS.map((item) => [item.href, item]),
);

export function isNavItemActive(item: NavItem, pathname: string): boolean {
  if (item.href === pathname) return true;
  return (item.matchPrefixes ?? []).some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}
