import { apiClient } from "@/lib/api/client";
import { companyScopeHeaders } from "@/lib/api/company-scope";
import { ApiError } from "@/types/api";

export type DraftChannel = "FACEBOOK_PAGE" | "INSTAGRAM_ACCOUNT" | "LINKEDIN_ORGANIZATION";

export const SUPPORTED_DRAFT_CHANNELS: readonly DraftChannel[] = [
  "FACEBOOK_PAGE",
  "INSTAGRAM_ACCOUNT",
  "LINKEDIN_ORGANIZATION",
] as const;

export interface DraftVariantRecord {
  id: string;
  channel: DraftChannel;
  content: string | null;
  effectiveContent: string;
  updatedAt: string;
}

export interface DraftRecord {
  id: string;
  clientId: string;
  campaignId: string | null;
  title: string | null;
  content: string;
  revision: number;
  variants: DraftVariantRecord[];
  createdAt: string;
  updatedAt: string;
}

export interface DraftSummaryRecord {
  id: string;
  clientId: string;
  campaignId: string | null;
  title: string | null;
  contentPreview: string;
  channels: DraftChannel[];
  revision: number;
  updatedAt: string;
}

export interface CreateDraftPayload {
  title?: string | null;
  campaignId?: string | null;
  content: string;
  variants: Record<string, { content?: string | null }>;
  assetIds?: unknown[];
}

export interface UpdateDraftPayload {
  /** Optimistic concurrency (TASK-11A A2): required on every PATCH. */
  expectedRevision: number;
  title?: string | null;
  campaignId?: string | null;
  content?: string;
  variants?: Record<string, { content?: string | null }>;
}

export interface ListDraftsQuery {
  page?: number;
  limit?: number;
  search?: string;
  campaignId?: string;
}

export interface ListDraftsResult {
  items: DraftSummaryRecord[];
  total: number;
  page: number;
  limit: number;
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

export const draftsApi = {
  /**
   * GET /content/drafts
   * Auth: @CompanyContextRoute({ client: 'required' }) + content:read
   */
  async list(
    companyId: string,
    clientId: string,
    query?: ListDraftsQuery,
    signal?: AbortSignal,
  ): Promise<ListDraftsResult> {
    const q: Record<string, string | number | undefined> = {};
    if (query?.page) q.page = query.page;
    if (query?.limit) q.limit = query.limit;
    if (query?.search) q.search = query.search;
    if (query?.campaignId) q.campaignId = query.campaignId;

    return apiClient.request<ListDraftsResult>({
      method: "GET",
      path: "/content/drafts",
      headers: clientScopeHeaders(companyId, clientId),
      query: q,
      signal,
    });
  },

  /**
   * GET /content/drafts/:id
   * Auth: @CompanyContextRoute({ client: 'required' }) + content:read
   */
  async get(
    companyId: string,
    clientId: string,
    id: string,
    signal?: AbortSignal,
  ): Promise<DraftRecord> {
    return apiClient.request<DraftRecord>({
      method: "GET",
      path: `/content/drafts/${encodeURIComponent(id)}`,
      headers: clientScopeHeaders(companyId, clientId),
      signal,
    });
  },

  /**
   * POST /content/drafts
   * Auth: @CompanyContextRoute({ client: 'required' }) + content:write
   */
  async create(
    companyId: string,
    clientId: string,
    payload: CreateDraftPayload,
    signal?: AbortSignal,
  ): Promise<DraftRecord> {
    if (payload.assetIds && payload.assetIds.length > 0) {
      throw new ApiError({
        code: "MEDIA_NOT_SUPPORTED",
        message: "Media assets are not supported in TASK-11A",
        status: 400,
      });
    }

    return apiClient.request<DraftRecord>({
      method: "POST",
      path: "/content/drafts",
      headers: clientScopeHeaders(companyId, clientId),
      body: payload,
      signal,
    });
  },

  /**
   * PATCH /content/drafts/:id
   * Auth: @CompanyContextRoute({ client: 'required' }) + content:write
   * Requires expectedRevision for optimistic concurrency. Throws 409 revision_conflict if stale.
   */
  async update(
    companyId: string,
    clientId: string,
    id: string,
    payload: UpdateDraftPayload,
    signal?: AbortSignal,
  ): Promise<DraftRecord> {
    return apiClient.request<DraftRecord>({
      method: "PATCH",
      path: `/content/drafts/${encodeURIComponent(id)}`,
      headers: clientScopeHeaders(companyId, clientId),
      body: payload,
      signal,
    });
  },

  isRevisionConflict,
};
