import type { AdminPermission, AdminUser } from "@/types/admin";

export const MOCK_ADMIN_USER: AdminUser = {
  id: "usr-admin-001",
  name: "Manish Sirohi",
  email: "manishsirohi@encodency.com",
  role: "Organization Admin",
  initials: "MS",
  permissions: [
    "view_dashboard",
    "view_analytics",
    "publish_posts",
    "manage_campaigns",
    "manage_crm",
    "manage_seo",
    "manage_team",
    "manage_integrations",
    "manage_billing",
  ],
};

export function can(user: AdminUser, permission: AdminPermission): boolean {
  return user.permissions.includes(permission);
}
