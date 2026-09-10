import type { InternalRole } from "@/types/domain/team";

/**
 * Central route registry. Nothing in the app hardcodes a path string.
 *
 * The product has two authenticated surfaces behind one sign-in: the Super
 * Admin panel for platform owners, and the Admin panel for the rest of the
 * internal team. Keeping both roots here means the landing rules live in one
 * place rather than being scattered through components.
 */

export const ROUTES = {
  login: "/login",
  forgotPassword: "/forgot-password",

  superAdmin: {
    root: "/super-admin",
    dashboard: "/super-admin",

    companies: "/super-admin/companies",
    company: (id: string) => `/super-admin/companies/${id}`,
    users: "/super-admin/users",
    Clients: "/super-admin/projects",
    team: "/super-admin/team",

    plans: "/super-admin/plans",
    subscriptions: "/super-admin/subscriptions",
    billing: "/super-admin/billing",
    usage: "/super-admin/usage",

    integrations: "/super-admin/integrations",
    systemHealth: "/super-admin/system-health",
    jobs: "/super-admin/jobs",
    apiMonitoring: "/super-admin/api-monitoring",
    webhooks: "/super-admin/webhooks",

    featureFlags: "/super-admin/feature-flags",
    auditLogs: "/super-admin/audit-logs",
    support: "/super-admin/support",
    notifications: "/super-admin/notifications",

    settings: "/super-admin/settings",
  },

  /** Operational panel used by the rest of the internal team. */
  admin: {
    root: "/admin",
    dashboard: "/admin",
  },
} as const;

/** Every path that requires a session. */
export const PROTECTED_ROUTE_ROOTS = [ROUTES.superAdmin.root, ROUTES.admin.root] as const;

/**
 * Where each staff role lands after signing in.
 *
 * Only platform owners get the Super Admin panel; everyone else works in the
 * Admin panel. Changing that policy is an edit to this map alone.
 */
const LANDING_ROUTE_BY_ROLE: Record<InternalRole, string> = {
  super_admin: ROUTES.superAdmin.dashboard,
  technical_admin: ROUTES.admin.dashboard,
  support: ROUTES.admin.dashboard,
  finance: ROUTES.admin.dashboard,
  operations: ROUTES.admin.dashboard,
};

export function resolveLandingRoute(role: InternalRole | undefined): string {
  return role ? LANDING_ROUTE_BY_ROLE[role] : ROUTES.admin.dashboard;
}

/** True when a role may open the Super Admin panel at all. */
export function canAccessSuperAdmin(role: InternalRole | undefined): boolean {
  return role === "super_admin";
}

/** Query parameter used to return a user to the page they were blocked from. */
export const REDIRECT_PARAM = "next";
