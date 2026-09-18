"use client";

/**
 * React bindings over the store and selectors. Pages use these — never the
 * repository or mock data directly.
 */

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { useIntegrations } from "../store/integrations-store";
import {
  disconnectCapability,
  reconnectCapability,
  syncCapability,
} from "./capability-provider";
import {
  ALL_CLIENTS,
  deriveIssues,
  kpis,
  scopedActivity,
  scopedConnections,
  scopedDependencies,
  scopedRuns,
} from "./selectors";
import type { IntegrationConnection } from "./types";

/* ------------------------------------------------------------------ */
/* URL state                                                           */
/* ------------------------------------------------------------------ */

export function useQueryState<T extends Record<string, string>>(defaults: T) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const values = useMemo(() => {
    const next = { ...defaults };
    for (const key of Object.keys(defaults) as (keyof T)[]) {
      const value = params?.get(String(key));
      if (value !== null && value !== undefined) next[key] = value as T[keyof T];
    }
    return next;
  }, [defaults, params]);

  const set = useCallback(
    (update: Partial<Record<keyof T, string | null>>) => {
      const next = new URLSearchParams(params?.toString());
      for (const [key, value] of Object.entries(update)) {
        if (value === null || value === undefined || value === "" || value === defaults[key as keyof T]) next.delete(key);
        else next.set(key, value);
      }
      const query = next.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [defaults, params, pathname, router],
  );

  const reset = useCallback(
    (keep: string[] = []) => {
      const next = new URLSearchParams();
      keep.forEach((key) => {
        const value = params?.get(key);
        if (value) next.set(key, value);
      });
      const query = next.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [params, pathname, router],
  );

  return { values, set, reset };
}

/**
 * The selected client lives in `?client=` so it survives navigation between
 * tabs and into a detail page, and so a link can be shared with its scope.
 */
export function useClientScope() {
  const params = useSearchParams();
  const { data } = useIntegrations();
  const raw = params?.get("client") ?? ALL_CLIENTS;
  const clientId = raw === ALL_CLIENTS || data.clients.some((client) => client.id === raw) ? raw : ALL_CLIENTS;
  const client = data.clients.find((item) => item.id === clientId) ?? null;

  /** Adds the current scope to an in-module link. */
  const withScope = useCallback(
    (href: string) => {
      if (clientId === ALL_CLIENTS || href.startsWith("http")) return href;
      const [path, query = ""] = href.split("?");
      const next = new URLSearchParams(query);
      next.set("client", clientId);
      return `${path}?${next.toString()}`;
    },
    [clientId],
  );

  return { clientId, client, label: client?.name ?? "All clients", withScope };
}

/* ------------------------------------------------------------------ */
/* Scoped data                                                         */
/* ------------------------------------------------------------------ */

export function useScopedData() {
  const { data, syncJobs } = useIntegrations();
  const { clientId } = useClientScope();

  return useMemo(() => {
    const connections = scopedConnections(data.connections, clientId);
    const visibleIds = new Set(connections.map((connection) => connection.id));
    const dependencies = scopedDependencies(data.dependencies, clientId).filter((dependency) => visibleIds.has(dependency.connectionId));
    const runs = scopedRuns(data.syncRuns, clientId).filter((run) => visibleIds.has(run.connectionId));
    const activity = scopedActivity(data.activity, clientId).filter((item) => !item.connectionId || visibleIds.has(item.connectionId));
    const issues = deriveIssues(connections, data.providers, dependencies, runs);
    const summary = kpis(connections, runs, dependencies, new Set(Object.keys(syncJobs)));
    return { connections, dependencies, runs, activity, issues, summary };
  }, [data, clientId, syncJobs]);
}

export function useConnection(id: string | null) {
  const { data } = useIntegrations();
  return useMemo(() => (id ? (data.connections.find((connection) => connection.id === id) ?? null) : null), [data.connections, id]);
}

export function useProvider(id: string | null | undefined) {
  const { data } = useIntegrations();
  return useMemo(() => data.providers.find((provider) => provider.id === id) ?? null, [data.providers, id]);
}

/** Per-connection gates, combining the user's role with the connection's own state. */
export function useConnectionGates(connection: IntegrationConnection | null) {
  const { can, syncJobs } = useIntegrations();
  return useMemo(() => {
    if (!connection) return null;
    return {
      sync: syncCapability(connection, can.canSync, Boolean(syncJobs[connection.id])),
      reconnect: reconnectCapability(connection, can.canReconnect),
      disconnect: disconnectCapability(connection, can.canDisconnect),
      mapping: can.canChangeMapping,
    };
  }, [connection, can, syncJobs]);
}

/* ------------------------------------------------------------------ */
/* Time                                                                */
/* ------------------------------------------------------------------ */

const noopSubscribe = () => () => {};

/** False during SSR and the first client render, so clock-dependent text never mismatches. */
export function useHydrated() {
  return useSyncExternalStore(noopSubscribe, () => true, () => false);
}

/** Re-renders periodically so "3 minutes ago" stays true. */
export function useNow(intervalMs = 30_000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);
  return now;
}

/* ------------------------------------------------------------------ */
/* Unsaved changes                                                     */
/* ------------------------------------------------------------------ */

export function useUnsavedChanges(dirty: boolean, save: () => Promise<boolean>, label: string) {
  const { registerGuard } = useIntegrations();
  const saveRef = useRef(save);
  useEffect(() => {
    saveRef.current = save;
  });

  useEffect(() => {
    if (!dirty) return;
    registerGuard({ dirty, label, save: () => saveRef.current() });
    return () => registerGuard(null);
  }, [dirty, label, registerGuard]);

  useEffect(() => {
    if (!dirty) return;
    const handler = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);
}
