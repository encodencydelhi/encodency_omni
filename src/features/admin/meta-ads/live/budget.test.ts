import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { budgetInput, budgetMinor } from "./budget";

describe("Meta budget currency boundary", () => {
  it("round trips existing budgets without multiplying them twice", () => {
    for (const value of [1, 4999, 50000, 12345678]) assert.equal(budgetMinor(budgetInput(value)), value);
    assert.equal(budgetInput(50000), "500.00");
  });
  it("refuses invalid, zero, overprecise and unsafe amounts", () => {
    for (const value of ["", "-5", "0", "0.001", "NaN", "Infinity", "1e6", "21474836.48"]) assert.equal(budgetMinor(value), null);
  });
});
