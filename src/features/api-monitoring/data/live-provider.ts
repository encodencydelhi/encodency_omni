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

  try {
    const data = await apiClient.request<ApiMonitoringSnapshot>({
      method: "GET",
      path: "/super-admin/api-monitoring/snapshot",
      query: {
        environment,
        range,
        hours,
        serviceId: serviceId === "all" ? undefined : serviceId,
      },
    });
    return data;
  } catch (error) {
    console.warn("Failed to fetch live API monitoring snapshot, falling back to local dataset:", error);
    return buildApiMonitoringSnapshot(environment);
  }
}

export function useLiveApiMonitoringSnapshot(
  environment: ApiEnvironment,
  range: ApiTimeRange,
  hours: number,
  serviceId: string,
) {
  const [snapshot, setSnapshot] = useState<ApiMonitoringSnapshot>(() =>
    buildApiMonitoringSnapshot(environment),
  );
  const [loading, setLoading] = useState(true);
  const [isLive, setIsLive] = useState(env.dataSource === "api");

  useEffect(() => {
    let active = true;
    setLoading(true);

    fetchLiveApiMonitoringSnapshot(environment, range, hours, serviceId)
      .then((data) => {
        if (!active) return;
        setSnapshot(data);
        setIsLive(env.dataSource === "api");
      })
      .catch(() => {
        if (!active) return;
        setSnapshot(buildApiMonitoringSnapshot(environment));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [environment, range, hours, serviceId]);

  return { snapshot, setSnapshot, loading, isLive };
}

export async function updateLiveMonitoringConfig(config: ApiMonitoringConfig): Promise<ApiMonitoringConfig> {
  if (env.dataSource !== "api") return config;
  try {
    return await apiClient.request<ApiMonitoringConfig>({
      method: "PATCH",
      path: "/super-admin/api-monitoring/config",
      body: config,
    });
  } catch {
    return config;
  }
}

export async function updateLiveEndpointStatus(endpointId: string, enabled: boolean): Promise<boolean> {
  if (env.dataSource !== "api") return true;
  try {
    await apiClient.request<{ endpointId: string; enabled: boolean }>({
      method: "PATCH",
      path: `/super-admin/api-monitoring/endpoints/${endpointId}/status`,
      body: { enabled },
    });
    return true;
  } catch {
    return false;
  }
}

export interface PaginatedApiRequestsResponse {
  items: ApiRequest[];
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
}): Promise<PaginatedApiRequestsResponse | null> {
  if (env.dataSource !== "api") return null;

  try {
    const data = await apiClient.request<PaginatedApiRequestsResponse>({
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
    return data;
  } catch (error) {
    console.warn("Failed to fetch live API requests from /super-admin/api-monitoring/requests:", error);
    return null;
  }
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

  useEffect(() => {
    let active = true;
    setLoading(true);

    fetchLiveApiRequests(params)
      .then((res) => {
        if (!active) return;
        setData(res);
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

  return { data, loading };
}

