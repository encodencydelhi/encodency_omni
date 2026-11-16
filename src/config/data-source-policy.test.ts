import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolveDataSource, resolveXMockMode } from "./data-source-policy";

describe("production data source boundaries", () => {
  it("rejects missing, invalid and accidental mock production builds", () => {
    for (const raw of [undefined, "", "API", "mock"]) assert.throws(() => resolveDataSource(raw, true, false));
    assert.equal(resolveDataSource("api", true, false), "api");
  });
  it("keeps explicit previews and local mock development available", () => {
    assert.equal(resolveDataSource("mock", true, true), "mock");
    assert.equal(resolveDataSource(undefined, false, false), "mock");
    assert.throws(() => resolveDataSource("typo", false, false));
  });
  it("never simulates X in normal production even when a stale mock flag is set", () => {
    for (const raw of [undefined, "true", "false"]) assert.equal(resolveXMockMode(raw, true, false), false);
    assert.equal(resolveXMockMode("true", true, true), true);
    assert.equal(resolveXMockMode(undefined, true, true), false);
    assert.equal(resolveXMockMode(undefined, false, false), true);
    assert.equal(resolveXMockMode("false", false, false), false);
    assert.throws(() => resolveXMockMode("typo", true, false));
  });
});
