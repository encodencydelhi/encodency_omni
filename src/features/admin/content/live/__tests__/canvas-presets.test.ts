import assert from "node:assert/strict";
import test from "node:test";
import { CANVAS_GROUPS, CANVAS_PRESETS, canvasPreset } from "../../config/canvas-presets";
import { coverCrop } from "../../lib/cover-crop";

const [maxPixels, minPixels] = [1536 * 1536, 655_360];

test("every canvas asks the model for a size it accepts and keeps the canvas shape", () => {
  const ids = new Set<string>();
  for (const preset of CANVAS_PRESETS) {
    assert.ok(!ids.has(preset.id), `${preset.id} is listed twice`);
    ids.add(preset.id);
    const [w, h] = preset.request.split("x").map(Number) as [number, number];
    assert.ok(w % 16 === 0 && h % 16 === 0, `${preset.id}: request edges must be multiples of 16`);
    assert.ok(w / h <= 3 && h / w <= 3, `${preset.id}: ratio must be within 3:1`);
    assert.ok(w * h >= minPixels && w * h <= maxPixels, `${preset.id}: request pixels out of range`);
    assert.ok(w <= 2048 && h <= 2048, `${preset.id}: edge above the platform limit`);
    // The crop to the exact canvas may only trim a sliver, never a visible part of the picture.
    const crop = coverCrop(w, h, preset.width, preset.height);
    const kept = (crop.sw * crop.sh) / (w * h);
    assert.ok(kept > 0.97, `${preset.id}: the crop would remove ${(100 - kept * 100).toFixed(1)}% of the image`);
    assert.ok(CANVAS_GROUPS.includes(preset.group));
  }
});

test("the canvases cover the sizes the channels ask for", () => {
  const sizes = new Set(CANVAS_PRESETS.map((preset) => `${preset.width}x${preset.height}`));
  for (const wanted of ["1080x1080", "1080x1350", "1080x1920", "1200x627", "1920x1080", "1280x720", "1000x1500", "1500x500", "820x312", "1200x900"]) {
    assert.ok(sizes.has(wanted), `missing ${wanted}`);
  }
});

test("an unknown canvas falls back to the square one", () => {
  assert.equal(canvasPreset("nope").id, "square");
  assert.equal(canvasPreset("story-9-16").height, 1920);
});

test("coverCrop centres the part that fits and never stretches", () => {
  assert.deepEqual(coverCrop(1024, 1024, 1080, 1350), { sx: 103, sy: 0, sw: 819, sh: 1024 });
  assert.deepEqual(coverCrop(1536, 1024, 1200, 627), { sx: 0, sy: 111, sw: 1536, sh: 803 });
  assert.deepEqual(coverCrop(1088, 1360, 1080, 1350), { sx: 0, sy: 0, sw: 1088, sh: 1360 });
  const crop = coverCrop(1024, 1536, 1080, 1920);
  assert.ok(Math.abs(crop.sw / crop.sh - 1080 / 1920) < 0.002);
});
