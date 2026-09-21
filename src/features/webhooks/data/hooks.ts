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
};

export function useWebhooksSnapshot(environment: WebhookEnvironment) {
  return useQuery({
    queryKey: WEBHOOK_QUERY_KEYS.snapshot(environment),
    queryFn: () => webhooksRepository.getSnapshot(environment),
    staleTime: Number.POSITIVE_INFINITY,
  });
}

/** Runs a repository mutation, refreshes the snapshot, and rejects with the repository's message on failure. */
export function useWebhookMutation<TInput, TOutput>(
  _environment: WebhookEnvironment,
  run: (input: TInput) => Promise<MutationResult<TOutput>>,
) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (input: TInput) => {
      const result = await run(input);
      if (!result.ok) throw new Error(result.error ?? "The change could not be saved.");
      return result.data as TOutput;
    },
    onSuccess: () => client.invalidateQueries({ queryKey: WEBHOOK_QUERY_KEYS.all }),
  });
}
