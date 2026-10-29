import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { csvText } from "./export";
describe("Meta CSV exports", () => {
  it("preserves quotes, commas and line breaks", () => {
    assert.equal(csvText(["Name"], [['A, "B"\nC']]), '"Name"\r\n"A, ""B""\nC"');
  });
  it("neutralizes text formulas without changing numeric amounts", () => {
    assert.equal(csvText(["Text", "Amount"], [["=1+1", -5]]), '"Text","Amount"\r\n"\'=1+1","-5"');
  });
});
