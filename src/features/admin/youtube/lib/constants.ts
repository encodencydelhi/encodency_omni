import type {
  ApprovalState,
  ContentType,
  MetricKey,
  ModerationStatus,
  Period,
  PublishStatus,
  Visibility,
  WorkspaceRole,
  YouTubePermission,
  YouTubeScope,
} from "../types";

export const YT_ROOT = "/admin/youtube";

export const ytRoutes = {
  overview: YT_ROOT,
  content: `${YT_ROOT}/content`,
  upload: `${YT_ROOT}/content/upload`,
  video: (id: string) => `${YT_ROOT}/content/${id}`,
  analytics: `${YT_ROOT}/analytics`,
  audience: `${YT_ROOT}/audience`,
  comments: `${YT_ROOT}/comments`,
  playlists: `${YT_ROOT}/playlists`,
  playlist: (id: string) => `${YT_ROOT}/playlists/${id}`,
  live: `${YT_ROOT}/live`,
  liveCreate: `${YT_ROOT}/live/create`,
  monetization: `${YT_ROOT}/monetization`,
  settings: `${YT_ROOT}/settings`,
  calendar: "/admin/calendar?channel=youtube",
  studio: "https://studio.youtube.com",
  watch: (id: string) => `https://www.youtube.com/watch?v=${id}`,
  playlistOnYouTube: (id: string) => `https://www.youtube.com/playlist?list=${id}`,
  channelOnYouTube: (handle: string) => `https://www.youtube.com/${handle}`,
} as const;

/**
 * Mock mode: data comes from `data/mock.ts` and mutations resolve locally.
 * When the backend is attached this flips off and the "Preview states" panel
 * in Settings disappears.
 */
export const YT_MOCK_MODE = true;

export const PERIODS: { value: Period; label: string; days: number }[] = [
  { value: "7d", label: "Last 7 days", days: 7 },
  { value: "28d", label: "Last 28 days", days: 28 },
  { value: "90d", label: "Last 90 days", days: 90 },
  { value: "365d", label: "Last 365 days", days: 365 },
];

export const METRICS: Record<MetricKey, { label: string; short: string; color: string; help: string }> = {
  views: { label: "Views", short: "Views", color: "#2563EB", help: "Legitimate views counted by YouTube." },
  watchTime: { label: "Watch Time", short: "Watch time", color: "#7C3AED", help: "Total hours viewers spent watching." },
  subscribers: { label: "Subscribers", short: "Subscribers", color: "#E5202E", help: "Net subscribers gained (gained − lost)." },
  avgViewDuration: { label: "Avg. View Duration", short: "Avg. duration", color: "#0E9F6E", help: "Average length of a view." },
  impressions: { label: "Impressions", short: "Impressions", color: "#0891B2", help: "Times thumbnails were shown on YouTube." },
  ctr: { label: "Impressions CTR", short: "CTR", color: "#D97706", help: "How often impressions turned into views." },
};

export const METRIC_ORDER: MetricKey[] = ["views", "watchTime", "subscribers", "avgViewDuration", "impressions", "ctr"];

export const TYPE_LABEL: Record<ContentType, string> = { video: "Video", short: "Short", live: "Live" };

export const VISIBILITY_LABEL: Record<Visibility, string> = {
  public: "Public",
  unlisted: "Unlisted",
  private: "Private",
};

export const STATUS_LABEL: Record<PublishStatus, string> = {
  published: "Published",
  scheduled: "Scheduled",
  draft: "Draft",
  processing: "Processing",
  failed: "Failed",
};

export const APPROVAL_LABEL: Record<ApprovalState, string> = {
  none: "No approval",
  pending: "Pending approval",
  changes_requested: "Changes requested",
  approved: "Approved",
  rejected: "Rejected",
};

export const MODERATION_LABEL: Record<ModerationStatus, string> = {
  published: "Published",
  heldForReview: "Held for review",
  likelySpam: "Likely spam",
  rejected: "Removed",
};

/** YouTube's videoCategories (region IN), trimmed to the assignable ones. */
export const CATEGORIES: { id: string; label: string }[] = [
  { id: "1", label: "Film & Animation" },
  { id: "2", label: "Autos & Vehicles" },
  { id: "10", label: "Music" },
  { id: "15", label: "Pets & Animals" },
  { id: "17", label: "Sports" },
  { id: "19", label: "Travel & Events" },
  { id: "22", label: "People & Blogs" },
  { id: "24", label: "Entertainment" },
  { id: "25", label: "News & Politics" },
  { id: "26", label: "Howto & Style" },
  { id: "27", label: "Education" },
  { id: "28", label: "Science & Technology" },
  { id: "29", label: "Nonprofits & Activism" },
];

export const categoryLabel = (id: string) => CATEGORIES.find((c) => c.id === id)?.label ?? "Uncategorised";

export const LANGUAGES: { id: string; label: string }[] = [
  { id: "en", label: "English" },
  { id: "hi", label: "Hindi" },
  { id: "bn", label: "Bengali" },
  { id: "mr", label: "Marathi" },
  { id: "ta", label: "Tamil" },
  { id: "te", label: "Telugu" },
];

export const languageLabel = (id: string) => LANGUAGES.find((l) => l.id === id)?.label ?? id;

export const TIMEZONES = ["Asia/Kolkata", "UTC", "Europe/London", "America/New_York", "Asia/Dubai", "Asia/Singapore"];

export const ROLE_LABEL: Record<WorkspaceRole, string> = {
  owner: "Owner",
  manager: "Channel Manager",
  editor: "Editor",
  contributor: "Contributor",
  analyst: "Analyst",
};

export const PERMISSION_LABEL: Record<YouTubePermission, string> = {
  view_youtube: "View YouTube",
  view_analytics: "View analytics",
  upload_content: "Upload content",
  edit_content: "Edit content",
  delete_content: "Delete content",
  publish_content: "Publish content",
  schedule_content: "Schedule content",
  manage_playlists: "Manage playlists",
  moderate_comments: "Moderate comments",
  reply_comments: "Reply to comments",
  manage_live: "Manage live streams",
  manage_connection: "Manage connection",
  view_monetization: "View monetization",
  manage_settings: "Manage settings",
  approve_content: "Approve content",
};

export const ALL_PERMISSIONS = Object.keys(PERMISSION_LABEL) as YouTubePermission[];

export const SCOPE_INFO: Record<YouTubeScope, { label: string; description: string }> = {
  "youtube.readonly": { label: "Read channel", description: "Channel profile, videos, playlists and comments." },
  "youtube.upload": { label: "Upload videos", description: "Upload new videos and set thumbnails." },
  youtube: { label: "Manage videos & playlists", description: "Edit metadata, delete videos, manage playlists and live broadcasts." },
  "youtube.force-ssl": { label: "Manage comments", description: "Reply to, moderate and delete comments." },
  "yt-analytics.readonly": { label: "View analytics", description: "Views, watch time, audience and traffic reports." },
  "yt-analytics-monetary.readonly": { label: "View revenue", description: "Estimated revenue, RPM and CPM reports." },
};

export const ALL_SCOPES = Object.keys(SCOPE_INFO) as YouTubeScope[];

export const TITLE_MAX = 100;
export const DESCRIPTION_MAX = 5000;
export const TAGS_MAX_CHARS = 500;
