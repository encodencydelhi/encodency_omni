import type { Permission } from "@/types/domain/team";
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

export function deriveCapabilities(can: Can): CompanyCapabilities {
  const write = can("companies:write");
  return {
    canViewCompanies: can("companies:read"),
    canCreateCompany: write,
    canEditCompany: write,
    canSuspendCompany: write,
    canReactivateCompany: write,
    canArchiveCompany: write && can("settings:write"),
    canManageSubscription: can("plans:write"),
    canManageBilling: can("billing:write"),
    canApplyUsageOverride: can("plans:write"),
    canViewCompanySecurity: can("users:read"),
    canManageCompanySecurity: can("users:write"),
    canTransferOwnership: write && can("users:write"),
    canManageInternalNotes: can("companies:read"),
    canExportCompanyData: can("companies:read"),
    canPreviewCompanyWorkspace: false,
  };
}
