/**
 * EnCodency OmniPlatform - Super Admin API Monitoring Module
 * Session-Storage Backed Mutable Mock Store
 */

import { buildInitialApiMonitoringDataset, type ApiMonitoringDataset } from "./dataset";
import { SESSION_STORAGE_KEYS } from "../config";
import type { EndpointStatus, RateLimitState } from "../types";

let cachedDataset: ApiMonitoringDataset | null = null;

function loadDataset(): ApiMonitoringDataset {
  if (cachedDataset) return cachedDataset;

  if (typeof window === "undefined") {
    cachedDataset = buildInitialApiMonitoringDataset();
    return cachedDataset;
  }

  try {
    const raw = sessionStorage.getItem(SESSION_STORAGE_KEYS.apiMonitoringStore);
    if (raw) {
      cachedDataset = JSON.parse(raw) as ApiMonitoringDataset;
      return cachedDataset;
    }
  } catch {
    // fall through
  }

  cachedDataset = buildInitialApiMonitoringDataset();
  persistDataset(cachedDataset);
  return cachedDataset;
}

function persistDataset(dataset: ApiMonitoringDataset) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(SESSION_STORAGE_KEYS.apiMonitoringStore, JSON.stringify(dataset));
  } catch {
    // storage full, ignore
  }
}

function getDataset(): ApiMonitoringDataset {
  return loadDataset();
}

// ---- Public API ----

export function getKpis() {
  return Promise.resolve({ ...getDataset().kpis });
}

export function getEndpoints() {
  return Promise.resolve([...getDataset().endpoints]);
}

export function getEndpointById(id: string) {
  return Promise.resolve(getDataset().endpoints.find((e) => e.id === id) ?? null);
}

export function getProviderHealth() {
  return Promise.resolve([...getDataset().providerHealth]);
}

export function getErrorLogs(endpointId?: string) {
  const logs = getDataset().errorLogs;
  return Promise.resolve(endpointId ? logs.filter((l) => l.endpointId === endpointId) : [...logs]);
}

export function getRequestLogs(endpointId?: string) {
  const logs = getDataset().requestLogs;
  return Promise.resolve(endpointId ? logs.filter((l) => l.endpointId === endpointId) : [...logs]);
}

export function getErrorBreakdown() {
  return Promise.resolve([...getDataset().errorBreakdown]);
}

export function getRequestTrends() {
  return Promise.resolve([...getDataset().requestTrends]);
}

export function getActivities() {
  return Promise.resolve([...getDataset().activities]);
}

export function updateEndpointStatus(endpointId: string, status: EndpointStatus): Promise<boolean> {
  const ds = getDataset();
  const ep = ds.endpoints.find((e) => e.id === endpointId);
  if (!ep) return Promise.resolve(false);
  ep.status = status;
  persistDataset(ds);
  return Promise.resolve(true);
}

export function updateRateLimitState(endpointId: string, state: RateLimitState): Promise<boolean> {
  const ds = getDataset();
  const ep = ds.endpoints.find((e) => e.id === endpointId);
  if (!ep) return Promise.resolve(false);
  ep.rateLimitState = state;
  persistDataset(ds);
  return Promise.resolve(true);
}

export function resetDemo(): Promise<void> {
  cachedDataset = null;
  if (typeof window !== "undefined") {
    sessionStorage.removeItem(SESSION_STORAGE_KEYS.apiMonitoringStore);
  }
  loadDataset();
  return Promise.resolve();
}
