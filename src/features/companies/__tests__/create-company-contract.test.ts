/**
 * Wire contract of POST /api/v1/super-admin/companies as the Create Company
 * wizard actually drives it: exact URL, headers, the whitelisted body, the
 * organisation-profile follow-up, and how the response's one-time owner invite
 * link reaches the success screen. `fetch` is stubbed — nothing leaves the
 * process.
 *
 * Deliberately its own file: `src/lib/api/__tests__/live-api-contracts.test.ts`
 * is shared with other features and must not be touched here.
 */
import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";

process.env.NEXT_PUBLIC_DATA_SOURCE = "api";
process.env.NEXT_PUBLIC_API_BASE_URL = "/api/v1";
process.env.NEXT_PUBLIC_MOCK_LATENCY_MS = "0";

const { companiesRepository } = await import("../data/repository");
const { COUNTRIES, COUNTRY_CODES, countryToIso } = await import("../data/config");
const { ApiError } = await import("@/types/api");

interface Call {
  url: string;
  init: RequestInit & { headers: Record<string, string> };
}

/** Fields the backend DTO knows. Anything else here would 400 the create. */
const ALLOWED_KEYS = [
  "billingCycle",
  "contactEmail",
  "contactPhone",
  "country",
  "currency",
  "industry",
  "initialClient",
  "legalName",
  "mode",
  "name",
  "ownerEmail",
  "ownerName",
  "ownerPhone",
  "planTier",
  "timezone",
  "website",
];
/** Everything the wizard collects that the DTO does NOT accept. */
const FORBIDDEN_KEYS = [
  "logoUrl",
  "companySize",
  "startDate",
  "trialEndsAt",
  "limitOverride",
  "internalNotes",
  "language",
  "region",
  "existingUserId",
  "id",
  "status",
  "clientId",
];

const ACTOR = { id: "stf_001", name: "Aditya Raghunath" };

const input = {
  name: "  Northwind Labs  ",
  logoUrl: "data:image/png;base64,local-preview",
  legalName: "Northwind Labs Pvt Ltd",
  website: "northwind.test",
  industry: "Software",
  country: "India",
  companySize: "11-50" as const,
  contactEmail: " Hello@Northwind.test ",
  contactPhone: "+911234567890",
  owner: { name: "  Priya Owner  ", email: " Owner@Northwind.test ", phone: "+911234567891" },
  subscription: {
    planTier: "growth" as const,
    billingCycle: "annual" as const,
    mode: "trial" as const,
    startDate: "2026-10-09",
    trialEndsAt: "2026-10-23",
    internalNotes: "migrated from the spreadsheet",
  },
  workspace: { timezone: "Asia/Kolkata", currency: "INR", language: "English", region: "West" },
  initialClient: { name: "Northwind Site", websiteUrl: "northwind.test" },
};

/** The create response, plus the two organisation-profile calls it triggers. */
const createdBody = {
  id: "11111111-2222-4333-8444-555555555555",
  name: "Northwind Labs",
  status: "ACTIVE",
  archivedAt: null,
  createdAt: "2026-10-09T09:00:00.000Z",
  updatedAt: "2026-10-09T09:00:00.000Z",
  memberCount: 0,
  clientCount: 0,
  ownerEmail: null,
  ownerOnboarding: {
    state: "invited",
    ownerEmail: "owner@northwind.test",
    invitationExpiresAt: "2026-10-11T09:00:00.000Z",
    emailQueued: true,
  },
  logo: null,
  invitationToken: "one-time-token-abc",
  invitationUrl: "https://app.example.com/accept-invitation?token=one-time-token-abc",
};

const organisation = {
  id: createdBody.id,
  name: "Northwind Labs",
  displayName: "Northwind Labs",
  legalName: null,
  industry: null,
  website: null,
  contactEmail: null,
  contactPhone: null,
  description: null,
  address: null,
  taxId: null,
  timezone: null,
  currency: null,
  revision: 7,
  updatedAt: "2026-10-09T09:00:00.000Z",
};

let calls: Call[] = [];
let responses: Array<{ status: number; body: unknown }> = [];
const realFetch = globalThis.fetch;

beforeEach(() => {
  calls = [];
  responses = [];
  globalThis.fetch = (async (url: string, init: Call["init"]) => {
    calls.push({ url, init });
    const next = responses.shift() ?? { status: 200, body: {} };
    return new Response(next.status === 204 ? null : JSON.stringify(next.body), {
      status: next.status,
      headers: { "Content-Type": "application/json" },
    });
  }) as typeof fetch;
});

afterEach(() => {
  globalThis.fetch = realFetch;
});

const bodyOf = (call: Call) => JSON.parse(String(call.init.body)) as Record<string, unknown>;

/** Queues create + the organisation profile read/write it triggers. */
function queueHappyPath() {
  responses.push({ status: 201, body: createdBody });
  responses.push({ status: 200, body: organisation });
  responses.push({ status: 200, body: { ...organisation, revision: 8 } });
}

describe("POST /super-admin/companies (Create Company wizard)", () => {
  it("resolves to the live provider", () => {
    assert.equal(companiesRepository.mode, "api");
  });

  it("sends the whitelisted body only, with Idempotency-Key, cookies and no company scope", async () => {
    queueHappyPath();
    await companiesRepository.createCompany(input, ACTOR);

    assert.equal(calls.length, 3, "create + organisation read + organisation write");
    const create = calls[0]!;
    assert.equal(create.url, "/api/v1/super-admin/companies");
    assert.equal(create.init.method, "POST");
    assert.equal(create.init.credentials, "include");
    assert.ok(create.init.headers["Idempotency-Key"], "the backend rejects the create without it");
    assert.match(create.init.headers["Idempotency-Key"], /^[A-Za-z0-9_.:-]{8,128}$/, "Idempotency-Key must satisfy the backend pattern");
    assert.equal(create.init.headers["x-company-id"], undefined, "a platform Super Admin route must not carry a tenant scope");

    const sent = bodyOf(create);
    for (const key of Object.keys(sent)) {
      assert.ok(ALLOWED_KEYS.includes(key), `unexpected key "${key}" would be rejected with 400 forbidNonWhitelisted`);
    }
    for (const key of FORBIDDEN_KEYS) {
      assert.equal(sent[key], undefined, `"${key}" must not be sent to the create DTO`);
    }
    assert.deepEqual(Object.keys(sent).sort(), [
      "billingCycle",
      "contactEmail",
      "contactPhone",
      "country",
      "currency",
      "industry",
      "initialClient",
      "legalName",
      "mode",
      "name",
      "ownerEmail",
      "ownerName",
      "ownerPhone",
      "planTier",
      "timezone",
      "website",
    ]);
    assert.deepEqual(sent, {
      name: "Northwind Labs",
      ownerEmail: "owner@northwind.test",
      legalName: "Northwind Labs Pvt Ltd",
      industry: "Software",
      website: "northwind.test",
      contactEmail: "hello@northwind.test",
      contactPhone: "+911234567890",
      country: "India",
      ownerName: "Priya Owner",
      ownerPhone: "+911234567891",
      timezone: "Asia/Kolkata",
      currency: "INR",
      planTier: "growth",
      billingCycle: "annual",
      mode: "trial",
      initialClient: { name: "Northwind Site", website: "northwind.test" },
    });
  });

  it("continues with the organisation profile in the new company's context, on the expected revision", async () => {
    queueHappyPath();
    await companiesRepository.createCompany(input, ACTOR);

    const read = calls[1]!;
    assert.equal(read.url, "/api/v1/settings/organization");
    assert.equal(read.init.method, "GET");
    assert.equal(read.init.headers["x-company-id"], createdBody.id);

    const write = calls[2]!;
    assert.equal(write.url, "/api/v1/settings/organization");
    assert.equal(write.init.method, "PATCH");
    assert.equal(write.init.headers["x-company-id"], createdBody.id);
    assert.deepEqual(bodyOf(write), {
      expectedRevision: 7,
      legalName: "Northwind Labs Pvt Ltd",
      industry: "Software",
      website: "northwind.test",
      contactEmail: "Hello@Northwind.test",
      contactPhone: "+911234567890",
      address: { country: "IN" },
      timezone: "Asia/Kolkata",
      currency: "INR",
    });
  });

  it("hands the one-time owner invite link to the success screen, alongside the provisioned plan", async () => {
    queueHappyPath();
    const summary = await companiesRepository.createCompany(input, ACTOR);

    assert.equal(summary.owner.state, "invited");
    assert.equal(summary.owner.invitationUrl, "https://app.example.com/accept-invitation?token=one-time-token-abc");
    assert.equal(summary.owner.invitationExpiresAt, "2026-10-11T09:00:00.000Z");
    assert.equal(summary.owner.emailQueued, true);
    assert.equal(summary.company.id, createdBody.id);
    assert.deepEqual(summary.plan, { tier: "growth", name: "Growth", billingCycle: "annual" });
  });

  it("maps every country option to the ISO code the organization DTO accepts", async () => {
    assert.deepEqual(
      COUNTRIES.map((name) => countryToIso(name)),
      COUNTRIES.map((name) => COUNTRY_CODES[name]),
    );
    for (const name of COUNTRIES) {
      assert.match(String(countryToIso(name)), /^[A-Z]{2}$/, `${name} must map to a 2-letter code`);
    }
    assert.equal(countryToIso("  India "), "IN");
    assert.equal(countryToIso("in"), "IN");
    assert.equal(countryToIso("Atlantis"), undefined, "an unknown name is omitted rather than sent as junk");
    assert.equal(countryToIso(null), undefined);

    queueHappyPath();
    await companiesRepository.createCompany({ ...input, country: "Spain" }, ACTOR);
    assert.deepEqual((bodyOf(calls[2]!) as { address?: unknown }).address, { country: "ES" });
  });

  it("caps over-long free-text fields instead of letting the DTO answer 400", async () => {
    queueHappyPath();
    await companiesRepository.createCompany({ ...input, website: `https://northwind.test/${"p".repeat(4000)}` }, ACTOR);

    const sent = bodyOf(calls[0]!);
    assert.equal(String(sent.website).length, 2048, "website is clipped to the DTO's MaxLength");
  });

  it("does not fall back to demo data when the create fails — the error must surface", async () => {
    responses.push({ status: 500, body: { message: "boom" } });
    await assert.rejects(companiesRepository.createCompany(input, ACTOR), (error: unknown) => ApiError.isApiError(error) && error.status === 500);
    assert.equal(calls.length, 1, "no organisation-profile follow-up after a failed create");
  });

  it("propagates the backend's field validation errors to the wizard", async () => {
    responses.push({
      status: 400,
      body: { message: "Validation failed", code: "VALIDATION_FAILED", fieldErrors: { ownerEmail: "Enter a valid owner email." } },
    });
    await assert.rejects(
      companiesRepository.createCompany({ ...input, owner: { ...input.owner, email: "not-an-email" } }, ACTOR),
      (error: unknown) => ApiError.isApiError(error) && error.status === 400 && error.fieldErrors?.ownerEmail === "Enter a valid owner email.",
    );
  });
});
