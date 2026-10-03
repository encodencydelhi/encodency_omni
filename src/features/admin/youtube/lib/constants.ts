import type { YouTubeConsentCapability } from "../live/youtube-dto";
import type {
  ApprovalState,
  ContentType,
  GrantedKey,
  MetricKey,
  ModerationStatus,
  Period,
  PublishStatus,
  Visibility,
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
  /** Where a company login is linked to a Client. */
  integrations: "/admin/integrations",
  calendar: "/admin/calendar?channel=youtube",
  studio: "https://studio.youtube.com",
  watch: (id: string) => `https://www.youtube.com/watch?v=${id}`,
  playlistOnYouTube: (id: string) => `https://www.youtube.com/playlist?list=${id}`,
  /** `@handle` when the channel has one, otherwise the channel-id URL. */
  channelOnYouTube: (channel: { id: string; handle: string }) => (channel.handle ? `https://www.youtube.com/${channel.handle}` : `https://www.youtube.com/channel/${channel.id}`),
  /** Management of monetization is not available through the public API: link out. */
  monetizationInStudio: (channelId: string) => `https://studio.youtube.com/channel/${channelId}/monetization`,
} as const;

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

/**
 * The Google permissions OmniPlatform can hold for a channel. Each maps to ONE named consent capability (the server owns the
 * Google scope behind it); `readChannel` is part of the initial connection and has no separate consent.
 */
export const GRANTED_INFO: Record<GrantedKey, { label: string; description: string; consent: YouTubeConsentCapability | null }> = {
  readChannel: { label: "Read channel", description: "Channel profile, videos, playlists and comments.", consent: null },
  uploadVideos: { label: "Upload videos", description: "Upload new videos and set custom thumbnails.", consent: "YOUTUBE_UPLOAD_VIDEO" },
  manageChannel: { label: "Manage videos, playlists, comments & live", description: "Edit metadata, publish, manage playlists and comments, run live broadcasts.", consent: "YOUTUBE_MANAGE_CONTENT" },
  readAnalytics: { label: "View analytics", description: "Views, watch time, audience and traffic reports.", consent: "YOUTUBE_READ_ANALYTICS" },
  readMonetaryAnalytics: { label: "View revenue", description: "Estimated revenue and ad reports (a separate permission).", consent: "YOUTUBE_READ_MONETARY_ANALYTICS" },
};

export const GRANTED_KEYS = Object.keys(GRANTED_INFO) as GrantedKey[];

export const TITLE_MAX = 100;
export const DESCRIPTION_MAX = 5000;
export const TAGS_MAX_CHARS = 500;
