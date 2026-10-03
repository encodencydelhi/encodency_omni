import type { YouTubeConsentCapability } from "./live/youtube-dto";

/**
 * View models used by the YouTube pages. They are built from the backend DTOs in `data/mappers.ts`.
 * A value the API does not provide is `null` (rendered as an em dash / "unavailable"), never a zero or an invented number.
 */

export type ISODate = string;

export type Maybe<T> = T | null;

export type Visibility = "public" | "unlisted" | "private";

export type ContentType = "video" | "short" | "live";

export type PublishStatus =
  | "published"
  | "scheduled"
  | "draft"
  | "processing"
  | "failed";

/** There is no approval workflow behind the API; every video is `none`. Kept so shared badges keep compiling. */
export type ApprovalState =
  | "none"
  | "pending"
  | "changes_requested"
  | "approved"
  | "rejected";

export type Period = "7d" | "28d" | "90d" | "365d";

export interface Channel {
  id: string;
  title: string;
  /** `@handle`, or "" when the channel has none. */
  handle: string;
  description: string;
  customUrl: string;
  avatarUrl: string;
  bannerUrl: string;
  /** Null when the owner hides the subscriber count. */
  subscriberCount: Maybe<number>;
  videoCount: Maybe<number>;
  viewCount: Maybe<number>;
  country: Maybe<string>;
  createdAt: Maybe<ISODate>;
  keywords: string[];
  googleAccount: Maybe<string>;
}

export type ConnectionState =
  | "connected"
  | "syncing"
  | "sync_failed"
  | "token_expired"
  | "quota_exceeded"
  | "not_mapped"
  | "disconnected";

export interface ConnectionInfo {
  state: ConnectionState;
  lastSyncedAt: Maybe<ISODate>;
  /** Stable backend reason when the connection is not ACTIVE. */
  reason: Maybe<string>;
  requiresReconnect: boolean;
  /** The Company has a YouTube login that could be linked to this Client. */
  companyConnectionAvailable: boolean;
}

/** The permissions Google actually granted (`grantedCapabilities` of the connection response). */
export type GrantedKey = "readChannel" | "readAnalytics" | "readMonetaryAnalytics" | "uploadVideos" | "manageChannel";

export type CapabilityKey =
  | "canUpload"
  | "canEditVideo"
  | "canDeleteVideo"
  | "canPublish"
  | "canSchedule"
  | "canApprove"
  | "canManagePlaylists"
  | "canDeletePlaylist"
  | "canReplyComments"
  | "canModerateComments"
  | "canRemoveComments"
  | "canGoLive"
  | "canTransitionLive"
  | "canViewStreamKey"
  | "canViewAnalytics"
  | "canViewRevenue"
  | "canManageConnection"
  | "canManageSettings";

export interface Capability {
  allowed: boolean;
  reason?: string;
  /**
   * reconnect: the connection is unusable (Google sign-in again). grant: a named permission is missing (incremental consent).
   * connect: link/connect a channel first. request_access: the user's role lacks it. enable_feature: not enabled by YouTube. wait: temporary.
   */
  fix?: "reconnect" | "grant" | "connect" | "request_access" | "enable_feature" | "wait";
  /** Set with `fix: "grant"`: the named capability to ask Google for (never a raw scope string). */
  grant?: YouTubeConsentCapability;
}

export type CapabilityMap = Record<CapabilityKey, Capability>;

export interface ChannelFeatures {
  /** `false` only after the backend answered `youtube_live_not_enabled`. Unknown is `true` (not blocked until proven). */
  liveStreamingEnabled: boolean;
}

export interface VideoStats {
  views: Maybe<number>;
  /** From the Analytics API for the loaded period; null when not loaded / no data. */
  watchTimeHours: Maybe<number>;
  /** Null when the owner hides likes. */
  likes: Maybe<number>;
  /** Null when comments are disabled. */
  comments: Maybe<number>;
  /** The Analytics API does not report impressions or CTR for channel reports: always null. */
  ctr: Maybe<number>;
  impressions: Maybe<number>;
  avgViewDurationSec: Maybe<number>;
  subscribersGained: Maybe<number>;
}

export interface Video {
  id: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  type: ContentType;
  visibility: Visibility;
  status: PublishStatus;
  publishedAt: Maybe<ISODate>;
  scheduledAt: Maybe<ISODate>;
  /** The id of the OmniPlatform publish/schedule record that owns `scheduledAt` (for reschedule/cancel). */
  scheduleId: Maybe<string>;
  durationSec: Maybe<number>;
  tags: string[];
  categoryId: Maybe<string>;
  language: Maybe<string>;
  madeForKids: Maybe<boolean>;
  embeddable: Maybe<boolean>;
  /** `true` unless YouTube omits the comment count (comments disabled). */
  commentsEnabled: Maybe<boolean>;
  stats: VideoStats;
  /** Always `none`: no approval workflow exists in the backend. */
  approval: ApprovalState;
  failureReason?: string;
  updatedAt: Maybe<ISODate>;
}

export interface Playlist {
  id: string;
  title: string;
  description: string;
  visibility: Visibility;
  /** `contentDetails.itemCount` (counts private/deleted items too). */
  itemCount: Maybe<number>;
  thumbnailUrl: Maybe<string>;
  createdAt: Maybe<ISODate>;
  /** YouTube-managed lists (uploads, liked, watch later...): read-only. */
  system: boolean;
}

export interface PlaylistItem {
  playlistItemId: string;
  videoId: string;
  position: Maybe<number>;
  title: string;
  thumbnailUrl: Maybe<string>;
  available: boolean;
  privacy: Maybe<Visibility>;
  addedAt: Maybe<ISODate>;
}

export type ModerationStatus = "published" | "heldForReview" | "likelySpam" | "rejected";

export interface CommentReply {
  id: string;
  author: string;
  authorAvatar?: string;
  isChannelOwner: boolean;
  text: string;
  likeCount: Maybe<number>;
  publishedAt: Maybe<ISODate>;
}

export interface CommentThread {
  /** Thread id. */
  id: string;
  /** The top-level comment id (replies, edits and moderation use this one). */
  commentId: string;
  videoId: string;
  author: string;
  authorAvatar?: string;
  text: string;
  likeCount: Maybe<number>;
  publishedAt: Maybe<ISODate>;
  moderationStatus: ModerationStatus;
  /** Replies YouTube included with the thread; `totalReplyCount` can be larger. */
  replies: CommentReply[];
  totalReplyCount: number;
  canReply: boolean;
  authoredByChannel: boolean;
}

export type LiveLifecycle = "upcoming" | "live" | "completed";

export type StreamHealth = "waiting" | "receiving" | "healthy" | "live" | "ended";

export interface LiveEvent {
  /** Broadcast id (equals the replay video id once complete). */
  id: string;
  title: string;
  description: string;
  thumbnailUrl: Maybe<string>;
  scheduledStart: Maybe<ISODate>;
  actualStart: Maybe<ISODate>;
  actualEnd: Maybe<ISODate>;
  visibility: Visibility;
  lifecycle: LiveLifecycle;
  /** Raw YouTube lifecycle, for transitions. */
  lifeCycleStatus: string;
  /** Derived from the bound stream's status/health (needs a bound stream); `waiting` when none. */
  health: StreamHealth;
  enableDvr: Maybe<boolean>;
  enableChat: boolean;
  streamId: Maybe<string>;
  liveChatId: Maybe<string>;
  /** The broadcast id doubles as the replay video id after the stream completes. */
  replayVideoId: Maybe<string>;
}

export type MetricKey =
  | "views"
  | "watchTime"
  | "subscribers"
  | "avgViewDuration"
  | "impressions"
  | "ctr";

export interface SeriesPoint {
  date: ISODate;
  views: Maybe<number>;
  /** Hours (the API reports minutes; converted once in the mapper). */
  watchTime: Maybe<number>;
  subscribers: Maybe<number>;
  /** Seconds. */
  avgViewDuration: Maybe<number>;
  /** Not reported by the Analytics API: always null. */
  impressions: Maybe<number>;
  ctr: Maybe<number>;
}

export interface MetricSummary {
  key: MetricKey;
  value: Maybe<number>;
  previous: Maybe<number>;
}

export interface BreakdownRow {
  label: string;
  value: number;
  watchTimeHours?: number;
  avgViewDurationSec?: number;
  share?: number;
}

export interface GeographyRow {
  code: string;
  country: string;
  /** Null when the country has no entry in the local centroid table (still listed, just not drawn on the map). */
  lat: Maybe<number>;
  lon: Maybe<number>;
  views: number;
  watchTimeHours: number;
  subscribers: number;
}

export interface AudienceData {
  /** Percent of viewers, 0-100; null below YouTube's privacy thresholds. */
  age: Maybe<BreakdownRow[]>;
  gender: Maybe<BreakdownRow[]>;
  geography: Maybe<GeographyRow[]>;
  devices: Maybe<BreakdownRow[]>;
  subscribed: Maybe<BreakdownRow[]>;
}

export interface RevenueData {
  currency: string;
  estimatedRevenue: Maybe<number>;
  estimatedAdRevenue: Maybe<number>;
  grossRevenue: Maybe<number>;
  cpm: Maybe<number>;
  playbackBasedCpm: Maybe<number>;
  monetizedPlaybacks: Maybe<number>;
  adImpressions: Maybe<number>;
  series: { date: ISODate; revenue: Maybe<number> }[];
}
