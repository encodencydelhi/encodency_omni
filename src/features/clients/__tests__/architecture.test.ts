/**
 * Guards the boundaries this module keeps while the backend does not exist yet:
 * one data seam, no second client store, no invented API routes, the /super-admin
 * route convention, honest demo behaviour and the compact-spacing rules.
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const FEATURE = resolve(fileURLToPath(new URL(".", import.meta.url)), "..");
const SRC = resolve(FEATURE, "..", "..");
const ROUTES = resolve(SRC, "app", "super-admin", "clients");

function walk(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

const read = (file: string) => readFileSync(file, "utf8");
const rel = (file: string) => relative(FEATURE, file);
const stripComments = (text: string) => text.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, "");

const source = walk(FEATURE).filter((file) => /\.tsx?$/.test(file) && !file.includes("__tests__"));
const ui = source.filter((file) => /[\\/](components|pages)[\\/]/.test(file));
const routeFiles = walk(ROUTES).filter((file) => file.endsWith(".tsx"));

describe("data seam", () => {
  it("lets only the repository import the mock provider", () => {
    const offenders = source.filter((file) => !file.endsWith(join("data", "repository.ts")) && /from "\.{1,2}\/(data\/)?mock-provider"/.test(read(file)));
    assert.deepEqual(offenders.map(rel), []);
  });

  it("keeps raw mock data and the Companies store out of components and pages", () => {
    const offenders = ui.filter((file) => /from "@\/mocks\/|companies\/data\/mock\/|companies\/data\/mock-provider/.test(read(file)));
    assert.deepEqual(offenders.map(rel), []);
  });

  it("has no second client store: clients are the Companies module's records", () => {
    const provider = read(join(FEATURE, "data", "mock-provider.ts"));
    assert.match(provider, /companies\/data\/mock\/store/);
    assert.ok(!/const\s+CLIENTS\s*[:=]|sessionStorage\.setItem/.test(provider), "the provider must not keep its own persistence");
  });

  it("declares mock mode once, from the Companies setting", () => {
    const declarations = source.filter((file) => /export const CLIENTS_MOCK_MODE/.test(read(file)));
    assert.deepEqual(declarations.map(rel), [join("data", "config.ts")]);
    assert.match(read(join(FEATURE, "data", "config.ts")), /CLIENTS_MOCK_MODE = COMPANIES_MOCK_MODE/);
  });

  it("does not make up backend endpoints or side effects", () => {
    for (const file of source) {
      const text = stripComments(read(file));
      assert.ok(!/\bfetch\(/.test(text), `${rel(file)} calls fetch`);
      assert.ok(!/\bXMLHttpRequest\b|axios/.test(text), `${rel(file)} uses a network client`);
      assert.ok(!/navigator\.sendBeacon|new WebSocket|EventSource/.test(text), `${rel(file)} opens a connection`);
    }
    assert.equal(existsSync(resolve(SRC, "app", "api")), false, "no route handlers may be added in this phase");
  });

  it("builds the demo extras without randomness or the wall clock", () => {
    const seed = stripComments(read(join(FEATURE, "data", "mock", "seed.ts")));
    assert.ok(!/Math\.random|Date\.now\(|new Date\(\)/.test(seed));
    const selectors = stripComments(read(join(FEATURE, "data", "selectors.ts")));
    assert.ok(!/Math\.random|Date\.now\(/.test(selectors));
  });

  it("never stores tokens or secrets", () => {
    for (const file of source) assert.ok(!/accessToken|refreshToken|client_secret|apiKey/i.test(stripComments(read(file))), rel(file));
  });
});

describe("routes", () => {
  it("uses the /super-admin convention only", () => {
    const text = [...source, ...routeFiles].map(read).join("\n");
    assert.ok(!/["'`]\/admin\/clients/.test(text), "must not touch the Company Admin /admin/clients route");
    assert.ok(!/super-admin\/projects/.test(source.map((file) => stripComments(read(file))).join("\n")), "the old /projects route is only a redirect");
  });

  it("ships a real page for the list and each of the six sections, with no placeholders", () => {
    for (const section of ["", "team", "channels", "website-seo", "activity", "settings"]) {
      const page = join(ROUTES, "[clientId]", section, "page.tsx");
      assert.ok(existsSync(page), `missing page for "${section || "overview"}"`);
      assert.ok(!/coming soon|placeholder|lorem/i.test(read(page)));
    }
    assert.ok(existsSync(join(ROUTES, "page.tsx")));
    assert.ok(existsSync(join(ROUTES, "[clientId]", "layout.tsx")));
  });

  it("offers exactly six sections", () => {
    const config = read(join(FEATURE, "data", "config.ts"));
    const block = config.match(/CLIENT_SECTIONS[\s\S]*?\];/)?.[0] ?? "";
    assert.equal((block.match(/key: "/g) ?? []).length, 6);
  });

  it("links to other modules only through the availability registry", () => {
    for (const file of ui) {
      const text = stripComments(read(file));
      assert.ok(!/["'`]\/super-admin\/(billing|usage|integrations|support|audit-logs|team|plans|jobs)\b/.test(text), `${rel(file)} hard-codes a link to a module without a route`);
    }
  });

  it("keeps the old projects feature gone", () => {
    assert.equal(existsSync(resolve(SRC, "features", "projects")), false);
  });
});

describe("honesty", () => {
  it("never claims a demo action was delivered, published or refreshed", () => {
    const provider = read(join(FEATURE, "data", "mock-provider.ts"));
    for (const claim of [/email (was )?sent/i, /message (was )?delivered/i, /token (was )?refreshed/i, /post (was )?published/i]) {
      const hits = provider.split("\n").filter((line) => claim.test(line) && !/no |not |never|demo|nothing/i.test(line));
      assert.deepEqual(hits, [], `overclaiming line: ${claim}`);
    }
  });

  it("labels simulated website data as demo data", () => {
    assert.match(read(join(FEATURE, "pages", "client-website.tsx")), /Demo data/);
    assert.match(read(join(FEATURE, "pages", "clients-list.tsx")), /CLIENTS_MOCK_MODE/);
  });

  it("offers no permanent delete", () => {
    for (const file of ui) assert.ok(!/delete client|permanently delete|remove client(?! access)/i.test(stripComments(read(file))), rel(file));
  });

  it("does not offer to open a client as its own admin", () => {
    for (const file of ui) assert.ok(!/open as (client|company) admin|impersonat(e|ing)|login as/i.test(stripComments(read(file))), rel(file));
  });

  it("keeps the parent company read-only after creation", () => {
    const edit = read(join(FEATURE, "components", "client-edit-drawer.tsx"));
    assert.ok(!/companyId/.test(stripComments(edit)), "the edit form must not carry a company id");
    assert.match(edit, /Moving a client is not available/);
  });
});

describe("visual system", () => {
  it("never spaces grids of cards with gap-4 or wider", () => {
    for (const file of ui) {
      const bad = read(file).match(/className="[^"]*\bgrid\b[^"]*\bgap-(4|5|6|8)\b[^"]*"/g);
      assert.equal(bad, null, `${rel(file)}: ${bad?.join(" | ")}`);
    }
  });

  it("gives every detail section a loading state and an error state", () => {
    for (const page of ["client-overview", "client-team", "client-channels", "client-website", "client-activity", "client-settings"]) {
      const text = read(join(FEATURE, "pages", `${page}.tsx`));
      assert.match(text, /ClientError/, `${page} has no error state`);
      assert.match(text, /Skeleton/, `${page} has no skeleton`);
    }
  });
});
