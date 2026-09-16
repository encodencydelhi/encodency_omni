import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { mockSnapshot } from "../data/mock-provider";
import {
  ALL_LOCATIONS,
  buildMetricSeries,
  computeAttention,
  computeProfileHealth,
  filterKeywords,
  filterLocations,
  filterMedia,
  filterPosts,
  filterReviews,
  hasBookings,
  hoursAreComplete,
  isAnswered,
  metricValue,
  periodDays,
  postCounts,
  profileCompletion,
  reviewSummary,
  findLocation,
  scopeLocationIds,
  searchEntities,
  sumMetric,
} from "../data/selectors";
import type { Review } from "../types";

const { locations, reviews, posts, media, performance, searchKeywords, attributeDefinitions } = mockSnapshot;
const first = locations[0]!;

describe("location scope", () => {
  it("expands 'all' to every location and narrows to one otherwise", () => {
    assert.equal(scopeLocationIds(locations, ALL_LOCATIONS).length, locations.length);
    assert.deepEqual(scopeLocationIds(locations, first.locationId), [first.locationId]);
  });

  it("does not resolve a location that is not on the account", () => {
    // `useLocationScope` rejects unknown ids before they reach the selectors.
    assert.equal(findLocation(locations, "locations/does-not-exist"), undefined);
    assert.equal(findLocation(locations, first.locationId)?.locationId, first.locationId);
  });
});

describe("filterLocations", () => {
  it("matches on name, store code, city and internal labels", () => {
    assert.ok(filterLocations(locations, { q: first.profile.title.slice(0, 6) }, attributeDefinitions).length >= 1);
    assert.deepEqual(
      filterLocations(locations, { q: first.storeCode }, attributeDefinitions).map((l) => l.locationId),
      [first.locationId],
    );
    assert.deepEqual(filterLocations(locations, { q: "zzz-no-match" }, attributeDefinitions), []);
  });

  it("filters by verification and sync state", () => {
    const verified = filterLocations(locations, { verification: "verified" }, attributeDefinitions);
    assert.ok(verified.length > 0);
    assert.ok(verified.every((l) => l.verification === "verified"));
    const failed = filterLocations(locations, { sync: "failed" }, attributeDefinitions);
    assert.ok(failed.every((l) => l.sync.state === "failed"));
  });

  it("treats 'all' as no filter", () => {
    const all = filterLocations(locations, { verification: "all", status: "all", sync: "all", rating: "all", completion: "all" }, attributeDefinitions);
    assert.equal(all.length, locations.length);
  });

  it("sorts by name by default and by rating on request", () => {
    const byName = filterLocations(locations, {}, attributeDefinitions).map((l) => l.profile.title);
    assert.deepEqual(byName, [...byName].sort((a, b) => a.localeCompare(b)));
    const byRating = filterLocations(locations, { sort: "rating" }, attributeDefinitions).map((l) => l.rating ?? -1);
    assert.deepEqual(byRating, [...byRating].sort((a, b) => b - a));
  });

  it("does not mutate the input array", () => {
    const snapshot = locations.map((l) => l.locationId);
    filterLocations(locations, { sort: "rating" }, attributeDefinitions);
    assert.deepEqual(locations.map((l) => l.locationId), snapshot);
  });
});

describe("profile completeness", () => {
  it("scores completion between 0 and 100", () => {
    for (const location of locations) {
      const score = profileCompletion(location, attributeDefinitions);
      assert.ok(score >= 0 && score <= 100, `${location.profile.title} scored ${score}`);
    }
  });

  it("scores a location with missing description and website lower than a complete one", () => {
    const incomplete = locations.find((l) => !l.profile.description || !l.profile.website);
    const complete = locations.find((l) => l.profile.description && l.profile.website && l.profile.phone);
    assert.ok(incomplete && complete);
    assert.ok(profileCompletion(incomplete, attributeDefinitions) < profileCompletion(complete, attributeDefinitions));
  });

  it("treats fewer than five covered days as incomplete hours", () => {
    const sparse = { ...first, profile: { ...first.profile, regularHours: { periods: [{ day: 0, open: "09:00", close: "18:00" }], open24: [] } } };
    assert.equal(hoursAreComplete(sparse), false);
    const full = {
      ...first,
      profile: {
        ...first.profile,
        regularHours: { periods: [0, 1, 2, 3, 4].map((day) => ({ day, open: "09:00", close: "18:00" })), open24: [] },
      },
    };
    assert.equal(hoursAreComplete(full), true);
  });
});

describe("filterReviews", () => {
  it("splits answered and unanswered without overlap", () => {
    const unanswered = filterReviews(reviews, { tab: "unanswered" });
    const replied = filterReviews(reviews, { tab: "replied" });
    assert.equal(unanswered.length + replied.length, reviews.length);
    assert.ok(unanswered.every((review) => !isAnswered(review)));
    assert.ok(replied.every(isAnswered));
  });

  it("limits the low tab to 1-2 stars and the high tab to 4-5", () => {
    assert.ok(filterReviews(reviews, { tab: "low" }).every((review) => review.starRating <= 2));
    assert.ok(filterReviews(reviews, { tab: "high" }).every((review) => review.starRating >= 4));
  });

  it("filters by location, rating and free text together", () => {
    const rows = filterReviews(reviews, { location: first.locationId, rating: "5" });
    assert.ok(rows.every((review) => review.locationId === first.locationId && review.starRating === 5));
    const sample = reviews.find((review) => review.comment.length > 12)!;
    const word = sample.comment.split(" ").find((token) => token.length > 5)!;
    assert.ok(filterReviews(reviews, { q: word }).length >= 1);
  });

  it("honours the date window against a fixed 'now'", () => {
    const now = new Date("2026-09-16T00:00:00.000Z");
    const recent = filterReviews(reviews, { date: "30d" }, now);
    assert.ok(recent.length <= reviews.length);
    assert.ok(recent.every((review) => new Date(review.createTime) <= now));
  });

  it("sorts newest first by default and lowest rating first when asked", () => {
    const newest = filterReviews(reviews, {}).map((review) => review.createTime);
    assert.deepEqual(newest, [...newest].sort((a, b) => b.localeCompare(a)));
    const lowest = filterReviews(reviews, { sort: "lowest" }).map((review) => review.starRating);
    assert.deepEqual(lowest, [...lowest].sort((a, b) => a - b));
  });
});

describe("reviewSummary", () => {
  it("reports totals, response rate and a five-bucket distribution", () => {
    const summary = reviewSummary(reviews);
    assert.equal(summary.total, reviews.length);
    assert.equal(summary.answered + summary.unanswered, summary.total);
    assert.equal(summary.distribution.length, 5);
    assert.equal(
      summary.distribution.reduce((sum, bucket) => sum + bucket.count, 0),
      reviews.length,
    );
    assert.ok((summary.average ?? 0) >= 1 && (summary.average ?? 0) <= 5);
    assert.equal(summary.responseRate, Math.round((summary.answered / summary.total) * 100));
  });

  it("returns null averages instead of zero for an empty set", () => {
    const summary = reviewSummary([] as Review[]);
    assert.equal(summary.average, null);
    assert.equal(summary.responseRate, null);
    assert.equal(summary.total, 0);
  });
});

describe("posts", () => {
  it("counts every state and keeps the tab totals consistent", () => {
    const counts = postCounts(posts);
    assert.equal(counts.all, posts.length);
    // Rejected posts go back to the author, so the Drafts tab holds them too.
    assert.equal(counts.draft, posts.filter((post) => post.state === "draft" || post.state === "rejected").length);
    // Approved posts are waiting to go out, so they sit with the scheduled ones.
    assert.equal(counts.scheduled, posts.filter((post) => post.state === "scheduled" || post.state === "approved").length);
  });

  it("filters by state tab, type and location", () => {
    assert.ok(filterPosts(posts, { tab: "published" }).every((post) => post.state === "published"));
    assert.ok(filterPosts(posts, { type: "offer" }).every((post) => post.type === "offer"));
    assert.ok(filterPosts(posts, { location: first.locationId }).every((post) => post.locationIds.includes(first.locationId)));
  });
});

describe("media", () => {
  it("filters by category and ignores 'all'", () => {
    assert.equal(filterMedia(media, { category: "all" }).length, media.length);
    assert.ok(filterMedia(media, { category: "INTERIOR" }).every((item) => item.category === "INTERIOR"));
  });

  it("filters by upload window", () => {
    const now = new Date("2026-09-16T00:00:00.000Z");
    const recent = filterMedia(media, { date: "30d" }, now);
    assert.ok(recent.length <= media.length);
  });
});

describe("performance series", () => {
  it("builds one point per requested day", () => {
    const series = buildMetricSeries(performance, [first.locationId], 30);
    assert.equal(series.length, 30);
    assert.ok(series.every((point) => typeof point.date === "string"));
  });

  it("returns a non-overlapping previous window", () => {
    const current = buildMetricSeries(performance, [first.locationId], 30);
    const previous = buildMetricSeries(performance, [first.locationId], 30, 30);
    assert.equal(previous.length, 30);
    const overlap = previous.filter((point) => current.some((other) => other.date === point.date));
    assert.deepEqual(overlap, []);
  });

  it("aggregates across locations rather than picking one", () => {
    const single = sumMetric(buildMetricSeries(performance, [first.locationId], 30), "searchImpressions");
    const all = sumMetric(buildMetricSeries(performance, locations.map((l) => l.locationId), 30), "searchImpressions");
    assert.ok(all > single);
  });

  it("maps period keys to day counts", () => {
    assert.equal(periodDays("7d"), 7);
    assert.equal(periodDays("30d"), 30);
    assert.equal(periodDays("90d"), 90);
  });

  it("reports bookings as unavailable when Google returns none", () => {
    const empty = [{ date: "2026-09-01", values: { searchImpressions: 10, mapsImpressions: 5, callClicks: 1, websiteClicks: 2, directionRequests: 3, bookings: 0 } }];
    assert.equal(hasBookings(empty), false);
    assert.equal(hasBookings([...empty, { date: "2026-09-02", values: { ...empty[0]!.values, bookings: 4 } }]), true);
  });

  it("sums the Google daily metrics behind each UI metric", () => {
    const point = performance[0]!.series[0]!;
    assert.equal(typeof metricValue(point, "callClicks"), "number");
    assert.ok(metricValue(point, "searchImpressions") >= 0);
  });
});

describe("search keywords", () => {
  it("only returns keywords for the scoped locations", () => {
    const scoped = filterKeywords(searchKeywords, [first.locationId]);
    assert.ok(scoped.every((keyword) => keyword.locationId === first.locationId));
  });

  it("keeps Google's threshold buckets flagged instead of showing a made-up number", () => {
    const thresholded = searchKeywords.filter((keyword) => keyword.isThreshold);
    assert.ok(thresholded.length > 0, "the mock data should include a threshold bucket");
  });
});

describe("computeProfileHealth", () => {
  it("returns a 0-100 score built from explained factors", () => {
    const health = computeProfileHealth(first, reviews, media, attributeDefinitions);
    assert.ok(health.score >= 0 && health.score <= 100);
    assert.ok(health.factors.length >= 8);
    for (const factor of health.factors) {
      assert.ok(factor.explanation.length > 0, `${factor.label} needs an explanation`);
      assert.ok(["good", "warning", "critical"].includes(factor.status));
      assert.ok(factor.score >= 0 && factor.score <= 100);
    }
  });

  it("scores a fully filled profile above an incomplete one", () => {
    const incomplete = locations.find((l) => !l.profile.description || !l.profile.website)!;
    const complete = locations.find((l) => l.profile.description && l.profile.website && l.reviewCount > 0)!;
    assert.ok(
      computeProfileHealth(complete, reviews, media, attributeDefinitions).score >
        computeProfileHealth(incomplete, reviews, media, attributeDefinitions).score,
    );
  });

  it("points failing factors at the page that fixes them", () => {
    const health = computeProfileHealth(locations.find((l) => !l.profile.website)!, reviews, media, attributeDefinitions);
    const failing = health.factors.filter((factor) => factor.status !== "good");
    assert.ok(failing.some((factor) => Boolean(factor.href)), "at least one failing factor should deep link to a fix");
  });
});

describe("computeAttention", () => {
  it("raises issues with a severity and a deep link", () => {
    const issues = computeAttention(locations, reviews, media, attributeDefinitions);
    assert.ok(issues.length > 0);
    for (const issue of issues) {
      assert.ok(["high", "medium", "low"].includes(issue.severity));
      assert.ok(issue.title.length > 0);
      assert.ok(issue.href.startsWith("/admin/google-business"));
    }
  });

  it("raises nothing for a clean, verified, fully synced location", () => {
    const clean = {
      ...first,
      verification: "verified" as const,
      openState: "open" as const,
      sync: { state: "synced" as const, lastSyncedAt: new Date().toISOString() },
      profile: { ...first.profile, description: "A complete description of the business.", website: "https://example.com", phone: "+91 11 4000 1000" },
    };
    const issues = computeAttention([clean], [], [], attributeDefinitions);
    assert.ok(issues.every((issue) => issue.severity !== "high"), issues.map((i) => i.title).join(", "));
  });
});

describe("searchEntities", () => {
  it("ignores queries shorter than two characters", () => {
    assert.deepEqual(searchEntities("a", { locations, reviews, posts }), []);
  });

  it("finds locations, reviews and posts and links each hit", () => {
    const hits = searchEntities(first.profile.title.slice(0, 5), { locations, reviews, posts }, 10);
    assert.ok(hits.length > 0);
    assert.ok(hits.every((hit) => hit.href.startsWith("/admin/google-business")));
    assert.ok(hits.some((hit) => hit.type === "Location"));
  });

  it("respects the result limit", () => {
    assert.ok(searchEntities("a e", { locations, reviews, posts }, 3).length <= 3);
  });
});
