/**
 * Wire-level contract of the YouTube API client: exact routes, methods, headers and bodies. `fetch` is stubbed.
 */
import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import { SCOPE, installFetchStub } from "./fetch-stub";

process.env.NEXT_PUBLIC_DATA_SOURCE = "api";
process.env.NEXT_PUBLIC_API_BASE_URL = "/api/v1";

const { youtubeApi, cleanPageToken, newIdempotencyKey } = await import("../live/youtube-api");
const { containsRawScope } = await import("../live/youtube-consent");
const { ApiError } = await import("@/types/api");

const stub = installFetchStub();
const BASE = "/api/v1/integrations/youtube";

beforeEach(() => stub.reset());
afterEach(() => stub.reset());

describe("scope and headers", () => {
  it("sends the company and client on every call", async () => {
    await youtubeApi.connection(SCOPE);
    const call = stub.calls[0]!;
    assert.equal(call.url, `${BASE}/connection`);
    assert.equal(call.method, "GET");
    assert.equal(call.headers["x-company-id"], SCOPE.companyId);
    assert.equal(call.headers["x-client-id"], SCOPE.clientId);
  });

  it("refuses to call without a client (no request leaves the process)", async () => {
    await assert.rejects(() => youtubeApi.channel({ companyId: SCOPE.companyId, clientId: "" }), (e: unknown) => ApiError.isApiError(e) && e.code === "NO_CLIENT_SELECTED");
    assert.equal(stub.calls.length, 0);
  });

  it("never sends credentials in a URL or an Authorization header", async () => {
    await youtubeApi.videos(SCOPE, { pageSize: 50 });
    const call = stub.calls[0]!;
    assert.equal(call.headers.Authorization, undefined);
    assert.ok(!/token|key|secret/i.test(call.url));
  });
});

describe("pagination tokens", () => {
  it("omits pageToken entirely on the first page", async () => {
    await youtubeApi.videos(SCOPE, { pageSize: 50 });
    assert.equal(stub.calls[0]!.url, `${BASE}/videos?pageSize=50`);
  });

  it("passes a provider token back unchanged (only URL-encoded)", async () => {
    await youtubeApi.videos(SCOPE, { pageToken: "CAUQAA", pageSize: 50 });
    assert.equal(stub.calls[0]!.url, `${BASE}/videos?pageToken=CAUQAA&pageSize=50`);
    await youtubeApi.comments(SCOPE, "abcdefghijk", { pageToken: "EAAaBlBUOkNBVQ==" });
    assert.ok(stub.calls[1]!.url.includes("pageToken=EAAaBlBUOkNBVQ%3D%3D"), stub.calls[1]!.url);
  });

  it("never sends undefined, null, NaN or empty tokens", async () => {
    for (const bad of [undefined, null, "", "undefined", "null", "NaN"]) {
      stub.reset();
      await youtubeApi.playlists(SCOPE, { pageToken: bad as string | null | undefined });
      assert.ok(!stub.calls[0]!.url.includes("pageToken"), `token ${String(bad)} leaked: ${stub.calls[0]!.url}`);
    }
    assert.equal(cleanPageToken("real-token_1"), "real-token_1");
  });

  it("applies the same rule to replies, live and playlist items", async () => {
    await youtubeApi.replies(SCOPE, "Ugabc.123", { pageToken: "undefined" });
    await youtubeApi.liveBroadcasts(SCOPE, { status: "upcoming", pageToken: null });
    await youtubeApi.playlistItems(SCOPE, "PLabc", { pageToken: "" });
    assert.ok(stub.calls.every((c) => !c.url.includes("pageToken")));
  });
});

describe("videos, uploads, publishing", () => {
  it("updates only the given fields with PATCH", async () => {
    await youtubeApi.updateVideo(SCOPE, "abcdefghijk", { title: "New", privacyStatus: "private" });
    const call = stub.calls[0]!;
    assert.equal(call.method, "PATCH");
    assert.equal(call.url, `${BASE}/videos/abcdefghijk`);
    assert.deepEqual(call.body, { title: "New", privacyStatus: "private" });
  });

  it("deletes a video with DELETE", async () => {
    await youtubeApi.deleteVideo(SCOPE, "abcdefghijk");
    assert.equal(stub.calls[0]!.method, "DELETE");
    assert.equal(stub.calls[0]!.url, `${BASE}/videos/abcdefghijk`);
  });

  it("creates an upload from a media asset id with an Idempotency-Key and an explicit privacy", async () => {
    const key = newIdempotencyKey();
    await youtubeApi.createUpload(SCOPE, { assetId: "33333333-3333-4333-8333-333333333333", title: "T", privacyStatus: "private" }, key);
    const call = stub.calls[0]!;
    assert.equal(call.url, `${BASE}/uploads`);
    assert.equal(call.method, "POST");
    assert.equal(call.headers["Idempotency-Key"], key);
    const body = call.body as Record<string, unknown>;
    assert.equal(body.privacyStatus, "private");
    assert.equal(body.assetId, "33333333-3333-4333-8333-333333333333");
    assert.ok(!("path" in body) && !("url" in body), "an upload references a media asset, never a path or URL");
  });

  it("generates a distinct Idempotency-Key per logical submission", () => {
    assert.notEqual(newIdempotencyKey(), newIdempotencyKey());
    assert.ok(newIdempotencyKey().length >= 16);
  });

  it("publishes with an explicit target and an Idempotency-Key", async () => {
    await youtubeApi.publish(SCOPE, "abcdefghijk", "unlisted", "key-1");
    const call = stub.calls[0]!;
    assert.equal(call.url, `${BASE}/videos/abcdefghijk/publish`);
    assert.deepEqual(call.body, { targetPrivacyStatus: "unlisted" });
    assert.equal(call.headers["Idempotency-Key"], "key-1");
  });

  it("schedules with a target, an ISO time that carries its offset, and an Idempotency-Key", async () => {
    await youtubeApi.schedule(SCOPE, "abcdefghijk", "public", "2026-10-05T04:30:00.000Z", "key-2");
    const call = stub.calls[0]!;
    assert.equal(call.url, `${BASE}/videos/abcdefghijk/schedule`);
    assert.deepEqual(call.body, { targetPrivacyStatus: "public", scheduledAt: "2026-10-05T04:30:00.000Z" });
    assert.match((call.body as { scheduledAt: string }).scheduledAt, /(Z|[+-]\d\d:\d\d)$/);
    assert.equal(call.headers["Idempotency-Key"], "key-2");
  });

  it("reschedules and cancels through /schedules/:id", async () => {
    await youtubeApi.reschedule(SCOPE, "44444444-4444-4444-8444-444444444444", "2026-10-06T04:30:00.000Z");
    await youtubeApi.cancelSchedule(SCOPE, "44444444-4444-4444-8444-444444444444");
    assert.equal(stub.calls[0]!.method, "PATCH");
    assert.equal(stub.calls[1]!.method, "DELETE");
    assert.ok(stub.calls[1]!.url.endsWith("/schedules/44444444-4444-4444-8444-444444444444"));
  });

  it("sets a thumbnail from an IMAGE asset id", async () => {
    await youtubeApi.setThumbnail(SCOPE, "abcdefghijk", "55555555-5555-4555-8555-555555555555");
    assert.equal(stub.calls[0]!.url, `${BASE}/videos/abcdefghijk/thumbnail`);
    assert.deepEqual(stub.calls[0]!.body, { assetId: "55555555-5555-4555-8555-555555555555" });
  });
});

describe("playlists", () => {
  it("creates, updates, deletes, adds, moves and removes with the backend routes", async () => {
    await youtubeApi.createPlaylist(SCOPE, { title: "P", privacyStatus: "private" });
    await youtubeApi.updatePlaylist(SCOPE, "PLabc", { title: "Q" });
    await youtubeApi.deletePlaylist(SCOPE, "PLabc");
    await youtubeApi.addPlaylistItem(SCOPE, "PLabc", "abcdefghijk", 2);
    await youtubeApi.movePlaylistItem(SCOPE, "PLabc", "item.123", 0);
    await youtubeApi.removePlaylistItem(SCOPE, "PLabc", "item.123");
    assert.deepEqual(stub.calls.map((c) => `${c.method} ${c.url.replace(BASE, "")}`), [
      "POST /playlists",
      "PATCH /playlists/PLabc",
      "DELETE /playlists/PLabc",
      "POST /playlists/PLabc/items",
      "PATCH /playlists/PLabc/items/item.123",
      "DELETE /playlists/PLabc/items/item.123",
    ]);
    assert.deepEqual(stub.calls[3]!.body, { videoId: "abcdefghijk", position: 2 });
    assert.deepEqual(stub.calls[4]!.body, { position: 0 });
  });
});

describe("comments", () => {
  it("lists per video with the moderation filter", async () => {
    await youtubeApi.comments(SCOPE, "abcdefghijk", { filter: "heldForReview", order: "time", pageSize: 50 });
    assert.equal(stub.calls[0]!.url, `${BASE}/videos/abcdefghijk/comments?pageSize=50&order=time&filter=heldForReview`);
  });

  it("replies, edits, deletes, moderates and rejects through the backend routes", async () => {
    await youtubeApi.replyToComment(SCOPE, "Ugx.1", "thanks");
    await youtubeApi.updateComment(SCOPE, "Ugx.1", "edited");
    await youtubeApi.deleteComment(SCOPE, "Ugx.1");
    await youtubeApi.moderateComment(SCOPE, "Ugx.1", "heldForReview");
    await youtubeApi.rejectComment(SCOPE, "Ugx.1");
    assert.deepEqual(stub.calls.map((c) => `${c.method} ${c.url.replace(BASE, "")}`), [
      "POST /comments/Ugx.1/replies",
      "PATCH /comments/Ugx.1",
      "DELETE /comments/Ugx.1",
      "POST /comments/Ugx.1/moderation",
      "POST /comments/Ugx.1/reject",
    ]);
    assert.deepEqual(stub.calls[0]!.body, { text: "thanks" });
    assert.deepEqual(stub.calls[3]!.body, { status: "heldForReview" });
  });
});

describe("analytics", () => {
  const range = { startDate: "2026-09-06", endDate: "2026-10-03" };

  it("always sends both dates", async () => {
    await youtubeApi.analyticsOverview(SCOPE, range);
    assert.equal(stub.calls[0]!.url, `${BASE}/analytics/overview?startDate=2026-09-06&endDate=2026-10-03`);
  });

  it("sends granularity and a comma-separated metric subset for series", async () => {
    await youtubeApi.analyticsTimeseries(SCOPE, range, { granularity: "day", metrics: ["views", "estimatedMinutesWatched"] });
    assert.ok(stub.calls[0]!.url.includes("granularity=day"));
    assert.ok(stub.calls[0]!.url.includes("metrics=views%2CestimatedMinutesWatched"));
  });

  it("uses the dedicated routes for video, traffic, geography, devices, audience and revenue", async () => {
    await youtubeApi.analyticsVideo(SCOPE, "abcdefghijk", range, "day");
    await youtubeApi.analyticsTrafficSources(SCOPE, range);
    await youtubeApi.analyticsPlaybackLocations(SCOPE, range);
    await youtubeApi.analyticsGeography(SCOPE, range, { page: 1, pageSize: 50 });
    await youtubeApi.analyticsDevices(SCOPE, range, "deviceType");
    await youtubeApi.analyticsAudience(SCOPE, range, "demographics");
    await youtubeApi.analyticsRevenue(SCOPE, range, { granularity: "total" });
    assert.deepEqual(stub.calls.map((c) => c.url.split("?")[0]!.replace(BASE, "")), [
      "/videos/abcdefghijk/analytics",
      "/analytics/traffic-sources",
      "/analytics/playback-locations",
      "/analytics/geography",
      "/analytics/devices",
      "/analytics/audience",
      "/analytics/revenue",
    ]);
  });
});

describe("live", () => {
  it("creates, binds and transitions with explicit bodies", async () => {
    await youtubeApi.createLiveBroadcast(SCOPE, { title: "L", scheduledStartTime: "2026-10-05T12:00:00.000Z", privacyStatus: "private" });
    await youtubeApi.bindLiveBroadcast(SCOPE, "bcast_01", "stream_01");
    await youtubeApi.transitionLiveBroadcast(SCOPE, "bcast_01", "live", true);
    assert.equal(stub.calls[0]!.url, `${BASE}/live/broadcasts`);
    assert.equal((stub.calls[0]!.body as { privacyStatus: string }).privacyStatus, "private");
    assert.deepEqual(stub.calls[1]!.body, { streamId: "stream_01" });
    assert.deepEqual(stub.calls[2]!.body, { status: "live", confirmGoLive: true });
  });

  it("reads the stream key only from the dedicated credentials route", async () => {
    await youtubeApi.liveStreams(SCOPE);
    await youtubeApi.liveStreamCredentials(SCOPE, "stream_01");
    assert.equal(stub.calls[0]!.url, `${BASE}/live/streams`);
    assert.equal(stub.calls[1]!.url, `${BASE}/live/streams/stream_01/credentials`);
  });

  it("sends chat text only in the body", async () => {
    await youtubeApi.sendLiveChatMessage(SCOPE, "bcast_01", "hello");
    assert.equal(stub.calls[0]!.url, `${BASE}/live/broadcasts/bcast_01/chat/messages`);
    assert.deepEqual(stub.calls[0]!.body, { text: "hello" });
  });
});

describe("incremental consent", () => {
  it("sends only the named capability, never a Google scope", async () => {
    stub.respond(200, { authUrl: "https://accounts.google.com/o/oauth2/v2/auth?x=1" });
    await youtubeApi.initConsent(SCOPE, "YOUTUBE_MANAGE_CONTENT");
    const call = stub.calls[0]!;
    assert.equal(call.url, "/api/v1/integrations/oauth/init");
    assert.deepEqual(call.body, { provider: "YOUTUBE", capability: "YOUTUBE_MANAGE_CONTENT" });
    assert.equal(containsRawScope(call.body), false);
  });

  it("starts the initial connection with no capability at all", async () => {
    await youtubeApi.initConsent(SCOPE);
    assert.deepEqual(stub.calls[0]!.body, { provider: "YOUTUBE" });
  });

  it("disconnects the company login with DELETE", async () => {
    await youtubeApi.disconnect(SCOPE);
    assert.equal(stub.calls[0]!.method, "DELETE");
    assert.equal(stub.calls[0]!.url, "/api/v1/integrations/YOUTUBE");
  });
});

describe("error bodies", () => {
  it("surfaces the stable reason and the required capability on a 409", async () => {
    stub.respond(409, { statusCode: 409, message: "needs permission", reason: "youtube_additional_permission_required", requiredCapability: "YOUTUBE_MANAGE_CONTENT" });
    await assert.rejects(
      () => youtubeApi.updateVideo(SCOPE, "abcdefghijk", { title: "x" }),
      (e: unknown) => ApiError.isApiError(e) && e.status === 409 && e.reason === "youtube_additional_permission_required" && e.details?.requiredCapability === "YOUTUBE_MANAGE_CONTENT",
    );
  });
});

afterEach(() => undefined);
process.on("exit", () => stub.restore());
