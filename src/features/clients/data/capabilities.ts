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
  const read = can("Clients:read");
  const write = can("companies:write");
  return {
    canViewAllClients: read,
    canCreateClient: read && write,
    canEditClient: read && write,
    canManageClientTeam: read && can("users:write"),
    canViewClientConnections: read,
    canViewClientWebsiteSeo: read,
    canViewClientActivity: read,
    canManageClientSettings: read && write,
    canPauseClient: read && write,
    canResumeClient: read && write,
    // Archiving is the highest-impact lifecycle action: it also needs settings authority.
    canArchiveClient: read && write && can("settings:write"),
    canExportClientData: read,
  };
}
