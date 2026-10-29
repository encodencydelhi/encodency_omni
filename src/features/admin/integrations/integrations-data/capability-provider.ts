/**
 * Who may do what, and — for every "no" — a sentence explaining why.
 *
 * Two layers:
 *   1. The person: the server decides whether they hold `integrations:write` (Owners and Admins) and tells us once, in
 *      `currentUser.canManage`. The screen never re-derives a role.
 *   2. Per-connection checks: a connection can be un-checkable for reasons that have nothing to do with the person
 *      (it is disconnected, its access has lapsed).
 */

import type { Capability, CapabilityMap, IntegrationConnection } from "./types";

const ALLOW: Capability = { allowed: true };
const NOT_ALLOWED = "Only Owners and Admins can change integrations. Ask one of them.";

export function evaluateCapabilities(canManage: boolean, available: boolean): CapabilityMap {
  if (!available) {
    const reason = "The integration service is unavailable, so changes can't be made right now.";
    return {
      canConnect: { allowed: false, reason },
      canDisconnect: { allowed: false, reason },
      canReconnect: { allowed: false, reason },
      canCheck: { allowed: false, reason },
      canChangeMapping: { allowed: false, reason },
      canManageSettings: { allowed: false, reason },
    };
  }
  const manage: Capability = canManage ? ALLOW : { allowed: false, reason: NOT_ALLOWED };
  return { canConnect: manage, canDisconnect: manage, canReconnect: manage, canCheck: manage, canChangeMapping: manage, canManageSettings: manage };
}

/** Can this particular connection be checked right now? A throttled or failing connection can: a good check is how it recovers. */
export function checkCapability(connection: IntegrationConnection, base: Capability, checking: boolean): Capability {
  if (!base.allowed) return base;
  if (checking || connection.status === "syncing") return { allowed: false, reason: "A check is already running for this integration." };
  switch (connection.status) {
    case "disconnected":
      return { allowed: false, reason: "This integration is disconnected. Connect it again before checking it." };
    case "needs_reconnect":
      return { allowed: false, reason: "Access has lapsed. Reconnect first — a check would fail without it." };
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
