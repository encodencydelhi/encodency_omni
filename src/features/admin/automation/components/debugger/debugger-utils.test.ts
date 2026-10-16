import assert from "node:assert/strict";
import test from "node:test";
import { edgeVisual, filterEvents, formatMs, metricText, parseJsonObject, simulationStates, stateCounts, stepEvent } from "./debugger-utils";
import type { RunTrace, TraceEvent } from "../../data/trace-types";

const event = (source: TraceEvent["source"], kind: string, nodeId: string | null = null): TraceEvent => ({ at: "2030-01-01T00:00:00.000Z", kind, nodeId, title: kind, detail: null, status: null, refId: null, source });

test("edges distinguish recorded and inferred paths from untaken ones", () => {
  assert.equal(edgeVisual("taken", "recorded").dashed, false);
  assert.equal(edgeVisual("taken", "inferred").dashed, true);
  assert.equal(edgeVisual("not_taken", "recorded").dashed, true);
  assert.ok(edgeVisual("taken", "recorded").width > edgeVisual("not_reached", "inferred").width);
});

test("durations are formatted and missing values are never invented", () => {
  assert.equal(formatMs(450), "450 ms");
  assert.equal(formatMs(2500), "2.50 s");
  assert.equal(formatMs(125_000), "2 m 5 s");
  assert.equal(formatMs(null), "Data Unavailable");
  assert.equal(formatMs(undefined), "Data Unavailable");
});

test("state counts come from the snapshot and treat missing node data as not executed", () => {
  const trace = {
    snapshot: { available: true, nodes: [{ id: "a" }, { id: "b" }, { id: "c" }], edges: [] },
    nodes: { a: { state: "successful" }, b: { state: "unknown_outcome" } },
  } as unknown as Pick<RunTrace, "snapshot" | "nodes">;
  const counts = stateCounts(trace);
  assert.equal(counts.successful, 1);
  assert.equal(counts.unknown_outcome, 1);
  assert.equal(counts.not_executed, 1);
});

test("timeline navigation clamps and never wraps", () => {
  assert.equal(stepEvent(0, null, "next"), null);
  assert.equal(stepEvent(5, null, "next"), 0);
  assert.equal(stepEvent(5, null, "previous"), 4);
  assert.equal(stepEvent(5, 4, "next"), 4);
  assert.equal(stepEvent(5, 0, "previous"), 0);
  assert.equal(stepEvent(5, 2, "first"), 0);
  assert.equal(stepEvent(5, 2, "last"), 4);
});

test("event filters group related persisted sources", () => {
  const events = [event("run", "run.started"), event("step_run", "step.attempt.started", "a"), event("branch", "branch.started"), event("approval", "approval.requested", "x"), event("child_run", "child.started"), event("step", "step.waiting", "w")];
  assert.equal(filterEvents(events, "all").length, 6);
  assert.deepEqual(filterEvents(events, "steps").map((e) => e.kind), ["step.attempt.started", "step.waiting"]);
  assert.deepEqual(filterEvents(events, "orchestration").map((e) => e.kind), ["branch.started"]);
  assert.deepEqual(filterEvents(events, "human").map((e) => e.kind), ["approval.requested", "step.waiting"]);
  assert.deepEqual(filterEvents(events, "children").map((e) => e.kind), ["child.started"]);
});

test("a blocked or failed simulated visit is not hidden by a later planned visit", () => {
  const states = simulationStates({ steps: [{ nodeId: "a", status: "failed" }, { nodeId: "a", status: "planned" }, { nodeId: "b", status: "planned" }, { nodeId: "c", status: "blocked" }] } as never);
  assert.deepEqual(states, { a: "failed", b: "planned", c: "blocked" });
});

test("JSON editors accept only objects and explain errors", () => {
  assert.deepEqual(parseJsonObject("   "), { ok: true, value: {} });
  assert.deepEqual(parseJsonObject('{"a":1}'), { ok: true, value: { a: 1 } });
  assert.equal(parseJsonObject("[1,2]").ok, false);
  assert.equal(parseJsonObject("42").ok, false);
  const broken = parseJsonObject("{oops");
  assert.equal(broken.ok, false);
  assert.match(broken.ok ? "" : broken.error, /Invalid JSON/);
  assert.equal(parseJsonObject("x".repeat(70_000)).ok, false);
});

test("unavailable metrics render as Data Unavailable", () => {
  assert.equal(metricText({ available: false, reason: "too few runs", samples: 2 }, String), "Data Unavailable");
  assert.equal(metricText({ available: true, value: 12.5, samples: 20 }, (v) => `${v}%`), "12.5%");
});
