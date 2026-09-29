import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { instagramPublishError } from "../instagram-publish-policy";

describe("Instagram publish format policy", () => {
  it("allows one image feed post and one video Reel", () => {
    assert.equal(instagramPublishError("feed-post", ["image"]), null);
    assert.equal(instagramPublishError("reel", ["video"]), null);
  });

  it("rejects text-only, multi-item, Story, and Carousel formats", () => {
    assert.match(instagramPublishError("feed-post", []) ?? "", /exactly one/);
    assert.match(instagramPublishError("feed-post", ["image", "image"]) ?? "", /one image or one video/);
    assert.match(instagramPublishError("story", ["video"]) ?? "", /single-image feed post/);
    assert.match(instagramPublishError("carousel", ["image", "image"]) ?? "", /single-image feed post/);
  });

  it("rejects image/video mismatches for the selected content type", () => {
    assert.match(instagramPublishError("feed-post", ["video"]) ?? "", /feed posts require one image/);
    assert.match(instagramPublishError("reel", ["image"]) ?? "", /Reels require one video/);
  });
});