/**
 * EnCodency OmniPlatform - Super Admin Webhooks Module
 * Repository seam.
 *
 * Connected to live backend authenticated webhook service (/api/v1/super-admin/webhooks)
 * with graceful in-memory fallback for offline test suites.
 */

import * as store from "./mock/store";
import { superAdminWebhooksApi } from "../live/super-admin-webhooks-api";
import type {
  CreateEndpointInput,
  CreateRecoveryInput,
  EndpointState,
  EventSubscription,
  MutationResult,
  OutgoingEndpoint,
  RecoveryRequest,
  RecoveryState,
  UpdateEndpointInput,
  WebhookActivity,
  WebhookEnvironment,
  WebhookSettings,
  WebhooksSnapshot,
} from "./types";

export interface WebhooksRepository {
  getSnapshot(environment: WebhookEnvironment): Promise<WebhooksSnapshot>;
  getEndpoints(environment: WebhookEnvironment): Promise<OutgoingEndpoint[]>;
  getDeliveries(environment: WebhookEnvironment): Promise<any[]>;
  getSubscriptions(environment: WebhookEnvironment): Promise<EventSubscription[]>;
  getIncomingEvents(environment: WebhookEnvironment): Promise<any[]>;
  getRecoveryRequests(environment: WebhookEnvironment): Promise<RecoveryRequest[]>;
  getActivity(environment: WebhookEnvironment): Promise<WebhookActivity[]>;
  getSettings(environment: WebhookEnvironment): Promise<WebhookSettings>;
  createEndpoint(environment: WebhookEnvironment, input: CreateEndpointInput): Promise<MutationResult<OutgoingEndpoint>>;
  updateEndpoint(environment: WebhookEnvironment, input: UpdateEndpointInput): Promise<MutationResult<OutgoingEndpoint>>;
  setEndpointState(environment: WebhookEnvironment, endpointId: string, state: Extract<EndpointState, "enabled" | "disabled">, reason: string): Promise<MutationResult<OutgoingEndpoint>>;
  saveSubscriptions(environment: WebhookEnvironment, endpointId: string, eventKeys: string[], reason: string): Promise<MutationResult<EventSubscription[]>>;
  requestSecretRotationReview(environment: WebhookEnvironment, endpointId: string): Promise<MutationResult<WebhookActivity>>;
  createRecoveryRequest(environment: WebhookEnvironment, input: CreateRecoveryInput): Promise<MutationResult<RecoveryRequest>>;
  updateRecoveryRequest(environment: WebhookEnvironment, requestId: string, state: Extract<RecoveryState, "cancelled" | "pending_review">): Promise<MutationResult<RecoveryRequest>>;
  updateSettings(environment: WebhookEnvironment, settings: WebhookSettings): Promise<MutationResult<WebhookSettings>>;
  resetDemo(environment: WebhookEnvironment): Promise<void>;
}

/**
 * The in-memory store stays as an offline/test-suite fallback, but a silent one
 * hides real backend failures from the operator (the UI then shows demo data
 * while the network tab shows a red request nobody noticed). Every fallback now
 * announces itself, including which operation fell back and why.
 */
function fallback<T>(operation: string, error: unknown, run: () => T): T {
  const reason = error instanceof Error ? error.message : String(error);
  console.warn(`[webhooks] ${operation} failed, using local demo store instead: ${reason}`);
  return run();
}

function toMutationResult<T>(res: unknown): MutationResult<T> {
  if (res && typeof res === "object" && "ok" in res) {
    return res as MutationResult<T>;
  }
  return { ok: true, data: res as T };
}

export const webhooksRepository: WebhooksRepository = {
  getSnapshot: async (environment) => {
    try {
      return await superAdminWebhooksApi.getSnapshot(environment);
    } catch (error) {
      return fallback("getSnapshot", error, () => store.getSnapshot(environment));
    }
  },
  getEndpoints: async (environment) => {
    try {
      return await superAdminWebhooksApi.getEndpoints(environment);
    } catch (error) {
      return fallback("getEndpoints", error, () => store.getSnapshot(environment).endpoints);
    }
  },
  getDeliveries: async (environment) => {
    try {
      return await superAdminWebhooksApi.getDeliveries(environment);
    } catch (error) {
      return fallback("getDeliveries", error, () => store.getSnapshot(environment).deliveries);
    }
  },
  getSubscriptions: async (environment) => {
    try {
      return await superAdminWebhooksApi.getSubscriptions(environment);
    } catch (error) {
      return fallback("getSubscriptions", error, () => store.getSnapshot(environment).subscriptions);
    }
  },
  getIncomingEvents: async (environment) => {
    try {
      return await superAdminWebhooksApi.getIncomingEvents(environment);
    } catch (error) {
      return fallback("getIncomingEvents", error, () => store.getSnapshot(environment).incomingEvents);
    }
  },
  getRecoveryRequests: async (environment) => {
    try {
      return await superAdminWebhooksApi.getRecoveryRequests(environment);
    } catch (error) {
      return fallback("getRecoveryRequests", error, () => store.getSnapshot(environment).recoveryRequests);
    }
  },
  getActivity: async (environment) => {
    try {
      return await superAdminWebhooksApi.getActivity(environment);
    } catch (error) {
      return fallback("getActivity", error, () => store.getSnapshot(environment).activity);
    }
  },
  getSettings: async (environment) => {
    try {
      return await superAdminWebhooksApi.getSettings(environment);
    } catch (error) {
      return fallback("getSettings", error, () => store.getSnapshot(environment).settings);
    }
  },
  createEndpoint: async (environment, input) => {
    try {
      const res = await superAdminWebhooksApi.createEndpoint(environment, input);
      return toMutationResult(res);
    } catch (error) {
      return fallback("createEndpoint", error, () => store.createEndpoint(environment, input));
    }
  },
  updateEndpoint: async (environment, input) => {
    try {
      const res = await superAdminWebhooksApi.updateEndpoint(environment, input);
      return toMutationResult(res);
    } catch (error) {
      return fallback("updateEndpoint", error, () => store.updateEndpoint(environment, input));
    }
  },
  setEndpointState: async (environment, id, state, reason) => {
    try {
      const res = await superAdminWebhooksApi.setEndpointState(environment, id, state, reason);
      return toMutationResult(res);
    } catch (error) {
      return fallback("setEndpointState", error, () => store.setEndpointState(environment, id, state, reason));
    }
  },
  saveSubscriptions: async (environment, id, keys, reason) => {
    try {
      const res = await superAdminWebhooksApi.saveSubscriptions(environment, id, keys, reason);
      return toMutationResult(res);
    } catch (error) {
      return fallback("saveSubscriptions", error, () => store.saveSubscriptions(environment, id, keys, reason));
    }
  },
  requestSecretRotationReview: async (environment, id) => {
    try {
      const res = await superAdminWebhooksApi.requestSecretRotationReview(environment, id);
      return toMutationResult(res);
    } catch (error) {
      return fallback("requestSecretRotationReview", error, () => store.requestSecretRotationReview(environment, id));
    }
  },
  createRecoveryRequest: async (environment, input) => {
    try {
      const res = await superAdminWebhooksApi.createRecoveryRequest(environment, input);
      return toMutationResult(res);
    } catch (error) {
      return fallback("createRecoveryRequest", error, () => store.createRecoveryRequest(environment, input));
    }
  },
  updateRecoveryRequest: async (environment, id, state) => {
    try {
      const res = await superAdminWebhooksApi.updateRecoveryRequest(environment, id, state);
      return toMutationResult(res);
    } catch (error) {
      return fallback("updateRecoveryRequest", error, () => store.updateRecoveryRequest(environment, id, state));
    }
  },
  updateSettings: async (environment, settings) => {
    try {
      const res = await superAdminWebhooksApi.updateSettings(environment, settings);
      return toMutationResult(res);
    } catch (error) {
      return fallback("updateSettings", error, () => store.updateSettings(environment, settings));
    }
  },
  resetDemo: async (environment) => {
    try {
      await superAdminWebhooksApi.resetDemo(environment);
    } catch (error) {
      fallback("resetDemo", error, () => store.resetDemo(environment));
    }
  },
};
