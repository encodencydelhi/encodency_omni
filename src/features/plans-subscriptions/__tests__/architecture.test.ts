/**
 * Guards the boundaries this module keeps while the backend does not exist yet:
 * one data seam, one plan store shared with Companies, no invented endpoints, the
 * existing /super-admin routes, honest demo behaviour and the compact-spacing rules.
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { deriveSubscriptionCapabilities } from "../data/capabilities";
import { ROLE_PERMISSIONS, type InternalRole, type Permission } from "@/types/domain/team";

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
const routeFiles = [...walk(resolve(SRC, "app", "super-admin", "plans")), ...walk(resolve(SRC, "app", "super-admin", "subscriptions"))].filter((file) => file.endsWith(".tsx"));

describe("data seam", () => {
  it("lets only the repository import the mock provider", () => {
    const offenders = source.filter((file) => !file.endsWith(join("data", "repository.ts")) && /from "\.{1,2}\/(data\/)?mock-provider"/.test(read(file)));
    assert.deepEqual(offenders.map(rel), []);
  });

  it("keeps stores and raw mock data out of components and pages", () => {
    const offenders = ui.filter((file) => /from "@\/mocks\/|data\/mock\/|companies\/data\/mock/.test(read(file)));
    assert.deepEqual(offenders.map(rel), []);
  });

  it("keeps one plan catalogue: Companies resolves plans through the shared plan store", () => {
    const provider = read(resolve(SRC, "features", "companies", "data", "mock-provider.ts"));
    assert.match(provider, /plans-subscriptions\/data\/mock\/plan-store/);
    assert.ok(!/PLAN_CATALOGUE/.test(provider), "the Companies provider must not read a second, frozen catalogue");
  });

  it("declares mock mode once, from the Companies setting", () => {
    assert.match(read(join(FEATURE, "data", "config.ts")), /PLANS_MOCK_MODE = COMPANIES_MOCK_MODE/);
    const declarations = source.filter((file) => /export const PLANS_MOCK_MODE/.test(read(file)));
    assert.equal(declarations.length, 1);
  });

  it("declares every feature and limit in one catalogue", () => {
    const declaring = source.filter((file) => /description: "Credits consumed by AI|key: "ai_assistant"/.test(read(file)));
    assert.deepEqual(declaring.map(rel), [join("data", "catalogue.ts")]);
  });

  it("does not make up endpoints or side effects", () => {
    for (const file of source) {
      const text = strip(read(file));
      assert.ok(!/\bfetch\(/.test(text), `${rel(file)} calls fetch`);
      assert.ok(!/\bXMLHttpRequest\b|axios|sendBeacon|new WebSocket/.test(text), `${rel(file)} opens a connection`);
      assert.ok(!/stripe|razorpay|paypal/i.test(text), `${rel(file)} mentions a payment gateway`);
    }
    assert.equal(existsSync(resolve(SRC, "app", "api")), false);
  });

  it("builds deterministic data without randomness or the wall clock", () => {
    for (const file of [join(FEATURE, "data", "mock", "plan-store.ts"), join(FEATURE, "data", "selectors.ts"), join(FEATURE, "data", "entitlements.ts")]) {
      assert.ok(!/Math\.random|Date\.now\(|new Date\(\)/.test(strip(read(file))), rel(file));
    }
  });
});

describe("routes", () => {
  it("keeps the existing Super Admin routes and no Company Admin ones", () => {
    const text = [...source, ...routeFiles].map(read).join("\n");
    assert.ok(!/["'`]\/admin\/(billing|settings|subscriptions)/.test(text));
    assert.match(read(join(FEATURE, "data", "config.ts")), /ROUTES\.superAdmin\.plans/);
    assert.match(read(join(FEATURE, "data", "config.ts")), /ROUTES\.superAdmin\.subscriptions/);
  });

  it("ships a real page for every route in the module", () => {
    const pages = ["plans/page.tsx", "plans/catalogue/page.tsx", "plans/new/page.tsx", "plans/[planId]/page.tsx", "plans/[planId]/edit/page.tsx", "plans/changes/page.tsx", "plans/settings/page.tsx", "subscriptions/page.tsx", "subscriptions/[subscriptionId]/page.tsx", "plans/layout.tsx", "subscriptions/layout.tsx"];
    for (const page of pages) {
      const file = resolve(SRC, "app", "super-admin", page);
      assert.ok(existsSync(file), `missing ${page}`);
      assert.ok(!/coming soon|placeholder|lorem/i.test(read(file)));
    }
  });

  it("does not add a second sidebar item", () => {
    const nav = read(resolve(SRC, "config", "navigation.ts"));
    assert.equal((nav.match(/label: "Plans & Subscriptions"/g) ?? []).length, 1);
  });
});

describe("honesty", () => {
  it("never claims a payment was collected, refunded or an email sent", () => {
    for (const file of [...ui, join(FEATURE, "data", "mock-provider.ts")]) {
      const text = strip(read(file));
      for (const line of text.split("\n")) {
        if (/payment (was |has been )?(collected|charged|taken)|refund(ed)? (was )?issued|email (was )?sent/i.test(line) && !/no |not |never|nothing|demo|without/i.test(line)) {
          assert.fail(`${rel(file)} overclaims: ${line.trim()}`);
        }
      }
    }
  });

  it("edits a published plan only through a new version", () => {
    const provider = read(join(FEATURE, "data", "mock-provider.ts"));
    assert.match(provider, /Create a new version to edit a published plan/);
  });

  it("retiring a plan never touches subscriptions", () => {
    const provider = read(join(FEATURE, "data", "mock-provider.ts"));
    const retire = provider.slice(provider.indexOf("async retirePlan"), provider.indexOf("/* ----------------------- subscription mutations"));
    assert.ok(!/companiesRepository|scheduleCancellation|changePlan/.test(retire));
  });

  it("marks simulated data as demo data", () => {
    assert.match(read(join(FEATURE, "pages", "overview.tsx")), /PLANS_MOCK_MODE/);
    assert.match(read(join(FEATURE, "components", "flows", "plan-change-wizard.tsx")), /No payment is charged/);
  });
});

describe("visual system", () => {
  it("never spaces grids of cards with gap-4 or wider", () => {
    for (const file of ui) {
      const bad = read(file).match(/className="[^"]*\bgrid\b[^"]*\bgap-(4|5|6|8)\b[^"]*"/g);
      assert.equal(bad, null, `${rel(file)}: ${bad?.join(" | ")}`);
    }
  });

  it("gives every page a loading and an error state", () => {
    for (const page of ["overview", "plans-catalogue", "plan-detail", "plan-editor", "subscriptions-list", "subscription-detail", "changes", "settings"]) {
      // The overview delegates its loading states to its panels.
      const text = read(join(FEATURE, "pages", `${page}.tsx`)) + (page === "overview" ? read(join(FEATURE, "components", "overview-panels.tsx")) : "");
      assert.match(text, /PlansError/, `${page} has no error state`);
      assert.match(text, /Skeleton/, `${page} has no loading state`);
    }
  });
});

describe("capabilities", () => {
  const forRole = (role: InternalRole) => {
    const granted = new Set<Permission>(ROLE_PERMISSIONS[role]);
    return deriveSubscriptionCapabilities((permission) => granted.has(permission));
  };

  it("grants nothing without billing read access", () => {
    const none = deriveSubscriptionCapabilities(() => false);
    assert.ok(Object.values(none).every((value) => value === false));
  });

  it("does not give every internal identity full commercial control", () => {
    const support = forRole("support");
    assert.equal(support.canViewSubscriptions, false);
    const operations = forRole("operations");
    assert.equal(operations.canCreatePlan, false);
    const finance = forRole("finance");
    assert.equal(finance.canViewPlans, true);
    assert.equal(finance.canPublishPlan, true);
    const superAdmin = forRole("super_admin");
    assert.ok(Object.values(superAdmin).every((value) => value === true));
  });

  it("separates changing a subscription from repricing a plan", () => {
    const manageOnly = deriveSubscriptionCapabilities((permission) => permission === "billing:read" || permission === "plans:write");
    assert.equal(manageOnly.canChangeCompanyPlan, true);
    assert.equal(manageOnly.canCreatePlan, true);
    assert.equal(manageOnly.canPublishPlan, false, "publishing needs billing write as well");
    assert.equal(manageOnly.canManageSubscriptionPolicies, false);
  });
});

describe("unavailable provider", () => {
  it("refuses every call instead of returning plausible plans", async () => {
    const { unavailablePlansProvider } = await import("../data/unavailable-provider");
    const { ApiError } = await import("@/types/api");
    assert.equal(unavailablePlansProvider.mode, "unavailable");
    for (const call of [() => unavailablePlansProvider.getOverview(), () => unavailablePlansProvider.listPlans({}), () => unavailablePlansProvider.getSubscription("sub_x")]) {
      await assert.rejects(call(), (error: unknown) => ApiError.isApiError(error) && error.code === "SERVICE_UNAVAILABLE");
    }
  });
});
