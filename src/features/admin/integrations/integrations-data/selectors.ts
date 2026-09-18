/**
 * Pure derivations. No React and no fetching, so the same rules serve the
 * mock today and the real service later.
 *
 * Client scoping lives here and only here. Every screen asks these functions
 * for "what may this client see", which is how cross-client leakage is
 * prevented structurally rather than by each page remembering to filter.
 */

import { differenceInDays, differenceInMinutes, parseISO } from "date-fns";
import { MODULE_META, SEVERITY_META, STATUS_META } from "./config";
import type {
  ConnectionStatus,
  IntegrationActivity,
  IntegrationClient,
  IntegrationConnection,
  IntegrationDependency,
  IntegrationIssue,
  IntegrationProvider,
  IntegrationResource,
  IntegrationSyncRun,
  ModuleKey,
  ProviderId,
  Severity,
} from "./types";

export const ALL_CLIENTS = "all";

/* ------------------------------------------------------------------ */
/* Client scope                                                        */
/* ------------------------------------------------------------------ */

/** A connection is in scope if it's home to the client, org-wide, or holds a resource mapped to it. */
export function inScope(connection: IntegrationConnection, clientId: string): boolean {
  if (clientId === ALL_CLIENTS) return true;
  if (connection.clientId === null || connection.clientId === clientId) return true;
  return connection.resources.some((resource) => resource.clientId === clientId);
}

export function scopedConnections(connections: IntegrationConnection[], clientId: string) {
  return connections.filter((connection) => inScope(connection, clientId));
}

/** Resources this client may see on a connection. Others are counted, never shown. */
export function scopedResources(connection: IntegrationConnection, clientId: string): { visible: IntegrationResource[]; hidden: number } {
  if (clientId === ALL_CLIENTS) return { visible: connection.resources, hidden: 0 };
  const visible = connection.resources.filter((resource) => resource.clientId === clientId || connection.clientId === null);
  return { visible, hidden: connection.resources.length - visible.length };
}

export function scopedDependencies(dependencies: IntegrationDependency[], clientId: string) {
  if (clientId === ALL_CLIENTS) return dependencies;
  return dependencies.filter((dependency) => dependency.clientId === clientId || dependency.clientId === null);
}

export function scopedActivity(activity: IntegrationActivity[], clientId: string) {
  if (clientId === ALL_CLIENTS) return activity;
  return activity.filter((item) => item.clientId === clientId || item.clientId === null);
}

export function scopedRuns(runs: IntegrationSyncRun[], clientId: string) {
  if (clientId === ALL_CLIENTS) return runs;
  return runs.filter((run) => run.clientId === clientId || run.clientId === null);
}

/**
 * How a connection should read inside one client's view: named after the
 * account that belongs to that client, never after another client's account.
 */
export function scopedDisplay(connection: IntegrationConnection, clientId: string): { accountName: string; clientId: string | null; extra: number } {
  if (clientId === ALL_CLIENTS || connection.clientId === clientId || connection.clientId === null) {
    return { accountName: connection.accountName, clientId: connection.clientId, extra: connection.resources.length - 1 };
  }
  const { visible } = scopedResources(connection, clientId);
  const own = visible.find((resource) => resource.primary) ?? visible[0];
  return { accountName: own?.name ?? connection.accountName, clientId, extra: Math.max(visible.length - 1, 0) };
}

/** Every client a connection touches — its home client plus any remapped resources. */
export function connectionClientIds(connection: IntegrationConnection): string[] {
  const ids = new Set<string>();
  if (connection.clientId) ids.add(connection.clientId);
  connection.resources.forEach((resource) => ids.add(resource.clientId));
  return [...ids];
}

export function clientName(clients: IntegrationClient[], id: string | null): string {
  if (id === null) return "Organization-wide";
  return clients.find((client) => client.id === id)?.name ?? "Unknown client";
}

/* ------------------------------------------------------------------ */
/* Summaries                                                           */
/* ------------------------------------------------------------------ */

export function isActive(connection: IntegrationConnection) {
  return connection.status !== "disconnected";
}

export function needsAttention(connection: IntegrationConnection) {
  return !STATUS_META[connection.status].healthy && connection.status !== "disconnected";
}

export function primaryResource(connection: IntegrationConnection): IntegrationResource | null {
  return connection.resources.find((resource) => resource.primary) ?? connection.resources[0] ?? null;
}

export function statusBreakdown(connections: IntegrationConnection[]): { status: ConnectionStatus; count: number }[] {
  const counts = new Map<ConnectionStatus, number>();
  connections.forEach((connection) => counts.set(connection.status, (counts.get(connection.status) ?? 0) + 1));
  return [...counts.entries()]
    .map(([status, count]) => ({ status, count }))
    .sort((a, b) => STATUS_META[a.status].order - STATUS_META[b.status].order);
}

export function kpis(connections: IntegrationConnection[], runs: IntegrationSyncRun[], dependencies: IntegrationDependency[], syncingIds: Set<string>) {
  const active = connections.filter(isActive);
  const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
  const liveIds = new Set(active.map((connection) => connection.id));
  return {
    connected: active.filter((connection) => STATUS_META[connection.status].healthy).length,
    needsAttention: active.filter(needsAttention).length,
    syncing: active.filter((connection) => connection.status === "syncing" || syncingIds.has(connection.id)).length,
    disconnected: connections.length - active.length,
    failedSyncs: runs.filter((run) => run.status === "failed" && parseISO(run.startedAt).getTime() > dayAgo).length,
    dependencies: dependencies.filter((dependency) => liveIds.has(dependency.connectionId) && dependency.activeCount > 0).length,
  };
}

/* ------------------------------------------------------------------ */
/* Issues — derived from state, so fixing the cause removes the issue   */
/* ------------------------------------------------------------------ */

function affectedModules(dependencies: IntegrationDependency[], connectionId: string, only?: ModuleKey[]): string {
  const modules = [
    ...new Set(
      dependencies
        .filter((dependency) => dependency.connectionId === connectionId && (!only || only.includes(dependency.module)))
        .map((dependency) => MODULE_META[dependency.module].label),
    ),
  ];
  if (!modules.length) return "No OmniPlatform features rely on it yet.";
  return `${modules.slice(0, 4).join(", ")}${modules.length > 4 ? ` and ${modules.length - 4} more` : ""}.`;
}

function hasCriticalDependency(dependencies: IntegrationDependency[], connectionId: string) {
  return dependencies.some((dependency) => dependency.connectionId === connectionId && dependency.critical && dependency.activeCount > 0);
}

export function deriveIssues(
  connections: IntegrationConnection[],
  providers: IntegrationProvider[],
  dependencies: IntegrationDependency[],
  runs: IntegrationSyncRun[],
): IntegrationIssue[] {
  const issues: IntegrationIssue[] = [];

  for (const connection of connections) {
    if (connection.status === "disconnected") continue;
    const provider = providers.find((item) => item.id === connection.providerId);
    if (!provider) continue;
    const base = { connectionId: connection.id, providerId: connection.providerId, clientId: connection.clientId };
    const detectedAt = connection.lastSyncAt ?? connection.connectedAt;

    switch (connection.status) {
      case "expiring": {
        const days = connection.tokenExpiresAt ? Math.max(0, differenceInDays(parseISO(connection.tokenExpiresAt), new Date())) : null;
        issues.push({
          ...base,
          id: `${connection.id}-expiring`,
          severity: days !== null && days <= 1 ? "critical" : "warning",
          title: `${provider.name} connection expires ${days === 0 ? "today" : days === 1 ? "tomorrow" : `in ${days} days`}`,
          happened: connection.statusReason?.detail ?? "The access token is close to expiring.",
          affects: affectedModules(dependencies, connection.id),
          todo: "Reconnect now to renew access. It takes under a minute and nothing is interrupted.",
          action: "reconnect",
          detectedAt,
        });
        break;
      }
      case "needs_reconnect": {
        const code = connection.statusReason?.code;
        issues.push({
          ...base,
          id: `${connection.id}-reconnect`,
          severity: "critical",
          title: code === "access_revoked" ? `${provider.name} access was revoked` : `${provider.name} account needs reconnecting`,
          happened: connection.statusReason?.detail ?? "Access to this account has lapsed.",
          affects: affectedModules(dependencies, connection.id),
          todo: "Reconnect and approve access again. Scheduled work resumes as soon as access is restored.",
          action: "reconnect",
          detectedAt,
        });
        break;
      }
      case "permission_missing": {
        const missing = connection.permissions.filter((permission) => permission.status === "missing" || permission.status === "expired");
        const definitions = provider.permissions.filter((definition) => missing.some((permission) => permission.key === definition.key));
        const modules = [...new Set(definitions.flatMap((definition) => definition.requiredFor))];
        const scopeChanged = connection.statusReason?.code === "scope_changed";
        issues.push({
          ...base,
          id: `${connection.id}-permission`,
          severity: hasCriticalDependency(dependencies.filter((dependency) => modules.includes(dependency.module)), connection.id) ? "critical" : "warning",
          title: scopeChanged ? `${provider.name} permissions changed` : `${provider.name} permission missing`,
          happened: `${definitions.map((definition) => `“${definition.label}”`).join(", ") || "A permission"} ${definitions.length === 1 ? "isn't" : "aren't"} granted. ${connection.statusReason?.detail ?? ""}`.trim(),
          affects: affectedModules(dependencies, connection.id, modules),
          todo: "Review permissions, then reconnect and approve the missing access.",
          action: "review_permissions",
          detectedAt,
        });
        break;
      }
      case "sync_failed": {
        const lastRun = runs.filter((run) => run.connectionId === connection.id).sort((a, b) => b.startedAt.localeCompare(a.startedAt))[0];
        issues.push({
          ...base,
          id: `${connection.id}-sync`,
          severity: hasCriticalDependency(dependencies, connection.id) ? "critical" : "warning",
          title: `${provider.name} sync failed`,
          happened: lastRun?.error?.message ?? connection.statusReason?.detail ?? "The last sync didn't complete.",
          affects: affectedModules(dependencies, connection.id),
          todo: lastRun?.error?.hint ?? "Retry the sync. If it fails again, reconnect the integration.",
          action: "retry_sync",
          detectedAt: lastRun?.startedAt ?? detectedAt,
        });
        break;
      }
      case "rate_limited": {
        const minutes = connection.rateLimitResetAt ? Math.max(1, differenceInMinutes(parseISO(connection.rateLimitResetAt), new Date())) : null;
        issues.push({
          ...base,
          id: `${connection.id}-rate`,
          severity: "info",
          title: `${provider.name} is rate limited`,
          happened: `${connection.statusReason?.detail ?? "The provider is throttling requests."}${minutes ? ` Expected to clear in about ${minutes} minutes.` : ""}`,
          affects: affectedModules(dependencies, connection.id),
          todo: "No action needed — sync resumes on its own. Avoid manual syncs until it clears.",
          action: "view_details",
          detectedAt,
        });
        break;
      }
      default:
        break;
    }

    // Resource-level problems surface even when the connection itself looks fine.
    connection.resources
      .filter((resource) => resource.status !== "active" && connection.status !== "needs_reconnect")
      .forEach((resource) =>
        issues.push({
          ...base,
          id: `${resource.id}-resource`,
          severity: "warning",
          title: resource.status === "removed" ? `${resource.name} was removed` : `Access to ${resource.name} was revoked`,
          happened: `The ${provider.name} account can no longer reach this ${resource.status === "removed" ? "resource — it may have been deleted" : "resource"}.`,
          affects: "Anything scheduled or reported for this account.",
          todo: "Reconnect to restore access, or disconnect the resource if it's no longer used.",
          action: "view_details",
          detectedAt,
        }),
      );
  }

  return issues.sort(
    (a, b) => SEVERITY_META[a.severity].order - SEVERITY_META[b.severity].order || b.detectedAt.localeCompare(a.detectedAt),
  );
}

export function severityCounts(issues: IntegrationIssue[]): Record<Severity, number> {
  return {
    critical: issues.filter((issue) => issue.severity === "critical").length,
    warning: issues.filter((issue) => issue.severity === "warning").length,
    info: issues.filter((issue) => issue.severity === "info").length,
  };
}

/* ------------------------------------------------------------------ */
/* Dependencies & disconnect impact                                    */
/* ------------------------------------------------------------------ */

export function dependenciesFor(dependencies: IntegrationDependency[], connectionId: string) {
  return dependencies.filter((dependency) => dependency.connectionId === connectionId);
}

export interface DisconnectImpact {
  dependencies: IntegrationDependency[];
  critical: IntegrationDependency[];
  totalItems: number;
  modules: string[];
}

export function disconnectImpact(dependencies: IntegrationDependency[], connectionId: string): DisconnectImpact {
  const list = dependenciesFor(dependencies, connectionId).filter((dependency) => dependency.activeCount > 0);
  return {
    dependencies: list,
    critical: list.filter((dependency) => dependency.critical),
    totalItems: list.reduce((sum, dependency) => sum + dependency.activeCount, 0),
    modules: [...new Set(list.map((dependency) => MODULE_META[dependency.module].label))],
  };
}

export function dependencyLeaders(connections: IntegrationConnection[], dependencies: IntegrationDependency[], limit: number) {
  return connections
    .filter(isActive)
    .map((connection) => {
      const list = dependenciesFor(dependencies, connection.id).filter((dependency) => dependency.activeCount > 0);
      return { connection, modules: new Set(list.map((dependency) => dependency.module)).size, critical: list.filter((dependency) => dependency.critical).length };
    })
    .filter((row) => row.modules > 0)
    .sort((a, b) => b.modules - a.modules || b.critical - a.critical)
    .slice(0, limit);
}

/* ------------------------------------------------------------------ */
/* Availability for a client                                           */
/* ------------------------------------------------------------------ */

export type AvailabilityState = "connected" | "attention" | "disconnected" | "not_connected" | "unavailable";

export function providerState(provider: IntegrationProvider, connections: IntegrationConnection[], clientId: string): {
  state: AvailabilityState;
  connections: IntegrationConnection[];
} {
  if (provider.availability !== "available") return { state: "unavailable", connections: [] };
  const mine = connections.filter((connection) => connection.providerId === provider.id && inScope(connection, clientId));
  const active = mine.filter(isActive);
  if (active.some(needsAttention)) return { state: "attention", connections: mine };
  if (active.length) return { state: "connected", connections: mine };
  if (mine.length) return { state: "disconnected", connections: mine };
  return { state: "not_connected", connections: [] };
}

/** Is there already a live connection of this provider for this client? */
export function existingConnection(connections: IntegrationConnection[], providerId: ProviderId, clientId: string | null) {
  return connections.find((connection) => connection.providerId === providerId && connection.clientId === clientId && isActive(connection)) ?? null;
}

export function previousConnection(connections: IntegrationConnection[], providerId: ProviderId, clientId: string | null) {
  return connections.find((connection) => connection.providerId === providerId && connection.clientId === clientId && !isActive(connection)) ?? null;
}

/* ------------------------------------------------------------------ */
/* Filtering & sorting                                                 */
/* ------------------------------------------------------------------ */

export interface ConnectionFilters {
  search: string;
  provider: string;
  status: string;
  health: "all" | "healthy" | "attention" | "disconnected";
  module: string;
  lastSync: "all" | "1h" | "24h" | "stale";
  sort: "name" | "last_sync" | "health" | "most_used";
}

export function filterConnections(
  connections: IntegrationConnection[],
  providers: IntegrationProvider[],
  dependencies: IntegrationDependency[],
  filters: ConnectionFilters,
): IntegrationConnection[] {
  const query = filters.search.trim().toLowerCase();
  const providerName = (id: ProviderId) => providers.find((provider) => provider.id === id)?.name ?? id;
  const usage = (id: string) => dependenciesFor(dependencies, id).filter((dependency) => dependency.activeCount > 0).length;

  const filtered = connections.filter((connection) => {
    if (filters.provider !== "all" && connection.providerId !== filters.provider) return false;
    if (filters.status !== "all" && connection.status !== filters.status) return false;
    if (filters.health === "healthy" && !STATUS_META[connection.status].healthy) return false;
    if (filters.health === "attention" && !needsAttention(connection)) return false;
    if (filters.health === "disconnected" && connection.status !== "disconnected") return false;
    if (filters.module !== "all" && !dependenciesFor(dependencies, connection.id).some((dependency) => dependency.module === filters.module)) return false;
    if (filters.lastSync !== "all") {
      const minutes = connection.lastSyncAt ? differenceInMinutes(new Date(), parseISO(connection.lastSyncAt)) : Infinity;
      if (filters.lastSync === "1h" && minutes > 60) return false;
      if (filters.lastSync === "24h" && minutes > 1440) return false;
      if (filters.lastSync === "stale" && minutes <= 1440) return false;
    }
    if (query) {
      const haystack = `${providerName(connection.providerId)} ${connection.accountName} ${connection.resources.map((resource) => `${resource.name} ${resource.handle}`).join(" ")}`.toLowerCase();
      if (!haystack.includes(query)) return false;
    }
    return true;
  });

  return filtered.sort((a, b) => {
    switch (filters.sort) {
      case "last_sync":
        return (b.lastSyncAt ?? "").localeCompare(a.lastSyncAt ?? "");
      case "health":
        return STATUS_META[a.status].order - STATUS_META[b.status].order;
      case "most_used":
        return usage(b.id) - usage(a.id);
      default:
        return providerName(a.providerId).localeCompare(providerName(b.providerId)) || a.accountName.localeCompare(b.accountName);
    }
  });
}

/* ------------------------------------------------------------------ */
/* Export                                                              */
/* ------------------------------------------------------------------ */

function escapeCsv(value: unknown) {
  const text = value === null || value === undefined ? "" : String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function toCsv(rows: Record<string, unknown>[]) {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]!);
  return [headers.join(","), ...rows.map((row) => headers.map((header) => escapeCsv(row[header])).join(","))].join("\n");
}

export function downloadFile(filename: string, contents: string, type: string) {
  const url = URL.createObjectURL(new Blob([contents], { type }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
