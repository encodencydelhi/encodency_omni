/**
 * The single shared Global Settings state: current values, change records and
 * version snapshots. It is rebuilt deterministically on load and written to
 * sessionStorage only after something is changed, so a fresh tab always starts
 * from the seed. Consumers reach it only through the mock provider.
 */
import { SESSION_STORAGE_KEYS } from "../config";
import { cloneValue, defaultValues } from "../registry";
import type { ConfigurationChange, ConfigurationVersion, SettingValues } from "../types";
import { buildSeed } from "./seed";

interface State {
  values: SettingValues;
  changes: ConfigurationChange[];
  versions: ConfigurationVersion[];
  seq: number;
}

interface Persisted extends State {
  v: 1;
}

let current: State | null = null;

function fromSeed(): State {
  const seed = buildSeed();
  return { values: seed.values, changes: seed.changes, versions: seed.versions, seq: seed.seq };
}

function load(): State {
  if (typeof window === "undefined") return fromSeed();
  try {
    const raw = window.sessionStorage.getItem(SESSION_STORAGE_KEYS.state);
    if (!raw) return fromSeed();
    const parsed = JSON.parse(raw) as Partial<Persisted>;
    if (parsed.v !== 1 || !parsed.values || !parsed.changes || !parsed.versions) return fromSeed();
    // Settings added since the state was saved fall back to their registry default.
    return { values: { ...defaultValues(), ...parsed.values }, changes: parsed.changes, versions: parsed.versions, seq: parsed.seq ?? parsed.changes.length };
  } catch {
    return fromSeed();
  }
}

function persist(state: State): void {
  if (typeof window === "undefined") return;
  try {
    const payload: Persisted = { v: 1, ...state };
    window.sessionStorage.setItem(SESSION_STORAGE_KEYS.state, JSON.stringify(payload));
  } catch {
    // Storage may be blocked or full; the in-memory state is still correct.
  }
}

function state(): State {
  current ??= load();
  return current;
}

export function getValues(): SettingValues {
  const values = state().values;
  return Object.fromEntries(Object.entries(values).map(([key, value]) => [key, cloneValue(value)]));
}

export function listChanges(): ConfigurationChange[] {
  return state().changes;
}

export function listVersions(): ConfigurationVersion[] {
  return state().versions;
}

export function currentVersion(): ConfigurationVersion {
  const versions = state().versions;
  const found = versions.find((item) => item.status === "current") ?? versions[versions.length - 1];
  if (!found) throw new Error("Global Settings has no configuration version.");
  return found;
}

export function nextId(prefix: "chg" | "v"): number {
  const store = state();
  if (prefix === "chg") {
    store.seq += 1;
    return store.seq;
  }
  return Math.max(0, ...store.versions.map((item) => item.number)) + 1;
}

export interface Commit {
  values?: SettingValues;
  changes?: ConfigurationChange[];
  /** Replaces changes that already exist (matched by id), e.g. a withdrawn request. */
  updates?: ConfigurationChange[];
  version?: ConfigurationVersion;
}

/** Applies one atomic update. A new version demotes the previous current one. */
export function commit(update: Commit): void {
  const store = state();
  if (update.values) store.values = update.values;
  if (update.version) {
    store.versions = store.versions.map((item) => (item.status === "current" ? { ...item, status: "previous" as const } : item));
    store.versions.push(update.version);
  }
  if (update.updates) {
    const byId = new Map(update.updates.map((item) => [item.id, item]));
    store.changes = store.changes.map((item) => byId.get(item.id) ?? item);
  }
  if (update.changes) store.changes = [...store.changes, ...update.changes];
  persist(store);
}

export function resetSettingsState(): void {
  current = fromSeed();
  if (typeof window !== "undefined") {
    try {
      window.sessionStorage.removeItem(SESSION_STORAGE_KEYS.state);
    } catch {
      // ignore
    }
  }
}
