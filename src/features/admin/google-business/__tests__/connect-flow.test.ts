import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { GbpNotConnectedError } from "../data/repository";
import { consumeGbpReturn, markGbpReturn } from "../live/gbp-return";

describe("not-connected detail", () => {
  it("says why the workspace is empty, so the page can offer the right next step", () => {
    const none = new GbpNotConnectedError({ reason: "no_connection", integrationId: null });
    assert.equal(none.name, "GbpNotConnectedError");
    assert.deepEqual(none.detail, { reason: "no_connection", integrationId: null });
    assert.equal(new GbpNotConnectedError({ reason: "no_location", integrationId: "i1" }).detail?.integrationId, "i1");
    assert.equal(new GbpNotConnectedError().detail, null, "the old no-argument form still works");
  });
});

describe("return-to-page flag", () => {
  it("is false when there is no browser storage (server render, blocked storage) and never throws", () => {
    assert.equal(consumeGbpReturn(), false);
    assert.doesNotThrow(() => markGbpReturn());
  });

  it("is set once and consumed once", () => {
    const store = new Map<string, string>();
    (globalThis as { window?: unknown }).window = {
      sessionStorage: { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v), removeItem: (k: string) => void store.delete(k) },
    };
    try {
      assert.equal(consumeGbpReturn(), false);
      markGbpReturn();
      assert.equal(consumeGbpReturn(), true);
      assert.equal(consumeGbpReturn(), false, "a refresh must not bounce the user again");
    } finally {
      delete (globalThis as { window?: unknown }).window;
    }
  });
});
