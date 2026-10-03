import assert from "node:assert/strict";
import { describe, it } from "node:test";

process.env.NEXT_PUBLIC_DATA_SOURCE = "api";

const { evaluateCapabilities, hasRbac, ROLE_CAPABILITIES } = await import("../lib/capabilities");
const { safeAuthUrl, isConsentCapability, containsRawScope } = await import("../live/youtube-consent");
const { createSingleFlight, createSubmissionKeys } = await import("../lib/submission");
const { csvCell } = await import("../lib/csv");
const { metadataPatch, pickDraft } = await import("../lib/video-patch");
const { channelHealth, videoOptimization } = await import("../lib/insights");
const { toVideo, emptyChannel } = await import("../data/mappers");
const { GRANTED_INFO } = await import("../lib/constants");

type Caps = Parameters<typeof evaluateCapabilities>[0];
const connected: Caps["connection"] = { state: "connected", lastSyncedAt: null, reason: null, requiresReconnect: false, companyConnectionAvailable: true };
const all = { readChannel: true, readAnalytics: true, readMonetaryAnalytics: true, uploadVideos: true, manageChannel: true };
const readOnly = { readChannel: true, readAnalytics: false, readMonetaryAnalytics: false, uploadVideos: false, manageChannel: false };
const features = { liveStreamingEnabled: true };
const caps = (over: Partial<Caps> = {}) => evaluateCapabilities({ connection: connected, granted: all, role: "ADMIN", features, ...over });

describe("capabilities", () => {
  it("mirrors the backend role table", () => {
    assert.equal(hasRbac("VIEWER", "content:write"), false);
    assert.equal(hasRbac("MANAGER", "content:write"), true);
    assert.equal(hasRbac("MANAGER", "content:publish"), false);
    assert.equal(hasRbac("MANAGER", "integrations:write"), false);
    assert.equal(hasRbac("ADMIN", "content:publish"), true);
    assert.deepEqual([...ROLE_CAPABILITIES.OWNER], [...ROLE_CAPABILITIES.ADMIN]);
    assert.equal(hasRbac(null, "integrations:read"), false);
  });

  it("allows an admin with every permission to do everything real", () => {
    const c = caps();
    for (const key of ["canUpload", "canEditVideo", "canDeleteVideo", "canPublish", "canSchedule", "canManagePlaylists", "canDeletePlaylist", "canReplyComments", "canModerateComments", "canRemoveComments", "canGoLive", "canTransitionLive", "canViewStreamKey", "canViewAnalytics", "canViewRevenue", "canManageConnection"] as const) {
      assert.equal(c[key].allowed, true, key);
    }
  });

  it("keeps approvals and workspace settings unavailable (no backend behind them)", () => {
    const c = caps();
    assert.equal(c.canApprove.allowed, false);
    assert.equal(c.canManageSettings.allowed, false);
  });

  it("asks for the right NAMED permission when a scope is missing", () => {
    const c = caps({ granted: readOnly });
    assert.deepEqual([c.canViewAnalytics.fix, c.canViewAnalytics.grant], ["grant", "YOUTUBE_READ_ANALYTICS"]);
    assert.deepEqual([c.canViewRevenue.fix, c.canViewRevenue.grant], ["grant", "YOUTUBE_READ_MONETARY_ANALYTICS"]);
    assert.deepEqual([c.canUpload.fix, c.canUpload.grant], ["grant", "YOUTUBE_UPLOAD_VIDEO"]);
    assert.deepEqual([c.canEditVideo.fix, c.canEditVideo.grant], ["grant", "YOUTUBE_MANAGE_CONTENT"]);
    for (const k of Object.values(c)) if (k.grant) assert.equal(isConsentCapability(k.grant), true);
  });

  it("keeps analytics and revenue permissions separate", () => {
    const c = caps({ granted: { ...readOnly, readAnalytics: true } });
    assert.equal(c.canViewAnalytics.allowed, true);
    assert.equal(c.canViewRevenue.allowed, false);
  });

  it("tells a role without access to ask an admin, not to grant a permission", () => {
    const c = caps({ role: "VIEWER" });
    assert.equal(c.canViewAnalytics.allowed, true);
    assert.equal(c.canEditVideo.allowed, false);
    assert.equal(c.canEditVideo.fix, "request_access");
    assert.equal(caps({ role: "MANAGER" }).canEditVideo.allowed, true);
    assert.equal(caps({ role: "MANAGER" }).canPublish.allowed, false);
    assert.equal(caps({ role: "MANAGER" }).canDeleteVideo.allowed, false);
  });

  it("blocks writes on an unusable connection with the right fix", () => {
    const state = (s: string) => caps({ connection: { ...connected, state: s as typeof connected.state } });
    assert.equal(state("token_expired").canPublish.fix, "reconnect");
    assert.equal(state("disconnected").canUpload.fix, "connect");
    assert.equal(state("not_mapped").canViewAnalytics.fix, "connect");
    assert.equal(state("quota_exceeded").canEditVideo.fix, "wait");
    // Managing the connection itself must stay possible so the person can fix it.
    assert.equal(state("token_expired").canManageConnection.allowed, true);
    assert.equal(state("disconnected").canManageConnection.allowed, true);
  });

  it("disables live actions when the channel is not enabled for Live", () => {
    const c = caps({ features: { liveStreamingEnabled: false } });
    assert.equal(c.canGoLive.allowed, false);
    assert.equal(c.canGoLive.fix, "enable_feature");
    assert.equal(c.canTransitionLive.allowed, false);
    assert.equal(c.canManagePlaylists.allowed, true);
  });
});

describe("consent safety", () => {
  it("only sends users to a Google https sign-in page", () => {
    assert.ok(safeAuthUrl("https://accounts.google.com/o/oauth2/v2/auth?client_id=x"));
    assert.equal(safeAuthUrl("http://accounts.google.com/o/oauth2/v2/auth"), null);
    assert.equal(safeAuthUrl("https://evil.example.com/o/oauth2/v2/auth"), null);
    assert.equal(safeAuthUrl("https://accounts.google.com.evil.example/auth"), null);
    assert.equal(safeAuthUrl("javascript:alert(1)"), null);
    assert.equal(safeAuthUrl(undefined), null);
  });

  it("recognises only the four named capabilities", () => {
    for (const c of ["YOUTUBE_MANAGE_CONTENT", "YOUTUBE_UPLOAD_VIDEO", "YOUTUBE_READ_ANALYTICS", "YOUTUBE_READ_MONETARY_ANALYTICS"]) assert.equal(isConsentCapability(c), true);
    assert.equal(isConsentCapability("https://www.googleapis.com/auth/youtube"), false);
    assert.equal(isConsentCapability("yt-analytics.readonly"), false);
    assert.equal(containsRawScope({ capability: "https://www.googleapis.com/auth/youtube.upload" }), true);
    assert.equal(containsRawScope({ capability: "YOUTUBE_UPLOAD_VIDEO" }), false);
  });

  it("maps each permission to at most one named capability", () => {
    const named = Object.values(GRANTED_INFO).map((i) => i.consent).filter(Boolean);
    assert.equal(new Set(named).size, named.length);
    assert.equal(GRANTED_INFO.readChannel.consent, null);
  });
});

describe("double-submit protection", () => {
  it("ignores a second call while the first one is running", async () => {
    const flight = createSingleFlight();
    let runs = 0;
    let release: () => void = () => undefined;
    const gate = new Promise<void>((r) => (release = r));
    const first = flight.run("reply:c1", async () => {
      runs += 1;
      await gate;
      return "ok";
    });
    const second = await flight.run("reply:c1", async () => {
      runs += 1;
      return "dup";
    });
    assert.deepEqual(second, { ran: false });
    release();
    assert.deepEqual(await first, { ran: true, value: "ok" });
    assert.equal(runs, 1);
    // Once finished the same key can run again, and other keys never block each other.
    assert.deepEqual(await flight.run("reply:c1", async () => "again"), { ran: true, value: "again" });
  });

  it("releases the key when the action fails", async () => {
    const flight = createSingleFlight();
    await assert.rejects(() => flight.run("k", async () => Promise.reject(new Error("x"))));
    assert.equal(flight.isRunning("k"), false);
  });

  it("keeps ONE Idempotency-Key per logical submission", () => {
    let n = 0;
    const keys = createSubmissionKeys(() => `key-${++n}`);
    const a = keys.keyFor("upload", "input-A");
    assert.equal(keys.keyFor("upload", "input-A"), a, "a retry of the same input re-uses the key");
    assert.notEqual(keys.keyFor("upload", "input-B"), a, "changed input is a new submission");
    const b = keys.keyFor("upload", "input-B");
    keys.forget("upload");
    assert.notEqual(keys.keyFor("upload", "input-B"), b, "a finished submission never re-uses its key");
    assert.notEqual(keys.keyFor("publish", "input-A"), a, "different actions never share a key");
  });
});

describe("csv", () => {
  it("neutralises spreadsheet formulas but leaves numbers alone", () => {
    assert.equal(csvCell("=HYPERLINK(\"x\")"), `"'=HYPERLINK(""x"")"`);
    assert.equal(csvCell("+1"), `"'+1"`);
    assert.equal(csvCell("@cmd"), `"'@cmd"`);
    assert.equal(csvCell(-5), `"-5"`);
    assert.equal(csvCell("plain"), `"plain"`);
  });
});

describe("metadata patch", () => {
  const dto = {
    id: "abcdefghijk", title: "Old", description: "Desc", publishedAt: "2026-09-01T00:00:00Z", channelId: "UC", channelTitle: "C",
    thumbnails: { default: null, medium: null, high: null, standard: null, maxres: null }, tags: ["a"], categoryId: "22", defaultLanguage: null, defaultAudioLanguage: null,
    statistics: { views: "1", likes: "1", comments: "1" }, content: { duration: null, durationSeconds: 100, dimension: null, definition: null, caption: null, licensedContent: null },
    status: { uploadStatus: "processed", privacyStatus: "private", publishAt: null, embeddable: true, madeForKids: false, selfDeclaredMadeForKids: false }, live: { liveBroadcastContent: "none" },
  } as Parameters<typeof toVideo>[0];
  const video = toVideo(dto);

  it("sends nothing when nothing changed", () => {
    assert.deepEqual(metadataPatch(video, pickDraft(video)), {});
  });

  it("sends only the fields that changed", () => {
    assert.deepEqual(metadataPatch(video, { ...pickDraft(video), title: "  New  ", tags: ["a", "b"] }), { title: "New", tags: ["a", "b"] });
    assert.deepEqual(metadataPatch(video, { ...pickDraft(video), visibility: "unlisted", madeForKids: true }), { privacyStatus: "unlisted", madeForKids: true });
  });
});

describe("insights use only real data", () => {
  const channel = { ...emptyChannel(), description: "x".repeat(100), keywords: ["rivers"], bannerUrl: "https://x/y.png", avatarUrl: "https://x/z.png" };

  it("leaves out factors whose input is unavailable instead of inventing a score", () => {
    const { factors } = channelHealth(channel, [], null);
    const keys = factors.map((f) => f.key);
    assert.ok(!keys.includes("engagement") && !keys.includes("growth") && !keys.includes("thumbnails") && !keys.includes("community"));
    assert.ok(!keys.includes("monetization"), "monetization eligibility is unknowable through the API");
  });

  it("adds engagement and growth only with a real comparison", () => {
    const period = (views: number, likes: number, comments: number, net: number) => ({ views, likes, comments, netSubscribers: net, watchTime: null, avgViewDuration: null });
    const { factors } = channelHealth(channel, [], { current: period(1000, 80, 20, 12), previous: period(1000, 50, 10, 6) });
    assert.ok(factors.some((f) => f.key === "engagement") && factors.some((f) => f.key === "growth"));
  });

  it("scores a video from its own metadata and the channel's own keywords", () => {
    const v = toVideo({ id: "abcdefghijk", title: "Rivers of India: a long guide", description: "x".repeat(300), publishedAt: null, channelId: null, channelTitle: null, thumbnails: { default: null, medium: null, high: null, standard: null, maxres: null }, tags: ["a", "b", "c", "d", "e"], categoryId: "22", defaultLanguage: null, defaultAudioLanguage: null, statistics: { views: "1", likes: null, comments: null }, content: { duration: null, durationSeconds: 100, dimension: null, definition: null, caption: null, licensedContent: null }, status: { uploadStatus: "processed", privacyStatus: "public", publishAt: null, embeddable: true, madeForKids: false, selfDeclaredMadeForKids: false }, live: { liveBroadcastContent: "none" } });
    assert.ok(videoOptimization(v, ["rivers"]).factors.some((f) => f.key === "keywords"));
    assert.ok(!videoOptimization(v, []).factors.some((f) => f.key === "keywords"), "no channel keywords -> no keyword factor");
  });
});
