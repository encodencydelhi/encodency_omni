/**
 * Wire contract of `GET /api/v1/settings/organization` as the Settings page
 * loads it: the live record is the source of truth, including its empty
 * fields. When a live value is null, mock/session defaults (a full mock
 * address, industry, timezone, currency) must NOT be re-applied on top —
 * otherwise a "nothing changed" save fabricates company data on the server.
 *
 * `fetch` is stubbed — nothing leaves the process. Deliberately its own file:
 * `src/lib/api/__tests__/live-api-contracts.test.ts` is shared and must not be
 * touched here.
 */
import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";

process.env.NEXT_PUBLIC_DATA_SOURCE = "api";
process.env.NEXT_PUBLIC_API_BASE_URL = "/api/v1";

// SettingsRepository only reads live data when it believes it is in a
// browser, so a window + storage is faked for this file.
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
  dispatchEvent: () => true,
};
(globalThis as { localStorage?: Storage }).localStorage = fakeStorage;

const { SettingsRepository } = await import("../settings-data/repository");
const { setStoredTenancy } = await import("@/lib/api/tenancy-storage");

const COMPANY_ID = "b4e0eaba-f56e-4943-964f-f372b7574614";

interface Call {
  url: string;
  init: RequestInit & { headers: Record<string, string> };
}

const liveRecord = {
  id: COMPANY_ID,
  name: "Vana Tech Pvt Ltd",
  displayName: "Vana Tech Pvt Ltd",
  legalName: "Vana Tech",
  industry: null,
  website: null,
  contactEmail: null,
  contactPhone: null,
  description: null,
  address: null,
  taxId: null,
  pan: null,
  timezone: null,
  currency: null,
  revision: 42,
  updatedAt: "2026-10-09T11:50:12.409Z",
};

let calls: Call[] = [];
const realFetch = globalThis.fetch;

beforeEach(() => {
  calls = [];
  memory.clear();
  setStoredTenancy(COMPANY_ID);
  globalThis.fetch = (async (url: string, init: Call["init"]) => {
    const call = { url, init };
    calls.push(call);
    const path = new URL(String(url), "http://localhost").pathname;
    const status = path === "/api/v1/settings/organization" || path === "/api/v1/users/me" ? 200 : 404;
    const body =
      path === "/api/v1/settings/organization"
        ? liveRecord
        : path === "/api/v1/users/me"
          ? {
              id: "u_1",
              email: "owner@vanatech.test",
              memberships: [{ companyId: COMPANY_ID, companyName: "Vana Tech Pvt Ltd", companyStatus: "ACTIVE", role: "OWNER" }],
            }
          : { statusCode: 404, message: "Not Found" };
    return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
  }) as typeof fetch;
});

afterEach(() => {
  globalThis.fetch = realFetch;
});

const bodyOf = (call: Call) => JSON.parse(String(call.init.body)) as Record<string, unknown>;
const patches = () => calls.filter((call) => call.init.method === "PATCH");

const note = { action: "Updated organization profile", section: "organization" as const, setting: "Organization Profile" };

describe("GET /settings/organization (live record → Settings state)", () => {
  it("mirrors the record's empty fields instead of re-applying mock defaults", async () => {
    const loaded = await SettingsRepository.getSettings();
    const org = loaded.organization;

    assert.equal(org.metadata.revision, 42, "the live revision must be read");
    assert.equal(org.name, "Vana Tech Pvt Ltd");
    assert.equal(org.industry, "", "a null industry must load as empty, not as a mock value");
    assert.equal(org.timezone, "");
    assert.equal(org.currency, "");
    for (const [key, value] of Object.entries(org.address)) {
      if (key === "country") continue;
      assert.equal(value, "", `address.${key} must stay empty when the record has no address (mock leaked: ${value})`);
    }
    assert.notEqual(org.address.city, "New Delhi", "the mock address must never surface for a company without one");
  });

  it("does not fabricate an address or metadata on a nothing-changed save", async () => {
    const loaded = await SettingsRepository.getSettings();
    await SettingsRepository.saveSettings({ organization: loaded.organization }, note);

    assert.equal(patches().length, 1, "exactly one write");
    const sent = bodyOf(patches()[0]!);
    assert.equal(sent.expectedRevision, 42, "the read revision must be sent");
    assert.equal(sent.address, null, "an empty address must be sent as null, not as mock values");
    assert.equal(sent.industry, null);
    assert.equal(sent.timezone, null);
    assert.equal(sent.currency, null);
    assert.equal("name" in sent, false, "the read-only company name must never be in the body");
  });

  it("sends an address only once the operator has actually filled it in", async () => {
    const loaded = await SettingsRepository.getSettings();
    await SettingsRepository.saveSettings(
      { organization: { ...loaded.organization, address: { ...loaded.organization.address, city: "Pune", state: "Maharashtra" } } },
      note,
    );

    const sent = bodyOf(patches()[0]!);
    assert.deepEqual(sent.address, { street: null, city: "Pune", state: "Maharashtra", country: null, postalCode: null });
  });
});
