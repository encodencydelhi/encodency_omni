import type { Permission } from "@/types/domain/team";

export type FlagCapabilityKey =
  | "canViewFlags"
  | "canCreateFlags"
  | "canChangeRollout"
  | "canChangeProduction"
  | "canManageProtected"
  | "canEmergencyDisable"
  | "canManageLifecycle"
  | "canViewCompanyAccess"
  | "canExportFlags";

export type FlagCapabilities = Record<FlagCapabilityKey, boolean>;

type Can = (permission: Permission) => boolean;

/**
 * What the signed-in staff member may do in Feature Flags. Reading follows
 * platform read access; every change needs the flag-management right, production
 * additionally needs platform write, and protected flags need settings write.
 * There is no "approve" capability: no approval service is connected, so
 * approval is never offered as an action. The backend must enforce all of this.
 */
export function deriveFlagCapabilities(can: Can): FlagCapabilities {
  const view = can("platform:read") || can("flags:write");
  const manage = can("flags:write");
  const production = manage && can("platform:write");
  return {
    canViewFlags: view,
    canCreateFlags: manage,
    canChangeRollout: manage,
    canChangeProduction: production,
    canManageProtected: production && can("settings:write"),
    canEmergencyDisable: production,
    canManageLifecycle: manage && can("platform:write"),
    canViewCompanyAccess: view && can("companies:read"),
    canExportFlags: view,
  };
}
