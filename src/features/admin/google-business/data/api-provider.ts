import {
  GbpScopeError,
  categoriesOf,
  getGbpScope,
  googleBusinessApi,
  isoDay,
  lastReportedDay,
  toDailySeries,
  toKeywords,
  toLocation,
  toMediaItem,
  toPost,
  toReview,
  type GbpKeywordsResponse,
  type GbpPerformanceResponse,
  type GbpProfileResponse,
} from "../live/google-business-api";
import type { BusinessAccount, ConnectionState, GbpSnapshot, LocationPerformance, Location, MediaItem, Post, Review, SearchKeyword } from "../types";
import { GbpNotConnectedError, type GbpProvider, type MutationContext } from "./repository";

/** The workspace only resolves this many mapped locations per snapshot. */
const MAX_LOCATIONS = 5;
/** Google keeps about 18 months of daily performance data; the backend accepts at most 548 days. */
const PERFORMANCE_DAYS = 548;
const DAY_MS = 86_400_000;

function toConnectionState(connected: boolean): ConnectionState {
  return connected ? "connected" : "disconnected";
}

function isNotConnectedReason(error: unknown): boolean {
  const reason = (error as { reason?: string } | null)?.reason;
  return reason === "provider_not_connected" || reason === "provider_setup_required";
}

const monthOf = (ms: number) => new Date(ms).toISOString().slice(0, 7);

/** The last full calendar month and the one before it (search keywords are monthly). */
function keywordMonths(now: number): { current: string; previous: string } {
  const d = new Date(now);

  const current = Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - 1, 1);
  const previous = Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - 2, 1);
  return { current: monthOf(current), previous: monthOf(previous) };
}

interface LiveLocationData {
  profileBody: GbpProfileResponse;
  location: Location;
  reviews: Review[];
  posts: Post[];
  media: MediaItem[];
  performance: GbpPerformanceResponse | null;
  keywords: { current: GbpKeywordsResponse | null; previous: GbpKeywordsResponse | null };
}

/** A section that fails (for example Google has not yet approved the Performance API for this project) is empty, never invented and never fatal. */
const settled = <T>(result: PromiseSettledResult<T>): T | null => (result.status === "fulfilled" ? result.value : null);

async function fetchLocation(scope: Awaited<ReturnType<typeof getGbpScope>>, mapped: { externalResourceId: string }, range: { startDate: string; endDate: string }, months: { current: string; previous: string }): Promise<LiveLocationData> {
  const id = mapped.externalResourceId;
  const [profile, reviews, summary] = await Promise.all([
    googleBusinessApi.getProfile(scope, id),
    googleBusinessApi.getReviews(scope, id, { pageSize: 100 }),
    googleBusinessApi.getSummary(scope, id),
  ]);
  const [posts, media, performance, keywordsNow, keywordsBefore] = await Promise.allSettled([
    googleBusinessApi.getPosts(scope, id, { pageSize: 100 }),
    googleBusinessApi.getMedia(scope, id, { pageSize: 100 }),
    googleBusinessApi.getPerformance(scope, id, range),
    googleBusinessApi.getSearchKeywords(scope, id, { startMonth: months.current, endMonth: months.current }),
    googleBusinessApi.getSearchKeywords(scope, id, { startMonth: months.previous, endMonth: months.previous }),
  ]);
  const mediaBody = settled(media);

  return {
    profileBody: profile,
    location: toLocation({
      profile,
      summary: { averageRating: summary.averageRating, recentReviewCount: summary.recentReviewCount },
      connected: scope.connected,
      photoCount: mediaBody?.totalCount ?? mediaBody?.items.length ?? 0,
    }),
    reviews: reviews.items.map((item) => toReview(item, id)).filter((review): review is Review => review !== null),
    posts: (settled(posts)?.items ?? []).map((item) => toPost(item, id)),
    media: (mediaBody?.items ?? []).map((item) => toMediaItem(item, id)),
    performance: settled(performance),
    keywords: { current: settled(keywordsNow), previous: settled(keywordsBefore) },
  };
}

function toAccount(scope: Awaited<ReturnType<typeof getGbpScope>>, base: BusinessAccount): BusinessAccount {
  return {
    ...base,
    name: "",
    accountId: "",
    accountName: scope.accountName ?? "Google Business Profile",
    googleAccount: scope.accountEmail ?? scope.accountName ?? "",
    verificationState: scope.connected ? "VERIFIED" : "UNVERIFIED",
  };
}

/**
 * Live provider. Everything Google reports for the Client's mapped locations replaces the sample data: profile, reviews, posts, media, daily performance and
 * search keywords. What Google does not provide through the API is empty, never invented: the sample activity log and notifications are dropped, as are the sample
 * business account, attribute catalogue and sync quota.
 */
export const apiProvider: GbpProvider = {
  mode: "live",

  async loadSnapshot(base: GbpSnapshot): Promise<GbpSnapshot> {
    let scope: Awaited<ReturnType<typeof getGbpScope>>;
    try {
      scope = await getGbpScope(true);
    } catch (error) {
      if (error instanceof GbpScopeError) throw new GbpNotConnectedError({ reason: "no_connection", integrationId: null });
      throw error;
    }

    if (!scope.connected) throw new GbpNotConnectedError({ reason: scope.integrationId ? "reconnect" : "no_connection", integrationId: scope.integrationId });
    if (scope.locations.length === 0) throw new GbpNotConnectedError({ reason: "no_location", integrationId: scope.integrationId });

    const now = Date.now();
    const today = Date.parse(`${isoDay(now)}T00:00:00Z`);
    const range = { startDate: isoDay(today - (PERFORMANCE_DAYS - 1) * DAY_MS), endDate: isoDay(today) };
    const months = keywordMonths(now);

    const mapped = scope.locations.slice(0, MAX_LOCATIONS);
    const results = await Promise.allSettled(mapped.map((item) => fetchLocation(scope, item, range, months)));

    const loaded = results.filter((r): r is PromiseFulfilledResult<LiveLocationData> => r.status === "fulfilled").map((r) => r.value);
    if (loaded.length === 0) {
      const failure = results.find((r): r is PromiseRejectedResult => r.status === "rejected")?.reason;
      if (isNotConnectedReason(failure)) throw new GbpNotConnectedError();
      throw failure;
    }

    // Every location shares one day axis ending on the last day Google reported for any of them (the newest days are still being finalised).
    const reportedEnds = loaded.map((l) => lastReportedDay(l.performance)).filter((d): d is string => d !== null);
    const performanceEnd = reportedEnds.length ? reportedEnds.sort().at(-1)! : null;
    const performance: LocationPerformance[] = performanceEnd
      ? loaded.map((l) => ({ locationId: l.location.locationId, series: toDailySeries(l.performance, range.startDate, performanceEnd) }))
      : [];
    const searchKeywords: SearchKeyword[] = loaded.flatMap((l) => toKeywords(l.location.locationId, l.keywords.current, l.keywords.previous));

    return {
      ...base,
      account: toAccount(scope, base.account),
      connection: {
        ...base.connection,
        state: toConnectionState(scope.connected),
        lastSyncedAt: new Date(now).toISOString(),
        nextSyncAt: null,
        autoSync: false,
        quotaUsed: 0,
        quotaLimit: 0,
      },
      locations: loaded.map((l) => l.location),
      reviews: loaded.flatMap((l) => l.reviews),
      posts: loaded.flatMap((l) => l.posts).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
      media: loaded.flatMap((l) => l.media).sort((a, b) => b.createTime.localeCompare(a.createTime)),
      performance,
      searchKeywords,
      categories: categoriesOf(loaded.map((l) => l.profileBody)),
      attributeDefinitions: [],
      activity: [],
      notifications: [],
    };
  },

  async commit<T>(_context: MutationContext, apply: () => T): Promise<T> {
    return apply();
  },
};
