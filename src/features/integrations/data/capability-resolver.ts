/**
 * EnCodency OmniPlatform - Super Admin Integrations Module
 * Capability Effective Availability Resolver
 */

import type {
  CapabilityStatus,
  IntegrationProvider,
  ProviderCapability,
  ProviderConfiguration,
} from "./types";

export interface CapabilityResolution {
  status: CapabilityStatus;
  label: string;
  badgeTone: "success" | "warning" | "danger" | "neutral" | "info";
  reason: string;
  isAvailable: boolean;
}

export function resolveCapabilityEffectiveAvailability(
  capability: ProviderCapability,
  provider?: IntegrationProvider,
  config?: ProviderConfiguration
): CapabilityResolution {
  // 1. Technical support check
  if (!capability.providerSupported) {
    return {
      status: "not_implemented",
      label: "Not Supported",
      badgeTone: "neutral",
      reason: "The external provider API does not support this capability.",
      isAvailable: false,
    };
  }

  // 2. Connector implementation check
  if (capability.connectorStatus === "planned") {
    return {
      status: "not_implemented",
      label: "Planned",
      badgeTone: "info",
      reason: "Connector adapter implementation is scheduled in roadmap.",
      isAvailable: false,
    };
  }

  if (capability.connectorStatus === "in_progress") {
    return {
      status: "limited",
      label: "In Progress",
      badgeTone: "warning",
      reason: "Connector code is currently undergoing internal QA.",
      isAvailable: false,
    };
  }

  // 3. Platform availability / maintenance check
  if (provider && (provider.platformAvailability === "disabled" || provider.platformAvailability === "retired")) {
    return {
      status: "disabled_by_platform",
      label: "Platform Disabled",
      badgeTone: "danger",
      reason: "Provider has been administratively disabled on OmniPlatform.",
      isAvailable: false,
    };
  }

  if (config && config.maintenanceMode) {
    return {
      status: "unavailable",
      label: "Maintenance",
      badgeTone: "warning",
      reason: "Provider is currently under scheduled maintenance.",
      isAvailable: false,
    };
  }

  // 4. External API app approval check
  if (capability.externalApprovalRequired) {
    const approval = capability.externalApprovalStatus;
    if (approval === "rejected") {
      return {
        status: "unavailable",
        label: "Approval Rejected",
        badgeTone: "danger",
        reason: "External developer review was rejected by the provider.",
        isAvailable: false,
      };
    }
    if (approval === "pending_approval" || approval === "requested") {
      return {
        status: "requires_approval",
        label: "Pending Review",
        badgeTone: "warning",
        reason: "Capability requires approved app review from external provider.",
        isAvailable: false,
      };
    }
    if (approval === "limited_access") {
      return {
        status: "limited",
        label: "Sandbox Only",
        badgeTone: "warning",
        reason: "Developer sandbox access only; production quotas restricted.",
        isAvailable: true,
      };
    }
  }

  // 5. Platform feature flag enablement
  if (!capability.platformEnabled) {
    return {
      status: "disabled_by_platform",
      label: "Feature Flagged",
      badgeTone: "neutral",
      reason: "Capability is toggled off in platform feature controls.",
      isAvailable: false,
    };
  }

  // 6. Healthy & Available
  return {
    status: "available",
    label: "Available",
    badgeTone: "success",
    reason: "Fully supported, approved, implemented, and active.",
    isAvailable: true,
  };
}
