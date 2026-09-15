
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
  handle: string;
  description: string;
  customUrl: string;
  avatarUrl: string;
  bannerUrl: string;
  isVerified: boolean;
  subscriberCount: number;
  videoCount: number;
  viewCount: number;
  country: string;
  createdAt: ISODate;
  keywords: string[];
  googleAccount: string;
}

export type ConnectionState =
  | "connected"
  | "syncing"
  | "sync_failed"
  | "token_expired"
  | "quota_exceeded"
  | "disconnected";

export interface ConnectionInfo {
  state: ConnectionState;
  lastSyncedAt: ISODate;
  nextSyncAt: ISODate;
  autoSync: boolean;
  syncFrequency: "hourly" | "6h" | "12h" | "daily";
  quotaUsed: number;
  quotaLimit: number;
}

export type YouTubeScope =
  | "youtube.readonly"
  | "youtube.upload"
  | "youtube"
  | "youtube.force-ssl"
  | "yt-analytics.readonly"
  | "yt-analytics-monetary.readonly";
export type YouTubePermission =
  | "view_youtube"
  | "view_analytics"
  | "upload_content"
  | "edit_content"
  | "delete_content"
  | "publish_content"
  | "schedule_content"
  | "manage_playlists"
  | "moderate_comments"
  | "reply_comments"
  | "manage_live"
  | "manage_connection"
  | "view_monetization"
  | "manage_settings"
  | "approve_content";

export type WorkspaceRole = "owner" | "manager" | "editor" | "contributor" | "analyst";

export type CapabilityKey =
  | "canUpload"
  | "canEditVideo"
  | "canDeleteVideo"
  | "canPublish"
  | "canSchedule"
  | "canApprove"
  | "canManagePlaylists"
  | "canReplyComments"
  | "canModerateComments"
  | "canGoLive"
  | "canViewAnalytics"
  | "canViewRevenue"
  | "canManageConnection"
  | "canManageSettings";

export interface Capability {
  allowed: boolean;
  reason?: string;
  fix?: "reconnect" | "request_access" | "enable_feature" | "wait";
}

export type CapabilityMap = Record<CapabilityKey, Capability>;

export interface ChannelFeatures {
  liveStreamingEnabled: boolean;
  monetizationEnabled: boolean;
  customThumbnailsEnabled: boolean;
  longUploadsEnabled: boolean;
}
export interface VideoStats {
  views: number;
  watchTimeHours: number;
  likes: number;
  comments: number;
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
  durationSec: number;
  tags: string[];
  categoryId: string;
  language: string;
  madeForKids: boolean;
  ageRestricted: boolean;
  license: "youtube" | "creativeCommon";
  embeddable: boolean;
  commentsEnabled: boolean;
  paidPromotion: boolean;
  recordingDate: Maybe<ISODate>;
  playlistIds: string[];
  stats: VideoStats;
  approval: ApprovalState;
  failureReason?: string;
  updatedAt: ISODate;
}
export interface ApprovalEvent {
  id: string;
  videoId: string;
  action: "submitted" | "approved" | "changes_requested" | "rejected";
  actor: string;
  note?: string;
  at: ISODate;
}

export type VersionField =
  | "title"
  | "description"
  | "tags"
  | "thumbnail"
  | "visibility"
  | "schedule";

export interface VersionEntry {
  id: string;
  videoId: string;
  field: VersionField;
  previous: string;
  next: string;
  actor: string;
  at: ISODate;
}

export type AuditAction =
  | "upload"
  | "edit"
  | "delete"
  | "publish"
  | "schedule"
  | "comment_reply"
  | "moderation"
  | "playlist"
  | "live"
  | "reconnect"
  | "permission"
  | "settings"
  | "thumbnail"
  | "sync"
  | "approval";

export interface AuditEvent {
  id: string;
  actor: string;
  action: AuditAction;
  summary: string;
  entity: { type: "video" | "playlist" | "comment" | "live" | "channel" | "settings"; id?: string; label: string };
  previous?: string;
  next?: string;
  source: "OmniPlatform" | "YouTube sync";
  at: ISODate;
}

export type NotificationKind =
  | "upload_completed"
  | "upload_failed"
  | "video_published"
  | "schedule_failed"
  | "priority_comment"
  | "live_starting"
  | "live_failed"
  | "token_expired"
  | "permission_removed"
  | "sync_failed"
  | "quota_warning"
  | "monetization_changed"
  | "approval_requested";

export interface WorkspaceNotification {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  href: string;
  at: ISODate;
  read: boolean;
}
export interface Playlist {
  id: string;
  title: string;
  description: string;
  visibility: Visibility;
  videoIds: string[];
  updatedAt: ISODate;
  createdAt: ISODate;
}
export type ModerationStatus = "published" | "heldForReview" | "likelySpam" | "rejected";

export interface CommentReply {
  id: string;
  author: string;
  authorAvatar?: string;
  isChannelOwner: boolean;
  text: string;
  likeCount: number;
  publishedAt: ISODate;
}

export interface CommentThread {
  id: string;
  videoId: string;
  author: string;
  authorAvatar?: string;
  text: string;
  likeCount: number;
  publishedAt: ISODate;
  moderationStatus: ModerationStatus;
  likedByChannel: boolean;
  replies: CommentReply[];
  priority: boolean;
}
export type LiveLifecycle = "upcoming" | "live" | "completed";

export type StreamHealth = "waiting" | "receiving" | "healthy" | "live" | "ended";

export interface LiveEvent {
  id: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  scheduledStart: ISODate;
  actualStart: Maybe<ISODate>;
  actualEnd: Maybe<ISODate>;
  visibility: Visibility;
  lifecycle: LiveLifecycle;
  health: StreamHealth;
  latency: "normal" | "low" | "ultraLow";
  enableDvr: boolean;
  enableChat: boolean;
  ingestUrl: string;
  streamKey: string;
  concurrentViewers: Maybe<number>;
  peakViewers: Maybe<number>;
  totalViews: Maybe<number>;
  chatMessages: Maybe<number>;
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
  views: number;
  watchTime: number;
  subscribers: number;
  avgViewDuration: number;
  impressions: number;
  ctr: number;
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
  lat: number;
  lon: number;
  views: number;
  watchTimeHours: number;
  subscribers: number;
}

export interface AudienceData {
  uniqueViewers: Maybe<number>;
  returningViewers: Maybe<number>;
  newViewers: Maybe<number>;
  age: Maybe<BreakdownRow[]>;
  gender: Maybe<BreakdownRow[]>;
  geography: Maybe<GeographyRow[]>;
  devices: Maybe<BreakdownRow[]>;
  activity: Maybe<number[][]>;
  subscriberSources: Maybe<BreakdownRow[]>;
}

export interface RevenueData {
  estimatedRevenue: number;
  previousRevenue: number;
  rpm: number;
  cpm: number;
  monetizedPlaybacks: number;
  series: { date: ISODate; revenue: number }[];
  sources: BreakdownRow[];
}
export interface WorkspaceSettings {
  defaults: {
    visibility: Visibility;
    categoryId: string;
    language: string;
    tags: string[];
    descriptionFooter: string;
    playlistId: string;
    timezone: string;
    madeForKids: boolean;
    license: "youtube" | "creativeCommon";
    commentsEnabled: boolean;
  };
  notifications: Record<
    "uploadCompleted" | "publishFailed" | "newComments" | "liveEvents" | "syncFailure" | "quotaWarning",
    { inApp: boolean; email: boolean }
  >;
  moderation: {
    priorityAlerts: boolean;
    blockedKeywords: string[];
    holdLinks: boolean;
    requireApproval: boolean;
  };
  rolePermissions: Record<WorkspaceRole, YouTubePermission[]>;
}

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: WorkspaceRole;
  initials: string;
}
