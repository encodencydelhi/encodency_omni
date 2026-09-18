export type RoleType = "organization" | "functional" | "viewer";
export type RoleScope = "organization_wide" | "client_scoped" | "read_only";
export type AccessLevel = "none" | "view" | "manage" | "full";

export type ModuleAccess = {
  module: string;
  level: AccessLevel;
  allowedPermissions: string[];
};

export type RolePermission = {
  key: string;
  label: string;
  module: string;
  allowed: boolean;
};

export type RoleMember = {
  id: string;
  name: string;
  email: string;
  clients: string[];
  status: "active" | "invited" | "suspended";
  lastActiveAt: string | null;
};

export type AdminRole = {
  id: string;
  slug: string;
  name: string;
  description: string;
  type: RoleType;
  scope: RoleScope;
  isProtected: boolean;
  assignedMemberCount: number;
  moduleAccess: ModuleAccess[];
  permissions: RolePermission[];
  members: RoleMember[];
  managedBy: "Platform" | "Organization";
  lastUpdated: string;
};

export type RolesPayload = {
  roles: AdminRole[];
};
