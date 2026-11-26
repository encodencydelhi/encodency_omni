import { apiClient } from "@/lib/api/client";
import { metaScopeHeaders } from "./meta-scope";

/**
 * Read-only Facebook Page / Instagram Business surface
 * (backend `integrations/meta-social`, contract in docs/05-api-contracts/07-integrations.md).
 * A field Meta does not return is `null`, never a made-up value.
 */
export interface SocialInstagramLink {
  id: string;
  username: string | null;
  name: string | null;
  pictureUrl: string | null;
  followers: number | null;
}

export interface SocialPage {
  id: string;
  name: string;
  category: string | null;
  link: string | null;
  about: string | null;
  pictureUrl: string | null;
  followers: number | null;
  likes: number | null;
  tasks: string[];
  canPublish: boolean;
  instagram: SocialInstagramLink | null;
}

export interface UnmanagedPage {
  id: string;
  name: string;
  adAccountIds: string[];
}

export interface Freshness {
  source: "live" | "cache" | "stale";
  ageSeconds: number;
  blockedForSeconds: number | null;
}

export interface MetaProfile {
  id: string;
  name: string | null;
  pictureUrl: string | null;
  permissions: Array<{ permission: string; status: string }>;
  token: { isValid: boolean | null; issuedAt: string | null; expiresAt: string | null; dataAccessExpiresAt: string | null };
  businesses: { state: "live" | "empty" | "permission_required" | "unavailable"; items: Array<{ id: string; name: string; verificationStatus: string | null }> };
  freshness?: Freshness;
}

export interface SocialOverview {
  freshness?: Freshness;
  integrationId: string;
  connectedAs: string | null;
  pages: SocialPage[];
  unmanagedPages: UnmanagedPage[];
}

export interface SocialPost {
  id: string;
  message: string | null;
  createdAt: string | null;
  permalink: string | null;
  imageUrl: string | null;
  type: string | null;
  reactions: number | null;
  comments: number | null;
  shares: number | null;
}

export interface InstagramProfile {
  id: string;
  username: string | null;
  name: string | null;
  biography: string | null;
  website: string | null;
  pictureUrl: string | null;
  followers: number | null;
  following: number | null;
  mediaCount: number | null;
}

export interface InstagramMedia {
  id: string;
  caption: string | null;
  type: string | null;
  product: string | null;
  permalink: string | null;
  imageUrl: string | null;
  postedAt: string | null;
  likes: number | null;
  comments: number | null;
}

export interface Feed<T> {
  items: T[];
  nextCursor: string | null;
  freshness?: Freshness;
}

const BASE = "/integrations/meta-social";

/* ----------------------------- comments inbox ----------------------------- */

export type SocialPlatform = "facebook" | "instagram";
export interface SocialComment {
  id: string; platform: SocialPlatform; postId: string; parentId: string | null;
  authorId: string | null; authorName: string | null; byAccount: boolean;
  text: string; createdAt: string | null; likes: number; replies: number;
  hidden: boolean; canHide: boolean; canDelete: boolean; canLike: boolean; likedByAccount: boolean;
}
export interface SocialThreads {
  platform: SocialPlatform; accountId: string; accountName: string; syncedAt: string;
  permissions: { canRead: boolean; canWrite: boolean; missing: string[] };
  posts: Array<{ postId: string; platform: SocialPlatform; text: string; publishedAt: string | null; permalink: string | null; imageUrl: string | null; commentCount: number; comments: SocialComment[] }>;
  /** Commenter id / @username -> CRM lead id. */
  leads: Record<string, string>;
}
export interface SocialAiSuggestion {
  options: Array<{ text: string; why: string }>; language: string | null;
  insight: { who: string; wants: string; approach: string } | null; tokensConsumed: number;
}

const commentsBase = (platform: SocialPlatform, accountId: string) => `${BASE}/${platform}/${encodeURIComponent(accountId)}/comments`;

export const metaCommentsApi = {
  threads(companyId: string, platform: SocialPlatform, accountId: string, signal?: AbortSignal): Promise<SocialThreads> {
    return apiClient.request<SocialThreads>({ method: "GET", path: commentsBase(platform, accountId), headers: metaScopeHeaders(companyId), signal });
  },
  reply(companyId: string, platform: SocialPlatform, accountId: string, body: { targetId: string; targetType: "post" | "comment"; text: string }) {
    return apiClient.request<{ id: string | null }>({ method: "POST", path: `${commentsBase(platform, accountId)}/reply`, headers: metaScopeHeaders(companyId), body });
  },
  hide(companyId: string, platform: SocialPlatform, accountId: string, commentId: string, hidden: boolean) {
    return apiClient.request<{ hidden: boolean }>({ method: "POST", path: `${commentsBase(platform, accountId)}/hide`, headers: metaScopeHeaders(companyId), body: { commentId, hidden } });
  },
  remove(companyId: string, platform: SocialPlatform, accountId: string, commentId: string) {
    return apiClient.request<{ deleted: boolean }>({ method: "POST", path: `${commentsBase(platform, accountId)}/delete`, headers: metaScopeHeaders(companyId), body: { commentId } });
  },
  like(companyId: string, accountId: string, targetId: string, liked: boolean) {
    return apiClient.request<{ liked: boolean }>({ method: "POST", path: `${commentsBase("facebook", accountId)}/like`, headers: metaScopeHeaders(companyId), body: { targetId, liked } });
  },
  suggest(companyId: string, platform: SocialPlatform, accountId: string, body: { task: "reply" | "comment" | "improve"; postId: string; commentId?: string; draft?: string; mode?: string; tone?: string; language?: string; instruction?: string }) {
    return apiClient.request<SocialAiSuggestion>({ method: "POST", path: `${commentsBase(platform, accountId)}/ai`, headers: metaScopeHeaders(companyId), body });
  },
  lead(companyId: string, platform: SocialPlatform, accountId: string, postId: string, commentId: string) {
    return apiClient.request<{ leadId: string; name: string; created: boolean; insight: { interest: string; score: number; nextStep: string } | null }>({ method: "POST", path: `${commentsBase(platform, accountId)}/lead`, headers: metaScopeHeaders(companyId), body: { postId, commentId } });
  },
};

export const metaSocialApi = {
  profile(companyId: string, signal?: AbortSignal, refresh = false): Promise<MetaProfile> {
    return apiClient.request<MetaProfile>({ method: "GET", path: `${BASE}/me`, query: refresh ? { refresh: "true" } : undefined, headers: metaScopeHeaders(companyId), signal });
  },
  overview(companyId: string, signal?: AbortSignal, refresh = false): Promise<SocialOverview> {
    return apiClient.request<SocialOverview>({ method: "GET", path: `${BASE}/pages`, query: refresh ? { refresh: "true" } : undefined, headers: metaScopeHeaders(companyId), signal });
  },
  posts(companyId: string, pageId: string, after: string | undefined, signal?: AbortSignal, refresh = false): Promise<Feed<SocialPost>> {
    return apiClient.request<Feed<SocialPost>>({
      method: "GET",
      path: `${BASE}/pages/${encodeURIComponent(pageId)}/posts`,
      query: { limit: 25, ...(after ? { after } : {}), ...(refresh ? { refresh: "true" } : {}) },
      headers: metaScopeHeaders(companyId),
      signal,
    });
  },
  instagramProfile(companyId: string, instagramId: string, signal?: AbortSignal): Promise<InstagramProfile> {
    return apiClient.request<InstagramProfile>({ method: "GET", path: `${BASE}/instagram/${encodeURIComponent(instagramId)}`, headers: metaScopeHeaders(companyId), signal });
  },
  instagramMedia(companyId: string, instagramId: string, after: string | undefined, signal?: AbortSignal, refresh = false): Promise<Feed<InstagramMedia>> {
    return apiClient.request<Feed<InstagramMedia>>({
      method: "GET",
      path: `${BASE}/instagram/${encodeURIComponent(instagramId)}/media`,
      query: { limit: 25, ...(after ? { after } : {}), ...(refresh ? { refresh: "true" } : {}) },
      headers: metaScopeHeaders(companyId),
      signal,
    });
  },
};
