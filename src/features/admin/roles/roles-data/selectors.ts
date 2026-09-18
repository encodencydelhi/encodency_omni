import type { AccessLevel, AdminRole, RoleScope, RoleType } from "./types";

export type RoleFilters = {
  query: string;
  category: "all" | "organization" | "functional" | "viewer";
  scope: "all" | RoleScope;
  type: "all" | RoleType | "system";
  usage: "all" | "used" | "unused";
  access: "all" | AccessLevel;
  sort: "name" | "most-used" | "access";
};

const rank: Record<AccessLevel, number> = { none: 0, view: 1, manage: 2, full: 3 };

export function roleSlug(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export function highestAccess(role: AdminRole) {
  return role.moduleAccess.reduce((best, item) => (rank[item.level] > rank[best] ? item.level : best), "none" as AccessLevel);
}

export function filterRoles(roles: AdminRole[], filters: RoleFilters) {
  const q = filters.query.trim().toLowerCase();
  return roles
    .filter((role) => {
      const searchable = `${role.name} ${role.description} ${role.moduleAccess.map((m) => m.module).join(" ")}`.toLowerCase();
      return (!q || searchable.includes(q)) &&
        (filters.category === "all" || role.type === filters.category) &&
        (filters.scope === "all" || role.scope === filters.scope) &&
        (filters.type === "all" || (filters.type === "system" ? role.isProtected : role.type === filters.type)) &&
        (filters.usage === "all" || (filters.usage === "used" ? role.assignedMemberCount > 0 : role.assignedMemberCount === 0)) &&
        (filters.access === "all" || role.moduleAccess.some((m) => m.level === filters.access));
    })
    .sort((a, b) => filters.sort === "most-used" ? b.assignedMemberCount - a.assignedMemberCount : filters.sort === "access" ? rank[highestAccess(b)] - rank[highestAccess(a)] : a.name.localeCompare(b.name));
}

export function roleStats(roles: AdminRole[]) {
  return {
    total: roles.length,
    protected: roles.filter((r) => r.isProtected).length,
    functional: roles.filter((r) => r.type === "functional").length,
    members: roles.reduce((sum, role) => sum + role.assignedMemberCount, 0),
    unused: roles.filter((r) => r.assignedMemberCount === 0).length,
    clientScoped: roles.filter((r) => r.scope === "client_scoped").length,
  };
}
