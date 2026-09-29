import {
  GbpScopeError,
  googleBusinessApi,
  getGbpScope,
  toLocation,
  toReview,
} from "../live/google-business-api";
import type { ConnectionState, GbpSnapshot, Location, Review } from "../types";
import { GbpNotConnectedError, type GbpProvider, type MutationContext } from "./repository";

/** The workspace only resolves this many mapped locations per snapshot. */
const MAX_LOCATIONS = 5;

function toConnectionState(connected: boolean): ConnectionState {
  return connected ? "connected" : "disconnected";
}

function isNotConnectedReason(error: unknown): boolean {
  const reason = (error as { reason?: string } | null)?.reason;
  return reason === "provider_not_connected" || reason === "provider_setup_required";
}

interface LiveLocationData {
  location: Location;
  reviews: Review[];
}

async function fetchLocation(scope: Awaited<ReturnType<typeof getGbpScope>>, mapped: { externalResourceId: string }): Promise<LiveLocationData> {
  const [profile, reviews, summary] = await Promise.all([
    googleBusinessApi.getProfile(scope, mapped.externalResourceId),
    googleBusinessApi.getReviews(scope, mapped.externalResourceId, { pageSize: 100 }),
    googleBusinessApi.getSummary(scope, mapped.externalResourceId),
  ]);

  return {
    location: toLocation({
      profile,
      summary: { averageRating: summary.averageRating, recentReviewCount: summary.recentReviewCount },
      connected: scope.connected,
    }),
    reviews: reviews.items
      .map((item) => toReview(item, mapped.externalResourceId))
      .filter((review): review is Review => review !== null),
  };
}

/**
 * Live provider. Reads the mapped Google Business locations for the active
 * Client and overlays their real profile + reviews onto the workspace
 * snapshot. Workspace-only surfaces (team, settings, activity) keep their
 * local scaffolding; posts/media/performance have no backend yet and are
 * reported as empty rather than invented.
 */
export const apiProvider: GbpProvider = {
  mode: "live",

  async loadSnapshot(base: GbpSnapshot): Promise<GbpSnapshot> {
    let scope: Awaited<ReturnType<typeof getGbpScope>>;
    try {
      scope = await getGbpScope();
    } catch (error) {
      if (error instanceof GbpScopeError) throw new GbpNotConnectedError();
      throw error;
    }

    if (!scope.connected || scope.locations.length === 0) throw new GbpNotConnectedError();

    const mapped = scope.locations.slice(0, MAX_LOCATIONS);
    const results = await Promise.allSettled(mapped.map((item) => fetchLocation(scope, item)));

    const loaded = results.filter((r): r is PromiseFulfilledResult<LiveLocationData> => r.status === "fulfilled");
    if (loaded.length === 0) {
      const failure = results.find((r): r is PromiseRejectedResult => r.status === "rejected")?.reason;
      if (isNotConnectedReason(failure)) throw new GbpNotConnectedError();
      throw failure;
    }

    const locations = loaded.map((r) => r.value.location);
    const reviews = loaded.flatMap((r) => r.value.reviews);
    const now = new Date().toISOString();

    return {
      ...base,
      connection: {
        ...base.connection,
        state: toConnectionState(scope.connected),
        lastSyncedAt: now,
      },
      locations,
      reviews,
      posts: [],
      media: [],
      performance: [],
      searchKeywords: [],
    };
  },

  async commit<T>(_context: MutationContext, apply: () => T): Promise<T> {
    return apply();
  },
};
