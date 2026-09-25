/**
 * Pure derivations shared by the pages and covered by the unit tests. Nothing
 * here touches React or the repository, so the same functions can run against
 * live API data later.
 */
import { differenceInDays, parseISO } from "date-fns";
import { METRICS, gbRoutes, type MetricKey, type Period } from "../lib/constants";
import type {
  AttentionIssue,
  AttributeDefinition,
  DailyMetricPoint,
  HealthFactor,
  Location,
  LocationPerformance,
  MediaItem,
  Post,
  PostState,
  ProfileHealth,
  Review,
  SearchKeyword,
  StarRating,
} from "../types";

export const ALL_LOCATIONS = "all";

/* ------------------------------------------------------------------ */
/* Scoping                                                             */
/* ------------------------------------------------------------------ */

export function scopeLocationIds(locations: Location[], selected: string): string[] {
  return selected === ALL_LOCATIONS ? locations.map((l) => l.locationId) : [selected];
}

export function findLocation(locations: Location[], locationId: string): Location | undefined {
  return locations.find((l) => l.locationId === locationId);
}

/* ------------------------------------------------------------------ */
/* Locations                                                           */
/* ------------------------------------------------------------------ */

export interface LocationFilters {
  q: string;
  verification: string;
  status: string;
  sync: string;
  rating: string;
  completion: string;
  sort: string;
}

export function filterLocations(locations: Location[], filters: Partial<LocationFilters>, attributes: AttributeDefinition[]): Location[] {
  const q = (filters.q ?? "").trim().toLowerCase();
  const rows = locations.filter((location) => {
    if (q) {
      const haystack = [location.profile.title, location.storeCode, location.profile.address.locality, ...location.labels].join(" ").toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    if (filters.verification && filters.verification !== "all" && location.verification !== filters.verification) return false;
    if (filters.status && filters.status !== "all" && location.openState !== filters.status) return false;
    if (filters.sync && filters.sync !== "all" && location.sync.state !== filters.sync) return false;
    if (filters.rating && filters.rating !== "all") {
      const min = Number(filters.rating);
      if (location.rating === null || location.rating < min) return false;
    }
    if (filters.completion && filters.completion !== "all") {
      const completion = profileCompletion(location, attributes);
      if (filters.completion === "incomplete" && completion >= 80) return false;
      if (filters.completion === "complete" && completion < 80) return false;
    }
    return true;
  });

  const sort = filters.sort ?? "name";
  return [...rows].sort((a, b) => {
    switch (sort) {
      case "rating":
        return (b.rating ?? -1) - (a.rating ?? -1);
      case "reviews":
        return b.reviewCount - a.reviewCount;
      case "completion":
        return profileCompletion(b, attributes) - profileCompletion(a, attributes);
      case "sync":
        return (b.sync.lastSyncedAt ?? "").localeCompare(a.sync.lastSyncedAt ?? "");
      default:
        return a.profile.title.localeCompare(b.profile.title);
    }
  });
}

/** Share of the profile fields Google exposes that this location actually fills in. */
export function profileCompletion(location: Location, attributes: AttributeDefinition[]): number {
  const p = location.profile;
  const applicable = attributes.filter((a) => !a.readOnly);
  const filledAttributes = applicable.filter((a) => {
    const value = p.attributes[a.attributeId];
    return Array.isArray(value) ? value.length > 0 : value !== undefined && value !== "" && value !== false;
  }).length;

  const checks: boolean[] = [
    Boolean(p.title),
    Boolean(p.primaryCategoryId),
    p.additionalCategoryIds.length > 0,
    Boolean(p.phone),
    Boolean(p.website),
    p.address.addressLines.length > 0 && Boolean(p.address.postalCode),
    p.description.length >= 100,
    hoursAreComplete(location),
    p.specialHours.length > 0,
    filledAttributes >= Math.ceil(applicable.length * 0.4),
    location.photoCount >= 10,
    location.verification === "verified",
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

export function hoursAreComplete(location: Location): boolean {
  const { periods, open24 } = location.profile.regularHours;
  const covered = new Set([...periods.map((p) => p.day), ...open24]);
  // A business may genuinely close on some days; fewer than five covered days
  // is treated as "not filled in" rather than "closed all week".
  return covered.size >= 5;
}

/* ------------------------------------------------------------------ */
/* Reviews                                                             */
/* ------------------------------------------------------------------ */

export type ReviewTab = "all" | "unanswered" | "replied" | "low" | "high" | "policy";

export interface ReviewFilters {
  tab: ReviewTab;
  location: string;
  rating: string;
  date: string;
  q: string;
  sort: string;
}

export function isAnswered(review: Review): boolean {
  return review.reply !== null;
}

export function filterReviews(reviews: Review[], filters: Partial<ReviewFilters>, now = new Date()): Review[] {
  const q = (filters.q ?? "").trim().toLowerCase();
  const tab = filters.tab ?? "all";
  const rows = reviews.filter((review) => {
    if (filters.location && filters.location !== ALL_LOCATIONS && review.locationId !== filters.location) return false;
    if (tab === "unanswered" && isAnswered(review)) return false;
    if (tab === "replied" && !isAnswered(review)) return false;
    if (tab === "low" && review.starRating > 2) return false;
    if (tab === "high" && review.starRating < 4) return false;
    if (tab === "policy" && review.policyStatus === null) return false;
    if (filters.rating && filters.rating !== "all" && review.starRating !== Number(filters.rating)) return false;
    if (filters.date && filters.date !== "all") {
      const reviewDate = parseISO(review.createTime);
      if (reviewDate > now) return false;
      const days = Number(filters.date.replace("d", ""));
      if (differenceInDays(now, reviewDate) > days) return false;
    }
    if (q && !review.comment.toLowerCase().includes(q) && !review.reviewer.displayName.toLowerCase().includes(q)) return false;
    return true;
  });

  const sort = filters.sort ?? "newest";
  return [...rows].sort((a, b) => {
    if (sort === "oldest") return a.createTime.localeCompare(b.createTime);
    if (sort === "lowest") return a.starRating - b.starRating || b.createTime.localeCompare(a.createTime);
    if (sort === "highest") return b.starRating - a.starRating || b.createTime.localeCompare(a.createTime);
    return b.createTime.localeCompare(a.createTime);
  });
}

export function reviewSummary(reviews: Review[]) {
  const total = reviews.length;
  const answered = reviews.filter(isAnswered).length;
  const average = total ? reviews.reduce((sum, r) => sum + r.starRating, 0) / total : null;
  const distribution = [5, 4, 3, 2, 1].map((star) => ({
    star: star as StarRating,
    count: reviews.filter((r) => r.starRating === star).length,
  }));
  return {
    total,
    answered,
    unanswered: total - answered,
    responseRate: total ? Math.round((answered / total) * 100) : null,
    average,
    distribution,
  };
}

/* ------------------------------------------------------------------ */
/* Posts                                                               */
/* ------------------------------------------------------------------ */

export type PostTab = "all" | "draft" | "pending_approval" | "scheduled" | "published" | "failed";

export function filterPosts(posts: Post[], filters: { tab?: string; location?: string; type?: string; q?: string }): Post[] {
  const q = (filters.q ?? "").trim().toLowerCase();
  const tab = filters.tab ?? "all";
  return posts
    .filter((post) => {
      if (filters.location && filters.location !== ALL_LOCATIONS && !post.locationIds.includes(filters.location)) return false;
      if (filters.type && filters.type !== "all" && post.type !== filters.type) return false;
      if (tab === "draft" && post.state !== "draft" && post.state !== "rejected") return false;
      if (tab === "pending_approval" && post.state !== "pending_approval") return false;
      if (tab === "scheduled" && post.state !== "scheduled" && post.state !== "approved") return false;
      if (tab === "published" && post.state !== "published") return false;
      if (tab === "failed" && post.state !== "failed") return false;
      if (q && !post.summary.toLowerCase().includes(q) && !(post.event?.title ?? "").toLowerCase().includes(q)) return false;
      return true;
    })
    .sort((a, b) => (b.publishedAt ?? b.scheduledAt ?? b.createdAt).localeCompare(a.publishedAt ?? a.scheduledAt ?? a.createdAt));
}

export function postCounts(posts: Post[]): Record<PostTab, number> {
  const count = (states: PostState[]) => posts.filter((p) => states.includes(p.state)).length;
  return {
    all: posts.length,
    draft: count(["draft", "rejected"]),
    pending_approval: count(["pending_approval"]),
    scheduled: count(["scheduled", "approved"]),
    published: count(["published"]),
    failed: count(["failed"]),
  };
}

/* ------------------------------------------------------------------ */
/* Media                                                               */
/* ------------------------------------------------------------------ */

export function filterMedia(media: MediaItem[], filters: { category?: string; location?: string; date?: string }, now = new Date()): MediaItem[] {
  return media
    .filter((item) => {
      if (filters.location && filters.location !== ALL_LOCATIONS && item.locationId !== filters.location) return false;
      if (filters.category && filters.category !== "all" && item.category !== filters.category) return false;
      if (filters.date && filters.date !== "all") {
        const days = Number(filters.date.replace("d", ""));
        if (differenceInDays(now, parseISO(item.createTime)) > days) return false;
      }
      return true;
    })
    .sort((a, b) => b.createTime.localeCompare(a.createTime));
}

/* ------------------------------------------------------------------ */
/* Performance                                                         */
/* ------------------------------------------------------------------ */

export function metricValue(point: DailyMetricPoint, metric: MetricKey): number {
  return METRICS[metric].sources.reduce((sum, source) => sum + (point.values[source] ?? 0), 0);
}

export interface MetricSeriesPoint {
  date: string;
  values: Record<MetricKey, number>;
}

/**
 * Slices the stored daily metrics for the chosen locations and window.
 * `offsetDays` shifts the window back for previous-period comparison.
 */
export function buildMetricSeries(performance: LocationPerformance[], locationIds: string[], days: number, offsetDays = 0): MetricSeriesPoint[] {
  const scoped = performance.filter((p) => locationIds.includes(p.locationId));
  if (!scoped.length) return [];
  const length = scoped[0]!.series.length;
  const end = length - offsetDays;
  const start = Math.max(0, end - days);
  const window = scoped[0]!.series.slice(start, end);

  return window.map((point, index) => {
    const values = Object.fromEntries(
      (Object.keys(METRICS) as MetricKey[]).map((metric) => [
        metric,
        scoped.reduce((sum, location) => sum + metricValue(location.series[start + index]!, metric), 0),
      ]),
    ) as Record<MetricKey, number>;
    return { date: point.date, values };
  });
}

export function sumMetric(series: MetricSeriesPoint[], metric: MetricKey): number {
  return series.reduce((sum, point) => sum + point.values[metric], 0);
}

export function periodDays(period: Period): number {
  return period === "7d" ? 7 : period === "90d" ? 90 : 30;
}

/** Bookings only appear when Google actually reports them for the account. */
export function hasBookings(series: MetricSeriesPoint[]): boolean {
  return series.some((point) => point.values.bookings > 0);
}

export function filterKeywords(keywords: SearchKeyword[], locationIds: string[]): SearchKeyword[] {
  return keywords.filter((k) => locationIds.includes(k.locationId)).sort((a, b) => b.impressions - a.impressions);
}

/* ------------------------------------------------------------------ */
/* Internal: profile health                                            */
/* ------------------------------------------------------------------ */

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

export function computeProfileHealth(
  location: Location,
  reviews: Review[],
  media: MediaItem[],
  attributes: AttributeDefinition[],
): ProfileHealth {
  const p = location.profile;
  const locationReviews = reviews.filter((r) => r.locationId === location.locationId);
  const answered = locationReviews.filter(isAnswered).length;
  const responseRate = locationReviews.length ? (answered / locationReviews.length) * 100 : 100;
  const locationMedia = media.filter((m) => m.locationId === location.locationId);
  const applicable = attributes.filter((a) => !a.readOnly);
  const filledAttributes = applicable.filter((a) => {
    const value = p.attributes[a.attributeId];
    return Array.isArray(value) ? value.length > 0 : value !== undefined && value !== "" && value !== false;
  }).length;
  const route = (hash: string) => `${gbRoutes.profile}?location=${location.locationId}#${hash}`;

  const factor = (
    key: string,
    label: string,
    score: number,
    explanation: string,
    action: [string, string] | null,
  ): HealthFactor => ({
    key,
    label,
    score: clamp(score),
    status: score >= 80 ? "good" : score >= 50 ? "warning" : "critical",
    explanation,
    actionLabel: action?.[0] ?? null,
    href: action?.[1] ?? null,
  });

  const factors: HealthFactor[] = [
    factor(
      "business_info",
      "Business information",
      (Number(Boolean(p.title)) + Number(p.description.length >= 100) + Number(Boolean(p.primaryCategoryId)) + Number(p.additionalCategoryIds.length > 0)) * 25,
      p.description.length >= 100 ? "Name, description and categories are filled in." : "The description is short or missing, so Google has little context about this location.",
      p.description.length >= 100 ? null : ["Add description", route("basic")],
    ),
    factor(
      "contact",
      "Contact details",
      (Number(Boolean(p.phone)) + Number(Boolean(p.website))) * 50,
      Boolean(p.phone) && Boolean(p.website) ? "Phone and website are set." : !p.website ? "No website is set, which removes the website button from your profile." : "No phone number is set.",
      Boolean(p.phone) && Boolean(p.website) ? null : ["Add contact details", route("contact")],
    ),
    factor(
      "hours",
      "Business hours",
      hoursAreComplete(location) ? 100 : 40,
      hoursAreComplete(location) ? "Opening hours are set for the week." : "Opening hours are missing for several days, so customers see an incomplete profile.",
      hoursAreComplete(location) ? null : ["Fix hours", route("hours")],
    ),
    factor(
      "special_hours",
      "Special hours",
      p.specialHours.length > 0 ? 100 : 60,
      p.specialHours.length > 0 ? `${p.specialHours.length} upcoming holiday dates are set.` : "No holiday hours are set. Google prompts customers when holiday hours are missing.",
      p.specialHours.length > 0 ? null : ["Add special hours", route("special-hours")],
    ),
    factor(
      "categories",
      "Categories",
      p.additionalCategoryIds.length >= 2 ? 100 : p.additionalCategoryIds.length === 1 ? 75 : 50,
      `Primary category set${p.additionalCategoryIds.length ? ` with ${p.additionalCategoryIds.length} additional ${p.additionalCategoryIds.length === 1 ? "category" : "categories"}.` : ", but no additional categories."}`,
      p.additionalCategoryIds.length >= 2 ? null : ["Review categories", route("categories")],
    ),
    factor(
      "attributes",
      "Attributes",
      (filledAttributes / Math.max(1, applicable.length)) * 100 + 20,
      `${filledAttributes} of ${applicable.length} available attributes are set for this category.`,
      filledAttributes >= applicable.length * 0.6 ? null : ["Add attributes", route("attributes")],
    ),
    factor(
      "media",
      "Photos and video",
      Math.min(100, (locationMedia.length / 8) * 100),
      `${locationMedia.length} media items in OmniPlatform. Profiles with more photos get more direction requests.`,
      locationMedia.length >= 8 ? null : ["Add photos", `${gbRoutes.media}?location=${location.locationId}`],
    ),
    factor(
      "services",
      "Services",
      p.services.length > 0 ? 100 : 55,
      p.services.length > 0 ? `${p.services.length} services listed.` : "No services listed. Services help customers understand what you offer.",
      p.services.length > 0 ? null : ["Add services", route("services")],
    ),
    factor(
      "verification",
      "Verification",
      location.verification === "verified" ? 100 : location.verification === "pending" ? 50 : 0,
      location.verification === "verified" ? "This location is verified on Google." : location.verification === "pending" ? "Verification is in progress. Edits are blocked until Google confirms it." : "This location is not verified, so Google rejects profile edits and posts.",
      location.verification === "verified" ? null : ["Open verification", gbRoutes.businessProfileManager],
    ),
    factor(
      "review_response",
      "Review response rate",
      responseRate,
      locationReviews.length ? `${answered} of ${locationReviews.length} reviews have a reply.` : "No reviews yet for this location.",
      responseRate >= 80 ? null : ["Reply to reviews", `${gbRoutes.reviews}?location=${location.locationId}&tab=unanswered`],
    ),
  ];

  return { score: clamp(factors.reduce((sum, f) => sum + f.score, 0) / factors.length), factors };
}

/* ------------------------------------------------------------------ */
/* Internal: needs attention                                           */
/* ------------------------------------------------------------------ */

export function computeAttention(
  locations: Location[],
  reviews: Review[],
  media: MediaItem[],
  attributes: AttributeDefinition[],
  now = new Date(),
): AttentionIssue[] {
  const issues: AttentionIssue[] = [];

  const unanswered = reviews.filter((r) => !isAnswered(r));
  const unansweredLow = unanswered.filter((r) => r.starRating <= 2);
  if (unansweredLow.length) {
    issues.push({
      id: "issue-low-reviews",
      kind: "unanswered_reviews",
      severity: "high",
      locationId: null,
      title: `${unansweredLow.length} low-rating ${unansweredLow.length === 1 ? "review needs" : "reviews need"} a reply`,
      description: "Reviews of 2 stars or fewer without a response. These are the ones customers read first.",
      actionLabel: "Reply now",
      href: `${gbRoutes.reviews}?tab=unanswered&rating=1`,
      count: unansweredLow.length,
    });
  }
  const unansweredRest = unanswered.length - unansweredLow.length;
  if (unansweredRest > 0) {
    issues.push({
      id: "issue-unanswered",
      kind: "unanswered_reviews",
      severity: "medium",
      locationId: null,
      title: `${unansweredRest} unanswered ${unansweredRest === 1 ? "review" : "reviews"}`,
      description: "Replying to reviews improves how customers and Google see the profile.",
      actionLabel: "Open inbox",
      href: `${gbRoutes.reviews}?tab=unanswered`,
      count: unansweredRest,
    });
  }

  for (const location of locations) {
    if (location.sync.state === "failed") {
      issues.push({
        id: `issue-sync-${location.locationId}`,
        kind: "sync_failed",
        severity: "high",
        locationId: location.locationId,
        title: `Sync failed for ${location.profile.title}`,
        description: location.sync.error ?? "The last sync did not complete, so data may be out of date.",
        actionLabel: "View location",
        href: gbRoutes.location(location.locationId),
      });
    }
    if (location.verification === "pending" || location.verification === "unverified") {
      issues.push({
        id: `issue-verify-${location.locationId}`,
        kind: "verification_required",
        severity: location.verification === "unverified" ? "high" : "medium",
        locationId: location.locationId,
        title: `${location.profile.title} is ${location.verification === "pending" ? "awaiting verification" : "not verified"}`,
        description: "Google blocks profile edits, posts and media uploads until a location is verified.",
        actionLabel: "View location",
        href: gbRoutes.location(location.locationId),
      });
    }
    if (location.verification === "duplicate") {
      issues.push({
        id: `issue-duplicate-${location.locationId}`,
        kind: "duplicate_location",
        severity: "medium",
        locationId: location.locationId,
        title: `${location.profile.title} is flagged as a duplicate`,
        description: "Google detected another listing for this address. Duplicates split reviews and ranking signals.",
        actionLabel: "Review location",
        href: gbRoutes.location(location.locationId),
      });
    }
    if (!hoursAreComplete(location)) {
      issues.push({
        id: `issue-hours-${location.locationId}`,
        kind: "incomplete_hours",
        severity: "high",
        locationId: location.locationId,
        title: `Business hours incomplete for ${location.profile.title}`,
        description: "Customers see an incomplete profile and may arrive when you are closed.",
        actionLabel: "Fix hours",
        href: `${gbRoutes.profile}?location=${location.locationId}#hours`,
      });
    }
    if (!location.profile.description) {
      issues.push({
        id: `issue-description-${location.locationId}`,
        kind: "missing_description",
        severity: "low",
        locationId: location.locationId,
        title: `No description for ${location.profile.title}`,
        description: "The business description tells customers and Google what this location does.",
        actionLabel: "Add description",
        href: `${gbRoutes.profile}?location=${location.locationId}#basic`,
      });
    }
    if (!location.profile.website) {
      issues.push({
        id: `issue-website-${location.locationId}`,
        kind: "missing_website",
        severity: "medium",
        locationId: location.locationId,
        title: `No website set for ${location.profile.title}`,
        description: "Without a website the profile loses its website button and the clicks that come with it.",
        actionLabel: "Add website",
        href: `${gbRoutes.profile}?location=${location.locationId}#contact`,
      });
    }
    const applicable = attributes.filter((a) => !a.readOnly);
    const filled = applicable.filter((a) => {
      const value = location.profile.attributes[a.attributeId];
      return Array.isArray(value) ? value.length > 0 : value !== undefined && value !== "" && value !== false;
    }).length;
    if (filled < applicable.length * 0.35) {
      issues.push({
        id: `issue-attributes-${location.locationId}`,
        kind: "missing_attributes",
        severity: "low",
        locationId: location.locationId,
        title: `Attributes missing for ${location.profile.title}`,
        description: `Only ${filled} of ${applicable.length} attributes are set for this category.`,
        actionLabel: "Add attributes",
        href: `${gbRoutes.profile}?location=${location.locationId}#attributes`,
      });
    }
    const latestMedia = media
      .filter((m) => m.locationId === location.locationId)
      .map((m) => parseISO(m.createTime).getTime())
      .sort((a, b) => b - a)[0];
    if (!latestMedia || differenceInDays(now, new Date(latestMedia)) > 90) {
      issues.push({
        id: `issue-media-${location.locationId}`,
        kind: "outdated_media",
        severity: "low",
        locationId: location.locationId,
        title: `Photos are out of date for ${location.profile.title}`,
        description: latestMedia ? `The newest photo is ${differenceInDays(now, new Date(latestMedia))} days old.` : "This location has no photos in OmniPlatform.",
        actionLabel: "Add photos",
        href: `${gbRoutes.media}?location=${location.locationId}`,
      });
    }
    if (location.rating !== null && location.rating < 4.2) {
      issues.push({
        id: `issue-rating-${location.locationId}`,
        kind: "low_rating",
        severity: "medium",
        locationId: location.locationId,
        title: `Rating slipped to ${location.rating.toFixed(1)} at ${location.profile.title}`,
        description: "Replying to recent negative reviews is the fastest lever on the rating shown in Search and Maps.",
        actionLabel: "View reviews",
        href: `${gbRoutes.reviews}?location=${location.locationId}&tab=low`,
      });
    }
  }

  const order = { high: 0, medium: 1, low: 2 } as const;
  return issues.sort((a, b) => order[a.severity] - order[b.severity]);
}

/* ------------------------------------------------------------------ */
/* Global search                                                       */
/* ------------------------------------------------------------------ */

export interface SearchHit {
  type: "Location" | "Review" | "Post";
  title: string;
  context: string;
  href: string;
}

export function searchEntities(
  query: string,
  data: { locations: Location[]; reviews: Review[]; posts: Post[] },
  limit = 8,
): SearchHit[] {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];
  const hits: SearchHit[] = [];

  for (const location of data.locations) {
    if (`${location.profile.title} ${location.profile.address.locality} ${location.storeCode}`.toLowerCase().includes(q)) {
      hits.push({
        type: "Location",
        title: location.profile.title,
        context: `${location.profile.address.locality} · ${location.storeCode}`,
        href: gbRoutes.location(location.locationId),
      });
    }
  }
  for (const review of data.reviews) {
    if (`${review.comment} ${review.reviewer.displayName}`.toLowerCase().includes(q)) {
      hits.push({
        type: "Review",
        title: `${review.starRating}★ ${review.comment.slice(0, 60)}`,
        context: review.reviewer.displayName,
        href: `${gbRoutes.reviews}?review=${review.reviewId}`,
      });
    }
  }
  for (const post of data.posts) {
    if (`${post.summary} ${post.event?.title ?? ""}`.toLowerCase().includes(q)) {
      hits.push({
        type: "Post",
        title: post.event?.title ?? post.summary.slice(0, 60),
        context: post.state.replace("_", " "),
        href: `${gbRoutes.posts}?post=${post.id}`,
      });
    }
  }
  return hits.slice(0, limit);
}
