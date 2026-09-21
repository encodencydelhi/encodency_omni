import type { Permission } from "@/types/domain/team";
import type { GlobalSettingsCapabilities } from "./types";

type Can = (permission: Permission) => boolean;


export function deriveGlobalSettingsCapabilities(can: Can): GlobalSettingsCapabilities {
  const view = can("platform:read");
  const write = view && can("settings:write");
  const platform = write && can("platform:write");
  return {
    canViewGlobalSettings: view,
    canManageIdentity: write,
    canManageLocalization: write,
    canManageOnboardingDefaults: write && can("companies:write"),
    canManageGlobalSecurityPolicies: platform,
    canManageGovernance: platform,
    canManageDataPolicies: platform,
    canManageCommunications: write,
    canManageMaintenance: platform,
    canViewConfigurationHistory: can("audit:read"),
    canWithdrawPendingChanges: write,
  };
}
