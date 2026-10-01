import assert from "node:assert/strict";
import { describe, it } from "node:test";

const {
  countTemplateVariables,
  describeNumericPlaceholders,
  extractTemplateVariables,
  hasNumericPlaceholders,
} = await import("../template-variables");

describe("template-variables (Add-Template autofill)", () => {
  it("reads named placeholders in first-appearance order", () => {
    const { variables } = extractTemplateVariables(
      "Hi {{first_name}}, your booking {{booking_id}} is ready for {{first_name}} again.",
    );
    // Duplicates collapse: the send modal renders one input per entry.
    assert.deepEqual(variables, ["first_name", "booking_id"]);
  });

  it("tolerates padding around the token and ignores empty ones", () => {
    const { variables } = extractTemplateVariables(
      "Hi {{  first_name  }}, id {{}} for {{amount}}.",
    );
    assert.deepEqual(variables, ["first_name", "amount"]);
  });

  it("keeps order stable, because executeSend maps variables positionally", () => {
    const body = "{{zeta}} then {{alpha}} then {{zeta}} then {{beta}}";
    assert.deepEqual(extractTemplateVariables(body).variables, ["zeta", "alpha", "beta"]);
  });

  it("separates numbered WhatsApp tokens from named ones", () => {
    const { variables, numericTokens, tokens } = extractTemplateVariables(
      "Hello {{1}}, {{2}} for {{order_id}}",
    );
    assert.deepEqual(variables, ["order_id"]);
    assert.deepEqual(numericTokens, ["1", "2"]);
    assert.deepEqual(tokens, ["1", "2", "order_id"]);
  });

  it("flags a body as unsavable only when it uses numbered placeholders", () => {
    assert.equal(hasNumericPlaceholders("Hello {{first_name}}"), false);
    assert.equal(hasNumericPlaceholders("Hello {{1}}"), true);
    assert.equal(hasNumericPlaceholders("no placeholders here"), false);
  });

  it("counts every placeholder for the form's detected badge", () => {
    assert.equal(countTemplateVariables("Hi {{a}} {{b}}"), 2);
    assert.equal(countTemplateVariables("Hi {{1}} {{2}} {{a}}"), 3);
    assert.equal(countTemplateVariables("nothing"), 0);
  });

  it("returns nothing for a body without placeholders", () => {
    assert.deepEqual(extractTemplateVariables("Welcome to IHWE."), {
      variables: [],
      numericTokens: [],
      tokens: [],
    });
  });

  it("ignores a single unpaired brace rather than treating it as a token", () => {
    const { variables, tokens } = extractTemplateVariables("50% off {{name");
    assert.deepEqual(variables, []);
    assert.deepEqual(tokens, []);
  });

  it("names the offending tokens in the fix-it hint", () => {
    const hint = describeNumericPlaceholders(["1", "2"]);
    assert.match(hint, /\{\{1\}\}/);
    assert.match(hint, /\{\{2\}\}/);
    assert.match(hint, /\{\{first_name\}\}/);
    assert.match(hint, /aren't supported/);
  });
});
