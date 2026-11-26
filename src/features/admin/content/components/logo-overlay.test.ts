import assert from "node:assert/strict";
import test from "node:test";
import { logoPlacement } from "./logo-placement";

const square = { width: 1080, height: 1080 };

test("the logo sits in the chosen corner with a 4% margin and keeps its shape", () => {
  const wide = { width: 400, height: 100 };
  assert.deepEqual(logoPlacement(square, wide, "top-right", "medium"), { x: 1080 - 43 - 216, y: 43, width: 216, height: 54 });
  assert.deepEqual(logoPlacement(square, wide, "bottom-left", "small"), { x: 43, y: 1080 - 43 - 38, width: 151, height: 38 });
});

test("a tall logo is capped at 30% of the image height", () => {
  const tall = { width: 100, height: 400 };
  const place = logoPlacement(square, tall, "top-left", "large");
  assert.equal(place.height, 324);
  assert.equal(place.width, 81);
});

test("the brand banner keeps the headline clear of the logo", async () => {
  const { bannerLayout } = await import("./logo-placement");
  const layout = bannerLayout(square, { width: 400, height: 100 });
  assert.deepEqual(layout.band, { x: 0, y: 886, width: 1080, height: 194 });
  assert.ok(layout.logo && layout.logo.x + layout.logo.width <= 1080);
  assert.ok(layout.text.x + layout.text.maxWidth < layout.logo!.x);
  assert.equal(bannerLayout(square, null).logo, null);
});
