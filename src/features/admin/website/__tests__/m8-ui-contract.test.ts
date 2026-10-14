import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();

function file(path: string) {
  return readFileSync(join(root, path), "utf8");
}

test("M8 competitor route exposes real management actions", () => {
  const route = file("src/app/admin/website/competitors/page.tsx");
  const page = file("src/features/admin/website/components/pages/competitors-page.tsx");

  assert.match(route, /WebsiteCompetitorsPage/);
  assert.match(page, /useCompetitorAnalysis/);
  assert.match(page, /useCompetitorMutations/);
  assert.match(page, /mutations\.add\.mutate/);
  assert.match(page, /mutations\.analyze\.mutate/);
  assert.match(page, /mutations\.archive\.mutate/);
  assert.match(page, /Traffic, backlinks and rankings stay unavailable/);
});

test("M8 tracking route exposes privacy controls and persisted event dashboard", () => {
  const route = file("src/app/admin/website/tracking/page.tsx");
  const page = file("src/features/admin/website/components/pages/tracking-page.tsx");

  assert.match(route, /WebsiteTrackingPage/);
  assert.match(page, /useOmniTracking/);
  assert.match(page, /useTrackingSnippet/);
  assert.match(page, /useTrackingMutations/);
  assert.match(page, /Tracking enabled/);
  assert.match(page, /Consent required/);
  assert.match(page, /Anonymous mode/);
  assert.match(page, /mutations\.verify\.mutate/);
  assert.match(page, /Real persisted events only/);
});
