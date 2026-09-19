/**
 * EnCodency OmniPlatform - Super Admin Integrations Module
 * In-Memory Store with SessionStorage Persistence
 */

import { DEFAULT_INTEGRATION_SETTINGS, SESSION_STORAGE_KEYS } from "../config";
import type {
  IntegrationActivity,
  IntegrationIssue,
  IntegrationProvider,
  IntegrationSettings,
  IntegrationsKpis,
  IssueNote,
  IssueStatus,
  PlatformAvailability,
  ProviderAuthorization,
  ProviderCapability,
  ProviderConfiguration,
  ExternalResource,
  ClientResourceMapping,
  ReauthorizationRequest,
} from "../types";
import { buildInitialIntegrationsDataset, type IntegrationsRawDataset } from "./dataset";

interface IntegrationsStoreState {
  providers: Map<string, IntegrationProvider>;
  configurations: Map<string, ProviderConfiguration>;
  capabilities: ProviderCapability[];
  authorizations: Map<string, ProviderAuthorization>;
  resources: Map<string, ExternalResource>;
  mappings: ClientResourceMapping[];
  issues: IntegrationIssue[];
  activities: IntegrationActivity[];
  reauthorizationRequests: ReauthorizationRequest[];
  settings: IntegrationSettings;
  dirty: boolean;
}

let storeInstance: IntegrationsStoreState | null = null;

function serializeStore(state: IntegrationsStoreState): string {
  return JSON.stringify({
    providers: Array.from(state.providers.values()),
    configurations: Array.from(state.configurations.values()),
    capabilities: state.capabilities,
    authorizations: Array.from(state.authorizations.values()),
    resources: Array.from(state.resources.values()),
    mappings: state.mappings,
    issues: state.issues,
    activities: state.activities,
    reauthorizationRequests: state.reauthorizationRequests,
    settings: state.settings,
  });
}

function deserializeStore(json: string): IntegrationsStoreState | null {
  try {
    const raw = JSON.parse(json) as IntegrationsRawDataset & { settings?: IntegrationSettings };
    const providers = new Map<string, IntegrationProvider>();
    raw.providers.forEach((p) => providers.set(p.id, p));

    const configurations = new Map<string, ProviderConfiguration>();
    raw.configurations.forEach((c) => configurations.set(c.providerId, c));

    const authorizations = new Map<string, ProviderAuthorization>();
    raw.authorizations.forEach((a) => authorizations.set(a.id, a));

    const resources = new Map<string, ExternalResource>();
    raw.resources.forEach((r) => resources.set(r.id, r));

    return {
      providers,
      configurations,
      capabilities: raw.capabilities,
      authorizations,
      resources,
      mappings: raw.mappings,
      issues: raw.issues,
      activities: raw.activities,
      reauthorizationRequests: raw.reauthorizationRequests ?? [],
      settings: raw.settings ?? DEFAULT_INTEGRATION_SETTINGS,
      dirty: false,
    };
  } catch (err) {
    console.error("Failed to deserialize integrations store", err);
    return null;
  }
}

function getStore(): IntegrationsStoreState {
  if (storeInstance) return storeInstance;

  if (typeof window !== "undefined") {
    const stored = window.sessionStorage.getItem(SESSION_STORAGE_KEYS.integrationsStore);
    if (stored) {
      const restored = deserializeStore(stored);
      if (restored) {
        storeInstance = restored;
        return storeInstance;
      }
    }
  }

  const initial = buildInitialIntegrationsDataset();
  const providers = new Map<string, IntegrationProvider>();
  initial.providers.forEach((p) => providers.set(p.id, p));

  const configurations = new Map<string, ProviderConfiguration>();
  initial.configurations.forEach((c) => configurations.set(c.providerId, c));

  const authorizations = new Map<string, ProviderAuthorization>();
  initial.authorizations.forEach((a) => authorizations.set(a.id, a));

  const resources = new Map<string, ExternalResource>();
  initial.resources.forEach((r) => resources.set(r.id, r));

  storeInstance = {
    providers,
    configurations,
    capabilities: initial.capabilities,
    authorizations,
    resources,
    mappings: initial.mappings,
    issues: initial.issues,
    activities: initial.activities,
    reauthorizationRequests: initial.reauthorizationRequests,
    settings: DEFAULT_INTEGRATION_SETTINGS,
    dirty: false,
  };

  return storeInstance;
}

function commitStore(): void {
  const store = getStore();
  store.dirty = true;
  if (typeof window !== "undefined") {
    try {
      window.sessionStorage.setItem(
        SESSION_STORAGE_KEYS.integrationsStore,
        serializeStore(store)
      );
    } catch (err) {
      console.error("Failed to commit integrations store to sessionStorage", err);
    }
  }
}

// -------------------------------------------------------------
// Read Methods
// -------------------------------------------------------------

export function getAllProviders(): IntegrationProvider[] {
  const store = getStore();
  return Array.from(store.providers.values());
}

export function getProviderById(id: string): IntegrationProvider | undefined {
  return getStore().providers.get(id);
}

export function getProviderConfig(providerId: string): ProviderConfiguration | undefined {
  return getStore().configurations.get(providerId);
}

export function getProviderCapabilities(providerId?: string): ProviderCapability[] {
  const store = getStore();
  if (!providerId) return [...store.capabilities];
  return store.capabilities.filter((c) => c.providerId === providerId);
}

export function getAllAuthorizations(): ProviderAuthorization[] {
  return Array.from(getStore().authorizations.values());
}

export function getAuthorizationById(id: string): ProviderAuthorization | undefined {
  return getStore().authorizations.get(id);
}

export function getAllResources(): ExternalResource[] {
  return Array.from(getStore().resources.values());
}

export function getResourcesByAuthorizationId(authId: string): ExternalResource[] {
  return Array.from(getStore().resources.values()).filter((r) => r.authorizationId === authId);
}

export function getAllMappings(): ClientResourceMapping[] {
  return [...getStore().mappings];
}

export function getAllIssues(): IntegrationIssue[] {
  return [...getStore().issues];
}

export function getIssueById(id: string): IntegrationIssue | undefined {
  return getStore().issues.find((i) => i.id === id);
}

export function getAllActivities(): IntegrationActivity[] {
  return [...getStore().activities];
}

export function getAllReauthorizationRequests(): ReauthorizationRequest[] {
  return [...getStore().reauthorizationRequests];
}

export function getSettings(): IntegrationSettings {
  return { ...getStore().settings };
}

// -------------------------------------------------------------
// Mutation Methods
// -------------------------------------------------------------

export function updateProviderAvailability(
  providerId: string,
  newAvailability: PlatformAvailability,
  reason: string
): boolean {
  const store = getStore();
  const provider = store.providers.get(providerId);
  const config = store.configurations.get(providerId);
  if (!provider || !config) return false;

  const oldAvailability = provider.platformAvailability;
  provider.platformAvailability = newAvailability;
  provider.updatedAt = new Date().toISOString();
  config.platformAvailability = newAvailability;

  // If disabled, also update allowNewConnections
  if (newAvailability === "disabled" || newAvailability === "retired") {
    config.allowNewConnections = false;
  } else if (newAvailability === "live") {
    config.allowNewConnections = true;
  }

  // Log activity
  recordActivity({
    id: `act_${Date.now()}`,
    timestamp: new Date().toISOString(),
    actor: {
      id: "usr_superadmin",
      name: "Super Administrator",
      email: "admin@encodency.com",
      type: "super_admin",
    },
    eventType: "provider_availability_changed",
    providerId,
    description: `Changed provider availability from '${oldAvailability}' to '${newAvailability}'. Reason: ${reason}`,
    result: "warning",
  });

  commitStore();
  return true;
}

export function updateProviderOperationalControls(
  providerId: string,
  controls: Partial<Pick<ProviderConfiguration, "allowNewConnections" | "allowExistingPublishing" | "allowExistingSync" | "enableWebhooks" | "maintenanceMode" | "visibilityInCompanyAdmin">>
): boolean {
  const store = getStore();
  const config = store.configurations.get(providerId);
  if (!config) return false;

  Object.assign(config, controls);

  recordActivity({
    id: `act_${Date.now()}`,
    timestamp: new Date().toISOString(),
    actor: {
      id: "usr_superadmin",
      name: "Super Administrator",
      email: "admin@encodency.com",
      type: "super_admin",
    },
    eventType: "provider_config_updated",
    providerId,
    description: "Updated operational controls (publishing, sync, or webhook switches).",
    result: "info",
  });

  commitStore();
  return true;
}

export function updateProviderConfig(
  providerId: string,
  updates: Partial<ProviderConfiguration>
): boolean {
  const store = getStore();
  const config = store.configurations.get(providerId);
  const provider = store.providers.get(providerId);
  if (!config || !provider) return false;

  Object.assign(config, updates);
  provider.updatedAt = new Date().toISOString();

  if (updates.platformAvailability) {
    provider.platformAvailability = updates.platformAvailability;
  }
  if (updates.externalApiApprovalStatus) {
    provider.externalApiAccess = updates.externalApiApprovalStatus;
  }

  recordActivity({
    id: `act_${Date.now()}`,
    timestamp: new Date().toISOString(),
    actor: {
      id: "usr_superadmin",
      name: "Super Administrator",
      email: "admin@encodency.com",
      type: "super_admin",
    },
    eventType: "provider_config_updated",
    providerId,
    description: `Updated configuration parameters for ${provider.name}.`,
    result: "success",
  });

  commitStore();
  return true;
}

export function toggleCapability(capabilityId: string, enabled: boolean): boolean {
  const store = getStore();
  const cap = store.capabilities.find((c) => c.id === capabilityId);
  if (!cap) return false;

  cap.platformEnabled = enabled;

  recordActivity({
    id: `act_${Date.now()}`,
    timestamp: new Date().toISOString(),
    actor: {
      id: "usr_superadmin",
      name: "Super Administrator",
      email: "admin@encodency.com",
      type: "super_admin",
    },
    eventType: "provider_capability_changed",
    providerId: cap.providerId,
    description: `${enabled ? "Enabled" : "Disabled"} platform capability '${cap.name}'.`,
    result: "info",
  });

  commitStore();
  return true;
}

export function createReauthorizationRequest(params: {
  providerId: string;
  authorizationId: string;
  companyId: string;
  companyName: string;
  affectedAccount: string;
  affectedClients: string[];
  missingScopes: string[];
  reason: string;
  targetRole: "owner" | "admin";
}): ReauthorizationRequest {
  const store = getStore();
  const newReq: ReauthorizationRequest = {
    id: `reauth_req_${Date.now()}`,
    providerId: params.providerId,
    authorizationId: params.authorizationId,
    companyId: params.companyId,
    companyName: params.companyName,
    affectedAccount: params.affectedAccount,
    affectedClients: params.affectedClients,
    missingScopes: params.missingScopes,
    requestedBy: {
      id: "usr_superadmin",
      name: "Super Administrator",
      email: "admin@encodency.com",
    },
    requestedAt: new Date().toISOString(),
    targetRole: params.targetRole,
    reason: params.reason,
    status: "pending",
  };

  store.reauthorizationRequests = [newReq, ...store.reauthorizationRequests];

  // Update authorization status notes if found
  const auth = store.authorizations.get(params.authorizationId);
  if (auth) {
    auth.healthStatus = "needs_reconnect";
  }

  recordActivity({
    id: `act_${Date.now()}`,
    timestamp: new Date().toISOString(),
    actor: {
      id: "usr_superadmin",
      name: "Super Administrator",
      email: "admin@encodency.com",
      type: "super_admin",
    },
    eventType: "reauthorization_requested",
    providerId: params.providerId,
    companyId: params.companyId,
    companyName: params.companyName,
    description: `Created reauthorization request for ${params.companyName} (${params.affectedAccount}). Reason: ${params.reason}`,
    result: "warning",
  });

  commitStore();
  return newReq;
}

export function updateIssueStatus(
  issueId: string,
  newStatus: IssueStatus,
  noteContent?: string
): boolean {
  const store = getStore();
  const issue = store.issues.find((i) => i.id === issueId);
  if (!issue) return false;

  const oldStatus = issue.status;
  issue.status = newStatus;
  issue.updatedAt = new Date().toISOString();
  if (newStatus === "resolved") {
    issue.resolvedAt = new Date().toISOString();
  }

  issue.timeline.unshift({
    id: `tl_${Date.now()}`,
    timestamp: new Date().toISOString(),
    actor: "Super Administrator",
    action: "Status Updated",
    details: `Updated issue status from ${oldStatus} to ${newStatus}.`,
    fromStatus: oldStatus,
    toStatus: newStatus,
  });

  if (noteContent && noteContent.trim()) {
    const newNote: IssueNote = {
      id: `note_${Date.now()}`,
      authorName: "Super Administrator",
      authorEmail: "admin@encodency.com",
      createdAt: new Date().toISOString(),
      content: noteContent.trim(),
      isInternal: true,
    };
    issue.investigationNotes.unshift(newNote);
  }

  recordActivity({
    id: `act_${Date.now()}`,
    timestamp: new Date().toISOString(),
    actor: {
      id: "usr_superadmin",
      name: "Super Administrator",
      email: "admin@encodency.com",
      type: "super_admin",
    },
    eventType: newStatus === "resolved" ? "provider_incident_resolved" : "provider_incident_updated",
    providerId: issue.providerId,
    description: `Updated issue ${issue.issueNumber} (${issue.title}) to status '${newStatus}'.`,
    result: newStatus === "resolved" ? "success" : "info",
  });

  commitStore();
  return true;
}

export function assignIssueOwner(
  issueId: string,
  owner: { id: string; name: string; email: string } | null
): boolean {
  const store = getStore();
  const issue = store.issues.find((i) => i.id === issueId);
  if (!issue) return false;

  issue.internalOwner = owner;
  issue.updatedAt = new Date().toISOString();

  issue.timeline.unshift({
    id: `tl_${Date.now()}`,
    timestamp: new Date().toISOString(),
    actor: "Super Administrator",
    action: "Owner Assigned",
    details: owner ? `Assigned to ${owner.name}.` : "Unassigned internal owner.",
  });

  commitStore();
  return true;
}

export function addIssueNote(issueId: string, content: string): boolean {
  const store = getStore();
  const issue = store.issues.find((i) => i.id === issueId);
  if (!issue || !content.trim()) return false;

  const note: IssueNote = {
    id: `note_${Date.now()}`,
    authorName: "Super Administrator",
    authorEmail: "admin@encodency.com",
    createdAt: new Date().toISOString(),
    content: content.trim(),
    isInternal: true,
  };

  issue.investigationNotes.unshift(note);
  issue.updatedAt = new Date().toISOString();

  issue.timeline.unshift({
    id: `tl_${Date.now()}`,
    timestamp: new Date().toISOString(),
    actor: "Super Administrator",
    action: "Note Added",
    details: "Added internal investigation note.",
  });

  commitStore();
  return true;
}

export function updateSettings(newSettings: Partial<IntegrationSettings>): IntegrationSettings {
  const store = getStore();
  store.settings = {
    ...store.settings,
    ...newSettings,
  };

  recordActivity({
    id: `act_${Date.now()}`,
    timestamp: new Date().toISOString(),
    actor: {
      id: "usr_superadmin",
      name: "Super Administrator",
      email: "admin@encodency.com",
      type: "super_admin",
    },
    eventType: "settings_updated",
    providerId: "platform",
    description: "Updated platform-wide integration governance and health monitoring settings.",
    result: "success",
  });

  commitStore();
  return { ...store.settings };
}

export function recordActivity(activity: IntegrationActivity): void {
  const store = getStore();
  store.activities = [activity, ...store.activities];
  commitStore();
}

export function resetDemoStore(): void {
  if (typeof window !== "undefined") {
    window.sessionStorage.removeItem(SESSION_STORAGE_KEYS.integrationsStore);
  }
  storeInstance = null;
}

// -------------------------------------------------------------
// Derived KPI Computations
// -------------------------------------------------------------

export function computeIntegrationsKpis(): IntegrationsKpis {
  const store = getStore();
  const providers = Array.from(store.providers.values());
  const authorizations = Array.from(store.authorizations.values());
  const issues = store.issues;

  const totalProviders = providers.length;
  const liveProviders = providers.filter((p) => p.platformAvailability === "live").length;
  const approvalPendingProviders = providers.filter(
    (p) => p.externalApiAccess === "pending_approval" || p.externalApiAccess === "requested"
  ).length;

  const activeConnections = authorizations.filter(
    (a) => a.status === "active"
  ).length;

  const healthyConnections = authorizations.filter(
    (a) => a.status === "active" && a.healthStatus === "healthy"
  ).length;

  const reconnectRequiredConnections = authorizations.filter(
    (a) => a.healthStatus === "needs_reconnect" || a.status === "expired"
  ).length;

  const degradedProviders = providers.filter(
    (p) => p.operationalHealth === "degraded" || p.operationalHealth === "partial_outage" || p.operationalHealth === "major_outage"
  ).length;

  // Deduplicate affected companies from open issues and problematic connections
  const affectedCompanyIdSet = new Set<string>();
  issues
    .filter((i) => i.status !== "resolved")
    .forEach((i) => i.affectedCompanyIds.forEach((id) => affectedCompanyIdSet.add(id)));
  authorizations
    .filter((a) => a.healthStatus !== "healthy")
    .forEach((a) => affectedCompanyIdSet.add(a.companyId));

  const affectedCompanies = affectedCompanyIdSet.size;

  return {
    totalProviders,
    liveProviders,
    approvalPendingProviders,
    activeConnections,
    healthyConnections,
    reconnectRequiredConnections,
    degradedProviders,
    affectedCompanies,
  };
}
