import type {
  Capability,
  CapabilityKey,
  CapabilityMap,
  ConnectionState,
  GbpPermission,
  GbpScope,
  Location,
} from "../types";

/**
 * The capability map is the single place that decides whether an action is
 * available. Components never re-derive this from scopes or roles.
 *
 * Inputs today come from mock state; the backend will populate the same shape
 * from OAuth scopes, the Google API response and the connection record.
 */
export interface CapabilityInput {
  connection: ConnectionState;
  scopes: GbpScope[];
  permissions: GbpPermission[];
  /** When acting on one location, its state gates writes (unverified profiles reject edits). */
  location?: Pick<Location, "verification" | "openState" | "managed"> | null;
}

interface Rule {
  permission: GbpPermission;
  /** Every listed scope must be granted (nested array = any one of them). */
  scopes: (GbpScope | GbpScope[])[];
  /** Reads work from synced data even while the token is expired. */
  worksOffline?: boolean;
  /** Writes that Google rejects until the location is verified. */
  needsVerifiedLocation?: boolean;
  noun: string;
}

const RULES: Record<CapabilityKey, Rule> = {
  canReadLocations: { permission: "view_google_business", scopes: ["business.manage"], worksOffline: true, noun: "view locations" },
  canManageLocations: { permission: "manage_locations", scopes: ["business.manage"], noun: "manage locations" },
  canEditProfile: { permission: "edit_profile", scopes: ["business.manage"], needsVerifiedLocation: true, noun: "edit the business profile" },
  canReadReviews: { permission: "view_google_business", scopes: ["business.manage"], worksOffline: true, noun: "view reviews" },
  canReplyReviews: { permission: "reply_reviews", scopes: ["business.manage"], needsVerifiedLocation: true, noun: "reply to reviews" },
  canDeleteReviewReply: { permission: "delete_review_reply", scopes: ["business.manage"], needsVerifiedLocation: true, noun: "delete review replies" },
  canCreatePosts: { permission: "create_posts", scopes: ["business.manage"], needsVerifiedLocation: true, noun: "create posts" },
  canPublishPosts: { permission: "publish_posts", scopes: ["business.manage"], needsVerifiedLocation: true, noun: "publish posts" },
  canApproveContent: { permission: "approve_content", scopes: [], worksOffline: true, noun: "approve content" },
  canManageMedia: { permission: "upload_media", scopes: ["business.manage"], needsVerifiedLocation: true, noun: "upload media" },
  canDeleteMedia: { permission: "delete_media", scopes: ["business.manage"], needsVerifiedLocation: true, noun: "delete media" },
  canViewPerformance: { permission: "view_performance", scopes: ["business.manage"], worksOffline: true, noun: "view performance data" },
  canSyncLocations: { permission: "view_google_business", scopes: ["business.manage"], noun: "sync locations" },
  canManageConnection: { permission: "manage_connection", scopes: [], worksOffline: true, noun: "manage the connection" },
  canManageSettings: { permission: "manage_settings", scopes: [], worksOffline: true, noun: "change Google Business settings" },
};

function evaluate(rule: Rule, input: CapabilityInput): Capability {
  // Ordered so the message names the thing that actually unblocks the user.
  if (!input.permissions.includes(rule.permission)) {
    return { allowed: false, reason: `Your role cannot ${rule.noun}. Ask a workspace owner for access.`, fix: "request_access" };
  }
  if (input.connection === "disconnected") {
    return { allowed: false, reason: `Connect a Google Business account to ${rule.noun}.`, fix: "connect" };
  }
  if (!rule.worksOffline) {
    if (input.connection === "token_expired") {
      return { allowed: false, reason: `Google connection expired. Reconnect the account to ${rule.noun}.`, fix: "reconnect" };
    }
    if (input.connection === "quota_exceeded") {
      return { allowed: false, reason: "Daily Google API quota reached. Changes resume once the quota resets.", fix: "wait" };
    }
  }
  const missingScope = rule.scopes.find((s) => (Array.isArray(s) ? !s.some((alt) => input.scopes.includes(alt)) : !input.scopes.includes(s)));
  if (missingScope) {
    return { allowed: false, reason: `Reconnect Google permissions to ${rule.noun}.`, fix: "reconnect" };
  }
  if (rule.needsVerifiedLocation && input.location) {
    if (!input.location.managed) {
      return { allowed: false, reason: "This location is switched off for OmniPlatform management in Settings.", fix: "request_access" };
    }
    if (input.location.verification !== "verified") {
      return {
        allowed: false,
        reason: `Google only accepts changes for verified locations. Complete verification to ${rule.noun}.`,
        fix: "verify_location",
      };
    }
    if (input.location.openState === "closed_permanently") {
      return { allowed: false, reason: "This location is marked permanently closed on Google, so it cannot be edited.", fix: "request_access" };
    }
  }
  return { allowed: true };
}

export function evaluateCapabilities(input: CapabilityInput): CapabilityMap {
  return Object.fromEntries((Object.keys(RULES) as CapabilityKey[]).map((key) => [key, evaluate(RULES[key], input)])) as CapabilityMap;
}

/**
 * Documentation object: what each capability needs, and where it comes from.
 * Rendered in Settings so the mapping is visible rather than folded into code.
 */
export const CAPABILITY_DOCS: { key: CapabilityKey; label: string; googleSupported: boolean; note: string }[] = [
  { key: "canReadLocations", label: "Read locations", googleSupported: true, note: "accounts.locations.list" },
  { key: "canManageLocations", label: "Manage locations", googleSupported: true, note: "locations.patch, locations.delete" },
  { key: "canEditProfile", label: "Edit business profile", googleSupported: true, note: "locations.patch with updateMask" },
  { key: "canReadReviews", label: "Read reviews", googleSupported: true, note: "accounts.locations.reviews.list" },
  { key: "canReplyReviews", label: "Reply to reviews", googleSupported: true, note: "reviews.updateReply" },
  { key: "canDeleteReviewReply", label: "Delete review reply", googleSupported: true, note: "reviews.deleteReply" },
  { key: "canCreatePosts", label: "Create posts", googleSupported: true, note: "localPosts.create (update, event, offer, CTA)" },
  { key: "canPublishPosts", label: "Publish posts", googleSupported: true, note: "localPosts.create publishes immediately" },
  { key: "canApproveContent", label: "Approve content", googleSupported: false, note: "OmniPlatform approval workflow" },
  { key: "canManageMedia", label: "Upload media", googleSupported: true, note: "media.create" },
  { key: "canDeleteMedia", label: "Delete media", googleSupported: true, note: "media.delete" },
  { key: "canViewPerformance", label: "View performance", googleSupported: true, note: "Business Profile Performance API" },
  { key: "canSyncLocations", label: "Sync locations", googleSupported: true, note: "Scheduled pull into OmniPlatform" },
  { key: "canManageConnection", label: "Manage connection", googleSupported: false, note: "OmniPlatform OAuth connection record" },
  { key: "canManageSettings", label: "Manage settings", googleSupported: false, note: "OmniPlatform workspace settings" },
];
