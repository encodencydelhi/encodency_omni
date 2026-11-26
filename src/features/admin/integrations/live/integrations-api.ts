import { apiClient } from "@/lib/api/client";
import { companyScopeHeaders } from "@/lib/api/company-scope";
import { linkedInPageHeader } from "@/features/admin/channels/live/linkedin-page-selection";
import type { ProviderId } from "../integrations-data/types";

export type BackendOAuthProvider = "META" | "GOOGLE_BUSINESS" | "LINKEDIN" | "YOUTUBE";

export const SUPPORTED_BACKEND_PROVIDERS: readonly BackendOAuthProvider[] = [
  "META",
  "GOOGLE_BUSINESS",
  "LINKEDIN",
  "YOUTUBE",
] as const;

export function toBackendProvider(providerId: ProviderId | string): BackendOAuthProvider | null {
  const normalized = providerId.toLowerCase().replace(/_/g, "-");
  switch (normalized) {
    case "meta":
    case "facebook":
    case "instagram":
      return "META";
    case "google-business":
    case "google":
      return "GOOGLE_BUSINESS";
    case "linkedin":
      return "LINKEDIN";
    case "youtube":
      return "YOUTUBE";
    default:
      return null;
  }
}

export function fromBackendProvider(provider: BackendOAuthProvider): ProviderId {
  switch (provider) {
    case "META":
      return "meta";
    case "GOOGLE_BUSINESS":
      return "google-business";
    case "LINKEDIN":
      return "linkedin";
    case "YOUTUBE":
      return "youtube";
  }
}

export interface OAuthInitResponse {
  authUrl: string;
}

export interface OAuthInitPayload {
  provider: BackendOAuthProvider;
}

export type BackendResourceType =
  | "FACEBOOK_PAGE"
  | "INSTAGRAM_ACCOUNT"
  | "GOOGLE_BUSINESS_LOCATION"
  | "LINKEDIN_ORGANIZATION"
  | "YOUTUBE_CHANNEL";

export interface DiscoveredResource {
  externalResourceId: string;
  name: string;
  resourceType: BackendResourceType;
}

export interface MapResourcePayload {
  clientId: string;
  externalResourceId: string;
  resourceType: BackendResourceType;
}

export interface ResourceMappingResponse {
  id: string;
  integrationId: string;
  clientId: string;
  resourceType: BackendResourceType;
  externalResourceId: string;
  createdAt: string;
}

export type OverviewProvider = "META" | "INSTAGRAM" | "LINKEDIN" | "GOOGLE_BUSINESS" | "WHATSAPP" | "YOUTUBE";
export type ConnectionStatus = "NOT_CONNECTED" | "CONNECTED" | "MAPPED" | "RECONNECT_REQUIRED";
export type ConnectionHealth = "healthy" | "expiring_soon" | "expired" | "revoked" | "error" | "not_connected";
export type ProviderSupportState = "connected" | "disconnected" | "setup_required" | "unsupported" | "coming_soon" | "permission_required" | "degraded";

export interface OverviewResource {
  mappingId: string;
  resourceType: BackendResourceType;
  externalResourceId: string;
  /** Name saved when the page was mapped (null for older mappings). */
  resourceName?: string | null;
  integrationId: string;
}

export interface OverviewConnection {
  integrationId: string;
  provider: BackendOAuthProvider;
  accountType: "LOGIN" | "LINKEDIN_MEMBER";
  externalAccountId: string;
  accountName: string | null;
  accountEmail: string | null;
  accountPictureUrl: string | null;
  accountProfile: Record<string, unknown> | null;
  status: "ACTIVE" | "EXPIRED" | "REVOKED" | "ERROR";
  health: ConnectionHealth;
  lastUpdatedAt: string;
}

export interface ProviderOverview {
  provider: OverviewProvider;
  status: ConnectionStatus;
  health: ConnectionHealth;
  reconnectRequired: boolean;
  integrationId: string | null;
  companyConnectionAvailable: boolean;
  connections: OverviewConnection[];
  mappedResourceCount: number;
  resources: OverviewResource[];
  lastUpdatedAt: string | null;
  publishingSupported: boolean;
  state: ProviderSupportState;
  availableActions: string[];
  reason: string | null;
}

export interface ClientChannelOverview {
  clientId: string;
  providers: ProviderOverview[];
}

export type LinkedInDatasetState = "live" | "empty" | "permission_required" | "reconnect_required" | "rate_limited" | "unavailable";

export interface LinkedInDataset<T> {
  state: LinkedInDatasetState;
  data: T;
  reason: string | null;
}

export type LinkedInAdPeriod = "7d" | "30d" | "90d" | "365d";
export interface LinkedInPostsPage {
  organizationUrn: string; start: number; count: number; syncedAt: string; hasMore: boolean;
  state: "live" | "empty" | "permission_required" | "reconnect_required" | "rate_limited" | "unavailable"; reason: string | null;
  items: Array<Record<string, unknown>>;
}
export type LinkedInFeedState = "live" | "empty" | "permission_required" | "reconnect_required" | "rate_limited" | "unavailable";
export interface LinkedInAdAccount { id: string; urn: string; name: string; status: string; type: string; currency: string; reference: string | null }
export interface LinkedInCampaignRow {
  id: string; accountId: string; accountName: string; currency: string; name: string; status: string; objective: string | null; type: string | null;
  dailyBudget: number | null; totalBudget: number | null; startAt: string | null; endAt: string | null;
  impressions: number; clicks: number; spend: number; leads: number; conversions: number; ctr: number | null; cpc: number | null; cpl: number | null;
}
export interface LinkedInAdsResponse {
  period: LinkedInAdPeriod | "custom"; from: string | null; to: string | null; syncedAt: string; organizationUrns: string[]; state: LinkedInFeedState; reason: string | null; partial: boolean;
  accounts: LinkedInAdAccount[]; otherAccounts: number; campaigns: LinkedInCampaignRow[];
  totals: { impressions: number; clicks: number; spend: number; leads: number; conversions: number; currency: string | null; spendComparable: boolean; ctr: number | null; cpc: number | null; cpl: number | null; activeCampaigns: number };
}
export interface LinkedInLeadRow {
  id: string; submittedAt: string | null; leadType: string; formId: string | null; formName: string | null; owner: string | null; campaignId: string | null;
  name: string | null; firstName: string | null; lastName: string | null; email: string | null; phone: string | null; company: string | null; jobTitle: string | null;
  city: string | null; country: string | null; answers: Array<{ question: string; answer: string }>;
}
export interface LinkedInLeadsResponse {
  syncedAt: string; organizationUrns: string[]; autoSync: boolean; state: LinkedInFeedState; reason: string | null; partial: boolean;
  forms: Array<{ id: string; name: string; state: string; owner: string; questions: Array<{ id: string; label: string; field: string | null }> }>;
  leads: LinkedInLeadRow[]; inCrm: number;
}

export interface LinkedInAnalyticsDay {
  date: string; pageViews: number; uniquePageViews: number; impressions: number; uniqueImpressions: number; clicks: number; likes: number; comments: number; shares: number;
  followersGained: number; organicFollowers: number; paidFollowers: number;
}
export interface LinkedInAnalyticsResponse {
  organizationUrn: string; from: string; to: string; days: number; syncedAt: string; state: LinkedInFeedState; reason: string | null; partial: string[];
  series: LinkedInAnalyticsDay[];
  totals: Omit<LinkedInAnalyticsDay, "date"> & { engagementRate: number | null; ctr: number | null };
}
export interface LinkedInComment {
  urn: string; id: string; postUrn: string; parentUrn: string | null; actorUrn: string | null; actorKind: "organization" | "person" | "unknown";
  byThisPage: boolean; text: string; createdAt: string | null; likes: number; replies: number;
}
export type LinkedInAiLanguage = "auto" | "English" | "Hindi" | "Hinglish";
export type LinkedInAiImproveMode = "polish" | "shorter" | "friendlier" | "formal" | "English" | "Hindi" | "Hinglish";
export interface LinkedInAiSuggestBody {
  task: "reply" | "comment" | "improve"; postUrn: string; commentUrn?: string; threadUrn?: string; history?: string;
  draft?: string; mode?: LinkedInAiImproveMode; tone?: string; language?: LinkedInAiLanguage; instruction?: string;
}
export interface LinkedInAiSuggestion {
  options: Array<{ text: string; why: string }>; language: string | null;
  insight: { who: string; wants: string; approach: string } | null;
  read: { pageName: string; commenter: { name: string | null; headline: string | null; kind: string } | null; threadLength: number; otherComments: number; postAttachment: string | null };
  tokensConsumed: number;
}
export interface LinkedInAiReview {
  summary: string; tokensConsumed: number;
  items: Record<string, { intent: "lead" | "question" | "praise" | "complaint" | "spam" | "other"; sentiment: string; priority: "high" | "normal" | "low"; needsReply: boolean; note: string }>;
}
export interface LinkedInActor { urn: string; kind: "organization" | "person"; name: string; headline: string | null; profileUrl: string | null }
export interface LinkedInConversations {
  organizationUrn: string; syncedAt: string; canReply: boolean; state: LinkedInFeedState; reason: string | null;
  posts: Array<{
    postUrn: string; text: string; publishedAt: string | null;
    counts: { reactions: Record<string, number>; totalReactions: number; comments: number; commentsOpen?: boolean };
    reactions: Array<{ actorUrn: string; reaction: string; at: string | null }>;
    comments: LinkedInComment[];
  }>;
  /** Names of everyone who commented or reacted, by URN. */
  actors: Record<string, LinkedInActor>;
  /** Member URN -> CRM lead id, for people already saved as leads. */
  leads?: Record<string, string>;
  /** Comment URN -> AI tags stored by the background watcher. */
  triage?: LinkedInAiReview["items"];
}
export interface LinkedInActivity {
  pageName: string; organizationUrn: string; actors: Record<string, LinkedInActor>;
  items: Array<{ kind: "mention" | "reshare"; itemUrn: string; postUrn: string | null; actorUrn: string | null; text: string; happenedAt: string | null }>;
}
export interface LinkedInLeadResult { leadId: string; name: string; created: boolean; insight: { jobTitle: string; company: string; interest: string; score: number; nextStep: string } | null }
export interface LinkedInPostInsights {
  state: LinkedInFeedState; reason: string | null; tokensConsumed: number;
  posts: Array<{ urn: string; publishedAt: string; weekday: string; hourIst: number; format: string; text: string; impressions: number; clicks: number; likes: number; comments: number; shares: number; engagementRate: number }>;
  times: Record<"weekdays" | "hours" | "formats", Array<{ label: string; posts: number; avgEngagementRate: number; avgImpressions: number }>>;
  totals?: { impressions: number; clicks: number; likes: number; comments: number; shares: number };
  insights: { summary: string; whatWorks: string[]; improve: string[]; bestTime: string; ideas: Array<{ title: string; hook: string; format: string }> } | null;
}
export interface LinkedInMember { name: string; picture: string | null; canPost: boolean; reason: string | null }
export interface LinkedInEvent {
  id: string; name: string; description: string | null; format: "IN_PERSON" | "ONLINE" | "UNKNOWN"; startsAt: string | null; endsAt: string | null;
  venue: string | null; externalUrl: string | null; url: string; organizer: string | null; imageUrn: string | null;
}
export interface LinkedInEventsResponse { syncedAt: string; organizationUrns: string[]; state: LinkedInFeedState; reason: string | null; events: LinkedInEvent[]; partial: boolean }
export interface LinkedInSegment {
  id: string; name: string; accountId: string; accountName: string; type: string | null; status: string | null; sourcePlatform: string | null;
  audienceSize: number | null; matchedCount: number | null; destinationStatus: string | null; updatedAt: string | null;
}
export interface LinkedInAudiencesResponse { syncedAt: string; organizationUrns: string[]; crmContactsWithEmail: number; state: LinkedInFeedState; reason: string | null; accounts: LinkedInAdAccount[]; audiences: LinkedInSegment[] }
export const LINKEDIN_CONVERSION_TYPES = ["LEAD", "PURCHASE", "SUBMIT_APPLICATION", "ADD_TO_CART", "QUALIFIED_LEAD"] as const;
export type LinkedInConversionType = (typeof LINKEDIN_CONVERSION_TYPES)[number];
export interface LinkedInConversionRule {
  id: string; name: string; accountId: string; accountName: string; type: string | null; method: string | null; enabled: boolean;
  postClickWindowDays: number | null; viewThroughWindowDays: number | null; lastCallbackAt: string | null; canReceiveEvents: boolean;
}
export interface LinkedInConversionsResponse { syncedAt: string; organizationUrns: string[]; state: LinkedInFeedState; reason: string | null; accounts: LinkedInAdAccount[]; rules: LinkedInConversionRule[] }

export interface LinkedInDashboardResponse {
  organizationUrn: string;
  mappingId: string;
  syncedAt: string;
  organization: LinkedInDataset<Record<string, unknown>>;
  networkSize: LinkedInDataset<Record<string, unknown>>;
  posts: LinkedInDataset<Record<string, unknown>[]>;
  followers: LinkedInDataset<Record<string, unknown>[]>;
  pageStatistics: LinkedInDataset<Record<string, unknown>[]>;
  shareStatistics: LinkedInDataset<Record<string, unknown>[]>;
  social: LinkedInDataset<Record<string, unknown>[]>;
  campaigns: LinkedInDataset<Record<string, unknown>[]>;
  leads: LinkedInDataset<Record<string, unknown>[]>;
  inbox: LinkedInDataset<Record<string, unknown>[]>;
  connection: {
    integrationId: string;
    provider: "LINKEDIN";
    status: string;
    accountName: string | null;
    accountEmail: string | null;
    grantedScopes: string[];
  };
}

/* ------------------------------------------------------------------ */
/* Integrations hub (connections, checks, activity, settings)          */
/* ------------------------------------------------------------------ */

export type HubConnectionState = "connected" | "expiring" | "needs_reconnect" | "permission_missing" | "check_failed" | "rate_limited" | "disconnected";
export type HubConnectionHealth = "healthy" | "expiring_soon" | "expired" | "revoked" | "error" | "not_connected";

export interface HubCheck {
  id: string;
  trigger: "MANUAL" | "AUTOMATIC";
  status: "SUCCESS" | "FAILED";
  reason: string | null;
  message: string | null;
  startedAt: string;
  durationMs: number;
  resourcesFound: number | null;
}

export interface HubConnectionResource {
  id: string;
  type: BackendResourceType;
  name: string | null;
  externalId: string;
  clientId: string;
  clientName: string;
  pendingPosts: number;
  hasPostHistory: boolean;
  mappedAt: string;
}

export interface HubConnection {
  id: string;
  provider: BackendOAuthProvider;
  accountName: string | null;
  accountEmail: string | null;
  accountPictureUrl: string | null;
  state: HubConnectionState;
  health: HubConnectionHealth;
  stateReason: string | null;
  connectedAt: string;
  connectedBy: { name: string | null; email: string } | null;
  lastUpdatedAt: string;
  tokenExpiresAt: string | null;
  autoRenews: boolean;
  grantedScopes: string[] | null;
  requestedScopes: string[];
  requiredScopes: string[];
  missingScopes: string[];
  lastCheck: HubCheck | null;
  lastSuccessfulCheckAt: string | null;
  checks: HubCheck[];
  resources: HubConnectionResource[];
  pendingPosts: number;
}

export interface HubConnectionsResponse {
  viewer: { name: string | null; email: string; canManage: boolean };
  items: HubConnection[];
}

export type HubProviderState = "available" | "unsupported" | "not_configured" | "platform_disabled" | "maintenance" | "new_connections_paused";

export interface HubProvider {
  provider: BackendOAuthProvider;
  name: string;
  description: string;
  docsUrl: string;
  state: HubProviderState;
  connectable: boolean;
  note: string | null;
  requestedScopes: string[];
  requiredScopes: string[];
  autoRenews: boolean;
  capabilities: { id: string; name: string; requiredScopes: string[]; affectedModules: string[] }[];
}

export interface HubActivityItem {
  id: string;
  at: string;
  event: "connected" | "reconnected" | "disconnected" | "sync_completed" | "sync_failed" | "mapping_changed" | "resource_removed" | "settings_updated" | "reconnect_required";
  result: "success" | "failed" | "warning" | "info";
  actor: string;
  summary: string;
  connectionId: string | null;
  providerId: BackendOAuthProvider | null;
  clientId: string | null;
}

export interface HubSettings {
  autoRefresh: boolean;
  confirmBeforeDisconnect: boolean;
  blockDisconnectWithScheduledPosts: boolean;
  metaMaxDailyBudget: number;
}

export interface HubDisconnectResult {
  mode: "removed" | "kept_history" | "pages_moved";
  pendingPosts: number;
}

export const integrationsApi = {
  async getHubConnections(companyId: string, signal?: AbortSignal): Promise<HubConnectionsResponse> {
    return apiClient.request<HubConnectionsResponse>({ method: "GET", path: "/integrations/connections", headers: companyScopeHeaders(companyId), signal });
  },

  async getHubProviders(companyId: string, signal?: AbortSignal): Promise<{ items: HubProvider[] }> {
    return apiClient.request<{ items: HubProvider[] }>({ method: "GET", path: "/integrations/providers", headers: companyScopeHeaders(companyId), signal });
  },

  async getHubActivity(companyId: string, signal?: AbortSignal): Promise<{ items: HubActivityItem[] }> {
    return apiClient.request<{ items: HubActivityItem[] }>({ method: "GET", path: "/integrations/activity", query: { limit: "100" }, headers: companyScopeHeaders(companyId), signal });
  },

  async getHubSettings(companyId: string, signal?: AbortSignal): Promise<HubSettings> {
    return apiClient.request<HubSettings>({ method: "GET", path: "/integrations/settings", headers: companyScopeHeaders(companyId), signal });
  },

  async saveHubSettings(companyId: string, patch: Partial<HubSettings>, signal?: AbortSignal): Promise<HubSettings> {
    return apiClient.request<HubSettings>({ method: "PUT", path: "/integrations/settings", headers: companyScopeHeaders(companyId), body: patch, signal });
  },

  /** A real check: asks the provider what the login can reach. Answers 200 even when the check itself failed. */
  async checkConnection(companyId: string, integrationId: string, signal?: AbortSignal): Promise<HubCheck> {
    return apiClient.request<HubCheck>({ method: "POST", path: `/integrations/connections/${encodeURIComponent(integrationId)}/check`, headers: companyScopeHeaders(companyId), signal });
  },

  async disconnectConnection(companyId: string, integrationId: string, signal?: AbortSignal): Promise<HubDisconnectResult> {
    return apiClient.request<HubDisconnectResult>({ method: "DELETE", path: `/integrations/connections/${encodeURIComponent(integrationId)}`, headers: companyScopeHeaders(companyId), signal });
  },

  async moveMapping(companyId: string, mappingId: string, clientId: string, signal?: AbortSignal): Promise<{ moved: true }> {
    return apiClient.request<{ moved: true }>({ method: "PATCH", path: `/integrations/mappings/${encodeURIComponent(mappingId)}`, headers: companyScopeHeaders(companyId), body: { clientId }, signal });
  },

  async unmapResource(companyId: string, mappingId: string, signal?: AbortSignal): Promise<{ removed: true }> {
    return apiClient.request<{ removed: true }>({ method: "DELETE", path: `/integrations/mappings/${encodeURIComponent(mappingId)}`, headers: companyScopeHeaders(companyId), signal });
  },

  /** Starts a reconnect of one existing login: the provider's consent screen is pre-filled with that account. */
  async initReconnect(companyId: string, provider: BackendOAuthProvider, integrationId: string, signal?: AbortSignal): Promise<OAuthInitResponse> {
    return apiClient.request<OAuthInitResponse>({
      method: "POST",
      path: "/integrations/oauth/init",
      headers: companyScopeHeaders(companyId),
      body: { provider, integrationId },
      signal,
      skipSessionExpiry: false,
    });
  },

  /** GET /integrations/linkedin/ads — this Client's LinkedIn ad accounts, campaigns and performance. */
  async getLinkedInAds(companyId: string, clientId: string, period: LinkedInAdPeriod, signal?: AbortSignal, custom?: { from: string; to: string }): Promise<LinkedInAdsResponse> {
    const query = custom ? `from=${encodeURIComponent(custom.from)}&to=${encodeURIComponent(custom.to)}` : `period=${period}`;
    return apiClient.request<LinkedInAdsResponse>({ method: "GET", path: `/integrations/linkedin/ads?${query}`, headers: companyScopeHeaders(companyId, { "x-client-id": clientId, ...linkedInPageHeader(companyId, clientId) }), signal });
  },
  /** GET /integrations/linkedin/posts — one page of company-page posts with per-post statistics. */
  async getLinkedInPosts(companyId: string, clientId: string, start: number, count: number, signal?: AbortSignal): Promise<LinkedInPostsPage> {
    return apiClient.request<LinkedInPostsPage>({ method: "GET", path: `/integrations/linkedin/posts?start=${start}&count=${count}`, headers: companyScopeHeaders(companyId, { "x-client-id": clientId, ...linkedInPageHeader(companyId, clientId) }), signal });
  },
  /** GET /integrations/linkedin/leads — Lead Gen form responses for this Client's page and its ad accounts. */
  async getLinkedInLeads(companyId: string, clientId: string, signal?: AbortSignal): Promise<LinkedInLeadsResponse> {
    return apiClient.request<LinkedInLeadsResponse>({ method: "GET", path: "/integrations/linkedin/leads", headers: companyScopeHeaders(companyId, { "x-client-id": clientId, ...linkedInPageHeader(companyId, clientId) }), signal });
  },
  /** POST /integrations/linkedin/leads/sync — copy new LinkedIn leads into this Client's CRM (repeat-safe). */
  async syncLinkedInLeads(companyId: string, clientId: string): Promise<{ total: number; imported: number; skipped: number }> {
    return apiClient.request<{ total: number; imported: number; skipped: number }>({ method: "POST", path: "/integrations/linkedin/leads/sync", headers: companyScopeHeaders(companyId, { "x-client-id": clientId, ...linkedInPageHeader(companyId, clientId) }), body: {} });
  },

  /** PATCH /integrations/linkedin/campaigns/:id — start/pause a campaign or change its daily budget (needs confirm). */
  async updateLinkedInCampaign(companyId: string, clientId: string, campaignId: string, body: { accountId: string; status?: "ACTIVE" | "PAUSED"; dailyBudget?: number; confirm: true }) {
    return apiClient.request<{ id: string; accountId: string; status: string; dailyBudget: number | null; currency: string }>({ method: "PATCH", path: `/integrations/linkedin/campaigns/${encodeURIComponent(campaignId)}`, headers: companyScopeHeaders(companyId, { "x-client-id": clientId, ...linkedInPageHeader(companyId, clientId) }), body });
  },
  /** GET /integrations/linkedin/analytics — page views, post performance and follower gains per day for from..to. */
  async getLinkedInAnalytics(companyId: string, clientId: string, from: string, to: string, signal?: AbortSignal) {
    return apiClient.request<LinkedInAnalyticsResponse>({ method: "GET", path: `/integrations/linkedin/analytics?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`, headers: companyScopeHeaders(companyId, { "x-client-id": clientId, ...linkedInPageHeader(companyId, clientId) }), signal });
  },
  /** Comments and replies on the chosen page's recent posts. */
  async getLinkedInConversations(companyId: string, clientId: string, signal?: AbortSignal) {
    return apiClient.request<LinkedInConversations>({ method: "GET", path: "/integrations/linkedin/conversations", headers: companyScopeHeaders(companyId, { "x-client-id": clientId, ...linkedInPageHeader(companyId, clientId) }), signal });
  },
  /** Comment on a post, or reply to a comment (parentUrn), as the page. */
  async commentOnLinkedIn(companyId: string, clientId: string, body: { postUrn: string; parentUrn?: string; text: string }) {
    return apiClient.request<{ urn: string | null }>({ method: "POST", path: "/integrations/linkedin/comments", headers: companyScopeHeaders(companyId, { "x-client-id": clientId, ...linkedInPageHeader(companyId, clientId) }), body: { ...body, confirm: true } });
  },
  async reactOnLinkedIn(companyId: string, clientId: string, targetUrn: string, reaction: "LIKE" | "PRAISE" | "EMPATHY" | "INTEREST" | "APPRECIATION" | "ENTERTAINMENT" = "LIKE") {
    return apiClient.request<{ reacted: boolean }>({ method: "POST", path: "/integrations/linkedin/reactions", headers: companyScopeHeaders(companyId, { "x-client-id": clientId, ...linkedInPageHeader(companyId, clientId) }), body: { targetUrn, reaction, confirm: true } });
  },
  async deleteLinkedInComment(companyId: string, clientId: string, commentUrn: string) {
    return apiClient.request<{ deleted: boolean }>({ method: "POST", path: "/integrations/linkedin/comments/delete", headers: companyScopeHeaders(companyId, { "x-client-id": clientId, ...linkedInPageHeader(companyId, clientId) }), body: { commentUrn, confirm: true } });
  },
  /** AI reads the post, thread and commenter profile on the server and proposes text. Nothing is posted. */
  async suggestLinkedInReply(companyId: string, clientId: string, body: LinkedInAiSuggestBody) {
    return apiClient.request<LinkedInAiSuggestion>({ method: "POST", path: "/integrations/linkedin/ai/suggest", headers: companyScopeHeaders(companyId, { "x-client-id": clientId, ...linkedInPageHeader(companyId, clientId) }), body });
  },
  async reviewLinkedInComments(companyId: string, clientId: string, body: { pageName: string; comments: Array<{ urn: string; author: string; headline?: string; text: string; postText: string; pageReplied: boolean }> }) {
    return apiClient.request<LinkedInAiReview>({ method: "POST", path: "/integrations/linkedin/ai/review", headers: companyScopeHeaders(companyId, { "x-client-id": clientId, ...linkedInPageHeader(companyId, clientId) }), body });
  },
  async getLinkedInActivity(companyId: string, clientId: string, signal?: AbortSignal) {
    return apiClient.request<LinkedInActivity>({ method: "GET", path: "/integrations/linkedin/activity", headers: companyScopeHeaders(companyId, { "x-client-id": clientId, ...linkedInPageHeader(companyId, clientId) }), signal });
  },
  async linkedInLeadFromComment(companyId: string, clientId: string, body: { postUrn: string; commentUrn: string; threadUrn?: string }) {
    return apiClient.request<LinkedInLeadResult>({ method: "POST", path: "/integrations/linkedin/leads/from-comment", headers: companyScopeHeaders(companyId, { "x-client-id": clientId, ...linkedInPageHeader(companyId, clientId) }), body });
  },
  async linkedInLeadFromFan(companyId: string, clientId: string, body: { actorUrn: string; history: string }) {
    return apiClient.request<LinkedInLeadResult>({ method: "POST", path: "/integrations/linkedin/leads/from-fan", headers: companyScopeHeaders(companyId, { "x-client-id": clientId, ...linkedInPageHeader(companyId, clientId) }), body });
  },
  async updateLinkedInPost(companyId: string, clientId: string, postUrn: string, text: string) {
    return apiClient.request<{ updated: boolean }>({ method: "POST", path: "/integrations/linkedin/posts/update", headers: companyScopeHeaders(companyId, { "x-client-id": clientId, ...linkedInPageHeader(companyId, clientId) }), body: { postUrn, text, confirm: true } });
  },
  async deleteLinkedInPost(companyId: string, clientId: string, postUrn: string) {
    return apiClient.request<{ deleted: boolean }>({ method: "POST", path: "/integrations/linkedin/posts/delete", headers: companyScopeHeaders(companyId, { "x-client-id": clientId, ...linkedInPageHeader(companyId, clientId) }), body: { postUrn, confirm: true } });
  },
  async setLinkedInComments(companyId: string, clientId: string, postUrn: string, open: boolean) {
    return apiClient.request<{ commentsOpen: boolean }>({ method: "POST", path: "/integrations/linkedin/posts/comments", headers: companyScopeHeaders(companyId, { "x-client-id": clientId, ...linkedInPageHeader(companyId, clientId) }), body: { postUrn, open, confirm: true } });
  },
  async getLinkedInPostInsights(companyId: string, clientId: string) {
    return apiClient.request<LinkedInPostInsights>({ method: "POST", path: "/integrations/linkedin/ai/post-insights", headers: companyScopeHeaders(companyId, { "x-client-id": clientId, ...linkedInPageHeader(companyId, clientId) }), body: {} });
  },
  async getLinkedInMember(companyId: string, clientId: string, signal?: AbortSignal) {
    return apiClient.request<LinkedInMember>({ method: "GET", path: "/integrations/linkedin/member", headers: companyScopeHeaders(companyId, { "x-client-id": clientId, ...linkedInPageHeader(companyId, clientId) }), signal });
  },
  /** POST /integrations/linkedin/member/posts — text post on the connected member's own profile. */
  async postLinkedInMember(companyId: string, clientId: string, text: string) {
    return apiClient.request<{ id: string; url: string }>({ method: "POST", path: "/integrations/linkedin/member/posts", headers: companyScopeHeaders(companyId, { "x-client-id": clientId, ...linkedInPageHeader(companyId, clientId) }), body: { text, confirm: true } });
  },
  async getLinkedInEvents(companyId: string, clientId: string, signal?: AbortSignal) {
    return apiClient.request<LinkedInEventsResponse>({ method: "GET", path: "/integrations/linkedin/events", headers: companyScopeHeaders(companyId, { "x-client-id": clientId, ...linkedInPageHeader(companyId, clientId) }), signal });
  },
  async getLinkedInAudiences(companyId: string, clientId: string, signal?: AbortSignal) {
    return apiClient.request<LinkedInAudiencesResponse>({ method: "GET", path: "/integrations/linkedin/audiences", headers: companyScopeHeaders(companyId, { "x-client-id": clientId, ...linkedInPageHeader(companyId, clientId) }), signal });
  },
  async createLinkedInAudience(companyId: string, clientId: string, body: { accountId: string; name: string; description?: string }) {
    return apiClient.request<{ id: string | null; name: string; accountId: string }>({ method: "POST", path: "/integrations/linkedin/audiences", headers: companyScopeHeaders(companyId, { "x-client-id": clientId, ...linkedInPageHeader(companyId, clientId) }), body: { ...body, confirm: true } });
  },
  async addLinkedInAudienceMembers(companyId: string, clientId: string, segmentId: string, body: { accountId: string; source: "leads" | "contacts" | "all" }) {
    return apiClient.request<{ segmentId: string; sent: number; crmRecords: number; invalidOrDuplicate: number }>({ method: "POST", path: `/integrations/linkedin/audiences/${encodeURIComponent(segmentId)}/members`, headers: companyScopeHeaders(companyId, { "x-client-id": clientId, ...linkedInPageHeader(companyId, clientId) }), body: { ...body, confirm: true } });
  },
  async getLinkedInConversions(companyId: string, clientId: string, signal?: AbortSignal) {
    return apiClient.request<LinkedInConversionsResponse>({ method: "GET", path: "/integrations/linkedin/conversions", headers: companyScopeHeaders(companyId, { "x-client-id": clientId, ...linkedInPageHeader(companyId, clientId) }), signal });
  },
  async createLinkedInConversionRule(companyId: string, clientId: string, body: { accountId: string; name: string; type: LinkedInConversionType }) {
    return apiClient.request<{ id: string | null; name: string }>({ method: "POST", path: "/integrations/linkedin/conversions", headers: companyScopeHeaders(companyId, { "x-client-id": clientId, ...linkedInPageHeader(companyId, clientId) }), body: { ...body, confirm: true } });
  },
  async sendLinkedInConversion(companyId: string, clientId: string, ruleId: string, body: { accountId: string; email?: string; crmEntityId?: string; happenedAt?: string; amount?: number }) {
    return apiClient.request<{ ruleId: string; eventId: string; sentAt: string }>({ method: "POST", path: `/integrations/linkedin/conversions/${encodeURIComponent(ruleId)}/events`, headers: companyScopeHeaders(companyId, { "x-client-id": clientId, ...linkedInPageHeader(companyId, clientId) }), body: { ...body, confirm: true } });
  },

  async getLinkedInDashboard(
    companyId: string,
    clientId: string,
    signal?: AbortSignal,
  ): Promise<LinkedInDashboardResponse> {
    return apiClient.request<LinkedInDashboardResponse>({
      method: "GET",
      path: "/integrations/linkedin/dashboard",
      headers: companyScopeHeaders(companyId, { "x-client-id": clientId, ...linkedInPageHeader(companyId, clientId) }),
      signal,
    });
  },
  /**
   * GET /integrations/registry
   * Business Purpose: The providers this deployment can actually connect.
   * Auth: @AccountRoute() — any fully authenticated session.
   */
  async getRegistry(signal?: AbortSignal): Promise<BackendOAuthProvider[]> {
    return apiClient.request<BackendOAuthProvider[]>({
      method: "GET",
      path: "/integrations/registry",
      signal,
    });
  },

  /**
   * POST /integrations/oauth/init
   * Business Purpose: Start connecting a provider login to the caller's Company.
   * Auth: @CompanyContextRoute() (x-company-id verified against ACTIVE Company)
   * Capability: integrations:write (OWNER, ADMIN).
   *
   * Response: { authUrl: string } — Provider authorization URL with state & PKCE challenge.
   */
  async initOAuth(
    companyId: string,
    provider: BackendOAuthProvider,
    signal?: AbortSignal,
  ): Promise<OAuthInitResponse> {
    return apiClient.request<OAuthInitResponse>({
      method: "POST",
      path: "/integrations/oauth/init",
      headers: companyScopeHeaders(companyId),
      body: { provider } satisfies OAuthInitPayload,
      signal,
      skipSessionExpiry: false,
    });
  },

  /**
   * GET /integrations/:id/resources (TASK-10)
   * Business Purpose: Discover external resources reachable by this connection (Facebook Pages, GBP locations, etc.).
   * Auth: @CompanyContextRoute() + integrations:read
   */
  async discoverResources(
    companyId: string,
    integrationId: string,
    signal?: AbortSignal,
  ): Promise<DiscoveredResource[]> {
    return apiClient.request<DiscoveredResource[]>({
      method: "GET",
      path: `/integrations/${encodeURIComponent(integrationId)}/resources`,
      headers: companyScopeHeaders(companyId),
      signal,
    });
  },

  /**
   * POST /integrations/:id/map (TASK-10)
   * Business Purpose: Map a discovered external resource to a specific Client of this Company.
   * Auth: @CompanyContextRoute() + integrations:write (OWNER, ADMIN)
   */
  async mapResource(
    companyId: string,
    integrationId: string,
    payload: MapResourcePayload,
    signal?: AbortSignal,
  ): Promise<ResourceMappingResponse> {
    return apiClient.request<ResourceMappingResponse>({
      method: "POST",
      path: `/integrations/${encodeURIComponent(integrationId)}/map`,
      headers: companyScopeHeaders(companyId),
      body: payload,
      signal,
    });
  },

  async initLinkedInCommunityOAuth(companyId: string, signal?: AbortSignal): Promise<OAuthInitResponse> {
    return apiClient.request<OAuthInitResponse>({
      method: "POST",
      path: "/integrations/oauth/init",
      headers: companyScopeHeaders(companyId),
      body: { provider: "LINKEDIN", app: "community" },
      signal,
      skipSessionExpiry: false,
    });
  },

  /** DELETE /integrations/LINKEDIN?app=community: removes only the Community Management connection; its pages move back to the member login. */
  async disconnectLinkedInCommunity(companyId: string, signal?: AbortSignal): Promise<{ disconnected: number }> {
    return apiClient.request<{ disconnected: number }>({
      method: "DELETE",
      path: "/integrations/LINKEDIN",
      query: { app: "community" },
      headers: companyScopeHeaders(companyId),
      signal,
    });
  },

  async disconnectProvider(
    companyId: string,
    provider: BackendOAuthProvider,
    signal?: AbortSignal,
  ): Promise<{ disconnected: number }> {
    return apiClient.request<{ disconnected: number }>({
      method: "DELETE",
      path: `/integrations/${encodeURIComponent(provider)}`,
      headers: companyScopeHeaders(companyId),
      signal,
    });
  },

  /**
   * GET /integrations/overview (Phase A3)
   * Consolidated read-only channel overview for the Client named by x-client-id (Company via x-company-id).
   * Auth: @CompanyContextRoute({ client: 'required' }) + integrations:read
   */
  async getOverview(
    companyId: string,
    clientId: string,
    signal?: AbortSignal,
  ): Promise<ClientChannelOverview> {
    return apiClient.request<ClientChannelOverview>({
      method: "GET",
      path: "/integrations/overview",
      headers: companyScopeHeaders(companyId, { "x-client-id": clientId }),
      signal,
    });
  },
};
