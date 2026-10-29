/**
 * Money on the Plans & Subscriptions pages. A plan sold at ₹4,999 must not show as "₹5K" (that reads as a different, wrong number), so
 * short forms such as "K" / "L" are used only from one lakh up.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { COMPACT_FROM, money, moneyTotals } from "../lib/money";

describe("compact money keeps small amounts exact", () => {
  it("shows ₹4,999 as ₹4,999, not ₹5K", () => {
    const text = moneyTotals({ INR: 499_900 }, true);
    assert.ok(text.includes("4,999"), text);
    assert.ok(!text.includes("5K"), text);
    assert.ok(money(499_900, "INR", true).includes("4,999"));
  });

  it("keeps paise only when there are some", () => {
    assert.ok(money(499_950, "INR", true).includes("4,999.50"));
    assert.ok(!money(499_900, "INR", true).includes(".00"));
  });

  it("abbreviates from one lakh upward", () => {
    assert.equal(COMPACT_FROM, 100_000);
    const text = moneyTotals({ INR: 25_000_000 }, true);
    assert.ok(text.includes("250K"), text);
    assert.ok(!text.includes("250,000"), text);
  });

  it("the full format is unchanged", () => {
    assert.ok(money(499_900, "INR").includes("4,999.00"));
    assert.equal(money(0, "INR", true), "-");
    assert.equal(moneyTotals({}, true), "-");
  });

  it("currencies are still listed separately", () => {
    const text = moneyTotals({ INR: 499_900, USD: 12_900 }, true);
    assert.ok(text.includes("4,999") && text.includes("129") && text.includes(" + "), text);
  });
});
