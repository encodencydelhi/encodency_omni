import type {
  AnalyticsPartialMetrics,
  AnalyticsSeriesPoint,
  DemographicRow,
  DeviceRow,
  GeographyRow as GeographyRowDto,
  SubscribedStatusRow,
  TrafficSourceRow,
  YouTubeAnalyticsRevenueResponse,
  YouTubeChannelDto,
  YouTubeCommentDto,
  YouTubeCommentThreadDto,
  YouTubeConnectionResponse,
  YouTubeLiveBroadcastDto,
  YouTubeLiveStreamDto,
  YouTubePlaylistDto,
  YouTubePlaylistItemDto,
  YouTubePublishResponse,
  YouTubeThumbnails,
  YouTubeVideoDto,
} from "../live/youtube-dto";
import { lookupCountry } from "../lib/countries";
import type {
  AudienceData,
  BreakdownRow,
  Channel,
  CommentReply,
  CommentThread,
  ConnectionInfo,
  ConnectionState,
  ContentType,
  GeographyRow,
  LiveEvent,
  LiveLifecycle,
  Maybe,
  MetricKey,
  Playlist,
  PlaylistItem,
  PublishStatus,
  RevenueData,
  SeriesPoint,
  StreamHealth,
  Video,
  Visibility,
} from "../types";

/**
 * DTO -> view model. Rules: a missing value stays `null` (never zero); unit conversions happen exactly once here
 * (analytics minutes -> hours); decimal-string counters become numbers only here, and only when they are safe integers.
 */

/* ----------------------------- numbers ----------------------------- */

/** `"12345"` -> 12345. Null, empty, non-numeric or beyond 2^53 -> null (a lossy number is worse than "unavailable"). */
export function countOf(value: string | number | null | undefined): Maybe<number> {
  if (value === null || value === undefined || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isSafeInteger(n) && n >= 0 ? n : null;
}

const minutesToHours = (m: Maybe<number> | undefined): Maybe<number> => (m === null || m === undefined ? null : m / 60);

/** Best available thumbnail URL (https only), or "" when there is none. */
export function pickThumbnail(t: Partial<YouTubeThumbnails> | undefined | null, prefer: (keyof YouTubeThumbnails)[] = ["medium", "high", "standard", "maxres", "default"]): string {
  if (!t) return "";
  for (const key of prefer) {
    const url = t[key];
    if (url && /^https:\/\//i.test(url)) return url;
  }
  return "";
}

/* ----------------------------- connection / channel ----------------------------- */

export function toConnectionInfo(c: YouTubeConnectionResponse | undefined, syncing: boolean): ConnectionInfo {
  if (!c) return { state: "disconnected", lastSyncedAt: null, reason: null, requiresReconnect: false, companyConnectionAvailable: false };
  let state: ConnectionState;
  switch (c.status) {
    case "ACTIVE":
      state = syncing ? "syncing" : "connected";
      break;
    case "CONNECTED_NOT_MAPPED":
      state = "not_mapped";
      break;
    case "RECONNECT_REQUIRED":
      state = "token_expired";
      break;
    case "ERROR":
      state = c.reason === "youtube_quota_exceeded" ? "quota_exceeded" : "sync_failed";
      break;
    default:
      state = "disconnected";
  }
  return { state, lastSyncedAt: c.lastSyncedAt, reason: c.reason, requiresReconnect: c.requiresReconnect, companyConnectionAvailable: c.companyConnectionAvailable };
}

export function emptyChannel(c?: YouTubeConnectionResponse): Channel {
  return {
    id: c?.channelId ?? "",
    title: c?.channelTitle ?? "YouTube",
    handle: "",
    description: "",
    customUrl: "",
    avatarUrl: c?.channelThumbnail && /^https:\/\//i.test(c.channelThumbnail) ? c.channelThumbnail : "",
    bannerUrl: "",
    subscriberCount: null,
    videoCount: null,
    viewCount: null,
    country: null,
    createdAt: null,
    keywords: [],
    googleAccount: c?.googleAccountName ?? null,
  };
}

export function toChannel(dto: YouTubeChannelDto, googleAccount: Maybe<string>): Channel {
  const handle = dto.handle?.startsWith("@") ? dto.handle : "";
  return {
    id: dto.id,
    title: dto.title ?? "YouTube channel",
    handle,
    description: dto.description ?? "",
    customUrl: handle ? `youtube.com/${handle}` : `youtube.com/channel/${dto.id}`,
    avatarUrl: pickThumbnail(dto.thumbnails, ["high", "medium", "default"]),
    bannerUrl: dto.branding.bannerUrl && /^https:\/\//i.test(dto.branding.bannerUrl) ? dto.branding.bannerUrl : "",
    subscriberCount: dto.statistics.subscribersHidden ? null : countOf(dto.statistics.subscribers),
    videoCount: countOf(dto.statistics.videos),
    viewCount: countOf(dto.statistics.views),
    country: dto.country,
    createdAt: dto.publishedAt,
    keywords: parseKeywords(dto.branding.keywords),
    googleAccount,
  };
}

/** Channel keywords are a space-separated list where multi-word entries are quoted. */
export function parseKeywords(raw: string | null): string[] {
  if (!raw) return [];
  const out: string[] = [];
  const re = /"([^"]+)"|(\S+)/g;
  for (let m = re.exec(raw); m; m = re.exec(raw)) out.push((m[1] ?? m[2] ?? "").trim());
  return out.filter(Boolean).slice(0, 20);
}

/* ----------------------------- videos ----------------------------- */

/**
 * Shorts are not flagged by the Data API; a video of at most 60 seconds is shown as a Short (documented heuristic).
 * Broadcasts (live or upcoming) and finished streams are "live".
 */
export const SHORT_MAX_SECONDS = 60;

export function contentTypeOf(dto: YouTubeVideoDto, isReplay = false): ContentType {
  if (isReplay || (dto.live.liveBroadcastContent && dto.live.liveBroadcastContent !== "none")) return "live";
  const s = dto.content.durationSeconds;
  return s !== null && s > 0 && s <= SHORT_MAX_SECONDS ? "short" : "video";
}

function publishStatusOf(dto: YouTubeVideoDto, schedule: Maybe<YouTubePublishResponse>): PublishStatus {
  const upload = dto.status.uploadStatus;
  if (upload === "failed" || upload === "rejected") return "failed";
  if (upload === "uploaded") return "processing";
  if (schedule && (schedule.status === "SCHEDULED" || schedule.status === "QUEUED" || schedule.status === "WAITING_PROCESSING" || schedule.status === "PUBLISHING") && schedule.kind === "SCHEDULED") return "scheduled";
  if (schedule && schedule.status === "FAILED") return "failed";
  const privacy = dto.status.privacyStatus;
  if (privacy === "private") return dto.status.publishAt ? "scheduled" : "draft";
  return "published";
}

export function toVideo(dto: YouTubeVideoDto, schedule: Maybe<YouTubePublishResponse> = null): Video {
  const status = publishStatusOf(dto, schedule);
  const scheduledAt = status === "scheduled" ? schedule?.scheduledAt ?? dto.status.publishAt : null;
  const privacy: Visibility = dto.status.privacyStatus ?? "private";
  return {
    id: dto.id,
    title: dto.title ?? "Untitled video",
    description: dto.description ?? "",
    thumbnailUrl: pickThumbnail(dto.thumbnails),
    type: contentTypeOf(dto),
    visibility: privacy,
    status,
    publishedAt: status === "published" ? dto.publishedAt : null,
    scheduledAt,
    scheduleId: status === "scheduled" ? schedule?.id ?? null : null,
    durationSec: dto.content.durationSeconds,
    tags: dto.tags,
    categoryId: dto.categoryId,
    language: dto.defaultLanguage ?? dto.defaultAudioLanguage,
    madeForKids: dto.status.selfDeclaredMadeForKids ?? dto.status.madeForKids,
    embeddable: dto.status.embeddable,
    commentsEnabled: dto.statistics.comments !== null,
    stats: {
      views: countOf(dto.statistics.views),
      watchTimeHours: null,
      likes: countOf(dto.statistics.likes),
      comments: countOf(dto.statistics.comments),
      ctr: null,
      impressions: null,
      avgViewDurationSec: null,
      subscribersGained: null,
    },
    approval: "none",
    failureReason: status === "failed" ? failureText(dto.status.uploadStatus, schedule) : undefined,
    updatedAt: dto.publishedAt,
  };
}

function failureText(uploadStatus: Maybe<string>, schedule: Maybe<YouTubePublishResponse>): string {
  if (uploadStatus === "rejected") return "YouTube rejected this video. Check YouTube Studio for the reason.";
  if (uploadStatus === "failed") return "YouTube couldn't process this file. Upload the original file again.";
  if (schedule?.failure) return "The scheduled publish failed. Schedule it again.";
  return "This video couldn't be published.";
}

/** Merge per-video analytics (period totals) into the list view model. Missing rows stay null. */
export function withVideoAnalytics(video: Video, metrics: AnalyticsPartialMetrics | undefined): Video {
  if (!metrics) return video;
  return {
    ...video,
    stats: {
      ...video.stats,
      watchTimeHours: minutesToHours(metrics.estimatedMinutesWatched),
      avgViewDurationSec: metrics.averageViewDurationSeconds ?? null,
      subscribersGained: metrics.subscribersGained ?? null,
    },
  };
}

/* ----------------------------- playlists ----------------------------- */

const SYSTEM_PLAYLIST = /^(UU|LL|FL|WL|HL)/;

export function toPlaylist(dto: YouTubePlaylistDto): Playlist {
  return {
    id: dto.id,
    title: dto.title ?? "Untitled playlist",
    description: dto.description ?? "",
    visibility: dto.privacyStatus ?? "private",
    itemCount: dto.itemCount,
    thumbnailUrl: pickThumbnail(dto.thumbnails) || null,
    createdAt: dto.publishedAt,
    system: SYSTEM_PLAYLIST.test(dto.id),
  };
}

export function toPlaylistItem(dto: YouTubePlaylistItemDto): Maybe<PlaylistItem> {
  if (!dto.videoId) return null;
  return {
    playlistItemId: dto.playlistItemId,
    videoId: dto.videoId,
    position: dto.position,
    title: dto.title ?? "Untitled video",
    thumbnailUrl: pickThumbnail(dto.thumbnails) || null,
    available: dto.available,
    privacy: dto.videoPrivacyStatus,
    addedAt: dto.publishedAt,
  };
}

/* ----------------------------- comments ----------------------------- */

function toReply(dto: YouTubeCommentDto): CommentReply {
  return {
    id: dto.commentId,
    author: dto.authorDisplayName ?? "Viewer",
    authorAvatar: dto.authorProfileImageUrl && /^https:\/\//i.test(dto.authorProfileImageUrl) ? dto.authorProfileImageUrl : undefined,
    isChannelOwner: dto.authoredByChannel,
    text: dto.textDisplay ?? dto.textOriginal ?? "",
    likeCount: dto.likeCount,
    publishedAt: dto.publishedAt,
  };
}

export function toCommentThread(dto: YouTubeCommentThreadDto, fallbackVideoId: string): CommentThread {
  const top = dto.topLevelComment;
  return {
    id: dto.threadId,
    commentId: top.commentId,
    videoId: dto.videoId ?? top.videoId ?? fallbackVideoId,
    author: top.authorDisplayName ?? "Viewer",
    authorAvatar: top.authorProfileImageUrl && /^https:\/\//i.test(top.authorProfileImageUrl) ? top.authorProfileImageUrl : undefined,
    text: top.textDisplay ?? top.textOriginal ?? "",
    likeCount: top.likeCount,
    publishedAt: top.publishedAt,
    moderationStatus: top.moderationStatus ?? "published",
    replies: dto.repliesPreview.map(toReply),
    totalReplyCount: dto.totalReplyCount,
    canReply: dto.canReply !== false,
    authoredByChannel: top.authoredByChannel,
  };
}

/** A thread counts as answered when the channel itself wrote one of the replies YouTube returned with it. */
export const isAnswered = (c: CommentThread): boolean => c.replies.some((r) => r.isChannelOwner);

/* ----------------------------- live ----------------------------- */

export function lifecycleOf(status: YouTubeLiveBroadcastDto["lifeCycleStatus"]): LiveLifecycle {
  switch (status) {
    case "live":
    case "liveStarting":
      return "live";
    case "complete":
    case "revoked":
      return "completed";
    default:
      return "upcoming";
  }
}

export function streamHealthOf(lifecycle: LiveLifecycle, stream: YouTubeLiveStreamDto | undefined): StreamHealth {
  if (lifecycle === "live") return "live";
  if (lifecycle === "completed") return "ended";
  if (!stream) return "waiting";
  if (stream.streamStatus === "active") return stream.health === "good" || stream.health === "ok" ? "healthy" : "receiving";
  return "waiting";
}

export function toLiveEvent(dto: YouTubeLiveBroadcastDto, stream?: YouTubeLiveStreamDto): LiveEvent {
  const lifecycle = lifecycleOf(dto.lifeCycleStatus);
  return {
    id: dto.broadcastId,
    title: dto.title ?? "Untitled live event",
    description: dto.description ?? "",
    thumbnailUrl: pickThumbnail(dto.thumbnails) || null,
    scheduledStart: dto.scheduledStartTime,
    actualStart: dto.actualStartTime,
    actualEnd: dto.actualEndTime,
    visibility: dto.privacyStatus ?? "private",
    lifecycle,
    lifeCycleStatus: dto.lifeCycleStatus ?? "created",
    health: streamHealthOf(lifecycle, stream),
    enableDvr: dto.enableDvr,
    enableChat: dto.liveChatId !== null,
    streamId: dto.streamId,
    liveChatId: dto.liveChatId,
    replayVideoId: lifecycle === "completed" ? dto.broadcastId : null,
  };
}

/* ----------------------------- analytics ----------------------------- */

/** Net subscribers = gained - lost, only when both are known. */
export function netSubscribers(m: AnalyticsPartialMetrics): Maybe<number> {
  const gained = m.subscribersGained ?? null;
  const lost = m.subscribersLost ?? null;
  if (gained === null && lost === null) return null;
  return (gained ?? 0) - (lost ?? 0);
}

export function toSeriesPoint(p: AnalyticsSeriesPoint): SeriesPoint {
  return {
    date: p.date.length === 7 ? `${p.date}-01` : p.date,
    views: p.metrics.views ?? null,
    watchTime: minutesToHours(p.metrics.estimatedMinutesWatched),
    subscribers: netSubscribers(p.metrics),
    avgViewDuration: p.metrics.averageViewDurationSeconds ?? null,
    impressions: null,
    ctr: null,
  };
}

/** Metric totals for the KPI cards (null stays null; impressions/CTR are not reported by the API). */
export function toTotals(m: AnalyticsPartialMetrics | undefined): Record<MetricKey, Maybe<number>> {
  return {
    views: m?.views ?? null,
    watchTime: minutesToHours(m?.estimatedMinutesWatched),
    subscribers: m ? netSubscribers(m) : null,
    avgViewDuration: m?.averageViewDurationSeconds ?? null,
    impressions: null,
    ctr: null,
  };
}

/** YouTube's provider labels, made readable. Unknown labels are kept readable but never reclassified. */
const TRAFFIC_LABEL: Record<string, string> = {
  ADVERTISING: "Advertising",
  ANNOTATION: "Annotations",
  CAMPAIGN_CARD: "Campaign cards",
  END_SCREEN: "End screens",
  EXT_URL: "External",
  HASHTAGS: "Hashtags",
  LIVE_REDIRECT: "Live redirect",
  NOTIFICATION: "Notifications",
  NO_LINK_EMBEDDED: "Embedded players",
  NO_LINK_OTHER: "Direct or unknown",
  PLAYLIST: "Playlists",
  PROMOTED: "Promoted",
  RELATED_VIDEO: "Suggested videos",
  SHORTS: "Shorts feed",
  SOUND_PAGE: "Sound pages",
  SUBSCRIBER: "Browse features",
  YT_CHANNEL: "Channel pages",
  YT_OTHER_PAGE: "Other YouTube pages",
  YT_PLAYLIST_PAGE: "Playlist pages",
  YT_SEARCH: "YouTube search",
};

export function humanize(code: string): string {
  const known = TRAFFIC_LABEL[code];
  if (known) return known;
  return code
    .toLowerCase()
    .split("_")
    .filter(Boolean)
    .map((w) => w[0]!.toUpperCase() + w.slice(1))
    .join(" ");
}

/** Share of views, 0-100, for rows that have views. Null total -> shares are unknown. */
export function toTrafficRows(items: TrafficSourceRow[]): BreakdownRow[] {
  const total = items.reduce((s, r) => s + (r.views ?? 0), 0);
  return items
    .filter((r) => r.views !== null)
    .map((r) => ({
      label: humanize(r.trafficSourceType),
      value: total > 0 ? ((r.views ?? 0) / total) * 100 : 0,
      watchTimeHours: minutesToHours(r.estimatedMinutesWatched) ?? undefined,
      avgViewDurationSec: r.views && r.estimatedMinutesWatched !== null && r.views > 0 ? Math.round((r.estimatedMinutesWatched * 60) / r.views) : undefined,
    }));
}

const AGE_LABEL = (code: string) => code.replace(/^age/, "").replace("-", "–").replace(/\+$/, "+");
const GENDER_LABEL: Record<string, string> = { male: "Male", female: "Female", user_specified: "User-specified" };

/** Demographics -> age buckets and gender shares (percent of viewers). Empty input -> null (below YouTube's threshold). */
export function toDemographics(rows: DemographicRow[]): { age: Maybe<BreakdownRow[]>; gender: Maybe<BreakdownRow[]> } {
  if (!rows.length) return { age: null, gender: null };
  const age = new Map<string, number>();
  const gender = new Map<string, number>();
  for (const r of rows) {
    if (r.viewerPercentage === null) continue;
    age.set(r.ageGroup, (age.get(r.ageGroup) ?? 0) + r.viewerPercentage);
    gender.set(r.gender, (gender.get(r.gender) ?? 0) + r.viewerPercentage);
  }
  const ageRows = [...age.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => ({ label: AGE_LABEL(k), value: v }));
  const genderRows = [...gender.entries()].map(([k, v]) => ({ label: GENDER_LABEL[k] ?? humanize(k), value: v }));
  return { age: ageRows.length ? ageRows : null, gender: genderRows.length ? genderRows : null };
}

export function toGeography(rows: GeographyRowDto[]): Maybe<GeographyRow[]> {
  if (!rows.length) return null;
  return rows.map((r) => {
    const country = lookupCountry(r.countryCode);
    return {
      code: r.countryCode,
      country: country.name,
      lat: country.lat,
      lon: country.lon,
      views: r.views ?? 0,
      watchTimeHours: minutesToHours(r.estimatedMinutesWatched) ?? 0,
      subscribers: r.subscribersGained ?? 0,
    };
  });
}

const DEVICE_LABEL: Record<string, string> = { MOBILE: "Mobile phone", DESKTOP: "Computer", TV: "TV", TABLET: "Tablet", GAME_CONSOLE: "Game console" };

export function toDeviceRows(items: DeviceRow[]): Maybe<BreakdownRow[]> {
  const rows = items.filter((r) => r.deviceType !== null && r.views !== null);
  if (!rows.length) return null;
  const total = rows.reduce((s, r) => s + (r.views ?? 0), 0);
  return rows.map((r) => ({
    label: DEVICE_LABEL[r.deviceType ?? ""] ?? humanize(r.deviceType ?? "Other"),
    value: total > 0 ? ((r.views ?? 0) / total) * 100 : 0,
    watchTimeHours: minutesToHours(r.estimatedMinutesWatched) ?? undefined,
  }));
}

export function toSubscribedRows(items: SubscribedStatusRow[]): Maybe<BreakdownRow[]> {
  const rows = items.filter((r) => r.views !== null);
  if (!rows.length) return null;
  const total = rows.reduce((s, r) => s + (r.views ?? 0), 0);
  return rows.map((r) => ({ label: r.subscribedStatus === "SUBSCRIBED" ? "Subscribers" : "Not subscribed", value: total > 0 ? ((r.views ?? 0) / total) * 100 : 0 }));
}

export function toAudience(parts: { demographics?: DemographicRow[]; geography?: GeographyRowDto[]; devices?: DeviceRow[]; subscribed?: SubscribedStatusRow[] }): AudienceData {
  const demo = toDemographics(parts.demographics ?? []);
  return {
    age: demo.age,
    gender: demo.gender,
    geography: toGeography(parts.geography ?? []),
    devices: toDeviceRows(parts.devices ?? []),
    subscribed: toSubscribedRows(parts.subscribed ?? []),
  };
}

/** Totals come from the `total` report, the day series from the `day` report. No revenue row (hasData false) -> null: unavailable, not zero. */
export function toRevenue(total: YouTubeAnalyticsRevenueResponse, daily?: YouTubeAnalyticsRevenueResponse): Maybe<RevenueData> {
  if (!total.hasData) return null;
  const t = total.totals;
  return {
    currency: total.currency,
    estimatedRevenue: t?.estimatedRevenue ?? null,
    estimatedAdRevenue: t?.estimatedAdRevenue ?? null,
    grossRevenue: t?.grossRevenue ?? null,
    cpm: t?.cpm ?? null,
    playbackBasedCpm: t?.playbackBasedCpm ?? null,
    monetizedPlaybacks: t?.monetizedPlaybacks ?? null,
    adImpressions: t?.adImpressions ?? null,
    series: (daily?.series ?? []).map((p) => ({ date: p.date.length === 7 ? `${p.date}-01` : p.date, revenue: p.metrics.estimatedRevenue ?? null })),
  };
}
