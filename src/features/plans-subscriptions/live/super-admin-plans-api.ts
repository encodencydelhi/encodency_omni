import { apiClient } from "@/lib/api/client";

export interface BackendPlanFeatures {
  maxClients: number;
  maxAiTokens: number;
  automationEnabled: boolean;
  [key: string]: unknown;
}

export interface BackendPlan {
  id: string;
  name: string;
  isActive: boolean;
  monthlyPrice: number;
  /** The price of one year in paise, or null when annual billing is not offered. */
  annualPrice?: number | null;
  maxClients: number;
  maxAiTokens: number;
  features: BackendPlanFeatures;
  createdAt: string;
  updatedAt: string;
}

export interface UpsertPlanPayload {
  name: string;
  monthlyPrice: number;
  /** Omit (or null) when annual billing is not offered. */
  annualPrice?: number | null;
  features: {
    maxClients: number;
    maxAiTokens: number;
    automationEnabled: boolean;
  };
}

export type BackendSubStatus = "ACTIVE" | "PAST_DUE" | "SUSPENDED" | "CANCELED" | "INCOMPLETE";

export interface BackendSubscription {
  id: string;
  companyId: string;
  planId: string;
  status: BackendSubStatus;
  /** What one paid period is. */
  billingCycle?: "MONTHLY" | "ANNUAL";
  currentPeriodEnd: string;
  createdAt: string;
  updatedAt: string;
  plan?: BackendPlan;
  company?: {
    id: string;
    name: string;
    status?: string;
  };
  /** Current usage (clients, and AI tokens in the current period). */
  usage?: { currentClients: number; currentAiTokens: number };
  /** The company's first owner (detail only). */
  owner?: { name: string | null; email: string } | null;
  /** The invoice waiting for payment, if any (detail only). */
  openInvoiceId?: string | null;
}

export interface AssignSubscriptionPayload {
  companyId: string;
  planId: string;
}

/** The platform subscription policy as the backend stores it (plan chosen by its key). */
export interface BackendSubscriptionPolicy {
  policy: {
    trial: { defaultTrialDays: number; extensionLimitDays: number; reminderDays: number[]; defaultTrialPlan: string; allowWithoutPaymentMethod: boolean };
    renewal: { defaultBillingCycle: "monthly" | "annual"; reminderDays: number[]; gracePeriodDays: number; failedPaymentHandling: string };
    cancellation: { defaultTiming: "end_of_term" | "immediate"; reactivationWindowDays: number };
    overLimit: Record<string, string>;
  };
  /** False until a Super Admin first saves one: the values are then the platform defaults. */
  saved: boolean;
  updatedAt: string | null;
}

export const superAdminPlansApi = {
  /** GET /api/v1/super-admin/subscription-policy */
  getPolicy(signal?: AbortSignal): Promise<BackendSubscriptionPolicy> {
    return apiClient.request<BackendSubscriptionPolicy>({ method: "GET", path: "/super-admin/subscription-policy", signal });
  },

  /** PUT /api/v1/super-admin/subscription-policy */
  savePolicy(policy: BackendSubscriptionPolicy["policy"], signal?: AbortSignal): Promise<BackendSubscriptionPolicy> {
    return apiClient.request<BackendSubscriptionPolicy>({ method: "PUT", path: "/super-admin/subscription-policy", body: policy, signal });
  },

  /** GET /api/v1/super-admin/plans */
  listPlans(signal?: AbortSignal): Promise<BackendPlan[]> {
    return apiClient.request<BackendPlan[]>({
      method: "GET",
      path: "/super-admin/plans",
      signal,
    });
  },

  /** POST /api/v1/super-admin/plans */
  upsertPlan(payload: UpsertPlanPayload, signal?: AbortSignal): Promise<BackendPlan> {
    return apiClient.request<BackendPlan>({
      method: "POST",
      path: "/super-admin/plans",
      body: payload,
      signal,
    });
  },

  /** POST /api/v1/super-admin/plans/:id/activate */
  activatePlan(id: string, signal?: AbortSignal): Promise<BackendPlan> {
    return apiClient.request<BackendPlan>({
      method: "POST",
      path: `/super-admin/plans/${encodeURIComponent(id)}/activate`,
      signal,
    });
  },

  /** POST /api/v1/super-admin/plans/:id/deactivate */
  deactivatePlan(id: string, signal?: AbortSignal): Promise<BackendPlan> {
    return apiClient.request<BackendPlan>({
      method: "POST",
      path: `/super-admin/plans/${encodeURIComponent(id)}/deactivate`,
      signal,
    });
  },

  /** GET /api/v1/super-admin/subscriptions */
  listSubscriptions(signal?: AbortSignal): Promise<BackendSubscription[]> {
    return apiClient.request<BackendSubscription[]>({
      method: "GET",
      path: "/super-admin/subscriptions",
      signal,
    });
  },

  /** GET /api/v1/super-admin/subscriptions/:id */
  getSubscription(id: string, signal?: AbortSignal): Promise<BackendSubscription> {
    return apiClient.request<BackendSubscription>({
      method: "GET",
      path: `/super-admin/subscriptions/${encodeURIComponent(id)}`,
      signal,
    });
  },

  /** POST /api/v1/super-admin/subscriptions/assign */
  assignSubscription(payload: AssignSubscriptionPayload, signal?: AbortSignal): Promise<BackendSubscription> {
    return apiClient.request<BackendSubscription>({
      method: "POST",
      path: "/super-admin/subscriptions/assign",
      body: payload,
      signal,
    });
  },

  /** PUT /api/v1/super-admin/subscriptions/:id/plan */
  changePlan(id: string, planId: string, billingCycle?: "MONTHLY" | "ANNUAL", signal?: AbortSignal): Promise<BackendSubscription> {
    return apiClient.request<BackendSubscription>({
      method: "PUT",
      path: `/super-admin/subscriptions/${encodeURIComponent(id)}/plan`,
      body: billingCycle ? { planId, billingCycle } : { planId },
      signal,
    });
  },

  /** PUT /api/v1/super-admin/subscriptions/:id/suspend */
  suspendSubscription(id: string, signal?: AbortSignal): Promise<BackendSubscription> {
    return apiClient.request<BackendSubscription>({
      method: "PUT",
      path: `/super-admin/subscriptions/${encodeURIComponent(id)}/suspend`,
      signal,
    });
  },

  /** PUT /api/v1/super-admin/subscriptions/:id/reactivate */
  reactivateSubscription(id: string, signal?: AbortSignal): Promise<BackendSubscription> {
    return apiClient.request<BackendSubscription>({
      method: "PUT",
      path: `/super-admin/subscriptions/${encodeURIComponent(id)}/reactivate`,
      signal,
    });
  },

  /** PUT /api/v1/super-admin/subscriptions/:id/cancel */
  cancelSubscription(id: string, signal?: AbortSignal): Promise<BackendSubscription> {
    return apiClient.request<BackendSubscription>({
      method: "PUT",
      path: `/super-admin/subscriptions/${encodeURIComponent(id)}/cancel`,
      signal,
    });
  },
};
