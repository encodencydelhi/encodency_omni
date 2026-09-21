/**
 * EnCodency OmniPlatform - Super Admin Webhooks Module
 * Repository seam.
 *
 *   Today:  UI -> hooks -> webhooksRepository -> in-memory demo provider
 *   Later:  UI -> hooks -> webhooksRepository -> authenticated backend webhook service
 *
 * Components never import the mock store. Every mutation returns a MutationResult, and none of them can
 * fabricate delivery attempts, incoming events or executed recovery states.
 */

import * as store from "./mock/store";
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

const latency = <T,>(value: T, ms = 140): Promise<T> => new Promise((resolve) => setTimeout(() => resolve(value), ms));

export const webhooksRepository: WebhooksRepository = {
  getSnapshot: (environment) => latency(store.getSnapshot(environment), 180),
  createEndpoint: (environment, input) => latency(store.createEndpoint(environment, input)),
  updateEndpoint: (environment, input) => latency(store.updateEndpoint(environment, input)),
  setEndpointState: (environment, id, state, reason) => latency(store.setEndpointState(environment, id, state, reason)),
  saveSubscriptions: (environment, id, keys, reason) => latency(store.saveSubscriptions(environment, id, keys, reason)),
  requestSecretRotationReview: (environment, id) => latency(store.requestSecretRotationReview(environment, id)),
  createRecoveryRequest: (environment, input) => latency(store.createRecoveryRequest(environment, input)),
  updateRecoveryRequest: (environment, id, state) => latency(store.updateRecoveryRequest(environment, id, state)),
  updateSettings: (environment, settings) => latency(store.updateSettings(environment, settings)),
  resetDemo: async (environment) => {
    store.resetDemo(environment);
  },
};
