import type {
  ApprovalState,
  FailureCode,
  MentionStatus,
  MetricKey,
  Period,
  PostStatus,
  PostType,
  Priority,
  Sentiment,
  SyncFrequency,
  WorkspaceRole,
  XPermission,
  XScope,
} from "../x-data/types";

export const X_ROOT = "/admin/x";

export const xRoutes = {
  overview: X_ROOT,
  content: `${X_ROOT}/content`,
  post: (id: string) => `${X_ROOT}/content/${id}`,
  mentions: `${X_ROOT}/mentions`,
  mention: (id: string) => `${X_ROOT}/mentions?mention=${id}`,
  audience: `${X_ROOT}/audience`,
  analytics: `${X_ROOT}/analytics`,
  postAnalytics: (id: string) => `${X_ROOT}/content/${id}?tab=analytics`,
  scheduling: `${X_ROOT}/scheduling`,
  settings: `${X_ROOT}/settings`,
  /** Cross-module links that already exist in OmniPlatform. */
  calendar: "/admin/calendar?channel=x",
  campaigns: "/admin/campaigns",
  /* X itself */
  profileOnX: (handle: string) => `https://x.com/${handle.replace("@", "")}`,
  postOnX: (handle: string, id: string) => `https://x.com/${handle.replace("@", "")}/status/${id}`,
  userOnX: (handle: string) => `https://x.com/${handle.replace("@", "")}`,
  developerPortal: "https://developer.x.com/en/portal/dashboard",
} as const;

/**
 * Mock mode: data comes from `x-data/mock-provider.ts` and mutations resolve
 * locally. Flip this off (or set NEXT_PUBLIC_X_MOCK_MODE=false) and the
 * repository reports the backend as unavailable instead of inventing data —
 * the workspace then renders a service-unavailable state rather than fake
 * numbers.
 */
export const X_MOCK_MODE = process.env.NEXT_PUBLIC_X_MOCK_MODE !== "false";

/* ------------------------------------------------------------------ */
/* Composer limits                                                     */
/* ------------------------------------------------------------------ */

/** Standard X post limit. Premium accounts get more; the backend will supply the real value. */
export const POST_MAX = 280;
export const THREAD_MAX_PARTS = 25;
export const POLL_MIN_OPTIONS = 2;
export const POLL_MAX_OPTIONS = 4;
export const POLL_OPTION_MAX = 25;
export const ALT_TEXT_MAX = 1000;
/** A link always costs this many characters on X, whatever its real length. */
export const LINK_WEIGHT = 23;

export const POLL_DURATIONS: { value: number; label: string }[] = [
  { value: 60, label: "1 hour" },
  { value: 360, label: "6 hours" },
  { value: 1440, label: "1 day" },
  { value: 4320, label: "3 days" },
  { value: 10080, label: "7 days" },
];

/* ------------------------------------------------------------------ */
/* Periods & metrics                                                   */
/* ------------------------------------------------------------------ */

export const PERIODS: { value: Period; label: string; short: string; days: number }[] = [
  { value: "7d", label: "Last 7 days", short: "7D", days: 7 },
  { value: "30d", label: "Last 30 days", short: "30D", days: 30 },
  { value: "90d", label: "Last 90 days", short: "90D", days: 90 },
];

export const DEFAULT_PERIOD: Period = "30d";

/**
 * `source` drives the "where does this come from" affordance in the UI.
 * Everything here is X-reported; OmniPlatform metrics are labelled separately.
 */
export const METRICS: Record<MetricKey, { label: string; short: string; color: string; help: string }> = {
  impressions: {
    label: "Impressions",
    short: "Impressions",
    color: "#2563EB",
    help: "Times your posts were seen on X, including repeat views from the same account.",
  },
  engagements: {
    label: "Engagements",
    short: "Engagements",
    color: "#7C3AED",
    help: "Every interaction with your posts — likes, replies, reposts, link clicks, profile visits and expands.",
  },
  engagementRate: {
    label: "Engagement rate",
    short: "Eng. rate",
    color: "#0891B2",
    help: "Engagements divided by impressions. X reports this per post; the workspace averages it across the period.",
  },
  likes: { label: "Likes", short: "Likes", color: "#E11D48", help: "Accounts that liked your posts." },
  replies: { label: "Replies", short: "Replies", color: "#0E9F6E", help: "Replies received on your posts." },
  reposts: { label: "Reposts", short: "Reposts", color: "#059669", help: "Reposts and quote posts of your content." },
  linkClicks: { label: "Link clicks", short: "Clicks", color: "#D97706", help: "Clicks on links in your posts, including the post card." },
  profileVisits: { label: "Profile visits", short: "Visits", color: "#DB2777", help: "Accounts that opened your profile after seeing a post." },
  followerGrowth: { label: "Follower growth", short: "Net follows", color: "#0F766E", help: "Net new followers — accounts gained minus accounts lost." },
  videoViews: { label: "Video views", short: "Video views", color: "#9333EA", help: "Views of at least 2 seconds with 50% of the video in view." },
};

/** Order used by the Overview KPI strip — the six that answer "how are we doing?". */
export const OVERVIEW_METRICS: MetricKey[] = [
  "impressions",
  "engagements",
  "engagementRate",
  "linkClicks",
  "profileVisits",
  "followerGrowth",
];

/** The full set shown on Analytics. */
export const ANALYTICS_METRICS: MetricKey[] = [
  "impressions",
  "engagements",
  "engagementRate",
  "likes",
  "replies",
  "reposts",
  "linkClicks",
  "profileVisits",
  "followerGrowth",
  "videoViews",
];

/** Metrics that can be plotted on the trend chart. */
export const TREND_METRICS: MetricKey[] = ["impressions", "engagements", "linkClicks", "followerGrowth"];

/* ------------------------------------------------------------------ */
/* Labels                                                              */
/* ------------------------------------------------------------------ */

export const STATUS_LABEL: Record<PostStatus, string> = {
  published: "Published",
  scheduled: "Scheduled",
  draft: "Draft",
  publishing: "Publishing",
  failed: "Failed",
  archived: "Archived",
};

export const TYPE_LABEL: Record<PostType, string> = {
  text: "Text",
  image: "Image",
  video: "Video",
  thread: "Thread",
  poll: "Poll",
  link: "Link",
};

export const APPROVAL_LABEL: Record<ApprovalState, string> = {
  none: "No approval",
  pending: "Pending approval",
  approved: "Approved",
  changes_requested: "Changes requested",
  rejected: "Rejected",
};

export const MENTION_STATUS_LABEL: Record<MentionStatus, string> = {
  unanswered: "Unanswered",
  replied: "Replied",
  resolved: "Resolved",
  ignored: "Ignored",
};

export const PRIORITY_LABEL: Record<Priority, string> = {
  urgent: "Urgent",
  high: "High",
  normal: "Normal",
  low: "Low",
};

export const PRIORITY_ORDER: Priority[] = ["urgent", "high", "normal", "low"];

export const SENTIMENT_LABEL: Record<Sentiment, string> = {
  positive: "Positive",
  neutral: "Neutral",
  negative: "Negative",
  question: "Question",
};

export const FAILURE_LABEL: Record<FailureCode, string> = {
  media_processing: "Media processing failed",
  connection_expired: "Connection expired",
  rate_limit: "Rate limit reached",
  validation: "Validation error",
  duplicate_content: "Duplicate content",
};

export const ROLE_LABEL: Record<WorkspaceRole, string> = {
  owner: "Owner",
  manager: "Channel Manager",
  editor: "Editor",
  contributor: "Contributor",
  analyst: "Analyst",
};

export const PERMISSION_LABEL: Record<XPermission, string> = {
  view_x: "View X",
  create_content: "Create content",
  publish_content: "Publish",
  schedule_content: "Schedule",
  reply_mentions: "Reply to mentions",
  delete_content: "Delete content",
  view_analytics: "View analytics",
  approve_content: "Approve content",
  manage_connection: "Manage connection",
  manage_settings: "Manage settings",
};

export const ALL_PERMISSIONS = Object.keys(PERMISSION_LABEL) as XPermission[];

export const PERMISSION_HELP: Record<XPermission, string> = {
  view_x: "See the X workspace, posts, mentions and account data.",
  create_content: "Write posts, threads and polls, and save them as drafts.",
  publish_content: "Publish posts to X immediately.",
  schedule_content: "Put posts into the OmniPlatform publishing queue.",
  reply_mentions: "Send replies to mentions from the engagement inbox.",
  delete_content: "Delete the account's own posts from X.",
  view_analytics: "Open Analytics, Audience and post-level performance.",
  approve_content: "Approve, reject or request changes on submitted content.",
  manage_connection: "Connect, reconnect or disconnect the X account.",
  manage_settings: "Change sync, publishing, notification and content-rule settings.",
};

export const SCOPE_INFO: Record<XScope, { label: string; description: string }> = {
  "tweet.read": { label: "Read posts", description: "Read the account's posts, replies, mentions and post metrics." },
  "tweet.write": { label: "Create & delete posts", description: "Publish posts and replies, and delete the account's own posts." },
  "users.read": { label: "Read profile", description: "Read the account profile, bio, verification and public counts." },
  "follows.read": { label: "Read followers", description: "Read followers and following lists for audience reporting." },
  "like.read": { label: "Read likes", description: "Read likes on the account's posts." },
  "offline.access": { label: "Stay connected", description: "Refresh the connection in the background so sync keeps working." },
};

export const ALL_SCOPES = Object.keys(SCOPE_INFO) as XScope[];

export const SYNC_FREQUENCY_LABEL: Record<SyncFrequency, string> = {
  "15m": "Every 15 minutes",
  hourly: "Every hour",
  "6h": "Every 6 hours",
  daily: "Once a day",
};

export const TIMEZONES = [
  "Asia/Kolkata",
  "UTC",
  "Europe/London",
  "America/New_York",
  "America/Los_Angeles",
  "Asia/Dubai",
  "Asia/Singapore",
];

export const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** Canned replies the team can drop into the reply editor. */
export const QUICK_REPLIES: { id: string; label: string; text: string }[] = [
  { id: "thanks", label: "Thank you", text: "Thank you for the kind words — it means a lot to the whole team. 🙏" },
  { id: "volunteer", label: "Volunteer info", text: "We would love to have you on board! You can sign up for the next drive here: namogange.org/volunteer" },
  { id: "donate", label: "Donation help", text: "Thank you for wanting to support us. Details and 80G receipts are here: namogange.org/donate" },
  { id: "dm", label: "Move to DM", text: "Thanks for reaching out — we have sent you a DM so we can help properly." },
  { id: "looking", label: "Looking into it", text: "Thanks for flagging this. We are looking into it and will come back to you shortly." },
];
