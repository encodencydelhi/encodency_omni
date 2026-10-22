import { apiClient } from "@/lib/api/client";
import { companyScopeHeaders } from "@/lib/api/company-scope";
import { ApiError } from "@/types/api";

/** The flags the backend enforces. Mirrors `FEATURE_GATES` in the backend; any other flag is configuration only and never reaches the app. */
export type FeatureKey = "content.ai_generator" | "channels.linkedin_publishing" | "channels.youtube_publishing";

export type FeatureBlockReason =
  | "emergency_off"
  | "not_ready"
  | "flag_disabled"
  | "plan_restricted"
  | "subscription_inactive"
  | "rollout_restricted"
  | "dependency_blocked"
  | "integration_blocked"
  | "internal_only";

export interface FeatureDecision {
  flagKey: FeatureKey;
  label: string;
  enabled: boolean;
  reason: FeatureBlockReason | null;
  /** False when the flag record does not exist yet; the backend then allows the feature. */
  configured: boolean;
  message: string;
}

export interface EffectiveFeatures {
  environment: "development" | "staging" | "production";
  features: FeatureDecision[];
}

export const featureFlagKeys = {
  effective: (companyId: string) => ["feature-flags", "effective", companyId] as const,
};

/** GET /feature-flags/effective. Company-scoped, read-only. Informs the UI; the backend enforces on every call regardless. */
export function fetchEffectiveFeatures(companyId: string, signal?: AbortSignal): Promise<EffectiveFeatures> {
  return apiClient.request<EffectiveFeatures>({
    method: "GET",
    path: "/feature-flags/effective",
    headers: companyScopeHeaders(companyId),
    signal,
  });
}

export type FeatureStatus = "loading" | "enabled" | "disabled" | "error";

export interface FeatureView {
  status: FeatureStatus;
  /** What the user may do right now. Loading and disabled are false; an error is true because the server decides on every call. */
  canUse: boolean;
  label: string;
  reason: FeatureBlockReason | null;
  /** Plain-language explanation for a disabled feature, or for an error. Empty when enabled or loading. */
  explanation: string;
}

/** Turns the effective-features response (or its failure) into what the interface shows for one feature. */
export function resolveFeature(key: FeatureKey, response: { data?: EffectiveFeatures; isError: boolean }): FeatureView {
  const decision = response.data?.features.find((feature) => feature.flagKey === key);
  if (!decision) {
    // Answered but not listed means the backend does not gate this feature (or is older than this app): do not lock it, and do not spin forever.
    if (response.isError || response.data) {
      return { status: "error", canUse: true, label: key, reason: null, explanation: "Availability could not be checked. You can still try; the server decides." };
    }
    return { status: "loading", canUse: false, label: key, reason: null, explanation: "" };
  }
  if (decision.enabled) return { status: "enabled", canUse: true, label: decision.label, reason: null, explanation: "" };
  return {
    status: "disabled",
    canUse: false,
    label: decision.label,
    reason: decision.reason,
    explanation: [decision.message, describeBlockReason(decision.reason)].filter(Boolean).join(" "),
  };
}

const REASON_COPY: Record<FeatureBlockReason, string> = {
  emergency_off: "The platform team has switched this off for now.",
  not_ready: "This is not ready for general use yet.",
  flag_disabled: "This is not turned on for your workspace.",
  plan_restricted: "Your plan does not include this.",
  subscription_inactive: "Your subscription is not active.",
  rollout_restricted: "This has not been rolled out to your workspace yet.",
  dependency_blocked: "Something this depends on is not available yet.",
  integration_blocked: "The connected account this needs is not connected or needs reconnecting.",
  internal_only: "This is only available to the platform team right now.",
};

export function describeBlockReason(reason: FeatureBlockReason | null | undefined): string | null {
  return reason ? REASON_COPY[reason] : null;
}

/** True when the server refused a call because the feature is switched off (403 `feature_disabled`). */
export function isFeatureDisabledError(error: unknown): error is ApiError {
  return ApiError.isApiError(error) && error.status === 403 && error.reason === "feature_disabled";
}
