import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { formatMrr } from "../lib/format";

describe("MRR display", () => {
  it("shows the exact amount below one lakh: one Growth plan at INR 4,999 must not read as 5K", () => {
    assert.equal(formatMrr(499_900, "INR", true), "₹4,999");
    assert.equal(formatMrr(99_900_00, "INR", true), "₹99,900");
  });

  it("abbreviates only from one lakh up, and writes a dash for no revenue", () => {
    assert.match(formatMrr(15_000_000, "INR", true), /^₹1\.5L$|^₹150K$/);
    assert.equal(formatMrr(0, "INR", true), "-");
    assert.equal(formatMrr(499_900, "INR"), "₹4,999");
  });
});
