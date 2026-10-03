import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

process.env.NEXT_PUBLIC_DATA_SOURCE = "api";

const { describeYouTubeError, describeYouTubeReason, isLiveNotEnabled, shouldRetryYouTubeQuery, youTubeErrorText } = await import("../live/youtube-errors");
const { ApiError } = await import("@/types/api");

const err = (status: number, reason: string | undefined, details: Record<string, unknown> = {}, message = "raw backend text") =>
  new ApiError({ code: status === 409 ? "CONFLICT" : status === 404 ? "NOT_FOUND" : "BAD_REQUEST", message, status, reason, details });

describe("central error mapper", () => {
  it("maps every stable backend reason to its own message (no code falls through to the generic one)", () => {
    const typesFile = fileURLToPath(new URL("../../../../../../backend/src/integrations/youtube/youtube-channel.types.ts", import.meta.url));
    if (!existsSync(typesFile)) return; // frontend checked out without the backend
    const codes = [...readFileSync(typesFile, "utf8").matchAll(/'(youtube_[a-z_]+)'/g)].map((m) => m[1]!);
    assert.ok(codes.length > 60, `expected the backend reason list, found ${codes.length}`);
    const generic = describeYouTubeError(err(400, "youtube_this_does_not_exist"));
    for (const code of codes) {
      const info = describeYouTubeError(err(409, code));
      assert.notEqual(info.title === generic.title && info.message === generic.message, true, `${code} has no mapped message`);
    }
  });

  it("never shows the raw backend message, provider JSON or stack text", () => {
    const provider = '{"error":{"code":403,"message":"quotaExceeded","errors":[{"reason":"quotaExceeded"}]}}';
    for (const reason of ["youtube_provider_error", "youtube_quota_exceeded", "something_unknown", undefined]) {
      const info = describeYouTubeError(err(502, reason, {}, provider));
      const shown = `${info.title} ${youTubeErrorText(info)}`;
      assert.ok(!shown.includes("quotaExceeded") && !shown.includes("{") && !shown.includes("errors"), shown);
    }
  });

  it("offers the named capability only when it is on the allow-list", () => {
    const ok = describeYouTubeError(err(409, "youtube_additional_permission_required", { requiredCapability: "YOUTUBE_MANAGE_CONTENT" }));
    assert.equal(ok.action, "grant");
    assert.equal(ok.capability, "YOUTUBE_MANAGE_CONTENT");
    const raw = describeYouTubeError(err(409, "youtube_additional_permission_required", { requiredCapability: "https://www.googleapis.com/auth/youtube" }));
    assert.equal(raw.action, "grant");
    assert.equal(raw.capability, null, "a raw scope string must never become a consent request");
  });

  it("separates analytics and revenue permissions", () => {
    assert.equal(describeYouTubeError(err(409, "youtube_analytics_permission_required", { requiredCapability: "YOUTUBE_READ_ANALYTICS" })).capability, "YOUTUBE_READ_ANALYTICS");
    assert.equal(describeYouTubeError(err(409, "youtube_monetary_analytics_permission_required", { requiredCapability: "YOUTUBE_READ_MONETARY_ANALYTICS" })).capability, "YOUTUBE_READ_MONETARY_ANALYTICS");
    assert.equal(describeYouTubeError(err(409, "youtube_upload_permission_required", { requiredCapability: "YOUTUBE_UPLOAD_VIDEO" })).capability, "YOUTUBE_UPLOAD_VIDEO");
  });

  it("sends a reconnect-required connection through the reconnect action", () => {
    assert.equal(describeYouTubeError(err(409, "youtube_reconnect_required")).action, "reconnect");
    assert.equal(describeYouTubeError(err(409, "youtube_not_connected")).action, "connect");
    assert.equal(describeYouTubeError(err(409, "youtube_channel_not_mapped")).action, "connect");
  });

  it("treats live-not-enabled as a capability state with no fix button", () => {
    const e = err(409, "youtube_live_not_enabled");
    assert.equal(isLiveNotEnabled(e), true);
    assert.equal(isLiveNotEnabled(err(409, "youtube_live_permission_required")), false);
    assert.equal(describeYouTubeError(e).action, "none");
  });

  it("handles network failures, missing scope and plain HTTP errors", () => {
    assert.equal(describeYouTubeError(new ApiError({ code: "NETWORK_ERROR", message: "x", status: 0 })).reason, "network_error");
    assert.equal(describeYouTubeError(new ApiError({ code: "NO_CLIENT_SELECTED", message: "x", status: 0 })).reason, "no_client_selected");
    assert.equal(describeYouTubeError(err(403, undefined)).action, "request_access");
    assert.equal(describeYouTubeError(new Error("boom")).reason, "unknown");
  });

  it("describes a stable code on its own (upload job failures)", () => {
    assert.equal(describeYouTubeReason("youtube_upload_failed").title, "Upload failed");
    assert.equal(describeYouTubeReason(null).reason, "unknown");
  });

  it("lists validation field names but never their values", () => {
    const info = describeYouTubeError(err(400, "youtube_invalid_video_metadata", { fields: ["title", "tags"] }));
    assert.deepEqual(info.fields, ["title", "tags"]);
  });
});

describe("query retry policy", () => {
  it("does not retry decisions (4xx) and retries outages at most twice", () => {
    assert.equal(shouldRetryYouTubeQuery(0, err(404, "youtube_video_not_found")), false);
    assert.equal(shouldRetryYouTubeQuery(0, err(409, "youtube_reconnect_required")), false);
    assert.equal(shouldRetryYouTubeQuery(0, new ApiError({ code: "SERVICE_UNAVAILABLE", message: "x", status: 503 })), true);
    assert.equal(shouldRetryYouTubeQuery(2, new ApiError({ code: "SERVICE_UNAVAILABLE", message: "x", status: 503 })), false);
    assert.equal(shouldRetryYouTubeQuery(0, new ApiError({ code: "NETWORK_ERROR", message: "x", status: 0 })), true);
  });
});
