/**
 * The one seam between the UI and wherever Google Business data comes from.
 *
 * Today:   UI -> repository -> mock provider (local state)
 * Later:   UI -> repository -> OmniPlatform backend -> Google Business Profile API
 *
 * Components never import the mock provider directly, so connecting the backend
 * means implementing `GbpProvider` once - no page or component changes.
 */
import { GBP_MOCK_MODE } from "../lib/constants";
import type { GbpSnapshot } from "../types";
import { mockSnapshot } from "./mock-provider";

export interface MutationContext {
  /** Used in messages and the activity log. */
  label: string;
  /** Writes are blocked while the token is expired or the quota is spent. */
  requiresWrite?: boolean;
}

export interface GbpProvider {
  readonly mode: "mock" | "live";
  loadSnapshot(): Promise<GbpSnapshot>;
  /**
   * Write seam. The mock provider only simulates latency and failures; the live
   * provider will POST to the OmniPlatform backend and return its response.
   */
  commit<T>(context: MutationContext, apply: () => T): Promise<T>;
}

export class GbpNotConnectedError extends Error {
  constructor() {
    super("Google Business API is not connected.");
    this.name = "GbpNotConnectedError";
  }
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Flipped by the workspace preview controls to exercise failure states. */
let failNextCommit = false;
let failNextLoad = false;

export const mockControls = {
  failNextCommit: (fail: boolean) => {
    failNextCommit = fail;
  },
  failNextLoad: (fail: boolean) => {
    failNextLoad = fail;
  },
  get shouldFailCommit() {
    return failNextCommit;
  },
};

function clone<T>(value: T): T {
  return typeof structuredClone === "function" ? structuredClone(value) : (JSON.parse(JSON.stringify(value)) as T);
}

const mockProvider: GbpProvider = {
  mode: "mock",
  async loadSnapshot() {
    await wait(500);
    if (failNextLoad) {
      failNextLoad = false;
      throw new Error("Upstream request failed");
    }
    return clone(mockSnapshot);
  },
  async commit(context, apply) {
    await wait(context.requiresWrite === false ? 400 : 700);
    if (failNextCommit) {
      failNextCommit = false;
      throw new Error("Google did not respond in time");
    }
    return apply();
  },
};

/**
 * Placeholder for the real provider. It intentionally throws rather than
 * inventing data, so turning `GBP_MOCK_MODE` off shows the "not connected"
 * state instead of fake production numbers.
 */
const liveProvider: GbpProvider = {
  mode: "live",
  async loadSnapshot() {
    throw new GbpNotConnectedError();
  },
  async commit() {
    throw new GbpNotConnectedError();
  },
};

export function getProvider(): GbpProvider {
  return GBP_MOCK_MODE ? mockProvider : liveProvider;
}

export const gbpRepository = {
  get mode() {
    return getProvider().mode;
  },
  loadSnapshot: () => getProvider().loadSnapshot(),
  commit: <T>(context: MutationContext, apply: () => T) => getProvider().commit(context, apply),
};
