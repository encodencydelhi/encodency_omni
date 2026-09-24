import { apiClient } from "@/lib/api/client";
import { ApiError } from "@/types/api";

export type HarnessRouteKey =
  | "platform"
  | "company"
  | "client"
  | "client-optional"
  | "campaigns-read"
  | "campaigns-write";

export interface TenantContext {
  userId: string;
  sessionId: string;
  platformRole: "SUPER_ADMIN" | "USER" | string;
  companyId?: string;
  membershipId?: string;
  systemRole?: "OWNER" | "ADMIN" | "MANAGER" | "VIEWER" | string;
  roleId?: string | null;
  companyStatus?: "ACTIVE" | "SUSPENDED" | "ARCHIVED" | string;
  clientId?: string;
}

export interface TenantContextResponse {
  tenantContext: TenantContext;
}

export interface HarnessCheckResult {
  route: HarnessRouteKey;
  path: string;
  description: string;
  scope: string;
  requiredCapability?: string;
  success: boolean;
  status: number;
  durationMs: number;
  tenantContext?: TenantContext;
  error?: string;
}

export const HARNESS_ROUTES_META: Record<
  HarnessRouteKey,
  { path: string; description: string; scope: string; requiredCapability?: string }
> = {
  platform: {
    path: "/_manual/tenancy/platform",
    description: "Requires Super Admin platform role (@PlatformSuperAdminRoute)",
    scope: "Platform (Super Admin only)",
  },
  company: {
    path: "/_manual/tenancy/company",
    description: "Requires verified x-company-id membership in ACTIVE Company (@CompanyContextRoute)",
    scope: "Company (Active Membership)",
  },
  client: {
    path: "/_manual/tenancy/client",
    description: "Requires verified x-company-id and accessible x-client-id (@CompanyContextRoute client: required)",
    scope: "Client (Company + Client Access)",
  },
  "client-optional": {
    path: "/_manual/tenancy/client-optional",
    description: "Requires x-company-id; validates x-client-id if passed (@CompanyContextRoute client: optional)",
    scope: "Company / Client Optional",
  },
  "campaigns-read": {
    path: "/_manual/tenancy/campaigns-read",
    description: "Requires Company context + capability campaigns:read (VIEWER+)",
    scope: "Capability (campaigns:read)",
    requiredCapability: "campaigns:read",
  },
  "campaigns-write": {
    path: "/_manual/tenancy/campaigns-write",
    description: "Requires Company context + capability campaigns:write (MANAGER+)",
    scope: "Capability (campaigns:write)",
    requiredCapability: "campaigns:write",
  },
};

export const tenancyHarnessService = {
  /**
   * Directly queries one of the 6 backend manual tenancy verification harness routes.
   * `skipSessionExpiry: true` is always passed so 401/403 responses during negative
   * harness testing do not terminate the operator's active frontend session.
   */
  async testRoute(
    route: HarnessRouteKey,
    headers?: { companyId?: string; clientId?: string },
    signal?: AbortSignal,
  ): Promise<TenantContextResponse> {
    const meta = HARNESS_ROUTES_META[route];
    const reqHeaders: Record<string, string> = {};
    if (headers?.companyId) reqHeaders["x-company-id"] = headers.companyId;
    if (headers?.clientId) reqHeaders["x-client-id"] = headers.clientId;

    return apiClient.request<TenantContextResponse>({
      method: "GET",
      path: meta.path,
      headers: reqHeaders,
      signal,
      skipSessionExpiry: true,
    });
  },

  /**
   * Executes all 6 tenancy harness routes sequentially, returning structured results
   * with HTTP status, latency, resolved TenantContext or captured error.
   */
  async runAllChecks(
    headers?: { companyId?: string; clientId?: string },
    signal?: AbortSignal,
  ): Promise<HarnessCheckResult[]> {
    const routes: HarnessRouteKey[] = [
      "platform",
      "company",
      "client",
      "client-optional",
      "campaigns-read",
      "campaigns-write",
    ];

    const results: HarnessCheckResult[] = [];

    for (const route of routes) {
      const meta = HARNESS_ROUTES_META[route];
      const start = Date.now();
      try {
        const response = await this.testRoute(route, headers, signal);
        results.push({
          route,
          path: meta.path,
          description: meta.description,
          scope: meta.scope,
          requiredCapability: meta.requiredCapability,
          success: true,
          status: 200,
          durationMs: Date.now() - start,
          tenantContext: response.tenantContext,
        });
      } catch (err: unknown) {
        const status = ApiError.isApiError(err) ? err.status : 0;
        const error = ApiError.isApiError(err) ? err.message : (err as Error)?.message || "Unknown error";
        results.push({
          route,
          path: meta.path,
          description: meta.description,
          scope: meta.scope,
          requiredCapability: meta.requiredCapability,
          success: false,
          status,
          durationMs: Date.now() - start,
          error,
        });
      }
    }

    return results;
  },
};
