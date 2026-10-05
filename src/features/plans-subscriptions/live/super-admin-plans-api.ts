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
  maxClients: number;
  maxAiTokens: number;
  features: BackendPlanFeatures;
  createdAt: string;
  updatedAt: string;
}

export interface UpsertPlanPayload {
  name: string;
  monthlyPrice: number;
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
  currentPeriodEnd: string;
  createdAt: string;
  updatedAt: string;
  plan?: BackendPlan;
  company?: {
    id: string;
    name: string;
    slug?: string;
  };
}

export interface AssignSubscriptionPayload {
  companyId: string;
  planId: string;
}

export const superAdminPlansApi = {
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
  changePlan(id: string, planId: string, signal?: AbortSignal): Promise<BackendSubscription> {
    return apiClient.request<BackendSubscription>({
      method: "PUT",
      path: `/super-admin/subscriptions/${encodeURIComponent(id)}/plan`,
      body: { planId },
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
