import { apiClient } from "@/lib/api/client";
import { companyScopeHeaders } from "@/lib/api/company-scope";
import { getStoredClientId, getStoredCompanyId } from "@/lib/api/tenancy-storage";
import { ApiError } from "@/types/api";
import type {
  AnalyticsAudienceBy,
  AnalyticsDeviceBy,
  AnalyticsGranularity,
  AnalyticsRevenueGranularity,
  AnalyticsVideoSort,
  YouTubeAnalyticsAudienceResponse,
  YouTubeAnalyticsDevicesResponse,
  YouTubeAnalyticsGeographyResponse,
  YouTubeAnalyticsOverviewResponse,
  YouTubeAnalyticsPlaybackLocationsResponse,
  YouTubeAnalyticsRevenueResponse,
  YouTubeAnalyticsTimeseriesResponse,
  YouTubeAnalyticsTopVideosResponse,
  YouTubeAnalyticsTrafficSourcesResponse,
  YouTubeAnalyticsVideoResponse,
  YouTubeChannelMappingDto,
  YouTubeChannelResponse,
  YouTubeClientOverviewDto,
  YouTubeDiscoveredChannelDto,
  YouTubeCommentDeleteResponse,
  YouTubeCommentModerationResponse,
  YouTubeCommentOrder,
  YouTubeCommentRepliesResponse,
  YouTubeCommentResponse,
  YouTubeCommentThreadFilter,
  YouTubeCommentThreadsResponse,
  YouTubeConnectionResponse,
  YouTubeConsentCapability,
  YouTubeLiveBroadcastResponse,
  YouTubeLiveBroadcastsResponse,
  YouTubeLiveChatMessageResponse,
  YouTubeLiveChatResponse,
  YouTubeLiveCreateInput,
  YouTubeLiveFilter,
  YouTubeLiveStreamCreateInput,
  YouTubeLiveStreamCredentialsResponse,
  YouTubeLiveStreamResponse,
  YouTubeLiveStreamsResponse,
  YouTubeLiveTransitionTarget,
  YouTubeLiveUpdateInput,
  YouTubeMonetizationCapabilitiesResponse,
  YouTubeOAuthInitResponse,
  YouTubePlaylistCreateInput,
  YouTubePlaylistDeleteResponse,
  YouTubePlaylistItemDeleteResponse,
  YouTubePlaylistItemResponse,
  YouTubePlaylistItemsResponse,
  YouTubePlaylistListResponse,
  YouTubePlaylistResponse,
  YouTubePlaylistUpdateInput,
  YouTubePublishListResponse,
  YouTubePublishResponse,
  YouTubePublishStatus,
  YouTubePublishTarget,
  YouTubeReportingJobsResponse,
  YouTubeReportTypesResponse,
  YouTubeThumbnailResponse,
  YouTubeUploadInput,
  YouTubeUploadListResponse,
  YouTubeUploadResponse,
  YouTubeVideoDeleteResponse,
  YouTubeVideoListResponse,
  YouTubeVideoResponse,
  YouTubeVideoUpdateInput,
} from "./youtube-dto";

/**
 * The only module that talks to `/api/v1/integrations/youtube/**`. Components never call `fetch`/`apiClient` for YouTube.
 * Every route below exists in the backend (docs/07-integrations/05-youtube-backend-final.md); nothing is invented.
 */

const BASE = "/integrations/youtube";

export interface YouTubeScope {
  companyId: string;
  clientId: string;
}

/** The Company + Client the request is scoped to. No fallback: with none selected the request fails locally. */
export function resolveYouTubeScope(): YouTubeScope {
  const companyId = getStoredCompanyId();
  const clientId = getStoredClientId();
  if (!companyId) throw new ApiError({ code: "NO_COMPANY_SELECTED", message: "Select a Company to continue.", status: 0 });
  if (!clientId) throw new ApiError({ code: "NO_CLIENT_SELECTED", message: "Select a Client to continue.", status: 0 });
  return { companyId, clientId };
}

function headers(scope: YouTubeScope, extra: Record<string, string> = {}): Record<string, string> {
  if (!scope.clientId) throw new ApiError({ code: "NO_CLIENT_SELECTED", message: "Select a Client to continue.", status: 0 });
  return companyScopeHeaders(scope.companyId, { "x-client-id": scope.clientId, ...extra });
}

/** Provider page tokens are opaque: pass them back unchanged, but never send the literal strings a bug could produce. */
export function cleanPageToken(token: string | null | undefined): string | undefined {
  if (token === null || token === undefined) return undefined;
  if (token === "" || token === "undefined" || token === "null" || token === "NaN") return undefined;
  return token;
}

const seg = encodeURIComponent;

async function get<T>(scope: YouTubeScope, path: string, query?: Record<string, string | number | boolean | undefined | null>, signal?: AbortSignal): Promise<T> {
  return apiClient.request<T>({ method: "GET", path: `${BASE}${path}`, headers: headers(scope), query, signal });
}

async function send<T>(scope: YouTubeScope, method: "POST" | "PATCH" | "DELETE", path: string, body?: unknown, extra: Record<string, string> = {}, signal?: AbortSignal): Promise<T> {
  return apiClient.request<T>({ method, path: `${BASE}${path}`, headers: headers(scope, extra), body, signal });
}

/** A fresh key for ONE logical submission. The caller keeps it until that submission succeeds or its input changes. */
export function newIdempotencyKey(): string {
  const c = (globalThis as { crypto?: { randomUUID?: () => string; getRandomValues?: (a: Uint8Array) => Uint8Array } }).crypto;
  if (c?.randomUUID) return c.randomUUID();
  // Non-secure contexts have no randomUUID but still have a CSPRNG.
  if (c?.getRandomValues) return `yt-${Array.from(c.getRandomValues(new Uint8Array(16)), (b) => b.toString(16).padStart(2, "0")).join("")}`;
  throw new Error("A secure random source is required to submit this request.");
}

export interface DateRange {
  /** YYYY-MM-DD */
  startDate: string;
  endDate: string;
}

export const youtubeApi = {
  /* ---- connection / channel / consent ---- */

  connection: (scope: YouTubeScope, signal?: AbortSignal) => get<YouTubeConnectionResponse>(scope, "/connection", undefined, signal),
  channel: (scope: YouTubeScope, signal?: AbortSignal) => get<YouTubeChannelResponse>(scope, "/channel", undefined, signal),
  /** `integrations:write`. Spends Google quota, so it is only ever called from an explicit click. */
  sync: (scope: YouTubeScope) => send<YouTubeChannelResponse>(scope, "POST", "/sync"),

  /**
   * Incremental consent: a NAMED capability only (never a raw scope string). Returns the Google authorization URL.
   * Company-scoped route (no client header needed); the Client header is still sent so the request matches the page.
   */
  initConsent: (scope: YouTubeScope, capability?: YouTubeConsentCapability, integrationId?: string | null) =>
    apiClient.request<YouTubeOAuthInitResponse>({
      method: "POST",
      path: "/integrations/oauth/init",
      headers: companyScopeHeaders(scope.companyId),
      body: { provider: "YOUTUBE", ...(capability ? { capability } : {}), ...(integrationId ? { integrationId } : {}) },
    }),

  /**
   * The Company's YouTube connection id. `/integrations/youtube/connection` only reports it once a channel is
   * mapped, so linking the first channel has to read it from the Client overview.
   */
  clientOverview: (scope: YouTubeScope, signal?: AbortSignal) =>
    apiClient.request<YouTubeClientOverviewDto>({
      method: "GET",
      path: "/integrations/overview",
      headers: headers(scope),
      signal,
    }),

  /** `integrations:read`. Channels the Company connection can reach. Spends Google quota, so it is click-driven. */
  discoverChannels: (scope: YouTubeScope, integrationId: string, signal?: AbortSignal) =>
    apiClient.request<YouTubeDiscoveredChannelDto[]>({
      method: "GET",
      path: `/integrations/${seg(integrationId)}/resources`,
      headers: companyScopeHeaders(scope.companyId),
      signal,
    }),

  /** `integrations:write`. Links one channel to this Client. 409 when the channel is already mapped. */
  linkChannel: (scope: YouTubeScope, integrationId: string, channelId: string) =>
    apiClient.request<YouTubeChannelMappingDto>({
      method: "POST",
      path: `/integrations/${seg(integrationId)}/map`,
      headers: companyScopeHeaders(scope.companyId),
      body: { clientId: scope.clientId, externalResourceId: channelId, resourceType: "YOUTUBE_CHANNEL" },
    }),

  /** Company-wide: removes the Company's YouTube login(s). Destructive; always behind a typed confirmation. */
  disconnect: (scope: YouTubeScope) =>
    apiClient.request<{ disconnected: number }>({
      method: "DELETE",
      path: "/integrations/YOUTUBE",
      headers: companyScopeHeaders(scope.companyId),
    }),

  /* ---- videos ---- */

  videos: (scope: YouTubeScope, params: { pageToken?: string | null; pageSize?: number } = {}, signal?: AbortSignal) =>
    get<YouTubeVideoListResponse>(scope, "/videos", { pageToken: cleanPageToken(params.pageToken), pageSize: params.pageSize }, signal),
  video: (scope: YouTubeScope, videoId: string, signal?: AbortSignal) => get<YouTubeVideoResponse>(scope, `/videos/${seg(videoId)}`, undefined, signal),
  updateVideo: (scope: YouTubeScope, videoId: string, input: YouTubeVideoUpdateInput) => send<YouTubeVideoResponse>(scope, "PATCH", `/videos/${seg(videoId)}`, input),
  deleteVideo: (scope: YouTubeScope, videoId: string) => send<YouTubeVideoDeleteResponse>(scope, "DELETE", `/videos/${seg(videoId)}`),

  /* ---- uploads / thumbnail ---- */

  createUpload: (scope: YouTubeScope, input: YouTubeUploadInput, idempotencyKey: string) =>
    send<YouTubeUploadResponse>(scope, "POST", "/uploads", input, { "Idempotency-Key": idempotencyKey }),
  uploads: (scope: YouTubeScope, signal?: AbortSignal) => get<YouTubeUploadListResponse>(scope, "/uploads", undefined, signal),
  upload: (scope: YouTubeScope, uploadId: string, signal?: AbortSignal) => get<YouTubeUploadResponse>(scope, `/uploads/${seg(uploadId)}`, undefined, signal),
  /** `assetId` is an IMAGE asset of the Client's media library (PNG/JPEG, at most 2 MB). */
  setThumbnail: (scope: YouTubeScope, videoId: string, assetId: string) => send<YouTubeThumbnailResponse>(scope, "POST", `/videos/${seg(videoId)}/thumbnail`, { assetId }),

  /* ---- publish / schedule ---- */

  publish: (scope: YouTubeScope, videoId: string, targetPrivacyStatus: YouTubePublishTarget, idempotencyKey: string) =>
    send<YouTubePublishResponse>(scope, "POST", `/videos/${seg(videoId)}/publish`, { targetPrivacyStatus }, { "Idempotency-Key": idempotencyKey }),
  /** `scheduledAt` is ISO 8601 WITH an explicit UTC offset. */
  schedule: (scope: YouTubeScope, videoId: string, targetPrivacyStatus: YouTubePublishTarget, scheduledAt: string, idempotencyKey: string) =>
    send<YouTubePublishResponse>(scope, "POST", `/videos/${seg(videoId)}/schedule`, { targetPrivacyStatus, scheduledAt }, { "Idempotency-Key": idempotencyKey }),
  schedules: (scope: YouTubeScope, status?: YouTubePublishStatus, signal?: AbortSignal) => get<YouTubePublishListResponse>(scope, "/schedules", { status }, signal),
  schedulePublish: (scope: YouTubeScope, id: string, signal?: AbortSignal) => get<YouTubePublishResponse>(scope, `/schedules/${seg(id)}`, undefined, signal),
  reschedule: (scope: YouTubeScope, id: string, scheduledAt: string) => send<YouTubePublishResponse>(scope, "PATCH", `/schedules/${seg(id)}`, { scheduledAt }),
  cancelSchedule: (scope: YouTubeScope, id: string) => send<YouTubePublishResponse>(scope, "DELETE", `/schedules/${seg(id)}`),

  /* ---- playlists ---- */

  playlists: (scope: YouTubeScope, params: { pageToken?: string | null; pageSize?: number } = {}, signal?: AbortSignal) =>
    get<YouTubePlaylistListResponse>(scope, "/playlists", { pageToken: cleanPageToken(params.pageToken), pageSize: params.pageSize }, signal),
  playlist: (scope: YouTubeScope, playlistId: string, signal?: AbortSignal) => get<YouTubePlaylistResponse>(scope, `/playlists/${seg(playlistId)}`, undefined, signal),
  playlistItems: (scope: YouTubeScope, playlistId: string, params: { pageToken?: string | null; pageSize?: number } = {}, signal?: AbortSignal) =>
    get<YouTubePlaylistItemsResponse>(scope, `/playlists/${seg(playlistId)}/items`, { pageToken: cleanPageToken(params.pageToken), pageSize: params.pageSize }, signal),
  createPlaylist: (scope: YouTubeScope, input: YouTubePlaylistCreateInput) => send<YouTubePlaylistResponse>(scope, "POST", "/playlists", input),
  updatePlaylist: (scope: YouTubeScope, playlistId: string, input: YouTubePlaylistUpdateInput) => send<YouTubePlaylistResponse>(scope, "PATCH", `/playlists/${seg(playlistId)}`, input),
  deletePlaylist: (scope: YouTubeScope, playlistId: string) => send<YouTubePlaylistDeleteResponse>(scope, "DELETE", `/playlists/${seg(playlistId)}`),
  addPlaylistItem: (scope: YouTubeScope, playlistId: string, videoId: string, position?: number) =>
    send<YouTubePlaylistItemResponse>(scope, "POST", `/playlists/${seg(playlistId)}/items`, { videoId, ...(position === undefined ? {} : { position }) }),
  removePlaylistItem: (scope: YouTubeScope, playlistId: string, playlistItemId: string) =>
    send<YouTubePlaylistItemDeleteResponse>(scope, "DELETE", `/playlists/${seg(playlistId)}/items/${seg(playlistItemId)}`),
  movePlaylistItem: (scope: YouTubeScope, playlistId: string, playlistItemId: string, position: number) =>
    send<YouTubePlaylistItemResponse>(scope, "PATCH", `/playlists/${seg(playlistId)}/items/${seg(playlistItemId)}`, { position }),

  /* ---- comments (per video; there is no channel-wide inbox) ---- */

  comments: (
    scope: YouTubeScope,
    videoId: string,
    params: { pageToken?: string | null; pageSize?: number; order?: YouTubeCommentOrder; filter?: YouTubeCommentThreadFilter } = {},
    signal?: AbortSignal,
  ) =>
    get<YouTubeCommentThreadsResponse>(
      scope,
      `/videos/${seg(videoId)}/comments`,
      { pageToken: cleanPageToken(params.pageToken), pageSize: params.pageSize, order: params.order, filter: params.filter },
      signal,
    ),
  replies: (scope: YouTubeScope, commentId: string, params: { pageToken?: string | null; pageSize?: number } = {}, signal?: AbortSignal) =>
    get<YouTubeCommentRepliesResponse>(scope, `/comments/${seg(commentId)}/replies`, { pageToken: cleanPageToken(params.pageToken), pageSize: params.pageSize }, signal),
  replyToComment: (scope: YouTubeScope, commentId: string, text: string) => send<YouTubeCommentResponse>(scope, "POST", `/comments/${seg(commentId)}/replies`, { text }),
  updateComment: (scope: YouTubeScope, commentId: string, text: string) => send<YouTubeCommentResponse>(scope, "PATCH", `/comments/${seg(commentId)}`, { text }),
  deleteComment: (scope: YouTubeScope, commentId: string) => send<YouTubeCommentDeleteResponse>(scope, "DELETE", `/comments/${seg(commentId)}`),
  moderateComment: (scope: YouTubeScope, commentId: string, status: "published" | "heldForReview") =>
    send<YouTubeCommentModerationResponse>(scope, "POST", `/comments/${seg(commentId)}/moderation`, { status }),
  /** PERMANENT (YouTube cannot re-publish a rejected comment). */
  rejectComment: (scope: YouTubeScope, commentId: string) => send<YouTubeCommentModerationResponse>(scope, "POST", `/comments/${seg(commentId)}/reject`),

  /* ---- analytics (dates required, YYYY-MM-DD, max 366 days; month series up to 1096) ---- */

  analyticsOverview: (scope: YouTubeScope, range: DateRange, signal?: AbortSignal) => get<YouTubeAnalyticsOverviewResponse>(scope, "/analytics/overview", { ...range }, signal),
  analyticsTimeseries: (scope: YouTubeScope, range: DateRange, params: { granularity?: AnalyticsGranularity; metrics?: string[] } = {}, signal?: AbortSignal) =>
    get<YouTubeAnalyticsTimeseriesResponse>(scope, "/analytics/timeseries", { ...range, granularity: params.granularity, metrics: params.metrics?.join(",") }, signal),
  analyticsTopVideos: (scope: YouTubeScope, range: DateRange, params: { sort?: AnalyticsVideoSort; page?: number; pageSize?: number } = {}, signal?: AbortSignal) =>
    get<YouTubeAnalyticsTopVideosResponse>(scope, "/analytics/videos", { ...range, ...params }, signal),
  analyticsVideo: (scope: YouTubeScope, videoId: string, range: DateRange, granularity?: "total" | "day", signal?: AbortSignal) =>
    get<YouTubeAnalyticsVideoResponse>(scope, `/videos/${seg(videoId)}/analytics`, { ...range, granularity }, signal),
  analyticsTrafficSources: (scope: YouTubeScope, range: DateRange, signal?: AbortSignal) => get<YouTubeAnalyticsTrafficSourcesResponse>(scope, "/analytics/traffic-sources", { ...range }, signal),
  analyticsPlaybackLocations: (scope: YouTubeScope, range: DateRange, signal?: AbortSignal) => get<YouTubeAnalyticsPlaybackLocationsResponse>(scope, "/analytics/playback-locations", { ...range }, signal),
  analyticsGeography: (scope: YouTubeScope, range: DateRange, params: { page?: number; pageSize?: number } = {}, signal?: AbortSignal) =>
    get<YouTubeAnalyticsGeographyResponse>(scope, "/analytics/geography", { ...range, ...params }, signal),
  analyticsDevices: (scope: YouTubeScope, range: DateRange, by?: AnalyticsDeviceBy, signal?: AbortSignal) => get<YouTubeAnalyticsDevicesResponse>(scope, "/analytics/devices", { ...range, by }, signal),
  analyticsAudience: (scope: YouTubeScope, range: DateRange, by?: AnalyticsAudienceBy, signal?: AbortSignal) => get<YouTubeAnalyticsAudienceResponse>(scope, "/analytics/audience", { ...range, by }, signal),
  /** Needs the separate monetary permission. No row means "unavailable", never zero. */
  analyticsRevenue: (scope: YouTubeScope, range: DateRange, params: { granularity?: AnalyticsRevenueGranularity; currency?: string } = {}, signal?: AbortSignal) =>
    get<YouTubeAnalyticsRevenueResponse>(scope, "/analytics/revenue", { ...range, ...params }, signal),

  /* ---- reporting (reads only; job creation is deferred and has no UI) ---- */

  reportTypes: (scope: YouTubeScope, signal?: AbortSignal) => get<YouTubeReportTypesResponse>(scope, "/reporting/report-types", undefined, signal),
  reportingJobs: (scope: YouTubeScope, signal?: AbortSignal) => get<YouTubeReportingJobsResponse>(scope, "/reporting/jobs", undefined, signal),

  /* ---- monetization capability map ---- */

  monetizationCapabilities: (scope: YouTubeScope, signal?: AbortSignal) => get<YouTubeMonetizationCapabilitiesResponse>(scope, "/monetization/capabilities", undefined, signal),

  /* ---- live ---- */

  liveBroadcasts: (scope: YouTubeScope, params: { status?: YouTubeLiveFilter; pageToken?: string | null; pageSize?: number } = {}, signal?: AbortSignal) =>
    get<YouTubeLiveBroadcastsResponse>(scope, "/live/broadcasts", { status: params.status, pageToken: cleanPageToken(params.pageToken), pageSize: params.pageSize }, signal),
  liveBroadcast: (scope: YouTubeScope, broadcastId: string, signal?: AbortSignal) => get<YouTubeLiveBroadcastResponse>(scope, `/live/broadcasts/${seg(broadcastId)}`, undefined, signal),
  createLiveBroadcast: (scope: YouTubeScope, input: YouTubeLiveCreateInput) => send<YouTubeLiveBroadcastResponse>(scope, "POST", "/live/broadcasts", input),
  updateLiveBroadcast: (scope: YouTubeScope, broadcastId: string, input: YouTubeLiveUpdateInput) => send<YouTubeLiveBroadcastResponse>(scope, "PATCH", `/live/broadcasts/${seg(broadcastId)}`, input),
  bindLiveBroadcast: (scope: YouTubeScope, broadcastId: string, streamId: string | null) =>
    send<YouTubeLiveBroadcastResponse>(scope, "POST", `/live/broadcasts/${seg(broadcastId)}/bind`, { streamId }),
  /** Going live needs `confirmGoLive: true`: it makes the broadcast visible to its audience. */
  transitionLiveBroadcast: (scope: YouTubeScope, broadcastId: string, status: YouTubeLiveTransitionTarget, confirmGoLive?: boolean) =>
    send<YouTubeLiveBroadcastResponse>(scope, "POST", `/live/broadcasts/${seg(broadcastId)}/transition`, { status, ...(confirmGoLive === undefined ? {} : { confirmGoLive }) }),
  liveStreams: (scope: YouTubeScope, params: { pageToken?: string | null; pageSize?: number } = {}, signal?: AbortSignal) =>
    get<YouTubeLiveStreamsResponse>(scope, "/live/streams", { pageToken: cleanPageToken(params.pageToken), pageSize: params.pageSize }, signal),
  createLiveStream: (scope: YouTubeScope, input: YouTubeLiveStreamCreateInput) => send<YouTubeLiveStreamResponse>(scope, "POST", "/live/streams", input),
  /** SECRET (stream key + ingestion address). Called only from an explicit user action and never stored by the caller. */
  liveStreamCredentials: (scope: YouTubeScope, streamId: string, signal?: AbortSignal) =>
    get<YouTubeLiveStreamCredentialsResponse>(scope, `/live/streams/${seg(streamId)}/credentials`, undefined, signal),
  liveChat: (scope: YouTubeScope, broadcastId: string, params: { pageToken?: string | null; pageSize?: number } = {}, signal?: AbortSignal) =>
    get<YouTubeLiveChatResponse>(scope, `/live/broadcasts/${seg(broadcastId)}/chat/messages`, { pageToken: cleanPageToken(params.pageToken), pageSize: params.pageSize }, signal),
  sendLiveChatMessage: (scope: YouTubeScope, broadcastId: string, text: string) => send<YouTubeLiveChatMessageResponse>(scope, "POST", `/live/broadcasts/${seg(broadcastId)}/chat/messages`, { text }),
} as const;

