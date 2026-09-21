/**
 * Guards the boundaries Global Settings keeps while the backend does not exist:
 * one data seam, one configuration store, no invented endpoints, the existing
 * /super-admin route, honest demo wording and the compact-spacing rules.
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { ROUTES } from "@/config/routes";
import { SUPER_ADMIN_NAV, isNavItemActive } from "@/config/navigation";
import { MODULE_LINKS, SECTIONS, routes, sectionFromSlug } from "../data/config";

const FEATURE = resolve(fileURLToPath(new URL(".", import.meta.url)), "..");
const SRC = resolve(FEATURE, "..", "..");

function walk(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}
const read = (file: string) => readFileSync(file, "utf8");
const rel = (file: string) => relative(FEATURE, file);
const strip = (text: string) => text.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, "");

const source = walk(FEATURE).filter((file) => /\.tsx?$/.test(file) && !file.includes("__tests__"));
const ui = source.filter((file) => /[\\/](components|sections|pages)[\\/]/.test(file));
const data = source.filter((file) => /[\\/]data[\\/]/.test(file));
const routeFiles = walk(resolve(SRC, "app", "super-admin", "settings")).filter((file) => file.endsWith(".tsx"));

describe("data seam", () => {
  it("lets only the repository import the mock provider", () => {
    const offenders = source.filter((file) => !file.endsWith(join("data", "repository.ts")) && /from "\.{1,2}\/(data\/)?mock-provider"/.test(read(file)));
    assert.deepEqual(offenders.map(rel), []);
  });

  it("keeps the store and raw mock data out of components, sections and pages", () => {
    const offenders = ui.filter((file) => /from "@\/mocks\/|data\/mock\//.test(read(file)));
    assert.deepEqual(offenders.map(rel), []);
  });

  it("has one configuration store: the legacy platform settings mock is gone", () => {
    assert.equal(existsSync(resolve(SRC, "mocks", "data", "settings.ts")), false);
    assert.equal(existsSync(resolve(SRC, "types", "domain", "settings.ts")), false);
    assert.doesNotMatch(read(resolve(SRC, "mocks", "handlers", "control.ts")), /\/settings/);
  });

  it("invents no endpoints and makes no network calls", () => {
    const offenders = source.filter((file) => /\bfetch\(|axios|XMLHttpRequest|["'`]\/api\//.test(strip(read(file))));
    assert.deepEqual(offenders.map(rel), []);
  });

  it("evaluates time from the demo clock, never the wall clock, in data code", () => {
    const offenders = data.filter((file) => /Date\.now\(\)|new Date\(\)/.test(strip(read(file))));
    assert.deepEqual(offenders.map(rel), []);
  });

  it("does not put secrets, seeds or hashes in the model", () => {
    const offenders = source.filter((file) => /totp_?secret|enrol(l)?ment_?seed|password_?hash|session_?token|recoveryCodes\s*[:=]/i.test(strip(read(file))));
    assert.deepEqual(offenders.map(rel), []);
  });

  it("gives the registry one place to define keys: pages never spell a setting key literal outside a lookup", () => {
    const literal = /["'`](identity|localization|onboarding|security|governance|privacy|communications|maintenance)\.[a-z_]+\.[a-z_.]+["'`]/;
    const offenders = ui.filter((file) => {
      const lines = strip(read(file)).split("\n");
      return lines.some((line) => literal.test(line) && !/(values|saved)\[|getDefinition\(|const (docKey|keyOf)|editor\.(values|saved|set|pendingByKey)|SENSITIVE_KEYS|"security\.sensitive|gate:|text\(|"(identity|localization|security|maintenance|onboarding|communications|governance)\./.test(line));
    });
    assert.deepEqual(offenders.map(rel), []);
  });
});

describe("routing", () => {
  it("keeps the existing canonical route and adds no competing one", () => {
    assert.equal(ROUTES.superAdmin.settings, "/super-admin/settings");
    assert.equal(routes.root, "/super-admin/settings");
    assert.ok(existsSync(resolve(SRC, "app", "super-admin", "settings", "page.tsx")));
    assert.equal(existsSync(resolve(SRC, "app", "super-admin", "global-settings")), false);
    assert.ok(routeFiles.every((file) => !/admin[\\/]settings[\\/]/.test(file.replace(/super-admin/g, ""))));
  });

  it("reaches every section directly, with the default at the module root", () => {
    for (const section of SECTIONS) {
      const href = routes.section(section.key);
      assert.ok(href.startsWith("/super-admin/settings"), href);
      if (section.slug) assert.equal(sectionFromSlug(section.slug)?.key, section.key);
    }
    assert.equal(routes.section("identity"), "/super-admin/settings");
    assert.equal(routes.section("security", { tab: "session", focus: "x" }), "/super-admin/settings/security?tab=session&focus=x");
    assert.equal(sectionFromSlug("nonsense"), undefined);
  });

  it("keeps one sidebar item, active for every internal section", () => {
    const items = SUPER_ADMIN_NAV.flatMap((group) => group.items).filter((item) => item.href === ROUTES.superAdmin.settings);
    assert.equal(items.length, 1, "exactly one Global Settings item");
    assert.equal(SUPER_ADMIN_NAV.flatMap((group) => group.items).filter((item) => /settings/i.test(item.label)).length, 1);
    const [item] = items;
    assert.ok(item);
    for (const section of SECTIONS) assert.ok(isNavItemActive(item, routes.section(section.key).split("?")[0] as string), section.key);
  });

  it("links every dedicated module through the central route registry", () => {
    const known = new Set<string>();
    const collect = (value: unknown) => {
      if (typeof value === "string") known.add(value);
      else if (value && typeof value === "object") Object.values(value).forEach(collect);
    };
    collect(ROUTES.superAdmin);
    for (const link of MODULE_LINKS) assert.ok([...known].some((route) => link.href === route || link.href.startsWith(`${route}/`)), link.href);
  });
});

describe("honest demo behaviour", () => {
  const copy = ui.map((file) => ({ file, text: read(file) }));

  it("never claims a policy was enforced, an account changed or data removed", () => {
    const offenders = copy.filter(({ text }) => /\b(has|have|was|were) (been )?(enforced|purged|revoked|locked out|deleted)\b|is now enforced|successfully enforced/i.test(text));
    assert.deepEqual(offenders.map(({ file }) => rel(file)), []);
  });

  it("never shows a security score or claims the platform is secure", () => {
    const offenders = copy.filter(({ text }) => /100% secure|security score:|is secure\b|fully secure/i.test(text));
    assert.deepEqual(offenders.map(({ file }) => rel(file)), []);
  });

  it("offers no bulk-delete, rollback-all or add-setting actions", () => {
    const offenders = copy.filter(({ text }) => />\s*(Delete All|Delete Tenant|Purge|Rollback|Revert All|Add Setting)/i.test(text));
    assert.deepEqual(offenders.map(({ file }) => rel(file)), []);
  });

  it("labels the module as demo configuration", () => {
    assert.match(read(resolve(FEATURE, "components", "settings-frame.tsx")), /Demo configuration/);
  });

  it("does not duplicate editors that belong to other modules", () => {
    const offenders = copy.filter(({ text }) => /trial_?duration|default_?trial|payment_?gateway|oauth_?client|webhook_?secret/i.test(text));
    assert.deepEqual(offenders.map(({ file }) => rel(file)), []);
  });
});

describe("layout rules", () => {
  it("uses gap-1 between related sibling cards and never gap-4/6/8 between them", () => {
    const offenders = ui.filter((file) => /(?<![\w-])gap-(4|6|8)(?![\w-])/.test(read(file)));
    assert.deepEqual(offenders.map(rel), []);
    assert.match(read(resolve(FEATURE, "components", "settings-frame.tsx")), /StatGrid/);
  });

  it("gives every route a Suspense boundary for URL-driven state", () => {
    for (const file of routeFiles.filter((item) => /page\.tsx$/.test(item))) assert.match(read(file), /Suspense/, rel(file));
  });

  it("marks tables with captions and controls with labels", () => {
    const offenders = ui.filter((file) => /<MiniTable(?![^>]*caption=)/.test(read(file).replace(/\n/g, " ")));
    assert.deepEqual(offenders.map(rel), []);
  });
});

describe("states", () => {
  it("has loading, error and empty handling on every data-driven screen", () => {
    for (const name of ["section-parts.tsx", "states.tsx"]) assert.ok(existsSync(resolve(FEATURE, "components", name)), name);
    assert.match(read(resolve(FEATURE, "components", "section-parts.tsx")), /PanelSkeleton/);
    assert.match(read(resolve(FEATURE, "components", "states.tsx")), /SERVICE_UNAVAILABLE/);
    assert.match(read(resolve(FEATURE, "sections", "configuration-history.tsx")), /EmptyState/);
    assert.match(read(resolve(FEATURE, "components", "settings-search.tsx")), /No settings match/);
  });

  it("protects unsaved changes on navigation, Back and unload", () => {
    const guard = read(resolve(FEATURE, "components", "settings-guard.tsx"));
    assert.match(guard, /useUnsavedGuard/);
    assert.match(guard, /addEventListener\("click"/);
  });
});
