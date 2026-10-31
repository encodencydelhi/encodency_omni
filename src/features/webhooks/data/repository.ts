import { isMockMode } from "@/config/env";
import * as store from "./mock/store";
import { superAdminWebhooksApi } from "../live/super-admin-webhooks-api";
import type {
  CreateEndpointInput,
  CreateSourceInput,
  Delivery,
  IncomingEvent,
  IncomingSource,
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
  /** `hours` limits deliveries and incoming events to the selected period; configuration always loads in full. */
  getSnapshot(environment: WebhookEnvironment, hours?: number): Promise<WebhooksSnapshot>;
  getEndpoints(environment: WebhookEnvironment): Promise<OutgoingEndpoint[]>;
  getDeliveries(environment: WebhookEnvironment): Promise<Delivery[]>;
  getSubscriptions(environment: WebhookEnvironment): Promise<EventSubscription[]>;
  getIncomingEvents(environment: WebhookEnvironment): Promise<IncomingEvent[]>;
  getRecoveryRequests(environment: WebhookEnvironment): Promise<RecoveryRequest[]>;
  getActivity(environment: WebhookEnvironment): Promise<WebhookActivity[]>;
  getSettings(environment: WebhookEnvironment): Promise<WebhookSettings>;
  createEndpoint(environment: WebhookEnvironment, input: CreateEndpointInput): Promise<MutationResult<OutgoingEndpoint>>;
  updateEndpoint(environment: WebhookEnvironment, input: UpdateEndpointInput): Promise<MutationResult<OutgoingEndpoint>>;
  setEndpointState(environment: WebhookEnvironment, endpointId: string, state: Extract<EndpointState, "enabled" | "disabled">, reason: string): Promise<MutationResult<OutgoingEndpoint>>;
  saveSubscriptions(environment: WebhookEnvironment, endpointId: string, eventKeys: string[], reason: string): Promise<MutationResult<EventSubscription[]>>;
  requestSecretRotationReview(environment: WebhookEnvironment, endpointId: string, reason?: string, keepOldHours?: number): Promise<MutationResult<WebhookActivity>>;
  /** Records that a Super Admin reviewed the endpoint's destination and signing set-up (live workspace only). */
  markSecurityReviewed(environment: WebhookEnvironment, endpointId: string, reason: string): Promise<MutationResult<OutgoingEndpoint>>;
  /** Incoming sources exist in the live workspace only; the signing secret is returned once. */
  createSource(environment: WebhookEnvironment, input: CreateSourceInput): Promise<MutationResult<{ source: IncomingSource; secret: string }>>;
  setSourceState(environment: WebhookEnvironment, sourceId: string, enabled: boolean, reason: string): Promise<MutationResult<IncomingSource>>;
  rotateSourceSecret(environment: WebhookEnvironment, sourceId: string, reason: string, keepOldHours: number): Promise<MutationResult<{ source: IncomingSource; secret: string }>>;
  createRecoveryRequest(environment: WebhookEnvironment, input: CreateRecoveryInput): Promise<MutationResult<RecoveryRequest>>;
  updateRecoveryRequest(environment: WebhookEnvironment, requestId: string, state: RecoveryState): Promise<MutationResult<RecoveryRequest>>;
  updateSettings(environment: WebhookEnvironment, settings: WebhookSettings): Promise<MutationResult<WebhookSettings>>;
  resetDemo(environment: WebhookEnvironment): Promise<void>;
}


function toMutationResult<T>(res: unknown): MutationResult<T> {
  if (res && typeof res === "object" && "ok" in res) {
    return res as MutationResult<T>;
  }
  return { ok: true, data: res as T };
}
const liveWebhooksRepository: WebhooksRepository = {
  getSnapshot: (environment, hours) => superAdminWebhooksApi.getSnapshot(environment, hours),
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
  requestSecretRotationReview: async (environment, id, reason, keepOldHours) =>
    toMutationResult(await superAdminWebhooksApi.requestSecretRotationReview(environment, id, reason ?? "", keepOldHours ?? 0)),
  markSecurityReviewed: async (environment, id, reason) =>
    toMutationResult(await superAdminWebhooksApi.markSecurityReviewed(environment, id, reason)),
  createSource: async (environment, input) => toMutationResult(await superAdminWebhooksApi.createSource({ ...input, environment })),
  setSourceState: async (environment, id, enabled, reason) => toMutationResult(await superAdminWebhooksApi.setSourceState(environment, id, enabled, reason)),
  rotateSourceSecret: async (environment, id, reason, keepOldHours) => toMutationResult(await superAdminWebhooksApi.rotateSourceSecret(environment, id, reason, keepOldHours)),
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
  markSecurityReviewed: async () => ({ ok: false, error: "Security reviews are recorded in the live workspace only." }),
  createSource: async () => ({ ok: false, error: "Incoming sources are created in the live workspace only." }),
  setSourceState: async () => ({ ok: false, error: "Incoming sources are managed in the live workspace only." }),
  rotateSourceSecret: async () => ({ ok: false, error: "Incoming sources are managed in the live workspace only." }),
  createRecoveryRequest: async (environment, input) => store.createRecoveryRequest(environment, input),
  updateRecoveryRequest: async (environment, id, state) => store.updateRecoveryRequest(environment, id, state),
  updateSettings: async (environment, settings) => store.updateSettings(environment, settings),
  resetDemo: async (environment) => {
    store.resetDemo(environment);
  },
};

export const webhooksRepository: WebhooksRepository = isMockMode ? mockWebhooksRepository : liveWebhooksRepository;
