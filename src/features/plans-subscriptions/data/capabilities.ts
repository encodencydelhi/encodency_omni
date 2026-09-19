import type { Permission } from "@/types/domain/team";

/**
 * What the signed-in staff member may do in Plans & Subscriptions, derived once
 * from their permissions. Commercial control is not assumed for every internal
 * identity: publishing and retiring a plan need billing-write on top of plan
 * management, so a role that can adjust a subscription still cannot reprice a plan.
 */
export type SubscriptionCapabilityKey =
  | "canViewPlans"
  | "canCreatePlan"
  | "canEditDraftPlan"
  | "canPublishPlan"
  | "canRetirePlan"
  | "canViewSubscriptions"
  | "canChangeCompanyPlan"
  | "canManageTrials"
  | "canScheduleCancellation"
  | "canReactivateSubscription"
  | "canManageEntitlementOverrides"
  | "canViewSubscriptionActivity"
  | "canManageSubscriptionPolicies"
  | "canExportSubscriptions";

export type SubscriptionCapabilities = Record<SubscriptionCapabilityKey, boolean>;

type Can = (permission: Permission) => boolean;

export function deriveSubscriptionCapabilities(can: Can): SubscriptionCapabilities {
  const read = can("billing:read");
  const manage = read && can("plans:write");
  const commercial = manage && can("billing:write");
  return {
    canViewPlans: read,
    canCreatePlan: manage,
    canEditDraftPlan: manage,
    canPublishPlan: commercial,
    canRetirePlan: commercial,
    canViewSubscriptions: read,
    canChangeCompanyPlan: manage,
    canManageTrials: manage,
    canScheduleCancellation: manage,
    canReactivateSubscription: manage,
    canManageEntitlementOverrides: manage,
    canViewSubscriptionActivity: read,
    canManageSubscriptionPolicies: commercial,
    canExportSubscriptions: read,
  };
}
