/**
 * The shared Feature Flags state: flag definitions with their per-environment
 * configuration, change requests, activity and configuration versions. Rebuilt
 * deterministically on load; written to sessionStorage only once something is
 * changed. Consumers reach it only through the mock provider.
 */
import { SESSION_STORAGE_KEYS } from "../config";
import type { ConfigVersion, FeatureFlag, FlagActivity, FlagChange } from "../types";
import { buildSeed } from "./seed";

interface State {
  flags: FeatureFlag[];
  changes: FlagChange[];
  activity: FlagActivity[];
  versions: ConfigVersion[];
  seq: number;
}

interface Persisted extends State {
  v: 1;
}

let current: State | null = null;

function fromSeed(companyIds: readonly string[]): State {
  const seed = buildSeed(companyIds);
  return { flags: seed.flags, changes: seed.changes, activity: seed.activity, versions: seed.versions, seq: seed.seq };
}

function load(companyIds: readonly string[]): State {
  if (typeof window === "undefined") return fromSeed(companyIds);
  try {
    const raw = window.sessionStorage.getItem(SESSION_STORAGE_KEYS.state);
    if (!raw) return fromSeed(companyIds);
    const parsed = JSON.parse(raw) as Partial<Persisted>;
    if (parsed.v !== 1 || !parsed.flags || !parsed.changes || !parsed.activity || !parsed.versions) return fromSeed(companyIds);
    return { flags: parsed.flags, changes: parsed.changes, activity: parsed.activity, versions: parsed.versions, seq: parsed.seq ?? 0 };
  } catch {
    return fromSeed(companyIds);
  }
}

function persist(state: State): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(SESSION_STORAGE_KEYS.state, JSON.stringify({ v: 1, ...state } satisfies Persisted));
  } catch {
    // Storage may be blocked or full; the in-memory state is still correct.
  }
}

/** The store, initialised on first use. `companyIds` only seeds selected-company targeting. */
export function state(companyIds: readonly string[]): State {
  current ??= load(companyIds);
  return current;
}

export function nextSeq(companyIds: readonly string[]): number {
  const store = state(companyIds);
  store.seq += 1;
  return store.seq;
}

export function save(store: State): void {
  persist(store);
}

export function resetFlagsState(): void {
  current = null;
  if (typeof window !== "undefined") {
    try {
      window.sessionStorage.removeItem(SESSION_STORAGE_KEYS.state);
    } catch {
      // ignore
    }
  }
}
