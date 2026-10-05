import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api/client";
import { env } from "@/config/env";
import { buildApiMonitoringSnapshot } from "./observability-provider";
import type {
  ApiEnvironment,
  ApiMonitoringConfig,
  ApiMonitoringSnapshot,
  ApiRequest,
  ApiTimeRange,
} from "./observability-types";

export interface PaginatedApiRequestsResponse {
  items: ApiRequest[];
  data: ApiRequest[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

export async function fetchLiveApiMonitoringSnapshot(
  environment: ApiEnvironment,
  range: ApiTimeRange,
  hours: number,
  serviceId: string,
): Promise<ApiMonitoringSnapshot> {
  const isLive = env.dataSource === "api";
  if (!isLive) {
    return buildApiMonitoringSnapshot(environment);
  }

  // Never silently swallow errors into fake mock snapshots.
  return await apiClient.request<ApiMonitoringSnapshot>({
    method: "GET",
    path: "/super-admin/api-monitoring/snapshot",
    query: {
      environment,
      range,
      hours,
      serviceId: serviceId === "all" ? undefined : serviceId,
    },
  });
}

export function useLiveApiMonitoringSnapshot(
  environment: ApiEnvironment,
  range: ApiTimeRange,
  hours: number,
  serviceId: string,
) {
  const [snapshot, setSnapshot] = useState<ApiMonitoringSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isApi = env.dataSource === "api";

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    if (!isApi) {
      setSnapshot(buildApiMonitoringSnapshot(environment));
      setLoading(false);
      return;
    }

    fetchLiveApiMonitoringSnapshot(environment, range, hours, serviceId)
      .then((data) => {
        if (!active) return;
        setSnapshot(data);
        setError(null);
      })
      .catch((err: any) => {
        if (!active) return;
        // Do not silently fallback to fake data! Report the real error.
        setError(err?.message || "Failed to connect to backend telemetry service");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [environment, range, hours, serviceId, isApi]);

  return {
    snapshot,
    setSnapshot,
    loading,
    error,
    isLive: isApi && !error && Boolean(snapshot),
  };
}

export async function updateLiveMonitoringConfig(
  config: ApiMonitoringConfig,
): Promise<{ success: boolean; data?: ApiMonitoringConfig; error?: string }> {
  if (env.dataSource !== "api") return { success: true, data: config };
  try {
    const data = await apiClient.request<ApiMonitoringConfig>({
      method: "PATCH",
      path: "/super-admin/api-monitoring/config",
      body: config,
    });
    return { success: true, data };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || "Failed to persist configuration to backend policy",
    };
  }
}

export async function updateLiveEndpointStatus(
  endpointId: string,
  enabled: boolean,
): Promise<{ success: boolean; error?: string }> {
  if (env.dataSource !== "api") return { success: true };
  try {
    await apiClient.request<{ endpointId: string; enabled: boolean }>({
      method: "PATCH",
      path: `/super-admin/api-monitoring/endpoints/${endpointId}/status`,
      body: { enabled },
    });
    return { success: true };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || "Failed to update endpoint status on backend",
    };
  }
}

export async function fetchLiveApiRequests(params: {
  environment?: ApiEnvironment;
  range?: ApiTimeRange;
  hours?: number;
  serviceId?: string;
  status?: string;
  search?: string;
  endpointId?: string;
  page?: number;
  limit?: number;
}): Promise<PaginatedApiRequestsResponse> {
  return await apiClient.request<PaginatedApiRequestsResponse>({
    method: "GET",
    path: "/super-admin/api-monitoring/requests",
    query: {
      environment: params.environment ?? "production",
      range: params.range ?? "24h",
      hours: params.hours ?? 24,
      serviceId: params.serviceId && params.serviceId !== "all" ? params.serviceId : undefined,
      status: params.status && params.status !== "all" ? params.status : undefined,
      search: params.search && params.search.trim() ? params.search.trim() : undefined,
      endpointId: params.endpointId && params.endpointId !== "all" ? params.endpointId : undefined,
      page: params.page ?? 1,
      limit: params.limit ?? 25,
    },
  });
}

export function useLiveApiRequests(params: {
  environment?: ApiEnvironment;
  range?: ApiTimeRange;
  hours?: number;
  serviceId?: string;
  status?: string;
  search?: string;
  endpointId?: string;
  page?: number;
  limit?: number;
}) {
  const [data, setData] = useState<PaginatedApiRequestsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    fetchLiveApiRequests(params)
      .then((res) => {
        if (!active) return;
        setData(res);
        setError(null);
      })
      .catch((err: any) => {
        if (!active) return;
        setError(err?.message || "Failed to retrieve real request records");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [
    params.environment,
    params.range,
    params.hours,
    params.serviceId,
    params.status,
    params.search,
    params.endpointId,
    params.page,
    params.limit,
  ]);

  return { data, loading, error };
}
