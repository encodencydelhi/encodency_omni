import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  categoriesOf,
  lastReportedDay,
  mapProfileBody,
  mapRegularHours,
  toDailySeries,
  toKeywords,
  toLocation,
  toMediaItem,
  toOpenState,
  toPost,
  type GbpKeywordsResponse,
  type GbpPerformanceResponse,
  type GbpProfileResponse,
} from "../live/google-business-api";

const profile = (over: Partial<GbpProfileResponse> = {}): GbpProfileResponse => ({
  resourceMappingId: "8c5f7a40-0000-4000-8000-000000000001",
  externalResourceId: "locations/123",
  providerLocationId: "locations/123",
  title: "Cafe",
  description: "Good coffee",
  address: { addressLines: ["1 Main St"], locality: "Delhi", administrativeArea: "DL", postalCode: "110001", regionCode: "IN" },
  phoneNumbers: { primaryPhone: "+91 99999 99999", additionalPhones: ["+91 88888 88888"] },
  websiteUri: "https://cafe.test",
  categories: { primaryCategory: { name: "categories/gcid:cafe", displayName: "Cafe" }, additionalCategories: [{ name: "categories/gcid:bakery", displayName: "Bakery" }] },
  regularHours: { periods: [{ openDay: "MONDAY", openTime: { hours: 9 }, closeDay: "MONDAY", closeTime: { hours: 17, minutes: 30 } }] },
  openInfo: { status: "OPEN" },
  metadata: { mapsUri: "https://maps.test/x", newReviewUri: "https://g.page/r/x", placeId: "ChIJ1", hasVoiceOfMerchant: true },
  ...over,
});

describe("profile mapping (Business Information API v1 shapes)", () => {
  it("reads openTime/closeTime hours, and a midnight close as the end of the day", () => {
    assert.deepEqual(mapRegularHours(profile().regularHours).periods, [{ day: 0, open: "09:00", close: "17:30" }]);
    const midnight = mapRegularHours({ periods: [{ openDay: "SUNDAY", openTime: {}, closeDay: "SUNDAY", closeTime: { hours: 24 } }] });
    assert.deepEqual(midnight.periods, [{ day: 6, open: "00:00", close: "23:59" }]);
  });

  it("reads primaryCategory/additionalCategories with their real names, and lists them for the pickers", () => {
    const mapped = mapProfileBody(profile());
    assert.equal(mapped.primaryCategoryId, "categories/gcid:cafe");
    assert.deepEqual(mapped.additionalCategoryIds, ["categories/gcid:bakery"]);
    assert.equal(mapped.description, "Good coffee");
    assert.deepEqual(categoriesOf([profile(), profile()]), [
      { categoryId: "categories/gcid:cafe", displayName: "Cafe" },
      { categoryId: "categories/gcid:bakery", displayName: "Bakery" },
    ]);
  });

  it("takes maps and review links from Google's metadata, and verification from voice of merchant", () => {
    const location = toLocation({ profile: profile(), connected: true, photoCount: 12 });
    assert.equal(location.name, "locations/123");
    assert.equal(location.mapsUri, "https://maps.test/x");
    assert.equal(location.placeId, "ChIJ1");
    assert.equal(location.verification, "verified");
    assert.equal(location.photoCount, 12);
    assert.equal(toLocation({ profile: profile({ metadata: { hasVoiceOfMerchant: false } }), connected: true }).verification, "pending");
    assert.equal(toLocation({ profile: profile({ metadata: { duplicateLocation: "locations/9" } }), connected: true }).verification, "duplicate");
  });

  it("does not call a location closed when Google sent no status", () => {
    assert.equal(toOpenState(null), "open");
    assert.equal(toOpenState({ status: "CLOSED_PERMANENTLY" }), "closed_permanently");
  });
});

describe("posts and media", () => {
  it("maps an event post with a button, and keeps Google's state", () => {
    const post = toPost(
      {
        id: "p1",
        topicType: "EVENT",
        state: "LIVE",
        summary: "Open day",
        languageCode: "en-US",
        callToAction: { actionType: "BOOK", url: "https://cafe.test/book" },
        event: { title: "Open day", startDate: "2026-10-09", startTime: "09:00", endDate: "2026-10-10", endTime: null },
        offer: null,
        mediaUrls: ["https://lh3.test/a"],
        searchUrl: "https://g.test/p",
        createTime: "2026-10-01T00:00:00Z",
        updateTime: null,
      },
      "locations/123",
    );
    assert.equal(post.id, "p1");
    assert.equal(post.type, "event");
    assert.equal(post.state, "published");
    assert.deepEqual(post.locationIds, ["locations/123"]);
    assert.deepEqual(post.cta, { actionType: "BOOK", url: "https://cafe.test/book" });
    assert.deepEqual(post.event, { title: "Open day", startDate: "2026-10-09", endDate: "2026-10-10" });
    assert.equal(post.metrics, null, "Google gives no per-post metrics through this API");
    assert.equal(toPost({ id: "p2", topicType: "STANDARD", state: "REJECTED", summary: "x", languageCode: null, callToAction: null, event: null, offer: null, mediaUrls: [], searchUrl: null, createTime: null, updateTime: null }, "l").state, "rejected");
  });

  it("maps media categories, keeping unknown view counts and sizes unknown", () => {
    const item = toMediaItem({ id: "m1", format: "PHOTO", category: "TEAMS", googleUrl: "https://lh3.test/m", thumbnailUrl: null, createTime: "2026-09-01T00:00:00Z", viewCount: null, widthPixels: 800, heightPixels: 600 }, "locations/123");
    assert.equal(item.category, "TEAM");
    assert.equal(item.viewCount, null);
    assert.equal(item.sizeBytes, null);
    assert.deepEqual(item.dimensions, { widthPx: 800, heightPx: 600 });
    assert.equal(item.thumbnailUrl, "https://lh3.test/m");
    assert.equal(toMediaItem({ id: "m2", format: "VIDEO", category: "ADDITIONAL", googleUrl: null, thumbnailUrl: null, createTime: null, viewCount: null, widthPixels: null, heightPixels: null }, "l").category, "VIDEO");
  });
});

describe("performance and keywords", () => {
  const response: GbpPerformanceResponse = {
    resourceMappingId: "m",
    externalResourceId: "locations/123",
    startDate: "2026-09-01",
    endDate: "2026-09-05",
    metrics: [],
    hasData: true,
    series: [
      { date: "2026-09-02", values: { CALL_CLICKS: 5 } },
      { date: "2026-09-04", values: { CALL_CLICKS: 2, WEBSITE_CLICKS: 1 } },
    ],
  };

  it("builds a gapless day axis, zero for a day Google left out, and stops at the last reported day", () => {
    assert.equal(lastReportedDay(response), "2026-09-04");
    const series = toDailySeries(response, "2026-09-01", "2026-09-04");
    assert.deepEqual(series.map((p) => p.date), ["2026-09-01", "2026-09-02", "2026-09-03", "2026-09-04"]);
    assert.equal(series[0]!.values.CALL_CLICKS, 0);
    assert.equal(series[1]!.values.CALL_CLICKS, 5);
    assert.equal(series[3]!.values.WEBSITE_CLICKS, 1);
    assert.equal(lastReportedDay(null), null);
    assert.equal(toDailySeries(null, "2026-09-01", "2026-09-02").length, 2);
  });

  it("compares keyword counts with the previous month only when both are exact", () => {
    const current: GbpKeywordsResponse = {
      resourceMappingId: "m",
      externalResourceId: "x",
      startMonth: "2026-09",
      endMonth: "2026-09",
      nextPageToken: null,
      items: [
        { query: "cafe", impressions: 120, isThreshold: false },
        { query: "rare", impressions: 15, isThreshold: true },
        { query: "new", impressions: 9, isThreshold: false },
      ],
    };
    const previous: GbpKeywordsResponse = { ...current, startMonth: "2026-08", endMonth: "2026-08", items: [{ query: "cafe", impressions: 100, isThreshold: false }, { query: "rare", impressions: 10, isThreshold: false }] };
    const keywords = toKeywords("locations/123", current, previous);
    assert.deepEqual(keywords.map((k) => [k.query, k.previousImpressions, k.isThreshold]), [["cafe", 100, false], ["rare", null, true], ["new", null, false]]);
    assert.deepEqual(toKeywords("l", null, null), []);
  });
});
