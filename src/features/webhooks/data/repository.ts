/**
 * EnCodency OmniPlatform - Super Admin Webhooks Module
 * Repository seam.
 *
 * Live mode reads and writes /api/v1/super-admin/webhooks and surfaces failures. The in-memory
 * demo store is used only when the app runs in mock mode.
 */

import { isMockMode } from "@/config/env";
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


function toMutationResult<T>(res: unknown): MutationResult<T> {
  if (res && typeof res === "object" && "ok" in res) {
    return res as MutationResult<T>;
  }
  return { ok: true, data: res as T };
}

/**
 * Live mode talks to the backend and nothing else. A failed request surfaces as an error in the UI;
 * it is never replaced with the bundled demo records.
 */
const liveWebhooksRepository: WebhooksRepository = {
  getSnapshot: (environment) => superAdminWebhooksApi.getSnapshot(environment),
  getEndpoints: (environment) => superAdminWebhooksApi.getEndpoints(environment),
  getDeliveries: (environment) => superAdminWebhooksApi.getDeliveries(environment),
  getSubscriptions: (environment) => superAdminWebhooksApi.getSubscriptions(environment),
  getIncomingEvents: (environment) => superAdminWebhooksApi.getIncomingEvents(environment),
  getRecoveryRequests: (environment) => superAdminWebhooksApi.getRecoveryRequests(environment),
  getActivity: (environment) => superAdminWebhooksApi.getActivity(environment),
  getSettings: (environment) => superAdminWebhooksApi.getSettings(environment),
  createEndpoint: async (environment, input) => toMutationResult(await superAdminWebhooksApi.createEndpoint(environment, input)),
  updateEndpoint: async (environment, input) => toMutationResult(await superAdminWebhooksApi.updateEndpoint(environment, input)),
  setEndpointState: async (environment, id, state, reason) =>
    toMutationResult(await superAdminWebhooksApi.setEndpointState(environment, id, state, reason)),
  saveSubscriptions: async (environment, id, keys, reason) =>
    toMutationResult(await superAdminWebhooksApi.saveSubscriptions(environment, id, keys, reason)),
  requestSecretRotationReview: async (environment, id) =>
    toMutationResult(await superAdminWebhooksApi.requestSecretRotationReview(environment, id)),
  createRecoveryRequest: async (environment, input) =>
    toMutationResult(await superAdminWebhooksApi.createRecoveryRequest(environment, input)),
  updateRecoveryRequest: async (environment, id, state) =>
    toMutationResult(await superAdminWebhooksApi.updateRecoveryRequest(environment, id, state)),
  updateSettings: async (environment, settings) => toMutationResult(await superAdminWebhooksApi.updateSettings(environment, settings)),
  resetDemo: async (environment) => {
    await superAdminWebhooksApi.resetDemo(environment);
  },
};

/** Mock mode (NEXT_PUBLIC_DATA_SOURCE != "api") only: the in-memory demo store. */
const mockWebhooksRepository: WebhooksRepository = {
  getSnapshot: async (environment) => store.getSnapshot(environment),
  getEndpoints: async (environment) => store.getSnapshot(environment).endpoints,
  getDeliveries: async (environment) => store.getSnapshot(environment).deliveries,
  getSubscriptions: async (environment) => store.getSnapshot(environment).subscriptions,
  getIncomingEvents: async (environment) => store.getSnapshot(environment).incomingEvents,
  getRecoveryRequests: async (environment) => store.getSnapshot(environment).recoveryRequests,
  getActivity: async (environment) => store.getSnapshot(environment).activity,
  getSettings: async (environment) => store.getSnapshot(environment).settings,
  createEndpoint: async (environment, input) => store.createEndpoint(environment, input),
  updateEndpoint: async (environment, input) => store.updateEndpoint(environment, input),
  setEndpointState: async (environment, id, state, reason) => store.setEndpointState(environment, id, state, reason),
  saveSubscriptions: async (environment, id, keys, reason) => store.saveSubscriptions(environment, id, keys, reason),
  requestSecretRotationReview: async (environment, id) => store.requestSecretRotationReview(environment, id),
  createRecoveryRequest: async (environment, input) => store.createRecoveryRequest(environment, input),
  updateRecoveryRequest: async (environment, id, state) => store.updateRecoveryRequest(environment, id, state),
  updateSettings: async (environment, settings) => store.updateSettings(environment, settings),
  resetDemo: async (environment) => {
    store.resetDemo(environment);
  },
};

export const webhooksRepository: WebhooksRepository = isMockMode ? mockWebhooksRepository : liveWebhooksRepository;
