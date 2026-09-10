import type { StatusRegistry } from "@/types/common";
import type { PlanTier } from "./plan";

export const FLAG_SCOPE = {
  global: { label: "Global", tone: "brand", description: "Applies to every tenant" },
  plan: { label: "Plan", tone: "info", description: "Enabled for selected plan tiers" },
  organization: { label: "Organization", tone: "neutral", description: "Enabled per company" },
} as const satisfies StatusRegistry<string>;

export type FlagScope = keyof typeof FLAG_SCOPE;

export const FLAG_STATE = {
  enabled: { label: "Enabled", tone: "success" },
  disabled: { label: "Disabled", tone: "neutral" },
  partial: { label: "Partial Rollout", tone: "warning" },
} as const satisfies StatusRegistry<string>;

export type FlagState = keyof typeof FLAG_STATE;

export interface FeatureFlag {
  id: string;
  key: string;
  name: string;
  description: string;
  scope: FlagScope;
  state: FlagState;
  rolloutPercent: number;
  enabledPlans: PlanTier[];
  enabledCompanyCount: number;
  category: string;
  updatedBy: string;
  updatedAt: string;
}

export interface FeatureFlagFilters {
  scope: FlagScope;
  state: FlagState;
  category: string;
}

export interface ToggleFeatureFlagInput {
  flagId: string;
  state: FlagState;
}
