/**
 * Guards the boundaries Feature Flags keeps while the backend does not exist: one data
 * seam, the existing /super-admin/feature-flags route, no simulated approval or
 * enforcement, no randomness in targeting, honest demo wording and the compact
 * spacing rules.
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { ROUTES } from "@/config/routes";
import { SUPER_ADMIN_NAV, isNavItemActive } from "@/config/navigation";
import { MODULE_TABS, activeModuleTab, flagRoutes } from "../data/config";

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

  it("keeps stores, seeds and raw mock data out of components and pages", () => {
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

  it("never uses randomness anywhere a rollout could depend on it", () => {
    const offenders = source.filter((file) => /Math\.random|crypto\.getRandomValues|randomUUID/.test(strip(read(file))));
    assert.deepEqual(offenders.map(rel), []);
  });

  it("keeps its query keys under the Companies root, so plan and company changes refresh it", () => {
    assert.match(read(resolve(FEATURE, "data", "hooks.ts")), /\[\.\.\.companyKeys\.all, "feature-flags"\]/);
  });

  it("replaced the legacy flag mock and types instead of keeping a second registry", () => {
    assert.equal(existsSync(resolve(SRC, "types", "domain", "feature-flag.ts")), false);
    assert.doesNotMatch(read(resolve(SRC, "mocks", "data", "control.ts")), /FEATURE_FLAGS|FLAG_CATEGORIES/);
  });
});

describe("one source of truth", () => {
  it("reads entitlements, integrations and usage from the shared records instead of duplicating them", () => {
    const provider = strip(read(resolve(FEATURE, "data", "mock-provider.ts")));
    assert.match(provider, /findPlan/);
    assert.match(provider, /computeUsage/);
    assert.match(provider, /allBundles/);
  });

  it("does not grant entitlements or permissions from a flag", () => {
    const offenders = source.filter((file) => /entitlements\.add|grantEntitlement|grantPermission|writeBundle/.test(strip(read(file))));
    assert.deepEqual(offenders.map(rel), []);
  });

  it("evaluates availability in one pure function shared by every screen", () => {
    const users = source.filter((file) => /evaluateFlag\(/.test(strip(read(file))) && !file.endsWith("evaluate.ts"));
    assert.deepEqual(users.map(rel).sort(), [join("data", "mock-provider.ts"), join("data", "selectors.ts")].sort());
  });
});

describe("routing", () => {
  it("uses the existing sidebar destination, with every tab a real nested route", () => {
    assert.equal(ROUTES.superAdmin.featureFlags, "/super-admin/feature-flags");
    assert.equal(flagRoutes.root, "/super-admin/feature-flags");
    for (const tab of MODULE_TABS) assert.ok(tab.href().startsWith("/super-admin/feature-flags"), tab.key);
    for (const dir of ["all", "rollouts", "company-access", "changes", "settings"]) assert.ok(existsSync(resolve(SRC, "app", "super-admin", "feature-flags", dir, "page.tsx")), dir);
    assert.ok(existsSync(resolve(SRC, "app", "super-admin", "feature-flags", "all", "[flagKey]", "page.tsx")));
    assert.equal(existsSync(resolve(SRC, "app", "super-admin", "flags")), false, "no competing base route");
    assert.equal(activeModuleTab(flagRoutes.flag("content.ai_generator")), "all");
    assert.equal(activeModuleTab(flagRoutes.root), "overview");
  });

  it("keeps the environment in the URL, defaulting to production", () => {
    assert.equal(flagRoutes.overview(), "/super-admin/feature-flags");
    assert.equal(flagRoutes.overview("production"), "/super-admin/feature-flags");
    assert.equal(flagRoutes.overview("staging"), "/super-admin/feature-flags?env=staging");
    assert.equal(flagRoutes.flag("a.b", "staging", "impact"), "/super-admin/feature-flags/all/a.b?env=staging&tab=impact");
    assert.equal(flagRoutes.access("development", "cmp_1"), "/super-admin/feature-flags/company-access?env=development&company=cmp_1");
  });

  it("keeps the sidebar item active on every nested route and adds no second item", () => {
    const items = SUPER_ADMIN_NAV.flatMap((group) => group.items).filter((item) => /feature flags/i.test(item.label));
    assert.equal(items.length, 1);
    const [item] = items;
    assert.ok(item);
    for (const tab of MODULE_TABS) assert.ok(isNavItemActive(item, tab.href()), tab.key);
    assert.ok(isNavItemActive(item, flagRoutes.flag("content.ai_generator")));
  });

  it("gives every route a Suspense boundary for URL-driven state", () => {
    const pages = walk(resolve(SRC, "app", "super-admin", "feature-flags")).filter((file) => /page\.tsx$/.test(file));
    assert.ok(pages.length >= 6);
    for (const file of pages) assert.match(read(file), /Suspense/, file);
  });
});

describe("honest demo behaviour", () => {
  const copy = ui.map((file) => ({ file, text: read(file) }));

  it("never claims a change is enforced, approved or deployed", () => {
    const offenders = copy.filter(({ text }) => /has been (approved|enforced|deployed|rolled out)|is now (live|enforced)|successfully (deployed|approved)/i.test(text));
    assert.deepEqual(offenders.map(({ file }) => rel(file)), []);
  });

  it("offers no control that approves a change or runs a scheduler", () => {
    const offenders = copy.filter(({ text }) => />\s*(Approve|Approve Change|Reject|Run Now|Apply Scheduled)\s*</i.test(text));
    assert.deepEqual(offenders.map(({ file }) => rel(file)), []);
  });

  it("offers no one-click rollback: reversion is a draft that goes through review", () => {
    const offenders = copy.filter(({ text }) => />\s*(Rollback|Roll Back|Revert Now|Restore Version)\s*</i.test(text));
    assert.deepEqual(offenders.map(({ file }) => rel(file)), []);
    assert.match(read(resolve(FEATURE, "components", "change-views.tsx")), /Draft Reversion/);
  });

  it("has no unguarded production toggle: enable, disable and emergency go through the review", () => {
    assert.doesNotMatch(strip(read(resolve(FEATURE, "components", "use-flag-actions.tsx"))), /mutations\.proposeChange/);
    assert.match(read(resolve(FEATURE, "components", "use-flag-actions.tsx")), /ChangeReviewDrawer/);
  });

  it("labels demo data and unavailable figures instead of inventing them", () => {
    assert.match(read(resolve(FEATURE, "pages", "overview.tsx")), /Demo flag data/);
    assert.match(read(resolve(FEATURE, "components", "change-review.tsx")), /Unavailable/);
    assert.match(read(resolve(FEATURE, "components", "change-views.tsx")), /Planned, Not Applied/);
  });
});

describe("layout and states", () => {
  it("uses gap-1 between related cards and never gap-4/6/8 between them", () => {
    const offenders = ui.filter((file) => /(?<![\w-])gap-(4|6|8)(?![\w-])/.test(read(file)));
    assert.deepEqual(offenders.map(rel), []);
    for (const page of ["overview", "all-flags", "rollouts", "company-access", "changes"]) assert.match(read(resolve(FEATURE, "pages", `${page}.tsx`)), /StatGrid/, page);
  });

  it("gives every table a caption", () => {
    const offenders = ui.filter((file) => /<MiniTable(?![^>]*caption=)/.test(read(file).replace(/\n/g, " ")));
    assert.deepEqual(offenders.map(rel), []);
  });

  it("has loading, error and empty states, and protects unsaved forms", () => {
    assert.match(read(resolve(FEATURE, "components", "states.tsx")), /SERVICE_UNAVAILABLE/);
    for (const page of ["overview", "all-flags", "rollouts", "company-access", "changes", "flag-detail"]) assert.match(read(resolve(FEATURE, "pages", `${page}.tsx`)), /Skeleton/, page);
    for (const file of ["change-review.tsx", "create-flag-wizard.tsx", "lifecycle-dialog.tsx"]) assert.match(read(resolve(FEATURE, "components", file)), /useUnsavedGuard/, file);
    assert.match(read(resolve(FEATURE, "components", "flag-tabs", "targeting-tab.tsx")), /beforeunload/);
  });

  it("uses Title Case for headings and buttons a person reads", () => {
    const labels = ["Create Feature Flag", "View All Flags", "Review Active Rollouts", "Review Pending Changes", "View Company Access", "View Flag Activity"];
    const overview = read(resolve(FEATURE, "pages", "overview.tsx"));
    for (const label of labels) assert.ok(overview.includes(label), label);
  });
});
