"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

export function useNow(intervalMs = 30_000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}

const noopSubscribe = () => () => { };

export function useHydrated() {
  return useSyncExternalStore(noopSubscribe, () => true, () => false);
}
