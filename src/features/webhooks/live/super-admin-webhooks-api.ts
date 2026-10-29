import { apiClient } from "@/lib/api/client";
import type {
  CreateEndpointInput,
  CreateRecoveryInput,
  EndpointState,
  Delivery,
  IncomingEvent,
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
  IncomingSource,
} from "../data/types";

const BASE = "/super-admin/webhooks";

export const superAdminWebhooksApi = {
  getSnapshot: (environment: WebhookEnvironment = "production", hours?: number, signal?: AbortSignal) =>
    apiClient.request<WebhooksSnapshot>({
      method: "GET",
      path: `${BASE}/snapshot`,
      query: hours ? { environment, hours: String(hours) } : { environment },
      signal,
    }),

  getEndpoints: (environment: WebhookEnvironment = "production", signal?: AbortSignal) =>
    apiClient.request<OutgoingEndpoint[]>({
      method: "GET",
      path: `${BASE}/endpoints`,
      query: { environment },
      signal,
    }),

  getDeliveries: (environment: WebhookEnvironment = "production", signal?: AbortSignal) =>
    apiClient.request<Delivery[]>({
      method: "GET",
      path: `${BASE}/deliveries`,
      query: { environment },
      signal,
    }),

  getSubscriptions: (environment: WebhookEnvironment = "production", signal?: AbortSignal) =>
    apiClient.request<EventSubscription[]>({
      method: "GET",
      path: `${BASE}/subscriptions`,
      query: { environment },
      signal,
    }),

  getIncomingEvents: (environment: WebhookEnvironment = "production", signal?: AbortSignal) =>
    apiClient.request<IncomingEvent[]>({
      method: "GET",
      path: `${BASE}/incoming-events`,
      query: { environment },
      signal,
    }),

  getRecoveryRequests: (environment: WebhookEnvironment = "production", signal?: AbortSignal) =>
    apiClient.request<RecoveryRequest[]>({
      method: "GET",
      path: `${BASE}/recovery-requests`,
      query: { environment },
      signal,
    }),

  getActivity: (environment: WebhookEnvironment = "production", signal?: AbortSignal) =>
    apiClient.request<WebhookActivity[]>({
      method: "GET",
      path: `${BASE}/activity`,
      query: { environment },
      signal,
    }),

  getSettings: (environment: WebhookEnvironment = "production", signal?: AbortSignal) =>
    apiClient.request<WebhookSettings>({
      method: "GET",
      path: `${BASE}/settings`,
      query: { environment },
      signal,
    }),

  getSources: (environment: WebhookEnvironment = "production", signal?: AbortSignal) =>
    apiClient.request<IncomingSource[]>({
      method: "GET",
      path: `${BASE}/sources`,
      query: { environment },
      signal,
    }),

  createSource: (input: { name: string; providerId: string; environment: WebhookEnvironment; companyId?: string | null; supportedEventTypes?: string[] }) =>
    apiClient.request<{ source: IncomingSource; secret: string }>({
      method: "POST",
      path: `${BASE}/sources`,
      body: input,
    }),

  setSourceState: (environment: WebhookEnvironment, sourceId: string, enabled: boolean, reason: string) =>
    apiClient.request<MutationResult<IncomingSource>>({
      method: "PATCH",
      path: `${BASE}/sources/${encodeURIComponent(sourceId)}/state`,
      query: { environment },
      body: { enabled, reason },
    }),

  rotateSourceSecret: (environment: WebhookEnvironment, sourceId: string, reason: string, keepOldHours = 0) =>
    apiClient.request<MutationResult<{ source: IncomingSource; secret: string }>>({
      method: "POST",
      path: `${BASE}/sources/${encodeURIComponent(sourceId)}/rotate-secret`,
      query: { environment },
      body: { reason, keepOldHours },
    }),

  createEndpoint: (environment: WebhookEnvironment, input: CreateEndpointInput) =>
    apiClient.request<MutationResult<OutgoingEndpoint>>({
      method: "POST",
      path: `${BASE}/endpoints`,
      query: { environment },
      body: input,
    }),

  updateEndpoint: (environment: WebhookEnvironment, input: UpdateEndpointInput) =>
    apiClient.request<MutationResult<OutgoingEndpoint>>({
      method: "PATCH",
      path: `${BASE}/endpoints/${encodeURIComponent(input.endpointId)}`,
      query: { environment },
      body: Object.fromEntries(Object.entries(input).filter(([key]) => key !== "endpointId")),
    }),

  setEndpointState: (
    environment: WebhookEnvironment,
    endpointId: string,
    state: Extract<EndpointState, "enabled" | "disabled">,
    reason: string,
  ) => {
    return apiClient.request<MutationResult<OutgoingEndpoint>>({
      method: "PATCH",
      path: `${BASE}/endpoints/${encodeURIComponent(endpointId)}/state`,
      query: { environment },
      body: { enabled: state === "enabled", reason },
    });
  },

  retryDelivery: (environment: WebhookEnvironment, deliveryId: string) =>
    apiClient.request<MutationResult<unknown>>({
      method: "POST",
      path: `${BASE}/deliveries/${encodeURIComponent(deliveryId)}/retry`,
      query: { environment },
      body: {},
    }),

  saveSubscriptions: (
    environment: WebhookEnvironment,
    endpointId: string,
    eventKeys: string[],
    reason: string,
  ) =>
    apiClient.request<MutationResult<EventSubscription[]>>({
      method: "PUT",
      path: `${BASE}/endpoints/${encodeURIComponent(endpointId)}/subscriptions`,
      query: { environment },
      body: { eventKeys, reason },
    }),

  requestSecretRotationReview: (environment: WebhookEnvironment, endpointId: string, reason: string, keepOldHours = 0) =>
    apiClient.request<MutationResult<WebhookActivity>>({
      method: "POST",
      path: `${BASE}/endpoints/${encodeURIComponent(endpointId)}/rotate-secret`,
      query: { environment },
      body: { reason, keepOldHours },
    }),

  markSecurityReviewed: (environment: WebhookEnvironment, endpointId: string, reason: string) =>
    apiClient.request<MutationResult<OutgoingEndpoint>>({
      method: "POST",
      path: `${BASE}/endpoints/${encodeURIComponent(endpointId)}/security-review`,
      query: { environment },
      body: { reason },
    }),

  testPing: (
    environment: WebhookEnvironment,
    endpointId: string,
    body?: { payload?: Record<string, unknown>; simulateFailure?: boolean },
  ) =>
    apiClient.request<{
      success: boolean;
      delivery: unknown;
      attempt: unknown;
      signatureHeaders: Record<string, string>;
    }>({
      method: "POST",
      path: `${BASE}/endpoints/${encodeURIComponent(endpointId)}/test-ping`,
      query: { environment },
      body,
    }),

  createRecoveryRequest: (environment: WebhookEnvironment, input: CreateRecoveryInput) =>
    apiClient.request<MutationResult<RecoveryRequest>>({
      method: "POST",
      path: `${BASE}/recovery-requests`,
      query: { environment },
      body: input,
    }),

  updateRecoveryRequest: (
    environment: WebhookEnvironment,
    requestId: string,
    state: RecoveryState,
  ) =>
    apiClient.request<MutationResult<RecoveryRequest>>({
      method: "PATCH",
      path: `${BASE}/recovery-requests/${encodeURIComponent(requestId)}`,
      query: { environment },
      body: { state },
    }),

  updateSettings: (environment: WebhookEnvironment, settings: WebhookSettings) =>
    apiClient.request<MutationResult<WebhookSettings>>({
      method: "PUT",
      path: `${BASE}/settings`,
      query: { environment },
      body: settings,
    }),

  resetDemo: (environment: WebhookEnvironment) =>
    apiClient.request<WebhooksSnapshot>({
      method: "POST",
      path: `${BASE}/reset`,
      query: { environment },
    }),
};
