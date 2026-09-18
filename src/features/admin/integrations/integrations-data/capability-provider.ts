/**
 * Who may do what, and — for every "no" — a sentence explaining why.
 *
 * Two layers:
 *   1. Role capabilities (org admin vs manager vs member), shaped by the
 *      company's own Security settings.
 *   2. Per-connection checks: a connection can be un-syncable for reasons that
 *      have nothing to do with the user (revoked access, a rate limit).
 */

import { formatDistanceToNowStrict, parseISO } from "date-fns";
import type { Capability, CapabilityMap, IntegrationConnection, IntegrationSettings, OrgRole } from "./types";

const ALLOW: Capability = { allowed: true };

export function evaluateCapabilities(role: OrgRole, settings: IntegrationSettings, available: boolean): CapabilityMap {
  if (!available) {
    const reason = "The integration service is unavailable, so changes can't be made right now.";
    return {
      canConnect: { allowed: false, reason },
      canDisconnect: { allowed: false, reason },
      canReconnect: { allowed: false, reason },
      canSync: { allowed: false, reason },
      canChangeMapping: { allowed: false, reason },
      canManageSettings: { allowed: false, reason },
    };
  }

  const adminOnly = settings.security.orgAdminOnly;
  const isAdmin = role === "org_admin";
  const adminReason = (action: string) =>
    `Only Organization Admins can ${action}. Your company restricts this in Integrations → Settings → Security.`;
  const roleGate = (action: string): Capability => (isAdmin || (!adminOnly && role === "manager") ? ALLOW : { allowed: false, reason: adminReason(action) });

  return {
    canConnect: roleGate("connect integrations"),
    canDisconnect: roleGate("disconnect integrations"),
    canReconnect: roleGate("reconnect integrations"),
    canChangeMapping: roleGate("change client mapping"),
    // Syncing is non-destructive, so managers can always do it.
    canSync: role === "member" ? { allowed: false, reason: "Members can view integrations but not start syncs. Ask a manager or admin." } : ALLOW,
    canManageSettings: isAdmin ? ALLOW : { allowed: false, reason: "Only Organization Admins can change integration settings." },
  };
}

/** Can this particular connection be synced right now? */
export function syncCapability(connection: IntegrationConnection, base: Capability, syncing: boolean): Capability {
  if (!base.allowed) return base;
  if (syncing || connection.status === "syncing") return { allowed: false, reason: "A sync is already running for this integration." };
  switch (connection.status) {
    case "disconnected":
      return { allowed: false, reason: "This integration is disconnected. Connect it again before syncing." };
    case "needs_reconnect":
      return { allowed: false, reason: "Access has lapsed. Reconnect first — a sync would fail without it." };
    case "rate_limited":
      return {
        allowed: false,
        reason: connection.rateLimitResetAt
          ? `The provider is throttling requests. Sync resumes automatically in ${formatDistanceToNowStrict(parseISO(connection.rateLimitResetAt))}.`
          : "The provider is throttling requests. Sync resumes automatically once the limit resets.",
      };
    default:
      return ALLOW;
  }
}

/** Reconnecting only makes sense for connections that are, or were, connected. */
export function reconnectCapability(connection: IntegrationConnection, base: Capability): Capability {
  if (!base.allowed) return base;
  if (connection.status === "disconnected") return { allowed: false, reason: "Disconnected integrations are connected again from the Connect flow." };
  return ALLOW;
}

export function disconnectCapability(connection: IntegrationConnection, base: Capability): Capability {
  if (!base.allowed) return base;
  if (connection.status === "disconnected") return { allowed: false, reason: "This integration is already disconnected." };
  return ALLOW;
}
