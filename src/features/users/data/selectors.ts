import type {
  UserAggregate,
  UserActivity,
  UserFilters,
  UserKpis,
  UserSecurityEvent,
  UserSortField,
} from "./types";

// ---------------------------------------------------------------------------
// KPI Selectors
// ---------------------------------------------------------------------------

/** Computes the 8 primary KPIs from a full user list and invitation count. */
export function computeUserKpis(
  users: UserAggregate[],
  pendingInvites: number,
): UserKpis {
  const now = Date.now();
  const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

  const totalUsers = users.length;
  const activeUsers = users.filter((u) => u.identity.globalStatus === "active").length;
  const suspendedUsers = users.filter((u) => u.identity.globalStatus === "suspended").length;
  const twoFactorEnabled = users.filter((u) => u.security.mfaEnabled).length;
  const inactive30PlusDays = users.filter((u) => {
    if (!u.identity.lastLoginAt) return true;
    return now - new Date(u.identity.lastLoginAt).getTime() > THIRTY_DAYS_MS;
  }).length;
  const multiCompanyUsers = users.filter((u) => u.memberships.length > 1).length;
  const needsAttentionCount = users.filter((u) => u.securityPosture !== "healthy").length;

  return {
    totalUsers,
    activeUsers,
    pendingInvites,
    suspendedUsers,
    twoFactorEnabled,
    twoFactorTotal: totalUsers,
    inactive30PlusDays,
    multiCompanyUsers,
    needsAttentionCount,
  };
}

// ---------------------------------------------------------------------------
// User List Filtering
// ---------------------------------------------------------------------------

/** Applies filters and search to a user aggregate list. */
export function filterUsers(
  users: UserAggregate[],
  filters: UserFilters,
  search?: string,
): UserAggregate[] {
  const q = search?.trim().toLowerCase();

  return users.filter((u) => {
    if (q) {
      const matchesSearch =
        u.identity.name.toLowerCase().includes(q) ||
        u.identity.email.toLowerCase().includes(q) ||
        u.identity.id.toLowerCase().includes(q) ||
        u.memberships.some((m) => m.companyName.toLowerCase().includes(q));
      if (!matchesSearch) return false;
    }

    if (filters.companyId) {
      const inCompany = u.memberships.some((m) => m.companyId === filters.companyId);
      if (!inCompany) return false;
    }

    if (filters.status && u.identity.globalStatus !== filters.status) return false;

    if (filters.role) {
      const hasRole = u.memberships.some((m) => m.role === filters.role);
      if (!hasRole) return false;
    }

    if (filters.twoFactor) {
      if (filters.twoFactor === "enabled" && !u.security.mfaEnabled) return false;
      if (
        filters.twoFactor === "not_enabled" &&
        (u.security.mfaEnabled || u.security.twoFactorRequired)
      )
        return false;
      if (
        filters.twoFactor === "required" &&
        (!u.security.twoFactorRequired || u.security.mfaEnabled)
      )
        return false;
    }

    if (filters.lastActive) {
      const now = Date.now();
      if (filters.lastActive === "7d") {
        if (!u.identity.lastLoginAt) return false;
        const diff = now - new Date(u.identity.lastLoginAt).getTime();
        if (diff > 7 * 24 * 60 * 60 * 1000) return false;
      }
      if (filters.lastActive === "30d") {
        if (!u.identity.lastLoginAt) return false;
        const diff = now - new Date(u.identity.lastLoginAt).getTime();
        if (diff > 30 * 24 * 60 * 60 * 1000) return false;
      }
      if (filters.lastActive === "inactive30d") {
        if (u.identity.lastLoginAt) {
          const diff = now - new Date(u.identity.lastLoginAt).getTime();
          if (diff <= 30 * 24 * 60 * 60 * 1000) return false;
        }
      }
      if (filters.lastActive === "never" && u.identity.lastLoginAt) return false;
    }

    if (filters.multiCompanyOnly && u.memberships.length < 2) return false;

    if (filters.ownerOnly && !u.hasOwnerAccess) return false;

    if (filters.adminOnly && !u.hasAdminAccess) return false;

    if (filters.noActiveMembership && u.memberships.length === 0) return false;

    if (filters.accessIssues) {
      if (u.securityPosture === "healthy") return false;
    }

    return true;
  });
}

// ---------------------------------------------------------------------------
// User List Sorting
// ---------------------------------------------------------------------------

/** Sorts a user aggregate list by the given sort field. */
export function sortUsers(
  users: UserAggregate[],
  sort: UserSortField,
): UserAggregate[] {
  const sorted = [...users];

  switch (sort) {
    case "recentlyActive":
      sorted.sort((a, b) => {
        const aTime = a.identity.lastLoginAt
          ? new Date(a.identity.lastLoginAt).getTime()
          : 0;
        const bTime = b.identity.lastLoginAt
          ? new Date(b.identity.lastLoginAt).getTime()
          : 0;
        return bTime - aTime;
      });
      break;
    case "newest":
      sorted.sort(
        (a, b) =>
          new Date(b.identity.createdAt).getTime() -
          new Date(a.identity.createdAt).getTime(),
      );
      break;
    case "oldest":
      sorted.sort(
        (a, b) =>
          new Date(a.identity.createdAt).getTime() -
          new Date(b.identity.createdAt).getTime(),
      );
      break;
    case "nameAsc":
      sorted.sort((a, b) => a.identity.name.localeCompare(b.identity.name));
      break;
    case "mostCompanies":
      sorted.sort((a, b) => b.memberships.length - a.memberships.length);
      break;
  }

  return sorted;
}

// ---------------------------------------------------------------------------
// User List Pagination
// ---------------------------------------------------------------------------

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
}

/** Paginates an array. */
export function paginate<T>(items: T[], page: number, pageSize: number): PaginatedResult<T> {
  const total = items.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, page), pageCount);
  const start = (safePage - 1) * pageSize;
  return {
    items: items.slice(start, start + pageSize),
    total,
    page: safePage,
    pageSize,
    pageCount,
  };
}

// ---------------------------------------------------------------------------
// Security Page Selectors
// ---------------------------------------------------------------------------

export interface SecurityKpis {
  totalEligible: number;
  twoFactorEnabled: number;
  twoFactorMissingRequired: number;
  lockedAccounts: number;
  suspendedAccounts: number;
  securityAlertsCount: number;
}

export function computeSecurityKpis(
  users: UserAggregate[],
  securityEventsCount: number,
): SecurityKpis {
  return {
    totalEligible: users.length,
    twoFactorEnabled: users.filter((u) => u.security.mfaEnabled).length,
    twoFactorMissingRequired: users.filter(
      (u) => u.security.twoFactorRequired && !u.security.mfaEnabled,
    ).length,
    lockedAccounts: users.filter((u) => u.security.isLocked).length,
    suspendedAccounts: users.filter((u) => u.identity.globalStatus === "suspended").length,
    securityAlertsCount: securityEventsCount,
  };
}

// ---------------------------------------------------------------------------
// Activity Page Selectors
// ---------------------------------------------------------------------------

export interface ActivityKpis {
  totalActions: number;
  accessChanges: number;
  failedActions: number;
  securityEvents: number;
}

export function computeActivityKpis(activities: UserActivity[]): ActivityKpis {
  return {
    totalActions: activities.length,
    accessChanges: activities.filter(
      (a) => a.module === "Team" || a.module === "Company Access",
    ).length,
    failedActions: activities.filter((a) => a.result === "failed").length,
    securityEvents: activities.filter(
      (a) => a.module === "Security" || a.module === "Authentication",
    ).length,
  };
}

export function filterActivities(
  activities: UserActivity[],
  companyId: string,
  resultFilter: string,
  search?: string,
): UserActivity[] {
  const q = search?.trim().toLowerCase();

  return activities.filter((act) => {
    if (q) {
      const matchesSearch =
        act.action.toLowerCase().includes(q) ||
        act.userName.toLowerCase().includes(q) ||
        act.companyName.toLowerCase().includes(q) ||
        act.summary.toLowerCase().includes(q);
      if (!matchesSearch) return false;
    }

    if (companyId !== "all" && act.companyId !== companyId) return false;
    if (resultFilter !== "all" && act.result !== resultFilter) return false;

    return true;
  });
}

// ---------------------------------------------------------------------------
// User Detail Selectors
// ---------------------------------------------------------------------------

/** Filters a user's memberships by company name search. */
export function filterMemberships(
  memberships: UserAggregate["memberships"],
  search: string,
): UserAggregate["memberships"] {
  if (!search.trim()) return memberships;
  const q = search.trim().toLowerCase();
  return memberships.filter(
    (m) =>
      m.companyName.toLowerCase().includes(q) ||
      m.role.toLowerCase().includes(q),
  );
}

/** Filters a user's activities by company, module, action, and date range. */
export function filterUserActivities(
  activities: UserActivity[],
  companyId: string,
  module: string,
  search: string,
): UserActivity[] {
  const q = search?.trim().toLowerCase();

  return activities.filter((act) => {
    if (q) {
      const matchesSearch =
        act.action.toLowerCase().includes(q) ||
        act.companyName.toLowerCase().includes(q) ||
        act.summary.toLowerCase().includes(q);
      if (!matchesSearch) return false;
    }

    if (companyId !== "all" && act.companyId !== companyId) return false;
    if (module !== "all" && act.module !== module) return false;

    return true;
  });
}

/** Filters security events by user search. */
export function filterSecurityEvents(
  events: UserSecurityEvent[],
  search: string,
): UserSecurityEvent[] {
  if (!search.trim()) return events;
  const q = search.trim().toLowerCase();
  return events.filter(
    (e) =>
      e.eventType.toLowerCase().includes(q) ||
      e.actor.toLowerCase().includes(q) ||
      e.summary.toLowerCase().includes(q),
  );
}

// ---------------------------------------------------------------------------
// Invitation Selectors
// ---------------------------------------------------------------------------

export function filterInvitations(
  invitations: UserAggregate["recentActivity"][0][],
  _search: string,
  _status: string,
) {
  // This is a placeholder — real filtering is done in the hook.
  return invitations;
}

// ---------------------------------------------------------------------------
// Attention Selectors
// ---------------------------------------------------------------------------

/** Counts attention items by severity. */
export function countAttentionBySeverity(
  items: { severity: "critical" | "warning" | "info" }[],
): { critical: number; warning: number; info: number } {
  return items.reduce(
    (acc, item) => {
      acc[item.severity]++;
      return acc;
    },
    { critical: 0, warning: 0, info: 0 },
  );
}

// ---------------------------------------------------------------------------
// Activity Timeline Entries
// ---------------------------------------------------------------------------

import type { ActivityEntry } from "@/components/shared/activity-timeline";

/** Maps UserActivity records to ActivityTimeline entries. */
export function toTimelineEntries(activities: UserActivity[]): ActivityEntry[] {
  return activities.map((act) => ({
    id: act.id,
    actor: act.actor.name,
    action: act.action,
    target: act.companyName,
    createdAt: act.timestamp,
  }));
}
