/**
 * Wire contract of `PATCH /api/v1/settings/organization` as Settings →
 * Organization actually drives it: which revision is sent, that a 409 reaches
 * the operator instead of being retried into a silent overwrite, and that the
 * read-only Company name is never pushed into `displayName`.
 *
 * `fetch` is stubbed — nothing leaves the process. Deliberately its own file:
 * `src/lib/api/__tests__/live-api-contracts.test.ts` is shared and must not be
 * touched here.
 */
import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";

process.env.NEXT_PUBLIC_DATA_SOURCE = "api";
process.env.NEXT_PUBLIC_API_BASE_URL = "/api/v1";

const { SettingsRepository } = await import("../settings-data/repository");
const { setStoredTenancy } = await import("@/lib/api/tenancy-storage");
const { ApiError } = await import("@/types/api");

const COMPANY_ID = "b4e0eaba-f56e-4943-964f-f372b7574614";

interface Call {
  url: string;
  init: RequestInit & { headers: Record<string, string> };
}

const organisation = (revision: number) => ({
  id: COMPANY_ID,
  name: "TechNova Solutions",
  displayName: "TechNova",
  legalName: "TechNova Solutions Pvt Ltd",
  industry: "Software",
  website: "https://technova.test",
  contactEmail: "hello@technova.test",
  contactPhone: "+911234567890",
  description: null,
  address: { street: null, city: null, state: null, country: "IN", postalCode: null },
  taxId: null,
  timezone: "Asia/Kolkata",
  currency: "INR",
  revision,
  updatedAt: "2026-10-09T09:00:00.000Z",
});

let calls: Call[] = [];
let respond: (call: Call) => { status: number; body: unknown };
const realFetch = globalThis.fetch;

beforeEach(() => {
  calls = [];
  respond = () => ({ status: 200, body: organisation(7) });
  setStoredTenancy(COMPANY_ID);
  globalThis.fetch = (async (url: string, init: Call["init"]) => {
    const call = { url, init };
    calls.push(call);
    const next = respond(call);
    return new Response(JSON.stringify(next.body), {
      status: next.status,
      headers: { "Content-Type": "application/json" },
    });
  }) as typeof fetch;
});

afterEach(() => {
  globalThis.fetch = realFetch;
});

const bodyOf = (call: Call) => JSON.parse(String(call.init.body)) as Record<string, unknown>;
const patches = () => calls.filter((call) => call.init.method === "PATCH");
const gets = () => calls.filter((call) => call.init.method === "GET");

const orgState = (metadata?: Record<string, unknown>) => ({
  name: "TechNova Solutions",
  displayName: "TechNova",
  legalName: "TechNova Solutions Pvt Ltd",
  industry: "Software",
  website: "https://technova.test",
  contactEmail: "hello@technova.test",
  contactPhone: "+911234567890",
  description: "",
  timezone: "Asia/Kolkata",
  currency: "INR",
  address: {
    address: "",
    street: "",
    city: "",
    state: "",
    country: "India",
    postalCode: "",
  },
  metadata: { owner: "Workspace Administrator", ...(metadata ?? {}) },
});

const note = { action: "Updated organization profile", section: "organization" as const, setting: "Organization Profile" };

describe("PATCH /settings/organization (Settings → Organization)", () => {
  it("sends the revision the state was read at, with no company scope surprises", async () => {
    respond = (call) => (call.init.method === "PATCH" ? { status: 200, body: organisation(8) } : { status: 200, body: organisation(7) });

    await SettingsRepository.saveSettings({ organization: orgState({ revision: 7 }) } as never, note);

    assert.equal(patches().length, 1);
    const patch = patches()[0]!;
    assert.equal(patch.url, "/api/v1/settings/organization");
    assert.equal(patch.init.headers["x-company-id"], COMPANY_ID);
    assert.equal(patch.init.credentials, "include");
    assert.equal(bodyOf(patch).expectedRevision, 7, "the read revision must be sent, never a guess");
    assert.equal(gets().length, 0, "no extra read when the state already carries a revision");
  });

  it("reads the revision first when the state carries none, instead of guessing 1", async () => {
    respond = (call) => (call.init.method === "PATCH" ? { status: 200, body: organisation(43) } : { status: 200, body: organisation(42) });

    await SettingsRepository.saveSettings({ organization: orgState() } as never, note);

    assert.equal(gets().length, 1, "one read to learn the current revision");
    assert.equal(bodyOf(patches()[0]!).expectedRevision, 42);
  });

  it("surfaces a revision conflict instead of retrying it into a silent overwrite", async () => {
    respond = (call) =>
      call.init.method === "PATCH"
        ? {
            status: 409,
            body: {
              message: "The organization profile was changed by someone else. Reload it before saving.",
              error: "Conflict",
              statusCode: 409,
              reason: "revision_conflict",
              currentRevision: 8,
            },
          }
        : { status: 200, body: organisation(7) };

    await assert.rejects(
      SettingsRepository.saveSettings({ organization: orgState({ revision: 7 }) } as never, note),
      (error: unknown) => ApiError.isApiError(error) && error.status === 409,
    );

    assert.equal(patches().length, 1, "the second tab's write must not be silently replayed");
    assert.equal(gets().length, 0, "no hidden reload-and-retry behind the operator's back");
  });

  it("logs a conflict as a plain message, never as an Error object", async () => {
    respond = (call) =>
      call.init.method === "PATCH"
        ? { status: 409, body: { message: "The organization profile was changed by someone else. Reload it before saving.", reason: "revision_conflict" } }
        : { status: 200, body: organisation(7) };

    const logged: unknown[][] = [];
    const realError = console.error;
    const realWarn = console.warn;
    console.error = (...args: unknown[]) => void logged.push(args);
    console.warn = (...args: unknown[]) => void logged.push(args);
    try {
      await assert.rejects(SettingsRepository.saveSettings({ organization: orgState({ revision: 7 }) } as never, note));
    } finally {
      console.error = realError;
      console.warn = realWarn;
    }

    assert.ok(logged.length > 0, "the failure must still be logged");
    for (const args of logged) {
      for (const arg of args) {
        assert.ok(!(arg instanceof Error), "an Error object in the log paints the Next dev overlay full-screen");
      }
    }
    assert.ok(
      logged.some((args) => args.some((arg) => typeof arg === "string" && arg.includes("changed by someone else"))),
      "the conflict message itself must be logged for debugging",
    );
  });

  it("re-bases a conflicted state on the server's current revision on demand", async () => {
    respond = () => ({ status: 200, body: organisation(9) });

    assert.equal(await SettingsRepository.refreshOrganizationRevision(), 9);
    assert.equal(gets().length, 1, "exactly one read, no write");
    assert.equal(gets()[0]!.url, "/api/v1/settings/organization");
  });

  it("sends a Street-only edit (form writes address.address, API field is street)", async () => {
    respond = (call) => (call.init.method === "PATCH" ? { status: 200, body: organisation(8) } : { status: 200, body: organisation(7) });

    await SettingsRepository.saveSettings(
      {
        organization: {
          ...orgState({ revision: 7 }),
          // exactly how the Street input writes it: `address.address`, while
          // `street` still holds the empty string the page was loaded with
          address: { address: "42 Residency Road", street: "", city: "", state: "", country: "India", postalCode: "" },
        },
      } as never,
      note,
    );

    const sent = bodyOf(patches()[0]!) as { address?: Record<string, unknown> | null };
    assert.ok(sent.address, "a street edit alone must count as an address");
    assert.equal(sent.address!.street, "42 Residency Road");
    assert.equal(sent.address!.city, null);
    assert.equal(sent.address!.country, "IN");
  });

  it("never drops an edited value from the PATCH body", async () => {
    respond = (call) => (call.init.method === "PATCH" ? { status: 200, body: organisation(8) } : { status: 200, body: organisation(7) });

    await SettingsRepository.saveSettings(
      {
        organization: {
          ...orgState({ revision: 7 }),
          legalName: "TechNova Solutions Private Limited",
          displayName: "TechNova Labs",
          industry: "Fintech",
          website: "https://technova.dev",
          contactEmail: "support@technova.dev",
          contactPhone: "+919876543210",
          description: "Edited by the operator",
          // the Street input writes `address.address`; `street` stays as loaded ("")
          address: { address: "12/4 Institutional Area", street: "", city: "Pune", state: "Maharashtra", country: "India", postalCode: "411001" },
        },
      } as never,
      note,
    );

    const sent = bodyOf(patches()[0]!);
    assert.equal(sent.legalName, "TechNova Solutions Private Limited");
    assert.equal(sent.displayName, "TechNova Labs");
    assert.equal(sent.industry, "Fintech");
    assert.equal(sent.website, "https://technova.dev");
    assert.equal(sent.contactEmail, "support@technova.dev");
    assert.equal(sent.contactPhone, "+919876543210");
    assert.equal(sent.description, "Edited by the operator");
    assert.deepEqual(
      sent.address,
      { street: "12/4 Institutional Area", city: "Pune", state: "Maharashtra", country: "IN", postalCode: "411001" },
      "the typed Street must land in address.street (an empty `street` must not swallow address.address)",
    );
  });

  it("prefers the typed Street over the stale street mirror from page load", async () => {
    respond = (call) => (call.init.method === "PATCH" ? { status: 200, body: organisation(8) } : { status: 200, body: organisation(7) });

    await SettingsRepository.saveSettings(
      {
        organization: {
          ...orgState({ revision: 7 }),
          // after a reload both fields hold the server value …
          address: { street: "12/4, Institutional Area, Lodhi Road", address: "12/4, Institutional Area, Lodhi Road", city: "New Delhi", state: "Delhi", country: "India", postalCode: "110003" },
        },
      } as never,
      note,
    );
    // … then the operator edits only the input, so `address` differs from the
    // untouched `street` mirror. A save in that state must send the edit.
    await SettingsRepository.saveSettings(
      {
        organization: {
          ...orgState({ revision: 8 }),
          address: { street: "12/4, Institutional Area, Lodhi Road", address: "12/4, Institutional Area, Lodhi Road, Block C", city: "New Delhi", state: "Delhi", country: "India", postalCode: "110003" },
        },
      } as never,
      note,
    );

    const sent = bodyOf(patches()[1]!) as { address?: Record<string, unknown> | null };
    assert.equal(sent.address!.street, "12/4, Institutional Area, Lodhi Road, Block C", "the typed value must be sent, not the stale mirror");
  });

  it("sends null when the operator clears the input, not the stale street mirror", async () => {
    respond = (call) => (call.init.method === "PATCH" ? { status: 200, body: organisation(8) } : { status: 200, body: organisation(7) });

    await SettingsRepository.saveSettings(
      {
        organization: {
          ...orgState({ revision: 7 }),
          address: { street: "12/4, Institutional Area, Lodhi Road", address: "", city: "", state: "", country: "", postalCode: "" },
        },
      } as never,
      note,
    );

    const sent = bodyOf(patches()[0]!) as { address?: Record<string, unknown> | null };
    assert.equal(sent.address, null, "an emptied address block must clear the record");
  });

  it("never writes the read-only Company name into displayName", async () => {
    respond = (call) => (call.init.method === "PATCH" ? { status: 200, body: organisation(8) } : { status: 200, body: organisation(7) });

    await SettingsRepository.saveSettings(
      { organization: { ...orgState({ revision: 7 }), name: "TechNova Solutions RENAMED", displayName: "" } } as never,
      note,
    );

    const sent = bodyOf(patches()[0]!);
    assert.equal("name" in sent, false, "the DTO has no `name` field — sending it would 400");
    assert.equal(sent.displayName, undefined, "an untouched Display Name must not be overwritten by the Company name");
    assert.equal(sent.legalName, "TechNova Solutions Pvt Ltd");
  });

  it("sends the Display Name the operator actually edited", async () => {
    respond = (call) => (call.init.method === "PATCH" ? { status: 200, body: organisation(8) } : { status: 200, body: organisation(7) });

    await SettingsRepository.saveSettings(
      { organization: { ...orgState({ revision: 7 }), displayName: "  TechNova Labs  " } } as never,
      note,
    );

    assert.equal(bodyOf(patches()[0]!).displayName, "TechNova Labs");
  });
});
