import { apiClient } from "@/lib/api/client";
import { companyScopeHeaders } from "@/lib/api/company-scope";
import { getStoredClientId, getStoredCompanyId } from "@/lib/api/tenancy-storage";
import { integrationsApi } from "@/features/admin/integrations/live/integrations-api";
import { markGbpReturn } from "./gbp-return";
import type {
  Category,
  CtaType,
  DailyMetricPoint,
  Location,
  LocationProfile,
  MediaCategory,
  MediaItem,
  OpenState,
  PerformanceMetric,
  Post,
  PostState,
  RegularHours,
  Review,
  SearchKeyword,
  StarRating,
  TimePeriod,
} from "../types";

/* ── Backend contract (GoogleBusinessController + GoogleBusinessService) ── */

export interface GbpProfileResponse {
  resourceMappingId: string;
  externalResourceId: string;
  providerLocationId: string;
  title: string | null;
  description?: string | null;
  address: Record<string, unknown> | null;
  phoneNumbers: Record<string, unknown> | null;
  websiteUri: string | null;
  categories: Record<string, unknown> | null;
  regularHours: Record<string, unknown> | null;
  openInfo: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
}

export type BackendStarRating = "ONE" | "TWO" | "THREE" | "FOUR" | "FIVE" | "UNRATED" | null;

export interface BackendReview {
  id: string;
  starRating: BackendStarRating;
  reviewer: { displayName: string | null; profilePhotoUrl: string | null };
  comment: string | null;
  createTime: string | null;
  updateTime: string | null;
  reply: { comment: string | null; updateTime: string | null } | null;
}

export interface GbpReviewsResponse {
  resourceMappingId: string;
  externalResourceId: string;
  items: BackendReview[];
  nextPageToken: string | null;
}

export interface GbpSummaryResponse {
  resourceMappingId: string;
  title: string | null;
  recentReviewCount: number;
  averageRating: number | null;
  unrepliedReviewCount: number;
  nextPageToken: string | null;
}

export interface GbpReplyResponse {
  reviewId: string;
  reply: { comment: string | null; updateTime: string | null };
}

export interface GbpDeleteResponse {
  deleted: true;
}

export interface BackendPost {
  id: string;
  topicType: string | null;
  state: string | null;
  summary: string | null;
  languageCode: string | null;
  callToAction: { actionType: string | null; url: string | null } | null;
  event: { title: string | null; startDate: string | null; startTime: string | null; endDate: string | null; endTime: string | null } | null;
  offer: { couponCode: string | null; redeemOnlineUrl: string | null; termsConditions: string | null } | null;
  mediaUrls: string[];
  searchUrl: string | null;
  createTime: string | null;
  updateTime: string | null;
}

export interface GbpPostsResponse {
  resourceMappingId: string;
  externalResourceId: string;
  items: BackendPost[];
  nextPageToken: string | null;
}

export interface BackendMedia {
  id: string;
  format: string | null;
  category: string | null;
  googleUrl: string | null;
  thumbnailUrl: string | null;
  createTime: string | null;
  viewCount: number | null;
  widthPixels: number | null;
  heightPixels: number | null;
}

export interface GbpMediaResponse {
  resourceMappingId: string;
  externalResourceId: string;
  items: BackendMedia[];
  totalCount: number | null;
  nextPageToken: string | null;
}

export interface GbpPerformanceResponse {
  resourceMappingId: string;
  externalResourceId: string;
  startDate: string;
  endDate: string;
  metrics: string[];
  hasData: boolean;
  series: { date: string; values: Record<string, number> }[];
}

export interface GbpKeywordsResponse {
  resourceMappingId: string;
  externalResourceId: string;
  startMonth: string;
  endMonth: string;
  items: { query: string; impressions: number; isThreshold: boolean }[];
  nextPageToken: string | null;
}

export interface GbpCreatePostInput {
  summary: string;
  topicType?: "STANDARD" | "EVENT" | "OFFER";
  callToAction?: { actionType: string; url?: string };
  event?: { title: string; startDate: string; startTime?: string; endDate: string; endTime?: string };
  offer?: { couponCode?: string; redeemOnlineUrl?: string; termsConditions?: string };
  photoUrl?: string;
}

export interface GbpProfileUpdateInput {
  title?: string;
  description?: string;
  websiteUri?: string;
  primaryPhone?: string;
  additionalPhones?: string[];
  regularHours?: { day: string; open: string; close: string }[];
}

export interface GbpMappedLocation {
  mappingId: string;
  externalResourceId: string;
}

export interface GbpScope {
  companyId: string;
  clientId: string;
  locations: GbpMappedLocation[];
  connected: boolean;
  /** The Company's Google Business login, when there is one (even before any location is linked). */
  integrationId: string | null;
  /** The connected Google login, from the integrations overview. */
  accountName: string | null;
  accountEmail: string | null;
}

/** Thrown when no Company/Client is selected or no GBP location is mapped yet. */
export class GbpScopeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GbpScopeError";
  }
}

const OVERVIEW_TTL_MS = 15_000;
let scopeCache: { key: string; at: number; value: GbpScope } | null = null;

export function resetGbpScopeCache(): void {
  scopeCache = null;
}

/**
 * Resolves the active Company/Client and the Google Business locations mapped
 * for that Client (`GET /integrations/overview` → GOOGLE_BUSINESS.resources).
 */
export async function getGbpScope(force = false, signal?: AbortSignal): Promise<GbpScope> {
  const companyId = getStoredCompanyId();
  const clientId = getStoredClientId();
  if (!companyId || !clientId) {
    throw new GbpScopeError("Select a Company and Client to load Google Business data.");
  }

  const cacheKey = `${companyId}:${clientId}`;
  if (!force && scopeCache && scopeCache.key === cacheKey && Date.now() - scopeCache.at < OVERVIEW_TTL_MS) {
    return scopeCache.value;
  }

  const overview = await integrationsApi.getOverview(companyId, clientId, signal);
  const provider = overview.providers.find((p) => p.provider === "GOOGLE_BUSINESS");
  const locations = (provider?.resources ?? [])
    .filter((r) => r.resourceType === "GOOGLE_BUSINESS_LOCATION")
    .map((r) => ({ mappingId: r.mappingId, externalResourceId: r.externalResourceId }));

  const connected =
    !!provider &&
    provider.status !== "NOT_CONNECTED" &&
    provider.health !== "revoked" &&
    provider.health !== "expired" &&
    provider.health !== "error";

  const login = provider?.connections[0];
  const value: GbpScope = { companyId, clientId, locations, connected, integrationId: provider?.integrationId ?? login?.integrationId ?? null, accountName: login?.accountName ?? null, accountEmail: login?.accountEmail ?? null };
  scopeCache = { key: cacheKey, at: Date.now(), value };
  return value;
}

function headers(scope: GbpScope, extra: Record<string, string> = {}) {
  return companyScopeHeaders(scope.companyId, { "x-client-id": scope.clientId, ...extra });
}

/** The backend addresses a location by its mapping id (a UUID), not by the Google resource name. */
function mappingOf(scope: GbpScope, externalResourceId: string): GbpMappedLocation {
  const found = scope.locations.find((l) => l.externalResourceId === externalResourceId);
  if (!found) throw new GbpScopeError("This Google Business location is not mapped for the selected Client.");
  return found;
}

const locationBase = (mapping: GbpMappedLocation) => `/integrations/google-business/locations/${encodeURIComponent(mapping.mappingId)}`;

async function requireMapping(scope: GbpScope, externalResourceId: string): Promise<GbpMappedLocation> {
  const found = scope.locations.find((l) => l.externalResourceId === externalResourceId);
  if (found) return found;
  const fresh = await getGbpScope(true);
  const again = fresh.locations.find((l) => l.externalResourceId === externalResourceId);
  if (again) return again;
  throw new GbpScopeError("This Google Business location is not mapped for the selected Client.");
}

export interface GbpLocationChoice {
  /** locations/{id} */
  id: string;
  name: string;
}

/** Starts the Google sign-in for the Business Profile permission and returns Google's consent URL (the caller navigates to it). */
export async function startGoogleBusinessConnect(signal?: AbortSignal): Promise<string> {
  const companyId = getStoredCompanyId();
  if (!companyId) throw new GbpScopeError("Select a Company first.");
  const { authUrl } = await integrationsApi.initOAuth(companyId, "GOOGLE_BUSINESS", signal);
  markGbpReturn();
  return authUrl;
}

/** The locations this Google login can manage (asks Google). */
export async function discoverGoogleLocations(integrationId: string, signal?: AbortSignal): Promise<GbpLocationChoice[]> {
  const companyId = getStoredCompanyId();
  if (!companyId) throw new GbpScopeError("Select a Company first.");
  const resources = await integrationsApi.discoverResources(companyId, integrationId, signal);
  return resources.filter((r) => r.resourceType === "GOOGLE_BUSINESS_LOCATION").map((r) => ({ id: r.externalResourceId, name: r.name }));
}

/** Links the chosen locations to the active Client. */
export async function linkGoogleLocations(integrationId: string, locationIds: string[]): Promise<void> {
  const companyId = getStoredCompanyId();
  const clientId = getStoredClientId();
  if (!companyId || !clientId) throw new GbpScopeError("Select a Company and Client first.");
  for (const externalResourceId of locationIds) {
    await integrationsApi.mapResource(companyId, integrationId, { clientId, externalResourceId, resourceType: "GOOGLE_BUSINESS_LOCATION" });
  }
  resetGbpScopeCache();
}

export const googleBusinessApi = {
  /** GET /integrations/google-business/locations/:resourceId/profile */
  async getProfile(
    scope: GbpScope,
    externalResourceId: string,
    signal?: AbortSignal,
  ): Promise<GbpProfileResponse> {
    return apiClient.request<GbpProfileResponse>({
      method: "GET",
      path: `${locationBase(mappingOf(scope, externalResourceId))}/profile`,
      headers: headers(scope),
      signal,
    });
  },

  /** GET /integrations/google-business/locations/:resourceId/reviews */
  async getReviews(
    scope: GbpScope,
    externalResourceId: string,
    query?: { pageSize?: number; pageToken?: string },
    signal?: AbortSignal,
  ): Promise<GbpReviewsResponse> {
    const q: Record<string, string | number | undefined> = {};
    if (query?.pageSize) q.pageSize = query.pageSize;
    if (query?.pageToken) q.pageToken = query.pageToken;

    return apiClient.request<GbpReviewsResponse>({
      method: "GET",
      path: `${locationBase(mappingOf(scope, externalResourceId))}/reviews`,
      headers: headers(scope),
      query: q,
      signal,
    });
  },

  /** GET /integrations/google-business/locations/:resourceId/summary */
  async getSummary(
    scope: GbpScope,
    externalResourceId: string,
    signal?: AbortSignal,
  ): Promise<GbpSummaryResponse> {
    return apiClient.request<GbpSummaryResponse>({
      method: "GET",
      path: `${locationBase(mappingOf(scope, externalResourceId))}/summary`,
      headers: headers(scope),
      signal,
    });
  },

  /** PUT /integrations/google-business/locations/:resourceId/reviews/:reviewId/reply */
  async replyToReview(
    externalResourceId: string,
    reviewId: string,
    comment: string,
    signal?: AbortSignal,
  ): Promise<GbpReplyResponse> {
    const scope = await getGbpScope();
    const mapping = await requireMapping(scope, externalResourceId);
    return apiClient.request<GbpReplyResponse>({
      method: "PUT",
      path: `${locationBase(mapping)}/reviews/${encodeURIComponent(reviewId)}/reply`,
      headers: headers(scope),
      body: { comment },
      signal,
    });
  },

  /** DELETE .../reviews/:reviewId/reply */
  async deleteReviewReply(externalResourceId: string, reviewId: string, signal?: AbortSignal): Promise<GbpDeleteResponse> {
    const scope = await getGbpScope();
    const mapping = await requireMapping(scope, externalResourceId);
    return apiClient.request<GbpDeleteResponse>({
      method: "DELETE",
      path: `${locationBase(mapping)}/reviews/${encodeURIComponent(reviewId)}/reply`,
      headers: headers(scope),
      signal,
    });
  },

  /** GET .../posts */
  async getPosts(scope: GbpScope, externalResourceId: string, query?: { pageSize?: number; pageToken?: string }, signal?: AbortSignal): Promise<GbpPostsResponse> {
    return apiClient.request<GbpPostsResponse>({
      method: "GET",
      path: `${locationBase(mappingOf(scope, externalResourceId))}/posts`,
      headers: headers(scope),
      query: { pageSize: query?.pageSize, pageToken: query?.pageToken },
      signal,
    });
  },

  /** POST .../posts - publishes on Google immediately. */
  async createPost(externalResourceId: string, input: GbpCreatePostInput, signal?: AbortSignal): Promise<{ post: BackendPost }> {
    const scope = await getGbpScope();
    const mapping = await requireMapping(scope, externalResourceId);
    return apiClient.request<{ post: BackendPost }>({ method: "POST", path: `${locationBase(mapping)}/posts`, headers: headers(scope), body: input, signal });
  },

  /** DELETE .../posts/:postId */
  async deletePost(externalResourceId: string, postId: string, signal?: AbortSignal): Promise<GbpDeleteResponse> {
    const scope = await getGbpScope();
    const mapping = await requireMapping(scope, externalResourceId);
    return apiClient.request<GbpDeleteResponse>({ method: "DELETE", path: `${locationBase(mapping)}/posts/${encodeURIComponent(postId)}`, headers: headers(scope), signal });
  },

  /** GET .../media */
  async getMedia(scope: GbpScope, externalResourceId: string, query?: { pageSize?: number; pageToken?: string }, signal?: AbortSignal): Promise<GbpMediaResponse> {
    return apiClient.request<GbpMediaResponse>({
      method: "GET",
      path: `${locationBase(mappingOf(scope, externalResourceId))}/media`,
      headers: headers(scope),
      query: { pageSize: query?.pageSize, pageToken: query?.pageToken },
      signal,
    });
  },

  /** POST .../media - Google fetches the photo from a public https URL. */
  async addMedia(externalResourceId: string, input: { sourceUrl: string; category: string; format?: "PHOTO" | "VIDEO" }, signal?: AbortSignal): Promise<{ item: BackendMedia }> {
    const scope = await getGbpScope();
    const mapping = await requireMapping(scope, externalResourceId);
    return apiClient.request<{ item: BackendMedia }>({ method: "POST", path: `${locationBase(mapping)}/media`, headers: headers(scope), body: input, signal });
  },

  /** DELETE .../media/:mediaId */
  async deleteMedia(externalResourceId: string, mediaId: string, signal?: AbortSignal): Promise<GbpDeleteResponse> {
    const scope = await getGbpScope();
    const mapping = await requireMapping(scope, externalResourceId);
    return apiClient.request<GbpDeleteResponse>({ method: "DELETE", path: `${locationBase(mapping)}/media/${encodeURIComponent(mediaId)}`, headers: headers(scope), signal });
  },

  /** GET .../performance?startDate&endDate (Business Profile Performance API, daily metrics). */
  async getPerformance(scope: GbpScope, externalResourceId: string, range: { startDate: string; endDate: string }, signal?: AbortSignal): Promise<GbpPerformanceResponse> {
    return apiClient.request<GbpPerformanceResponse>({
      method: "GET",
      path: `${locationBase(mappingOf(scope, externalResourceId))}/performance`,
      headers: headers(scope),
      query: { startDate: range.startDate, endDate: range.endDate },
      signal,
    });
  },

  /** GET .../search-keywords?startMonth&endMonth */
  async getSearchKeywords(scope: GbpScope, externalResourceId: string, range: { startMonth: string; endMonth: string }, signal?: AbortSignal): Promise<GbpKeywordsResponse> {
    return apiClient.request<GbpKeywordsResponse>({
      method: "GET",
      path: `${locationBase(mappingOf(scope, externalResourceId))}/search-keywords`,
      headers: headers(scope),
      query: { startMonth: range.startMonth, endMonth: range.endMonth, pageSize: 100 },
      signal,
    });
  },

  /** PATCH .../profile - only the fields sent change; the answer is the profile Google now holds. */
  async updateProfile(externalResourceId: string, input: GbpProfileUpdateInput, signal?: AbortSignal): Promise<GbpProfileResponse> {
    const scope = await getGbpScope();
    const mapping = await requireMapping(scope, externalResourceId);
    return apiClient.request<GbpProfileResponse>({ method: "PATCH", path: `${locationBase(mapping)}/profile`, headers: headers(scope), body: input, signal });
  },
};

/* ── Mapping helpers: Google payloads → workspace view models ── */

const STAR_TO_NUMBER: Record<string, StarRating> = { ONE: 1, TWO: 2, THREE: 3, FOUR: 4, FIVE: 5 };

export function toStarRating(value: BackendStarRating): StarRating | null {
  return value ? STAR_TO_NUMBER[value] ?? null : null;
}

const pad = (n: number | undefined) => String(n ?? 0).padStart(2, "0");

function toClockTime(time: { hours?: number; minutes?: number } | undefined): string {
  return `${pad(time?.hours)}:${pad(time?.minutes)}`;
}

const WEEKDAY_INDEX: Record<string, number> = {
  MONDAY: 0, TUESDAY: 1, WEDNESDAY: 2, THURSDAY: 3, FRIDAY: 4, SATURDAY: 5, SUNDAY: 6,
};

/** Google numbers days Sunday-first; the workspace numbers them Monday-first. */
function toWeekdayIndex(value: unknown): number {
  if (typeof value === "string") {
    const named = WEEKDAY_INDEX[value.toUpperCase()];
    if (named !== undefined) return named;
    const parsed = Number(value);
    if (!Number.isNaN(parsed)) return toWeekdayIndex(parsed);
    return 0;
  }
  if (typeof value === "number" && Number.isFinite(value)) return (Math.trunc(value) + 6) % 7;
  return 0;
}

interface GoogleClockTime {
  hours?: number;
  minutes?: number;
  day?: number | string;
}

interface GooglePeriod {
  day?: number | string;
  openDay?: number | string;
  open?: GoogleClockTime;
  close?: GoogleClockTime;
  openHourTime?: GoogleClockTime;
  closeHourTime?: GoogleClockTime;
  /** Business Information API v1 shape. */
  openTime?: GoogleClockTime;
  closeTime?: GoogleClockTime;
}

/**
 * Google has shipped both `{open:{day,hours,minutes}}` and
 * `{openDay,openHourTime:{hours,minutes}}` shapes for `regularHours.periods`.
 */
function mapPeriod(period: GooglePeriod | undefined): TimePeriod | null {
  if (!period) return null;
  const open = period.openTime ?? period.open ?? period.openHourTime;
  const close = period.closeTime ?? period.close ?? period.closeHourTime;
  if (!open) return null;
  const day = toWeekdayIndex(period.openDay ?? open.day);
  // Google writes a close at midnight as 24:00; the workspace's clock stops at 23:59.
  const closeText = close ? (close.hours === 24 ? "23:59" : toClockTime(close)) : "23:59";
  return { day, open: toClockTime(open), close: closeText };
}

export function mapRegularHours(raw: Record<string, unknown> | null): RegularHours {
  const periods = Array.isArray(raw?.periods) ? (raw.periods as GooglePeriod[]) : [];
  const mapped = periods.map(mapPeriod).filter((p): p is TimePeriod => p !== null);
  return { periods: mapped, open24: [] };
}

function mapAddress(raw: Record<string, unknown> | null): LocationProfile["address"] {
  const lines = Array.isArray(raw?.addressLines) ? (raw.addressLines as unknown[]).filter((l): l is string => typeof l === "string") : [];
  return {
    addressLines: lines,
    locality: typeof raw?.locality === "string" ? raw.locality : "",
    administrativeArea: typeof raw?.administrativeArea === "string" ? raw.administrativeArea : "",
    postalCode: typeof raw?.postalCode === "string" ? raw.postalCode : "",
    regionCode: typeof raw?.regionCode === "string" ? raw.regionCode : "",
  };
}

interface GoogleCategory {
  id: string;
  displayName: string;
}

/** Business Information API v1: `primaryCategory` and `additionalCategories`, each `{ name: "categories/gcid:...", displayName }`. */
function readCategory(value: unknown): GoogleCategory | null {
  if (!value || typeof value !== "object") return null;
  const item = value as Record<string, unknown>;
  const id = typeof item.name === "string" ? item.name : typeof item.categoryId === "string" ? item.categoryId : "";
  if (!id) return null;
  return { id, displayName: typeof item.displayName === "string" && item.displayName ? item.displayName : id.replace(/^categories\/(gcid:)?/, "").replace(/_/g, " ") };
}

function mapCategories(raw: Record<string, unknown> | null): { primary: string; additional: string[]; all: GoogleCategory[] } {
  const primary = readCategory(raw?.primaryCategory ?? raw?.primary);
  const extra = Array.isArray(raw?.additionalCategories ?? raw?.additional) ? ((raw?.additionalCategories ?? raw?.additional) as unknown[]).map(readCategory).filter((c): c is GoogleCategory => c !== null) : [];
  return { primary: primary?.id ?? "", additional: extra.map((c) => c.id), all: [...(primary ? [primary] : []), ...extra] };
}

/** The categories the location really has, for the profile's category pickers (the full Google category list is not part of this integration). */
export function categoriesOf(bodies: GbpProfileResponse[]): Category[] {
  const seen = new Map<string, Category>();
  for (const body of bodies) for (const c of mapCategories(body.categories).all) if (!seen.has(c.id)) seen.set(c.id, { categoryId: c.id, displayName: c.displayName });
  return [...seen.values()];
}

export function mapProfileBody(body: GbpProfileResponse): LocationProfile {
  const phones = body.phoneNumbers ?? {};
  const categories = mapCategories(body.categories);
  const phone = typeof phones.primaryPhone === "string" ? phones.primaryPhone : "";

  return {
    title: body.title ?? "",
    description: body.description ?? "",
    primaryCategoryId: categories.primary,
    additionalCategoryIds: categories.additional,
    phone,
    additionalPhones: Array.isArray(phones.additionalPhones)
      ? (phones.additionalPhones as unknown[]).filter((p): p is string => typeof p === "string")
      : [],
    website: body.websiteUri ?? "",
    address: mapAddress(body.address),
    serviceArea: null,
    regularHours: mapRegularHours(body.regularHours),
    specialHours: [],
    attributes: {},
    services: [],
    openingDate: null,
  };
}

export function toOpenState(raw: Record<string, unknown> | null): OpenState {
  const status = typeof raw?.status === "string" ? raw.status.toUpperCase() : "";
  if (status === "OPEN") return "open";
  if (status === "CLOSED_PERMANENTLY") return "closed_permanently";
  if (status === "CLOSED_TEMPORARILY") return "closed_temporarily";
  return "open";
}

export interface LocationSummaryLike {
  averageRating: number | null;
  recentReviewCount: number;
}

export function toLocation(input: {
  profile: GbpProfileResponse;
  summary?: LocationSummaryLike;
  connected: boolean;
  photoCount?: number | null;
  now?: string;
}): Location {
  const { profile, summary, connected } = input;
  const now = input.now ?? new Date().toISOString();
  const locationId = profile.externalResourceId;
  const meta = profile.metadata ?? {};
  const text = (value: unknown) => (typeof value === "string" ? value : "");

  return {
    name: locationId,
    locationId,
    storeCode: "",
    placeId: text(meta.placeId),
    mapsUri: text(meta.mapsUri),
    newReviewUri: text(meta.newReviewUri),
    profile: mapProfileBody(profile),
    // Google reports whether the business can be managed with full authority ("voice of merchant"); anything else is not verified yet.
    verification: !connected ? "pending" : meta.duplicateLocation ? "duplicate" : meta.hasVoiceOfMerchant === false ? "pending" : "verified",
    openState: toOpenState(profile.openInfo),
    rating: summary?.averageRating ?? null,
    reviewCount: summary?.recentReviewCount ?? 0,
    photoCount: input.photoCount ?? 0,
    sync: { state: "synced", lastSyncedAt: now },
    labels: [],
    managed: true,
  };
}

export function toReview(item: BackendReview, locationId: string, now = new Date().toISOString()): Review | null {
  const starRating = toStarRating(item.starRating);
  if (!starRating) return null;

  return {
    name: `${locationId}/reviews/${item.id}`,
    reviewId: item.id,
    locationId,
    reviewer: {
      displayName: item.reviewer.displayName || "Google user",
      profilePhotoUrl: item.reviewer.profilePhotoUrl,
      isAnonymous: !item.reviewer.displayName,
    },
    starRating,
    comment: item.comment ?? "",
    createTime: item.createTime ?? now,
    updateTime: item.updateTime ?? item.createTime ?? now,
    reply: item.reply?.comment
      ? { comment: item.reply.comment, updateTime: item.reply.updateTime ?? now, author: "Google" }
      : null,
    policyStatus: null,
    media: [],
  };
}

/* ── Posts, media, performance, keywords ── */

const POST_STATE: Record<string, PostState> = { LIVE: "published", PROCESSING: "publishing", REJECTED: "rejected" };
const CTA_TYPES: readonly CtaType[] = ["BOOK", "ORDER", "SHOP", "LEARN_MORE", "SIGN_UP", "CALL"];

export function toPost(item: BackendPost, locationId: string, now = new Date().toISOString()): Post {
  const actionType = CTA_TYPES.find((t) => t === item.callToAction?.actionType);
  const created = item.createTime ?? now;
  const type: Post["type"] = item.topicType === "EVENT" ? "event" : item.topicType === "OFFER" ? "offer" : actionType ? "cta" : "update";
  const state = POST_STATE[item.state ?? ""] ?? "published";
  return {
    id: item.id,
    locationIds: [locationId],
    type,
    summary: item.summary ?? "",
    media: item.mediaUrls,
    cta: actionType ? { actionType, url: item.callToAction?.url ?? "" } : null,
    event: item.event && item.event.startDate && item.event.endDate ? { title: item.event.title ?? "", startDate: item.event.startDate, endDate: item.event.endDate } : null,
    offer: item.offer ? { couponCode: item.offer.couponCode ?? "", redeemOnlineUrl: item.offer.redeemOnlineUrl ?? "", termsConditions: item.offer.termsConditions ?? "" } : null,
    state,
    scheduledAt: null,
    publishedAt: state === "published" ? created : null,
    createdAt: created,
    createdBy: "Google",
    searchUrl: item.searchUrl,
    metrics: null,
    approvals: [],
    ...(state === "rejected" ? { failureReason: "Google rejected this post." } : {}),
  };
}

const MEDIA_CATEGORY: Record<string, MediaCategory> = { PROFILE: "LOGO", LOGO: "LOGO", COVER: "COVER", EXTERIOR: "EXTERIOR", INTERIOR: "INTERIOR", TEAMS: "TEAM", AT_WORK: "AT_WORK" };

export function toMediaItem(item: BackendMedia, locationId: string, now = new Date().toISOString()): MediaItem {
  const format = item.format === "VIDEO" ? "VIDEO" : "PHOTO";
  const url = item.googleUrl ?? "";
  return {
    name: `${locationId}/media/${item.id}`,
    mediaId: item.id,
    locationId,
    category: format === "VIDEO" ? "VIDEO" : MEDIA_CATEGORY[item.category ?? ""] ?? "ADDITIONAL",
    format,
    sourceUrl: url,
    thumbnailUrl: item.thumbnailUrl ?? url,
    createTime: item.createTime ?? now,
    viewCount: item.viewCount,
    dimensions: item.widthPixels && item.heightPixels ? { widthPx: item.widthPixels, heightPx: item.heightPixels } : null,
    sizeBytes: null,
    state: "live",
    uploadedBy: null,
  };
}

const PERFORMANCE_METRICS: PerformanceMetric[] = [
  "BUSINESS_IMPRESSIONS_DESKTOP_SEARCH",
  "BUSINESS_IMPRESSIONS_MOBILE_SEARCH",
  "BUSINESS_IMPRESSIONS_DESKTOP_MAPS",
  "BUSINESS_IMPRESSIONS_MOBILE_MAPS",
  "CALL_CLICKS",
  "WEBSITE_CLICKS",
  "BUSINESS_DIRECTION_REQUESTS",
  "BUSINESS_BOOKINGS",
];

const DAY_MS = 86_400_000;
export const isoDay = (ms: number) => new Date(ms).toISOString().slice(0, 10);

/**
 * One gapless daily series from `startDate` to `endDate` (the workspace slices windows by position, so every location needs the same days). Google leaves a
 * day out when its count is zero, so an unlisted day inside the range is 0; `endDate` is chosen by the caller as the last day Google reported.
 */
export function toDailySeries(response: GbpPerformanceResponse | null, startDate: string, endDate: string): DailyMetricPoint[] {
  const byDate = new Map((response?.series ?? []).map((point) => [point.date, point.values]));
  const out: DailyMetricPoint[] = [];
  for (let t = Date.parse(`${startDate}T00:00:00Z`); t <= Date.parse(`${endDate}T00:00:00Z`); t += DAY_MS) {
    const date = isoDay(t);
    const reported = byDate.get(date) ?? {};
    out.push({ date, values: Object.fromEntries(PERFORMANCE_METRICS.map((metric) => [metric, reported[metric] ?? 0])) as Record<PerformanceMetric, number> });
  }
  return out;
}

export function lastReportedDay(response: GbpPerformanceResponse | null): string | null {
  const dates = (response?.series ?? []).map((point) => point.date).sort();
  return dates.length ? dates[dates.length - 1]! : null;
}

export function toKeywords(locationId: string, current: GbpKeywordsResponse | null, previous: GbpKeywordsResponse | null): SearchKeyword[] {
  const before = new Map((previous?.items ?? []).map((item) => [item.query, item]));
  return (current?.items ?? []).map((item) => ({
    query: item.query,
    locationId,
    impressions: item.impressions,
    isThreshold: item.isThreshold,
    previousImpressions: before.has(item.query) && !before.get(item.query)!.isThreshold && !item.isThreshold ? before.get(item.query)!.impressions : null,
  }));
}
