import type { Permission } from "@/types/domain/team";

export type UsageCapabilityKey =
  | "canViewPlatformUsage"
  | "canViewCompanyUsage"
  | "canViewResourceDefinitions"
  | "canManageResourcePolicies"
  | "canViewUsageAlerts"
  | "canAcknowledgeUsageAlerts"
  | "canViewOverages"
  | "canManageEntitlementOverrides"
  | "canViewMeteringDiagnostics"
  | "canExportUsage";

export type UsageCapabilities = Record<UsageCapabilityKey, boolean>;

type Can = (permission: Permission) => boolean;

/**
 * What the signed-in staff member may do in Usage & Limits. Seeing usage is broad;
 * changing anything that moves a quota is narrower: overrides need the same
 * plan-management right as in Plans & Subscriptions, so nobody gains a second
 * route to a limit change here. The backend must enforce all of it.
 */
export function deriveUsageCapabilities(can: Can): UsageCapabilities {
  const view = can("companies:read");
  const platform = can("platform:read");
  return {
    canViewPlatformUsage: view,
    canViewCompanyUsage: view,
    canViewResourceDefinitions: view || platform,
    canManageResourcePolicies: can("settings:write") && can("platform:write"),
    canViewUsageAlerts: view,
    canAcknowledgeUsageAlerts: view && (can("companies:write") || can("platform:write")),
    canViewOverages: can("billing:read") || view,
    canManageEntitlementOverrides: can("billing:read") && can("plans:write"),
    canViewMeteringDiagnostics: platform || can("audit:read"),
    canExportUsage: view,
  };
}
