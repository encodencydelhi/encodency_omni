import { apiClient } from "@/lib/api/client";
import { companyScopeHeaders } from "@/lib/api/company-scope";
import { ApiError } from "@/types/api";

export type CampaignStatus = "DRAFT" | "ACTIVE" | "PAUSED" | "COMPLETED" | "ARCHIVED";

export interface BudgetInput {
  /** Decimal string, e.g. "12400.50" (at most 12 integer digits). */
  amount: string;
  currency: string;
}

export interface BudgetResponse {
  amount: string;
  amountMinor: string;
  currency: string;
}

export type CampaignObjective =
  | "AWARENESS"
  | "TRAFFIC"
  | "ENGAGEMENT"
  | "LEADS"
  | "SALES"
  | "APP_PROMOTION"
  | "RETENTION"
  | "REENGAGEMENT";

export type CampaignMode = "ORGANIC" | "PAID" | "UNIFIED";
export type BiddingStrategy = "LOWEST_COST" | "COST_CAP" | "BID_CAP" | "TARGET_ROAS" | "MINIMUM_ROAS";

export interface KpisPayload {
  targetReach?: number;
  targetImpressions?: number;
  targetClicks?: number;
  targetEngagements?: number;
  targetLeads?: number;
  targetConversions?: number;
  targetRevenue?: BudgetInput;
  targetRoas?: string;
}

export interface AudiencePayload {
  ageMin?: number;
  ageMax?: number;
  genders?: string[];
  locations?: string[];
  languages?: string[];
  interests?: string[];
}

export interface CampaignRecord {
  id: string;
  clientId: string;
  name: string;
  status: CampaignStatus;
  budget: BudgetResponse | null;
  startDate: string | null;
  endDate: string | null;
  objective?: CampaignObjective | null;
  campaignMode?: CampaignMode | null;
  category?: string | null;
  campaignType?: string | null;
  description?: string | null;
  internalNotes?: string | null;
  tags?: string[];
  channels?: string[];
  biddingStrategy?: BiddingStrategy | null;
  kpis?: KpisPayload | null;
  audience?: AudiencePayload | null;
  revision: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCampaignPayload {
  name: string;
  budget?: BudgetInput | null;
  startDate?: string | null;
  endDate?: string | null;
  objective?: CampaignObjective | null;
  campaignMode?: CampaignMode | null;
  category?: string | null;
  campaignType?: string | null;
  description?: string | null;
  internalNotes?: string | null;
  tags?: string[];
  channels?: string[];
  biddingStrategy?: BiddingStrategy | null;
  kpis?: KpisPayload | null;
  audience?: AudiencePayload | null;
  [key: string]: unknown;
}

export interface UpdateCampaignPayload {
  /** Optimistic concurrency (TASK-11A A2): required on every PATCH. */
  expectedRevision: number;
  name?: string;
  budget?: BudgetInput | null;
  startDate?: string | null;
  endDate?: string | null;
}

export interface ListCampaignsQuery {
  page?: number;
  limit?: number;
  search?: string;
  status?: CampaignStatus;
}

export interface ListCampaignsResult {
  items: CampaignRecord[];
  total: number;
  page: number;
  limit: number;
}

export interface RevisionConflictDetail {
  message: string;
  reason: "revision_conflict";
  currentRevision: number;
}

export function isRevisionConflict(error: unknown): error is ApiError & { currentRevision?: number } {
  if (!ApiError.isApiError(error)) return false;
  return error.status === 409;
}

function clientScopeHeaders(companyId: string, clientId: string): Record<string, string> {
  if (!clientId) {
    throw new ApiError({
      code: "NO_CLIENT_SELECTED",
      message: "Select a Client to continue.",
      status: 0,
    });
  }
  return companyScopeHeaders(companyId, { "x-client-id": clientId });
}

export const campaignsApi = {
  /**
   * GET /campaigns
   * Auth: @CompanyContextRoute({ client: 'required' }) + campaigns:read
   */
  async list(
    companyId: string,
    clientId: string,
    query?: ListCampaignsQuery,
    signal?: AbortSignal,
  ): Promise<ListCampaignsResult> {
    const q: Record<string, string | number | undefined> = {};
    if (query?.page) q.page = query.page;
    if (query?.limit) q.limit = query.limit;
    if (query?.search) q.search = query.search;
    if (query?.status) q.status = query.status;

    return apiClient.request<ListCampaignsResult>({
      method: "GET",
      path: "/campaigns",
      headers: clientScopeHeaders(companyId, clientId),
      query: q,
      signal,
    });
  },

  /**
   * GET /campaigns/:id
   * Auth: @CompanyContextRoute({ client: 'required' }) + campaigns:read
   */
  async get(
    companyId: string,
    clientId: string,
    id: string,
    signal?: AbortSignal,
  ): Promise<CampaignRecord> {
    return apiClient.request<CampaignRecord>({
      method: "GET",
      path: `/campaigns/${encodeURIComponent(id)}`,
      headers: clientScopeHeaders(companyId, clientId),
      signal,
    });
  },

  /**
   * POST /campaigns
   * Auth: @CompanyContextRoute({ client: 'required' }) + campaigns:write
   */
  async create(
    companyId: string,
    clientId: string,
    payload: CreateCampaignPayload,
    signal?: AbortSignal,
  ): Promise<CampaignRecord> {
    const fullPayload = {
      ...payload,
      name: payload.name ? payload.name.trim() : payload.name,
    };

    return apiClient.request<CampaignRecord>({
      method: "POST",
      path: "/campaigns",
      headers: clientScopeHeaders(companyId, clientId),
      body: fullPayload,
      signal,
    });
  },

  /**
   * PATCH /campaigns/:id
   * Auth: @CompanyContextRoute({ client: 'required' }) + campaigns:write
   * Requires expectedRevision for optimistic concurrency. Throws 409 revision_conflict if stale.
   */
  async update(
    companyId: string,
    clientId: string,
    id: string,
    payload: UpdateCampaignPayload,
    signal?: AbortSignal,
  ): Promise<CampaignRecord> {
    return apiClient.request<CampaignRecord>({
      method: "PATCH",
      path: `/campaigns/${encodeURIComponent(id)}`,
      headers: clientScopeHeaders(companyId, clientId),
      body: payload,
      signal,
    });
  },

  isRevisionConflict,
};
