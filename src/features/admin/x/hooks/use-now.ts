"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

/** Re-renders on an interval so relative timestamps stay current. */
export function useNow(intervalMs = 30_000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);
  return now;
}

const noopSubscribe = () => () => {};

/**
 * False during SSR and the first client render. Anything that depends on the
 * viewer's clock or locale renders a placeholder until this flips, so the
 * server and client markup always agree.
 */
export function useHydrated() {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}
