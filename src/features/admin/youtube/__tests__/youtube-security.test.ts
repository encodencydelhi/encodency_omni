/**
 * Source-level guards for the YouTube feature. They fail the build of confidence, not the app: a leftover mock import, a stray
 * console statement, a fake delay or a stream key written to storage is caught here before it reaches a browser.
 */
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const APP_ROUTES = join(ROOT, "..", "..", "..", "app", "admin", "youtube");

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) return name === "__tests__" ? [] : walk(full);
    return /\.(ts|tsx)$/.test(name) ? [full] : [];
  });
}

const files = [...walk(ROOT), ...walk(APP_ROUTES)].map((path) => ({ path, rel: relative(ROOT, path).replaceAll("\\", "/"), text: readFileSync(path, "utf8") }));

function offenders(test: (f: (typeof files)[number]) => boolean): string[] {
  return files.filter(test).map((f) => f.rel);
}

describe("mock removal", () => {
  it("has no mock data module and no production import of one", () => {
    assert.deepEqual(offenders((f) => /data\/mock["']/.test(f.text) || f.rel.endsWith("data/mock.ts")), []);
  });

  it("uses none of the old fake generators or fixtures", () => {
    const names = /\b(mockChannel|mockConnection|mockVideos|mockPlaylists|mockComments|mockLiveEvents|mockAudience|mockSettings|buildSeries|buildRevenue|buildRetention|buildRealtime|THUMBNAIL_LIBRARY|YT_MOCK_MODE)\b/;
    assert.deepEqual(offenders((f) => names.test(f.text)), []);
  });

  it("has no simulator controls, fake latency or random data", () => {
    assert.deepEqual(offenders((f) => /\bsimulate\b|\bsimulation\b|Math\.random|\bperform\(|failNextAction/.test(f.text)), []);
  });

  it("has no TODO / FIXME left behind", () => {
    assert.deepEqual(offenders((f) => /\b(TODO|FIXME|XXX)\b/.test(f.text)), []);
  });
});

describe("secrets and logging", () => {
  it("never logs", () => {
    assert.deepEqual(offenders((f) => /\bconsole\.(log|info|debug|warn|error|dir|trace)\b/.test(f.text)), []);
  });

  it("only the live module reads stream credentials, and never persists them", () => {
    const readers = offenders((f) => /liveStreamCredentials|revealStreamCredentials|streamName|ingestionAddress/.test(f.text)).sort();
    assert.deepEqual(readers, ["data/actions.ts", "live/youtube-api.ts", "live/youtube-dto.ts", "pages/live-page.tsx"]);
    assert.deepEqual(offenders((f) => /(localStorage|sessionStorage|indexedDB|document\.cookie)/.test(f.text) && /streamName|ingestionAddress|credentials/i.test(f.text)), []);
  });

  it("keeps credentials out of the React Query cache", () => {
    const hooks = files.find((f) => f.rel === "data/hooks.ts")!.text;
    assert.ok(!/credentials/i.test(hooks), "the credentials endpoint must not be wrapped in a cached query");
    const actions = files.find((f) => f.rel === "data/actions.ts")!.text;
    assert.ok(/revealStreamCredentials[\s\S]{0,400}liveStreamCredentials/.test(actions));
    assert.ok(!/setQueryData[^;]*credentials/i.test(actions));
  });

  it("does not store tokens or session URLs in browser storage", () => {
    assert.deepEqual(offenders((f) => /(localStorage|sessionStorage)\.setItem[^;]*(token|session|authUrl|upload)/i.test(f.text)), []);
  });

  it("never sends Google scope strings", () => {
    // The consent module only contains the detector that rejects such strings.
    assert.deepEqual(offenders((f) => /googleapis\.com\/auth|yt-analytics/.test(f.text) && f.rel !== "live/youtube-consent.ts"), []);
  });
});

describe("architecture", () => {
  it("calls the backend only from the typed API client", () => {
    const direct = offenders((f) => (/\bfetch\(/.test(f.text) || /apiClient\.request/.test(f.text)) && f.rel !== "live/youtube-api.ts");
    // the only other legitimate callers are the shared media-library client (imported, not called here) -> nothing else
    assert.deepEqual(direct, []);
  });

  it("keeps components and pages free of raw HTTP", () => {
    assert.deepEqual(offenders((f) => /^(components|pages)\//.test(f.rel) && /\bfetch\(|XMLHttpRequest|axios/.test(f.text)), []);
  });

  it("uses no `any`", () => {
    assert.deepEqual(offenders((f) => /:\s*any\b|<any>|\bas any\b/.test(f.text)), []);
  });

  it("does not default a privacy setting to public in any request builder", () => {
    const actions = files.find((f) => f.rel === "data/actions.ts")!.text;
    assert.ok(!/privacyStatus:\s*["']public["']/.test(actions));
    const upload = files.find((f) => f.rel === "pages/upload-page.tsx")!.text;
    assert.ok(/visibility:\s*"private"/.test(upload), "the upload flow starts private");
    assert.ok(/privacyStatus:\s*"private" as YouTubePrivacy/.test(upload), "the YouTube upload is always created private");
    const live = files.find((f) => f.rel === "pages/live-page.tsx")!.text;
    assert.ok(/visibility:\s*"private" as Visibility/.test(live), "new live events start private");
  });

  it("keeps the store free of server data caches of its own", () => {
    const store = files.find((f) => f.rel === "store/youtube-store.tsx")!.text;
    assert.ok(!/createStore|zustand|redux|useReducer/.test(store), "no second global state system");
  });
});
