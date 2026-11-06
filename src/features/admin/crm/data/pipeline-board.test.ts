import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Deal } from "../types";
import { buildSummary, insertInOrder, matchesFilters, orderStages, stageCards } from "./pipeline-board";

const deal = (over: Partial<Deal>): Deal => ({
  id: over.name ?? "d", name: "d", companyId: "", companyName: "", primaryContactId: "", primaryContactName: "", pipelineId: "pipeline_1", stage: "new",
  value: 0, probability: 20, cost: 0, expectedCloseDate: "", ownerId: "", ownerName: "Unassigned", source: "manual", campaign: "", products: "", tags: [], notes: "",
  priority: "medium", createdAt: "2026-10-01T10:00:00.000Z", updatedAt: "2026-10-01T10:00:00.000Z", ...over,
});
const TODAY = "2026-11-04";
const f = (over = {}) => ({ pipelineId: "pipeline_1", today: TODAY, ...over });

// The same deals as the server's real-PostgreSQL test (backend/test/crm-pipeline-db.e2e.ts); both must agree.
const deals = [
  deal({ name: "Alpha", stage: "new", value: 1000, probability: 20, priority: "high", ownerId: "u1", ownerName: "Asha", companyName: "Acme Corp", primaryContactName: "Rita Sen", expectedCloseDate: "2026-11-03", createdAt: "2026-10-01T10:00:00.000Z" }),
  deal({ name: "Bravo", stage: "new", value: 500, probability: 50, priority: "low", ownerId: "u2", ownerName: "Ravi", companyName: "Beta LLC", expectedCloseDate: "2026-11-20", createdAt: "2026-10-02T10:00:00.000Z" }),
  deal({ name: "Charlie", stage: "proposal", value: 2500, probability: 80, priority: "medium", ownerId: "u1", ownerName: "Asha", expectedCloseDate: "2026-11-30", createdAt: "2026-10-03T10:00:00.000Z" }),
  deal({ name: "Delta", stage: "negotiation", value: 4000, probability: 40, priority: "high", ownerId: "u2", ownerName: "Ravi", expectedCloseDate: "2026-12-15", createdAt: "2026-10-04T10:00:00.000Z" }),
  deal({ name: "Echo", stage: "won", value: 3000, probability: 100, expectedCloseDate: "2026-10-20", createdAt: "2026-10-05T10:00:00.000Z", updatedAt: "2026-11-02T10:00:00.000Z" }),
  deal({ name: "Foxtrot", stage: "lost", value: 700, probability: 0, priority: "low", expectedCloseDate: "2026-09-01", createdAt: "2026-10-06T10:00:00.000Z" }),
  deal({ name: "Golf", stage: "new", value: 100, createdAt: "2026-10-07T10:00:00.000Z" }),
  deal({ name: "India", stage: "qualified", value: 800, probability: 60, pipelineId: "p_custom", ownerId: "u1", ownerName: "Asha", createdAt: "2026-10-09T10:00:00.000Z" }),
];

describe("board summary (preview) agrees with the server's rules", () => {
  it("matches the server's stage figures and pipeline sizes for the shared fixture", () => {
    const s = buildSummary(deals, f());
    const byStage = Object.fromEntries(s.stages.map((x) => [x.stage, x]));
    assert.deepEqual(byStage.new, { stage: "new", total: 3, count: 3, value: 1600 });
    assert.deepEqual([byStage.proposal!.total, byStage.proposal!.value], [1, 2500]);
    assert.deepEqual([byStage.won!.total, byStage.won!.value, byStage.lost!.value], [1, 3000, 700]);
    assert.equal(byStage.qualified, undefined);
    assert.equal(s.total, 7);
    assert.deepEqual(s.pipelineCounts, { pipeline_1: 7, p_custom: 1 });
    assert.deepEqual(s.owners, [{ id: "u1", name: "Asha" }, { id: "u2", name: "Ravi" }]);
  });

  it("matches the server's cards and forecast", () => {
    const { metrics, forecast } = buildSummary(deals, f());
    assert.deepEqual(metrics.open, { count: 5, value: 8100, weighted: 200 + 250 + 2000 + 1600 + 20 });
    assert.deepEqual([metrics.won.count, metrics.lost.count], [1, 1]);
    assert.deepEqual(metrics.wonThisMonth, { count: 1, value: 3000 });
    assert.deepEqual(forecast, { closingCount: 2, bestCase: 3000, expected: 250 + 2000, committed: 2500, overdue: 1 });
  });

  it("moves overdue and closing as today moves", () => {
    const later = buildSummary(deals, f({ today: "2026-11-21" }));
    assert.deepEqual([later.forecast.overdue, later.forecast.closingCount], [2, 1]);
  });

  it("applies filters to stage figures but not to the totals", () => {
    const s = buildSummary(deals, f({ ownerId: "u1" }));
    const byStage = Object.fromEntries(s.stages.map((x) => [x.stage, x]));
    assert.deepEqual(byStage.new, { stage: "new", total: 3, count: 1, value: 1000 });
    assert.deepEqual([byStage.negotiation!.total, byStage.negotiation!.count, byStage.negotiation!.value], [1, 0, 0]);
    assert.equal(s.total, 7);
    assert.equal(s.metrics.open.count, 5);
  });

  it("filters cards: search, owner, priority and close date, with closed deals never overdue", () => {
    const names = (stage: string, over = {}) => stageCards(deals, stage, f(over)).map((d) => d.name);
    assert.deepEqual(names("new", { search: "ACME" }), ["Alpha"]);
    assert.deepEqual(names("new", { search: "rita" }), ["Alpha"]);
    assert.deepEqual(names("new", { ownerId: "__none__" }), ["Golf"]);
    assert.deepEqual(names("new", { priority: "medium" }), ["Golf"]);
    assert.deepEqual(names("new", { close: "overdue" }), ["Alpha"]);
    assert.deepEqual(names("new", { close: "month" }), ["Bravo"]);
    assert.deepEqual(names("new", { close: "none" }), ["Golf"]);
    assert.deepEqual(names("lost", { close: "overdue" }), []);
    assert.deepEqual(names("new"), ["Golf", "Bravo", "Alpha"]);
  });
});

describe("placing a moved card", () => {
  const a = deal({ name: "a", createdAt: "2026-10-03T00:00:00.000Z" });
  const b = deal({ name: "b", createdAt: "2026-10-02T00:00:00.000Z" });
  const c = deal({ name: "c", createdAt: "2026-10-01T00:00:00.000Z" });
  it("puts a card where the server would return it", () => {
    const moved = deal({ name: "m", createdAt: "2026-10-02T12:00:00.000Z" });
    assert.deepEqual(insertInOrder([a, b, c], moved, false).map((d) => d.name), ["a", "m", "b", "c"]);
    assert.deepEqual(insertInOrder([a, b], deal({ name: "new", createdAt: "2026-12-01T00:00:00.000Z" }), true).map((d) => d.name), ["new", "a", "b"]);
  });
  it("never duplicates a card", () => {
    assert.deepEqual(insertInOrder([a, b, c], b, false).map((d) => d.name), ["a", "b", "c"]);
  });
  it("leaves out a card older than every loaded one when more pages exist, but appends it when the column is complete", () => {
    const old = deal({ name: "old", createdAt: "2026-01-01T00:00:00.000Z" });
    assert.deepEqual(insertInOrder([a, b], old, true).map((d) => d.name), ["a", "b"]);
    assert.deepEqual(insertInOrder([a, b], old, false).map((d) => d.name), ["a", "b", "old"]);
  });
});

describe("stage order", () => {
  it("shows the pipeline's open stages, then extra stages deals carry, then won and lost", () => {
    const known = ["new", "qualified", "discovery", "proposal", "negotiation", "won", "lost"] as const;
    assert.deepEqual(orderStages(["new", "proposal", "won", "lost"], ["new", "discovery", "won"], [...known]), ["new", "proposal", "discovery", "won", "lost"]);
  });
  it("matches filters the same way the board does", () => {
    assert.equal(matchesFilters(deals[0]!, f({ search: "nothing" })), false);
  });
});
