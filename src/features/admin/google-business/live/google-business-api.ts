import { apiClient } from "@/lib/api/client";
import { companyScopeHeaders } from "@/lib/api/company-scope";
import { getStoredClientId, getStoredCompanyId } from "@/lib/api/tenancy-storage";
import { integrationsApi } from "@/features/admin/integrations/live/integrations-api";
import type {
  Location,
  LocationProfile,
  OpenState,
  RegularHours,
  Review,
  StarRating,
  TimePeriod,
} from "../types";

/* ── Backend contract (GoogleBusinessController + GoogleBusinessService) ── */

export interface GbpProfileResponse {
  resourceMappingId: string;
  externalResourceId: string;
  providerLocationId: string;
  title: string | null;
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

export interface GbpMappedLocation {
  mappingId: string;
  externalResourceId: string;
}

export interface GbpScope {
  companyId: string;
  clientId: string;
  locations: GbpMappedLocation[];
  connected: boolean;
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

  const value: GbpScope = { companyId, clientId, locations, connected };
  scopeCache = { key: cacheKey, at: Date.now(), value };
  return value;
}

function headers(scope: GbpScope, extra: Record<string, string> = {}) {
  return companyScopeHeaders(scope.companyId, { "x-client-id": scope.clientId, ...extra });
}

async function requireMapping(scope: GbpScope, externalResourceId: string): Promise<GbpMappedLocation> {
  const found = scope.locations.find((l) => l.externalResourceId === externalResourceId);
  if (found) return found;
  const fresh = await getGbpScope(true);
  const again = fresh.locations.find((l) => l.externalResourceId === externalResourceId);
  if (again) return again;
  throw new GbpScopeError("This Google Business location is not mapped for the selected Client.");
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
      path: `/integrations/google-business/locations/${encodeURIComponent(externalResourceId)}/profile`,
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
      path: `/integrations/google-business/locations/${encodeURIComponent(externalResourceId)}/reviews`,
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
      path: `/integrations/google-business/locations/${encodeURIComponent(externalResourceId)}/summary`,
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
      path: `/integrations/google-business/locations/${encodeURIComponent(mapping.externalResourceId)}/reviews/${encodeURIComponent(reviewId)}/reply`,
      headers: headers(scope),
      body: { comment },
      signal,
    });
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

/**
 * Google has shipped both `{open:{day,hours,minutes}}` and
 * `{openDay,openHourTime:{hours,minutes}}` shapes for `regularHours.periods`.
 */
function mapPeriod(period: Record<string, any> | undefined): TimePeriod | null {
  if (!period) return null;
  const open = period.open ?? period.openHourTime;
  const close = period.close ?? period.closeHourTime;
  if (!open) return null;
  const day = toWeekdayIndex(period.openDay ?? open.day);
  return { day, open: toClockTime(open), close: close ? toClockTime(close) : "23:59" };
}

export function mapRegularHours(raw: Record<string, unknown> | null): RegularHours {
  const periods = Array.isArray(raw?.periods) ? (raw.periods as Array<Record<string, any>>) : [];
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

function mapCategories(raw: Record<string, unknown> | null): { primary: string; additional: string[] } {
  const id = (value: unknown): string => (typeof value === "string" ? value : "");
  const primary = raw?.primary && typeof raw.primary === "object" ? id((raw.primary as Record<string, unknown>).categoryId) : "";
  const additional = Array.isArray(raw?.additional)
    ? (raw.additional as Array<Record<string, unknown>>).map((c) => id(c.categoryId)).filter(Boolean)
    : [];
  return { primary, additional };
}

export function mapProfileBody(body: GbpProfileResponse): LocationProfile {
  const phones = body.phoneNumbers ?? {};
  const categories = mapCategories(body.categories);
  const phone = typeof phones.primaryPhone === "string" ? phones.primaryPhone : "";

  return {
    title: body.title ?? "",
    description: "",
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
  return "closed_temporarily";
}

export interface LocationSummaryLike {
  averageRating: number | null;
  recentReviewCount: number;
}

export function toLocation(input: {
  profile: GbpProfileResponse;
  summary?: LocationSummaryLike;
  connected: boolean;
  now?: string;
}): Location {
  const { profile, summary, connected } = input;
  const now = input.now ?? new Date().toISOString();
  const locationId = profile.externalResourceId;

  return {
    name: `locations/${locationId}`,
    locationId,
    storeCode: "",
    placeId: "",
    mapsUri: "",
    newReviewUri: "",
    profile: mapProfileBody(profile),
    verification: connected ? "verified" : "pending",
    openState: toOpenState(profile.openInfo),
    rating: summary?.averageRating ?? null,
    reviewCount: summary?.recentReviewCount ?? 0,
    photoCount: 0,
    sync: { state: "synced", lastSyncedAt: now },
    labels: [],
    managed: true,
  };
}

export function toReview(item: BackendReview, locationId: string, now = new Date().toISOString()): Review | null {
  const starRating = toStarRating(item.starRating);
  if (!starRating) return null;

  return {
    name: `locations/${locationId}/reviews/${item.id}`,
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
