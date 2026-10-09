import { apiClient } from "@/lib/api/client";
import { companyScopeHeaders } from "@/lib/api/company-scope";

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

export const metaSocialApi = {
  profile(companyId: string, signal?: AbortSignal, refresh = false): Promise<MetaProfile> {
    return apiClient.request<MetaProfile>({ method: "GET", path: `${BASE}/me`, query: refresh ? { refresh: "true" } : undefined, headers: companyScopeHeaders(companyId), signal });
  },
  overview(companyId: string, signal?: AbortSignal, refresh = false): Promise<SocialOverview> {
    return apiClient.request<SocialOverview>({ method: "GET", path: `${BASE}/pages`, query: refresh ? { refresh: "true" } : undefined, headers: companyScopeHeaders(companyId), signal });
  },
  posts(companyId: string, pageId: string, after: string | undefined, signal?: AbortSignal, refresh = false): Promise<Feed<SocialPost>> {
    return apiClient.request<Feed<SocialPost>>({
      method: "GET",
      path: `${BASE}/pages/${encodeURIComponent(pageId)}/posts`,
      query: { limit: 25, ...(after ? { after } : {}), ...(refresh ? { refresh: "true" } : {}) },
      headers: companyScopeHeaders(companyId),
      signal,
    });
  },
  instagramProfile(companyId: string, instagramId: string, signal?: AbortSignal): Promise<InstagramProfile> {
    return apiClient.request<InstagramProfile>({ method: "GET", path: `${BASE}/instagram/${encodeURIComponent(instagramId)}`, headers: companyScopeHeaders(companyId), signal });
  },
  instagramMedia(companyId: string, instagramId: string, after: string | undefined, signal?: AbortSignal, refresh = false): Promise<Feed<InstagramMedia>> {
    return apiClient.request<Feed<InstagramMedia>>({
      method: "GET",
      path: `${BASE}/instagram/${encodeURIComponent(instagramId)}/media`,
      query: { limit: 25, ...(after ? { after } : {}), ...(refresh ? { refresh: "true" } : {}) },
      headers: companyScopeHeaders(companyId),
      signal,
    });
  },
};
