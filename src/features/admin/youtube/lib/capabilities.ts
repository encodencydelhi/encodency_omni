import type { CompanySystemRole } from "@/types/domain/auth";
import type { YouTubeConsentCapability, YouTubeGrantedCapabilities } from "../live/youtube-dto";
import type { Capability, CapabilityKey, CapabilityMap, ChannelFeatures, ConnectionInfo, GrantedKey } from "../types";

/**
 * Who may do what — derived from three real sources, never from a simulator:
 *   1. the connection state of the Client's channel (GET connection.status),
 *   2. the Google permissions actually granted (GET connection.grantedCapabilities),
 *   3. the platform RBAC of the signed-in user (company membership `systemRole`).
 * The backend re-checks every request; this only decides which buttons are enabled and why a disabled one is disabled.
 */

export type RbacCapability = "integrations:read" | "integrations:write" | "content:read" | "content:write" | "content:publish";

/** Mirror of backend/src/rbac/capability-catalogue.ts (SYSTEM_ROLE_CAPABILITIES) for the capabilities YouTube routes use. */
export const ROLE_CAPABILITIES: Readonly<Record<CompanySystemRole, readonly RbacCapability[]>> = {
  VIEWER: ["integrations:read", "content:read"],
  MANAGER: ["integrations:read", "content:read", "content:write"],
  ADMIN: ["integrations:read", "integrations:write", "content:read", "content:write", "content:publish"],
  OWNER: ["integrations:read", "integrations:write", "content:read", "content:write", "content:publish"],
};

interface Rule {
  rbac: RbacCapability;
  /** The Google permission that must be granted. */
  grant?: GrantedKey;
  /** The named consent to offer when `grant` is missing. */
  consent?: YouTubeConsentCapability;
  /** Needs a usable, mapped connection (everything except managing the connection itself). */
  needsConnection: boolean;
  /** Needs YouTube Live to be enabled for the channel. */
  needsLive?: boolean;
  what: string;
}

const RULES: Record<CapabilityKey, Rule> = {
  canUpload: { rbac: "content:publish", grant: "uploadVideos", consent: "YOUTUBE_UPLOAD_VIDEO", needsConnection: true, what: "upload videos" },
  canEditVideo: { rbac: "content:write", grant: "manageChannel", consent: "YOUTUBE_MANAGE_CONTENT", needsConnection: true, what: "edit videos" },
  canDeleteVideo: { rbac: "integrations:write", grant: "manageChannel", consent: "YOUTUBE_MANAGE_CONTENT", needsConnection: true, what: "delete videos" },
  canPublish: { rbac: "content:publish", grant: "manageChannel", consent: "YOUTUBE_MANAGE_CONTENT", needsConnection: true, what: "publish videos" },
  canSchedule: { rbac: "content:publish", grant: "manageChannel", consent: "YOUTUBE_MANAGE_CONTENT", needsConnection: true, what: "schedule videos" },
  canManagePlaylists: { rbac: "content:write", grant: "manageChannel", consent: "YOUTUBE_MANAGE_CONTENT", needsConnection: true, what: "manage playlists" },
  canDeletePlaylist: { rbac: "integrations:write", grant: "manageChannel", consent: "YOUTUBE_MANAGE_CONTENT", needsConnection: true, what: "delete playlists" },
  canReplyComments: { rbac: "content:write", grant: "manageChannel", consent: "YOUTUBE_MANAGE_CONTENT", needsConnection: true, what: "reply to comments" },
  canModerateComments: { rbac: "content:write", grant: "manageChannel", consent: "YOUTUBE_MANAGE_CONTENT", needsConnection: true, what: "moderate comments" },
  canRemoveComments: { rbac: "integrations:write", grant: "manageChannel", consent: "YOUTUBE_MANAGE_CONTENT", needsConnection: true, what: "remove comments" },
  canGoLive: { rbac: "content:write", grant: "manageChannel", consent: "YOUTUBE_MANAGE_CONTENT", needsConnection: true, needsLive: true, what: "create live events" },
  canTransitionLive: { rbac: "content:publish", grant: "manageChannel", consent: "YOUTUBE_MANAGE_CONTENT", needsConnection: true, needsLive: true, what: "start or end a live broadcast" },
  canViewStreamKey: { rbac: "integrations:write", grant: "manageChannel", consent: "YOUTUBE_MANAGE_CONTENT", needsConnection: true, needsLive: true, what: "see the stream key" },
  canViewAnalytics: { rbac: "integrations:read", grant: "readAnalytics", consent: "YOUTUBE_READ_ANALYTICS", needsConnection: true, what: "view analytics" },
  canViewRevenue: { rbac: "integrations:read", grant: "readMonetaryAnalytics", consent: "YOUTUBE_READ_MONETARY_ANALYTICS", needsConnection: true, what: "view revenue" },
  canManageConnection: { rbac: "integrations:write", needsConnection: false, what: "manage the YouTube connection" },
};

const ALLOW: Capability = { allowed: true };

const ROLE_NAME: Record<CompanySystemRole, string> = { OWNER: "Owner", ADMIN: "Admin", MANAGER: "Manager", VIEWER: "Viewer" };

function connectionBlock(connection: ConnectionInfo, what: string): Capability | null {
  switch (connection.state) {
    case "disconnected":
      return { allowed: false, reason: `Connect a YouTube channel to ${what}.`, fix: "connect" };
    case "not_mapped":
      return { allowed: false, reason: `Link the company's YouTube channel to this Client to ${what}.`, fix: "connect" };
    case "token_expired":
      return { allowed: false, reason: `The YouTube connection expired. Reconnect to ${what}.`, fix: "reconnect" };
    case "quota_exceeded":
      return { allowed: false, reason: `The YouTube quota is used up. You can ${what} again after it resets.`, fix: "wait" };
    default:
      return null;
  }
}

export function hasRbac(role: CompanySystemRole | null, capability: RbacCapability): boolean {
  return role !== null && ROLE_CAPABILITIES[role].includes(capability);
}

export function evaluateCapabilities(input: {
  connection: ConnectionInfo;
  granted: YouTubeGrantedCapabilities | null;
  role: CompanySystemRole | null;
  features: ChannelFeatures;
}): CapabilityMap {
  const { connection, granted, role, features } = input;

  const evaluate = (rule: Rule): Capability => {
    if (rule.needsConnection) {
      const blocked = connectionBlock(connection, rule.what);
      if (blocked) return blocked;
    }
    if (!hasRbac(role, rule.rbac)) {
      const who = role ? `${ROLE_NAME[role]} accounts` : "Your account";
      return { allowed: false, reason: `${who} can't ${rule.what}. Ask an admin for access.`, fix: "request_access" };
    }
    if (rule.grant && !granted?.[rule.grant]) {
      return { allowed: false, reason: `Grant the YouTube permission needed to ${rule.what}.`, fix: "grant", grant: rule.consent };
    }
    if (rule.needsLive && !features.liveStreamingEnabled) {
      return { allowed: false, reason: "This channel isn't enabled for YouTube Live. Enable it in YouTube Studio.", fix: "enable_feature" };
    }
    return ALLOW;
  };

  const map = Object.fromEntries((Object.keys(RULES) as (keyof typeof RULES)[]).map((key) => [key, evaluate(RULES[key])])) as Record<keyof typeof RULES, Capability>;

  return map;
}
