import { apiClient } from "@/lib/api/client";
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
} from "../data/types";

const BASE = "/super-admin/webhooks";

export const superAdminWebhooksApi = {
  getSnapshot: (environment: WebhookEnvironment = "production", signal?: AbortSignal) =>
    apiClient.request<WebhooksSnapshot>({
      method: "GET",
      path: `${BASE}/snapshot`,
      query: { environment },
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
    apiClient.request<any[]>({
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
    apiClient.request<any[]>({
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
      body: input,
    }),

  setEndpointState: (
    environment: WebhookEnvironment,
    endpointId: string,
    state: Extract<EndpointState, "enabled" | "disabled">,
    reason: string,
  ) =>
    apiClient.request<MutationResult<OutgoingEndpoint>>({
      method: "PATCH",
      path: `${BASE}/endpoints/${encodeURIComponent(endpointId)}/state`,
      query: { environment },
      body: { state, reason },
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

  requestSecretRotationReview: (environment: WebhookEnvironment, endpointId: string) =>
    apiClient.request<MutationResult<WebhookActivity>>({
      method: "POST",
      path: `${BASE}/endpoints/${encodeURIComponent(endpointId)}/rotate-secret`,
      query: { environment },
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
    state: Extract<RecoveryState, "cancelled" | "pending_review">,
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
