import assert from "node:assert/strict";
import { describe, it } from "node:test";

process.env.NEXT_PUBLIC_DATA_SOURCE = "api";

const m = await import("../data/mappers");
const { fillSeries } = await import("../lib/series");
const { periodRange, previousPeriodRange } = await import("../lib/period");

type VideoDto = Parameters<typeof m.toVideo>[0];

const thumbs = { default: null, medium: "https://i.ytimg.com/vi/x/mqdefault.jpg", high: null, standard: null, maxres: null };
const video = (over: Partial<VideoDto> = {}): VideoDto => ({
  id: "abcdefghijk",
  title: "T",
  description: "D",
  publishedAt: "2026-09-01T10:00:00Z",
  channelId: "UC1",
  channelTitle: "C",
  thumbnails: thumbs,
  tags: [],
  categoryId: "22",
  defaultLanguage: null,
  defaultAudioLanguage: null,
  statistics: { views: "1200", likes: "40", comments: "3" },
  content: { duration: "PT4M", durationSeconds: 240, dimension: "2d", definition: "hd", caption: false, licensedContent: false },
  status: { uploadStatus: "processed", privacyStatus: "public", publishAt: null, embeddable: true, madeForKids: false, selfDeclaredMadeForKids: false },
  live: { liveBroadcastContent: "none" },
  ...over,
});

describe("counters", () => {
  it("keeps exact integers and refuses to round ones beyond 2^53", () => {
    assert.equal(m.countOf("12345"), 12345);
    assert.equal(m.countOf("9007199254740993"), null);
    assert.equal(m.countOf(null), null);
    assert.equal(m.countOf(""), null);
    assert.equal(m.countOf("abc"), null);
  });

  it("keeps a hidden like count or disabled comments as null, never zero", () => {
    const v = m.toVideo(video({ statistics: { views: "10", likes: null, comments: null } }));
    assert.equal(v.stats.likes, null);
    assert.equal(v.stats.comments, null);
    assert.equal(v.commentsEnabled, false);
    assert.equal(v.stats.views, 10);
  });

  it("never invents watch time", () => {
    const v = m.toVideo(video());
    assert.equal(v.stats.watchTimeHours, null);
  });
});

describe("video status and type", () => {
  it("derives published / draft / scheduled / processing / failed from YouTube's fields", () => {
    assert.equal(m.toVideo(video()).status, "published");
    assert.equal(m.toVideo(video({ status: { ...video().status, privacyStatus: "private" } })).status, "draft");
    assert.equal(m.toVideo(video({ status: { ...video().status, privacyStatus: "private", publishAt: "2026-11-01T10:00:00Z" } })).status, "scheduled");
    assert.equal(m.toVideo(video({ status: { ...video().status, uploadStatus: "uploaded" } })).status, "processing");
    assert.equal(m.toVideo(video({ status: { ...video().status, uploadStatus: "rejected" } })).status, "failed");
  });

  it("uses the publish record for APP_DELAYED schedules that YouTube does not know about", () => {
    const record = { id: "pub-1", kind: "SCHEDULED", status: "SCHEDULED", scheduledAt: "2026-11-02T08:00:00Z", videoId: "abcdefghijk" } as unknown as Parameters<typeof m.toVideo>[1];
    const v = m.toVideo(video({ status: { ...video().status, privacyStatus: "private" } }), record);
    assert.equal(v.status, "scheduled");
    assert.equal(v.scheduledAt, "2026-11-02T08:00:00Z");
    assert.equal(v.scheduleId, "pub-1");
  });

  it("calls a video of at most 60 seconds a Short and a broadcast Live", () => {
    assert.equal(m.contentTypeOf(video({ content: { ...video().content, durationSeconds: 45 } })), "short");
    assert.equal(m.contentTypeOf(video({ content: { ...video().content, durationSeconds: 61 } })), "video");
    assert.equal(m.contentTypeOf(video({ live: { liveBroadcastContent: "upcoming" } })), "live");
  });
});

describe("connection states", () => {
  const base = { connected: true, integrationId: "i", resourceId: "r", channelId: "UC1", channelTitle: "C", channelThumbnail: null, grantedCapabilities: { readChannel: true, readAnalytics: false, readMonetaryAnalytics: false, uploadVideos: false, manageChannel: false }, lastSyncedAt: null, requiresReconnect: false, reason: null, companyConnectionAvailable: true, googleAccountName: null };
  const state = (status: string, reason: string | null = null, syncing = false) => m.toConnectionInfo({ ...base, status: status as "ACTIVE", reason }, syncing).state;

  it("maps the five backend states", () => {
    assert.equal(state("NOT_CONNECTED"), "disconnected");
    assert.equal(state("CONNECTED_NOT_MAPPED"), "not_mapped");
    assert.equal(state("ACTIVE"), "connected");
    assert.equal(state("ACTIVE", null, true), "syncing");
    assert.equal(state("RECONNECT_REQUIRED"), "token_expired");
    assert.equal(state("ERROR"), "sync_failed");
    assert.equal(state("ERROR", "youtube_quota_exceeded"), "quota_exceeded");
  });

  it("treats a missing connection as disconnected", () => {
    assert.equal(m.toConnectionInfo(undefined, false).state, "disconnected");
  });
});

describe("comments", () => {
  const comment = (over: Record<string, unknown> = {}) => ({
    commentId: "Ug1", parentId: null, videoId: "abcdefghijk", authorDisplayName: "A", authorProfileImageUrl: null, authorChannelId: null,
    textDisplay: "hi", textOriginal: null, likeCount: 2, publishedAt: "2026-09-01T00:00:00Z", updatedAt: null, canRate: null, viewerRating: null,
    moderationStatus: null, authoredByChannel: false, ...over,
  });

  it("answers a thread only when the channel itself wrote a reply", () => {
    const thread = { threadId: "t1", videoId: "abcdefghijk", topLevelComment: comment(), totalReplyCount: 1, canReply: true, isPublic: true, repliesPreview: [comment({ commentId: "Ug1.1", parentId: "Ug1" })] } as Parameters<typeof m.toCommentThread>[0];
    assert.equal(m.isAnswered(m.toCommentThread(thread, "abcdefghijk")), false);
    const answered = { ...thread, repliesPreview: [comment({ commentId: "Ug1.2", authoredByChannel: true })] };
    assert.equal(m.isAnswered(m.toCommentThread(answered, "abcdefghijk")), true);
  });

  it("uses the top-level comment id for replies and moderation", () => {
    const t = m.toCommentThread({ threadId: "t1", videoId: null, topLevelComment: comment({ commentId: "UgTop" }), totalReplyCount: 0, canReply: null, isPublic: null, repliesPreview: [] } as Parameters<typeof m.toCommentThread>[0], "fallback0000");
    assert.equal(t.commentId, "UgTop");
    assert.equal(t.id, "t1");
    assert.equal(t.videoId, "abcdefghijk");
    assert.equal(t.moderationStatus, "published");
  });
});

describe("live", () => {
  it("maps YouTube lifecycle states", () => {
    assert.equal(m.lifecycleOf("created"), "upcoming");
    assert.equal(m.lifecycleOf("ready"), "upcoming");
    assert.equal(m.lifecycleOf("testing"), "upcoming");
    assert.equal(m.lifecycleOf("live"), "live");
    assert.equal(m.lifecycleOf("complete"), "completed");
  });

  it("derives encoder health from the bound stream", () => {
    const stream = (streamStatus: string, health: string) => ({ streamStatus, health }) as unknown as Parameters<typeof m.streamHealthOf>[1];
    assert.equal(m.streamHealthOf("upcoming", undefined), "waiting");
    assert.equal(m.streamHealthOf("upcoming", stream("inactive", "noData")), "waiting");
    assert.equal(m.streamHealthOf("upcoming", stream("active", "noData")), "receiving");
    assert.equal(m.streamHealthOf("upcoming", stream("active", "good")), "healthy");
    assert.equal(m.streamHealthOf("live", undefined), "live");
    assert.equal(m.streamHealthOf("completed", undefined), "ended");
  });

  it("never carries a stream key or ingestion address into the view model", () => {
    const e = m.toLiveEvent({ broadcastId: "b1", channelId: "UC", title: "T", description: null, scheduledStartTime: "2026-10-05T10:00:00Z", scheduledEndTime: null, actualStartTime: null, actualEndTime: null, privacyStatus: "private", lifeCycleStatus: "ready", recordingStatus: null, madeForKids: false, selfDeclaredMadeForKids: false, streamId: "s1", liveChatId: null, enableDvr: true, enableAutoStart: false, enableAutoStop: false, thumbnails: thumbs });
    const keys = Object.keys(e).join(",");
    assert.ok(!/key|ingest|streamName|rtmp/i.test(keys), keys);
    assert.equal(e.visibility, "private");
  });
});

describe("analytics", () => {
  it("keeps missing metrics null and converts minutes to hours once", () => {
    const p = m.toSeriesPoint({ date: "2026-09-10", metrics: { views: 10, estimatedMinutesWatched: 90 } });
    assert.equal(p.watchTime, 1.5);
    assert.equal(p.subscribers, null);
  });

  it("computes net subscribers only when a subscriber metric exists", () => {
    assert.equal(m.netSubscribers({ subscribersGained: 5, subscribersLost: 2 }), 3);
    assert.equal(m.netSubscribers({ views: 4 }), null);
  });

  it("zero is a real value and null is a gap", () => {
    assert.equal(m.toSeriesPoint({ date: "2026-09-10", metrics: { views: 0 } }).views, 0);
    assert.equal(m.toSeriesPoint({ date: "2026-09-10", metrics: { views: null } }).views, null);
  });

  it("fills missing days with null (a gap), never with zero", () => {
    const range = { startDate: "2026-09-01", endDate: "2026-09-04" };
    const filled = fillSeries(range, [{ date: "2026-09-02", metrics: { views: 7 } }]);
    assert.deepEqual(filled.map((p) => p.date), ["2026-09-01", "2026-09-02", "2026-09-03", "2026-09-04"]);
    assert.deepEqual(filled.map((p) => p.views), [null, 7, null, null]);
  });

  it("expands a month bucket to its first day", () => {
    assert.equal(m.toSeriesPoint({ date: "2026-09", metrics: {} }).date, "2026-09-01");
  });

  it("shares traffic by views and keeps provider labels readable", () => {
    const rows = m.toTrafficRows([{ trafficSourceType: "YT_SEARCH", views: 30, estimatedMinutesWatched: 60 }, { trafficSourceType: "SOMETHING_NEW", views: 10, estimatedMinutesWatched: null }]);
    assert.equal(rows[0]!.label, "YouTube search");
    assert.equal(rows[0]!.value, 75);
    assert.equal(rows[1]!.label, "Something New");
  });

  it("treats empty demographics as 'not enough data' (null)", () => {
    assert.deepEqual(m.toDemographics([]), { age: null, gender: null });
    const d = m.toDemographics([{ ageGroup: "age18-24", gender: "male", viewerPercentage: 20 }, { ageGroup: "age18-24", gender: "female", viewerPercentage: 10 }]);
    assert.equal(d.age?.[0]?.label, "18–24");
    assert.equal(d.age?.[0]?.value, 30);
  });

  it("lists a country the map doesn't know, without coordinates", () => {
    const rows = m.toGeography([{ countryCode: "IN", views: 10, estimatedMinutesWatched: 60, subscribersGained: 1 }, { countryCode: "ZZ", views: 1, estimatedMinutesWatched: null, subscribersGained: null }]);
    assert.equal(rows?.[0]?.lat != null, true);
    assert.equal(rows?.[1]?.lat, null);
    assert.equal(rows?.[1]?.watchTimeHours, 0);
  });

  it("reports no revenue row as unavailable (null), not zero", () => {
    const empty = { hasData: false, totals: null, series: [], currency: "USD" } as unknown as Parameters<typeof m.toRevenue>[0];
    assert.equal(m.toRevenue(empty), null);
    const some = { hasData: true, currency: "INR", totals: { estimatedRevenue: 120.5, estimatedAdRevenue: null, grossRevenue: null, cpm: null, playbackBasedCpm: null, monetizedPlaybacks: null, adImpressions: null }, series: [] } as unknown as Parameters<typeof m.toRevenue>[0];
    const r = m.toRevenue(some);
    assert.equal(r?.currency, "INR");
    assert.equal(r?.estimatedRevenue, 120.5);
    assert.equal(r?.cpm, null);
  });
});

describe("periods", () => {
  const now = Date.parse("2026-10-03T22:30:00.000Z");

  it("ends today (UTC) and covers exactly N days", () => {
    assert.deepEqual(periodRange(28, now), { startDate: "2026-09-06", endDate: "2026-10-03" });
    assert.deepEqual(periodRange(7, now), { startDate: "2026-09-27", endDate: "2026-10-03" });
  });

  it("builds the equal period before it", () => {
    assert.deepEqual(previousPeriodRange(28, now), { startDate: "2026-08-09", endDate: "2026-09-05" });
  });

  it("keeps 365 days within the backend's 366-day limit and never ends in the future", () => {
    const r = periodRange(365, now);
    const days = (Date.parse(r.endDate) - Date.parse(r.startDate)) / 86_400_000 + 1;
    assert.equal(days, 365);
    assert.ok(Date.parse(r.endDate) <= now);
  });
});
