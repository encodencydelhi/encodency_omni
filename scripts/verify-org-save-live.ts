/**
 * Live verification: the real `SettingsRepository` against the running backend.
 *
 * Not a unit test — it mints nothing and stubs nothing except the transport:
 * `fetch` is rewritten to the origin backend and carries a dev session cookie
 * (`VERIFY_SESSION`, raw value of an `omni_session` row), so the exact code the
 * Settings page runs talks to the exact API the browser talks to.
 *
 * Proves, end to end:
 *   1. `getSettings()` hydrates `metadata.revision` from the live record
 *      (a save on a freshly loaded page must never conflict).
 *   2. A normal save succeeds exactly once with that revision and leaves the
 *      company data unchanged.
 *   3. Saving again with the revision the first tab read at (the second-tab
 *      case) rejects with the backend's 409, is not retried, and is logged as
 *      a plain message — never as an Error object that would make the Next
 *      dev overlay paint the screen red.
 *   4. `refreshOrganizationRevision()` re-bases the state on the server's
 *      current revision so the operator can review and save again.
 *   5. A typed Street (`address.address` in the form, `address.street` in the
 *      API) lands in both the PATCH body and the server record.
 *   6. A second edit after a reload (typed `address` differs from the mirrored
 *      `street`) must send the typed value — for a long time the stale mirror
 *      won and every later edit silently changed nothing.
 *   7. Clearing every address field clears the record again, leaving the
 *      company byte-for-byte as it was found.
 *
 * Run:
 *   VERIFY_SESSION=<raw omni_session> node --import ./scripts/ts-test-hooks.mjs scripts/verify-org-save-live.ts
 */
import assert from "node:assert/strict";

process.env.NEXT_PUBLIC_DATA_SOURCE = "api";
process.env.NEXT_PUBLIC_API_BASE_URL = "/api/v1";

const SESSION = process.env.VERIFY_SESSION ?? "";
const ORIGIN = "http://127.0.0.1:4000";
const COMPANY_ID = "148350a0-aaf8-47de-941c-48f5791b3940";
if (!SESSION) throw new Error("VERIFY_SESSION (raw omni_session value) is required");

interface TrackedCall {
  method: string;
  path: string;
  status: number;
  body: string | null;
}

const calls: TrackedCall[] = [];
const realFetch = globalThis.fetch;

globalThis.fetch = (async (input: string | URL | Request, init: RequestInit = {}) => {
  const url = new URL(String(input), ORIGIN);
  const headers = new Headers(init.headers);
  headers.set("cookie", `omni_session=${SESSION}`);
  // The backend's CSRF guard requires an Origin that matches its own Host
  // (the browser sends localhost:3000, which is in the trusted set; this
  // script talks to the backend directly, so it uses the backend's origin).
  if (!headers.has("origin")) headers.set("origin", ORIGIN);
  const response = await realFetch(url, { ...init, headers });
  const body = typeof init.body === "string" ? init.body : null;
  calls.push({ method: (init.method ?? "GET").toUpperCase(), path: url.pathname, status: response.status, body });
  return response;
}) as typeof fetch;

// The browser path of SettingsRepository only runs when `window` exists.
const memory = new Map<string, string>();
const fakeStorage: Storage = {
  getItem: (key) => (memory.has(key) ? memory.get(key)! : null),
  setItem: (key, value) => void memory.set(key, String(value)),
  removeItem: (key) => void memory.delete(key),
  clear: () => void memory.clear(),
  key: (index) => Array.from(memory.keys())[index] ?? null,
  get length() {
    return memory.size;
  },
};
(globalThis as { window?: unknown }).window = {
  localStorage: fakeStorage,
  addEventListener() {},
  removeEventListener() {},
  dispatchEvent() {
    return true;
  },
};
(globalThis as { localStorage?: Storage }).localStorage = fakeStorage;

const { SettingsRepository } = await import("../src/features/admin/settings/settings-data/repository");
const { organizationApi, describeOrganizationError, isRevisionConflict } = await import(
  "../src/features/admin/settings/live/organization-api"
);
const { setStoredTenancy } = await import("@/lib/api/tenancy-storage");

const note = { action: "Live verification", section: "organization" as const, setting: "Organization Profile" };
const patches = () => calls.filter((call) => call.method === "PATCH" && call.path === "/api/v1/settings/organization");
const snapshot = (record: Awaited<ReturnType<typeof organizationApi.get>>) => ({
  name: record.name,
  displayName: record.displayName,
  legalName: record.legalName,
  description: record.description,
  website: record.website,
  contactEmail: record.contactEmail,
  timezone: record.timezone,
  currency: record.currency,
  address: record.address,
});
const clean = (value: string | null | undefined) => (value ?? "").trim();

setStoredTenancy(COMPANY_ID);

// ── 1. Fresh page load hydrates the revision from the live record ──────────
const loaded = await SettingsRepository.getSettings();
const loadedRevision = loaded.organization.metadata.revision;
assert.equal(typeof loadedRevision, "number", "getSettings() must hydrate metadata.revision from GET /settings/organization");

const before = await organizationApi.get(COMPANY_ID);
assert.equal(loadedRevision, before.revision, "the hydrated revision must equal the server's current revision");
assert.equal(clean(loaded.organization.displayName), clean(before.displayName), "loaded display name must match the server");
console.log(`PASS 1  hydrated revision ${loadedRevision} === server revision ${before.revision}`);

// ── 2. A normal single-tab save succeeds with that revision ────────────────
const saved = await SettingsRepository.saveSettings({ organization: loaded.organization }, note);
assert.equal(patches().length, 1, "exactly one write for a normal save");
const patchBody = JSON.parse(patches()[0]!.body!) as Record<string, unknown>;
assert.equal(patchBody.expectedRevision, before.revision, "the read revision must be sent");
assert.equal("name" in patchBody, false, "the read-only company name must never be in the body");
assert.equal(saved.organization.metadata.revision, before.revision + 1, "the saved state must carry the new revision");

const afterSave = await organizationApi.get(COMPANY_ID);
assert.deepEqual(snapshot(afterSave), snapshot(before), "a no-edit save must not change company data");
console.log(`PASS 2  single save -> 200, revision ${before.revision} -> ${afterSave.revision}, data unchanged`);

// ── 3. The second tab's write conflicts: one 409, no retry, clean log ──────
const logged: unknown[][] = [];
const realError = console.error;
const realWarn = console.warn;
console.error = (...args: unknown[]) => void logged.push(args);
console.warn = (...args: unknown[]) => void logged.push(args);

let conflict: unknown;
try {
  await SettingsRepository.saveSettings({ organization: loaded.organization }, note);
} catch (error) {
  conflict = error;
} finally {
  console.error = realError;
  console.warn = realWarn;
}

assert.ok(conflict, "the stale revision must reject instead of silently overwriting");
assert.ok(isRevisionConflict(conflict), "the rejection must be classified as a revision conflict");
assert.equal((conflict as { status?: number }).status, 409, "the backend must answer 409");
assert.equal(patches().length, 2, "exactly one new write for the conflicted save");
assert.equal(patches()[1]!.status, 409, "that write must be the 409 itself");
for (const args of logged) {
  for (const arg of args) {
    assert.ok(!(arg instanceof Error), "an Error object in the log paints the Next dev overlay full-screen");
  }
}
const message = describeOrganizationError(conflict);
assert.match(message, /another session/i, "the operator must get the reload guidance");
console.log(`PASS 3  stale save -> single 409, no retry, log has no Error object, toast: "${message}"`);

// ── 4. Re-base: read the server's current revision after the conflict ──────
const rebased = await SettingsRepository.refreshOrganizationRevision();
assert.equal(rebased, afterSave.revision, "refreshOrganizationRevision() must return the server's current revision");
console.log(`PASS 4  refreshOrganizationRevision() -> ${rebased} (server: ${afterSave.revision})`);

// ── 5. The Street the operator types must reach both the body and the record ──
const withStreet = await SettingsRepository.getSettings();
await SettingsRepository.saveSettings(
  { organization: { ...withStreet.organization, address: { ...withStreet.organization.address, address: "42 Live Verification Road" } } },
  note,
);
const streetPatch = JSON.parse(patches()[patches().length - 1]!.body!) as { address?: { street?: string | null } | null };
assert.equal(streetPatch.address?.street, "42 Live Verification Road", "the typed street must be in the PATCH body");
const afterStreet = await organizationApi.get(COMPANY_ID);
assert.equal(afterStreet.address?.street, "42 Live Verification Road", "the server must store the typed street");
console.log(`PASS 5  street edit -> PATCH body + server record ("${afterStreet.address?.street}")`);

// ── 6. Second edit after a reload: the typed value must beat the mirror ─────
// A reload mirrors the saved street into both `street` and `address`; the next
// edit only changes `address`, and for a long time that edit was dropped
// because the payload preferred the stale `street` mirror.
const reloading = await SettingsRepository.getSettings();
assert.equal(reloading.organization.address.street, "42 Live Verification Road", "the reload must mirror the saved street");
await SettingsRepository.saveSettings(
  { organization: { ...reloading.organization, address: { ...reloading.organization.address, address: "42 Live Verification Road, Block C" } } },
  note,
);
const secondPatch = JSON.parse(patches()[patches().length - 1]!.body!) as { address?: { street?: string | null } | null };
assert.equal(secondPatch.address?.street, "42 Live Verification Road, Block C", "the second edit must be sent, not the stale mirror");
const afterSecond = await organizationApi.get(COMPANY_ID);
assert.equal(afterSecond.address?.street, "42 Live Verification Road, Block C", "the server must store the second edit");
console.log(`PASS 6  second edit (mirror non-empty) -> "${afterSecond.address?.street}"`);

// ── 7. Leave the record exactly as it was found ────────────────────────────
const clearing = await SettingsRepository.getSettings();
await SettingsRepository.saveSettings(
  {
    organization: {
      ...clearing.organization,
      // `street` is deliberately left at the mirrored value: a cleared input
      // must win over it and clear the record.
      address: { ...clearing.organization.address, address: "", city: "", state: "", country: "", postalCode: "" },
    },
  },
  note,
);
const final = await organizationApi.get(COMPANY_ID);
assert.equal(final.address, null, "clearing every address field must clear the record");
assert.deepEqual(snapshot(final), snapshot(before), "the company must end exactly as it started");
console.log(`PASS 7  address restored to null, record identical to the start (revision ${final.revision})`);

console.log("\nALL 7 LIVE CHECKS PASSED against", ORIGIN);
