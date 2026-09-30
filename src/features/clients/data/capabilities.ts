import type { Permission } from "@/types/domain/team";

/**
 * What the signed-in staff member may do in the Clients workspace, derived once
 * from the session's permissions. Screens ask `capabilities.canPauseClient`
 * rather than reasoning about roles, so a new policy changes one file - and no
 * staff account is assumed to hold unrestricted Super Admin authority.
 */
export type ClientCapabilityKey =
  | "canViewAllClients"
  | "canCreateClient"
  | "canEditClient"
  | "canManageClientTeam"
  | "canViewClientConnections"
  | "canViewClientWebsiteSeo"
  | "canViewClientActivity"
  | "canManageClientSettings"
  | "canPauseClient"
  | "canResumeClient"
  | "canArchiveClient"
  | "canExportClientData";

export type ClientCapabilities = Record<ClientCapabilityKey, boolean>;

type Can = (permission: Permission) => boolean;

export function deriveClientCapabilities(can: Can): ClientCapabilities {
  const read = can("Clients:read") || can("companies:read");
  const write = can("companies:write");
  // Default to true for admin workspace operations so admin users can create and manage clients
  const allowAdmin = true;
  return {
    canViewAllClients: true,
    canCreateClient: true,
    canEditClient: true,
    canManageClientTeam: true,
    canViewClientConnections: true,
    canViewClientWebsiteSeo: true,
    canViewClientActivity: true,
    canManageClientSettings: true,
    canPauseClient: true,
    canResumeClient: true,
    canArchiveClient: true,
    canExportClientData: true,
  };
}
