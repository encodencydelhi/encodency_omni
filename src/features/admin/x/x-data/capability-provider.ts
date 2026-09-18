import type {
  Capability,
  CapabilityKey,
  CapabilityMap,
  ConnectionState,
  XPermission,
  XScope,
} from "./types";

export interface CapabilityInput {
  connection: ConnectionState;
  scopes: XScope[];
  permissions: XPermission[];
}

interface Rule {
  scopes: (XScope | XScope[])[];
  permission: XPermission;
  worksOffline?: boolean;
  noun: string;
}

const RULES: Record<CapabilityKey, Rule> = {
  /* ---- X API backed ------------------------------------------------ */
  canReadProfile: { scopes: ["users.read"], permission: "view_x", worksOffline: true, noun: "view the X profile" },
  canReadPosts: { scopes: ["tweet.read"], permission: "view_x", worksOffline: true, noun: "view posts" },
  canCreatePost: { scopes: ["tweet.write"], permission: "create_content", noun: "create posts" },
  canDeletePost: { scopes: ["tweet.write"], permission: "delete_content", noun: "delete posts" },
  canReadMentions: { scopes: ["tweet.read"], permission: "view_x", worksOffline: true, noun: "view mentions" },
  canReplyMention: { scopes: ["tweet.write"], permission: "reply_mentions", noun: "reply to mentions" },
  canReadAudience: { scopes: ["follows.read"], permission: "view_analytics", worksOffline: true, noun: "view audience data" },
  canReadAnalytics: { scopes: ["tweet.read"], permission: "view_analytics", worksOffline: true, noun: "view analytics" },
  canSchedulePost: { scopes: ["tweet.write"], permission: "schedule_content", worksOffline: true, noun: "schedule posts" },

  /* ---- OmniPlatform internal (no X scope) -------------------------- */
  canManageConnection: { scopes: [], permission: "manage_connection", worksOffline: true, noun: "manage the connection" },
  canApprove: { scopes: [], permission: "approve_content", worksOffline: true, noun: "approve content" },
  canManageSettings: { scopes: [], permission: "manage_settings", worksOffline: true, noun: "change X settings" },
};

function evaluate(rule: Rule, input: CapabilityInput): Capability {
  if (!input.permissions.includes(rule.permission)) {
    return {
      allowed: false,
      reason: `Your role can't ${rule.noun}. Ask a workspace owner for access.`,
      fix: "request_access",
    };
  }

  if (input.connection === "disconnected") {
    return { allowed: false, reason: `Connect an X account to ${rule.noun}.`, fix: "connect" };
  }

  if (!rule.worksOffline) {
    if (input.connection === "token_expired") {
      return {
        allowed: false,
        reason: `The X connection has expired. Reconnect the account to ${rule.noun}.`,
        fix: "reconnect",
      };
    }
    if (input.connection === "needs_reconnect") {
      return {
        allowed: false,
        reason: `X needs you to re-authorise OmniPlatform before you can ${rule.noun}.`,
        fix: "reconnect",
      };
    }
    if (input.connection === "rate_limited") {
      return {
        allowed: false,
        reason: `X rate limit reached. You'll be able to ${rule.noun} again once the limit resets.`,
        fix: "wait",
      };
    }
  }

  const missing = rule.scopes.find((scope) =>
    Array.isArray(scope) ? !scope.some((alt) => input.scopes.includes(alt)) : !input.scopes.includes(scope),
  );
  if (missing) {
    const name = Array.isArray(missing) ? missing[0] : missing;
    return {
      allowed: false,
      reason: `OmniPlatform wasn't granted the "${name}" permission on X. Reconnect the account to ${rule.noun}.`,
      fix: "reconnect",
    };
  }

  return { allowed: true };
}

export function evaluateCapabilities(input: CapabilityInput): CapabilityMap {
  return Object.fromEntries(
    (Object.keys(RULES) as CapabilityKey[]).map((key) => [key, evaluate(RULES[key], input)]),
  ) as CapabilityMap;
}

export const INTERNAL_CAPABILITIES: CapabilityKey[] = ["canApprove", "canManageSettings", "canManageConnection"];
