interface EntityKeys {
  all: readonly string[];
  list: (params?: unknown) => readonly unknown[];
  detail: (id: string) => readonly unknown[];
  summary: (params?: unknown) => readonly unknown[];
}

function entityKeys(scope: string): EntityKeys {
  return {
    all: [scope],
    list: (params) => [scope, "list", params ?? {}],
    detail: (id) => [scope, "detail", id],
    summary: (params) => [scope, "summary", params ?? {}],
  };
}

/**
 * YouTube keys. Every key starts with the Company + Client it was fetched for, so a response for another Client can
 * never be shown under a newly selected one, and `youtube.root(scope)` invalidates exactly one Client's YouTube data.
 */
export interface YouTubeKeyScope {
  companyId: string;
  clientId: string;
}

const ytRoot = (s: YouTubeKeyScope) => ["youtube", s.companyId, s.clientId] as const;

export const youtubeKeys = {
  root: ytRoot,
  connection: (s: YouTubeKeyScope) => [...ytRoot(s), "connection"] as const,
  channel: (s: YouTubeKeyScope) => [...ytRoot(s), "channel"] as const,
  videos: (s: YouTubeKeyScope) => [...ytRoot(s), "videos"] as const,
  video: (s: YouTubeKeyScope, id: string) => [...ytRoot(s), "video", id] as const,
  schedules: (s: YouTubeKeyScope) => [...ytRoot(s), "schedules"] as const,
  uploads: (s: YouTubeKeyScope) => [...ytRoot(s), "uploads"] as const,
  upload: (s: YouTubeKeyScope, id: string) => [...ytRoot(s), "upload", id] as const,
  playlists: (s: YouTubeKeyScope) => [...ytRoot(s), "playlists"] as const,
  playlist: (s: YouTubeKeyScope, id: string) => [...ytRoot(s), "playlist", id] as const,
  playlistItems: (s: YouTubeKeyScope, id: string) => [...ytRoot(s), "playlist-items", id] as const,
  comments: (s: YouTubeKeyScope, videoId: string, filter: string, order: string) => [...ytRoot(s), "comments", videoId, filter, order] as const,
  commentsOfVideo: (s: YouTubeKeyScope, videoId: string) => [...ytRoot(s), "comments", videoId] as const,
  replies: (s: YouTubeKeyScope, commentId: string) => [...ytRoot(s), "replies", commentId] as const,
  analytics: (s: YouTubeKeyScope, kind: string, params?: unknown) => [...ytRoot(s), "analytics", kind, params ?? {}] as const,
  analyticsAll: (s: YouTubeKeyScope) => [...ytRoot(s), "analytics"] as const,
  reporting: (s: YouTubeKeyScope, kind: string) => [...ytRoot(s), "reporting", kind] as const,
  monetization: (s: YouTubeKeyScope) => [...ytRoot(s), "monetization"] as const,
  liveBroadcasts: (s: YouTubeKeyScope, status: string) => [...ytRoot(s), "live", "broadcasts", status] as const,
  liveAll: (s: YouTubeKeyScope) => [...ytRoot(s), "live"] as const,
  liveStreams: (s: YouTubeKeyScope) => [...ytRoot(s), "live", "streams"] as const,
  liveChat: (s: YouTubeKeyScope, broadcastId: string) => [...ytRoot(s), "live", "chat", broadcastId] as const,
  mediaImages: (s: YouTubeKeyScope) => [...ytRoot(s), "media-images"] as const,
  /** Channels on the Company connection that could be linked to this Client. */
  linkCandidates: (s: YouTubeKeyScope) => [...ytRoot(s), "link-candidates"] as const,
} as const;

export const queryKeys = {
  session: ["session"] as const,
  dashboard: entityKeys("dashboard"),
  companies: entityKeys("companies"),
  users: entityKeys("users"),
  Clients: entityKeys("Clients"),
  team: entityKeys("team"),
  plans: entityKeys("plans"),
  subscriptions: entityKeys("subscriptions"),
  billing: entityKeys("billing"),
  invoices: entityKeys("invoices"),
  usage: entityKeys("usage"),
  integrations: entityKeys("integrations"),
  systemHealth: entityKeys("system-health"),
  jobs: entityKeys("jobs"),
  apiMonitoring: entityKeys("api-monitoring"),
  webhooks: entityKeys("webhooks"),
  auditLogs: entityKeys("audit-logs"),
  support: entityKeys("support"),
  notifications: entityKeys("notifications"),
  settings: entityKeys("settings"),
  youtube: youtubeKeys,
} as const;
