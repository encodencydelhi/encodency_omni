"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

/** Current time that re-renders on an interval, so render itself stays pure. */
export function useNow(intervalMs = 30_000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);
  return now;
}

const noopSubscribe = () => () => {};

/** False during SSR and hydration, true afterwards - for clock-dependent text. */
export function useHydrated() {
  return useSyncExternalStore(noopSubscribe, () => true, () => false);
}

/** Debounces a value; `pending` is true while the debounced copy lags behind. */
export function useDebounced<T>(value: T, delay = 250) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return { value: debounced, pending: debounced !== value };
}
