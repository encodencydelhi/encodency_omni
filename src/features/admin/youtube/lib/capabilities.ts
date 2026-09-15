import type {
  Capability,
  CapabilityKey,
  CapabilityMap,
  ChannelFeatures,
  ConnectionState,
  YouTubePermission,
  YouTubeScope,
} from "../types";

interface CapabilityInput {
  connection: ConnectionState;
  scopes: YouTubeScope[];
  permissions: YouTubePermission[];
  features: ChannelFeatures;
}

interface Rule {
  /** Every listed scope is required (any one of the alternatives in a nested array). */
  scopes: (YouTubeScope | YouTubeScope[])[];
  permission: YouTubePermission;
  feature?: keyof ChannelFeatures;
  /** Read-only capabilities still work from synced data while the token is expired. */
  worksOffline?: boolean;
  noun: string;
}

const RULES: Record<CapabilityKey, Rule> = {
  canUpload: { scopes: [["youtube.upload", "youtube"]], permission: "upload_content", noun: "upload videos" },
  canEditVideo: { scopes: [["youtube", "youtube.force-ssl"]], permission: "edit_content", noun: "edit videos" },
  canDeleteVideo: { scopes: [["youtube", "youtube.force-ssl"]], permission: "delete_content", noun: "delete videos" },
  canPublish: { scopes: [["youtube", "youtube.upload"]], permission: "publish_content", noun: "publish videos" },
  canSchedule: { scopes: [["youtube", "youtube.upload"]], permission: "schedule_content", noun: "schedule videos" },
  canApprove: { scopes: [], permission: "approve_content", noun: "approve content", worksOffline: true },
  canManagePlaylists: { scopes: [["youtube", "youtube.force-ssl"]], permission: "manage_playlists", noun: "manage playlists" },
  canReplyComments: { scopes: ["youtube.force-ssl"], permission: "reply_comments", noun: "reply to comments" },
  canModerateComments: { scopes: ["youtube.force-ssl"], permission: "moderate_comments", noun: "moderate comments" },
  canGoLive: { scopes: [["youtube", "youtube.force-ssl"]], permission: "manage_live", feature: "liveStreamingEnabled", noun: "create live streams" },
  canViewAnalytics: { scopes: ["yt-analytics.readonly"], permission: "view_analytics", noun: "view analytics", worksOffline: true },
  canViewRevenue: { scopes: ["yt-analytics-monetary.readonly"], permission: "view_monetization", feature: "monetizationEnabled", noun: "view revenue", worksOffline: true },
  canManageConnection: { scopes: [], permission: "manage_connection", noun: "manage the connection", worksOffline: true },
  canManageSettings: { scopes: [], permission: "manage_settings", noun: "change YouTube settings", worksOffline: true },
};

const FEATURE_REASON: Record<keyof ChannelFeatures, string> = {
  liveStreamingEnabled: "Live streaming isn't enabled for this channel. Enable it in YouTube Studio (takes up to 24 hours).",
  monetizationEnabled: "This channel isn't in the YouTube Partner Program, so revenue data isn't available.",
  customThumbnailsEnabled: "Custom thumbnails require a verified channel.",
  longUploadsEnabled: "Videos longer than 15 minutes require a verified channel.",
};

function evaluate(rule: Rule, input: CapabilityInput): Capability {
  // Order matters: tell the user the thing that actually unblocks them first.
  if (!input.permissions.includes(rule.permission)) {
    return { allowed: false, reason: `Your role can't ${rule.noun}. Ask a workspace owner for access.`, fix: "request_access" };
  }
  if (input.connection === "disconnected") {
    return { allowed: false, reason: `Connect a YouTube channel to ${rule.noun}.`, fix: "reconnect" };
  }
  if (!rule.worksOffline) {
    if (input.connection === "token_expired") {
      return { allowed: false, reason: `YouTube connection expired. Reconnect the channel to ${rule.noun}.`, fix: "reconnect" };
    }
    if (input.connection === "quota_exceeded") {
      return { allowed: false, reason: "Daily YouTube API quota reached. Changes resume after the quota resets (midnight PT).", fix: "wait" };
    }
  }
  const missing = rule.scopes.find((s) =>
    Array.isArray(s) ? !s.some((alt) => input.scopes.includes(alt)) : !input.scopes.includes(s),
  );
  if (missing) {
    return { allowed: false, reason: `Reconnect YouTube permissions to ${rule.noun}.`, fix: "reconnect" };
  }
  if (rule.feature && !input.features[rule.feature]) {
    return { allowed: false, reason: FEATURE_REASON[rule.feature], fix: "enable_feature" };
  }
  return { allowed: true };
}

export function evaluateCapabilities(input: CapabilityInput): CapabilityMap {
  return Object.fromEntries(
    (Object.keys(RULES) as CapabilityKey[]).map((key) => [key, evaluate(RULES[key], input)]),
  ) as CapabilityMap;
}
