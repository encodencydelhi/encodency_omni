/**
 * Backend contract of `/api/v1/integrations/youtube/**` (mirror of backend/src/integrations/youtube/**.types.ts).
 * Raw provider payloads never reach the browser. Channel/video counters are decimal STRINGS (uint64) and are kept as
 * strings here; conversion to a display number happens only in the mappers. Analytics numbers are JSON numbers; a missing
 * value is `null`, never zero.
 */

export type YouTubeSource = "live" | "cache" | "stale";
export type YouTubePrivacy = "public" | "unlisted" | "private";

interface Envelope {
  integrationId: string;
  /** ClientResourceMapping id. */
  resourceId: string;
  channelId: string;
}

interface CachedEnvelope extends Envelope {
  source: YouTubeSource;
  syncedAt: string;
  freshForSeconds: number;
}

export interface PageInfo {
  totalResults: number | null;
  resultsPerPage: number;
  returned: number;
}

/* ------------------------------ connection / channel ------------------------------ */

export type YouTubeConnectionState = "NOT_CONNECTED" | "CONNECTED_NOT_MAPPED" | "ACTIVE" | "RECONNECT_REQUIRED" | "ERROR";

export interface YouTubeGrantedCapabilities {
  readChannel: boolean;
  readAnalytics: boolean;
  readMonetaryAnalytics: boolean;
  uploadVideos: boolean;
  manageChannel: boolean;
}

export interface YouTubeConnectionResponse {
  connected: boolean;
  status: YouTubeConnectionState;
  integrationId: string | null;
  resourceId: string | null;
  channelId: string | null;
  channelTitle: string | null;
  channelThumbnail: string | null;
  grantedCapabilities: YouTubeGrantedCapabilities;
  lastSyncedAt: string | null;
  requiresReconnect: boolean;
  reason: string | null;
  companyConnectionAvailable: boolean;
  googleAccountName: string | null;
}

export interface YouTubeChannelDto {
  id: string;
  title: string | null;
  description: string | null;
  handle: string | null;
  publishedAt: string | null;
  country: string | null;
  defaultLanguage: string | null;
  thumbnails: { default: string | null; medium: string | null; high: string | null };
  statistics: { subscribers: string | null; subscribersHidden: boolean; views: string | null; videos: string | null };
  uploadsPlaylistId: string | null;
  status: { privacyStatus: YouTubePrivacy | null; isLinked: boolean | null; longUploadsStatus: string | null; madeForKids: boolean | null };
  branding: { bannerUrl: string | null; keywords: string | null };
}

export interface YouTubeChannelResponse extends CachedEnvelope {
  channel: YouTubeChannelDto;
}

/* ------------------------------ videos ------------------------------ */

export interface YouTubeThumbnails {
  default: string | null;
  medium: string | null;
  high: string | null;
  standard: string | null;
  maxres: string | null;
}

export interface YouTubeVideoDto {
  id: string;
  title: string | null;
  description: string | null;
  publishedAt: string | null;
  channelId: string | null;
  channelTitle: string | null;
  thumbnails: YouTubeThumbnails;
  tags: string[];
  categoryId: string | null;
  defaultLanguage: string | null;
  defaultAudioLanguage: string | null;
  statistics: { views: string | null; likes: string | null; comments: string | null };
  content: { duration: string | null; durationSeconds: number | null; dimension: "2d" | "3d" | null; definition: "hd" | "sd" | null; caption: boolean | null; licensedContent: boolean | null };
  status: {
    uploadStatus: string | null;
    privacyStatus: YouTubePrivacy | null;
    publishAt: string | null;
    embeddable: boolean | null;
    madeForKids: boolean | null;
    selfDeclaredMadeForKids: boolean | null;
  };
  live: { liveBroadcastContent: "none" | "live" | "upcoming" | null };
}

export interface YouTubeVideoListResponse extends CachedEnvelope {
  items: YouTubeVideoDto[];
  nextPageToken: string | null;
  prevPageToken: string | null;
  pageInfo: PageInfo;
}

export interface YouTubeVideoResponse extends CachedEnvelope {
  video: YouTubeVideoDto;
}

export interface YouTubeVideoDeleteResponse {
  videoId: string;
  deleted: true;
  integrationId: string;
  resourceId: string;
}

export interface YouTubeVideoUpdateInput {
  title?: string;
  description?: string;
  tags?: string[];
  categoryId?: string;
  privacyStatus?: YouTubePrivacy;
  madeForKids?: boolean;
}

/* ------------------------------ uploads / thumbnail ------------------------------ */

export type YouTubeUploadStatus = "QUEUED" | "UPLOADING" | "INTERRUPTED" | "UPLOADED" | "FAILED";
export type YouTubeProcessingStatus = "NONE" | "PROCESSING" | "READY" | "FAILED" | "REJECTED";
export type YouTubeThumbnailStatus = "NONE" | "PENDING" | "SET" | "FAILED";

export interface YouTubeUploadResponse {
  uploadId: string;
  integrationId: string;
  resourceId: string;
  channelId: string;
  status: YouTubeUploadStatus;
  processingStatus: YouTubeProcessingStatus;
  progress: { bytesUploaded: number; bytesTotal: number; percent: number };
  title: string;
  privacyStatus: YouTubePrivacy;
  videoId: string | null;
  uploadStatus: string | null;
  uploadCompletedAt: string | null;
  thumbnailStatus: YouTubeThumbnailStatus;
  failure: { code: string } | null;
  createdAt: string;
  updatedAt: string;
}

export interface YouTubeUploadListResponse {
  items: YouTubeUploadResponse[];
}

export interface YouTubeUploadInput {
  /** A VIDEO asset of the Client's media library (never a path or URL). */
  assetId: string;
  thumbnailAssetId?: string;
  title: string;
  description?: string;
  tags?: string[];
  categoryId?: string;
  /** Defaults to `private` on the server; the UI always sends it explicitly and never defaults to public. */
  privacyStatus: YouTubePrivacy;
  madeForKids?: boolean;
  defaultLanguage?: string;
  embeddable?: boolean;
  license?: "youtube" | "creativeCommon";
  notifySubscribers?: boolean;
}

export interface YouTubeThumbnailResponse {
  videoId: string;
  channelId: string;
  integrationId: string;
  resourceId: string;
  thumbnailStatus: "SET";
}

/* ------------------------------ publish / schedule ------------------------------ */

export type YouTubePublishStatus = "QUEUED" | "WAITING_PROCESSING" | "SCHEDULED" | "PUBLISHING" | "PUBLISHED" | "FAILED" | "CANCELLED";
export type YouTubePublishKind = "IMMEDIATE" | "SCHEDULED";
export type YouTubePublishTarget = "public" | "unlisted";

export interface YouTubePublishResponse {
  id: string;
  kind: YouTubePublishKind;
  videoId: string;
  channelId: string;
  integrationId: string;
  resourceId: string;
  uploadId: string | null;
  status: YouTubePublishStatus;
  targetPrivacyStatus: YouTubePublishTarget;
  strategy: "DIRECT" | "NATIVE_PUBLISH_AT" | "APP_DELAYED";
  scheduledAt: string | null;
  publishedAt: string | null;
  attempts: number;
  lastError: { code: string } | null;
  failure: { code: string } | null;
  createdAt: string;
  updatedAt: string;
}

export interface YouTubePublishListResponse {
  items: YouTubePublishResponse[];
}

/* ------------------------------ playlists ------------------------------ */

export interface YouTubePlaylistDto {
  id: string;
  title: string | null;
  description: string | null;
  publishedAt: string | null;
  channelId: string | null;
  channelTitle: string | null;
  thumbnails: YouTubeThumbnails;
  privacyStatus: YouTubePrivacy | null;
  itemCount: number | null;
  defaultLanguage: string | null;
}

export interface YouTubePlaylistItemDto {
  playlistItemId: string;
  playlistId: string | null;
  videoId: string | null;
  position: number | null;
  title: string | null;
  description: string | null;
  publishedAt: string | null;
  videoPublishedAt: string | null;
  videoOwnerChannelId: string | null;
  videoOwnerChannelTitle: string | null;
  thumbnails: YouTubeThumbnails;
  videoPrivacyStatus: YouTubePrivacy | null;
  available: boolean;
}

export interface YouTubePlaylistListResponse extends CachedEnvelope {
  items: YouTubePlaylistDto[];
  nextPageToken: string | null;
  prevPageToken: string | null;
  pageInfo: PageInfo;
}

export interface YouTubePlaylistResponse extends CachedEnvelope {
  playlist: YouTubePlaylistDto;
}

export interface YouTubePlaylistItemsResponse extends CachedEnvelope {
  playlistId: string;
  items: YouTubePlaylistItemDto[];
  nextPageToken: string | null;
  prevPageToken: string | null;
  pageInfo: PageInfo;
}

export interface YouTubePlaylistItemResponse extends Envelope {
  item: YouTubePlaylistItemDto;
  playlistId: string;
}

export interface YouTubePlaylistDeleteResponse {
  playlistId: string;
  deleted: true;
  integrationId: string;
  resourceId: string;
}

export interface YouTubePlaylistItemDeleteResponse {
  playlistId: string;
  playlistItemId: string;
  removed: true;
  integrationId: string;
  resourceId: string;
}

export interface YouTubePlaylistCreateInput {
  title: string;
  description?: string;
  privacyStatus?: YouTubePrivacy;
}

export type YouTubePlaylistUpdateInput = Partial<YouTubePlaylistCreateInput>;

/* ------------------------------ comments ------------------------------ */

export type YouTubeModerationStatus = "published" | "heldForReview" | "likelySpam" | "rejected";
export type YouTubeCommentThreadFilter = "published" | "heldForReview" | "likelySpam";
export type YouTubeCommentOrder = "time" | "relevance";

export interface YouTubeCommentDto {
  commentId: string;
  parentId: string | null;
  videoId: string | null;
  authorDisplayName: string | null;
  authorProfileImageUrl: string | null;
  authorChannelId: string | null;
  textDisplay: string | null;
  textOriginal: string | null;
  likeCount: number | null;
  publishedAt: string | null;
  updatedAt: string | null;
  canRate: boolean | null;
  viewerRating: "none" | "like" | null;
  moderationStatus: YouTubeModerationStatus | null;
  authoredByChannel: boolean;
}

export interface YouTubeCommentThreadDto {
  threadId: string;
  videoId: string | null;
  topLevelComment: YouTubeCommentDto;
  totalReplyCount: number;
  canReply: boolean | null;
  isPublic: boolean | null;
  repliesPreview: YouTubeCommentDto[];
}

export interface YouTubeCommentThreadsResponse extends CachedEnvelope {
  videoId: string;
  filter: YouTubeCommentThreadFilter;
  order: YouTubeCommentOrder;
  items: YouTubeCommentThreadDto[];
  nextPageToken: string | null;
  prevPageToken: string | null;
  pageInfo: PageInfo;
}

export interface YouTubeCommentRepliesResponse extends CachedEnvelope {
  parentId: string;
  videoId: string | null;
  items: YouTubeCommentDto[];
  nextPageToken: string | null;
  prevPageToken: string | null;
  pageInfo: PageInfo;
}

export interface YouTubeCommentResponse extends Envelope {
  comment: YouTubeCommentDto;
}

export interface YouTubeCommentDeleteResponse {
  commentId: string;
  deleted: true;
  integrationId: string;
  resourceId: string;
}

export interface YouTubeCommentModerationResponse {
  commentId: string;
  moderationStatus: "published" | "heldForReview" | "rejected";
  videoId: string;
  integrationId: string;
  resourceId: string;
}

/* ------------------------------ analytics ------------------------------ */

export type AnalyticsMetricName =
  | "views"
  | "estimatedMinutesWatched"
  | "averageViewDurationSeconds"
  | "averageViewPercentage"
  | "subscribersGained"
  | "subscribersLost"
  | "likes"
  | "comments"
  | "shares"
  | "videosAddedToPlaylists"
  | "videosRemovedFromPlaylists";

export type AnalyticsMetrics = Record<AnalyticsMetricName, number | null>;
export type AnalyticsPartialMetrics = Partial<Record<AnalyticsMetricName, number | null>>;

export interface AnalyticsRange {
  /** YYYY-MM-DD */
  startDate: string;
  endDate: string;
}

export interface AnalyticsEnvelope extends CachedEnvelope, AnalyticsRange {}

export interface YouTubeAnalyticsOverviewResponse extends AnalyticsEnvelope {
  hasData: boolean;
  metrics: AnalyticsMetrics;
}

export type AnalyticsGranularity = "day" | "month";

export interface AnalyticsSeriesPoint {
  /** `YYYY-MM-DD` (day) or `YYYY-MM` (month). */
  date: string;
  metrics: AnalyticsPartialMetrics;
}

export interface YouTubeAnalyticsTimeseriesResponse extends AnalyticsEnvelope {
  dimension: AnalyticsGranularity;
  metricNames: AnalyticsMetricName[];
  series: AnalyticsSeriesPoint[];
}

export interface AnalyticsVideoSummary {
  id: string;
  title: string | null;
  thumbnail: string | null;
  publishedAt: string | null;
  privacyStatus: YouTubePrivacy | null;
}

export interface AnalyticsTopVideo {
  videoId: string;
  video: AnalyticsVideoSummary | null;
  metrics: AnalyticsPartialMetrics;
}

export type AnalyticsVideoSort = "views" | "estimatedMinutesWatched" | "subscribersGained" | "subscribersLost";

export interface YouTubeAnalyticsTopVideosResponse extends AnalyticsEnvelope {
  sort: AnalyticsVideoSort;
  page: number;
  pageSize: number;
  nextPage: number | null;
  items: AnalyticsTopVideo[];
}

export interface YouTubeAnalyticsVideoResponse extends AnalyticsEnvelope {
  videoId: string;
  hasData: boolean;
  metrics: AnalyticsMetrics;
  dimension: "day" | null;
  series: AnalyticsSeriesPoint[];
}

export interface BreakdownMetrics {
  views: number | null;
  estimatedMinutesWatched: number | null;
}

export interface TrafficSourceRow extends BreakdownMetrics {
  trafficSourceType: string;
}

export interface PlaybackLocationRow extends BreakdownMetrics {
  playbackLocationType: string;
}

export interface GeographyRow extends BreakdownMetrics {
  countryCode: string;
  subscribersGained: number | null;
}

export interface DeviceRow extends BreakdownMetrics {
  deviceType: string | null;
  operatingSystem: string | null;
}

export interface DemographicRow {
  ageGroup: string;
  gender: string;
  viewerPercentage: number | null;
}

export interface SubscribedStatusRow extends BreakdownMetrics {
  subscribedStatus: string;
}

interface RowsResponse<Row> extends AnalyticsEnvelope {
  hasData: boolean;
  items: Row[];
}

export type YouTubeAnalyticsTrafficSourcesResponse = RowsResponse<TrafficSourceRow>;
export type YouTubeAnalyticsPlaybackLocationsResponse = RowsResponse<PlaybackLocationRow>;
export interface YouTubeAnalyticsGeographyResponse extends RowsResponse<GeographyRow> {
  page: number;
  pageSize: number;
  nextPage: number | null;
}
export type AnalyticsDeviceBy = "deviceType" | "operatingSystem" | "deviceTypeAndOperatingSystem";
export interface YouTubeAnalyticsDevicesResponse extends RowsResponse<DeviceRow> {
  by: AnalyticsDeviceBy;
}
export type AnalyticsAudienceBy = "demographics" | "subscribedStatus";
export interface YouTubeAnalyticsAudienceResponse extends AnalyticsEnvelope {
  by: AnalyticsAudienceBy;
  hasData: boolean;
  demographics: DemographicRow[];
  subscribedStatus: SubscribedStatusRow[];
}

export type RevenueMetricName = "estimatedRevenue" | "estimatedAdRevenue" | "grossRevenue" | "cpm" | "playbackBasedCpm" | "monetizedPlaybacks" | "adImpressions";
export type RevenueMetrics = Record<RevenueMetricName, number | null>;
export type AnalyticsRevenueGranularity = "total" | "day" | "month";

export interface YouTubeAnalyticsRevenueResponse extends AnalyticsEnvelope {
  currency: string;
  granularity: AnalyticsRevenueGranularity;
  hasData: boolean;
  totals: RevenueMetrics | null;
  series: Array<{ date: string; metrics: Partial<Record<RevenueMetricName, number | null>> }>;
}

/* ------------------------------ reporting (reads only in the UI) ------------------------------ */

export type YouTubeReportTypeId = "channel_basic_a3" | "channel_traffic_source_a3" | "channel_playback_location_a3" | "channel_device_os_a3" | "channel_demographics_a1";

export interface YouTubeReportTypeDto {
  id: YouTubeReportTypeId;
  label: string;
  monetary: false;
  availableAtProvider: boolean;
  jobExists: boolean;
}

export interface YouTubeReportingJobDto {
  jobId: string;
  reportTypeId: YouTubeReportTypeId;
  name: string | null;
  createTime: string | null;
  expireTime: string | null;
}

export interface YouTubeReportTypesResponse extends CachedEnvelope {
  items: YouTubeReportTypeDto[];
}

export interface YouTubeReportingJobsResponse extends CachedEnvelope {
  items: YouTubeReportingJobDto[];
}

/* ------------------------------ monetization ------------------------------ */

export interface YouTubeMonetizationCapability {
  key: string;
  support: "supported" | "not_supported";
  reason: "not_available_through_supported_public_api" | null;
  endpoint: string | null;
  note: string;
}

export interface YouTubeMonetizationCapabilitiesResponse extends Envelope {
  monetaryAnalyticsGranted: boolean;
  capabilities: YouTubeMonetizationCapability[];
}

/* ------------------------------ live ------------------------------ */

export type YouTubeLifecycle = "created" | "ready" | "testStarting" | "testing" | "liveStarting" | "live" | "complete" | "revoked";
export type YouTubeLiveFilter = "upcoming" | "active" | "completed" | "all";
export type YouTubeLiveTransitionTarget = "testing" | "live" | "complete";

export interface YouTubeLiveBroadcastDto {
  broadcastId: string;
  channelId: string | null;
  title: string | null;
  description: string | null;
  scheduledStartTime: string | null;
  scheduledEndTime: string | null;
  actualStartTime: string | null;
  actualEndTime: string | null;
  privacyStatus: YouTubePrivacy | null;
  lifeCycleStatus: YouTubeLifecycle | null;
  recordingStatus: string | null;
  madeForKids: boolean | null;
  selfDeclaredMadeForKids: boolean | null;
  streamId: string | null;
  liveChatId: string | null;
  enableDvr: boolean | null;
  enableAutoStart: boolean | null;
  enableAutoStop: boolean | null;
  thumbnails: YouTubeThumbnails;
}

export type YouTubeStreamStatus = "created" | "ready" | "active" | "inactive" | "error";
export type YouTubeStreamHealth = "good" | "ok" | "bad" | "noData";

/** NO ingestion address and NO stream key: those exist only in `YouTubeLiveStreamCredentialsDto`. */
export interface YouTubeLiveStreamDto {
  streamId: string;
  channelId: string | null;
  title: string | null;
  ingestionType: string | null;
  resolution: string | null;
  frameRate: string | null;
  streamStatus: YouTubeStreamStatus | null;
  health: YouTubeStreamHealth | null;
  isReusable: boolean | null;
  hasCredentials: boolean;
}

/** SECRET. Only returned by `GET live/streams/:id/credentials`; never cached, logged or stored by the client. */
export interface YouTubeLiveStreamCredentialsDto {
  streamId: string;
  ingestionAddress: string | null;
  rtmpsIngestionAddress: string | null;
  backupIngestionAddress: string | null;
  streamName: string | null;
}

export interface YouTubeLiveChatMessageDto {
  messageId: string;
  liveChatId: string | null;
  authorChannelId: string | null;
  authorDisplayName: string | null;
  authorProfileImageUrl: string | null;
  message: string | null;
  publishedAt: string | null;
  type: "textMessage" | "superChat" | "superSticker" | "newSponsor" | "memberMilestone" | "messageDeleted" | "userBanned" | "other";
  isChatOwner: boolean | null;
  isChatModerator: boolean | null;
}

export interface YouTubeLiveBroadcastsResponse extends Envelope {
  filter: YouTubeLiveFilter;
  items: YouTubeLiveBroadcastDto[];
  nextPageToken: string | null;
  prevPageToken: string | null;
  pageInfo: PageInfo;
  source: YouTubeSource;
  syncedAt: string;
  freshForSeconds: number;
}

export interface YouTubeLiveBroadcastResponse extends Envelope {
  broadcast: YouTubeLiveBroadcastDto;
}

export interface YouTubeLiveStreamsResponse extends Envelope {
  items: YouTubeLiveStreamDto[];
  nextPageToken: string | null;
}

export interface YouTubeLiveStreamResponse extends Envelope {
  stream: YouTubeLiveStreamDto;
}

export interface YouTubeLiveStreamCredentialsResponse extends Envelope {
  credentials: YouTubeLiveStreamCredentialsDto;
}

export interface YouTubeLiveChatResponse extends Envelope {
  broadcastId: string;
  liveChatId: string;
  items: YouTubeLiveChatMessageDto[];
  nextPageToken: string | null;
  pollingIntervalMillis: number | null;
  source: "live";
}

export interface YouTubeLiveChatMessageResponse extends Envelope {
  broadcastId: string;
  message: YouTubeLiveChatMessageDto;
}

export interface YouTubeLiveCreateInput {
  title: string;
  description?: string;
  /** ISO 8601 WITH an explicit UTC offset, in the future. */
  scheduledStartTime: string;
  scheduledEndTime?: string;
  /** Always sent explicitly; the UI defaults to `private`. */
  privacyStatus: YouTubePrivacy;
  madeForKids?: boolean;
  enableDvr?: boolean;
}

export interface YouTubeLiveUpdateInput {
  title?: string;
  description?: string;
  scheduledStartTime?: string;
  scheduledEndTime?: string;
  privacyStatus?: YouTubePrivacy;
}

export interface YouTubeLiveStreamCreateInput {
  title: string;
  resolution?: "240p" | "360p" | "480p" | "720p" | "1080p" | "1440p" | "2160p" | "variable";
  frameRate?: "30fps" | "60fps" | "variable";
}

/* ------------------------------ consent ------------------------------ */

/** Named capabilities only. Raw Google scope strings are never sent from the browser. */
export const YOUTUBE_CONSENT_CAPABILITIES = ["YOUTUBE_MANAGE_CONTENT", "YOUTUBE_UPLOAD_VIDEO", "YOUTUBE_READ_ANALYTICS", "YOUTUBE_READ_MONETARY_ANALYTICS"] as const;
export type YouTubeConsentCapability = (typeof YOUTUBE_CONSENT_CAPABILITIES)[number];

export interface YouTubeOAuthInitResponse {
  authUrl: string;
}
