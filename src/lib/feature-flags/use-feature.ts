"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { useTenancyContext } from "@/lib/api/tenancy-context";
import { featureFlagKeys, fetchEffectiveFeatures, resolveFeature, type FeatureKey, type FeatureView } from "./feature-flags";

export type FeatureState = FeatureView & { retry: () => void };

/**
 * Whether the active Company may use an enforced feature.
 *
 * This is a convenience for the interface, never a security control: the backend checks the same flag at the point of
 * execution and answers 403 `feature_disabled` when it is off, whatever this hook says. That is why an error here does not
 * lock the feature (the server will still refuse if it must) and why `canUse` is false only while loading and when disabled.
 */
export function useFeature(key: FeatureKey): FeatureState {
  const { companyId, isReady } = useTenancyContext();
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: featureFlagKeys.effective(companyId),
    queryFn: ({ signal }) => fetchEffectiveFeatures(companyId, signal),
    enabled: isReady && Boolean(companyId),
    staleTime: 30_000,
  });

  const retry = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: featureFlagKeys.effective(companyId) });
  }, [queryClient, companyId]);

  return { ...resolveFeature(key, { data: query.data, isError: query.isError }), retry };
}
