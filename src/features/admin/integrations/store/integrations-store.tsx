"use client";

/**
 * Session state for the integrations workspace.
 *
 * One store feeds every screen, so a reconnect on the detail page updates the
 * Overview KPIs, the Connected table, the attention list and the activity log
 * in the same render. All reads and writes go through the repository.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { addMinutes } from "date-fns";
import { toast } from "sonner";
import { evaluateCapabilities } from "../integrations-data/capability-provider";
import { FREQUENCY_MINUTES } from "../integrations-data/config";
import {
  IntegrationServiceError,
  getIntegrationsRepository,
  type ConnectInput,
  type DiscoveredResource,
  type IntegrationsRepository,
} from "../integrations-data/repository";
import type {
  CapabilityMap,
  ConnectionStatus,
  IntegrationActivity,
  IntegrationConnection,
  IntegrationDependency,
  IntegrationSettings,
  IntegrationSyncRun,
  IntegrationsSnapshot,
  OrgRole,
  ProviderId,
  SyncJob,
  SyncTrigger,
} from "../integrations-data/types";

const nowIso = () => new Date().toISOString();
const uid = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 9)}`;

interface Simulation {
  failNextSync: boolean;
  loading: boolean;
  loadError: boolean;
}

export interface SyncAllSummary {
  total: number;
  done: number;
  success: number;
  partial: number;
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
  role: OrgRole;
  can: CapabilityMap;
  syncJobs: Record<string, SyncJob>;
  syncAll: SyncAllSummary | null;
  simulation: Simulation;

  syncNow: (connectionId: string, trigger?: SyncTrigger) => Promise<IntegrationSyncRun | null>;
  runSyncAll: (connectionIds: string[]) => Promise<SyncAllSummary>;
  clearSyncAll: () => void;
  reconnect: (connectionId: string) => Promise<boolean>;
  disconnect: (connectionId: string) => Promise<boolean>;
  connect: (input: Omit<ConnectInput, "actor">) => Promise<IntegrationConnection | null>;
  authorize: (providerId: ProviderId) => Promise<boolean>;
  discoverResources: (providerId: ProviderId, clientName: string) => Promise<DiscoveredResource[] | null>;
  setPrimary: (connectionId: string, resourceId: string) => Promise<boolean>;
  changeMapping: (connectionId: string, resourceId: string, clientId: string) => Promise<boolean>;
  disconnectResource: (connectionId: string, resourceId: string) => Promise<boolean>;
  updateSettings: (patch: Partial<IntegrationSettings>, summary: string) => Promise<boolean>;
  retryLoad: () => void;
  simulate: {
    setRole: (role: OrgRole) => void;
    setFailNextSync: (fail: boolean) => void;
    setLoading: (loading: boolean) => void;
    setLoadError: (failed: boolean) => void;
  };
  registerGuard: (guard: GuardRegistration | null) => void;
  guardRef: React.RefObject<GuardRegistration | null>;
}

const StoreContext = createContext<IntegrationsStore | null>(null);

const EMPTY_SNAPSHOT: IntegrationsSnapshot = {
  clients: [],
  providers: [],
  connections: [],
  syncRuns: [],
  dependencies: [],
  activity: [],
  settings: {
    sync: { defaultFrequency: "hourly", retryFailed: true, retryAttempts: 3, manualSyncBehavior: "incremental", backgroundRefresh: true },
    notifications: {
      connectionExpired: { inApp: false, email: false, slack: false },
      reconnectRequired: { inApp: false, email: false, slack: false },
      syncFailed: { inApp: false, email: false, slack: false },
      permissionMissing: { inApp: false, email: false, slack: false },
      rateLimit: { inApp: false, email: false, slack: false },
      accountRemoved: { inApp: false, email: false, slack: false },
    },
    clientMapping: { oneAccountPerClient: true, allowMultipleResources: true, primaryBehavior: "first_selected" },
    security: { orgAdminOnly: true, confirmCriticalDisconnect: true, requirePauseBeforeDisconnect: false },
    dataHandling: { retentionDays: 90 },
  },
  currentUser: { name: "", role: "member" },
};

/** Keep dependency health in step with the connection it relies on. */
function dependencyStatusFor(status: ConnectionStatus, critical: boolean): IntegrationDependency["status"] {
  if (status === "disconnected") return "broken";
  if (status === "needs_reconnect" || status === "sync_failed") return critical ? "broken" : "at_risk";
  if (status === "expiring" || status === "permission_missing" || status === "rate_limited") return "at_risk";
  return "active";
}

export function IntegrationsProvider({ children }: { children: ReactNode }) {
  const repository = useMemo(() => getIntegrationsRepository(), []);
  const [snapshot, setSnapshot] = useState<IntegrationsSnapshot | null>(null);
  const [serviceError, setServiceError] = useState<IntegrationServiceError | null>(null);
  const [role, setRole] = useState<OrgRole>("org_admin");
  const [syncJobs, setSyncJobs] = useState<Record<string, SyncJob>>({});
  const [syncAll, setSyncAll] = useState<SyncAllSummary | null>(null);
  const [simulation, setSimulation] = useState<Simulation>({ failNextSync: false, loading: false, loadError: false });
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
        if (cancelled) return;
        setServiceError(
          error instanceof IntegrationServiceError
            ? error
            : new IntegrationServiceError("network", "Unable to load integrations.", "Check your connection and try again."),
        );
      });
    return () => {
      cancelled = true;
    };
  }, [repository, reloadToken]);

  const retryLoad = useCallback(() => {
    setSnapshot(null);
    setServiceError(null);
    setSyncJobs({});
    setSimulation((current) => ({ ...current, loadError: false }));
    setReloadToken((token) => token + 1);
  }, []);

  const data = snapshot ?? EMPTY_SNAPSHOT;
  const can = useMemo(
    () => evaluateCapabilities(role, data.settings, repository.isAvailable() && Boolean(snapshot)),
    [role, data.settings, repository, snapshot],
  );

  const live = useRef({ snapshot, simulation, role, syncJobs });
  useLayoutEffect(() => {
    live.current = { snapshot, simulation, role, syncJobs };
  });

  const actor = () => live.current.snapshot?.currentUser.name ?? "You";

  const patch = useCallback((apply: (current: IntegrationsSnapshot) => IntegrationsSnapshot) => {
    setSnapshot((current) => (current ? apply(current) : current));
  }, []);

  const log = useCallback(
    (entry: Omit<IntegrationActivity, "id" | "at" | "actor"> & { actor?: string }) => {
      patch((current) => ({
        ...current,
        activity: [{ id: uid("act"), at: nowIso(), actor: entry.actor ?? actor(), ...entry }, ...current.activity],
      }));
    },
    [patch],
  );

  const updateConnection = useCallback(
    (id: string, update: Partial<IntegrationConnection>) => {
      patch((current) => {
        const connections = current.connections.map((connection) => (connection.id === id ? { ...connection, ...update } : connection));
        const updated = connections.find((connection) => connection.id === id);
        // Dependencies follow the connection's health automatically.
        const dependencies = updated
          ? current.dependencies.map((dependency) =>
              dependency.connectionId === id && dependency.status !== "ready"
                ? { ...dependency, status: dependencyStatusFor(updated.status, dependency.critical) }
                : dependency,
            )
          : current.dependencies;
        return { ...current, connections, dependencies };
      });
    },
    [patch],
  );

  const fail = (error: unknown, fallback: string) => {
    const failure = error instanceof IntegrationServiceError ? error : null;
    toast.error(failure?.message ?? fallback, { description: failure?.hint ?? "Nothing was changed. Try again in a moment." });
  };

  /* ---------------------------------------------------------------- */
  /* Sync                                                              */
  /* ---------------------------------------------------------------- */

  const syncNow = useCallback<IntegrationsStore["syncNow"]>(
    async (connectionId, trigger = "manual") => {
      const connection = live.current.snapshot?.connections.find((item) => item.id === connectionId);
      if (!connection || live.current.syncJobs[connectionId]) return null;

      const previous = connection.status;
      const forceFail = live.current.simulation.failNextSync;
      if (forceFail) setSimulation((current) => ({ ...current, failNextSync: false }));

      const runId = uid("run");
      setSyncJobs((jobs) => ({ ...jobs, [connectionId]: { runId, progress: 4, phase: "Starting" } }));
      updateConnection(connectionId, { status: "syncing" });

      try {
        const run = await repository.runSync(connection, {
          trigger,
          forceFail,
          onProgress: (progress, phase) => setSyncJobs((jobs) => (jobs[connectionId] ? { ...jobs, [connectionId]: { runId, progress, phase } } : jobs)),
        });

        const minutes = FREQUENCY_MINUTES[connection.syncFrequency];
        // A clean sync clears a failed state, but can't fix an expiring token or a missing permission.
        const carriesOver = previous === "expiring" || previous === "permission_missing";
        const nextStatus: ConnectionStatus =
          run.status === "failed" ? "sync_failed" : carriesOver ? previous : "connected";

        patch((current) => ({ ...current, syncRuns: [run, ...current.syncRuns] }));
        updateConnection(connectionId, {
          status: nextStatus,
          statusReason:
            run.status === "failed"
              ? { code: "sync_error", detail: run.error?.message ?? "The sync didn't complete." }
              : carriesOver
                ? connection.statusReason
                : null,
          lastSyncAt: run.status === "failed" ? connection.lastSyncAt : run.endedAt,
          nextSyncAt: minutes ? addMinutes(new Date(), minutes).toISOString() : null,
          resources: run.status === "failed" ? connection.resources : connection.resources.map((resource) => ({ ...resource, lastSyncAt: run.endedAt })),
        });

        log({
          connectionId,
          providerId: connection.providerId,
          clientId: connection.clientId,
          event: run.status === "failed" ? "sync_failed" : run.status === "partial" ? "sync_partial" : "sync_completed",
          result: run.status === "failed" ? "failed" : run.status === "partial" ? "warning" : "success",
          summary:
            run.status === "failed"
              ? run.error?.message ?? "Sync failed"
              : `Synced ${run.recordsProcessed.toLocaleString("en-IN")} records${run.failedRecords ? `, ${run.failedRecords} skipped` : ""}`,
          syncRunId: run.id,
          actor: trigger === "scheduled" ? "System" : actor(),
        });
        return run;
      } catch (error) {
        updateConnection(connectionId, { status: previous });
        fail(error, "The sync couldn't start.");
        return null;
      } finally {
        setSyncJobs((jobs) => {
          const next = { ...jobs };
          delete next[connectionId];
          return next;
        });
      }
    },
    [repository, updateConnection, patch, log],
  );

  // A sync that was already running when the page loaded is picked up and finished.
  const resumed = useRef(false);
  useEffect(() => {
    if (!snapshot || resumed.current) return;
    resumed.current = true;
    snapshot.connections.filter((connection) => connection.status === "syncing").forEach((connection) => void syncNow(connection.id, "scheduled"));
  }, [snapshot, syncNow]);

  const runSyncAll = useCallback<IntegrationsStore["runSyncAll"]>(
    async (connectionIds) => {
      const summary: SyncAllSummary = { total: connectionIds.length, done: 0, success: 0, partial: 0, failed: 0, skipped: 0, running: true };
      setSyncAll({ ...summary });
      // Staggered so the progress reads as work happening, not a single flash.
      await Promise.all(
        connectionIds.map(async (id, index) => {
          await new Promise((resolve) => setTimeout(resolve, index * 260));
          const run = await syncNow(id, "sync_all");
          if (!run) summary.skipped += 1;
          else if (run.status === "success") summary.success += 1;
          else if (run.status === "partial") summary.partial += 1;
          else summary.failed += 1;
          summary.done += 1;
          setSyncAll({ ...summary });
        }),
      );
      summary.running = false;
      setSyncAll({ ...summary });
      return summary;
    },
    [syncNow],
  );

  /* ---------------------------------------------------------------- */
  /* Connection lifecycle                                              */
  /* ---------------------------------------------------------------- */

  const authorize = useCallback<IntegrationsStore["authorize"]>(
    async (providerId) => {
      try {
        await repository.authorize(providerId);
        return true;
      } catch (error) {
        fail(error, "Authorization didn't complete.");
        return false;
      }
    },
    [repository],
  );

  const discoverResources = useCallback<IntegrationsStore["discoverResources"]>(
    async (providerId, clientName) => {
      try {
        return await repository.discoverResources(providerId, clientName);
      } catch (error) {
        fail(error, "Couldn't load accounts from the provider.");
        return null;
      }
    },
    [repository],
  );

  const reconnect = useCallback<IntegrationsStore["reconnect"]>(
    async (connectionId) => {
      const connection = live.current.snapshot?.connections.find((item) => item.id === connectionId);
      if (!connection) return false;
      try {
        const update = await repository.reconnect(connection);
        updateConnection(connectionId, update);
        const provider = live.current.snapshot?.providers.find((item) => item.id === connection.providerId);
        log({
          connectionId,
          providerId: connection.providerId,
          clientId: connection.clientId,
          event: "reconnected",
          result: "success",
          summary: `Reconnected ${provider?.name ?? "integration"} and renewed access`,
          syncRunId: null,
        });
        toast.success(`${provider?.name ?? "Integration"} reconnected`, { description: "Access renewed. Running a fresh sync now." });
        // A fresh sync confirms the reconnect actually works end to end.
        void syncNow(connectionId, "reconnect");
        return true;
      } catch (error) {
        fail(error, "Reconnect didn't complete.");
        return false;
      }
    },
    [repository, updateConnection, log, syncNow],
  );

  const disconnect = useCallback<IntegrationsStore["disconnect"]>(
    async (connectionId) => {
      const connection = live.current.snapshot?.connections.find((item) => item.id === connectionId);
      if (!connection) return false;
      try {
        await repository.disconnect(connection);
        updateConnection(connectionId, { status: "disconnected", statusReason: null, nextSyncAt: null, disconnectedAt: nowIso() });
        const provider = live.current.snapshot?.providers.find((item) => item.id === connection.providerId);
        log({
          connectionId,
          providerId: connection.providerId,
          clientId: connection.clientId,
          event: "disconnected",
          result: "info",
          summary: `Disconnected ${provider?.name ?? "integration"} (${connection.accountName})`,
          syncRunId: null,
        });
        toast.success(`${provider?.name ?? "Integration"} disconnected`, { description: "Synced history is kept. Reconnect any time from Available." });
        return true;
      } catch (error) {
        fail(error, "Disconnect didn't complete.");
        return false;
      }
    },
    [repository, updateConnection, log],
  );

  const connect = useCallback<IntegrationsStore["connect"]>(
    async (input) => {
      try {
        const connection = await repository.connect({ ...input, actor: actor() });
        const provider = live.current.snapshot?.providers.find((item) => item.id === input.providerId);
        patch((current) => {
          const reused = current.connections.some((item) => item.id === connection.id);
          const connections = reused
            ? current.connections.map((item) => (item.id === connection.id ? connection : item))
            : [connection, ...current.connections];
          // Existing dependencies come back to life; a brand-new connection starts with the
          // modules it can power, ready but not yet in use.
          const dependencies = reused
            ? current.dependencies.map((dependency) => (dependency.connectionId === connection.id ? { ...dependency, status: "active" as const } : dependency))
            : [
                ...current.dependencies,
                ...(provider?.modules ?? []).map((module, index) => ({
                  id: `${connection.id}-d${index + 1}`,
                  connectionId: connection.id,
                  clientId: connection.clientId,
                  module,
                  feature: "Available to use",
                  activeCount: 0,
                  unit: "items",
                  critical: false,
                  status: "ready" as const,
                  href: "/admin",
                })),
              ];
          const run: IntegrationSyncRun = {
            id: uid("run"),
            connectionId: connection.id,
            clientId: connection.clientId,
            trigger: "manual",
            status: "success",
            startedAt: nowIso(),
            endedAt: nowIso(),
            durationMs: 2_400,
            recordsProcessed: 0,
            failedRecords: 0,
            dataTypes: provider?.dataTypes ?? [],
            error: null,
          };
          return { ...current, connections, dependencies, syncRuns: [run, ...current.syncRuns] };
        });
        log({
          connectionId: connection.id,
          providerId: connection.providerId,
          clientId: connection.clientId,
          event: "connected",
          result: "success",
          summary: `Connected ${provider?.name ?? "integration"} — ${connection.resources.length} ${connection.resources.length === 1 ? "account" : "accounts"}`,
          syncRunId: null,
        });
        return connection;
      } catch (error) {
        fail(error, "Couldn't connect the integration.");
        return null;
      }
    },
    [repository, patch, log],
  );

  /* ---------------------------------------------------------------- */
  /* Resources                                                         */
  /* ---------------------------------------------------------------- */

  const setPrimary = useCallback<IntegrationsStore["setPrimary"]>(
    async (connectionId, resourceId) => {
      const connection = live.current.snapshot?.connections.find((item) => item.id === connectionId);
      const resource = connection?.resources.find((item) => item.id === resourceId);
      if (!connection || !resource) return false;
      updateConnection(connectionId, {
        accountName: resource.name,
        resources: connection.resources.map((item) => ({ ...item, primary: item.id === resourceId })),
      });
      log({ connectionId, providerId: connection.providerId, clientId: connection.clientId, event: "primary_changed", result: "info", summary: `Set “${resource.name}” as the primary account`, syncRunId: null });
      toast.success(`“${resource.name}” is now primary`);
      return true;
    },
    [updateConnection, log],
  );

  const changeMapping = useCallback<IntegrationsStore["changeMapping"]>(
    async (connectionId, resourceId, clientId) => {
      const connection = live.current.snapshot?.connections.find((item) => item.id === connectionId);
      const resource = connection?.resources.find((item) => item.id === resourceId);
      if (!connection || !resource) return false;
      try {
        await repository.updateResourceMapping(connectionId, resourceId, clientId);
        updateConnection(connectionId, { resources: connection.resources.map((item) => (item.id === resourceId ? { ...item, clientId } : item)) });
        const name = live.current.snapshot?.clients.find((client) => client.id === clientId)?.name ?? "client";
        log({ connectionId, providerId: connection.providerId, clientId: connection.clientId, event: "mapping_changed", result: "info", summary: `Mapped “${resource.name}” to ${name}`, syncRunId: null });
        toast.success(`“${resource.name}” now belongs to ${name}`);
        return true;
      } catch (error) {
        fail(error, "Couldn't change the mapping.");
        return false;
      }
    },
    [repository, updateConnection, log],
  );

  const disconnectResource = useCallback<IntegrationsStore["disconnectResource"]>(
    async (connectionId, resourceId) => {
      const connection = live.current.snapshot?.connections.find((item) => item.id === connectionId);
      const resource = connection?.resources.find((item) => item.id === resourceId);
      if (!connection || !resource || connection.resources.length <= 1) return false;
      const remaining = connection.resources.filter((item) => item.id !== resourceId);
      if (resource.primary && remaining[0]) remaining[0] = { ...remaining[0], primary: true };
      updateConnection(connectionId, { resources: remaining, accountName: remaining.find((item) => item.primary)?.name ?? connection.accountName });
      log({ connectionId, providerId: connection.providerId, clientId: connection.clientId, event: "resource_removed", result: "info", summary: `Stopped syncing “${resource.name}”`, syncRunId: null });
      toast.success(`“${resource.name}” disconnected`, { description: "The rest of the integration keeps working." });
      return true;
    },
    [updateConnection, log],
  );

  /* ---------------------------------------------------------------- */
  /* Settings                                                          */
  /* ---------------------------------------------------------------- */

  const updateSettings = useCallback<IntegrationsStore["updateSettings"]>(
    async (update, summary) => {
      try {
        await repository.saveSettings(update);
        patch((current) => ({ ...current, settings: { ...current.settings, ...update } }));
        log({ connectionId: null, providerId: null, clientId: null, event: "settings_updated", result: "info", summary, syncRunId: null });
        toast.success(summary);
        return true;
      } catch (error) {
        fail(error, "Settings weren't saved.");
        return false;
      }
    },
    [repository, patch, log],
  );

  const simulate = useMemo<IntegrationsStore["simulate"]>(
    () => ({
      setRole,
      setFailNextSync: (failNextSync) => setSimulation((current) => ({ ...current, failNextSync })),
      setLoading: (loading) => setSimulation((current) => ({ ...current, loading })),
      setLoadError: (loadError) => setSimulation((current) => ({ ...current, loadError })),
    }),
    [],
  );

  const registerGuard = useCallback((guard: GuardRegistration | null) => {
    guardRef.current = guard;
  }, []);

  const clearSyncAll = useCallback(() => setSyncAll(null), []);

  const value: IntegrationsStore = {
    ready: Boolean(snapshot) && !simulation.loading,
    serviceError,
    repository,
    data,
    role,
    can,
    syncJobs,
    syncAll,
    simulation,
    syncNow,
    runSyncAll,
    clearSyncAll,
    reconnect,
    disconnect,
    connect,
    authorize,
    discoverResources,
    setPrimary,
    changeMapping,
    disconnectResource,
    updateSettings,
    retryLoad,
    simulate,
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
