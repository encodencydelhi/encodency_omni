/**
 * EnCodency OmniPlatform - Super Admin Webhooks Module
 * React Query hooks. Mutations invalidate the snapshot so every route sees shared demo configuration.
 */

"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { webhooksRepository } from "./repository";
import type { MutationResult, WebhookEnvironment } from "./types";

export const WEBHOOK_QUERY_KEYS = {
  all: ["webhooks"] as const,
  snapshot: (environment: WebhookEnvironment) => ["webhooks", "snapshot", environment] as const,
  endpoints: (environment: WebhookEnvironment) => ["webhooks", "endpoints", environment] as const,
  deliveries: (environment: WebhookEnvironment) => ["webhooks", "deliveries", environment] as const,
  subscriptions: (environment: WebhookEnvironment) => ["webhooks", "subscriptions", environment] as const,
  incomingEvents: (environment: WebhookEnvironment) => ["webhooks", "incomingEvents", environment] as const,
  recoveryRequests: (environment: WebhookEnvironment) => ["webhooks", "recoveryRequests", environment] as const,
  activity: (environment: WebhookEnvironment) => ["webhooks", "activity", environment] as const,
  settings: (environment: WebhookEnvironment) => ["webhooks", "settings", environment] as const,
};

export function useWebhooksSnapshot(environment: WebhookEnvironment) {
  return useQuery({
    queryKey: WEBHOOK_QUERY_KEYS.snapshot(environment),
    queryFn: () => webhooksRepository.getSnapshot(environment),
    staleTime: 30_000,
  });
}

export function useWebhooksEndpoints(environment: WebhookEnvironment) {
  return useQuery({
    queryKey: WEBHOOK_QUERY_KEYS.endpoints(environment),
    queryFn: () => webhooksRepository.getEndpoints(environment),
  });
}

export function useWebhooksDeliveries(environment: WebhookEnvironment) {
  return useQuery({
    queryKey: WEBHOOK_QUERY_KEYS.deliveries(environment),
    queryFn: () => webhooksRepository.getDeliveries(environment),
  });
}

export function useWebhooksSubscriptions(environment: WebhookEnvironment) {
  return useQuery({
    queryKey: WEBHOOK_QUERY_KEYS.subscriptions(environment),
    queryFn: () => webhooksRepository.getSubscriptions(environment),
  });
}

export function useWebhooksIncomingEvents(environment: WebhookEnvironment) {
  return useQuery({
    queryKey: WEBHOOK_QUERY_KEYS.incomingEvents(environment),
    queryFn: () => webhooksRepository.getIncomingEvents(environment),
  });
}

export function useWebhooksRecoveryRequests(environment: WebhookEnvironment) {
  return useQuery({
    queryKey: WEBHOOK_QUERY_KEYS.recoveryRequests(environment),
    queryFn: () => webhooksRepository.getRecoveryRequests(environment),
  });
}

export function useWebhooksActivity(environment: WebhookEnvironment) {
  return useQuery({
    queryKey: WEBHOOK_QUERY_KEYS.activity(environment),
    queryFn: () => webhooksRepository.getActivity(environment),
  });
}

export function useWebhooksSettings(environment: WebhookEnvironment) {
  return useQuery({
    queryKey: WEBHOOK_QUERY_KEYS.settings(environment),
    queryFn: () => webhooksRepository.getSettings(environment),
  });
}

/** Runs a repository mutation, refreshes the snapshot and related queries, and rejects with the repository's message on failure. */
export function useWebhookMutation<TInput, TOutput>(
  _environment: WebhookEnvironment,
  run: (input: TInput) => Promise<MutationResult<TOutput> | TOutput>,
) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (input: TInput) => {
      const result = await run(input);
      if (result && typeof result === "object" && "ok" in result) {
        const mutationResult = result as MutationResult<TOutput>;
        if (!mutationResult.ok) throw new Error(mutationResult.error ?? "The change could not be saved.");
        return mutationResult.data as TOutput;
      }
      return result as TOutput;
    },
    onSuccess: () => client.invalidateQueries({ queryKey: WEBHOOK_QUERY_KEYS.all }),
  });
}
