/**
 * Deterministic pseudo-randomness.
 *
 * Mock data must be identical on the server and on the client, otherwise React
 * hydration mismatches. Every generator therefore draws from a seeded sequence
 * rather than Math.random().
 */

export interface Rng {
  next(): number;
  int(min: number, max: number): number;
  float(min: number, max: number, decimals?: number): number;
  bool(probability?: number): boolean;
  pick<T>(items: readonly T[]): T;
  pickMany<T>(items: readonly T[], count: number): T[];
  weighted<T extends string>(weights: Record<T, number>): T;
}

/** mulberry32 — small, fast, and well-distributed enough for fixtures. */
export function createRng(seed: number): Rng {
  let state = seed >>> 0;

  const next = (): number => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  const int = (min: number, max: number): number =>
    min + Math.floor(next() * (max - min + 1));

  function pick<T>(items: readonly T[]): T {
    const item = items[int(0, items.length - 1)];
    if (item === undefined) {
      throw new Error("Rng.pick was called with an empty collection");
    }
    return item;
  }

  function pickMany<T>(items: readonly T[], count: number): T[] {
    const pool = [...items];
    const result: T[] = [];
    const total = Math.min(count, pool.length);
    for (let i = 0; i < total; i += 1) {
      const [taken] = pool.splice(int(0, pool.length - 1), 1);
      if (taken !== undefined) result.push(taken);
    }
    return result;
  }

  function weighted<T extends string>(weights: Record<T, number>): T {
    const entries = Object.entries(weights) as Array<[T, number]>;
    const total = entries.reduce((sum, [, weight]) => sum + weight, 0);
    let threshold = next() * total;
    for (const [value, weight] of entries) {
      threshold -= weight;
      if (threshold <= 0) return value;
    }
    const fallback = entries[0];
    if (!fallback) throw new Error("Rng.weighted was called with no weights");
    return fallback[0];
  }

  return {
    next,
    int,
    float: (min, max, decimals = 2) =>
      Number((min + next() * (max - min)).toFixed(decimals)),
    bool: (probability = 0.5) => next() < probability,
    pick,
    pickMany,
    weighted,
  };
}

/**
 * Fixed "now" for the mock dataset.
 *
 * Anchoring generated timestamps to a constant keeps fixtures stable and
 * prevents server/client drift across a render boundary.
 */
export const MOCK_NOW = new Date("2026-09-09T09:30:00.000Z").getTime();

const DAY_MS = 86_400_000;

/** An ISO timestamp `days` before the anchor. Fractions are allowed. */
export function daysAgo(days: number): string {
  return new Date(MOCK_NOW - days * DAY_MS).toISOString();
}

export function daysAhead(days: number): string {
  return new Date(MOCK_NOW + days * DAY_MS).toISOString();
}

export function minutesAgo(minutes: number): string {
  return new Date(MOCK_NOW - minutes * 60_000).toISOString();
}

/** ISO date without a time component, for chart x-axes. */
export function dayKey(offsetDays: number): string {
  return new Date(MOCK_NOW - offsetDays * DAY_MS).toISOString().slice(0, 10);
}

export interface TrendOptions {
  rng: Rng;
  days: number;
  start: number;
  end: number;
  /** Relative jitter applied to each point, 0-1. */
  noise?: number;
  integer?: boolean;
}

/**
 * An ascending daily series ending on the anchor date, combining a linear
 * trend with bounded noise so charts read as plausible rather than synthetic.
 */
export function buildTrend(options: TrendOptions): Array<{ date: string; value: number }> {
  const { rng, days, start, end, noise = 0.06, integer = true } = options;

  return Array.from({ length: days }, (_, index) => {
    const progress = days === 1 ? 1 : index / (days - 1);
    const base = start + (end - start) * progress;
    const jitter = base * noise * (rng.next() * 2 - 1);
    const value = Math.max(0, base + jitter);

    return {
      date: dayKey(days - 1 - index),
      value: integer ? Math.round(value) : Number(value.toFixed(2)),
    };
  });
}
