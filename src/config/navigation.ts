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
  UserCogIcon,
  UsersIcon,
  WebhookIcon,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { ROUTES } from "./routes";
import type { Permission } from "@/types/domain/team";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
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
    label: "Super Admin",
    items: [
      {
        label: "Dashboard",
        href: ROUTES.superAdmin.dashboard,
        icon: HouseIcon,
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
        href: ROUTES.superAdmin.companies,
        icon: Building2Icon,
        permission: "companies:read",
        matchPrefixes: [ROUTES.superAdmin.companies],
      },
      { label: "Users", href: ROUTES.superAdmin.users, icon: UsersIcon, permission: "users:read" },
      {
        label: "Clients",
        href: ROUTES.superAdmin.Clients,
        icon: FolderIcon,
        permission: "Clients:read",
      },
      {
        label: "Internal Team",
        href: ROUTES.superAdmin.team,
        icon: UserCogIcon,
        permission: "users:read",
      },
    ],
  },
  {
    id: "business",
    label: "Business",
    items: [
      {
        label: "Plans & Subscriptions",
        href: ROUTES.superAdmin.plans,
        icon: LayersIcon,
        permission: "billing:read",
        matchPrefixes: [ROUTES.superAdmin.plans, ROUTES.superAdmin.subscriptions],
      },
      {
        label: "Billing & Payments",
        href: ROUTES.superAdmin.billing,
        icon: ReceiptIcon,
        permission: "billing:read",
      },
      {
        label: "Usage & Limits",
        href: ROUTES.superAdmin.usage,
        icon: GaugeIcon,
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
        href: ROUTES.superAdmin.integrations,
        icon: PlugIcon,
        permission: "platform:read",
      },
      {
        label: "System Health",
        href: ROUTES.superAdmin.systemHealth,
        icon: HeartPulseIcon,
        permission: "platform:read",
      },
      {
        label: "Jobs & Queues",
        href: ROUTES.superAdmin.jobs,
        icon: ListChecksIcon,
        permission: "platform:read",
      },
      {
        label: "API Monitoring",
        href: ROUTES.superAdmin.apiMonitoring,
        icon: ActivityIcon,
        permission: "platform:read",
      },
      {
        label: "Webhooks",
        href: ROUTES.superAdmin.webhooks,
        icon: WebhookIcon,
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
        href: ROUTES.superAdmin.featureFlags,
        icon: FlagIcon,
        permission: "platform:read",
      },
      {
        label: "Audit Logs",
        href: ROUTES.superAdmin.auditLogs,
        icon: ScrollTextIcon,
        permission: "audit:read",
      },
      {
        label: "Support & Tickets",
        href: ROUTES.superAdmin.support,
        icon: HeadsetIcon,
        permission: "companies:read",
      },
      {
        label: "Notifications",
        href: ROUTES.superAdmin.notifications,
        icon: BellIcon,
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
        href: ROUTES.superAdmin.settings,
        icon: SettingsIcon,
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
