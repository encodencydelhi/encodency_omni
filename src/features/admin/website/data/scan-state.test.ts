import assert from "node:assert/strict";
import { describe, it } from "node:test";

const {
  describeScanOutcome,
  isActiveScan,
  isTerminalScan,
  nextPollDelayMs,
  scanProducedResults,
  scanProgressPercent,
  scanStatusLabel,
  scanStatusTone,
} = await import("./scan-state");

const base = { scanId: "s1", type: "full-crawl" as const, stage: "x", pagesScanned: 4, startedAt: "2026-10-14T00:00:00.000Z" };

describe("scan lifecycle mapping", () => {
  it("treats only queued/running as active and the rest as terminal", () => {
    for (const status of ["queued", "running"]) {
      assert.equal(isActiveScan(status), true);
      assert.equal(isTerminalScan(status), false);
    }
    for (const status of ["completed", "partially_completed", "failed", "cancelled"]) {
      assert.equal(isActiveScan(status), false);
      assert.equal(isTerminalScan(status), true);
    }
  });

  it("refreshes module data only when a scan produced results", () => {
    assert.equal(scanProducedResults("completed"), true);
    assert.equal(scanProducedResults("partially_completed"), true);
    assert.equal(scanProducedResults("failed"), false);
    assert.equal(scanProducedResults("cancelled"), false);
  });

  it("labels and tones every state, including the legacy 'partial'", () => {
    assert.equal(scanStatusLabel("partially_completed"), "Completed with errors");
    assert.equal(scanStatusLabel("partial"), "Completed with errors");
    assert.equal(scanStatusTone("partially_completed"), "warn");
    assert.equal(scanStatusTone("failed"), "bad");
    assert.equal(scanStatusTone("cancelled"), "muted");
    assert.equal(scanStatusTone("running"), "info");
  });
});

describe("progress percentage", () => {
  it("never shows 100% while a scan is still active", () => {
    assert.equal(scanProgressPercent({ status: "running", progress: 100 }), 99);
    assert.equal(scanProgressPercent({ status: "queued", progress: 40 }), 40);
    assert.equal(scanProgressPercent({ status: "completed", progress: 100 }), 100);
  });

  it("clamps and tolerates bad values", () => {
    assert.equal(scanProgressPercent({ status: "running", progress: -5 }), 0);
    assert.equal(scanProgressPercent({ status: "running", progress: Number.NaN }), 0);
    assert.equal(scanProgressPercent({ status: "failed", progress: 250 }), 100);
  });
});

describe("polling cadence", () => {
  it("backs off as a scan runs longer", () => {
    assert.equal(nextPollDelayMs(0), 1000);
    assert.equal(nextPollDelayMs(15), 2000);
    assert.equal(nextPollDelayMs(100), 5000);
  });
});

describe("outcome messages", () => {
  it("reports success, partial, cancelled and failed distinctly", () => {
    assert.equal(describeScanOutcome({ ...base, status: "completed", progress: 100 }, "Full crawl").kind, "success");
    const partial = describeScanOutcome(
      { ...base, status: "partially_completed", progress: 100, error: { code: "x", message: "2 pages failed", retryable: true } },
      "Full crawl",
    );
    assert.equal(partial.kind, "warning");
    assert.match(partial.description ?? "", /2 pages failed/);
    const cancelled = describeScanOutcome({ ...base, status: "cancelled", progress: 30 }, "Full crawl");
    assert.equal(cancelled.kind, "info");
    assert.match(cancelled.description ?? "", /unchanged/);
    const failed = describeScanOutcome(
      { ...base, status: "failed", progress: 100, error: { code: "website_unreachable", message: "Could not reach site", retryable: true } },
      "Full crawl",
    );
    assert.equal(failed.kind, "error");
    assert.match(failed.description ?? "", /Could not reach site/);
  });
});
