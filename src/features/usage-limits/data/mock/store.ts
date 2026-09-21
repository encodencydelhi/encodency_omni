/**
 * The small amount of state Usage & Limits owns: alert acknowledgements, edited
 * thresholds and the activity those produce. Usage, entitlements and overrides
 * are not here - they live in the company bundles and the plan store, so a change
 * made anywhere is seen everywhere. Rebuilt deterministically on load; written to
 * sessionStorage only once something changes.
 */
import { SESSION_STORAGE_KEYS } from "../config";
import { RESOURCE_DEFINITIONS } from "../catalogue";
import type { Acknowledgement, ResourceKey, ThresholdPolicy, UsageActivity } from "../types";

interface State {
  acknowledgements: Acknowledgement[];
  thresholds: Partial<Record<ResourceKey, ThresholdPolicy>>;
  activity: UsageActivity[];
  seeded: boolean;
  seq: number;
}

interface Persisted extends State {
  v: 1;
}

let current: State | null = null;

const fresh = (): State => ({ acknowledgements: [], thresholds: {}, activity: [], seeded: false, seq: 0 });

function load(): State {
  if (typeof window === "undefined") return fresh();
  try {
    const raw = window.sessionStorage.getItem(SESSION_STORAGE_KEYS.state);
    if (!raw) return fresh();
    const parsed = JSON.parse(raw) as Partial<Persisted>;
    return parsed.v === 1 ? { ...fresh(), ...parsed } : fresh();
  } catch {
    return fresh();
  }
}

function persist(state: State): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(SESSION_STORAGE_KEYS.state, JSON.stringify({ v: 1, ...state } satisfies Persisted));
  } catch {
    // Storage may be blocked; the in-memory state is still correct.
  }
}

function state(): State {
  current ??= load();
  return current;
}

export const isSeeded = () => state().seeded;
export const listAcknowledgements = () => state().acknowledgements;
export const listStoredActivity = () => state().activity;

export function thresholdsFor(resource: ResourceKey): ThresholdPolicy {
  const edited = state().thresholds[resource];
  if (edited) return edited;
  const def = RESOURCE_DEFINITIONS.find((item) => item.key === resource);
  return { warningPct: def?.warningPct ?? 90, criticalPct: def?.criticalPct ?? 95 };
}

export function nextSeq(): number {
  const store = state();
  store.seq += 1;
  return store.seq;
}

export function recordAcknowledgement(ack: Acknowledgement, activity: UsageActivity, seed = false): void {
  const store = state();
  store.acknowledgements = [...store.acknowledgements.filter((item) => item.alertId !== ack.alertId), ack];
  store.activity = [activity, ...store.activity];
  if (seed) store.seeded = true;
  persist(store);
}

export function markSeeded(): void {
  const store = state();
  store.seeded = true;
  persist(store);
}

export function recordThresholds(resource: ResourceKey, thresholds: ThresholdPolicy, activity: UsageActivity): void {
  const store = state();
  store.thresholds = { ...store.thresholds, [resource]: thresholds };
  store.activity = [activity, ...store.activity];
  persist(store);
}

export function resetUsageState(): void {
  current = fresh();
  if (typeof window !== "undefined") {
    try {
      window.sessionStorage.removeItem(SESSION_STORAGE_KEYS.state);
    } catch {
      // ignore
    }
  }
}
