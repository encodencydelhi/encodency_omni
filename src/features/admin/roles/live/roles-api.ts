import { apiClient } from "@/lib/api/client";
import { companyScopeHeaders } from "@/lib/api/company-scope";
import { getStoredCompanyId } from "@/lib/api/tenancy-storage";
import type { AccessLevel, AdminRole, RoleMember, RolePermission, RolesPayload } from "../roles-data/types";

/**
 * GET /team/roles - the four platform-defined roles with the capabilities the authorization guard really uses and the
 * members of this Company in each. Read-only; there are no custom roles in the product.
 */
export interface ApiRolesResponse {
  catalogue: Array<{ capability: string; domain: string; action: string }>;
  roles: Array<{
    key: "OWNER" | "ADMIN" | "MANAGER" | "VIEWER";
    name: string;
    description: string;
    capabilities: string[];
    memberCount: number;
    members: Array<{ membershipId: string; name: string | null; email: string; jobTitle: string | null; joinedAt: string }>;
  }>;
}

export async function getRoles(signal?: AbortSignal): Promise<ApiRolesResponse> {
  return apiClient.request<ApiRolesResponse>({ method: "GET", path: "/team/roles", headers: companyScopeHeaders(getStoredCompanyId()), signal });
}

const DOMAIN_LABEL: Record<string, string> = {
  campaigns: "Campaigns",
  billing: "Billing",
  team: "Team",
  clients: "Clients",
  integrations: "Integrations",
  content: "Content",
  branding: "Branding",
  organization: "Organization",
};

const ACTION_LABEL: Record<string, string> = { read: "View", write: "Create and edit", publish: "Publish", manage: "Manage" };

const domainLabel = (domain: string) => DOMAIN_LABEL[domain] ?? domain.charAt(0).toUpperCase() + domain.slice(1);

const permissionLabel = (domain: string, action: string) => `${ACTION_LABEL[action] ?? action} ${domainLabel(domain).toLowerCase()}`;

const ROLE_TYPE = { OWNER: "organization", ADMIN: "organization", MANAGER: "functional", VIEWER: "viewer" } as const;

export function toAdminRoles(response: ApiRolesResponse): RolesPayload {
  const domains = Array.from(new Set(response.catalogue.map((c) => c.domain)));

  const roles = response.roles.map<AdminRole>((role) => {
    const granted = new Set(role.capabilities);
    const permissions: RolePermission[] = response.catalogue.map((c) => ({
      key: c.capability,
      label: permissionLabel(c.domain, c.action),
      module: domainLabel(c.domain),
      allowed: granted.has(c.capability),
    }));

    const moduleAccess = domains.map((domain) => {
      const inDomain = response.catalogue.filter((c) => c.domain === domain);
      const allowed = inDomain.filter((c) => granted.has(c.capability));
      const level: AccessLevel = allowed.length === 0 ? "none" : allowed.length === inDomain.length ? "full" : allowed.some((c) => c.action !== "read") ? "manage" : "view";
      return { module: domainLabel(domain), level, allowedPermissions: allowed.map((c) => permissionLabel(c.domain, c.action)) };
    });

    const members: RoleMember[] = role.members.map((m) => ({
      id: m.membershipId,
      name: m.name || m.email,
      email: m.email,
      clients: [],
      status: "active",
      lastActiveAt: null,
    }));

    return {
      id: role.key.toLowerCase(),
      slug: role.key.toLowerCase(),
      name: role.name,
      description: role.description,
      type: ROLE_TYPE[role.key],
      scope: role.key === "VIEWER" ? "read_only" : "organization_wide",
      isProtected: role.key === "OWNER" || role.key === "ADMIN",
      assignedMemberCount: role.memberCount,
      moduleAccess,
      permissions,
      members,
      managedBy: "Platform",
      lastUpdated: "",
    };
  });

  return { roles };
}
