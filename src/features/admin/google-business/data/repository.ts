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
  /**
   * Receives a fresh copy of the local snapshot so a live provider only has to
   * overlay what the backend actually knows; mock returns it untouched.
   */
  loadSnapshot(base: GbpSnapshot): Promise<GbpSnapshot>;
  /**
   * Write seam. The mock provider only simulates latency and failures; the live
   * provider will POST to the OmniPlatform backend and return its response.
   */
  commit<T>(context: MutationContext, apply: () => T): Promise<T>;
}

/** Why the workspace has nothing to show: no Google login at all, a login that needs reconnecting, or a login with no location linked to this Client yet. */
export interface GbpNotConnectedDetail {
  reason: "no_connection" | "reconnect" | "no_location";
  integrationId: string | null;
}

export class GbpNotConnectedError extends Error {
  readonly detail: GbpNotConnectedDetail | null;

  constructor(detail: GbpNotConnectedDetail | null = null) {
    super("Google Business API is not connected.");
    this.name = "GbpNotConnectedError";
    this.detail = detail;
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
  async loadSnapshot(base) {
    await wait(500);
    if (failNextLoad) {
      failNextLoad = false;
      throw new Error("Upstream request failed");
    }
    return base;
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

import { apiProvider } from "./api-provider";

export function getProvider(): GbpProvider {
  return GBP_MOCK_MODE ? mockProvider : apiProvider;
}

export const gbpRepository = {
  get mode() {
    return getProvider().mode;
  },
  loadSnapshot: () => getProvider().loadSnapshot(clone(mockSnapshot)),
  commit: <T>(context: MutationContext, apply: () => T) => getProvider().commit(context, apply),
};
