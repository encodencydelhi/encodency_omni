/**
 * Guards the boundaries this module keeps while the backend does not exist yet:
 * one data seam, one mock flag, no invented API routes, no raw mock arrays in the
 * UI, no real side effects, and the compact-spacing and separation-of-roles rules.
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const FEATURE = resolve(fileURLToPath(new URL(".", import.meta.url)), "..");
const SRC = resolve(FEATURE, "..", "..");
const ROUTES = resolve(SRC, "app", "super-admin", "companies");

function walk(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

const read = (file: string) => readFileSync(file, "utf8");
const rel = (file: string) => relative(FEATURE, file);

const source = walk(FEATURE).filter((file) => /\.tsx?$/.test(file) && !file.includes("__tests__"));
const ui = source.filter((file) => /[\\/](components|pages)[\\/]/.test(file));
const routeFiles = walk(ROUTES).filter((file) => file.endsWith(".tsx"));

describe("data seam", () => {
  it("lets only the repository import the mock provider", () => {
    const offenders = source.filter((file) => !file.endsWith(join("data", "repository.ts")) && /from "\.{1,2}\/(data\/)?mock-provider"/.test(read(file)));
    assert.deepEqual(offenders.map(rel), []);
  });

  it("keeps raw mock data out of components, pages and hooks", () => {
    const offenders = source.filter((file) => !file.includes(join("data", "mock")) && !file.endsWith("mock-provider.ts") && /from "@\/mocks\//.test(read(file)));
    assert.deepEqual(offenders.map(rel), []);
  });

  it("declares mock mode once, from the app-wide setting", () => {
    const declarations = source.filter((file) => /export const COMPANIES_MOCK_MODE/.test(read(file)));
    assert.deepEqual(declarations.map(rel), [join("data", "config.ts")]);
    assert.match(read(join(FEATURE, "data", "config.ts")), /COMPANIES_MOCK_MODE = isMockMode/);
  });

  it("does not make up backend endpoints", () => {
    for (const file of source) {
      const text = read(file);
      assert.ok(!/\bfetch\(/.test(text), `${rel(file)} calls fetch`);
      assert.ok(!/\bXMLHttpRequest\b|axios/.test(text), `${rel(file)} uses a network client`);
    }
    assert.equal(existsSync(resolve(SRC, "app", "api")), false, "no route handlers may be added in this phase");
  });

  it("builds the demo dataset without randomness or the wall clock", () => {
    const dataset = read(join(FEATURE, "data", "mock", "dataset.ts"));
    assert.ok(!/Math\.random|Date\.now\(|new Date\(\)/.test(dataset));
  });
});

describe("routes", () => {
  it("uses the /super-admin convention only", () => {
    const text = [...source, ...routeFiles].map(read).join("\n");
    assert.ok(!/["'`]\/admin\/companies/.test(text), "must not touch the Company Admin /admin/companies route");
  });

  it("ships a real page for every company section, with no placeholders", () => {
    for (const section of ["", "users", "clients", "subscription", "billing", "usage", "integrations", "activity", "security"]) {
      const page = join(ROUTES, "[companyId]", section, "page.tsx");
      assert.ok(existsSync(page), `missing page for "${section || "overview"}"`);
      assert.ok(!/coming soon|placeholder|lorem/i.test(read(page)));
    }
    assert.ok(existsSync(join(ROUTES, "page.tsx")));
    assert.ok(existsSync(join(ROUTES, "[companyId]", "layout.tsx")));
  });

  it("links to other modules only through the availability registry", () => {
    for (const file of ui) {
      const text = read(file);
      assert.ok(!/["'`]\/super-admin\/(billing|usage|integrations|support|audit-logs|team|plans|jobs)\b/.test(text), `${rel(file)} hard-codes a link to a module without a route`);
    }
  });
});

describe("safety", () => {
  it("does not offer to impersonate or open a tenant as its admin", () => {
    for (const file of ui) {
      assert.ok(!/open as company admin|impersonat(e|ing) (the )?(company|user)|login as/i.test(read(file).replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, "")), rel(file));
    }
  });

  it("never claims a demo action moved money, ended a session or delivered a message", () => {
    const provider = read(join(FEATURE, "data", "mock-provider.ts"));
    for (const claim of [/payment (was )?collected/i, /refund(ed)? issued/i, /sessions? (were|was) ended/i, /email (was )?sent/i]) {
      const hits = provider.split("\n").filter((line) => claim.test(line) && !/no |not |never|demo/i.test(line));
      assert.deepEqual(hits, [], `overclaiming line: ${claim}`);
    }
  });

  it("keeps internal notes and owners out of any company-facing surface", () => {
    const adminSurface = walk(resolve(SRC, "app", "admin")).concat(walk(resolve(SRC, "features", "admin"))).filter((file) => /\.tsx?$/.test(file));
    assert.ok(adminSurface.every((file) => !/features\/companies/.test(read(file).replace(/\\/g, "/"))), "the Company Admin panel must not import tenant-management code");
  });
});

describe("visual system", () => {
  it("uses gap-1 between related cards", () => {
    const grid = read(join(FEATURE, "components", "primitives.tsx"));
    assert.match(grid, /export function StatGrid[\s\S]*?"grid gap-1"/);
  });

  it("never spaces grids of cards with gap-4 or wider", () => {
    for (const file of ui) {
      const bad = read(file).match(/className="[^"]*\bgrid\b[^"]*\bgap-(4|5|6|8)\b[^"]*"/g);
      assert.equal(bad, null, `${rel(file)}: ${bad?.join(" | ")}`);
    }
  });
});
