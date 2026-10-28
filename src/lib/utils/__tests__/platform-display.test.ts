import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { applyPreferences } from "../../api/display-preferences";
import { formatCurrency, formatNumber, getDisplayPreferences, getFirstDayIndex, setDisplayPreferences } from "../format";

const base = { timezone: "Asia/Kolkata", dateFormat: "D MMM YYYY", timeFormat: "12-hour", numberFormat: "indian" } as const;

describe("platform display defaults", () => {
  afterEach(() => setDisplayPreferences(null));

  it("applies the platform's number locale, currency display and first day of the week", () => {
    applyPreferences({ preferences: { ...base }, stored: false, display: { numberLocale: "en-US", currencyDisplay: "code", firstDayOfWeek: "sunday" } });
    assert.equal(formatNumber(1234567), "1,234,567");
    assert.match(formatCurrency(1234500, "INR"), /INR/);
    assert.equal(getFirstDayIndex(), 0);
  });

  it("uses Indian digit grouping when that is the platform number locale", () => {
    applyPreferences({ preferences: { ...base }, stored: false, display: { numberLocale: "en-IN", currencyDisplay: "symbol", firstDayOfWeek: "monday" } });
    assert.equal(formatNumber(1234567), "12,34,567");
    assert.equal(getFirstDayIndex(), 1);
  });

  it("a Saturday week start is supported", () => {
    applyPreferences({ preferences: { ...base }, stored: false, display: { numberLocale: "en-IN", currencyDisplay: "symbol", firstDayOfWeek: "saturday" } });
    assert.equal(getFirstDayIndex(), 6);
  });

  it("keeps the old behaviour when the backend sends no platform defaults and nothing was saved", () => {
    applyPreferences({ preferences: { ...base }, stored: false });
    assert.equal(getDisplayPreferences(), null);
    assert.equal(getFirstDayIndex(), 1, "Monday, the platform default, until preferences load");
  });
});
