import { apiClient } from "@/lib/api/client";
import { companyScopeHeaders } from "@/lib/api/company-scope";
import { ApiError } from "@/types/api";

/**
 * TASK-11B scheduling & publishing contracts.
 *
 * Backend: `ScheduledPostsController` (`@Controller('content')`), every route
 * Client-scoped (`x-company-id` + `x-client-id`). Reads need `content:read`;
 * schedule and cancel need `content:publish` (OWNER/ADMIN only).
 *
 * Contract of record: encodency_omni_documents/05-api-contracts/08-content-campaigns.md
 */

export type PublishChannel =
  | "FACEBOOK_PAGE"
  | "INSTAGRAM_ACCOUNT"
  | "GOOGLE_BUSINESS_LOCATION"
  | "LINKEDIN_ORGANIZATION";

export type ConnectionStatus = "ACTIVE" | "EXPIRED" | "REVOKED" | "ERROR";

export type PublishTargetReason = "channel_not_supported_yet" | "integration_reconnect_required";

export type ScheduledPostStatus =
  | "SCHEDULED"
  | "PUBLISHING"
  | "PUBLISHED"
  | "FAILED"
  | "OUTCOME_UNKNOWN"
  | "CANCELLED";

export const SCHEDULED_POST_STATUSES: readonly ScheduledPostStatus[] = [
  "SCHEDULED",
  "PUBLISHING",
  "PUBLISHED",
  "FAILED",
  "OUTCOME_UNKNOWN",
  "CANCELLED",
] as const;

/** Returned on the 201 body of POST .../schedule — never as an HTTP error. */
export const QUEUE_RECOVERY_WARNING = "queue_delayed_recovery_pending";
export const TOKEN_EXPIRY_WARNING = "token_expires_before_publish";

export interface PublishTarget {
  resourceMappingId: string;
  resourceType: PublishChannel;
  externalResourceId: string;
  integrationId: string;
  provider: string;
  connectionStatus: ConnectionStatus;
  publishable: boolean;
  reason: PublishTargetReason | null;
}

export interface PublishTargetsResult {
  items: PublishTarget[];
}

export interface ScheduledPost {
  id: string;
  clientId: string;
  draftId: string;
  variantId: string;
  channel: PublishChannel;
  resourceMappingId: string;
  target: { resourceType: PublishChannel; externalResourceId: string };
  /** Content snapshot taken when the post was scheduled. */
  content: string;
  draftRevision: number;
  /** True when the draft moved on since scheduling — the row shows stale content. */
  draftChangedSinceScheduled: boolean;
  scheduledFor: string;
  status: ScheduledPostStatus;
  failureCode: string | null;
  lastErrorCode: string | null;
  externalPostId: string | null;
  attemptCount: number;
  publishedAt: string | null;
  cancelledAt: string | null;
  createdByUserId: string;
  cancelledByUserId: string | null;
  media?: Array<{
    position: number;
    assetId: string;
    available: boolean;
    asset: {
      id: string;
      kind: "IMAGE" | "VIDEO";
      url: string;
      mimeType: string;
      format: string;
      bytes: number;
      width: number | null;
      height: number | null;
      durationMs: number | null;
      uploadedAt: string;
    } | null;
  }>;
  createdAt: string;
  updatedAt: string;
}

export interface CreateScheduleResult extends ScheduledPost {
  warnings: string[];
}

export interface CreateSchedulePayload {
  resourceMappingId: string;
  /** ISO 8601 with an explicit offset (`Z` or `±hh:mm`); 2 min .. 180 days ahead. */
  scheduledFor: string;
  /** The draft revision the reviewer looked at; stale → 409 revision_conflict. */
  expectedDraftRevision: number;
}

export interface ListScheduledPostsQuery {
  status?: ScheduledPostStatus;
  draftId?: string;
  /** Inclusive lower bound on `scheduledFor`. */
  from?: string;
  /** Exclusive upper bound on `scheduledFor`. */
  to?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface ListScheduledPostsResult {
  items: ScheduledPost[];
  total: number;
  page: number;
  limit: number;
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

/* ── Business-error predicates (all surface as 4xx ApiErrors with a `reason`) ── */

type Reasoned = ApiError & { reason?: string };

function reasonIs(error: unknown, reason: string): error is Reasoned {
  return ApiError.isApiError(error) && error.reason === reason;
}

/** 409 `{ reason: 'revision_conflict', currentRevision }` — the draft moved on. */
export function isRevisionConflict(error: unknown): error is ApiError {
  return reasonIs(error, "revision_conflict");
}

/** 409 `{ reason: 'already_scheduled', scheduledPostId }` — duplicate schedule. */
export function isAlreadyScheduled(error: unknown): error is ApiError {
  return reasonIs(error, "already_scheduled");
}

/** 409 `{ reason: 'integration_reconnect_required' }` — OAuth must be redone first. */
export function isReconnectRequired(error: unknown): error is ApiError {
  return reasonIs(error, "integration_reconnect_required");
}

/** 409 `{ reason: 'not_cancellable', status }` — already publishing/terminal. */
export function isNotCancellable(error: unknown): error is ApiError {
  return reasonIs(error, "not_cancellable");
}

/** 400 `{ reason: 'channel_not_supported_yet' }` — e.g. Instagram has no adapter. */
export function isChannelNotSupported(error: unknown): error is ApiError {
  return reasonIs(error, "channel_not_supported_yet");
}

/** 400 `{ reason: 'channel_mismatch' }` — target resource type ≠ variant channel. */
export function isChannelMismatch(error: unknown): error is ApiError {
  return reasonIs(error, "channel_mismatch");
}

/** 400 `{ reason: 'content_too_long_for_channel' }` — 3000 LI / 10000 FB. */
export function isContentTooLong(error: unknown): error is ApiError {
  return reasonIs(error, "content_too_long_for_channel");
}

/** 400 `{ reason: 'media_not_supported_for_channel' }` — LinkedIn/Instagram media publishing is not supported yet. */
export function isMediaNotSupportedForChannel(error: unknown): error is ApiError {
  return reasonIs(error, "media_not_supported_for_channel");
}

/** 400 `{ reason: 'media_combination_not_supported' }` — invalid mix of photos/videos. */
export function isMediaCombinationNotSupported(error: unknown): error is ApiError {
  return reasonIs(error, "media_combination_not_supported");
}

/** 400 `{ reason: 'media_unavailable' }` — referenced asset is no longer available. */
export function isMediaUnavailable(error: unknown): error is ApiError {
  return reasonIs(error, "media_unavailable");
}

/** Human-readable explanation for scheduling error codes/reasons */
export function describeScheduleError(error: unknown): string {
  if (isMediaNotSupportedForChannel(error)) {
    return "Media publishing is not supported for this channel (LinkedIn/Instagram). Please detach media from the draft before scheduling.";
  }
  if (isMediaCombinationNotSupported(error)) {
    return "This media combination is not supported. Use 1-10 photos or exactly one video, never a mix.";
  }
  if (isMediaUnavailable(error)) {
    return "One or more media assets attached to this draft are no longer available.";
  }
  if (isReconnectRequired(error)) {
    return "The social media connection expired. Please reconnect the account first.";
  }
  if (isChannelNotSupported(error)) {
    return "This publishing channel is not yet supported.";
  }
  if (isContentTooLong(error)) {
    return "Post content exceeds the character limit for this channel.";
  }
  if (isAlreadyScheduled(error)) {
    return "This draft variant has already been scheduled.";
  }
  if (isRevisionConflict(error)) {
    return "The draft was updated by someone else. Please refresh and try again.";
  }
  if (ApiError.isApiError(error)) {
    return error.message;
  }
  return error instanceof Error ? error.message : "Failed to schedule post.";
}

/** Current revision from a `revision_conflict` body, when the backend supplied one. */
export function conflictingRevision(error: unknown): number | undefined {
  if (!isRevisionConflict(error)) return undefined;
  const current = error.detail<number>("currentRevision");
  return typeof current === "number" ? current : undefined;
}

/** Existing row from an `already_scheduled` body. */
export function existingScheduledPostId(error: unknown): string | undefined {
  if (!isAlreadyScheduled(error)) return undefined;
  const id = error.detail<string>("scheduledPostId");
  return typeof id === "string" ? id : undefined;
}

/** Human copy for the non-fatal `warnings` array on a 201 schedule response. */
export function describeScheduleWarning(warning: string): string {
  switch (warning) {
    case QUEUE_RECOVERY_WARNING:
      return "The delivery queue did not confirm within 3s. The post stays Scheduled and will be picked up by queue recovery.";
    case TOKEN_EXPIRY_WARNING:
      return "The connection token expires before the scheduled time and cannot be refreshed automatically. Reconnect before then.";
    default:
      return warning;
  }
}

export const schedulingApi = {
  /**
   * GET /content/drafts/:draftId/variants/:variantId/targets
   * Auth: @CompanyContextRoute({ client: 'required' }) + content:read
   * Local read — no provider call, no tokens. `publishable: false` with
   * `reason: 'integration_reconnect_required'` is the reconnect signal.
   */
  async targets(
    companyId: string,
    clientId: string,
    draftId: string,
    variantId: string,
    signal?: AbortSignal,
  ): Promise<PublishTargetsResult> {
    return apiClient.request<PublishTargetsResult>({
      method: "GET",
      path: `/content/drafts/${encodeURIComponent(draftId)}/variants/${encodeURIComponent(variantId)}/targets`,
      headers: clientScopeHeaders(companyId, clientId),
      signal,
    });
  },

  /**
   * POST /content/drafts/:draftId/variants/:variantId/schedule → 201
   * Auth: @CompanyContextRoute({ client: 'required' }) + content:publish
   * Requires expectedDraftRevision. 409: revision_conflict | already_scheduled |
   * integration_reconnect_required. Warnings ride on the 201 body.
   */
  async schedule(
    companyId: string,
    clientId: string,
    draftId: string,
    variantId: string,
    payload: CreateSchedulePayload,
    signal?: AbortSignal,
  ): Promise<CreateScheduleResult> {
    return apiClient.request<CreateScheduleResult>({
      method: "POST",
      path: `/content/drafts/${encodeURIComponent(draftId)}/variants/${encodeURIComponent(variantId)}/schedule`,
      headers: clientScopeHeaders(companyId, clientId),
      body: payload,
      signal,
    });
  },

  /**
   * GET /content/scheduled-posts
   * Auth: @CompanyContextRoute({ client: 'required' }) + content:read
   * Ordered by scheduledFor asc, id asc.
   */
  async list(
    companyId: string,
    clientId: string,
    query?: ListScheduledPostsQuery,
    signal?: AbortSignal,
  ): Promise<ListScheduledPostsResult> {
    const q: Record<string, string | number | undefined> = {};
    if (query?.status) q.status = query.status;
    if (query?.draftId) q.draftId = query.draftId;
    if (query?.from) q.from = query.from;
    if (query?.to) q.to = query.to;
    if (query?.search) q.search = query.search;
    if (query?.page) q.page = query.page;
    if (query?.limit) q.limit = query.limit;

    return apiClient.request<ListScheduledPostsResult>({
      method: "GET",
      path: "/content/scheduled-posts",
      headers: clientScopeHeaders(companyId, clientId),
      query: q,
      signal,
    });
  },

  /**
   * GET /content/scheduled-posts/:id
   * Auth: @CompanyContextRoute({ client: 'required' }) + content:read
   * The publishing-status read; poll this for a single row.
   */
  async get(
    companyId: string,
    clientId: string,
    id: string,
    signal?: AbortSignal,
  ): Promise<ScheduledPost> {
    return apiClient.request<ScheduledPost>({
      method: "GET",
      path: `/content/scheduled-posts/${encodeURIComponent(id)}`,
      headers: clientScopeHeaders(companyId, clientId),
      signal,
    });
  },

  /**
   * POST /content/scheduled-posts/:id/cancel → 200
   * Auth: @CompanyContextRoute({ client: 'required' }) + content:publish
   * Idempotent for an already-CANCELLED row; 409 not_cancellable once publishing.
   */
  async cancel(
    companyId: string,
    clientId: string,
    id: string,
    signal?: AbortSignal,
  ): Promise<ScheduledPost> {
    return apiClient.request<ScheduledPost>({
      method: "POST",
      path: `/content/scheduled-posts/${encodeURIComponent(id)}/cancel`,
      headers: clientScopeHeaders(companyId, clientId),
      signal,
    });
  },

  isRevisionConflict,
  isAlreadyScheduled,
  isReconnectRequired,
  isNotCancellable,
  isChannelNotSupported,
  isChannelMismatch,
  isContentTooLong,
  conflictingRevision,
  existingScheduledPostId,
  describeScheduleWarning,
};
