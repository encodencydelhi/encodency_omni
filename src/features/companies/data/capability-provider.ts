"use client";

import { useMemo } from "react";
import { useAuth } from "@/features/auth/components/auth-provider";
import type { Permission } from "@/types/domain/team";

/**
 * What the signed-in staff member may do in the tenant workspace.
 *
 * Capabilities are derived once, here, from the session's permissions. Screens
 * ask `capabilities.canSuspendCompany` rather than reasoning about roles, so a
 * new policy (or a backend-issued capability list) changes one file.
 */
export type CompanyCapabilityKey =
  | "canViewCompanies"
  | "canCreateCompany"
  | "canEditCompany"
  | "canSuspendCompany"
  | "canReactivateCompany"
  | "canArchiveCompany"
  | "canManageSubscription"
  | "canManageBilling"
  | "canApplyUsageOverride"
  | "canViewCompanySecurity"
  | "canManageCompanySecurity"
  | "canTransferOwnership"
  | "canManageInternalNotes"
  | "canExportCompanyData"
  | "canPreviewCompanyWorkspace";

export type CompanyCapabilities = Record<CompanyCapabilityKey, boolean>;

type Can = (permission: Permission) => boolean;

/** Pure so it can be unit-tested without React. */
export function deriveCapabilities(can: Can): CompanyCapabilities {
  const write = can("companies:write");
  return {
    canViewCompanies: can("companies:read"),
    canCreateCompany: write,
    canEditCompany: write,
    canSuspendCompany: write,
    canReactivateCompany: write,
    // Archiving is the highest-risk lifecycle action: it also needs settings authority.
    canArchiveCompany: write && can("settings:write"),
    canManageSubscription: can("plans:write"),
    canManageBilling: can("billing:write"),
    canApplyUsageOverride: can("plans:write"),
    canViewCompanySecurity: can("users:read"),
    canManageCompanySecurity: can("users:write"),
    canTransferOwnership: write && can("users:write"),
    canManageInternalNotes: can("companies:read"),
    canExportCompanyData: can("companies:read"),
    // Real impersonation needs secure backend infrastructure; nothing in the UI exposes it yet.
    canPreviewCompanyWorkspace: false,
  };
}

export function useCompanyCapabilities(): CompanyCapabilities {
  const { can } = useAuth();
  return useMemo(() => deriveCapabilities(can), [can]);
}

export function useCurrentStaff(): { id: string; name: string } {
  const { user } = useAuth();
  return useMemo(
    () => ({ id: user?.id ?? "unknown", name: user?.name ?? "Platform staff" }),
    [user],
  );
}
