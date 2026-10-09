import { apiClient } from "@/lib/api/client";
import { companyScopeHeaders } from "@/lib/api/company-scope";

/**
 * The only caller of the backend's read-only Meta Ads routes
 * (`/integrations/meta-ads/*`). Shapes mirror `meta-ads.normalizers.ts`; a
 * field Meta did not return is `null`, never invented.
 */

export type DatasetState = "live" | "empty" | "permission_required" | "rate_limited" | "unavailable";
export interface Dataset<T> {
  state: DatasetState;
  data: T;
  reason: string | null;
}

export type ApiStatus = "draft" | "in_review" | "scheduled" | "active" | "learning" | "paused" | "completed" | "rejected" | "error" | "archived";
export type ApiPlatform = "facebook" | "instagram" | "messenger" | "audience_network";
export type ApiRanking = "Above average" | "Average" | "Below average";

export interface ApiMetrics {
  spend: number;
  impressions: number;
  reach: number;
  clicks: number;
  leads: number;
}

export interface ApiAdAccount {
  id: string;
  accountId: string | null;
  name: string;
  currency: string | null;
  timezone: string | null;
  status: string | null;
  disableReason: number | null;
  amountSpent: number | null;
  business: string | null;
}

export interface ApiDeliveryIssue {
  level: string | null;
  summary: string;
  message: string | null;
}

export interface ApiCampaign {
  id: string;
  name: string;
  status: ApiStatus;
  objective: string | null;
  buyingType: string | null;
  budgetType: "Daily" | "Lifetime" | null;
  budget: number | null;
  bidStrategy: string | null;
  specialCategory: string[];
  start: string | null;
  end: string | null;
  created: string | null;
  lastEdited: string | null;
  spendCap: number | null;
  effectiveStatus?: string | null;
  issues?: ApiDeliveryIssue[];
  metrics: ApiMetrics;
}

export interface ApiAdSet {
  id: string;
  campaignId: string;
  name: string;
  status: ApiStatus;
  conversionLocation: string | null;
  performanceGoal: string | null;
  attribution: string | null;
  budgetType: "Daily" | "Lifetime" | null;
  budget: number | null;
  start: string | null;
  end: string | null;
  locations: string[];
  ageRange: string | null;
  gender: string;
  languages: string[];
  interests: string[];
  customAudiences: string[];
  exclusions: string[];
  placements: ApiPlatform[];
  pageId: string | null;
  lastEdited: string | null;
  effectiveStatus?: string | null;
  issues?: ApiDeliveryIssue[];
  metrics: ApiMetrics;
}

export interface ApiAd {
  id: string;
  adSetId: string;
  campaignId: string;
  name: string;
  status: ApiStatus;
  format: "Single Image" | "Video" | "Carousel" | "Existing Post" | null;
  creativeId: string | null;
  thumbnailUrl: string | null;
  destination: string | null;
  primaryText: string | null;
  headline: string | null;
  description: string | null;
  cta: string | null;
  pageId: string | null;
  instagramActorId: string | null;
  utm: string | null;
  formId: string | null;
  qualityRanking: ApiRanking | null;
  engagementRanking: ApiRanking | null;
  conversionRanking: ApiRanking | null;
  reviewNote: string | null;
  lastEdited: string | null;
  effectiveStatus?: string | null;
  issues?: ApiDeliveryIssue[];
  metrics: ApiMetrics;
}

export interface ApiCreative {
  id: string;
  name: string | null;
  format: "Single Image" | "Video" | "Carousel" | "Existing Post" | null;
  thumbnailUrl: string | null;
  primaryText: string | null;
  headline: string | null;
  hasVideo: boolean;
}

export interface ApiAudience {
  id: string;
  name: string;
  kind: "custom" | "lookalike" | "saved";
  source: string | null;
  sizeLower: number | null;
  sizeUpper: number | null;
  similarity: number | null;
  country: string | null;
  locations: string[];
  status: "Ready" | "Updating" | "Sync failed" | "Too small";
  lastSync: string | null;
}

export interface ApiForm {
  id: string;
  name: string;
  status: "active" | "archived";
  language: string | null;
  questions: Array<{ id: string; label: string; type: string }>;
  privacyUrl: string | null;
  submissions: number | null;
  created: string | null;
  pageId: string;
  pageName: string;
}

export interface ApiActivity {
  id: string;
  at: string | null;
  user: string | null;
  action: string;
  entityType: "Campaign" | "Ad Set" | "Ad" | "Audience" | "Account";
  entityId: string | null;
  entityLabel: string | null;
  oldValue: string | null;
  newValue: string | null;
}

export interface ApiLead {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  company: string | null;
  campaignId: string | null;
  adSetId: string | null;
  adId: string | null;
  formId: string | null;
  platform: string | null;
  isOrganic: boolean;
  submittedAt: string | null;
  answers: Array<{ question: string; answer: string }>;
}

/** How the backend served a read: just loaded, a recent copy, or an older copy because Meta is throttling. */
export interface ApiFreshness {
  source: "live" | "cache" | "stale";
  ageSeconds: number;
  /** While Meta's throttle holds: seconds until the backend calls Meta again. */
  blockedForSeconds: number | null;
}

export interface ApiSnapshot {
  freshness?: ApiFreshness;
  period: "7d" | "30d" | "90d";
  syncedAt: string;
  account: ApiAdAccount;
  totals: ApiMetrics;
  campaigns: Dataset<ApiCampaign[]>;
  adSets: Dataset<ApiAdSet[]>;
  ads: Dataset<ApiAd[]>;
  creatives: Dataset<ApiCreative[]>;
  audiences: Dataset<ApiAudience[]>;
  forms: Dataset<ApiForm[]>;
  pixels: Dataset<Array<{ id: string; name: string | null; lastFiredAt: string | null }>>;
  activity: Dataset<ApiActivity[]>;
  trend: Dataset<Array<ApiMetrics & { date: string }>>;
  assets: Dataset<Array<{ id: string; name: string; instagram: { id: string; username: string | null } | null }>>;
}

export interface ApiAccountsResponse {
  freshness?: ApiFreshness;
  integrationId: string;
  connectedAs: string | null;
  items: ApiAdAccount[];
}

export interface ApiAdsOverviewAccount {
  id: string;
  name: string;
  currency: string | null;
  status: string | null;
  state: DatasetState;
  reason: string | null;
  metrics: ApiMetrics;
  campaigns: { total: number; active: number };
}

/** Lifetime totals per ad account and overall (light call: no ads, creatives or targeting). */
export interface ApiAdsOverview {
  freshness?: ApiFreshness;
  accounts: ApiAdsOverviewAccount[];
  totals: {
    spendByCurrency: Record<string, number>;
    leads: number;
    impressions: number;
    clicks: number;
    campaigns: number;
    activeCampaigns: number;
    accountsActive: number;
  };
}

export type ApiPeriod = "7d" | "30d" | "90d";

const BASE = "/integrations/meta-ads";

export const metaAdsApi = {
  overview(companyId: string, signal?: AbortSignal, refresh = false): Promise<ApiAdsOverview> {
    return apiClient.request<ApiAdsOverview>({ method: "GET", path: `${BASE}/overview`, query: refresh ? { refresh: "true" } : undefined, headers: companyScopeHeaders(companyId), signal });
  },
  accounts(companyId: string, signal?: AbortSignal, refresh = false): Promise<ApiAccountsResponse> {
    return apiClient.request<ApiAccountsResponse>({ method: "GET", path: `${BASE}/accounts`, query: refresh ? { refresh: "true" } : undefined, headers: companyScopeHeaders(companyId), signal });
  },
  snapshot(companyId: string, adAccountId: string, period: ApiPeriod, signal?: AbortSignal, refresh = false): Promise<ApiSnapshot> {
    return apiClient.request<ApiSnapshot>({ method: "GET", path: `${BASE}/snapshot`, query: { adAccountId, period, ...(refresh ? { refresh: "true" } : {}) }, headers: companyScopeHeaders(companyId), signal });
  },
  leads(companyId: string, signal?: AbortSignal, refresh = false): Promise<{ items: ApiLead[]; partial: boolean }> {
    return apiClient.request<{ items: ApiLead[]; partial: boolean }>({ method: "GET", path: `${BASE}/leads`, query: { limit: 100, ...(refresh ? { refresh: "true" } : {}) }, headers: companyScopeHeaders(companyId), signal });
  },
};
