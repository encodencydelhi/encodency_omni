
export type ISODate = string;
export type Maybe<T> = T | null;
export type VerifiedKind = "none" | "blue" | "business" | "government";

export interface XAccount {
  id: string;
  name: string;
  handle: string;
  avatarUrl: string;
  bannerUrl: string;
  bio: string;
  location: string;
  website: string;
  verified: VerifiedKind;
  protected: boolean;
  joinedAt: ISODate;
  followers: number;
  following: number;
  posts: number;
  listed: number;
  authorisedBy: string;
}
export type ConnectionState =
  | "connected"
  | "syncing"
  | "sync_failed"
  | "token_expired"
  | "missing_permission"
  | "needs_reconnect"
  | "rate_limited"
  | "disconnected";

export interface ConnectionInfo {
  state: ConnectionState;
  lastSyncedAt: ISODate;
  nextSyncAt: ISODate;
  rateLimitResetAt: Maybe<ISODate>;
  requestsUsed: number;
  requestsLimit: number;
  lastError: Maybe<string>;
}
export type XScope =
  | "tweet.read"
  | "tweet.write"
  | "users.read"
  | "follows.read"
  | "like.read"
  | "offline.access";
export type WorkspaceRole = "owner" | "manager" | "editor" | "contributor" | "analyst";

export type XPermission =
  | "view_x"
  | "create_content"
  | "publish_content"
  | "schedule_content"
  | "reply_mentions"
  | "delete_content"
  | "view_analytics"
  | "approve_content"
  | "manage_connection"
  | "manage_settings";

export type CapabilityKey =
  | "canReadProfile"
  | "canReadPosts"
  | "canCreatePost"
  | "canDeletePost"
  | "canReadMentions"
  | "canReplyMention"
  | "canReadAudience"
  | "canReadAnalytics"
  | "canSchedulePost"
  | "canManageConnection"
  /* Internal-only capabilities — no X scope backs these. */
  | "canApprove"
  | "canManageSettings";

export interface Capability {
  allowed: boolean;
  /** Always set when `allowed` is false — shown wherever the control is disabled. */
  reason?: string;
  fix?: "reconnect" | "request_access" | "wait" | "connect";
}

export type CapabilityMap = Record<CapabilityKey, Capability>;

export interface TeamMember {
  id: string;
  name: string;
  handle: string;
  email: string;
  role: WorkspaceRole;
}

/* ------------------------------------------------------------------ */
/* Content                                                             */
/* ------------------------------------------------------------------ */

/** `archived` is an OmniPlatform state — X itself has no archive. */
export type PostStatus =
  | "published"
  | "scheduled"
  | "draft"
  | "publishing"
  | "failed"
  | "archived";

export type PostType = "text" | "image" | "video" | "thread" | "poll" | "link";

export type MediaKind = "image" | "video" | "gif";
export type MediaState = "uploading" | "processing" | "ready" | "failed";

export interface XMedia {
  id: string;
  kind: MediaKind;
  url: string;
  altText: string;
  state: MediaState;
  /** 0–100 while uploading. */
  progress: number;
  error?: string;
  durationSec?: number;
}

export interface XPoll {
  /** Becomes the post text when published — X polls have no separate question field. */
  question: string;
  options: string[];
  durationMinutes: number;
  /** Only present once the poll is live. */
  votes: Maybe<number[]>;
  endsAt: Maybe<ISODate>;
}

export type FailureCode =
  | "media_processing"
  | "connection_expired"
  | "rate_limit"
  | "validation"
  | "duplicate_content";

export interface PostFailure {
  code: FailureCode;
  message: string;
  /** What the user can do about it, in one line. */
  hint: string;
  at: ISODate;
  retryCount: number;
  lastAttemptAt: ISODate;
}

export interface PostMetrics {
  impressions: number;
  engagements: number;
  likes: number;
  replies: number;
  reposts: number;
  quotes: number;
  bookmarks: number;
  linkClicks: number;
  profileVisits: number;
  videoViews: Maybe<number>;
}

export type ApprovalState = "none" | "pending" | "approved" | "changes_requested" | "rejected";

export interface XPost {
  id: string;
  /** First post of a thread, or the whole post. */
  text: string;
  /** Parts 2..n of a thread; empty for single posts. */
  thread: string[];
  type: PostType;
  media: XMedia[];
  poll: Maybe<XPoll>;
  linkUrl: Maybe<string>;
  status: PostStatus;
  publishedAt: Maybe<ISODate>;
  scheduledAt: Maybe<ISODate>;
  createdAt: ISODate;
  updatedAt: ISODate;
  metrics: PostMetrics;
  failure: Maybe<PostFailure>;

  /* [OmniPlatform] ------------------------------------------------- */
  approval: ApprovalState;
  ownerId: string;
  campaignId: Maybe<string>;
  internalTags: string[];
  archivedAt: Maybe<ISODate>;
}

export interface ApprovalEvent {
  id: string;
  postId: string;
  action: "submitted" | "approved" | "changes_requested" | "rejected";
  actor: string;
  note?: string;
  at: ISODate;
}

/* ------------------------------------------------------------------ */
/* Mentions & replies                                                  */
/* ------------------------------------------------------------------ */

export type MentionStatus = "unanswered" | "replied" | "resolved" | "ignored";
export type Priority = "low" | "normal" | "high" | "urgent";
export type Sentiment = "positive" | "neutral" | "negative" | "question";
export type MentionKind = "mention" | "reply" | "quote";

export interface XUser {
  id: string;
  name: string;
  handle: string;
  avatarUrl: Maybe<string>;
  verified: VerifiedKind;
  bio: string;
  followers: number;
  following: number;
  location: string;
  /** Does this account follow us? */
  isFollower: boolean;
}

export interface ConversationMessage {
  id: string;
  authorHandle: string;
  authorName: string;
  /** True when the message was sent by the connected account. */
  isUs: boolean;
  text: string;
  at: ISODate;
}

/** [OmniPlatform] Private team note attached to a mention. */
export interface InternalNote {
  id: string;
  author: string;
  text: string;
  at: ISODate;
}

export interface XMention {
  id: string;
  user: XUser;
  text: string;
  at: ISODate;
  kind: MentionKind;
  relatedPostId: Maybe<string>;
  conversation: ConversationMessage[];
  sentiment: Sentiment;
  metrics: { likes: number; replies: number; reposts: number };
  repliedAt: Maybe<ISODate>;
  responseMinutes: Maybe<number>;

  status: MentionStatus;
  priority: Priority;
  assigneeId: Maybe<string>;
  notes: InternalNote[];
}
export interface AudienceMember extends XUser {
  followedAt: Maybe<ISODate>;
  engagements: number;
  mentions: number;
  lastEngagedAt: Maybe<ISODate>;

  internalTags: string[];
  note: string;
  ownerId: Maybe<string>;
  lists: string[];
}

export interface BreakdownRow {
  label: string;
  value: number;
  secondary?: number;
}

export interface GeographyRow {
  code: string;
  country: string;
  lat: number;
  lon: number;
  followers: number;
  engagements: number;
}

export interface AudienceData {
  followerSeries: { date: ISODate; followers: number; gained: number; lost: number }[];
  recentFollowers: AudienceMember[];
  topEngaging: AudienceMember[];
  frequentMentioners: AudienceMember[];
  activity: number[][];
  byDay: BreakdownRow[];
  geography: Maybe<GeographyRow[]>;
  followerSplit: BreakdownRow[];
  profileVisits: number;
  previousProfileVisits: number;
  engagedFollowers: number;
  previousEngagedFollowers: number;
}
export type MetricKey =
  | "impressions"
  | "engagements"
  | "engagementRate"
  | "likes"
  | "replies"
  | "reposts"
  | "linkClicks"
  | "profileVisits"
  | "followerGrowth"
  | "videoViews";

export interface SeriesPoint {
  date: ISODate;
  impressions: number;
  engagements: number;
  engagementRate: number;
  likes: number;
  replies: number;
  reposts: number;
  linkClicks: number;
  profileVisits: number;
  followerGrowth: number;
  videoViews: number;
}

export interface MetricTotal {
  value: Maybe<number>;
  previous: Maybe<number>;
}

export type Period = "7d" | "30d" | "90d" | "custom";
export type SyncFrequency = "15m" | "hourly" | "6h" | "daily";

export type NotificationKey =
  | "newMention"
  | "highPriorityMention"
  | "failedPost"
  | "publishingFailure"
  | "connectionIssue"
  | "dailySummary";

export interface NotificationChannels {
  inApp: boolean;
  email: boolean;
  slack: boolean;
}

export interface Campaign {
  id: string;
  name: string;
}

export interface XSettings {
  sync: {
    auto: boolean;
    frequency: SyncFrequency;
    includeContent: boolean;
    includeMentions: boolean;
    includeAudience: boolean;
    includeAnalytics: boolean;
  };
  publishing: {
    timezone: string;
    defaultCampaignId: Maybe<string>;
    defaultTags: string[];
    urlTracking: { enabled: boolean; source: string; medium: string };
    defaultTime: string;
    minimumGapMinutes: number;
  };
  notifications: Record<NotificationKey, NotificationChannels>;
  rolePermissions: Record<WorkspaceRole, XPermission[]>;
  contentRules: {
    brandVoice: string;
    blockedWords: string[];
    requiredTags: string[];
    requireAltText: boolean;
    maxMedia: number;
    requireTrackedLinks: boolean;
    blockShorteners: boolean;
  };
  approvals: {
    required: boolean;
    reviewerIds: string[];
    publisherIds: string[];
  };
}
export type ActivityAction =
  | "post_created"
  | "post_edited"
  | "post_scheduled"
  | "post_published"
  | "post_deleted"
  | "post_retried"
  | "reply_sent"
  | "mention_resolved"
  | "owner_assigned"
  | "priority_changed"
  | "connection_refreshed"
  | "settings_updated"
  | "approval";

export interface ActivityEvent {
  id: string;
  actor: string;
  action: ActivityAction;
  summary: string;
  entity: { type: "post" | "mention" | "account" | "settings" | "audience"; id?: string; label: string };
  source: "OmniPlatform" | "X sync";
  at: ISODate;
}

export type NotificationKind =
  | "post_published"
  | "post_failed"
  | "mention_received"
  | "high_priority_mention"
  | "connection_issue"
  | "rate_limit"
  | "approval_requested"
  | "sync_failed";

export interface WorkspaceNotification {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  href: string;
  at: ISODate;
  read: boolean;
}
export interface XSnapshot {
  account: XAccount;
  connection: ConnectionInfo;
  scopes: XScope[];
  posts: XPost[];
  mentions: XMention[];
  audience: AudienceData;
  settings: XSettings;
  team: TeamMember[];
  campaigns: Campaign[];
  approvals: ApprovalEvent[];
  activity: ActivityEvent[];
  notifications: WorkspaceNotification[];
}
