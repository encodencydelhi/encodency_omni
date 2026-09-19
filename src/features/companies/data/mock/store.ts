/**
 * In-memory store behind the mock provider.
 *
 * The deterministic dataset is rebuilt on every load; only the bundles a Super
 * Admin actually changed (or created) are written to `sessionStorage`. A refresh
 * on a company created during the session therefore still resolves, while a new
 * session starts from the untouched dataset. Nothing here reaches a server.
 */
import { ApiError } from "@/types/api";
import { SESSION_STORAGE_KEYS } from "../config";
import type { CompanyBundle } from "../types";
import { buildDataset } from "./dataset";

interface Store {
  bundles: Map<string, CompanyBundle>;
  dirty: Set<string>;
}

interface PersistedState {
  v: 1;
  bundles: Record<string, CompanyBundle>;
}

let store: Store | null = null;

function readPersisted(): PersistedState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(SESSION_STORAGE_KEYS.demoState);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedState;
    return parsed.v === 1 ? parsed : null;
  } catch {
    return null;
  }
}

function persist(current: Store): void {
  if (typeof window === "undefined") return;
  try {
    const bundles: Record<string, CompanyBundle> = {};
    for (const id of current.dirty) {
      const bundle = current.bundles.get(id);
      if (bundle) bundles[id] = bundle;
    }
    const state: PersistedState = { v: 1, bundles };
    window.sessionStorage.setItem(SESSION_STORAGE_KEYS.demoState, JSON.stringify(state));
  } catch {
    // Storage can be unavailable or full. The demo keeps working in memory.
  }
}

function getStore(): Store {
  if (store) return store;

  const created: Store = { bundles: buildDataset(), dirty: new Set() };
  const persisted = readPersisted();
  if (persisted) {
    for (const [id, bundle] of Object.entries(persisted.bundles)) {
      created.bundles.set(id, bundle);
      created.dirty.add(id);
    }
  }

  store = created;
  return created;
}

export function allBundles(): CompanyBundle[] {
  return [...getStore().bundles.values()];
}

export function findBundle(id: string): CompanyBundle | undefined {
  return getStore().bundles.get(id);
}

export function requireBundle(id: string): CompanyBundle {
  const bundle = findBundle(id);
  if (!bundle) {
    throw new ApiError({ code: "NOT_FOUND", status: 404, message: `Company ${id} was not found.` });
  }
  return bundle;
}

export function writeBundle(bundle: CompanyBundle): void {
  const current = getStore();
  current.bundles.set(bundle.company.id, bundle);
  current.dirty.add(bundle.company.id);
  persist(current);
}

/** Discards every change made in this session and rebuilds the base dataset. */
export function resetDemoState(): void {
  if (typeof window !== "undefined") {
    try {
      window.sessionStorage.removeItem(SESSION_STORAGE_KEYS.demoState);
    } catch {
      // ignore
    }
  }
  store = null;
}

export function countDirty(): number {
  return getStore().dirty.size;
}
