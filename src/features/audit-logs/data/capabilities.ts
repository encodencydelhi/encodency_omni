import type { Permission } from "@/types/domain/team";

export type AuditCapabilityKey =
  | "canViewAudit"
  | "canViewActorEmail"
  | "canViewTechnical"
  | "canExport"
  | "canExportSensitive"
  | "canManageInvestigations"
  | "canReassignInvestigations"
  | "canCloseInvestigations"
  | "canViewRetention";

export type AuditCapabilities = Record<AuditCapabilityKey, boolean>;

type Can = (permission: Permission) => boolean;
export function deriveAuditCapabilities(can: Can): AuditCapabilities {
  const view = can("audit:read");
  const write = can("platform:write") || can("settings:write");
  return {
    canViewAudit: view,
    canViewActorEmail: view && (can("companies:read") || can("users:read")),
    canViewTechnical: view && can("platform:read"),
    canExport: view && write,
    canExportSensitive: view && can("settings:write"),
    canManageInvestigations: view && (can("support:write") || write),
    canReassignInvestigations: view && write,
    canCloseInvestigations: view && write,
    canViewRetention: view,
  };
}
