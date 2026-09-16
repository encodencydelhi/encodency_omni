/**
 * Guards the boundaries the module is meant to keep while the backend does not
 * exist yet: one data seam, one mock-mode flag, no invented API routes.
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const FEATURE = resolve(fileURLToPath(new URL(".", import.meta.url)), "..");
const APP_ROUTES = resolve(FEATURE, "..", "..", "..", "app", "admin", "google-business");

function walk(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

const sourceFiles = walk(FEATURE).filter((file) => /\.tsx?$/.test(file) && !file.includes("__tests__"));
const routeFiles = walk(APP_ROUTES).filter((file) => file.endsWith(".tsx"));
const read = (file: string) => readFileSync(file, "utf8");

describe("module boundaries", () => {
  it("routes every page through the repository, never the mock data", () => {
    const offenders = sourceFiles.filter((file) => !file.endsWith(join("data", "repository.ts")) && /from "\.\.?\/(data\/)?mock-provider"/.test(read(file)));
    assert.deepEqual(
      offenders.map((file) => relative(FEATURE, file)),
      [],
      "only data/repository.ts may import the mock provider",
    );
  });

  it("keeps mock mode behind a single flag", () => {
    const declarations = sourceFiles.filter((file) => /export const GBP_MOCK_MODE/.test(read(file)));
    assert.deepEqual(declarations.map((file) => relative(FEATURE, file)), [join("lib", "constants.ts")]);
  });

  it("never calls Google or any HTTP endpoint from the frontend", () => {
    for (const file of sourceFiles) {
      const source = read(file);
      assert.ok(!/googleapis\.com\/(v1|v4|mybusiness)/.test(source), `${relative(FEATURE, file)} calls a Google API directly`);
      assert.ok(!/\bfetch\((["'`])\/api\//.test(source), `${relative(FEATURE, file)} calls a backend route that does not exist yet`);
    }
  });

  it("ships no backend routes for this module", () => {
    const apiDir = resolve(FEATURE, "..", "..", "..", "app", "api");
    const fake = walk(apiDir).filter((file) => file.toLowerCase().includes("google-business"));
    assert.deepEqual(fake, [], "this phase is frontend only - no API routes");
  });

  it("wires every page component to an app route", () => {
    const routed = routeFiles.map(read).join("\n");
    const pages = readdirSync(join(FEATURE, "pages")).filter((file) => file.endsWith("-page.tsx"));
    for (const page of pages) {
      assert.ok(routed.includes(`/pages/${page.replace(".tsx", "")}`), `${page} is not reachable from a route`);
    }
  });

  it("gives the workspace exactly the eight agreed tabs", () => {
    const directories = readdirSync(APP_ROUTES, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort();
    assert.deepEqual(directories, ["locations", "media", "performance", "posts", "profile", "reviews", "settings"]);
    assert.ok(existsSync(join(APP_ROUTES, "page.tsx")), "the Overview tab is the index route");
    assert.ok(existsSync(join(APP_ROUTES, "locations", "[locationId]", "page.tsx")), "locations have a detail route");
    assert.ok(existsSync(join(APP_ROUTES, "posts", "create", "page.tsx")), "posts have a create route");
  });

  it("marks every client page as a client component", () => {
    for (const file of sourceFiles.filter((path) => path.includes(join("pages", "")) || path.includes(join("components", "")))) {
      assert.match(read(file).slice(0, 40), /"use client"/, `${relative(FEATURE, file)} needs the client directive`);
    }
  });
});
