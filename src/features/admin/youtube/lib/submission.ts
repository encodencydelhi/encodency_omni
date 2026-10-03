import { newIdempotencyKey } from "../live/youtube-api";

/**
 * Double-submit protection, kept free of React so it can be tested.
 *
 *  - `createSingleFlight`: while an action with a given key is running, a second call with the same key (double click,
 *    Enter + click) is ignored instead of sending a second request.
 *  - `createSubmissionKeys`: one Idempotency-Key per LOGICAL submission. The same input keeps the same key (so a retry
 *    after a network failure is recognised by the backend); changed input, or success, starts a new one.
 */

export function createSingleFlight() {
  const inFlight = new Set<string>();
  return {
    isRunning: (key: string) => inFlight.has(key),
    /** Resolves `{ ran: false }` when the same key is already running; otherwise runs `fn` and releases the key afterwards. */
    async run<T>(key: string, fn: () => Promise<T>): Promise<{ ran: false } | { ran: true; value: T }> {
      if (inFlight.has(key)) return { ran: false };
      inFlight.add(key);
      try {
        return { ran: true, value: await fn() };
      } finally {
        inFlight.delete(key);
      }
    },
  };
}

export function createSubmissionKeys(makeKey: () => string = newIdempotencyKey) {
  const stored = new Map<string, { fingerprint: string; key: string }>();
  return {
    keyFor(name: string, fingerprint: string): string {
      const current = stored.get(name);
      if (current && current.fingerprint === fingerprint) return current.key;
      const key = makeKey();
      stored.set(name, { fingerprint, key });
      return key;
    },
    forget(name: string): void {
      stored.delete(name);
    },
  };
}
