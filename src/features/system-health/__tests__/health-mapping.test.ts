import assert from "node:assert/strict";
import { describe, it } from "node:test";

const { toApiHealthView, toHealthState } = await import("../context/health-mapping");

describe("toApiHealthView", () => {
  it("maps ok+connected to ok", () => {
    assert.equal(
      toApiHealthView({ ok: true, body: { status: "ok", database: "connected" } }),
      "ok",
    );
  });

  it("maps database error to degraded even when status is ok-shaped", () => {
    assert.equal(
      toApiHealthView({ ok: true, body: { status: "error", database: "error" } }),
      "degraded",
    );
  });

  it("maps a thrown probe to unreachable, never invents ok", () => {
    assert.equal(toApiHealthView({ ok: false, error: new Error("down") }), "unreachable");
  });
});

describe("toHealthState", () => {
  it("reports only API and database — no invented services", () => {
    const state = toHealthState("ok");
    assert.equal(state.globalStatus, "operational");
    assert.equal(state.isLoading, false);
    assert.deepEqual(
      state.entries.map((entry) => entry.id),
      ["svc_api", "svc_db"],
    );
    assert.ok(state.entries.every((entry) => entry.status === "operational"));
  });

  it("maps degraded to a degraded shell status", () => {
    assert.equal(toHealthState("degraded").globalStatus, "degraded");
  });

  it("maps unreachable to outage", () => {
    const state = toHealthState("unreachable");
    assert.equal(state.globalStatus, "outage");
    assert.ok(state.entries.every((entry) => entry.status === "outage"));
  });

  it("keeps loading true only for the checking view", () => {
    assert.equal(toHealthState("checking").isLoading, true);
    assert.equal(toHealthState("ok").isLoading, false);
  });
});
