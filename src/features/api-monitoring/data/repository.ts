/**
 * EnCodency OmniPlatform - Super Admin API Monitoring Module
 * Repository Interface & Async Implementation
 */

import { env } from "@/config/env";
import * as store from "./mock/store";
import { liveApiMonitoringRepository } from "./live-adapter";
import type {
  ApiEndpoint,
  ApiErrorLog,
  ApiRequestLog,
  ProviderApiHealth,
  ApiMonitoringKpis,
  ErrorBreakdown,
  RequestTrendPoint,
  ApiMonitoringActivity,
  EndpointStatus,
  RateLimitState,
} from "./types";

export interface ApiMonitoringRepository {
  getKpis(): Promise<ApiMonitoringKpis>;
  getEndpoints(): Promise<ApiEndpoint[]>;
  getEndpointById(id: string): Promise<ApiEndpoint | null>;
  getProviderHealth(): Promise<ProviderApiHealth[]>;
  getErrorLogs(endpointId?: string): Promise<ApiErrorLog[]>;
  getRequestLogs(endpointId?: string): Promise<ApiRequestLog[]>;
  getErrorBreakdown(): Promise<ErrorBreakdown[]>;
  getRequestTrends(): Promise<RequestTrendPoint[]>;
  getActivities(): Promise<ApiMonitoringActivity[]>;
  updateEndpointStatus(endpointId: string, status: EndpointStatus): Promise<boolean>;
  updateRateLimitState(endpointId: string, state: RateLimitState): Promise<boolean>;
  resetDemo(): Promise<void>;
}

const mockApiMonitoringRepository: ApiMonitoringRepository = {
  getKpis: () => store.getKpis(),
  getEndpoints: () => store.getEndpoints(),
  getEndpointById: (id) => store.getEndpointById(id),
  getProviderHealth: () => store.getProviderHealth(),
  getErrorLogs: (endpointId) => store.getErrorLogs(endpointId),
  getRequestLogs: (endpointId) => store.getRequestLogs(endpointId),
  getErrorBreakdown: () => store.getErrorBreakdown(),
  getRequestTrends: () => store.getRequestTrends(),
  getActivities: () => store.getActivities(),
  updateEndpointStatus: (endpointId, status) => store.updateEndpointStatus(endpointId, status),
  updateRateLimitState: (endpointId, state) => store.updateRateLimitState(endpointId, state),
  resetDemo: () => store.resetDemo(),
};

export const apiMonitoringRepository: ApiMonitoringRepository =
  env.dataSource === "api" ? liveApiMonitoringRepository : mockApiMonitoringRepository;
