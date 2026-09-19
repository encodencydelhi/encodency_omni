/**
 * EnCodency OmniPlatform - Super Admin API Monitoring Module
 * Selectors and Filter Functions
 */

import type {
  ApiEndpoint,
  ApiErrorLog,
  ProviderApiHealth,
  EndpointStatus,
  RateLimitState,
  HttpMethod,
} from "./types";

export interface EndpointFilters {
  query: string;
  provider: string;
  category: string;
  status: string;
  method: string;
  rateLimitState: string;
  sortBy: "requests" | "errors" | "latency" | "name" | "recent";
}

export const DEFAULT_ENDPOINT_FILTERS: EndpointFilters = {
  query: "",
  provider: "all",
  category: "all",
  status: "all",
  method: "all",
  rateLimitState: "all",
  sortBy: "requests",
};

export function filterEndpoints(endpoints: ApiEndpoint[], filters: EndpointFilters): ApiEndpoint[] {
  let result = [...endpoints];

  if (filters.query) {
    const q = filters.query.toLowerCase();
    result = result.filter(
      (e) =>
        e.displayName.toLowerCase().includes(q) ||
        e.path.toLowerCase().includes(q) ||
        e.provider.toLowerCase().includes(q)
    );
  }

  if (filters.provider !== "all") {
    result = result.filter((e) => e.provider === filters.provider);
  }

  if (filters.category !== "all") {
    result = result.filter((e) => e.category === filters.category);
  }

  if (filters.status !== "all") {
    result = result.filter((e) => e.status === filters.status);
  }

  if (filters.method !== "all") {
    result = result.filter((e) => e.method === filters.method);
  }

  if (filters.rateLimitState !== "all") {
    result = result.filter((e) => e.rateLimitState === filters.rateLimitState);
  }

  switch (filters.sortBy) {
    case "requests":
      result.sort((a, b) => b.totalRequests24h - a.totalRequests24h);
      break;
    case "errors":
      result.sort((a, b) => b.errorCount24h - a.errorCount24h);
      break;
    case "latency":
      result.sort((a, b) => b.avgResponseMs - a.avgResponseMs);
      break;
    case "name":
      result.sort((a, b) => a.displayName.localeCompare(b.displayName));
      break;
    case "recent":
      result.sort((a, b) => new Date(b.lastCalledAt).getTime() - new Date(a.lastCalledAt).getTime());
      break;
  }

  return result;
}

export function getDistinctProviders(endpoints: ApiEndpoint[]): string[] {
  return Array.from(new Set(endpoints.map((e) => e.provider))).sort();
}

export function getDistinctCategories(endpoints: ApiEndpoint[]): string[] {
  return Array.from(new Set(endpoints.map((e) => e.category))).sort();
}

export function getDistinctStatuses(endpoints: ApiEndpoint[]): EndpointStatus[] {
  return Array.from(new Set(endpoints.map((e) => e.status))).sort();
}

export function getDistinctMethods(endpoints: ApiEndpoint[]): HttpMethod[] {
  return Array.from(new Set(endpoints.map((e) => e.method))).sort();
}

export function getDistinctRateLimitStates(endpoints: ApiEndpoint[]): RateLimitState[] {
  return Array.from(new Set(endpoints.map((e) => e.rateLimitState))).sort();
}

export function filterErrorLogs(
  logs: ApiErrorLog[],
  filters: { provider?: string; category?: string; severity?: string; query?: string }
): ApiErrorLog[] {
  let result = [...logs];

  if (filters.query) {
    const q = filters.query.toLowerCase();
    result = result.filter(
      (l) =>
        l.message.toLowerCase().includes(q) ||
        l.path.toLowerCase().includes(q) ||
        l.provider.toLowerCase().includes(q)
    );
  }

  if (filters.provider && filters.provider !== "all") {
    result = result.filter((l) => l.provider === filters.provider);
  }

  if (filters.category && filters.category !== "all") {
    result = result.filter((l) => l.category === filters.category);
  }

  if (filters.severity && filters.severity !== "all") {
    result = result.filter((l) => l.severity === filters.severity);
  }

  return result;
}

export function filterProviderHealth(
  health: ProviderApiHealth[],
  filters: { query?: string; status?: string }
): ProviderApiHealth[] {
  let result = [...health];

  if (filters.query) {
    const q = filters.query.toLowerCase();
    result = result.filter(
      (h) => h.providerName.toLowerCase().includes(q) || h.provider.toLowerCase().includes(q)
    );
  }

  if (filters.status && filters.status !== "all") {
    result = result.filter((h) => h.status === filters.status);
  }

  return result;
}
