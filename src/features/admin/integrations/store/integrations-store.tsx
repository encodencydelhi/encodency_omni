"use client";

/**
 * Session state for the integrations workspace.
 *
 * One store feeds every screen, so a reconnect on the detail page updates the Overview KPIs, the Connected table, the attention
 * list and the activity log in the same render. Every write goes through the repository, and after each one the snapshot is
 * read again from the server: what the screens show is always what is really stored, never a local guess.
 */

import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { evaluateCapabilities } from "../integrations-data/capability-provider";
import {
  getIntegrationsRepository,
  toServiceError,
  type DiscoveredResource,
  type IntegrationServiceError,
  type IntegrationsRepository,
  type MapOutcome,
} from "../integrations-data/repository";
import type { CapabilityMap, CheckJob, IntegrationCheckRun, IntegrationSettings, IntegrationsSnapshot, ProviderId } from "../integrations-data/types";

const uid = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 9)}`;

/** sessionStorage key set just before the browser leaves for a provider's consent screen. */
export const CONNECT_MARKER_KEY = "omni:integrations:connect";
/** What the store remembers after the browser came back from a provider: which login to offer "Add accounts" for. */
export interface ConnectMarker {
  providerId: string;
  before: string[];
}

export interface CheckAllSummary {
  total: number;
  done: number;
  success: number;
  failed: number;
  skipped: number;
  running: boolean;
}

export interface GuardRegistration {
  dirty: boolean;
  label?: string;
  save?: () => Promise<boolean>;
}

interface IntegrationsStore {
  ready: boolean;
  serviceError: IntegrationServiceError | null;
  repository: IntegrationsRepository;
  data: IntegrationsSnapshot;
  can: CapabilityMap;
  /** Checks running right now in this session. */
  checkJobs: Record<string, CheckJob>;
  checkAll: CheckAllSummary | null;
  /** Set when the browser came back from a provider with success: the new login should be offered "Add accounts". */
  connectMarker: ConnectMarker | null;
  offerAccountsFor: (marker: ConnectMarker | null) => void;

  checkNow: (connectionId: string) => Promise<IntegrationCheckRun | null>;
  runCheckAll: (connectionIds: string[]) => Promise<CheckAllSummary>;
  clearCheckAll: () => void;
  /** Sends the browser to the provider's consent screen for this existing login. */
  reconnect: (connectionId: string) => Promise<boolean>;
  /** Sends the browser to the provider's consent screen for a new login. */
  startConnect: (providerId: ProviderId) => Promise<boolean>;
  disconnect: (connectionId: string) => Promise<boolean>;
  discoverResources: (connectionId: string) => Promise<DiscoveredResource[] | null>;
  mapResources: (connectionId: string, items: { resource: DiscoveredResource; clientId: string }[]) => Promise<MapOutcome | null>;
  changeMapping: (connectionId: string, resourceId: string, clientId: string) => Promise<boolean>;
  removeResource: (connectionId: string, resourceId: string) => Promise<boolean>;
  updateSettings: (patch: Partial<IntegrationSettings>, summary: string) => Promise<boolean>;
  retryLoad: () => void;
  /** Reload without flashing the empty skeleton — used after an OAuth return. */
  reload: () => void;
  registerGuard: (guard: GuardRegistration | null) => void;
  guardRef: React.RefObject<GuardRegistration | null>;
}

const StoreContext = createContext<IntegrationsStore | null>(null);

const EMPTY_SNAPSHOT: IntegrationsSnapshot = {
  clients: [],
  providers: [],
  connections: [],
  checkRuns: [],
  dependencies: [],
  activity: [],
  settings: { autoRefresh: true, confirmBeforeDisconnect: true, blockDisconnectWithScheduledPosts: false },
  currentUser: { name: "", email: "", canManage: false },
};

export function IntegrationsProvider({ children }: { children: ReactNode }) {
  const repository = useMemo(() => getIntegrationsRepository(), []);
  const [snapshot, setSnapshot] = useState<IntegrationsSnapshot | null>(null);
  const [serviceError, setServiceError] = useState<IntegrationServiceError | null>(null);
  const [checkJobs, setCheckJobs] = useState<Record<string, CheckJob>>({});
  const [checkAll, setCheckAll] = useState<CheckAllSummary | null>(null);
  const [connectMarker, offerAccountsFor] = useState<ConnectMarker | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const guardRef = useRef<GuardRegistration | null>(null);

  useEffect(() => {
    let cancelled = false;
    repository
      .loadSnapshot()
      .then((data) => {
        if (!cancelled) setSnapshot(data);
      })
      .catch((error: unknown) => {
        if (!cancelled) setServiceError(toServiceError(error, "Unable to load integrations."));
      });
    return () => {
      cancelled = true;
    };
  }, [repository, reloadToken]);

  const retryLoad = useCallback(() => {
    setSnapshot(null);
    setServiceError(null);
    setCheckJobs({});
    setReloadToken((token) => token + 1);
  }, []);

  // Keeps the current data on screen while the next snapshot loads (OAuth return).
  const reload = useCallback(() => {
    setServiceError(null);
    setReloadToken((token) => token + 1);
  }, []);

  const data = snapshot ?? EMPTY_SNAPSHOT;
  const can = useMemo(() => evaluateCapabilities(data.currentUser.canManage, Boolean(snapshot)), [data.currentUser.canManage, snapshot]);

  const live = useRef({ snapshot, checkJobs });
  useLayoutEffect(() => {
    live.current = { snapshot, checkJobs };
  });

  /** Re-reads everything from the server after a change, without flashing the loading state. */
  const refresh = useCallback(async () => {
    try {
      setSnapshot(await repository.loadSnapshot());
    } catch {
      // The change itself already succeeded; the next navigation or reload brings the screen up to date.
    }
  }, [repository]);

  const fail = (error: unknown, fallback: string) => {
    const failure = toServiceError(error, fallback);
    toast.error(failure.message, { description: failure.hint || undefined });
  };

  const providerName = (providerId: ProviderId) => live.current.snapshot?.providers.find((item) => item.id === providerId)?.name ?? "Integration";

  /* ---------------------------------------------------------------- */
  /* Checks                                                            */
  /* ---------------------------------------------------------------- */

  const checkNow = useCallback<IntegrationsStore["checkNow"]>(
    async (connectionId) => {
      const connection = live.current.snapshot?.connections.find((item) => item.id === connectionId);
      if (!connection || live.current.checkJobs[connectionId]) return null;
      setCheckJobs((jobs) => ({ ...jobs, [connectionId]: { runId: uid("run") } }));
      setSnapshot((current) => (current ? { ...current, connections: current.connections.map((item) => (item.id === connectionId ? { ...item, status: "syncing" } : item)) } : current));
      try {
        const run = await repository.check(connection);
        const name = providerName(connection.providerId);
        if (run.status === "success") {
          toast.success(`${name} is working`, { description: run.accountsFound === null ? "Access was renewed." : `${run.accountsFound} ${run.accountsFound === 1 ? "account is" : "accounts are"} reachable with this login.` });
        } else {
          toast.error(`${name} check failed`, { description: run.error ? `${run.error.message} ${run.error.hint}` : undefined });
        }
        return run;
      } catch (error) {
        // Put the badge back: nothing was checked, so nothing about its condition changed.
        setSnapshot((current) => (current ? { ...current, connections: current.connections.map((item) => (item.id === connectionId ? { ...item, status: connection.status } : item)) } : current));
        fail(error, "The check couldn't start.");
        return null;
      } finally {
        setCheckJobs((jobs) => {
          const next = { ...jobs };
          delete next[connectionId];
          return next;
        });
        await refresh();
      }
    },
    [repository, refresh],
  );

  const runCheckAll = useCallback<IntegrationsStore["runCheckAll"]>(
    async (connectionIds) => {
      const summary: CheckAllSummary = { total: connectionIds.length, done: 0, success: 0, failed: 0, skipped: 0, running: true };
      setCheckAll({ ...summary });
      for (const id of connectionIds) {
        const run = await checkNow(id);
        if (!run) summary.skipped += 1;
        else if (run.status === "success") summary.success += 1;
        else summary.failed += 1;
        summary.done += 1;
        setCheckAll({ ...summary });
      }
      summary.running = false;
      setCheckAll({ ...summary });
      return summary;
    },
    [checkNow],
  );

  /* ---------------------------------------------------------------- */
  /* Connection lifecycle                                              */
  /* ---------------------------------------------------------------- */

  const goToProvider = useCallback(
    async (providerId: ProviderId, reconnectConnectionId?: string) => {
      try {
        const { authUrl } = await repository.authorize(providerId, { reconnectConnectionId });
        window.location.assign(authUrl);
        return true;
      } catch (error) {
        fail(error, "Authorization didn't start.");
        return false;
      }
    },
    [repository],
  );

  const reconnect = useCallback<IntegrationsStore["reconnect"]>(
    async (connectionId) => {
      const connection = live.current.snapshot?.connections.find((item) => item.id === connectionId);
      return connection ? goToProvider(connection.providerId, connection.id) : false;
    },
    [goToProvider],
  );

  const startConnect = useCallback<IntegrationsStore["startConnect"]>(
    (providerId) => {
      // Remember which logins existed, so that on return the new one can be offered "Add accounts" straight away.
      try {
        const before = (live.current.snapshot?.connections ?? []).filter((item) => item.providerId === providerId).map((item) => item.id);
        window.sessionStorage.setItem(CONNECT_MARKER_KEY, JSON.stringify({ providerId, before }));
      } catch {
        // Storage can be blocked; the person then simply opens "Add accounts" from the integration.
      }
      return goToProvider(providerId);
    },
    [goToProvider],
  );

  const disconnect = useCallback<IntegrationsStore["disconnect"]>(
    async (connectionId) => {
      const connection = live.current.snapshot?.connections.find((item) => item.id === connectionId);
      if (!connection) return false;
      try {
        const result = await repository.disconnect(connectionId);
        const name = providerName(connection.providerId);
        toast.success(`${name} disconnected`, {
          description: result.mode === "kept_history" ? "Its history is kept because posts were scheduled through it. Connect it again any time." : "Connect it again any time from Available.",
        });
        await refresh();
        return true;
      } catch (error) {
        fail(error, "Disconnect didn't complete.");
        return false;
      }
    },
    [repository, refresh],
  );

  /* ---------------------------------------------------------------- */
  /* Accounts                                                          */
  /* ---------------------------------------------------------------- */

  const discoverResources = useCallback<IntegrationsStore["discoverResources"]>(
    async (connectionId) => {
      try {
        return await repository.discoverResources(connectionId);
      } catch (error) {
        fail(error, "Couldn't load accounts from the provider.");
        return null;
      }
    },
    [repository],
  );

  const mapResources = useCallback<IntegrationsStore["mapResources"]>(
    async (connectionId, items) => {
      try {
        const outcome = await repository.mapResources(connectionId, items);
        if (outcome.mapped > 0) toast.success(`${outcome.mapped} ${outcome.mapped === 1 ? "account" : "accounts"} mapped`);
        outcome.failed.forEach((failure) => toast.error(`“${failure.name}” was not mapped`, { description: failure.message }));
        await refresh();
        return outcome;
      } catch (error) {
        fail(error, "Couldn't map the accounts.");
        return null;
      }
    },
    [repository, refresh],
  );

  const changeMapping = useCallback<IntegrationsStore["changeMapping"]>(
    async (connectionId, resourceId, clientId) => {
      const resource = live.current.snapshot?.connections.find((item) => item.id === connectionId)?.resources.find((item) => item.id === resourceId);
      if (!resource) return false;
      try {
        await repository.moveMapping(resourceId, clientId);
        const name = live.current.snapshot?.clients.find((client) => client.id === clientId)?.name ?? "the client";
        toast.success(`“${resource.name}” now belongs to ${name}`);
        await refresh();
        return true;
      } catch (error) {
        fail(error, "Couldn't change the mapping.");
        return false;
      }
    },
    [repository, refresh],
  );

  const removeResource = useCallback<IntegrationsStore["removeResource"]>(
    async (connectionId, resourceId) => {
      const resource = live.current.snapshot?.connections.find((item) => item.id === connectionId)?.resources.find((item) => item.id === resourceId);
      if (!resource) return false;
      try {
        await repository.unmapResource(resourceId);
        toast.success(`“${resource.name}” removed`, { description: "The rest of the integration keeps working." });
        await refresh();
        return true;
      } catch (error) {
        fail(error, "Couldn't remove the account.");
        return false;
      }
    },
    [repository, refresh],
  );

  /* ---------------------------------------------------------------- */
  /* Settings                                                          */
  /* ---------------------------------------------------------------- */

  const updateSettings = useCallback<IntegrationsStore["updateSettings"]>(
    async (patch, summary) => {
      try {
        const saved = await repository.saveSettings(patch);
        setSnapshot((current) => (current ? { ...current, settings: saved } : current));
        toast.success(summary);
        await refresh();
        return true;
      } catch (error) {
        fail(error, "Settings weren't saved.");
        return false;
      }
    },
    [repository, refresh],
  );

  const registerGuard = useCallback((guard: GuardRegistration | null) => {
    guardRef.current = guard;
  }, []);

  const clearCheckAll = useCallback(() => setCheckAll(null), []);

  const value: IntegrationsStore = {
    ready: Boolean(snapshot),
    serviceError,
    repository,
    data,
    can,
    checkJobs,
    checkAll,
    connectMarker,
    offerAccountsFor,
    checkNow,
    runCheckAll,
    clearCheckAll,
    reconnect,
    startConnect,
    disconnect,
    discoverResources,
    mapResources,
    changeMapping,
    removeResource,
    updateSettings,
    retryLoad,
    reload,
    registerGuard,
    guardRef,
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useIntegrations() {
  const context = useContext(StoreContext);
  if (!context) throw new Error("useIntegrations must be used inside <IntegrationsProvider>");
  return context;
}
