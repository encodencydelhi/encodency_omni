/**
 * Guards the boundaries Usage & Limits keeps while the backend does not exist:
 * one data seam, no second override or entitlement system, the existing
 * /super-admin/usage route, honest demo wording and the compact-spacing rules.
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { ROUTES } from "@/config/routes";
import { SUPER_ADMIN_NAV, isNavItemActive } from "@/config/navigation";
import { MODULE_TABS, activeModuleTab, usageRoutes } from "../data/config";

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
const ui = source.filter((file) => /[\\/](components|pages)[\\/]/.test(file));
const data = source.filter((file) => /[\\/]data[\\/]/.test(file));

describe("data seam", () => {
  it("lets only the repository import the mock provider", () => {
    const offenders = source.filter((file) => !file.endsWith(join("data", "repository.ts")) && /from "\.{1,2}\/(data\/)?mock-provider"/.test(read(file)));
    assert.deepEqual(offenders.map(rel), []);
  });

  it("keeps stores, generators and raw mock data out of components and pages", () => {
    const offenders = ui.filter((file) => /from "@\/mocks\/|data\/mock\/|companies\/data\/mock/.test(read(file)));
    assert.deepEqual(offenders.map(rel), []);
  });

  it("makes no network calls and invents no endpoints", () => {
    const offenders = source.filter((file) => /\bfetch\(|axios|XMLHttpRequest|["'`]\/api\//.test(strip(read(file))));
    assert.deepEqual(offenders.map(rel), []);
  });

  it("uses the demo clock and no randomness in data code", () => {
    const offenders = data.filter((file) => /Date\.now\(\)|new Date\(\)|Math\.random/.test(strip(read(file))));
    assert.deepEqual(offenders.map(rel), []);
  });
});

describe("one source of truth", () => {
  it("has no second override or entitlement system: overrides go through Plans & Subscriptions", () => {
    const provider = strip(read(resolve(FEATURE, "data", "mock-provider.ts")));
    assert.doesNotMatch(provider, /writeBundle|overrides:\s*\[/, "usage never writes an override itself");
    const actions = read(resolve(FEATURE, "components", "override-actions.tsx"));
    assert.match(actions, /OverrideFlow/);
    assert.match(actions, /revokeOverride/);
    assert.equal(existsSync(resolve(FEATURE, "components", "override-form.tsx")), false);
  });

  it("does not calculate entitlements itself", () => {
    const offenders = source.filter((file) => /resolveEffectiveEntitlements|overrideValueFor\(.*\)\s*[+-]/.test(strip(read(file))) && !file.endsWith("selectors.ts"));
    assert.deepEqual(offenders.map(rel), []);
  });

  it("extends the shared resource catalogue instead of declaring another list", () => {
    assert.match(read(resolve(FEATURE, "data", "catalogue.ts")), /USAGE_RESOURCES\.map/);
  });

  it("keeps its query keys under the Companies root, so shared mutations refresh it", () => {
    assert.match(read(resolve(FEATURE, "data", "hooks.ts")), /\[\.\.\.companyKeys\.all, "usage-limits"\]/);
  });
});

describe("routing", () => {
  it("uses the existing sidebar destination, with every tab a real nested route", () => {
    assert.equal(ROUTES.superAdmin.usage, "/super-admin/usage");
    assert.equal(usageRoutes.root, "/super-admin/usage");
    for (const tab of MODULE_TABS) assert.ok(tab.href.startsWith("/super-admin/usage"), tab.href);
    for (const dir of ["companies", "resources", "alerts", "overrides", "metering"]) assert.ok(existsSync(resolve(SRC, "app", "super-admin", "usage", dir, "page.tsx")), dir);
    assert.ok(existsSync(resolve(SRC, "app", "super-admin", "usage", "resources", "[resourceKey]", "page.tsx")));
    assert.equal(existsSync(resolve(SRC, "app", "super-admin", "usage-limits")), false, "no competing base route");
    assert.equal(activeModuleTab(usageRoutes.resource("aiCredits")), "resources");
    assert.equal(activeModuleTab(usageRoutes.root), "overview");
  });

  it("keeps the sidebar item active on every nested route and adds no second item", () => {
    const items = SUPER_ADMIN_NAV.flatMap((group) => group.items).filter((item) => /usage/i.test(item.label));
    assert.equal(items.length, 1);
    const [item] = items;
    assert.ok(item);
    for (const tab of MODULE_TABS) assert.ok(isNavItemActive(item, tab.href), tab.href);
    assert.ok(isNavItemActive(item, usageRoutes.resource("aiCredits")));
  });

  it("reuses the Companies usage workspace for company detail", () => {
    assert.ok(existsSync(resolve(SRC, "app", "super-admin", "companies", "[companyId]", "usage", "page.tsx")));
    assert.equal(usageRoutes.companyUsage("cmp_x", "aiCredits"), "/super-admin/companies/cmp_x/usage?metric=aiCredits");
    assert.match(read(resolve(SRC, "features", "companies", "pages", "company-usage.tsx")), /ResourceDrawer/);
  });

  it("gives every route a Suspense boundary for URL-driven state", () => {
    const pages = walk(resolve(SRC, "app", "super-admin", "usage")).filter((file) => /page\.tsx$/.test(file));
    for (const file of pages) assert.match(read(file), /Suspense/, file);
  });
});

describe("honest demo behaviour", () => {
  const copy = ui.map((file) => ({ file, text: read(file) }));

  it("never claims a quota is enforced or a charge made", () => {
    const offenders = copy.filter(({ text }) => /\b(has|was|were) (been )?(charged|billed|blocked|enforced)\b|is now enforced|successfully charged/i.test(text));
    assert.deepEqual(offenders.map(({ file }) => rel(file)), []);
  });

  it("offers no manual usage entry and no one-click quota increase", () => {
    const offenders = copy.filter(({ text }) => />\s*(Add Usage|Increase Quota|Increase Limit|Quick Increase)/i.test(text));
    assert.deepEqual(offenders.map(({ file }) => rel(file)), []);
  });

  it("never invents a billable amount", () => {
    const offenders = source.filter((file) => /estimatedAmount|estimatedCharge|invoiceAmount/.test(strip(read(file))));
    assert.deepEqual(offenders.map(rel), []);
  });

  it("labels demo data", () => {
    assert.match(read(resolve(FEATURE, "pages", "usage-overview.tsx")), /Demo usage data/);
    assert.match(read(resolve(FEATURE, "pages", "metering-activity.tsx")), /Demo Operational Data/);
  });

  it("does not duplicate Billing, API Monitoring or Jobs editors", () => {
    const offenders = copy.filter(({ text }) => /paymentMethod|createRefund|issueRefund|invoice/i.test(text));
    assert.deepEqual(offenders.map(({ file }) => rel(file)), []);
  });
});

describe("layout and states", () => {
  it("uses gap-1 between related cards and never gap-4/6/8 between them", () => {
    const offenders = ui.filter((file) => /(?<![\w-])gap-(4|6|8)(?![\w-])/.test(read(file)));
    assert.deepEqual(offenders.map(rel), []);
    for (const page of ["usage-overview", "company-usage", "alerts-overages", "overrides"]) assert.match(read(resolve(FEATURE, "pages", `${page}.tsx`)), /StatGrid/, page);
  });

  it("gives every table a caption", () => {
    const offenders = ui.filter((file) => /<MiniTable(?![^>]*caption=)/.test(read(file).replace(/\n/g, " ")));
    assert.deepEqual(offenders.map(rel), []);
  });

  it("has loading, error and empty states, and protects unsaved forms", () => {
    assert.match(read(resolve(FEATURE, "components", "states.tsx")), /SERVICE_UNAVAILABLE/);
    for (const page of ["usage-overview", "company-usage", "alerts-overages", "overrides", "metering-activity"]) assert.match(read(resolve(FEATURE, "pages", `${page}.tsx`)), /Skeleton/, page);
    for (const file of ["alert-drawer.tsx", "override-actions.tsx"]) assert.match(read(resolve(FEATURE, "components", file)), /useUnsavedGuard/, file);
    assert.match(read(resolve(FEATURE, "pages", "resource-detail.tsx")), /useUnsavedGuard/);
  });
});
