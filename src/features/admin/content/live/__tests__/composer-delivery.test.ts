import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { deliveryCaption, deliveryTiming } from "../composer-delivery";

describe("composer delivery content and timing", () => {
  const master = { caption: "<p>Hello <strong>world</strong></p>", hashtags: ["hello", "hello"], link: "https://example.test" };
  it("delivers plain text, distinct hashtags and link", () => {
    assert.equal(deliveryCaption(master), "Hello world\n\n#hello\n\nhttps://example.test");
  });
  it("ignores disabled overrides and respects deliberately empty enabled captions", () => {
    assert.equal(deliveryCaption(master, { enabled: false, caption: "wrong" }), deliveryCaption(master));
    assert.equal(deliveryCaption(master, { enabled: true, caption: "", hashtags: [], link: "" }), "");
  });
  it("does not duplicate hashtags already in a caption", () => {
    assert.equal(deliveryCaption({ caption: "Hello #hello", hashtags: ["hello"], link: "" }), "Hello #hello");
  });
  it("applies tracking without losing existing query parameters", () => {
    const caption = deliveryCaption({...master, link:"https://example.test/?ref=existing"}, undefined, {source:"facebook",medium:"social",campaign:"summer sale",content:"",term:""});
    assert.ok(caption.includes("ref=existing"));
    assert.ok(caption.includes("utm_source=facebook"));
    assert.ok(caption.includes("utm_campaign=summer+sale"));
  });
  it("uses the selected channel CTA without duplicating existing copy", () => {
    assert.equal(deliveryCaption({caption:"Hello",hashtags:[],link:"",cta:"Read more"},{enabled:true,cta:"Join us"}),"Hello\n\nJoin us");
    assert.equal(deliveryCaption({caption:"Hello. Join us",hashtags:[],link:"",cta:"Join us"}),"Hello. Join us");
  });
  it("keeps draft channels out of delivery", () => {
    assert.deepEqual(deliveryTiming({platform:"facebook", schedule:"draft"}), {draft:true});
  });
  it("queues Now three minutes ahead and rejects incomplete scheduled choices", () => {
    const now = new Date("2026-10-30T10:00:00Z");
    assert.deepEqual(deliveryTiming(undefined, now), {scheduledFor:"2026-10-30T10:03:00.000Z"});
    assert.ok("error" in deliveryTiming({platform:"facebook",schedule:"later"}, now));
  });
});
